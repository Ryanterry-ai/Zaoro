// ─── Business Operating System (BOS) Types ───────────────────────────
// Defines the schema for industry-specific business definitions
// Used by the Research Swarm and Content Scraper to fetch real data

import type { BusinessIntelligenceProfile } from './schemas/knowledge/business-intelligence.schema.js';

/**
 * Reference source for scraping real content from competitor/reference sites
 */
export interface ReferenceSource {
  /** URLs to scrape content from (ordered by priority) */
  urls: string[];
  /** CSS selectors for extracting specific content pieces */
  selectors: Record<string, string>;
  /** Optional: specific pages to target (e.g., /about, /pricing) */
  targetPages?: string[];
}

/**
 * Vocabulary overrides for semantic adaptation
 * Maps generic terms to industry-specific terminology
 */
export interface VocabularyOverrides {
  [genericTerm: string]: string;
}

/**
 * Workflow definition for a specific business type
 */
export interface BusinessWorkflow {
  name: string;
  steps: string[];
  revenue_impact: string;
}

/**
 * Complete Business Operating System entry for an industry
 */
export interface BOSEntry {
  /** Unique identifier: industry.subIndustry (e.g., 'healthcare.dental') */
  id: string;
  
  /** Primary industry category */
  industry: string;
  
  /** Specific sub-industry (e.g., 'Dental Clinic') */
  subIndustry: string;
  
  /** Brief description of this business type */
  description: string;
  
  /** Capabilities/features this business type needs */
  capabilities: string[];
  
  /** Reference sources for scraping real content */
  references?: ReferenceSource;
  
  /** Vocabulary overrides for domain adaptation */
  vocabularyOverrides?: VocabularyOverrides;
  
  /** Key workflows this business type uses */
  workflows?: BusinessWorkflow[];
  
  /** Required data entities (for DB schema generation) */
  entities?: string[];
  
  /** Revenue model keywords */
  revenueModel?: string[];

  /** Deep revenue intelligence profile — how this business makes money */
  revenueIntelligence?: BusinessIntelligenceProfile;

  /** Compliance/legal requirements */
  compliance?: string[];
  
  /** Priority for semantic clustering (lower = higher priority) */
  priority?: number;
  
  /** Tags for fuzzy matching */
  tags?: string[];
}

/**
 * Result of a BOS lookup
 */
export interface BOSLookupResult {
  /** The matched BOS entry */
  entry: BOSEntry;
  
  /** Match type: exact, semantic, or fallback */
  matchType: 'exact' | 'semantic' | 'fallback';
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Source of the match */
  source: string;
}

/**
 * Scraped content from a reference site
 */
export interface ScrapedContent {
  /** Main headline from hero section */
  heroHeadline: string;
  
  /** About/story text */
  aboutText: string;
  
  /** Contact address */
  contactAddress: string;
  
  /** Product/service specifications */
  productSpecs: string[];
  
  /** Pricing information */
  prices: Array<{ name: string; price: string; description?: string }>;
  
  /** Team members */
  teamMembers: Array<{ name: string; role: string; bio?: string }>;
  
  /** Testimonials */
  testimonials: Array<{ text: string; author: string; role?: string }>;
  
  /** Raw HTML of key sections (for structural cloning) */
  sectionHtml?: Record<string, string>;
  
  /** Source URL this content was scraped from */
  sourceUrl: string;
  
  /** Timestamp of when this content was scraped */
  scrapedAt: number;
}

/**
 * Business Research — the intelligence gathered by analyzing the user's prompt
 * and researching real businesses in the industry/domain.
 *
 * @deprecated Use `BusinessKnowledge` from `orchestration/business-intelligence/types.ts` instead.
 * BusinessResearch is a legacy flat model with no per-field confidence, provenance, or source metadata.
 * BusinessKnowledge is the canonical, vertically-agnostic, provenance-aware representation.
 *
 * Migration guide:
 * - `businessType` → `BusinessKnowledge.discovery.businessType`
 * - `industry` → `BusinessKnowledge.discovery.industry`
 * - `subIndustry` → `BusinessKnowledge.discovery.subIndustry`
 * - `userPersonas` → `BusinessKnowledge.customerPersonas`
 * - `customerFlow` → `BusinessKnowledge.customerJourney`
 * - `revenueFlow` → `BusinessKnowledge.revenue`
 * - `kpis` → `BusinessKnowledge.kpis`
 * - `vocabulary` → `BusinessKnowledge.vocabulary`
 * - `realProducts` → `BusinessKnowledge.entities` (via adapter)
 * - `realTestimonials` → Content Intelligence output
 * - `scrapedContent` → `EvidenceCollection` via Knowledge Acquisition
 *
 * Use `orchestration/business-intelligence/adapters.ts` to bridge to legacy consumers.
 */
export interface BusinessResearch {
  /** What the business is (e.g., "ecommerce supplement store") */
  businessType: string;

  /** Industry (e.g., "ecommerce") */
  industry: string;

  /** Sub-industry (e.g., "supplement-store") */
  subIndustry: string;

  /** Domain context (e.g., "health-fitness") */
  domain: string;

  /** Who are the customers? (e.g., "gym enthusiasts, fitness beginners, athletes") */
  userPersonas: string[];

  /** What do customers do on the site? (e.g., "browse supplements, compare prices, read reviews") */
  customerFlow: string[];

  /** How does the business make money? (e.g., "product sales, bundles, subscriptions") */
  revenueFlow: string[];

  /** How do customers pay? (e.g., "UPI, credit card, COD, EMI") */
  paymentMethods: string[];

  /** Internal business operations (e.g., "inventory management, order processing, supplier coordination") */
  businessWorkflow: string[];

  /** Key metrics the business tracks (e.g., "daily orders, revenue, top sellers, stock levels") */
  kpis: string[];

  /** What vocabulary does this industry use? (e.g., "product" → "supplement", "customer" → "member") */
  vocabulary: Record<string, string>;

  /** Real competitor/reference URLs discovered during research */
  referenceUrls: string[];

  /** Real product data scraped from reference sites */
  realProducts: Array<{ name: string; price: string; description?: string }>;

  /** Real testimonials from reference sites */
  realTestimonials: Array<{ text: string; author: string; role?: string }>;

  /** Raw scraped content from reference sites */
  scrapedContent?: ScrapedContent;
}

/**
 * Research bundle from the Research Swarm
 */
export interface ResearchBundle {
  /** Scraped business content */
  scrapedContent: ScrapedContent | null;
  
  /** Visual assets (images, icons) */
  assets: Array<{ url: string; purpose: string; width?: number; height?: number }>;
  
  /** Layout patterns from competitor analysis */
  layoutPatterns: Array<{ type: string; html: string; source: string }>;
  
  /** Revenue-boosting features identified */
  revenueFeatures: Array<{ feature: string; priority: string; reason: string }>;
  
  /** Animation configs from motion analysis */
  animations: Array<{ type: string; config: string; source: string }>;
}
