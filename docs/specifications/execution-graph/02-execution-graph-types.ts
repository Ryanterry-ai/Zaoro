// ============================================================================
// Execution Graph — Formal Type Definitions
// ============================================================================
// This file defines the canonical TypeScript types for the Execution Graph.
// These types mirror the specification in 01-execution-graph-spec.md.
// ============================================================================

// ---- Node Kinds ----

export type ExecutionNodeKind =
  | 'build'
  | 'preview'
  | 'test'
  | 'repair'
  | 'deploy'
  | 'audit'
  | 'install'
  | 'compile'
  | 'generate'
  | 'validate'
  | 'exec'
  | 'script'
  | 'source'
  | 'output'
  | 'binary'
  | 'webhook'
  | 'schedule'
  | 'approval'
  | 'condition';

export type TaskKind = 'build' | 'preview' | 'test' | 'repair' | 'deploy' | 'audit';
export type StepKind = 'install' | 'compile' | 'generate' | 'validate';
export type CommandKind = 'exec' | 'script';
export type ArtifactKind = 'source' | 'output' | 'binary';
export type TriggerKind = 'webhook' | 'schedule';
export type GateKind = 'approval' | 'condition';

// ---- Edge Kinds ----

export type EdgeKind =
  | 'depends_on'
  | 'blocks'
  | 'wait_for'
  | 'produces'
  | 'consumes'
  | 'transforms'
  | 'refers_to'
  | 'archives_to'
  | 'triggers'
  | 'terminates'
  | 'requires'
  | 'constrains_to';

// ---- Status ----

export type ExecutionStatus =
  | 'pending'
  | 'queued'
  | 'scheduled'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled'
  | 'timed_out';

// ---- Profiles ----

export type ResourceProfile = 'preview' | 'build' | 'test' | 'repair' | 'deploy';

export interface RetryPolicy {
  maxAttempts: number;
  backoff: 'fixed' | 'exponential' | 'linear';
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
  retryableErrors?: string[];   // Error codes that trigger retry
}

export interface CachePolicy {
  key: string;                    // Cache key for lookup
  scope: 'workspace' | 'global';
  ttl: number;                    // Cache TTL in ms
  invalidateOn?: string[];        // Event types that invalidate this cache
}

// ---- Errors ----

export interface ExecutionError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
  isRetryable: boolean;
}

// ---- Metrics ----

export interface ExecutionMetrics {
  cpuPercent: number;
  memoryBytes: number;
  diskBytes: number;
  networkRxBytes: number;
  networkTxBytes: number;
}

// ---- Artifacts ----

export interface ArtifactRef {
  id: string;
  path: string;
  type: 'file' | 'directory' | 'url';
  contentType: string;
  size?: number;
  checksum?: string;
}

// ---- Node Interfaces ----

export interface ExecutionNodeBase {
  id: string;
  kind: ExecutionNodeKind;
  label: string;
  description?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  timeout: number;
  createdAt: number;
  updatedAt: number;
  status?: ExecutionStatus;
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  error?: ExecutionError;
}

export interface TaskNode extends ExecutionNodeBase {
  kind: TaskKind;
  resourceProfile: ResourceProfile;
  providerPreferences?: string[];
  retryPolicy: RetryPolicy;
  cachePolicy?: CachePolicy;
  env?: Record<string, string>;
  workingDir?: string;
  entrypoint?: string[];
  inputs?: string[];
  outputs?: string[];
  result?: {
    exitCode: number;
    outputLog?: string;
    outputArtifacts?: ArtifactRef[];
    metrics?: ExecutionMetrics;
  };
}

export interface StepNode extends ExecutionNodeBase {
  kind: StepKind;
  parentTaskId: string;
  command: string[];
  resourceProfile: ResourceProfile;
  retryPolicy?: RetryPolicy;
  cacheKey?: string;
}

export interface CommandNode extends ExecutionNodeBase {
  kind: CommandKind;
  parentTaskId: string;
  command: string[];
  workingDir?: string;
  env?: Record<string, string>;
  resourceProfile: ResourceProfile;
  timeout: number;
}

export interface ArtifactNode extends ExecutionNodeBase {
  kind: ArtifactKind;
  location: {
    type: 'workspace' | 'cache' | 'registry' | 'external';
    path: string;
    storageBackend?: string;
  };
  contentType: string;
  size?: number;
  checksum?: string;
  compressedSize?: number;
  ttl?: number;
  persist: boolean;
}

