# Phase R1 — Production Runtime Convergence

**Status:** Steps 1, 4, 5 complete. Step 2 (adapter wiring) and Step 3 (9-industry
runtime verification) pending.
**Goal:** Production runtime == documented architecture — exactly ONE canonical
execution path.

## Canonical decision (Step 2)
`DeterministicOrchestratorV4` (`src/agents/deterministic-orchestrator-v4.ts`) is the
**single production executor**. It is fed from `src/server.ts:304` (`POST /api/command`)
via `src/engine/build-queue.ts`.

The Phase 3 `ArtifactGraphExecutor` is **NOT** a competing path. It is an
**adapter/benchmark wrapper** around V4:
- It is not invoked in production (no caller).
- When used (feature flag `ARTIFACT_GRAPH_ENABLED=1` or the benchmark harness), every
  node's `stageRunner` is supplied by the caller and must delegate to V4 sub-operations.
- `validateRuntimeGraph` runs before execution and **fails the run** on critical issues.

## RuntimeTrace (Step 1)
`src/agents/runtime-trace.ts` — `RuntimeTracer` records every layer as a span with:
layer, owner (executor), inputs, outputs, artifact IDs, confidence, evidence,
validation result, repairs, content hash, duration. Persisted to
`.build-artifacts/runtime-trace.json` at the end of `handleBuildIntent`.

Wired into V4 with 12 instrumented spans: `bre-v2`, `pipeline-4-layer`, `plan-inspect`,
`file-write`, `npm-install`, `self-healing`, `build-artifacts`, `ir-save`,
`knowledge-candidates`, `knowledge-pack-compose`, `build-report`, `build-history`.

`ENGINE_VERSION = '4.0.0'` is stamped on every trace.

## Runtime Graph Validation (Step 4)
`src/orchestration/artifact-graph/validation.ts` — `validateRuntimeGraph(graph)`:
- **Critical (build fails):** `cycle`, `duplicate-ownership`.
- **Warning (surfaced, non-fatal):** `unreachable`, `dead-stage` (skippable + unconsumed
  output), `orphan-consumer`.
- Terminal/leaf outputs of non-skippable stages are expected (final build artifacts) and
  are NOT flagged.
- Wired into `ArtifactExecutor.execute()` (runs when `runtimeValidation !== false`).

## Deprecations (Step 5)
Marked `@deprecated`, kept for rollback (NOT deleted):
- `PipelineOrchestrator` (`src/orchestration/pipeline-orchestrator/orchestrator.ts`) — returns 410.
- `ExperienceOS` (`src/orchestration/experience-os/index.ts`) — only wired into dead
  PipelineOrchestrator. **Do NOT delete**: emotion/choreography/compiled-experience may
  be target architecture.
- `POST /api/bi/run` and `POST /api/pipeline` (`src/server.ts`) — return 410.
- `POST /api/build-anything` (`src/server.ts`) — secondary Build.Anything runtime; prefer
  `/api/command` (routes to V4). Kept for rollback.

## Dead / aspirational (no production caller)
- `BusinessIntelligencePipeline` — removed, 410 stub.
- `ValidationPipeline` — test-only.

## Remaining work
- **Step 2:** Make `ArtifactGraphExecutor` a concrete adapter delegating to V4; resolve the
  `/api/build-anything` (+ CLI) diverging runtime into the canonical path.
- **Step 3:** Run `/build-anything` (or `/api/command`) for 9 industries
  (restaurant, burger, footwear, hospital, CRM, ERP, marketplace, SaaS, manufacturing);
  assert every artifact has provenance + appears in `runtime-trace.json`, no skipped layers.
- Deprecate legacy only after parity + full benchmark; do not delete ExperienceOS v2.
