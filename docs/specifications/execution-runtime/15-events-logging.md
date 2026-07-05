# 15. Events & Logging

## Event Schema

All runtime events follow a common schema:

```typescript
interface RuntimeEvent {
  /** Unique event ID */
  id: string;
  /** Event type: {domain}.{action} */
  type: RuntimeEventType;
  /** Runtime this event belongs to */
  runtimeId: string;
  /** Workspace this event belongs to */
  workspaceId: string;
  /** Event payload */
  data: Record<string, unknown>;
  /** ISO timestamp */
  timestamp: string;
  /** Severity */
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
}
```

## Event Types

### Lifecycle Events

```typescript
type LifecycleEvent =
  | 'runtime.created'
  | 'runtime.started'
  | 'runtime.stopped'
  | 'runtime.destroyed'
  | 'runtime.failed';
```

### State Transition Events

```typescript
type StateEvent =
  | 'runtime.state_change'     // status transition
  | 'runtime.heartbeat'        // heartbeat received
  | 'runtime.heartbeat_lost';  // heartbeat timeout
```

### Health Events

```typescript
type HealthEvent =
  | 'runtime.health_change'    // healthy <-> degraded <-> unhealthy
  | 'runtime.resource_warning' // CPU/memory/disk approaching limit
  | 'runtime.resource_violation' // limit exceeded
  | 'runtime.timeout';         // execution timeout
```

### Command Events

```typescript
type CommandEvent =
  | 'runtime.command_start'
  | 'runtime.command_complete'
  | 'runtime.command_failed'
  | 'runtime.command_output';  // stdout/stderr line
```

### Security Events

```typescript
type SecurityEvent =
  | 'security.violation'         // actual violation
  | 'security.attempt_blocked'   // blocked attempt
  | 'security.capability_dropped'
  | 'security.network_blocked';
```

### System Events

```typescript
type SystemEvent =
  | 'system.startup'
  | 'system.shutdown'
  | 'system.warm_pool_ready'
  | 'system.cache_hit'
  | 'system.cache_miss'
  | 'system.config_change';
```

## Event Emission

```typescript
interface EventEmitter {
  /** Emit a runtime event */
  emit(event: Omit<RuntimeEvent, 'id' | 'timestamp'>): void;

  /** Subscribe to events */
  subscribe(
    handler: (event: RuntimeEvent) => void,
    filter?: EventFilter
  ): () => void;  // returns unsubscribe function

  /** Subscribe to events for a specific runtime */
  subscribeToRuntime(
    runtimeId: string,
    handler: (event: RuntimeEvent) => void
  ): () => void;

  /** Subscribe to events for a specific workspace */
  subscribeToWorkspace(
    workspaceId: string,
    handler: (event: RuntimeEvent) => void
  ): () => void;

  /** Get recent events (with filters) */
  getEvents(filter: EventFilter): RuntimeEvent[];
}

interface EventFilter {
  runtimeId?: string;
  workspaceId?: string;
  type?: string | RegExp;
  severity?: RuntimeEvent['severity'];
  since?: string;       // ISO timestamp
  until?: string;
  limit?: number;
}
```

## Log Pipeline

```
Runtime (stdout/stderr)
    │
    ▼
LogCollector
    │
    ├──► Console output (for `docker logs`)
    │
    ├──► Structured JSON logs (for querying)
    │      File: /var/log/buildsame/runtimes/{runtimeId}.log
    │
    ├──► Event stream (for real-time UI)
    │      SSE: GET /api/runtime/{runtimeId}/events
    │
    └──► Metrics (for dashboards)
           Prometheus: runtime_log_lines_total, runtime_error_total
```

## Log Format

```typescript
interface LogEntry {
  timestamp: string;     // ISO 8601
  runtimeId: string;
  workspaceId: string;
  stream: 'stdout' | 'stderr';
  message: string;
  level: 'log' | 'info' | 'warn' | 'error';
  metadata?: {
    command?: string;     // which command produced the log
    exitCode?: number;    // if command completed
    duration?: number;    // command duration
  };
}

// JSON output format
// {"ts":"2026-07-04T12:00:00.000Z","rid":"r-xxx","wid":"ws-xxx","stream":"stdout","msg":"Ready on http://localhost:3000","lvl":"info"}
```

## Log Retention

| Environment | Retention | Storage |
|-------------|-----------|---------|
| Development | 1 hour | Memory ring buffer (10k entries) |
| Production | 7 days | File system (rotated daily) |
| Security events | 30 days | Separate file, append-only |

## SSE Protocol (for real-time UI)

```
Event: runtime.state_change
Data: {"runtimeId":"r-xxx","from":"running","to":"ready","ts":"2026-07-04T12:00:00.000Z"}

Event: runtime.health_change
Data: {"runtimeId":"r-xxx","status":"degraded","error":"HTTP timeout"}

Event: runtime.command_output
Data: {"runtimeId":"r-xxx","stream":"stdout","data":"✓ Compiled successfully"}
```
