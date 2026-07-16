// ─── Artifact Graph Executor (Phase 3) ─────────────────────────────
// Runs an artifact graph: topologically sorts nodes, executes them in
// levels (parallel within a level), persists artifacts, and reports
// results. Behind the ARTIFACT_GRAPH_ENABLED feature flag.

import * as fs from 'fs';
import * as path from 'path';
import { ArtifactGraph } from './artifact-graph.js';
import { validateRuntimeGraph } from './validation.js';
import type {
  ArtifactExecutorOptions,
  GraphExecutionResult,
  NodeExecutionResult,
  StageContract,
} from './types.js';

/** Default options. */
const DEFAULT_OPTIONS: ArtifactExecutorOptions = {
  useArtifactGraph: false,
  maxConcurrency: 0,
  persistArtifacts: true,
  benchmarkMode: false,
  runtimeValidation: true,
};

/** Check the feature flag. */
export function isArtifactGraphEnabled(): boolean {
  return process.env.ARTIFACT_GRAPH_ENABLED === '1' || process.env.ARTIFACT_GRAPH_ENABLED === 'true';
}

export class ArtifactExecutor {
  private graph: ArtifactGraph;
  private options: ArtifactExecutorOptions;

  constructor(graph: ArtifactGraph, options?: Partial<ArtifactExecutorOptions>) {
    this.graph = graph;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute the full graph. Returns a GraphExecutionResult with per-node
   * results and all collected artifacts.
   */
  async execute(
    executionId: string,
    stageRunner: (nodeId: string, contract: StageContract, artifacts: Record<string, unknown>) => Promise<Record<string, unknown>>,
  ): Promise<GraphExecutionResult> {
    const startTime = Date.now();
    const nodeResults: NodeExecutionResult[] = [];

    // Validate the graph.
    const validation = this.graph.validate();
    if (!validation.valid) {
      throw new Error(`Artifact graph validation failed: ${validation.error}`);
    }

    // Runtime convergence audit (Phase R1, Step 4): fail on critical issues.
    if (this.options.runtimeValidation !== false) {
      const audit = validateRuntimeGraph(this.graph);
      if (!audit.passed) {
        const critical = audit.issues
          .filter(i => i.severity === 'error')
          .map(i => `  [${i.type}] ${i.message}`)
          .join('\n');
        throw new Error(`Runtime convergence audit failed:\n${critical}`);
      }
      for (const issue of audit.issues) {
        if (issue.severity === 'warning') {
          console.warn(`[runtime-graph] ${issue.type}: ${issue.message}`);
        }
      }
    }

    // Compute execution plan.
    const plan = this.graph.executionPlan();
    console.log(`[artifact-executor] Execution plan: ${plan.totalNodes} nodes, ${plan.levels.length} levels`);

    // Execute level by level.
    for (let i = 0; i < plan.levels.length; i++) {
      const level = plan.levels[i];
      console.log(`[artifact-executor] Level ${i + 1}/${plan.levels.length}: [${level.join(', ')}]`);

      if (this.options.maxConcurrency && this.options.maxConcurrency > 0 && level.length > 1) {
        // Parallel execution with concurrency limit.
        const chunks: string[][] = [];
        for (let j = 0; j < level.length; j += this.options.maxConcurrency) {
          chunks.push(level.slice(j, j + this.options.maxConcurrency));
        }
        for (const chunk of chunks) {
          const results = await Promise.all(chunk.map(nodeId => this.executeNode(nodeId, stageRunner)));
          nodeResults.push(...results);
        }
      } else {
        // Sequential execution (default — preserves deterministic behavior).
        for (const nodeId of level) {
          const result = await this.executeNode(nodeId, stageRunner);
          nodeResults.push(result);
        }
      }
    }

    // Persist artifacts if enabled.
    if (this.options.persistArtifacts && this.options.artifactsDir) {
      this.persistArtifacts(executionId);
    }

    const totalDurationMs = Date.now() - startTime;
    const allArtifacts = this.graph.collectArtifacts();
    const success = nodeResults.every(r => r.success);

    return {
      executionId,
      success,
      nodeResults,
      totalDurationMs,
      allArtifacts,
      plan,
    };
  }

  /** Execute a single node: gather inputs, run the stage, store outputs. */
  private async executeNode(
    nodeId: string,
    stageRunner: (nodeId: string, contract: StageContract, artifacts: Record<string, unknown>) => Promise<Record<string, unknown>>,
  ): Promise<NodeExecutionResult> {
    const node = this.graph.getNode(nodeId);
    if (!node) throw new Error(`Node not found: ${nodeId}`);

    // Skip if already completed (restored from checkpoint).
    if (node.status === 'completed') {
      return { nodeId, success: true, artifacts: node.artifacts, durationMs: 0, llmCalls: 0 };
    }

    // Check if all inputs are satisfied.
    const graphArtifacts = this.graph.collectArtifacts();
    for (const inputKey of node.contract.inputs) {
      if (!(inputKey in graphArtifacts)) {
        // Input not available — skip or fail based on skippable flag.
        if (node.contract.skippable) {
          this.graph.updateNode(nodeId, { status: 'skipped' });
          return { nodeId, success: true, artifacts: {}, durationMs: 0, llmCalls: 0, error: `Skipped: missing input ${inputKey}` };
        }
        this.graph.updateNode(nodeId, { status: 'failed', error: `Missing required input: ${inputKey}` });
        return { nodeId, success: false, artifacts: {}, durationMs: 0, llmCalls: 0, error: `Missing required input: ${inputKey}` };
      }
    }

    // Execute the stage.
    this.graph.updateNode(nodeId, { status: 'running' });
    const startMs = Date.now();
    let llmCalls = 0;

    try {
      const outputArtifacts = await stageRunner(nodeId, node.contract, graphArtifacts);
      const durationMs = Date.now() - startMs;

      // Store outputs in the node.
      this.graph.updateNode(nodeId, {
        status: 'completed',
        artifacts: outputArtifacts,
        durationMs,
        llmCalls,
      });

      return { nodeId, success: true, artifacts: outputArtifacts, durationMs, llmCalls };
    } catch (err) {
      const durationMs = Date.now() - startMs;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.graph.updateNode(nodeId, { status: 'failed', error: errorMsg, durationMs });
      return { nodeId, success: false, artifacts: {}, durationMs, llmCalls, error: errorMsg };
    }
  }

  /** Persist the graph state and artifacts to disk. */
  private persistArtifacts(executionId: string): void {
    const dir = this.options.artifactsDir!;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Save graph snapshot.
    const snapshot = this.graph.snapshot();
    fs.writeFileSync(
      path.join(dir, 'artifact-graph-snapshot.json'),
      JSON.stringify(snapshot, null, 2),
      'utf-8',
    );

    // Save all collected artifacts.
    const allArtifacts = this.graph.collectArtifacts();
    fs.writeFileSync(
      path.join(dir, 'artifact-graph-artifacts.json'),
      JSON.stringify(allArtifacts, null, 2),
      'utf-8',
    );

    console.log(`[artifact-executor] Persisted graph snapshot and ${Object.keys(allArtifacts).length} artifacts to ${dir}`);
  }
}
