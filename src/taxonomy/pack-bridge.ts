/**
 * Industry Pack Bridge
 * =====================
 *
 * Provides backward-compatible APIs that existing code uses,
 * but reads from knowledge packs instead of hardcoded registries.
 *
 * This is the "migration bridge" — existing code calls these functions
 * exactly as before, but the data comes from packs instead of switch statements.
 *
 * Usage:
 *   // Before (hardcoded):
 *   import { getIndustryCopy } from './industry-copy-schema.js';
 *   const copy = getIndustryCopy('ecommerce');
 *
 *   // After (pack-based):
 *   import { getIndustryCopyFromPack } from './pack-bridge.js';
 *   const copy = getIndustryCopyFromPack('ecommerce', 'retail');
 */

import type { KnowledgePack, KnowledgePackCopy, KnowledgePackDesign, KnowledgePackDomainData, KnowledgePackExperience, KnowledgePackVisual } from './types.js';
import { getPackByPath, getAllPacks } from './pack-registry.js';
import { deriveLegacyIndustry } from './types.js';

// ─── Pack Lookup Helpers ────────────────────────────────────────────────────

/**
 * Find a pack by any industry string (legacy or taxonomy path).
 * Tries taxonomy path first, then searches by legacy industry match.
 */
function findPackForIndustry(industry: string, subIndustry?: string): KnowledgePack | null {
  // Try as taxonomy path directly
  const directPack = getPackByPath(industry);
  if (directPack) return directPack;

  // Try building a path from industry + subIndustry
  if (subIndustry) {
    const builtPath = subIndustry.includes('/') ? subIndustry : `${industry}/${subIndustry}`;
    const builtPack = getPackByPath(builtPath);
    if (builtPack) return builtPack;
  }

  // Search all packs for legacy industry match
  const packs = getAllPacks();
  for (const pack of packs) {
    if (deriveLegacyIndustry(pack.taxonomyPath) === industry) {
      return pack;
    }
  }

  return null;
}

// ─── Copy Bridge ────────────────────────────────────────────────────────────

/**
 * Get industry-specific copy from a knowledge pack.
 * Drop-in replacement for `getIndustryCopy()` from industry-copy-schema.ts.
 */
export function getIndustryCopyFromPack(
  industry: string,
  subIndustry?: string,
): KnowledgePackCopy {
  const pack = findPackForIndustry(industry, subIndustry);

  if (pack) {
    return pack.copy;
  }

  // Fallback: return generic copy (never return undefined)
  return GENERIC_COPY;
}

/**
 * Generic fallback copy — used when no pack matches.
 */
const GENERIC_COPY: KnowledgePackCopy = {
  heroHeading: '{appName} — Your Trusted Partner',
  heroSubheading: 'We deliver quality solutions tailored to your needs. Discover what makes us different.',
  heroPrimaryButton: 'Get Started',
  heroSecondaryButton: 'Learn More',
  heroTrustBadges: ['Quality Guaranteed', 'Fast Delivery', 'Expert Support'],
  heroImageKeywords: ['business', 'professional', 'team'],
  featuresHeading: 'Why Choose Us',
  featuresSubheading: 'Quality solutions for your needs',
  features: [
    { icon: 'Star', title: 'Quality', description: 'Premium quality products and services' },
    { icon: 'Shield', title: 'Trust', description: 'Trusted by thousands of customers' },
    { icon: 'Zap', title: 'Speed', description: 'Fast delivery and response times' },
    { icon: 'Heart', title: 'Care', description: 'Dedicated customer support' },
    { icon: 'Target', title: 'Focus', description: 'Tailored to your specific needs' },
    { icon: 'RefreshCw', title: 'Flexibility', description: 'Flexible options and plans' },
  ],
  testimonialsHeading: 'What Our Customers Say',
  testimonialsSubheading: 'Real reviews from satisfied customers',
  testimonials: [
    { text: 'Excellent service and quality. Highly recommended!', author: 'Happy Customer', role: 'Client', company: '' },
    { text: 'Professional team with great attention to detail.', author: 'Satisfied User', role: 'Customer', company: '' },
    { text: 'Outstanding experience from start to finish.', author: 'Valued Client', role: 'Partner', company: '' },
  ],
  ctaHeading: 'Ready to Get Started?',
  ctaPrimaryButton: 'Contact Us',
  ctaTrustLine: 'Satisfaction guaranteed',
  stats: [
    { value: '500+', label: 'Happy Customers' },
    { value: '4.9/5', label: 'Rating' },
    { value: '24/7', label: 'Support' },
    { value: '100%', label: 'Satisfaction' },
  ],
  forbiddenPhrases: ['buy now', 'limited time offer', 'act fast'],
};

// ─── Design Bridge ──────────────────────────────────────────────────────────

export interface DesignProfile {
  personality: string;
  colorHint: string;
  radiusScale: string;
  density: string;
  mood: string[];
  typography: {
    headingFont: string;
    bodyFont: string;
    headingWeight: string;
    bodyWeight: string;
  };
  visual: KnowledgePackVisual;
}

/**
 * Get design profile from a knowledge pack.
 * Drop-in replacement for hardcoded design registries in design-dna.ts.
 */
export function getDesignProfileFromPack(
  industry: string,
  subIndustry?: string,
): DesignProfile | null {
  const pack = findPackForIndustry(industry, subIndustry);

  if (pack) {
    return {
      personality: pack.design.personality,
      colorHint: pack.design.colorHint,
      radiusScale: pack.design.radiusScale,
      density: pack.design.density,
      mood: pack.design.mood,
      typography: pack.design.typography,
      visual: pack.visual,
    };
  }

  return null;
}

