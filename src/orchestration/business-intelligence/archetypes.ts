/**
 * Archetypes — business-type composition from primitive signals.
 *
 * This is the ONLY place business "shapes" are named. Each archetype is a
 * CONSTRAINT OVER PRIMITIVES, not a template with entities/copy/components.
 * Because the labels are composed from primitives + the user's own domain noun,
 * the engine can distinguish:
 *   Cafe · Roastery · Subscription Coffee · Wholesale Coffee · Coffee Marketplace
 * without any hardcoded "coffee" template.
 *
 * New business shapes plug in here as primitive constraints — no vertical code
 * anywhere else in the engine.
 */

import type { BusinessDiscovery, DiscoveredSignal } from './types.js';
import { signalValues, hasSignal, signalWeight, extractDomainNouns } from './dimensions.js';

interface Shape {
  base: string;            // archetype label, e.g. "Cafe"
  subIndustry: string;     // coarse slug
  when: (s: DiscoveredSignal[], p: string) => boolean;
  priority: number;        // higher wins on ties
  /**
   * The product-nature value(s) this shape is built on. When several shapes
   * match, the one whose gating nature is STRONGEST in the prompt wins first,
   * so "a SaaS product platform" resolves to SaaS (software 3×) not Online
   * Store (physical-good 1× via "product"). Empty = nature-neutral.
   */
  natures?: string[];
}

const SHAPES: Shape[] = [
  // Beverage / food service
  { base: 'Roastery', subIndustry: 'roastery', priority: 90, natures: ['beverage'],
    when: (s) => hasSignal(s, 'product-nature', 'beverage') && hasSignal(s, 'monetization', 'wholesale') },
  { base: 'Cafe', subIndustry: 'cafe', priority: 70, natures: ['beverage'],
    when: (s) => hasSignal(s, 'product-nature', 'beverage') && (hasSignal(s, 'fulfillment', 'dine-in') || hasSignal(s, 'fulfillment', 'takeaway')) },
  { base: 'Restaurant', subIndustry: 'restaurant', priority: 70, natures: ['food'],
    when: (s) => hasSignal(s, 'product-nature', 'food') && hasSignal(s, 'fulfillment', 'dine-in') },
  { base: 'Quick-Service', subIndustry: 'qsr', priority: 60, natures: ['food', 'beverage'],
    when: (s) => (hasSignal(s, 'product-nature', 'food') || hasSignal(s, 'product-nature', 'beverage')) && hasSignal(s, 'fulfillment', 'takeaway') && !hasSignal(s, 'fulfillment', 'dine-in') },

  // Services
  { base: 'Clinic', subIndustry: 'clinic', priority: 75, natures: ['service'],
    when: (s, p) => hasSignal(s, 'product-nature', 'service') && /clinic|dentist|doctor|therapy|dental|health/.test(p.toLowerCase()) && hasSignal(s, 'fulfillment', 'appointment') },
  { base: 'Booking Service', subIndustry: 'booking-service', priority: 65, natures: ['service'],
    when: (s) => hasSignal(s, 'product-nature', 'service') && hasSignal(s, 'fulfillment', 'appointment') },
  { base: 'Service Business', subIndustry: 'service', priority: 50, natures: ['service'],
    when: (s) => hasSignal(s, 'product-nature', 'service') },

  // Retail
  { base: 'Online Store', subIndustry: 'online-store', priority: 60, natures: ['physical-good', 'digital-good'],
    when: (s) => (hasSignal(s, 'product-nature', 'physical-good') || hasSignal(s, 'product-nature', 'digital-good')) && hasSignal(s, 'channel', 'online') },
  { base: 'Retail Store', subIndustry: 'retail', priority: 55, natures: ['physical-good'],
    when: (s) => hasSignal(s, 'product-nature', 'physical-good') && hasSignal(s, 'channel', 'physical') },

  // Software
  { base: 'Internal Tool', subIndustry: 'internal-tool', priority: 80, natures: ['software'],
    when: (s) => hasSignal(s, 'audience', 'internal') },
  { base: 'B2B Platform', subIndustry: 'b2b-platform', priority: 65, natures: ['software'],
    when: (s) => hasSignal(s, 'product-nature', 'software') && hasSignal(s, 'audience', 'b2b') },
  { base: 'SaaS', subIndustry: 'saas', priority: 55, natures: ['software'],
    when: (s) => hasSignal(s, 'product-nature', 'software') },

  // Media
  { base: 'Streaming Service', subIndustry: 'streaming', priority: 60, natures: ['media-stream'],
    when: (s) => hasSignal(s, 'product-nature', 'media-stream') },
  { base: 'Media Publication', subIndustry: 'media', priority: 55, natures: ['content'],
    when: (s) => hasSignal(s, 'product-nature', 'content') },

  // Education
  { base: 'Course Platform', subIndustry: 'course-platform', priority: 62, natures: ['course'],
    when: (s) => hasSignal(s, 'product-nature', 'course') },

  // Listings / marketplace-of-things
  { base: 'Listings Marketplace', subIndustry: 'listings', priority: 62, natures: ['listing'],
    when: (s) => hasSignal(s, 'product-nature', 'listing') },
];

