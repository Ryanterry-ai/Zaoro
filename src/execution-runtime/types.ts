export type ExecutionEnvironment = 'container' | 'pod' | 'microvm' | 'process';

export type RuntimeStatus =
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

export interface ProviderCapabilities {
  snapshots: boolean;
  resourceLimits: boolean;
  filesystemMount: boolean;
  portMapping: boolean;
  healthChecks: boolean;
  maxConcurrent: number;
  environments: ExecutionEnvironment[];
}

export interface ResourceLimits {
  cpu?: string;
  memory?: string;
  disk?: string;
  pids?: number;
  network?: string;
  timeout?: number;
}

export interface PortMapping {
  container: number;
  host?: number;
  protocol?: 'tcp' | 'udp';
}

export interface WorkspaceMount {
  source: string;
  target: string;
  readOnly?: boolean;
}

export interface NetworkConfig {
  mode: 'isolated' | 'bridge' | 'host' | 'none';
  allowedDomains?: string[];
  allowedPorts?: number[];
}

export interface SecurityConfig {
  readOnlyRoot: boolean;
  privileged: boolean;
  allowDockerSocket: boolean;
  allowSSH: boolean;
  seccompProfile?: string;
  appArmorProfile?: string;
  allowHostFS: boolean;
  capabilities?: string[];
}

export interface RuntimeSpec {
  id: string;
  image: string;
  command?: string[];
  env?: Record<string, string>;
  limits?: ResourceLimits;
  ports?: PortMapping[];
  mounts?: WorkspaceMount[];
  network?: NetworkConfig;
  security?: SecurityConfig;
  labels?: Record<string, string>;
  timeout?: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  httpStatus?: number;
  responseTime?: number;
  error: string | undefined;
  lastChecked: number;
}

export interface ResourceUsage {
  cpuPercent: number;
  memoryBytes: number;
  memoryPercent: number;
  diskBytes: number;
  pids: number;
  networkRxBytes: number;
  networkTxBytes: number;
  timestamp: number;
}

export interface Snapshot {
  id: string;
  runtimeId: string;
  createdAt: number;
  sizeBytes: number;
  providerRef: string;
}

export interface LogOptions {
  tail?: number;
  since?: number;
  stream?: 'stdout' | 'stderr' | 'all';
}

export interface LogEntry {
  timestamp: number;
  stream: 'stdout' | 'stderr';
  message: string;
}

export interface StopOptions {
  timeout?: number;
  remove?: boolean;
}

export interface CommandSpec {
  command: string[];
  workingDir?: string;
  env?: Record<string, string>;
  timeout?: number;
  maxOutput?: number;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  truncated: boolean;
}

export interface StreamChunk {
  stream: 'stdout' | 'stderr';
  data: string;
  timestamp: number;
}

export interface RuntimeInstance {
  id: string;
  provider: string;
  status: RuntimeStatus;
  spec: RuntimeSpec;
  url: string | undefined;
  previewUrl: string | undefined;
  allocatedPort: number | undefined;
  workspacePath: string | undefined;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number | undefined;
  resourceUsage: ResourceUsage | undefined;
  health: HealthStatus | undefined;
}
