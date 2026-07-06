import { describe, it, expect } from 'vitest';
import { ExecutionReportGenerator, createExecutionReportGenerator } from '../src/orchestration/execution-report.js';
import type { ExecutionPlan, StageResult, ProjectManifest } from '../src/orchestration/types.js';
import type { PipelineProgress } from '../src/orchestration/progress-reporter.js';

const MANIFEST: ProjectManifest = { id: 'test', description: 'Test', createdAt: new Date().toISOString(), version: '1.0.0' };

function makePlan(): ExecutionPlan {
  return {
    id: 'plan-1',
    stages: [{ stageId: 'intake', strategy: {} as any, dependencies: [], estimatedStartMs: 0, estimatedDurationMs: 30000 }],
    estimatedTotalDurationMs: 30000,
    estimatedTotalTokens: 5000,
    parallelGroups: [['intake']],
  };
}

function makeResults(): Map<string, StageResult> {
  const m = new Map<string, StageResult>();
  m.set('intake', { success: true, artifacts: { manifest: { name: 'test' } }, warnings: [], durationMs: 5000, llmCalls: 1, tokensUsed: 1000 });
  return m;
}

function makeProgress(): PipelineProgress {
  return {
    planId: 'plan-1', status: 'completed', totalStages: 1, completedStages: 1,
    failedStages: 0, skippedStages: 0, percentComplete: 100,
    startedAt: Date.now() - 5000, updatedAt: Date.now(), stages: [],
  };
}

describe('ExecutionReportGenerator', () => {
  it('should generate a report', () => {
    const gen = new ExecutionReportGenerator();
    const report = gen.generate(makePlan(), MANIFEST, makeResults(), new Map(), makeProgress());
    expect(report.executionId).toBe('plan-1');
    expect(report.success).toBe(true);
    expect(report.stages.length).toBe(1);
    expect(report.costSummary.totalTokens).toBe(1000);
  });

  it('should generate markdown', () => {
    const gen = new ExecutionReportGenerator();
    const report = gen.generate(makePlan(), MANIFEST, makeResults(), new Map(), makeProgress());
    const md = gen.generateMarkdown(report);
    expect(md).toContain('Pipeline Execution Report');
    expect(md).toContain('SUCCESS');
    expect(md).toContain('intake');
  });

  it('should calculate cost', () => {
    const gen = new ExecutionReportGenerator({ costPer1kTokens: 0.01 });
    const report = gen.generate(makePlan(), MANIFEST, makeResults(), new Map(), makeProgress());
    expect(report.costSummary.estimatedCostUsd).toBeGreaterThan(0);
  });

  it('should handle failed stages', () => {
    const gen = new ExecutionReportGenerator();
    const results = new Map<string, StageResult>();
    results.set('intake', { success: false, artifacts: {}, warnings: [], error: 'Failed', durationMs: 1000, llmCalls: 0, tokensUsed: 0 });
    const progress = makeProgress();
    progress.status = 'failed';
    const report = gen.generate(makePlan(), MANIFEST, results, new Map(), progress);
    expect(report.success).toBe(false);
    expect(report.stages[0].errors.length).toBeGreaterThan(0);
  });

  it('should create via factory', () => {
    const gen = createExecutionReportGenerator();
    expect(gen).toBeInstanceOf(ExecutionReportGenerator);
  });
});
