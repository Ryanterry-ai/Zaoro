# 8. Queue Architecture (BullMQ)

## Overview

Redis-backed job queues for reliable, retryable, observable execution of all runtime operations.

```
                      ┌──────────┐
                      │  Redis   │
                      └────┬─────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐
    │  Planning │   │   Build   │   │  Preview  │
    │  Queue    │   │   Queue   │   │  Queue    │
    └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
          │                │                │
    ┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐
    │  Repair   │   │   Test    │   │  Deploy   │
    │  Queue    │   │   Queue   │   │  Queue    │
    └───────────┘   └───────────┘   └───────────┘
```

## Queue Definitions

```typescript
interface QueueConfig {
  name: string;
  concurrency: number;
  retries: number;
  backoff: 'fixed' | 'exponential';
  ttl: number;       // job TTL in ms
  stalledTimeout: number; // ms before marking stalled
}

const QUEUES: Record<string, QueueConfig> = {
  planning: {
    name: 'planning',
    concurrency: 2,
    retries: 1,
    backoff: 'exponential',
    ttl: 120_000,        // 2 min
    stalledTimeout: 60_000,
  },
  build: {
    name: 'build',
    concurrency: 2,
    retries: 0,          // no retry for builds (generated code changes)
    backoff: 'exponential',
    ttl: 300_000,        // 5 min
    stalledTimeout: 120_000,
  },
  preview: {
    name: 'preview',
    concurrency: 5,       // 5 concurrent previews
    retries: 1,
    backoff: 'fixed',
    ttl: 600_000,         // 10 min (TTL for the job itself, not the preview)
    stalledTimeout: 60_000,
  },
  repair: {
    name: 'repair',
    concurrency: 1,       // serial repair (avoid contention)
    retries: 2,           // up to 3 total attempts
    backoff: 'exponential',
    ttl: 120_000,
    stalledTimeout: 60_000,
  },
  test: {
    name: 'test',
    concurrency: 2,
    retries: 0,
    ttl: 300_000,          // 5 min
    stalledTimeout: 120_000,
  },
  deploy: {
    name: 'deploy',
    concurrency: 1,        // serial deploys
    retries: 1,
    backoff: 'fixed',
    ttl: 300_000,
    stalledTimeout: 120_000,
  },
};
```

## Job Schema

```typescript
interface RuntimeJob {
  id: string;
  type: 'planning' | 'build' | 'preview' | 'repair' | 'test' | 'deploy';
  workspaceId: string;
  payload: Record<string, unknown>;

  // Metadata
  createdAt: number;
  priority: number;      // 1-100, higher = more urgent
  attempts: number;
  maxAttempts: number;

  // Flow control
  dependsOn?: string[];  // job IDs that must complete first
  timeout: number;

  // Result
  result?: {
    status: 'success' | 'failure' | 'cancelled';
    output?: Record<string, unknown>;
    error?: string;
    duration: number;
  };
}
```

## Queue Routing

| User Action | Queue Sequence |
|-------------|---------------|
| User types prompt + Enter | `planning` → `build` → `preview` |
| User clicks "Re-run" | `build` → `preview` |
| Build fails TS check | `repair` → `build` → `preview` |
| User clicks "Test" | `test` |
| User clicks "Deploy" | `deploy` |
| User opens workspace page | `preview` (if not running) |

## Flow: Full Build

```
planning.queue({ workspaceId, prompt })
    │
    ▼
Worker: run planner → ApplicationGraph → IR
    │
    ▼ (on success)
build.queue({ workspaceId, irId })
    │
    ▼
Worker: compile IR → 58 files, run TS audit
    │
    ▼ (on TS error, if < 20 errors)
repair.queue({ workspaceId, errors })
    │
    ▼
Worker: apply self-healing fixes
    │
    ▼ (on success)
build.queue({ workspaceId, irId, attempt: 2 })
    │
    ▼ (on success)
preview.queue({ workspaceId })
    │
    ▼
Worker: mount workspace, npm install, next dev, health check
    │
    ▼ (on success)
Preview URL returned
```

## Flow: Preview Only

```
preview.queue({ workspaceId })
    │
    ▼
Check if runtime already exists for workspaceId
    │
    ├── Yes → return existing URL
    └── No  → mount → install → dev → health → URL
```

## Error Handling

| Queue | Transient Error | Permanent Error |
|-------|----------------|-----------------|
| Planning | Timeout (retry) | Invalid prompt (no retry) |
| Build | npm registry down (retry) | Invalid codegen (no retry) |
| Preview | Port conflict (retry with new port) | Disk full (no retry) |
| Repair | TS server crash (retry) | Unfixable error count > threshold |
| Test | Browser crash (retry) | Assertion failure (no retry) |
| Deploy | Vercel API rate limit (retry) | Invalid build artifact (no retry) |
