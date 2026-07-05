# 3. State Machine

## Runtime States

```
                         ┌─────────────┐
                         │   pending    │
                         └──────┬──────┘
                                │ create()
                                ▼
                         ┌─────────────┐
                         │  creating   │
                         └──────┬──────┘
                                │ provider.create() done
                                ▼
                         ┌─────────────┐
                         │   created   │
                         └──────┬──────┘
                                │ start()
                                ▼
                         ┌─────────────┐
                         │  starting   │
                         └──────┬──────┘
                                │ provider.start() done
                                ▼
                         ┌─────────────┐
                     ┌──>│   running   │──┐
                     │   └──────┬──────┘  │
                     │          │         │
                execute()   health()   stop()
                     │          │         │
                     │          ▼         │
                     │   ┌─────────────┐  │
                     │   │  degraded   │  │
                     │   └──────┬──────┘  │
                     │          │         │
                     │     timeout /      │
                     │     unrecoverable  │
                     │          │         │
                     │          ▼         │
                     │   ┌─────────────┐  │
                     └──>│  stopping   │<─┘
                         └──────┬──────┘
                                │ stop() / timeout
                                ▼
                         ┌─────────────┐
                         │  destroying │
                         └──────┬──────┘
                                │ provider.destroy() done
                                ▼
                         ┌─────────────┐
                         │  destroyed  │
                         └─────────────┘
```

Shortcut for errors at any state:

```
any state ──> failing ──> failed ──> destroying ──> destroyed
```

## State Transitions

| From | Event | To | Trigger |
|------|-------|----|---------|
| `pending` | `create_requested` | `creating` | RuntimeManager.create() called |
| `creating` | `created` | `created` | Provider reports creation success |
| `creating` | `create_failed` | `failed` | Provider reports creation failure |
| `created` | `start_requested` | `starting` | RuntimeManager.start() called |
| `starting` | `started` | `running` | Provider reports start success |
| `starting` | `start_failed` | `failed` | Provider reports start failure |
| `running` | `install_started` | `installing` | npm install begins |
| `installing` | `install_complete` | `running` | npm install finishes |
| `running` | `build_started` | `building` | next build begins |
| `building` | `build_complete` | `ready` | next build finishes (preview) |
| `building` | `build_failed` | `running` | next build fails, returns to running |
| `running` | `health_degraded` | `degraded` | Health check fails |
| `degraded` | `health_restored` | `running` | Health check recovers |
| `degraded` | `health_dead` | `stopping` | Health check timeout/unrecoverable |
| `any` | `stop_requested` | `stopping` | RuntimeManager.stop() or cleanup |
| `stopping` | `stopped` | `destroying` | Provider reports stop success |
| `stopping` | `stop_failed` | `destroying` | Force-kill fallback |
| `any` | `destroy_requested` | `destroying` | RuntimeManager.destroy() called |
| `destroying` | `destroyed` | `destroyed` | Provider reports destruction |
| `any` | `error` | `failed` | Unexpected error at any state |

## Execution States (within `running`)

```
running
  │
  ├── execute(command) ──> executing ──> completed/failed ──> running
  │
  ├── install(npm) ──> installing ──> installed/failed ──> running
  │
  ├── build(next) ──> building ──> built/failed ──> running/ready
  │
  └── test(playwright) ──> testing ──> passed/failed ──> running
```

## Preview States (sub-states of `ready`)

```
ready
  │
  ├── preview_ready ──> active
  │                       │
  │                    idle timeout (30 min)
  │                       │
  │                    ┌──┴──┐
  │                 stopping
  │
  └── snapshot ──> snapshotted ──> ready
```

## Event-Based Architecture

State changes are communicated via typed events (see [events.md](15-events-logging.md)).

```typescript
interface RuntimeStateEvent {
  type: 'runtime.state_change';
  runtimeId: string;
  from: RuntimeStatus;
  to: RuntimeStatus;
  reason?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

## Deterministic Recovery

- If `creating` times out (>30s): retry once, then fail
- If `starting` times out (>15s): retry once, then fail
- If `running` → `degraded`: attempt health check 3x with 5s interval, then stop
- If `stopping` times out (>10s): force kill
- If any provider call throws: transition to `failed` with error details preserved
