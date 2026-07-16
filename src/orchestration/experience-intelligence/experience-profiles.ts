// ─── Experience Profiles ────────────────────────────────────────────────────
//
// Per-industry experience configurations. Each profile defines the emotional
// qualities, narrative structures, hover strategies, and motion intensity
// that feel natural for that industry.
//
// These are data-driven defaults. The Experience Intelligence Engine selects
// and customizes based on the specific project context.
// ─────────────────────────────────────────────────────────────────────────────

import type { Industry } from '../types.js';
import type {
  ExperienceProfile,
  ExperienceStyle,
  EmotionTarget,
  NarrativeStructure,
  HoverStrategy,
  InteractionDensity,
  NarrativeRole,
} from './types-experience.js';

// ─── Profile Registry ──────────────────────────────────────────────────────

const PROFILES: Record<Industry, ExperienceProfile> = {
  ecommerce: {
    industry: 'ecommerce',
    name: 'E-Commerce',
    defaultStyle: 'premium',
    emotionalQualities: ['excitement', 'trust', 'delight', 'urgency'],
    narrativeStructures: ['problem-solution', 'discovery', 'transformation'],
    hoverDefaults: ['elevation', 'image-zoom', 'glow'],
    interactionDensity: 'rich',
    motionIntensity: 0.7,
    conversionFocus: 'high',
    performanceSensitivity: 'medium',
    sceneTemplate: ['hook', 'problem', 'solution', 'proof', 'benefits', 'offer', 'cta'],
    scrollPacing: 'moderate',
  },

  saas: {
    industry: 'saas',
    name: 'SaaS',
    defaultStyle: 'minimal',
    emotionalQualities: ['confidence', 'calm', 'trust', 'aspiration'],
    narrativeStructures: ['problem-solution', 'progressive-disclosure', 'data-driven'],
    hoverDefaults: ['elevation', 'icon-movement', 'scale-subtle'],
    interactionDensity: 'moderate',
    motionIntensity: 0.5,
    conversionFocus: 'high',
    performanceSensitivity: 'high',
    sceneTemplate: ['hook', 'problem', 'insight', 'solution', 'proof', 'pricing', 'cta'],
    scrollPacing: 'moderate',
  },

  fintech: {
    industry: 'fintech',
    name: 'FinTech',
    defaultStyle: 'technical',
    emotionalQualities: ['trust', 'confidence', 'calm', 'aspiration'],
    narrativeStructures: ['problem-solution', 'data-driven', 'progressive-disclosure'],
    hoverDefaults: ['elevation', 'scale-subtle'],
    interactionDensity: 'light',
    motionIntensity: 0.4,
    conversionFocus: 'high',
    performanceSensitivity: 'high',
    sceneTemplate: ['hook', 'problem', 'insight', 'solution', 'proof', 'trust', 'cta'],
    scrollPacing: 'slow',
  },

  healthcare: {
    industry: 'healthcare',
    name: 'Healthcare',
    defaultStyle: 'minimal',
    emotionalQualities: ['trust', 'calm', 'serenity', 'warmth'],
    narrativeStructures: ['problem-solution', 'journey', 'before-after'],
    hoverDefaults: ['elevation', 'none'],
    interactionDensity: 'minimal',
    motionIntensity: 0.3,
    conversionFocus: 'medium',
    performanceSensitivity: 'high',
    sceneTemplate: ['hook', 'problem', 'solution', 'proof', 'trust', 'benefits', 'cta'],
    scrollPacing: 'slow',
  },

  education: {
    industry: 'education',
    name: 'Education',
    defaultStyle: 'storytelling',
    emotionalQualities: ['motivation', 'curiosity', 'confidence', 'delight'],
    narrativeStructures: ['journey', 'progressive-disclosure', 'transformation'],
    hoverDefaults: ['elevation', 'glow', 'icon-movement'],
    interactionDensity: 'rich',
    motionIntensity: 0.6,
    conversionFocus: 'medium',
    performanceSensitivity: 'medium',
    sceneTemplate: ['hook', 'problem', 'insight', 'solution', 'proof', 'benefits', 'cta'],
    scrollPacing: 'variable',
  },

  restaurant: {
    industry: 'restaurant',
    name: 'Restaurant',
    defaultStyle: 'editorial',
    emotionalQualities: ['warmth', 'delight', 'energy', 'curiosity'],
    narrativeStructures: ['storytelling', 'discovery', 'before-after'],
    hoverDefaults: ['image-zoom', 'background-shift', 'glass-movement'],
    interactionDensity: 'immersive',
    motionIntensity: 0.8,
    conversionFocus: 'medium',
    performanceSensitivity: 'medium',
    sceneTemplate: ['hook', 'transformation', 'features', 'proof', 'benefits', 'cta'],
    scrollPacing: 'fast',
  },

  fitness: {
    industry: 'fitness',
    name: 'Fitness',
    defaultStyle: 'premium',
    emotionalQualities: ['energy', 'motivation', 'excitement', 'confidence'],
    narrativeStructures: ['transformation', 'journey', 'problem-solution'],
    hoverDefaults: ['glow', 'glow', 'elevation'],
    interactionDensity: 'rich',
    motionIntensity: 0.8,
    conversionFocus: 'high',
    performanceSensitivity: 'medium',
    sceneTemplate: ['hook', 'problem', 'transformation', 'proof', 'benefits', 'pricing', 'cta'],
    scrollPacing: 'fast',
  },

  'real-estate': {
    industry: 'real-estate',
    name: 'Real Estate',
    defaultStyle: 'luxury',
    emotionalQualities: ['aspiration', 'warmth', 'trust', 'delight'],
    narrativeStructures: ['discovery', 'storytelling', 'before-after'],
    hoverDefaults: ['image-zoom', 'depth-shift', 'glass-movement'],
    interactionDensity: 'moderate',
    motionIntensity: 0.6,
    conversionFocus: 'high',
    performanceSensitivity: 'medium',
    sceneTemplate: ['hook', 'transformation', 'features', 'proof', 'transformation', 'cta'],
    scrollPacing: 'slow',
  },

  media: {
    industry: 'media',
    name: 'Media',
    defaultStyle: 'editorial',
    emotionalQualities: ['curiosity', 'excitement', 'energy', 'aspiration'],
    narrativeStructures: ['storytelling', 'discovery', 'progressive-disclosure'],
    hoverDefaults: ['image-zoom', 'text-reveal', 'background-shift'],
    interactionDensity: 'immersive',
    motionIntensity: 0.7,
    conversionFocus: 'low',
    performanceSensitivity: 'medium',
    sceneTemplate: ['hook', 'transformation', 'features', 'proof', 'benefits', 'cta'],
    scrollPacing: 'variable',
  },

  portfolio: {
    industry: 'portfolio',
    name: 'Portfolio',
    defaultStyle: 'cinematic',
    emotionalQualities: ['aspiration', 'curiosity', 'delight', 'energy'],
    narrativeStructures: ['storytelling', 'journey', 'transformation'],
    hoverDefaults: ['tilt-3d', 'magnetic', 'text-reveal'],
    interactionDensity: 'immersive',
    motionIntensity: 0.9,
    conversionFocus: 'low',
    performanceSensitivity: 'low',
    sceneTemplate: ['hook', 'transformation', 'features', 'proof', 'benefits', 'cta'],
    scrollPacing: 'variable',
  },

  marketplace: {
    industry: 'marketplace',
    name: 'Marketplace',
    defaultStyle: 'premium',
    emotionalQualities: ['trust', 'excitement', 'delight', 'confidence'],
    narrativeStructures: ['problem-solution', 'discovery', 'comparison'],
    hoverDefaults: ['elevation', 'image-zoom', 'glow'],
    interactionDensity: 'rich',
    motionIntensity: 0.6,
    conversionFocus: 'high',
    performanceSensitivity: 'medium',
    sceneTemplate: ['hook', 'problem', 'solution', 'proof', 'benefits', 'cta'],
    scrollPacing: 'moderate',
  },

  nonprofit: {
    industry: 'nonprofit',
    name: 'Non-Profit',
    defaultStyle: 'storytelling',
    emotionalQualities: ['warmth', 'trust', 'motivation', 'aspiration'],
    narrativeStructures: ['journey', 'transformation', 'storytelling'],
    hoverDefaults: ['elevation', 'glow', 'scale-subtle'],
    interactionDensity: 'light',
    motionIntensity: 0.5,
    conversionFocus: 'high',
    performanceSensitivity: 'high',
    sceneTemplate: ['hook', 'transformation', 'problem', 'transformation', 'proof', 'cta'],
    scrollPacing: 'slow',
  },

  luxury: {
    industry: 'luxury',
    name: 'Luxury',
    defaultStyle: 'premium',
    emotionalQualities: ['excitement', 'delight', 'aspiration', 'trust'],
    narrativeStructures: ['transformation', 'discovery'],
    hoverDefaults: ['glow', 'image-zoom', 'elevation'],
    interactionDensity: 'rich',
    motionIntensity: 0.8,
    conversionFocus: 'medium',
    performanceSensitivity: 'medium',
    sceneTemplate: ['hook', 'transformation', 'proof', 'benefits', 'offer', 'cta'],
    scrollPacing: 'slow',
  },

  perfume: {
    industry: 'perfume',
    name: 'Perfume & Fragrance',
    defaultStyle: 'premium',
    emotionalQualities: ['excitement', 'delight', 'aspiration', 'trust'],
    narrativeStructures: ['transformation', 'discovery'],
    hoverDefaults: ['glow', 'image-zoom', 'elevation'],
    interactionDensity: 'rich',
    motionIntensity: 0.85,
    conversionFocus: 'medium',
    performanceSensitivity: 'medium',
    sceneTemplate: ['hook', 'transformation', 'features', 'proof', 'benefits', 'cta'],
    scrollPacing: 'slow',
  },

  fragrance: {
    industry: 'fragrance',
    name: 'Fragrance',
    defaultStyle: 'premium',
    emotionalQualities: ['excitement', 'delight', 'aspiration', 'trust'],
    narrativeStructures: ['transformation', 'discovery'],
    hoverDefaults: ['glow', 'image-zoom', 'elevation'],
    interactionDensity: 'rich',
    motionIntensity: 0.85,
    conversionFocus: 'medium',
    performanceSensitivity: 'medium',
    sceneTemplate: ['hook', 'transformation', 'features', 'proof', 'benefits', 'cta'],
    scrollPacing: 'slow',
  },

  beauty: {
    industry: 'beauty',
    name: 'Beauty',
    defaultStyle: 'premium',
    emotionalQualities: ['excitement', 'delight', 'aspiration', 'trust'],
    narrativeStructures: ['transformation', 'discovery'],
    hoverDefaults: ['glow', 'image-zoom', 'elevation'],
    interactionDensity: 'rich',
    motionIntensity: 0.75,
    conversionFocus: 'high',
    performanceSensitivity: 'medium',
    sceneTemplate: ['hook', 'transformation', 'features', 'proof', 'offer', 'cta'],
    scrollPacing: 'moderate',
  },

  other: {
    industry: 'other',
    name: 'General',
    defaultStyle: 'premium',
    emotionalQualities: ['trust', 'confidence', 'delight'],
    narrativeStructures: ['problem-solution', 'discovery'],
    hoverDefaults: ['elevation', 'scale-subtle'],
    interactionDensity: 'moderate',
    motionIntensity: 0.6,
    conversionFocus: 'medium',
    performanceSensitivity: 'medium',
    sceneTemplate: ['hook', 'problem', 'solution', 'proof', 'benefits', 'cta'],
    scrollPacing: 'moderate',
  },
};

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Get the experience profile for an industry.
 */
