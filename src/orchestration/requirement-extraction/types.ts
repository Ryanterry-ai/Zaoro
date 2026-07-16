// ─── Requirement Extraction — Canonical Types ────────────────────────────────
//
// The single source of truth for requirement blueprints.
// Every downstream layer reads from these types.
// ─────────────────────────────────────────────────────────────────────────────

/** Which intelligence layer owns this requirement (for repair routing) */
export type RequirementOwner =
  | 'business-intelligence'
  | 'knowledge-acquisition'
  | 'content-intelligence'
  | 'experience-intelligence'
  | 'design-intelligence'
  | 'technology-planner'
  | 'application-blueprint'
  | 'execution-blueprint'
  | 'renderer'
  | 'preview'
  | 'validation'
  | 'review';

/** Category of requirement */
export type RequirementCategory =
  | 'business-domain'
  | 'experience'
  | 'functional'
  | 'quality';

/** How the requirement was identified */
export type RequirementSource = 'explicit' | 'implicit';

/** Status of a requirement after fulfillment scoring */
export type RequirementStatus =
  | 'pending'     // not yet scored
  | 'pass'        // fulfilled
  | 'fail'        // not fulfilled
  | 'partial'     // partially fulfilled
  | 'not-applicable'; // cannot be assessed (e.g., visual requires rendering)

/** A single extracted requirement */
export interface Requirement {
  /** Unique requirement ID */
  id: string;
  /** Category of requirement */
  category: RequirementCategory;
  /** Human-readable description */
  description: string;
  /** Which layer owns this requirement (for repair routing) */
  owner: RequirementOwner;
  /** Confidence in extraction (0-1) */
  confidence: number;
  /** How the requirement was identified */
  source: RequirementSource;
  /** Keywords for matching against artifacts */
  keywords: string[];
  /** Related artifact keys this requirement maps to */
  artifactKeys: string[];
  /** Priority: must-have, should-have, nice-to-have */
  priority: 'must' | 'should' | 'nice';
}

/** The canonical requirement blueprint — output of Requirement Extraction */
export interface RequirementBlueprint {
  /** Unique blueprint ID */
  id: string;
  /** The original prompt */
  prompt: string;
  /** Extracted business domain */
  businessDomain: {
    primary: string;
    secondary: string[];
    confidence: number;
  };
  /** All extracted requirements grouped by category */
  requirements: {
    businessDomain: Requirement[];
    experience: Requirement[];
    functional: Requirement[];
    quality: Requirement[];
  };
  /** Flat list of all requirements */
  allRequirements: Requirement[];
  /** Total requirement count */
  totalRequirements: number;
  /** Extraction metadata */
  extraction: {
    confidence: number;
    explicitCount: number;
    implicitCount: number;
    durationMs: number;
  };
}
