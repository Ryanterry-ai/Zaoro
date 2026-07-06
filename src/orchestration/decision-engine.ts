// ─── Decision Engine ──────────────────────────────────────────────────────────
//
// Makes intelligent, data-driven decisions about model selection,
// caching, retry strategy, and concurrency limits.
//
// Design Principles:
// - Score-based model selection (capability × health × budget × history)
// - Content-aware caching decisions
// - Error-type-specific retry strategies
// - Stage-aware concurrency limits
// ──────────────────────────────────────────────────────────────────────────────

import { LLMTaskType, type Industry } from './types.js';
import type { EventBus } from './event-bus.js';
import type { ExperienceEngine, ExperienceRecommendations } from './experience-engine.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProviderHealth {
  healthy: boolean;
  failureCount: number;
  lastFailure: number | undefined;
  excludedUntil: number | undefined;
}

export interface ModelSelectionContext {
  taskType: LLMTaskType;
  stageId: string;
  industry: Industry | undefined;
  budgetRemaining: number;
  providerHealth: Map<string, ProviderHealth>;
}

export interface ModelDecision {
  provider: string;
  model: string;
  reasoning: string;
  confidence: number;
}

export interface CacheContext {
  stageId: string;
  artifactType: string;
  tokenEstimate: number;
}

export interface CacheDecision {
  shouldCache: boolean;
  reason: string;
  ttlMs: number;
}

export interface RetryContext {
  stageId: string;
  errorType: string;
  attempt: number;
}

export interface RetryDecision {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface ConcurrencyContext {
  stageId: string;
  dependencies: string[];
  isParallelizable: boolean;
}

export interface ConcurrencyDecision {
  maxConcurrency: number;
  reasoning: string;
}

export type DecisionType = 'model' | 'cache' | 'retry' | 'concurrency';

export interface DecisionOutcome {
  decisionType: DecisionType;
  stageId: string;
  success: boolean;
  details: Record<string, unknown>;
}

// ─── Provider Profiles ───────────────────────────────────────────────────────

interface ProviderProfile {
  id: string;
  name: string;
  taskCapabilities: LLMTaskType[];
  costPer1kTokens: number;
  maxTokens: number;
  avgLatencyMs: number;
  supportsJSON: boolean;
}

const PROVIDER_PROFILES: ProviderProfile[] = [
  { id: 'groq', name: 'Groq', taskCapabilities: [LLMTaskType.StructuredExtraction, LLMTaskType.Analysis, LLMTaskType.CodeGeneration], costPer1kTokens: 0.0001, maxTokens: 8192, avgLatencyMs: 200, supportsJSON: true },
  { id: 'gemini', name: 'Google Gemini', taskCapabilities: [LLMTaskType.StructuredExtraction, LLMTaskType.Analysis, LLMTaskType.Creative, LLMTaskType.CodeGeneration, LLMTaskType.Planning], costPer1kTokens: 0.0002, maxTokens: 8192, avgLatencyMs: 500, supportsJSON: true },
  { id: 'anthropic', name: 'Anthropic', taskCapabilities: [LLMTaskType.Analysis, LLMTaskType.Creative, LLMTaskType.CodeGeneration, LLMTaskType.Review, LLMTaskType.Planning], costPer1kTokens: 0.003, maxTokens: 8192, avgLatencyMs: 1000, supportsJSON: false },
  { id: 'openai', name: 'OpenAI', taskCapabilities: [LLMTaskType.StructuredExtraction, LLMTaskType.Analysis, LLMTaskType.Creative, LLMTaskType.CodeGeneration, LLMTaskType.Review, LLMTaskType.Planning], costPer1kTokens: 0.003, maxTokens: 16384, avgLatencyMs: 800, supportsJSON: true },
];

// ─── Default Strategies ──────────────────────────────────────────────────────

const DEFAULT_RETRY_STRATEGIES: Record<string, RetryDecision> = {
  'network': { maxAttempts: 5, baseDelayMs: 1000, maxDelayMs: 30000, backoffMultiplier: 2 },
  'validation': { maxAttempts: 3, baseDelayMs: 2000, maxDelayMs: 15000, backoffMultiplier: 2 },
  'timeout': { maxAttempts: 3, baseDelayMs: 2000, maxDelayMs: 20000, backoffMultiplier: 2 },
  'rate-limit': { maxAttempts: 1, baseDelayMs: 5000, maxDelayMs: 5000, backoffMultiplier: 1 },
  'auth': { maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0, backoffMultiplier: 1 },
  'default': { maxAttempts: 3, baseDelayMs: 1500, maxDelayMs: 20000, backoffMultiplier: 2 },
};

const CONCURRENCY_LIMITS: Record<string, number> = {
  'research': 3,
  'database-design': 2,
  'api-design': 2,
  'frontend-design': 2,
  'integration': 1,
  'quality-assurance': 1,
  'deployment': 1,
  'documentation': 1,
  'business-analysis': 1,
  'architecture': 1,
  'project-intake': 1,
};

// ─── Decision Engine ─────────────────────────────────────────────────────────

export class DecisionEngine {
  private eventBus: EventBus | undefined;
  private experience: ExperienceEngine | undefined;
  private decisionOutcomes: DecisionOutcome[] = [];

