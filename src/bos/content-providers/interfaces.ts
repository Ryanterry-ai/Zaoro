/**
 * ContentProvider interface — pluggable content sources for the hybrid pipeline.
 *
 * Each provider contributes structured content from a specific source:
 * - BOSKnowledge: entities, workflows, compliance, terminology from BOS knowledge packs
 * - Prompt: user-provided business requirements
 * - DesignDNA: classification, design tokens, industry context
 * - ScrapedContent: external website/document/Figma data
 * - Agent: AI agent reasoning enrichment
 *
 * The content resolver aggregates all providers, merges by priority,
 * and passes the result through quality gates before rendering.
 */

import type { BusinessKnowledge } from '../../orchestration/business-intelligence/types.js';
import type { ApplicationBlueprint } from '../schemas/blueprint/application-blueprint.schema.js';
import type { ItemSpec, TierSpec, StatSpec } from '../schemas/blueprint/execution-blueprint.schema.js';

// ─── Content Types ───────────────────────────────────────────────────────────

export interface HeroContent {
  title?: string;
  subtitle?: string;
  badge?: string;
  items?: ItemSpec[];
  actions?: Array<{ label: string; action: string; style: 'link' | 'primary' | 'secondary' | 'ghost' }>;
}

export interface FeatureContent {
  title?: string;
  subtitle?: string;
  items?: ItemSpec[];
}

export interface TestimonialContent {
  items?: Array<{ name: string; role: string; quote: string }>;
}

export interface AboutContent {
  title?: string;
  description?: string;
  items?: ItemSpec[];
}

export interface TeamContent {
  items?: ItemSpec[];
}

export interface MissionContent {
  items?: ItemSpec[];
}

export interface PricingContent {
  tiers?: TierSpec[];
}

export interface StatsContent {
  items?: StatSpec[];
}

export interface CTAContent {
  title?: string;
  subtitle?: string;
  actions?: Array<{ label: string; action: string; style: 'link' | 'primary' | 'secondary' | 'ghost' }>;
}

/**
 * Unified content bag — all content a provider can contribute.
 * Every field is optional; providers contribute what they know.
 */
export interface ContentBag {
  hero?: HeroContent;
  features?: FeatureContent;
  testimonials?: TestimonialContent;
  about?: AboutContent;
  team?: TeamContent;
  mission?: MissionContent;
  pricing?: PricingContent;
  stats?: StatsContent;
  cta?: CTAContent;
  /** Products/items from domain data */
  products?: ProductContent;
  /** Raw vocabulary overrides (e.g., "product" → "dish") */
  vocabulary?: Record<string, string>;
  /** Additional metadata from the provider */
  metadata?: Record<string, unknown>;
}

export interface ProductContent {
  items: Array<{
    name: string;
    description?: string;
    price?: number;
    tag?: string;
    rating?: number;
    reviews?: number;
    emoji?: string;
    details?: string[];
    image?: string;
  }>;
}

// ─── Provider Interface ──────────────────────────────────────────────────────

export interface ContentProvider {
  /** Unique provider name (e.g., 'bos-knowledge', 'prompt', 'scraped') */
  readonly name: string;

  /**
   * Priority for content merging. Higher = takes precedence.
   * - BOSKnowledge: 10 (base knowledge)
   * - Prompt: 20 (user requirements)
   * - DesignDNA: 30 (classification context)
   * - ScrapedContent: 40 (real external data)
   * - Agent: 50 (AI enrichment — highest authority)
   */
  readonly priority: number;

  /**
   * Determine if this provider can contribute content for the given context.
   * Returns false if the provider has nothing relevant to add.
   */
  canProvide(ctx: ProviderContext): boolean;

  /**
   * Generate content for the given context.
   * Returns a partial ContentBag — only fields the provider can fill.
   */
  provide(ctx: ProviderContext): ContentBag;
}

// ─── Provider Context ────────────────────────────────────────────────────────

export interface ProviderContext {
  /** The application blueprint with entities, workflows, industry, etc. */
  blueprint: ApplicationBlueprint;
  /** Vocabulary from BRE (industry-specific term replacements) */
  vocabulary: Record<string, string>;
  /** Sub-category detected from description (e.g., 'coffee', 'wholesale') */
  subCategory?: string;
  /** Brand name extracted from prompt (e.g. 'Aura', 'MumbaiEdge') */
  appName?: string;
  /** BI profile from scraped business intelligence */
  revenueIntelligence?: import('../schemas/knowledge/business-intelligence.schema.js').BusinessIntelligenceProfile;
  /** Raw scraped content from web intelligence */
  scrapedContent?: import('../types.js').ScrapedContent;
  /** Business research — the FOUNDATION for dynamic content generation */
  businessResearch?: import('../types.js').BusinessResearch;
  /** Design DNA from classification engine */
  designDNA?: import('../../generation/design-dna.js').DesignDNA;
  /** App family classification */
  appFamily?: import('../reasoning/application-family-classifier.js').AppFamilyResult;
  /** Skill recommendations from UI/UX Pro Max, etc. */
  skillRecommendations?: import('../../generation/skill-integrator.js').DesignRecommendation;
  /** Design decision from DesignIntelligenceEngine */
  designDecision?: import('../../orchestration/design-intelligence/types.js').DesignDecision;
  /** Full BusinessKnowledge — carries the deep-read 5-question answers
   *  (RequirementsUnderstanding) that make copy specific, not generic. */
  businessKnowledge?: import('../../orchestration/business-intelligence/types.js').BusinessKnowledge;
}

// ─── Provider Registry ───────────────────────────────────────────────────────

export class ContentProviderRegistry {
  private providers: ContentProvider[] = [];

