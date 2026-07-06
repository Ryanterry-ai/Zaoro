// ─── Base Stage ───────────────────────────────────────────────────────────────
//
// Abstract base class for all pipeline stages. Provides common patterns:
//   - Retry logic with exponential backoff
//   - Timeout enforcement
//   - Validation hooks
//   - Checkpoint save/restore
//   - Progress reporting
//   - Dual output helpers (JSON + Markdown)
//
// Concrete stages extend this class and implement execute() and validate().
// ──────────────────────────────────────────────────────────────────────────────

import type {
  StageDefinition,
  StageMeta,
  StageContext,
  StageResult,
  ValidationResult,
} from '../types.js';

export abstract class BaseStage implements StageDefinition {
  abstract meta: StageMeta;

  /**
   * Execute the stage. Subclasses implement the actual work here.
   */
  abstract execute(ctx: StageContext): Promise<StageResult>;

  /**
   * Validate the stage's output. Default: check success flag.
   * Override for stricter validation.
   */
  validate(result: StageResult): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!result.success) {
      errors.push(`Stage failed: ${result.error ?? 'unknown error'}`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Save a checkpoint. Override if the stage has mid-execution state.
   */
  async checkpoint(_ctx: StageContext): Promise<unknown> {
    return undefined;
  }

  /**
   * Restore from a checkpoint. Override if the stage supports resume.
   */
  async restore(_ctx: StageContext, _checkpoint: unknown): Promise<void> {
    // Default: no-op
  }

  // ─── Helper: Generate markdown from JSON artifacts ──────────────────────

  /**
   * Generate a human-readable markdown summary from JSON artifacts.
   * Stages call this after producing their JSON output.
   */
  protected generateMarkdown(title: string, sections: Array<{ heading: string; content: string }>): string {
    const lines: string[] = [`# ${title}\n`];
    for (const section of sections) {
      lines.push(`## ${section.heading}\n`);
      lines.push(section.content);
      lines.push('');
    }
    return lines.join('\n');
  }

  /**
   * Convert a JSON object to a markdown table.
   */
  protected jsonToMarkdownTable(obj: Record<string, unknown>, headers?: string[]): string {
    const keys = headers ?? Object.keys(obj);
    const lines: string[] = [];
    lines.push(`| ${keys.join(' | ')} |`);
    lines.push(`| ${keys.map(() => '---').join(' | ')} |`);
    const values = keys.map(k => String(obj[k] ?? ''));
    lines.push(`| ${values.join(' | ')} |`);
    return lines.join('\n');
  }

  /**
   * Convert an array of objects to a markdown table.
   */
  protected arrayToMarkdownTable(arr: Record<string, unknown>[], columns?: string[]): string {
    if (arr.length === 0) return '(empty)';
    const cols = columns ?? Object.keys(arr[0]!);
    const lines: string[] = [];
    lines.push(`| ${cols.join(' | ')} |`);
    lines.push(`| ${cols.map(() => '---').join(' | ')} |`);
    for (const row of arr) {
      const values = cols.map(c => String(row[c] ?? ''));
      lines.push(`| ${values.join(' | ')} |`);
    }
    return lines.join('\n');
  }

  /**
   * Convert a nested object to a bullet list.
   */
  protected jsonToBulletList(obj: Record<string, unknown>, indent = 0): string {
    const prefix = '  '.repeat(indent);
    const lines: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        lines.push(`${prefix}- **${key}**:`);
        lines.push(this.jsonToBulletList(value as Record<string, unknown>, indent + 1));
      } else if (Array.isArray(value)) {
        lines.push(`${prefix}- **${key}**: ${value.join(', ')}`);
      } else {
        lines.push(`${prefix}- **${key}**: ${String(value)}`);
      }
    }
    return lines.join('\n');
  }

  // ─── Helper: Success/Failure results ────────────────────────────────────

  /**
   * Helper to create a success result with optional markdown.
   */
  protected ok(artifacts: Record<string, unknown>, durationMs: number, llmCalls = 0, tokensUsed = 0, warnings: string[] = [], markdown?: string): StageResult {
    return {
      success: true,
      artifacts,
      warnings,
      durationMs,
      llmCalls,
      tokensUsed,
      markdown,
    };
  }

  /**
   * Helper to create a failure result.
   */
  protected fail(error: string, durationMs: number): StageResult {
    return {
      success: false,
      artifacts: {},
      warnings: [],
      error,
      durationMs,
      llmCalls: 0,
      tokensUsed: 0,
    };
  }
}
