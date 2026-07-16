// ─── Scene Planner ──────────────────────────────────────────────────────────
//
// Converts ApplicationSpec pages into ordered Scenes with emotional arcs,
// choreography, timing, and performance budgets. Uses canonical types.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Scene,
  NarrativeRole,
  SectionType,
  InteractionDensity,
  EmotionTarget,
  MotionConfig,
  MotionType,
  ScrollTriggerConfig,
  CameraEffect,
  ChoreographyConfig,
  TimingConfig,
  StickyConfig,
  EmotionCurve,
  ExperienceStyle,
  RevealStrategy,
} from './types-experience.js';
import type { ParallaxLayer } from './types.js';
import type { ExperienceProfile } from './types-experience.js';

// ─── Section → Narrative Role Mapping ──────────────────────────────────────

const SECTION_TO_NARRATIVE: Record<string, NarrativeRole> = {
  'HeroBanner': 'hook',
  'FeatureGrid': 'solution',
  'Testimonials': 'social-proof',
  'PricingTable': 'pricing',
  'CTASection': 'cta',
  'AboutSection': 'about',
  'FAQSection': 'faq',
  'ContactForm': 'contact',
  'Gallery': 'proof',
  'StatsCards': 'proof',
  'TeamSection': 'team',
  'ProcessSteps': 'benefits',
  'ComparisonTable': 'features',
  'IntegrationGrid': 'trust',
  'SecuritySection': 'trust',
  'StorySection': 'transformation',
  'TransformationSection': 'transformation',
  'DemoSection': 'demo',
  'MenuSection': 'features',
  'BookingForm': 'cta',
  'ProductGrid': 'features',
  'CategoryGrid': 'features',
  'TestimonialCarousel': 'social-proof',
  'ProductShowcase': 'demo',
};

// ─── Emotion Arc Generators ────────────────────────────────────────────────

function generateRisingArc(sceneCount: number, qualities: EmotionTarget[]): EmotionCurve {
  const points = [];
  for (let i = 0; i < sceneCount; i++) {
    const t = i / Math.max(sceneCount - 1, 1);
    const intensity = i === sceneCount - 1
      ? 0.7
      : Math.min(1, t * 1.2 + (t > 0.7 ? 0.15 : 0));
    points.push({
      sceneIndex: i,
      intensity,
      emotion: qualities[i % qualities.length] ?? 'trust',
    });
  }
  return { points, arc: 'rising' };
}

function generateBellArc(sceneCount: number, qualities: EmotionTarget[]): EmotionCurve {
  const points = [];
  for (let i = 0; i < sceneCount; i++) {
    const t = i / Math.max(sceneCount - 1, 1);
    const intensity = Math.sin(t * Math.PI) * 0.8 + 0.2;
    points.push({
      sceneIndex: i,
      intensity,
      emotion: qualities[i % qualities.length] ?? 'trust',
    });
  }
  return { points, arc: 'bell' };
}

function generateWaveArc(sceneCount: number, qualities: EmotionTarget[]): EmotionCurve {
  const points = [];
  for (let i = 0; i < sceneCount; i++) {
    const t = i / Math.max(sceneCount - 1, 1);
    const intensity = 0.3 + Math.sin(t * Math.PI * 2) * 0.3 + t * 0.2;
    points.push({
      sceneIndex: i,
      intensity: Math.min(1, Math.max(0, intensity)),
      emotion: qualities[i % qualities.length] ?? 'trust',
    });
  }
  return { points, arc: 'wave' };
}

function generateTensionReleaseArc(sceneCount: number, qualities: EmotionTarget[]): EmotionCurve {
  const points = [];
  const midpoint = Math.floor(sceneCount / 2);
  for (let i = 0; i < sceneCount; i++) {
    const intensity = i < midpoint
      ? 0.3 + (i / midpoint) * 0.6
      : 0.9 - ((i - midpoint) / Math.max(sceneCount - midpoint - 1, 1)) * 0.5;
    points.push({
      sceneIndex: i,
      intensity: Math.min(1, Math.max(0, intensity)),
      emotion: qualities[i % qualities.length] ?? 'trust',
    });
  }
  return { points, arc: 'tension-release' };
}

