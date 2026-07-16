/**
 * Technology Planner Layer - Canonical Types
 *
 * OWNERSHIP: This layer owns SolutionArchitecture.
 * It is the SINGLE AUTHORITY for:
 * - Framework selection
 * - Infrastructure decisions
 * - Deployment strategy
 * - Technology stack
 *
 * CONSTRAINTS:
 * - Must NOT decide UI/visual system
 * - Must NOT decide experience flow
 * - Must NOT decide business logic
 * - Must consume BusinessKnowledge + ExperienceBlueprint + ContentBlueprint from upstream
 * - Must produce SolutionArchitecture for downstream
 */

import type { BusinessKnowledge } from '../business-intelligence/types.js';
import type { ExperienceBlueprint } from '../experience-intelligence/types.js';
import type { ContentBlueprint } from '../content-intelligence/types.js';
import type { Provenance, ProvenanceAware } from '../experience-intelligence/types.js';
import type { ValidationResult } from '../shared/types.js';

// Re-export shared types for convenience
export type { ValidationResult, ValidationIssue } from '../shared/types.js';

// ============================================================================
// SOLUTION ARCHITECTURE - Canonical Output
// ============================================================================

/**
 * SolutionArchitecture - The SINGLE AUTHORITY for technology decisions.
 */
export interface SolutionArchitecture {
  /** Unique identifier */
  id: string;

  /** Timestamp of creation */
  createdAt: Date;

  /** Version of the blueprint */
  version: string;

  /** Reference to upstream BusinessKnowledge */
  businessKnowledgeId: string;

  /** Reference to upstream ExperienceBlueprint */
  experienceBlueprintId: string;

  /** Reference to upstream ContentBlueprint */
  contentBlueprintId: string;

  // --------------------------------------------------------------------------
  // PLATFORM
  // --------------------------------------------------------------------------

  /** Target platform */
  platform: ProvenanceAware<Platform>;

  /** Frontend framework */
  frontendFramework: ProvenanceAware<Framework>;

  /** Backend framework (if applicable) */
  backendFramework?: ProvenanceAware<Framework>;

  /** Database type */
  database: ProvenanceAware<DatabaseConfig>;

  // --------------------------------------------------------------------------
  // INFRASTRUCTURE
  // --------------------------------------------------------------------------

  /** Hosting configuration */
  hosting: ProvenanceAware<HostingConfig>;

  /** Deployment strategy */
  deployment: ProvenanceAware<DeploymentStrategy>;

  // --------------------------------------------------------------------------
  // SECURITY
  // --------------------------------------------------------------------------

  /** Authentication strategy */
  authentication: ProvenanceAware<AuthStrategy>;

  /** Authorization strategy */
  authorization: ProvenanceAware<AuthStrategy>;

  // --------------------------------------------------------------------------
  // INTEGRATIONS
  // --------------------------------------------------------------------------

  /** Third-party integrations */
  integrations: ProvenanceAware<Integration[]>;

  // --------------------------------------------------------------------------
  // PERFORMANCE
  // --------------------------------------------------------------------------

  /** Performance requirements */
  performance: ProvenanceAware<PerformanceConfig>;

  // --------------------------------------------------------------------------
  // SCALABILITY
  // --------------------------------------------------------------------------

  /** Scalability requirements */
  scalability: ProvenanceAware<ScalabilityConfig>;
}

// ============================================================================
// PLATFORM
// ============================================================================

export type Platform = 'web' | 'mobile' | 'desktop' | 'api' | 'fullstack';

export interface Framework {
  name: string;
  version: string;
  rationale: string;
  alternatives: string[];
}

// ============================================================================
// DATABASE
// ============================================================================

export interface DatabaseConfig {
  type: 'postgresql' | 'mysql' | 'mongodb' | 'sqlite' | 'redis' | 'none';
  orm?: string;
  hosting?: string;
  rationale: string;
}

// ============================================================================
// HOSTING
// ============================================================================

export interface HostingConfig {
  provider: 'vercel' | 'netlify' | 'aws' | 'gcp' | 'azure' | 'digitalocean' | 'self-hosted';
  region?: string;
  tier?: 'free' | 'starter' | 'pro' | 'enterprise';
  rationale: string;
}

// ============================================================================
// DEPLOYMENT
// ============================================================================

export interface DeploymentStrategy {
  type: 'continuous' | 'manual' | 'preview' | 'blue-green';
  ciCd?: string;
  previewEnvironments: boolean;
  rollbackStrategy: string;
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

export interface AuthStrategy {
  type: 'jwt' | 'session' | 'oauth' | 'sso' | 'api-key' | 'none';
  provider?: string;
  providers?: string[];
  mfa?: boolean;
  rationale: string;
}

// ============================================================================
// INTEGRATIONS
// ============================================================================

export interface Integration {
  name: string;
  type: 'api' | 'sdk' | 'webhook' | 'database' | 'file';
  purpose: string;
  required: boolean;
  fallback?: string;
}

// ============================================================================
// PERFORMANCE
// ============================================================================

export interface PerformanceConfig {
  targetLcp: number;
  targetFid: number;
  targetCls: number;
  bundleSizeBudget: number;
  imageOptimization: boolean;
  cdn: boolean;
  caching: CachingStrategy;
}

export interface CachingStrategy {
  type: 'none' | 'static' | 'dynamic' | 'hybrid';
  ttl?: number;
  invalidation?: string;
}

// ============================================================================
// SCALABILITY
// ============================================================================

export interface ScalabilityConfig {
  expectedUsers: string;
  expectedTraffic: string;
  scalingStrategy: 'vertical' | 'horizontal' | 'auto' | 'none';
  concurrency: number;
}

// ============================================================================
// LAYER INTERFACE
// ============================================================================

/**
 * Technology Planner Layer interface.
 *
 * This layer consumes BusinessKnowledge + ExperienceBlueprint + ContentBlueprint
 * and produces SolutionArchitecture.
 * It is the SINGLE AUTHORITY for technology decisions.
 */
export interface ITechnologyPlannerLayer {
  /** Layer identifier */
  readonly id: 'technology-planner';

  /** Layer name */
  readonly name: string;

  /** Layer version */
  readonly version: string;

  /**
   * Process upstream inputs and produce SolutionArchitecture.
   *
   * @param businessKnowledge - Upstream BusinessKnowledge
   * @param experienceBlueprint - Upstream ExperienceBlueprint
   * @param contentBlueprint - Upstream ContentBlueprint
   * @returns SolutionArchitecture with full provenance
   */
  process(
    businessKnowledge: BusinessKnowledge,
    experienceBlueprint: ExperienceBlueprint,
    contentBlueprint: ContentBlueprint
  ): Promise<SolutionArchitecture>;

  /**
   * Validate SolutionArchitecture.
   *
   * @param architecture - Architecture to validate
   * @returns Validation result with issues
   */
  validate(architecture: SolutionArchitecture): ValidationResult;
}
