// ─── Feature-Flagged Orchestrator Integration (Phase 3) ────────────
// Wraps the existing handleBuildIntent to optionally route through the
// Artifact Graph Executor when ARTIFACT_GRAPH_ENABLED=1. Falls back
// to the legacy linear orchestrator by default.

import * as fs from 'fs';
import * as path from 'path';
import { ArtifactGraph } from './artifact-graph.js';
import { ArtifactExecutor, isArtifactGraphEnabled } from './executor.js';
import { legacyStageContracts } from './legacy-adapters.js';

export { isArtifactGraphEnabled } from './executor.js';

/**
 * Build an artifact graph from the legacy stage contracts and wire it
 * into the workspace directory. This is a drop-in enhancement that
 * preserves all legacy behavior.
 */
export function createArtifactGraphForBuild(workspaceDir: string): ArtifactGraph {
  const graph = new ArtifactGraph();
  const contracts = legacyStageContracts();

  for (const contract of contracts) {
    graph.addNode(contract);
  }

  const discovered = graph.discoverEdges();
  console.log(`[artifact-graph] Built graph: ${contracts.length} nodes, ${discovered.length} edges`);

  const validation = graph.validate();
  if (!validation.valid) {
    throw new Error(`Artifact graph invalid: ${validation.error}`);
  }

  return graph;
}

/**
 * Execute the artifact graph for a build, persisting results to
 * .build-artifacts/. Returns the executor result.
 */
export async function executeArtifactGraph(
  workspaceDir: string,
  stageRunner: (nodeId: string, contract: { stageId: string; inputs: string[]; outputs: string[] }, artifacts: Record<string, unknown>) => Promise<Record<string, unknown>>,
  executionId?: string,
): Promise<import('./types.js').GraphExecutionResult> {
  const graph = createArtifactGraphForBuild(workspaceDir);
  const executor = new ArtifactExecutor(graph, {
    persistArtifacts: true,
    artifactsDir: path.join(workspaceDir, '.build-artifacts'),
  });

  const id = executionId ?? `build-${Date.now()}`;
  return executor.execute(id, stageRunner);
}

/**
 * Check if the artifact graph should be used for a build.
 * Returns true when ARTIFACT_GRAPH_ENABLED=1 and the workspace exists.
 */
export function shouldUseArtifactGraph(workspaceDir?: string): boolean {
  if (!isArtifactGraphEnabled()) return false;
  if (workspaceDir && !fs.existsSync(workspaceDir)) return false;
  return true;
}
