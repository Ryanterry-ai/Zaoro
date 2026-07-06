// ─── Event Bus Tests ─────────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { EventBus, createEventBus } from '../src/orchestration/event-bus.js';

function makeEvent(type: 'PipelineStarted' | 'StageStarted' | 'ModelSelected' | 'StageCompleted' | 'PipelineCompleted', overrides?: Record<string, unknown>) {
  const base = {
    PipelineStarted: { type: 'PipelineStarted' as const, payload: { executionId: 'exec-1', manifest: { name: 'test', description: 'test project', domain: 'saas' }, timestamp: Date.now() }, timestamp: Date.now() },
    StageStarted: { type: 'StageStarted' as const, payload: { executionId: 'exec-1', stageId: 'research', timestamp: Date.now() }, timestamp: Date.now() },
    ModelSelected: { type: 'ModelSelected' as const, payload: { executionId: 'exec-1', stageId: 'research', provider: 'groq', model: 'llama-3.3-70b-versatile', taskType: 'analysis' }, timestamp: Date.now() },
    StageCompleted: { type: 'StageCompleted' as const, payload: { executionId: 'exec-1', stageId: 'research', durationMs: 5000, success: true }, timestamp: Date.now() },
    PipelineCompleted: { type: 'PipelineCompleted' as const, payload: { executionId: 'exec-1', durationMs: 60000, success: true }, timestamp: Date.now() },
  };
  return { ...base[type], ...overrides } as any;
}

