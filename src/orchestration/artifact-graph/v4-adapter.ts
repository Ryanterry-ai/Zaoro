// ─── Artifact Graph ↔ V4 Adapter (Phase R1, Step 2) ─────────────────
// Makes the Artifact Graph Executor a concrete adapter over the canonical
// runtime (DeterministicOrchestratorV4). Instead of running its own stage
// runner, the executor can now run V4 and reconstruct the build's runtime
// graph from the persisted RuntimeTrace, then run the R1 Step 4 convergence
// audit (validateRuntimeGraph) over it. This guarantees ONE runtime: V4.

import * as fs from 'fs';
import * as path from 'path';
import { ArtifactGraph } from './artifact-graph.js';
import { validateRuntimeGraph } from './validation.js';
import type { RuntimeGraphValidationResult } from './validation.js';
import { DeterministicOrchestratorV4 } from '../../agents/deterministic-orchestrator-v4.js';
import type { GenerationResult, LLMConfig } from '../../types/index.js';
import type { RuntimeTrace } from '../../agents/runtime-trace.js';

/**
 * Reconstruct an ArtifactGraph from a persisted RuntimeTrace.
 * Each trace entry becomes a node; each `dependencies` entry becomes an edge.
 * This lets the R1 Step 4 audit validate the actual runtime that V4 produced.
 */
export function runtimeTraceToArtifactGraph(trace: RuntimeTrace): ArtifactGraph {
  const graph = new ArtifactGraph();
  const byLayer = new Map(trace.entries.map(e => [e.layer, e]));

  for (const e of trace.entries) {
    graph.addNode({
      stageId: e.layer,
      name: e.layer,
      inputs: e.inputs,
      outputs: e.outputs,
      skippable: false,
    });
  }

  for (const e of trace.entries) {
    for (const dep of e.dependencies) {
      if (byLayer.has(dep)) {
        graph.addEdge({ from: dep, to: e.layer, artifactKey: dep });
      }
    }
  }

  return graph;
}

export interface V4ArtifactGraphRun {
  v4: GenerationResult;
  graph: ArtifactGraph;
  runtimeValidation: RuntimeGraphValidationResult;
  trace?: RuntimeTrace;
  manifest?: Record<string, unknown>;
}

/**
 * Run a build through the canonical V4 runtime and audit its resulting
 * runtime graph. This is the ArtifactGraphExecutor's V4-backed execution path.
 */
export async function executeV4AsArtifactGraph(
  workspaceId: string,
  workspaceBase: string,
  input: string,
  llmConfig?: LLMConfig,
): Promise<V4ArtifactGraphRun> {
  const orch = new DeterministicOrchestratorV4(workspaceBase);
  const v4 = await orch.processInput(workspaceId, input, llmConfig);

  const artifactsDir = path.join(workspaceBase, workspaceId, '.build-artifacts');
  let trace: RuntimeTrace | undefined;
  let manifest: Record<string, unknown> | undefined;

  const tracePath = path.join(artifactsDir, 'runtime-trace.json');
  if (fs.existsSync(tracePath)) {
    trace = JSON.parse(fs.readFileSync(tracePath, 'utf-8')) as RuntimeTrace;
  }

  const graph = trace ? runtimeTraceToArtifactGraph(trace) : new ArtifactGraph();
  const runtimeValidation = validateRuntimeGraph(graph);

  const manifestPath = path.join(artifactsDir, 'capability-manifest.json');
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  }

  return { v4, graph, runtimeValidation, trace, manifest };
}

/**
 * Validate the runtime graph of an already-completed V4 build (no re-run).
 * Used by verification/benchmark harnesses.
 */
export function validateV4Runtime(workspaceId: string, workspaceBase: string): {
  graph: ArtifactGraph;
  runtimeValidation: RuntimeGraphValidationResult;
  trace?: RuntimeTrace;
} {
  const artifactsDir = path.join(workspaceBase, workspaceId, '.build-artifacts');
  const tracePath = path.join(artifactsDir, 'runtime-trace.json');
  let trace: RuntimeTrace | undefined;
  if (fs.existsSync(tracePath)) {
    trace = JSON.parse(fs.readFileSync(tracePath, 'utf-8')) as RuntimeTrace;
  }
  const graph = trace ? runtimeTraceToArtifactGraph(trace) : new ArtifactGraph();
  return { graph, runtimeValidation: validateRuntimeGraph(graph), trace };
}
