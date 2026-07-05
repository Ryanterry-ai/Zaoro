# 1. Resource Graph Specification v1.0

## Overview

The Resource Graph is a **directed graph** where:

- **Nodes** represent resource entities: hosts, containers, volumes, images, networks, ports, CPU slots, memory slots, disk slots, artifacts, and workspaces
- **Edges** represent relationships: runs_on, uses, mounts, connects_to, allocates, produces, consumes, reserves
- **Properties** on nodes capture capacity (total), usage (current), available (capacity - usage), reservations (future), and limits (maximum per consumer)

The Resource Graph is **mutable** — it is updated as resources are allocated, used, and released. It is the source of truth for what is currently available in the system.

## Resource Node Kinds

### 8 Categories, 16 Node Kinds

| Category | Node Kind | Description |
|----------|-----------|-------------|
| **Host** | `node` | Physical or virtual machine |
| **Compute** | `container` | Running container instance |
| **Compute** | `vm` | Running virtual machine (Firecracker) |
| **Compute** | `pod` | Kubernetes pod |
| | | |
| **Storage** | `volume` | Persistent or ephemeral volume |
| **Storage** | `image` | Container image (base or custom) |
| **Storage** | `artifact` | Build artifact (files, binaries, archives) |
| | | |
| **Network** | `network` | Network namespace or bridge |
| **Network** | `port` | Network port allocation |
| | | |
| **Allocation** | `cpu_slot` | Allocated CPU unit (0.5 core granularity) |
| **Allocation** | `memory_slot` | Allocated memory unit (256MB granularity) |
| **Allocation** | `disk_slot` | Allocated disk unit (1GB granularity) |
| | | |
| **Workspace** | `workspace` | Project workspace directory |
| | | |
| **Reservation** | `reservation` | Future resource reservation |
| | | |
| **Pool** | `warm_container` | Pre-warmed container in pool |
| **Pool** | `port_pool` | Available port range |

## Formal Type

```typescript
type ResourceNodeKind =
  // Host
  | 'node'
  // Compute
  | 'container'
  | 'vm'
  | 'pod'
  // Storage
  | 'volume'
  | 'image'
  | 'artifact'
  // Network
  | 'network'
  | 'port'
  // Allocation
  | 'cpu_slot'
  | 'memory_slot'
  | 'disk_slot'
  // Workspace
  | 'workspace'
  // Reservation
  | 'reservation'
  // Pool
  | 'warm_container'
  | 'port_pool';
```

## Resource Edge Kinds

### 6 Categories, 14 Edge Kinds

| Category | Edge Kind | Description |
|----------|-----------|-------------|
| **Placement** | `runs_on` | Container/VM runs on a host node |
| **Placement** | `scheduled_to` | Execution node scheduled to a resource |
| | | |
| **Allocation** | `allocates` | Port/CPU/Memory allocated to a runtime |
| **Allocation** | `belongs_to` | Slot belongs to a host pool |
| | | |
| **Usage** | `uses` | Container uses CPU/memory/disk |
| **Usage** | `consumes` | Runtime consumes an artifact or image |
| **Usage** | `produces` | Runtime produces an artifact |
| | | |
| **Mount** | `mounts` | Container mounts a volume |
| **Mount** | `attaches_to` | Volume attaches to a host |
| | | |
| **Network** | `connects_to` | Container connects to a network |
| **Network** | `exposes` | Container exposes a port |
| | | |
| **Reservation** | `reserves` | Reservation reserves a resource |
| **Reservation** | `holds` | Reservation holds capacity for future use |
| | | |
| **Pool** | `pooled_in` | Warm container or port is in a pool |
| **Pool** | `acquired_from` | Resource acquired from a pool |

## Resource Properties

### Host Node

```typescript
interface ResourceNode {
  id: string;
  kind: ResourceNodeKind;
  label: string;
  tags?: string[];
  metadata?: Record<string, unknown>;

  // Capacity
  capacity: ResourceCapacity;
  // Current usage
  usage: ResourceUsage;
  // Active reservations
  reservations: ReservationSummary;

  // Status
  status: 'online' | 'offline' | 'draining' | 'degraded';
  lastHeartbeat: number;
  healthScore: number;     // 0-1
}

interface ResourceCapacity {
  cpu: number;              // Total CPU cores available
  memory: number;           // Total memory in bytes
  disk: number;             // Total disk in bytes
  maxContainers: number;    // Max concurrent containers
  maxPorts: number;         // Max concurrent port allocations
  networkBandwidth: number; // Max network throughput in bps
}

interface ResourceUsage {
  cpu: number;              // Currently used CPU cores
  memory: number;           // Currently used memory in bytes
  disk: number;             // Currently used disk in bytes
  containers: number;       // Currently running containers
  ports: number;            // Currently allocated ports
  networkBandwidth: number; // Current network throughput in bps
}

interface ReservationSummary {
  cpu: number;              // CPU reserved for future
  memory: number;           // Memory reserved for future
  disk: number;             // Disk reserved for future
  count: number;            // Number of active reservations
}
```

