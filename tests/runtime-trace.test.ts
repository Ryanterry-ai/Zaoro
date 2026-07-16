import { describe, it, expect } from 'vitest';
import { RuntimeTracer, ENGINE_VERSION, RuntimeTrace } from '../src/agents/runtime-trace.js';

describe('RuntimeTracer', () => {
  it('produces an empty trace with summary zeros when finalized with no spans', () => {
    const tracer = new RuntimeTracer();
    const trace = tracer.finalize('build-1');
    expect(trace.buildId).toBe('build-1');
    expect(trace.canonicalExecutor).toBe('DeterministicOrchestratorV4');
    expect(trace.version).toBe(ENGINE_VERSION);
    expect(trace.entries.length).toBe(0);
    expect(trace.summary.totalLayers).toBe(0);
    expect(trace.summary.totalArtifacts).toBe(0);
    expect(trace.summary.failedLayers).toBe(0);
  });

  it('records a span with all required fields', () => {
    const tracer = new RuntimeTracer('9.9.9');
    tracer.beginSpan({ layer: 'bre-v2', owner: 'BRE', inputs: ['prompt'], dependencies: [] });
    tracer.addEvidence('bre-v2', 'industry=saas');
    tracer.endSpan('bre-v2', {
      outputs: ['bre-context'],
      artifactIds: [],
      confidence: 0.9,
      evidence: ['entities=3'],
      hash: 'abc123',
    });

    const trace = tracer.finalize('build-2');
    expect(trace.entries.length).toBe(1);
    const entry = trace.entries[0];
    expect(entry.layer).toBe('bre-v2');
    expect(entry.owner).toBe('BRE');
    expect(entry.inputs).toEqual(['prompt']);
    expect(entry.outputs).toEqual(['bre-context']);
    expect(entry.artifactIds).toEqual([]);
    expect(entry.confidence).toBe(0.9);
    expect(entry.evidence).toContain('industry=saas');
    expect(entry.evidence).toContain('entities=3');
    expect(entry.validation.passed).toBe(true);
    expect(entry.hash).toBe('abc123');
    expect(entry.version).toBe('9.9.9');
    expect(entry.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('marks a layer as failed when validationPassed is false', () => {
    const tracer = new RuntimeTracer();
    tracer.beginSpan({ layer: 'file-write', owner: 'Orchestrator', inputs: ['render-result'] });
    tracer.endSpan('file-write', {
      artifactIds: ['src/app/page.tsx'],
      validationPassed: false,
      validationChecks: ['tsc'],
    });
    const trace = tracer.finalize('build-3');
    expect(trace.entries[0].validation.passed).toBe(false);
    expect(trace.summary.failedLayers).toBe(1);
  });

  it('captures repairs count', () => {
    const tracer = new RuntimeTracer();
    tracer.beginSpan({ layer: 'self-healing', owner: 'SelfHealingEngine', inputs: ['node-modules-ready'] });
    tracer.endSpan('self-healing', { artifactIds: ['.build-artifacts/07-self-healing.json'], repairs: 5 });
    const trace = tracer.finalize('build-4');
    expect(trace.entries[0].repairs).toBe(5);
  });

  it('treats unclosed spans as failed on finalize', () => {
    const tracer = new RuntimeTracer();
    tracer.beginSpan({ layer: 'dangling', owner: 'X' });
    const trace = tracer.finalize('build-5');
    expect(trace.entries.length).toBe(1);
    expect(trace.entries[0].validation.passed).toBe(false);
    expect(trace.entries[0].validation.checks).toContain('span not closed before finalize');
  });

  it('warns on duplicate beginSpan and unknown endSpan', () => {
    const tracer = new RuntimeTracer();
    tracer.beginSpan({ layer: 'dup', owner: 'X' });
    tracer.beginSpan({ layer: 'dup', owner: 'Y' }); // duplicate → ignored
    tracer.endSpan('unknown-layer'); // unknown → ignored
    const trace = tracer.finalize('build-6');
    expect(trace.entries.length).toBe(1);
    expect(trace.entries[0].layer).toBe('dup');
  });

  it('hashContent returns a 16-char hex string', () => {
    const h = RuntimeTracer.hashContent('hello');
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  it('persists trace to disk and can be re-read', () => {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rt-trace-'));
    const tracer = new RuntimeTracer();
    tracer.beginSpan({ layer: 'bre-v2', owner: 'BRE', inputs: ['prompt'] });
    tracer.endSpan('bre-v2', { outputs: ['bre-context'], artifactIds: [] });
    const trace = tracer.finalize('build-7');
    const p = RuntimeTracer.persist(dir, trace);
    expect(fs.existsSync(p)).toBe(true);
    const reread = JSON.parse(fs.readFileSync(p, 'utf-8'));
    expect(reread.buildId).toBe('build-7');
    expect(reread.entries.length).toBe(1);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
