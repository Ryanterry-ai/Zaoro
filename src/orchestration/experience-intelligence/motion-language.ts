// ─── Motion Language Planner ─────────────────────────────────────────────────
//
// Determines the global motion language for an application: page transitions,
// scroll reveal strategies, stagger orchestration, and micro-interaction
// patterns. Produces canonical types wrapped in ProvenanceAware.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  MotionLanguage,
  TimingProfile,
  ChoreographyRule,
  ChoreographyStep,
  StaggerPattern,
  MicroInteraction,
  RevealStrategy,
  Provenance,
  ProvenanceAware,
} from './types.js';
import type { ExperienceProfile, ExperienceStyle, InteractionDensity, Scene } from './types-experience.js';

const adapterProvenance: Provenance = {
  layer: 'design-intelligence',
  source: 'motion-language-engine',
  confidence: 0.9,
  evidence: ['style-based timing profile', 'scene choreography generation', 'micro-interaction planning'],
  timestamp: new Date(),
  reasoning: 'Generated canonical motion language from experience profile and scenes',
};

// ─── Timing Profile Generator ────────────────────────────────────────────────

function generateTimingProfile(
  style: ExperienceStyle,
  density: InteractionDensity,
): TimingProfile {
  const durationMap: Record<ExperienceStyle, [number, number]> = {
    cinematic: [800, 1200],
    luxury: [600, 1000],
    minimal: [200, 400],
    editorial: [400, 700],
    enterprise: [300, 500],
    playful: [300, 600],
    technical: [200, 400],
    premium: [500, 800],
    storytelling: [600, 1000],
  };

  const easingMap: Record<ExperienceStyle, string> = {
    cinematic: 'cubic-bezier(0.16, 1, 0.3, 1)',
    luxury: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    minimal: 'cubic-bezier(0.4, 0, 0.2, 1)',
    editorial: 'cubic-bezier(0.16, 1, 0.3, 1)',
    enterprise: 'cubic-bezier(0.4, 0, 0.2, 1)',
    playful: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    technical: 'cubic-bezier(0.4, 0, 0.2, 1)',
    premium: 'cubic-bezier(0.16, 1, 0.3, 1)',
    storytelling: 'cubic-bezier(0.16, 1, 0.3, 1)',
  };

  const [minDur, maxDur] = durationMap[style] ?? [300, 600];

  return {
    durationRange: [minDur, maxDur],
    defaultEasing: easingMap[style] ?? 'cubic-bezier(0.4, 0, 0.2, 1)',
    entranceEasing: easingMap[style] ?? 'cubic-bezier(0.16, 1, 0.3, 1)',
    exitEasing: easingMap[style] ?? 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: density === 'immersive' ? { stiffness: 300, damping: 30, mass: 1 } : undefined,
  };
}

// ─── Choreography Generator ──────────────────────────────────────────────────

function generateChoreography(
  scenes: Scene[],
  style: ExperienceStyle,
  density: InteractionDensity,
): ChoreographyRule[] {
  return scenes.map((scene, i) => ({
    condition: `scene-${scene.id}`,
    sequence: [
      {
        selector: `#${scene.id}`,
        animation: scene.entry.type,
        delay: scene.entry.delay,
        duration: scene.entry.duration,
      },
    ],
    maxDuration: scene.entry.duration + scene.exit.duration + 200,
  }));
}

// ─── Stagger Pattern Generator ───────────────────────────────────────────────

