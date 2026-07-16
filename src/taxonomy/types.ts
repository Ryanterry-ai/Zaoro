/**
 * Universal Business Taxonomy
 * ============================
 *
 * Replaces the fragile `industry` / `subIndustry` / `domain` flat strings
 * with a hierarchical, extensible classification system.
 *
 * Key design principles:
 * 1. Unlimited hierarchy — no fixed enum of industries
 * 2. Evidence-based — classification derived from signals, not keyword matching
 * 3. Backward compatible — `industry` field still works for legacy consumers
 * 4. Multi-dimensional — a business can be classified along multiple axes
 * 5. Knowledge-pack driven — new industries need only a pack, no code changes
 */

// ─── Taxonomy Path ──────────────────────────────────────────────────────────

/**
 * A slash-separated taxonomy path.
 * Examples:
 *   "retail"                          — broad vertical
 *   "retail/footwear"                 — sub-vertical
 *   "retail/footwear/athletic"        — niche
 *   "services/healthcare/dental"      — deep hierarchy
 *   "software/saas/dev-tools"         — software vertical
 *
 * Rules:
 * - Lowercase, kebab-case segments
 * - 1–5 segments (breadth before depth)
 * - No trailing slash
 */
export type TaxonomyPath = string;

// ─── Classification Dimensions ──────────────────────────────────────────────

/**
 * The vertical industry axis (what the business IS).
 * Hierarchy: vertical > sub-vertical > niche
 *
 * Examples:
 *   "retail/footwear/athletic"
 *   "services/healthcare/dental"
 *   "software/saas/analytics"
 *   "food-and-beverage/restaurant/coffee"
 */
export interface VerticalClassification {
  /** Full taxonomy path */
  path: TaxonomyPath;
  /** Confidence 0..1 that this classification is correct */
  confidence: number;
  /** Evidence signals that led to this classification */
  evidence: ClassificationEvidence[];
}

/**
 * How the business makes money (orthogonal to vertical).
 *
 * Examples:
 *   "direct-sales"
 *   "subscription"
 *   "marketplace"
 *   "service-booking"
 *   "advertising"
 *   "freemium"
 *   "donation"
 *   "hybrid"
 */
export interface BusinessModelClassification {
  primary: string;
  secondary?: string;
  confidence: number;
}

/**
 * The maturity / scale of the business (affects design density, copy tone).
 *
 * Examples:
 *   "startup"       — early-stage, growth-focused
 *   "smb"           — small-to-medium business
 *   "enterprise"    — large organization
 *   "personal"      — solo / freelancer
 *   "nonprofit"     — mission-driven
 */
export interface MaturityClassification {
  level: string;
  confidence: number;
}

/**
 * The target audience scale (affects UX patterns).
 *
 * Examples:
 *   "b2c"           — direct to consumer
 *   "b2b"           — business to business
 *   "b2b2c"         — business to business to consumer
 *   "internal"      — internal tools
 *   "government"    — public sector
 */
export interface AudienceClassification {
  scope: string;
  confidence: number;
}

// ─── Evidence ───────────────────────────────────────────────────────────────

export type EvidenceDimension =
  | 'product-nature'
  | 'channel'
  | 'fulfillment'
  | 'monetization'
  | 'audience'
  | 'goal'
  | 'quality'
  | 'locale'
  | 'keyword'
  | 'url'
  | 'scraped-content'
  | 'user-stated';

export interface ClassificationEvidence {
  dimension: EvidenceDimension;
  value: string;
  weight: number;
  source: string;
}

// ─── The Canonical Classification ───────────────────────────────────────────

/**
 * Multi-dimensional business classification.
 *
 * This is the SINGLE SOURCE OF TRUTH for what a business IS.
 * All downstream engines (content, design, experience, renderer) read
 * from this instead of raw `industry` strings.
 */
export interface BusinessClassification {
  /** Schema version for forward compatibility */
  version: string;

  /**
   * The primary vertical classification (what the business IS).
   * This replaces `industry` + `subIndustry` + `domain`.
   */
  vertical: VerticalClassification;

  /**
   * How the business makes money (orthogonal to vertical).
   * Replaces `BusinessModel` enum and revenue-flow keyword detection.
   */
  businessModel: BusinessModelClassification;

  /** Maturity / scale — affects design density and copy tone */
  maturity: MaturityClassification;

  /** Target audience scope — affects UX patterns */
  audience: AudienceClassification;

  /**
   * Convenience fields for backward compatibility.
   * Derived from `vertical.path` by taking the first segment(s).
   *
   * These are READ-ONLY computed properties. Do not set them directly.
   */
  industry: string;
  subIndustry: string;
  domain: string;

