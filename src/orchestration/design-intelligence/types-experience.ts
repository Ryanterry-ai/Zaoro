/**
 * @deprecated This file is deprecated. Import from '../experience-intelligence/types.js' instead.
 *
 * This file exists for backward compatibility only. It re-exports all types
 * from the canonical Experience Intelligence types file.
 *
 * All new code should import directly from:
 *   import type { ExperienceBlueprint } from '../experience-intelligence/types.js';
 */

// Re-export all types from canonical location EXCEPT those overridden locally
export type {
  // Canonical types
  ExperienceBlueprint,
  Provenance,
  ProvenanceAware,
  StorytellingFlow,
  SectionDefinition,
  SceneTransition,
  ScrollLinkedAnimation,
  ScrollTrigger,
  MotionLanguage,
  TimingProfile,
  ChoreographyRule,
  ChoreographyStep,
  StaggerPattern,
  HoverBehavior,
  HoverAnimation,
  HoverElementConfig,
  EmotionalPoint,
  VisualRhythm,
  ConversionMoment,
  EngagementMoment,
  PauseMoment,
  CinematicSequence,
  CinematicTimeline,
  MicroInteraction,
  ParallaxStrategy,
  StickySection,
  PerformanceBudget,
  ValidationResult,
  ValidationIssue,
  IExperienceIntelligenceLayer,
} from '../experience-intelligence/types.js';

// Import canonical types needed by local definitions
import type {
  ParallaxLayer as CanonicalParallaxLayer,
  StoryBeat as CanonicalStoryBeat,
} from '../experience-intelligence/types.js';

// Additional types specific to Design Intelligence experience engine
// These are NOT duplicates - they are supplementary types used by the
// design-intelligence experience engine

export type ExperienceStyle =
  | 'cinematic'
  | 'luxury'
  | 'minimal'
  | 'editorial'
  | 'enterprise'
  | 'playful'
  | 'technical'
  | 'premium'
  | 'storytelling';

export interface Scene {
  id: string;
  name: string;
  narrativeRole: NarrativeRole;
  sectionType: SectionType;
  entry: MotionConfig;
  exit: MotionConfig;
  scrollTrigger: ScrollTriggerConfig;
  cameraEffect: CameraEffect;
  interactionDensity: InteractionDensity;
  emotionTarget: EmotionTarget;
  choreography: ChoreographyConfig;
  timing: TimingConfig;
  performanceCost: number;
  sticky?: StickyConfig;
  parallaxLayers?: ParallaxLayer[];
}

export type NarrativeRole =
  | 'hook'
  | 'problem'
  | 'insight'
  | 'solution'
  | 'proof'
  | 'trust'
  | 'transformation'
  | 'benefits'
  | 'offer'
  | 'cta'
  | 'social-proof'
  | 'faq'
  | 'about'
  | 'team'
  | 'pricing'
  | 'features'
  | 'demo'
  | 'contact';

export type SectionType =
  | 'hero'
  | 'features'
  | 'testimonials'
  | 'pricing'
  | 'cta'
  | 'about'
  | 'faq'
  | 'contact'
  | 'footer'
  | 'team'
  | 'gallery'
  | 'stats'
  | 'process'
  | 'comparison'
  | 'integration'
  | 'security'
  | 'story'
  | 'transformation'
  | 'demo'
  | 'menu'
  | 'booking'
  | 'products'
  | 'categories';

export type InteractionDensity = 'minimal' | 'light' | 'moderate' | 'rich' | 'immersive';

export type EmotionTarget =
  | 'trust'
  | 'excitement'
  | 'calm'
  | 'urgency'
  | 'aspiration'
  | 'confidence'
  | 'curiosity'
  | 'delight'
  | 'motivation'
  | 'serenity'
  | 'energy'
  | 'warmth';

export interface MotionConfig {
  type: MotionType;
  duration: number;
  easing: string;
  delay: number;
  intensity: number;
  properties: Record<string, unknown>;
}

export type MotionType =
  | 'fade-up'
  | 'fade-down'
  | 'fade-left'
  | 'fade-right'
  | 'fade-in'
  | 'scale-up'
  | 'scale-down'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'blur-in'
  | 'blur-out'
  | 'rotate-in'
  | 'flip-in'
  | 'zoom-pan'
  | 'parallax'
  | 'reveal'
  | 'clip-path'
  | 'morph'
  | 'stagger'
  | 'none';

export interface ScrollTriggerConfig {
  trigger: ScrollTriggerType;
  start: string;
  end: string;
  scrub: boolean | number;
  pin: boolean;
  snap?: SnapConfig;
}

export type ScrollTriggerType =
  | 'enter'
  | 'leave'
  | 'enter-leave'
  | 'inside'
  | 'progress'
  | 'snap';

export interface SnapConfig {
  points: number[];
  easing: string;
}

export interface CameraEffect {
  type: CameraEffectType;
  intensity: number;
  duration: number;
  properties: Record<string, unknown>;
}

