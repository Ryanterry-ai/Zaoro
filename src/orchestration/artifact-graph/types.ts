// ─── Artifact Graph Types (Phase 3) ───────────────────────────────
// Models a build as a directed acyclic graph of artifact-producing stages.
// Each node declares what artifacts it reads (inputs) and writes (outputs).
// The executor topologically sorts nodes and runs them, validating that
// every input is satisfied before a stage executes.

export type ArtifactType = 'json' | 'code' | 'schema' | 'config' | 'report' | 'binary';

export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/** Contract: what a stage reads and writes. */
export interface StageContract {
  stageId: string;
  name: string;
  description?: string;
  inputs: string[];   // artifact keys consumed
  outputs: string[];  // artifact keys produced
  /** Estimated wall-clock seconds (for scheduling heuristics). */
  estimatedDurationSec?: number;
  /** Whether this stage can be skipped if its outputs already exist. */
  skippable?: boolean;
  /** Max retry attempts on failure. */
  maxRetries?: number;
}

/** A node in the artifact graph. */
export interface ArtifactNode {
  id: string;
  contract: StageContract;
  status: NodeStatus;
  /** Artifacts produced by this node (keyed by artifact key). */
  artifacts: Record<string, unknown>;
  /** Error message if status === 'failed'. */
  error?: string;
  /** Wall-clock milliseconds for this node's execution. */
  durationMs?: number;
  /** Number of LLM calls made during execution. */
  llmCalls?: number;
}

/** A directed edge: source node produces an artifact that target node consumes. */
export interface ArtifactEdge {
  from: string;       // source node id
  to: string;         // target node id
  artifactKey: string; // the artifact key that flows from → to
}

/** Execution plan: ordered levels of nodes that can run in parallel. */
export interface ExecutionPlan {
  levels: string[][];  // each level contains node ids that can run concurrently
  totalNodes: number;
}

/** Result of executing one node. */
export interface NodeExecutionResult {
  nodeId: string;
  success: boolean;
  artifacts: Record<string, unknown>;
  durationMs: number;
  llmCalls: number;
  error?: string;
}

/** Result of executing the full graph. */
export interface GraphExecutionResult {
  executionId: string;
  success: boolean;
  nodeResults: NodeExecutionResult[];
  totalDurationMs: number;
  /** All artifacts produced, keyed by artifact key. */
  allArtifacts: Record<string, unknown>;
  /** The execution plan that was followed. */
  plan: ExecutionPlan;
}

/** Options for the artifact executor. */
export interface ArtifactExecutorOptions {
  /** Feature flag: if false, falls back to legacy orchestrator. */
  useArtifactGraph?: boolean;
  /** Maximum parallel nodes per level. 0 = unlimited. */
  maxConcurrency?: number;
  /** Persist intermediate artifacts to disk. */
  persistArtifacts?: boolean;
  /** Directory for persisted artifacts. */
  artifactsDir?: string;
  /** If true, compare with legacy orchestrator output. */
  benchmarkMode?: boolean;
  /** Run convergence audit (validateRuntimeGraph) before execution. Default true. */
  runtimeValidation?: boolean;
}
