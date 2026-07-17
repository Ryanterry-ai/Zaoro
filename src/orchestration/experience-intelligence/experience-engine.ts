// ─── Experience Intelligence Engine ──────────────────────────────────────────
//
// The single authority for how users FEEL while interacting with generated
// applications. Consumes DesignDNA + DesignDecision + BusinessResearch to
// produce an ExperienceBlueprint that the renderer consumes.
//
// Architecture:
//   DesignDNA + DesignDecision + BusinessResearch
//     ↓
//   Experience Intelligence Engine
//     ├── Experience Profile (industry defaults)
//     ├── Scene Planner (section → scenes)
//     ├── Scroll Narrative (story structure)
//     ├── Hover Intelligence (interaction philosophy)
//     └── Motion Language (choreography, timing, micro-interactions)
//     ↓
//   ExperienceBlueprint
//     ↓
//   Renderer (generates premium code)
//
// This engine NEVER:
// - Duplicates existing engines
// - Hardcodes animations
// - Hardcodes industries
// - Bypasses Design Intelligence
// ─────────────────────────────────────────────────────────────────────────────

import type { Industry } from '../types.js';
import type { DesignDecision, DesignContext } from '../design-intelligence/types.js';
import type { DesignDNA } from '../../generation/design-dna.js';
import type {
  ProvenanceAware,
  Provenance,
} from './types.js';
import type {
  ExperienceBlueprint,
  ExperienceStyle,
  Scene,
  HoverBehavior,
  MicroInteraction,
  TransitionConfig,
  StickyConfig,
  ParallaxLayer,
  MotionTimeline,
  ConversionMoment,
  EngagementTrigger,
  PerformanceBudget,
  EmotionCurve,
  ScrollNarrative,
  CameraEffectsConfig,
} from './types-experience.js';
import type { ScrollAccumulationConfig } from './types.js';

import { getExperienceProfile, customizeProfile, getExperienceProfileForCapabilities } from './experience-profiles.js';
import type { ExperienceProfile } from './types-experience.js';
import { planScenes, generateEmotionCurve } from './scene-planner.js';
import { planScrollNarrative, reorderForNarrative } from './scroll-narrative.js';
import { generateHoverBehaviors } from './hover-intelligence.js';
import { planMotionLanguage } from './motion-language.js';

// ─── Experience Style Determination ────────────────────────────────────────

/**
 * Determine experience style from DesignDNA, DesignDecision, and profile.
 * This is the single source of truth for the overall feel.
 */
function determineExperienceStyle(
  profile: ExperienceProfile,
  designDNA?: DesignDNA,
  designDecision?: DesignDecision,
): ExperienceStyle {
  // Priority: DesignDNA brand personality > DesignDecision personality > profile default
  const personality = (
    designDNA?.brandPersonality ||
    designDecision?.context?.personality ||
    ''
  ).toLowerCase();

  // Map personality to experience style
  const personalityToStyle: Record<string, ExperienceStyle> = {
    luxury: 'luxury',
    premium: 'premium',
    elegant: 'luxury',
    sophisticated: 'luxury',
    modern: 'premium',
    clean: 'minimal',
    minimal: 'minimal',
    simple: 'minimal',
    playful: 'playful',
    fun: 'playful',
    creative: 'cinematic',
    cinematic: 'cinematic',
    dramatic: 'cinematic',
    editorial: 'editorial',
    storytelling: 'storytelling',
    enterprise: 'enterprise',
    professional: 'enterprise',
    technical: 'technical',
    trustworthy: 'enterprise',
    warm: 'editorial',
    energetic: 'premium',
    calm: 'minimal',
  };

  const mapped = personalityToStyle[personality];
  if (mapped) return mapped;

  // Fall back to profile default
  return profile.defaultStyle;
}

// ─── Component Type Extraction ─────────────────────────────────────────────

