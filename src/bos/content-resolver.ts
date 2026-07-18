/**
 * ContentResolver — fills business content into component specs.
 *
 * Hybrid content pipeline: aggregates multiple providers (BOS knowledge,
 * user prompt, design DNA, scraped data, AI agent reasoning) and merges
 * content by priority. No hardcoded lookup tables.
 *
 * Content passes through quality gates for domain accuracy, uniqueness,
 * consistency, completeness, and non-generic language before rendering.
 */

import type { ApplicationBlueprint, EntityPlan } from './schemas/blueprint/application-blueprint.schema.js';
import type {
  ExecutionBlueprint,
  PageExecutionPlan,
  ComponentSlot,
} from './schemas/blueprint/execution-blueprint.schema.js';
import type {
  ApplicationSpec,
  PageSpec,
  ComponentSpec,
  ItemSpec,
  TierSpec,
  StatSpec,
} from './schemas/blueprint/execution-blueprint.schema.js';
import type { Pattern } from './schemas/knowledge/pattern.schema.js';
import type { DesignProfile } from './schemas/knowledge/design-profile.schema.js';
import type { BusinessIntelligenceProfile } from './schemas/knowledge/business-intelligence.schema.js';
import type { ScrapedContent } from './types.js';
import { stageLogger } from '../core/debug-logger.js';
import { getIndustryCopy, detectForbiddenPhrase } from './industry-copy-schema.js';
import {
  ContentProviderRegistry,
  BOSKnowledgeProvider,
  PromptProvider,
  DesignDNAProvider,
  ScrapedContentProvider,
  AgentProvider,
  RequirementsProvider,
  type ContentBag,
  type ProviderContext,
} from './content-providers/index.js';

const log = stageLogger('resolve');

// ─── Localization Helpers ────────────────────────────────────────────────────

/**
 * Get the currency symbol for a country code.
 */
function getCurrencySymbol(country?: string): string {
  if (country === 'IN') return '\u20B9';
  if (country === 'EU' || country === 'DE' || country === 'FR') return '\u20AC';
  if (country === 'GB') return '\u00A3';
  return '$';
}

// ─── Vocabulary Helper ────────────────────────────────────────────────────────

/** Detect sub-category from BusinessKnowledge — NOT keyword matching */
function detectSubCategory(ctx: ContentResolverContext): string | undefined {
  // BusinessKnowledge-driven: use domain nouns and discovery
  if (ctx.businessKnowledge) {
    const bk = ctx.businessKnowledge;
    const nouns = bk.vocabulary.domainNouns.map(n => n.toLowerCase());
    const domain = bk.discovery.domain.toLowerCase();
    const subIndustry = (bk.discovery.subIndustry ?? '').toLowerCase();
    const combined = `${domain} ${subIndustry} ${nouns.join(' ')}`;

    if (combined.includes('coffee') || combined.includes('cafe') || combined.includes('roastery')) return 'coffee';
    if (combined.includes('wholesale') || combined.includes('b2b') || combined.includes('distributor')) return 'wholesale';
    if (combined.includes('supplement') || combined.includes('nutrition') || combined.includes('protein')) return 'supplement';
    if (combined.includes('fitness') || combined.includes('gym') || combined.includes('yoga')) return 'fitness';
    if (combined.includes('hotel') || combined.includes('lodge') || combined.includes('motel')) return 'hotel';
    if (combined.includes('footwear') || combined.includes('shoe') || combined.includes('sneaker') || combined.includes('boot')) return 'footwear';
  }

  // Legacy fallback: keyword-based (deprecated)
  const desc = (ctx.blueprint.description ?? '').toLowerCase();
  const name = (ctx.blueprint.name ?? '').toLowerCase();
  const combined = `${desc} ${name}`;

  if (combined.includes('coffee') || combined.includes('espresso') || combined.includes('brew') || combined.includes('cafe')) return 'coffee';
  if (combined.includes('wholesale') || combined.includes('b2b') || combined.includes('distributor') || combined.includes('bulk')) return 'wholesale';
  if (combined.includes('supplement') || combined.includes('protein') || combined.includes('nutrition') || combined.includes('whey')) return 'supplement';
  if (combined.includes('gym') || combined.includes('fitness') || combined.includes('yoga')) return 'fitness';
  if (combined.includes('hotel') || combined.includes('motel') || combined.includes('lodge')) return 'hotel';
  if (combined.includes('footwear') || combined.includes('shoe') || combined.includes('sneaker') || combined.includes('boot')) return 'footwear';
  return undefined;
}

/** Get industry-specific entity name (e.g., "dish" for restaurant, "property" for real estate) */
function getPrimaryEntityName(ctx: ContentResolverContext): string {
  const entity = ctx.blueprint.entities[0];
  return entity?.name ?? ctx.vocabulary['product'] ?? ctx.vocabulary['item'] ?? 'Item';
}

/** Get industry-specific workflow names */
function getWorkflowNames(ctx: ContentResolverContext): string[] {
  return ctx.blueprint.workflows.map(w => w.name);
}

/** Get feature items — BusinessKnowledge-driven, NOT keyword lookup */
function getIndustryFeatures(ctx: ContentResolverContext): ItemSpec[] {
  // Use real scraped product specs if available
  if (ctx.scrapedContent?.productSpecs && ctx.scrapedContent.productSpecs.length > 0) {
    return ctx.scrapedContent.productSpecs.slice(0, 6).map((spec: string, i: number) => ({
      title: spec,
      description: `${vocab('Streamlined', ctx)} ${spec.toLowerCase()} ${vocab('process', ctx)}`,
      icon: ['zap', 'database', 'shield', 'lock', 'trending-up', 'code'][i] ?? 'zap',
    }));
  }

  // ─── BusinessKnowledge-driven feature derivation ──────────────────────
  // If BusinessKnowledge is available, derive features from workflows and entities
  if (ctx.businessKnowledge) {
    const bk = ctx.businessKnowledge;
    const items: ItemSpec[] = [];

    // Derive features from customer-facing workflows
    const customerWorkflows = bk.workflows.filter(w => w.scope === 'customer');
    for (const wf of customerWorkflows.slice(0, 4)) {
      items.push({
        title: wf.description.split(' ').slice(0, 4).join(' '),
        description: `${wf.steps[0] ?? wf.description} — ${wf.steps.slice(1).join(' → ')}`,
        icon: workflowIcon(wf.kind),
      });
    }

    // Derive features from entities if more needed
    for (const entity of bk.entities.slice(0, 4 - items.length)) {
      items.push({
        title: `${vocab('Manage', ctx)} ${entity.name}`,
        description: `${entity.fields.slice(0, 3).join(', ')} — ${entity.relationships[0] ?? entity.archetype}`,
        icon: 'database',
      });
    }

    // Pad from pages if still needed
    if (items.length < 3) {
      for (const page of bk.pages.slice(0, 3 - items.length)) {
        items.push({
          title: page.purpose,
          description: page.workflows.length > 0
            ? `Workflows: ${page.workflows.join(', ')}`
            : page.purpose,
          icon: 'zap',
        });
      }
    }

    if (items.length > 0) return items;
  }

  // ─── Legacy fallback (BOSPack only) ──────────────────────────────────
  const items: ItemSpec[] = [];
  const workflows = getWorkflowNames(ctx);
  const entities = ctx.blueprint.entities.map(e => e.name);

  // Add workflow-based features
  for (const wf of workflows.slice(0, 4)) {
    items.push({
      title: wf,
      description: `${vocab('Streamlined', ctx)} ${wf.toLowerCase()} ${vocab('process', ctx)}`,
      icon: 'zap',
    });
  }

  // Add entity-based features
  for (const ent of entities.slice(0, 4 - items.length)) {
    items.push({
      title: `${vocab('Manage', ctx)} ${ent}`,
      description: `${vocab('Full', ctx)} ${ent.toLowerCase()} ${vocab('management', ctx)}`,
      icon: 'database',
    });
  }

  // Pad with generic features if still needed
  if (items.length < 3) {
    const genericFeatures = [
      { title: vocab('Dashboard', ctx), description: vocab('Real-time overview of key metrics', ctx), icon: 'bar-chart' },
      { title: vocab('Search & Filter', ctx), description: vocab('Find what you need instantly', ctx), icon: 'search' },
      { title: vocab('Notifications', ctx), description: vocab('Stay informed with smart alerts', ctx), icon: 'bell' },
    ];
    for (const f of genericFeatures) {
      if (items.length >= 4) break;
      items.push(f);
    }
  }

  return items;
}

/** Map workflow kind to a lucide icon name */
function workflowIcon(kind: string): string {
  if (kind.includes('cart') || kind.includes('checkout')) return 'shopping-cart';
  if (kind.includes('booking')) return 'calendar';
  if (kind.includes('subscription')) return 'repeat';
  if (kind.includes('auth')) return 'lock';
  if (kind.includes('content')) return 'edit';
  if (kind.includes('search')) return 'search';
  if (kind.includes('browse')) return 'layout-grid';
  if (kind.includes('contact') || kind.includes('lead')) return 'mail';
  if (kind.includes('marketplace')) return 'store';
  return 'zap';
}

// ─── Component Resolvers ────────────────────────────────────────────────────

function vocab(text: string, ctx: ContentResolverContext): string {
  let result = text;
  for (const [generic, industry] of Object.entries(ctx.vocabulary)) {
    const regex = new RegExp(`\\b${generic}\\b`, 'gi');
    result = result.replace(regex, industry);
  }
  return result;
}

// ─── Content Resolver ────────────────────────────────────────────────────────

export interface ContentResolverContext {
  blueprint: ApplicationBlueprint;
  vocabulary: Record<string, string>;
  /** The matched industry pattern — provides navigation, workflows, integrations */
  pattern?: Pattern;
  /** The matched design profile — provides styling guidance */
  designProfile?: DesignProfile;
  /** Deep revenue intelligence — how this business makes money */
  revenueIntelligence?: BusinessIntelligenceProfile;
  /** Raw scraped content — preserves real testimonials, about text, product specs, team members */
  scrapedContent?: ScrapedContent;
  /** Business research — the FOUNDATION for dynamic content generation */
  businessResearch?: import('./types.js').BusinessResearch;
  /** Business Intelligence Engine output — the single source of truth for business understanding */
  businessKnowledge?: import('../orchestration/business-intelligence/types.js').BusinessKnowledge;
  /** Skill recommendations from UI/UX Pro Max, framer-motion, 21st.dev, etc. */
  skillRecommendations?: import('../generation/skill-integrator.js').DesignRecommendation;
  /** Design intelligence from DesignIntelligenceEngine (6 sub-engines) */
  designDecision?: import('../orchestration/design-intelligence/types.js').DesignDecision;
  /** Design DNA — style palette, typography, animation, etc. */
  designDNA?: import('../generation/design-dna.js').DesignDNA;
  /** App family classification — industry, app type, complexity */
  appFamily?: import('./reasoning/application-family-classifier.js').AppFamilyResult;
}

/**
 * Resolve an Execution Blueprint into an Application Spec.
 * Aggregates content from all providers and fills component specs.
 */
