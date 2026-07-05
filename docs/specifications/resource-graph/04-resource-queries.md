# 4. Resource Queries

## Query Patterns for the Scheduler

The Scheduler's Resource Allocator uses these query patterns to determine execution feasibility.

### Q1: Can this execution node run?

```typescript
async function canRun(node: ExecutionNode): Promise<{ feasible: boolean; reason?: string; recommendedHost?: string }> {
  const profile = RESOURCE_PROFILES[node.resourceProfile];
  const requirements = {
    cpu: parseFloat(profile.cpu),
    memory: parseInt(profile.memory),
    disk: parseInt(profile.disk),
    needsPort: node.kind === 'preview',
  };

  // Find hosts with sufficient capacity
  const hosts = await resourceGraph.query({
    type: 'find_by_capacity',
    resourceKind: 'node',
    requiredCapacity: {
      cpu: requirements.cpu,
      memory: requirements.memory,
      disk: requirements.disk,
    },
  });

  if (hosts.total === 0) {
    return { feasible: false, reason: 'No host with sufficient capacity' };
  }

  // If port needed, find host with available port
  if (requirements.needsPort) {
    const ports = await resourceGraph.query({
      type: 'find_available',
      resourceKind: 'port',
      limit: 1,
    });
    if (ports.total === 0) {
      return { feasible: false, reason: 'No available ports' };
    }
  }

  return { feasible: true, recommendedHost: hosts.recommended?.id };
}
```

### Q2: Find warm container

```typescript
async function findWarmContainer(poolType: string): Promise<ComputeNode | null> {
  const pool = await resourceGraph.query({
    type: 'find_available',
    resourceKind: 'warm_container',
    tags: { poolType },
    limit: 1,
  });

  if (pool.total === 0) return null;

  // Find the actual warm container in the pool
  const containerId = pool.recommended?.id;
  if (!containerId) return null;

  const containers = await resourceGraph.query({
    type: 'find_available',
    resourceKind: 'container',
    tags: { warmPoolId: containerId },
    limit: 1,
  });

  return (containers.recommended as ComputeNode) ?? null;
}
```

### Q3: Allocate port

```typescript
async function allocatePort(workspaceId: string): Promise<number | null> {
  const available = await resourceGraph.query({
    type: 'find_available',
    resourceKind: 'port',
    limit: 1,
  });

  if (available.total === 0) return null;

  const port = available.recommended as PortNode;
  await resourceGraph.allocate(port.id, { cpu: 0, memory: 0, disk: 0 });
  return port.portNumber;
}
```

### Q4: Check pool health

```typescript
async function checkPoolHealth(): Promise<PoolHealthReport> {
  const pools = await resourceGraph.query({
    type: 'find_available',
    resourceKind: 'port_pool',
  });

  const reports: PoolHealthReport['pools'] = [];

  for (const pool of pools.nodes as PoolNode[]) {
    const deficit = pool.minSize - pool.available;
    reports.push({
      name: pool.poolType,
      targetSize: pool.size,
      available: pool.available,
      inUse: pool.inUse,
      deficit: Math.max(0, deficit),
      status: deficit > 0 ? 'depleting' : pool.available < pool.minSize * 0.5 ? 'warning' : 'healthy',
    });
  }

  return {
    timestamp: Date.now(),
    pools: reports,
    allHealthy: reports.every(r => r.status === 'healthy'),
  };
}

interface PoolHealthReport {
  timestamp: number;
  pools: {
    name: string;
    targetSize: number;
    available: number;
    inUse: number;
    deficit: number;
    status: 'healthy' | 'warning' | 'depleting';
  }[];
  allHealthy: boolean;
}
```

### Q5: Get resource utilization summary

```typescript
async function getUtilizationSummary(): Promise<{
  cpu: number;
  memory: number;
  disk: number;
  ports: number;
  containers: number;
  warmPoolUtilization: number;
}> {
  const snapshot = await resourceGraph.snapshot();
  return {
    cpu: snapshot.summary.cpuUtilizationAvg,
    memory: snapshot.summary.memoryUtilizationAvg,
    disk: snapshot.summary.diskUtilizationAvg,
    ports: snapshot.hosts.reduce((sum, h) => sum + h.containerCount, 0),
    containers: snapshot.summary.totalContainers,
    warmPoolUtilization: snapshot.pools.reduce(
      (sum, p) => sum + (p.inUse / Math.max(p.targetSize, 1)),
      0
    ) / Math.max(snapshot.pools.length, 1),
  };
}
```

### Q6: Find under-utilized host for drain

```typescript
async function findDrainCandidate(): Promise<string | null> {
  const hosts = await resourceGraph.query({
    type: 'find_by_capacity',
    resourceKind: 'node',
    requiredCapacity: { cpu: 0, memory: 0, disk: 0 }, // all hosts
  });

  let bestCandidate: { id: string; score: number } | null = null;

  for (const host of hosts.nodes as HostNode[]) {
    if (host.status !== 'online') continue;

    const cpuUtil = host.usage.cpu / host.capacity.cpu;
    const memUtil = host.usage.memory / host.capacity.memory;
    const containerUtil = host.usage.containers / host.capacity.maxContainers;

    // Score: higher utilization = better drain target (it has fewer containers)
    const score = (cpuUtil + memUtil + containerUtil) / 3;

    if (!bestCandidate || score < bestCandidate.score) {
      bestCandidate = { id: host.id, score };
    }
  }

  return bestCandidate && bestCandidate.score < 0.3 ? bestCandidate.id : null;
}
```

## Query Performance

| Query | Index | Complexity |
|-------|-------|------------|
| Q1 (can run) | Host capacity index | O(h) where h = hosts |
| Q2 (warm container) | Pool type index | O(1) |
| Q3 (allocate port) | Port state index | O(log p) where p = ports |
| Q4 (pool health) | Pool aggregate | O(1) |
| Q5 (utilization) | Snapshot cache | O(1) |
| Q6 (drain candidate) | Host utilization index | O(h) |

## Index Strategy

```typescript
interface ResourceIndex {
  /** Index: hostId → available capacity */
  hostCapacityIndex: Map<string, ResourceCapacity>;

  /** Index: poolType → warm container IDs */
  warmPoolIndex: Map<string, string[]>;

  /** Index: portState → port IDs */
  portStateIndex: Map<PortState, string[]>;

  /** Index: hostId → utilization score (0-1) */
  hostUtilizationIndex: Map<string, number>;

  /** Rebuild all indices */
  rebuild(graph: ResourceGraph): void;

  /** Update a single node's indices */
  updateNode(node: ResourceNode): void;
}
```
