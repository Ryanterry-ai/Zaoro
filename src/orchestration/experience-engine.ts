// ─── Experience Engine ────────────────────────────────────────────────────────
//
// Tracks pipeline execution outcomes, learns patterns, and provides
// data-driven recommendations for future runs.
//
// Design Principles:
// - Record everything, learn from patterns
// - Persist to disk for cross-session learning
// - Query-first design for recommendations
// - Graceful cold start with sensible defaults
// ──────────────────────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';
import type { Industry, LLMTaskType } from './types.js';
import type { EventBus, PipelineCompletedPayload } from './event-bus.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StageOutcome {
  stageId: string;
  provider: string | undefined;
  model: string | undefined;
  taskType: LLMTaskType | undefined;
  durationMs: number;
  tokensUsed: number;
  llmCalls: number;
  success: boolean;
  error: string | undefined;
  cacheHit: boolean;
}

export interface PipelineOutcome {
  executionId: string;
  industry: Industry | undefined;
  stages: StageOutcome[];
  totalDurationMs: number;
  totalTokens: number;
  totalLlmCalls: number;
  success: boolean;
  completedAt: number;
}

export interface DecisionContext {
  stageId: string;
  taskType: LLMTaskType;
  industry: Industry | undefined;
}

export interface ExperienceRecommendations {
  suggestedProvider: string | undefined;
  suggestedTaskType: LLMTaskType | undefined;
  estimatedDurationMs: number;
  estimatedTokens: number;
  confidence: number;
  reasoning: string;
}

export interface HistoryQuery {
  industry?: Industry;
  stageId?: string;
  limit?: number;
  offset?: number;
  successOnly?: boolean;
}

export interface StatsFilter {
  industry?: Industry;
  stageId?: string;
  since?: number;
}

export interface ExperienceStats {
  totalExecutions: number;
  successRate: number;
  avgDurationMs: number;
  avgTokens: number;
  avgLlmCalls: number;
  byIndustry: Record<string, { count: number; successRate: number; avgDurationMs: number }>;
  byStage: Record<string, { count: number; successRate: number; avgDurationMs: number; avgTokens: number }>;
}

export interface ProviderStats {
  provider: string;
  totalCalls: number;
  successRate: number;
  avgDurationMs: number;
  avgTokens: number;
  byTaskType: Record<string, { calls: number; successRate: number; avgDurationMs: number }>;
}

export interface StageStats {
  stageId: string;
  totalRuns: number;
  successRate: number;
  avgDurationMs: number;
  avgTokens: number;
  avgLlmCalls: number;
  commonErrors: Array<{ error: string; count: number }>;
}

// ─── Experience Engine ───────────────────────────────────────────────────────

export class ExperienceEngine {
  private outcomes: PipelineOutcome[] = [];
  private persistPath: string;
  private dirty = false;
  private eventBus: EventBus | undefined;

  constructor(workingDirectory: string, eventBus?: EventBus) {
    this.persistPath = path.join(workingDirectory, '.build-anything', 'experience', 'history.json');
    this.eventBus = eventBus;
    this.load();
  }

  /**
   * Record a pipeline execution outcome.
   */
  recordOutcome(outcome: PipelineOutcome): void {
    this.outcomes.push(outcome);
    this.dirty = true;

    this.eventBus?.publish({
      type: 'PipelineCompleted',
      payload: {
        executionId: outcome.executionId,
        durationMs: outcome.totalDurationMs,
        success: outcome.success,
      },
      timestamp: Date.now(),
    });

    if (this.outcomes.length % 10 === 0) {
      this.persist();
    }
  }

