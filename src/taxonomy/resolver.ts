/**
 * Knowledge Pack Resolver
 * ========================
 *
 * Bridges the taxonomy/pack system to the build pipeline.
 * Takes a prompt, classifies the business, finds the matching knowledge pack,
 * and merges pack data into the pipeline's existing types.
 *
 * Features:
 * - Multi-signal classification (alias, keyword, generic)
 * - Confidence scoring with multiple factors
 * - Pack synthesis for unknown industries
 * - Conflict resolution for ambiguous prompts
 * - Backward-compatible derived fields
 */

import type {
  TaxonomyPath,
  BusinessClassification,
  ClassificationEvidence,
  KnowledgePack,
} from './types.js';
import { DEFAULT_TAXONOMY } from './default-taxonomy.js';
import {
  getPackByPath,
  getAllPacks,
} from './pack-registry.js';
import {
  calculateConfidence,
  extractConfidenceFactors,
  extractPromptEvidence,
  synthesizePack,
  resolveConflicts,
} from './dynamic-resolution.js';
import { deriveLegacyIndustry } from './types.js';
import { capabilityRegistry, type CapabilityId } from '../bos/capabilities/index.js';

// ─── Classification Result ──────────────────────────────────────────────────

export interface ClassificationResult {
  /** The full multi-dimensional classification */
  classification: BusinessClassification;
  /** The matched knowledge pack (if any) */
  pack: KnowledgePack | null;
  /** Confidence that the pack match is correct (0..1) */
  matchConfidence: number;
  /** How the pack was matched */
  matchMethod: 'exact-path' | 'alias' | 'keyword' | 'fuzzy' | 'synthesized' | 'none';
  /** All evidence signals used for classification */
  evidence: ClassificationEvidence[];
  /** Whether the pack was synthesized (no built-in match) */
  synthesized: boolean;
}

// ─── Prompt Classifier ──────────────────────────────────────────────────────

interface ClassifiedResult {
  path: TaxonomyPath;
  confidence: number;
  evidence: ClassificationEvidence[];
  matchMethod: 'alias' | 'keyword' | 'generic';
  isFallback: boolean;
}

/**
 * Classify a business prompt into a taxonomy path.
 *
 * Uses a multi-signal approach:
 * 1. Check if prompt contains known pack aliases (highest confidence)
 * 2. Check if prompt contains known detection keywords
 * 3. Fall back to generic business model detection
 */
function classifyPrompt(prompt: string): ClassifiedResult {
  const lower = prompt.toLowerCase();
  const evidence: ClassificationEvidence[] = [];

  // 1. Check pack aliases (highest confidence — exact user intent)
  const packs = getAllPacks();
  for (const pack of packs) {
    for (const alias of pack.aliases) {
      if (lower.includes(alias.toLowerCase())) {
        evidence.push({
          dimension: 'keyword',
          value: alias,
          weight: 0.9,
          source: 'pack-alias',
        });
        return {
          path: pack.taxonomyPath,
          confidence: 0.95,
          evidence,
          matchMethod: 'alias',
          isFallback: false,
        };
      }
    }
  }

  // 2. Check detection keywords (medium confidence)
  for (const pack of packs) {
    for (const keyword of pack.detectionKeywords) {
      if (lower.includes(keyword.toLowerCase())) {
        evidence.push({
          dimension: 'keyword',
          value: keyword,
          weight: 0.7,
          source: 'detection-keyword',
        });
        return {
          path: pack.taxonomyPath,
          confidence: 0.8,
          evidence,
          matchMethod: 'keyword',
          isFallback: false,
        };
      }
    }
  }

  // 3. Generic detection from prompt patterns
  const genericResult = detectGenericIndustry(lower);
  evidence.push(...genericResult.evidence);

  return {
    path: genericResult.path,
    confidence: genericResult.confidence,
    evidence,
    matchMethod: 'generic',
    isFallback: genericResult.confidence < 0.5,
  };
}

/**
 * Generic industry detection from prompt patterns.
 * Used as a fallback when no pack alias/keyword matches.
 */
