// ─── BOS Registry ─────────────────────────────────────────────────────
// Central registry for industry-specific business definitions
// Supports exact match, semantic clustering, and fallback lookup

import { BOSEntry, BOSLookupResult } from './types.js';

/**
 * In-memory registry of all BOS entries
 * Populated on import from entries/ directory
 */
const ENTRIES: BOSEntry[] = [];

/**
 * BOS Registry - Central lookup for industry definitions
 */
export class BOSRegistry {
  
  /**
   * Register a BOS entry
   */
  static register(entry: BOSEntry): void {
    ENTRIES.push(entry);
  }
  
  /**
   * Find an exact match for Industry + SubIndustry
   */
  static findExact(industry: string, subIndustry?: string): BOSLookupResult | null {
    const normalizedIndustry = industry.toLowerCase().trim();
    const normalizedSubIndustry = subIndustry?.toLowerCase().trim();
    
    const entry = ENTRIES.find(e => {
      const industryMatch = e.industry.toLowerCase() === normalizedIndustry;
      const subIndustryMatch = !normalizedSubIndustry || 
                               e.subIndustry.toLowerCase().includes(normalizedSubIndustry) ||
                               normalizedSubIndustry.includes(e.subIndustry.toLowerCase());
      return industryMatch && subIndustryMatch;
    });
    
    if (entry) {
      return {
        entry,
        matchType: 'exact',
        confidence: 1.0,
        source: `BOS Registry: ${entry.id}`
      };
    }
    
    return null;
  }
  
  /**
   * Find the nearest neighbor using semantic clustering
   * Uses keyword matching and tag overlap for MVP
   */
  static findNearest(industry: string, subIndustry?: string): BOSLookupResult | null {
    const queryTerms = [
      ...industry.toLowerCase().split(/\s+/),
      ...(subIndustry?.toLowerCase().split(/\s+/) || [])
    ];
    
    let bestMatch: BOSEntry | null = null;
    let bestScore = 0;
    
    for (const entry of ENTRIES) {
      const entryTerms = [
        ...entry.industry.toLowerCase().split(/\s+/),
        ...entry.subIndustry.toLowerCase().split(/\s+/),
        ...(entry.tags || []).map(t => t.toLowerCase())
      ];
      
      // Calculate overlap score
      let score = 0;
      for (const term of queryTerms) {
        for (const entryTerm of entryTerms) {
          if (entryTerm.includes(term) || term.includes(entryTerm)) {
            score += 1;
          }
        }
      }
      
      // Normalize by query length
      const normalizedScore = score / queryTerms.length;
      
      if (normalizedScore > bestScore) {
        bestScore = normalizedScore;
        bestMatch = entry;
      }
    }
    
    if (bestMatch && bestScore > 0.3) {
      return {
        entry: bestMatch,
        matchType: 'semantic',
        confidence: Math.min(bestScore, 0.9),
        source: `Semantic match: ${bestMatch.id} (score: ${bestScore.toFixed(2)})`
      };
    }
    
    return null;
  }
  
  /**
   * Smart lookup: tries exact first, then semantic, then returns null
   */
  static lookup(industry: string, subIndustry?: string): BOSLookupResult | null {
    // Try exact match first
    const exact = this.findExact(industry, subIndustry);
    if (exact) return exact;
    
    // Try semantic clustering
    const semantic = this.findNearest(industry, subIndustry);
    if (semantic) return semantic;
    
    // No match found
    return null;
  }
  
  /**
   * Get all registered entries (for debugging/admin)
   */
  static getAll(): BOSEntry[] {
    return [...ENTRIES];
  }
  
  /**
   * Get entry count
   */
  static count(): number {
    return ENTRIES.length;
  }
  
  /**
   * Filter entries by industry
   */
  static findByIndustry(industry: string): BOSEntry[] {
    return ENTRIES.filter(e => 
      e.industry.toLowerCase() === industry.toLowerCase()
    );
  }
  
  /**
   * Filter entries by capability
   */
  static findByCapability(capability: string): BOSEntry[] {
    return ENTRIES.filter(e => 
      e.capabilities.includes(capability)
    );
  }
}

// Auto-load all entries on import
export async function loadAllEntries(): Promise<void> {
  const entryModules = [
    () => import('./entries/saas.js'),
    () => import('./entries/ecommerce.js'),
    () => import('./entries/healthcare-dental.js'),
    () => import('./entries/restaurant.js'),
    () => import('./entries/real-estate.js'),
    () => import('./entries/luxury-retail.js'),
  ];
  
  for (const loadModule of entryModules) {
    try {
      await loadModule();
    } catch (err) {
      console.warn('[BOS] Failed to load entry:', err);
    }
  }
  
  console.log(`[BOS] Loaded ${BOSRegistry.count()} industry entries`);
}
