/**
 * Domain Detector - Refactored to consume BusinessKnowledge
 *
 * This module now consumes BusinessKnowledge from the Business Intelligence layer
 * instead of performing its own industry detection.
 *
 * OWNERSHIP: Business Intelligence owns industry classification.
 * This module is a CONSUMER, not a PRODUCER.
 */

import type { BusinessKnowledge } from '../orchestration/business-intelligence/types.js';

// ============================================================================
// TYPES
// ============================================================================

export interface DomainContext {
  industry: string;
  subIndustry: string;
  mood: 'premium' | 'modern' | 'minimal' | 'bold' | 'playful' | 'corporate' | 'warm' | 'dark';
  features: string[];
  contentKeywords: string[];
  suggestedSections: string[];
  colorHint: string;
  imageKeywords: string[];
}

// ============================================================================
// MOOD KEYWORDS (kept for mood detection from prompt)
// ============================================================================

const MOOD_KEYWORDS: Record<string, string[]> = {
  premium: ['luxury', 'premium', 'high-end', 'exclusive', 'elegant', 'sophisticated', 'refined', 'elite'],
  modern: ['modern', 'contemporary', 'cutting-edge', 'innovative', 'futuristic', 'sleek'],
  minimal: ['minimal', 'minimalist', 'clean', 'simple', 'bare', 'essential'],
  bold: ['bold', 'striking', 'dramatic', 'powerful', 'intense', 'vibrant'],
  playful: ['fun', 'playful', 'colorful', 'creative', 'whimsical', 'quirky'],
  corporate: ['corporate', 'professional', 'business', 'enterprise', 'formal'],
  warm: ['warm', 'cozy', 'friendly', 'welcoming', 'comfortable', 'homey'],
  dark: ['dark', 'moody', 'noir', 'gothic', 'mysterious', 'shadowy'],
  creative: ['creative', 'artistic', 'design', 'portfolio', 'showcase'],
  clean: ['clean', 'clinical', 'hygienic', 'fresh', 'pure'],
};

// ============================================================================
// INDUSTRY → DOMAIN MAPPING (consumed from BusinessKnowledge)
// ============================================================================

