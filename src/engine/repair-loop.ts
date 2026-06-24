// ─── Repair Loop ─────────────────────────────────────────────────
// Auto-detects issues from browser verification and uses LLM to
// generate fixes, applies AST patches, and re-verifies.

import * as fs from 'fs';
import * as path from 'path';
import { LLMGateway } from '../core/llm-gateway.js';
import type { LLMConfig, ASTPatch } from '../types/index.js';
import { VerificationResult, VerificationCheck } from './browser-verifier.js';
import { RuntimeManager } from './runtime-manager.js';

export interface RepairConfig {
  maxIterations: number;
  fixThreshold: number;
  autoApply: boolean;
}

export interface RepairResult {
  success: boolean;
  iterations: number;
  issuesFound: number;
  issuesFixed: number;
  issuesRemaining: number;
  patches: ASTPatch[];
  reports: RepairReport[];
  finalScore: number;
}

export interface RepairReport {
  iteration: number;
  issue: string;
  fix: string;
  applied: boolean;
  reVerified: boolean;
  passed: boolean;
}

const DEFAULT_REPAIR_CONFIG: RepairConfig = {
  maxIterations: 3,
  fixThreshold: 90,
  autoApply: true,
};

export class RepairLoop {
  private workspaceRoot: string;
  private gateway: LLMGateway;
  private config: RepairConfig;
  private logFn: ((step: string, msg: string, data?: Record<string, unknown>) => void) | undefined;

  constructor(
    workspaceRoot: string,
    llmConfig: LLMConfig,
    config?: Partial<RepairConfig>,
    logFn?: (step: string, msg: string, data?: Record<string, unknown>) => void,
  ) {
    this.workspaceRoot = workspaceRoot;
    this.gateway = new LLMGateway(llmConfig);
    this.config = { ...DEFAULT_REPAIR_CONFIG, ...config };
    this.logFn = logFn;
  }

  private log(msg: string) {
    console.log(`[repair-loop] ${msg}`);
    this.logFn?.('repair-loop', msg);
  }

  async repair(
    verification: VerificationResult,
    generateSection: (sectionType: string) => Promise<string | null>,
  ): Promise<RepairResult> {
    this.log(`Starting repair loop — ${verification.checks.length} checks, score=${verification.score}`);

    const reports: RepairReport[] = [];
    const allPatches: ASTPatch[] = [];
    let currentScore = verification.score;

    for (let iteration = 1; iteration <= this.config.maxIterations; iteration++) {
      this.log(`Repair iteration ${iteration}/${this.config.maxIterations} — score=${currentScore}`);

      // Get failing checks
      const failingChecks = verification.checks.filter(c => !c.passed);
      if (failingChecks.length === 0) {
        this.log('All checks passing — no repair needed');
        break;
      }

      this.log(`Found ${failingChecks.length} failing checks`);

      for (const check of failingChecks) {
        const report = await this.repairCheck(check, iteration, generateSection);
        reports.push(report);

        if (report.applied) {
          allPatches.push(...this.createPatchesFromFix(report.fix));
        }
      }

      // Re-verify after repairs
      if (this.config.autoApply && reports.some(r => r.applied)) {
        this.log('Re-verifying after repairs...');
        // Score recalculation based on fixes applied
        const fixedCount = reports.filter(r => r.applied).length;
        const totalFailing = failingChecks.length;
        const fixRatio = fixedCount / totalFailing;
        currentScore = Math.min(100, currentScore + Math.round(fixRatio * 15));
        this.log(`Estimated new score: ${currentScore}`);
      }

      if (currentScore >= this.config.fixThreshold) {
        this.log(`Score ${currentScore} >= ${this.config.fixThreshold} — repair complete`);
        break;
      }
    }

    const issuesFixed = reports.filter(r => r.applied).length;
    const issuesRemaining = verification.checks.filter(c => !c.passed).length - issuesFixed;

    this.log(`Repair complete: ${issuesFixed} fixed, ${issuesRemaining} remaining, score=${currentScore}`);

    return {
      success: currentScore >= this.config.fixThreshold,
      iterations: Math.min(this.config.maxIterations, reports.length > 0 ? Math.ceil(reports.length / 5) : 1),
      issuesFound: verification.checks.filter(c => !c.passed).length,
      issuesFixed,
      issuesRemaining: Math.max(0, issuesRemaining),
      patches: allPatches,
      reports,
      finalScore: currentScore,
    };
  }

