# ADR-001: Event Bus

## Status

Accepted

## Context

Build.Anything v2 needs a decoupled communication mechanism between subsystems. The existing `Orchestrator` extends Node.js `EventEmitter` but emits raw string events with untyped payloads. Future subsystems (Progress Reporter, Analytics, Telemetry) need typed, subscribable lifecycle events without tight coupling to the orchestrator.

## Decision

Implement a standalone `EventBus` class that provides:

- Typed event definitions with structured payloads
- Subscribe/unsubscribe by event type
- Wildcard subscriptions (`*`) for monitoring
- Bounded event history (ring buffer, default 1000 events)
- Non-blocking synchronous delivery (handlers run in registration order)

## Responsibilities

- Define and enforce the 12 lifecycle event types
- Manage subscriber registrations and cleanup
- Maintain a bounded history buffer for debugging
- Publish events from any subsystem without blocking

## Public Interfaces

```ts
class EventBus {
  subscribe(type: EventType, handler: EventHandler): Subscription
  subscribeAll(handler: EventHandler): Subscription
  publish(event: BusEvent): void
  history(limit?: number): BusEvent[]
  clear(): void
  subscriberCount(type?: EventType): number
}
```

## Dependencies

None. Standalone infrastructure.

## Extension Points

- Custom event types via `EventType` union extension
- Custom handler priorities (future)
- Persistent event log (future)

## Risks

- Memory usage from event history mitigated by bounded ring buffer
- Synchronous delivery could block if handlers are slow mitigated by keeping handlers lightweight

## Future Evolution

- WebSocket streaming for live progress
- Persistent event log for replay
- Event replay for debugging
- Analytics aggregation from event streams
