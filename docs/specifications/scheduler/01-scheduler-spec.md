# 1. Scheduler Specification

## Overview

The Scheduler is the central decision engine of the Execution Runtime. It receives Execution Graphs (what to run) and maps each node to a runtime resource (where to run it), subject to policies, fairness constraints, resource availability, and provider capabilities.

```
┌─────────────────────────────────────────────────────────────┐
│                        Scheduler                             │
│                                                              │
│  ExecutionGraphSubmission                                    │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────┐                                             │
│  │  Validator   │──► Rejected (with reason)                  │
│  └──────┬──────┘                                             │
│         │ valid                                               │
│         ▼                                                    │
│  ┌─────────────┐     ┌──────────────────┐                    │
│  │ Queue Mgr   │────►│ Priority Queue   │                    │
│  └──────┬──────┘     │ (sorted by       │                    │
│         │            │  priority +       │                    │
│         ▼            │  submission time) │                    │
│  ┌─────────────┐     └──────────────────┘                    │
│  │ Fairness    │                                             │
│  │ Engine      │──► Adjusts priorities for fairness          │
│  └──────┬──────┘                                             │
│         │                                                     │
│         ▼                                                     │
│  ┌─────────────┐     ┌──────────────────┐                    │
│  │ Resource    │────►│ Resource Graph   │                    │
│  │ Allocator   │     │ Query            │                    │
│  └──────┬──────┘     └──────────────────┘                    │
│         │                                                     │
│         ▼                                                     │
│  ┌─────────────┐     ┌──────────────────┐                    │
│  │ Provider    │────►│ Provider         │                    │
│  │ Selector    │     │ Registry Query   │                    │
│  └──────┬──────┘     └──────────────────┘                    │
│         │                                                     │
│         ▼                                                     │
│  ┌─────────────┐                                             │
│  │ Dispatcher  │──► RuntimeManager.request(runtimeSpec)      │
│  └──────┬──────┘                                             │
│         │                                                     │
│         ▼                                                     │
│  ┌─────────────┐     ┌──────────────────┐                    │
│  │ Watcher     │────►│ Status updates   │                    │
│  │             │     │ → Completion     │                    │
│  │             │     │ → Failure        │                    │
│  │             │     │ → Next node      │                    │
│  └─────────────┘     └──────────────────┘                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Core Scheduler Interface

```typescript
interface Scheduler {
  /** Submit an Execution Graph for scheduling */
  submit(submission: ExecutionGraphSubmission): Promise<SubmissionResult>;

  /** Cancel a pending or running execution */
  cancel(graphId: string, reason?: string): Promise<void>;

  /** Get execution status */
  getStatus(graphId: string): Promise<ExecutionStatus>;

  /** Get execution history for a workspace */
  getHistory(workspaceId: string, options?: HistoryOptions): Promise<ExecutionHistoryEntry[]>;

  /** Get scheduler statistics */
  getStats(): Promise<SchedulerStats>;

  /** Pause scheduling (drain in-flight, no new) */
  pause(): Promise<void>;

  /** Resume scheduling */
  resume(): Promise<void>;
}

interface SubmissionResult {
  accepted: boolean;
  graphId: string;
  rejectedReason?: string;
  estimatedWaitTime?: number;
  queuePosition?: number;
}

interface SchedulerStats {
  totalSubmitted: number;
  totalCompleted: number;
  totalFailed: number;
  totalCancelled: number;
  currentlyRunning: number;
  currentlyQueued: number;
  averageWaitTime: number;    // ms
  averageExecutionTime: number; // ms
  resourceUtilization: {
    cpuPercent: number;
    memoryPercent: number;
    diskPercent: number;
  };
}

interface HistoryOptions {
  limit?: number;
  offset?: number;
  status?: ExecutionStatus;
  since?: number;
  until?: number;
}
```

## Scheduler Components

### 1. Validator

Checks the Execution Graph against all invariants before accepting it:

```typescript
interface GraphValidator {
  validate(graph: ExecutionGraph): ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  code: string;           // e.g., 'EG-I1', 'EG-I5'
  nodeId?: string;
  edgeId?: string;
  message: string;
}
```

Validation occurs synchronously at submission time. A rejected graph returns an error to the caller with no side effects.

### 2. Queue Manager

Manages multiple priority queues, one per execution type:

```typescript
interface QueueManager {
  enqueue(node: ExecutionNode, context: QueueContext): Promise<QueuePosition>;
  dequeue(): Promise<QueueEntry | null>;
  peek(type?: string, count?: number): Promise<QueueEntry[]>;
  remove(nodeId: string): Promise<void>;
  getQueueStats(): Promise<QueueStats>;
  rebalance(): Promise<void>;  // Re-sort queues for fairness
}

interface QueueContext {
  workspaceId: string;
  userId: string;
  tenantId: string;
  priority: number;
  submittedAt: number;
}