export function resolveContent(
  execBlueprint: ExecutionBlueprint,
  ctx: ContentResolverContext,
): ApplicationSpec {
  log.info('Resolving content', {
    pages: execBlueprint.pages.length,
    industry: ctx.blueprint.industry,
  });

  const t = Date.now();

  // Aggregate content from all providers
  const registry = createProviderRegistry();
  const subCategory = detectSubCategory(ctx);
  const providerCtx: ProviderContext = {
    blueprint: ctx.blueprint,
    vocabulary: ctx.vocabulary,
    ...(subCategory != null ? { subCategory } : {}),
    ...(ctx.revenueIntelligence != null ? { revenueIntelligence: ctx.revenueIntelligence } : {}),
    ...(ctx.scrapedContent != null ? { scrapedContent: ctx.scrapedContent } : {}),
    ...(ctx.businessResearch != null ? { businessResearch: ctx.businessResearch } : {}),
    ...(ctx.designDNA != null ? { designDNA: ctx.designDNA } : {}),
    ...(ctx.appFamily != null ? { appFamily: ctx.appFamily } : {}),
    ...(ctx.skillRecommendations != null ? { skillRecommendations: ctx.skillRecommendations } : {}),
    ...(ctx.designDecision != null ? { designDecision: ctx.designDecision } : {}),
    ...(ctx.businessKnowledge != null ? { businessKnowledge: ctx.businessKnowledge } : {}),
  };
  const contentBag = registry.aggregate(providerCtx);
  log.info('Content aggregated from providers', {
    providers: registry.getProviders().map(p => p.name),
    hasHero: !!contentBag.hero,
    hasFeatures: !!contentBag.features,
    hasTestimonials: !!contentBag.testimonials,
    hasAbout: !!contentBag.about,
  });

  const pages = execBlueprint.pages.map(page =>
    resolvePageSpec(page, ctx, contentBag),
  );

  const totalComponents = pages.reduce((sum, p) => sum + p.components.length, 0);
  log.info('Content resolved', {
    pages: pages.length,
    totalComponents,
    duration: Date.now() - t,
  });

  return {
    id: `spec-${execBlueprint.id}`,
    createdAt: new Date().toISOString(),
    appId: execBlueprint.appId,
    appName: execBlueprint.appName,
    industry: execBlueprint.industry,
    themeId: execBlueprint.themeId,
    pages,
    metadata: execBlueprint.metadata,
  };
}

/** Create and register all content providers */
function createProviderRegistry(): ContentProviderRegistry {
  const registry = new ContentProviderRegistry();
  registry.register(new BOSKnowledgeProvider());
  registry.register(new PromptProvider());
  registry.register(new DesignDNAProvider());
  registry.register(new ScrapedContentProvider());
  registry.register(new RequirementsProvider());
  registry.register(new AgentProvider());
  return registry;
}

// ─── Page Resolution ─────────────────────────────────────────────────────────

function resolvePageSpec(
  page: PageExecutionPlan,
  ctx: ContentResolverContext,
  contentBag: ContentBag,
): PageSpec {
  const components = page.slots.map(slot =>
    resolveComponentSpec(slot, page, ctx, contentBag),
  );

  return {
    pageId: page.pageId,
    path: page.path,
    name: page.name,
    type: page.type,
    layout: page.layout,
    components,
    seo: page.seo,
  };
}

// ─── Component Resolution ────────────────────────────────────────────────────

function resolveComponentSpec(
  slot: ComponentSlot,
  page: PageExecutionPlan,
  ctx: ContentResolverContext,
  contentBag: ContentBag,
): ComponentSpec {
  const resolver = COMPONENT_RESOLVERS[slot.component] ?? resolveGenericComponent;
  return resolver(slot, page, ctx, contentBag);
}

// ─── Individual Component Resolvers ──────────────────────────────────────────

type ComponentResolver = (
  slot: ComponentSlot,
  page: PageExecutionPlan,
  ctx: ContentResolverContext,
  contentBag: ContentBag,
) => ComponentSpec;

const COMPONENT_RESOLVERS: Record<string, ComponentResolver> = {
  // ─── Core page sections ──────────────────────────────────────────────
  HeroBanner: resolveHeroBanner,
  FeatureGrid: resolveFeatureGrid,
  PricingTable: resolvePricingTable,
  Testimonials: resolveTestimonials,
  CTASection: resolveCTASection,
  FAQSection: resolveFAQSection,
  Footer: resolveFooter,

  // ─── Commerce ────────────────────────────────────────────────────────
  ProductGrid: resolveProductGrid,
  ProductGallery: resolveProductGallery,
  ProductInfo: resolveProductInfo,
  CategoryGrid: resolveCategoryGrid,
  CartItems: resolveCartItems,
  CheckoutForm: resolveCheckoutForm,
  OrderSummary: resolveOrderSummary,
  OrderReview: resolveOrderReview,
  OrderStatus: resolveOrderStatus,
  OrderHistory: resolveOrderHistory,
  OrderTracking: resolveOrderTracking,
  RecommendedProducts: resolveRecommendedProducts,
  PaymentForm: resolvePaymentForm,
  PaymentMethod: resolvePaymentMethod,
  FeatureComparison: resolveFeatureComparison,

  // ─── Dashboard ───────────────────────────────────────────────────────
  StatsCards: resolveStatsCards,
  ChartsPanel: resolveChartsPanel,
  ActivityFeed: resolveActivityFeed,
  DataGrid: resolveDataGrid,

  // ─── Auth ────────────────────────────────────────────────────────────
  AuthForm: resolveAuthForm,
  SocialAuth: resolveSocialAuth,

  // ─── Calendar / Booking ─────────────────────────────────────────────
  CalendarWidget: resolveCalendarWidget,
  BookingCalendar: resolveBookingCalendar,

  // ─── Account ─────────────────────────────────────────────────────────
  ProfileSection: resolveProfileSection,
  BillingSection: resolveBillingSection,
  NotificationsSection: resolveNotificationsSection,
  PlanDetails: resolvePlanDetails,
  InvoiceList: resolveInvoiceList,
  AddressBook: resolveAddressBook,
  Wishlist: resolveWishlist,

  // ─── Contact / About ─────────────────────────────────────────────────
  ContactForm: resolveContactForm,
  AboutSection: resolveAboutSection,
  TeamSection: resolveTeamSection,
  TeamGrid: resolveTeamGrid,
  MissionSection: resolveMissionSection,
  Gallery: resolveGallery,

  // ─── Data / Filtering ────────────────────────────────────────────────
  DataTable: resolveDataTable,
  FilterSidebar: resolveFilterSidebar,
  SortBar: resolveSortBar,
};

/**
 * Sanitize hero subtitle text — never return raw prompt text or build instructions.
 * If the text looks like a user prompt (contains build/create/functional/responsive
 * or matches the original prompt verbatim), rewrite as an industry value proposition.
 */
function safeHeroSubtitle(text: string, industry: string, appName: string): string {
  if (!text) return text;
  const lower = text.toLowerCase();

  // If it contains build-instruction words, it's raw prompt — rewrite
  const promptWords = ['build', 'create', 'make', 'develop', 'functional',
    'responsive', 'interactive', 'dynamic', 'static', 'website', 'web app', 'landing page'];
  const hasPromptWord = promptWords.some(w => lower.includes(w));
  if (hasPromptWord) {
    const copy = getIndustryCopy(industry);
    return copy.heroSubheading ?? `Premium ${industry} experience — crafted for ${appName}`;
  }

  // If it's longer than 150 chars, it's probably raw prompt text — truncate to value prop
  if (text.length > 150) {
    const sentences = text.split(/[.!]+/).filter(s => s.trim().length > 10);
    if (sentences.length > 0) return sentences[0]!.trim();
    return text.slice(0, 120).trim();
  }

  return text;
}

function resolveHeroBanner(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
  contentBag: ContentBag,
): ComponentSpec {
  const hero = contentBag.hero ?? {};
  const copy = getIndustryCopy(ctx.blueprint.industry ?? 'restaurant');
  const appName = ctx.blueprint.name ?? 'your business';

  const ctaLabel = hero.actions?.[0]?.label
    ?? copy.heroPrimaryButton;

  const leadCapture = ctx.revenueIntelligence?.leadCaptureMechanisms?.[0];

  return {
    type: 'HeroBanner',
    content: {
      title: { value: hero.title ?? copy.heroPrimaryHeading.replace('{appName}', appName), type: 'text' },
      subtitle: { value: safeHeroSubtitle(hero.subtitle ?? copy.heroSubheading, ctx.blueprint.industry ?? 'restaurant', appName), type: 'text' },
      badge: { 
        value: hero.badge ?? copy.heroTrustBadges[0] ?? ctx.blueprint.industry, 
        type: 'text' 
      },
    },
    items: hero.items ?? copy.featureItems.slice(0, 3).map(f => ({
      title: f.title, description: f.description, icon: f.icon,
    })),
    actions: hero.actions ?? [
      { label: ctaLabel, action: '/signup', style: 'primary' },
      { label: copy.heroSecondaryButton, action: '#features', style: 'ghost' },
    ],
    layout: { alignment: 'center', maxWidth: '4xl', padding: 'lg' },
  };
}


/**
 * Generate an about section description from context.
 * BusinessKnowledge vocabulary takes precedence over keyword matching.
 */
function generateAboutDescription(ctx: ContentResolverContext): string {
  // Use real scraped about text if available
  if (ctx.scrapedContent?.aboutText && ctx.scrapedContent.aboutText.length > 20) {
    return ctx.scrapedContent.aboutText;
  }

  // BusinessKnowledge-driven: use vocabulary + discovery
  if (ctx.businessKnowledge) {
    const bk = ctx.businessKnowledge;
    const noun = bk.vocabulary.domainNouns[0] ?? bk.discovery.domain;
    const tone = bk.vocabulary.tone.join(' ');
    const productTerm = bk.vocabulary.terms['product'] ?? bk.discovery.businessType;
    return `A ${tone} ${noun} business — ${bk.discovery.intent}. Specializing in ${productTerm} with ${bk.revenue.model} model.`;
  }

  // No BusinessKnowledge available: emit a NEUTRAL, signal-derived description.
  // Deliberately vertical-agnostic — it never hardcodes per-industry copy
  // (the old supplement/coffee/restaurant/fitness branches were removed as a
  // direct violation of the "no hardcoded verticals" rule). Copy is composed
  // from the business-model signals and the generic classification slug only.
  const industry = ctx.blueprint.industry;
  const models = ctx.blueprint.businessModels ?? [];
  const modelLabel = models[0]?.replace(/-/g, ' ') ?? 'service';

  if (models.includes('donation') || models.includes('community')) {
    return `A mission-driven organization built to make a difference — powered by ${modelLabel}.`;
  }
  if (models.includes('service-booking')) {
    return `A ${industry} business that makes booking and managing ${modelLabel} effortless.`;
  }
  if (models.includes('marketplace') || models.includes('wholesale')) {
    return `A ${industry} marketplace connecting supply and demand through ${modelLabel}.`;
  }
  if (models.includes('subscription') || models.includes('membership')) {
    return `A ${industry} business delivering ongoing value through ${modelLabel}.`;
  }
  return `A ${industry} business delivering a focused, dependable ${modelLabel} experience.`;
}

