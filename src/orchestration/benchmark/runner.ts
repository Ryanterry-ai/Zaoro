/**
 * Benchmark Runner - Executes pipeline against benchmark cases
 *
 * Runs the full pipeline for each benchmark and generates validation reports.
 */

import type { RuntimeTrace } from '../runtime-trace/types.js';
import { validateTrace } from '../runtime-trace/types.js';
import { generatePipelineReport, generateCompactReport } from '../pipeline-inspector/index.js';
import { BENCHMARK_SUITE, type BenchmarkCase } from './suite.js';

// ============================================================================
// BENCHMARK RUNNER
// ============================================================================

/**
 * Benchmark execution result
 */
export interface BenchmarkResult {
  /** Benchmark case */
  benchmark: BenchmarkCase;

  /** Pipeline trace */
  trace: RuntimeTrace | null;

  /** Validation result */
  validation: {
    valid: boolean;
    issues: Array<{
      severity: 'error' | 'warning' | 'info';
      message: string;
    }>;
  };

  /** Expected vs actual comparison */
  comparison: {
    industryMatch: boolean;
    businessModelMatch: boolean;
    pageCountMatch: boolean;
    pageTypesMatch: boolean;
    entitiesFound: string[];
    entitiesMissing: string[];
    workflowsFound: string[];
    workflowsMissing: string[];
    confidenceMet: boolean;
  };

  /** Execution time */
  duration: number;

  /** Status */
  status: 'passed' | 'failed' | 'error';
}

/**
 * Benchmark suite result
 */
export interface BenchmarkSuiteResult {
  /** Run identifier */
  runId: string;

  /** Start time */
  startTime: Date;

  /** End time */
  endTime: Date;

  /** Individual results */
  results: BenchmarkResult[];

  /** Summary statistics */
  summary: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    passRate: number;
    averageDuration: number;
    averageConfidence: number;
  };
}

/**
 * Run a single benchmark
 */
export async function runBenchmark(
  benchmark: BenchmarkCase,
  pipeline: (prompt: string) => Promise<RuntimeTrace>
): Promise<BenchmarkResult> {
  const startTime = Date.now();

  try {
    // Run pipeline
    const trace = await pipeline(benchmark.prompt);
    const duration = Date.now() - startTime;

    // Validate trace
    const validation = validateTrace(trace);

    // Compare expected vs actual
    const comparison = compareExpected(benchmark, trace);

    // Determine pass/fail
    const status = determineStatus(benchmark, trace, comparison);

    return {
      benchmark,
      trace,
      validation: {
        valid: validation.valid,
        issues: validation.issues.map(i => ({
          severity: i.severity,
          message: i.message,
        })),
      },
      comparison,
      duration,
      status,
    };
  } catch (error) {
    return {
      benchmark,
      trace: null,
      validation: {
        valid: false,
        issues: [{
          severity: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }],
      },
      comparison: {
        industryMatch: false,
        businessModelMatch: false,
        pageCountMatch: false,
        pageTypesMatch: false,
        entitiesFound: [],
        entitiesMissing: benchmark.expected.entities,
        workflowsFound: [],
        workflowsMissing: benchmark.expected.workflows,
        confidenceMet: false,
      },
      duration: Date.now() - startTime,
      status: 'error',
    };
  }
}

/**
 * Compare expected vs actual results
 */
function compareExpected(
  benchmark: BenchmarkCase,
  trace: RuntimeTrace
): BenchmarkResult['comparison'] {
  const bk = trace.businessKnowledge;

  // Industry match
  const industryMatch = bk?.discovery?.industry === benchmark.expected.industry;

  // Business model match
  const businessModelMatch = bk?.revenue?.model === benchmark.expected.businessModel;

  // Page count — use applicationBlueprint.routes if available
  const pageCount = trace.applicationBlueprint?.routes?.value?.length ?? 0;
  const pageCountMatch = pageCount >= benchmark.expected.minPages;

  // Page types
  const pageTypes = trace.applicationBlueprint?.routes?.value?.map((r) => (r as unknown as { type?: string }).type ?? '') ?? [];
  const pageTypesMatch = benchmark.expected.pageTypes.every(
    pt => pageTypes.includes(pt)
  );

  // Entities (simplified check)
  const entitiesFound = benchmark.expected.entities.filter(
    e => trace.applicationBlueprint !== null
  );
  const entitiesMissing = benchmark.expected.entities.filter(
    e => !entitiesFound.includes(e)
  );

  // Workflows (simplified check)
  const workflowsFound = benchmark.expected.workflows.filter(
    w => trace.applicationBlueprint !== null
  );
  const workflowsMissing = benchmark.expected.workflows.filter(
    w => !workflowsFound.includes(w)
  );

  // Confidence
  const averageConfidence = trace.layers.reduce((sum, l) => sum + l.confidence, 0) / trace.layers.length;
  const confidenceMet = averageConfidence >= benchmark.expected.minConfidence;

  return {
    industryMatch,
    businessModelMatch,
    pageCountMatch,
    pageTypesMatch,
    entitiesFound,
    entitiesMissing,
    workflowsFound,
    workflowsMissing,
    confidenceMet,
  };
}

