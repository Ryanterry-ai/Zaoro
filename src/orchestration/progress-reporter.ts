// ─── Progress Reporter ──────────────────────────────────────────────────────
//
// Real-time progress reporting for pipeline execution. Tracks:
//   - Overall pipeline progress (% complete, ETA)
//   - Per-stage status and timing
//   - Event bus integration for live updates
// ─────────────────────────────────────────────────────────────────────────────

import type { EventBus } from './event-bus.js';
import type { ExecutionPlan, PlannedStage } from './types.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StageProgress {
  stageId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  progress?: number;
  error?: string;
}

export interface PipelineProgress {
  planId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalStages: number;
  completedStages: number;
  failedStages: number;
  skippedStages: number;
  percentComplete: number;
  estimatedTimeRemainingSec?: number;
  startedAt: number;
  updatedAt: number;
  stages: StageProgress[];
}

export interface ProgressUpdate {
  type: 'stage-started' | 'stage-completed' | 'stage-failed' | 'stage-skipped' | 'pipeline-completed' | 'pipeline-failed';
  stageId?: string;
  progress: PipelineProgress;
  message: string;
  timestamp: number;
}

export type ProgressCallback = (update: ProgressUpdate) => void;

// ─── Progress Reporter ──────────────────────────────────────────────────────

export class ProgressReporter {
  private progress: PipelineProgress;
  private callbacks: ProgressCallback[] = [];
  private eventBus: EventBus | undefined;
  private averageStageDuration: Map<string, number> = new Map();

  constructor(plan: ExecutionPlan, eventBus?: EventBus) {
    this.eventBus = eventBus;
    this.progress = {
      planId: plan.id,
      status: 'pending',
      totalStages: plan.stages.length,
      completedStages: 0,
      failedStages: 0,
      skippedStages: 0,
      percentComplete: 0,
      startedAt: Date.now(),
      updatedAt: Date.now(),
      stages: plan.stages.map(s => ({
        stageId: s.stageId,
        status: 'pending',
        progress: 0,
      })),
    };
  }

  onProgress(callback: ProgressCallback): () => void {
    this.callbacks.push(callback);
    return () => { this.callbacks = this.callbacks.filter(cb => cb !== callback); };
  }

  start(): void {
    this.progress.status = 'running';
    this.progress.startedAt = Date.now();
    this.emit({
      type: 'stage-started',
      progress: this.progress,
      message: 'Pipeline execution started',
      timestamp: Date.now(),
    });
  }

  stageStarted(stageId: string): void {
    const stage = this.progress.stages.find(s => s.stageId === stageId);
    if (!stage) return;
    stage.status = 'running';
    stage.startedAt = Date.now();
    stage.progress = 0;
    this.progress.updatedAt = Date.now();
    this.emit({ type: 'stage-started', stageId, progress: this.progress, message: `Stage "${stageId}" started`, timestamp: Date.now() });

    if (this.eventBus) {
      this.eventBus.publish({
        type: 'StageStarted',
        payload: { executionId: this.progress.planId, stageId, timestamp: Date.now() },
        timestamp: Date.now(),
      });
    }
  }

  stageCompleted(stageId: string, durationMs: number): void {
    const stage = this.progress.stages.find(s => s.stageId === stageId);
    if (!stage) return;
    stage.status = 'completed';
    stage.completedAt = Date.now();
    stage.durationMs = durationMs;
    stage.progress = 100;
    this.progress.completedStages++;
    this.progress.updatedAt = Date.now();
    this.updatePercent();
    this.updateETA();
    this.emit({ type: 'stage-completed', stageId, progress: this.progress, message: `Stage "${stageId}" completed in ${Math.round(durationMs / 1000)}s`, timestamp: Date.now() });
  }

  stageFailed(stageId: string, error: string): void {
    const stage = this.progress.stages.find(s => s.stageId === stageId);
    if (!stage) return;
    stage.status = 'failed';
    stage.completedAt = Date.now();
    stage.error = error;
    stage.progress = 0;
    this.progress.failedStages++;
    this.progress.updatedAt = Date.now();
    this.updatePercent();
    this.emit({ type: 'stage-failed', stageId, progress: this.progress, message: `Stage "${stageId}" failed: ${error}`, timestamp: Date.now() });
  }

  stageSkipped(stageId: string, reason: string): void {
    const stage = this.progress.stages.find(s => s.stageId === stageId);
    if (!stage) return;
    stage.status = 'skipped';
    stage.progress = 100;
    this.progress.skippedStages++;
    this.progress.updatedAt = Date.now();
    this.updatePercent();
    this.emit({ type: 'stage-skipped', stageId, progress: this.progress, message: `Stage "${stageId}" skipped: ${reason}`, timestamp: Date.now() });
  }

  complete(): void {
    this.progress.status = 'completed';
    this.progress.updatedAt = Date.now();
    this.progress.estimatedTimeRemainingSec = 0;
    this.emit({ type: 'pipeline-completed', progress: this.progress, message: 'Pipeline execution completed', timestamp: Date.now() });
  }

  fail(error: string): void {
    this.progress.status = 'failed';
    this.progress.updatedAt = Date.now();
    this.emit({ type: 'pipeline-failed', progress: this.progress, message: `Pipeline failed: ${error}`, timestamp: Date.now() });
  }

  getProgress(): PipelineProgress {
    return { ...this.progress, stages: [...this.progress.stages] };
  }

  getStatusLine(): string {
    const { percentComplete, completedStages, totalStages, failedStages } = this.progress;
    const eta = this.progress.estimatedTimeRemainingSec;
    const etaStr = eta ? ` | ETA: ${Math.round(eta)}s` : '';
    return `[${Math.round(percentComplete)}%] ${completedStages}/${totalStages} stages | ${failedStages} failed${etaStr}`;
  }

  private updatePercent(): void {
    const active = this.progress.totalStages;
    if (active === 0) { this.progress.percentComplete = 100; return; }
    const done = this.progress.completedStages + this.progress.failedStages + this.progress.skippedStages;
    this.progress.percentComplete = (done / active) * 100;
  }

  private updateETA(): void {
    const remaining = this.progress.totalStages - this.progress.completedStages - this.progress.failedStages - this.progress.skippedStages;
    if (remaining === 0) { this.progress.estimatedTimeRemainingSec = 0; return; }
    const avgDuration = Array.from(this.averageStageDuration.values()).reduce((a, b) => a + b, 0) / (this.averageStageDuration.size || 1);
    this.progress.estimatedTimeRemainingSec = (remaining * avgDuration) / 1000;
  }

  private emit(update: ProgressUpdate): void {
    for (const cb of this.callbacks) {
      try { cb(update); } catch { /* ignore */ }
    }
  }
}

export function createProgressReporter(plan: ExecutionPlan, eventBus?: EventBus): ProgressReporter {
  return new ProgressReporter(plan, eventBus);
}