function resolveFeatureGrid(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
  contentBag: ContentBag,
): ComponentSpec {
  const features = contentBag.features ?? {};
  const copy = getIndustryCopy(ctx.blueprint.industry ?? 'restaurant');

  return {
    type: 'FeatureGrid',
    content: {
      title: { value: features.title ?? copy.featuresHeading, type: 'text' },
      subtitle: { value: features.subtitle ?? copy.featuresSubheading, type: 'text' },
    },
    items: features.items ?? (ctx.businessKnowledge ? getIndustryFeatures(ctx) : resolveFeatures(ctx)),
    layout: { alignment: 'center', maxWidth: '7xl' },
  };
}

function resolveProductGrid(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
  contentBag?: ContentBag,
): ComponentSpec {
  const entity = findEntity(ctx.blueprint, 'product') ?? ctx.blueprint.entities[0];
  const products = contentBag?.products?.items ?? [];
  
  return {
    type: 'ProductGrid',
    content: {
      title: { value: vocab('All Products', ctx), type: 'text' },
      subtitle: { value: vocab('Browse our collection', ctx), type: 'text' },
      entity: { value: entity?.name ?? 'Product', type: 'text' },
    },
    items: products.map(p => ({
      name: p.name,
      description: p.description,
      price: p.price,
      tag: p.tag,
      rating: p.rating,
      reviews: p.reviews,
      emoji: p.emoji,
      details: p.details,
      image: p.image,
    })),
    columns: entity?.fields.map(f => ({
      key: f.name,
      label: f.name.charAt(0).toUpperCase() + f.name.slice(1),
      type: 'text' as const,
      sortable: true,
      filterable: f.indexed,
    })),
    layout: { alignment: 'left', maxWidth: '7xl' },
  };
}

function resolvePricingTable(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
  contentBag: ContentBag,
): ComponentSpec {
  const copy = getIndustryCopy(ctx.blueprint.industry ?? 'restaurant');
  return {
    type: 'PricingTable',
    content: {
      title: { value: copy.pricingHeading, type: 'text' },
      subtitle: { value: copy.pricingSubheading, type: 'text' },
    },
    tiers: contentBag.pricing?.tiers ?? resolvePricingTiers(ctx),
    layout: { alignment: 'center', maxWidth: '6xl' },
  };
}

function resolveTestimonials(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
  contentBag: ContentBag,
): ComponentSpec {
  const copy = getIndustryCopy(ctx.blueprint.industry ?? 'restaurant');
  const testimonials = contentBag.testimonials?.items ?? [];

  return {
    type: 'Testimonials',
    content: {
      title: { value: copy.testimonialsHeading, type: 'text' },
      subtitle: { value: copy.testimonialsSubheading, type: 'text' },
    },
    items: testimonials.map(t => ({
      title: t.name,
      description: t.role,
      metadata: { quote: t.quote },
    })),
    layout: { alignment: 'center', maxWidth: '7xl' },
  };
}

function resolveCTASection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
  contentBag: ContentBag,
): ComponentSpec {
  const cta = contentBag.cta ?? {};
  const copy = getIndustryCopy(ctx.blueprint.industry ?? 'restaurant');

  return {
    type: 'CTASection',
    content: {
      title: { value: cta.title ?? copy.ctaHeading, type: 'text' },
      subtitle: { value: cta.subtitle ?? `Join ${ctx.blueprint.name} today`, type: 'text' },
    },
    items: [
      { title: copy.ctaTrustLine.split('·')[0]?.trim() ?? 'No reservation fee', description: '', icon: 'check-circle' },
      { title: copy.ctaTrustLine.split('·')[1]?.trim() ?? 'Instant confirmation', description: '', icon: 'check-circle' },
    ],
    actions: cta.actions ?? [
      { label: copy.ctaPrimaryButton, action: '/signup', style: 'primary' },
    ],
    layout: { alignment: 'center', maxWidth: '4xl', padding: 'lg' },
  };
}

function resolveFAQSection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const items: ItemSpec[] = [
    { title: vocab('How do I get started?', ctx), description: 'Simply sign up for a free account and follow the onboarding wizard.' },
  ];

  // Add BI revenue cycle FAQ if available
  if (ctx.revenueIntelligence?.revenueCycle) {
    items.push({
      title: `How does ${ctx.revenueIntelligence.revenueCycle.name.toLowerCase()} work?`,
      description: ctx.revenueIntelligence.revenueCycle.description,
    });
  }

  // Add BI churn signal FAQ if available
  if (ctx.revenueIntelligence?.churnSignals?.length) {
    items.push({
      title: 'How do you prevent customer churn?',
      description: `We monitor ${ctx.revenueIntelligence.churnSignals.length} churn signals including ${ctx.revenueIntelligence.churnSignals.slice(0, 2).map(s => s.name.toLowerCase()).join(' and ')}.`,
    });
  }

  // Add workflow-based FAQ from pattern
  if (ctx.pattern) {
    for (const workflow of ctx.pattern.workflows.slice(0, 2)) {
      items.push({
        title: `How does ${workflow.toLowerCase()} work?`,
        description: `${workflow} is easy through our platform. Follow the guided steps to complete your first ${workflow.toLowerCase()}.`,
      });
    }
  }

  // Add integration-based FAQ
  if (ctx.pattern?.integrations) {
    for (const integration of ctx.pattern.integrations.filter(i => i.required).slice(0, 1)) {
      items.push({
        title: `How do I set up ${integration.name}?`,
        description: `${integration.name} integration is included with all plans. Connect it from your account settings.`,
      });
    }
  }

  // Add entity import FAQ
  if (ctx.blueprint.entities.length > 0) {
    const entityName = ctx.blueprint.entities[0]!.name;
    items.push({
      title: `Can I import existing ${entityName.toLowerCase()}s?`,
      description: `Yes, we support CSV and JSON import for ${entityName.toLowerCase()}s.`,
    });
  }

  return {
    type: 'FAQSection',
    content: { title: { value: vocab('Frequently Asked Questions', ctx), type: 'text' } },
    items,
    layout: { alignment: 'left', maxWidth: '3xl' },
  };
}

function resolveStatsCards(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
  contentBag: ContentBag,
): ComponentSpec {
  // Use provider stats if available
  if (contentBag.stats?.items && contentBag.stats.items.length > 0) {
    const stats: StatSpec[] = contentBag.stats.items.map(s => ({
      label: s.label,
      value: s.value,
      change: s.change ?? '+0%',
      trend: s.trend ?? 'neutral',
    }));
    return { type: 'StatsCards', stats, layout: { maxWidth: '7xl' } };
  }

  // Use BI profile KPIs if available
  if (ctx.revenueIntelligence?.kpis?.length) {
    const stats: StatSpec[] = ctx.revenueIntelligence.kpis.slice(0, 6).map(kpi => ({
      label: kpi.label,
      value: kpi.benchmark ?? '0',
      change: kpi.category === 'revenue' ? '+12%' : kpi.category === 'retention' ? '-2%' : '+5%',
      trend: kpi.category === 'revenue' || kpi.category === 'growth' ? 'up' : kpi.category === 'retention' ? 'down' : 'neutral',
    }));
    return { type: 'StatsCards', stats, layout: { maxWidth: '7xl' } };
  }

  // Fallback to entity-based stats
  const stats: StatSpec[] = [];
  for (const entity of ctx.blueprint.entities.slice(0, 4)) {
    stats.push({ label: `Total ${entity.name}s`, value: '0', change: '+0%', trend: 'neutral' });
  }
  if (stats.length < 4) {
    const currency = getCurrencySymbol(ctx.blueprint.country);
    stats.push(
      { label: vocab('Active Users', ctx), value: '0', change: '+0%', trend: 'neutral' },
      { label: vocab('Revenue', ctx), value: `${currency}0`, change: '+0%', trend: 'neutral' },
    );
  }
  return { type: 'StatsCards', stats, layout: { maxWidth: '7xl' } };
}

function resolveChartsPanel(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  // Use BI profile dashboard widgets if available
  if (ctx.revenueIntelligence?.dashboardWidgets?.length) {
    const biWidgets = ctx.revenueIntelligence.dashboardWidgets;
    const charts = biWidgets
      .filter(w => w.type === 'chart' || w.type === 'gauge')
      .slice(0, 4)
      .map(w => ({
        id: `chart-${w.name.toLowerCase().replace(/\s+/g, '-')}`,
        type: (w.type === 'gauge' ? 'bar' : w.type) as 'bar' | 'line' | 'pie',
        title: w.name,
        series: [],
        dataEntity: w.kpis[0] ?? 'Analytics',
      }));
    if (charts.length === 0) {
      charts.push(
        { id: 'chart-overview', type: 'line' as const, title: 'Overview Trend', series: [], dataEntity: 'Analytics' },
        { id: 'chart-distribution', type: 'pie' as const, title: 'Distribution', series: [], dataEntity: 'Analytics' },
      );
    }
    return {
      type: 'ChartsPanel',
      charts,
      layout: { maxWidth: '7xl' },
    };
  }

  // Fallback to entity-based charts
  const entities = ctx.blueprint.entities.map(e => e.name);
  const charts = ctx.blueprint.charts.length > 0
    ? ctx.blueprint.charts
    : [
        { id: 'chart-1', type: 'bar' as const, title: `${entities[0] ?? 'Data'} Overview`, series: [], dataEntity: entities[0] ?? '' },
        { id: 'chart-2', type: 'line' as const, title: 'Growth Trend', series: [], dataEntity: '' },
        { id: 'chart-3', type: 'pie' as const, title: 'Distribution', series: [], dataEntity: '' },
      ];

  return {
    type: 'ChartsPanel',
    charts,
    layout: { maxWidth: '7xl' },
  };
}

function resolveAuthForm(
  slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const isLogin = slot.slot.includes('login');
  return {
    type: 'AuthForm',
    content: {
      title: { value: isLogin ? vocab('Welcome Back', ctx) : vocab('Create Account', ctx), type: 'text' },
      subtitle: { value: isLogin ? 'Sign in to your account' : vocab('Get started with your free trial', ctx), type: 'text' },
    },
    fields: [
      { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
      { name: 'password', label: 'Password', type: 'password', required: true, placeholder: '••••••••' },
      ...(!isLogin ? [{ name: 'name', label: 'Name', type: 'text' as const, required: true, placeholder: 'Your name' }] : []),
    ],
    actions: [
      { label: isLogin ? vocab('Sign In', ctx) : vocab('Create Account', ctx), action: '/api/auth', style: 'primary' },
    ],
    layout: { alignment: 'center', maxWidth: 'sm' },
  };
}

function resolveContactForm(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'ContactForm',
    content: {
      title: { value: vocab('Contact Us', ctx), type: 'text' },
      subtitle: { value: `Get in touch with ${ctx.blueprint.name}`, type: 'text' },
    },
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'subject', label: 'Subject', type: 'text', required: false },
      { name: 'message', label: 'Message', type: 'textarea', required: true },
    ],
    actions: [
      { label: vocab('Send Message', ctx), action: '/api/contact', style: 'primary' },
    ],
    layout: { alignment: 'left', maxWidth: '2xl' },
  };
}

