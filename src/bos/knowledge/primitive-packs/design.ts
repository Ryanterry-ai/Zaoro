// ─── Design Primitive Packs ────────────────────────────────────────
// Maps the canonical DesignProfiles to industry contexts. A build composes
// exactly one design primitive (selected by industry) unless overridden.

import { DESIGN_PROFILES } from '../registry.js';
import { PrimitivePack, primitivePackId } from './types.js';

// Rough industry → design profile targeting (additive; extend as needed).
const DESIGN_INDUSTRY_MAP: Record<string, string[]> = {
  'enterprise-clean': ['enterprise-erp', 'hrm', 'crm', 'logistics', 'manufacturing', 'saas'],
  'healthcare-clean': ['healthcare', 'hospital', 'dental', 'pharmacy'],
  'ecommerce-modern': ['ecommerce', 'retail', 'luxury'],
  'fintech-secure': ['fintech', 'banking', 'insurance'],
  'realestate-premium': ['realestate'],
  'restaurant-warm': ['restaurant', 'food'],
  'fitness-energetic': ['fitness', 'gym'],
  'education-friendly': ['education', 'school'],
  'legal-trust': ['legal', 'law'],
  'agency-bold': ['agency', 'creative'],
  'media-content': ['media', 'blog'],
  'nonprofit-warm': ['nonprofit', 'charity'],
  'travel-vibrant': ['travel', 'tourism'],
  'luxury-dark-opulence': ['luxury', 'perfume', 'premium'],
  'saas-modern': ['saas', 'software'],
};

export const DESIGN_PRIMITIVE_PACKS: PrimitivePack[] = DESIGN_PROFILES.map(dp => {
  const targetIndustries = Object.entries(DESIGN_INDUSTRY_MAP).find(([k]) => k === dp.id)?.[1] ?? [];
  const keywords = [dp.id, ...(dp.brandPersonality ?? [])].map(s => s.toLowerCase());
  return {
    id: primitivePackId('design', dp.id),
    dimension: 'design' as const,
    name: dp.name,
    description: `Design primitive pack: ${dp.name}`,
    keywords,
    design: { personality: dp.name } as PrimitivePack['design'],
    providesCapabilities: ['design:' + dp.id],
    source: dp,
    appliesTo: (ctx: { industry?: string }) => {
      const ind = ctx.industry;
      if (!ind) return false;
      return targetIndustries.some(t => ind === t || ind.includes(t)) ||
        keywords.some(k => ind.includes(k));
    },
  };
});

export function getDesignPrimitivePackForIndustry(industry: string): PrimitivePack | undefined {
  return DESIGN_PRIMITIVE_PACKS.find(p => p.appliesTo?.({ industry })) ?? DESIGN_PRIMITIVE_PACKS[0];
}
