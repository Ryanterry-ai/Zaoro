// ─── Context Budget Manager ───────────────────────────────────────────────────
//
// Manages token budget across the pipeline to stay within Claude Desktop's
// context limits. Provides:
//   - Token tracking per-stage and total
//   - Artifact summarization for context-efficient passing
//   - Selective reload of full artifacts when needed
//   - Budget-aware LLM call preparation
//
// Claude Desktop has ~200K context. The budget manager ensures the pipeline
// doesn't exceed this by summarizing large artifacts between stages.
// ──────────────────────────────────────────────────────────────────────────────

import type {
  ContextBudget,
  ArtifactSummary,
  ArtifactMeta,
} from './types.js';

// ─── Token Estimation ─────────────────────────────────────────────────────────

/**
 * Rough token count estimation. ~4 chars per token for English text.
 * This is intentionally conservative to avoid exceeding limits.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate tokens for a JSON object.
 */
function estimateJsonTokens(obj: unknown): number {
  return estimateTokens(JSON.stringify(obj));
}

// ─── Artifact Summarizer ─────────────────────────────────────────────────────

/**
 * Summarize a large artifact to fit within a token budget.
 * Uses structured truncation: keeps schema, key fields, and examples.
 */
function summarizeArtifact(key: string, content: unknown, maxTokens: number): ArtifactSummary {
  const fullTokens = estimateJsonTokens(content);

  if (fullTokens <= maxTokens) {
    return {
      key,
      summary: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
      tokenCount: fullTokens,
      isSummary: false,
      fullSizeTokens: fullTokens,
    };
  }

  // Structured summarization strategy
  let summary: string;

  if (Array.isArray(content)) {
    summary = summarizeArray(key, content, maxTokens);
  } else if (typeof content === 'object' && content !== null) {
    summary = summarizeObject(key, content as Record<string, unknown>, maxTokens);
  } else {
    summary = summarizeText(String(content), maxTokens);
  }

  return {
    key,
    summary,
    tokenCount: estimateTokens(summary),
    isSummary: true,
    fullSizeTokens: fullTokens,
  };
}

function summarizeArray(key: string, arr: unknown[], maxTokens: number): string {
  const header = `## ${key} (${arr.length} items)\n`;
  const headerTokens = estimateTokens(header);
  const budget = maxTokens - headerTokens;

  if (arr.length === 0) return header + '(empty array)\n';

  // Show first 3 items + summary
  const sampleSize = Math.min(3, arr.length);
  const samples = arr.slice(0, sampleSize);
  const sampleStr = JSON.stringify(samples, null, 2);
  const sampleTokens = estimateJsonTokens(samples);

  if (sampleTokens <= budget) {
    const remaining = arr.length - sampleSize;
    const suffix = remaining > 0 ? `\n... and ${remaining} more items\n` : '\n';
    return header + sampleStr + suffix;
  }

  // Truncate samples to fit
  const truncated = sampleStr.slice(0, budget * 4);
  return header + truncated + '\n... (truncated)\n';
}

function summarizeObject(key: string, obj: Record<string, unknown>, maxTokens: number): string {
  const header = `## ${key}\n`;
  const headerTokens = estimateTokens(header);
  const budget = maxTokens - headerTokens;

  // Extract key-value pairs, prioritizing important fields
  const keys = Object.keys(obj);
  const importantKeys = keys.filter(k =>
    k.includes('name') || k.includes('id') || k.includes('type') ||
    k.includes('description') || k.includes('status') || k.includes('title')
  );
  const otherKeys = keys.filter(k => !importantKeys.includes(k));

  const prioritized = [...importantKeys, ...otherKeys];
  const result: Record<string, unknown> = {};

  let usedTokens = 0;
  for (const k of prioritized) {
    const val = obj[k];
    const valTokens = estimateJsonTokens(val);
    if (usedTokens + valTokens > budget) {
      result[k] = '...(truncated)';
      break;
    }
    result[k] = val;
    usedTokens += valTokens;
  }

  return header + JSON.stringify(result, null, 2) + '\n';
}