interface QueueEntry {
  node: ExecutionNode;
  context: QueueContext;
  graphId: string;
  enqueuedAt: number;
  score: number;            // Computed priority score (higher = sooner)
}

interface QueuePosition {
  queue: string;
  position: number;
  estimatedWaitMs: number;
}

interface QueueStats {
  queues: Record<string, {
    length: number;
    running: number;
    avgWaitMs: number;
    throughputPerMin: number;
  }>;
}
```

### 3. Fairness Engine

Computes fairness adjustments to prevent any single tenant/user from starving others:

```typescript
interface FairnessEngine {
  /** Compute adjusted priority scores for all queued entries */
  computeFairnessScores(entries: QueueEntry[]): Promise<QueueEntry[]>;

  /** Get fairness metrics per tenant */
  getFairnessMetrics(): Promise<FairnessMetrics>;
}

interface FairnessMetrics {
  tenants: Record<string, {
    totalRuntimeMs: number;    // Last 24h
    totalJobs: number;
    currentRunning: number;
    currentQueued: number;
    fairnessDeficit: number;   // Positive = under-served
    share: number;             // Target share of resources (0-1)
  }>;
}
```

### 4. Resource Allocator

Queries the Resource Graph to find available resources for a given node:

```typescript
interface ResourceAllocator {
  /** Find resources for a node */
  allocate(node: ExecutionNode): Promise<AllocationResult>;

  /** Release resources after execution */
  release(nodeId: string): Promise<void>;

  /** Reserve resources for future execution */
  reserve(node: ExecutionNode, duration: number): Promise<ReservationResult>;
}

interface AllocationResult {
  success: boolean;
  resources?: {
    provider: string;
    cpu: string;
    memory: string;
    disk: string;
    port?: number;
    node?: string;             // Host node (multi-node setups)
  };
  failureReason?: string;
  alternatives?: string[];     // Alternative providers/configs
}

interface ReservationResult {
  reserved: boolean;
  expiresAt: number;
}
```

### 5. Provider Selector

Chooses the best provider for each node based on capabilities, load, cost, and affinity:

```typescript
interface ProviderSelector {
  select(
    node: ExecutionNode,
    availableProviders: SandboxProvider[],
    resourceAllocation: AllocationResult
  ): Promise<ProviderSelection>;
}

interface ProviderSelection {
  provider: string;
  confidence: number;    // 0-1
  reason: string;
  estimatedCost?: number;
}
```

### 6. Dispatcher

Makes the final RuntimeManager call and monitors execution:

```typescript
interface Dispatcher {
  /** Dispatch a node to a runtime */
  dispatch(node: ExecutionNode, assignment: SchedulerAssignment): Promise<DispatchResult>;

  /** Get execution status */
  getStatus(runtimeId: string): Promise<ExecutionStatus>;
}

interface DispatchResult {
  success: boolean;
  runtimeId: string;
  url?: string;            // Preview URL if applicable
  error?: string;
}
```

### 7. Watcher

Monitors running nodes and triggers next-node scheduling:

```typescript
interface Watcher {
  /** Subscribe to node completion/failure events */
  onNodeComplete(handler: (event: NodeCompleteEvent) => void): void;
  onNodeFailed(handler: (event: NodeFailedEvent) => void): void;

  /** Get all nodes that are now eligible to run (dependencies satisfied) */
  getEligibleNodes(graphId: string): ExecutionNode[];
}
```

## Scheduling Algorithm (Main Loop)

```
while (true) {
  // 1. Dequeue next eligible entry
  entry = queueManager.dequeue()
  if (!entry) { wait for queue event; continue }

  // 2. Check fairness
  adjustedEntry = fairnessEngine.computeFairnessScore(entry)

  // 3. Check resource availability
  allocation = resourceAllocator.allocate(adjustedEntry.node)
  if (!allocation.success) {
    // Backfill if possible, else re-queue with backoff
    handleResourceExhaustion(adjustedEntry)
    continue
  }

  // 4. Select provider
  provider = providerSelector.select(
    adjustedEntry.node,
    availableProviders,
    allocation
  )

  // 5. Dispatch
  dispatchResult = dispatcher.dispatch(adjustedEntry.node, {
    nodeId: adjustedEntry.node.id,
    provider: provider.provider,
    allocatedResources: allocation.resources,
  })

  if (!dispatchResult.success) {
    handleDispatchFailure(adjustedEntry, dispatchResult.error)
    continue
  }

  // 6. Watch
  watcher.onNodeComplete((event) => {
    resourceAllocator.release(event.nodeId)
    const nextNodes = watcher.getEligibleNodes(event.graphId)
    for (const nextNode of nextNodes) {
      queueManager.enqueue(nextNode, ...)
    }
  })
}
```