  register(provider: ContentProvider): void {
    this.providers.push(provider);
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Aggregate content from all providers.
   * Higher-priority providers override lower-priority ones.
   */
  aggregate(ctx: ProviderContext): ContentBag {
    const merged: ContentBag = {};

    for (const provider of this.providers) {
      if (!provider.canProvide(ctx)) continue;
      const contribution = provider.provide(ctx);
      mergeContentBag(merged, contribution);
}

    return merged;
  }

  /** Get all registered providers */
  getProviders(): ContentProvider[] {
    return [...this.providers];
  }
}

// ─── Merge Logic ─────────────────────────────────────────────────────────────

/**
 * Merge a contribution into the target bag.
 * Higher-priority values override lower-priority ones.
 * Arrays are concatenated (deduped by content).
 * Strings override only if non-empty.
 */
function mergeContentBag(target: ContentBag, contribution: ContentBag): void {
  if (contribution.hero) {
    target.hero = mergeHero(target.hero, contribution.hero);
  }
  if (contribution.features) {
    target.features = mergeFeatures(target.features, contribution.features);
  }
  if (contribution.testimonials) {
    target.testimonials = mergeTestimonials(target.testimonials, contribution.testimonials);
  }
  if (contribution.about) {
    target.about = mergeAbout(target.about, contribution.about);
  }
  if (contribution.team) {
    target.team = mergeTeam(target.team, contribution.team);
  }
  if (contribution.mission) {
    target.mission = mergeMission(target.mission, contribution.mission);
  }
  if (contribution.pricing) {
    target.pricing = mergePricing(target.pricing, contribution.pricing);
  }
  if (contribution.stats) {
    target.stats = mergeStats(target.stats, contribution.stats);
  }
  if (contribution.cta) {
    target.cta = mergeCTA(target.cta, contribution.cta);
  }
  if (contribution.products) {
    target.products = target.products ?? contribution.products;
  }
  if (contribution.vocabulary) {
    target.vocabulary = { ...target.vocabulary, ...contribution.vocabulary };
  }
  if (contribution.metadata) {
    target.metadata = { ...target.metadata, ...contribution.metadata };
  }
}

function mergeHero(existing: HeroContent | undefined, incoming: HeroContent): HeroContent {
  const result: HeroContent = {};
  if (incoming.title != null) result.title = incoming.title;
  else if (existing?.title != null) result.title = existing.title;
  if (incoming.subtitle != null) result.subtitle = incoming.subtitle;
  else if (existing?.subtitle != null) result.subtitle = existing.subtitle;
  if (incoming.badge != null) result.badge = incoming.badge;
  else if (existing?.badge != null) result.badge = existing.badge;
  if (incoming.items != null) result.items = incoming.items;
  else if (existing?.items != null) result.items = existing.items;
  if (incoming.actions != null) result.actions = incoming.actions;
  else if (existing?.actions != null) result.actions = existing.actions;
  return result;
}

function mergeFeatures(existing: FeatureContent | undefined, incoming: FeatureContent): FeatureContent {
  const result: FeatureContent = {};
  if (incoming.title != null) result.title = incoming.title;
  else if (existing?.title != null) result.title = existing.title;
  if (incoming.subtitle != null) result.subtitle = incoming.subtitle;
  else if (existing?.subtitle != null) result.subtitle = existing.subtitle;
  if (incoming.items != null) result.items = incoming.items;
  else if (existing?.items != null) result.items = existing.items;
  return result;
}

function mergeTestimonials(existing: TestimonialContent | undefined, incoming: TestimonialContent): TestimonialContent {
  if (incoming.items && incoming.items.length > 0) return { items: incoming.items };
  if (existing?.items) return { items: existing.items };
  return {};
}

function mergeAbout(existing: AboutContent | undefined, incoming: AboutContent): AboutContent {
  const result: AboutContent = {};
  if (incoming.title != null) result.title = incoming.title;
  else if (existing?.title != null) result.title = existing.title;
  if (incoming.description != null) result.description = incoming.description;
  else if (existing?.description != null) result.description = existing.description;
  if (incoming.items != null) result.items = incoming.items;
  else if (existing?.items != null) result.items = existing.items;
  return result;
}

function mergeTeam(existing: TeamContent | undefined, incoming: TeamContent): TeamContent {
  if (incoming.items && incoming.items.length > 0) return { items: incoming.items };
  if (existing?.items) return { items: existing.items };
  return {};
}

function mergeMission(existing: MissionContent | undefined, incoming: MissionContent): MissionContent {
  if (incoming.items && incoming.items.length > 0) return { items: incoming.items };
  if (existing?.items) return { items: existing.items };
  return {};
}

function mergePricing(existing: PricingContent | undefined, incoming: PricingContent): PricingContent {
  if (incoming.tiers && incoming.tiers.length > 0) return { tiers: incoming.tiers };
  if (existing?.tiers) return { tiers: existing.tiers };
  return {};
}

function mergeStats(existing: StatsContent | undefined, incoming: StatsContent): StatsContent {
  if (incoming.items && incoming.items.length > 0) return { items: incoming.items };
  if (existing?.items) return { items: existing.items };
  return {};
}

function mergeCTA(existing: CTAContent | undefined, incoming: CTAContent): CTAContent {
  const result: CTAContent = {};
  if (incoming.title != null) result.title = incoming.title;
  else if (existing?.title != null) result.title = existing.title;
  if (incoming.subtitle != null) result.subtitle = incoming.subtitle;
  else if (existing?.subtitle != null) result.subtitle = existing.subtitle;
  if (incoming.actions != null) result.actions = incoming.actions;
  else if (existing?.actions != null) result.actions = existing.actions;
  return result;
}
