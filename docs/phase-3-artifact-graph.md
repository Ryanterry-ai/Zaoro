# Phase 3: Artifact Graph Executor (Feature-Flagged)

**Status:** Complete (typecheck clean, 16 new tests passing)

## What changed

### New files
| File | Purpose |
|------|---------|
| `src/orchestration/artifact-graph/types.ts` | `StageContract`, `ArtifactNode`, `ArtifactEdge`, `ExecutionPlan`, `GraphExecutionResult` |
| `src/orchestration/artifact-graph/artifact-graph.ts` | `ArtifactGraph` class — DAG with validation, topological sort, edge discovery, snapshot/restore |
| `src/orchestration/artifact-graph/executor.ts` | `ArtifactExecutor` — runs graph level-by-level, persists artifacts, feature-flagged |
| `src/orchestration/artifact-graph/legacy-adapters.ts` | `legacyStageContracts()` — wraps all 12 orchestrator-v4 phases as graph nodes |
| `src/orchestration/artifact-graph/benchmark.ts` | `runBenchmark()` — compares legacy vs artifact graph outputs, produces parity report |
| `src/orchestration/artifact-graph/integration.ts` | Drop-in integration: `shouldUseArtifactGraph()`, `createArtifactGraphForBuild()`, `executeArtifactGraph()` |
| `src/orchestration/artifact-graph/index.ts` | Re-exports |
| `tests/artifact-graph.test.ts` | 16 tests (graph, executor, adapters, feature flag) |

## Architecture

```
User Prompt
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│                    ARTIFACT GRAPH                           │
│                                                             │
│  ┌─────────┐  ┌──────────────────┐  ┌────────────┐        │
│  │  bre-v2  │─▶│ pipeline-4-layer │─▶│ file-write │─▶ ...  │
│  └─────────┘  └──────────────────┘  └────────────┘        │
│       │              │                      │               │
│       │         ┌────┴────┐           ┌────┴────┐          │
│       │         │ parallel│           │ sequential│         │
│       │         └────┬────┘           └────┬────┘          │
│       │              │                      │               │
│       └──────────────┴──────────────────────┘               │
│                                                             │
│  Nodes: 12 stages (mirrors deterministic-orchestrator-v4)  │
│  Edges: auto-discovered from inputs/outputs declarations   │
│  Executor: topological sort → levels → sequential/parallel  │
└─────────────────────────────────────────────────────────────┘
     │
     ├── ARTIFACT_GRAPH_ENABLED=1 → artifact graph executor
     │
     └── default → legacy linear orchestrator (unchanged)
```

## Pipeline stages (mirrored from orchestrator-v4)

| Stage | Inputs | Outputs |
|-------|--------|---------|
| `bre-v2` | (prompt) | `bre-context`, `bre-result`, `full-stack-blueprint` |
| `pipeline-4-layer` | `bre-context`, `bre-result` | `render-result`, `application-graph`, `application-spec`, `execution-blueprint`, `component-spec-manifest`, `full-stack-blueprint` |
| `plan-inspect` | `bre-context`, `bre-result`, `full-stack-blueprint`, `execution-blueprint`, `application-spec` | `plan-inspect` |
| `file-write` | `render-result` | `generated-files`, `generated-files-tracking` |
| `npm-install` | `generated-files` | `node-modules-ready` |
| `self-healing` | `node-modules-ready`, `generated-files` | `healing-result`, `healed-files` |
| `build-artifacts` | `bre-context`, `bre-result`, `full-stack-blueprint`, `execution-blueprint`, `application-spec`, `render-result`, `healing-result` | `build-artifacts-dir` |
| `ir-save` | `bre-context`, `bre-result`, `full-stack-blueprint`, `execution-blueprint`, `application-spec`, `render-result` | `ir-artifact` |
| `knowledge-candidates` | `full-stack-blueprint`, `bre-result` | `candidate-records` |
| `knowledge-pack-compose` | `bre-context` | `knowledge-pack` |
| `build-report` | `render-result`, `full-stack-blueprint`, `bre-context`, `healing-result` | `build-report` |
| `build-history` | `build-report` | `build-history-entry` |

## Key design decisions

1. **Edges are auto-discovered** from stage contracts — no manual wiring. If stage A outputs `x` and stage B inputs `x`, the graph knows A → B.

2. **Skippable nodes** are allowed to be skipped when their required inputs don't exist. Non-skippable nodes with missing inputs cause a failure.

3. **Deterministic execution** — levels run sequentially, nodes within a level run sequentially by default. Set `maxConcurrency > 1` for parallel within levels.

4. **Snapshot/restore** — graph state can be persisted and restored for debugging or replay.

5. **Benchmark harness** — `runBenchmark()` runs both legacy and graph executor on the same prompt, produces a `ComparisonResult` with timing delta, artifact diff, and parity verdict.

## How to enable

```bash
# Enable artifact graph executor
ARTIFACT_GRAPH_ENABLED=1 npm run build

# Or via .env
echo "ARTIFACT_GRAPH_ENABLED=1" >> .env
```

## How to benchmark

```ts
import { runBenchmark } from '../orchestration/artifact-graph/benchmark.js';

const result = await runBenchmark({
  prompt: 'Build a restaurant ordering app',
  workspaceDir: '/path/to/workspace',
  runLegacy: async (prompt) => { /* run legacy orchestrator */ },
  runArtifactGraph: async (prompt) => { /* run artifact graph executor */ },
});

console.log(result.comparison.verdict); // 'parity' | 'graph-superior' | 'legacy-superior' | 'mismatch'
```

## Backward compatibility

- **Feature flag OFF (default):** Zero behavior change. The legacy orchestrator runs exactly as before.
- **Feature flag ON:** The artifact graph executor runs instead. All 12 stages are mapped 1:1 to the legacy phases.
- No existing files modified in this phase (only new files added).
- Rollback: set `ARTIFACT_GRAPH_ENABLED=0` or unset the env var.

## Rollback

Remove `ARTIFACT_GRAPH_ENABLED` from environment. All behavior reverts to legacy orchestrator. The `src/orchestration/artifact-graph/` directory can be removed without affecting any other module.
