/**
 * Experience Intelligence Layer - Canonical Types
 *
 * OWNERSHIP: This layer owns ExperienceBlueprint.
 * It is the SINGLE AUTHORITY for:
 * - Storytelling flow
 * - Section order
 * - Scene transitions
 * - Scroll narrative
 * - Motion language
 * - Hover behavior
 * - Animation density
 * - Interaction density
 * - Emotional curve
 * - Visual rhythm
 * - Conversion moments
 * - Engagement moments
 * - Pause moments
 * - Cinematic sequences
 * - Micro-interactions
 * - Parallax strategy
 * - Sticky sections
 * - Reveal strategy
 * - Performance budget
 *
 * CONSTRAINTS:
 * - Must NOT decide business logic
 * - Must NOT decide backend architecture
 * - Must NOT decide content/messaging
 * - Must NOT decide visual system (colors, typography)
 * - Must consume BusinessKnowledge from upstream
 * - Must produce ExperienceBlueprint for downstream
 */

import type { BusinessKnowledge } from '../business-intelligence/types.js';
import type { ValidationResult } from '../shared/types.js';

// Re-export shared types for convenience
export type { ValidationResult, ValidationIssue } from '../shared/types.js';

// ============================================================================
// PROVENANCE TRACKING
// ============================================================================

/**
 * Provenance record for every field in every blueprint.
 * Ensures every decision has: layer, confidence, evidence, timestamp, reasoning.
 */
export interface Provenance {
  /** Which layer created this field */
  layer: 'business-intelligence' | 'knowledge-acquisition' | 'experience-intelligence' | 'design-intelligence' | 'content-intelligence' | 'technology-planner' | 'application-blueprint' | 'execution-blueprint' | 'renderer';

  /** Confidence level (0-1) */
  confidence: number;

  /** Evidence supporting this decision */
  evidence: string[];

  /** When this decision was made */
  timestamp: Date;

  /** Reasoning behind this decision */
  reasoning: string;

  /** Source of information (e.g., "user-prompt", "business-knowledge", "design-system") */
  source: string;
}

/**
 * Provenance-aware wrapper for any value.
 */
export interface ProvenanceAware<T> {
  value: T;
  provenance: Provenance;
}

// ============================================================================
// EXPERIENCE BLUEPRINT - Canonical Output
// ============================================================================

/**
 * ExperienceBlueprint - The SINGLE AUTHORITY for user experience design.
 *
 * This is the missing artifact that enables consistent generation of
 * premium, cinematic, scroll-driven experiences.
 *
 * Every downstream layer (Design Intelligence, Content Intelligence, Renderer)
 * consumes this blueprint and MUST NOT override its decisions.
 */
export interface ExperienceBlueprint {
  /** Unique identifier */
  id: string;

  /** Timestamp of creation */
  createdAt: Date;

  /** Version of the blueprint */
  version: string;

  /** Reference to the upstream BusinessKnowledge */
  businessKnowledgeId: string;

  // --------------------------------------------------------------------------
  // STORYTELLING FLOW
  // --------------------------------------------------------------------------

  /** The narrative arc of the experience */
  storytellingFlow: ProvenanceAware<StorytellingFlow>;

  /** Ordered sections of the experience */
  sectionOrder: ProvenanceAware<SectionDefinition[]>;

  /** Scene transitions between sections */
  sceneTransitions: ProvenanceAware<SceneTransition[]>;

  // --------------------------------------------------------------------------
  // SCROLL NARRATIVE
  // --------------------------------------------------------------------------

  /** Scroll-driven narrative structure */
  scrollNarrative: ProvenanceAware<ScrollNarrative>;

  /**
   * Scroll-accumulation: the experience makes the user FEEL a quality
   * (scent, tension, calm) GROW the more they scroll — continuous,
   * not one-shot. Optional; consumed by the renderer as a `useScroll`
   * intensity meter.
   */
  scrollAccumulation?: ProvenanceAware<ScrollAccumulationConfig>;

  // --------------------------------------------------------------------------
  // MOTION LANGUAGE
  // --------------------------------------------------------------------------

  /** Motion choreography and timing */
  motionLanguage: ProvenanceAware<MotionLanguage>;

  /** Hover interaction philosophy */
  hoverBehavior: ProvenanceAware<HoverBehavior>;

