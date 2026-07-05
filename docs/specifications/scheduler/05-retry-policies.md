# 5. Retry Policies

## Overview

The Scheduler retries failed execution nodes according to their configured RetryPolicy. Retries may be scoped to specific error types.

## Retry Decision Flow

```
Node fails
   │
   ▼
Is error retryable?
   ├── No  ──► Mark as failed permanently
   │
   └── Yes
        │
        ▼
   Has node exceeded maxAttempts?
        ├── Yes ──► Move to dead letter queue
        │
        └── No
             │
             ▼
        Compute backoff delay
             │
             ▼
        Re-enqueue node with delay
             │
             ▼
        Notify via scheduler.node_retrying event
```

## Retry Policy Types

### Fixed Backoff

```typescript
const fixedBackoff: RetryPolicy = {
  maxAttempts: 3,
  backoff: 'fixed',
  baseDelayMs: 5_000,
  maxDelayMs: 30_000,
  jitter: false,
  retryableErrors: [
    'RESOURCE_EXHAUSTED',
    'PORT_CONFLICT',
    'PROVIDER_UNAVAILABLE',
    'NETWORK_TIMEOUT',
  ],
};

// Delay pattern: 5s, 5s, 5s
```

### Exponential Backoff

```typescript
const exponentialBackoff: RetryPolicy = {
  maxAttempts: 5,
  backoff: 'exponential',
  baseDelayMs: 1_000,
  maxDelayMs: 60_000,
  jitter: true,
  retryableErrors: ['*'],  // All errors are retryable
};

// Delay pattern (with jitter): ~1s, ~2s, ~4s, ~8s, ~16s
```

### Linear Backoff

```typescript
const linearBackoff: RetryPolicy = {
  maxAttempts: 3,
  backoff: 'linear',
  baseDelayMs: 10_000,
  maxDelayMs: 60_000,
  jitter: false,
  retryableErrors: [
    'PROVIDER_UNAVAILABLE',
    'RATE_LIMITED',
  ],
};

// Delay pattern: 10s, 20s, 30s
```

## Backoff Calculation

```typescript
function computeBackoff(policy: RetryPolicy, attempt: number): number {
  let delay: number;

  switch (policy.backoff) {
    case 'fixed':
      delay = policy.baseDelayMs;
      break;

    case 'exponential':
      delay = policy.baseDelayMs * Math.pow(2, attempt - 1);
      break;

    case 'linear':
      delay = policy.baseDelayMs * attempt;
      break;

    default:
      delay = policy.baseDelayMs;
  }

  // Apply jitter (±25% random variation)
  if (policy.jitter) {
    const jitterRange = delay * 0.25;
    delay += (Math.random() * jitterRange * 2) - jitterRange;
  }

  // Cap at max delay
  return Math.min(delay, policy.maxDelayMs);
}
```

## Error Classification

```typescript
const ERROR_CLASSIFICATION: Record<string, { retryable: boolean; category: string }> = {
  // Transient — always retry
  RESOURCE_EXHAUSTED:        { retryable: true,  category: 'transient' },
  PORT_CONFLICT:             { retryable: true,  category: 'transient' },
  PROVIDER_UNAVAILABLE:      { retryable: true,  category: 'transient' },
  NETWORK_TIMEOUT:           { retryable: true,  category: 'transient' },
  RATE_LIMITED:              { retryable: true,  category: 'transient' },
  DOCKER_DAEMON_DOWN:        { retryable: true,  category: 'transient' },
  IMAGE_PULL_FAILED:         { retryable: true,  category: 'transient' },
  DISK_WRITE_FAILED:         { retryable: true,  category: 'transient' },

  // Permanent — never retry
  INVALID_NODE_SPEC:         { retryable: false, category: 'permanent' },
  INVALID_COMMAND:           { retryable: false, category: 'permanent' },
  COMPILATION_ERROR:         { retryable: false, category: 'permanent' },
  LINT_ERROR:                { retryable: false, category: 'permanent' },
  AUTH_FAILED:               { retryable: false, category: 'permanent' },
  UNAUTHORIZED:              { retryable: false, category: 'permanent' },

  // Unknown — retry once to determine if transient
  UNKNOWN:                   { retryable: true,  category: 'unknown' },
};
```

## Dead Letter Queue

Jobs that exceed max retries are moved to a dead letter queue for manual inspection.

```typescript
interface DeadLetterEntry {
  originalGraphId: string;
  nodeId: string;
  nodeLabel: string;
  attemptHistory: {
    attempt: number;
    startedAt: number;
    error: ExecutionError;
    duration: number;
  }[];
  firstFailureAt: number;
  lastFailureAt: number;
  totalAttempts: number;
}

// DLQ actions:
// - Re-queue (manual retry)
// - Skip (mark as permanently failed)
// - Inspect (view logs/errors)
// - Delete (remove permanently)

// DLQ retention: 7 days
// DLQ notification: on insertion
```

## Circuit Breaker

To prevent retries from overwhelming a failing provider:

```typescript
interface CircuitBreaker {
  provider: string;
  state: 'closed' | 'open' | 'half-open';

  // Configuration
  failureThreshold: number;      // Number of failures to open circuit
  successThreshold: number;      // Number of successes to close circuit
  timeout: number;               // Time before half-open attempt

  // State
  failures: number;
  successes: number;
  lastFailureAt: number;
  lastSuccessAt: number;
}

// State machine:
// closed ──(failureThreshold exceeded)──► open
// open ──(timeout elapsed)──► half-open
// half-open ──(successThreshold met)──► closed
// half-open ──(any failure)──► open
```

## Retry Budget

Per-tenant retry budget to prevent runaway retries from consuming all capacity:

```typescript
interface RetryBudget {
  tenantId: string;
  maxRetriesPerMinute: number;     // Default: 10
  maxRetriesPerHour: number;       // Default: 100
  currentMinuteCount: number;
  currentHourCount: number;
  resetMinuteAt: number;
  resetHourAt: number;
}

function checkRetryBudget(tenantId: string): boolean {
  const budget = getRetryBudget(tenantId);
  const now = Date.now();

  // Reset counters if window has passed
  if (now > budget.resetMinuteAt) {
    budget.currentMinuteCount = 0;
    budget.resetMinuteAt = now + 60_000;
  }
  if (now > budget.resetHourAt) {
    budget.currentHourCount = 0;
    budget.resetHourAt = now + 3_600_000;
  }

  return budget.currentMinuteCount < budget.maxRetriesPerMinute
      && budget.currentHourCount < budget.maxRetriesPerHour;
}
```

## Retry Event Chain

```
node_failed(error)
    │
    ├── retryable && attempts < maxAttempts
    │     └──> node_retrying(attempt, delay)
    │           └──> node_scheduled (after delay)
    │
    ├── retryable && attempts >= maxAttempts
    │     └──> node_dlq(originalGraphId, nodeId, error)
    │           └──> pipeline_failed (if no alternative path)
    │
    └── not retryable
          └──> node_failed_permanent
                └──> pipeline_failed (if critical path)
```
