# 4. Runtime Manager

## Responsibilities

The Runtime Manager orchestrates the complete lifecycle of every runtime instance. It does NOT implement container operations directly — it delegates to a SandboxProvider.

```
Build Request
     │
     ▼
┌─────────────────┐
│  RuntimeManager │
│                 │
│  1. Validate    │
│  2. Allocate    │
│  3. Create      │
│  4. Monitor     │
│  5. Cleanup     │
└─────────────────┘
     │
     ├──► PortManager.allocate()
     ├──► WorkspaceManager.mount()
     ├──► Provider.create(spec)
     ├──► HealthMonitor.register(runtimeId)
     └──► CleanupScheduler.schedule(runtimeId, ttl)
```

## Interface

```typescript
interface RuntimeManager {
  /** Request a new runtime for execution */
  request(spec: RuntimeRequest): Promise<RuntimeInstance>;

  /** Get a specific runtime by ID */
  get(runtimeId: string): Promise<RuntimeInstance | null>;

  /** List all runtimes with optional filter */
  list(filter?: RuntimeFilter): Promise<RuntimeInstance[]>;

  /** Stop and destroy a runtime */
  release(runtimeId: string): Promise<void>;

  /** Execute a command in a runtime */
  execute(
    runtimeId: string,
    command: CommandSpec
  ): Promise<CommandResult>;

  /** Stream command output */
  stream(
    runtimeId: string,
    command: CommandSpec
  ): AsyncIterable<StreamChunk>;

  /** Check runtime health */
  checkHealth(runtimeId: string): Promise<HealthStatus>;

  /** Get runtime logs */
  getLogs(
    runtimeId: string,
    options?: LogOptions
  ): Promise<LogEntry[]>;
}

interface RuntimeRequest {
  /** Unique ID for this execution */
  id: string;
  /** Workspace ID this runtime belongs to */
  workspaceId: string;
  /** Type of execution */
  type: 'preview' | 'build' | 'test' | 'repair' | 'deploy';
  /** Project root path on host */
  projectPath: string;
  /** Port to expose (preview only) */
  port?: number;
  /** Resource requirements */
  requirements?: ResourceRequirements;
  /** Timeout in ms */
  timeout?: number;
}

interface ResourceRequirements {
  cpu: 'low' | 'medium' | 'high';    // 0.5 / 1.0 / 2.0 cores
  memory: 'low' | 'medium' | 'high';  // 512mb / 1gb / 2gb
  disk: 'low' | 'medium' | 'high';    // 1gb / 2gb / 5gb
}

interface RuntimeFilter {
  status?: RuntimeStatus;
  workspaceId?: string;
  type?: string;
  limit?: number;
}
```

## Allocation Flow

```
RuntimeManager.request()
  │
  ├── 1. Validate spec (limits within bounds, image exists)
  │
  ├── 2. Check warm pool (if available, reuse)
  │     └── WarmPool.acquire(type) ──> RuntimeInstance or null
  │
  ├── 3. PortManager.allocate() (if preview type)
  │
  ├── 4. WorkspaceManager.mount(projectPath)
  │
  ├── 5. Provider.create(spec) ──> runtimeId
  │
  ├── 6. Register in activeRuntimes map
  │
  ├── 7. HealthMonitor.register(runtimeId)
  │
  ├── 8. CleanupScheduler.schedule(runtimeId, ttl)
  │
  └── 9. Return RuntimeInstance
```

## Warm Pool Strategy

```typescript
interface WarmPool {
  /** Pool size by type */
  config: {
    preview: 5;   // 5 warm containers ready for previews
    build: 2;     // 2 warm containers for builds
    test: 2;      // 2 warm for tests
  };

  acquire(type: string): RuntimeInstance | null;
  release(runtimeId: string): void;
  prewarm(): void;  // Create pool on startup
  drain(): void;    // Clean shutdown
}
```

## Concurrent Runtime Limits

| Type | Max Concurrent | Pool Size |
|------|---------------|-----------|
| Preview | 10 | 5 |
| Build | 4 | 2 |
| Test | 4 | 2 |
| Repair | 2 | 0 |
| Deploy | 2 | 0 |

## Error Handling

| Failure | Recovery |
|---------|----------|
| Creation fails | Retry once, then fail with error |
| Start fails (container exits immediately) | Check logs, report root cause |
| Runtime becomes unresponsive | Health check 3x, then force destroy |
| Resource limit exceeded | Log OOM/CPU event, force destroy |
| Provider not available | Queue retry, surface provider error |
| Disk full | Emit critical event, skip cache operations |

## Cleanup Triggers

- TTL expired (30 min idle for preview, 10 min for build/test)
- Runtime completed (build finished, tests passed)
- User navigated away (workspace page closed)
- Manual release call
- Service shutdown (graceful drain)
