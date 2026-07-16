// ─── Weighted Primitives ────────────────────────────────────────────
// A Primitive is the atomic unit of creative intent: a design quality,
// emotional attribute, or brand characteristic that shapes how an
// experience should look, feel, and behave.
//
// Every Primitive carries:
//   - A weight (0–1) indicating importance relative to other primitives
//   - Relationships to other primitives (multi-hop chains)
//   - A domain (which knowledge area it belongs to)
//   - Confidence (how well-established this primitive is)
//
// The Primitive Graph is the universal knowledge graph.  Every domain
// (experience, design, business, psychology, marketing, UX, accessibility,
// commerce, motion, technology, industry, compliance, content, SEO,
// localization, conversion, branding) is represented as primitives with
// weighted relationships.

// ─── Primitive ──────────────────────────────────────────────────────

export type PrimitiveDomain =
  | 'experience'
  | 'design'
  | 'business'
  | 'psychology'
  | 'marketing'
  | 'ux'
  | 'accessibility'
  | 'commerce'
  | 'motion'
  | 'technology'
  | 'industry'
  | 'compliance'
  | 'content'
  | 'seo'
  | 'localization'
  | 'conversion'
  | 'branding';

export type PrimitiveStatus =
  | 'canonical'      // established, high-confidence
  | 'learned'        // promoted from candidate store
  | 'temporary';     // discovered but not yet promoted

export interface Primitive {
  id: string;
  name: string;
  domain: PrimitiveDomain;
  description: string;
  /** Weight relative to other primitives in the same context (0–1). */
  weight: number;
  /** Confidence in this primitive's validity (0–1). */
  confidence: number;
  /** Status in the knowledge lifecycle. */
  status: PrimitiveStatus;
  /** Which industries this primitive is relevant to. */
  industries: string[];
  /** Which other primitives this one relates to. */
  relationships: PrimitiveRelationship[];
  /** Timestamp of last observation. */
  lastObserved: number;
  /** Number of times this primitive has been observed. */
  observationCount: number;
}

// ─── Relationships ──────────────────────────────────────────────────

export type RelationshipType =
  | 'implies'       // A → B: if A is present, B tends to follow
  | 'requires'      // A → B: A cannot exist without B
  | 'enhances'      // A → B: A makes B stronger
  | 'conflicts'     // A → B: A and B undermine each other
  | 'modulates'     // A → B: A adjusts the intensity of B
  | 'evolves_to';   // A → B: A transitions into B over time

export interface PrimitiveRelationship {
  /** Target primitive id. */
  targetId: string;
  /** How strong this relationship is (0–1). */
  strength: number;
  /** Type of relationship. */
  type: RelationshipType;
  /** Multi-hop chain: intermediate primitives. */
  chain?: string[];
}

// ─── Primitive Set (resolved for a specific context) ────────────────

export interface ResolvedPrimitive {
  primitive: Primitive;
  /** Final weight after conflict resolution and context adjustment. */
  resolvedWeight: number;
  /** Why this weight was chosen. */
  reasoning: string;
}

export interface PrimitiveSet {
  /** All resolved primitives, sorted by resolvedWeight descending. */
  primitives: ResolvedPrimitive[];
  /** Total weight budget consumed (should be ≤ 1.0). */
  totalWeight: number;
  /** Conflicts that were detected and resolved. */
  conflictsResolved: Array<{
    a: string;
    b: string;
    strategy: 'average' | 'max' | 'dominant' | 'reconcile';
    result: string;
  }>;
  /** Multi-hop chains discovered. */
  chains: Array<{
    path: string[];
    domain: PrimitiveDomain;
    totalStrength: number;
  }>;
}

// ─── Brand Reference (user input) ───────────────────────────────────

export interface BrandReference {
  /** Brand name (e.g. "Apple", "Tesla", "Nike"). */
  brand: string;
  /** How strongly the user invoked this brand (0–1). */
  intensity: number;
  /** Known primitives for this brand (from the registry). */
  knownPrimitives?: string[];
}

// ─── Conflict Resolution Config ─────────────────────────────────────

export interface ConflictResolutionConfig {
  /** Strategy when two brands suggest conflicting primitives. */
  defaultStrategy: 'average' | 'max' | 'dominant' | 'reconcile';
  /** Maximum total weight budget across all primitives. */
  weightBudget: number;
  /** Minimum weight for a primitive to be included. */
  minWeight: number;
  /** Maximum number of primitives in the resolved set. */
  maxPrimitives: number;
}

export const DEFAULT_CONFLICT_CONFIG: ConflictResolutionConfig = {
  defaultStrategy: 'reconcile',
  weightBudget: 1.0,
  minWeight: 0.15,
  maxPrimitives: 12,
};

// ─── Evolution ──────────────────────────────────────────────────────

export interface PrimitiveEvolution {
  /** The primitive being evolved. */
  primitiveId: string;
  /** Observations that led to this evolution. */
  observations: Array<{
    buildId: string;
    industry: string;
    confidence: number;
    timestamp: number;
  }>;
  /** Current status in the lifecycle. */
  status: PrimitiveStatus;
  /** When this evolution started. */
  createdAt: number;
  /** When it was last updated. */
  updatedAt: number;
  /** If promoted, when. */
  promotedAt?: number;
  /** If rejected, why. */
  rejectionReason?: string;
}