// ─── Motion Generators ─────────────────────────────────────────────────────

function entryMotion(style: ExperienceStyle, index: number, intensity: number): MotionConfig {
  const types: Record<ExperienceStyle, MotionType[]> = {
    cinematic: ['fade-up', 'zoom-pan', 'reveal', 'blur-in'],
    luxury: ['fade-up', 'fade-in', 'scale-up', 'reveal'],
    minimal: ['fade-in', 'fade-up', 'none', 'fade-in'],
    editorial: ['fade-left', 'reveal', 'clip-path', 'fade-up'],
    enterprise: ['fade-up', 'fade-in', 'slide-up', 'fade-in'],
    playful: ['scale-up', 'flip-in', 'rotate-in', 'fade-up'],
    technical: ['fade-up', 'blur-in', 'slide-up', 'fade-in'],
    premium: ['fade-up', 'reveal', 'scale-up', 'blur-in'],
    storytelling: ['fade-left', 'reveal', 'clip-path', 'zoom-pan'],
  };
  const pool = types[style] ?? types.premium;
  const type = pool[index % pool.length] ?? 'fade-up';

  return {
    type,
    duration: 600 + Math.round(intensity * 400),
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    delay: index * 100,
    intensity,
    properties: {},
  };
}

function exitMotion(style: ExperienceStyle): MotionConfig {
  return {
    type: 'none',
    duration: 0,
    easing: 'linear',
    delay: 0,
    intensity: 0,
    properties: {},
  };
}

// ─── Scroll Trigger Generator ──────────────────────────────────────────────

function scrollTrigger(
  index: number,
  total: number,
  density: InteractionDensity,
): ScrollTriggerConfig {
  const isHero = index === 0;
  const isLast = index === total - 1;

  return {
    trigger: isHero ? 'enter' : 'enter-leave',
    start: isHero ? 'top top' : 'top 85%',
    end: isLast ? 'bottom bottom' : 'top 20%',
    scrub: density === 'immersive' ? 1.5 : density === 'rich' ? 1 : false,
    pin: false,
    snap: undefined,
  };
}

// ─── Camera Effect Generator ───────────────────────────────────────────────

function cameraEffect(
  index: number,
  style: ExperienceStyle,
  isHero: boolean,
): CameraEffect {
  if (isHero) {
    const heroEffects: Record<ExperienceStyle, CameraEffect> = {
      cinematic: { type: 'zoom-in', intensity: 0.3, duration: 200, properties: {} },
      luxury: { type: 'pan-right', intensity: 0.2, duration: 150, properties: {} },
      minimal: { type: 'none', intensity: 0, duration: 0, properties: {} },
      editorial: { type: 'pan-right', intensity: 0.2, duration: 150, properties: {} },
      enterprise: { type: 'parallax-medium', intensity: 0.15, duration: 100, properties: {} },
      playful: { type: 'zoom-in', intensity: 0.3, duration: 200, properties: {} },
      technical: { type: 'parallax-medium', intensity: 0.15, duration: 100, properties: {} },
      premium: { type: 'parallax-medium', intensity: 0.25, duration: 100, properties: {} },
      storytelling: { type: 'parallax-slow', intensity: 0.2, duration: 150, properties: {} },
    };
    return heroEffects[style] ?? heroEffects.premium;
  }

  return {
    type: index % 3 === 0 ? 'parallax-slow' : 'none',
    intensity: 0.1,
    duration: 50,
    properties: {},
  };
}

// ─── Choreography Generator ────────────────────────────────────────────────

