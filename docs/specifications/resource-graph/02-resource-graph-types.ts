// ============================================================================
// Resource Graph — Formal Type Definitions
// ============================================================================

// ---- Resource Kinds ----

export type ResourceNodeKind =
  | 'node'
  | 'container'
  | 'vm'
  | 'pod'
  | 'volume'
  | 'image'
  | 'artifact'
  | 'network'
  | 'port'
  | 'cpu_slot'
  | 'memory_slot'
  | 'disk_slot'
  | 'workspace'
  | 'reservation'
  | 'warm_container'
  | 'port_pool';

// ---- Edge Kinds ----

export type ResourceEdgeKind =
  | 'runs_on'
  | 'scheduled_to'
  | 'allocates'
  | 'belongs_to'
  | 'uses'
  | 'consumes'
  | 'produces'
  | 'mounts'
  | 'attaches_to'
  | 'connects_to'
  | 'exposes'
  | 'reserves'
  | 'holds'
  | 'pooled_in'
  | 'acquired_from';

// ---- Status ----

export type HostStatus = 'online' | 'offline' | 'draining' | 'degraded';
export type PortState = 'available' | 'allocated' | 'reserved' | 'cooldown';
export type ReservationState = 'active' | 'fulfilled' | 'expired' | 'cancelled';

// ---- Capacity & Usage ----

export interface ResourceCapacity {
  cpu: number;
  memory: number;
  disk: number;
  maxContainers: number;
  maxPorts: number;
  networkBandwidth: number;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  disk: number;
  containers: number;
  ports: number;
  networkBandwidth: number;
}

export interface ReservationSummary {
  cpu: number;
  memory: number;
  disk: number;
  count: number;
}

// ---- Base Node ----

export interface ResourceNodeBase {
  id: string;
  kind: ResourceNodeKind;
  label: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  status: string;
  lastHeartbeat: number;
  healthScore: number;
}

// ---- Host ----

export interface HostNode extends ResourceNodeBase {
  kind: 'node';
  capacity: ResourceCapacity;
  usage: ResourceUsage;
  reservations: ReservationSummary;
  status: HostStatus;
}

// ---- Compute ----

export interface ComputeNode extends ResourceNodeBase {
  kind: 'container' | 'vm' | 'pod';
  runtimeId: string;
  workspaceId: string;
  executionNodeId: string;
  image: string;
  ports: number[];
  volumes: string[];
  limits: {
    cpu: string;
    memory: string;
    disk: string;
  };
  startedAt: number;
  expiresAt: number;
  ttl: number;
}

// ---- Storage ----

export interface VolumeNode extends ResourceNodeBase {
  kind: 'volume';
  type: 'workspace' | 'cache' | 'ephemeral' | 'persistent';
  size: number;
  used: number;
  mountPoint: string;
  filesystem: 'ext4' | 'xfs' | 'tmpfs';
  readOnly: boolean;
  persistent: boolean;
  lastUsed: number;
  ttl: number;
}

export interface ImageNode extends ResourceNodeBase {
  kind: 'image';
  reference: string;
  digest: string;
  size: number;
  layers: number;
  cached: boolean;
  lastUsed: number;
  pullPolicy: 'always' | 'if-not-present' | 'never';
}

export interface ArtifactNode extends ResourceNodeBase {
  kind: 'artifact';
  artifactType: 'source' | 'output' | 'binary';
  path: string;
  size: number;
  checksum: string;
  ttl: number;
  persist: boolean;
}

// ---- Network ----

export interface NetworkNode extends ResourceNodeBase {
  kind: 'network';
  networkType: 'bridge' | 'isolated' | 'host' | 'overlay';
  subnet?: string;
  gateway?: string;
  dns?: string[];
  allowedDomains?: string[];
}

export interface PortNode extends ResourceNodeBase {
  kind: 'port';
  portNumber: number;
  protocol: 'tcp' | 'udp';
  state: PortState;
  allocatedTo?: string;
  allocatedAt?: number;
  cooldownUntil?: number;
}

// ---- Allocation ----

export interface AllocationSlotNode extends ResourceNodeBase {
  kind: 'cpu_slot' | 'memory_slot' | 'disk_slot';
  unit: number;
  hostId: string;
  allocated: boolean;
  allocatedTo?: string;
  reserved?: boolean;
  reservedTo?: string;
}

// ---- Workspace ----

export interface WorkspaceNode extends ResourceNodeBase {
  kind: 'workspace';
  workspaceId: string;
  path: string;
  size: number;
  fileCount: number;
  lastModified: number;
  mounted: boolean;
  mountedTo?: string;
  syncedAt?: number;
  changedSinceSync: boolean;
  ttl: number;
  lastActivity: number;
}

// ---- Reservation ----

export interface ReservationNode extends ResourceNodeBase {
  kind: 'reservation';
  targetNodeId: string;
  executionNodeId: string;
  amount: Partial<ResourceCapacity>;
  startTime: number;
  endTime: number;
  state: ReservationState;
}

// ---- Pool ----

export interface PoolNode extends ResourceNodeBase {
  kind: 'warm_container' | 'port_pool';
  poolType: string;
  size: number;
  available: number;
  inUse: number;
  minSize: number;
  maxSize: number;
  prewarmTime: number;
}

// ---- Union ----

export type ResourceNode =
  | HostNode
  | ComputeNode
  | VolumeNode
  | ImageNode
  | ArtifactNode
  | NetworkNode
  | PortNode
  | AllocationSlotNode
  | WorkspaceNode
  | ReservationNode
  | PoolNode;

// ---- Edge ----

export interface ResourceEdge {
  id: string;
  kind: ResourceEdgeKind;
  sourceId: string;
  targetId: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

// ---- Graph ----

export interface ResourceGraph {
  nodes: ResourceNode[];
  edges: ResourceEdge[];
  version: string;
  updatedAt: number;
}

// ---- Query ----

export interface ResourceQuery {
  type: 'find_available' | 'find_by_capacity' | 'find_by_tag';
  resourceKind?: ResourceNodeKind;
  requiredCapacity?: Partial<ResourceCapacity>;
  tags?: Record<string, string>;
  limit?: number;
}

export interface ResourceQueryResult {
  nodes: ResourceNode[];
  total: number;
  available: number;
  recommended?: ResourceNode;
}

// ---- Snapshot ----

export interface ResourceGraphSnapshot {
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

// ---- Events ----

export type ResourceChangeEventType =
  | 'resource.allocated'
  | 'resource.released'
  | 'resource.reserved'
  | 'resource.reservation_expired'
  | 'resource.usage_updated'
  | 'resource.host_status_changed'
  | 'resource.pool_depleted'
  | 'resource.pool_replenished'
  | 'resource.capacity_exceeded';

export interface ResourceChangeEvent {
  type: ResourceChangeEventType;
  resourceId: string;
  resourceKind: ResourceNodeKind;
  timestamp: number;
  data: Record<string, unknown>;
}

// ---- Invariants ----

export const RESOURCE_GRAPH_INVARIANTS = [
  'RG-I1 — Conservation: Allocated + Available = Total Capacity',
  'RG-I2 — No Overcommit: Allocation must never exceed capacity',
  'RG-I3 — Single Owner: Each resource has exactly one owner',
  'RG-I4 — Port Uniqueness: No port allocated to multiple runtimes',
  'RG-I5 — Container-Host Affinity: Every container has one host',
  'RG-I6 — Workspace Exclusivity: Workspace mounted to at most one runtime',
  'RG-I7 — Reservation Expiry: Reservations auto-expire',
  'RG-I8 — Pool Balance: Warm pools maintain minSize available',
] as const;
