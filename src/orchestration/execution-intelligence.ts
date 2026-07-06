// ─── Execution Intelligence ───────────────────────────────────────────────────
//
// Facade that combines Decision Engine, Experience Engine, and Event Bus
// into a unified optimization layer for the Orchestrator.
//
// Design Principles:
// - Single entry point for all execution decisions
// - Coordinate subsystems without tight coupling
// - Record outcomes for continuous learning
// ──────────────────────────────────────────────────────────────────────────────

import type { LLMTaskType, Industry, ProjectManifest } from './types.js';
import { EventBus } from './event-bus.js';
import { ExperienceEngine, type StageOutcome, type PipelineOutcome } from './experience-engine.js';
import { DecisionEngine, type ProviderHealth, type ModelDecision, type CacheDecision, type RetryDecision, type ConcurrencyDecision } from './decision-engine.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IntelligenceContext {
  providerHealth: Map<string, ProviderHealth>;
  budgetRemaining: number;
  dependencies: string[];
  isParallelizable: boolean;
}

export interface StageStrategy {
  model: ModelDecision;
  cache: CacheDecision;
  retry: RetryDecision;
  concurrency: ConcurrencyDecision;
  estimatedDurationMs: number;
  estimatedTokens: number;
}

export interface ExecutionIntelligenceConfig {
  workingDirectory: string;
  eventBusHistoryCapacity?: number;
}

// ─── Execution Intelligence ──────────────────────────────────────────────────

export class ExecutionIntelligence {
  private eventBus: EventBus;
  private experienceEngine: ExperienceEngine;
  private decisionEngine: DecisionEngine;
  private workingDirectory: string;

  constructor(config: ExecutionIntelligenceConfig) {
    this.workingDirectory = config.workingDirectory;
    this.eventBus = new EventBus(config.eventBusHistoryCapacity ?? 1000);
    this.experienceEngine = new ExperienceEngine(config.workingDirectory, this.eventBus);
    this.decisionEngine = new DecisionEngine(this.eventBus, this.experienceEngine);
  }

  /**
   * Get the optimal strategy for executing a stage.
   */
  getStageStrategy(
    stageId: string,
    manifest: ProjectManifest,
    context: IntelligenceContext,
  ): StageStrategy {
    const industry = manifest.domain as Industry | undefined;

    const model = this.decisionEngine.selectModel({
      taskType: 'analysis' as LLMTaskType,
      stageId,
      industry,
      budgetRemaining: context.budgetRemaining,
      providerHealth: context.providerHealth,
    });

    const cache = this.decisionEngine.shouldCache(stageId, {}, {
      stageId,
      artifactType: 'json',
      tokenEstimate: 1000,
    });

    const retry = this.decisionEngine.getRetryStrategy('default', 0, {
      stageId,
      errorType: 'default',
      attempt: 0,
    });

    const concurrency = this.decisionEngine.getConcurrencyLimit(stageId, {
      stageId,
      dependencies: context.dependencies,
      isParallelizable: context.isParallelizable,
    });

    const experienceRecs = this.experienceEngine.getRecommendations({
      stageId,
      taskType: 'analysis' as LLMTaskType,
      industry,
    });

    return {
      model,
      cache,
      retry,
      concurrency,
      estimatedDurationMs: experienceRecs.estimatedDurationMs,
      estimatedTokens: experienceRecs.estimatedTokens,
    };
  }

  /**
   * Record stage completion for learning.
   */
  recordStageComplete(stageId: string, outcome: StageOutcome): void {
    this.decisionEngine.recordOutcome({
      decisionType: 'model',
      stageId,
      success: outcome.success,
      details: {
        provider: outcome.provider,
        model: outcome.model,
        durationMs: outcome.durationMs,
        tokensUsed: outcome.tokensUsed,
      },
    });
  }

  /**
   * Record pipeline completion for learning.
   */
  recordPipelineComplete(outcome: PipelineOutcome): void {
    this.experienceEngine.recordOutcome(outcome);
    this.experienceEngine.persist();
  }

  /**
   * Get the event bus for subscribing to lifecycle events.
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Get the decision engine for direct access.
   */
  getDecisionEngine(): DecisionEngine {
    return this.decisionEngine;
  }

  /**
   * Get the experience engine for direct access.
   */
  getExperienceEngine(): ExperienceEngine {
    return this.experienceEngine;
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createExecutionIntelligence(config: ExecutionIntelligenceConfig): ExecutionIntelligence {
  return new ExecutionIntelligence(config);
}