  constructor(eventBus?: EventBus, experience?: ExperienceEngine) {
    this.eventBus = eventBus;
    this.experience = experience;
  }

  /**
   * Select the optimal LLM provider/model for a task.
   */
  selectModel(context: ModelSelectionContext): ModelDecision {
    const experienceRecs = this.experience?.getRecommendations({
      stageId: context.stageId,
      taskType: context.taskType,
      industry: context.industry,
    });

    const scores: Array<{ provider: string; model: string; score: number; reasoning: string }> = [];

    for (const profile of PROVIDER_PROFILES) {
      const capabilityMatch = profile.taskCapabilities.includes(context.taskType) ? 1.0 : 0.2;

      const health = context.providerHealth.get(profile.id);
      const healthScore = !health
        ? 0.5
        : health.healthy
          ? 1.0
          : health.excludedUntil && health.excludedUntil > Date.now()
            ? 0.0
            : 0.3;

      const budgetScore = context.budgetRemaining > 0
        ? Math.min(1.0, context.budgetRemaining / (profile.costPer1kTokens * 1000))
        : 0.5;

      let historyScore = 0.5;
      if (experienceRecs?.suggestedProvider === profile.id) {
        historyScore = 0.5 + experienceRecs.confidence * 0.5;
      }

      const totalScore = capabilityMatch * 0.3 + healthScore * 0.3 + budgetScore * 0.2 + historyScore * 0.2;

      scores.push({
        provider: profile.id,
        model: profile.id === 'anthropic' ? 'claude-sonnet-4-20250514' : profile.id === 'openai' ? 'gpt-4o' : profile.id === 'gemini' ? 'gemini-2.0-flash' : 'llama-3.3-70b-versatile',
        score: totalScore,
        reasoning: `capability=${capabilityMatch.toFixed(1)} health=${healthScore.toFixed(1)} budget=${budgetScore.toFixed(1)} history=${historyScore.toFixed(1)}`,
      });
    }

    scores.sort((a, b) => b.score - a.score);
    const best = scores[0]!;

    const decision: ModelDecision = {
      provider: best.provider,
      model: best.model,
      reasoning: best.reasoning,
      confidence: Math.round(best.score * 100) / 100,
    };

    this.eventBus?.publish({
      type: 'ModelSelected',
      payload: {
        executionId: '',
        stageId: context.stageId,
        provider: decision.provider,
        model: decision.model,
        taskType: context.taskType,
      },
      timestamp: Date.now(),
    });

    return decision;
  }

  /**
   * Decide whether to cache an artifact.
   */
  shouldCache(artifactKey: string, content: unknown, context: CacheContext): CacheDecision {
    const isStableType = ['config', 'schema', 'entity', 'enum'].some(t =>
      artifactKey.toLowerCase().includes(t)
    );

    const isCreativeType = ['research', 'creative', 'analysis'].some(t =>
      context.stageId.toLowerCase().includes(t)
    );

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const tokenEstimate = Math.ceil(contentStr.length / 4);

    if (isCreativeType) {
      return { shouldCache: false, reason: 'Creative/research content changes per execution.', ttlMs: 0 };
    }

    if (tokenEstimate < 500) {
      return { shouldCache: false, reason: 'Content too small to benefit from caching.', ttlMs: 0 };
    }

    if (isStableType) {
      return { shouldCache: true, reason: 'Stable content (schema/config/entity) benefits from caching.', ttlMs: 3600_000 };
    }

    if (tokenEstimate > 2000) {
      return { shouldCache: true, reason: 'Large content (>2000 tokens) worth caching to save tokens.', ttlMs: 1800_000 };
    }

    return { shouldCache: false, reason: 'Medium content with moderate change likelihood.', ttlMs: 0 };
  }

  /**
   * Get retry strategy for an error type.
   */
  getRetryStrategy(errorType: string, _attempt: number, context: RetryContext): RetryDecision {
    const strategy = DEFAULT_RETRY_STRATEGIES[errorType] ?? DEFAULT_RETRY_STRATEGIES['default']!;
    void context;
    return { ...strategy };
  }

  /**
   * Get concurrency limit for a stage.
   */
  getConcurrencyLimit(stageId: string, context: ConcurrencyContext): ConcurrencyDecision {
    const baseLimit = CONCURRENCY_LIMITS[stageId] ?? 1;

    const limit = context.isParallelizable ? baseLimit : 1;

    return {
      maxConcurrency: limit,
      reasoning: context.isParallelizable
        ? `Stage is parallelizable. Base limit: ${baseLimit}.`
        : 'Stage has sequential dependencies. Concurrency limited to 1.',
    };
  }

  /**
   * Record a decision outcome for learning.
   */
  recordOutcome(outcome: DecisionOutcome): void {
    this.decisionOutcomes.push(outcome);
  }

  /**
   * Get recent decision outcomes.
   */
  getRecentOutcomes(limit = 50): DecisionOutcome[] {
    return this.decisionOutcomes.slice(-limit);
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createDecisionEngine(eventBus?: EventBus, experience?: ExperienceEngine): DecisionEngine {
  return new DecisionEngine(eventBus, experience);
}
