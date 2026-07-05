# 4. Scheduler Contract

## Interface Between Execution Graph and Scheduler

The Scheduler is a consumer of Execution Graphs. This document defines the contract.

## Scheduler Input

```typescript
interface SchedulerInput {
  /** The submission */
  submission: ExecutionGraphSubmission;

  /** Injected by the system (not part of the graph) */
  system: {
    submittedAt: number;
    source: 'api' | 'webhook' | 'schedule' | 'system';
    authContext?: {
      userId: string;
      tenantId: string;
      roles: string[];
    };
  };
}

// Scheduler output for each node
interface SchedulerAssignment {
  nodeId: string;
  runtimeId: string;         // Assigned runtime instance
  provider: string;          // Selected provider
  scheduledAt: number;
  expectedDuration: number;
  allocatedResources: {
    cpu: string;
    memory: string;
    disk: string;
    port?: number;
  };
}
```

## Scheduler Reads (from Execution Graph)

| What | How | When |
|------|-----|------|
| Node dependencies | `edges.filter(e => e.kind === 'depends_on')` | Before scheduling each node |
| Resource requirements | `node.resourceProfile` | Provider/queue selection |
| Provider preferences | `node.providerPreferences` | Provider selection tiebreaker |
| Retry policy | `node.retryPolicy` | On execution failure |
| Cache hints | `node.cachePolicy` | Before node execution |
| Timeout | `node.timeout` | Execution deadline enforcement |
| Priority | `submission.metadata.priority` | Queue ordering |

## Scheduler Writes (to Execution Graph)

The Scheduler updates node status fields as execution progresses:

```typescript
// Status updates
node.status = 'queued' | 'scheduled' | 'running' | 'completed' | 'failed';

// Timing
node.startedAt = Date.now();
node.completedAt = Date.now();
node.duration = node.completedAt - node.startedAt;

// Error
node.error = { code: 'TIMEOUT', message: 'Execution exceeded 120s', isRetryable: true };

// Result
node.result = { exitCode: 0, outputLog: '...', metrics: { cpuPercent: 45, memoryBytes: 524288000, ... } };
```

## Scheduler Output Events

```typescript
interface SchedulerEvent {
  type: 'scheduler.node_scheduled'
     | 'scheduler.node_started'
     | 'scheduler.node_completed'
     | 'scheduler.node_failed'
     | 'scheduler.node_retrying'
     | 'scheduler.node_skipped'
     | 'scheduler.node_cancelled'
     | 'scheduler.pipeline_completed'
     | 'scheduler.pipeline_failed'
     | 'scheduler.queue_full'
     | 'scheduler.resource_exhausted';
  graphId: string;
  nodeId?: string;
  timestamp: number;
  data: Record<string, unknown>;
}
```

## Contract Guarantees

| Guarantee | Description |
|-----------|-------------|
| **At-least-once execution** | Every node in the graph is executed at least once (may retry on transient failures) |
| **Dependency ordering** | No node starts before its dependencies are satisfied |
| **Resource enforcement** | No node exceeds its specified resource limits |
| **Deadline enforcement** | No node exceeds its specified timeout |
| **Fair ordering** | Nodes are ordered by priority within the same tenant, FIFO across tenants |
| **No deadlock** | The Scheduler guarantees progress — at least one node is always eligible to run |
| **Observability** | Every state transition emits a typed event |

## Rejection Reasons

The Scheduler rejects an Execution Graph submission if:

| Reason | Condition |
|--------|-----------|
| Cycle detected | Graph contains a cycle (EG-I1 violation) |
| Invalid node kind | Node kind not in the known set |
| Missing resource profile | Executable node without resourceProfile |
| Missing timeout | Executable node without timeout |
| Exceeds capacity | Total resource requirements exceed cluster capacity |
| Invalid auth | Submission lacks required permissions |
| Duplicate ID | Graph ID already exists in the system |
