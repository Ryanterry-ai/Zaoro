# 3. Capacity Planning

## Overview

Capacity planning determines how many execution resources can be provisioned on a given host, and how to model overcommit for efficiency.

## Resource Slot Model

```
Host Resources     Slot Granularity      Total Slots
─────────────────────────────────────────────────────
CPU:   8 cores     → 0.5 core/slot      → 16 CPU slots
Memory: 16 GB      → 256 MB/slot        → 64 Memory slots
Disk:   100 GB     → 1 GB/slot          → 100 Disk slots
Ports:  3100-3999  → 1 port/slot        → 900 Port slots
```

Each container allocates a number of slots from each pool based on its resource profile:

```typescript
function slotsRequired(profile: ResourceProfile): { cpu: number; memory: number; disk: number } {
  const config = RESOURCE_PROFILES[profile];
  return {
    cpu: Math.ceil(parseFloat(config.cpu) / 0.5),
    memory: Math.ceil(parseInt(config.memory) / (256 * 1024 * 1024)),
    disk: Math.ceil(parseInt(config.disk) / (1 * 1024 * 1024 * 1024)),
  };
}

// Example: preview profile → 2 CPU slots + 4 memory slots + 2 disk slots
// Example: build profile   → 4 CPU slots + 8 memory slots + 4 disk slots
```

## Overcommit Model

| Resource | Overcommit Ratio | Rationale |
|----------|-----------------|-----------|
| CPU | 4:1 | Most runtimes are I/O-bound, not CPU-bound |
| Memory | 1.5:1 | Runtimes rarely use full allocated memory |
| Disk | 1:1 | Disk overcommit causes write failures |
| Ports | 1:1 | Ports are exclusive, no overcommit |

Overcommit changes the available slot count:

```typescript
function availableSlots(host: HostNode, resource: 'cpu' | 'memory' | 'disk', overcommitRatio: number): number {
  const total = resource === 'cpu' ? host.capacity.cpu / 0.5
              : resource === 'memory' ? host.capacity.memory / (256 * 1024 * 1024)
              : host.capacity.disk / (1 * 1024 * 1024 * 1024);

  const used = resource === 'cpu' ? host.usage.cpu / 0.5
              : resource === 'memory' ? host.usage.memory / (256 * 1024 * 1024)
              : host.usage.disk / (1 * 1024 * 1024 * 1024);

  return Math.floor(total * overcommitRatio - used);
}

// Example: 8 CPU cores, 4:1 overcommit, 2.5 cores used
// Available CPU slots = (8 * 4 - 2.5) / 0.5 = (32 - 2.5) / 0.5 = 59 slots
```

## Capacity Budget

```typescript
interface CapacityBudget {
  hostId: string;
  total: ResourceCapacity;
  reserved: {                          // Reserved for OS + system processes
    cpu: number;                       // e.g., 1 core
    memory: number;                    // e.g., 2 GB
    disk: number;                      // e.g., 10 GB
  };
  overcommit: {
    cpu: number;                       // e.g., 4 (4:1)
    memory: number;                    // e.g., 1.5 (1.5:1)
    disk: number;                      // e.g., 1 (1:1)
  };
  available: () => ResourceCapacity;   // Computed
  utilization: () => number;           // Weighted average
}

function computeCapacityBudget(host: HostNode): CapacityBudget {
  const reserved = { cpu: 1, memory: 2 * 1024 ** 3, disk: 10 * 1024 ** 3 };
  const overcommit = { cpu: 4, memory: 1.5, disk: 1 };

  const available = {
    cpu: (host.capacity.cpu - reserved.cpu) * overcommit.cpu - host.usage.cpu,
    memory: (host.capacity.memory - reserved.memory) * overcommit.memory - host.usage.memory,
    disk: (host.capacity.disk - reserved.disk) * overcommit.disk - host.usage.disk,
    maxContainers: host.capacity.maxContainers - host.usage.containers,
    maxPorts: host.capacity.maxPorts - host.usage.ports,
    networkBandwidth: host.capacity.networkBandwidth - host.usage.networkBandwidth,
  };

  return { hostId: host.id, total: host.capacity, reserved, overcommit, available: () => available };
}
```

## Reservation Strategy

Reservations hold capacity for future high-priority executions:

```typescript
interface ReservationStrategy {
  /** Percentage of total capacity reserved for each priority level */
  priorityReservations: Record<number, { cpu: number; memory: number; disk: number }>;
  // E.g., priority 100: { cpu: 1, memory: 2GB, disk: 5GB }
  // E.g., priority 75:  { cpu: 2, memory: 4GB, disk: 10GB }

  /** Reservations are released if unused after TTL */
  reservationTtlMs: number;           // Default: 60_000

  /** Maximum total reserved capacity */
  maxReservedPercent: number;         // Default: 30%
}
```

## Scaling Decisions

```typescript
function shouldAddHost(currentSnapshot: ResourceGraphSnapshot): boolean {
  const cpuThreshold = 0.80;    // Add host if CPU > 80%
  const memThreshold = 0.80;    // Add host if memory > 80%
  const diskThreshold = 0.85;   // Add host if disk > 85%
  const queueThreshold = 10;    // Add host if queued jobs > 10

  return (
    currentSnapshot.summary.cpuUtilizationAvg > cpuThreshold ||
    currentSnapshot.summary.memoryUtilizationAvg > memThreshold ||
    currentSnapshot.summary.diskUtilizationAvg > diskThreshold
  ) && currentSnapshot.hosts.length > 0;  // Only if at least one host exists
}

function canRemoveHost(currentSnapshot: ResourceGraphSnapshot): boolean {
  const cpuThreshold = 0.30;    // Remove host if CPU < 30%
  const memThreshold = 0.30;    // Remove host if memory < 30%
  const minHosts = 1;           // Always keep at least 1 host

  return (
    currentSnapshot.summary.cpuUtilizationAvg < cpuThreshold &&
    currentSnapshot.summary.memoryUtilizationAvg < memThreshold
  ) && currentSnapshot.hosts.length > minHosts;
}
```