  /** Animation density (0-1, where 0 = minimal, 1 = maximal) */
  animationDensity: ProvenanceAware<number>;

  /** Interaction density (0-1, where 0 = passive, 1 = highly interactive) */
  interactionDensity: ProvenanceAware<number>;

  // --------------------------------------------------------------------------
  // EMOTIONAL CURVE
  // --------------------------------------------------------------------------

  /** Emotional journey through the experience */
  emotionalCurve: ProvenanceAware<EmotionalPoint[]>;

  /** Visual rhythm and pacing */
  visualRhythm: ProvenanceAware<VisualRhythm>;

  // --------------------------------------------------------------------------
  // CONVERSION & ENGAGEMENT
  // --------------------------------------------------------------------------

  /** Moments designed for conversion (CTAs, sign-ups, purchases) */
  conversionMoments: ProvenanceAware<ConversionMoment[]>;

  /** Moments designed for engagement (scroll stops, hover explorations) */
  engagementMoments: ProvenanceAware<EngagementMoment[]>;

  /** Moments designed for pause (reflection, reading, absorption) */
  pauseMoments: ProvenanceAware<PauseMoment[]>;

  // --------------------------------------------------------------------------
  // CINEMATIC SEQUENCES
  // --------------------------------------------------------------------------

  /** Cinematic sequences (hero reveals, parallax sequences, scroll-triggered animations) */
  cinematicSequences: ProvenanceAware<CinematicSequence[]>;

  // --------------------------------------------------------------------------
  // MICRO-INTERACTIONS
  // --------------------------------------------------------------------------

  /** Micro-interactions (button hovers, form feedback, loading states) */
  microInteractions: ProvenanceAware<MicroInteraction[]>;

  // --------------------------------------------------------------------------
  // LAYOUT STRATEGIES
  // --------------------------------------------------------------------------

  /** Parallax scrolling strategy */
  parallaxStrategy: ProvenanceAware<ParallaxStrategy>;

  /** Sticky section strategy */
  stickySections: ProvenanceAware<StickySection[]>;

  /** Content reveal strategy */
  revealStrategy: ProvenanceAware<RevealStrategy>;

  // --------------------------------------------------------------------------
  // PERFORMANCE
  // --------------------------------------------------------------------------

  /** Performance budget for animations and interactions */
  performanceBudget: ProvenanceAware<PerformanceBudget>;
}

// ============================================================================
// STORYTELLING
// ============================================================================

/**
 * Storytelling flow - the narrative arc of the experience.
 */
export interface StorytellingFlow {
  /** Type of narrative arc */
  arc: 'hero-journey' | 'problem-solution' | 'before-after' | 'feature-benefit' | 'social-proof' | 'aspirational' | 'educational' | 'emotional';

  /** Key beats in the narrative */
  beats: StoryBeat[];

  /** Emotional tone at each beat */
  tone: 'excitement' | 'trust' | 'urgency' | 'calm' | 'wonder' | 'confidence' | 'curiosity' | 'delight';
}

export interface StoryBeat {
  /** Section index */
  sectionIndex: number;

  /** Beat type */
  type: 'hook' | 'problem' | 'solution' | 'proof' | 'cta' | 'transition' | 'climax' | 'resolution';

  /** Emotional weight (0-1) */
  weight: number;

  /** Duration in scroll units */
  duration: number;
}

/**
 * Section definition - ordered section of the experience.
 */
export interface SectionDefinition {
  /** Unique section identifier */
  id: string;

  /** Section type */
  type: 'hero' | 'features' | 'benefits' | 'testimonials' | 'pricing' | 'faq' | 'cta' | 'footer' | 'about' | 'team' | 'gallery' | 'contact' | 'custom';

  /** Section order (0-indexed) */
  order: number;

  /** Emotional goal for this section */
  emotionalGoal: string;

  /** Key message for this section */
  keyMessage: string;

  /** Content density (0-1) */
  contentDensity: number;

  /** Visual complexity (0-1) */
  visualComplexity: number;
}

/**
 * Scene transition between sections.
 */
export interface SceneTransition {
  /** Source section ID */
  from: string;

  /** Target section ID */
  to: string;

  /** Transition type */
  type: 'fade' | 'slide' | 'parallax' | 'zoom' | 'morph' | 'reveal' | 'cut' | 'dissolve';

