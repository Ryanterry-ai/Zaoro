// ─── Orchestrator ─────────────────────────────────────────────────────────────
//
// Pipeline orchestrator for the /build-anything skill.
//
// This is the central engine that ties everything together:
//   - Intent routing (detect input type → normalize to manifest)
//   - BOS loading (detect industry → load knowledge pack)
//   - Topological sort of stages based on dependencies
//   - Parallel execution of independent stages
//   - Quality gates between stages (artifact validation)
//   - Human approval checkpoints
//   - Context budget management (stay within token limits)
//   - Checkpoint / resume for long-running pipelines
//   - Dual output: machine-readable JSON + human-readable Markdown
//
// Usage:
//   const orchestrator = new Orchestrator(config);
//   const result = await orchestrator.run('Build a SaaS tool...');
//   // or
//   const result = await orchestrator.runFromManifest(manifest);
// ──────────────────────────────────────────────────────────────────────────────

import { EventEmitter } from 'events';
import type {
  StageDefinition,
  StageContext,
  StageResult,
  OrchestratorConfig,
  ProjectManifest,
  LLMAdapterInterface,
  IntentResult,
  BOSContext,
  QualityGate,
  GateResult,
  HumanApproval,
  RuntimeContext,
} from './types.js';
import { StageStatus, IntentType, ArtifactType } from './types.js';
import { ArtifactStore } from './artifact-store.js';
import { ExecutionTracker } from './execution-tracker.js';
import { createStageContext } from './context-manager.js';
import { AgentRegistry } from './agent-registry.js';
import { BOSLoader } from './bos-loader.js';
import { ContextBudgetManager } from './context-budget.js';
import { QualityGateRunner, DEFAULT_QUALITY_GATES } from './quality-gates.js';
import { routeIntent } from './intent-router.js';
import { RuntimeEngine } from './runtime/runtime-engine.js';

// ─── Built-in Stages ─────────────────────────────────────────────────────────

import { ProjectIntakeStage } from './stages/project-intake.js';
import { ResearchStage } from './stages/research.js';
import { BusinessAnalysisStage } from './stages/business-analysis.js';
import { ArchitectureStage } from './stages/architecture.js';
import { DatabaseDesignStage } from './stages/database-design.js';
import { ApiDesignStage } from './stages/api-design.js';
import { FrontendDesignStage } from './stages/frontend-design.js';
import { IntegrationStage } from './stages/integration.js';
import { QualityAssuranceStage } from './stages/quality-assurance.js';
import { DeploymentStage } from './stages/deployment.js';
import { DocumentationStage } from './stages/documentation.js';
import { BuildStage } from './stages/build.js';
import { ReviewBoardStage } from './stages/review-board.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrchestratorResult {
  success: boolean;
  artifacts: Record<string, unknown>;
  stageResults: Map<string, StageResult>;
  gateResults: GateResult[];
  intentResult?: IntentResult | undefined;
  bosContext?: BOSContext | undefined;
  durationMs: number;
  totalLlmCalls: number;
  totalTokens: number;
  contextBudgetReport: string;
}

export interface OrchestratorEvent {
  type: string;
  stageId: string;
  message: string;
  timestamp: number;
  data?: Record<string, unknown> | undefined;
}

// ─── Default Config ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxConcurrency: 3,
  defaultMaxRetries: 2,
  retryBaseDelayMs: 1000,
  retryMaxDelayMs: 30000,
  stageTimeoutSec: 180,
  enableCheckpoints: true,
  enableLLM: true,
  workingDirectory: '.build-anything',
  maxTokensPerCall: 8192,
  defaultTemperature: 0.2,
  contextBudgetTokens: 100_000,
  requireApproval: false,
  approvalHandler: undefined,
  qualityGates: DEFAULT_QUALITY_GATES,
  dualOutput: true,
  bosPacksDir: '.build-anything/bos-packs',
};

// ─── Topological Sort ─────────────────────────────────────────────────────────