  /**
   * Legacy compatibility shim.
   * Returns the `Industry` union type value for code that still expects it.
   * Maps taxonomy paths to the closest matching legacy enum value.
   * Returns 'other' if no legacy match exists.
   */
  legacyIndustry: string;
}

// ─── Taxonomy Registry ──────────────────────────────────────────────────────

/**
 * A single node in the taxonomy tree.
 * Used by the taxonomy registry for validation and traversal.
 */
export interface TaxonomyNode {
  /** Unique slug (kebab-case) */
  slug: string;
  /** Human-readable label */
  label: string;
  /** Parent slug (undefined for root) */
  parent?: string;
  /** Known aliases (e.g., "restaurant" alias for "food-and-beverage/restaurant") */
  aliases?: string[];
  /** Keywords that evidence this taxonomy node */
  evidenceKeywords?: string[];
  /** Default design personality for this vertical (override in knowledge packs) */
  defaultPersonality?: string;
  /** Default color hint (override in knowledge packs) */
  defaultColorHint?: string;
}

/**
 * The full taxonomy registry.
 * Loaded once at startup. Knowledge packs can extend it.
 */
export interface TaxonomyRegistry {
  version: string;
  nodes: TaxonomyNode[];
}

// ─── Knowledge Pack (supersedes BOSPack) ────────────────────────────────────

/**
 * A knowledge pack provides ALL industry-specific knowledge for a taxonomy path.
 *
 * This replaces:
 * - INDUSTRY_MAPPINGS (intake-parser.ts)
 * - INDUSTRY_COPY (industry-copy-schema.ts)
 * - INDUSTRY_PERSONALITY_MAP (design-dna.ts)
 * - INDUSTRY_HSL_MAP (design-dna.ts)
 * - INDUSTRY_SHAPES_MAP (archetypes.ts)
 * - INDUSTRY_RADIUS_MAP (design-dna.ts)
 * - INDUSTRY_PHOTOGRAPHY_MAP (design-dna.ts)
 * - INDUSTRY_TABLE_MAP (design-dna.ts)
 * - INDUSTRY_FORM_MAP (design-dna.ts)
 * - INDUSTRY_NAV_MAP (design-dna.ts)
 * - INDUSTRY_LAYOUT_MAP (design-dna.ts)
 * - INDUSTRY_COLORS (visual-engine.ts)
 * - TYPOGRAPHY_PRESETS (visual-engine.ts)
 * - INDUSTRY_POLISH (polish-engine.ts)
 * - INDUSTRY_MOTION (motion-engine.ts)
 * - INDUSTRY_COMPONENTS (component-engine.ts)
 * - INDUSTRY_LAYOUT_OVERRIDES (design-system-engine.ts)
 * - INDUSTRY_CONTENT_PROFILES (content-intelligence/engine.ts)
 * - INDUSTRY_DOMAIN_MAP (domain-detector.ts)
 * - INDUSTRY_STATS (domain-data-provider.ts)
 * - INDUSTRY_TESTIMONIALS (domain-data-provider.ts)
 * - DOMAIN_DATA (domain-data.ts)
 * - Vocabularies (intake-parser.ts)
 * - Workflows (intake-parser.ts)
 * - Entities (intake-parser.ts)
 * - Compliance (intake-parser.ts)
 * - Experience profiles (experience-profiles.ts)
 * - Templates (templates/*.ts)
 * - BOS entries (bos/entries/*.ts)
 * - Reference URLs (reference-scraper.ts)
 */
export interface KnowledgePack {
  /** Pack identifier: taxonomy path (e.g., "retail/footwear/athletic") */
  id: TaxonomyPath;
  /** Human-readable name */
  name: string;
  /** Pack version (semver) */
  version: string;

  // ── Classification ──────────────────────────────────────────────────────
  /** Taxonomy path this pack covers */
  taxonomyPath: TaxonomyPath;
  /** Aliases that should trigger this pack (e.g., ["shoes", "sneakers"]) */
  aliases: string[];
  /** Keywords for detection (e.g., ["sneaker", "running shoe", "athletic footwear"]) */
  detectionKeywords: string[];

  // ── Copy & Content ──────────────────────────────────────────────────────
  /** Industry-specific copy templates */
  copy: KnowledgePackCopy;
  /** Domain-specific mock data (products, testimonials, features, services, team) */
  domainData: KnowledgePackDomainData;
  /** Vocabulary overrides (generic term → domain term) */
  vocabulary: Record<string, string>;
  /** Industry-specific section names */
  sectionNames: Record<string, string>;