describe('EventBus', () => {
  // ── Subscription ────────────────────────────────────────────────────────

  describe('Subscription', () => {
    it('should subscribe and receive events', () => {
      const bus = createEventBus();
      const handler = vi.fn();
      bus.subscribe('PipelineStarted', handler);
      bus.publish(makeEvent('PipelineStarted'));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not deliver events to wrong type subscribers', () => {
      const bus = createEventBus();
      const handler = vi.fn();
      bus.subscribe('StageStarted', handler);
      bus.publish(makeEvent('PipelineStarted'));
      expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple subscribers per event type', () => {
      const bus = createEventBus();
      const h1 = vi.fn();
      const h2 = vi.fn();
      bus.subscribe('PipelineStarted', h1);
      bus.subscribe('PipelineStarted', h2);
      bus.publish(makeEvent('PipelineStarted'));
      expect(h1).toHaveBeenCalledTimes(1);
      expect(h2).toHaveBeenCalledTimes(1);
    });

    it('should deliver typed payloads', () => {
      const bus = createEventBus();
      let received: any;
      bus.subscribe('StageCompleted', (e) => { received = e.payload; });
      bus.publish(makeEvent('StageCompleted'));
      expect(received.stageId).toBe('research');
      expect(received.success).toBe(true);
    });
  });

  // ── Wildcard ────────────────────────────────────────────────────────────

  describe('Wildcard', () => {
    it('should deliver all events to wildcard subscribers', () => {
      const bus = createEventBus();
      const handler = vi.fn();
      bus.subscribeAll(handler);
      bus.publish(makeEvent('PipelineStarted'));
      bus.publish(makeEvent('StageStarted'));
      bus.publish(makeEvent('PipelineCompleted'));
      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should deliver typed events alongside wildcard', () => {
      const bus = createEventBus();
      const specific = vi.fn();
      const wildcard = vi.fn();
      bus.subscribe('PipelineStarted', specific);
      bus.subscribeAll(wildcard);
      bus.publish(makeEvent('PipelineStarted'));
      expect(specific).toHaveBeenCalledTimes(1);
      expect(wildcard).toHaveBeenCalledTimes(1);
    });
  });

  // ── Unsubscribe ─────────────────────────────────────────────────────────

  describe('Unsubscribe', () => {
    it('should stop delivering after unsubscribe', () => {
      const bus = createEventBus();
      const handler = vi.fn();
      const sub = bus.subscribe('PipelineStarted', handler);
      bus.publish(makeEvent('PipelineStarted'));
      expect(handler).toHaveBeenCalledTimes(1);
      sub.unsubscribe();
      bus.publish(makeEvent('PipelineStarted'));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple unsubscribes gracefully', () => {
      const bus = createEventBus();
      const handler = vi.fn();
      const sub = bus.subscribe('PipelineStarted', handler);
      sub.unsubscribe();
      sub.unsubscribe();
      bus.publish(makeEvent('PipelineStarted'));
      expect(handler).not.toHaveBeenCalled();
    });

    it('should unsubscribe wildcard subscribers', () => {
      const bus = createEventBus();
      const handler = vi.fn();
      const sub = bus.subscribeAll(handler);
      bus.publish(makeEvent('PipelineStarted'));
      expect(handler).toHaveBeenCalledTimes(1);
      sub.unsubscribe();
      bus.publish(makeEvent('StageStarted'));
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ── History ─────────────────────────────────────────────────────────────

  describe('History', () => {
    it('should store event history', () => {
      const bus = createEventBus();
      bus.publish(makeEvent('PipelineStarted'));
      bus.publish(makeEvent('StageStarted'));
      expect(bus.history()).toHaveLength(2);
    });

    it('should respect limit parameter', () => {
      const bus = createEventBus();
      bus.publish(makeEvent('PipelineStarted'));
      bus.publish(makeEvent('StageStarted'));
      bus.publish(makeEvent('PipelineCompleted'));
      expect(bus.history(2)).toHaveLength(2);
    });

    it('should maintain bounded ring buffer', () => {
      const bus = createEventBus(5);
      for (let i = 0; i < 10; i++) {
        bus.publish(makeEvent('StageStarted'));
      }
      expect(bus.history()).toHaveLength(5);
    });

    it('should clear history', () => {
      const bus = createEventBus();
      bus.publish(makeEvent('PipelineStarted'));
      bus.clearHistory();
      expect(bus.history()).toHaveLength(0);
    });
  });

  // ── Subscriber Count ────────────────────────────────────────────────────

  describe('Subscriber Count', () => {
    it('should count total subscribers', () => {
      const bus = createEventBus();
      bus.subscribe('PipelineStarted', vi.fn());
      bus.subscribe('StageStarted', vi.fn());
      bus.subscribeAll(vi.fn());
      expect(bus.subscriberCount()).toBe(3);
    });

    it('should count per-type subscribers', () => {
      const bus = createEventBus();
      bus.subscribe('PipelineStarted', vi.fn());
      bus.subscribe('PipelineStarted', vi.fn());
      bus.subscribe('StageStarted', vi.fn());
      expect(bus.subscriberCount('PipelineStarted')).toBe(2);
    });
  });

  // ── Clear ───────────────────────────────────────────────────────────────

  describe('Clear', () => {
    it('should remove all subscribers', () => {
      const bus = createEventBus();
      bus.subscribe('PipelineStarted', vi.fn());
      bus.subscribeAll(vi.fn());
      bus.clear();
      expect(bus.subscriberCount()).toBe(0);
    });
  });

  // ── Error Handling ──────────────────────────────────────────────────────

  describe('Error Handling', () => {
    it('should not crash on handler errors', () => {
      const bus = createEventBus();
      bus.subscribe('PipelineStarted', () => { throw new Error('handler error'); });
      expect(() => bus.publish(makeEvent('PipelineStarted'))).not.toThrow();
    });

    it('should deliver to remaining handlers after one fails', () => {
      const bus = createEventBus();
      const good = vi.fn();
      bus.subscribe('PipelineStarted', () => { throw new Error('fail'); });
      bus.subscribe('PipelineStarted', good);
      bus.publish(makeEvent('PipelineStarted'));
      expect(good).toHaveBeenCalledTimes(1);
    });
  });

  // ── Factory ─────────────────────────────────────────────────────────────

  describe('Factory', () => {
    it('should create event bus with factory', () => {
      const bus = createEventBus();
      expect(bus).toBeInstanceOf(EventBus);
    });

    it('should create event bus with custom capacity', () => {
      const bus = createEventBus(500);
      expect(bus).toBeInstanceOf(EventBus);
    });
  });
});