function topologicalSort(stages: StageDefinition[]): StageDefinition[][] {
  const stageMap = new Map<string, StageDefinition>();
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const stage of stages) {
    stageMap.set(stage.meta.id, stage);
    inDegree.set(stage.meta.id, 0);
    adjList.set(stage.meta.id, []);
  }

  for (const stage of stages) {
    for (const dep of stage.meta.dependencies) {
      if (adjList.has(dep)) {
        adjList.get(dep)!.push(stage.meta.id);
        inDegree.set(stage.meta.id, (inDegree.get(stage.meta.id) ?? 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const levels: string[][] = [];

  while (queue.length > 0) {
    const level = [...queue];
    levels.push(level);
    queue.length = 0;

    for (const id of level) {
      const deps = adjList.get(id) ?? [];
      for (const dep of deps) {
        const newDegree = (inDegree.get(dep) ?? 1) - 1;
        inDegree.set(dep, newDegree);
        if (newDegree === 0) queue.push(dep);
      }
    }
  }

  return levels.map(level =>
    level.map(id => stageMap.get(id)!).filter(Boolean)
  );
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class Orchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  private stages: Map<string, StageDefinition> = new Map();
  private artifacts: ArtifactStore;
  private tracker: ExecutionTracker;
  private agentRegistry: AgentRegistry;
  private bosLoader: BOSLoader;
  private contextBudget: ContextBudgetManager;
  private qualityGateRunner: QualityGateRunner;
  private llmAdapter?: LLMAdapterInterface;
  private bosContext?: BOSContext;
  private runtimeEngine: RuntimeEngine;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.artifacts = new ArtifactStore(this.config.workingDirectory);
    this.tracker = new ExecutionTracker(this.config.workingDirectory);
    this.agentRegistry = new AgentRegistry();
    this.bosLoader = new BOSLoader(this.config.bosPacksDir);
    this.contextBudget = new ContextBudgetManager(
      this.config.contextBudgetTokens,
      this.config.maxTokensPerCall,
    );
    this.qualityGateRunner = new QualityGateRunner(
      this.config.qualityGates,
      this.artifacts,
      this.config.approvalHandler?.requestApproval.bind(this.config.approvalHandler),
    );
    this.runtimeEngine = new RuntimeEngine({
      projectRoot: this.config.workingDirectory,
    });
    this.registerDefaultStages();
  }

  private registerDefaultStages(): void {
    const defaultStages: StageDefinition[] = [
      new ProjectIntakeStage(),
      new ResearchStage(),
      new BusinessAnalysisStage(),
      new ArchitectureStage(),
      new DatabaseDesignStage(),
      new ApiDesignStage(),
      new FrontendDesignStage(),
      new IntegrationStage(),
      new QualityAssuranceStage(),
      new BuildStage(),
      new ReviewBoardStage(),
      new DeploymentStage(),
      new DocumentationStage(),
    ];

    for (const stage of defaultStages) {
      this.stages.set(stage.meta.id, stage);
    }
  }

  registerStage(stage: StageDefinition): void {
    this.stages.set(stage.meta.id, stage);
  }

  setLLMAdapter(adapter: LLMAdapterInterface): void {
    this.llmAdapter = adapter;
  }

  getAgentRegistry(): AgentRegistry {
    return this.agentRegistry;
  }

  getArtifactStore(): ArtifactStore {
    return this.artifacts;
  }

  getBOSLoader(): BOSLoader {
    return this.bosLoader;
  }

  getRuntimeEngine(): RuntimeEngine {
    return this.runtimeEngine;
  }

  /**
   * Self-healing build loop: reads review issues from artifact store,
   * applies auto-fixable suggestions, re-runs build with RetryEngine,
   * and stores results back in artifacts.
   */
  async selfHealFromReview(): Promise<{
    success: boolean;
    fixesApplied: number;
    iterations: number;
    remainingFailures: Array<{ file: string; message: string }>;
  }> {
    const reviewIssues = this.artifacts.read('review.issues') as Array<{
      file?: string;
      suggestion: string;
      severity?: string;
      autoFixable?: boolean;
    }> | undefined;

    if (!reviewIssues || !Array.isArray(reviewIssues)) {
      this.log('info', 'Self-heal: no review issues found — skipping');
      return { success: true, fixesApplied: 0, iterations: 0, remainingFailures: [] };
    }

    const autoFixableIssues = reviewIssues
      .filter(i => i.autoFixable && i.file)
      .map(i => {
        const severity = i.severity;
        return { file: i.file!, suggestion: i.suggestion, ...(severity ? { severity } : {}) };
      });

    if (autoFixableIssues.length === 0) {
      this.log('info', 'Self-heal: no auto-fixable issues — skipping');
      return { success: true, fixesApplied: 0, iterations: 0, remainingFailures: [] };
    }

    this.log('info', `Self-heal: ${autoFixableIssues.length} auto-fixable issues found`);
    this.emitEvent({
      type: 'self-heal:start',
      stageId: 'pipeline',
      message: `Self-healing loop starting with ${autoFixableIssues.length} fixes`,
      timestamp: Date.now(),
    });

    const result = await this.runtimeEngine.selfHeal(autoFixableIssues, {
      maxIterations: 3,
    });

    this.artifacts.store('self-heal.result', result, 'json' as any, 'self-heal', 'Self-healing loop result');

    this.emitEvent({
      type: 'self-heal:complete',
      stageId: 'pipeline',
      message: `Self-heal: ${result.fixesApplied} fixes, ${result.iterations} iterations, success=${result.success}`,
      timestamp: Date.now(),
    });

    return {
      success: result.success,
      fixesApplied: result.fixesApplied,
      iterations: result.iterations,
      remainingFailures: result.remainingFailures,
    };
  }

  private createRuntimeContext(projectRoot?: string): RuntimeContext {
    const root = projectRoot ?? this.config.workingDirectory;
    const engine = new RuntimeEngine({ projectRoot: root });

    return {
      install: async () => {
        const result = await engine.install();
        return {
          status: result.status,
          exitCode: result.exitCode ?? 1,
          stdout: result.stdout,
          stderr: result.stderr,
          durationMs: result.durationMs,
          timedOut: result.timedOut,
        };
      },
      build: async (_cwd?: string, command?: string) => {
        const result = command
          ? await engine.getProcessManager().build(root, command)
          : await engine.build();
        return {
          status: result.status,
          exitCode: result.exitCode ?? 1,
          stdout: result.stdout,
          stderr: result.stderr,
          durationMs: result.durationMs,
          timedOut: result.timedOut,
        };
      },
      test: async (_cwd?: string, command?: string) => {
        const result = command
          ? await engine.getProcessManager().test(root, command)
          : await engine.test();
        return {
          status: result.status,
          exitCode: result.exitCode ?? 1,
          stdout: result.stdout,
          stderr: result.stderr,
          durationMs: result.durationMs,
          timedOut: result.timedOut,
        };
      },
      run: async () => {
        const result = await engine.run();
        return {
          success: result.success,
          install: result.install ? {
            status: result.install.status,
            exitCode: result.install.exitCode ?? 1,
            stdout: result.install.stdout,
            stderr: result.install.stderr,
            durationMs: result.install.durationMs,
            timedOut: result.install.timedOut,
          } : undefined,
          build: result.build ? {
            status: result.build.status,
            exitCode: result.build.exitCode ?? 1,
            stdout: result.build.stdout,
            stderr: result.build.stderr,
            durationMs: result.build.durationMs,
            timedOut: result.build.timedOut,
          } : undefined,
          test: result.test ? {
            status: result.test.status,
            exitCode: result.test.exitCode ?? 1,
            stdout: result.test.stdout,
            stderr: result.test.stderr,
            durationMs: result.test.durationMs,
            timedOut: result.test.timedOut,
          } : undefined,
          previewUrl: result.previewUrl,
          screenshots: result.screenshots.map(s => s.filePath),
          failures: result.failures.map(f => ({
            category: f.category,
            message: f.message,
            suggestedFix: f.suggestedFix,
          })),
          durationMs: result.durationMs,
        };
      },
      report: () => engine.report({
        success: true,
        install: undefined,
        build: undefined,
        test: undefined,
        logs: [],
        failures: [],
        retries: [],
        previewUrl: undefined,
        tunnelUrl: undefined,
        screenshots: [],
        visualDiffs: [],
        durationMs: 0,
      }),
      getFailures: () => {
        return engine.getLogCapture().getFailures().map(f => ({
          category: f.category,
          message: f.message,
          suggestedFix: f.suggestedFix,
          retryable: f.retryable,
        }));
      },
    };
  }

  // ─── Run from raw input (intent routing) ────────────────────────────────

  async run(
    input: string | ProjectManifest,
    llmAdapter?: LLMAdapterInterface,
  ): Promise<OrchestratorResult> {
    if (llmAdapter) this.llmAdapter = llmAdapter;

    let manifest: ProjectManifest;
    let intentResult: IntentResult | undefined;

    if (typeof input === 'string') {
      // Route intent
      intentResult = await routeIntent(input, this.llmAdapter);
      manifest = intentResult.manifest;
      this.emitEvent({
        type: 'intent:routed',
        stageId: 'pipeline',
        message: `Intent: ${intentResult.intent} (confidence: ${Math.round(intentResult.confidence * 100)}%)`,
        timestamp: Date.now(),
      });
    } else {
      manifest = input;
    }

    return this.runFromManifest(manifest, intentResult);
  }

  // ─── Run from manifest ──────────────────────────────────────────────────

  async runFromManifest(
    manifest: ProjectManifest,
    intentResult?: IntentResult,
  ): Promise<OrchestratorResult> {
    if (!this.llmAdapter) {
      throw new Error('No LLM adapter configured. Call setLLMAdapter() or pass one to run().');
    }

    const startTime = Date.now();

    // Phase 1: Load BOS knowledge
    this.bosContext = await this.bosLoader.load(manifest, this.llmAdapter);
    if (this.bosContext.pack) {
      this.emitEvent({
        type: 'bos:loaded',
        stageId: 'pipeline',
        message: `BOS pack loaded: ${this.bosContext.pack.name} (confidence: ${Math.round(this.bosContext.detectionConfidence * 100)}%)`,
        timestamp: Date.now(),
      });
    }

    // Phase 2: Execute pipeline
    const allStages = Array.from(this.stages.values());
    const levels = topologicalSort(allStages);
    const stageResults = new Map<string, StageResult>();
    const allGateResults: GateResult[] = [];
    let totalLlmCalls = 0;
    let totalTokens = 0;

    this.emitEvent({
      type: 'pipeline:start',
      stageId: 'pipeline',
      message: `Pipeline starting: ${allStages.length} stages in ${levels.length} levels`,
      timestamp: Date.now(),
    });

    try {
      for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
        const level = levels[levelIdx]!;
        const stageIds = level.map(s => s.meta.id);

        this.log('info', `Level ${levelIdx + 1}/${levels.length}: ${stageIds.join(', ')}`);

        const results = await this.executeLevel(level, manifest, stageResults);

        for (const [stageId, result] of results) {
          stageResults.set(stageId, result);
          totalLlmCalls += result.llmCalls;
          totalTokens += result.tokensUsed;

          this.contextBudget.recordUsage(stageId, result.tokensUsed);

          if (!result.success) {
            this.emitEvent({
              type: 'pipeline:error',
              stageId,
              message: `Pipeline failed at stage: ${stageId}`,
              timestamp: Date.now(),
            });

            return {
              success: false,
              artifacts: this.readAllArtifacts(),
              stageResults,
              gateResults: allGateResults,
              intentResult,
              bosContext: this.bosContext,
              durationMs: Date.now() - startTime,
              totalLlmCalls,
              totalTokens,
              contextBudgetReport: this.contextBudget.getReport(),
            };
          }

          // Phase 3: Run quality gates after each stage
          const gateResults = await this.qualityGateRunner.runGates(stageId);
          allGateResults.push(...gateResults);

          for (const gate of gateResults) {
            if (!gate.passed) {
              this.emitEvent({
                type: 'gate:failed',
                stageId,
                message: `Quality gate "${gate.gateId}" failed: ${gate.errors.join(', ')}`,
                timestamp: Date.now(),
              });

              // If blocking gate fails, pipeline fails
              const gateDef = this.config.qualityGates.find(g => g.id === gate.gateId);
              if (gateDef?.blocking) {
                return {
                  success: false,
                  artifacts: this.readAllArtifacts(),
                  stageResults,
                  gateResults: allGateResults,
                  intentResult,
                  bosContext: this.bosContext,
                  durationMs: Date.now() - startTime,
                  totalLlmCalls,
                  totalTokens,
                  contextBudgetReport: this.contextBudget.getReport(),
                };
              }
            }
          }
        }
      }

      this.emitEvent({
        type: 'pipeline:complete',
        stageId: 'pipeline',
        message: 'Pipeline completed successfully',
        timestamp: Date.now(),
      });

      return {
        success: true,
        artifacts: this.readAllArtifacts(),
        stageResults,
        gateResults: allGateResults,
        intentResult,
        bosContext: this.bosContext,
        durationMs: Date.now() - startTime,
        totalLlmCalls,
        totalTokens,
        contextBudgetReport: this.contextBudget.getReport(),
      };
    } catch (error) {
      this.emitEvent({
        type: 'pipeline:error',
        stageId: 'pipeline',
        message: `Pipeline failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now(),
      });

      return {
        success: false,
        artifacts: this.readAllArtifacts(),
        stageResults,
        gateResults: allGateResults,
        intentResult,
        bosContext: this.bosContext,
        durationMs: Date.now() - startTime,
        totalLlmCalls,
        totalTokens,
        contextBudgetReport: this.contextBudget.getReport(),
      };
    }
  }

  // ─── Level Execution ────────────────────────────────────────────────────

  private async executeLevel(
    stages: StageDefinition[],
    manifest: ProjectManifest,
    previousResults: Map<string, StageResult>,
  ): Promise<Map<string, StageResult>> {
    const results = new Map<string, StageResult>();
    const pendingStages = stages.filter(s => !this.tracker.isStageCompleted(s.meta.id));

    if (pendingStages.length === 0) return results;

    const batches = this.chunkArray(pendingStages, this.config.maxConcurrency);

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(stage => this.executeStageWithRetry(stage, manifest, previousResults))
      );

      for (let i = 0; i < batch.length; i++) {
        const stage = batch[i]!;
        const result = batchResults[i]!;

        if (result.status === 'fulfilled') {
          results.set(stage.meta.id, result.value);
        } else {
          results.set(stage.meta.id, {
            success: false,
            artifacts: {},
            warnings: [],
            error: result.reason?.message ?? 'Unknown error',
            durationMs: 0,
            llmCalls: 0,
            tokensUsed: 0,
          });
        }
      }
    }

    return results;
  }

  // ─── Stage Execution ────────────────────────────────────────────────────

  private async executeStageWithRetry(
    stage: StageDefinition,
    manifest: ProjectManifest,
    _previousResults: Map<string, StageResult>,
  ): Promise<StageResult> {
    const maxRetries = stage.meta.maxRetries;
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        this.emitEvent({
          type: 'stage:retry',
          stageId: stage.meta.id,
          message: `Retrying stage ${stage.meta.id} (attempt ${attempt + 1}/${maxRetries + 1})`,
          timestamp: Date.now(),
        });

        const delay = Math.min(this.config.retryBaseDelayMs * Math.pow(2, attempt - 1), this.config.retryMaxDelayMs);
        await this.sleep(delay);
      }

      this.emitEvent({
        type: 'stage:start',
        stageId: stage.meta.id,
        message: `Starting stage: ${stage.meta.name}`,
        timestamp: Date.now(),
      });

      this.tracker.stageStarted(stage.meta.id, maxRetries + 1);

      try {
        const emitFn = (event: string, data?: unknown) => {
          const eventData = data !== undefined ? (data as Record<string, unknown>) : undefined;
          this.emitEvent({ type: event, stageId: stage.meta.id, message: event, timestamp: Date.now(), data: eventData });
        };

        const ctx = createStageContext(
          stage.meta.id,
          this.tracker.getExecutionId(),
          stage.meta.inputs,
          stage.meta.outputs,
          manifest,
          this.artifacts,
          this.tracker,
          (params) => this.llmAdapter!.call(params),
          emitFn,
          this.bosContext,
          this.createRuntimeContext(),
        );

        const timeoutMs = (stage.meta.estimatedDurationSec ?? this.config.stageTimeoutSec) * 1000;
        const result = await Promise.race([
          stage.execute(ctx),
          this.timeout(timeoutMs, stage.meta.id),
        ]);

        const validation = stage.validate(result);

        if (!validation.valid) {
          lastError = `Validation failed: ${validation.errors.join(', ')}`;
          this.tracker.stageFailed(stage.meta.id, lastError);
          this.emitEvent({
            type: 'stage:error',
            stageId: stage.meta.id,
            message: lastError,
            timestamp: Date.now(),
          });
          continue;
        }

        const artifactKeys = Object.keys(result.artifacts);
        this.tracker.stageCompleted(stage.meta.id, artifactKeys, result.warnings, result.llmCalls, result.tokensUsed);

        this.emitEvent({
          type: 'stage:complete',
          stageId: stage.meta.id,
          message: `Completed stage: ${stage.meta.name} (${result.durationMs}ms)`,
          timestamp: Date.now(),
          data: { durationMs: result.durationMs, llmCalls: result.llmCalls },
        });

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        this.tracker.stageFailed(stage.meta.id, lastError);

        this.emitEvent({
          type: 'stage:error',
          stageId: stage.meta.id,
          message: `Stage ${stage.meta.id} failed: ${lastError}`,
          timestamp: Date.now(),
        });
      }
    }

    return {
      success: false,
      artifacts: {},
      warnings: [],
      error: `All ${maxRetries + 1} attempts failed. Last error: ${lastError}`,
      durationMs: 0,
      llmCalls: 0,
      tokensUsed: 0,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private readAllArtifacts(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const meta of this.artifacts.list()) {
      const content = this.artifacts.read(meta.key);
      if (content !== undefined) {
        result[meta.key] = content;
      }
    }
    return result;
  }

  private timeout(ms: number, stageId: string): Promise<StageResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Stage ${stageId} timed out after ${ms}ms`));
      }, ms);
    });
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private emitEvent(event: OrchestratorEvent): void {
    this.emit(event.type, event);
    this.emit('event', event);
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const prefix = `[orchestrator:${level}]`;
    if (level === 'error') console.error(prefix, message);
    else if (level === 'warn') console.warn(prefix, message);
    else console.log(prefix, message);
  }
}

export function createOrchestrator(config?: Partial<OrchestratorConfig>): Orchestrator {
  return new Orchestrator(config);
}