  // ── Design ──────────────────────────────────────────────────────────────
  /** Brand personality defaults */
  design: KnowledgePackDesign;
  /** Visual presets (colors, typography) */
  visual: KnowledgePackVisual;
  /** Motion presets */
  motion: KnowledgePackMotion;
  /** Component recommendations */
  components: KnowledgePackComponents;
  /** Layout overrides */
  layout: KnowledgePackLayout;

  // ── Experience ──────────────────────────────────────────────────────────
  /** Experience profile (emotional arc, motion language, scroll pacing) */
  experience: KnowledgePackExperience;

  // ── Business Logic ──────────────────────────────────────────────────────
  /** Typical workflows */
  workflows: KnowledgePackWorkflow[];
  /** Data entities to model */
  entities: KnowledgePackEntity[];
  /** Compliance requirements */
  compliance: KnowledgePackCompliance[];
  /** Common integrations */
  integrations: KnowledgePackIntegration[];
  /** KPIs this business tracks */
  kpis: string[];
  /** Revenue model keywords */
  revenueModel: string[];
  /** Payment methods */
  paymentMethods: string[];

  // ── Templates ───────────────────────────────────────────────────────────
  /** Component templates for this industry */
  templates?: KnowledgePackTemplates;

  // ── Reference ───────────────────────────────────────────────────────────
  /** Reference URLs for content research */
  referenceUrls?: string[];
  /** Reference selectors for scraping */
  referenceSelectors?: Record<string, string>;

  // ── Pages ───────────────────────────────────────────────────────────────
  /** Required pages for this industry */
  pages: KnowledgePackPage[];

  // ── Features ────────────────────────────────────────────────────────────
  /** Recommended features */
  features: KnowledgePackFeature[];

  // ── Hero ────────────────────────────────────────────────────────────────
  /** Hero section defaults */
  hero: KnowledgePackHero;

  // ── CTA ─────────────────────────────────────────────────────────────────
  /** Call-to-action defaults */
  cta: KnowledgePackCTA;

  // ── Footer ──────────────────────────────────────────────────────────────
  /** Footer defaults */
  footer: KnowledgePackFooter;
}

// ─── Knowledge Pack Sub-Types ───────────────────────────────────────────────

export interface KnowledgePackCopy {
  heroHeading: string;
  heroSubheading: string;
  heroPrimaryButton: string;
  heroSecondaryButton?: string;
  heroTrustBadges?: string[];
  heroImageKeywords: string[];
  featuresHeading: string;
  featuresSubheading: string;
  features: Array<{ icon: string; title: string; description: string }>;
  testimonialsHeading: string;
  testimonialsSubheading: string;
  testimonials: Array<{ text: string; author: string; role: string; company: string }>;
  ctaHeading: string;
  ctaPrimaryButton: string;
  ctaTrustLine?: string;
  pricingHeading?: string;
  pricingSubheading?: string;
  stats?: Array<{ value: string; label: string }>;
  forbiddenPhrases?: string[];
}

export interface KnowledgePackDomainData {
  products: Array<{ name: string; price: string; description: string; category: string; image?: string }>;
  testimonials: Array<{ text: string; author: string; role: string; rating: number }>;
  features: Array<{ icon: string; title: string; description: string }>;
  services: Array<{ name: string; description: string; price: string; duration: string }>;
  team: Array<{ name: string; role: string; bio: string; image?: string }>;
}

export interface KnowledgePackDesign {
  personality: string;
  colorHint: string;
  radiusScale: string;
  density: 'minimal' | 'balanced' | 'rich';
  mood: string[];
  typography: {
    headingFont: string;
    bodyFont: string;
    headingWeight: string;
    bodyWeight: string;
  };
}

export interface KnowledgePackVisual {
  palette: Record<string, string>;
  typography: {
    heading: string;
    body: string;
    accent: string;
  };
  shadows: string[];
  borders: string[];
}

export interface KnowledgePackMotion {
  defaultDuration: string;
  defaultEasing: string;
  hoverDuration: string;
  scrollReveal: string;
  staggerDelay: string;
}

export interface KnowledgePackComponents {
  recommended: string[];
  avoid: string[];
  heroLayout: string;
  featureLayout: string;
  testimonialLayout: string;
}

export interface KnowledgePackLayout {
  heroVariant: string;
  featureVariant: string;
  testimonialVariant: string;
  ctaVariant: string;
  navType: string;
  footerType: string;
}