  /** Transition duration (ms) */
  duration: number;

  /** Transition easing */
  easing: string;

  /** Whether transition is scroll-triggered */
  scrollTriggered: boolean;
}

// ============================================================================
// SCROLL NARRATIVE
// ============================================================================

/**
 * Scroll-driven narrative structure.
 */
export interface ScrollNarrative {
  /** Scroll speed profile */
  speedProfile: 'smooth' | 'snappy' | 'cinematic' | 'organic';

  /** Scroll-linked animations */
  scrollLinked: ScrollLinkedAnimation[];

  /** Scroll-triggered reveals */
  scrollTriggers: ScrollTrigger[];

  /** Scroll-based parallax layers */
  parallaxLayers: ParallaxLayer[];
}

/**
 * Scroll-Accumulation config.
 *
 * Signals that the experience should make the user FEEL a quality
 * (scent, intensity, tension, calm) GROW the more they scroll —
 * not just reveal sections one-shot, but accumulate continuously.
 *
 * Consumed by the renderer as a `useScroll`-linked intensity meter
 * (e.g. a scent-intensity bar that fills as you descend).
 */
export interface ScrollAccumulationConfig {
  /** Whether scroll-accumulation is enabled for this experience */
  enabled: boolean;

  /** The quality that accumulates (e.g. 'scent', 'tension', 'calm') */
  metric: string;

  /** Short label shown next to the intensity meter (e.g. 'Scent') */
  label: string;

  /** Accent color for the meter (css color) */
  accent: string;

  /** Where the meter lives: fixed corner, or inline per section */
  placement: 'fixed' | 'inline';

  /** Reverse direction: false = more scroll = more intensity (default) */
  reverse: boolean;

  /**
   * Optional scroll-transform narrative arc (e.g. { from: 'noise', to: 'silence' }).
   * When present, the accumulating quality is the `to` state and the renderer
   * animates the page from the chaotic `from` state toward the calm `to` state
   * as the user scrolls. Signal-derived, never industry-specific.
   */
  transformArc?: { from: string; to: string };
}

export interface ScrollLinkedAnimation {
  /** Element selector */
  selector: string;

  /** Animation property */
  property: 'translateY' | 'translateX' | 'opacity' | 'scale' | 'rotate';

  /** Scroll range [start, end] as percentage of viewport */
  scrollRange: [number, number];

  /** Output range for the property */
  outputRange: [number, number];

  /** Easing function */
  easing: string;
}

export interface ScrollTrigger {
  /** Element selector */
  selector: string;

  /** Trigger point (0-1, where 0 = top of viewport, 1 = bottom) */
  triggerPoint: number;

  /** Action to perform */
  action: 'reveal' | 'animate' | 'pin' | 'unpin' | 'toggleClass';

  /** Animation configuration */
  animation?: {
    property: string;
    from: number;
    to: number;
    duration: number;
    easing: string;
  };
}

export interface ParallaxLayer {
  /** Layer depth (0 = background, 1 = foreground) */
  depth: number;

  /** Speed multiplier (0 = static, 1 = normal scroll, >1 = faster) */
  speed: number;

  /** Element selectors for this layer */
  selectors: string[];
}

// ============================================================================
// MOTION LANGUAGE
// ============================================================================

/**
 * Motion choreography and timing.
 */
export interface MotionLanguage {
  /** Global motion personality */
  personality: 'elegant' | 'playful' | 'professional' | 'dynamic' | 'minimal' | 'cinematic';

  /** Timing profile */
  timing: TimingProfile;

  /** Choreography rules */
  choreography: ChoreographyRule[];

  /** Stagger patterns */
  staggerPatterns: StaggerPattern[];
}

export interface TimingProfile {
  /** Default duration range (ms) */
  durationRange: [number, number];

  /** Default easing */
  defaultEasing: string;

  /** Entrance easing */
  entranceEasing: string;

  /** Exit easing */
  exitEasing: string;

  /** Spring configuration for physics-based animations */
  spring?: {
    stiffness: number;
    damping: number;
    mass: number;
  };
}

export interface ChoreographyRule {
  /** Condition for this rule */
  condition: string;

  /** Animation sequence */
  sequence: ChoreographyStep[];

  /** Maximum total duration (ms) */
  maxDuration: number;
}

