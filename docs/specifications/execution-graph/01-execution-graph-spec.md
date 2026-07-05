# 1. Execution Graph Specification

## Overview

An Execution Graph is a **directed acyclic graph (DAG)** where:

- **Nodes** represent units of execution: tasks, steps, commands, artifacts, triggers, and gates
- **Edges** represent dependencies, data flow, artifact references, and lifecycle relationships
- **Properties** on nodes and edges capture resource requirements, timeouts, retry policies, cache hints, environment configuration, and provider preferences

The graph is **immutable once submitted to the Scheduler** — it represents a complete execution plan that the Scheduler interprets but does not modify.

## Execution Graph Node Kinds

### 6 Categories, 18 Node Kinds

| Category | Node Kind | Description |
|----------|-----------|-------------|
| **Task** | `build` | Full build execution (compile + generate) |
| **Task** | `preview` | Preview server execution (npm install + dev) |
| **Task** | `test` | Test suite execution (Playwright, Lighthouse) |
| **Task** | `repair` | Self-healing repair execution |
| **Task** | `deploy` | Deployment execution |
| **Task** | `audit` | Security/quality audit execution |
| | | |
| **Step** | `install` | Dependency installation (npm/pnpm) |
| **Step** | `compile` | Compilation step (tsc, next build) |
| **Step** | `generate` | Code generation step |
| **Step** | `validate` | Validation step (lint, typecheck) |
| | | |
| **Command** | `exec` | Arbitrary command execution |
| **Command** | `script` | Script execution from workspace |
| | | |
| **Artifact** | `source` | Source files (inputs) |
| **Artifact** | `output` | Generated output files |
| **Artifact** | `binary` | Compiled/cached binary artifacts |
| | | |
| **Trigger** | `webhook` | External webhook trigger |
| **Trigger** | `schedule` | Scheduled/cron trigger |
| | | |
| **Gate** | `approval` | Manual approval step |
| **Gate** | `condition` | Conditional execution gate |

## Formal Type

```typescript
type ExecutionNodeKind =
  // Tasks
  | 'build'
  | 'preview'
  | 'test'
  | 'repair'
  | 'deploy'
  | 'audit'
  // Steps
  | 'install'
  | 'compile'
  | 'generate'
  | 'validate'
  // Commands
  | 'exec'
  | 'script'
  // Artifacts
  | 'source'
  | 'output'
  | 'binary'
  // Triggers
  | 'webhook'
  | 'schedule'
  // Gates
  | 'approval'
  | 'condition';
```

## Execution Graph Edge Kinds

### 5 Categories, 12 Edge Kinds

| Category | Edge Kind | Description |
|----------|-----------|-------------|
| **Dependency** | `depends_on` | Task B cannot start until Task A completes |
| **Dependency** | `blocks` | Task A blocks Task B (inverse of depends_on) |
| **Dependency** | `wait_for` | Task B waits for a specific state in Task A (not just completion) |
| | | |
| **Data Flow** | `produces` | Task/Step produces an artifact |
| **Data Flow** | `consumes` | Task/Step consumes an artifact |
| **Data Flow** | `transforms` | Step transforms input artifact to output artifact |
| | | |
| **Artifact** | `refers_to` | Artifact reference (source → output mapping) |
| **Artifact** | `archives_to` | Artifact is archived to a location |
| | | |
| **Lifecycle** | `triggers` | Trigger initiates a task |
| **Lifecycle** | `terminates` | Task termination cascade |
| | | |
| **Resource** | `requires` | Task/Step requires a resource profile |
| **Resource** | `constrains_to` | Task is constrained to a specific provider/location |

## Invariant Rules

**EG-I1 — Acyclicity**: The Execution Graph must be a DAG. The Scheduler rejects graphs with cycles at submission time.

**EG-I2 — Single Root**: Every Execution Graph has exactly one root node (no incoming dependency edges). For compound graphs, a virtual `pipeline` root is inserted.

**EG-I3 — Single Terminal**: Every Execution Graph has exactly one terminal node (no outgoing dependency edges). `deploy` or `audit` are typical terminals.

**EG-I4 — Leafness**: Only `exec`, `script`, `trigger`, and `gate` nodes can be leaves (no outgoing edges). All `task` and `step` nodes must have at least one outgoing edge.

**EG-I5 — Strong Typing**: Edge source/target node kinds must match the edge kind's permitted pairings (e.g., `produces` must connect a Task|Step to an Artifact).

**EG-I6 — Resource Specification**: Every `task`, `step`, `exec`, and `script` node must specify a `resourceProfile` or explicitly opt into the default.

**EG-I7 — Timeout Bounds**: Every executable node must specify a `timeout` value within system-configured min/max bounds.

**EG-I8 — Immutability**: Once submitted to the Scheduler, no node or edge may be added, removed, or modified. The Scheduler may read but never write the graph.

## Properties

### Node Properties (common to all)

```typescript
interface ExecutionNodeBase {
  id: string;                    // Unique within the graph
  kind: ExecutionNodeKind;
  label: string;                 // Human-readable name
  description?: string;          // Optional description
  metadata?: Record<string, unknown>; // Arbitrary metadata
  tags?: string[];               // For filtering/grouping

  // Timing
  timeout: number;               // Max execution time in ms
  createdAt: number;
  updatedAt: number;

  // Status (populated by Scheduler at runtime)
  status?: ExecutionStatus;
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  error?: ExecutionError;
}

type ExecutionStatus =
  | 'pending'
  | 'queued'
  | 'scheduled'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled'
  | 'timed_out';
```

### Task Properties

