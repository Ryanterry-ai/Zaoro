/**
 * Experience Intelligence Layer
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
 */

export * from './types.js';

// Supplementary types for experience engines
export type {
  ExperienceStyle,
  Scene,
  NarrativeRole,
  SectionType,
  InteractionDensity,
  EmotionTarget,
  MotionConfig,
  MotionType,
  ScrollTriggerConfig,
  ScrollTriggerType,
  SnapConfig,
  CameraEffect,
  CameraEffectType,
  ChoreographyConfig,
  RevealStrategyType,
  StaggerConfig,
  LayoutTransition,
  TimingConfig,
  HoverStrategy,
  HoverFeedback,
  StickyConfig,
  TransitionConfig,
  PageTransitionType,
  ReducedMotionStrategy,
  EmotionCurve,
  NarrativeStructure,
  CameraEffectsConfig,
  MotionTimeline,
  EngagementTrigger,
  ExperienceProfile,
} from './types-experience.js';

// Experience engines
export { generateExperienceBlueprint, validateExperienceBlueprint } from './experience-engine.js';
export type { ExperienceEngineInput, ExperienceValidationResult } from './experience-engine.js';
export { getExperienceProfile, customizeProfile, getAllExperienceProfiles, getCapabilityExperienceHints, getExperienceProfileForCapabilities } from './experience-profiles.js';
export type { CapabilityExperienceHints } from './experience-profiles.js';
export { planScrollNarrative, reorderForNarrative } from './scroll-narrative.js';
export { planScenes, generateEmotionCurve } from './scene-planner.js';
export { generateHoverBehaviors } from './hover-intelligence.js';
export { planMotionLanguage } from './motion-language.js';