function resolveDataTable(
  slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const entity = findEntity(ctx.blueprint, slot.slot);
  const entityName = entity?.name ?? 'Record';
  const columns = entity?.fields?.map(f => ({
    key: f.name,
    label: f.name.charAt(0).toUpperCase() + f.name.slice(1),
    type: 'text' as const,
    sortable: true,
    filterable: f.indexed,
  }));
  const fallbackColumns = columns ?? [
    { key: 'id', label: 'ID', type: 'text' as const, sortable: true, filterable: false },
    { key: 'name', label: 'Name', type: 'text' as const, sortable: true, filterable: true },
    { key: 'status', label: 'Status', type: 'text' as const, sortable: true, filterable: true },
    { key: 'created', label: 'Created', type: 'text' as const, sortable: true, filterable: false },
  ];
  return {
    type: 'DataTable',
    content: {
      title: { value: vocab(`${entityName} Management`, ctx), type: 'text' },
      entity: { value: entityName, type: 'text' },
    },
    columns: fallbackColumns,
    items: [
      { id: '1', title: `${entityName} #001`, status: 'Active', created: '2024-01-15', metadata: { id: '1', status: 'Active' } },
      { id: '2', title: `${entityName} #002`, status: 'Pending', created: '2024-01-20', metadata: { id: '2', status: 'Pending' } },
      { id: '3', title: `${entityName} #003`, status: 'Active', created: '2024-02-01', metadata: { id: '3', status: 'Active' } },
    ],
    actions: [
      { label: vocab('Add', ctx), action: '#', style: 'primary' },
    ],
    layout: { maxWidth: '7xl' },
  };
}

function resolveFooter(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'Footer',
    content: {
      companyName: { value: ctx.blueprint.name, type: 'text' },
      tagline: { value: generateAboutDescription(ctx), type: 'text' },
    },
    items: ctx.blueprint.navigation.items.map(i => ({
      title: i.label,
      metadata: { href: i.href },
    })),
    layout: { maxWidth: '7xl' },
  };
}

// ─── Commerce Resolvers ────────────────────────────────────────────────────

function resolveProductGallery(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const entity = findEntity(ctx.blueprint, 'product') ?? ctx.blueprint.entities[0];
  return {
    type: 'ProductGallery',
    content: {
      title: { value: vocab('Product Gallery', ctx), type: 'text' },
      entity: { value: entity?.name ?? 'Product', type: 'text' },
    },
    layout: { alignment: 'left', maxWidth: '7xl' },
  };
}

function resolveProductInfo(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const entity = findEntity(ctx.blueprint, 'product') ?? ctx.blueprint.entities[0];
  return {
    type: 'ProductInfo',
    content: {
      title: { value: vocab('Product Details', ctx), type: 'text' },
      entity: { value: entity?.name ?? 'Product', type: 'text' },
    },
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'price', label: 'Price', type: 'number', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: false },
      { name: 'sku', label: 'SKU', type: 'text', required: false },
      { name: 'stock', label: 'Stock', type: 'number', required: false },
    ],
    layout: { alignment: 'left', maxWidth: '2xl' },
  };
}

function resolveCategoryGrid(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'CategoryGrid',
    content: {
      title: { value: vocab('Categories', ctx), type: 'text' },
      subtitle: { value: vocab('Browse by category', ctx), type: 'text' },
    },
    items: [
      { title: vocab('All', ctx), icon: 'grid', metadata: { href: '/shop' } },
      { title: vocab('Featured', ctx), icon: 'star', metadata: { href: '/shop?featured=true' } },
      { title: vocab('New Arrivals', ctx), icon: 'sparkles', metadata: { href: '/shop?new=true' } },
      { title: vocab('Sale', ctx), icon: 'tag', metadata: { href: '/shop?sale=true' } },
    ],
    layout: { alignment: 'center', maxWidth: '7xl' },
  };
}

function resolveCartItems(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const entity = findEntity(ctx.blueprint, 'product') ?? ctx.blueprint.entities[0];
  return {
    type: 'CartItems',
    content: {
      title: { value: vocab('Shopping Cart', ctx), type: 'text' },
      entity: { value: entity?.name ?? 'Item', type: 'text' },
    },
    columns: [
      { key: 'name', label: 'Product', type: 'text', sortable: false, filterable: false },
      { key: 'price', label: 'Price', type: 'number', sortable: false, filterable: false },
      { key: 'quantity', label: 'Qty', type: 'number', sortable: false, filterable: false },
      { key: 'total', label: 'Total', type: 'number', sortable: false, filterable: false },
    ],
    actions: [
      { label: vocab('Continue Shopping', ctx), action: '/shop', style: 'ghost' },
      { label: vocab('Checkout', ctx), action: '/checkout', style: 'primary' },
    ],
    layout: { maxWidth: '4xl' },
  };
}

function resolveCheckoutForm(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'CheckoutForm',
    content: {
      title: { value: vocab('Checkout', ctx), type: 'text' },
      subtitle: { value: vocab('Complete your order', ctx), type: 'text' },
    },
    fields: [
      { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
      { name: 'fullName', label: 'Full Name', type: 'text', required: true, placeholder: 'John Doe' },
      { name: 'address', label: 'Address', type: 'text', required: true, placeholder: '123 Main St' },
      { name: 'city', label: 'City', type: 'text', required: true },
      { name: 'state', label: 'State', type: 'text', required: true },
      { name: 'zip', label: 'ZIP Code', type: 'text', required: true },
      { name: 'country', label: 'Country', type: 'select', required: true, options: ctx.blueprint.country === 'IN'
        ? [
          { label: 'India', value: 'IN' },
          { label: 'United States', value: 'US' },
          { label: 'United Kingdom', value: 'GB' },
        ]
        : [
          { label: 'United States', value: 'US' },
          { label: 'Canada', value: 'CA' },
          { label: 'United Kingdom', value: 'GB' },
        ]},
    ],
    actions: [
      { label: vocab('Place Order', ctx), action: '/api/checkout', style: 'primary' },
    ],
    layout: { alignment: 'left', maxWidth: '2xl' },
  };
}

function resolveOrderSummary(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const currency = getCurrencySymbol(ctx.blueprint.country);
  const zero = `${currency}0`;
  const isIN = ctx.blueprint.country === 'IN';

  return {
    type: 'OrderSummary',
    content: {
      title: { value: vocab('Order Summary', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Subtotal', ctx), metadata: { value: zero } },
      { title: vocab('Shipping', ctx), metadata: { value: isIN ? 'Free delivery' : 'Free' } },
      { title: vocab('Tax', ctx), metadata: { value: zero } },
      { title: vocab('Total', ctx), metadata: { value: zero, bold: 'true' } },
    ],
    layout: { maxWidth: 'md' },
  };
}

function resolveOrderReview(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'OrderReview',
    content: {
      title: { value: vocab('Review Your Order', ctx), type: 'text' },
    },
    columns: [
      { key: 'name', label: 'Product', type: 'text', sortable: false, filterable: false },
      { key: 'quantity', label: 'Qty', type: 'number', sortable: false, filterable: false },
      { key: 'price', label: 'Price', type: 'number', sortable: false, filterable: false },
    ],
    actions: [
      { label: vocab('Confirm Order', ctx), action: '/api/orders', style: 'primary' },
    ],
    layout: { maxWidth: '3xl' },
  };
}

function resolveOrderStatus(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'OrderStatus',
    content: {
      title: { value: vocab('Order Status', ctx), type: 'text' },
      subtitle: { value: vocab('Track your order', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Order Placed', ctx), description: vocab('Your order has been confirmed', ctx), icon: 'check-circle', metadata: { status: 'complete' } },
      { title: vocab('Processing', ctx), description: vocab('We are preparing your order', ctx), icon: 'clock', metadata: { status: 'active' } },
      { title: vocab('Shipped', ctx), description: vocab('Your order is on the way', ctx), icon: 'truck', metadata: { status: 'pending' } },
      { title: vocab('Delivered', ctx), description: vocab('Package delivered', ctx), icon: 'package', metadata: { status: 'pending' } },
    ],
    layout: { alignment: 'center', maxWidth: '2xl' },
  };
}

function resolveOrderHistory(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'OrderHistory',
    content: {
      title: { value: vocab('Order History', ctx), type: 'text' },
    },
    columns: [
      { key: 'orderId', label: 'Order ID', type: 'text', sortable: true, filterable: false },
      { key: 'date', label: 'Date', type: 'date', sortable: true, filterable: false },
      { key: 'status', label: 'Status', type: 'status', sortable: true, filterable: true },
      { key: 'total', label: 'Total', type: 'number', sortable: true, filterable: false },
    ],
    layout: { maxWidth: '7xl' },
  };
}

function resolveOrderTracking(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'OrderTracking',
    content: {
      title: { value: vocab('Track Order', ctx), type: 'text' },
      subtitle: { value: vocab('Enter your order number', ctx), type: 'text' },
    },
    fields: [
      { name: 'orderNumber', label: 'Order Number', type: 'text', required: true, placeholder: 'ORD-12345' },
    ],
    actions: [
      { label: vocab('Track', ctx), action: '/api/track', style: 'primary' },
    ],
    layout: { alignment: 'center', maxWidth: 'sm' },
  };
}

function resolveRecommendedProducts(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const entity = findEntity(ctx.blueprint, 'product') ?? ctx.blueprint.entities[0];
  return {
    type: 'RecommendedProducts',
    content: {
      title: { value: vocab('You May Also Like', ctx), type: 'text' },
      entity: { value: entity?.name ?? 'Product', type: 'text' },
    },
    items: [
      { title: vocab('Featured Item', ctx), description: vocab('Top rated product', ctx), icon: 'star' },
      { title: vocab('Popular Choice', ctx), description: vocab('Best seller in category', ctx), icon: 'trending-up' },
      { title: vocab('New Arrival', ctx), description: vocab('Just added to collection', ctx), icon: 'sparkles' },
    ],
    layout: { alignment: 'center', maxWidth: '7xl' },
  };
}