### Container/VM/Pod

```typescript
interface ComputeResource extends ResourceNode {
  kind: 'container' | 'vm' | 'pod';

  runtimeId: string;           // Runtime instance ID
  workspaceId: string;         // Associated workspace
  executionNodeId: string;     // Execution Graph node being executed

  image: string;               // Container image
  ports: number[];             // Exposed/mapped ports
  volumes: string[];           // Mounted volume IDs

  limits: {
    cpu: string;               // e.g., '1.0'
    memory: string;             // e.g., '1gb'
    disk: string;               // e.g., '2gb'
  };

  startedAt: number;
  expiresAt: number;
  ttl: number;
}
```

### Volume

```typescript
interface VolumeResource extends ResourceNode {
  kind: 'volume';

  type: 'workspace' | 'cache' | 'ephemeral' | 'persistent';
  size: number;                // In bytes
  used: number;                // Used bytes
  mountPoint: string;          // Host mount path
  filesystem: 'ext4' | 'xfs' | 'tmpfs';
  readOnly: boolean;

  // Lifecycle
  persistent: boolean;         // Keep after runtime destroy?
  lastUsed: number;
  ttl: number;                 // Auto-cleanup after idle
}
```

### Image

```typescript
interface ImageResource extends ResourceNode {
  kind: 'image';

  reference: string;           // e.g., 'buildsame/runtime:base@sha256:...'
  digest: string;
  size: number;                // In bytes
  layers: number;
  cached: boolean;             // Available locally?
  lastUsed: number;

  // Pull policy
  pullPolicy: 'always' | 'if-not-present' | 'never';
}
```

### Port

```typescript
interface PortResource extends ResourceNode {
  kind: 'port';

  portNumber: number;
  protocol: 'tcp' | 'udp';
  state: 'available' | 'allocated' | 'reserved' | 'cooldown';
  allocatedTo?: string;        // Container or workspace ID
  allocatedAt?: number;
  cooldownUntil?: number;      // TIME_WAIT avoidance
}
```

### CPU/Memory/Disk Slot

```typescript
interface AllocationSlot extends ResourceNode {
  kind: 'cpu_slot' | 'memory_slot' | 'disk_slot';

  unit: number;                // 0.5 cores for CPU, 256MB for memory, 1GB for disk
  hostId: string;              // Parent host node
  allocated: boolean;
  allocatedTo?: string;        // Container/VM ID
  reserved?: boolean;
  reservedTo?: string;         // Reservation ID
}
```

### Workspace

```typescript
interface WorkspaceResource extends ResourceNode {
  kind: 'workspace';

  workspaceId: string;
  path: string;                // Absolute path on host
  size: number;                // Current size in bytes
  fileCount: number;
  lastModified: number;

  // Mount state
  mounted: boolean;
  mountedTo?: string;          // Container ID

  // Sync state
  syncedAt?: number;
  changedSinceSync: boolean;

  // Cleanup
  ttl: number;
  lastActivity: number;
}
```

### Reservation

```typescript
interface ReservationResource extends ResourceNode {
  kind: 'reservation';

  targetNodeId: string;        // Resource being reserved
  executionNodeId: string;     // Execution Graph node that will use it
  amount: Partial<ResourceCapacity>;
  startTime: number;
  endTime: number;
  state: 'active' | 'fulfilled' | 'expired' | 'cancelled';
}
```

### Warm Container / Port Pool

```typescript
interface PoolResource extends ResourceNode {
  kind: 'warm_container' | 'port_pool';

  poolType: string;            // 'preview' | 'build' | 'test'
  size: number;                // Target pool size
  available: number;           // Currently available
  inUse: number;               // Currently acquired from pool
  minSize: number;
  maxSize: number;
  prewarmTime: number;         // Time to prepare a new warm resource
}
```

## Resource Graph Invariants

**RG-I1 — Conservation**: Total allocated + available = total capacity for every resource. Allocations and releases must always balance.

**RG-I2 — No Overcommit**: A resource's current allocation must never exceed its capacity. Overcommit is tracked separately via the reservation system.

**RG-I3 — Single Owner**: Each allocatable resource (port, slot, container) has exactly one owner at any time. Ownership transfers are explicit.

