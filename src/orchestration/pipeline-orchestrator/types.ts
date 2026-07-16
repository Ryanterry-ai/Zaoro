/**
 * Pipeline Orchestrator - Deterministic Intelligence Pipeline
 *
 * This orchestrator runs the intelligence layers in strict order:
 *
 * Prompt
 *   ↓
 * Intent Intelligence
 *   ↓
 * Business Intelligence (owns BusinessKnowledge)
 *   ↓
 * Knowledge Acquisition (owns Evidence and Sources)
 *   ↓
 * Experience Intelligence (owns ExperienceBlueprint)
 *   ↓
 * Design Intelligence (owns DesignBlueprint)
 *   ↓
 * Content Intelligence (owns ContentBlueprint)
 *   ↓
 * Technology Planner (owns SolutionArchitecture)
 *   ↓
 * Application Blueprint (owns ApplicationBlueprint)
 *   ↓
 * Execution Blueprint (owns ExecutionBlueprint)
 *   ↓
 * Renderer (owns code generation)
 *   ↓
 * Quality Gates
 *   ↓
 * Preview
 *   ↓
 * Deployment
 *
 * CONSTRAINTS:
 * - Each layer has exactly one responsibility
 * - Each layer owns one canonical output object
 * - No downstream layer may infer, recreate or override knowledge owned by upstream
 * - Every decision has provenance (layer, confidence, evidence, timestamp, reasoning)
 * - No duplicated intelligence
 * - No hidden inference
 * - No keyword fallbacks inside downstream layers
 */

import type { BusinessKnowledge } from '../business-intelligence/types.js';
import type { ExperienceBlueprint } from '../experience-intelligence/types.js';
import type { ContentBlueprint } from '../content-intelligence/types.js';
import type { SolutionArchitecture } from '../technology-planner/types.js';
import type { ApplicationBlueprint } from '../application-blueprint/types.js';
import type { ExecutionBlueprint } from '../execution-blueprint/types.js';
import type { RendererOutput } from '../renderer-engine/types.js';
import type { EvidenceCollection } from '../knowledge-acquisition/types.js';

// ============================================================================
// PIPELINE STATE
// ============================================================================

/**
 * Pipeline state - tracks all artifacts through the pipeline.
 */
export interface PipelineState {
  /** Pipeline identifier */
  id: string;

  /** Pipeline start time */
  startTime: Date;

  /** Pipeline end time */
  endTime?: Date;

  /** Pipeline status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  /** Original user prompt */
  prompt: string;

  // --------------------------------------------------------------------------
  // ARTIFACTS (in pipeline order)
  // --------------------------------------------------------------------------

  /** Business Knowledge (from Business Intelligence) */
  businessKnowledge?: BusinessKnowledge;

  /** Evidence Collection (from Knowledge Acquisition) */
  evidenceCollection?: EvidenceCollection;

  /** Experience Blueprint (from Experience Intelligence) */
  experienceBlueprint?: ExperienceBlueprint;

  /** Experience Blueprint v2 (from Experience OS v2 — canonical) */
  experienceBlueprintV2?: import('../experience-os/types.js').ExperienceBlueprintV2;

  /** Design Blueprint (from Design Intelligence) */
  designBlueprint?: unknown; // Will be defined by Design Intelligence layer

  /** Content Blueprint (from Content Intelligence) */
  contentBlueprint?: ContentBlueprint;

  /** Solution Architecture (from Technology Planner) */
  solutionArchitecture?: SolutionArchitecture;

  /** Application Blueprint (from Application Blueprint) */
  applicationBlueprint?: ApplicationBlueprint;

  /** Execution Blueprint (from Execution Blueprint) */
  executionBlueprint?: ExecutionBlueprint;

  /** Renderer Output (from Renderer) */
  rendererOutput?: RendererOutput;

  // --------------------------------------------------------------------------
  // METADATA
  // --------------------------------------------------------------------------

  /** Layer execution times */
  layerExecutionTimes: Record<string, number>;

  /** Layer validation results */
  layerValidationResults: Record<string, ValidationResult>;

  /** Pipeline errors */
  errors: PipelineError[];

  /** Pipeline warnings */
  warnings: string[];
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    field?: string;
    fix?: string;
  }>;
}

// ============================================================================
// ERRORS
// ============================================================================

export interface PipelineError {
  /** Error layer */
  layer: string;

  /** Error message */
  message: string;

  /** Error details */
  details?: unknown;

  /** Error timestamp */
  timestamp: Date;
}

// ============================================================================
// PIPELINE EVENTS
// ============================================================================

export type PipelineEvent =
  | { type: 'pipeline-started'; state: PipelineState }
  | { type: 'layer-started'; layer: string; state: PipelineState }
  | { type: 'layer-completed'; layer: string; state: PipelineState; duration: number }
  | { type: 'layer-failed'; layer: string; state: PipelineState; error: PipelineError }
  | { type: 'validation-failed'; layer: string; state: PipelineState; result: ValidationResult }
  | { type: 'pipeline-completed'; state: PipelineState }
  | { type: 'pipeline-failed'; state: PipelineState; error: PipelineError };

// ============================================================================
// PIPELINE ORCHESTRATOR
// ============================================================================

/**
 * Pipeline Orchestrator - runs the intelligence layers in strict order.
 *
 * This is the central coordinator that:
 * 1. Runs each layer in sequence
 * 2. Passes upstream artifacts to downstream layers
 * 3. Validates each layer's output
 * 4. Tracks provenance for every decision
 * 5. Prevents duplicate intelligence
 * 6. Ensures strict ownership boundaries
 */
export interface IPipelineOrchestrator {
  /** Pipeline identifier */
  readonly id: string;

  /**
   * Execute the full pipeline.
   *
   * @param prompt - User prompt
   * @returns Pipeline state with all artifacts
   */
  execute(prompt: string): Promise<PipelineState>;

  /**
   * Execute a specific layer.
   *
   * @param layer - Layer to execute
   * @param state - Current pipeline state
   * @returns Updated pipeline state
   */
  executeLayer(layer: string, state: PipelineState): Promise<PipelineState>;

  /**
   * Validate pipeline state.
   *
   * @param state - Pipeline state to validate
   * @returns Validation result
   */
  validate(state: PipelineState): ValidationResult;

  /**
   * Get pipeline state.
   *
   * @returns Current pipeline state
   */
  getState(): PipelineState;

  /**
   * Subscribe to pipeline events.
   *
   * @param handler - Event handler
   * @returns Unsubscribe function
   */
  onEvent(handler: (event: PipelineEvent) => void): () => void;
}

// ============================================================================
// LAYER REGISTRY
// ============================================================================

/**
 * Layer registry - maps layer names to their implementations.
 */
export interface ILayerRegistry {
  /**
   * Register a layer.
   *
   * @param name - Layer name
   * @param layer - Layer implementation
   */
  register(name: string, layer: unknown): void;

  /**
   * Get a layer by name.
   *
   * @param name - Layer name
   * @returns Layer implementation
   */
  get(name: string): unknown;

  /**
   * Check if a layer is registered.
   *
   * @param name - Layer name
   * @returns Whether layer is registered
   */
  has(name: string): boolean;

  /**
   * Get all registered layer names.
   *
   * @returns Array of layer names
   */
  getNames(): string[];
}