export interface TriggerNode extends ExecutionNodeBase {
  kind: TriggerKind;
  webhook?: {
    url: string;
    method: 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
    secret?: string;
  };
  schedule?: {
    cron: string;
    timezone?: string;
    maxConcurrency?: number;
  };
}

export interface GateNode extends ExecutionNodeBase {
  kind: GateKind;
  approval?: {
    requiredApprovers: string[];
    minApprovals: number;
    timeoutDuration: number;
    notificationChannels?: string[];
  };
  condition?: {
    expression: string;
    dependsOn: string[];
  };
}

export type ExecutionNode =
  | TaskNode
  | StepNode
  | CommandNode
  | ArtifactNode
  | TriggerNode
  | GateNode;

// ---- Edge Interface ----

export interface ExecutionEdge {
  id: string;
  kind: EdgeKind;
  sourceId: string;
  targetId: string;
  label?: string;
  metadata?: Record<string, unknown>;
  dataMapping?: {
    sourcePath: string;
    targetPath: string;
    transform?: string;
  };
  dependency?: {
    type: 'hard' | 'soft';
    condition?: string;
  };
}

// ---- Graph ----

export interface ExecutionGraph {
  id: string;
  version: string;
  nodes: ExecutionNode[];
  edges: ExecutionEdge[];
  invariants: string[];
  checksum: string;
}

// ---- Submission ----

export interface ExecutionGraphSubmission {
  graph: ExecutionGraph;
  metadata: {
    workspaceId: string;
    triggeredBy: 'user' | 'webhook' | 'schedule' | 'system';
    userId?: string;
    priority: number;
    ttl: number;
    labels?: Record<string, string>;
  };
  auth?: {
    token: string;
    permissions: string[];
  };
}

// ---- Invariant Helpers ----

export const EDGE_KIND_PAIRS: Record<EdgeKind, [ExecutionNodeKind[], ExecutionNodeKind[]]> = {
  depends_on:    [['build','preview','test','repair','deploy','audit','install','compile','generate','validate','exec','script'], ['build','preview','test','repair','deploy','audit','install','compile','generate','validate','exec','script']],
  blocks:        [['build','preview','test','repair','deploy','audit','install','compile','generate','validate','exec','script'], ['build','preview','test','repair','deploy','audit','install','compile','generate','validate','exec','script']],
  wait_for:      [['build','preview','test','repair','deploy','audit','install','compile','generate','validate','exec','script'], ['build','preview','test','repair','deploy','audit','install','compile','generate','validate','exec','script']],
  produces:      [['build','preview','test','repair','deploy','audit','install','compile','generate','validate','exec','script'], ['source','output','binary']],
  consumes:      [['build','preview','test','repair','deploy','audit','install','compile','generate','validate','exec','script'], ['source','output','binary']],
  transforms:    [['install','compile','generate','validate','exec','script'], ['source','output','binary']],
  refers_to:     [['source','output','binary'], ['source','output','binary']],
  archives_to:   [['source','output','binary'], ['source','output','binary']],
  triggers:      [['webhook','schedule'], ['build','preview','test','repair','deploy','audit']],
  terminates:    [['build','preview','test','repair','deploy','audit'], ['build','preview','test','repair','deploy','audit']],
  requires:      [['build','preview','test','repair','deploy','audit','install','compile','generate','validate','exec','script'], ['source','output','binary']],
  constrains_to: [['build','preview','test','repair','deploy','audit','install','compile','generate','validate','exec','script'], ['source','output','binary']],
};

export const EXECUTION_GRAPH_INVARIANTS = [
  'EG-I1 — Acyclicity: The graph must be a DAG',
  'EG-I2 — Single Root: Exactly one node with no incoming dependency edges',
  'EG-I3 — Single Terminal: Exactly one node with no outgoing dependency edges',
  'EG-I4 — Leafness: Only exec, script, trigger, and gate nodes can be leaves',
  'EG-I5 — Strong Typing: Edge source/target kinds must match permitted pairs',
  'EG-I6 — Resource Specification: Every executable node must specify a resourceProfile',
  'EG-I7 — Timeout Bounds: Every executable node must specify a timeout',
  'EG-I8 — Immutability: The graph must not be modified after submission',
] as const;