export type CameraEffectType =
  | 'parallax'
  | 'zoom'
  | 'rotate'
  | 'fade'
  | 'blur'
  | 'reveal'
  | 'none'
  | 'zoom-in'
  | 'pan-right'
  | 'parallax-medium'
  | 'parallax-slow'
  | 'parallax-fast'
  | 'depth-of-field';

export interface ChoreographyConfig {
  stagger?: StaggerConfig;
  revealStrategy: RevealStrategyType;
  layoutTransition?: LayoutTransition;
  rhythm?: 'even' | 'accelerating' | 'decelerating' | 'breathing';
}

export type RevealStrategyType =
  | 'simultaneous'
  | 'cascade'
  | 'sequential'
  | 'grid-fill'
  | 'typewriter'
  | 'unfold'
  | 'fade'
  | 'slide-up'
  | 'slide-left'
  | 'scale'
  | 'blur'
  | 'none';

export interface StaggerConfig {
  enabled?: boolean;
  delay?: number;
  from: 'first' | 'last' | 'center' | 'random' | 'start' | 'end';
  childDelay?: number;
  maxDuration?: number;
  direction?: string;
}

export type LayoutTransition =
  | 'fade'
  | 'slide'
  | 'zoom'
  | 'morph'
  | 'none'
  | 'shared-layout';

export interface TimingConfig {
  duration: number;
  easing?: string;
  delay?: number;
  initialDelay?: number;
  groupDelay?: number;
  adaptive?: boolean;
}

export type HoverStrategy =
  | 'magnetic'
  | 'elevation'
  | 'glow'
  | 'image-zoom'
  | 'depth-shift'
  | 'icon-movement'
  | 'border-draw'
  | 'background-shift'
  | 'scale-subtle'
  | 'tilt-3d'
  | 'cursor-follow'
  | 'glass-movement'
  | 'text-reveal'
  | 'none';

export interface HoverFeedback {
  type: 'visual' | 'haptic' | 'audio';
  intensity: number;
}

export interface StickyConfig {
  enabled: boolean;
  offset: number;
  zIndex?: number;
  position?: 'top' | 'center' | 'bottom';
  stickyContent?: string[];
  scrollContent?: string[];
}

export interface TransitionConfig {
  page: PageTransitionType;
  duration: number;
  easing: string;
}

export type PageTransitionType =
  | 'fade'
  | 'slide'
  | 'zoom'
  | 'morph'
  | 'none';

export interface ReducedMotionStrategy {
  behavior: 'disable-all' | 'simplify' | 'essential-only';
  essentialAnimations: string[];
  substituteEffects: Record<string, string>;
}

export interface EmotionCurve {
  points: Array<{ sceneIndex: number; intensity: number; emotion: EmotionTarget }>;
  arc: 'rising' | 'falling' | 'bell' | 'wave' | 'tension-release' | 'steady';
}

export interface ScrollNarrative {
  structure: NarrativeStructure;
  pacing: 'fast' | 'moderate' | 'slow' | 'variable';
  adaptive: boolean;
  beats: CanonicalStoryBeat[];
}

export type NarrativeStructure =
  | 'problem-solution'
  | 'journey'
  | 'before-after'
  | 'discovery'
  | 'transformation'
  | 'comparison'
  | 'progressive-disclosure'
  | 'storytelling'
  | 'data-driven';

export interface CameraEffectsConfig {
  parallaxEnabled: boolean;
  defaultSpeed: number;
  perspective3D: boolean;
  sceneOverrides: Record<string, CameraEffect>;
}

export interface MotionTimeline {
  globalStagger: number;
  sceneTransitionDuration: number;
  scrollUpdateRate: number;
  batchUpdates: boolean;
}

export interface EngagementTrigger {
  type: 'scroll-milestone' | 'time-on-page' | 'interaction-count' | 'cursor-distance';
  threshold: number;
  action: 'reveal-extra-content' | 'animate-counter' | 'show-tooltip' | 'highlight-element';
  sceneId: string;
}

export interface ExperienceProfile {
  industry: string;
  name: string;
  defaultStyle: ExperienceStyle;
  emotionalQualities: EmotionTarget[];
  narrativeStructures: NarrativeStructure[];
  hoverDefaults: HoverStrategy[];
  interactionDensity: InteractionDensity;
  motionIntensity: number;
  conversionFocus: 'low' | 'medium' | 'high';
  performanceSensitivity: 'low' | 'medium' | 'high';
  sceneTemplate: NarrativeRole[];
  scrollPacing: 'fast' | 'moderate' | 'slow' | 'variable';
}

// Local type aliases for canonical types used in local definitions
export type ParallaxLayer = CanonicalParallaxLayer;
export type StoryBeat = CanonicalStoryBeat;
/** @deprecated Use RevealStrategyType instead. Kept for backward compatibility. */
export type RevealStrategy = RevealStrategyType;