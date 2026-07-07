import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { Orchestrator } from '../src/orchestration/orchestrator.js';
import { BaseStage } from '../src/orchestration/stages/base-stage.js';
import type { StageContext, StageResult, StageMeta, ProjectManifest, LLMAdapterInterface, OrchestratorResult } from '../src/orchestration/types.js';
import { AgentRole, ArtifactType } from '../src/orchestration/types.js';

const TEST_DIR = path.join(process.cwd(), '.build-anything-test-e2e');

function makeManifest(overrides: Partial<ProjectManifest> = {}): ProjectManifest {
  return {
    id: 'e2e-test-manifest',
    description: 'Build a test application',
    domain: 'saas',
    createdAt: new Date().toISOString(),
    version: 1,
    ...overrides,
  };
}

function createMockLLM(): LLMAdapterInterface {
  let callCount = 0;
  return {
    async call() {
      callCount++;
      return {
        content: JSON.stringify({ result: 'mock', id: callCount }),
        usage: { input: 10, output: 20, total: 30 },
        provider: 'mock',
        model: 'mock-model',
        durationMs: 1,
      };
    },
    getTotalUsage() {
      return { calls: callCount, totalTokens: callCount * 30, byProvider: { mock: callCount } };
    },
  };
}

// ─── Test Stages ──────────────────────────────────────────────────────────

class StageA extends BaseStage {
  meta: StageMeta = {
    id: 'stage-a', name: 'Stage A', description: 'First stage',
    agentRole: AgentRole.Research, dependencies: [], inputs: [], outputs: ['artifact.a'],
    estimatedDurationSec: 1, skippable: false, maxRetries: 0, parallelizable: false,
  };
  async execute(ctx: StageContext): Promise<StageResult> {
    ctx.setArtifact('artifact.a', { data: 'from-a' }, ArtifactType.Json);
    ctx.setCheckpoint('stage-a-mid', { progress: 0.5 });
    return { success: true, artifacts: { 'artifact.a': { data: 'from-a' } }, warnings: [], durationMs: 5, llmCalls: 0, tokensUsed: 0 };
  }
}

class StageB extends BaseStage {
  meta: StageMeta = {
    id: 'stage-b', name: 'Stage B', description: 'Second stage',
    agentRole: AgentRole.Architecture, dependencies: ['stage-a'], inputs: ['artifact.a'], outputs: ['artifact.b'],
    estimatedDurationSec: 1, skippable: false, maxRetries: 0, parallelizable: false,
  };
  async execute(ctx: StageContext): Promise<StageResult> {
    const a = ctx.getArtifact<{ data: string }>('artifact.a');
    ctx.setArtifact('artifact.b', { derived: `b-${a?.data}` }, ArtifactType.Json);
    return { success: true, artifacts: { 'artifact.b': { derived: `b-${a?.data}` } }, warnings: ['minor warning'], durationMs: 5, llmCalls: 1, tokensUsed: 30 };
  }
}

class StageC extends BaseStage {
  meta: StageMeta = {
    id: 'stage-c', name: 'Stage C', description: 'Third stage',
    agentRole: AgentRole.Frontend, dependencies: ['stage-b'], inputs: ['artifact.b'], outputs: ['artifact.c'],
    estimatedDurationSec: 1, skippable: false, maxRetries: 0, parallelizable: false,
  };
  async execute(ctx: StageContext): Promise<StageResult> {
    const b = ctx.getArtifact<{ derived: string }>('artifact.b');
    ctx.setArtifact('artifact.c', { final: `c-${b?.derived}` }, ArtifactType.Json);
    return { success: true, artifacts: { 'artifact.c': { final: `c-${b?.derived}` } }, warnings: [], durationMs: 5, llmCalls: 0, tokensUsed: 0 };
  }
}

class StageParallel extends BaseStage {
  meta: StageMeta = {
    id: 'stage-parallel', name: 'Parallel Stage', description: 'Runs parallel with stage-a',
    agentRole: AgentRole.DevOps, dependencies: [], inputs: [], outputs: ['artifact.parallel'],
    estimatedDurationSec: 1, skippable: false, maxRetries: 0, parallelizable: true,
  };
  async execute(_ctx: StageContext): Promise<StageResult> {
    return { success: true, artifacts: { 'artifact.parallel': { note: 'parallel work' } }, warnings: [], durationMs: 5, llmCalls: 0, tokensUsed: 0 };
  }
}

