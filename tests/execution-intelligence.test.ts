// ─── Execution Intelligence Tests ─────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ExecutionIntelligence, createExecutionIntelligence } from '../src/orchestration/execution-intelligence.js';

const TEST_DIR = path.join(process.cwd(), '.build-anything-test-intelligence');

function makeManifest() {
  return {
    id: 'test-manifest',
    description: 'Build a SaaS dashboard',
    domain: 'saas',
    createdAt: new Date().toISOString(),
    version: '1.0.0',
  };
}

describe('ExecutionIntelligence', () => {
  beforeAll(() => {
    if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  // ── Stage Strategy ──────────────────────────────────────────────────────

  describe('Stage Strategy', () => {
    it('should generate a complete strategy for a stage', () => {
      const ei = createExecutionIntelligence({ workingDirectory: path.join(TEST_DIR, 'strategy') });
      const strategy = ei.getStageStrategy('research', makeManifest(), {
        providerHealth: new Map(),
        budgetRemaining: 100_000,
        dependencies: ['project-intake'],
        isParallelizable: true,
      });
      expect(strategy.model).toBeDefined();
      expect(strategy.model.provider).toBeTruthy();
      expect(strategy.cache).toBeDefined();
      expect(strategy.retry).toBeDefined();
      expect(strategy.concurrency).toBeDefined();
      expect(strategy.estimatedDurationMs).toBeGreaterThan(0);
      expect(strategy.estimatedTokens).toBeGreaterThan(0);
    });

    it('should provide different strategies for different stages', () => {
      const ei = createExecutionIntelligence({ workingDirectory: path.join(TEST_DIR, 'different') });
      const research = ei.getStageStrategy('research', makeManifest(), {
        providerHealth: new Map(),
        budgetRemaining: 100_000,
        dependencies: [],
        isParallelizable: true,
      });
      const arch = ei.getStageStrategy('architecture', makeManifest(), {
        providerHealth: new Map(),
        budgetRemaining: 100_000,
        dependencies: ['research'],
        isParallelizable: false,
      });
      expect(research.concurrency.maxConcurrency).toBeGreaterThanOrEqual(arch.concurrency.maxConcurrency);
    });
  });

  // ── Outcome Recording ───────────────────────────────────────────────────

  describe('Outcome Recording', () => {
    it('should record stage outcomes', () => {
      const ei = createExecutionIntelligence({ workingDirectory: path.join(TEST_DIR, 'outcomes') });
      ei.recordStageComplete('research', {
        stageId: 'research',
        provider: 'groq',
        model: 'llama',
        taskType: 'analysis',
        durationMs: 5000,
        tokensUsed: 2000,
        llmCalls: 1,
        success: true,
        error: undefined,
        cacheHit: false,
      });
      const decisions = ei.getDecisionEngine().getRecentOutcomes();
      expect(decisions).toHaveLength(1);
    });

    it('should record pipeline outcomes', () => {
      const ei = createExecutionIntelligence({ workingDirectory: path.join(TEST_DIR, 'pipeline-outcomes') });
      ei.recordPipelineComplete({
        executionId: 'exec-1',
        industry: 'saas',
        stages: [{ stageId: 'research', provider: 'groq', model: 'llama', taskType: 'analysis', durationMs: 5000, tokensUsed: 2000, llmCalls: 1, success: true, error: undefined, cacheHit: false }],
        totalDurationMs: 5000,
        totalTokens: 2000,
        totalLlmCalls: 1,
        success: true,
        completedAt: Date.now(),
      });
      expect(ei.getExperienceEngine().size).toBe(1);
    });
  });

  // ── Subsystem Access ────────────────────────────────────────────────────

  describe('Subsystem Access', () => {
    it('should expose event bus', () => {
      const ei = createExecutionIntelligence({ workingDirectory: path.join(TEST_DIR, 'access') });
      expect(ei.getEventBus()).toBeDefined();
    });

    it('should expose decision engine', () => {
      const ei = createExecutionIntelligence({ workingDirectory: path.join(TEST_DIR, 'access') });
      expect(ei.getDecisionEngine()).toBeDefined();
    });

    it('should expose experience engine', () => {
      const ei = createExecutionIntelligence({ workingDirectory: path.join(TEST_DIR, 'access') });
      expect(ei.getExperienceEngine()).toBeDefined();
    });
  });

  // ── Event Integration ───────────────────────────────────────────────────

  describe('Event Integration', () => {
    it('should publish ModelSelected events through event bus', () => {
      const ei = createExecutionIntelligence({ workingDirectory: path.join(TEST_DIR, 'events') });
      const handler = vi.fn();
      ei.getEventBus().subscribe('ModelSelected', handler);
      ei.getStageStrategy('research', makeManifest(), {
        providerHealth: new Map(),
        budgetRemaining: 100_000,
        dependencies: [],
        isParallelizable: true,
      });
      expect(handler).toHaveBeenCalled();
    });
  });

  // ── Factory ─────────────────────────────────────────────────────────────

  describe('Factory', () => {
    it('should create with factory function', () => {
      const ei = createExecutionIntelligence({ workingDirectory: path.join(TEST_DIR, 'factory') });
      expect(ei).toBeInstanceOf(ExecutionIntelligence);
    });
  });
});

import { vi } from 'vitest';