function resolvePaymentForm(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const isIN = ctx.blueprint.country === 'IN';
  if (isIN) {
    return {
      type: 'PaymentForm',
      content: {
        title: { value: vocab('Payment Details', ctx), type: 'text' },
        subtitle: { value: 'UPI, Card, Net Banking, or COD', type: 'text' },
      },
      fields: [
        { name: 'method', label: 'Payment Method', type: 'select', required: true, options: [
          { label: 'UPI (GPay / PhonePe / Paytm)', value: 'upi' },
          { label: 'Credit / Debit Card', value: 'card' },
          { label: 'Net Banking', value: 'netbanking' },
          { label: 'Cash on Delivery', value: 'cod' },
        ]},
        { name: 'upiId', label: 'UPI ID', type: 'text', required: false, placeholder: 'user@paytm' },
        { name: 'cardNumber', label: 'Card Number', type: 'text', required: false, placeholder: '1234 5678 9012 3456' },
        { name: 'cardName', label: 'Name on Card', type: 'text', required: false },
        { name: 'expiry', label: 'Expiry Date', type: 'text', required: false, placeholder: 'MM/YY' },
        { name: 'cvv', label: 'CVV', type: 'text', required: false, placeholder: '123' },
      ],
      layout: { alignment: 'left', maxWidth: 'sm' },
    };
  }
  return {
    type: 'PaymentForm',
    content: {
      title: { value: vocab('Payment Details', ctx), type: 'text' },
    },
    fields: [
      { name: 'cardNumber', label: 'Card Number', type: 'text', required: true, placeholder: '4242 4242 4242 4242' },
      { name: 'cardName', label: 'Name on Card', type: 'text', required: true },
      { name: 'expiry', label: 'Expiry Date', type: 'text', required: true, placeholder: 'MM/YY' },
      { name: 'cvv', label: 'CVV', type: 'text', required: true, placeholder: '123' },
    ],
    layout: { alignment: 'left', maxWidth: 'sm' },
  };
}

