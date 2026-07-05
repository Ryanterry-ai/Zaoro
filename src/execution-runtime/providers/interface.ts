import type {
  RuntimeSpec,
  RuntimeInstance,
  CommandSpec,
  CommandResult,
  StreamChunk,
  HealthStatus,
  ResourceUsage,
  Snapshot,
  LogOptions,
  LogEntry,
  StopOptions,
  ProviderCapabilities,
} from '../types.js';

export interface SandboxProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  create(spec: RuntimeSpec): Promise<RuntimeInstance>;
  start(runtimeId: string): Promise<RuntimeInstance>;
  stop(runtimeId: string, options?: StopOptions): Promise<void>;
  destroy(runtimeId: string): Promise<void>;

  execute(runtimeId: string, command: CommandSpec): Promise<CommandResult>;
  stream(runtimeId: string, command: CommandSpec): AsyncIterable<StreamChunk>;

  health(runtimeId: string): Promise<HealthStatus>;
  resourceUsage(runtimeId: string): Promise<ResourceUsage>;

  copyIn(runtimeId: string, source: string, destination: string): Promise<void>;
  copyOut(runtimeId: string, source: string, destination: string): Promise<void>;

  snapshot(runtimeId: string): Promise<Snapshot>;
  restore(snapshotId: string): Promise<RuntimeInstance>;

  logs(runtimeId: string, options?: LogOptions): Promise<LogEntry[]>;
}