export function getExperienceProfile(industry: Industry): ExperienceProfile {
  return PROFILES[industry] ?? PROFILES.other;
}

/**
 * Get all experience profiles.
 */
export function getAllExperienceProfiles(): Record<Industry, ExperienceProfile> {
  return { ...PROFILES };
}

/**
 * Customize a profile based on sub-industry and personality.
 * Returns a new profile with adjustments.
 */
export function customizeProfile(
  base: ExperienceProfile,
  subIndustry?: string,
  personality?: string,
): ExperienceProfile {
  const customized = { ...base };

  // Sub-industry adjustments
  if (subIndustry) {
    const sub = subIndustry.toLowerCase();

    // Healthcare sub-industries
    if (base.industry === 'healthcare') {
      if (sub.includes('dental') || sub.includes('cosmetic')) {
        customized.motionIntensity = 0.5;
        customized.emotionalQualities = ['delight', 'trust', 'aspiration'];
        customized.hoverDefaults = ['glow', 'image-zoom'];
      }
      if (sub.includes('therapy') || sub.includes('mental')) {
        customized.motionIntensity = 0.2;
        customized.emotionalQualities = ['calm', 'serenity', 'trust'];
        customized.interactionDensity = 'minimal';
      }
      if (sub.includes('vet') || sub.includes('animal')) {
        customized.emotionalQualities = ['warmth', 'delight', 'trust'];
        customized.motionIntensity = 0.5;
      }
    }

    // Restaurant sub-industries
    if (base.industry === 'restaurant') {
      if (sub.includes('fine') || sub.includes('upscale')) {
        customized.defaultStyle = 'luxury';
        customized.motionIntensity = 0.6;
        customized.hoverDefaults = ['glass-movement', 'depth-shift'];
        customized.interactionDensity = 'moderate';
      }
      if (sub.includes('cafe') || sub.includes('coffee')) {
        customized.emotionalQualities = ['warmth', 'calm', 'delight'];
        customized.motionIntensity = 0.5;
      }
      if (sub.includes('fast') || sub.includes('quick')) {
        customized.motionIntensity = 0.7;
        customized.scrollPacing = 'fast';
        customized.interactionDensity = 'light';
      }
    }

    // SaaS sub-industries
    if (base.industry === 'saas') {
      if (sub.includes('dev') || sub.includes('api') || sub.includes('technical')) {
        customized.defaultStyle = 'technical';
        customized.motionIntensity = 0.3;
        customized.hoverDefaults = ['icon-movement', 'scale-subtle'];
      }
      if (sub.includes('ai') || sub.includes('ml')) {
        customized.defaultStyle = 'cinematic';
        customized.motionIntensity = 0.7;
      }
    }

    // Fitness sub-industries
    if (base.industry === 'fitness') {
      if (sub.includes('yoga') || sub.includes('wellness')) {
        customized.motionIntensity = 0.4;
        customized.emotionalQualities = ['calm', 'serenity', 'motivation'];
        customized.scrollPacing = 'slow';
      }
      if (sub.includes('crossfit') || sub.includes('powerlift')) {
        customized.motionIntensity = 0.9;
        customized.emotionalQualities = ['energy', 'motivation', 'excitement'];
      }
    }
  }

  // Personality adjustments
  if (personality) {
    const p = personality.toLowerCase();
    if (p === 'luxury' || p === 'premium') {
      customized.defaultStyle = 'luxury';
      customized.motionIntensity = Math.max(0.3, customized.motionIntensity - 0.2);
      customized.hoverDefaults = ['magnetic', 'glass-movement', 'depth-shift'];
    }
    if (p === 'playful' || p === 'fun') {
      customized.defaultStyle = 'playful';
      customized.motionIntensity = Math.min(1, customized.motionIntensity + 0.2);
      customized.hoverDefaults = ['glow', 'tilt-3d', 'scale-subtle'];
    }
    if (p === 'minimal') {
      customized.defaultStyle = 'minimal';
      customized.motionIntensity = Math.max(0.2, customized.motionIntensity - 0.3);
      customized.hoverDefaults = ['scale-subtle', 'none'];
      customized.interactionDensity = 'light';
    }
    if (p === 'enterprise' || p === 'professional') {
      customized.defaultStyle = 'enterprise';
      customized.motionIntensity = Math.max(0.2, customized.motionIntensity - 0.3);
      customized.hoverDefaults = ['elevation', 'scale-subtle'];
      customized.interactionDensity = 'light';
    }
    if (p === 'editorial' || p === 'storytelling') {
      customized.defaultStyle = 'editorial';
      customized.motionIntensity = Math.min(1, customized.motionIntensity + 0.1);
    }
  }

  return customized;
}