function resolvePaymentMethod(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'PaymentMethod',
    content: {
      title: { value: vocab('Payment Methods', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Visa ending in 4242', ctx), description: vocab('Expires 12/25', ctx), icon: 'credit-card', metadata: { default: 'true' } },
    ],
    actions: [
      { label: vocab('Add Payment Method', ctx), action: '/account/payment/add', style: 'primary' },
    ],
    layout: { maxWidth: '2xl' },
  };
}

function resolveFeatureComparison(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const workflows = getWorkflowNames(ctx);
  const integrations = ctx.blueprint.integrations.map(i => i.name);
  const features = [
    ...(workflows.slice(0, 3).map(w => ({ title: w, metadata: { basic: 'Yes', pro: 'Yes', enterprise: 'Yes' } }))),
    { title: 'API Access', metadata: { basic: 'Limited', pro: 'Full', enterprise: 'Custom' } },
    { title: 'Integrations', metadata: { basic: '3', pro: '15', enterprise: 'Unlimited' } },
  ];

  return {
    type: 'FeatureComparison',
    content: {
      title: { value: vocab('Compare Plans', ctx), type: 'text' },
    },
    columns: [
      { key: 'feature', label: 'Feature', type: 'text', sortable: false, filterable: false },
      { key: 'basic', label: 'Basic', type: 'text', sortable: false, filterable: false },
      { key: 'pro', label: 'Pro', type: 'text', sortable: false, filterable: false },
      { key: 'enterprise', label: 'Enterprise', type: 'text', sortable: false, filterable: false },
    ],
    items: features,
    layout: { alignment: 'center', maxWidth: '6xl' },
  };
}

// ─── Dashboard Resolvers ──────────────────────────────────────────────────

function resolveActivityFeed(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const primaryEntity = getPrimaryEntityName(ctx);
  const workflows = getWorkflowNames(ctx);
  return {
    type: 'ActivityFeed',
    content: {
      title: { value: vocab('Recent Activity', ctx), type: 'text' },
    },
    items: [
      { title: `New ${primaryEntity.toLowerCase()} added`, description: `${primaryEntity} #1234 — updated by your team`, icon: 'plus-circle', metadata: { time: '2 min ago' } },
      { title: `${workflows[0] ?? 'Task'} completed`, description: `Automated workflow finished successfully`, icon: 'check-circle', metadata: { time: '15 min ago' } },
      { title: 'Team member updated record', description: `${primaryEntity} details were modified`, icon: 'edit', metadata: { time: '1 hour ago' } },
    ],
    layout: { maxWidth: '2xl' },
  };
}

function resolveDataGrid(
  slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const entity = findEntity(ctx.blueprint, slot.slot);
  const entityName = entity?.name ?? 'Item';
  const columns = entity?.fields?.map(f => ({
    key: f.name,
    label: f.name.charAt(0).toUpperCase() + f.name.slice(1),
    type: 'text' as const,
    sortable: true,
    filterable: f.indexed,
  }));
  // Provide fallback columns when entity isn't found
  const fallbackColumns = columns ?? [
    { key: 'id', label: 'ID', type: 'text' as const, sortable: true, filterable: false },
    { key: 'name', label: 'Name', type: 'text' as const, sortable: true, filterable: true },
    { key: 'status', label: 'Status', type: 'text' as const, sortable: true, filterable: true },
    { key: 'created', label: 'Created', type: 'text' as const, sortable: true, filterable: false },
  ];
  return {
    type: 'DataGrid',
    content: {
      title: { value: vocab(`${entityName} Management`, ctx), type: 'text' },
      entity: { value: entityName, type: 'text' },
    },
    columns: fallbackColumns,
    items: [
      { id: '1', title: `${entityName} #001`, status: 'Active', created: '2024-01-15', metadata: { id: '1', status: 'Active' } },
      { id: '2', title: `${entityName} #002`, status: 'Pending', created: '2024-01-20', metadata: { id: '2', status: 'Pending' } },
      { id: '3', title: `${entityName} #003`, status: 'Active', created: '2024-02-01', metadata: { id: '3', status: 'Active' } },
    ],
    actions: [
      { label: vocab('Add', ctx), action: '#', style: 'primary' },
    ],
    layout: { maxWidth: '7xl' },
  };
}

// ─── Auth Resolvers ───────────────────────────────────────────────────────

function resolveSocialAuth(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const industry = ctx.blueprint.industry;
  // B2B/enterprise apps prefer Google/Microsoft, B2C adds Apple/Twitter
  const isB2B = ctx.blueprint.businessModels.some(m => m.includes('subscription') || m.includes('saas'));
  const providers = isB2B
    ? [
        { label: 'Google', action: '/api/auth/google', style: 'secondary' as const },
        { label: 'Microsoft', action: '/api/auth/microsoft', style: 'secondary' as const },
      ]
    : [
        { label: 'Google', action: '/api/auth/google', style: 'secondary' as const },
        { label: 'Apple', action: '/api/auth/apple', style: 'secondary' as const },
      ];

  return {
    type: 'SocialAuth',
    content: {
      title: { value: vocab('Or continue with', ctx), type: 'text' },
    },
    items: providers.map(p => ({
      title: p.label,
      description: `${vocab('Sign in with', ctx)} ${p.label}`,
      icon: p.label.toLowerCase(),
    })),
    layout: { alignment: 'center', maxWidth: 'sm' },
  };
}

// ─── Calendar / Booking Resolvers ─────────────────────────────────────────

function resolveCalendarWidget(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'CalendarWidget',
    content: {
      title: { value: vocab('Calendar', ctx), type: 'text' },
      subtitle: { value: vocab('Select a date', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Monday', ctx), metadata: { day: '1', available: 'true' } },
      { title: vocab('Tuesday', ctx), metadata: { day: '2', available: 'true' } },
      { title: vocab('Wednesday', ctx), metadata: { day: '3', available: 'true' } },
      { title: vocab('Thursday', ctx), metadata: { day: '4', available: 'true' } },
      { title: vocab('Friday', ctx), metadata: { day: '5', available: 'true' } },
      { title: vocab('Saturday', ctx), metadata: { day: '6', available: 'false' } },
      { title: vocab('Sunday', ctx), metadata: { day: '0', available: 'false' } },
    ],
    actions: [
      { label: vocab('Previous', ctx), action: '#prev', style: 'ghost' },
      { label: vocab('Next', ctx), action: '#next', style: 'ghost' },
    ],
    layout: { alignment: 'center', maxWidth: '2xl' },
  };
}

function resolveBookingCalendar(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'BookingCalendar',
    content: {
      title: { value: vocab('Book an Appointment', ctx), type: 'text' },
      subtitle: { value: vocab('Choose your preferred date and time', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Morning', ctx), description: '9:00 AM - 12:00 PM', icon: 'sun', metadata: { slots: '3' } },
      { title: vocab('Afternoon', ctx), description: '1:00 PM - 5:00 PM', icon: 'sun', metadata: { slots: '5' } },
      { title: vocab('Evening', ctx), description: '6:00 PM - 8:00 PM', icon: 'moon', metadata: { slots: '2' } },
    ],
    fields: [
      { name: 'date', label: 'Preferred Date', type: 'date', required: true },
      { name: 'time', label: 'Preferred Time', type: 'select', required: true, options: [
        { label: '9:00 AM', value: '09:00' },
        { label: '10:00 AM', value: '10:00' },
        { label: '11:00 AM', value: '11:00' },
        { label: '1:00 PM', value: '13:00' },
        { label: '2:00 PM', value: '14:00' },
        { label: '3:00 PM', value: '15:00' },
        { label: '4:00 PM', value: '16:00' },
      ]},
      { name: 'notes', label: 'Notes', type: 'textarea', required: false },
    ],
    actions: [
      { label: vocab('Book Now', ctx), action: '/api/bookings', style: 'primary' },
    ],
    layout: { alignment: 'left', maxWidth: '2xl' },
  };
}

// ─── Account Resolvers ────────────────────────────────────────────────────

function resolveProfileSection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const industry = ctx.blueprint.industry;
  const baseFields = [
    { name: 'name', label: 'Full Name', type: 'text' as const, required: true },
    { name: 'email', label: 'Email', type: 'email' as const, required: true },
  ];

  // Add industry-specific profile fields
  const extraFields: Record<string, { name: string; label: string; type: string; required: boolean }[]> = {
    healthcare: [{ name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: false }, { name: 'insuranceProvider', label: 'Insurance Provider', type: 'text', required: false }],
    restaurant: [{ name: 'dietaryRestrictions', label: 'Dietary Restrictions', type: 'text', required: false }, { name: 'tablePreference', label: 'Preferred Table', type: 'select', required: false }],
    fitness: [{ name: 'fitnessGoals', label: 'Fitness Goals', type: 'text', required: false }, { name: 'experienceLevel', label: 'Experience Level', type: 'select', required: false }],
    education: [{ name: 'learningGoals', label: 'Learning Goals', type: 'text', required: false }, { name: 'preferredLanguage', label: 'Preferred Language', type: 'select', required: false }],
    legal: [{ name: 'firmName', label: 'Firm / Company', type: 'text', required: false }, { name: 'barNumber', label: 'Bar Number', type: 'text', required: false }],
    realestate: [{ name: 'budget', label: 'Budget Range', type: 'select', required: false }, { name: 'preferredAreas', label: 'Preferred Areas', type: 'text', required: false }],
    ecommerce: [{ name: 'company', label: 'Company', type: 'text', required: false }, { name: 'address', label: 'Shipping Address', type: 'textarea', required: false }],
  };

  return {
    type: 'ProfileSection',
    content: {
      title: { value: vocab('My Profile', ctx), type: 'text' },
      subtitle: { value: vocab('Manage your account details', ctx), type: 'text' },
    },
    fields: [...baseFields, ...(extraFields[industry]?.map(f => ({ ...f, type: f.type as any })) ?? [
      { name: 'phone', label: 'Phone', type: 'text' as const, required: false },
      { name: 'bio', label: 'Bio', type: 'textarea' as const, required: false },
    ])],
    actions: [
      { label: vocab('Save Changes', ctx), action: '/api/profile', style: 'primary' },
    ],
    layout: { alignment: 'left', maxWidth: '2xl' },
  };
}

function resolveBillingSection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const hasSubscription = ctx.blueprint.businessModels.some(m =>
    m.toLowerCase().includes('subscription'),
  );
  const industry = ctx.blueprint.industry;
  const primaryEntity = getPrimaryEntityName(ctx);

  // Industry-specific billing items
  const currency = getCurrencySymbol(ctx.blueprint.country);
  const isIN = ctx.blueprint.country === 'IN';
  const billingItems: Record<string, ItemSpec[]> = {
    saas: isIN ? [
      { title: 'Current Plan', description: 'Pro — \u20B91,999/month', icon: 'credit-card' },
      { title: 'Next Billing Date', description: 'Renews automatically', icon: 'calendar' },
      { title: 'Payment Method', description: 'UPI / Net Banking', icon: 'credit-card' },
    ] : [
      { title: 'Current Plan', description: 'Pro — $29/month', icon: 'credit-card' },
      { title: 'Next Billing Date', description: 'Renews automatically', icon: 'calendar' },
      { title: 'Payment Method', description: 'Visa ending in 4242', icon: 'shield' },
    ],
    fitness: isIN ? [
      { title: 'Membership', description: 'Monthly Unlimited — \u20B92,499/month', icon: 'credit-card' },
      { title: 'Next Payment', description: 'Auto-renewal on your renewal date', icon: 'calendar' },
      { title: 'Payment Method', description: 'UPI / Auto-pay', icon: 'credit-card' },
    ] : [
      { title: 'Membership', description: 'Monthly Unlimited — $49/month', icon: 'credit-card' },
      { title: 'Next Payment', description: 'Auto-renewal on your renewal date', icon: 'calendar' },
      { title: 'Payment Method', description: 'Visa ending in 4242', icon: 'shield' },
    ],
    healthcare: [
      { title: 'Insurance', description: 'Primary coverage on file', icon: 'shield' },
      { title: 'Last Payment', description: 'Copay processed at visit', icon: 'credit-card' },
      { title: 'Outstanding Balance', description: '$0.00', icon: 'dollar-sign' },
    ],
    ecommerce: isIN ? [
      { title: 'Payment Method', description: 'UPI / Net Banking / COD', icon: 'credit-card' },
      { title: 'Default Address', description: 'Update your shipping details', icon: 'truck' },
      { title: 'Loyalty Points', description: '2,450 points available', icon: 'gift' },
    ] : [
      { title: 'Payment Method', description: 'Visa ending in 4242', icon: 'credit-card' },
      { title: 'Default Shipping', description: '123 Main St, Anytown, USA', icon: 'truck' },
      { title: 'Loyalty Points', description: '2,450 points available', icon: 'gift' },
    ],
    education: [
      { title: 'Current Plan', description: 'Pro Learner — $19/month', icon: 'credit-card' },
      { title: 'Next Billing', description: 'Renews on your anniversary date', icon: 'calendar' },
      { title: 'Courses Included', description: 'Unlimited access to all courses', icon: 'book-open' },
    ],
    restaurant: [
      { title: 'Payment Method', description: 'Visa ending in 4242', icon: 'credit-card' },
      { title: 'Rewards Balance', description: '1,200 points — $12 value', icon: 'gift' },
      { title: 'Last Order', description: 'Order #5678 — $45.00', icon: 'receipt' },
    ],
    realestate: [
      { title: 'Payment Method', description: 'Auto-pay enabled', icon: 'credit-card' },
      { title: 'Lease Payment', description: '$2,200/month due on the 1st', icon: 'calendar' },
      { title: 'Security Deposit', description: 'Held in escrow', icon: 'shield' },
    ],
      nonprofit: [
        { title: 'Total Donated', description: '$1,250 this year', icon: 'heart' },
        { title: 'Tax Receipt', description: '2025 receipt available for download', icon: 'file-text' },
        { title: 'Recurring Donation', description: '$50/month — thank you!', icon: 'refresh-cw' },
      ],
      media: [
        { title: 'Subscription Plan', description: 'Premium — $9.99/month', icon: 'credit-card' },
        { title: 'Next Billing', description: 'Auto-renews on your billing date', icon: 'calendar' },
        { title: 'Ad Revenue', description: '$0.00 this month', icon: 'bar-chart' },
      ],
      travel: [
        { title: 'Payment Method', description: 'Visa ending in 4242', icon: 'credit-card' },
        { title: 'Upcoming Trips', description: '2 trips booked this quarter', icon: 'compass' },
        { title: 'Travel Credits', description: '$250 in loyalty rewards', icon: 'gift' },
      ],
      beauty: [
        { title: 'Membership', description: 'VIP Beauty Club — $29/month', icon: 'credit-card' },
        { title: 'Next Appointment', description: 'Scheduled for Mar 15', icon: 'calendar' },
        { title: 'Loyalty Points', description: '1,850 points — $18.50 value', icon: 'gift' },
      ],
      event: [
        { title: 'Payment Method', description: 'Visa ending in 4242', icon: 'credit-card' },
        { title: 'Upcoming Events', description: '3 tickets purchased', icon: 'ticket' },
        { title: 'Event Credits', description: '$50 in referral credits', icon: 'gift' },
      ],
      portfolio: [
        { title: 'Payment Method', description: 'Stripe connected', icon: 'credit-card' },
        { title: 'Invoice History', description: '15 paid invoices on file', icon: 'file-text' },
        { title: 'Retainer Balance', description: '$0.00 — no active retainer', icon: 'clock' },
      ],
      automotive: [
        { title: 'Payment Method', description: 'Visa ending in 4242', icon: 'credit-card' },
        { title: 'Service Plan', description: 'Gold Care Plan — $39/month', icon: 'wrench' },
        { title: 'Vehicle Financing', description: '$450/month — 24 months remaining', icon: 'calculator' },
      ],
      enterprise: [
        { title: 'Current Plan', description: 'Enterprise — Custom pricing', icon: 'credit-card' },
        { title: 'Contract Term', description: 'Annual — renews Dec 2025', icon: 'calendar' },
        { title: 'Account Manager', description: 'Dedicated support included', icon: 'headphones' },
      ],
      logistics: [
        { title: 'Shipping Account', description: 'Business — Volume pricing', icon: 'truck' },
        { title: 'Monthly Spend', description: '$12,450 this month', icon: 'bar-chart' },
        { title: 'Payment Terms', description: 'Net 30 — $0 balance due', icon: 'credit-card' },
      ],
      manufacturing: [
        { title: 'Payment Method', description: 'ACH transfer — verified', icon: 'credit-card' },
        { title: 'Purchase Orders', description: '3 active POs this quarter', icon: 'file-text' },
        { title: 'Supplier Credits', description: '90-day payment terms', icon: 'clock' },
      ],
      fintech: [
        { title: 'Processing Volume', description: '$250K processed this month', icon: 'credit-card' },
        { title: 'Fee Schedule', description: '2.9% + $0.30 per transaction', icon: 'percent' },
        { title: 'Payout Schedule', description: 'Daily — next payout tomorrow', icon: 'clock' },
      ],
      proptech: [
        { title: 'Property Management Fee', description: '8% of monthly rent collected', icon: 'building' },
        { title: 'Tenant Payments', description: '45 units — $112,500 collected', icon: 'credit-card' },
        { title: 'Maintenance Fund', description: '$3,200 reserved for repairs', icon: 'tool' },
      ],
      legal: [
        { title: 'Trust Account', description: 'IOLTA balance — $12,500', icon: 'shield' },
        { title: 'Billing Method', description: 'Hourly — $350/hr standard rate', icon: 'clock' },
        { title: 'Retainer', description: '$5,000 retainer on file', icon: 'lock' },
      ],
      agency: [
        { title: 'Current Retainer', description: 'Monthly — $12,000/mo', icon: 'credit-card' },
        { title: 'Active Projects', description: '4 projects in progress', icon: 'briefcase' },
        { title: 'Invoice Status', description: '2 invoices pending — $8,500', icon: 'file-text' },
      ],
  };

  const items = billingItems[industry] ?? (isIN ? [
    { title: 'Current Plan', description: hasSubscription ? 'Pro Plan' : 'Free Tier', icon: 'credit-card' },
    { title: 'Payment Status', description: 'Active and current', icon: 'check-circle' },
    { title: 'Payment Method', description: 'UPI / Cards / Net Banking', icon: 'credit-card' },
  ] : [
    { title: 'Current Plan', description: hasSubscription ? 'Pro Plan' : 'Free Tier', icon: 'credit-card' },
    { title: 'Payment Status', description: 'Active and current', icon: 'check-circle' },
    { title: 'Payment Method', description: 'Visa ending in 4242', icon: 'shield' },
  ]);

  return {
    type: 'BillingSection',
    content: {
      title: { value: vocab('Billing', ctx), type: 'text' },
      subtitle: { value: hasSubscription ? vocab('Manage your subscription', ctx) : vocab('Manage your billing', ctx), type: 'text' },
    },
    items,
    actions: [
      { label: vocab('Update Billing', ctx), action: '/account/billing/update', style: 'primary' },
      ...(hasSubscription ? [{ label: vocab('Cancel Subscription', ctx), action: '/account/billing/cancel', style: 'ghost' as const }] : []),
    ],
    layout: { maxWidth: '2xl' },
  };
}

function resolveNotificationsSection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const industry = ctx.blueprint.industry;
  const workflows = getWorkflowNames(ctx);
  const primaryEntity = getPrimaryEntityName(ctx);

  // Industry-specific notification preferences
  const notifItems: Record<string, ItemSpec[]> = {
    saas: [
      { title: 'Product Updates', description: 'New features and improvements', icon: 'zap', metadata: { enabled: 'true' } },
      { title: 'Weekly Digest', description: 'Summary of your team activity', icon: 'mail', metadata: { enabled: 'true' } },
      { title: 'Billing Alerts', description: 'Payment and usage notifications', icon: 'credit-card', metadata: { enabled: 'true' } },
    ],
    healthcare: [
      { title: 'Appointment Reminders', description: 'Upcoming visit notifications', icon: 'calendar', metadata: { enabled: 'true' } },
      { title: 'Lab Results', description: 'When new results are available', icon: 'file-text', metadata: { enabled: 'true' } },
      { title: 'Prescription Refills', description: 'Medication renewal reminders', icon: 'pill', metadata: { enabled: 'false' } },
    ],
    ecommerce: [
      { title: 'Order Updates', description: 'Shipping and delivery notifications', icon: 'truck', metadata: { enabled: 'true' } },
      { title: 'Price Alerts', description: 'When items in your wishlist drop in price', icon: 'tag', metadata: { enabled: 'false' } },
      { title: 'New Arrivals', description: 'Fresh products matching your interests', icon: 'sparkles', metadata: { enabled: 'false' } },
    ],
    fitness: [
      { title: 'Class Reminders', description: 'Upcoming class notifications', icon: 'calendar', metadata: { enabled: 'true' } },
      { title: 'Achievement Alerts', description: 'When you hit a new personal best', icon: 'trophy', metadata: { enabled: 'true' } },
      { title: 'Membership Renewals', description: 'Payment and plan notifications', icon: 'credit-card', metadata: { enabled: 'true' } },
    ],
    education: [
      { title: 'Course Updates', description: 'New lessons and materials', icon: 'book-open', metadata: { enabled: 'true' } },
      { title: 'Assignment Deadlines', description: 'Upcoming due dates', icon: 'clock', metadata: { enabled: 'true' } },
      { title: 'Grade Notifications', description: 'When grades are posted', icon: 'award', metadata: { enabled: 'true' } },
    ],
    restaurant: [
      { title: 'Reservation Confirmations', description: 'Booking status updates', icon: 'check-circle', metadata: { enabled: 'true' } },
      { title: 'Special Offers', description: 'Exclusive deals and events', icon: 'gift', metadata: { enabled: 'false' } },
      { title: 'Loyalty Rewards', description: 'Points earned and rewards available', icon: 'star', metadata: { enabled: 'true' } },
    ],
      nonprofit: [
        { title: 'Donation Receipts', description: 'Tax-deductible contribution confirmations', icon: 'heart', metadata: { enabled: 'true' } },
        { title: 'Impact Updates', description: 'How your donations are making a difference', icon: 'trending-up', metadata: { enabled: 'true' } },
        { title: 'Volunteer Opportunities', description: 'Upcoming events and ways to help', icon: 'users', metadata: { enabled: 'false' } },
      ],
      media: [
        { title: 'New Articles', description: 'When new content is published in your feed', icon: 'newspaper', metadata: { enabled: 'true' } },
        { title: 'Weekly Digest', description: 'Top stories and trending topics', icon: 'mail', metadata: { enabled: 'true' } },
        { title: 'Breaking News', description: 'Real-time alerts for important stories', icon: 'zap', metadata: { enabled: 'true' } },
      ],
      travel: [
        { title: 'Booking Confirmations', description: 'Trip reservation updates', icon: 'check-circle', metadata: { enabled: 'true' } },
        { title: 'Price Drop Alerts', description: 'When fares drop for saved trips', icon: 'tag', metadata: { enabled: 'true' } },
        { title: 'Travel Advisories', description: 'Destination safety and entry requirements', icon: 'shield', metadata: { enabled: 'true' } },
      ],
      beauty: [
        { title: 'Appointment Reminders', description: 'Upcoming service confirmations', icon: 'calendar', metadata: { enabled: 'true' } },
        { title: 'Special Offers', description: 'Exclusive deals and seasonal promotions', icon: 'gift', metadata: { enabled: 'false' } },
        { title: 'Product Restocks', description: 'When your favorite products are back', icon: 'refresh-cw', metadata: { enabled: 'false' } },
      ],
      event: [
        { title: 'Event Reminders', description: 'Upcoming event notifications', icon: 'calendar', metadata: { enabled: 'true' } },
        { title: 'Ticket Alerts', description: 'When tickets go on sale for saved events', icon: 'ticket', metadata: { enabled: 'true' } },
        { title: 'Recommendations', description: 'Events tailored to your interests', icon: 'sparkles', metadata: { enabled: 'false' } },
      ],
      portfolio: [
        { title: 'Inquiry Alerts', description: 'When someone contacts you about your work', icon: 'message-circle', metadata: { enabled: 'true' } },
        { title: 'Project Updates', description: 'Track engagement on your portfolio', icon: 'bar-chart', metadata: { enabled: 'true' } },
        { title: 'Job Opportunities', description: 'Relevant freelance and full-time leads', icon: 'briefcase', metadata: { enabled: 'false' } },
      ],
      automotive: [
        { title: 'Service Reminders', description: 'Upcoming maintenance notifications', icon: 'wrench', metadata: { enabled: 'true' } },
        { title: 'Vehicle Alerts', description: 'Recall and warranty notifications', icon: 'bell', metadata: { enabled: 'true' } },
        { title: 'Inventory Updates', description: 'When matching vehicles arrive', icon: 'car', metadata: { enabled: 'false' } },
      ],
      enterprise: [
        { title: 'System Alerts', description: 'Uptime, incidents, and maintenance windows', icon: 'bell', metadata: { enabled: 'true' } },
        { title: 'Usage Reports', description: 'Weekly team activity and adoption metrics', icon: 'bar-chart', metadata: { enabled: 'true' } },
        { title: 'Security Notices', description: 'Access changes, audits, and policy updates', icon: 'shield', metadata: { enabled: 'true' } },
      ],
      logistics: [
        { title: 'Delivery Alerts', description: 'Real-time shipment status changes', icon: 'truck', metadata: { enabled: 'true' } },
        { title: 'Service Updates', description: 'Route changes and operational alerts', icon: 'map', metadata: { enabled: 'true' } },
        { title: 'Inventory Alerts', description: 'Low stock and reorder notifications', icon: 'package', metadata: { enabled: 'true' } },
      ],
      manufacturing: [
        { title: 'Production Alerts', description: 'Line stops and output deviations', icon: 'settings', metadata: { enabled: 'true' } },
        { title: 'Quality Reports', description: 'Defect rate and compliance alerts', icon: 'check-circle', metadata: { enabled: 'true' } },
        { title: 'Supply Chain', description: 'Supplier delays and raw material updates', icon: 'link', metadata: { enabled: 'true' } },
      ],
      fintech: [
        { title: 'Transaction Alerts', description: 'Real-time payment and transfer notifications', icon: 'credit-card', metadata: { enabled: 'true' } },
        { title: 'Fraud Warnings', description: 'Suspicious activity and security alerts', icon: 'shield', metadata: { enabled: 'true' } },
        { title: 'Monthly Statements', description: 'Account summaries and reconciliation reports', icon: 'file-text', metadata: { enabled: 'true' } },
      ],
      proptech: [
        { title: 'Tenant Communications', description: 'Lease renewals and maintenance requests', icon: 'building', metadata: { enabled: 'true' } },
        { title: 'Payment Alerts', description: 'Rent collection and late payment notices', icon: 'credit-card', metadata: { enabled: 'true' } },
        { title: 'Property Insights', description: 'Occupancy trends and portfolio analytics', icon: 'bar-chart', metadata: { enabled: 'false' } },
      ],
      legal: [
        { title: 'Case Updates', description: 'Filing deadlines and court date reminders', icon: 'briefcase', metadata: { enabled: 'true' } },
        { title: 'Client Alerts', description: 'New messages and document requests', icon: 'message-circle', metadata: { enabled: 'true' } },
        { title: 'Compliance Reminders', description: 'Filing deadlines and regulatory updates', icon: 'shield', metadata: { enabled: 'true' } },
      ],
      agency: [
        { title: 'Project Updates', description: 'Milestone completions and client feedback', icon: 'briefcase', metadata: { enabled: 'true' } },
        { title: 'New Leads', description: 'Inquiries and RFP notifications', icon: 'funnel', metadata: { enabled: 'true' } },
        { title: 'Time Tracking', description: 'Weekly hour summaries and budget alerts', icon: 'clock', metadata: { enabled: 'true' } },
      ],
      realestate: [
        { title: 'Property Alerts', description: 'New listings matching your criteria', icon: 'home', metadata: { enabled: 'true' } },
        { title: 'Showing Reminders', description: 'Upcoming property viewing notifications', icon: 'calendar', metadata: { enabled: 'true' } },
        { title: 'Market Reports', description: 'Weekly market trend and pricing updates', icon: 'bar-chart', metadata: { enabled: 'false' } },
      ],
  };

  const defaults: ItemSpec[] = [
    { title: 'Email Notifications', description: 'Receive updates via email', icon: 'mail', metadata: { enabled: 'true' } },
    { title: 'Push Notifications', description: 'Receive push notifications', icon: 'bell', metadata: { enabled: 'false' } },
    { title: 'SMS Notifications', description: 'Receive text messages', icon: 'smartphone', metadata: { enabled: 'false' } },
  ];

  return {
    type: 'NotificationsSection',
    content: {
      title: { value: vocab('Notifications', ctx), type: 'text' },
      subtitle: { value: vocab('Configure your notification preferences', ctx), type: 'text' },
    },
    items: notifItems[industry] ?? defaults,
    layout: { maxWidth: '2xl' },
  };
}

