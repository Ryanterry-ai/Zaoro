/**
 * Observability - Debug Artifact Export
 *
 * Every build produces a folder like:
 * .build-anything/
 *    traces/
 *       01-business-knowledge.json
 *       02-evidence.json
 *       03-experience-blueprint.json
 *       04-design-blueprint.json
 *       05-content-blueprint.json
 *       06-solution-architecture.json
 *       07-application-blueprint.json
 *       08-execution-blueprint.json
 *       09-renderer-manifest.json
 *       build-report.json
 *
 * This lets you inspect exactly what each layer produced, compare builds,
 * debug issues, and verify that downstream layers are consuming the correct artifacts.
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface TraceEntry {
  /** Layer name */
  layer: string;

  /** Artifact type */
  artifactType: string;

  /** Artifact content */
  content: unknown;

  /** Timestamp */
  timestamp: Date;

  /** Execution time (ms) */
  executionTime: number;

  /** Provenance */
  provenance?: {
    layer: string;
    confidence: number;
    evidence: string[];
    timestamp: Date;
    reasoning: string;
  };
}

export interface BuildReport {
  /** Build ID */
  buildId: string;

  /** Build start time */
  startTime: Date;

  /** Build end time */
  endTime: Date;

  /** Build status */
  status: 'success' | 'failed' | 'partial';

  /** Original prompt */
  prompt: string;

  /** Layer execution times */
  layerExecutionTimes: Record<string, number>;

  /** Layer validation results */
  layerValidationResults: Record<string, { valid: boolean; issues: unknown[] }>;

  /** Total execution time (ms) */
  totalExecutionTime: number;

  /** Artifacts produced */
  artifacts: Array<{
    layer: string;
    artifactType: string;
    filePath: string;
    size: number;
  }>;

  /** Errors */
  errors: Array<{
    layer: string;
    message: string;
    timestamp: Date;
  }>;

  /** Warnings */
  warnings: string[];
}

// ============================================================================
// OBSERVABILITY MANAGER
// ============================================================================

export class ObservabilityManager {
  private outputDir: string;
  private traces: TraceEntry[] = [];
  private buildId: string;
  private startTime: Date;
  private layerExecutionTimes: Record<string, number> = {};
  private layerValidationResults: Record<string, { valid: boolean; issues: unknown[] }> = {};
  private errors: Array<{ layer: string; message: string; timestamp: Date }> = [];
  private warnings: string[] = [];
  private prompt: string = '';

  constructor(outputDir: string = '.build-anything') {
    this.outputDir = outputDir;
    this.buildId = `build-${Date.now()}`;
    this.startTime = new Date();
  }

  /**
   * Record a trace entry.
   */
  recordTrace(entry: Omit<TraceEntry, 'timestamp'>): void {
    this.traces.push({
      ...entry,
      timestamp: new Date()
    });
  }

  /**
   * Record layer execution time.
   */
  recordLayerExecutionTime(layer: string, time: number): void {
    this.layerExecutionTimes[layer] = time;
  }

  /**
   * Record layer validation result.
   */
  recordLayerValidation(layer: string, result: { valid: boolean; issues: unknown[] }): void {
    this.layerValidationResults[layer] = result;
  }

  /**
   * Record an error.
   */
  recordError(layer: string, message: string): void {
    this.errors.push({
      layer,
      message,
      timestamp: new Date()
    });
  }

  /**
   * Record a warning.
   */
  recordWarning(warning: string): void {
    this.warnings.push(warning);
  }

  /**
   * Set the original prompt.
   */
  setPrompt(prompt: string): void {
    this.prompt = prompt;
  }

  /**
   * Export all traces to files.
   */
  async exportTraces(): Promise<void> {
    const tracesDir = path.join(this.outputDir, 'traces');

    // Create directory if it doesn't exist
    if (!fs.existsSync(tracesDir)) {
      fs.mkdirSync(tracesDir, { recursive: true });
    }

    // Export each trace entry
    for (const trace of this.traces) {
      const filename = this.getTraceFilename(trace);
      const filepath = path.join(tracesDir, filename);

      fs.writeFileSync(filepath, JSON.stringify(trace, null, 2));
    }

    // Export build report
    const buildReport = this.generateBuildReport();
    const reportPath = path.join(tracesDir, 'build-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(buildReport, null, 2));

    console.log(`[Observability] Traces exported to ${tracesDir}`);
  }

  /**
   * Generate build report.
   */
  generateBuildReport(): BuildReport {
    const endTime = new Date();
    const totalExecutionTime = endTime.getTime() - this.startTime.getTime();

    return {
      buildId: this.buildId,
      startTime: this.startTime,
      endTime,
      status: this.errors.length === 0 ? 'success' : 'failed',
      prompt: this.prompt,
      layerExecutionTimes: this.layerExecutionTimes,
      layerValidationResults: this.layerValidationResults,
      totalExecutionTime,
      artifacts: this.traces.map(trace => ({
        layer: trace.layer,
        artifactType: trace.artifactType,
        filePath: this.getTraceFilename(trace),
        size: JSON.stringify(trace.content).length
      })),
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Get filename for a trace entry.
   */
  private getTraceFilename(trace: TraceEntry): string {
    const layerOrder: Record<string, number> = {
      'business-intelligence': 1,
      'knowledge-acquisition': 2,
      'experience-intelligence': 3,
      'design-intelligence': 4,
      'content-intelligence': 5,
      'technology-planner': 6,
      'application-blueprint': 7,
      'execution-blueprint': 8,
      'renderer': 9
    };

    const order = layerOrder[trace.layer] ?? 99;
    const paddedOrder = String(order).padStart(2, '0');
    const slug = trace.artifactType.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    return `${paddedOrder}-${slug}.json`;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createObservabilityManager(outputDir?: string): ObservabilityManager {
  return new ObservabilityManager(outputDir);
}
