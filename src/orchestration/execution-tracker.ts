// ─── Execution Tracker ────────────────────────────────────────────────────────
//
// Tracks pipeline execution state, stage progress, and checkpoints.
// Enables resumability: if the process crashes, the tracker loads the
// last checkpoint and skips completed stages.
//
// Persistence: writes execution.json after each stage completes.
// ──────────────────────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';
import type {
  ExecutionState,
  StageExecutionRecord,
  StageStatus,
  ProjectManifest,
} from './types.js';

export class ExecutionTracker {
  private stateFile: string;
  private state: ExecutionState;

  constructor(workingDirectory: string) {
    this.stateFile = path.join(workingDirectory, 'metadata', 'execution.json');
    this.state = this.loadOrCreate(workingDirectory);
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Get the current execution state (read-only snapshot).
   */
  getState(): Readonly<ExecutionState> {
    return { ...this.state };
  }

  /**
   * Get the execution ID.
   */
  getExecutionId(): string {
    return this.state.executionId;
  }

  /**
   * Get a stage's execution record.
   */
  getStageRecord(stageId: string): StageExecutionRecord | undefined {
    return this.state.stages[stageId];
  }

  /**
   * Get the status of a stage.
   */
  getStageStatus(stageId: string): StageStatus {
    return this.state.stages[stageId]?.status ?? ('pending' as StageStatus);
  }

  /**
   * Mark a stage as started.
   */
  stageStarted(stageId: string, maxAttempts: number): void {
    const now = new Date().toISOString();
    const existing = this.state.stages[stageId];
    this.state.stages[stageId] = {
      stageId,
      status: 'running' as StageStatus,
      startedAt: now,
      completedAt: undefined,
      durationMs: 0,
      attempt: (existing?.attempt ?? 0) + 1,
      maxAttempts,
      error: undefined,
      warnings: [],
      artifactKeys: [],
      llmCalls: 0,
      tokensUsed: 0,
      checkpoint: undefined,
    };
    this.state.updatedAt = now;
    this.state.status = 'running' as StageStatus;
    this.persist();
  }

  /**
   * Mark a stage as completed.
   */
  stageCompleted(stageId: string, artifactKeys: string[], warnings: string[], llmCalls: number, tokensUsed: number): void {
    const now = new Date().toISOString();
    const record = this.state.stages[stageId];
    if (record) {
      record.status = 'completed' as StageStatus;
      record.completedAt = now;
      record.durationMs = record.startedAt ? Date.now() - new Date(record.startedAt).getTime() : 0;
      record.artifactKeys = artifactKeys;
      record.warnings = warnings;
      record.llmCalls = llmCalls;
      record.tokensUsed = tokensUsed;
    }
    this.state.updatedAt = now;
    this.persist();
  }

  /**
   * Mark a stage as failed.
   */
  stageFailed(stageId: string, error: string): void {
    const now = new Date().toISOString();
    const record = this.state.stages[stageId];
    if (record) {
      record.status = 'failed' as StageStatus;
      record.completedAt = now;
      record.durationMs = record.startedAt ? Date.now() - new Date(record.startedAt).getTime() : 0;
      record.error = error;
    }
    this.state.updatedAt = now;
    this.persist();
  }

  /**
   * Mark a stage as retrying.
   */
  stageRetrying(stageId: string): void {
    const record = this.state.stages[stageId];
    if (record) {
      record.status = 'retrying' as StageStatus;
    }
    this.state.updatedAt = new Date().toISOString();
    this.persist();
  }

  /**
   * Mark a stage as skipped.
   */
  stageSkipped(stageId: string, reason: string): void {
    const now = new Date().toISOString();
    this.state.stages[stageId] = {
      stageId,
      status: 'skipped' as StageStatus,
      startedAt: now,
      completedAt: now,
      durationMs: 0,
      attempt: 0,
      maxAttempts: 0,
      error: reason,
      warnings: [],
      artifactKeys: [],
      llmCalls: 0,
      tokensUsed: 0,
    };
    this.state.updatedAt = now;
    this.persist();
  }

  /**
   * Mark the entire pipeline as completed.
   */
  pipelineCompleted(): void {
    const now = new Date().toISOString();
    this.state.status = 'completed' as StageStatus;
    this.state.completedAt = now;
    this.state.totalDurationMs = Date.now() - new Date(this.state.startedAt).getTime();
    this.state.updatedAt = now;
    this.persist();
  }

  /**
   * Mark the entire pipeline as failed.
   */
  pipelineFailed(): void {
    const now = new Date().toISOString();
    this.state.status = 'failed' as StageStatus;
    this.state.completedAt = now;
    this.state.totalDurationMs = Date.now() - new Date(this.state.startedAt).getTime();
    this.state.updatedAt = now;
    this.persist();
  }

  /**
   * Save a checkpoint value for a stage.
   */
  setCheckpoint(stageId: string, key: string, value: unknown): void {
    const ckKey = `${stageId}:${key}`;
    this.state.checkpoints[ckKey] = value;
    this.state.updatedAt = new Date().toISOString();
    this.persist();
  }

  /**
   * Read a checkpoint value for a stage.
   */
  getCheckpoint<T = unknown>(stageId: string, key: string): T | undefined {
    const ckKey = `${stageId}:${key}`;
    return this.state.checkpoints[ckKey] as T | undefined;
  }

  /**
   * Get all stage IDs that have completed.
   */
  getCompletedStageIds(): string[] {
    return Object.values(this.state.stages)
      .filter(r => r.status === ('completed' as StageStatus))
      .map(r => r.stageId);
  }

  /**
   * Get all stage IDs that failed.
   */
  getFailedStageIds(): string[] {
    return Object.values(this.state.stages)
      .filter(r => r.status === ('failed' as StageStatus))
      .map(r => r.stageId);
  }

  /**
   * Check if a stage has already completed (for resume).
   */
  isStageCompleted(stageId: string): boolean {
    return this.state.stages[stageId]?.status === ('completed' as StageStatus);
  }

  /**
   * Get total LLM usage across all stages.
   */
  getTotalUsage(): { llmCalls: number; tokensUsed: number } {
    let llmCalls = 0;
    let tokensUsed = 0;
    for (const record of Object.values(this.state.stages)) {
      llmCalls += record.llmCalls;
      tokensUsed += record.tokensUsed;
    }
    return { llmCalls, tokensUsed };
  }

  /**
   * Generate a human-readable progress summary.
   */
  getProgressSummary(): string {
    const stages = Object.values(this.state.stages);
    const completed = stages.filter(s => s.status === ('completed' as StageStatus)).length;
    const total = stages.length;
    const failed = stages.filter(s => s.status === ('failed' as StageStatus)).length;
    const usage = this.getTotalUsage();
    return `[${completed}/${total}] completed, ${failed} failed, ${usage.llmCalls} LLM calls, ${usage.tokensUsed} tokens`;
  }

  // ─── Persistence ─────────────────────────────────────────────────────────

  private loadOrCreate(workingDirectory: string): ExecutionState {
    if (fs.existsSync(this.stateFile)) {
      try {
        const raw = fs.readFileSync(this.stateFile, 'utf-8');
        return JSON.parse(raw) as ExecutionState;
      } catch {
        // Corrupted file — start fresh
      }
    }
    return this.createNew(workingDirectory);
  }

  private createNew(workingDirectory: string): ExecutionState {
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      executionId,
      manifest: {} as ProjectManifest, // Set externally before first persist
      status: 'pending' as StageStatus,
      stages: {},
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: undefined,
      totalDurationMs: 0,
      checkpoints: {},
    };
  }

  private persist(): void {
    try {
      fs.mkdirSync(path.dirname(this.stateFile), { recursive: true });
      fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.warn(`[tracker] Failed to persist execution state: ${(err as Error).message}`);
    }
  }
}