const BASE_BY_PRODUCT_NATURE: Record<string, { base: string; subIndustry: string }> = {
  beverage: { base: 'Cafe', subIndustry: 'cafe' },
  food: { base: 'Restaurant', subIndustry: 'restaurant' },
  'physical-good': { base: 'Store', subIndustry: 'retail' },
  'digital-good': { base: 'Store', subIndustry: 'retail' },
  service: { base: 'Service', subIndustry: 'service' },
  software: { base: 'Platform', subIndustry: 'platform' },
  content: { base: 'Publication', subIndustry: 'media' },
  'media-stream': { base: 'Streaming Service', subIndustry: 'streaming' },
  course: { base: 'Course Platform', subIndustry: 'course-platform' },
  listing: { base: 'Listings Marketplace', subIndustry: 'listings' },
};

function industryFromSignals(s: DiscoveredSignal[]): string {
  if (hasSignal(s, 'product-nature', 'beverage') || hasSignal(s, 'product-nature', 'food')) return 'food-and-beverage';
  if (hasSignal(s, 'product-nature', 'physical-good') || hasSignal(s, 'product-nature', 'digital-good')) return 'retail';
  if (hasSignal(s, 'product-nature', 'course')) return 'education';
  if (hasSignal(s, 'product-nature', 'listing')) return 'marketplace';
  if (hasSignal(s, 'product-nature', 'software')) return 'software';
  if (hasSignal(s, 'product-nature', 'service')) return 'services';
  if (hasSignal(s, 'product-nature', 'media-stream') || hasSignal(s, 'product-nature', 'content')) return 'media';
  return 'general';
}

function domainFromSignals(s: DiscoveredSignal[]): string {
  const map: Record<string, string> = {
    beverage: 'beverages', food: 'food', 'physical-good': 'retail-goods',
    'digital-good': 'digital-products', course: 'education', listing: 'listings',
    software: 'software', service: 'professional-services',
    'media-stream': 'streaming-media', content: 'media',
  };
  for (const [k, v] of Object.entries(map)) {
    if (hasSignal(s, 'product-nature', k)) return v;
  }
  return 'general';
}

/**
 * Strength of a shape = the max match-weight among its gating product-natures.
 * Nature-neutral shapes (e.g. Internal Tool, gated on audience) return 0 here
 * and fall back to pure priority ordering, preserving prior behaviour.
 */
function shapeNatureStrength(sh: Shape, s: DiscoveredSignal[]): number {
  if (!sh.natures || sh.natures.length === 0) return 0;
  return Math.max(...sh.natures.map((n) => signalWeight(s, 'product-nature', n)));
}

function pickShape(s: DiscoveredSignal[], prompt: string): Shape {
  const matches = SHAPES.filter((sh) => sh.when(s, prompt));
  if (matches.length > 0) {
    // Prefer the shape whose gating product-nature the prompt expresses most
    // strongly; break ties on priority. This disambiguates overloaded words
    // (a "SaaS product platform" is software 3× vs physical-good 1×) without
    // any vertical-specific branching.
    return matches.sort((a, b) => {
      const sa = shapeNatureStrength(a, s);
      const sb = shapeNatureStrength(b, s);
      if (sb !== sa) return sb - sa;
      return b.priority - a.priority;
    })[0]!;
  }
  // No specialised shape matched — derive a base label from product-nature so
  // a plain "coffee website" still resolves to a Cafe rather than "Business".
  const pn = signalValues(s, 'product-nature')[0];
  const base = (pn && BASE_BY_PRODUCT_NATURE[pn]) || { base: 'Business', subIndustry: 'general' };
  return { base: base.base, subIndustry: base.subIndustry, priority: 0, when: () => true };
}

