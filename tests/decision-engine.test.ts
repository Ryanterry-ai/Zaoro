// ─── Decision Engine Tests ────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { DecisionEngine, createDecisionEngine } from '../src/orchestration/decision-engine.js';
import { EventBus } from '../src/orchestration/event-bus.js';
import { ExperienceEngine } from '../src/orchestration/experience-engine.js';
import * as path from 'path';

const TEST_DIR = path.join(process.cwd(), '.build-anything-test-decision');

function makeProviderHealth(overrides?: Record<string, Partial<import('../src/orchestration/decision-engine.js').ProviderHealth>>) {
  const health = new Map<string, import('../src/orchestration/decision-engine.js').ProviderHealth>();
  const defaults = {
    groq: { healthy: true, failureCount: 0, lastFailure: undefined, excludedUntil: undefined },
    gemini: { healthy: true, failureCount: 0, lastFailure: undefined, excludedUntil: undefined },
    anthropic: { healthy: true, failureCount: 0, lastFailure: undefined, excludedUntil: undefined },
    openai: { healthy: true, failureCount: 0, lastFailure: undefined, excludedUntil: undefined },
  };
  for (const [k, v] of Object.entries(defaults)) {
    health.set(k, { ...v, ...overrides?.[k] });
  }
  return health;
}

