/**
 * Runtime Trace - Records every artifact produced during a build
 *
 * This is the core observability type that captures the complete pipeline execution.
 * Every build generates a RuntimeTrace that can be inspected, visualized, and validated.
 */

import type { BusinessKnowledge } from '../business-intelligence/types.js';
import type { ExperienceBlueprint } from '../experience-intelligence/types.js';
import type { ContentBlueprint } from '../content-intelligence/types.js';
import type { DesignDecision } from '../design-intelligence/types.js';
import type { SolutionArchitecture } from '../technology-planner/types.js';
import type { ApplicationBlueprint } from '../application-blueprint/types.js';
import type { ExecutionBlueprint } from '../execution-blueprint/types.js';
import type { RendererOutput } from '../renderer-engine/types.js';
import type { EvidenceCollection } from '../knowledge-acquisition/types.js';

// Re-export canonical EvidenceCollection for convenience
export type { EvidenceCollection } from '../knowledge-acquisition/types.js';

// ============================================================================
// RUNTIME TRACE TYPES
// ============================================================================

/**
 * Layer execution record - captures what happened at each pipeline stage
 */
export interface LayerExecutionRecord {
  /** Layer name */
  layer: string;

  /** Execution status */
  status: 'completed' | 'skipped' | 'failed' | 'placeholder';

  /** Input artifacts consumed */
  inputs: string[];

  /** Output artifact produced */
  output: string | null;

  /** Confidence score (0-1) */
  confidence: number;

  /** Execution time in milliseconds */
  duration: number;

  /** Timestamp */
  timestamp: Date;

  /** Evidence of execution (logs, decisions made) */
  evidence: string[];

  /** Provenance chain */
  provenance: ProvenanceRecord[];

  /** Reasoning summary */
  reasoning: string;

  /** Token usage (if LLM was used) */
  tokenUsage?: TokenUsage;

  /** Error message if failed */
  error?: string;
}

/**
 * Provenance record - tracks where a decision came from
 */
export interface ProvenanceRecord {
  /** Rule or source that produced this */
  ruleId: string;

  /** Confidence in this decision */
  confidence: number;

  /** When this decision was made */
  timestamp: Date;

  /** Reference to source material */
  sourceRef?: string;
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  /** Input tokens */
  input: number;

  /** Output tokens */
  output: number;

  /** Total tokens */
  total: number;

  /** Model used */
  model?: string;

  /** Cost estimate (optional) */
  costEstimate?: number;
}

/**
 * Complete Runtime Trace - the single source of truth for a build
 */
export interface RuntimeTrace {
  /** Unique build identifier */
  id: string;

  /** Build start time */
  startTime: Date;

  /** Build end time (null if still running) */
  endTime: Date | null;

  /** Original prompt */
  prompt: string;

  /** Overall status */
  status: 'running' | 'completed' | 'failed' | 'partial';

  /** Layer execution records */
  layers: LayerExecutionRecord[];

  // --------------------------------------------------------------------------
  // CANONICAL ARTIFACTS
  // --------------------------------------------------------------------------

  /** Business Knowledge artifact */
  businessKnowledge: BusinessKnowledge | null;

  /** Evidence Collection artifact */
  evidenceCollection: EvidenceCollection | null;

  /** Experience Blueprint artifact */
  experienceBlueprint: ExperienceBlueprint | null;

  /** Content Blueprint artifact */
  contentBlueprint: ContentBlueprint | null;

  /** Design Decision artifact */
  designDecision: DesignDecision | null;

  /** Solution Architecture artifact */
  solutionArchitecture: SolutionArchitecture | null;

  /** Application Blueprint artifact */
  applicationBlueprint: ApplicationBlueprint | null;

  /** Execution Blueprint artifact */
  executionBlueprint: ExecutionBlueprint | null;

  /** Renderer Output artifact */
  rendererOutput: RendererOutput | null;

  // --------------------------------------------------------------------------
  // METADATA
  // --------------------------------------------------------------------------

  /** Generated files count */
  generatedFilesCount: number;

  /** Total execution time in milliseconds */
  totalDuration: number;

  /** Total token usage across all layers */
  totalTokenUsage: TokenUsage;

  /** Pipeline version */
  pipelineVersion: string;

  /** Environment info */
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
  };
}

/**
 * Evidence Collection - placeholder type (not yet implemented)
 */
// ============================================================================
// TRACE BUILDER
// ============================================================================

/**
 * Build a RuntimeTrace from pipeline execution
 */
