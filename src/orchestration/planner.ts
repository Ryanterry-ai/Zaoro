// ─── Planner-Driven Orchestration ───────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';
import type {
  ProjectManifest,
  StageDefinition,
  ExecutionPlan,
  PlannedStage,
  StageStrategy,
  ModelDecision,
  CacheDecision,
  RetryDecision,
  ConcurrencyDecision,
} from './types.js';

export interface PlannerConfig {
  maxConcurrency: number;
  enableCheckpoints: boolean;
  checkpointDir: string;
}

export interface CheckpointData {
  planId: string;
  completedStages: string[];
  stageArtifacts: Record<string, string[]>;
  timestamp: number;
}

const DEFAULT_STRATEGY: StageStrategy = {
  model: { provider: 'auto', model: 'auto', reasoning: 'default', confidence: 0.5 } as ModelDecision,
  cache: { shouldCache: false, reason: 'default', ttlMs: 0 } as CacheDecision,
  retry: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 10000, backoffMultiplier: 2 } as RetryDecision,
  concurrency: { maxConcurrency: 1, reasoning: 'default' } as ConcurrencyDecision,
  estimatedDurationMs: 30000,
  estimatedTokens: 5000,
};

const DEFAULT_PLANNER_CONFIG: PlannerConfig = {
  maxConcurrency: 3,
  enableCheckpoints: true,
  checkpointDir: '.checkpoints',
};

export class Planner {
  private config: PlannerConfig;

  constructor(config?: Partial<PlannerConfig>) {
    this.config = { ...DEFAULT_PLANNER_CONFIG, ...config };
  }

  createPlan(manifest: ProjectManifest, stages: StageDefinition[]): ExecutionPlan {
    const stageMap = new Map<string, StageDefinition>();
    for (const stage of stages) stageMap.set(stage.meta.id, stage);

    const levels = this.topologicalSort(stages);
    let order = 0;
    const plannedStages: PlannedStage[] = [];
    const parallelGroups: string[][] = [];

    for (const level of levels) {
      const group: string[] = [];
      for (const stage of level) {
        const estimatedDurationMs = (stage.meta.estimatedDurationSec ?? 30) * 1000;
        plannedStages.push({
          stageId: stage.meta.id,
          strategy: { ...DEFAULT_STRATEGY, estimatedDurationMs, estimatedTokens: 5000 },
          dependencies: stage.meta.dependencies,
          estimatedStartMs: order * 5000,
          estimatedDurationMs,
        });
        group.push(stage.meta.id);
        order++;
      }
      parallelGroups.push(group);
    }

    const totalDurationMs = plannedStages.reduce((max, ps) => Math.max(max, ps.estimatedStartMs + ps.estimatedDurationMs), 0);

    return {
      id: `plan-${Date.now()}`,
      stages: plannedStages,
      estimatedTotalDurationMs: totalDurationMs,
      estimatedTotalTokens: plannedStages.length * 5000,
      parallelGroups,
    };
  }

  saveCheckpoint(planId: string, completedStages: string[], stageArtifacts: Record<string, string[]>): void {
    if (!this.config.enableCheckpoints) return;
    const checkpointDir = path.resolve(this.config.checkpointDir);
    if (!fs.existsSync(checkpointDir)) fs.mkdirSync(checkpointDir, { recursive: true });
    const data: CheckpointData = { planId, completedStages, stageArtifacts, timestamp: Date.now() };
    fs.writeFileSync(path.join(checkpointDir, `${planId}.json`), JSON.stringify(data, null, 2), 'utf-8');
  }

  loadCheckpoint(planId: string): CheckpointData | undefined {
    const filePath = path.join(this.config.checkpointDir, `${planId}.json`);
    if (!fs.existsSync(filePath)) return undefined;
    try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CheckpointData; } catch { return undefined; }
  }

  deleteCheckpoint(planId: string): void {
    const filePath = path.join(this.config.checkpointDir, `${planId}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  getReadyStages(plan: ExecutionPlan, completedStages: Set<string>, runningStages: Set<string>): PlannedStage[] {
    return plan.stages.filter(ps => {
      if (completedStages.has(ps.stageId)) return false;
      if (runningStages.has(ps.stageId)) return false;
      return ps.dependencies.every(dep => completedStages.has(dep));
    });
  }

  private topologicalSort(stages: StageDefinition[]): StageDefinition[][] {
    const stageMap = new Map<string, StageDefinition>();
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();
    for (const stage of stages) { stageMap.set(stage.meta.id, stage); inDegree.set(stage.meta.id, 0); adjList.set(stage.meta.id, []); }
    for (const stage of stages) { for (const dep of stage.meta.dependencies) { if (adjList.has(dep)) { adjList.get(dep)!.push(stage.meta.id); inDegree.set(stage.meta.id, (inDegree.get(stage.meta.id) ?? 0) + 1); } } }
    const levels: StageDefinition[][] = [];
    const queue: string[] = [];
    for (const [id, degree] of inDegree) { if (degree === 0) queue.push(id); }
    while (queue.length > 0) {
      const level: StageDefinition[] = []; const nextQueue: string[] = [];
      for (const id of queue) { const stage = stageMap.get(id); if (stage) level.push(stage); for (const neighbor of (adjList.get(id) ?? [])) { const d = (inDegree.get(neighbor) ?? 1) - 1; inDegree.set(neighbor, d); if (d === 0) nextQueue.push(neighbor); } }
      if (level.length > 0) levels.push(level); queue.length = 0; queue.push(...nextQueue);
    }
    return levels;
  }
}

export function createPlanner(config?: Partial<PlannerConfig>): Planner { return new Planner(config); }
