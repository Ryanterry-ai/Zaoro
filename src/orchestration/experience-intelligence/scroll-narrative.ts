// ─── Scroll Narrative Engine ────────────────────────────────────────────────
//
// Plans the narrative flow for each page. Instead of generic section ordering
// (Hero → Features → Pricing → Footer), it generates story-driven structures
// like (Hook → Problem → Insight → Transformation → Trust → Proof → CTA).
//
// Narrative varies by project type, industry, and emotional arc.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ScrollNarrative,
  ScrollLinkedAnimation,
  ScrollTrigger,
  ParallaxLayer,
  Provenance,
  ProvenanceAware,
} from './types.js';
import type { ExperienceProfile, ExperienceStyle, Scene } from './types-experience.js';

// ─── Narrative Structure Templates (mapped to canonical fields) ──────────────

interface NarrativeTemplate {
  speedProfile: ScrollNarrative['speedProfile'];
  scrollLinked: ScrollLinkedAnimation[];
  scrollTriggers: ScrollTrigger[];
  parallaxLayers: ParallaxLayer[];
}

const NARRATIVE_TEMPLATES: Record<string, NarrativeTemplate> = {
  'problem-solution': {
    speedProfile: 'cinematic',
    scrollLinked: [
      { selector: '.hero', property: 'translateY', scrollRange: [0, 0.3], outputRange: [100, 0], easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      { selector: '.problem', property: 'opacity', scrollRange: [0.2, 0.5], outputRange: [0, 1], easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      { selector: '.solution', property: 'translateY', scrollRange: [0.4, 0.7], outputRange: [50, 0], easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      { selector: '.proof', property: 'opacity', scrollRange: [0.6, 0.9], outputRange: [0, 1], easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      { selector: '.cta', property: 'scale', scrollRange: [0.8, 1.0], outputRange: [0.95, 1], easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    ],
    scrollTriggers: [
      { selector: '.problem', triggerPoint: 0.3, action: 'reveal', animation: { property: 'opacity', from: 0, to: 1, duration: 800, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' } },
      { selector: '.solution', triggerPoint: 0.5, action: 'reveal', animation: { property: 'translateY', from: 50, to: 0, duration: 800, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' } },
      { selector: '.cta', triggerPoint: 0.9, action: 'animate', animation: { property: 'scale', from: 0.95, to: 1, duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' } },
    ],
    parallaxLayers: [
      { depth: 0, speed: 0.3, selectors: ['.hero-bg'] },
      { depth: 1, speed: 0.5, selectors: ['.problem-bg'] },
      { depth: 2, speed: 0.7, selectors: ['.solution-bg'] },
    ],
  },
  'journey': {
    speedProfile: 'organic',
    scrollLinked: [
      { selector: '.hero', property: 'opacity', scrollRange: [0, 0.2], outputRange: [0, 1], easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      { selector: '.journey-step', property: 'translateY', scrollRange: [0.1, 0.9], outputRange: [80, 0], easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    ],
    scrollTriggers: [
      { selector: '.journey-step', triggerPoint: 0.2, action: 'reveal', animation: { property: 'opacity', from: 0, to: 1, duration: 1000, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' } },
    ],
    parallaxLayers: [
      { depth: 0, speed: 0.2, selectors: ['.journey-bg'] },
      { depth: 1, speed: 0.5, selectors: ['.step-bg'] },
    ],
  },
  'before-after': {
    speedProfile: 'smooth',
    scrollLinked: [
      { selector: '.before', property: 'translateX', scrollRange: [0, 0.5], outputRange: [0, -50], easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      { selector: '.after', property: 'translateX', scrollRange: [0.5, 1.0], outputRange: [50, 0], easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    ],
    scrollTriggers: [
      { selector: '.after', triggerPoint: 0.5, action: 'reveal', animation: { property: 'opacity', from: 0, to: 1, duration: 800, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' } },
    ],
    parallaxLayers: [
      { depth: 0, speed: 0.4, selectors: ['.comparison-bg'] },
    ],
  },
  'discovery': {
    speedProfile: 'organic',
    scrollLinked: [
      { selector: '.discovery-item', property: 'translateY', scrollRange: [0, 1], outputRange: [60, 0], easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    ],
    scrollTriggers: [
      { selector: '.discovery-item', triggerPoint: 0.3, action: 'reveal', animation: { property: 'opacity', from: 0, to: 1, duration: 600, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' } },
    ],
    parallaxLayers: [
      { depth: 0, speed: 0.3, selectors: ['.discovery-bg'] },
    ],
  },
  'transformation': {
    speedProfile: 'cinematic',
    scrollLinked: [
      { selector: '.transformation', property: 'scale', scrollRange: [0, 1], outputRange: [0.8, 1], easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    ],
    scrollTriggers: [
      { selector: '.transformation', triggerPoint: 0.3, action: 'reveal', animation: { property: 'opacity', from: 0, to: 1, duration: 1200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' } },
    ],
    parallaxLayers: [
      { depth: 0, speed: 0.5, selectors: ['.transformation-bg'] },
    ],
  },
  'comparison': {
    speedProfile: 'snappy',
    scrollLinked: [
      { selector: '.comparison-left', property: 'translateX', scrollRange: [0, 0.5], outputRange: [0, -30], easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      { selector: '.comparison-right', property: 'translateX', scrollRange: [0.5, 1], outputRange: [30, 0], easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    ],
    scrollTriggers: [
      { selector: '.comparison-left', triggerPoint: 0.2, action: 'reveal' },
      { selector: '.comparison-right', triggerPoint: 0.7, action: 'reveal' },
    ],
    parallaxLayers: [
      { depth: 0, speed: 0.3, selectors: ['.comparison-bg'] },
    ],
  },
  'progressive-disclosure': {
    speedProfile: 'smooth',
    scrollLinked: [
      { selector: '.progressive-step', property: 'opacity', scrollRange: [0, 1], outputRange: [0, 1], easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    ],
    scrollTriggers: [
      { selector: '.progressive-step', triggerPoint: 0.2, action: 'reveal', animation: { property: 'opacity', from: 0, to: 1, duration: 500, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' } },
    ],
    parallaxLayers: [
      { depth: 0, speed: 0.2, selectors: ['.progressive-bg'] },
    ],
  },
  'storytelling': {
    speedProfile: 'cinematic',
    scrollLinked: [
      { selector: '.story-chapter', property: 'translateY', scrollRange: [0, 1], outputRange: [100, 0], easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    ],
    scrollTriggers: [
      { selector: '.story-chapter', triggerPoint: 0.25, action: 'reveal', animation: { property: 'opacity', from: 0, to: 1, duration: 1000, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' } },
    ],
    parallaxLayers: [
      { depth: 0, speed: 0.4, selectors: ['.story-bg'] },
      { depth: 1, speed: 0.7, selectors: ['.chapter-bg'] },
    ],
  },
  'data-driven': {
    speedProfile: 'snappy',
    scrollLinked: [
      { selector: '.data-point', property: 'scale', scrollRange: [0, 1], outputRange: [0.5, 1], easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    ],
    scrollTriggers: [
      { selector: '.data-point', triggerPoint: 0.3, action: 'animate', animation: { property: 'scale', from: 0.5, to: 1, duration: 600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' } },
    ],
    parallaxLayers: [
      { depth: 0, speed: 0.2, selectors: ['.data-bg'] },
    ],
  },
};

// ─── Structure Selector ────────────────────────────────────────────────────

function selectNarrativeStructure(
  profile: ExperienceProfile,
  style: ExperienceStyle,
  pageType: string,
): string {
  const candidates = profile.narrativeStructures;

  if (style === 'cinematic' || style === 'storytelling') {
    if (candidates.includes('storytelling')) return 'storytelling';
    if (candidates.includes('transformation')) return 'transformation';
  }
  if (style === 'enterprise' || style === 'technical') {
    if (candidates.includes('data-driven')) return 'data-driven';
    if (candidates.includes('progressive-disclosure')) return 'progressive-disclosure';
  }
  if (style === 'luxury') {
    if (candidates.includes('discovery')) return 'discovery';
    if (candidates.includes('storytelling')) return 'storytelling';
  }

  if (pageType === 'landing' && candidates.includes('problem-solution')) return 'problem-solution';
  if (pageType === 'about') {
    if (candidates.includes('journey')) return 'journey';
    if (candidates.includes('storytelling')) return 'storytelling';
  }
  if (pageType === 'product' && candidates.includes('discovery')) return 'discovery';

  return candidates[0] ?? 'problem-solution';
}

// ─── Main Scroll Narrative Planner ─────────────────────────────────────────

export interface ScrollNarrativeInput {
  /** Planned scenes */
  scenes: Scene[];
  /** Experience profile */
  profile: ExperienceProfile;
  /** Experience style */
  style: ExperienceStyle;
  /** Page type (landing, about, product, etc.) */
  pageType: string;
}

const adapterProvenance: Provenance = {
  layer: 'design-intelligence',
  source: 'scroll-narrative-engine',
  confidence: 0.92,
  evidence: ['narrative structure selection', 'scroll-linked animation generation', 'parallax layer computation'],
  timestamp: new Date(),
  reasoning: 'Generated canonical scroll narrative from scene plan and experience profile',
};

/**
 * Plan the canonical scroll narrative for a page.
 * Returns ProvenanceAware<ScrollNarrative> with speedProfile, scrollLinked, scrollTriggers, parallaxLayers.
 */
export function planScrollNarrative(
  input: ScrollNarrativeInput,
): ProvenanceAware<ScrollNarrative> {
  const { scenes, profile, style, pageType } = input;

  const structureKey = selectNarrativeStructure(profile, style, pageType);
  const template = NARRATIVE_TEMPLATES[structureKey] ?? NARRATIVE_TEMPLATES['problem-solution'];

  return {
    value: {
      speedProfile: template.speedProfile,
      scrollLinked: template.scrollLinked,
      scrollTriggers: template.scrollTriggers,
      parallaxLayers: template.parallaxLayers,
    },
    provenance: adapterProvenance,
  };
}

/**
 * Reorder scenes based on narrative structure.
 * Some structures benefit from reordering (e.g., moving proof before pricing).
 */
export function reorderForNarrative(
  scenes: Scene[],
  structure: string,
): Scene[] {
  // Only reorder for specific structures
  if (structure !== 'problem-solution' && structure !== 'transformation') {
    return scenes;
  }

  const reordered = [...scenes];

  // Ensure hook is always first
  const hookIdx = reordered.findIndex(s => s.narrativeRole === 'hook');
  if (hookIdx > 0) {
    const [hook] = reordered.splice(hookIdx, 1);
    if (hook) reordered.unshift(hook);
  }

  // Ensure CTA is always last
  const ctaIdx = reordered.findIndex(s => s.narrativeRole === 'cta');
  if (ctaIdx >= 0 && ctaIdx < reordered.length - 1) {
    const [cta] = reordered.splice(ctaIdx, 1);
    if (cta) reordered.push(cta);
  }

  // Ensure proof/trust comes after solution but before CTA
  const proofIdx = reordered.findIndex(
    s => s.narrativeRole === 'proof' || s.narrativeRole === 'social-proof' || s.narrativeRole === 'trust',
  );
  const solutionIdx = reordered.findIndex(s => s.narrativeRole === 'solution');
  if (proofIdx >= 0 && solutionIdx >= 0 && proofIdx < solutionIdx) {
    const [proof] = reordered.splice(proofIdx, 1);
    const newSolutionIdx = reordered.findIndex(s => s.narrativeRole === 'solution');
    if (proof && newSolutionIdx >= 0) {
      reordered.splice(newSolutionIdx + 1, 0, proof);
    }
  }

  return reordered;
}