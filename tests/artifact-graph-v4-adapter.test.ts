import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  runtimeTraceToArtifactGraph,
  validateV4Runtime,
} from '../src/orchestration/artifact-graph/v4-adapter.js';
import { validateRuntimeGraph } from '../src/orchestration/artifact-graph/validation.js';
import type { RuntimeTrace, RuntimeTraceEntry } from '../src/agents/runtime-trace.js';

function entry(layer: string, deps: string[], inputs: string[] = [], outputs: string[] = []): RuntimeTraceEntry {
  return {
    layer,
    owner: `module:${layer}`,
    inputs,
    outputs,
    artifactIds: outputs.map(o => `${layer}/${o}`),
    durationMs: 10,
    evidence: [`${layer} ran`],
    confidence: 1,
    validation: { passed: true, checks: ['ok'] },
    repairs: 0,
    dependencies: deps,
    version: '4.0.0',
    hash: 'abc',
  };
}

function trace(entries: RuntimeTraceEntry[]): RuntimeTrace {
  return {
    buildId: 'build-x',
    canonicalExecutor: 'DeterministicOrchestratorV4',
    version: '4.0.0',
    engine: 'build-same-engine',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    entries,
    summary: {
      totalLayers: entries.length,
      totalArtifacts: entries.reduce((s, e) => s + e.artifactIds.length, 0),
      totalDurationMs: entries.reduce((s, e) => s + e.durationMs, 0),
      failedLayers: entries.filter(e => !e.validation.passed).length,
      skippedLayers: 0,
    },
  };
}

describe('v4-adapter — runtimeTraceToArtifactGraph (R1 Step 2)', () => {
  it('builds a valid DAG from a clean trace', () => {
    const t = trace([
      entry('bre-v2', []),
      entry('business-graph', ['bre-v2']),
      entry('knowledge-pack', ['business-graph']),
      entry('compile', ['knowledge-pack']),
    ]);
    const graph = runtimeTraceToArtifactGraph(t);
    expect(graph.allNodes().length).toBe(4);
    expect(graph.allEdges().length).toBe(3);
    const audit = validateRuntimeGraph(graph);
    expect(audit.passed).toBe(true);
  });

  it('flags a cyclic dependency as a critical failure', () => {
    const t = trace([
      entry('a', ['b']),
      entry('b', ['a']),
    ]);
    const graph = runtimeTraceToArtifactGraph(t);
    const audit = validateRuntimeGraph(graph);
    expect(audit.passed).toBe(false);
    expect(audit.issues.some(i => i.type === 'cycle')).toBe(true);
  });

  it('validateV4Runtime reads a persisted trace and audits the graph', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v4rt-'));
    const ws = path.join(dir, 'ws-1');
    fs.mkdirSync(path.join(ws, '.build-artifacts'), { recursive: true });
    const t = trace([
      entry('bre-v2', []),
      entry('business-graph', ['bre-v2']),
      entry('knowledge-pack', ['business-graph']),
    ]);
    fs.writeFileSync(path.join(ws, '.build-artifacts', 'runtime-trace.json'), JSON.stringify(t));
    const { graph, runtimeValidation } = validateV4Runtime('ws-1', dir);
    expect(graph.allNodes().length).toBe(3);
    expect(runtimeValidation.passed).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
