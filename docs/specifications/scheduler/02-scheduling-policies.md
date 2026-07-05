# 2. Scheduling Policies

## Policy Framework

Policies are composable — multiple policies can be active simultaneously with configurable weights.

```typescript
interface SchedulingPolicy {
  name: string;
  version: string;
  /** Compute a score for a queue entry (higher = schedule sooner) */
  score(entry: QueueEntry, context: PolicyContext): number;
  /** Configuration */
  config: Record<string, unknown>;
}

interface PolicyContext {
  systemLoad: number;           // 0-1
  currentUtilization: {
    cpu: number;
    memory: number;
    disk: number;
  };
  timeSinceLastSchedule: number;
  activeTenants: number;
  queueLength: number;
}
```

## Policy Catalog

### P1: FIFO (First-In-First-Out)

```typescript
const fifoPolicy: SchedulingPolicy = {
  name: 'fifo',
  version: '1.0',
  score: (entry, ctx) => -entry.context.submittedAt, // negative = earlier = higher
  config: {},
};
```

**Use case**: Default for equal-priority jobs within the same tenant.

### P2: Priority

```typescript
const priorityPolicy: SchedulingPolicy = {
  name: 'priority',
  version: '1.0',
  score: (entry, ctx) => entry.context.priority * 1000,
  config: {
    priorityLevels: {
      critical: 100,    // System operations, immediate execution
      high: 75,         // Paid tier, user-interactive
      normal: 50,       // Default
      low: 25,          // Background, batch
      deferred: 10,     // Nightly, scheduled
    },
  },
};
```

**Use case**: Priority-based queuing where critical jobs preempt lower-priority ones.

### P3: Weighted Fair Queuing (WFQ)

```typescript
const wfqPolicy: SchedulingPolicy = {
  name: 'weighted-fair-queuing',
  version: '1.0',
  score: (entry, ctx) => {
    const tenantShare = ctx.fairnessMetrics?.tenants[entry.context.tenantId]?.share ?? 0;
    const tenantRuntime = ctx.fairnessMetrics?.tenants[entry.context.tenantId]?.totalRuntimeMs ?? 1;
    const deficit = (tenantShare * ctx.totalRuntime) - tenantRuntime;
    return deficit * 100; // Higher deficit = higher score
  },
  config: {
    defaultShare: 1,             // Equal share by default
    rebalanceIntervalMs: 30_000, // Rebalance every 30s
  },
};
```

**Use case**: Multi-tenant environments where each tenant gets a fair share.

### P4: Resource-Aware Scheduling

```typescript
const resourceAwarePolicy: SchedulingPolicy = {
  name: 'resource-aware',
  version: '1.0',
  score: (entry, ctx) => {
    const profile = RESOURCE_PROFILES[entry.node.resourceProfile];
    const cpuAvailable = 1 - ctx.currentUtilization.cpu;
    const memoryAvailable = 1 - ctx.currentUtilization.memory;
    const profileCpu = parseFloat(profile.cpu) / 8; // normalized to 0-1
    const profileMem = parseInt(profile.memory) / 16_000_000_000; // normalized

    // Can this job fit?
    if (profileCpu > cpuAvailable || profileMem > memoryAvailable) {
      return -Infinity; // Cannot schedule now
    }

    // Prefer jobs that fit the current resource profile
    const fit = Math.min(cpuAvailable / profileCpu, memoryAvailable / profileMem);
    return fit * 100;
  },
  config: {},
};
```

**Use case**: Prevent scheduling jobs that can't run given current resource availability.

### P5: Backfilling

```typescript
const backfillPolicy: SchedulingPolicy = {
  name: 'backfill',
  version: '1.0',
  score: (entry, ctx) => {
    // Small jobs that can fill gaps get priority boost
    const profile = RESOURCE_PROFILES[entry.node.resourceProfile];
    const estimatedDuration = estimateDuration(entry.node);
    const gapDuration = ctx.nextReservationTime - Date.now();

    if (estimatedDuration < gapDuration && isSmallJob(profile)) {
      return 1000 + (gapDuration - estimatedDuration); // Fill tightest gap first
    }

    return 0;
  },
  config: {
    maxBackfillDurationMs: 120_000,  // Only backfill jobs < 2 min
    maxBackfillMemory: '512mb',      // Only small memory jobs
  },
};
```

**Use case**: Improve utilization by filling scheduling gaps with small jobs.

## Policy Composition

```typescript
interface PolicyComposition {
  policies: { policy: SchedulingPolicy; weight: number }[];
  strategy: 'weighted-sum' | 'rank' | 'veto';
}

const defaultComposition: PolicyComposition = {
  policies: [
    { policy: fifoPolicy, weight: 1 },
    { policy: priorityPolicy, weight: 3 },
    { policy: resourceAwarePolicy, weight: 2 },
    { policy: wfqPolicy, weight: 1 },
  ],
  strategy: 'weighted-sum',
};

// Scoring:
// For 'weighted-sum': finalScore = Σ(weight_i * score_i)
// For 'rank':         entries are sorted by each policy, ranks averaged
// For 'veto':         any policy returning -Infinity removes the entry
```

## Preemption Policy

```typescript
interface PreemptionPolicy {
  enabled: boolean;
  /** Only preempt jobs below this priority */
  maxPreemptPriority: number;
  /** Minimum runtime before a job can be preempted */
  minRuntimeMs: 30_000;
  /** Maximum preemptions per tenant per hour */
  maxPreemptionsPerTenant: 3;
  /** Preemption strategy */
  strategy: 'oldest-first' | 'largest-first' | 'lowest-priority-first';
}
```

Preemption flow:
```
1. High-priority job arrives but no resources available
2. Scheduler identifies preemptable candidates (lower priority, running > 30s)
3. PreemptionPolicy selects the victim
4. Victim is checkpointed if possible, else killed
5. High-priority job is dispatched
6. Victim is re-queued with priority boost
```
