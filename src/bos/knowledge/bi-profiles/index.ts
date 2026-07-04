/**
 * Business Intelligence Profiles — Complete Registry
 *
 * Every industry domain has a matching BI profile that captures
 * HOW the business makes money, not just what it looks like.
 *
 * The generation engine uses these to:
 *   - Generate domain-specific dashboard components
 *   - Wire revenue-aware content into pages
 *   - Create KPI tracking widgets
 *   - Build churn prevention automations
 *   - Create industry-specific lead capture mechanisms
 */

import { FITNESS_GYM_BI } from './fitness-gym.js';
import { HOSPITALITY_RESTAURANT_BI } from './hospitality-restaurant.js';
import { SAAS_BI } from './saas.js';
import { ECOMMERCE_BI } from './ecommerce.js';
import { HEALTHCARE_DENTAL_BI } from './healthcare-dental.js';
import { HEALTHCARE_GENERAL_BI } from './healthcare-general.js';
import { LEGAL_BI } from './legal.js';
import { AGENCY_BI } from './agency.js';
import { EDUCATION_BI } from './education.js';
import { REAL_ESTATE_BI } from './real-estate.js';
import { FINTECH_BI } from './fintech.js';
import { NONPROFIT_BI } from './nonprofit.js';
import { TRAVEL_BI } from './travel.js';
import { BEAUTY_BI } from './beauty.js';
import { AUTOMOTIVE_BI } from './automotive.js';
import { EVENT_BI } from './event.js';
import { MEDIA_BI } from './media.js';
import { MANUFACTURING_BI } from './manufacturing.js';
import { LOGISTICS_BI } from './logistics.js';
import { PROPTECH_BI } from './proptech.js';
import { ENTERPRISE_SOFTWARE_BI } from './enterprise-software.js';
import { PORTFOLIO_BI } from './portfolio.js';
import { LUXURY_RETAIL_BI } from './luxury-retail.js';
import { SUPPLEMENT_MARKETPLACE_BI } from './supplement-marketplace.js';
import type { BusinessIntelligenceProfile } from '../../schemas/knowledge/business-intelligence.schema.js';

const biProfileMap = new Map<string, BusinessIntelligenceProfile>();

// Register all 24 profiles
const ALL_PROFILES: BusinessIntelligenceProfile[] = [
  FITNESS_GYM_BI,
  HOSPITALITY_RESTAURANT_BI,
  SAAS_BI,
  ECOMMERCE_BI,
  HEALTHCARE_DENTAL_BI,
  HEALTHCARE_GENERAL_BI,
  LEGAL_BI,
  AGENCY_BI,
  EDUCATION_BI,
  REAL_ESTATE_BI,
  FINTECH_BI,
  NONPROFIT_BI,
  TRAVEL_BI,
  BEAUTY_BI,
  AUTOMOTIVE_BI,
  EVENT_BI,
  MEDIA_BI,
  MANUFACTURING_BI,
  LOGISTICS_BI,
  PROPTECH_BI,
  ENTERPRISE_SOFTWARE_BI,
  PORTFOLIO_BI,
  LUXURY_RETAIL_BI,
  SUPPLEMENT_MARKETPLACE_BI,
];

for (const profile of ALL_PROFILES) {
  biProfileMap.set(profile.id, profile);
}

/**
 * Get a BI profile by industry + sub-industry
 * @param industry e.g. "fitness", "hospitality", "saas"
 * @param subIndustry e.g. "gym", "restaurant", "dental"
 */
export function getBIProfile(industry: string, subIndustry?: string): BusinessIntelligenceProfile | undefined {
  const normalizedIndustry = industry.toLowerCase();
  const normalizedSub = subIndustry?.toLowerCase().replace(/[^a-z0-9]/g, '-');

  // Try industry.subIndustry first (e.g., bi.healthcare.dental)
  if (normalizedSub) {
    const key = `bi.${normalizedIndustry}.${normalizedSub}`;
    const profile = biProfileMap.get(key);
    if (profile) return profile;
  }

  // Try industry with partial subIndustry match
  if (normalizedSub) {
    for (const [key, profile] of biProfileMap) {
      const subPart = key.split('.')[2];
      if (key.startsWith(`bi.${normalizedIndustry}.`) && subPart && normalizedSub.includes(subPart)) {
        return profile;
      }
    }
  }

  // Try industry-only (first match)
  for (const [key, profile] of biProfileMap) {
    if (key.startsWith(`bi.${normalizedIndustry}.`)) {
      return profile;
    }
  }

  // Try partial industry match
  for (const [key, profile] of biProfileMap) {
    if (key.includes(normalizedIndustry)) {
      return profile;
    }
  }

  return undefined;
}

/**
 * Get all registered BI profiles
 */
export function getAllBIProfiles(): BusinessIntelligenceProfile[] {
  return Array.from(biProfileMap.values());
}

/**
 * Register a new BI profile
 */
export function registerBIProfile(profile: BusinessIntelligenceProfile): void {
  biProfileMap.set(profile.id, profile);
}

/**
 * Get BI profile count for diagnostics
 */
export function getBIProfileCount(): number {
  return biProfileMap.size;
}

export {
  FITNESS_GYM_BI,
  HOSPITALITY_RESTAURANT_BI,
  SAAS_BI,
  ECOMMERCE_BI,
  HEALTHCARE_DENTAL_BI,
  HEALTHCARE_GENERAL_BI,
  LEGAL_BI,
  AGENCY_BI,
  EDUCATION_BI,
  REAL_ESTATE_BI,
  FINTECH_BI,
  NONPROFIT_BI,
  TRAVEL_BI,
  BEAUTY_BI,
  AUTOMOTIVE_BI,
  EVENT_BI,
  MEDIA_BI,
  MANUFACTURING_BI,
  LOGISTICS_BI,
  PROPTECH_BI,
  ENTERPRISE_SOFTWARE_BI,
  PORTFOLIO_BI,
  LUXURY_RETAIL_BI,
  SUPPLEMENT_MARKETPLACE_BI,
};
