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
import { signalValues, hasSignal, extractDomainNouns } from './dimensions.js';

interface Shape {
  base: string;            // archetype label, e.g. "Cafe"
  subIndustry: string;     // coarse slug
  when: (s: DiscoveredSignal[], p: string) => boolean;
  priority: number;        // higher wins on ties
}

const SHAPES: Shape[] = [
  // Beverage / food service
  { base: 'Roastery', subIndustry: 'roastery', priority: 90,
    when: (s) => hasSignal(s, 'product-nature', 'beverage') && hasSignal(s, 'monetization', 'wholesale') },
  { base: 'Cafe', subIndustry: 'cafe', priority: 70,
    when: (s) => hasSignal(s, 'product-nature', 'beverage') && (hasSignal(s, 'fulfillment', 'dine-in') || hasSignal(s, 'fulfillment', 'takeaway')) },
  { base: 'Restaurant', subIndustry: 'restaurant', priority: 70,
    when: (s) => hasSignal(s, 'product-nature', 'food') && hasSignal(s, 'fulfillment', 'dine-in') },
  { base: 'Quick-Service', subIndustry: 'qsr', priority: 60,
    when: (s) => (hasSignal(s, 'product-nature', 'food') || hasSignal(s, 'product-nature', 'beverage')) && hasSignal(s, 'fulfillment', 'takeaway') && !hasSignal(s, 'fulfillment', 'dine-in') },

  // Services
  { base: 'Clinic', subIndustry: 'clinic', priority: 75,
    when: (s, p) => hasSignal(s, 'product-nature', 'service') && /clinic|dentist|doctor|therapy|dental|health/.test(p.toLowerCase()) && hasSignal(s, 'fulfillment', 'appointment') },
  { base: 'Booking Service', subIndustry: 'booking-service', priority: 65,
    when: (s) => hasSignal(s, 'product-nature', 'service') && hasSignal(s, 'fulfillment', 'appointment') },
  { base: 'Service Business', subIndustry: 'service', priority: 50,
    when: (s) => hasSignal(s, 'product-nature', 'service') },

  // Retail
  { base: 'Online Store', subIndustry: 'online-store', priority: 60,
    when: (s) => (hasSignal(s, 'product-nature', 'physical-good') || hasSignal(s, 'product-nature', 'digital-good')) && hasSignal(s, 'channel', 'online') },
  { base: 'Retail Store', subIndustry: 'retail', priority: 55,
    when: (s) => hasSignal(s, 'product-nature', 'physical-good') && hasSignal(s, 'channel', 'physical') },

  // Software
  { base: 'Internal Tool', subIndustry: 'internal-tool', priority: 80,
    when: (s) => hasSignal(s, 'audience', 'internal') },
  { base: 'B2B Platform', subIndustry: 'b2b-platform', priority: 65,
    when: (s) => hasSignal(s, 'product-nature', 'software') && hasSignal(s, 'audience', 'b2b') },
  { base: 'SaaS', subIndustry: 'saas', priority: 55,
    when: (s) => hasSignal(s, 'product-nature', 'software') },

  // Media
  { base: 'Media Publication', subIndustry: 'media', priority: 55,
    when: (s) => hasSignal(s, 'product-nature', 'content') },
];

const BASE_BY_PRODUCT_NATURE: Record<string, { base: string; subIndustry: string }> = {
  beverage: { base: 'Cafe', subIndustry: 'cafe' },
  food: { base: 'Restaurant', subIndustry: 'restaurant' },
  'physical-good': { base: 'Store', subIndustry: 'retail' },
  'digital-good': { base: 'Store', subIndustry: 'retail' },
  service: { base: 'Service', subIndustry: 'service' },
  software: { base: 'Platform', subIndustry: 'platform' },
  content: { base: 'Publication', subIndustry: 'media' },
};

function industryFromSignals(s: DiscoveredSignal[]): string {
  if (hasSignal(s, 'product-nature', 'beverage') || hasSignal(s, 'product-nature', 'food')) return 'food-and-beverage';
  if (hasSignal(s, 'product-nature', 'physical-good') || hasSignal(s, 'product-nature', 'digital-good')) return 'retail';
  if (hasSignal(s, 'product-nature', 'service')) return 'services';
  if (hasSignal(s, 'product-nature', 'software')) return 'software';
  if (hasSignal(s, 'product-nature', 'content')) return 'media';
  return 'general';
}

function domainFromSignals(s: DiscoveredSignal[]): string {
  const map: Record<string, string> = {
    beverage: 'beverages', food: 'food', 'physical-good': 'retail-goods',
    'digital-good': 'digital-products', service: 'professional-services',
    software: 'software', content: 'media',
  };
  for (const [k, v] of Object.entries(map)) {
    if (hasSignal(s, 'product-nature', k)) return v;
  }
  return 'general';
}

function pickShape(s: DiscoveredSignal[], prompt: string): Shape {
  const matches = SHAPES.filter((sh) => sh.when(s, prompt));
  if (matches.length > 0) {
    return matches.sort((a, b) => b.priority - a.priority)[0]!;
  }
  // No specialised shape matched — derive a base label from product-nature so
  // a plain "coffee website" still resolves to a Cafe rather than "Business".
  const pn = signalValues(s, 'product-nature')[0];
  const base = (pn && BASE_BY_PRODUCT_NATURE[pn]) || { base: 'Business', subIndustry: 'general' };
  return { base: base.base, subIndustry: base.subIndustry, priority: 0, when: () => true };
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

  // Compose the business-type label from primitives + the user's own noun.
  const parts: string[] = [];
  if (quality) parts.push(quality);
  if (domainNouns.length > 0) parts.push(domainNouns[0]!);
  parts.push(shape.base);
  const businessType = parts.join(' ').replace(/\s+/g, ' ').trim();

  const intent = composeIntent(prompt, signals, businessType, domainNouns);

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

function composeIntent(prompt: string, s: DiscoveredSignal[], businessType: string, nouns: string[]): string {
  const goals = signalValues(s, 'goal');
  const locale = signalValues(s, 'locale');
  const localeLabel = locale.includes('IN') ? 'India' : locale.includes('US') ? 'the US' : locale.includes('EU') ? 'Europe' : 'their market';
  const goalText = goals.length
    ? goals.join(', ').replace(/-/g, ' ')
    : 'operate';
  const noun = nouns[0] ? ` for ${nouns[0]}` : '';
  return `A ${businessType.toLowerCase()}${noun} aimed at: ${goalText}, serving customers in ${localeLabel}.`;
}