const INDUSTRY_DOMAIN_MAP: Record<string, { sections: string[]; color: string; mood: DomainContext['mood']; features: string[]; images: string[] }> = {
  restaurant: { sections: ['hero', 'menu-highlights', 'about', 'gallery', 'reservations', 'testimonials', 'contact-info'], color: 'amber', mood: 'warm', features: ['online-ordering', 'booking', 'gallery', 'testimonials', 'contact-form'], images: ['fine dining', 'restaurant interior', 'gourmet food', 'chef cooking'] },
  healthcare: { sections: ['hero', 'services', 'team/doctors', 'appointment-booking', 'testimonials', 'contact-info', 'faq'], color: 'cyan', mood: 'modern', features: ['booking', 'team', 'testimonials', 'contact-form', 'faq'], images: ['doctor office', 'medical clinic', 'healthcare professional', 'patient care'] },
  saas: { sections: ['hero', 'features', 'pricing-table', 'integrations', 'testimonials', 'cta', 'faq'], color: 'violet', mood: 'modern', features: ['dashboard', 'pricing', 'integrations', 'testimonials', 'faq'], images: ['dashboard', 'software interface', 'analytics', 'team collaboration'] },
  ecommerce: { sections: ['hero', 'categories', 'featured-products', 'product-grid', 'testimonials', 'newsletter-cta', 'cta'], color: 'orange', mood: 'modern', features: ['ecommerce', 'product-gallery', 'cart', 'checkout', 'testimonials'], images: ['product photography', 'online store', 'shopping', 'ecommerce'] },
  fitness: { sections: ['hero', 'class-schedule', 'trainers', 'membership-plans', 'gallery', 'testimonials', 'contact-info'], color: 'rose', mood: 'bold', features: ['booking', 'membership', 'gallery', 'team', 'testimonials'], images: ['gym interior', 'personal training', 'yoga class', 'fitness workout'] },
  education: { sections: ['hero', 'courses', 'features', 'pricing-table', 'testimonials', 'cta', 'faq'], color: 'blue', mood: 'corporate', features: ['courses', 'pricing', 'testimonials', 'faq'], images: ['online learning', 'classroom', 'university', 'library'] },
  realestate: { sections: ['hero', 'featured-properties', 'stats-bar', 'services', 'testimonials', 'contact-form', 'cta'], color: 'emerald', mood: 'corporate', features: ['property-gallery', 'maps', 'contact-form', 'testimonials'], images: ['luxury home', 'modern house', 'apartment interior', 'real estate'] },
  legal: { sections: ['hero', 'practice-areas', 'team', 'case-studies', 'testimonials', 'contact-form', 'faq'], color: 'slate', mood: 'corporate', features: ['team', 'case-studies', 'testimonials', 'contact-form', 'faq'], images: ['law office', 'courtroom', 'legal books', 'attorney consultation'] },
  agency: { sections: ['hero', 'services', 'case-studies', 'clients', 'team', 'testimonials', 'cta'], color: 'indigo', mood: 'modern', features: ['services', 'case-studies', 'team', 'testimonials'], images: ['team meeting', 'creative brainstorm', 'office collaboration', 'strategy'] },
  nonprofit: { sections: ['hero', 'mission', 'impact-stats', 'programs', 'donate-cta', 'testimonials', 'contact-info'], color: 'green', mood: 'warm', features: ['donation', 'mission', 'testimonials', 'contact-form'], images: ['community', 'volunteers', 'charity event', 'helping hands'] },
  media: { sections: ['hero', 'featured-articles', 'categories', 'newsletter-cta', 'testimonials', 'cta'], color: 'slate', mood: 'modern', features: ['blog', 'newsletter', 'testimonials'], images: ['journalism', 'newsroom', 'content creation', 'media production'] },
  travel: { sections: ['hero', 'popular-destinations', 'deals', 'testimonials', 'cta'], color: 'sky', mood: 'warm', features: ['booking', 'gallery', 'testimonials', 'maps'], images: ['travel destination', 'vacation', 'adventure', 'tourism'] },
  luxury: { sections: ['hero', 'gallery', 'about', 'features', 'testimonials', 'cta'], color: 'amber', mood: 'premium', features: ['gallery', 'testimonials', 'cta'], images: ['luxury watch', 'premium product', 'elegant design', 'high-end brand'] },
  beauty: { sections: ['hero', 'services', 'gallery', 'pricing', 'team', 'testimonials', 'contact-info'], color: 'pink', mood: 'warm', features: ['booking', 'gallery', 'pricing', 'team', 'testimonials'], images: ['beauty salon', 'spa treatment', 'cosmetics', 'skincare'] },
  event: { sections: ['hero', 'event-details', 'schedule', 'speakers', 'gallery', 'tickets', 'contact-info'], color: 'fuchsia', mood: 'bold', features: ['booking', 'gallery', 'testimonials'], images: ['event venue', 'conference stage', 'wedding decor', 'festival crowd'] },
  portfolio: { sections: ['hero', 'about', 'featured-projects', 'skills', 'testimonials', 'contact-form'], color: 'pink', mood: 'warm', features: ['gallery', 'contact-form', 'testimonials'], images: ['workspace', 'design tools', 'creative process', 'portfolio'] },
  automotive: { sections: ['hero', 'featured-vehicles', 'services', 'financing', 'testimonials', 'contact-info'], color: 'slate', mood: 'corporate', features: ['inventory', 'financing', 'booking', 'testimonials'], images: ['car dealership', 'vehicle showroom', 'auto service', 'car financing'] },
  'enterprise-software': { sections: ['hero', 'features', 'pricing-table', 'integrations', 'testimonials', 'cta', 'faq'], color: 'blue', mood: 'corporate', features: ['dashboard', 'pricing', 'integrations', 'testimonials', 'faq'], images: ['enterprise dashboard', 'business analytics', 'team collaboration', 'software platform'] },
  logistics: { sections: ['hero', 'features', 'tracking', 'pricing', 'testimonials', 'cta'], color: 'orange', mood: 'modern', features: ['tracking', 'pricing', 'testimonials'], images: ['shipping logistics', 'warehouse', 'delivery truck', 'package tracking'] },
  manufacturing: { sections: ['hero', 'features', 'production', 'quality', 'testimonials', 'cta'], color: 'slate', mood: 'corporate', features: ['production', 'quality', 'inventory', 'testimonials'], images: ['factory floor', 'production line', 'quality control', 'manufacturing'] },
  fintech: { sections: ['hero', 'features', 'pricing-table', 'security', 'testimonials', 'cta', 'faq'], color: 'emerald', mood: 'modern', features: ['payments', 'security', 'analytics', 'testimonials', 'faq'], images: ['fintech dashboard', 'payment processing', 'financial analytics', 'secure banking'] },
  proptech: { sections: ['hero', 'features', 'properties', 'pricing', 'testimonials', 'cta'], color: 'blue', mood: 'modern', features: ['property-management', 'tenant-portal', 'maintenance', 'testimonials'], images: ['property management', 'smart building', 'tenant portal', 'real estate tech'] },
};