```typescript
interface TaskNode extends ExecutionNodeBase {
  kind: 'build' | 'preview' | 'test' | 'repair' | 'deploy' | 'audit';

  resourceProfile: ResourceProfile;
  providerPreferences?: string[];   // Preferred providers ordered
  retryPolicy: RetryPolicy;
  cachePolicy?: CachePolicy;

  // Environment
  env?: Record<string, string>;
  workingDir?: string;
  entrypoint?: string[];

  // Artifacts
  inputs?: string[];          // Artifact node IDs
  outputs?: string[];         // Artifact node IDs

  // Results (populated at runtime)
  result?: {
    exitCode: number;
    outputLog?: string;
    outputArtifacts?: ArtifactRef[];
    metrics?: ExecutionMetrics;
  };
}
```

### Step Properties

```typescript
interface StepNode extends ExecutionNodeBase {
  kind: 'install' | 'compile' | 'generate' | 'validate';

  parentTaskId: string;        // Owning task
  command: string[];           // Command to execute
  resourceProfile: ResourceProfile;
  retryPolicy?: RetryPolicy;   // Defaults to parent task's policy
  cacheKey?: string;           // For cache lookups
}
```

### Artifact Properties

```typescript
interface ArtifactNode extends ExecutionNodeBase {
  kind: 'source' | 'output' | 'binary';

  /** Where the artifact lives */
  location: {
    type: 'workspace' | 'cache' | 'registry' | 'external';
    path: string;
    storageBackend?: string;  // e.g., 's3', 'filesystem', 'docker-registry'
  };

  /** Content metadata */
  contentType: string;          // MIME type
  size?: number;                // Bytes
  checksum?: string;            // Integrity hash
  compressedSize?: number;      // Compressed size

  /** Retention */
  ttl?: number;                 // Time-to-live in ms
  persist: boolean;             // Keep after pipeline completes?
}
```

### Trigger Properties

```typescript
interface TriggerNode extends ExecutionNodeBase {
  kind: 'webhook' | 'schedule';

  webhook?: {
    url: string;
    method: 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
    secret?: string;           // For HMAC verification
  };

  schedule?: {
    cron: string;              // Cron expression
    timezone?: string;
    maxConcurrency?: number;
  };
}
```

### Gate Properties

```typescript
interface GateNode extends ExecutionNodeBase {
  kind: 'approval' | 'condition';

  approval?: {
    requiredApprovers: string[];
    minApprovals: number;
    timeoutDuration: number;    // Auto-reject after this
    notificationChannels?: string[];
  };

  condition?: {
    expression: string;          // JavaScript expression evaluated in sandbox
    dependsOn: string[];        // Node IDs whose status/result are evaluated
  };
}
```

## Edge Properties

```typescript
interface ExecutionEdge {
  id: string;
  kind: EdgeKind;
  sourceId: string;
  targetId: string;
  label?: string;
  metadata?: Record<string, unknown>;

  // For data flow edges
  dataMapping?: {
    sourcePath: string;       // JSONPath in source output
    targetPath: string;       // JSONPath in target input
    transform?: string;       // Optional transform expression
  };

  // For dependency edges
  dependency?: {
    type: 'hard' | 'soft';    // Hard = required, Soft = best effort
    condition?: string;        // Only wait if condition is met
  };
}
```

## Example Graphs

### Example 1: Preview Pipeline

```
[build task] ──produces──► [source artifact]
     │
     │ depends_on
     ▼
[install step] ──produces──► [binary artifact] (node_modules)
     │
     │ depends_on
     ▼
[preview task] ──produces──► [output artifact] (preview URL)
     │
     │ depends_on
     ▼
[health check] ──produces──► [output artifact] (health status)
```

### Example 2: Full Build-Test-Deploy Pipeline

```
[pipeline root]
     │
     ├──► [build task] ──► [install] ──► [compile] ──► [source artifact]
     │                            │                            │
     │                            └────────────────────────────┘
     │                                           │
     │                                           ├──► [test task] ──► [validate]
     │                                           │                       │
     │                                           │                       ├──► [lint artifact]
     │                                           │                       └──► [typecheck artifact]
     │                                           │
     │                                           ├──► [audit task] ──► [exec] ──► [audit artifact]
     │                                           │
     │                                           ├──► [gate: approval]
     │                                           │         │
     │                                           │         ▼
     │                                           └──► [deploy task] ──► [output artifact]
     │                                                                        │
     │                                                                        ▼
     │                                                                  [terminus]
     │
     └──► [gate: condition] (only deploy if all tests pass)
               │
               ▼
          [deploy task]
```

## Graph Submission Contract

```typescript
interface ExecutionGraphSubmission {
  /** The execution graph */
  graph: ExecutionGraph;

  /** Submission metadata */
  metadata: {
    workspaceId: string;
    triggeredBy: 'user' | 'webhook' | 'schedule' | 'system';
    userId?: string;
    priority: number;            // 1-100
    ttl: number;                 // Max total execution time
    labels?: Record<string, string>;
  };

  /** Authorization */
  auth?: {
    token: string;
    permissions: string[];
  };
}

interface ExecutionGraph {
  id: string;
  version: string;               // Semantic version of the schema
  nodes: ExecutionNode[];
  edges: ExecutionEdge[];
  invariants: string[];          // List of invariants that were checked
  checksum: string;              // sha256 of canonical serialization
}
```

## Execution Lifecycle in the Graph

```
Submitted ──► Validated ──► Queued ──► Scheduled ──► Running ──► Completed
    │              │            │           │             │            │
    │              │            │           │             ├──► Failed  │
    │              │            │           │             ├──► Timed   │
    │              │            │           │             │    Out     │
    │              │            │           │             └──►         │
    │              │            │           └──► Preempted             │
    │              │            └──► Deferred                          │
    │              └──► Rejected                                       │
    └──► Cancelled                                                     │
                                                                       ▼
                                                                [terminal]
```
