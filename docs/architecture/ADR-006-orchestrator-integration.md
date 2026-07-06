# ADR-006: Orchestrator Integration

## Status

Accepted

## Context

The Orchestrator currently manages pipeline execution with static configuration. Milestone 1 introduces Execution Intelligence, Experience Engine, Decision Engine, and Event Bus. These need to be wired into the orchestrator with minimal changes to preserve backward compatibility.

## Decision

Integrate new subsystems as optional dependencies with backward-compatible defaults. The orchestrator initializes Execution Intelligence if not provided, uses stage strategies when available, and records outcomes after each stage.

## Integration Points

### Constructor
- Initialize `ExecutionIntelligence` with default config if not provided
- Wire `EventBus` events to existing `OrchestratorEvent` emissions

### Stage Execution
- Before each stage: call `executionIntelligence.getStageStrategy()` for model/retry/concurrency
- Use strategy's `model` decision in LLM adapter calls
- Use strategy's `retry` decision for retry parameters
- Use strategy's `concurrency` for parallel execution limits

### After Stage
- Call `executionIntelligence.recordStageComplete()` with outcome
- Publish stage completion events via EventBus

### Pipeline Completion
- Call `executionIntelligence.recordPipelineComplete()` with full outcome
- Publish pipeline completion event

## Backward Compatibility

- All new fields are optional in `OrchestratorConfig`
- Default behavior unchanged when Execution Intelligence is not provided
- Existing event listeners continue to work
- No changes to stage interfaces or artifact contracts

## Public Interfaces

No new public interfaces on the Orchestrator itself. All new functionality is accessed through `ExecutionIntelligence`.

## Dependencies

- Execution Intelligence (optional)
- All Milestone 1 subsystems

## Extension Points

- Custom orchestrator config for subsystem tuning
- Custom event handlers for lifecycle events
- Custom stage strategies

## Risks

- Increased orchestrator complexity mitigated by optional dependencies
- Performance overhead from strategy computation mitigated by caching

## Future Evolution

- Dynamic strategy adjustment during pipeline execution
- Multi-pipeline coordination
- Distributed execution across multiple orchestrator instances