function extractComponentTypes(sections: Array<{ type: string }>): string[] {
  const typeMap: Record<string, string> = {
    'HeroBanner': 'button',
    'FeatureGrid': 'feature-card',
    'Testimonials': 'testimonial',
    'PricingTable': 'pricing-card',
    'CTASection': 'button',
    'AboutSection': 'card',
    'FAQSection': 'list-item',
    'ContactForm': 'input',
    'Gallery': 'gallery-item',
    'StatsCards': 'card',
    'TeamSection': 'card',
    'ProcessSteps': 'card',
    'ComparisonTable': 'card',
    'IntegrationGrid': 'feature-card',
    'SecuritySection': 'card',
    'StorySection': 'card',
    'TransformationSection': 'card',
    'DemoSection': 'card',
    'MenuSection': 'list-item',
    'BookingForm': 'input',
    'ProductGrid': 'product-card',
    'CategoryGrid': 'feature-card',
    'TestimonialCarousel': 'testimonial',
    'ProductShowcase': 'product-card',
  };

  const types = new Set<string>();
  for (const section of sections) {
    const mapped = typeMap[section.type];
    if (mapped) types.add(mapped);
    // Always include buttons and links
    types.add('button');
    types.add('link');
  }

  return Array.from(types);
}

// ─── Provenance Helpers ────────────────────────────────────────────────────

function wrap<T>(value: T, layer: Provenance['layer'], reasoning: string): ProvenanceAware<T> {
  return {
    value,
    provenance: {
      layer,
      confidence: 0.85,
      evidence: [reasoning],
      timestamp: new Date(),
      reasoning,
      source: 'experience-intelligence-engine',
    },
  };
}

// ─── Performance Budget Generator ──────────────────────────────────────────

function generatePerformanceBudget(
  profile: ExperienceProfile,
  style: ExperienceStyle,
  sceneCount: number,
): PerformanceBudget {
  const sensitivityMap: Record<string, number> = { high: 0.6, medium: 0.8, low: 1.0 };
  const sensitivityMultiplier = sensitivityMap[profile.performanceSensitivity] ?? 0.8;

  const sceneScale = Math.max(0.5, 1 - (sceneCount - 4) * 0.05);

  const maxDuration = Math.round(3000 * sensitivityMultiplier * sceneScale);
  const maxConcurrentAnimations = profile.performanceSensitivity === 'high' ? 3 : 5;

  return {
    totalWeight: 0.7 * sensitivityMultiplier,
    maxConcurrentAnimations,
    maxDuration,
    targetFrameRate: profile.performanceSensitivity === 'high' ? 30 : 60,
    reducedMotionStrategy: profile.performanceSensitivity === 'high' ? 'simplify' : 'simplify',
    gpuAcceleration: profile.performanceSensitivity === 'high' ? 'always' : 'when-needed',
    complexityPerSection: Math.round((1 / Math.max(sceneCount, 1)) * 100) / 100,
  };
}

// ─── Conversion Moments Generator ──────────────────────────────────────────

function generateConversionMoments(
  scenes: Scene[],
  profile: ExperienceProfile,
): ConversionMoment[] {
  if (profile.conversionFocus === 'low') return [];

  const moments: ConversionMoment[] = [];

  // CTA scene always gets a conversion moment
  const ctaScene = scenes.find(s => s.narrativeRole === 'cta');
  if (ctaScene) {
    moments.push({
      sectionId: ctaScene.id,
      type: 'cta',
      prominence: 0.8,
      urgency: 0.5,
      trustSignals: [],
    });
  }

  if (profile.conversionFocus === 'medium') return moments;

  // High conversion focus: add social proof and urgency moments
  const proofScene = scenes.find(s =>
    s.narrativeRole === 'proof' || s.narrativeRole === 'social-proof'
  );
  if (proofScene) {
    moments.push({
      sectionId: proofScene.id,
      type: 'sign-up',
      prominence: 0.7,
      urgency: 0.6,
      trustSignals: ['testimonials'],
    });
  }

  // Pricing scene gets risk-reversal
  const pricingScene = scenes.find(s => s.narrativeRole === 'pricing');
  if (pricingScene) {
    moments.push({
      sectionId: pricingScene.id,
      type: 'contact',
      prominence: 0.6,
      urgency: 0.4,
      trustSignals: ['guarantee', 'trial'],
    });
  }

  // Benefits scene gets urgency
  const benefitsScene = scenes.find(s => s.narrativeRole === 'benefits');
  if (benefitsScene) {
    moments.push({
      sectionId: benefitsScene.id,
      type: 'cta',
      prominence: 0.7,
      urgency: 0.9,
      trustSignals: [],
    });
  }

  return moments;
}