// ─── Phase R2: capability-driven experience hints ────────────────────────
// The experience layer now reasons from the same canonical capability vocabulary
// as evaluation / components / learning. Canonical capability domains map onto
// experience biases (emotion, motion, hover, density) so a build's experience is
// derived from its resolved capabilities, not just its industry label.

import { capabilityRegistry } from '../../bos/capabilities/index.js';
import type { CapabilityId } from '../../bos/capabilities/index.js';

type ExperienceHint = Partial<Pick<ExperienceProfile, 'emotionalQualities' | 'hoverDefaults' | 'interactionDensity' | 'motionIntensity' | 'conversionFocus'>>;

const CAPABILITY_EXPERIENCE_HINTS: Record<string, ExperienceHint> = {
  'commerce.catalog': { conversionFocus: 'medium', emotionalQualities: ['delight', 'trust'] },
  'commerce.checkout': { conversionFocus: 'high', emotionalQualities: ['trust', 'urgency', 'delight'] },
  'commerce.orders': { conversionFocus: 'medium', emotionalQualities: ['trust', 'calm'] },
  payments: { emotionalQualities: ['trust', 'confidence'], motionIntensity: 0.3 },
  'crm.contacts': { emotionalQualities: ['trust', 'calm'], interactionDensity: 'moderate' },
  'crm.support': { emotionalQualities: ['trust', 'calm'] },
  scheduling: { emotionalQualities: ['calm', 'confidence'], hoverDefaults: ['scale-subtle', 'elevation'] },
  'booking.reservation': { conversionFocus: 'high', emotionalQualities: ['excitement', 'trust'] },
  'booking.appointment': { emotionalQualities: ['calm', 'trust'] },
  'healthcare.records': { emotionalQualities: ['calm', 'trust', 'serenity'], motionIntensity: 0.2 },
  'healthcare.appointments': { emotionalQualities: ['calm', 'trust'] },
  'content.management': { emotionalQualities: ['delight', 'aspiration'] },
  'analytics.dashboard': { emotionalQualities: ['confidence', 'trust'], interactionDensity: 'rich' },
  'social.ugc': { emotionalQualities: ['delight', 'warmth'] },
  subscriptions: { conversionFocus: 'high', emotionalQualities: ['trust', 'aspiration'] },
  membership: { emotionalQualities: ['warmth', 'trust'] },
};

