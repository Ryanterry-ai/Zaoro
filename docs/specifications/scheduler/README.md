# Scheduler Specification

The decision engine that maps Execution Graph nodes to runtime resources. Responsible for when, where, and how each unit of execution runs.

## Position in the Architecture

```
Execution Graph ──► Scheduler ──► Runtime Manager ──► Provider
   (what to run)      │               (how)            (where)
                      │
                      ├── Queue Manager
                      ├── Fairness Engine
                      ├── Provider Selector
                      ├── Retry Handler
                      └── Resource Allocator
                           │
                           ▼
                     Resource Graph
                     (what's available)
```

## Documents

| Document | Description |
|----------|-------------|
| [01-scheduler-spec.md](01-scheduler-spec.md) | Complete scheduler specification |
| [02-scheduling-policies.md](02-scheduling-policies.md) | Policy catalog: FIFO, priority, weighted fair queuing, backfilling |
| [03-fairness-algorithms.md](03-fairness-algorithms.md) | Fairness algorithms: per-user, per-tenant, proportional share |
| [04-provider-selection.md](04-provider-selection.md) | Provider selection strategies: capability, load, cost, affinity |
| [05-retry-policies.md](05-retry-policies.md) | Retry policies: exponential backoff, jitter, dead letter, circuit breaker |
| [06-scheduler-events.md](06-scheduler-events.md) | Complete scheduler event catalog |

## Status

**Frozen** — v1.0.0. Approved for implementation.