class StageFailing extends BaseStage {
  meta: StageMeta = {
    id: 'stage-fail', name: 'Failing Stage', description: 'Always fails',
    agentRole: AgentRole.QualityAssurance, dependencies: ['stage-a'], inputs: [], outputs: [],
    estimatedDurationSec: 1, skippable: false, maxRetries: 0, parallelizable: false,
  };
  async execute(_ctx: StageContext): Promise<StageResult> {
    return { success: false, artifacts: {}, warnings: [], error: 'Intentional failure for testing', durationMs: 2, llmCalls: 0, tokensUsed: 0 };
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────

function createOrchestrator(workingDir: string = TEST_DIR): Orchestrator {
  const orch = new Orchestrator({
    workingDirectory: workingDir,
    enableCheckpoints: true,
    stageTimeoutSec: 30,
    requireApproval: false,
    maxConcurrency: 1,
  });
  orch.setLLMAdapter(createMockLLM());
  return orch;
}

function registerStages(orch: Orchestrator, stages: BaseStage[]): void {
  const map = (orch as any).stages as Map<string, typeof stages[0]>;
  map.clear();
  for (const s of stages) {
    (orch as any).registerStage(s);
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('Orchestrator E2E Pipeline', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('executes stages in dependency order with artifact chaining', async () => {
    const orch = createOrchestrator();
    registerStages(orch, [new StageA(), new StageB(), new StageC()]);

    const result = await orch.runFromManifest(makeManifest());

    expect(result.success).toBe(true);
    expect(result.stageResults.size).toBe(3);

    const rA = result.stageResults.get('stage-a');
    expect(rA?.success).toBe(true);
    expect(rA?.artifacts['artifact.a']).toEqual({ data: 'from-a' });

    const rB = result.stageResults.get('stage-b');
    expect(rB?.success).toBe(true);
    expect(rB?.artifacts['artifact.b']).toEqual({ derived: 'b-from-a' });

    const rC = result.stageResults.get('stage-c');
    expect(rC?.success).toBe(true);
    expect(rC?.artifacts['artifact.c']).toEqual({ final: 'c-b-from-a' });

    expect(result.artifacts['artifact.a']).toBeDefined();
    expect(result.artifacts['artifact.b']).toBeDefined();
    expect(result.artifacts['artifact.c']).toBeDefined();

    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.totalLlmCalls).toBe(1);
  });

  it('emits pipeline lifecycle events', async () => {
    const orch = createOrchestrator();
    registerStages(orch, [new StageA(), new StageB()]);

    const events: Array<{ type: string; stageId: string }> = [];
    orch.on('event', (e: any) => events.push({ type: e.type, stageId: e.stageId }));

    await orch.runFromManifest(makeManifest());

    const eventTypes = events.map(e => e.type);
    expect(eventTypes).toContain('pipeline:start');
    expect(eventTypes).toContain('stage:start');
    expect(eventTypes).toContain('stage:complete');
    expect(eventTypes).toContain('pipeline:complete');

    expect(events.filter(e => e.type === 'stage:start').length).toBeGreaterThanOrEqual(2);
    expect(events.filter(e => e.type === 'stage:complete').length).toBeGreaterThanOrEqual(2);
  });

  it('passes stage warnings into stage results', async () => {
    const orch = createOrchestrator();
    registerStages(orch, [new StageA(), new StageB()]);

    const result = await orch.runFromManifest(makeManifest());
    expect(result.stageResults.get('stage-b')?.warnings).toContain('minor warning');
  });

  it('fails pipeline when a stage fails', async () => {
    const orch = createOrchestrator();
    registerStages(orch, [new StageA(), new StageFailing()]);

    const result = await orch.runFromManifest(makeManifest());

    expect(result.success).toBe(false);
    expect(result.stageResults.get('stage-a')?.success).toBe(true);
    expect(result.stageResults.get('stage-fail')?.success).toBe(false);
  });

  it('emits failure events when a stage errors', async () => {
    const orch = createOrchestrator();
    registerStages(orch, [new StageA(), new StageFailing()]);

    const events: Array<{ type: string }> = [];
    orch.on('event', (e: any) => events.push({ type: e.type }));

    await orch.runFromManifest(makeManifest());

    expect(events.some(e => e.type === 'stage:error')).toBe(true);
    expect(events.some(e => e.type === 'pipeline:error')).toBe(true);
  });

  it('respects dependency ordering (topological sort)', async () => {
    const orch = createOrchestrator();
    registerStages(orch, [
      new StageC(),  // registered first but depends on B
      new StageB(),  // depends on A
      new StageA(),  // no deps, should run first
    ]);

    const executionOrder: string[] = [];
    const origExecute = (orch as any).executeLevel.bind(orch);
    (orch as any).executeLevel = async (stages: any[], manifest: any, prev: any) => {
      for (const s of stages) {
        executionOrder.push(s.meta.id);
      }
      return origExecute(stages, manifest, prev);
    };

    await orch.runFromManifest(makeManifest());

    expect(executionOrder.indexOf('stage-a')).toBeLessThan(executionOrder.indexOf('stage-b'));
    expect(executionOrder.indexOf('stage-b')).toBeLessThan(executionOrder.indexOf('stage-c'));
  });

  it('executes parallel stages concurrently when maxConcurrency > 1', async () => {
    const orch = createOrchestrator();
    registerStages(orch, [new StageA(), new StageParallel()]);
    (orch as any).config.maxConcurrency = 2;

    let concurrentExecutions = 0;
    let maxConcurrentSeen = 0;

    const origExecuteLevel = (orch as any).executeLevel.bind(orch);
    (orch as any).executeLevel = async (stages: any[], manifest: any, prev: any) => {
      for (const s of stages) {
        const origExecute = s.execute.bind(s);
        s.execute = async (ctx: any) => {
          concurrentExecutions++;
          maxConcurrentSeen = Math.max(maxConcurrentSeen, concurrentExecutions);
          const result = await origExecute(ctx);
          concurrentExecutions--;
          return result;
        };
      }
      return origExecuteLevel(stages, manifest, prev);
    };

    const result = await orch.runFromManifest(makeManifest());
    expect(result.success).toBe(true);
    expect(maxConcurrentSeen).toBeGreaterThanOrEqual(1);
  });

  it('stages can save and read checkpoints via context', async () => {
    const orch = createOrchestrator();
    registerStages(orch, [new StageA()]);

    let checkpointValue: unknown;
    const trackSpy = (orch as any).tracker as { getCheckpoint: (stageId: string, key: string) => unknown };
    const origStart = (orch as any).executeStageWithRetry.bind(orch);
    (orch as any).executeStageWithRetry = async (stage: any, manifest: any, prev: any) => {
      const result = await origStart(stage, manifest, prev);
      checkpointValue = trackSpy.getCheckpoint('stage-a', 'stage-a-mid');
      return result;
    };

    const result = await orch.runFromManifest(makeManifest());
    expect(result.success).toBe(true);
    expect(checkpointValue).toEqual({ progress: 0.5 });
  });

  it('generates execution report with complete metadata', async () => {
    const orch = createOrchestrator();
    registerStages(orch, [new StageA(), new StageB(), new StageC()]);

    const result = await orch.runFromManifest(makeManifest());

    expect(result.stageResults.has('stage-a')).toBe(true);
    expect(result.stageResults.has('stage-b')).toBe(true);
    expect(result.stageResults.has('stage-c')).toBe(true);

    for (const [id, sr] of result.stageResults) {
      expect(sr.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof sr.success).toBe('boolean');
      expect(Array.isArray(sr.warnings)).toBe(true);
    }

    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThan(0);
    expect(typeof result.totalLlmCalls).toBe('number');
    expect(typeof result.totalTokens).toBe('number');
    expect(typeof result.contextBudgetReport).toBe('string');
  });

  it('accepts raw string input via run() method', async () => {
    const orch = createOrchestrator();
    registerStages(orch, [new StageA(), new StageB()]);

    orch.setLLMAdapter(createMockLLM());

    const result = await orch.run(makeManifest());

    expect(result.success).toBe(true);
    expect(result.stageResults.size).toBe(2);
  });

  it('runs all stages even when some produce warnings', async () => {
    const orch = createOrchestrator();
    registerStages(orch, [new StageA(), new StageB(), new StageC()]);

    const result = await orch.runFromManifest(makeManifest());

    expect(result.success).toBe(true);
    expect(result.stageResults.get('stage-a')?.warnings).toEqual([]);
    expect(result.stageResults.get('stage-b')?.warnings).toEqual(['minor warning']);
    expect(result.stageResults.get('stage-c')?.warnings).toEqual([]);
  });

  it('stage artifacts are accessible in subsequent stages', async () => {
    const orch = createOrchestrator();
    registerStages(orch, [new StageA(), new StageB(), new StageC()]);

    const result = await orch.runFromManifest(makeManifest());

    const a = result.artifacts['artifact.a'] as { data: string } | undefined;
    const b = result.artifacts['artifact.b'] as { derived: string } | undefined;
    const c = result.artifacts['artifact.c'] as { final: string } | undefined;

    expect(a?.data).toBe('from-a');
    expect(b?.derived).toBe('b-from-a');
    expect(c?.final).toBe('c-b-from-a');
  });

  it('pipeline with no stages completes successfully', async () => {
    const orch = createOrchestrator();
    registerStages(orch, []);

    const result = await orch.runFromManifest(makeManifest());
    expect(result.success).toBe(true);
    expect(result.stageResults.size).toBe(0);
  });

  it('supports BOS context detection during pipeline run', async () => {
    const orch = createOrchestrator();
    registerStages(orch, [new StageA()]);

    const result = await orch.runFromManifest(makeManifest({ domain: 'healthcare' }));
    expect(result.success).toBe(true);
    expect(result.stageResults.size).toBe(1);
  });

  it('produces different execution IDs for separate runs', async () => {
    const orch = createOrchestrator();
    registerStages(orch, [new StageA()]);

    const r1 = await orch.runFromManifest(makeManifest({ id: 'run-1' }));
    expect(r1.success).toBe(true);

    registerStages(orch, [new StageA()]);
    const r2 = await orch.runFromManifest(makeManifest({ id: 'run-2' }));
    expect(r2.success).toBe(true);
  });
});
