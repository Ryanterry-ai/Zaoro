# ADR-003: Decision Engine

## Status

Accepted

## Context

Build.Anything v2 needs intelligent, data-driven decisions about model selection, caching, retry strategy, and concurrency. Currently the LLM adapter uses static priority ordering and the orchestrator uses fixed retry parameters. The system should adapt based on task requirements, provider health, and historical performance.

## Decision

Implement a `DecisionEngine` that scores and selects optimal configurations for each pipeline stage based on context, health, budget, and experience data.

## Responsibilities

- Select optimal LLM provider/model for a given task type and context
- Decide whether to cache an artifact (content stability, size, cost analysis)
- Determine retry strategy (max attempts, delays, backoff)
- Recommend concurrency limits per stage
- Record decision outcomes for experience learning

## Decision Logic

### Model Selection
Score each provider by: `(taskCapabilityMatch * 0.3) + (healthScore * 0.3) + (budgetFit * 0.2) + (historicalSuccess * 0.2)`. Highest score wins.

### Caching
Cache if content is >500 tokens AND expected to be stable (schemas, configs, entity definitions). Don't cache creative output, research, or rapidly-changing content.

### Retry
- Network errors: 5 attempts, exponential backoff (1s base, 30s max)
- Validation errors: 3 attempts, moderate backoff (2s base, 15s max)
- Auth/rate-limit errors: 1 attempt (no retry)
- Unknown errors: 3 attempts, conservative backoff

### Concurrency
- Independent stages (research, database): 3 concurrent
- Dependent stages (architecture after research): 1
- IO-bound stages (API design): 2

## Public Interfaces

```ts
class DecisionEngine {
  selectModel(context: ModelSelectionContext): ModelDecision
  shouldCache(artifactKey: string, content: unknown, context: CacheContext): CacheDecision
  getRetryStrategy(errorType: string, attempt: number, context: RetryContext): RetryDecision
  getConcurrencyLimit(stageId: string, context: ConcurrencyContext): ConcurrencyDecision
  recordOutcome(decision: DecisionType, outcome: DecisionOutcome): void
}
```

## Dependencies

- Experience Engine (historical performance data)
- Event Bus (publishing ModelSelected events)

## Extension Points

- Custom scoring functions per decision type
- Custom cache policies
- Custom retry strategies

## Risks

- Over-optimization for past patterns mitigated by confidence decay on old data
- Cold start with no experience data mitigated by sensible defaults

## Future Evolution

- A/B testing of model choices
- Cost optimization (minimize token spend)
- Multi-objective optimization (speed vs quality vs cost)
- Adaptive learning from outcomes
