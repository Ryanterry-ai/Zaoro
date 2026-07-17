/**
 * Knowledge Acquisition Layer - Canonical Types
 *
 * OWNERSHIP: This layer owns Evidence and Sources.
 * It is the SINGLE AUTHORITY for:
 * - Web research
 * - Competitor analysis
 * - Market research
 * - Evidence collection
 * - Source verification
 *
 * CONSTRAINTS:
 * - Must NOT decide business logic (consumes from BusinessKnowledge)
 * - Must NOT decide experience flow
 * - Must NOT decide content strategy
 * - Must NOT decide visual system
 * - Must consume BusinessKnowledge from upstream
 * - Must produce EvidenceCollection for downstream
 */

import type { BusinessKnowledge } from '../business-intelligence/types.js';
import type { Provenance, ProvenanceAware } from '../experience-intelligence/types.js';

// ============================================================================
// EVIDENCE COLLECTION - Canonical Output
// ============================================================================

/**
 * EvidenceCollection - The SINGLE AUTHORITY for research evidence.
 */
export interface EvidenceCollection {
  /** Unique identifier */
  id: string;

  /** Timestamp of creation */
  createdAt: Date;

  /** Version of the collection */
  version: string;

  /** Reference to upstream BusinessKnowledge */
  businessKnowledgeId: string;

  // --------------------------------------------------------------------------
  // COMPETITOR EVIDENCE
  // --------------------------------------------------------------------------

  /** Competitor analysis */
  competitors: ProvenanceAware<CompetitorEvidence[]>;

  // --------------------------------------------------------------------------
  // MARKET EVIDENCE
  // --------------------------------------------------------------------------

  /** Market research */
  market: ProvenanceAware<MarketEvidence>;

  // --------------------------------------------------------------------------
  // INDUSTRY EVIDENCE
  // --------------------------------------------------------------------------

  /** Industry research */
  industry: ProvenanceAware<IndustryEvidence>;

  // --------------------------------------------------------------------------
  // USER EVIDENCE
  // --------------------------------------------------------------------------

  /** User research */
  users: ProvenanceAware<UserEvidence>;

  // --------------------------------------------------------------------------
  // TECHNICAL EVIDENCE
  // --------------------------------------------------------------------------

  /** Technical research */
  technical: ProvenanceAware<TechnicalEvidence>;

  // --------------------------------------------------------------------------
  // DISCOVERED ASSETS (real brand assets from live web research)
  // --------------------------------------------------------------------------

  /** Real asset URLs (logos, OG images, favicons) discovered via web research */
  assets: ProvenanceAware<DiscoveredAsset[]>;
}

/** A real brand/reference asset discovered during live web research. */
export interface DiscoveredAsset {
  /** Original (absolute) URL of the asset */
  url: string;
  /** What kind of asset this is */
  kind: 'logo' | 'og-image' | 'favicon' | 'brand';
  /** Source domain it was discovered on */
  source: string;
  /** Evidence confidence */
  confidence: number;
}

// ============================================================================
// COMPETITOR EVIDENCE
// ============================================================================

export interface CompetitorEvidence {
  /** Competitor name */
  name: string;

  /** Competitor URL */
  url: string;

  /** Competitor strengths */
  strengths: string[];

  /** Competitor weaknesses */
  weaknesses: string[];

  /** Competitor features */
  features: string[];

  /** Competitor pricing */
  pricing?: string;

  /** Evidence source */
  source: string;

  /** Evidence confidence */
  confidence: number;
}

// ============================================================================
// MARKET EVIDENCE
// ============================================================================

export interface MarketEvidence {
  /** Market size */
  marketSize?: string;

  /** Market growth */
  marketGrowth?: string;

  /** Target audience */
  targetAudience: string[];

  /** Market trends */
  trends: string[];

  /** Market opportunities */
  opportunities: string[];

  /** Evidence source */
  source: string;

  /** Evidence confidence */
  confidence: number;
}

// ============================================================================
// INDUSTRY EVIDENCE
// ============================================================================

export interface IndustryEvidence {
  /** Industry name */
  name: string;

  /** Industry standards */
  standards: string[];

  /** Industry regulations */
  regulations: string[];

  /** Industry best practices */
  bestPractices: string[];

  /** Industry trends */
  trends: string[];

  /** Evidence source */
  source: string;

  /** Evidence confidence */
  confidence: number;
}

// ============================================================================
// USER EVIDENCE
// ============================================================================

export interface UserEvidence {
  /** User personas */
  personas: UserPersona[];

  /** User pain points */
  painPoints: string[];

  /** User goals */
  goals: string[];

  /** User behaviors */
  behaviors: string[];

  /** Evidence source */
  source: string;

  /** Evidence confidence */
  confidence: number;
}

export interface UserPersona {
  /** Persona name */
  name: string;

  /** Persona description */
  description: string;

  /** Persona demographics */
  demographics: Record<string, string>;

  /** Persona needs */
  needs: string[];

  /** Persona frustrations */
  frustrations: string[];
}

// ============================================================================
// TECHNICAL EVIDENCE
// ============================================================================

export interface TechnicalEvidence {
  /** Technology stack */
  techStack: string[];

  /** Performance benchmarks */
  benchmarks: Record<string, string>;

  /** Integration options */
  integrations: string[];

  /** Security requirements */
  security: string[];

  /** Evidence source */
  source: string;

  /** Evidence confidence */
  confidence: number;
}

// ============================================================================
// LAYER INTERFACE
// ============================================================================

/**
 * Knowledge Acquisition Layer interface.
 *
 * This layer consumes BusinessKnowledge
 * and produces EvidenceCollection.
 * It is the SINGLE AUTHORITY for research evidence.
 */
export interface IKnowledgeAcquisitionLayer {
  /** Layer identifier */
  readonly id: 'knowledge-acquisition';

  /** Layer name */
  readonly name: string;

  /** Layer version */
  readonly version: string;

  /**
   * Process BusinessKnowledge and produce EvidenceCollection.
   *
   * @param businessKnowledge - Upstream BusinessKnowledge
   * @returns EvidenceCollection with full provenance
   */
  process(businessKnowledge: BusinessKnowledge): Promise<EvidenceCollection>;

  /**
   * Validate EvidenceCollection.
   *
   * @param collection - Collection to validate
   * @returns Validation result with issues
   */
  validate(collection: EvidenceCollection): ValidationResult;
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
