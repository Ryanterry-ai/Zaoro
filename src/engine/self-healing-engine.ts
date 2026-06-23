/**
 * Self-Healing Engine: Captures compilation errors, reads failing source code,
 * sends full context to LLM for repair, applies fixes, re-compiles.
 * Loops until build errors = 0 or max iterations reached.
 */

import * as fs from 'fs';
import * as path from 'path';
import { TypeScriptAuditor } from '../compiler/auditor.js';
import { ErrorCompressor } from '../compiler/compressor.js';
import { LLMGateway } from '../core/llm-gateway.js';
import { ASTPatcher } from '../core/ast-patcher.js';
import type { CompilationError, ASTPatch, LLMConfig } from '../types/index.js';

export interface HealingResult {
  success: boolean;
  iterations: number;
  errorsFixed: number;
  remainingErrors: CompilationError[];
  durationMs: number;
  log: HealingLogEntry[];
}

export interface HealingLogEntry {
  iteration: number;
  errorsBefore: number;
  filesAffected: string[];
  fixApplied: boolean;
  errorAfter?: string | undefined;
  durationMs: number;
}

interface ErrorWithContext {
  error: CompilationError;
  sourceCode?: string;
  lineRange?: { start: number; end: number };
}

// ─── Self-Healing Engine ────────────────────────────────────────

export class SelfHealingEngine {
  private auditor: TypeScriptAuditor;
  private patcher: ASTPatcher;
  private maxIterations: number;
  private maxErrorsPerBatch: number;

  constructor(
    maxIterations: number = 5,
    maxErrorsPerBatch: number = 20
  ) {
    this.auditor = new TypeScriptAuditor();
    this.patcher = new ASTPatcher();
    this.maxIterations = maxIterations;
    this.maxErrorsPerBatch = maxErrorsPerBatch;
  }

  /**
   * Run the self-healing loop on a workspace.
   * Returns when errors = 0 or max iterations reached.
   */
  async heal(
    workspacePath: string,
    gateway: LLMGateway,
    prompt: string,
    onProgress?: (iteration: number, errors: number, message: string) => void
  ): Promise<HealingResult> {
    const startTime = Date.now();
    const log: HealingLogEntry[] = [];
    let totalErrorsFixed = 0;

    console.log('='.repeat(60));
    console.log('SELF-HEALING ENGINE');
    console.log('='.repeat(60));

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      const iterStart = Date.now();

      // Step 1: Capture all TypeScript errors
      onProgress?.(iteration, 0, 'Capturing compilation errors...');
      const errors = this.captureErrors(workspacePath);

      if (errors.length === 0) {
        console.log(`[self-heal] Iteration ${iteration}: No errors — build is clean!`);
        onProgress?.(iteration, 0, 'Build is clean!');
        break;
      }

      console.log(`[self-heal] Iteration ${iteration}: ${errors.length} errors found`);

      // Step 2: Read source code context for each error
      onProgress?.(iteration, errors.length, 'Reading source code context...');
      const errorsWithContext = this.readErrorContext(workspacePath, errors);

      // Step 3: Deduplicate errors by file (fix one file at a time)
      const fileGroups = this.groupErrorsByFile(errorsWithContext);

      // Step 4: Generate fixes via LLM (batch by file)
      onProgress?.(iteration, errors.length, 'Generating fixes via LLM...');
      const fixes = await this.generateFixes(
        workspacePath,
        gateway,
        prompt,
        fileGroups,
        iteration,
        errors.length
      );

      // Step 5: Apply fixes
      onProgress?.(iteration, errors.length, `Applying ${fixes.length} fixes...`);
      let fixesApplied = 0;
      for (const patch of fixes) {
        try {
          this.patcher.applyPatch(workspacePath, patch);
          fixesApplied++;
        } catch (err: any) {
          console.warn(`[self-heal] Failed to apply fix for ${patch.targetFile}: ${err.message}`);
        }
      }

      // Step 6: Re-compile and check
      onProgress?.(iteration, errors.length, 'Re-compiling...');
      const postErrors = this.captureErrors(workspacePath);
      const errorsResolved = errors.length - postErrors.length;
      totalErrorsFixed += Math.max(0, errorsResolved);

      log.push({
        iteration,
        errorsBefore: errors.length,
        filesAffected: [...fileGroups.keys()],
        fixApplied: fixesApplied > 0,
        errorAfter: postErrors.length > 0 ? `${postErrors.length} errors remaining` : undefined,
        durationMs: Date.now() - iterStart,
      });

      console.log(`[self-heal] Iteration ${iteration}: ${fixesApplied} fixes applied, ${errorsResolved} errors resolved, ${postErrors.length} remaining`);

      // If no errors resolved, stop (LLM couldn't help)
      if (errorsResolved <= 0 && fixesApplied > 0) {
        console.warn(`[self-heal] No progress made — stopping healing loop`);
        break;
      }
    }

