// ─── RuntimeTrace (Phase R1, Step 1) ──────────────────────────────
// Emitted by the canonical production runtime (DeterministicOrchestratorV4)
// for every build. Captures per-layer provenance so that every artifact
// produced by a build has traceable ownership, inputs, outputs, validation,
// and evidence. Persisted to `.build-artifacts/runtime-trace.json`.

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface RuntimeTraceValidation {
  passed: boolean;
  checks: string[];
}

export interface RuntimeTraceEntry {
  layer: string;          // logical layer name, e.g. 'bre-v2', 'build-artifacts'
  owner: string;          // module/agent that owns this layer
  inputs: string[];       // input artifact keys
  outputs: string[];      // output artifact keys
  artifactIds: string[];  // concrete artifact file ids produced
  durationMs: number;     // wall-clock duration of the layer
  evidence: string[];     // how we know the layer ran (paths, log markers)
  confidence: number;     // confidence score for this layer
  validation: RuntimeTraceValidation;
  repairs: number;        // number of self-heals applied
  dependencies: string[]; // layers this layer depends on
  version: string;        // engine version
  hash: string;           // hash of the layer's primary output
}

export interface RuntimeTraceLayerMeta {
  layer: string;
  owner: string;
  inputs?: string[];
  dependencies?: string[];
}

interface Span {
  meta: RuntimeTraceLayerMeta;
  startMs: number;
  evidence: string[];
  outputs: string[];
  artifactIds: string[];
  validationChecks: string[];
  repairs: number;
  confidence: number;
}

export interface RuntimeTraceSummary {
  totalLayers: number;
  totalArtifacts: number;
  totalDurationMs: number;
  failedLayers: number;
  skippedLayers: number;
}

export interface RuntimeTrace {
  buildId: string;
  canonicalExecutor: 'DeterministicOrchestratorV4';
  version: string;
  engine: string;
  startedAt: string;
  completedAt?: string;
  entries: RuntimeTraceEntry[];
  summary: RuntimeTraceSummary;
}

export const ENGINE_VERSION = '4.0.0';

export class RuntimeTracer {
  private readonly version: string;
  private readonly engine = 'build-same-engine';
  private readonly startedAt: string;
  private spans = new Map<string, Span>();
  private entries: RuntimeTraceEntry[] = [];

  constructor(version: string = ENGINE_VERSION) {
    this.version = version;
    this.startedAt = new Date().toISOString();
  }

  /** Open a span for a layer. Safe to call once per layer. */
  beginSpan(meta: RuntimeTraceLayerMeta): void {
    if (this.spans.has(meta.layer)) {
      console.warn(`[runtime-trace] beginSpan: duplicate layer "${meta.layer}" (ignored)`);
      return;
    }
    this.spans.set(meta.layer, {
      meta,
      startMs: Date.now(),
      evidence: [],
      outputs: [],
      artifactIds: [],
      validationChecks: [],
      repairs: 0,
      confidence: 0,
    });
  }

  /** Append an evidence string to an open span. */
  addEvidence(layer: string, evidence: string): void {
    const span = this.spans.get(layer);
    if (span) span.evidence.push(evidence);
  }

  /** Close a span, recording its results. */
  endSpan(
    layer: string,
    result: {
      outputs?: string[];
      artifactIds?: string[];
      evidence?: string[];
      confidence?: number;
      validationPassed?: boolean;
      validationChecks?: string[];
      repairs?: number;
      hash?: string;
    } = {}
  ): void {
    const span = this.spans.get(layer);
    if (!span) {
      console.warn(`[runtime-trace] endSpan: unknown layer "${layer}" (ignored)`);
      return;
    }
    const durationMs = Date.now() - span.startMs;
    this.entries.push({
      layer: span.meta.layer,
      owner: span.meta.owner,
      inputs: span.meta.inputs ?? [],
      outputs: result.outputs ?? span.outputs,
      artifactIds: result.artifactIds ?? span.artifactIds,
      durationMs,
      evidence: [...span.evidence, ...(result.evidence ?? [])],
      confidence: result.confidence ?? span.confidence,
      validation: {
        passed: result.validationPassed ?? true,
        checks: result.validationChecks ?? span.validationChecks,
      },
      repairs: result.repairs ?? span.repairs,
      dependencies: span.meta.dependencies ?? [],
      version: this.version,
      hash: result.hash ?? '',
    });
    this.spans.delete(layer);
  }

  hasOpenSpan(layer: string): boolean {
    return this.spans.has(layer);
  }

  /** Close any dangling spans (treated as failed) and produce the final trace. */
  finalize(buildId: string): RuntimeTrace {
    for (const [layer, span] of this.spans) {
      this.entries.push({
        layer: span.meta.layer,
        owner: span.meta.owner,
        inputs: span.meta.inputs ?? [],
        outputs: span.outputs,
        artifactIds: span.artifactIds,
        durationMs: Date.now() - span.startMs,
        evidence: span.evidence,
        confidence: span.confidence,
        validation: { passed: false, checks: ['span not closed before finalize'] },
        repairs: span.repairs,
        dependencies: span.meta.dependencies ?? [],
        version: this.version,
        hash: '',
      });
    }
    this.spans.clear();

    const totalDurationMs = this.entries.reduce((s, e) => s + e.durationMs, 0);
    return {
      buildId,
      canonicalExecutor: 'DeterministicOrchestratorV4',
      version: this.version,
      engine: this.engine,
      startedAt: this.startedAt,
      completedAt: new Date().toISOString(),
      entries: this.entries,
      summary: {
        totalLayers: this.entries.length,
        totalArtifacts: this.entries.reduce((s, e) => s + e.artifactIds.length, 0),
        totalDurationMs,
        failedLayers: this.entries.filter(e => !e.validation.passed).length,
        skippedLayers: this.entries.filter(e => e.artifactIds.length === 0 && e.validation.passed).length,
      },
    };
  }

  /** Persist the trace to `.build-artifacts/runtime-trace.json`. */
  static persist(workspacePath: string, trace: RuntimeTrace): string {
    const dir = path.join(workspacePath, '.build-artifacts');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, 'runtime-trace.json');
    fs.writeFileSync(filePath, JSON.stringify(trace, null, 2), 'utf-8');
    return filePath;
  }

  /** Compute a short hash for an artifact's content. */
  static hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  }
}