function choreography(
  sectionType: SectionType,
  style: ExperienceStyle,
): ChoreographyConfig {
  const strategies: Record<string, ChoreographyConfig> = {
    'hero': { revealStrategy: 'simultaneous', rhythm: 'even' },
    'features': { revealStrategy: 'cascade', rhythm: 'accelerating' },
    'testimonials': { revealStrategy: 'sequential', rhythm: 'breathing' },
    'pricing': { revealStrategy: 'simultaneous', rhythm: 'even' },
    'cta': { revealStrategy: 'simultaneous', rhythm: 'even' },
    'stats': { revealStrategy: 'grid-fill', rhythm: 'even' },
    'process': { revealStrategy: 'sequential', rhythm: 'decelerating' },
    'team': { revealStrategy: 'grid-fill', rhythm: 'even' },
    'gallery': { revealStrategy: 'grid-fill', rhythm: 'even' },
    'story': { revealStrategy: 'typewriter', rhythm: 'breathing' },
    'transformation': { revealStrategy: 'unfold', rhythm: 'accelerating' },
  };

  const config = strategies[sectionType] ?? { revealStrategy: 'cascade', rhythm: 'even' };

  return {
    revealStrategy: config.revealStrategy as any,
    stagger: {
      childDelay: style === 'cinematic' ? 120 : style === 'minimal' ? 60 : 80,
      maxDuration: 800,
      direction: 'forward',
      from: 'start',
    },
    rhythm: config.rhythm,
    layoutTransition: style === 'luxury' ? 'shared-layout' : 'none',
  };
}

// ─── Timing Generator ──────────────────────────────────────────────────────

function timing(
  index: number,
  narrativeRole: NarrativeRole,
  style: ExperienceStyle,
): TimingConfig {
  const baseDurations: Record<NarrativeRole, number> = {
    hook: 2000,
    problem: 1500,
    insight: 1800,
    solution: 1600,
    proof: 1400,
    trust: 1200,
    transformation: 1800,
    benefits: 1400,
    offer: 1600,
    cta: 1800,
    'social-proof': 1400,
    faq: 1200,
    about: 1400,
    team: 1200,
    pricing: 1600,
    features: 1400,
    demo: 2000,
    contact: 1200,
  };

  const base = baseDurations[narrativeRole] ?? 1400;
  const styleMultiplier: Record<ExperienceStyle, number> = {
    cinematic: 1.3,
    luxury: 1.2,
    minimal: 0.8,
    editorial: 1.1,
    enterprise: 0.9,
    playful: 0.9,
    technical: 0.8,
    premium: 1.1,
    storytelling: 1.3,
  };

  return {
    duration: Math.round(base * (styleMultiplier[style] ?? 1)),
    initialDelay: index === 0 ? 300 : 100,
    groupDelay: style === 'cinematic' ? 150 : 80,
    adaptive: true,
  };
}

// ─── Sticky Section Generator ──────────────────────────────────────────────

function stickyConfig(
  sectionType: SectionType,
  index: number,
  total: number,
): StickyConfig | undefined {
  if (sectionType === 'process' || sectionType === 'story' || sectionType === 'transformation') {
    return {
      enabled: true,
      position: 'center',
      offset: 80,
      stickyContent: ['visual', 'illustration'],
      scrollContent: ['text', 'steps'],
    };
  }
  if (sectionType === 'hero' && total > 5) {
    return {
      enabled: true,
      position: 'top',
      offset: 0,
      stickyContent: ['background', 'visual'],
      scrollContent: ['overlay-content'],
    };
  }
  return undefined;
}

// ─── Parallax Layer Generator ──────────────────────────────────────────────