function detectGenericIndustry(lower: string): {
  path: TaxonomyPath;
  confidence: number;
  evidence: ClassificationEvidence[];
} {
  const evidence: ClassificationEvidence[] = [];

  // Food & Beverage
  if (lower.includes('restaurant') || lower.includes('cafe') || lower.includes('coffee shop') || lower.includes('bakery') || lower.includes('dining')) {
    evidence.push({ dimension: 'product-nature', value: 'food-service', weight: 0.8, source: 'generic-detection' });
    return { path: 'food-and-beverage/restaurant', confidence: 0.7, evidence };
  }

  // Healthcare
  if (lower.includes('clinic') || lower.includes('hospital') || lower.includes('doctor') || lower.includes('dental') || lower.includes('medical')) {
    evidence.push({ dimension: 'product-nature', value: 'healthcare', weight: 0.8, source: 'generic-detection' });
    const path = lower.includes('dental') ? 'services/healthcare/dental' : 'services/healthcare';
    return { path, confidence: 0.7, evidence };
  }

  // Legal
  if (lower.includes('law') || lower.includes('legal') || lower.includes('attorney')) {
    evidence.push({ dimension: 'product-nature', value: 'legal', weight: 0.8, source: 'generic-detection' });
    return { path: 'services/legal', confidence: 0.7, evidence };
  }

  // Real Estate
  if (lower.includes('real estate') || lower.includes('property') || lower.includes('realt') || lower.includes('listing')) {
    evidence.push({ dimension: 'product-nature', value: 'real-estate', weight: 0.8, source: 'generic-detection' });
    return { path: 'services/real-estate', confidence: 0.7, evidence };
  }

  // Fitness
  if (lower.includes('gym') || lower.includes('fitness') || lower.includes('workout') || lower.includes('crossfit') || lower.includes('yoga')) {
    evidence.push({ dimension: 'product-nature', value: 'fitness', weight: 0.8, source: 'generic-detection' });
    const path = lower.includes('yoga') ? 'services/fitness/yoga' :
                 lower.includes('crossfit') ? 'services/fitness/crossfit' :
                 'services/fitness';
    return { path, confidence: 0.7, evidence };
  }

  // Education
  if (lower.includes('school') || lower.includes('course') || lower.includes('learn') || lower.includes('tutor') || lower.includes('coaching')) {
    evidence.push({ dimension: 'product-nature', value: 'education', weight: 0.8, source: 'generic-detection' });
    return { path: 'education', confidence: 0.6, evidence };
  }

  // Beauty
  if (lower.includes('salon') || lower.includes('beauty') || lower.includes('spa') || lower.includes('skincare')) {
    evidence.push({ dimension: 'product-nature', value: 'beauty', weight: 0.8, source: 'generic-detection' });
    const path = lower.includes('spa') ? 'services/beauty/spa' :
                 lower.includes('salon') ? 'services/beauty/salon' :
                 'services/beauty';
    return { path, confidence: 0.7, evidence };
  }

  // Portfolio
  if (lower.includes('portfolio') || lower.includes('personal site') || lower.includes('showcase')) {
    evidence.push({ dimension: 'product-nature', value: 'portfolio', weight: 0.8, source: 'generic-detection' });
    return { path: 'creative/portfolio', confidence: 0.7, evidence };
  }

  // SaaS (default for software)
  if (lower.includes('saas') || lower.includes('dashboard') || lower.includes('analytics') || lower.includes('crm') || lower.includes('erp')) {
    evidence.push({ dimension: 'product-nature', value: 'saas', weight: 0.8, source: 'generic-detection' });
    return { path: 'software/saas', confidence: 0.6, evidence };
  }

  // FinTech
  if (lower.includes('fintech') || lower.includes('banking') || lower.includes('payment') || lower.includes('crypto') || lower.includes('insurance')) {
    evidence.push({ dimension: 'product-nature', value: 'fintech', weight: 0.8, source: 'generic-detection' });
    return { path: 'software/fintech', confidence: 0.6, evidence };
  }

  // Retail / E-commerce (broad fallback for shop/store/product)
  if (lower.includes('shop') || lower.includes('store') || lower.includes('ecommerce') || lower.includes('e-commerce') || lower.includes('product') || lower.includes('cart')) {
    evidence.push({ dimension: 'product-nature', value: 'retail', weight: 0.7, source: 'generic-detection' });
    return { path: 'retail', confidence: 0.5, evidence };
  }

  // Default: generic services
  evidence.push({ dimension: 'product-nature', value: 'unknown', weight: 0.3, source: 'generic-detection' });
  return { path: 'services', confidence: 0.3, evidence };
}

