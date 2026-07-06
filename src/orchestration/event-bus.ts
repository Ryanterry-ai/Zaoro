// ─── Event Bus ────────────────────────────────────────────────────────────────
//
// Decoupled lifecycle event publishing for Build.Anything v2.
// Supports typed events, wildcard subscriptions, and bounded history.
//
// Design Principles:
// - Typed events with structured payloads
// - Non-blocking synchronous delivery
// - Bounded ring buffer for history
// - Clean subscribe/unsubscribe API
// ──────────────────────────────────────────────────────────────────────────────

// ─── Event Types ─────────────────────────────────────────────────────────────

export type BusEventType =
  | 'PipelineStarted'
  | 'StageStarted'
  | 'ModelSelected'
  | 'CacheHit'
  | 'CacheMiss'
  | 'ArtifactCreated'
  | 'ValidationPassed'
  | 'ValidationFailed'
  | 'RetryStarted'
  | 'RetrySucceeded'
  | 'StageCompleted'
  | 'PipelineCompleted';

// ─── Event Payloads ──────────────────────────────────────────────────────────

export interface PipelineStartedPayload {
  executionId: string;
  manifest: { name?: string; description: string; domain?: string };
  timestamp: number;
}

export interface StageStartedPayload {
  executionId: string;
  stageId: string;
  timestamp: number;
}

export interface ModelSelectedPayload {
  executionId: string;
  stageId: string;
  provider: string;
  model: string;
  taskType: string;
}

export interface CacheHitPayload {
  executionId: string;
  stageId: string;
  artifactKey: string;
}

export interface CacheMissPayload {
  executionId: string;
  stageId: string;
  artifactKey: string;
}

export interface ArtifactCreatedPayload {
  executionId: string;
  stageId: string;
  artifactKey: string;
  type: string;
  sizeBytes: number;
}

export interface ValidationPassedPayload {
  executionId: string;
  stageId: string;
  gateId: string;
}

export interface ValidationFailedPayload {
  executionId: string;
  stageId: string;
  gateId: string;
  errors: string[];
}

export interface RetryStartedPayload {
  executionId: string;
  stageId: string;
  attempt: number;
  reason: string;
}

export interface RetrySucceededPayload {
  executionId: string;
  stageId: string;
  attempt: number;
}

export interface StageCompletedPayload {
  executionId: string;
  stageId: string;
  durationMs: number;
  success: boolean;
}

export interface PipelineCompletedPayload {
  executionId: string;
  durationMs: number;
  success: boolean;
}

// ─── Event Payload Map ───────────────────────────────────────────────────────

export interface BusEventPayloadMap {
  PipelineStarted: PipelineStartedPayload;
  StageStarted: StageStartedPayload;
  ModelSelected: ModelSelectedPayload;
  CacheHit: CacheHitPayload;
  CacheMiss: CacheMissPayload;
  ArtifactCreated: ArtifactCreatedPayload;
  ValidationPassed: ValidationPassedPayload;
  ValidationFailed: ValidationFailedPayload;
  RetryStarted: RetryStartedPayload;
  RetrySucceeded: RetrySucceededPayload;
  StageCompleted: StageCompletedPayload;
  PipelineCompleted: PipelineCompletedPayload;
}

// ─── Typed Event ─────────────────────────────────────────────────────────────

export interface BusEvent<T extends BusEventType = BusEventType> {
  type: T;
  payload: BusEventPayloadMap[T];
  timestamp: number;
}

// ─── Handler & Subscription ──────────────────────────────────────────────────

export type EventHandler = (event: BusEvent) => void;

export interface Subscription {
  id: string;
  unsubscribe(): void;
}

// ─── Ring Buffer ─────────────────────────────────────────────────────────────

class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private head = 0;
  private count = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  toArray(): T[] {
    const result: T[] = [];
    const start = this.count < this.capacity
      ? 0
      : this.head;
    for (let i = 0; i < this.count; i++) {
      const idx = (start + i) % this.capacity;
      const item = this.buffer[idx];
      if (item !== undefined) result.push(item);
    }
    return result;
  }

  clear(): void {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.count = 0;
  }

  get size(): number {
    return this.count;
  }
}

// ─── Event Bus ───────────────────────────────────────────────────────────────

export class EventBus {
  private handlers = new Map<string, EventHandler[]>();
  private wildcardHandlers: EventHandler[] = [];
  private historyBuffer: RingBuffer<BusEvent>;
  private nextSubId = 0;

  constructor(historyCapacity = 1000) {
    this.historyBuffer = new RingBuffer<BusEvent>(historyCapacity);
  }

  /**
   * Subscribe to a specific event type.
   */
  subscribe<T extends BusEventType>(type: T, handler: (event: BusEvent<T>) => void): Subscription {
    const id = `sub-${++this.nextSubId}`;
    const wrappedHandler = handler as EventHandler;
    const list = this.handlers.get(type) ?? [];
    list.push(wrappedHandler);
    this.handlers.set(type, list);

    return {
      id,
      unsubscribe: () => {
        const handlers = this.handlers.get(type);
        if (handlers) {
          const idx = handlers.indexOf(wrappedHandler);
          if (idx !== -1) handlers.splice(idx, 1);
        }
      },
    };
  }

  /**
   * Subscribe to all events (wildcard).
   */
  subscribeAll(handler: EventHandler): Subscription {
    const id = `sub-${++this.nextSubId}`;
    this.wildcardHandlers.push(handler);

    return {
      id,
      unsubscribe: () => {
        const idx = this.wildcardHandlers.indexOf(handler);
        if (idx !== -1) this.wildcardHandlers.splice(idx, 1);
      },
    };
  }

  /**
   * Publish an event to all matching subscribers.
   */
  publish(event: BusEvent): void {
    this.historyBuffer.push(event);

    const typeHandlers = this.handlers.get(event.type) ?? [];
    for (const handler of typeHandlers) {
      try {
        handler(event);
      } catch {
        // Handler errors should not break the bus
      }
    }

    for (const handler of this.wildcardHandlers) {
      try {
        handler(event);
      } catch {
        // Handler errors should not break the bus
      }
    }
  }

  /**
   * Get event history.
   */
  history(limit?: number): BusEvent[] {
    const all = this.historyBuffer.toArray();
    return limit ? all.slice(-limit) : all;
  }

  /**
   * Clear event history.
   */
  clearHistory(): void {
    this.historyBuffer.clear();
  }

  /**
   * Get subscriber count for a specific event type or total.
   */
  subscriberCount(type?: BusEventType): number {
    if (type) {
      return (this.handlers.get(type) ?? []).length;
    }
    let total = this.wildcardHandlers.length;
    for (const handlers of this.handlers.values()) {
      total += handlers.length;
    }
    return total;
  }

  /**
   * Remove all subscribers.
   */
  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers = [];
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createEventBus(historyCapacity?: number): EventBus {
  return new EventBus(historyCapacity);
}