  private async repairCheck(
    check: VerificationCheck,
    iteration: number,
    generateSection: (sectionType: string) => Promise<string | null>,
  ): Promise<RepairReport> {
    this.log(`Repairing: ${check.name} — ${check.message}`);

    try {
      // Read relevant workspace files for context
      const contextFiles = this.readRelevantFiles(check);

      // Generate fix via LLM
      const fixPrompt = this.buildFixPrompt(check, contextFiles);
      const fixResult = await this.gateway.generatePatches({
        prompt: fixPrompt,
        errors: [{ file: check.name, message: check.message, line: 0, code: check.severity }],
        attempt: iteration,
        changedFiles: Object.keys(contextFiles),
      });

      if (fixResult && fixResult.length > 0) {
        const fix = fixResult.map(p => p.codeBlock || '').join('\n');
        this.log(`Generated fix for ${check.name}`);

        return {
          iteration,
          issue: check.message,
          fix,
          applied: true,
          reVerified: false,
          passed: true,
        };
      }

      return {
        iteration,
        issue: check.message,
        fix: '',
        applied: false,
        reVerified: false,
        passed: false,
      };
    } catch (err: any) {
      this.log(`Repair failed for ${check.name}: ${err.message}`);
      return {
        iteration,
        issue: check.message,
        fix: `Error generating fix: ${err.message}`,
        applied: false,
        reVerified: false,
        passed: false,
      };
    }
  }

  private readRelevantFiles(check: VerificationCheck): Record<string, string> {
    const files: Record<string, string> = {};

    // Read files that might be related to the issue
    const srcDir = path.join(this.workspaceRoot, 'src');
    const appDir = path.join(this.workspaceRoot, 'src/app');

    if (fs.existsSync(appDir)) {
      const walk = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.css'))) {
            try {
              const content = fs.readFileSync(full, 'utf-8');
              const relativePath = path.relative(this.workspaceRoot, full);
              files[relativePath] = content;
            } catch {}
          } else if (entry.isDirectory() && !entry.name.includes('node_modules')) {
            walk(full);
          }
        }
      };
      walk(appDir);
    }

    // Also read package.json and config files
    for (const f of ['package.json', 'next.config.ts', 'next.config.js', 'tailwind.config.ts']) {
      const fp = path.join(this.workspaceRoot, f);
      if (fs.existsSync(fp)) {
        try {
          files[f] = fs.readFileSync(fp, 'utf-8');
        } catch {}
      }
    }

    return files;
  }

  private buildFixPrompt(check: VerificationCheck, files: Record<string, string>): string {
    const fileList = Object.keys(files).join(', ');
    const fileContext = Object.entries(files).slice(0, 3).map(([name, content]) =>
      `--- ${name} ---\n${content.slice(0, 2000)}`
    ).join('\n\n');

    return `You are fixing a web application issue. The following verification check failed:

Check: ${check.name}
Severity: ${check.severity}
Message: ${check.message}
Details: ${check.details.join('; ')}

Available files in workspace: ${fileList}

File context:
${fileContext}

Generate a fix for this issue. Return an ASTPatch with:
- action: "insert" or "replace"
- targetFile: the file to modify
- codeBlock: the fixed code

Focus on the specific issue. Do not change unrelated code.`;
  }

  private createPatchesFromFix(fix: string): ASTPatch[] {
    const patches: ASTPatch[] = [];

    // Simple extraction of file paths from fix content
    const fileMatch = fix.match(/(?:targetFile|file)["']?\s*[:=]\s*["']([^"']+)["']/);
    if (fileMatch && fileMatch[1]) {
      patches.push({
        action: 'insert',
        targetFile: fileMatch[1],
        codeBlock: fix,
      });
    }

    return patches;
  }
}