// ─── Business Model Detection ───────────────────────────────────────────────

/**
 * Detect the PRIMARY business model from prompt keywords.
 *
 * Returns a canonical `bm.<id>`-style primary slug that aligns with the
 * `BUSINESS_MODELS` registry in `src/bos/knowledge/registry.ts`. Detection is
 * keyword-driven and intentionally broad; the canonical registry is the source
 * of truth for model metadata, influences, and compatibility. This is a
 * first-class orthogonal dimension — independent of vertical and audience.
 */
function detectBusinessModel(prompt: string): {
  primary: string;
  confidence: number;
} {
  const lower = prompt.toLowerCase();

  if (lower.includes('subscription box') || lower.includes('monthly box') || lower.includes('curated box')) {
    return { primary: 'subscription-box', confidence: 0.85 };
  }
  if (lower.includes('subscription') || lower.includes('monthly plan') || lower.includes('membership')) {
    return { primary: 'subscription', confidence: 0.8 };
  }
  if (lower.includes('marketplace') || lower.includes('multi-vendor') || lower.includes('two-sided')) {
    return { primary: 'marketplace', confidence: 0.75 };
  }
  if (lower.includes('booking') || lower.includes('appointment') || lower.includes('reservation') || lower.includes('schedule a viewing')) {
    return { primary: 'service-booking', confidence: 0.8 };
  }
  if (lower.includes('donation') || lower.includes('charity') || lower.includes('nonprofit') || lower.includes('contribute')) {
    return { primary: 'donation', confidence: 0.85 };
  }
  if (lower.includes('freemium') || lower.includes('free tier') || lower.includes('free plan')) {
    return { primary: 'freemium', confidence: 0.75 };
  }
  if (lower.includes('free trial') || lower.includes('14-day') || lower.includes('try free')) {
    return { primary: 'free-trial', confidence: 0.8 };
  }
  if (lower.includes('wholesale') || lower.includes('bulk') || lower.includes('distributor') || lower.includes('reseller')) {
    return { primary: 'wholesale', confidence: 0.75 };
  }
  if (lower.includes('on-demand') || lower.includes('instant') || lower.includes('same-day') || lower.includes('request a courier')) {
    return { primary: 'onsite', confidence: 0.8 };
  }
  if (lower.includes('usage-based') || lower.includes('pay-as-you-go') || lower.includes('metered') || lower.includes('per-use')) {
    return { primary: 'usage-based', confidence: 0.8 };
  }
  if (lower.includes('permit') || lower.includes('license application') || lower.includes('civic') || lower.includes('government')) {
    return { primary: 'govt-permit', confidence: 0.8 };
  }
  if (lower.includes('crowdfunding') || lower.includes('backers') || lower.includes('pledge')) {
    return { primary: 'crowdfunding', confidence: 0.8 };
  }
  if (lower.includes('affiliate') || lower.includes('referral link') || lower.includes('partner program')) {
    return { primary: 'affiliate', confidence: 0.75 };
  }
  if (lower.includes('franchise') || lower.includes('own a branch') || lower.includes('licensing the brand')) {
    return { primary: 'franchise', confidence: 0.8 };
  }
  if (lower.includes('event') || lower.includes('ticket') || lower.includes('conference') || lower.includes('rsvp')) {
    return { primary: 'event-ticketing', confidence: 0.8 };
  }
  if (lower.includes('agent') && (lower.includes('builder') || lower.includes('platform') || lower.includes('deploy'))) {
    return { primary: 'agent-builder', confidence: 0.8 };
  }
  if (lower.includes('saas') || lower.includes('software platform') || lower.includes('dashboard preview')) {
    return { primary: 'saas', confidence: 0.8 };
  }
  if (lower.includes('d2c') || lower.includes('direct to consumer') || lower.includes('direct-to-consumer')) {
    return { primary: 'd2c', confidence: 0.8 };
  }
  if (lower.includes('b2b') || lower.includes('business to business') || lower.includes('enterprise clients')) {
    return { primary: 'b2b', confidence: 0.8 };
  }
  if (lower.includes('agency') || lower.includes('retainer') || lower.includes('studio')) {
    return { primary: 'agency', confidence: 0.8 };
  }
  if (lower.includes('consulting') || lower.includes('advisory') || lower.includes('consultation')) {
    return { primary: 'consulting', confidence: 0.8 };
  }
  if (lower.includes('advertising') || lower.includes('ad space') || lower.includes('sponsored')) {
    return { primary: 'advertising', confidence: 0.8 };
  }
  if (lower.includes('lead') || lower.includes('quote request') || lower.includes('inquiry')) {
    return { primary: 'lead-gen', confidence: 0.7 };
  }
  if (lower.includes('listing fee') || lower.includes('featured listing') || lower.includes('placement')) {
    return { primary: 'placement-fee', confidence: 0.75 };
  }

  // Default: direct-sales (one-time purchase, direct to buyer)
  return { primary: 'direct-sales', confidence: 0.5 };
}

