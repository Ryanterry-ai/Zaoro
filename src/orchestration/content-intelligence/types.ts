/**
 * Content Intelligence Layer - Canonical Types
 *
 * OWNERSHIP: This layer owns ContentBlueprint.
 * It is the SINGLE AUTHORITY for:
 * - Messaging hierarchy
 * - CTA strategy
 * - Media strategy
 * - Copy direction
 * - Content density
 * - Voice and tone
 *
 * CONSTRAINTS:
 * - Must NOT decide business logic
 * - Must NOT decide experience flow
 * - Must NOT decide visual system
 * - Must NOT decide backend architecture
 * - Must consume BusinessKnowledge + ExperienceBlueprint from upstream
 * - Must produce ContentBlueprint for downstream
 */

import type { BusinessKnowledge } from '../business-intelligence/types.js';
import type { ExperienceBlueprint } from '../experience-intelligence/types.js';
import type { Provenance, ProvenanceAware } from '../experience-intelligence/types.js';
import type { ValidationResult } from '../shared/types.js';

// Re-export shared types for convenience
export type { ValidationResult, ValidationIssue } from '../shared/types.js';

// ============================================================================
// CONTENT BLUEPRINT - Canonical Output
// ============================================================================

/**
 * ContentBlueprint - The SINGLE AUTHORITY for content strategy.
 *
 * Every downstream layer (Application Blueprint, Renderer)
 * consumes this blueprint and MUST NOT override its decisions.
 */
export interface ContentBlueprint {
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

  // --------------------------------------------------------------------------
  // MESSAGING HIERARCHY
  // --------------------------------------------------------------------------

  /** Primary message */
  primaryMessage: ProvenanceAware<string>;

  /** Supporting messages */
  supportingMessages: ProvenanceAware<string[]>;

  /** Tagline options */
  taglineOptions: ProvenanceAware<string[]>;

  // --------------------------------------------------------------------------
  // CTA STRATEGY
  // --------------------------------------------------------------------------

  /** CTA hierarchy */
  ctaHierarchy: ProvenanceAware<CTAStrategy>;

  // --------------------------------------------------------------------------
  // MEDIA STRATEGY
  // --------------------------------------------------------------------------

  /** Media requirements per section */
  mediaStrategy: ProvenanceAware<MediaStrategy>;

  // --------------------------------------------------------------------------
  // COPY DIRECTION
  // --------------------------------------------------------------------------

  /** Copy direction per section */
  copyDirection: ProvenanceAware<CopyDirection[]>;

  // --------------------------------------------------------------------------
  // CONTENT DENSITY
  // --------------------------------------------------------------------------

  /** Content density per section */
  contentDensity: ProvenanceAware<ContentDensity[]>;

  // --------------------------------------------------------------------------
  // VOICE & TONE
  // --------------------------------------------------------------------------

  /** Brand voice */
  voice: ProvenanceAware<BrandVoice>;

  /** Tone variations by section */
  toneVariations: ProvenanceAware<ToneVariation[]>;
}

// ============================================================================
// CTA STRATEGY
// ============================================================================

export interface CTAStrategy {
  /** Primary CTA */
  primary: CTA;

  /** Secondary CTAs */
  secondary: CTA[];

  /** Tertiary CTAs */
  tertiary: CTA[];

  /** CTA placement rules */
  placementRules: CTAPlacementRule[];
}

export interface CTA {
  /** CTA text */
  text: string;

  /** CTA action */
  action: 'sign-up' | 'purchase' | 'contact' | 'download' | 'learn-more' | 'demo' | 'subscribe';

  /** CTA style */
  style: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'link';

  /** Urgency level (0-1) */
  urgency: number;

  /** Trust signals */
  trustSignals: string[];
}

export interface CTAPlacementRule {
  /** Section type */
  sectionType: string;

  /** CTA position */
  position: 'top' | 'middle' | 'bottom' | 'floating';

  /** CTA style */
  style: string;

  /** Maximum frequency */
  maxFrequency: number;
}

