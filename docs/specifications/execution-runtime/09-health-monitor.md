# 9. Health Monitor

## Responsibilities

Continuously monitors all active runtimes for health, resource usage, and timeout violations.

```
HealthMonitor
  ├── register(runtimeId, config) ──> void
  ├── unregister(runtimeId) ──> void
  ├── heartbeat(runtimeId) ──> void
  ├── getStatus(runtimeId) ──> HealthStatus
  └── getSummary() ──> HealthSummary
```

## Interface

```typescript
interface HealthMonitor {
  /** Register a runtime for monitoring */
  register(runtimeId: string, config: HealthConfig): void;

  /** Stop monitoring a runtime */
  unregister(runtimeId: string): void;

  /** Receive a heartbeat from the runtime (via web UI or internal ping) */
  heartbeat(runtimeId: string): void;

  /** Get current health status */
  getStatus(runtimeId: string): HealthStatus;

  /** Get summary of all monitored runtimes */
  getSummary(): HealthSummary;

  /** Force a health check now */
  checkNow(runtimeId: string): Promise<HealthStatus>;
}

interface HealthConfig {
  /** HTTP health check URL (for previews) */
  httpEndpoint?: string;
  /** Check interval in ms (default: 30_000) */
  checkIntervalMs?: number;
  /** Heartbeat timeout in ms (default: 300_000 = 5 min) */
  heartbeatTimeoutMs?: number;
  /** Max consecutive failures before marking degraded */
  maxFailures?: number;
  /** Resource check interval in ms (default: 60_000) */
  resourceCheckIntervalMs?: number;
}

interface HealthSummary {
  total: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  unknown: number;
}
```

## Check Types

### HTTP Health Check (previews)
```
Every 30s: GET http://localhost:{port}/
Expected: 200 OK within 5s
On failure: increment failure count
After 3 consecutive failures: mark degraded
After 5 consecutive failures: mark unhealthy → trigger cleanup
```

### Process Health Check (builds/tests)
```
Every 30s: Check if main process is still running
Expected: process alive
On death: capture exit code and logs
```

### Resource Check
```
Every 60s:
  - CPU usage
  - Memory usage
  - Disk usage
  - PID count
Compare against limits defined in resource-limits.md
```

### Heartbeat Check
```
Web UI sends heartbeat every 30s via /api/workspace/:id/heartbeat
If no heartbeat for 5 min: mark idle
If no heartbeat for 10 min: mark stale → trigger cleanup
Heartbeat is per-workspace, not per-runtime
```

## Event Emissions

```typescript
// Health status changed
interface HealthChangeEvent {
  type: 'runtime.health_change';
  runtimeId: string;
  from: HealthStatus['status'];
  to: HealthStatus['status'];
  reason: string;
  timestamp: number;
}

// Resource limit approaching
interface ResourceWarningEvent {
  type: 'runtime.resource_warning';
  runtimeId: string;
  resource: 'cpu' | 'memory' | 'disk' | 'pids';
  current: number;
  limit: number;
  percentUsed: number;
  timestamp: number;
}

// Heartbeat lost
interface HeartbeatLostEvent {
  type: 'runtime.heartbeat_lost';
  workspaceId: string;
  runtimeId: string;
  lastHeartbeat: number;
  timestamp: number;
}
```

## Action Thresholds

| Condition | Action |
|-----------|--------|
| 3 consecutive HTTP failures | Mark `degraded`, emit warning |
| 5 consecutive HTTP failures | Mark `unhealthy`, initiate stop |
| CPU > 90% for 30s | Emit resource warning, throttle if possible |
| Memory > 95% | Emit critical, prepare to OOM kill |
| Disk > 90% | Emit critical, skip cache operations |
| No heartbeat for 5 min | Mark `idle`, emit warning |
| No heartbeat for 10 min | Mark `stale`, initiate stop |
| Process exits unexpectedly | Capture exit code + logs, mark `failed` |