// ─── Maturity Detection ────────────────────────────────────────────────────

function detectMaturity(prompt: string): {
  level: string;
  confidence: number;
} {
  const lower = prompt.toLowerCase();

  if (lower.includes('enterprise') || lower.includes('corporate') || lower.includes('large-scale')) {
    return { level: 'enterprise', confidence: 0.7 };
  }
  if (lower.includes('startup') || lower.includes('early-stage') || lower.includes('mvp')) {
    return { level: 'startup', confidence: 0.7 };
  }
  if (lower.includes('personal') || lower.includes('freelance') || lower.includes('solo')) {
    return { level: 'personal', confidence: 0.7 };
  }
  if (lower.includes('nonprofit') || lower.includes('charity') || lower.includes('foundation')) {
    return { level: 'nonprofit', confidence: 0.8 };
  }

  // Default: SMB
  return { level: 'smb', confidence: 0.5 };
}

// ─── Audience Detection ─────────────────────────────────────────────────────

function detectAudience(prompt: string): {
  scope: string;
  confidence: number;
} {
  const lower = prompt.toLowerCase();

  if (lower.includes('b2b') || lower.includes('business to business') || lower.includes('enterprise')) {
    return { scope: 'b2b', confidence: 0.8 };
  }
  if (lower.includes('b2c') || lower.includes('consumer') || lower.includes('direct to consumer')) {
    return { scope: 'b2c', confidence: 0.7 };
  }
  if (lower.includes('internal') || lower.includes('intranet') || lower.includes('employee')) {
    return { scope: 'internal', confidence: 0.8 };
  }
  if (lower.includes('government') || lower.includes('public sector') || lower.includes('municipal')) {
    return { scope: 'government', confidence: 0.8 };
  }

  // Default: B2C
  return { scope: 'b2c', confidence: 0.4 };
}

// ─── Main Resolution Function ───────────────────────────────────────────────

/**
 * Resolve a prompt into a full classification with knowledge pack.
 *
 * This is the main entry point for the taxonomy system.
 * Call this early in the pipeline to get all industry-specific data.
 *
 * @param prompt - The user's build prompt
 * @param options - Resolution options
 * @returns ClassificationResult with classification, pack, and confidence
 *
 * @example
 * ```ts
 * const result = resolveKnowledgePack("Build me a premium sneaker store for runners");
 * console.log(result.classification.vertical.path); // "retail/footwear"
 * console.log(result.pack?.copy.heroHeading); // "Bold Footwear..."
 * console.log(result.matchConfidence); // 0.95
 * ```
 */
