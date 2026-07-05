# 6. Scheduler Events

## Event Catalog

The Scheduler emits the following events. All events follow the schema defined in [execution-runtime/15-events-logging.md](../execution-runtime/15-events-logging.md).

### Lifecycle Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `scheduler.graph_submitted` | ExecutionGraph submitted | `{ graphId, workspaceId, priority, nodeCount }` |
| `scheduler.graph_rejected` | Validation failed | `{ graphId, reason, errors[] }` |
| `scheduler.graph_cancelled` | Cancel requested | `{ graphId, reason }` |
| `scheduler.graph_completed` | All nodes done | `{ graphId, duration, totalNodes, failedNodes }` |
| `scheduler.graph_failed` | Critical node failed | `{ graphId, failedNodeId, error }` |

### Queue Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `scheduler.node_enqueued` | Node added to queue | `{ graphId, nodeId, queue, position, estimatedWaitMs }` |
| `scheduler.node_dequeued` | Node removed from queue | `{ graphId, nodeId, queue, waitTimeMs }` |
| `scheduler.queue_balanced` | Fairness rebalance | `{ queue, entriesAffected }` |
| `scheduler.queue_full` | Queue capacity reached | `{ queue, length, maxCapacity }` |

### Execution Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `scheduler.node_scheduled` | Node assigned to runtime | `{ graphId, nodeId, provider, runtimeId, allocatedCpu, allocatedMem, allocatedPort? }` |
| `scheduler.node_started` | Node execution started | `{ graphId, nodeId, runtimeId, startedAt }` |
| `scheduler.node_completed` | Node execution completed | `{ graphId, nodeId, runtimeId, durationMs, exitCode, metrics? }` |
| `scheduler.node_failed` | Node execution failed | `{ graphId, nodeId, runtimeId, error, attempts }` |
| `scheduler.node_retrying` | Node scheduled for retry | `{ graphId, nodeId, attempt, nextAttemptInMs, error }` |
| `scheduler.node_skipped` | Node skipped (dependency failed) | `{ graphId, nodeId, reason }` |
| `scheduler.node_timed_out` | Node exceeded timeout | `{ graphId, nodeId, timeout. duration }` |
| `scheduler.node_preempted` | Node preempted by higher priority | `{ graphId, nodeId, preemptedBy, runtimeReclaimedMs }` |

### Resource Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `scheduler.resource_exhausted` | No resources available | `{ nodeId, resourceProfile, requestedCpu, requestedMem }` |
| `scheduler.resource_freed` | Resources released | `{ nodeId, freedCpu, freedMem, freedPort? }` |
| `scheduler.reservation_made` | Resources reserved | `{ nodeId, provider, cpu, mem, duration }` |
| `scheduler.reservation_expired` | Reservation timed out | `{ nodeId, provider }` |

### Policy Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `scheduler.policy_applied` | Policy changed score | `{ nodeId, policy, originalScore, adjustedScore }` |
| `scheduler.fairness_update` | Fairness metrics recomputed | `{ tenantCount, giniCoefficient, jainIndex }` |
| `scheduler.provider_selected` | Provider chosen | `{ nodeId, provider, confidence, reason }` |
| `scheduler.provider_failover` | Failover to alternative provider | `{ nodeId, originalProvider, failoverProvider, reason }` |
| `scheduler.circuit_breaker_opened` | Circuit breaker tripped | `{ provider, failureCount, timeoutMs }` |
| `scheduler.circuit_breaker_closed` | Circuit breaker recovered | `{ provider, successCount }` |

## Event Consumer Contract

```typescript
interface SchedulerEventConsumer {
  /** Unique consumer ID */
  id: string;

  /** Handle an event */
  handle(event: SchedulerEvent): Promise<void>;

  /** Consumer is interested in these event types */
  subscribeTo: string[];   // e.g., ['scheduler.node_*', 'scheduler.graph_*']
}
```

## Event Observability

All scheduler events are:
1. Emitted to an in-process event bus (immediate)
2. Persisted to a events table (for history/replay)
3. Available via SSE for real-time UI updates
4. Exported as metrics (Prometheus counters/histograms)

```prometheus
# Prometheus metrics from scheduler events
scheduler_jobs_submitted_total{tenant} 42
scheduler_jobs_completed_total{tenant} 38
scheduler_jobs_failed_total{tenant} 3
scheduler_jobs_retried_total{tenant} 7
scheduler_queue_depth{queue="build"} 2
scheduler_wait_time_ms{queue="preview"} 1200
scheduler_execution_time_ms{type="build"} 45000
scheduler_resource_utilization{resource="cpu"} 0.65
```