export interface KnowledgePackExperience {
  defaultStyle: string;
  emotionalQualities: string[];
  narrativeStructures: string[];
  hoverDefaults: string[];
  interactionDensity: string;
  motionIntensity: string;
  conversionFocus: string;
  performanceSensitivity: string;
}

export interface KnowledgePackWorkflow {
  name: string;
  steps: string[];
  revenueImpact: string;
}

export interface KnowledgePackEntity {
  name: string;
  archetype: string;
  fields: string[];
  relationships: string[];
}

export interface KnowledgePackCompliance {
  id: string;
  name: string;
  required: boolean;
  checklist: string[];
}

export interface KnowledgePackIntegration {
  name: string;
  category: string;
  purpose: string;
}

export interface KnowledgePackTemplates {
  /** Raw JSX template strings keyed by component name */
  components: Record<string, string>;
}

export interface KnowledgePackPage {
  path: string;
  purpose: string;
  workflows: string[];
}

export interface KnowledgePackFeature {
  icon: string;
  title: string;
  description: string;
  priority: 'essential' | 'recommended' | 'optional';
}

export interface KnowledgePackHero {
  heading: string;
  subheading: string;
  primaryButton: string;
  secondaryButton?: string;
  trustBadges?: string[];
  imageKeywords: string[];
}

export interface KnowledgePackCTA {
  heading: string;
  primaryButton: string;
  trustLine?: string;
}

export interface KnowledgePackFooter {
  tagline: string;
  links: Array<{ label: string; href: string }>;
}

// ─── Backward Compatibility ─────────────────────────────────────────────────

/**
 * Derive legacy `industry` string from a taxonomy path.
 *
 * Mapping rules:
 *   "retail/footwear"          → "ecommerce"
 *   "retail/supplement"        → "ecommerce"
 *   "services/healthcare"      → "healthcare"
 *   "services/legal"           → "legal"
 *   "services/real-estate"     → "real-estate"
 *   "food-and-beverage"        → "restaurant"
 *   "software/saas"            → "saas"
 *   "software/saas/dev-tools"  → "saas"
 *   "education/coaching"       → "education"
 *   "services/fitness"         → "fitness"
 *   "media/blog"               → "media"
 *   "creative/portfolio"       → "portfolio"
 *   (unknown)                  → "other"
 */
export function deriveLegacyIndustry(taxonomyPath: TaxonomyPath): string {
  const segments = taxonomyPath.split('/');

  // Check most specific paths first (three-level, then two-level, then top-level)
  // This prevents catch-all entries like 'services' from shadowing specific paths like 'services/fitness'
  if (segments.length >= 3) {
    const threeLevel = `${segments[0]}/${segments[1]}/${segments[2]}`;
    if (LEGACY_INDUSTRY_MAP[threeLevel]) {
      return LEGACY_INDUSTRY_MAP[threeLevel];
    }
  }

  if (segments.length >= 2) {
    const twoLevel = `${segments[0]}/${segments[1]}`;
    if (LEGACY_INDUSTRY_MAP[twoLevel]) {
      return LEGACY_INDUSTRY_MAP[twoLevel];
    }
  }

  const topLevel = segments[0];
  if (LEGACY_INDUSTRY_MAP[topLevel]) {
    return LEGACY_INDUSTRY_MAP[topLevel];
  }

  return 'other';
}

/**
 * Legacy industry mapping — maps taxonomy paths to the closest matching
 * legacy `Industry` union type value.
 */