  /**
   * Get recommendations for a decision context based on historical data.
   */
  getRecommendations(context: DecisionContext): ExperienceRecommendations {
    const relevant = this.outcomes.filter(o =>
      o.stages.some(s => s.stageId === context.stageId)
    );

    if (relevant.length === 0) {
      return {
        suggestedProvider: undefined,
        suggestedTaskType: context.taskType,
        estimatedDurationMs: 120_000,
        estimatedTokens: 8000,
        confidence: 0.1,
        reasoning: 'No historical data available. Using defaults.',
      };
    }

    const stageRuns = relevant.flatMap(o =>
      o.stages.filter(s => s.stageId === context.stageId)
    );

    const successfulRuns = stageRuns.filter(s => s.success);
    const providerCounts = new Map<string, { count: number; successCount: number; totalDuration: number; totalTokens: number }>();

    for (const run of successfulRuns) {
      if (!run.provider) continue;
      const existing = providerCounts.get(run.provider) ?? { count: 0, successCount: 0, totalDuration: 0, totalTokens: 0 };
      existing.count++;
      existing.successCount++;
      existing.totalDuration += run.durationMs;
      existing.totalTokens += run.tokensUsed;
      providerCounts.set(run.provider, existing);
    }

    for (const run of stageRuns) {
      if (!run.provider || run.success) continue;
      const existing = providerCounts.get(run.provider) ?? { count: 0, successCount: 0, totalDuration: 0, totalTokens: 0 };
      existing.count++;
      providerCounts.set(run.provider, existing);
    }

    let bestProvider: string | undefined;
    let bestScore = -1;

    for (const [provider, stats] of providerCounts) {
      const successRate = stats.count > 0 ? stats.successCount / stats.count : 0;
      const avgDuration = stats.successCount > 0 ? stats.totalDuration / stats.successCount : 200_000;
      const score = successRate * 0.6 + (1 - Math.min(avgDuration / 300_000, 1)) * 0.4;
      if (score > bestScore) {
        bestScore = score;
        bestProvider = provider;
      }
    }

    const bestStats = bestProvider ? providerCounts.get(bestProvider) : undefined;
    const avgDuration = bestStats && bestStats.successCount > 0
      ? bestStats.totalDuration / bestStats.successCount
      : 120_000;
    const avgTokens = bestStats && bestStats.successCount > 0
      ? bestStats.totalTokens / bestStats.successCount
      : 8000;

    const confidence = Math.min(relevant.length / 10, 1) * 0.5 + bestScore * 0.5;

    return {
      suggestedProvider: bestProvider,
      suggestedTaskType: context.taskType,
      estimatedDurationMs: Math.round(avgDuration),
      estimatedTokens: Math.round(avgTokens),
      confidence: Math.round(confidence * 100) / 100,
      reasoning: `Based on ${relevant.length} historical runs. Best provider: ${bestProvider ?? 'unknown'} (${Math.round(bestScore * 100)}% score).`,
    };
  }

  /**
   * Query execution history.
   */
  getHistory(query: HistoryQuery): PipelineOutcome[] {
    let results = this.outcomes;

    if (query.industry) {
      results = results.filter(o => o.industry === query.industry);
    }
    if (query.stageId) {
      results = results.filter(o => o.stages.some(s => s.stageId === query.stageId));
    }
    if (query.successOnly) {
      results = results.filter(o => o.success);
    }

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;
    return results.slice(offset, offset + limit);
  }

  /**
   * Get aggregate statistics.
   */
  getStats(filter?: StatsFilter): ExperienceStats {
    let data = this.outcomes;

    if (filter?.industry) {
      data = data.filter(o => o.industry === filter.industry);
    }
    if (filter?.stageId) {
      data = data.filter(o => o.stages.some(s => s.stageId === filter.stageId));
    }
    if (filter?.since) {
      const since = filter.since;
      data = data.filter(o => o.completedAt >= since);
    }

    const total = data.length;
    const successCount = data.filter(o => o.success).length;
    const avgDuration = total > 0 ? data.reduce((s, o) => s + o.totalDurationMs, 0) / total : 0;
    const avgTokens = total > 0 ? data.reduce((s, o) => s + o.totalTokens, 0) / total : 0;
    const avgLlmCalls = total > 0 ? data.reduce((s, o) => s + o.totalLlmCalls, 0) / total : 0;

    const byIndustry: Record<string, { count: number; successRate: number; avgDurationMs: number }> = {};
    for (const outcome of data) {
      const key = outcome.industry ?? 'unknown';
      if (!byIndustry[key]) byIndustry[key] = { count: 0, successRate: 0, avgDurationMs: 0 };
      byIndustry[key].count++;
    }
    for (const [key, stats] of Object.entries(byIndustry)) {
      const industryOutcomes = data.filter(o => (o.industry ?? 'unknown') === key);
      stats.successRate = industryOutcomes.filter(o => o.success).length / stats.count;
      stats.avgDurationMs = industryOutcomes.reduce((s, o) => s + o.totalDurationMs, 0) / stats.count;
    }

    const byStage: Record<string, { count: number; successRate: number; avgDurationMs: number; avgTokens: number }> = {};
    for (const outcome of data) {
      for (const stage of outcome.stages) {
        let entry = byStage[stage.stageId];
        if (!entry) {
          entry = { count: 0, successRate: 0, avgDurationMs: 0, avgTokens: 0 };
          byStage[stage.stageId] = entry;
        }
        entry.count++;
        entry.avgDurationMs += stage.durationMs;
        entry.avgTokens += stage.tokensUsed;
      }
    }
    for (const [, stats] of Object.entries(byStage)) {
      stats.avgDurationMs = stats.count > 0 ? stats.avgDurationMs / stats.count : 0;
      stats.avgTokens = stats.count > 0 ? stats.avgTokens / stats.count : 0;
    }

    return {
      totalExecutions: total,
      successRate: total > 0 ? successCount / total : 0,
      avgDurationMs: Math.round(avgDuration),
      avgTokens: Math.round(avgTokens),
      avgLlmCalls: Math.round(avgLlmCalls * 10) / 10,
      byIndustry,
      byStage,
    };
  }