export function buildRuntimeTrace(params: {
  id: string;
  prompt: string;
  startTime: Date;
  endTime: Date | null;
  status: RuntimeTrace['status'];
  layers: LayerExecutionRecord[];
  businessKnowledge: BusinessKnowledge | null;
  evidenceCollection: EvidenceCollection | null;
  experienceBlueprint: ExperienceBlueprint | null;
  contentBlueprint: ContentBlueprint | null;
  designDecision: DesignDecision | null;
  solutionArchitecture: SolutionArchitecture | null;
  applicationBlueprint: ApplicationBlueprint | null;
  executionBlueprint: ExecutionBlueprint | null;
  rendererOutput: RendererOutput | null;
  generatedFilesCount: number;
  totalDuration: number;
  totalTokenUsage: TokenUsage;
}): RuntimeTrace {
  return {
    ...params,
    pipelineVersion: '2.0.0',
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  };
}

// ============================================================================
// TRACE VALIDATION
// ============================================================================

/**
 * Validation result for a RuntimeTrace
 */
export interface TraceValidationResult {
  valid: boolean;
  issues: TraceValidationIssue[];
  summary: {
    totalLayers: number;
    completedLayers: number;
    skippedLayers: number;
    failedLayers: number;
    placeholderLayers: number;
    artifactsPresent: number;
    artifactsMissing: number;
  };
}

/**
 * Individual validation issue
 */
export interface TraceValidationIssue {
  severity: 'error' | 'warning' | 'info';
  layer: string;
  message: string;
  details?: unknown;
}

/**
 * Validate a RuntimeTrace
 */
export function validateTrace(trace: RuntimeTrace): TraceValidationResult {
  const issues: TraceValidationIssue[] = [];
  const layerNames = [
    'business-intelligence',
    'knowledge-acquisition',
    'experience-intelligence',
    'design-intelligence',
    'content-intelligence',
    'technology-planner',
    'application-blueprint',
    'execution-blueprint',
    'renderer'
  ];

  // Check layer execution
  let completedLayers = 0;
  let skippedLayers = 0;
  let failedLayers = 0;
  let placeholderLayers = 0;

  for (const layerName of layerNames) {
    const record = trace.layers.find(l => l.layer === layerName);

    if (!record) {
      issues.push({
        severity: 'error',
        layer: layerName,
        message: `Layer '${layerName}' was not executed`,
      });
      continue;
    }

    switch (record.status) {
      case 'completed':
        completedLayers++;
        break;
      case 'skipped':
        skippedLayers++;
        issues.push({
          severity: 'warning',
          layer: layerName,
          message: `Layer '${layerName}' was skipped`,
        });
        break;
      case 'failed':
        failedLayers++;
        issues.push({
          severity: 'error',
          layer: layerName,
          message: `Layer '${layerName}' failed: ${record.error}`,
        });
        break;
      case 'placeholder':
        placeholderLayers++;
        issues.push({
          severity: 'warning',
          layer: layerName,
          message: `Layer '${layerName}' used placeholder implementation`,
        });
        break;
    }
  }

  // Check artifacts
  const artifacts = [
    { name: 'businessKnowledge', value: trace.businessKnowledge },
    { name: 'evidenceCollection', value: trace.evidenceCollection },
    { name: 'experienceBlueprint', value: trace.experienceBlueprint },
    { name: 'contentBlueprint', value: trace.contentBlueprint },
    { name: 'designDecision', value: trace.designDecision },
    { name: 'solutionArchitecture', value: trace.solutionArchitecture },
    { name: 'applicationBlueprint', value: trace.applicationBlueprint },
    { name: 'executionBlueprint', value: trace.executionBlueprint },
    { name: 'rendererOutput', value: trace.rendererOutput },
  ];

  let artifactsPresent = 0;
  let artifactsMissing = 0;

  for (const artifact of artifacts) {
    if (artifact.value) {
      artifactsPresent++;
    } else {
      artifactsMissing++;
      issues.push({
        severity: 'error',
        layer: 'pipeline',
        message: `Artifact '${artifact.name}' is missing`,
      });
    }
  }

  // Check confidence
  const lowConfidenceLayers = trace.layers.filter(l => l.confidence < 0.7);
  for (const layer of lowConfidenceLayers) {
    issues.push({
      severity: 'warning',
      layer: layer.layer,
      message: `Layer '${layer.layer}' has low confidence: ${layer.confidence}`,
    });
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    summary: {
      totalLayers: layerNames.length,
      completedLayers,
      skippedLayers,
      failedLayers,
      placeholderLayers,
      artifactsPresent,
      artifactsMissing,
    },
  };
}
