/**
 * Renderer Engine Layer - Canonical Types
 *
 * OWNERSHIP: This layer owns code generation ONLY.
 * It is the SINGLE AUTHORITY for:
 * - Code file generation
 * - Component rendering
 * - Configuration file generation
 *
 * CONSTRAINTS:
 * - MUST NOT decide business logic
 * - MUST NOT decide experience flow
 * - MUST NOT decide content strategy
 * - MUST NOT decide visual system
 * - MUST NOT decide technology stack
 * - MUST NOT infer navigation, pages, interactions
 * - MUST consume ExecutionBlueprint from upstream
 * - MUST render blueprints deterministically
 *
 * The renderer is a dumb execution engine. It does not think.
 * It does not decide. It does not infer.
 * It simply renders the blueprints into code.
 */

import type { ExecutionBlueprint } from '../execution-blueprint/types.js';
import type { Provenance, ProvenanceAware } from '../experience-intelligence/types.js';

// ============================================================================
// RENDERER OUTPUT - Canonical Output
// ============================================================================

/**
 * RendererOutput - The output of code generation.
 */
export interface RendererOutput {
  /** Unique identifier */
  id: string;

  /** Timestamp of creation */
  createdAt: Date;

  /** Reference to upstream ExecutionBlueprint */
  executionBlueprintId: string;

  // --------------------------------------------------------------------------
  // GENERATED FILES
  // --------------------------------------------------------------------------

  /** Generated files */
  files: GeneratedFile[];

  // --------------------------------------------------------------------------
  // BUILD RESULT
  // --------------------------------------------------------------------------

  /** Build result */
  buildResult: BuildResult;

  // --------------------------------------------------------------------------
  // QUALITY GATES
  // --------------------------------------------------------------------------

  /** Quality gate results */
  qualityGateResults: QualityGateResult[];
}

// ============================================================================
// GENERATED FILES
// ============================================================================

export interface GeneratedFile {
  /** File path */
  path: string;

  /** File content */
  content: string;

  /** File type */
  type: 'component' | 'page' | 'layout' | 'config' | 'schema' | 'api' | 'style' | 'test' | 'other';

  /** File purpose */
  purpose: string;

  /** Was file created */
  created: boolean;

  /** Was file modified */
  modified: boolean;
}

// ============================================================================
// BUILD RESULT
// ============================================================================

export interface BuildResult {
  /** Did build succeed */
  success: boolean;

  /** Build command */
  command: string;

  /** Build output */
  output: string;

  /** Build errors */
  errors: string[];

  /** Build warnings */
  warnings: string[];

  /** Build duration (ms) */
  duration: number;
}

// ============================================================================
// QUALITY GATE RESULTS
// ============================================================================

export interface QualityGateResult {
  /** Gate name */
  name: string;

  /** Gate type */
  type: 'schema' | 'lint' | 'typecheck' | 'build' | 'test' | 'visual';

  /** Did gate pass */
  passed: boolean;

  /** Gate output */
  output: string;

  /** Gate errors */
  errors: string[];

  /** Gate warnings */
  warnings: string[];
}

// ============================================================================
// RENDERER CONFIGURATION
// ============================================================================

/**
 * Renderer configuration - how the renderer should operate.
 */
export interface RendererConfiguration {
  /** Renderer type */
  type: 'react' | 'nextjs' | 'flutter' | 'fastapi' | 'express' | 'vue' | 'svelte';

  /** Output directory */
  outputDir: string;

  /** Whether to overwrite existing files */
  overwrite: boolean;

  /** Whether to run build after generation */
  runBuild: boolean;

  /** Whether to run tests after generation */
  runTests: boolean;

  /** Whether to run lint after generation */
  runLint: boolean;

  /** Whether to run typecheck after generation */
  runTypecheck: boolean;
}

// ============================================================================
// LAYER INTERFACE
// ============================================================================

/**
 * Renderer Engine Layer interface.
 *
 * This layer consumes ExecutionBlueprint
 * and produces generated code files.
 * It is a DETERMINISTIC EXECUTION ENGINE - it does not think, decide, or infer.
 */
export interface IRendererEngineLayer {
  /** Layer identifier */
  readonly id: 'renderer';

  /** Layer name */
  readonly name: string;

  /** Layer version */
  readonly version: string;

  /**
   * Process ExecutionBlueprint and generate code.
   *
   * @param executionBlueprint - Upstream ExecutionBlueprint
   * @param configuration - Renderer configuration
   * @returns RendererOutput with generated files
   */
  process(
    executionBlueprint: ExecutionBlueprint,
    configuration: RendererConfiguration
  ): Promise<RendererOutput>;

  /**
   * Validate RendererOutput.
   *
   * @param output - Output to validate
   * @returns Validation result with issues
   */
  validate(output: RendererOutput): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    field?: string;
    fix?: string;
  }>;
}
