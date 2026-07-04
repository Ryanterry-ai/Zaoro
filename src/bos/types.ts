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