export interface CapabilityExperienceHints {
  emotionalQualities: string[];
  hoverDefaults: string[];
  interactionDensity?: InteractionDensity;
  motionIntensity?: number;
  conversionFocus?: 'low' | 'medium' | 'high';
}

/** Collect experience biases implied by a set of (raw or canonical) capabilities. */
export function getCapabilityExperienceHints(capabilities: string[]): CapabilityExperienceHints {
  const resolved = capabilityRegistry.resolve(capabilities).expanded;
  const out: CapabilityExperienceHints = { emotionalQualities: [], hoverDefaults: [] };
  for (const id of resolved) {
    const hint = CAPABILITY_EXPERIENCE_HINTS[id];
    if (!hint) continue;
    if (hint.emotionalQualities) out.emotionalQualities.push(...hint.emotionalQualities);
    if (hint.hoverDefaults) out.hoverDefaults.push(...hint.hoverDefaults);
    if (hint.interactionDensity) out.interactionDensity = hint.interactionDensity;
    if (hint.motionIntensity !== undefined) out.motionIntensity = hint.motionIntensity;
    if (hint.conversionFocus) out.conversionFocus = hint.conversionFocus;
  }
  out.emotionalQualities = [...new Set(out.emotionalQualities)];
  out.hoverDefaults = [...new Set(out.hoverDefaults)];
  return out;
}

/** Build an experience profile from capabilities: industry default + capability hints. */
export function getExperienceProfileForCapabilities(capabilities: string[]): ExperienceProfile {
  const resolved = capabilityRegistry.resolve(capabilities);
  let industry: Industry = 'other';
  for (const id of resolved.expanded) {
    const cap = capabilityRegistry.get(id as CapabilityId);
    if (cap?.industries.length) { industry = cap.industries[0] as Industry; break; }
  }
  const base = getExperienceProfile(industry);
  const hints = getCapabilityExperienceHints(capabilities);
  return {
    ...base,
    emotionalQualities: hints.emotionalQualities.length ? (hints.emotionalQualities as ExperienceProfile['emotionalQualities']) : base.emotionalQualities,
    hoverDefaults: hints.hoverDefaults.length ? (hints.hoverDefaults as ExperienceProfile['hoverDefaults']) : base.hoverDefaults,
    ...(hints.interactionDensity ? { interactionDensity: hints.interactionDensity } : {}),
    ...(hints.motionIntensity !== undefined ? { motionIntensity: hints.motionIntensity } : {}),
    ...(hints.conversionFocus ? { conversionFocus: hints.conversionFocus } : {}),
  };
}