function generateStaggerPatterns(
  style: ExperienceStyle,
  density: InteractionDensity,
): StaggerPattern[] {
  const baseDelay: Record<ExperienceStyle, number> = {
    cinematic: 150,
    luxury: 120,
    minimal: 60,
    editorial: 100,
    enterprise: 80,
    playful: 100,
    technical: 60,
    premium: 100,
    storytelling: 130,
  };

  const maxItems = density === 'immersive' ? 20 : density === 'rich' ? 12 : 8;

  return [
    {
      name: 'default',
      staggerDelay: baseDelay[style] ?? 100,
      maxItems,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    {
      name: 'fast',
      staggerDelay: (baseDelay[style] ?? 100) * 0.7,
      maxItems,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    },
    {
      name: 'slow',
      staggerDelay: (baseDelay[style] ?? 100) * 1.5,
      maxItems,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  ];
}

// ─── Micro-Interaction Generator ─────────────────────────────────────────────

function generateMicroInteractions(
  style: ExperienceStyle,
  density: InteractionDensity,
  scenes: Scene[],
): MicroInteraction[] {
  const interactions: MicroInteraction[] = [];

  // Button press
  interactions.push({
    name: 'button-press',
    trigger: 'click',
    selector: 'button',
    animation: {
      property: 'scale',
      from: 1,
      to: 0.96,
      duration: 100,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    feedback: 'visual',
  });

  // Focus ring
  interactions.push({
    name: 'focus-ring',
    trigger: 'focus',
    selector: 'input, button, a',
    animation: {
      property: 'box-shadow',
      from: '0 0 0 0 transparent',
      to: '0 0 0 3px var(--focus-ring)',
      duration: 150,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    feedback: 'visual',
  });

  if (density === 'minimal') return interactions;

  // Scroll reveals for scenes
  for (const scene of scenes) {
    if (scene.entry.type !== 'none') {
      interactions.push({
        name: `scene-${scene.id}-reveal`,
        trigger: 'scroll',
        selector: `#${scene.id}`,
        animation: {
          property: 'opacity',
          from: 0,
          to: 1,
          duration: scene.entry.duration,
          easing: scene.entry.easing,
        },
        feedback: 'visual',
      });
    }
  }

  if (density === 'light') return interactions;

  // Number counter for stats
  interactions.push({
    name: 'counter-animation',
    trigger: 'scroll',
    selector: '.stat-number',
    animation: {
      property: 'opacity',
      from: 0,
      to: 1,
      duration: 800,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    },
    feedback: 'visual',
  });

  // Image lazy reveal
  interactions.push({
    name: 'image-reveal',
    trigger: 'scroll',
    selector: 'img[data-lazy]',
    animation: {
      property: 'filter',
      from: 'blur(20px)',
      to: 'blur(0px)',
      duration: 400,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    },
    feedback: 'visual',
  });

  if (density === 'moderate') return interactions;

  // Rich interactions for immersive
  if (style === 'cinematic' || style === 'premium') {
    interactions.push({
      name: 'page-load-fade',
      trigger: 'load',
      selector: 'body',
      animation: {
        property: 'opacity',
        from: 0,
        to: 1,
        duration: 300,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      feedback: 'visual',
    });
  }

  // Heading stagger
  interactions.push({
    name: 'heading-stagger',
    trigger: 'scroll',
    selector: 'h1, h2',
    animation: {
      property: 'translateY',
      from: 20,
      to: 0,
      duration: 500,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    },
    feedback: 'visual',
  });

  return interactions;
}

// ─── Reveal Strategy ──────────────────────────────────────────────────────────

function generateRevealStrategy(style: ExperienceStyle): RevealStrategy {
  const defaultMap: Record<ExperienceStyle, RevealStrategy['default']> = {
    cinematic: 'fade',
    luxury: 'fade',
    minimal: 'none',
    editorial: 'slide-up',
    enterprise: 'fade',
    playful: 'scale',
    technical: 'none',
    premium: 'fade',
    storytelling: 'slide-up',
  };

  return {
    default: defaultMap[style] ?? 'fade',
    scrollReveal: true,
    staggerDelay: 100,
    duration: 600,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  };
}

// ─── Main Motion Language Planner ────────────────────────────────────────────

export interface MotionLanguageInput {
  /** Planned scenes */
  scenes: Scene[];
  /** Experience profile */
  profile: ExperienceProfile;
  /** Experience style */
  style: ExperienceStyle;
}

/**
 * Plan the canonical MotionLanguage for a page.
 * Returns ProvenanceAware<MotionLanguage> with timing, choreography, stagger, microInteractions, revealStrategy.
 */
export function planMotionLanguage(
  input: MotionLanguageInput,
): ProvenanceAware<MotionLanguage> {
  const { scenes, profile, style } = input;

  const timing = generateTimingProfile(style, profile.interactionDensity);
  const choreography = generateChoreography(scenes, style, profile.interactionDensity);
  const staggerPatterns = generateStaggerPatterns(style, profile.interactionDensity);
  const microInteractions = generateMicroInteractions(style, profile.interactionDensity, scenes);
  const revealStrategy = generateRevealStrategy(style);

  const personalityMap: Record<ExperienceStyle, MotionLanguage['personality']> = {
    cinematic: 'cinematic',
    luxury: 'elegant',
    minimal: 'minimal',
    editorial: 'elegant',
    enterprise: 'professional',
    playful: 'playful',
    technical: 'professional',
    premium: 'elegant',
    storytelling: 'dynamic',
  };

  return {
    value: {
      personality: personalityMap[style] ?? 'cinematic',
      timing,
      choreography,
      staggerPatterns,
    },
    provenance: adapterProvenance,
  };
}

/**
 * Get Framer Motion variant configurations for a reveal strategy default type.
 */
export function getRevealVariants(revealStrategy: RevealStrategy): Record<string, unknown> {
  const defaultType = revealStrategy.default;
  const variants: Record<string, Record<string, unknown>> = {
    simultaneous: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { staggerChildren: 0 } },
    },
    'slide-up': {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } },
    },
    'slide-left': {
      hidden: { opacity: 0, x: 20 },
      visible: { opacity: 1, x: 0, transition: { staggerChildren: 0.1 } },
    },
    scale: {
      hidden: { opacity: 0, scale: 0.9 },
      visible: { opacity: 1, scale: 1, transition: { staggerChildren: 0.08 } },
    },
    blur: {
      hidden: { opacity: 0, filter: 'blur(10px)' },
      visible: { opacity: 1, filter: 'blur(0px)', transition: { staggerChildren: 0.1 } },
    },
    none: {
      hidden: { opacity: 1 },
      visible: { opacity: 1 },
    },
  };
  return variants[defaultType] ?? variants['slide-up'];
}