/**
 * Application Blueprint Layer - Canonical Types
 *
 * OWNERSHIP: This layer owns ApplicationBlueprint.
 * It is the SINGLE AUTHORITY for:
 * - Application composition
 * - Component hierarchy
 * - State management
 * - Data flow
 * - Route structure
 *
 * CONSTRAINTS:
 * - Must NOT decide business logic (consumes from BusinessKnowledge)
 * - Must NOT decide experience flow (consumes from ExperienceBlueprint)
 * - Must NOT decide content strategy (consumes from ContentBlueprint)
 * - Must NOT decide technology stack (consumes from SolutionArchitecture)
 * - Must consume all upstream blueprints
 * - Must produce ApplicationBlueprint for downstream
 */

import type { BusinessKnowledge } from '../business-intelligence/types.js';
import type { ExperienceBlueprint } from '../experience-intelligence/types.js';
import type { ContentBlueprint } from '../content-intelligence/types.js';
import type { SolutionArchitecture } from '../technology-planner/types.js';
import type { Provenance, ProvenanceAware } from '../experience-intelligence/types.js';
import type { ValidationResult } from '../shared/types.js';

// Re-export shared types for convenience
export type { ValidationResult, ValidationIssue } from '../shared/types.js';

// ============================================================================
// APPLICATION BLUEPRINT - Canonical Output
// ============================================================================

/**
 * ApplicationBlueprint - The SINGLE AUTHORITY for application composition.
 */
export interface ApplicationBlueprint {
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

  /** Reference to upstream SolutionArchitecture */
  solutionArchitectureId: string;

  // --------------------------------------------------------------------------
  // ROUTE STRUCTURE
  // --------------------------------------------------------------------------

  /** Application routes */
  routes: ProvenanceAware<Route[]>;

  // --------------------------------------------------------------------------
  // COMPONENT HIERARCHY
  // --------------------------------------------------------------------------

  /** Component tree */
  components: ProvenanceAware<ComponentNode[]>;

  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------

  /** State management strategy */
  stateManagement: ProvenanceAware<StateManagement>;

  // --------------------------------------------------------------------------
  // DATA FLOW
  // --------------------------------------------------------------------------

  /** Data flow between components */
  dataFlow: ProvenanceAware<DataFlow[]>;

  // --------------------------------------------------------------------------
  // API CONTRACTS
  // --------------------------------------------------------------------------

  /** API endpoints */
  apiContracts: ProvenanceAware<APIContract[]>;

  // --------------------------------------------------------------------------
  // DATABASE SCHEMA
  // --------------------------------------------------------------------------

  /** Database schema */
  databaseSchema: ProvenanceAware<DatabaseSchema>;

  // --------------------------------------------------------------------------
  // FILE STRUCTURE
  // --------------------------------------------------------------------------

  /** File structure */
  fileStructure: ProvenanceAware<FileNode[]>;
}

// ============================================================================
// ROUTES
// ============================================================================

export interface Route {
  /** Route path */
  path: string;

  /** Route name */
  name: string;

  /** Component reference */
  component: string;

  /** Route metadata */
  metadata: {
    title: string;
    description: string;
    requiresAuth: boolean;
    layout?: string;
  };

  /** Child routes */
  children?: Route[];
}

// ============================================================================
// COMPONENTS
// ============================================================================

export interface ComponentNode {
  /** Component name */
  name: string;

  /** Component type */
  type: 'page' | 'layout' | 'feature' | 'ui' | 'primitive';

  /** Component props */
  props: ComponentProp[];

  /** Child components */
  children: ComponentNode[];

  /** Component hooks */
  hooks: string[];

  /** Component dependencies */
  dependencies: string[];
}

export interface ComponentProp {
  /** Prop name */
  name: string;

  /** Prop type */
  type: string;

  /** Is required */
  required: boolean;

  /** Default value */
  defaultValue?: unknown;

  /** Prop description */
  description?: string;
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

export interface StateManagement {
  /** State management approach */
  approach: 'local' | 'context' | 'redux' | 'zustand' | 'jotai' | 'recoil' | 'swr' | 'react-query';

  /** State stores */
  stores: StateStore[];

  /** State slices */
  slices: StateSlice[];
}

export interface StateStore {
  /** Store name */
  name: string;

  /** Store type */
  type: 'global' | 'feature' | 'local';

  /** Store state shape */
  state: Record<string, string>;

  /** Store actions */
  actions: string[];
}

export interface StateSlice {
  /** Slice name */
  name: string;

  /** Slice state */
  state: Record<string, string>;

  /** Slice selectors */
  selectors: string[];
}

// ============================================================================
// DATA FLOW
// ============================================================================

export interface DataFlow {
  /** Source component */
  source: string;

  /** Target component */
  target: string;

  /** Flow type */
  type: 'props' | 'context' | 'event' | 'state' | 'api';

  /** Data shape */
  dataShape: Record<string, string>;
}

// ============================================================================
// API CONTRACTS
// ============================================================================

export interface APIContract {
  /** Endpoint path */
  path: string;

  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  /** Request schema */
  request?: Record<string, unknown>;

  /** Response schema */
  response: Record<string, unknown>;

  /** Authentication required */
  requiresAuth: boolean;

  /** Rate limiting */
  rateLimit?: number;
}

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

export interface DatabaseSchema {
  /** Database tables */
  tables: DatabaseTable[];

  /** Relationships */
  relationships: DatabaseRelationship[];
}

export interface DatabaseTable {
  /** Table name */
  name: string;

  /** Table columns */
  columns: DatabaseColumn[];

  /** Table indexes */
  indexes: string[];
}

export interface DatabaseColumn {
  /** Column name */
  name: string;

  /** Column type */
  type: string;

  /** Is required */
  required: boolean;

  /** Is unique */
  unique: boolean;

  /** Default value */
  defaultValue?: unknown;
}

export interface DatabaseRelationship {
  /** Source table */
  from: string;

  /** Target table */
  to: string;

  /** Relationship type */
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

// ============================================================================
// FILE STRUCTURE
// ============================================================================

export interface FileNode {
  /** File name */
  name: string;

  /** File type */
  type: 'file' | 'directory';

  /** File path */
  path: string;

  /** Child nodes */
  children?: FileNode[];

  /** File purpose */
  purpose?: string;
}

// ============================================================================
// LAYER INTERFACE
// ============================================================================

/**
 * Application Blueprint Layer interface.
 *
 * This layer consumes all upstream blueprints
 * and produces ApplicationBlueprint.
 * It is the SINGLE AUTHORITY for application composition.
 */
export interface IApplicationBlueprintLayer {
  /** Layer identifier */
  readonly id: 'application-blueprint';

  /** Layer name */
  readonly name: string;

  /** Layer version */
  readonly version: string;

  /**
   * Process upstream inputs and produce ApplicationBlueprint.
   *
   * @param businessKnowledge - Upstream BusinessKnowledge
   * @param experienceBlueprint - Upstream ExperienceBlueprint
   * @param contentBlueprint - Upstream ContentBlueprint
   * @param solutionArchitecture - Upstream SolutionArchitecture
   * @returns ApplicationBlueprint with full provenance
   */
  process(
    businessKnowledge: BusinessKnowledge,
    experienceBlueprint: ExperienceBlueprint,
    contentBlueprint: ContentBlueprint,
    solutionArchitecture: SolutionArchitecture
  ): Promise<ApplicationBlueprint>;

  /**
   * Validate ApplicationBlueprint.
   *
   * @param blueprint - Blueprint to validate
   * @returns Validation result with issues
   */
  validate(blueprint: ApplicationBlueprint): ValidationResult;
}