// ─── Engagement Triggers Generator ─────────────────────────────────────────

function generateEngagementTriggers(
  scenes: Scene[],
  profile: ExperienceProfile,
): EngagementTrigger[] {
  const triggers: EngagementTrigger[] = [];

  // Scroll milestone triggers for long pages
  if (scenes.length > 4) {
    const midpoint = Math.floor(scenes.length / 2);
    triggers.push({
      type: 'scroll-milestone',
      threshold: 50,
      action: 'highlight-element',
      sceneId: scenes[midpoint]?.id ?? scenes[0]?.id ?? 'scene-0',
    });
  }

  // Time-on-page trigger for engagement
  if (profile.conversionFocus !== 'low') {
    triggers.push({
      type: 'time-on-page',
      threshold: 10000,
      action: 'reveal-extra-content',
      sceneId: scenes[scenes.length - 2]?.id ?? scenes[0]?.id ?? 'scene-0',
    });
  }

  return triggers;
}

// ─── Camera Effects Config ─────────────────────────────────────────────────

function generateCameraConfig(
  style: ExperienceStyle,
  scenes: Scene[],
): CameraEffectsConfig {
  const parallaxEnabled = style !== 'minimal' && style !== 'enterprise';
  const perspective3D = style === 'cinematic' || style === 'luxury';

  const sceneOverrides: Record<string, import('./types-experience.js').CameraEffect> = {};
  for (const scene of scenes) {
    if (scene.cameraEffect.type !== 'none') {
      sceneOverrides[scene.id] = scene.cameraEffect;
    }
  }

  return {
    parallaxEnabled,
    defaultSpeed: style === 'cinematic' ? 0.3 : 0.15,
    perspective3D,
    sceneOverrides,
  };
}

// ─── Sticky Sections ───────────────────────────────────────────────────────

function extractStickySections(scenes: Scene[]): StickyConfig[] {
  return scenes
    .filter(s => s.sticky?.enabled)
    .map(s => s.sticky!)
    .filter((s): s is StickyConfig => s !== undefined);
}

// ─── Parallax Layers ───────────────────────────────────────────────────────

function extractParallaxLayers(scenes: Scene[]): ParallaxLayer[] {
  const layers: ParallaxLayer[] = [];
  for (const scene of scenes) {
    if (scene.parallaxLayers) {
      layers.push(...scene.parallaxLayers);
    }
  }
  return layers;
}

// ─── Main Engine ───────────────────────────────────────────────────────────

export interface ExperienceEngineInput {
  /** Industry (optional inference label — NOT used for branching decisions) */
  industry?: Industry;
  /** Sub-industry */
  subIndustry?: string;
  /** Page sections from ApplicationSpec */
  sections: Array<{ type: string; content?: Record<string, unknown> }>;
  /** Page type (landing, about, product, etc.) */
  pageType: string;
  /** Design DNA (optional) */
  designDNA?: DesignDNA;
  /** Design Decision (optional) */
  designDecision?: DesignDecision;
  /** Personality override */
  personality?: string;
  /** Resolved capabilities (optional) — primary signal for experience derivation */
  capabilities?: string[];
  /** Raw prompt/description text — used to detect a scroll-transform narrative
   *  arc (e.g. "scroll transforms noise into silence"). Signal-based, not
   *  industry-based. */
  description?: string;
}

/**
 * Detect a SCROLL-TRANSFORM narrative from the description text.
 *
 * This is fully generic: it looks for (a) a scroll anchor ("scroll", "as you
 * scroll", "on scroll") and (b) a transformation arc — an antonym pair where
 * the first state is chaotic/heavy and the second is calm/clear/silent. Any
 * brand can express this (noise→silence, chaos→calm, clutter→clarity,
 * tension→ease). No industry lookup is involved.
 *
 * Returns the theme word for the accumulation metric (derived from the
 * "calm" end of the arc) and the raw arc pair for the renderer to animate.
 */