export function resolveKnowledgePack(
  prompt: string,
  options?: {
    /** If true, synthesize a pack when no built-in match is found */
    synthesizeIfMissing?: boolean;
    /** If true, log classification details */
    verbose?: boolean;
  },
): ClassificationResult {
  const synthesize = options?.synthesizeIfMissing ?? true;

  // 1. Extract prompt evidence for richer classification
  const promptEvidence = extractPromptEvidence(prompt);

  // 2. Classify the prompt
  const classified = classifyPrompt(prompt);

  // 3. Find the matching knowledge pack
  let pack: KnowledgePack | null = null;
  let matchConfidence = 0;
  let matchMethod: ClassificationResult['matchMethod'] = 'none';
  let synthesized = false;

  // Try exact path match first
  const exactPack = getPackByPath(classified.path);
  if (exactPack) {
    pack = exactPack;
    matchConfidence = classified.confidence;
    matchMethod = classified.matchMethod === 'alias' ? 'alias' : 'exact-path';
  }

  // Try parent path (e.g., "retail/footwear/athletic" → "retail/footwear")
  if (!pack) {
    const segments = classified.path.split('/');
    for (let i = segments.length - 1; i >= 1; i--) {
      const parentPath = segments.slice(0, i).join('/');
      const parentPack = getPackByPath(parentPath);
      if (parentPack) {
        pack = parentPack;
        matchConfidence = classified.confidence * 0.9; // Slightly lower for parent match
        matchMethod = 'fuzzy';
        break;
      }
    }
  }

  // 4. Synthesize a pack if no built-in match and synthesis is enabled
  if (!pack && synthesize) {
    pack = synthesizePack(classified.path, promptEvidence, prompt);
    synthesized = true;
    matchConfidence = classified.confidence * 0.7; // Lower confidence for synthesized
    matchMethod = 'synthesized';
  }

  // 5. Calculate proper confidence score
  const factors = extractConfidenceFactors(
    classified.evidence,
    pack !== null,
    matchMethod === 'exact-path' || matchMethod === 'alias',
    classified.isFallback,
  );
  matchConfidence = calculateConfidence(factors);

  // 6. Build the classification
  const verticalSegments = classified.path.split('/');
  const industry = verticalSegments[0] || 'other';
  const subIndustry = verticalSegments.length > 1 ? verticalSegments.slice(1).join('-') : '';
  const domain = verticalSegments.length > 1 ? verticalSegments[1] : verticalSegments[0];

  const businessModel = detectBusinessModel(prompt);
  const maturity = detectMaturity(prompt);
  const audience = detectAudience(prompt);

  const classification: BusinessClassification = {
    version: '1.0.0',
    vertical: {
      path: classified.path,
      confidence: classified.confidence,
      evidence: classified.evidence,
    },
    businessModel: {
      primary: businessModel.primary,
      confidence: businessModel.confidence,
    },
    maturity: {
      level: maturity.level,
      confidence: maturity.confidence,
    },
    audience: {
      scope: audience.scope,
      confidence: audience.confidence,
    },
    // Backward-compatible derived fields
    industry,
    subIndustry,
    domain,
    legacyIndustry: deriveLegacyIndustry(classified.path),
  };

  return {
    classification,
    pack,
    matchConfidence,
    matchMethod,
    evidence: classified.evidence,
    synthesized,
  };
}

// ─── Convenience Functions ──────────────────────────────────────────────────

/**
 * Get just the knowledge pack for a prompt (no classification details).
 * Useful when you only need the pack data.
 */
export function getPackForPrompt(prompt: string): KnowledgePack | null {
  return resolveKnowledgePack(prompt).pack;
}

/**
 * Get just the classification for a prompt (no pack data).
 * Useful when you only need the taxonomy path.
 */
export function classifyPromptOnly(prompt: string): BusinessClassification {
  return resolveKnowledgePack(prompt, { synthesizeIfMissing: false }).classification;
}

/**
 * Check if a prompt will get a built-in pack (vs. synthesized).
 */
export function hasBuiltInPack(prompt: string): boolean {
  const result = resolveKnowledgePack(prompt, { synthesizeIfMissing: false });
  return result.pack !== null;
}

/**
 * Bridge (Phase R2): map a resolved knowledge pack's legacy aliases/keywords to
 * CANONICAL capability ids through the registry. This lets the legacy taxonomy
 * participate in the canonical pipeline (components, evaluation, experience,
 * learning) without rewriting classification. Returns de-duplicated canonical ids.
 */
export function packCanonicalCapabilities(pack: KnowledgePack | null): CapabilityId[] {
  if (!pack) return [];
  const raw = [...pack.aliases, ...pack.detectionKeywords];
  const out = new Set<CapabilityId>();
  for (const tag of raw) {
    const norm = capabilityRegistry.normalize(tag);
    if (norm) out.add(norm);
  }
  return Array.from(out);
}