const LEGACY_INDUSTRY_MAP: Record<string, string> = {
  // Top-level verticals
  'retail': 'ecommerce',
  'services': 'other',
  'software': 'saas',
  'food-and-beverage': 'restaurant',
  'education': 'education',
  'creative': 'portfolio',
  'media': 'media',
  'nonprofit': 'nonprofit',

  // Two-level paths
  'retail/footwear': 'ecommerce',
  'retail/supplement': 'ecommerce',
  'retail/electronics': 'ecommerce',
  'retail/beauty': 'ecommerce',
  'retail/fashion': 'ecommerce',
  'retail/food': 'ecommerce',
  'retail/wholesale': 'ecommerce',
  'retail/luxury': 'luxury',
  'retail/perfume': 'perfume',
  'retail/fragrance': 'fragrance',
  'services/healthcare': 'healthcare',
  'services/healthcare/dental': 'healthcare',
  'services/healthcare/veterinary': 'healthcare',
  'services/healthcare/therapy': 'healthcare',
  'services/legal': 'other',
  'services/real-estate': 'real-estate',
  'services/real-estate/commercial': 'real-estate',
  'services/real-estate/residential': 'real-estate',
  'services/real-estate/luxury': 'real-estate',
  'services/fitness': 'fitness',
  'services/fitness/crossfit': 'fitness',
  'services/fitness/yoga': 'fitness',
  'services/fitness/personal-training': 'fitness',
  'services/beauty': 'beauty',
  'services/beauty/salon': 'beauty',
  'services/beauty/spa': 'beauty',
  'services/event': 'other',
  'services/event/wedding': 'other',
  'services/event/corporate': 'other',
  'services/travel': 'other',
  'services/travel/luxury': 'other',
  'services/automotive': 'other',
  'services/pet': 'other',
  'food-and-beverage/restaurant': 'restaurant',
  'food-and-beverage/restaurant/coffee': 'restaurant',
  'food-and-beverage/restaurant/bakery': 'restaurant',
  'food-and-beverage/restaurant/fine-dining': 'restaurant',
  'food-and-beverage/restaurant/fast-food': 'restaurant',
  'food-and-beverage/cafe': 'restaurant',
  'food-and-beverage/bakery': 'restaurant',
  'software/saas': 'saas',
  'software/saas/dev-tools': 'saas',
  'software/saas/analytics': 'saas',
  'software/saas/crm': 'saas',
  'software/saas/erp': 'saas',
  'software/saas/project-mgmt': 'saas',
  'software/fintech': 'fintech',
  'software/fintech/banking': 'fintech',
  'software/fintech/payments': 'fintech',
  'software/fintech/insurance': 'fintech',
  'software/fintech/crypto': 'fintech',
  'software/logistics': 'other',
  'software/manufacturing': 'other',
  'software/enterprise': 'saas',
  'education/coaching': 'education',
  'education/university': 'education',
  'education/k-12': 'education',
  'education/upsc': 'education',
  'creative/portfolio': 'portfolio',
  'creative/agency': 'other',
  'media/blog': 'media',
  'media/news': 'media',
  'media/magazine': 'media',
  'media/podcast': 'media',
  'nonprofit/charity': 'nonprofit',
  'nonprofit/foundation': 'nonprofit',
  'nonprofit/community': 'nonprofit',
};

/**
 * Derive legacy `subIndustry` from a taxonomy path.
 * Takes everything after the first segment.
 *
 * "retail/footwear/athletic" → "footwear-athletic"
 * "services/healthcare/dental" → "healthcare-dental"
 */
export function deriveLegacySubIndustry(taxonomyPath: TaxonomyPath): string {
  const segments = taxonomyPath.split('/');
  if (segments.length <= 1) return '';
  return segments.slice(1).join('-');
}

/**
 * Derive legacy `domain` from a taxonomy path.
 * Maps the top-level vertical to a conceptual domain.
 */
export function deriveLegacyDomain(taxonomyPath: TaxonomyPath): string {
  const segments = taxonomyPath.split('/');
  const topLevel = segments[0];

  const DOMAIN_MAP: Record<string, string> = {
    'retail': 'retail',
    'services': segments[1] || 'services',
    'software': 'technology',
    'food-and-beverage': 'food-and-beverage',
    'education': 'education',
    'creative': 'creative',
    'media': 'media',
    'nonprofit': 'nonprofit',
  };

  return DOMAIN_MAP[topLevel] || topLevel;
}

// ─── Taxonomy Validation ────────────────────────────────────────────────────

/**
 * Validate a taxonomy path against the registry.
 * Returns the matched node or undefined.
 */
export function validateTaxonomyPath(
  path: TaxonomyPath,
  registry: TaxonomyRegistry
): TaxonomyNode | undefined {
  return registry.nodes.find(n => n.slug === path);
}

/**
 * Find a taxonomy node by alias.
 */
export function findTaxonomyByAlias(
  alias: string,
  registry: TaxonomyRegistry
): TaxonomyNode | undefined {
  const lower = alias.toLowerCase();
  return registry.nodes.find(n =>
    n.aliases?.some(a => a.toLowerCase() === lower)
  );
}

/**
 * Get all child nodes of a given taxonomy path.
 */
export function getTaxonomyChildren(
  parentPath: TaxonomyPath,
  registry: TaxonomyRegistry
): TaxonomyNode[] {
  return registry.nodes.filter(n => n.parent === parentPath);
}

/**
 * Build a full taxonomy path from a list of segments.
 */
export function buildTaxonomyPath(...segments: string[]): TaxonomyPath {
  return segments
    .map(s => s.toLowerCase().trim().replace(/\s+/g, '-'))
    .filter(Boolean)
    .join('/');
}
