# 2. Runtime API — SandboxProvider Interface

## SandboxProvider

The central interface that all runtime providers implement.

```typescript
interface SandboxProvider {
  /** Unique provider identifier */
  readonly name: string;

  /** Provider capability flags */
  readonly capabilities: ProviderCapabilities;

  /** Create a new runtime environment */
  create(spec: RuntimeSpec): Promise<RuntimeInstance>;

  /** Start a created runtime */
  start(runtimeId: string): Promise<RuntimeInstance>;

  /** Stop a running runtime (graceful) */
  stop(runtimeId: string, options?: StopOptions): Promise<void>;

  /** Force-destroy a runtime */
  destroy(runtimeId: string): Promise<void>;

  /** Execute a command inside the runtime */
  execute(
    runtimeId: string,
    command: CommandSpec
  ): Promise<CommandResult>;

  /** Stream output from a command */
  stream(
    runtimeId: string,
    command: CommandSpec
  ): AsyncIterable<StreamChunk>;

  /** Check runtime health */
  health(runtimeId: string): Promise<HealthStatus>;

  /** Get resource usage */
  resourceUsage(runtimeId: string): Promise<ResourceUsage>;

  /** Copy files into the runtime */
  copyIn(
    runtimeId: string,
    source: string,
    destination: string
  ): Promise<void>;

  /** Copy files out of the runtime */
  copyOut(
    runtimeId: string,
    source: string,
    destination: string
  ): Promise<void>;

  /** Create a snapshot of the runtime state */
  snapshot(runtimeId: string): Promise<Snapshot>;

  /** Restore from a snapshot */
  restore(snapshotId: string): Promise<RuntimeInstance>;

  /** Get runtime logs */
  logs(
    runtimeId: string,
    options?: LogOptions
  ): Promise<LogEntry[]>;
}

interface ProviderCapabilities {
  /** Supports snapshot/restore */
  snapshots: boolean;
  /** Supports resource limits */
  resourceLimits: boolean;
  /** Supports filesystem mounting */
  filesystemMount: boolean;
  /** Supports port mapping */
  portMapping: boolean;
  /** Supports health checks */
  healthChecks: boolean;
  /** Maximum concurrent runtimes supported */
  maxConcurrent: number;
  /** Supported execution environments */
  environments: ExecutionEnvironment[];
}

type ExecutionEnvironment =
  | 'container'
  | 'pod'
  | 'microvm'
  | 'process';
```

## RuntimeSpec

The specification for creating a new runtime.

```typescript
interface RuntimeSpec {
  /** Unique runtime identifier */
  id: string;

  /** Docker image or base environment */
  image: string;

  /** Command to run on start */
  command?: string[];

  /** Environment variables */
  env?: Record<string, string>;

  /** Resource limits */
  limits?: ResourceLimits;

  /** Port mappings: container -> host */
  ports?: PortMapping[];

  /** Workspace mounts */
  mounts?: WorkspaceMount[];

  /** Network configuration */
  network?: NetworkConfig;

  /** Security configuration */
  security?: SecurityConfig;

  /** Labels for organization/filtering */
  labels?: Record<string, string>;

  /** Timeout in milliseconds */
  timeout?: number;
}

interface ResourceLimits {
  cpu?: string;        // e.g. "1.0" = 1 core
  memory?: string;     // e.g. "1gb"
  disk?: string;       // e.g. "2gb"
  pids?: number;       // e.g. 200
  network?: string;    // e.g. "10mbps"
  timeout?: number;    // max execution time in ms
}

interface PortMapping {
  container: number;
  host?: number;       // auto-allocated if omitted
  protocol?: 'tcp' | 'udp';
}

interface WorkspaceMount {
  /** Host source path */
  source: string;
  /** Container target path */
  target: string;
  /** Read-only mount */
  readOnly?: boolean;
}

interface NetworkConfig {
  mode: 'isolated' | 'bridge' | 'host' | 'none';
  allowedDomains?: string[];   // if isolated, allow-list
  allowedPorts?: number[];     // allowed egress ports
}

interface SecurityConfig {
  readOnlyRoot: boolean;
  privileged: boolean;        // must always be false
  allowDockerSocket: boolean; // must always be false
  allowSSH: boolean;          // must always be false
  seccompProfile?: string;
  appArmorProfile?: string;
  allowHostFS: boolean;       // must always be false
  capabilities?: string[];    // dropped capabilities
}
```

## RuntimeInstance

A running runtime instance.

```typescript
interface RuntimeInstance {
  id: string;
  provider: string;
  status: RuntimeStatus;
  spec: RuntimeSpec;

  /** Host-accessible URL (e.g. http://localhost:3102) */
  url?: string;
  /** Public preview URL (e.g. https://preview.build.same/p/abcd) */
  previewUrl?: string;

  /** Allocated host port */
  allocatedPort?: number;
  /** Workspace path on host */
  workspacePath?: string;

  /** Creation timestamp */
  createdAt: number;
  /** Last activity timestamp */
  lastActivityAt: number;
  /** Expected timeout timestamp */
  expiresAt?: number;

  /** Resource usage snapshots */
  resourceUsage?: ResourceUsage;
  /** Latest health status */
  health?: HealthStatus;
}

type RuntimeStatus =
  | 'pending'
  | 'creating'
  | 'created'
  | 'starting'
  | 'running'
  | 'installing'
  | 'building'
  | 'ready'
  | 'degraded'
  | 'stopping'
  | 'stopped'
  | 'destroying'
  | 'destroyed'
  | 'failed';
```

## CommandSpec & CommandResult

```typescript
interface CommandSpec {
  command: string[];
  workingDir?: string;
  env?: Record<string, string>;
  timeout?: number;
  maxOutput?: number;  // max bytes to capture
}

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  truncated: boolean;
}

interface StreamChunk {
  stream: 'stdout' | 'stderr';
  data: string;
  timestamp: number;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  /** HTTP status of the running service */
  httpStatus?: number;
  /** Response time in ms */
  responseTime?: number;
  /** Error message if degraded */
  error?: string;
  lastChecked: number;
}

interface ResourceUsage {
  cpuPercent: number;
  memoryBytes: number;
  memoryPercent: number;
  diskBytes: number;
  pids: number;
  networkRxBytes: number;
  networkTxBytes: number;
  timestamp: number;
}

interface Snapshot {
  id: string;
  runtimeId: string;
  createdAt: number;
  sizeBytes: number;
  /** Provider-specific snapshot reference */
  providerRef: string;
}

interface LogOptions {
  tail?: number;
  since?: number;
  stream?: 'stdout' | 'stderr' | 'all';
}

interface LogEntry {
  timestamp: number;
  stream: 'stdout' | 'stderr';
  message: string;
}

interface StopOptions {
  /** Graceful stop timeout before force kill */
  timeout?: number;
  /** Remove after stopping */
  remove?: boolean;
}
```
