import { describe, it, expect, vi } from 'vitest';
import { ProgressReporter, createProgressReporter } from '../src/orchestration/progress-reporter.js';
import type { ExecutionPlan } from '../src/orchestration/types.js';

function makePlan(): ExecutionPlan {
  return {
    id: 'plan-1',
    stages: [
      { stageId: 'intake', strategy: {} as any, dependencies: [], estimatedStartMs: 0, estimatedDurationMs: 30000 },
      { stageId: 'research', strategy: {} as any, dependencies: ['intake'], estimatedStartMs: 5000, estimatedDurationMs: 30000 },
    ],
    estimatedTotalDurationMs: 60000,
    estimatedTotalTokens: 10000,
    parallelGroups: [['intake'], ['research']],
  };
}

describe('ProgressReporter', () => {
  it('should initialize with plan data', () => {
    const reporter = new ProgressReporter(makePlan());
    const progress = reporter.getProgress();
    expect(progress.planId).toBe('plan-1');
    expect(progress.totalStages).toBe(2);
    expect(progress.status).toBe('pending');
  });

  it('should track stage lifecycle', () => {
    const reporter = new ProgressReporter(makePlan());
    reporter.start();
    reporter.stageStarted('intake');
    let p = reporter.getProgress();
    expect(p.stages[0].status).toBe('running');

    reporter.stageCompleted('intake', 5000);
    p = reporter.getProgress();
    expect(p.stages[0].status).toBe('completed');
    expect(p.completedStages).toBe(1);
  });

  it('should track failures', () => {
    const reporter = new ProgressReporter(makePlan());
    reporter.start();
    reporter.stageStarted('intake');
    reporter.stageFailed('intake', 'error occurred');
    const p = reporter.getProgress();
    expect(p.stages[0].status).toBe('failed');
    expect(p.failedStages).toBe(1);
  });

  it('should track skips', () => {
    const reporter = new ProgressReporter(makePlan());
    reporter.start();
    reporter.stageSkipped('intake', 'not needed');
    const p = reporter.getProgress();
    expect(p.stages[0].status).toBe('skipped');
    expect(p.skippedStages).toBe(1);
  });

  it('should calculate percent complete', () => {
    const reporter = new ProgressReporter(makePlan());
    reporter.start();
    reporter.stageCompleted('intake', 1000);
    reporter.stageCompleted('research', 1000);
    reporter.complete();
    const p = reporter.getProgress();
    expect(p.percentComplete).toBe(100);
    expect(p.status).toBe('completed');
  });

  it('should emit progress updates', () => {
    const reporter = new ProgressReporter(makePlan());
    const updates: string[] = [];
    reporter.onProgress(u => updates.push(u.message));
    reporter.start();
    reporter.stageStarted('intake');
    reporter.stageCompleted('intake', 1000);
    reporter.complete();
    expect(updates.length).toBeGreaterThan(0);
  });

  it('should return status line', () => {
    const reporter = new ProgressReporter(makePlan());
    reporter.start();
    const line = reporter.getStatusLine();
    expect(line).toContain('%');
    expect(line).toContain('stages');
  });

  it('should create via factory', () => {
    const reporter = createProgressReporter(makePlan());
    expect(reporter).toBeInstanceOf(ProgressReporter);
  });
});
