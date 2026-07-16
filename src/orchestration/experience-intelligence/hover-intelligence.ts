// ─── Hover Intelligence ─────────────────────────────────────────────────────
//
// Replaces generic hover:scale-105 with industry-appropriate interaction
// strategies. Each industry gets a unique hover philosophy that matches
// its emotional qualities.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  HoverBehavior,
  HoverAnimation,
  HoverElementConfig,
  Provenance,
  ProvenanceAware,
} from './types.js';
import type { ExperienceProfile, ExperienceStyle, InteractionDensity } from './types-experience.js';

// ─── Canonical Hover Strategy Definitions ────────────────────────────────────

interface CanonicalHoverStrategy {
  philosophy: HoverBehavior['philosophy'];
  defaults: HoverAnimation;
  elements: HoverElementConfig[];
  applicableComponents: string[];
}

const STRATEGIES: Record<string, CanonicalHoverStrategy> = {
  magnetic: {
    philosophy: 'expressive',
    defaults: { scale: 1.02, shadow: '0 20px 40px rgba(0,0,0,0.1)', duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    elements: [
      { type: 'button', animation: { scale: 1.02, shadow: '0 20px 40px rgba(0,0,0,0.1)', duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }, disableOnTouch: true },
      { type: 'card', animation: { scale: 1.02, shadow: '0 20px 40px rgba(0,0,0,0.1)', duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }, disableOnTouch: true },
      { type: 'link', animation: { scale: 1.01, duration: 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }, disableOnTouch: true },
      { type: 'icon', animation: { scale: 1.1, duration: 200, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }, disableOnTouch: true },
    ],
    applicableComponents: ['button', 'card', 'link', 'icon'],
  },
  elevation: {
    philosophy: 'professional',
    defaults: { scale: 1.01, shadow: '0 8px 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)', duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    elements: [
      { type: 'card', animation: { scale: 1.01, shadow: '0 8px 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)', duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }, disableOnTouch: true },
      { type: 'button', animation: { scale: 1.01, shadow: '0 4px 16px rgba(0,0,0,0.1)', duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }, disableOnTouch: true },
      { type: 'link', animation: { translateY: -2, duration: 150, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }, disableOnTouch: true },
    ],
    applicableComponents: ['card', 'button', 'link', 'list-item'],
  },
  glow: {
    philosophy: 'playful',
    defaults: { shadow: '0 0 30px rgba(var(--primary-rgb), 0.3)', duration: 250, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    elements: [
      { type: 'card', animation: { shadow: '0 0 30px rgba(var(--primary-rgb), 0.3)', duration: 250, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }, disableOnTouch: true },
      { type: 'button', animation: { shadow: '0 0 20px rgba(var(--primary-rgb), 0.4)', duration: 250, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }, disableOnTouch: true },
      { type: 'icon', animation: { scale: 1.1, shadow: '0 0 15px rgba(var(--primary-rgb), 0.3)', duration: 200, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }, disableOnTouch: true },
    ],
    applicableComponents: ['card', 'button', 'icon'],
  },
  'image-zoom': {
    philosophy: 'cinematic',
    defaults: { scale: 1.05, duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    elements: [
      { type: 'image', animation: { scale: 1.05, duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }, disableOnTouch: false },
      { type: 'card', animation: { scale: 1.03, duration: 350, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }, disableOnTouch: true },
    ],
    applicableComponents: ['image', 'gallery-item', 'card-image', 'product-image'],
  },
  'depth-shift': {
    philosophy: 'cinematic',
    defaults: { scale: 1.02, shadow: '0 25px 50px rgba(0,0,0,0.15)', duration: 350, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    elements: [
      { type: 'card', animation: { scale: 1.02, shadow: '0 25px 50px rgba(0,0,0,0.15)', duration: 350, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }, disableOnTouch: true },
      { type: 'button', animation: { scale: 1.01, shadow: '0 12px 30px rgba(0,0,0,0.12)', duration: 250, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }, disableOnTouch: true },
    ],
    applicableComponents: ['card', 'product-card', 'feature-card'],
  },
  'icon-movement': {
    philosophy: 'playful',
    defaults: { scale: 1.1, rotate: 5, duration: 200, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    elements: [
      { type: 'icon', animation: { scale: 1.1, rotate: 5, duration: 200, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }, disableOnTouch: true },
      { type: 'button', animation: { scale: 1.05, rotate: 3, duration: 150, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }, disableOnTouch: true },
    ],
    applicableComponents: ['icon', 'feature-icon', 'nav-icon'],
  },
  'border-draw': {
    philosophy: 'subtle',
    defaults: { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    elements: [
      { type: 'card', animation: { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }, disableOnTouch: true },
      { type: 'button', animation: { duration: 250, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }, disableOnTouch: true },
      { type: 'input', animation: { duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }, disableOnTouch: true },
      { type: 'link', animation: { duration: 250, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }, disableOnTouch: true },
    ],
    applicableComponents: ['card', 'button', 'input', 'link'],
  },
  'background-shift': {
    philosophy: 'subtle',
    defaults: { duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    elements: [
      { type: 'link', animation: { translateX: 4, duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }, disableOnTouch: true },
      { type: 'button', animation: { duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }, disableOnTouch: true },
      { type: 'card', animation: { duration: 250, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }, disableOnTouch: true },
    ],
    applicableComponents: ['nav-item', 'menu-item', 'button', 'list-item'],
  },
  'scale-subtle': {
    philosophy: 'subtle',
    defaults: { scale: 1.02, duration: 150, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    elements: [
      { type: 'button', animation: { scale: 1.02, duration: 150, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }, disableOnTouch: true },
      { type: 'link', animation: { scale: 1.01, duration: 100, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }, disableOnTouch: true },
      { type: 'icon', animation: { scale: 1.05, duration: 150, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }, disableOnTouch: true },
      { type: 'custom', animation: { scale: 1.03, duration: 150, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }, disableOnTouch: true },
    ],
    applicableComponents: ['button', 'link', 'icon', 'badge'],
  },
  'tilt-3d': {
    philosophy: 'cinematic',
    defaults: { rotate: 3, scale: 1.02, duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    elements: [
      { type: 'card', animation: { rotate: 3, scale: 1.02, duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }, disableOnTouch: true },
      { type: 'custom', animation: { rotate: 2, scale: 1.03, duration: 350, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }, disableOnTouch: true },
    ],
    applicableComponents: ['card', 'product-card', 'feature-card'],
  },
  'cursor-follow': {
    philosophy: 'expressive',
    defaults: { duration: 100, easing: 'linear' },
    elements: [
      { type: 'card', animation: { duration: 100, easing: 'linear' }, disableOnTouch: true },
      { type: 'custom', animation: { duration: 100, easing: 'linear' }, disableOnTouch: true },
    ],
    applicableComponents: ['card', 'hero'],
  },
  'glass-movement': {
    philosophy: 'cinematic',
    defaults: { duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    elements: [
      { type: 'card', animation: { duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }, disableOnTouch: true },
      { type: 'custom', animation: { duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }, disableOnTouch: true },
    ],
    applicableComponents: ['card', 'modal', 'overlay'],
  },
  'text-reveal': {
    philosophy: 'subtle',
    defaults: { duration: 250, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    elements: [
      { type: 'link', animation: { duration: 250, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }, disableOnTouch: true },
      { type: 'custom', animation: { duration: 250, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }, disableOnTouch: true },
    ],
    applicableComponents: ['link', 'nav-item', 'heading'],
  },
  none: {
    philosophy: 'subtle',
    defaults: { duration: 0, easing: 'linear' },
    elements: [],
    applicableComponents: [],
  },
};

// ─── Component → Hover Strategy Mapping ────────────────────────────────────

interface ComponentHoverProfile {
  component: string;
  strategies: string[];
  priority: number;
}

const COMPONENT_PROFILES: ComponentHoverProfile[] = [
  { component: 'button', strategies: ['magnetic', 'elevation', 'glow', 'scale-subtle'], priority: 1 },
  { component: 'card', strategies: ['elevation', 'depth-shift', 'tilt-3d', 'magnetic'], priority: 1 },
  { component: 'image', strategies: ['image-zoom', 'depth-shift'], priority: 1 },
  { component: 'icon', strategies: ['icon-movement', 'glow', 'scale-subtle'], priority: 2 },
  { component: 'link', strategies: ['text-reveal', 'border-draw', 'scale-subtle'], priority: 2 },
  { component: 'nav-item', strategies: ['background-shift', 'text-reveal', 'border-draw'], priority: 1 },
  { component: 'input', strategies: ['border-draw', 'elevation'], priority: 2 },
  { component: 'badge', strategies: ['glow', 'scale-subtle'], priority: 3 },
  { component: 'product-card', strategies: ['depth-shift', 'image-zoom', 'tilt-3d'], priority: 1 },
  { component: 'feature-card', strategies: ['elevation', 'tilt-3d', 'glow'], priority: 1 },
  { component: 'testimonial', strategies: ['elevation', 'glass-movement'], priority: 2 },
  { component: 'pricing-card', strategies: ['elevation', 'glow', 'magnetic'], priority: 1 },
  { component: 'gallery-item', strategies: ['image-zoom', 'depth-shift'], priority: 1 },
  { component: 'list-item', strategies: ['background-shift', 'elevation'], priority: 2 },
  { component: 'modal', strategies: ['glass-movement'], priority: 1 },
];

// ─── Strategy Selector ─────────────────────────────────────────────────────

function selectStrategy(
  componentType: string,
  profile: ExperienceProfile,
  style: ExperienceStyle,
): string {
  const componentProfile = COMPONENT_PROFILES.find(p => p.component === componentType);

  if (!componentProfile) {
    // Default strategies by style
    const defaults: Record<ExperienceStyle, string> = {
      cinematic: 'depth-shift',
      luxury: 'magnetic',
      minimal: 'scale-subtle',
      editorial: 'text-reveal',
      enterprise: 'elevation',
      playful: 'glow',
      technical: 'scale-subtle',
      premium: 'elevation',
      storytelling: 'text-reveal',
    };
    return defaults[style] ?? 'elevation';
  }

  // Find first strategy that matches both the profile and style
  for (const strategy of componentProfile.strategies) {
    if (profile.hoverDefaults.includes(strategy as any)) {
      return strategy;
    }
  }

  // Fall back to first strategy in the component profile
  return componentProfile.strategies[0] ?? 'elevation';
}

const adapterProvenance: Provenance = {
  layer: 'design-intelligence',
  source: 'hover-intelligence-engine',
  confidence: 0.9,
  evidence: ['component-type mapping', 'profile hover defaults', 'style-based fallbacks'],
  timestamp: new Date(),
  reasoning: 'Generated hover behaviors from component types and experience profile',
};

// ─── Main Hover Intelligence ───────────────────────────────────────────────

export interface HoverIntelligenceInput {
  /** Component types present in the page */
  componentTypes: string[];
  /** Experience profile */
  profile: ExperienceProfile;
  /** Experience style */
  style: ExperienceStyle;
  /** Interaction density */
  density: InteractionDensity;
}

/**
 * Generate hover behaviors for all components in a page.
 * Returns canonical HoverBehavior with full provenance.
 */
export function generateHoverBehaviors(
  input: HoverIntelligenceInput,
): ProvenanceAware<HoverBehavior> {
  const { componentTypes, profile, style, density } = input;

  // If density is minimal, only apply to primary interactive elements
  const targetComponents = density === 'minimal'
    ? componentTypes.filter(c => ['button', 'link', 'nav-item'].includes(c))
    : density === 'light'
      ? componentTypes.filter(c => ['button', 'link', 'nav-item', 'card', 'image'].includes(c))
      : componentTypes;

  const elements: HoverElementConfig[] = [];

  for (const componentType of targetComponents) {
    const strategy = selectStrategy(componentType, profile, style);
    const strategyDef = STRATEGIES[strategy];

    if (strategy === 'none') continue;

    const animation: HoverAnimation = {
      ...strategyDef.defaults,
      duration: strategyDef.defaults.duration ?? 200,
      easing: strategyDef.defaults.easing ?? 'cubic-bezier(0.4, 0, 0.2, 1)',
    };

    // Add element configs from strategy definition
    for (const elem of strategyDef.elements) {
      elements.push({
        type: elem.type,
        animation: { ...elem.animation, duration: elem.animation.duration ?? animation.duration, easing: elem.animation.easing ?? animation.easing },
        disableOnTouch: elem.disableOnTouch,
      });
    }
  }

  // Deduplicate by type (keep first)
  const uniqueElements = elements.filter((elem, idx, arr) => arr.findIndex(e => e.type === elem.type) === idx);

  return {
    value: {
      philosophy: STRATEGIES[selectStrategy(targetComponents[0] ?? 'button', profile, style)]?.philosophy ?? 'professional',
      defaults: STRATEGIES[selectStrategy(targetComponents[0] ?? 'button', profile, style)]?.defaults ?? { duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      elements: uniqueElements,
    },
    provenance: adapterProvenance,
  };
}

/**
 * Get the hover strategy definition for a specific strategy.
 */
export function getStrategyDef(strategy: string): CanonicalHoverStrategy | undefined {
  return STRATEGIES[strategy];
}

/**
 * Get all available hover strategies.
 */
export function getAllStrategies(): string[] {
  return Object.keys(STRATEGIES);
}