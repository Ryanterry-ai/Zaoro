/**
 * Runtime Validation & Observability
 *
 * This module provides the tools to prove that every intelligence layer
 * participates in a real build.
 */

// Runtime Trace
export type {
  RuntimeTrace,
  LayerExecutionRecord,
  ProvenanceRecord,
  TokenUsage,
  TraceValidationResult,
  TraceValidationIssue,
  EvidenceCollection,
} from '../runtime-trace/types.js';

export {
  buildRuntimeTrace,
  validateTrace,
} from '../runtime-trace/types.js';

// Pipeline Inspector
export {
  generatePipelineReport,
  generateCompactReport,
  generateLayerReport,
  generateJSONReport,
} from '../pipeline-inspector/index.js';

// Blueprint Explorer
export type { ArtifactDescriptor } from '../blueprint-explorer/index.js';

export {
  ARTIFACT_REGISTRY,
  generateArtifactChain,
  generateArtifactReport,
  generateArtifactJSONReport,
} from '../blueprint-explorer/index.js';

// Benchmark Suite
export type { BenchmarkCase } from '../benchmark/suite.js';

export {
  BENCHMARK_SUITE,
  getBenchmarksByCategory,
  getBenchmarksByPriority,
  getBenchmarksByTag,
  getCategories,
  getTags,
} from '../benchmark/suite.js';

// Benchmark Runner
export type {
  BenchmarkResult,
  BenchmarkSuiteResult,
} from '../benchmark/runner.js';

export {
  runBenchmark,
  generateBenchmarkReport,
  generateSuiteReport,
} from '../benchmark/runner.js';