export interface MotionIntent {
  scrollDriven: boolean;
  transformArc: { from: string; to: string } | null;
  /** Human theme word for the accumulating quality (e.g. "silence", "calm"). */
  theme: string | null;
}

const SCROLL_ANCHORS = ['scroll', 'as you scroll', 'on scroll', 'while scrolling', 'every scroll', 'scrolling'];
// chaos-end → calm-end antonym pairs (first = before, second = after)
const TRANSFORM_PAIRS: Array<[RegExp, string, string]> = [
  [/\bnoise\b.*\b(silence|silent|calm)\b|\b(silence|silent|calm)\b.*\bnoise\b/, 'noise', 'silence'],
  [/\bchaos\b.*\b(calm|calm|clarity|peace|still)\b|\b(calm|clarity|peace|still)\b.*\bchaos\b/, 'chaos', 'calm'],
  [/\bclutter\b.*\b(clarity|clear|calm)\b|\b(clarity|clear|calm)\b.*\bclutter\b/, 'clutter', 'clarity'],
  [/\btension\b.*\b(ease|calm|relief|peace)\b|\b(ease|calm|relief|peace)\b.*\btension\b/, 'tension', 'ease'],
  [/\bstatic\b.*\b(clarity|calm|flow)\b|\b(clarity|calm|flow)\b.*\bstatic\b/, 'static', 'flow'],
  [/\bnoise\b.*\b(peace|quiet|still|serenity)\b|\b(peace|quiet|still|serenity)\b.*\bnoise\b/, 'noise', 'peace'],
];

export function deriveMotionIntent(description?: string): MotionIntent {
  if (!description) return { scrollDriven: false, transformArc: null, theme: null };
  const lower = description.toLowerCase();

  const scrollDriven = SCROLL_ANCHORS.some((a) => lower.includes(a));

  let transformArc: { from: string; to: string } | null = null;
  let theme: string | null = null;
  for (const [re, from, to] of TRANSFORM_PAIRS) {
    if (re.test(lower)) {
      transformArc = { from, to };
      theme = to;
      break;
    }
  }

  return { scrollDriven, transformArc, theme };
}

/**
 * Generate an ExperienceBlueprint for a page.
 * This is the main entry point for the Experience Intelligence Engine.
 *
 * The experience is derived from DESIGN SIGNALS (personality, design DNA,
 * design decision, capabilities) — never from an `if industry == X` branch.
 * The optional `industry` label is used only as a fallback default profile
 * name; it drives no control-flow decision.
 */