    const finalErrors = this.captureErrors(workspacePath);
    const success = finalErrors.length === 0;

    console.log('='.repeat(60));
    console.log(`SELF-HEALING ${success ? 'COMPLETE' : 'PARTIAL'}: ${totalErrorsFixed} errors fixed, ${finalErrors.length} remaining`);
    console.log('='.repeat(60));

    return {
      success,
      iterations: log.length,
      errorsFixed: totalErrorsFixed,
      remainingErrors: finalErrors,
      durationMs: Date.now() - startTime,
      log,
    };
  }

  /**
   * Capture all TypeScript compilation errors.
   */
  private captureErrors(workspacePath: string): CompilationError[] {
    try {
      return this.auditor.audit(workspacePath);
    } catch (err: any) {
      console.warn(`[self-heal] Audit failed: ${err.message}`);
      return [];
    }
  }

  /**
   * Read source code context around each error.
   */
  private readErrorContext(
    workspacePath: string,
    errors: CompilationError[]
  ): ErrorWithContext[] {
    return errors.map(err => {
      const filePath = path.join(workspacePath, err.file);
      if (!fs.existsSync(filePath)) {
        return { error: err };
      }

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const errorLine = err.line;

        // Read ±10 lines around error
        const start = Math.max(0, errorLine - 11);
        const end = Math.min(lines.length, errorLine + 10);
        const sourceCode = lines.slice(start, end).map((line, i) => {
          const lineNum = start + i + 1;
          const marker = lineNum === errorLine ? '>>> ERROR >>>' : '             ';
          return `${marker} ${lineNum}: ${line}`;
        }).join('\n');

        return {
          error: err,
          sourceCode,
          lineRange: { start: start + 1, end: end },
        };
      } catch {
        return { error: err };
      }
    });
  }

  /**
   * Group errors by file for batch fixing.
   */
  private groupErrorsByFile(errors: ErrorWithContext[]): Map<string, ErrorWithContext[]> {
    const groups = new Map<string, ErrorWithContext[]>();
    for (const ewc of errors) {
      const file = ewc.error.file;
      if (!groups.has(file)) groups.set(file, []);
      groups.get(file)!.push(ewc);
    }
    return groups;
  }

  /**
   * Generate LLM fixes for all error groups.
   */
  private async generateFixes(
    workspacePath: string,
    gateway: LLMGateway,
    prompt: string,
    fileGroups: Map<string, ErrorWithContext[]>,
    iteration: number,
    totalErrors: number
  ): Promise<ASTPatch[]> {
    const allPatches: ASTPatch[] = [];
    let batchCount = 0;

    for (const [file, errors] of fileGroups) {
      if (batchCount >= this.maxErrorsPerBatch) break;

      // Read full file content
      const filePath = path.join(workspacePath, file);
      let fileContent = '';
      try {
        fileContent = fs.readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      // Build error summary
      const errorSummary = errors.map(e => {
        const lines = e.sourceCode ? `\nSource context:\n${e.sourceCode}` : '';
        return `Line ${e.error.line} [${e.error.code}]: ${e.error.message}${lines}`;
      }).join('\n\n');

      // Build the self-healing prompt
      const healingPrompt = `SELF-HEALING: Fix TypeScript compilation errors in "${file}".

Original application prompt: ${prompt}

File: ${file}
Current content:
\`\`\`tsx
${fileContent}
\`\`\`

Compilation errors (${errors.length}):
${errorSummary}

INSTRUCTIONS:
- Fix ALL TypeScript errors listed above
- Return the COMPLETE fixed file content as a single code block
- Do NOT change the visual appearance or functionality
- Only fix type errors, missing imports, and syntax issues
- Keep all existing JSX, Tailwind classes, and component logic intact
- The file must be a valid React component with proper TypeScript types`;

      try {
        const patches = await gateway.generatePatches({
          prompt: healingPrompt,
          attempt: iteration,
          changedFiles: [file],
          errors: errors.map(e => ({
            file: e.error.file,
            line: e.error.line,
            code: e.error.code,
            message: e.error.message,
          })),
        });

        // Ensure patches target the correct file
        for (const patch of patches) {
          patch.targetFile = file;
          allPatches.push(patch);
        }

        batchCount++;
      } catch (err: any) {
        console.warn(`[self-heal] LLM call failed for ${file}: ${err.message}`);
      }
    }

    return allPatches;
  }
}