**RG-I4 — Port Uniqueness**: No port can be allocated to more than one runtime simultaneously. Released ports enter a 60s cooldown before reallocation.

**RG-I5 — Container-Host Affinity**: Every container must be connected to exactly one host via a `runs_on` edge.

**RG-I6 — Workspace Exclusivity**: A workspace can be mounted to at most one runtime at a time. Read-only mounts are the exception.

**RG-I7 — Reservation Expiry**: Reservations automatically expire after their configured duration. Expired reservations release their held capacity.

**RG-I8 — Pool Balance**: Warm pools must maintain at least `minSize` available resources. When `available` drops below `minSize`, the pool controller creates new warm resources up to `maxSize`.

## Example Resource Graph

```
[node: host-1]
  capacity: { cpu: 8, memory: 16GB, disk: 100GB, maxContainers: 20 }
  usage:    { cpu: 2.5, memory: 4GB, disk: 30GB, containers: 3 }
    │
    ├── runs_on ──► [container: c-abc123]
    │      │             │
    │      │             ├── uses ──► [cpu_slot: cpu-01] (0.5 core)
    │      │             ├── uses ──► [memory_slot: mem-01] (256MB)
    │      │             ├── uses ──► [disk_slot: disk-01] (1GB)
    │      │             ├── mounts ──► [volume: vol-ws-xxx]
    │      │             ├── connects_to ──► [network: net-buildsame]
    │      │             └── exposes ──► [port: 3102]
    │      │
    │      ├── runs_on ──► [container: c-def456]
    │      │                   ...
    │      │
    │      └── runs_on ──► [container: c-ghi789]
    │
    ├── attaches_to ──► [volume: vol-cache-deps]
    ├── attaches_to ──► [volume: vol-cache-build]
    │
    ├── belongs_to ──► [cpu_slot: cpu-01] ... [cpu_slot: cpu-16]
    ├── belongs_to ──► [memory_slot: mem-01] ... [memory_slot: mem-64]
    └── belongs_to ──► [disk_slot: disk-01] ... [disk_slot: disk-100]

[warm_container: pool-preview]
  poolType: 'preview'
  size: 5, available: 2, inUse: 3
    │
    ├── pooled_in ──► [container: c-warm-01] (available)
    ├── pooled_in ──► [container: c-warm-02] (available)
    ├── pooled_in ──► [container: c-warm-03] (in use)
    ├── pooled_in ──► [container: c-warm-04] (in use)
    └── pooled_in ──► [container: c-warm-05] (in use)

[port_pool: ports-3100-3999]
  size: 900, available: 897, inUse: 3
```

## Resource Graph Update Operations

```typescript
interface ResourceGraph {
  /** Query current state */
  query(query: ResourceQuery): ResourceQueryResult;

  /** Allocate resources for an execution node */
  allocate(nodeId: string, requirements: ResourceRequirements): Promise<AllocationResult>;

  /** Release resources held by an execution node */
  release(nodeId: string): Promise<void>;

  /** Reserve resources for future use */
  reserve(nodeId: string, requirements: ResourceRequirements, duration: number): Promise<ReservationResult>;

  /** Update resource usage (called by Health Monitor) */
  updateUsage(nodeId: string, usage: ResourceUsage): void;

  /** Mark a host as offline/draining */
  setHostStatus(hostId: string, status: 'offline' | 'draining'): void;

  /** Get snapshot of all resources */
  snapshot(): ResourceGraphSnapshot;

  /** Subscribe to resource changes */
  subscribe(handler: (event: ResourceChangeEvent) => void): () => void;
}

interface ResourceQuery {
  type: 'find_available' | 'find_by_capacity' | 'find_by_tag';
  resourceKind?: ResourceNodeKind;
  requiredCapacity?: Partial<ResourceCapacity>;
  tags?: Record<string, string>;
  limit?: number;
}

interface ResourceQueryResult {
  nodes: ResourceNode[];
  total: number;
  available: number;
  recommended?: ResourceNode;  // Best match
}

interface ResourceGraphSnapshot {
  timestamp: number;
  hosts: {
    id: string;
    status: string;
    cpuUtilization: number;
    memoryUtilization: number;
    diskUtilization: number;
    containerCount: number;
  }[];
  pools: {
    name: string;
    available: number;
    inUse: number;
    targetSize: number;
  }[];
  summary: {
    totalContainers: number;
    totalPorts: number;
    totalVolumes: number;
    cpuUtilizationAvg: number;
    memoryUtilizationAvg: number;
    diskUtilizationAvg: number;
  };
}
```
