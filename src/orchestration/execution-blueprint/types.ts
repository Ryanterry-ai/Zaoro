/**
 * Execution Blueprint Layer - Canonical Types
 *
 * OWNERSHIP: This layer owns ExecutionBlueprint.
 * It is the SINGLE AUTHORITY for:
 * - Renderer instructions
 * - Build configuration
 * - File generation rules
 * - Component generation rules
 *
 * CONSTRAINTS:
 * - Must NOT decide business logic
 * - Must NOT decide experience flow
 * - Must NOT decide content strategy
 * - Must NOT decide visual system
 * - Must NOT decide technology stack
 * - Must consume ApplicationBlueprint from upstream
 * - Must produce ExecutionBlueprint for downstream
 */

import type { ApplicationBlueprint } from '../application-blueprint/types.js';
import type { Provenance, ProvenanceAware } from '../experience-intelligence/types.js';
import type { ValidationResult } from '../shared/types.js';

// Re-export shared types for convenience
export type { ValidationResult, ValidationIssue } from '../shared/types.js';

// ============================================================================
// EXECUTION BLUEPRINT - Canonical Output
// ============================================================================

/**
 * ExecutionBlueprint - The SINGLE AUTHORITY for renderer instructions.
 */
export interface ExecutionBlueprint {
  /** Unique identifier */
  id: string;

  /** Timestamp of creation */
  createdAt: Date;

  /** Version of the blueprint */
  version: string;

  /** Reference to upstream ApplicationBlueprint */
  applicationBlueprintId: string;

  // --------------------------------------------------------------------------
  // RENDERER INSTRUCTIONS
  // --------------------------------------------------------------------------

  /** Renderer configuration */
  renderer: ProvenanceAware<RendererConfig>;

  // --------------------------------------------------------------------------
  // BUILD CONFIGURATION
  // --------------------------------------------------------------------------

  /** Build configuration */
  buildConfig: ProvenanceAware<BuildConfig>;

  // --------------------------------------------------------------------------
  // FILE GENERATION RULES
  // --------------------------------------------------------------------------

  /** File generation rules */
  fileGenerationRules: ProvenanceAware<FileGenerationRule[]>;

  // --------------------------------------------------------------------------
  // COMPONENT GENERATION RULES
  // --------------------------------------------------------------------------

  /** Component generation rules */
  componentGenerationRules: ProvenanceAware<ComponentGenerationRule[]>;

  // --------------------------------------------------------------------------
  // CONTENT GENERATION RULES
  // --------------------------------------------------------------------------

  /** Content generation rules */
  contentGenerationRules: ProvenanceAware<ContentGenerationRule[]>;

  // --------------------------------------------------------------------------
  // QUALITY GATES
  // --------------------------------------------------------------------------

  /** Quality gate configuration */
  qualityGates: ProvenanceAware<QualityGateConfig[]>;
}

// ============================================================================
// RENDERER CONFIG
// ============================================================================

export interface RendererConfig {
  /** Renderer type */
  type: 'react' | 'nextjs' | 'flutter' | 'fastapi' | 'express' | 'vue' | 'svelte';

  /** Renderer version */
  version: string;

  /** Renderer options */
  options: Record<string, unknown>;

  /** Output directory */
  outputDir: string;

  /** Source directory */
  srcDir: string;
}

// ============================================================================
// BUILD CONFIG
// ============================================================================

export interface BuildConfig {
  /** Package manager */
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';

  /** Build command */
  buildCommand: string;

  /** Dev command */
  devCommand: string;

  /** Output directory */
  outputDir: string;

  /** Environment variables */
  envVars: Record<string, string>;

  /** Build hooks */
  hooks: BuildHook[];
}

export interface BuildHook {
  /** Hook name */
  name: string;

  /** Hook command */
  command: string;

  /** Hook stage */
  stage: 'pre-build' | 'post-build' | 'pre-deploy' | 'post-deploy';
}

// ============================================================================
// FILE GENERATION RULES
// ============================================================================

export interface FileGenerationRule {
  /** Rule name */
  name: string;

  /** File pattern */
  pattern: string;

  /** Generation strategy */
  strategy: 'template' | 'component' | 'page' | 'api' | 'schema' | 'config';

  /** Template reference */
  template?: string;

  /** Content source */
  contentSource: 'blueprint' | 'business-knowledge' | 'experience-blueprint' | 'content-blueprint' | 'static';

  /** Overwrite existing */
  overwrite: boolean;
}

// ============================================================================
// COMPONENT GENERATION RULES
// ============================================================================

export interface ComponentGenerationRule {
  /** Rule name */
  name: string;

  /** Component type */
  type: 'page' | 'layout' | 'feature' | 'ui' | 'primitive';

  /** Generation strategy */
  strategy: 'template' | 'custom' | 'library';

  /** Template reference */
  template?: string;

  /** Props source */
  propsSource: 'blueprint' | 'business-knowledge' | 'static';

  /** Children strategy */
  childrenStrategy: 'recursive' | 'flat' | 'none';
}

// ============================================================================
// CONTENT GENERATION RULES
// ============================================================================

export interface ContentGenerationRule {
  /** Rule name */
  name: string;

  /** Content type */
  type: 'copy' | 'image' | 'video' | 'animation' | 'icon' | 'data';

  /** Content source */
  source: 'blueprint' | 'business-knowledge' | 'content-blueprint' | 'static';

  /** Content destination */
  destination: 'component' | 'json' | 'mdx' | 'database';

  /** Content format */
  format: 'text' | 'html' | 'markdown' | 'json';
}

// ============================================================================
// QUALITY GATES
// ============================================================================

export interface QualityGateConfig {
  /** Gate name */
  name: string;

  /** Gate type */
  type: 'schema' | 'lint' | 'typecheck' | 'build' | 'test' | 'visual';

  /** Gate command */
  command: string;

  /** Is blocking */
  blocking: boolean;

  /** Timeout (ms) */
  timeout: number;
}

// ============================================================================
// LAYER INTERFACE
// ============================================================================

/**
 * Execution Blueprint Layer interface.
 *
 * This layer consumes ApplicationBlueprint
 * and produces ExecutionBlueprint.
 * It is the SINGLE AUTHORITY for renderer instructions.
 */
export interface IExecutionBlueprintLayer {
  /** Layer identifier */
  readonly id: 'execution-blueprint';

  /** Layer name */
  readonly name: string;

  /** Layer version */
  readonly version: string;

  /**
   * Process upstream input and produce ExecutionBlueprint.
   *
   * @param applicationBlueprint - Upstream ApplicationBlueprint
   * @returns ExecutionBlueprint with full provenance
   */
  process(applicationBlueprint: ApplicationBlueprint): Promise<ExecutionBlueprint>;

  /**
   * Validate ExecutionBlueprint.
   *
   * @param blueprint - Blueprint to validate
   * @returns Validation result with issues
   */
  validate(blueprint: ExecutionBlueprint): ValidationResult;
}