  /**
   * Get performance stats for a specific provider.
   */
  getProviderPerformance(provider: string): ProviderStats {
    const allStageRuns = this.outcomes.flatMap(o => o.stages);
    const providerRuns = allStageRuns.filter(s => s.provider === provider);
    const successful = providerRuns.filter(s => s.success);

    const byTaskType: Record<string, { calls: number; successRate: number; avgDurationMs: number }> = {};
    for (const run of providerRuns) {
      const key = run.taskType ?? 'unknown';
      if (!byTaskType[key]) byTaskType[key] = { calls: 0, successRate: 0, avgDurationMs: 0 };
      byTaskType[key].calls++;
    }
    for (const [key] of Object.entries(byTaskType)) {
      const taskRuns = providerRuns.filter(s => s.taskType === key);
      const taskSuccess = taskRuns.filter(s => s.success);
      const entry = byTaskType[key];
      if (entry) {
        entry.successRate = taskRuns.length > 0 ? taskSuccess.length / taskRuns.length : 0;
        entry.avgDurationMs = taskSuccess.length > 0
          ? taskSuccess.reduce((s, r) => s + r.durationMs, 0) / taskSuccess.length
          : 0;
      }
    }

    return {
      provider,
      totalCalls: providerRuns.length,
      successRate: providerRuns.length > 0 ? successful.length / providerRuns.length : 0,
      avgDurationMs: successful.length > 0
        ? successful.reduce((s, r) => s + r.durationMs, 0) / successful.length
        : 0,
      avgTokens: successful.length > 0
        ? successful.reduce((s, r) => s + r.tokensUsed, 0) / successful.length
        : 0,
      byTaskType,
    };
  }

  /**
   * Get performance stats for a specific stage.
   */
  getStagePerformance(stageId: string): StageStats {
    const stageRuns = this.outcomes.flatMap(o => o.stages.filter(s => s.stageId === stageId));
    const successful = stageRuns.filter(s => s.success);

    const errorCounts = new Map<string, number>();
    for (const run of stageRuns) {
      if (run.error) {
        errorCounts.set(run.error, (errorCounts.get(run.error) ?? 0) + 1);
      }
    }

    return {
      stageId,
      totalRuns: stageRuns.length,
      successRate: stageRuns.length > 0 ? successful.length / stageRuns.length : 0,
      avgDurationMs: successful.length > 0
        ? successful.reduce((s, r) => s + r.durationMs, 0) / successful.length
        : 0,
      avgTokens: successful.length > 0
        ? successful.reduce((s, r) => s + r.tokensUsed, 0) / successful.length
        : 0,
      avgLlmCalls: successful.length > 0
        ? successful.reduce((s, r) => s + r.llmCalls, 0) / successful.length
        : 0,
      commonErrors: Array.from(errorCounts.entries())
        .map(([error, count]) => ({ error, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }

  /**
   * Persist outcomes to disk.
   */
  persist(): void {
    if (!this.dirty) return;
    try {
      const dir = path.dirname(this.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.persistPath, JSON.stringify(this.outcomes, null, 2), 'utf-8');
      this.dirty = false;
    } catch {
      // Persistence failure should not crash the engine
    }
  }

  /**
   * Load outcomes from disk.
   */
  load(): void {
    try {
      if (fs.existsSync(this.persistPath)) {
        const raw = fs.readFileSync(this.persistPath, 'utf-8');
        const parsed = JSON.parse(raw) as PipelineOutcome[];
        this.outcomes = Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      this.outcomes = [];
    }
  }

  /**
   * Get total number of recorded outcomes.
   */
  get size(): number {
    return this.outcomes.length;
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createExperienceEngine(workingDirectory: string, eventBus?: EventBus): ExperienceEngine {
  return new ExperienceEngine(workingDirectory, eventBus);
}
