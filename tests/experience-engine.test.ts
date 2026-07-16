// ─── Experience Engine Tests ──────────────────────────────────────────────────

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ExperienceEngine, createExperienceEngine } from '../src/orchestration/experience-engine.js';
import { EventBus } from '../src/orchestration/event-bus.js';
import { LLMTaskType } from '../src/orchestration/types.js';

const TEST_DIR = path.join(process.cwd(), '.build-anything-test-experience');

function makeOutcome(overrides?: Partial<Parameters<ExperienceEngine['recordOutcome']>[0]>) {
  return {
    executionId: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    industry: 'saas' as const,
    stages: [
      { stageId: 'research', provider: 'groq', model: 'llama-3.3-70b-versatile', taskType: LLMTaskType.Analysis, durationMs: 5000, tokensUsed: 2000, llmCalls: 1, success: true, error: undefined, cacheHit: false },
    ],
    totalDurationMs: 5000,
    totalTokens: 2000,
    totalLlmCalls: 1,
    success: true,
    completedAt: Date.now(),
    ...overrides,
  };
}

describe('ExperienceEngine', () => {
  beforeAll(() => {
    if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  // ── Recording ───────────────────────────────────────────────────────────

  describe('Recording', () => {
    it('should record outcomes', () => {
      const engine = createExperienceEngine(TEST_DIR);
      engine.recordOutcome(makeOutcome());
      expect(engine.size).toBe(1);
    });

    it('should persist to disk', () => {
      const dir = path.join(TEST_DIR, 'persist-test');
      const engine = createExperienceEngine(dir);
      engine.recordOutcome(makeOutcome());
      engine.persist();
      const file = path.join(dir, '.build-anything', 'experience', 'history.json');
      expect(fs.existsSync(file)).toBe(true);
    });

    it('should load from disk', () => {
      const dir = path.join(TEST_DIR, 'load-test');
      const engine1 = createExperienceEngine(dir);
      engine1.recordOutcome(makeOutcome());
      engine1.persist();

      const engine2 = createExperienceEngine(dir);
      expect(engine2.size).toBe(1);
    });
  });

  // ── Recommendations ─────────────────────────────────────────────────────

  describe('Recommendations', () => {
    it('should return low-confidence defaults when no history', () => {
      const engine = createExperienceEngine(path.join(TEST_DIR, 'empty-rec'));
      const recs = engine.getRecommendations({ stageId: 'research', taskType: LLMTaskType.Analysis, industry: 'saas' });
      expect(recs.confidence).toBeLessThan(0.5);
      expect(recs.reasoning).toContain('No historical data');
    });

    it('should suggest best provider from history', () => {
      const engine = createExperienceEngine(path.join(TEST_DIR, 'provider-rec'));
      for (let i = 0; i < 5; i++) {
        engine.recordOutcome(makeOutcome({
          stages: [{ stageId: 'research', provider: 'groq', model: 'llama', taskType: LLMTaskType.Analysis, durationMs: 3000, tokensUsed: 1500, llmCalls: 1, success: true, error: undefined, cacheHit: false }],
        }));
      }
      const recs = engine.getRecommendations({ stageId: 'research', taskType: LLMTaskType.Analysis, industry: 'saas' });
      expect(recs.suggestedProvider).toBe('groq');
      expect(recs.confidence).toBeGreaterThan(0.3);
    });
  });

  // ── History Queries ─────────────────────────────────────────────────────

  describe('History Queries', () => {
    it('should filter by industry', () => {
      const engine = createExperienceEngine(path.join(TEST_DIR, 'history-industry'));
      engine.recordOutcome(makeOutcome({ industry: 'saas' }));
      engine.recordOutcome(makeOutcome({ industry: 'healthcare' }));
      engine.recordOutcome(makeOutcome({ industry: 'saas' }));
      const saas = engine.getHistory({ industry: 'saas' });
      expect(saas).toHaveLength(2);
    });

    it('should filter by stage', () => {
      const engine = createExperienceEngine(path.join(TEST_DIR, 'history-stage'));
      engine.recordOutcome(makeOutcome({ stages: [{ stageId: 'research', provider: 'groq', model: 'm', taskType: LLMTaskType.Analysis, durationMs: 1, tokensUsed: 1, llmCalls: 1, success: true, error: undefined, cacheHit: false }] }));
      engine.recordOutcome(makeOutcome({ stages: [{ stageId: 'architecture', provider: 'anthropic', model: 'm', taskType: LLMTaskType.Planning, durationMs: 1, tokensUsed: 1, llmCalls: 1, success: true, error: undefined, cacheHit: false }] }));
      const research = engine.getHistory({ stageId: 'research' });
      expect(research).toHaveLength(1);
    });

    it('should support pagination', () => {
      const engine = createExperienceEngine(path.join(TEST_DIR, 'history-page'));
      for (let i = 0; i < 10; i++) engine.recordOutcome(makeOutcome());
      const page = engine.getHistory({ limit: 3, offset: 2 });
      expect(page).toHaveLength(3);
    });
  });

  // ── Statistics ──────────────────────────────────────────────────────────

  describe('Statistics', () => {
    it('should compute aggregate stats', () => {
      const engine = createExperienceEngine(path.join(TEST_DIR, 'stats'));
      engine.recordOutcome(makeOutcome({ success: true, totalDurationMs: 5000, totalTokens: 2000 }));
      engine.recordOutcome(makeOutcome({ success: false, totalDurationMs: 3000, totalTokens: 1000 }));
      const stats = engine.getStats();
      expect(stats.totalExecutions).toBe(2);
      expect(stats.successRate).toBe(0.5);
      expect(stats.avgDurationMs).toBe(4000);
    });

    it('should compute by-stage stats', () => {
      const engine = createExperienceEngine(path.join(TEST_DIR, 'stats-stage'));
      engine.recordOutcome(makeOutcome({ stages: [{ stageId: 'research', provider: 'groq', model: 'm', taskType: LLMTaskType.Analysis, durationMs: 5000, tokensUsed: 2000, llmCalls: 1, success: true, error: undefined, cacheHit: false }] }));
      const stats = engine.getStats();
      expect(stats.byStage['research']).toBeDefined();
      expect(stats.byStage['research'].count).toBe(1);
    });
  });

  // ── Provider Performance ────────────────────────────────────────────────

  describe('Provider Performance', () => {
    it('should compute provider stats', () => {
      const engine = createExperienceEngine(path.join(TEST_DIR, 'provider-perf'));
      engine.recordOutcome(makeOutcome({ stages: [{ stageId: 'research', provider: 'groq', model: 'm', taskType: LLMTaskType.Analysis, durationMs: 5000, tokensUsed: 2000, llmCalls: 1, success: true, error: undefined, cacheHit: false }] }));
      const perf = engine.getProviderPerformance('groq');
      expect(perf.totalCalls).toBe(1);
      expect(perf.successRate).toBe(1);
    });
  });

  // ── Stage Performance ───────────────────────────────────────────────────

  describe('Stage Performance', () => {
    it('should compute stage stats with errors', () => {
      const engine = createExperienceEngine(path.join(TEST_DIR, 'stage-perf'));
      engine.recordOutcome(makeOutcome({ stages: [{ stageId: 'research', provider: 'groq', model: 'm', taskType: LLMTaskType.Analysis, durationMs: 5000, tokensUsed: 2000, llmCalls: 1, success: false, error: 'timeout', cacheHit: false }] }));
      const perf = engine.getStagePerformance('research');
      expect(perf.totalRuns).toBe(1);
      expect(perf.commonErrors).toHaveLength(1);
      expect(perf.commonErrors[0].error).toBe('timeout');
    });
  });

  // ── Event Bus Integration ───────────────────────────────────────────────

  describe('Event Bus Integration', () => {
    it('should publish PipelineCompleted event on recordOutcome', () => {
      const bus = new EventBus();
      const handler = vi.fn();
      bus.subscribe('PipelineCompleted', handler);
      const engine = createExperienceEngine(path.join(TEST_DIR, 'event-test'), bus);
      engine.recordOutcome(makeOutcome());
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
