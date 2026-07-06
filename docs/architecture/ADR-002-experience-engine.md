# ADR-002: Experience Engine

## Status

Accepted

## Context

Build.Anything v2 needs to learn from past pipeline executions to improve future runs. Currently each pipeline execution is stateless with no memory of what worked, what failed, or what patterns emerged. The Decision Engine needs historical data to make informed recommendations.

## Decision

Implement an `ExperienceEngine` that records pipeline execution outcomes, persists them to disk, and provides query/recommendation APIs for the Decision Engine.

## Responsibilities

- Record pipeline execution outcomes (stages, durations, tokens, errors, cache hits)
- Persist execution history to `.build-anything/experience/` as JSON
- Query historical data by industry, stage, task type, provider
- Compute performance statistics (avg duration, success rate, token usage)
- Generate data-driven recommendations for the Decision Engine
- Detect patterns (provider performance, common failures, token efficiency)

## Public Interfaces

```ts
class ExperienceEngine {
  recordOutcome(outcome: PipelineOutcome): void
  getRecommendations(context: DecisionContext): ExperienceRecommendations
  getHistory(query: HistoryQuery): PipelineOutcome[]
  getStats(filter?: StatsFilter): ExperienceStats
  getProviderPerformance(provider: string): ProviderStats
  getStagePerformance(stageId: string): StageStats
  persist(): void
  load(): void
}
```

## Dependencies

- Event Bus (for publishing outcome events)
- File system (for persistence)

## Extension Points

- Custom recommendation strategies via `RecommendationStrategy`
- Custom statistics aggregators
- Custom pattern detectors

## Risks

- Cold start with no history mitigated by returning low-confidence defaults
- Disk I/O on every outcome mitigated by batching writes

## Future Evolution

- ML-based prediction models
- Cross-project learning
- Anomaly detection in execution patterns
- A/B testing of strategies
