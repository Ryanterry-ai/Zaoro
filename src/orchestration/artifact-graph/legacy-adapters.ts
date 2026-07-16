// ─── Legacy Stage Adapters (Phase 3) ───────────────────────────────
// Wraps each phase of deterministic-orchestrator-v4 as a StageContract
// node in the Artifact Graph. This lets us run the legacy orchestrator
// through the graph executor, comparing outputs with the old linear flow.

import type { StageContract } from './types.js';

/**
 * Returns the full set of StageContract nodes that mirror the
 * deterministic-orchestrator-v4 pipeline. Inputs/outputs are declared
 * from the phase analysis — edges are auto-discovered by the graph.
 */
export function legacyStageContracts(): StageContract[] {
  return [
    {
      stageId: 'bre-v2',
      name: 'BRE v2: Deterministic Business Reasoning',
      description: 'Resolve industry, business model, journeys, entities, compliance from user prompt.',
      inputs: [],  // reads prompt from context, not from artifact graph
      outputs: ['bre-context', 'bre-result', 'blueprint'],
      estimatedDurationSec: 2,
      maxRetries: 0,
    },
    {
      stageId: 'pipeline-4-layer',
      name: '4-Layer Pipeline (LeadAgent)',
      description: 'Research → Blueprint + Content + Design + Architecture (parallel) → Build → QA.',
      inputs: ['bre-context', 'bre-result'],
      outputs: [
        'render-result',
        'application-graph',
        'application-spec',
        'execution-blueprint',
        'component-spec-manifest',
        'full-stack-blueprint',
      ],
      estimatedDurationSec: 15,
      maxRetries: 1,
    },
    {
      stageId: 'plan-inspect',
      name: 'Plan Inspect Artifact',
      description: 'Write .plan-inspect.json for Live Object Inspector.',
      inputs: ['bre-context', 'bre-result', 'full-stack-blueprint', 'execution-blueprint', 'application-spec'],
      outputs: ['plan-inspect'],
      estimatedDurationSec: 0,
      skippable: true,
      maxRetries: 0,
    },
    {
      stageId: 'file-write',
      name: 'Write Generated Files to Disk',
      description: 'Write rendered .tsx/.ts/.css files to workspace src/.',
      inputs: ['render-result'],
      outputs: ['generated-files', 'generated-files-tracking'],
      estimatedDurationSec: 1,
      maxRetries: 0,
    },
    {
      stageId: 'npm-install',
      name: 'NPM Install Dependencies',
      description: 'Install npm dependencies from package.json.',
      inputs: ['generated-files'],
      outputs: ['node-modules-ready'],
      estimatedDurationSec: 10,
      maxRetries: 1,
    },
    {
      stageId: 'self-healing',
      name: 'TypeScript Self-Healing Audit',
      description: 'Audit generated TypeScript for type errors, auto-fix where possible.',
      inputs: ['node-modules-ready', 'generated-files'],
      outputs: ['healing-result', 'healed-files'],
      estimatedDurationSec: 5,
      skippable: true,
      maxRetries: 2,
    },
    {
      stageId: 'build-artifacts',
      name: 'Save Build Artifacts',
      description: 'Persist .build-artifacts/*.json (7-8 files) for inspection and replay.',
      inputs: [
        'bre-context', 'bre-result', 'full-stack-blueprint',
        'execution-blueprint', 'application-spec', 'render-result', 'healing-result',
      ],
      outputs: ['build-artifacts-dir'],
      estimatedDurationSec: 0,
      skippable: true,
      maxRetries: 0,
    },
    {
      stageId: 'ir-save',
      name: 'Save Intermediate Representation',
      description: 'Write .ir.json for follow-up builds and replay.',
      inputs: ['bre-context', 'bre-result', 'full-stack-blueprint', 'execution-blueprint', 'application-spec', 'render-result'],
      outputs: ['ir-artifact'],
      estimatedDurationSec: 0,
      skippable: true,
      maxRetries: 0,
    },
    {
      stageId: 'knowledge-candidates',
      name: 'Record Knowledge Candidates',
      description: 'Record runtime-learned knowledge as candidates in the Candidate Knowledge Store.',
      inputs: ['full-stack-blueprint', 'bre-result'],
      outputs: ['candidate-records'],
      estimatedDurationSec: 0,
      skippable: true,
      maxRetries: 0,
    },
    {
      stageId: 'knowledge-pack-compose',
      name: 'Compose Knowledge Pack',
      description: 'Compose a knowledge pack from primitive packs based on build context.',
      inputs: ['bre-context'],
      outputs: ['knowledge-pack'],
      estimatedDurationSec: 0,
      skippable: true,
      maxRetries: 0,
    },
    {
      stageId: 'build-report',
      name: 'Write Build Report',
      description: 'Write .build-report.json with build metadata and page results.',
      inputs: ['render-result', 'full-stack-blueprint', 'bre-context', 'healing-result'],
      outputs: ['build-report'],
      estimatedDurationSec: 0,
      maxRetries: 0,
    },
    {
      stageId: 'build-history',
      name: 'Save to Build History',
      description: 'Persist build metadata to .build-history/ for longitudinal tracking.',
      inputs: ['build-report'],
      outputs: ['build-history-entry'],
      estimatedDurationSec: 0,
      maxRetries: 0,
    },
  ];
}

/**
 * Build the artifact graph from legacy stage contracts.
 * Auto-discovers edges from input/output declarations.
 */
export function buildLegacyArtifactGraph(): import('./artifact-graph.js').ArtifactGraph {
  const { ArtifactGraph } = require('./artifact-graph.js');
  const graph = new ArtifactGraph();
  const contracts = legacyStageContracts();

  for (const contract of contracts) {
    graph.addNode(contract);
  }
  graph.discoverEdges();

  return graph;
}
