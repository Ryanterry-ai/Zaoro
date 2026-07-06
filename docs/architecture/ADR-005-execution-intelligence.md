# ADR-005: Execution Intelligence

## Status

Accepted

## Context

The Decision Engine, Experience Engine, and Event Bus are independent subsystems. The Orchestrator needs a single entry point that coordinates all three to provide stage-specific optimization strategies. Without this facade, the orchestrator would need to wire each subsystem individually.

## Decision

Implement an `ExecutionIntelligence` facade that combines Decision Engine, Experience Engine, and Event Bus into a unified optimization layer.

## Responsibilities

- Provide a single `getStageStrategy()` method for the orchestrator
- Coordinate model selection, caching, retry, and concurrency decisions
- Record stage outcomes for learning
- Record pipeline outcomes for experience
- Expose subsystem accessors for direct use when needed

## Public Interfaces

```ts
class ExecutionIntelligence {
  getStageStrategy(stageId: string, manifest: ProjectManifest, context: IntelligenceContext): StageStrategy
  recordStageComplete(stageId: string, outcome: StageOutcome): void
  recordPipelineComplete(outcome: PipelineOutcome): void
  getEventBus(): EventBus
  getDecisionEngine(): DecisionEngine
  getExperienceEngine(): ExperienceEngine
}

interface StageStrategy {
  model: ModelDecision
  cache: CacheDecision
  retry: RetryDecision
  concurrency: ConcurrencyDecision
  estimatedDurationMs: number
  estimatedTokens: number
}
```

## Dependencies

- Decision Engine
- Experience Engine
- Event Bus

## Extension Points

- Custom strategy composition
- Custom optimization objectives
- Custom strategy transformers

## Risks

- Complexity from coordinating multiple subsystems mitigated by clear interfaces
- Single point of failure mitigated by graceful degradation

## Future Evolution

- Adaptive strategies based on runtime conditions
- Multi-objective optimization
- Self-tuning parameters
- Strategy composition from multiple sources