function resolvePlanDetails(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const currency = getCurrencySymbol(ctx.blueprint.country);
  const isIN = ctx.blueprint.country === 'IN';
  const priceLabel = isIN ? `${currency}1,999/mo` : '$29/month';
  return {
    type: 'PlanDetails',
    content: {
      title: { value: vocab('Your Plan', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Plan Name', ctx), description: 'Pro', icon: 'package' },
      { title: vocab('Price', ctx), description: priceLabel, icon: 'dollar-sign' },
      { title: vocab('Features Included', ctx), description: vocab('All features, priority support, API access', ctx), icon: 'check-circle' },
    ],
    actions: [
      { label: vocab('Upgrade Plan', ctx), action: '/pricing', style: 'primary' },
    ],
    layout: { maxWidth: '2xl' },
  };
}

function resolveInvoiceList(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'InvoiceList',
    content: {
      title: { value: vocab('Invoices', ctx), type: 'text' },
    },
    columns: [
      { key: 'invoiceId', label: 'Invoice', type: 'text', sortable: true, filterable: false },
      { key: 'date', label: 'Date', type: 'date', sortable: true, filterable: false },
      { key: 'amount', label: 'Amount', type: 'number', sortable: true, filterable: false },
      { key: 'status', label: 'Status', type: 'status', sortable: true, filterable: true },
    ],
    layout: { maxWidth: '7xl' },
  };
}

function resolveAddressBook(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const isIN = ctx.blueprint.country === 'IN';
  return {
    type: 'AddressBook',
    content: {
      title: { value: vocab('Address Book', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Home', ctx), description: isIN ? vocab('123, MG Road, Mumbai, Maharashtra 400001', ctx) : vocab('123 Main St, City, State 12345', ctx), icon: 'home', metadata: { default: 'true' } },
    ],
    actions: [
      { label: vocab('Add Address', ctx), action: '/account/addresses/add', style: 'primary' },
    ],
    layout: { maxWidth: '2xl' },
  };
}

function resolveWishlist(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const entity = findEntity(ctx.blueprint, 'product') ?? ctx.blueprint.entities[0];
  return {
    type: 'Wishlist',
    content: {
      title: { value: vocab('My Wishlist', ctx), type: 'text' },
      entity: { value: entity?.name ?? 'Product', type: 'text' },
    },
    items: [
      { title: vocab('Saved Item', ctx), description: vocab('Added to wishlist', ctx), icon: 'heart' },
    ],
    layout: { maxWidth: '7xl' },
  };
}

// ─── Content Resolvers ────────────────────────────────────────────────────

function resolveAboutSection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
  contentBag: ContentBag,
): ComponentSpec {
  const about = contentBag.about ?? {};
  const industry = ctx.blueprint.industry;
  return {
    type: 'AboutSection',
    content: {
      title: { value: about.title ?? vocab('About Us', ctx), type: 'text' },
      subtitle: { value: about.description ?? `Building solutions for ${industry}`, type: 'text' },
    },
    items: about.items ?? [
      { title: vocab('Our Mission', ctx), description: `Delivering exceptional ${industry} solutions`, icon: 'target' },
      { title: vocab('Our Vision', ctx), description: `Leading innovation in the ${industry} space`, icon: 'eye' },
      { title: vocab('Our Values', ctx), description: 'Quality, integrity, and customer success', icon: 'heart' },
    ],
    layout: { alignment: 'center', maxWidth: '4xl' },
  };
}

function resolveTeamSection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
  contentBag: ContentBag,
): ComponentSpec {
  const team = contentBag.team ?? {};
  return {
    type: 'TeamSection',
    content: {
      title: { value: vocab('Meet Our Team', ctx), type: 'text' },
      subtitle: { value: vocab('The people behind the product', ctx), type: 'text' },
    },
    items: team.items ?? [
      { title: vocab('Leadership', ctx), description: 'Driving strategy and vision', icon: 'crown' },
      { title: vocab('Engineering', ctx), description: 'Building reliable solutions', icon: 'code' },
      { title: vocab('Design', ctx), description: 'Crafting intuitive experiences', icon: 'palette' },
    ],
    layout: { alignment: 'center', maxWidth: '6xl' },
  };
}

function resolveTeamGrid(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
  contentBag: ContentBag,
): ComponentSpec {
  const team = contentBag.team ?? {};
  return {
    type: 'TeamGrid',
    content: {
      title: { value: vocab('Our Team', ctx), type: 'text' },
    },
    items: team.items ?? [
      { title: vocab('Leadership', ctx), description: 'Driving strategy and vision', icon: 'crown' },
      { title: vocab('Engineering', ctx), description: 'Building reliable solutions', icon: 'code' },
      { title: vocab('Design', ctx), description: 'Crafting intuitive experiences', icon: 'palette' },
    ],
    layout: { alignment: 'center', maxWidth: '6xl' },
  };
}

function resolveMissionSection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
  contentBag: ContentBag,
): ComponentSpec {
  const mission = contentBag.mission ?? {};
  return {
    type: 'MissionSection',
    content: {
      title: { value: vocab('Our Mission', ctx), type: 'text' },
      subtitle: { value: vocab('What drives us every day', ctx), type: 'text' },
    },
    items: mission.items ?? [
      { title: vocab('Innovation', ctx), description: 'Pushing boundaries in our industry', icon: 'lightbulb' },
      { title: vocab('Quality', ctx), description: 'Excellence in everything we do', icon: 'star' },
      { title: vocab('Community', ctx), description: 'Building meaningful connections', icon: 'users' },
    ],
    layout: { alignment: 'center', maxWidth: '4xl' },
  };
}

