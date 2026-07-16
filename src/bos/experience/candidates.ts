// ─── Experience Director — Candidate Generation ─────────────────────
// Generates candidate experience concepts from the Business Knowledge.
// Each candidate represents a distinct creative direction the Director can
// score and compare.  Candidates are deterministic (seeded by industry +
// capabilities) — no randomness, no LLM required for generation.

import type { CapabilityId } from '../capabilities/types.js';
import type { ExperienceConcept } from './types.js';

interface BusinessKnowledge {
  industry?: string;
  capabilities: CapabilityId[];
  entities: string[];
  description?: string;
}

// ─── Canonical candidate library ────────────────────────────────────
// Each entry is a template that gets specialised per business knowledge.

const CANDIDATE_TEMPLATES: Array<{
  id: string;
  name: string;
  style: ExperienceConcept['style'];
  tagline: string;
  description: string;
  motionPrinciples: string[];
  emotionalArc: string[];
  conversionStrategy: string;
  performanceProfile: ExperienceConcept['performanceProfile'];
  capabilityHints: string[];          // partial matches — expanded at generation
  pageLayout: ExperienceConcept['pageLayout'];
  audienceHints: string[];
  impliedPrimitives: string[];
}> = [
  {
    id: 'cinematic-scroll',
    name: 'Cinematic Scroll',
    style: 'cinematic',
    tagline: 'Scrolling should feel like a camera dolly, not a webpage.',
    description: 'A story-driven scroll journey where every section is a scene with camera movement, lighting shifts, and depth transitions. The visitor feels guided through a narrative, not browsing a catalog.',
    motionPrinciples: ['scroll-driven-camera', 'depth-of-field', 'lighting-shifts', 'parallax-layering', 'section-transitions'],
    emotionalArc: ['curiosity', 'intrigue', 'understanding', 'desire', 'confidence', 'action'],
    conversionStrategy: 'Build emotional investment first; CTA appears only after the story earns trust.',
    performanceProfile: 'cinematic',
    capabilityHints: ['commerce.catalog', 'content.management', 'auth'],
    pageLayout: 'single-scroll',
    audienceHints: ['luxury', 'premium', 'story-driven'],
    impliedPrimitives: ['narrative', 'camera', 'lighting', 'depth', 'confidence', 'desire', 'cinematic'],
  },
  {
    id: '3d-immersive',
    name: '3D Immersive',
    style: 'immersive-3d',
    tagline: 'The product is the hero — let people touch it before they buy.',
    description: 'Interactive 3D product showcases with orbit controls, material reveals, and contextual animations. The visitor explores the product in space before committing.',
    motionPrinciples: ['3d-product-orbit', 'material-reveal', 'contextual-scale', 'cursor-interaction', 'section-depth'],
    emotionalArc: ['discovery', 'exploration', 'appreciation', 'understanding', 'ownership-desire', 'purchase'],
    conversionStrategy: 'Product interaction builds ownership feeling; "add to cart" appears after exploration.',
    performanceProfile: 'heavy',
    capabilityHints: ['commerce.catalog', 'commerce.cart', 'commerce.checkout'],
    pageLayout: 'single-scroll',
    audienceHints: ['tech-savvy', 'product-focused', 'explorer'],
    impliedPrimitives: ['future', 'innovation', 'precision', 'interaction', 'desire', 'curiosity', 'technology'],
  },
  {
    id: 'minimal-luxe',
    name: 'Minimal Luxe',
    style: 'minimal-luxe',
    tagline: 'Whitespace is the ultimate luxury.',
    description: 'Ultra-clean layout with glassmorphism accents, generous whitespace, and precise typography. Every element earns its place. Motion is subtle — hover states, micro-interactions, and gentle reveals.',
    motionPrinciples: ['glassmorphism', 'micro-interactions', 'hover-states', 'gentle-reveal', 'typographic-motion'],
    emotionalArc: ['calm', 'appreciation', 'trust', 'desire', 'confidence', 'action'],
    conversionStrategy: 'Premium feel implies premium quality; social proof and scarcity drive urgency.',
    performanceProfile: 'light',
    capabilityHints: ['commerce.catalog', 'auth', 'subscriptions'],
    pageLayout: 'multi-page',
    audienceHints: ['luxury', 'design-conscious', 'premium'],
    impliedPrimitives: ['minimalism', 'whitespace', 'precision', 'calm', 'confidence', 'hierarchy', 'luxury'],
  },
  {
    id: 'editorial-scroll',
    name: 'Editorial Scroll',
    style: 'editorial',
    tagline: 'Long-form storytelling that earns every click.',
    description: 'Magazine-style layout with rich content blocks, pull quotes, inline media, and progressive disclosure. The visitor reads, learns, and converts through understanding.',
    motionPrinciples: ['progressive-disclosure', 'inline-reveal', 'text-animation', 'media-parallax', 'chapter-transitions'],
    emotionalArc: ['interest', 'education', 'credibility', 'conviction', 'action'],
    conversionStrategy: 'Education-driven: informed visitors convert at higher AOV.',
    performanceProfile: 'standard',
    capabilityHints: ['content.management', 'analytics.dashboard', 'auth'],
    pageLayout: 'single-scroll',
    audienceHints: ['informed', 'research-oriented', 'professional'],
    impliedPrimitives: ['typography', 'content', 'hierarchy', 'trust', 'education', 'narrative'],
  },
  {
    id: 'dynamic-motion',
    name: 'Dynamic Motion',
    style: 'dynamic',
    tagline: 'Every pixel moves with purpose.',
    description: 'Motion-first design with particle systems, scroll-triggered animations, staggered reveals, and kinetic typography. The site feels alive without being distracting.',
    motionPrinciples: ['particle-systems', 'scroll-triggered', 'staggered-reveals', 'kinetic-typography', 'morphing-shapes'],
    emotionalArc: ['excitement', 'energy', 'engagement', 'delight', 'action'],
    conversionStrategy: 'Momentum and energy create FOMO; urgency-driven CTAs.',
    performanceProfile: 'heavy',
    capabilityHints: ['commerce.catalog', 'marketplace', 'notifications.email'],
    pageLayout: 'single-scroll',
    audienceHints: ['young', 'social', 'trend-conscious'],
    impliedPrimitives: ['energy', 'movement', 'speed', 'contrast', 'excitement', 'playful'],
  },
  {
    id: 'conversion-engine',
    name: 'Conversion Engine',
    style: 'conversion',
    tagline: 'Beautiful is useless if it does not convert.',
    description: 'Funnel-first design with clear value proposition, social proof, risk reversal, and frictionless checkout. Every section has a conversion job.',
    motionPrinciples: ['cta-emphasis', 'social-proof-reveal', 'trust-animation', 'urgency-countdown', 'frictionless-form'],
    emotionalArc: ['attention', 'interest', 'trust', 'urgency', 'action', 'confirmation'],
    conversionStrategy: 'AIDA-perfected: Attention → Interest → Desire → Action with zero dead ends.',
    performanceProfile: 'standard',
    capabilityHints: ['commerce.checkout', 'payments', 'auth', 'analytics.dashboard'],
    pageLayout: 'single-scroll',
    audienceHints: ['buyer', 'price-sensitive', 'deal-seeker'],
    impliedPrimitives: ['trust', 'urgency', 'social-proof', 'efficiency', 'action', 'confidence'],
  },
  {
    id: 'silent-soundscape',
    name: 'Silent Soundscape',
    style: 'cinematic',
    tagline: 'Every scroll moves you from noise into silence.',
    description: 'A scroll-driven transformation where chaotic soundwaves resolve into complete calm. The page opens in motion and turbulence, then, section by section, distills into stillness — a sensory arc from chaos to serenity that makes the product feel like the source of quiet.',
    motionPrinciples: ['scroll-driven-transformation', 'soundwave-dissolve', 'noise-to-silence', 'turbulence-to-stillness', 'ambient-parallax', 'breath-reveal'],
    emotionalArc: ['chaos', 'tension', 'curiosity', 'release', 'calm', 'stillness'],
    conversionStrategy: 'Earn the calm first; the CTA arrives as the exhale, not a shout.',
    performanceProfile: 'cinematic',
    capabilityHints: ['commerce.catalog', 'content.management', 'auth'],
    pageLayout: 'single-scroll',
    audienceHints: ['transformation', 'scroll-journey', 'sound-to-silence', 'immersive', 'premium', 'calm'],
    impliedPrimitives: ['transformation', 'scroll-journey', 'sound-to-silence', 'calm', 'immersive', 'narrative', 'cinematic', 'curiosity'],
  },
];