function summarizeText(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n... (truncated)';
}

// ─── Context Budget Manager ───────────────────────────────────────────────────

export class ContextBudgetManager {
  private budget: ContextBudget;
  private summaries: Map<string, ArtifactSummary> = new Map();

  constructor(maxTotalTokens: number, maxPerCallTokens: number) {
    this.budget = {
      maxTotalTokens,
      maxPerCallTokens,
      consumedTokens: 0,
      stageUsage: {},
    };
  }

  /**
   * Get the current budget state.
   */
  getBudget(): Readonly<ContextBudget> {
    return { ...this.budget };
  }

  /**
   * Record token usage for a stage.
   */
  recordUsage(stageId: string, tokens: number): void {
    this.budget.consumedTokens += tokens;
    this.budget.stageUsage[stageId] = (this.budget.stageUsage[stageId] ?? 0) + tokens;
  }

  /**
   * Check if a stage can make an LLM call within budget.
   */
  canAfford(estimatedTokens: number): boolean {
    return this.budget.consumedTokens + estimatedTokens <= this.budget.maxTotalTokens;
  }

  /**
   * Get remaining token budget.
   */
  remaining(): number {
    return Math.max(0, this.budget.maxTotalTokens - this.budget.consumedTokens);
  }

  /**
   * Get the per-call token limit.
   */
  getPerCallLimit(): number {
    return this.budget.maxPerCallTokens;
  }

  /**
   * Summarize an artifact to fit within the context budget.
   * If the artifact is small enough, returns the full content.
   * Otherwise, returns a structured summary.
   */
  summarizeArtifact(key: string, content: unknown): ArtifactSummary {
    const existing = this.summaries.get(key);
    if (existing) return existing;

    // Allocate ~15% of remaining budget per artifact summary
    const perArtifactBudget = Math.floor(this.remaining() * 0.15);
    const maxTokens = Math.min(perArtifactBudget, 4096);

    const summary = summarizeArtifact(key, content, maxTokens);
    this.summaries.set(key, summary);
    return summary;
  }

  /**
   * Get a summary of all artifacts for a stage's input context.
   * This is what gets injected into the LLM prompt.
   */
  buildInputContext(
    artifactKeys: string[],
    artifactGetter: <T = unknown>(key: string) => T | undefined,
  ): string {
    const parts: string[] = [];
    let budgetRemaining = this.budget.maxPerCallTokens;

    for (const key of artifactKeys) {
      const content = artifactGetter(key);
      if (content === undefined) continue;

      const summary = this.summarizeArtifact(key, content);
      const section = `### ${summary.key}\n${summary.summary}\n\n`;

      if (estimateTokens(section) > budgetRemaining) {
        parts.push(`### ${summary.key}\n(summarized: ${summary.fullSizeTokens} tokens → ${summary.tokenCount} tokens)\n\n`);
        budgetRemaining -= estimateTokens(`### ${summary.key}\n(summarized)\n\n`);
      } else {
        parts.push(section);
        budgetRemaining -= estimateTokens(section);
      }
    }

    return parts.join('');
  }

  /**
   * Get budget usage report.
   */
  getReport(): string {
    const pct = Math.round((this.budget.consumedTokens / this.budget.maxTotalTokens) * 100);
    const lines = [
      `Context Budget: ${this.budget.consumedTokens.toLocaleString()} / ${this.budget.maxTotalTokens.toLocaleString()} tokens (${pct}%)`,
      `Per-call limit: ${this.budget.maxPerCallTokens.toLocaleString()} tokens`,
      '',
      'Stage usage:',
    ];

    for (const [stage, usage] of Object.entries(this.budget.stageUsage)) {
      lines.push(`  ${stage}: ${usage.toLocaleString()} tokens`);
    }

    return lines.join('\n');
  }
}