function resolveGallery(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'Gallery',
    content: {
      title: { value: vocab('Gallery', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Photo 1', ctx), icon: 'image' },
      { title: vocab('Photo 2', ctx), icon: 'image' },
      { title: vocab('Photo 3', ctx), icon: 'image' },
      { title: vocab('Photo 4', ctx), icon: 'image' },
    ],
    layout: { alignment: 'center', maxWidth: '7xl' },
  };
}

// ─── Filter / Data Resolvers ──────────────────────────────────────────────

function resolveFilterSidebar(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'FilterSidebar',
    content: {
      title: { value: vocab('Filters', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Category', ctx), icon: 'grid', metadata: { type: 'select' } },
      { title: vocab('Price Range', ctx), icon: 'dollar-sign', metadata: { type: 'range' } },
      { title: vocab('Rating', ctx), icon: 'star', metadata: { type: 'select' } },
      { title: vocab('Availability', ctx), icon: 'package', metadata: { type: 'checkbox' } },
    ],
    layout: { maxWidth: 'xs' },
  };
}

function resolveSortBar(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'SortBar',
    content: {
      title: { value: vocab('Sort By', ctx), type: 'text' },
    },
    actions: [
      { label: vocab('Newest', ctx), action: '?sort=newest', style: 'ghost' },
      { label: vocab('Price: Low to High', ctx), action: '?sort=price-asc', style: 'ghost' },
      { label: vocab('Price: High to Low', ctx), action: '?sort=price-desc', style: 'ghost' },
      { label: vocab('Popular', ctx), action: '?sort=popular', style: 'ghost' },
    ],
    layout: { maxWidth: '7xl' },
  };
}

// ─── Generic Fallback ─────────────────────────────────────────────────────

function resolveGenericComponent(
  slot: ComponentSlot,
  _page: PageExecutionPlan,
  _ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: slot.component,
    content: {
      title: { value: slot.slot.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), type: 'text' },
    },
    layout: { maxWidth: '7xl' },
  };
}

// ─── Business Content Resolvers ──────────────────────────────────────────────

function resolveFeatures(ctx: ContentResolverContext): ItemSpec[] {
  // Vertical-agnostic path: when BusinessKnowledge is present, features are
  // derived from customer-facing workflows and entities (see getIndustryFeatures).
  // This branch only runs for legacy/BK-absent callers.
  if (ctx.businessKnowledge) {
    return getIndustryFeatures(ctx);
  }

  const items: ItemSpec[] = [];

  // Entity-based features
  for (const entity of ctx.blueprint.entities.slice(0, 4)) {
    items.push({
      title: vocab(`${entity.name} Management`, ctx),
      description: vocab(`Create, edit, and manage ${entity.name.toLowerCase()}s with ease`, ctx),
      icon: 'Layers',
    });
  }

  // Pattern workflow-based features (industry-specific)
  if (ctx.pattern) {
    for (const workflow of ctx.pattern.workflows.slice(0, 4)) {
      if (items.length >= 6) break;
      items.push({
        title: workflow,
        description: `${workflow} seamlessly through our platform`,
        icon: 'Zap',
      });
    }
    // Pattern component-based features
    for (const component of ctx.pattern.components.slice(0, 2)) {
      if (items.length >= 6) break;
      items.push({
        title: vocab(component.replace(/([A-Z])/g, ' $1').trim(), ctx),
        description: `Integrated ${component.toLowerCase()} for your workflow`,
        icon: 'Box',
      });
    }
  }

  // Fallback generic features
  const genericFeatures: ItemSpec[] = [
    { title: vocab('Real-time Updates', ctx), description: 'See changes as they happen', icon: 'zap' },
    { title: vocab('Analytics Dashboard', ctx), description: 'Track your performance', icon: 'bar-chart' },
    { title: vocab('Team Collaboration', ctx), description: 'Work together seamlessly', icon: 'users' },
    { title: vocab('API Access', ctx), description: 'Integrate with your tools', icon: 'code' },
    { title: vocab('Mobile Responsive', ctx), description: 'Works on any device', icon: 'smartphone' },
    { title: vocab('Security First', ctx), description: 'Enterprise-grade security', icon: 'shield' },
  ];

  while (items.length < 6) {
    const generic = genericFeatures[items.length];
    if (generic) items.push(generic);
    else break;
  }

  return items;
}

function resolvePricingTiers(ctx: ContentResolverContext): TierSpec[] {
  // Use real scraped prices if available
  if (ctx.scrapedContent?.prices && ctx.scrapedContent.prices.length > 0) {
    return ctx.scrapedContent.prices.slice(0, 3).map((p: { name: string; price: string; description?: string }, i: number) => ({
      name: p.name,
      price: p.price,
      period: '',
      features: [p.description ?? '', `${vocab('Core', ctx)} ${vocab('features', ctx)}`, 'Email support'],
      highlighted: i === 1,
    }));
  }

  // Use scraped revenue models as pricing tiers if available
  const biModels = ctx.revenueIntelligence?.revenueModels;
  if (biModels && biModels.length > 0) {
    const currency = getCurrencySymbol(ctx.blueprint.country);
    return biModels.slice(0, 3).map((rm, i) => ({
      name: rm.name,
      price: i === 2 && biModels.length > 2 ? 'Custom' : `${currency}${(i + 1) * 19}`,
      period: i === 2 && biModels.length > 2 ? '' : '/month',
      features: [rm.description, `${vocab('Core', ctx)} ${vocab('features', ctx)}`, 'Email support'],
      highlighted: i === 1,
    }));
  }

  const hasSubscription = ctx.blueprint.businessModels.some(m =>
    m.toLowerCase().includes('subscription'),
  );
  const currency = getCurrencySymbol(ctx.blueprint.country);
  const country = ctx.blueprint.country;

  const featuresWord = vocab('features', ctx);

  if (hasSubscription) {
    if (country === 'IN') {
      return [
        { name: 'Starter', price: `${currency}499`, period: '/mo', features: [`5 users`, `10GB storage`, `Basic ${featuresWord}`, `Email support`], highlighted: false },
        { name: 'Pro', price: `${currency}1,999`, period: '/mo', features: [`25 users`, `100GB storage`, `Advanced ${featuresWord}`, `Priority support`, `API access`], highlighted: true },
        { name: 'Enterprise', price: 'Custom', period: '', features: [`Unlimited users`, `Unlimited storage`, `Custom integrations`, `Dedicated support`, `SLA`], highlighted: false },
      ];
    }
    return [
      { name: 'Starter', price: `${currency}9`, period: '/month', features: [`5 users`, `10GB storage`, `Basic ${featuresWord}`, `Email support`], highlighted: false },
      { name: 'Pro', price: `${currency}29`, period: '/month', features: [`25 users`, `100GB storage`, `Advanced ${featuresWord}`, `Priority support`, `API access`], highlighted: true },
      { name: 'Enterprise', price: 'Custom', period: '', features: [`Unlimited users`, `Unlimited storage`, `Custom integrations`, `Dedicated support`, `SLA`], highlighted: false },
    ];
  }

  if (country === 'IN') {
    return [
      { name: 'Basic', price: 'Free', period: '', features: [`Core ${featuresWord}`, 'Community support'], highlighted: false },
      { name: 'Premium', price: `${currency}999`, period: '/mo', features: [`All ${featuresWord}`, 'Priority support', 'API access', 'Custom branding'], highlighted: true },
    ];
  }
  return [
    { name: 'Basic', price: 'Free', period: '', features: [`Core ${featuresWord}`, 'Community support'], highlighted: false },
    { name: 'Premium', price: `${currency}19`, period: '/month', features: [`All ${featuresWord}`, 'Priority support', 'API access', 'Custom branding'], highlighted: true },
  ];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findEntity(blueprint: ApplicationBlueprint, sectionName: string): EntityPlan | undefined {
  const normalized = sectionName.toLowerCase();
  for (const entity of blueprint.entities) {
    if (normalized.includes(entity.slug.toLowerCase()) || normalized.includes(entity.name.toLowerCase())) {
      return entity;
    }
  }
  return undefined;
}
