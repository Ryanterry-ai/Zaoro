// ─── Semantic Primitive Graph Types ───────────────────────────────
// Brands/entities become evidence. Primitives are the canonical vocabulary.
// Every extraction carries confidence and provenance.

/** Categories of experience primitives */
export type PrimitiveCategory =
  | 'aesthetic'      // minimalism, whitespace, bold-typography, gradient
  | 'motion'         // slow-cinematic, parallax, micro-interaction, stagger
  | 'structure'      // grid, bento, editorial, card-based, single-page
  | 'emotion'        // luxury, confidence, energy, warmth, trust, playfulness
  | 'interaction'    // hover-reveal, scroll-trigger, drag, gesture, voice
  | 'industry';      // coffee-craft, mechanical-assembly, precision-engineering

/** How primitives relate to each other */
export type PrimitiveRelationshipType =
  | 'implies'       // minimalism implies whitespace
  | 'conflicts'     // bold-typography conflicts with minimalism
  | 'composes'      // luxury = craftsmanship + precision + slow-pacing
  | 'requires'      // parallax requires scroll-trigger
  | 'belongs_to'    // coffee-craft belongs_to emotion
  | 'strengthens';  // whitespace strengthens minimalism

/** A primitive with confidence score */
export interface ConfidentPrimitive {
  primitiveId: string;
  confidence: number;        // 0-1
  evidence: EntityEvidence[];
}

/** What input led to a primitive */
export interface EntityEvidence {
  entity: string;            // The raw entity/reference from the prompt
  source: 'keyword' | 'entity' | 'context' | 'composition';
  confidence: number;        // 0-1: how confident we are in this entity extraction
  context?: string;          // Surrounding text for provenance
}

/** Full decomposition of a user prompt */
export interface IntentDecomposition {
  /** Raw entities extracted from the prompt */
  entities: Array<{
    name: string;
    confidence: number;
    type: 'brand' | 'industry' | 'concept' | 'style' | 'feature';
  }>;
  /** Entities mapped to canonical primitives */
  primitives: ConfidentPrimitive[];
  /** Overall confidence in the decomposition */
  overallConfidence: number;
  /** Evidence trail for audit */
  evidenceTrail: EntityEvidence[];
}