// ============================================================================
// MAIN FUNCTION - Now consumes BusinessKnowledge
// ============================================================================

/**
 * Detect domain from BusinessKnowledge.
 *
 * This function now CONSUMES BusinessKnowledge instead of performing its own
 * industry detection. The Business Intelligence layer is the single source of truth.
 *
 * @param businessKnowledge - Upstream BusinessKnowledge from Business Intelligence
 * @param prompt - Original user prompt (for mood detection only)
 * @returns DomainContext derived from BusinessKnowledge
 */
export function detectDomain(
  businessKnowledge: BusinessKnowledge,
  prompt: string
): DomainContext {
  const lower = prompt.toLowerCase();

  // CONSUME industry from BusinessKnowledge (single source of truth)
  const industry = businessKnowledge.discovery.industry;
  const subIndustry = businessKnowledge.discovery.subIndustry ?? '';

  // Get domain mapping for this industry
  const domain = INDUSTRY_DOMAIN_MAP[industry] ?? INDUSTRY_DOMAIN_MAP['saas']!;

  // Detect mood from prompt (this is the only place we still use the prompt directly)
  let mood: DomainContext['mood'] = domain.mood;
  let moodScore = 0;
  for (const [m, mKws] of Object.entries(MOOD_KEYWORDS)) {
    let s = 0;
    for (const kw of mKws) {
      if (lower.includes(kw)) s++;
    }
    if (s > moodScore) {
      moodScore = s;
      mood = m as DomainContext['mood'];
    }
  }

  // CONSUME features from BusinessKnowledge workflows
  const features = businessKnowledge.workflows.map(w => w.kind);

  // CONSUME content keywords from BusinessKnowledge vocabulary
  const contentKeywords = Object.keys(businessKnowledge.vocabulary.terms);

  return {
    industry,
    subIndustry,
    mood,
    features: features.length > 0 ? features : domain.features,
    contentKeywords: contentKeywords.length > 0 ? contentKeywords : [],
    suggestedSections: domain.sections,
    colorHint: domain.color,
    imageKeywords: domain.images,
  };
}

/**
 * @deprecated Use detectDomain(businessKnowledge, prompt) instead.
 * This function is kept for backward compatibility only.
 * It will be removed in a future version.
 */
/**
 * Construct a minimal BusinessKnowledge for backward-compatible detection when
 * no full BRE v2 knowledge is available. Industry is intentionally 'general' —
 * real industry routing must come from a resolved BRE v2 pattern, not from this
 * keyword heuristic.
 */
export function buildMinimalBusinessKnowledge(prompt: string): BusinessKnowledge {
  const minimalBK: BusinessKnowledge = {
    version: '1.0.0',
    sources: [],
    discovery: {
      intent: 'deprecated',
      businessType: 'business',
      industry: 'general',
      subIndustry: undefined,
      domain: 'general',
      signals: [],
    },
    customerPersonas: [],
    businessPersonas: [],
    userRoles: [],
    entities: [],
    workflows: [],
    customerJourney: { stages: [], loops: [] },
    revenue: { model: 'unknown', source: 'unknown', pricing: { structure: 'flat' }, payment: { methods: [], steps: [], considerations: [] }, currency: 'USD' },
    acquisition: [],
    retention: { strategy: 'none', mechanisms: [] },
    compliance: [],
    kpis: [],
    relationships: [],
    pages: [],
    dashboards: [],
    automations: [],
    integrations: [],
    vocabulary: { terms: {}, domainNouns: [], tone: [] },
    contentStrategy: { pillars: [], formats: [], cadence: '', voice: '' },
    designStrategy: { direction: 'modern', density: 'balanced', emphasis: [] },
    experienceGoals: { arc: [], interactionDensity: 'moderate', motionLanguage: [], perStage: {} },
    intents: { experience: ['editorial'], interaction: [], motion: ['balanced'], conversion: ['lead-form'], emotional: ['trust'], content: ['storytelling'] },
  };

  return minimalBK;
}

/**
 * @deprecated Use detectDomain(businessKnowledge, prompt) instead.
 * Thin backward-compat shim — delegates to detectDomain with a minimal BK.
 */
export function detectDomainFromPrompt(prompt: string): DomainContext {
  return detectDomain(buildMinimalBusinessKnowledge(prompt), prompt);
}