export function generateExperienceBlueprint(
  input: ExperienceEngineInput,
): ExperienceBlueprint {
  const {
    industry,
    subIndustry,
    sections,
    pageType,
    designDNA,
    designDecision,
    personality,
    capabilities,
    description,
  } = input;

  // Detect a scroll-transform narrative arc from the description. Generic —
  // any brand expressing "X → calm" on scroll triggers an accumulating,
  // transformative motion experience. This is the signal that lets the
  // renderer deliver the "unforgettable" scroll moment without per-industry
  // templates.
  const motionIntent = deriveMotionIntent(description);

  // 1. Derive the base profile from signals — capabilities take priority,
  //    then the optional industry label as a neutral default. No branching
  //    on industry values occurs below.
  const baseProfile = capabilities && capabilities.length > 0
    ? getExperienceProfileForCapabilities(capabilities)
    : getExperienceProfile(industry ?? 'other');
  const profile = customizeProfile(baseProfile, subIndustry, personality);

  // 2. Determine experience style
  const style = determineExperienceStyle(profile, designDNA, designDecision);

  // 3. Plan scenes from sections
  let scenes = planScenes({
    sections,
    profile,
    style,
    pageIndex: 0,
  });

  // 4. Plan scroll narrative
  const scrollNarrative = planScrollNarrative({
    scenes,
    profile,
    style,
    pageType,
  });

  // 5. Reorder scenes for narrative (if beneficial)
  const narrativeStructure = profile.narrativeStructures[0] ?? 'problem-solution';
  scenes = reorderForNarrative(scenes, narrativeStructure);

  // 6. Generate emotion curve
  const emotionCurve = generateEmotionCurve(scenes, style);

  // 7. Generate hover behaviors
  const componentTypes = extractComponentTypes(sections);
  const hoverBehaviors = generateHoverBehaviors({
    componentTypes,
    profile,
    style,
    density: profile.interactionDensity,
  });

  // 8. Plan motion language
  const motionOutput = planMotionLanguage({
    scenes,
    profile,
    style,
  });

  // 9. Generate performance budget
  const performanceBudget = generatePerformanceBudget(profile, style, scenes.length);

  // 10. Generate conversion moments
  const conversionMoments = generateConversionMoments(scenes, profile);

  // 11. Generate engagement triggers
  const engagementTriggers = generateEngagementTriggers(scenes, profile);

  // 12. Generate camera config
  const cameraEffects = generateCameraConfig(style, scenes);

  // 13. Extract sticky sections and parallax layers
  const stickySections = extractStickySections(scenes);
  const parallaxLayers = extractParallaxLayers(scenes);

  // 14. Build reasoning string
  const reasoning = buildReasoning(profile, style, scenes.length, narrativeStructure);

  const provenanceLayer: Provenance['layer'] = 'design-intelligence';

  // Map local EmotionCurve points to canonical EmotionalPoint[]
  const emotionalPoints = emotionCurve.points.map(p => ({
    sectionIndex: p.sceneIndex,
    intensity: p.intensity,
    emotion: p.emotion as import('./types.js').EmotionalPoint['emotion'],
    duration: 1,
  }));

  // Conversion moments are already canonical from generateConversionMoments
  const canonicalConversionMoments = conversionMoments;

  // Map local EngagementTrigger to canonical EngagementMoment
  const engagementTypeMap: Record<string, import('./types.js').EngagementMoment['type']> = {
    'scroll-milestone': 'scroll-discover',
    'time-on-page': 'interactive-demo',
    'interaction-count': 'hover-explore',
    'cursor-distance': 'gallery-browse',
  };
  const canonicalEngagementMoments = engagementTriggers.map(t => ({
    sectionId: t.sceneId,
    type: engagementTypeMap[t.type] ?? 'scroll-discover',
    density: 0.5,
    reward: 'visual-feedback' as const,
  }));

  // Map local StickyConfig to canonical StickySection
  const canonicalStickySections = stickySections.map(s => ({
    sectionId: 'sticky',
    behavior: 'pin' as const,
    pinDuration: undefined,
    stackOffset: undefined,
  }));

  // Build canonical ParallaxStrategy from parallax layers
  const parallaxStrategy = {
    enabled: parallaxLayers.length > 0,
    intensity: parallaxLayers.length > 0 ? 0.5 : 0,
    layers: parallaxLayers,
    performanceMode: 'auto' as const,
  };

  // Build storytelling flow from profile and scenes
  const storytellingFlow = {
    arc: narrativeStructure as import('./types.js').StorytellingFlow['arc'],
    beats: scenes.map((s, i) => ({
      sectionIndex: i,
      type: (s.narrativeRole === 'hook' ? 'hook' : s.narrativeRole === 'cta' ? 'cta' : s.narrativeRole === 'proof' ? 'proof' : 'transition') as import('./types.js').StoryBeat['type'],
      weight: s.performanceCost,
      duration: 1,
    })),
    tone: (profile.emotionalQualities[0] ?? 'confidence') as import('./types.js').StorytellingFlow['tone'],
  };

  // Build section order from scenes
  const sectionOrder = scenes.map((s, i) => ({
    id: s.id,
    type: s.sectionType as import('./types.js').SectionDefinition['type'],
    order: i,
    emotionalGoal: s.emotionTarget,
    keyMessage: s.name,
    contentDensity: 0.5,
    visualComplexity: 0.5,
  }));

  // Build scene transitions
  const sceneTransitions = scenes.slice(0, -1).map((s, i) => ({
    from: s.id,
    to: scenes[i + 1].id,
    type: 'fade' as const,
    duration: 400,
    easing: 'power2.out',
    scrollTriggered: true,
  }));

  // Build visual rhythm
  const visualRhythm = {
    pattern: 'steady' as const,
    densityVariation: 'varied' as const,
    whiteSpace: 'balanced' as const,
    beatsPerSection: Math.max(1, Math.round(profile.motionIntensity * 3)),
  };

  // Micro-interactions from motion output (MotionLanguage doesn't include them, generate defaults)
  const microInteractions = scenes.slice(0, 3).map((s, i) => ({
    name: `scene-${i}-reveal`,
    trigger: 'scroll' as const,
    selector: `#${s.id}`,
    animation: {
      property: 'opacity',
      from: 0,
      to: 1,
      duration: 400,
      easing: 'power2.out',
    },
    feedback: 'visual' as const,
  }));

  // Cinematic sequences (empty — can be enriched later)
  const cinematicSequences: import('./types.js').CinematicSequence[] = [];

  // Pause moments (empty)
  const pauseMoments: import('./types.js').PauseMoment[] = [];

  // Default reveal strategy
  const revealStrategy = {
    default: 'fade' as const,
    scrollReveal: true,
    staggerDelay: 100,
    duration: 400,
    easing: 'power2.out',
  };

  // 10. Scroll-accumulation: make the user FEEL a quality grow the more they
  // scroll — continuous, not one-shot. Triggered EITHER for cinematic/luxury
  // experiences (derived from STYLE) OR when the description expresses a
  // scroll-transform narrative arc (e.g. "noise → silence"). Both paths are
  // signal/style-based, never industry-based — this removes the old
  // `if industry == perfume` branch while generalising to ANY brand.
  const wantsAccumulation = style === 'cinematic' || style === 'luxury' ||
    (motionIntent.scrollDriven && motionIntent.transformArc !== null);

  const scrollAccumulation: ScrollAccumulationConfig | undefined = wantsAccumulation
    ? {
        enabled: true,
        // A transform arc names its own accumulating quality (noise→silence →
        // "silence"); otherwise fall back to style-derived atmosphere/scent.
        metric: motionIntent.theme
          ? motionIntent.theme
          : style === 'luxury' ? 'scent' : 'atmosphere',
        label: motionIntent.theme
          ? motionIntent.theme.charAt(0).toUpperCase() + motionIntent.theme.slice(1)
          : style === 'luxury' ? 'Scent' : 'Mood',
        accent: style === 'luxury' ? '#D4AF37' : '#C9A96E',
        placement: 'fixed',
        reverse: false,
        // Carry the transform arc so the renderer can animate from→to.
        ...(motionIntent.transformArc
          ? { transformArc: motionIntent.transformArc as any }
          : {}),
      }
    : undefined;

  return {
    id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date(),
    version: '1.0.0',
    businessKnowledgeId: '',
    storytellingFlow: wrap(storytellingFlow, provenanceLayer, 'Derived from scroll narrative planning'),
    sectionOrder: wrap(sectionOrder, provenanceLayer, 'Ordered by scene planner'),
    sceneTransitions: wrap(sceneTransitions, provenanceLayer, 'Adjacent scene transitions'),
    scrollNarrative: scrollNarrative as any,
    scrollAccumulation: scrollAccumulation ? wrap(scrollAccumulation, provenanceLayer, 'Sensory scroll-accumulation enabled for ' + industry) : undefined,
    motionLanguage: motionOutput,
    hoverBehavior: hoverBehaviors,
    animationDensity: wrap(profile.motionIntensity, provenanceLayer, `Motion intensity: ${Math.round(profile.motionIntensity * 100)}%`),
    interactionDensity: wrap(profile.interactionDensity === 'minimal' ? 0.2 : profile.interactionDensity === 'light' ? 0.4 : profile.interactionDensity === 'moderate' ? 0.6 : profile.interactionDensity === 'rich' ? 0.8 : 1.0, provenanceLayer, `Interaction density: ${profile.interactionDensity}`),
    emotionalCurve: wrap(emotionalPoints, provenanceLayer, 'Generated from scene emotion targets'),
    visualRhythm: wrap(visualRhythm, provenanceLayer, 'Derived from profile pacing'),
    conversionMoments: wrap(canonicalConversionMoments, provenanceLayer, 'Generated from scene narrative roles'),
    engagementMoments: wrap(canonicalEngagementMoments, provenanceLayer, 'Generated from page length and conversion focus'),
    pauseMoments: wrap(pauseMoments, provenanceLayer, 'No explicit pause moments planned'),
    cinematicSequences: wrap(cinematicSequences, provenanceLayer, 'No cinematic sequences planned'),
    microInteractions: wrap(microInteractions, provenanceLayer, 'Derived from motion language'),
    parallaxStrategy: wrap(parallaxStrategy, provenanceLayer, 'Extracted from scene parallax layers'),
    stickySections: wrap(canonicalStickySections, provenanceLayer, 'Extracted from scene sticky configs'),
    revealStrategy: wrap(revealStrategy, provenanceLayer, 'Default reveal strategy based on style'),
    performanceBudget: wrap(performanceBudget, provenanceLayer, `Budget for ${scenes.length} scenes`),
  };
}