function parallaxLayers(
  sectionType: SectionType,
  style: ExperienceStyle,
): ParallaxLayer[] | undefined {
  if (style === 'minimal' || style === 'enterprise') return undefined;
  if (sectionType !== 'hero' && sectionType !== 'story' && sectionType !== 'transformation') return undefined;

  const baseLayers: ParallaxLayer[] = [
    { speed: 0.2, depth: 0, selectors: ['.bg'] },
    { speed: 0.5, depth: 1, selectors: ['.mid'] },
    { speed: 0.8, depth: 2, selectors: ['.fg'] },
  ];

  if (style === 'cinematic') {
    return [
      ...baseLayers,
      { speed: 0.3, depth: -1, selectors: ['.accent'] },
    ];
  }

  return baseLayers;
}

// ─── Performance Cost Calculator ───────────────────────────────────────────

function estimatePerformanceCost(scene: Scene): number {
  let cost = 0.1;

  if (scene.entry.type !== 'none') cost += 0.1;
  if (scene.entry.type === 'blur-in') cost += 0.1;

  if (scene.scrollTrigger.scrub) cost += 0.15;
  if (scene.scrollTrigger.pin) cost += 0.1;

  if (scene.cameraEffect.type !== 'none') cost += 0.1;
  if (scene.cameraEffect.type.includes('3d') || scene.cameraEffect.type === 'depth-of-field') cost += 0.15;

  if (scene.sticky?.enabled) cost += 0.05;

  if (scene.parallaxLayers) cost += scene.parallaxLayers.length * 0.05;

  if (scene.choreography.revealStrategy === 'grid-fill') cost += 0.05;

  return Math.min(1, cost);
}

// ─── Main Scene Planner ────────────────────────────────────────────────────

export interface ScenePlannerInput {
  /** Page sections from ApplicationSpec */
  sections: Array<{ type: string; content?: Record<string, unknown> }>;
  /** Experience profile for this industry */
  profile: ExperienceProfile;
  /** Experience style */
  style: ExperienceStyle;
  /** Page index (for multi-page sites) */
  pageIndex: number;
}

/**
 * Plan scenes from page sections.
 * Converts component types into narrative scenes with full experience config.
 */
export function planScenes(input: ScenePlannerInput): Scene[] {
  const { sections, profile, style, pageIndex } = input;
  const scenes: Scene[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const narrativeRole = SECTION_TO_NARRATIVE[section.type] ?? 'benefits';
    const sectionType = section.type as SectionType;

    const entry = entryMotion(style, i, profile.motionIntensity);
    const exit = exitMotion(style);
    const scroll = scrollTrigger(i, sections.length, profile.interactionDensity);
    const camera = cameraEffect(i, style, i === 0);
    const choreo = choreography(sectionType, style);
    const time = timing(i, narrativeRole, style);
    const sticky = stickyConfig(sectionType, i, sections.length);
    const parallax = parallaxLayers(sectionType, style);

    const scene: Scene = {
      id: `scene-${pageIndex}-${i}`,
      name: section.type,
      narrativeRole,
      sectionType,
      entry,
      exit,
      scrollTrigger: scroll,
      cameraEffect: camera,
      interactionDensity: profile.interactionDensity,
      emotionTarget: profile.emotionalQualities[i % profile.emotionalQualities.length] ?? 'trust',
      choreography: choreo,
      timing: time,
      performanceCost: 0,
      sticky,
      parallaxLayers: parallax,
    };

    scene.performanceCost = estimatePerformanceCost(scene);
    scenes.push(scene);
  }

  return scenes;
}

/**
 * Generate emotion curve from planned scenes.
 */
export function generateEmotionCurve(
  scenes: Scene[],
  style: ExperienceStyle,
): EmotionCurve {
  const qualities = scenes.map(s => s.emotionTarget);

switch (style) {
    case 'cinematic':
    case 'storytelling':
      return generateTensionReleaseArc(scenes.length, qualities);
    case 'luxury':
    case 'editorial':
      return generateBellArc(scenes.length, qualities);
    case 'playful':
      return generateWaveArc(scenes.length, qualities);
    default:
      return generateRisingArc(scenes.length, qualities);
  }
}