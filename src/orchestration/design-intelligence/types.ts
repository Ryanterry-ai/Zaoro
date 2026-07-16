// ─── Design Intelligence Types ──────────────────────────────────────────────
//
// Shared types for all design sub-engines. Every sub-engine consumes
// DesignContext and produces DesignRecommendation/DesignDecision objects.
// The Design Intelligence Engine aggregates these into a unified decision.
// ─────────────────────────────────────────────────────────────────────────────

import type { Industry } from '../types.js';
import type { ExperienceStrategy } from '../experience-os/types.js';

// ─── Design Context ─────────────────────────────────────────────────────────

export interface DesignContext {
  /** Project industry */
  industry: Industry;
  /** Sub-industry (e.g., 'dental', 'fine-dining') */
  subIndustry?: string | undefined;
  /** Target audience */
  audience?: string | undefined;
  /** Brand personality (e.g., 'luxury', 'modern', 'playful') */
  personality?: string | undefined;
  /** Current design stage in the pipeline */
  stage: 'research' | 'analysis' | 'architecture' | 'database' | 'api' | 'frontend' | 'integration' | 'qa' | 'deployment' | 'documentation';
  /** Existing artifacts from prior stages */
  artifacts: Record<string, unknown>;
  /** BOS pack context */
  bosIndustry?: string | undefined;
  /** User preferences or overrides */
  preferences?: DesignPreferences | undefined;
  /**
   * When present, the Motion Engine derives its capability-selection signals
   * from the ExperienceStrategy (style + pacing + conversion goal + budget)
   * instead of only the personality/animationLevel preference. This is the
   * M2 wiring that lets the strategy layer drive deterministic motion selection.
   */
  experienceStrategy?: ExperienceStrategy | undefined;
}

export interface DesignPreferences {
  /** Preferred color palette direction */
  colorDirection?: string | undefined;
  /** Preferred typography style */
  typographyStyle?: string | undefined;
  /** Layout preference */
  layoutStyle?: string | undefined;
  /** Animation preference */
  animationLevel?: 'none' | 'subtle' | 'moderate' | 'expressive' | undefined;
  /** Framework preference */
  framework?: string | undefined;
}

// ─── Design Recommendations ─────────────────────────────────────────────────

export type DesignDomain = 'ux' | 'visual' | 'design-system' | 'component' | 'motion' | 'polish';

export interface DesignRecommendation {
  /** Which sub-engine produced this */
  domain: DesignDomain;
  /** Recommendation title */
  title: string;
  /** What to implement */
  description: string;
  /** Confidence score 0-1 */
  confidence: number;
  /** Priority: must-have, should-have, nice-to-have */
  priority: 'must' | 'should' | 'nice';
  /** Specific tokens/config to apply */
  tokens?: Record<string, unknown> | undefined;
  /** CSS/design-system values */
  css?: Record<string, string> | undefined;
  /** Component suggestions */
  components?: ComponentSuggestion[] | undefined;
  /** Animation suggestions */
  animations?: AnimationSuggestion[] | undefined;
}

export interface ComponentSuggestion {
  name: string;
  source: string;
  props?: Record<string, unknown> | undefined;
  variant?: string | undefined;
  description?: string | undefined;
}

export interface AnimationSuggestion {
  name: string;
  type: 'entrance' | 'exit' | 'hover' | 'scroll' | 'transition' | 'micro';
  config: Record<string, unknown>;
  description?: string | undefined;
}

// ─── Design Decisions (aggregated) ──────────────────────────────────────────

export interface DesignDecision {
  /** Unique decision ID */
  id: string;
  /** Timestamp */
  timestamp: number;
  /** Design context used */
  context: DesignContext;
  /** All recommendations from sub-engines */
  recommendations: DesignRecommendation[];
  /** Unified color tokens */
  colorTokens: ColorTokens;
  /** Unified typography tokens */
  typographyTokens: TypographyTokens;
  /** Unified spacing/layout tokens */
  layoutTokens: LayoutTokens;
  /** Unified motion tokens */
  motionTokens: MotionTokens;
  /** Component map */
  componentMap: ComponentMap;
  /** CSS custom properties */
  cssCustomProperties: Record<string, string>;
}

// ─── Token Types ────────────────────────────────────────────────────────────

export interface ColorTokens {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  accent: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface TypographyTokens {
  fontFamily: {
    heading: string;
    body: string;
    mono: string;
  };
  fontSize: Record<string, string>;
  fontWeight: Record<string, number>;
  lineHeight: Record<string, number>;
  letterSpacing: Record<string, string>;
}

export interface LayoutTokens {
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  containerMaxWidth: string;
  gridColumns: number;
  gridGap: string;
  breakpoints: Record<string, string>;
}

export interface MotionTokens {
  duration: Record<string, string>;
  easing: Record<string, string>;
  reducedMotion: boolean;
}

export interface ComponentMap {
  button: ComponentConfig;
  card: ComponentConfig;
  input: ComponentConfig;
  modal: ComponentConfig;
  navigation: ComponentConfig;
  [key: string]: ComponentConfig;
}

export interface ComponentConfig {
  variant: string;
  size: string;
  style: Record<string, string>;
  variants?: Record<string, Record<string, string>> | undefined;
}

// ─── Sub-Engine Interface ───────────────────────────────────────────────────

export interface DesignSubEngine {
  /** Engine name */
  readonly name: string;
  /** Engine domain */
  readonly domain: DesignDomain;
  /** Generate recommendations for a design context */
  recommend(ctx: DesignContext): DesignRecommendation[];
  /** Optional: refine a decision based on other engines' output */
  refine?(decision: DesignDecision): DesignDecision;
}

// ─── Industry Personality Mapping ───────────────────────────────────────────

export const INDUSTRY_PERSONALITIES: Record<string, string> = {
  'ecommerce': 'modern',
  'saas': 'clean',
  'fintech': 'trustworthy',
  'healthcare': 'calm',
  'education': 'friendly',
  'restaurant': 'warm',
  'fitness': 'energetic',
  'real-estate': 'professional',
  'media': 'editorial',
  'portfolio': 'creative',
  'marketplace': 'vibrant',
  'nonprofit': 'compassionate',
};