export interface ChoreographyStep {
  /** Element selector */
  selector: string;

  /** Animation type */
  animation: string;

  /** Delay from sequence start (ms) */
  delay: number;

  /** Duration (ms) */
  duration: number;
}

export interface StaggerPattern {
  /** Pattern name */
  name: string;

  /** Stagger delay between items (ms) */
  staggerDelay: number;

  /** Maximum stagger items */
  maxItems: number;

  /** Easing for stagger */
  easing: string;
}

// ============================================================================
// HOVER BEHAVIOR
// ============================================================================

/**
 * Hover interaction philosophy.
 */
export interface HoverBehavior {
  /** Global hover philosophy */
  philosophy: 'subtle' | 'expressive' | 'playful' | 'professional' | 'cinematic';

  /** Default hover animations */
  defaults: HoverAnimation;

  /** Per-element hover configs */
  elements: HoverElementConfig[];
}

export interface HoverAnimation {
  /** Scale on hover */
  scale?: number;

  /** Rotation on hover (degrees) */
  rotate?: number;

  /** Translation on hover (px) */
  translateX?: number;
  translateY?: number;

  /** Shadow on hover */
  shadow?: string;

  /** Color shift on hover */
  colorShift?: {
    property: 'background' | 'border' | 'text';
    from: string;
    to: string;
  };

  /** Duration (ms) */
  duration: number;

  /** Easing */
  easing: string;
}

export interface HoverElementConfig {
  /** Element type */
  type: 'button' | 'card' | 'link' | 'image' | 'icon' | 'input' | 'custom';

  /** Custom hover animation */
  animation: HoverAnimation;

  /** Whether to disable on touch devices */
  disableOnTouch: boolean;
}

// ============================================================================
// EMOTIONAL CURVE
// ============================================================================

/**
 * Emotional journey through the experience.
 */
export interface EmotionalPoint {
  /** Section index */
  sectionIndex: number;

  /** Emotional state */
  emotion: 'curiosity' | 'excitement' | 'trust' | 'urgency' | 'calm' | 'wonder' | 'confidence' | 'delight' | 'satisfaction';

  /** Intensity (0-1) */
  intensity: number;

  /** Duration (scroll units) */
  duration: number;
}

/**
 * Visual rhythm and pacing.
 */
export interface VisualRhythm {
  /** Rhythm pattern */
  pattern: 'steady' | 'accelerating' | 'decelerating' | 'syncopated' | 'organic';

  /** Section density variation */
  densityVariation: 'uniform' | 'varied' | 'dramatic';

  /** White space strategy */
  whiteSpace: 'generous' | 'balanced' | 'compact';

  /** Visual pacing beats per section */
  beatsPerSection: number;
}

// ============================================================================
// CONVERSION & ENGAGEMENT
// ============================================================================

/**
 * Conversion moment - designed for user action.
 */
export interface ConversionMoment {
  /** Section ID */
  sectionId: string;

  /** Conversion type */
  type: 'cta' | 'sign-up' | 'purchase' | 'contact' | 'download' | 'subscribe';

  /** Visual prominence (0-1) */
  prominence: number;

  /** Urgency level (0-1) */
  urgency: number;

  /** Trust signals to include */
  trustSignals: string[];
}

/**
 * Engagement moment - designed for user exploration.
 */
export interface EngagementMoment {
  /** Section ID */
  sectionId: string;

  /** Engagement type */
  type: 'hover-explore' | 'scroll-discover' | 'interactive-demo' | 'gallery-browse' | 'testimonial-read';

  /** Interaction density (0-1) */
  density: number;

  /** Reward mechanism */
  reward: 'visual-feedback' | 'content-reveal' | 'animation' | 'sound';
}

/**
 * Pause moment - designed for reflection.
 */
export interface PauseMoment {
  /** Section ID */
  sectionId: string;

  /** Pause type */
  type: 'reading' | 'reflection' | 'absorption' | 'decision';

  /** Recommended duration (ms) */
  duration: number;

  /** Visual cues for pause */
  visualCues: string[];
}

// ============================================================================
// CINEMATIC SEQUENCES
// ============================================================================

/**
 * Cinematic sequence - premium scroll-driven animations.
 */
export interface CinematicSequence {
  /** Sequence name */
  name: string;

