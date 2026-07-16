// ─── Benchmark Harness (Phase 3) ───────────────────────────────────
// Compares the legacy linear orchestrator against the artifact graph
// executor on identical inputs. Produces a parity report with timing,
// artifact diffs, and quality metrics.

import * as fs from 'fs';
import * as path from 'path';
import type { GraphExecutionResult, NodeExecutionResult } from './types.js';

export interface BenchmarkRun {
  runId: string;
  prompt: string;
  timestamp: string;
  legacy: LegacyRunResult;
  artifactGraph: ArtifactGraphRunResult;
  comparison: ComparisonResult;
}

export interface LegacyRunResult {
  durationMs: number;
  success: boolean;
  artifactCount: number;
  artifacts: Record<string, unknown>;
  error?: string;
  /** File paths produced. */
  files?: string[];
}

export interface ArtifactGraphRunResult {
  durationMs: number;
  success: boolean;
  artifactCount: number;
  artifacts: Record<string, unknown>;
  plan: { levels: string[][]; totalNodes: number };
  nodeResults: NodeExecutionResult[];
  error?: string;
}

export interface ComparisonResult {
  /** Both runs succeeded. */
  bothSucceeded: boolean;
  /** Artifact key sets match. */
  artifactKeysMatch: boolean;
  /** Keys only in legacy. */
  onlyInLegacy: string[];
  /** Keys only in artifact graph. */
  onlyInGraph: string[];
  /** Timing comparison (negative = graph faster). */
  timingDeltaMs: number;
  timingDeltaPercent: number;
  /** Overall parity verdict. */
  verdict: 'parity' | 'graph-superior' | 'legacy-superior' | 'mismatch';
  /** Issues found. */
  issues: string[];
}

/** Run benchmark comparing legacy and artifact graph. */
export async function runBenchmark(params: {
  prompt: string;
  workspaceDir: string;
  runLegacy: (prompt: string) => Promise<LegacyRunResult>;
  runArtifactGraph: (prompt: string) => Promise<ArtifactGraphRunResult>;
}): Promise<BenchmarkRun> {
  const runId = `bench-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = new Date().toISOString();

  console.log(`[benchmark] Starting run ${runId}`);
  console.log(`[benchmark] Prompt: "${params.prompt.slice(0, 80)}..."`);

  // Run legacy first (deterministic baseline).
  console.log(`[benchmark] Running legacy orchestrator...`);
  const legacyStart = Date.now();
  const legacy = await params.runLegacy(params.prompt);
  legacy.durationMs = Date.now() - legacyStart;
  console.log(`[benchmark] Legacy: ${legacy.durationMs}ms, success=${legacy.success}, artifacts=${legacy.artifactCount}`);

  // Run artifact graph.
  console.log(`[benchmark] Running artifact graph executor...`);
  const graphStart = Date.now();
  const artifactGraph = await params.runArtifactGraph(params.prompt);
  artifactGraph.durationMs = Date.now() - graphStart;
  console.log(`[benchmark] Artifact graph: ${artifactGraph.durationMs}ms, success=${artifactGraph.success}, artifacts=${artifactGraph.artifactCount}`);

  // Compare.
  const comparison = compareRuns(legacy, artifactGraph);
  printComparison(comparison);

  // Persist benchmark report.
  const report: BenchmarkRun = { runId, prompt: params.prompt, timestamp, legacy, artifactGraph, comparison };
  const reportDir = path.join(params.workspaceDir, '.benchmarks');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, `${runId}.json`), JSON.stringify(report, null, 2), 'utf-8');
  console.log(`[benchmark] Report saved to ${reportDir}/${runId}.json`);

  return report;
}

function compareRuns(legacy: LegacyRunResult, graph: ArtifactGraphRunResult): ComparisonResult {
  const issues: string[] = [];

  const legacyKeys = new Set(Object.keys(legacy.artifacts));
  const graphKeys = new Set(Object.keys(graph.artifacts));
  const onlyInLegacy = [...legacyKeys].filter(k => !graphKeys.has(k));
  const onlyInGraph = [...graphKeys].filter(k => !legacyKeys.has(k));
  const artifactKeysMatch = onlyInLegacy.length === 0 && onlyInGraph.length === 0;

  const timingDeltaMs = graph.durationMs - legacy.durationMs;
  const timingDeltaPercent = legacy.durationMs > 0
    ? ((timingDeltaMs / legacy.durationMs) * 100)
    : 0;

  if (!legacy.success) issues.push('Legacy run failed');
  if (!graph.success) issues.push('Artifact graph run failed');
  if (onlyInLegacy.length > 0) issues.push(`Artifacts only in legacy: ${onlyInLegacy.join(', ')}`);
  if (onlyInGraph.length > 0) issues.push(`Artifacts only in graph: ${onlyInGraph.join(', ')}`);

  // Deep-compare shared artifacts.
  for (const key of [...legacyKeys].filter(k => graphKeys.has(k))) {
    const legacyVal = JSON.stringify(legacy.artifacts[key]);
    const graphVal = JSON.stringify(graph.artifacts[key]);
    if (legacyVal !== graphVal) {
      issues.push(`Artifact "${key}" differs between runs`);
    }
  }

  const bothSucceeded = legacy.success && graph.success;
  let verdict: ComparisonResult['verdict'];
  if (!bothSucceeded) {
    verdict = 'mismatch';
  } else if (artifactKeysMatch && issues.length === 0) {
    verdict = timingDeltaMs < 0 ? 'graph-superior' : timingDeltaMs > legacy.durationMs * 0.1 ? 'legacy-superior' : 'parity';
  } else {
    verdict = 'mismatch';
  }

  return {
    bothSucceeded,
    artifactKeysMatch,
    onlyInLegacy,
    onlyInGraph,
    timingDeltaMs,
    timingDeltaPercent,
    verdict,
    issues,
  };
}

function printComparison(c: ComparisonResult): void {
  console.log('\n┌─────────────────────────────────────────────────┐');
  console.log('│           BENCHMARK COMPARISON                  │');
  console.log('├─────────────────────────────────────────────────┤');
  console.log(`│ Both succeeded:    ${boolIcon(c.bothSucceeded)}                          │`);
  console.log(`│ Artifact keys:     ${boolIcon(c.artifactKeysMatch)}                          │`);
  console.log(`│ Timing delta:      ${c.timingDeltaMs > 0 ? '+' : ''}${c.timingDeltaMs}ms (${c.timingDeltaPercent.toFixed(1)}%) │`);
  console.log(`│ Verdict:           ${c.verdict.padEnd(30)}│`);
  if (c.issues.length > 0) {
    console.log('├─────────────────────────────────────────────────┤');
    for (const issue of c.issues) {
      console.log(`│ ⚠ ${issue.slice(0, 44).padEnd(44)}│`);
    }
  }
  console.log('└─────────────────────────────────────────────────┘\n');
}

function boolIcon(v: boolean): string {
  return v ? '✅' : '❌';
}