describe('DecisionEngine', () => {
  // ── Model Selection ─────────────────────────────────────────────────────

  describe('Model Selection', () => {
    it('should select a provider for each task type', () => {
      const engine = createDecisionEngine();
      const decision = engine.selectModel({
        taskType: 'analysis',
        stageId: 'research',
        industry: 'saas',
        budgetRemaining: 100_000,
        providerHealth: makeProviderHealth(),
      });
      expect(decision.provider).toBeTruthy();
      expect(decision.model).toBeTruthy();
      expect(decision.confidence).toBeGreaterThan(0);
    });

    it('should prefer healthy providers over unhealthy', () => {
      const engine = createDecisionEngine();
      const health = makeProviderHealth({
        groq: { healthy: false, excludedUntil: Date.now() + 60000 },
      });
      const decision = engine.selectModel({
        taskType: 'analysis',
        stageId: 'research',
        industry: 'saas',
        budgetRemaining: 100_000,
        providerHealth: health,
      });
      expect(decision.provider).not.toBe('groq');
    });

    it('should consider budget constraints', () => {
      const engine = createDecisionEngine();
      const decision = engine.selectModel({
        taskType: 'analysis',
        stageId: 'research',
        industry: 'saas',
        budgetRemaining: 0.001,
        providerHealth: makeProviderHealth(),
      });
      expect(decision.provider).toBeTruthy();
    });

    it('should emit ModelSelected event', () => {
      const bus = new EventBus();
      const engine = createDecisionEngine(bus);
      engine.selectModel({
        taskType: 'analysis',
        stageId: 'research',
        industry: 'saas',
        budgetRemaining: 100_000,
        providerHealth: makeProviderHealth(),
      });
      const events = bus.history();
      expect(events.some(e => e.type === 'ModelSelected')).toBe(true);
    });
  });

  // ── Cache Decisions ─────────────────────────────────────────────────────

  describe('Cache Decisions', () => {
    it('should not cache small content', () => {
      const engine = createDecisionEngine();
      const decision = engine.shouldCache('test-artifact', { small: true }, {
        stageId: 'research',
        artifactType: 'json',
        tokenEstimate: 100,
      });
      expect(decision.shouldCache).toBe(false);
    });

    it('should cache large stable content', () => {
      const engine = createDecisionEngine();
      const largeContent = 'x'.repeat(8000);
      const decision = engine.shouldCache('database.schema', largeContent, {
        stageId: 'database-design',
        artifactType: 'schema',
        tokenEstimate: 2000,
      });
      expect(decision.shouldCache).toBe(true);
    });

    it('should not cache creative content', () => {
      const engine = createDecisionEngine();
      const decision = engine.shouldCache('research.domain', { data: 'x'.repeat(5000) }, {
        stageId: 'research',
        artifactType: 'json',
        tokenEstimate: 1500,
      });
      expect(decision.shouldCache).toBe(false);
    });
  });

  // ── Retry Strategies ────────────────────────────────────────────────────

  describe('Retry Strategies', () => {
    it('should return aggressive retries for network errors', () => {
      const engine = createDecisionEngine();
      const strategy = engine.getRetryStrategy('network', 0, { stageId: 'research', errorType: 'network', attempt: 0 });
      expect(strategy.maxAttempts).toBe(5);
    });

    it('should return no retry for auth errors', () => {
      const engine = createDecisionEngine();
      const strategy = engine.getRetryStrategy('auth', 0, { stageId: 'research', errorType: 'auth', attempt: 0 });
      expect(strategy.maxAttempts).toBe(1);
    });

    it('should return moderate retries for validation errors', () => {
      const engine = createDecisionEngine();
      const strategy = engine.getRetryStrategy('validation', 0, { stageId: 'research', errorType: 'validation', attempt: 0 });
      expect(strategy.maxAttempts).toBe(3);
    });

    it('should return defaults for unknown error types', () => {
      const engine = createDecisionEngine();
      const strategy = engine.getRetryStrategy('unknown-error', 0, { stageId: 'research', errorType: 'unknown-error', attempt: 0 });
      expect(strategy.maxAttempts).toBe(3);
    });
  });

  // ── Concurrency Limits ──────────────────────────────────────────────────

  describe('Concurrency Limits', () => {
    it('should allow higher concurrency for parallelizable stages', () => {
      const engine = createDecisionEngine();
      const decision = engine.getConcurrencyLimit('research', {
        stageId: 'research',
        dependencies: ['project-intake'],
        isParallelizable: true,
      });
      expect(decision.maxConcurrency).toBeGreaterThanOrEqual(1);
    });

    it('should limit concurrency for sequential stages', () => {
      const engine = createDecisionEngine();
      const decision = engine.getConcurrencyLimit('architecture', {
        stageId: 'architecture',
        dependencies: ['research', 'business-analysis'],
        isParallelizable: false,
      });
      expect(decision.maxConcurrency).toBe(1);
    });
  });

  // ── Decision Recording ──────────────────────────────────────────────────

  describe('Decision Recording', () => {
    it('should record decision outcomes', () => {
      const engine = createDecisionEngine();
      engine.recordOutcome({ decisionType: 'model', stageId: 'research', success: true, details: {} });
      const outcomes = engine.getRecentOutcomes();
      expect(outcomes).toHaveLength(1);
    });
  });

  // ── Integration ─────────────────────────────────────────────────────────

  describe('Integration', () => {
    it('should work with experience engine recommendations', () => {
      const bus = new EventBus();
      const experience = new ExperienceEngine(path.join(TEST_DIR, 'integration'), bus);
      const engine = createDecisionEngine(bus, experience);

      for (let i = 0; i < 5; i++) {
        experience.recordOutcome({
          executionId: `exec-${i}`,
          industry: 'saas',
          stages: [{ stageId: 'research', provider: 'groq', model: 'llama', taskType: 'analysis', durationMs: 3000, tokensUsed: 1500, llmCalls: 1, success: true, error: undefined, cacheHit: false }],
          totalDurationMs: 3000,
          totalTokens: 1500,
          totalLlmCalls: 1,
          success: true,
          completedAt: Date.now(),
        });
      }

      const decision = engine.selectModel({
        taskType: 'analysis',
        stageId: 'research',
        industry: 'saas',
        budgetRemaining: 100_000,
        providerHealth: makeProviderHealth(),
      });
      expect(decision.provider).toBeTruthy();
      expect(decision.confidence).toBeGreaterThan(0);
    });
  });
});
