// ─── Artifact Graph Module Index (Phase 3) ─────────────────────────
export * from './types.js';
export { ArtifactGraph } from './artifact-graph.js';
export { ArtifactExecutor, isArtifactGraphEnabled } from './executor.js';
export { legacyStageContracts, buildLegacyArtifactGraph } from './legacy-adapters.js';
export { runBenchmark } from './benchmark.js';
export type { BenchmarkRun, LegacyRunResult, ArtifactGraphRunResult, ComparisonResult } from './benchmark.js';
export { createArtifactGraphForBuild, executeArtifactGraph, shouldUseArtifactGraph } from './integration.js';
export { executeV4AsArtifactGraph, validateV4Runtime, runtimeTraceToArtifactGraph } from './v4-adapter.js';
export type { V4ArtifactGraphRun } from './v4-adapter.js';
export { validateRuntimeGraph } from './validation.js';
export type { RuntimeGraphIssue, RuntimeGraphIssueType, RuntimeGraphValidationResult } from './validation.js';
