# 3. Fairness Algorithms

## Overview

Fairness ensures that no single tenant, user, or job type can monopolize execution resources. Multiple algorithms are supported, configurable per deployment.

## Algorithm Catalog

### A1: Proportional Share

Each tenant receives a configured share of total resources. Share can be based on tier (free vs paid), historical usage, or explicit allocation.

```typescript
interface ProportionalShareConfig {
  defaultShare: number;               // 1.0 = equal share
  shares: Record<string, number>;     // tenantId → share weight
  rebalanceIntervalMs: number;
  decayFactor: number;                // Exponential decay for historical usage
}

function proportionalShare(
  entries: QueueEntry[],
  config: ProportionalShareConfig
): QueueEntry[] {
  // 1. Calculate total runtime per tenant (decayed)
  const tenantRuntime: Map<string, number> = new Map();
  for (const entry of entries) {
    const tid = entry.context.tenantId;
    tenantRuntime.set(tid, (tenantRuntime.get(tid) ?? 0) + 1);
  }

  // 2. Calculate fair share per tenant
  const totalShare = Object.values(config.shares).reduce((a, b) => a + b, 0);
  const fairShare: Map<string, number> = new Map();
  for (const [tid, share] of Object.entries(config.shares)) {
    fairShare.set(tid, share / totalShare);
  }

  // 3. Compute deficit: (fairShare * totalRuntime) - actualRuntime
  const totalRuntime = [...tenantRuntime.values()].reduce((a, b) => a + b, 0);
  const deficit: Map<string, number> = new Map();
  for (const [tid, share] of fairShare) {
    const actual = tenantRuntime.get(tid) ?? 0;
    deficit.set(tid, share * totalRuntime - actual);
  }

  // 4. Sort entries by deficit (highest deficit first)
  return entries.sort((a, b) => {
    const deficitA = deficit.get(a.context.tenantId) ?? 0;
    const deficitB = deficit.get(b.context.tenantId) ?? 0;
    return deficitB - deficitA;
  });
}
```

### A2: Dominant Resource Fairness (DRF)

Computes fairness across multiple resource dimensions (CPU, memory, disk). A tenant's share is determined by the resource they are most dominant in.

```typescript
interface DRFConfig {
  totalResources: {
    cpu: number;
    memory: number;
    disk: number;
  };
  decayFactor: number;
}

function dominantResourceFairness(
  entries: QueueEntry[],
  config: DRFConfig
): QueueEntry[] {
  // 1. Calculate dominant resource share per tenant
  interface TenantResourceUsage {
    cpu: number;
    memory: number;
    disk: number;
  }
  const tenantUsage: Map<string, TenantResourceUsage> = new Map();

  for (const entry of entries) {
    const tid = entry.context.tenantId;
    const profile = RESOURCE_PROFILES[entry.node.resourceProfile];
    const usage = tenantUsage.get(tid) ?? { cpu: 0, memory: 0, disk: 0 };
    usage.cpu += parseFloat(profile.cpu);
    usage.memory += parseInt(profile.memory);
    usage.disk += parseInt(profile.disk);
    tenantUsage.set(tid, usage);
  }

  // 2. For each tenant, find dominant share (max of cpu/ram/disk %)
  const dominantShares: Map<string, number> = new Map();
  for (const [tid, usage] of tenantUsage) {
    const cpuShare = usage.cpu / config.totalResources.cpu;
    const memShare = usage.memory / config.totalResources.memory;
    const diskShare = usage.disk / config.totalResources.disk;
    dominantShares.set(tid, Math.max(cpuShare, memShare, diskShare));
  }

  // 3. Sort by dominant share (lowest first = most under-served)
  return entries.sort((a, b) => {
    const shareA = dominantShares.get(a.context.tenantId) ?? 0;
    const shareB = dominantShares.get(b.context.tenantId) ?? 0;
    return shareA - shareB;
  });
}
```

### A3: Weighted DRF

Extends DRF with tenant weights (e.g., paying customers get more).

```typescript
function weightedDRF(
  entries: QueueEntry[],
  config: DRFConfig & { weights: Record<string, number> }
): QueueEntry[] {
  // Same as DRF, but divide dominant share by weight
  const weightedShares: Map<string, number> = new Map();
  for (const [tid, share] of dominantShares) {
    const weight = config.weights[tid] ?? 1;
    weightedShares.set(tid, share / weight);
  }
  // Sort by weighted share (lowest first)
  return entries.sort((a, b) => (weightedShares.get(a.context.tenantId) ?? 0) - (weightedShares.get(b.context.tenantId) ?? 0));
}
```

### A4: Hierarchical Fairness

Fairness applied at multiple levels: tenant → user → job type.

```typescript
interface HierarchicalFairnessConfig {
  levels: {
    level: 'tenant' | 'user' | 'type';
    weight: number;     // How much this level influences the final score
  }[];
}

function hierarchicalFairness(
  entries: QueueEntry[],
  config: HierarchicalFairnessConfig
): QueueEntry[] {
  // Compute fairness score at each level, then combine with weights
  const scores: Map<string, number> = new Map();

  for (const entry of entries) {
    let score = 0;
    for (const level of config.levels) {
      switch (level.level) {
        case 'tenant':
          score += level.weight * getTenantFairnessScore(entry);
          break;
        case 'user':
          score += level.weight * getUserFairnessScore(entry);
          break;
        case 'type':
          score += level.weight * getTypeFairnessScore(entry);
          break;
      }
    }
    scores.set(entry.node.id, score);
  }

  return entries.sort((a, b) => (scores.get(b.node.id) ?? 0) - (scores.get(a.node.id) ?? 0));
}
```

## Fairness Metrics

```typescript
interface FairnessReport {
  timestamp: number;
  windowMs: number;                    // Evaluation window (default: 24h)
  tenants: TenantFairnessMetrics[];
  overall: {
    giniCoefficient: number;           // 0 = perfect equality, 1 = total inequality
    minToMaxRatio: number;             // Ratio of min to max resource share
    jainFairnessIndex: number;         // 1/n to 1, higher = more fair
  };
}

interface TenantFairnessMetrics {
  tenantId: string;
  totalJobs: number;
  totalRuntimeMs: number;
  totalCpuMs: number;
  totalMemoryMbHours: number;
  fairShare: number;                   // Target share (0-1)
  actualShare: number;                 // Actual share (0-1)
  deviationPercent: number;            // (actual - fair) / fair * 100
}
```

## Anti-Starvation Guarantee

Every queued job is guaranteed to eventually execute. The guarantee is enforced by:

```typescript
function antiStarvationCheck(entry: QueueEntry): boolean {
  const MAX_WAIT_TIME_MS = 300_000;  // 5 minutes max queue wait
  const waitTime = Date.now() - entry.context.submittedAt;

  if (waitTime > MAX_WAIT_TIME_MS) {
    // Force-schedule with maximum priority
    return true;
  }

  // Progressively boost priority the longer the job waits
  const agingFactor = waitTime / MAX_WAIT_TIME_MS;  // 0 to 1+
  entry.context.priority *= (1 + agingFactor);

  return false;
}
```
