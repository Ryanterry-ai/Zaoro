import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { RenderResult } from './renderers/renderer.js';
import { loadComponentSpecManifest } from './component-spec-writer.js';

export interface AssemblyInput {
  /** Name of the worktree or build group */
  sourceName: string;
  /** Render result files from this group */
  files: Array<{ path: string; content: string; type: string }>;
  /** Errors encountered during build */
  errors: string[];
}

export interface AssemblyResult {
  /** All merged files keyed by their path */
  mergedFiles: Map<string, { content: string; type: string; source: string[] }>;
  /** Any conflicts that required resolution */
  conflicts: AssemblyConflict[];
  /** Component spec files that were assembled */
  specFilesProcessed: number;
  /** Total errors across all groups */
  totalErrors: number;
}

export interface AssemblyConflict {
  /** The file path that had a conflict */
  filePath: string;
  /** Groups that contributed to this file */
  sources: string[];
  /** How the conflict was resolved */
  resolution: 'first-wins' | 'deduplicated' | 'merged';
}

function contentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Assemble render results from parallel worktrees/groups into a single
 * unified file set. Detects and reports conflicts.
 *
 * For component files with identical content across groups, keeps one copy
 * (deduplicated). For shell/singleton files that differ, uses first-wins.
 */
export function assembleRenderResults(inputs: AssemblyInput[]): AssemblyResult {
  const mergedFiles = new Map<string, { content: string; type: string; source: string[] }>();
  const contentSeen = new Map<string, string>(); // contentHash -> filePath (for dedup)
  const conflicts: AssemblyConflict[] = [];
  let totalErrors = 0;
  let specFilesProcessed = 0;

  for (const input of inputs) {
    totalErrors += input.errors.length;

    for (const file of input.files) {
      /* Skip spec/auxiliary files — only merge actual source code */
      if (file.path.startsWith('.') || file.path.endsWith('.spec.json')) {
        specFilesProcessed++;
        continue;
      }

      const existing = mergedFiles.get(file.path);
      if (existing) {
        const hash = contentHash(file.content);
        const existingHash = contentHash(existing.content);

        if (hash === existingHash) {
          /* Identical content — deduplicate silently */
          existing.source.push(input.sourceName);
          conflicts.push({
            filePath: file.path,
            sources: [existing.source[0]!, input.sourceName],
            resolution: 'deduplicated',
          });
        } else {
          /* Different content — first-wins */
          existing.source.push(input.sourceName);
          conflicts.push({
            filePath: file.path,
            sources: [existing.source[0]!, input.sourceName],
            resolution: 'first-wins',
          });
        }
      } else {
        mergedFiles.set(file.path, {
          content: file.content,
          type: file.type,
          source: [input.sourceName],
        });
        contentSeen.set(contentHash(file.content), file.path);
      }
    }
  }

  return {
    mergedFiles,
    conflicts,
    specFilesProcessed,
    totalErrors,
  };
}

/**
 * Validate the assembled result against the component spec manifest.
 * Returns files that are missing or have type mismatches.
 */
export function validateAssembly(
  assembly: AssemblyResult,
  workspaceDir: string,
): { ok: boolean; warnings: string[] } {
  const warnings: string[] = [];

  const manifest = loadComponentSpecManifest(workspaceDir);
  if (!manifest) {
    warnings.push('No component spec manifest found — skipping validation');
    return { ok: true, warnings };
  }

  /* Check that we processed all expected components */
  const expectedCount = manifest.totalComponents;
  if (assembly.specFilesProcessed < expectedCount) {
    warnings.push(
      `Assembly processed ${assembly.specFilesProcessed}/${expectedCount} spec files ` +
      `(${expectedCount - assembly.specFilesProcessed} missing)`,
    );
  }

  if (assembly.totalErrors > 0) {
    warnings.push(`Assembly completed with ${assembly.totalErrors} group errors`);
  }

  return { ok: warnings.length === 0, warnings };
}

/**
 * Write the assembled result to disk as a unified RenderResult.
 */
export function writeAssemblyResult(
  assembly: AssemblyResult,
  outputDir: string,
  workspaceDir: string,
): RenderResult {
  const renderResult: RenderResult = {
    files: [],
    warnings: [...assembly.conflicts.map(c => `Conflict: ${c.filePath} (${c.resolution})`)],
  };

  for (const [filePath, entry] of assembly.mergedFiles) {
    renderResult.files.push({
      path: filePath,
      content: entry.content,
      type: entry.type as any,
    });
  }

  /* Write validation report */
  const validation = validateAssembly(assembly, workspaceDir);
  renderResult.warnings.push(...validation.warnings);

  /* Persist the merged render result as JSON */
  const assemblyDir = path.join(outputDir, '.assembly');
  fs.mkdirSync(assemblyDir, { recursive: true });
  fs.writeFileSync(
    path.join(assemblyDir, 'assembly-result.json'),
    JSON.stringify(
      {
        conflicts: assembly.conflicts,
        specFilesProcessed: assembly.specFilesProcessed,
        totalErrors: assembly.totalErrors,
        fileCount: renderResult.files.length,
        warnings: renderResult.warnings,
        valid: validation.ok,
      },
      null,
      2,
    ),
    'utf-8',
  );

  return renderResult;
}