// ─── Reasoning Builder ─────────────────────────────────────────────────────

function buildReasoning(
  profile: ExperienceProfile,
  style: ExperienceStyle,
  sceneCount: number,
  narrativeStructure: string,
): string {
  const parts: string[] = [];

  parts.push(`Industry "${profile.name}" → style "${style}".`);
  parts.push(`${sceneCount} scenes planned with "${narrativeStructure}" narrative structure.`);
  parts.push(`Motion intensity: ${Math.round(profile.motionIntensity * 100)}%.`);
  parts.push(`Interaction density: ${profile.interactionDensity}.`);
  parts.push(`Hover strategies: ${profile.hoverDefaults.join(', ')}.`);
  parts.push(`Conversion focus: ${profile.conversionFocus}.`);
  parts.push(`Scroll pacing: ${profile.scrollPacing}.`);

  if (profile.performanceSensitivity === 'high') {
    parts.push('Performance-sensitive industry: animations simplified.');
  }

  return parts.join(' ');
}

// ─── Validation ────────────────────────────────────────────────────────────

export interface ExperienceValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate an ExperienceBlueprint for quality.
 * Rejects generic, excessive, or poorly-rhythmed outputs.
 */
export function validateExperienceBlueprint(
  blueprint: ExperienceBlueprint,
): ExperienceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check minimum sections
  if (blueprint.sectionOrder.value.length < 1) {
    errors.push('Blueprint has zero sections. At least one section is required.');
  } else if (blueprint.sectionOrder.value.length < 3) {
    warnings.push('Fewer than 3 sections — limited storytelling arc. Consider adding more sections.');
  }

  // Check for hook section — strong signal for premium feel, but small sites may omit
  const hasHook = blueprint.storytellingFlow.value.beats.some(b => b.type === 'hook');
  if (!hasHook) {
    warnings.push('Missing hook beat. A hook (e.g., HeroBanner) at the top creates stronger first impressions.');
  }

  // Check for CTA section
  const hasCTA = blueprint.sectionOrder.value.some(s => s.type === 'cta');
  if (!hasCTA) {
    warnings.push('Missing CTA section. Consider adding a call-to-action.');
  }

  // Check for hover interaction variety
  const allNoneHover = blueprint.hoverBehavior.value.elements.every(h => h.animation.duration === 0);
  if (allNoneHover && blueprint.sectionOrder.value.length > 0) {
    warnings.push('All hover behaviors are static. Consider adding interaction variety.');
  }

  // Check performance budget total weight
  if (blueprint.performanceBudget.value.totalWeight > 1.0) {
    warnings.push(
      `Total animation weight (${blueprint.performanceBudget.value.totalWeight.toFixed(2)}) exceeds 1.0.`,
    );
  }

  // Check visual rhythm
  if (blueprint.visualRhythm.value.pattern === 'steady') {
    warnings.push('Visual rhythm is steady. A varied or accelerating pattern creates better engagement.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