// Descriptive qualifiers that legitimately appear as domain nouns but read
// poorly as the HEAD noun of a business-type label ("commercial Business",
// "residential Store", "advisory Firm"). They describe the subject rather than
// name it, so we skip them when choosing the label head-noun — while leaving
// them in the domain-noun set for content generation. This is a closed
// adjective list, NOT a vertical enumeration: no new vertical needs an edit.
const QUALIFIER_ADJECTIVES = new Set<string>([
  'commercial', 'residential', 'industrial', 'corporate', 'personal', 'private',
  'public', 'local', 'global', 'national', 'international', 'regional',
  'advisory', 'boutique', 'independent', 'professional', 'general', 'specialty',
  'premium', 'luxury', 'affordable', 'organic', 'natural', 'small', 'large',
  'seasonal', 'fresh', 'healthy', 'secure', 'smart', 'modern', 'traditional',
  'custom', 'bespoke', 'exclusive', 'family', 'wholesale', 'retail',
  'on-demand', 'real-time', 'high-net-worth', 'full-service', 'end-to-end',
]);

/**
 * Choose the subject noun that best NAMES the business, preferring a concrete
 * noun over a leading descriptive qualifier. Falls back to the first noun when
 * every candidate is a qualifier (so we never return empty).
 */
function pickSubjectNoun(nouns: string[]): string | undefined {
  const subject = nouns.find((n) => !QUALIFIER_ADJECTIVES.has(n.toLowerCase()));
  return subject ?? nouns[0];
}

function qualityPrefix(s: DiscoveredSignal[]): string {
  if (hasSignal(s, 'quality', 'luxury')) return 'Luxury';
  if (hasSignal(s, 'quality', 'specialty')) return 'Specialty';
  if (hasSignal(s, 'quality', 'budget')) return 'Value';
  return '';
}

function nicheFromSignals(s: DiscoveredSignal[]): string | undefined {
  if (hasSignal(s, 'monetization', 'marketplace')) return 'marketplace';
  if (hasSignal(s, 'monetization', 'subscription')) return 'subscription';
  if (hasSignal(s, 'monetization', 'wholesale')) return 'wholesale';
  if (hasSignal(s, 'audience', 'b2b') && hasSignal(s, 'audience', 'internal')) return 'enterprise';
  return undefined;
}

export function composeDiscovery(prompt: string, signals: DiscoveredSignal[]): BusinessDiscovery {
  const shape = pickShape(signals, prompt);
  const domainNouns = extractDomainNouns(prompt);
  const quality = qualityPrefix(signals);
  const niche = nicheFromSignals(signals);

  // Compose the business-type label from primitives + the user's own SUBJECT
  // noun (skipping leading descriptive qualifiers so we get "Recycling Service"
  // not "Commercial Business").
  let subjectNoun = pickSubjectNoun(domainNouns);
  // Drop the subject noun when the shape base already contains it (or a stem of
  // it) so we never produce "streaming Streaming Service" or "cafe Cafe".
  if (subjectNoun) {
    const baseLower = shape.base.toLowerCase();
    const sn = subjectNoun.toLowerCase();
    if (baseLower.includes(sn) || sn.includes(baseLower.split(' ')[0]!)) {
      subjectNoun = undefined;
    }
  }
  const parts: string[] = [];
  if (quality) parts.push(quality);
  if (subjectNoun) parts.push(subjectNoun);
  parts.push(shape.base);
  const businessType = parts.join(' ').replace(/\s+/g, ' ').trim();

  const intent = composeIntent(prompt, signals, businessType, subjectNoun ? [subjectNoun, ...domainNouns] : domainNouns);

  return {
    intent,
    businessType,
    industry: industryFromSignals(signals),
    subIndustry: shape.subIndustry,
    niche,
    domain: domainFromSignals(signals),
    signals,
  };
}

// Map a coarse goal signal to a natural verb phrase for readable intent copy.
const GOAL_PHRASE: Record<string, string> = {
  'sell-products': 'sell products online',
  'sell-services': 'offer expert services',
  'generate-leads': 'connect with new clients',
  'share-content': 'share its story and work',
  'build-community': 'bring a community together',
  'manage-internally': 'streamline daily operations',
};

function composeIntent(prompt: string, s: DiscoveredSignal[], businessType: string, nouns: string[]): string {
  const goals = signalValues(s, 'goal');
  const subject = nouns[0];
  // A natural, human-readable intent line — NOT a robotic "aimed at:" dump.
  // This value can surface directly as hero subtitle copy, so it must read well.
  const phrases = goals.map((g) => GOAL_PHRASE[g]).filter(Boolean);
  const goalClause = phrases.length
    ? phrases.slice(0, 2).join(' and ')
    : 'serve its customers with care';
  // Only add "built around X" when the subject noun is NOT already the head of
  // the business-type label (avoids "recycling business built around recycling").
  const subjectClause =
    subject && !businessType.toLowerCase().includes(subject.toLowerCase())
      ? ` built around ${subject}`
      : '';
  const article = /^[aeiou]/i.test(businessType) ? 'An' : 'A';
  return `${article} ${businessType.toLowerCase()}${subjectClause}, crafted to ${goalClause}.`;
}
