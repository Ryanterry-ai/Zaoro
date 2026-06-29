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
import { stageLogger } from '../core/debug-logger.js';

const log = stageLogger('resolve');

// ─── Content Resolver ────────────────────────────────────────────────────────

export interface ContentResolverContext {
  blueprint: ApplicationBlueprint;
  vocabulary: Record<string, string>;
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
  return {
    type: 'HeroBanner',
    content: {
      title: { value: ctx.blueprint.name, type: 'text' },
      subtitle: { value: ctx.blueprint.description ?? `${ctx.blueprint.industry} platform`, type: 'text' },
      badge: { value: ctx.blueprint.industry, type: 'text' },
    },
    actions: [
      { label: 'Get Started', action: '/signup', style: 'primary' },
      { label: 'Learn More', action: '#features', style: 'ghost' },
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
      title: { value: 'Features', type: 'text' },
      subtitle: { value: 'Everything you need', type: 'text' },
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
      title: { value: 'All Products', type: 'text' },
      subtitle: { value: 'Browse our collection', type: 'text' },
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
      title: { value: 'Pricing', type: 'text' },
      subtitle: { value: 'Choose your plan', type: 'text' },
    },
    tiers: resolvePricingTiers(ctx),
    layout: { alignment: 'center', maxWidth: '6xl' },
  };
}

function resolveTestimonials(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  _ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'Testimonials',
    content: {
      title: { value: 'What Our Users Say', type: 'text' },
      subtitle: { value: 'Trusted by thousands', type: 'text' },
    },
    items: [
      { title: 'Sarah Chen', description: 'CEO, TechCorp', metadata: { quote: 'This platform transformed how we manage our business. Highly recommended!' } },
      { title: 'Marcus Johnson', description: 'Operations Lead', metadata: { quote: 'The best platform we have used. Clean, fast, and reliable.' } },
      { title: 'Priya Patel', description: 'Product Manager', metadata: { quote: 'Our team productivity increased by 40% since switching.' } },
    ],
    layout: { alignment: 'center', maxWidth: '7xl' },
  };
}

function resolveCTASection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'CTASection',
    content: {
      title: { value: 'Ready to get started?', type: 'text' },
      subtitle: { value: `Join ${ctx.blueprint.name} today`, type: 'text' },
    },
    actions: [
      { label: 'Get Started Free', action: '/signup', style: 'primary' },
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
    { title: 'How do I get started?', description: 'Simply sign up for a free account and follow the onboarding wizard.' },
    { title: 'Is there a free trial?', description: 'Yes! All plans come with a 14-day free trial.' },
    { title: 'Can I change my plan later?', description: 'Absolutely. You can upgrade or downgrade at any time from your account settings.' },
  ];

  if (ctx.blueprint.entities.length > 0) {
    const entityName = ctx.blueprint.entities[0]!.name;
    items.push({
      title: `Can I import existing ${entityName.toLowerCase()}s?`,
      description: `Yes, we support CSV and JSON import for ${entityName.toLowerCase()}s.`,
    });
  }

  return {
    type: 'FAQSection',
    content: { title: { value: 'Frequently Asked Questions', type: 'text' } },
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
      { label: 'Active Users', value: '0', change: '+0%', trend: 'neutral' },
      { label: 'Revenue', value: '$0', change: '+0%', trend: 'neutral' },
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
    content: { title: { value: 'Analytics', type: 'text' } },
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
  _ctx: ContentResolverContext,
): ComponentSpec {
  const isLogin = slot.slot.includes('login');
  return {
    type: 'AuthForm',
    content: {
      title: { value: isLogin ? 'Welcome Back' : 'Create Account', type: 'text' },
      subtitle: { value: isLogin ? 'Sign in to your account' : 'Get started with your free trial', type: 'text' },
    },
    fields: [
      { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
      { name: 'password', label: 'Password', type: 'password', required: true, placeholder: '••••••••' },
      ...(!isLogin ? [{ name: 'name', label: 'Name', type: 'text' as const, required: true, placeholder: 'Your name' }] : []),
    ],
    actions: [
      { label: isLogin ? 'Sign In' : 'Create Account', action: '/api/auth', style: 'primary' },
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
      title: { value: 'Contact Us', type: 'text' },
      subtitle: { value: `Get in touch with ${ctx.blueprint.name}`, type: 'text' },
    },
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'subject', label: 'Subject', type: 'text', required: false },
      { name: 'message', label: 'Message', type: 'textarea', required: true },
    ],
    actions: [
      { label: 'Send Message', action: '/api/contact', style: 'primary' },
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

  for (const entity of ctx.blueprint.entities.slice(0, 6)) {
    items.push({
      title: `${entity.name} Management`,
      description: `Create, edit, and manage ${entity.name.toLowerCase()}s with ease`,
      icon: 'layers',
    });
  }

  const genericFeatures: ItemSpec[] = [
    { title: 'Real-time Updates', description: 'See changes as they happen', icon: 'zap' },
    { title: 'Analytics Dashboard', description: 'Track your performance', icon: 'bar-chart' },
    { title: 'Team Collaboration', description: 'Work together seamlessly', icon: 'users' },
    { title: 'API Access', description: 'Integrate with your tools', icon: 'code' },
    { title: 'Mobile Responsive', description: 'Works on any device', icon: 'smartphone' },
    { title: 'Security First', description: 'Enterprise-grade security', icon: 'shield' },
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

  if (hasSubscription) {
    return [
      { name: 'Starter', price: '$9', period: '/month', features: ['5 users', '10GB storage', 'Basic analytics', 'Email support'], highlighted: false },
      { name: 'Pro', price: '$29', period: '/month', features: ['25 users', '100GB storage', 'Advanced analytics', 'Priority support', 'API access'], highlighted: true },
      { name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited users', 'Unlimited storage', 'Custom integrations', 'Dedicated support', 'SLA'], highlighted: false },
    ];
  }

  return [
    { name: 'Basic', price: 'Free', period: '', features: ['Core features', 'Community support'], highlighted: false },
    { name: 'Premium', price: '$19', period: '/month', features: ['All features', 'Priority support', 'API access', 'Custom branding'], highlighted: true },
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