// ============================================================================
// MEDIA STRATEGY
// ============================================================================

export interface MediaStrategy {
  /** Media requirements per section */
  sections: MediaSection[];

  /** Global media guidelines */
  global: MediaGuidelines;
}

export interface MediaSection {
  /** Section ID */
  sectionId: string;

  /** Media type */
  type: 'image' | 'video' | 'animation' | 'illustration' | 'icon' | 'none';

  /** Media purpose */
  purpose: 'hero' | 'product' | 'lifestyle' | 'team' | 'office' | 'abstract' | 'decorative';

  /** Aspect ratio */
  aspectRatio: string;

  /** Quality level */
  quality: 'high' | 'medium' | 'low';

  /** Alt text direction */
  altTextDirection: string;
}

export interface MediaGuidelines {
  /** Image style */
  imageStyle: 'photography' | 'illustration' | '3d' | 'abstract' | 'mixed';

  /** Color treatment */
  colorTreatment: 'full-color' | 'duotone' | 'monochrome' | 'selective-color';

  /** Animation level */
  animationLevel: 'none' | 'subtle' | 'moderate' | 'aggressive';
}

// ============================================================================
// COPY DIRECTION
// ============================================================================

export interface CopyDirection {
  /** Section ID */
  sectionId: string;

  /** Heading copy direction */
  heading: string;

  /** Body copy direction */
  body: string;

  /** Subheading copy direction */
  subheading?: string;

  /** Key points to convey */
  keyPoints: string[];

  /** Words to use */
  useWords: string[];

  /** Words to avoid */
  avoidWords: string[];
}

// ============================================================================
// CONTENT DENSITY
// ============================================================================

export interface ContentDensity {
  /** Section ID */
  sectionId: string;

  /** Text density (0-1) */
  textDensity: number;

  /** Image density (0-1) */
  imageDensity: number;

  /** Video density (0-1) */
  videoDensity: number;

  /** Whitespace ratio (0-1) */
  whitespaceRatio: number;
}

// ============================================================================
// BRAND VOICE
// ============================================================================

export interface BrandVoice {
  /** Voice personality */
  personality: 'professional' | 'friendly' | 'authoritative' | 'playful' | 'sophisticated' | 'casual';

  /** Formality level (0-1) */
  formality: number;

  /** Technical level (0-1) */
  technicalLevel: number;

  /** Emotional level (0-1) */
  emotionalLevel: number;

  /** Vocabulary complexity */
  vocabularyComplexity: 'simple' | 'moderate' | 'advanced' | 'specialized';
}

export interface ToneVariation {
  /** Section ID */
  sectionId: string;

  /** Tone for this section */
  tone: 'excited' | 'calm' | 'urgent' | 'reassuring' | 'playful' | 'serious' | 'inspirational' | 'educational';

  /** Intensity (0-1) */
  intensity: number;
}

// ============================================================================
// LAYER INTERFACE
// ============================================================================

/**
 * Content Intelligence Layer interface.
 *
 * This layer consumes BusinessKnowledge + ExperienceBlueprint
 * and produces ContentBlueprint.
 * It is the SINGLE AUTHORITY for content strategy.
 */
export interface IContentIntelligenceLayer {
  /** Layer identifier */
  readonly id: 'content-intelligence';

  /** Layer name */
  readonly name: string;

  /** Layer version */
  readonly version: string;

  /**
   * Process upstream inputs and produce ContentBlueprint.
   *
   * @param businessKnowledge - Upstream BusinessKnowledge
   * @param experienceBlueprint - Upstream ExperienceBlueprint
   * @returns ContentBlueprint with full provenance
   */
  process(
    businessKnowledge: BusinessKnowledge,
    experienceBlueprint: ExperienceBlueprint
  ): Promise<ContentBlueprint>;

  /**
   * Validate ContentBlueprint.
   *
   * @param blueprint - Blueprint to validate
   * @returns Validation result with issues
   */
  validate(blueprint: ContentBlueprint): ValidationResult;
}