  /** Sequence type */
  type: 'hero-reveal' | 'parallax-journey' | 'scroll-triggered' | 'text-animation' | 'image-reveal' | 'logo-animation' | 'counter-animation';

  /** Sections involved */
  sections: string[];

  /** Animation timeline */
  timeline: CinematicTimeline[];

  /** Performance tier */
  performanceTier: 'high' | 'medium' | 'low';
}

export interface CinematicTimeline {
  /** Timeline position (0-1) */
  position: number;

  /** Element selector */
  selector: string;

  /** Animation properties */
  animation: {
    property: string;
    from: number | string;
    to: number | string;
    duration: number;
    easing: string;
  };
}

// ============================================================================
// MICRO-INTERACTIONS
// ============================================================================

/**
 * Micro-interaction - small, focused animations.
 */
export interface MicroInteraction {
  /** Interaction name */
  name: string;

  /** Trigger */
  trigger: 'hover' | 'click' | 'focus' | 'scroll' | 'load' | 'data-change';

  /** Element selector */
  selector: string;

  /** Animation configuration */
  animation: {
    property: string;
    from: number | string;
    to: number | string;
    duration: number;
    easing: string;
  };

  /** Feedback type */
  feedback: 'visual' | 'haptic' | 'audio';
}

// ============================================================================
// LAYOUT STRATEGIES
// ============================================================================

/**
 * Parallax scrolling strategy.
 */
export interface ParallaxStrategy {
  /** Enable parallax */
  enabled: boolean;

  /** Parallax intensity (0-1) */
  intensity: number;

  /** Parallax layers */
  layers: ParallaxLayer[];

  /** Performance mode */
  performanceMode: 'gpu' | 'cpu' | 'auto';
}

/**
 * Sticky section strategy.
 */
export interface StickySection {
  /** Section ID */
  sectionId: string;

  /** Sticky behavior */
  behavior: 'pin' | 'scroll-through' | 'stack';

  /** Pin duration (scroll units) */
  pinDuration?: number;

  /** Stack offset (px) */
  stackOffset?: number;
}

/**
 * Content reveal strategy.
 */
export interface RevealStrategy {
  /** Default reveal type */
  default: 'fade' | 'slide-up' | 'slide-left' | 'scale' | 'blur' | 'none';

  /** Reveal on scroll */
  scrollReveal: boolean;

  /** Reveal delay between elements (ms) */
  staggerDelay: number;

  /** Reveal duration (ms) */
  duration: number;

  /** Reveal easing */
  easing: string;
}

// ============================================================================
// PERFORMANCE
// ============================================================================

/**
 * Performance budget for animations and interactions.
 */
export interface PerformanceBudget {
  /** Maximum total animation weight (0-1) */
  totalWeight: number;

  /** Maximum concurrent animations */
  maxConcurrentAnimations: number;

  /** Maximum animation duration (ms) */
  maxDuration: number;

  /** Target frame rate */
  targetFrameRate: 30 | 60 | 120;

  /** Reduced motion fallback strategy */
  reducedMotionStrategy: 'disable' | 'simplify' | 'replace';

  /** GPU acceleration preference */
  gpuAcceleration: 'always' | 'when-needed' | 'never';

  /** Animation complexity budget per section */
  complexityPerSection: number;
}

// ============================================================================
// LAYER INTERFACE
// ============================================================================

/**
 * Experience Intelligence Layer interface.
 *
 * This layer consumes BusinessKnowledge and produces ExperienceBlueprint.
 * It is the SINGLE AUTHORITY for user experience design.
 */
export interface IExperienceIntelligenceLayer {
  /** Layer identifier */
  readonly id: 'experience-intelligence';

  /** Layer name */
  readonly name: string;

  /** Layer version */
  readonly version: string;

  /**
   * Process BusinessKnowledge and produce ExperienceBlueprint.
   *
   * @param businessKnowledge - Upstream BusinessKnowledge
   * @returns ExperienceBlueprint with full provenance
   */
  process(businessKnowledge: BusinessKnowledge): Promise<ExperienceBlueprint>;

  /**
   * Validate ExperienceBlueprint.
   *
   * @param blueprint - Blueprint to validate
   * @returns Validation result with issues
   */
  validate(blueprint: ExperienceBlueprint): ValidationResult;
}