/**
 * Determine pass/fail status
 */
function determineStatus(
  benchmark: BenchmarkCase,
  trace: RuntimeTrace,
  comparison: BenchmarkResult['comparison']
): 'passed' | 'failed' {
  // Must have all required artifacts
  if (!trace.businessKnowledge || !trace.executionBlueprint || !trace.rendererOutput) {
    return 'failed';
  }

  // Must match industry
  if (!comparison.industryMatch) {
    return 'failed';
  }

  // Must meet minimum pages
  if (!comparison.pageCountMatch) {
    return 'failed';
  }

  // Must meet confidence threshold
  if (!comparison.confidenceMet) {
    return 'failed';
  }

  return 'passed';
}

/**
 * Generate benchmark report
 */
export function generateBenchmarkReport(result: BenchmarkResult): string {
  const lines: string[] = [];

  lines.push(`  BENCHMARK: ${result.benchmark.name}`);
  lines.push('  ═'.repeat(40));
  lines.push(`  Status: ${result.status === 'passed' ? '✅ PASSED' : '❌ FAILED'}`);
  lines.push(`  Duration: ${result.duration}ms`);
  lines.push('');

  lines.push('  EXPECTED VS ACTUAL');
  lines.push('  ─'.repeat(30));
  lines.push(`  Industry:     ${result.comparison.industryMatch ? '✅' : '❌'} ${result.benchmark.expected.industry}`);
  lines.push(`  Business:     ${result.comparison.businessModelMatch ? '✅' : '❌'} ${result.benchmark.expected.businessModel}`);
  lines.push(`  Pages:        ${result.comparison.pageCountMatch ? '✅' : '❌'} >= ${result.benchmark.expected.minPages}`);
  lines.push(`  Page Types:   ${result.comparison.pageTypesMatch ? '✅' : '❌'}`);
  lines.push(`  Confidence:   ${result.comparison.confidenceMet ? '✅' : '❌'} >= ${(result.benchmark.expected.minConfidence * 100).toFixed(0)}%`);

  if (result.comparison.entitiesMissing.length > 0) {
    lines.push('');
    lines.push('  Missing Entities:');
    for (const entity of result.comparison.entitiesMissing) {
      lines.push(`    - ${entity}`);
    }
  }

  if (result.comparison.workflowsMissing.length > 0) {
    lines.push('');
    lines.push('  Missing Workflows:');
    for (const workflow of result.comparison.workflowsMissing) {
      lines.push(`    - ${workflow}`);
    }
  }

  if (result.validation.issues.length > 0) {
    lines.push('');
    lines.push('  VALIDATION ISSUES');
    lines.push('  ─'.repeat(30));
    for (const issue of result.validation.issues) {
      const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
      lines.push(`  ${icon} ${issue.message}`);
    }
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Generate suite report
 */
export function generateSuiteReport(suiteResult: BenchmarkSuiteResult): string {
  const lines: string[] = [];

  lines.push('═'.repeat(60));
  lines.push('  BENCHMARK SUITE RESULTS');
  lines.push('═'.repeat(60));
  lines.push('');
  lines.push(`  Run ID:     ${suiteResult.runId}`);
  lines.push(`  Duration:   ${suiteResult.endTime.getTime() - suiteResult.startTime.getTime()}ms`);
  lines.push('');
  lines.push('  SUMMARY');
  lines.push('  ─'.repeat(30));
  lines.push(`  Total:      ${suiteResult.summary.total}`);
  lines.push(`  Passed:     ${suiteResult.summary.passed} ✅`);
  lines.push(`  Failed:     ${suiteResult.summary.failed} ❌`);
  lines.push(`  Errors:     ${suiteResult.summary.errors} ⚠️`);
  lines.push(`  Pass Rate:  ${(suiteResult.summary.passRate * 100).toFixed(1)}%`);
  lines.push(`  Avg Time:   ${suiteResult.summary.averageDuration.toFixed(0)}ms`);
  lines.push(`  Avg Conf:   ${(suiteResult.summary.averageConfidence * 100).toFixed(1)}%`);
  lines.push('');

  lines.push('  RESULTS BY CATEGORY');
  lines.push('  ─'.repeat(30));

  const categories = [...new Set(suiteResult.results.map(r => r.benchmark.category))];
  for (const category of categories) {
    const categoryResults = suiteResult.results.filter(r => r.benchmark.category === category);
    const passed = categoryResults.filter(r => r.status === 'passed').length;
    lines.push(`  ${category.padEnd(20)} ${passed}/${categoryResults.length} passed`);
  }

  lines.push('');
  lines.push('═'.repeat(60));

  return lines.join('\n');
}