// ─── Generation ─────────────────────────────────────────────────────

/**
 * Generate candidate experience concepts from the Business Knowledge.
 * Deterministic — same inputs produce same candidates.
 */
export function generateCandidateConcepts(bk: BusinessKnowledge): ExperienceConcept[] {
  const candidates: ExperienceConcept[] = [];
  const caps = new Set(bk.capabilities);

  for (const tmpl of CANDIDATE_TEMPLATES) {
    // Expand capability hints to canonical ids that match
    const requiredCaps: CapabilityId[] = [];
    for (const hint of tmpl.capabilityHints) {
      if (caps.has(hint as CapabilityId)) {
        requiredCaps.push(hint as CapabilityId);
      }
    }

    // Audience alignment is now derived from primitive overlap (see director.ts),
    // not from industry keywords.  Keep audienceHints for downstream inspection.
    candidates.push({
      id: tmpl.id,
      name: tmpl.name,
      style: tmpl.style,
      tagline: tmpl.tagline,
      description: tmpl.description,
      motionPrinciples: tmpl.motionPrinciples,
      emotionalArc: tmpl.emotionalArc,
      conversionStrategy: tmpl.conversionStrategy,
      performanceProfile: tmpl.performanceProfile,
      requiredCapabilities: requiredCaps,
      pageLayout: tmpl.pageLayout,
      audienceAlignment: tmpl.audienceHints,
      impliedPrimitives: tmpl.impliedPrimitives,
    });
  }

  return candidates;
}
