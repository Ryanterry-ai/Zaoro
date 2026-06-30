/**
 * ContentResolver — fills business content into component specs.
 *
 * This is where business intelligence meets component structure.
 * It takes an Execution Blueprint (which components) and produces
 * an Application Spec (what each component displays).
 *
 * ALL content comes from structured knowledge — zero LLM calls.
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
import { stageLogger } from '../core/debug-logger.js';

const log = stageLogger('resolve');

// ─── Vocabulary Helper ────────────────────────────────────────────────────────

/**
 * Apply vocabulary replacements to a string.
 * e.g. "All Products" → "All Dishes" for a restaurant.
 */
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
}

/**
 * Resolve an Execution Blueprint into an Application Spec.
 * Fills all content from structured business knowledge.
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
  const pages = execBlueprint.pages.map(page =>
    resolvePageSpec(page, ctx),
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

// ─── Page Resolution ─────────────────────────────────────────────────────────

function resolvePageSpec(
  page: PageExecutionPlan,
  ctx: ContentResolverContext,
): PageSpec {
  const components = page.slots.map(slot =>
    resolveComponentSpec(slot, page, ctx),
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
): ComponentSpec {
  const resolver = COMPONENT_RESOLVERS[slot.component] ?? resolveGenericComponent;
  return resolver(slot, page, ctx);
}

// ─── Individual Component Resolvers ──────────────────────────────────────────

type ComponentResolver = (
  slot: ComponentSlot,
  page: PageExecutionPlan,
  ctx: ContentResolverContext,
) => ComponentSpec;

const COMPONENT_RESOLVERS: Record<string, ComponentResolver> = {
  HeroBanner: resolveHeroBanner,
  FeatureGrid: resolveFeatureGrid,
  ProductGrid: resolveProductGrid,
  PricingTable: resolvePricingTable,
  Testimonials: resolveTestimonials,
  CTASection: resolveCTASection,
  FAQSection: resolveFAQSection,
  StatsCards: resolveStatsCards,
  ChartsPanel: resolveChartsPanel,
  AuthForm: resolveAuthForm,
  ContactForm: resolveContactForm,
  DataTable: resolveDataTable,
  Footer: resolveFooter,
};

function resolveHeroBanner(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const ctaLabel = ctx.pattern?.workflows[0]
    ? `Start ${ctx.pattern.workflows[0]}`
    : vocab('Get Started', ctx);

  return {
    type: 'HeroBanner',
    content: {
      title: { value: ctx.blueprint.name, type: 'text' },
      subtitle: { value: ctx.blueprint.description ?? `${ctx.blueprint.industry} platform`, type: 'text' },
      badge: { value: ctx.blueprint.industry, type: 'text' },
    },
    actions: [
      { label: ctaLabel, action: '/signup', style: 'primary' },
      { label: vocab('Learn More', ctx), action: '#features', style: 'ghost' },
    ],
    layout: { alignment: 'center', maxWidth: '4xl', padding: 'lg' },
  };
}

function resolveFeatureGrid(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'FeatureGrid',
    content: {
      title: { value: vocab('Features', ctx), type: 'text' },
      subtitle: { value: vocab('Everything you need', ctx), type: 'text' },
    },
    items: resolveFeatures(ctx),
    layout: { alignment: 'center', maxWidth: '7xl' },
  };
}

function resolveProductGrid(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const entity = findEntity(ctx.blueprint, 'product') ?? ctx.blueprint.entities[0];
  return {
    type: 'ProductGrid',
    content: {
      title: { value: vocab('All Products', ctx), type: 'text' },
      subtitle: { value: vocab('Browse our collection', ctx), type: 'text' },
      entity: { value: entity?.name ?? 'Product', type: 'text' },
    },
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
): ComponentSpec {
  return {
    type: 'PricingTable',
    content: {
      title: { value: vocab('Pricing', ctx), type: 'text' },
      subtitle: { value: vocab('Choose your plan', ctx), type: 'text' },
    },
    tiers: resolvePricingTiers(ctx),
    layout: { alignment: 'center', maxWidth: '6xl' },
  };
}

function resolveTestimonials(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  // Derive industry-specific role titles from pattern or vocabulary
  const roleTitle = ctx.pattern
    ? ctx.pattern.compatibleIndustries[0]?.charAt(0).toUpperCase() + (ctx.pattern.compatibleIndustries[0]?.slice(1) ?? '')
    : vocab('User', ctx);

  return {
    type: 'Testimonials',
    content: {
      title: { value: vocab('What Our Users Say', ctx), type: 'text' },
      subtitle: { value: vocab('Trusted by thousands', ctx), type: 'text' },
    },
    items: [
      { title: 'Alex Rivera', description: `${roleTitle} Owner`, metadata: { quote: `This platform transformed how I run my ${vocab('business', ctx)}. Highly recommended!` } },
      { title: 'Jordan Lee', description: `Operations Lead`, metadata: { quote: `The best ${vocab('product', ctx)} we have used. Clean, fast, and reliable.` } },
      { title: 'Sam Patel', description: `Manager`, metadata: { quote: `Our team productivity increased by 40% since switching.` } },
    ],
    layout: { alignment: 'center', maxWidth: '7xl' },
  };
}

function resolveCTASection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const ctaLabel = ctx.pattern?.workflows[0]
    ? ctx.pattern.workflows[0]
    : vocab('Get Started Free', ctx);

  return {
    type: 'CTASection',
    content: {
      title: { value: vocab('Ready to get started?', ctx), type: 'text' },
      subtitle: { value: `Join ${ctx.blueprint.name} today`, type: 'text' },
    },
    actions: [
      { label: ctaLabel, action: '/signup', style: 'primary' },
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
): ComponentSpec {
  const stats: StatSpec[] = [];
  for (const entity of ctx.blueprint.entities.slice(0, 4)) {
    stats.push({ label: `Total ${entity.name}s`, value: '0', change: '+0%', trend: 'neutral' });
  }
  if (stats.length < 4) {
    stats.push(
      { label: vocab('Active Users', ctx), value: '0', change: '+0%', trend: 'neutral' },
      { label: vocab('Revenue', ctx), value: '$0', change: '+0%', trend: 'neutral' },
    );
  }
  return { type: 'StatsCards', stats, layout: { maxWidth: '7xl' } };
}

function resolveChartsPanel(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'ChartsPanel',
    content: { title: { value: vocab('Analytics', ctx), type: 'text' } },
    items: ctx.blueprint.charts.slice(0, 4).map(c => ({
      title: c.title,
      description: `Chart type: ${c.type}`,
      metadata: { chartType: c.type, dataEntity: c.dataEntity ?? '' },
    })),
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
  return {
    type: 'DataTable',
    content: { entity: { value: entity?.name ?? 'Item', type: 'text' } },
    columns: entity?.fields.map(f => ({
      key: f.name,
      label: f.name.charAt(0).toUpperCase() + f.name.slice(1),
      type: 'text' as const,
      sortable: true,
      filterable: f.indexed,
    })),
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
      tagline: { value: ctx.blueprint.description ?? '', type: 'text' },
    },
    items: ctx.blueprint.navigation.items.map(i => ({
      title: i.label,
      metadata: { href: i.href },
    })),
    layout: { maxWidth: '7xl' },
  };
}

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
  const items: ItemSpec[] = [];

  // Entity-based features
  for (const entity of ctx.blueprint.entities.slice(0, 4)) {
    items.push({
      title: vocab(`${entity.name} Management`, ctx),
      description: vocab(`Create, edit, and manage ${entity.name.toLowerCase()}s with ease`, ctx),
      icon: 'layers',
    });
  }

  // Pattern workflow-based features (industry-specific)
  if (ctx.pattern) {
    for (const workflow of ctx.pattern.workflows.slice(0, 4)) {
      if (items.length >= 6) break;
      items.push({
        title: workflow,
        description: `${workflow} seamlessly through our platform`,
        icon: 'zap',
      });
    }
    // Pattern component-based features
    for (const component of ctx.pattern.components.slice(0, 2)) {
      if (items.length >= 6) break;
      items.push({
        title: vocab(component.replace(/([A-Z])/g, ' $1').trim(), ctx),
        description: `Integrated ${component.toLowerCase()} for your workflow`,
        icon: 'box',
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
  const hasSubscription = ctx.blueprint.businessModels.some(m =>
    m.toLowerCase().includes('subscription'),
  );

  const priceWord = vocab('price', ctx);
  const featuresWord = vocab('features', ctx);

  if (hasSubscription) {
    return [
      { name: 'Starter', price: '$9', period: '/month', features: [`5 users`, `10GB storage`, `Basic ${featuresWord}`, `Email support`], highlighted: false },
      { name: 'Pro', price: '$29', period: '/month', features: [`25 users`, `100GB storage`, `Advanced ${featuresWord}`, `Priority support`, `API access`], highlighted: true },
      { name: 'Enterprise', price: 'Custom', period: '', features: [`Unlimited users`, `Unlimited storage`, `Custom integrations`, `Dedicated support`, `SLA`], highlighted: false },
    ];
  }

  return [
    { name: 'Basic', price: 'Free', period: '', features: [`Core ${featuresWord}`, 'Community support'], highlighted: false },
    { name: 'Premium', price: '$19', period: '/month', features: [`All ${featuresWord}`, 'Priority support', 'API access', 'Custom branding'], highlighted: true },
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
