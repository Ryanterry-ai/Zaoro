import type { RuntimeEvent, RuntimeEventType, EventFilter, RuntimeEventSeverity } from './types.js';
import { createEventId } from './types.js';

type EventHandler = (event: RuntimeEvent) => void;
type Unsubscribe = () => void;

interface Subscription {
  handler: EventHandler;
  filter: EventFilter | undefined;
}

export class EventEmitter {
  private subscriptions: Subscription[] = [];
  private history: RuntimeEvent[] = [];
  private maxHistory: number;

  constructor(maxHistory = 1000) {
    this.maxHistory = maxHistory;
  }

  emit(fields: Omit<RuntimeEvent, 'id' | 'timestamp'>): void {
    const event: RuntimeEvent = {
      ...fields,
      id: createEventId(),
      timestamp: new Date().toISOString(),
    };

    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    for (const sub of this.subscriptions) {
      if (this.matchesFilter(event, sub.filter)) {
        try {
          sub.handler(event);
        } catch {
          // handler errors are silently caught to prevent cascade
        }
      }
    }
  }

  subscribe(handler: EventHandler, filter?: EventFilter): Unsubscribe {
    const sub: Subscription = { handler, filter };
    this.subscriptions.push(sub);
    return () => {
      const idx = this.subscriptions.indexOf(sub);
      if (idx >= 0) {
        this.subscriptions.splice(idx, 1);
      }
    };
  }

  subscribeToRuntime(runtimeId: string, handler: EventHandler): Unsubscribe {
    return this.subscribe(handler, { runtimeId });
  }

  subscribeToWorkspace(workspaceId: string, handler: EventHandler): Unsubscribe {
    return this.subscribe(handler, { workspaceId });
  }

  getEvents(filter?: EventFilter): RuntimeEvent[] {
    let results = this.history;
    if (filter) {
      results = results.filter((e) => this.matchesFilter(e, filter));
    }
    if (filter?.limit && results.length > filter.limit) {
      results = results.slice(-filter.limit);
    }
    return results;
  }

  clear(): void {
    this.history = [];
  }

  private matchesFilter(event: RuntimeEvent, filter?: EventFilter): boolean {
    if (!filter) return true;

    if (filter.runtimeId && event.runtimeId !== filter.runtimeId) return false;
    if (filter.workspaceId && event.workspaceId !== filter.workspaceId) return false;

    if (filter.type) {
      if (typeof filter.type === 'string' && event.type !== filter.type) return false;
      if (filter.type instanceof RegExp && !filter.type.test(event.type)) return false;
    }

    if (filter.severity) {
      const severityOrder: Record<RuntimeEventSeverity, number> = {
        debug: 0, info: 1, warning: 2, error: 3, critical: 4,
      };
      if ((severityOrder[event.severity] ?? 0) < (severityOrder[filter.severity] ?? 0)) return false;
    }

    if (filter.since && event.timestamp < filter.since) return false;
    if (filter.until && event.timestamp > filter.until) return false;

    return true;
  }
}