// ─── Domain Data Bridge ─────────────────────────────────────────────────────

/**
 * Get domain mock data from a knowledge pack.
 * Drop-in replacement for `getDomainData()` from domain-data.ts.
 */
export function getDomainDataFromPack(
  industry: string,
  subIndustry?: string,
): KnowledgePackDomainData | null {
  const pack = findPackForIndustry(industry, subIndustry);

  if (pack) {
    return pack.domainData;
  }

  return null;
}

// ─── Experience Bridge ──────────────────────────────────────────────────────

/**
 * Get experience profile from a knowledge pack.
 * Drop-in replacement for hardcoded experience profiles.
 */
export function getExperienceFromPack(
  industry: string,
  subIndustry?: string,
): KnowledgePackExperience | null {
  const pack = findPackForIndustry(industry, subIndustry);

  if (pack) {
    return pack.experience;
  }

  return null;
}

// ─── Vocabulary Bridge ──────────────────────────────────────────────────────

/**
 * Get vocabulary overrides from a knowledge pack.
 * Drop-in replacement for hardcoded vocabulary maps.
 */
export function getVocabularyFromPack(
  industry: string,
  subIndustry?: string,
): Record<string, string> {
  const pack = findPackForIndustry(industry, subIndustry);

  if (pack) {
    return pack.vocabulary;
  }

  return {};
}

// ─── Pages & Features Bridge ────────────────────────────────────────────────

/**
 * Get required pages from a knowledge pack.
 * Drop-in replacement for hardcoded page lists in orchestrator.ts.
 */
export function getPagesFromPack(
  industry: string,
  subIndustry?: string,
): Array<{ path: string; purpose: string; workflows: string[] }> {
  const pack = findPackForIndustry(industry, subIndustry);

  if (pack) {
    return pack.pages;
  }

  // Fallback: generic pages
  return [
    { path: '/', purpose: 'Homepage', workflows: [] },
    { path: '/about', purpose: 'About', workflows: [] },
    { path: '/contact', purpose: 'Contact', workflows: [] },
  ];
}

/**
 * Get recommended features from a knowledge pack.
 * Drop-in replacement for hardcoded feature lists.
 */
export function getFeaturesFromPack(
  industry: string,
  subIndustry?: string,
): Array<{ icon: string; title: string; description: string; priority: string }> {
  const pack = findPackForIndustry(industry, subIndustry);

  if (pack) {
    return pack.features;
  }

  // Fallback: generic features
  return [
    { icon: 'Star', title: 'Quality', description: 'Premium quality', priority: 'essential' },
    { icon: 'Shield', title: 'Trust', description: 'Trusted service', priority: 'essential' },
  ];
}

// ─── Workflows Bridge ───────────────────────────────────────────────────────

/**
 * Get workflows from a knowledge pack.
 * Drop-in replacement for hardcoded workflow detection.
 */
export function getWorkflowsFromPack(
  industry: string,
  subIndustry?: string,
): Array<{ name: string; steps: string[]; revenueImpact: string }> {
  const pack = findPackForIndustry(industry, subIndustry);

  if (pack) {
    return pack.workflows;
  }

  return [];
}

// ─── Entities Bridge ────────────────────────────────────────────────────────

/**
 * Get data entities from a knowledge pack.
 * Drop-in replacement for hardcoded entity detection.
 */
export function getEntitiesFromPack(
  industry: string,
  subIndustry?: string,
): Array<{ name: string; archetype: string; fields: string[]; relationships: string[] }> {
  const pack = findPackForIndustry(industry, subIndustry);

  if (pack) {
    return pack.entities;
  }

  return [];
}

// ─── Compliance Bridge ──────────────────────────────────────────────────────

/**
 * Get compliance requirements from a knowledge pack.
 * Drop-in replacement for hardcoded compliance detection.
 */
export function getComplianceFromPack(
  industry: string,
  subIndustry?: string,
): Array<{ id: string; name: string; required: boolean; checklist: string[] }> {
  const pack = findPackForIndustry(industry, subIndustry);

  if (pack) {
    return pack.compliance;
  }

  return [];
}

// ─── KPIs Bridge ────────────────────────────────────────────────────────────

/**
 * Get KPIs from a knowledge pack.
 * Drop-in replacement for hardcoded KPI detection.
 */
export function getKPIsFromPack(
  industry: string,
  subIndustry?: string,
): string[] {
  const pack = findPackForIndustry(industry, subIndustry);

  if (pack) {
    return pack.kpis;
  }

  return [];
}

// ─── Hero & CTA Bridge ─────────────────────────────────────────────────────

/**
 * Get hero section from a knowledge pack.
 */
export function getHeroFromPack(
  industry: string,
  subIndustry?: string,
): KnowledgePack['hero'] | null {
  const pack = findPackForIndustry(industry, subIndustry);
  return pack?.hero ?? null;
}

/**
 * Get CTA section from a knowledge pack.
 */
export function getCTAFromPack(
  industry: string,
  subIndustry?: string,
): KnowledgePack['cta'] | null {
  const pack = findPackForIndustry(industry, subIndustry);
  return pack?.cta ?? null;
}

/**
 * Get footer from a knowledge pack.
 */
export function getFooterFromPack(
  industry: string,
  subIndustry?: string,
): KnowledgePack['footer'] | null {
  const pack = findPackForIndustry(industry, subIndustry);
  return pack?.footer ?? null;
}
