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
      { name: 'country', label: 'Country', type: 'select', required: true, options: [
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
  return {
    type: 'OrderSummary',
    content: {
      title: { value: vocab('Order Summary', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Subtotal', ctx), metadata: { value: '$0.00' } },
      { title: vocab('Shipping', ctx), metadata: { value: 'Free' } },
      { title: vocab('Tax', ctx), metadata: { value: '$0.00' } },
      { title: vocab('Total', ctx), metadata: { value: '$0.00', bold: 'true' } },
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
    items: [
      { title: vocab('Users', ctx), metadata: { basic: '5', pro: '25', enterprise: 'Unlimited' } },
      { title: vocab('Storage', ctx), metadata: { basic: '10GB', pro: '100GB', enterprise: 'Unlimited' } },
      { title: vocab('Support', ctx), metadata: { basic: 'Email', pro: 'Priority', enterprise: 'Dedicated' } },
      { title: vocab('API Access', ctx), metadata: { basic: 'Limited', pro: 'Full', enterprise: 'Custom' } },
    ],
    layout: { alignment: 'center', maxWidth: '6xl' },
  };
}

// ─── Dashboard Resolvers ──────────────────────────────────────────────────

function resolveActivityFeed(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'ActivityFeed',
    content: {
      title: { value: vocab('Recent Activity', ctx), type: 'text' },
    },
    items: [
      { title: vocab('New order received', ctx), description: vocab('Order #1234 — $99.00', ctx), icon: 'shopping-cart', metadata: { time: '2 min ago' } },
      { title: vocab('User signed up', ctx), description: vocab('john@example.com', ctx), icon: 'user-plus', metadata: { time: '15 min ago' } },
      { title: vocab('Product updated', ctx), description: vocab('Inventory restocked', ctx), icon: 'package', metadata: { time: '1 hour ago' } },
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
  return {
    type: 'DataGrid',
    content: {
      title: { value: vocab(`${entity?.name ?? 'Data'} Management`, ctx), type: 'text' },
      entity: { value: entity?.name ?? 'Item', type: 'text' },
    },
    columns: entity?.fields.map(f => ({
      key: f.name,
      label: f.name.charAt(0).toUpperCase() + f.name.slice(1),
      type: 'text' as const,
      sortable: true,
      filterable: f.indexed,
    })),
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
  return {
    type: 'SocialAuth',
    content: {
      title: { value: vocab('Or continue with', ctx), type: 'text' },
    },
    actions: [
      { label: 'Google', action: '/api/auth/google', style: 'secondary' },
      { label: 'GitHub', action: '/api/auth/github', style: 'secondary' },
      { label: 'Twitter', action: '/api/auth/twitter', style: 'secondary' },
    ],
    layout: { alignment: 'center', maxWidth: 'sm' },
  };
}

// ─── Account Resolvers ────────────────────────────────────────────────────

function resolveProfileSection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'ProfileSection',
    content: {
      title: { value: vocab('My Profile', ctx), type: 'text' },
      subtitle: { value: vocab('Manage your account details', ctx), type: 'text' },
    },
    fields: [
      { name: 'name', label: 'Full Name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'phone', label: 'Phone', type: 'text', required: false },
      { name: 'bio', label: 'Bio', type: 'textarea', required: false },
    ],
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

  return {
    type: 'BillingSection',
    content: {
      title: { value: vocab('Billing', ctx), type: 'text' },
      subtitle: { value: hasSubscription ? vocab('Manage your subscription', ctx) : vocab('Manage your billing', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Current Plan', ctx), description: hasSubscription ? 'Pro — $29/month' : vocab('N/A', ctx), icon: 'credit-card' },
      { title: vocab('Next Billing Date', ctx), description: vocab('January 1, 2025', ctx), icon: 'calendar' },
      { title: vocab('Payment Method', ctx), description: vocab('Visa ending in 4242', ctx), icon: 'shield' },
    ],
    actions: [
      { label: vocab('Update Billing', ctx), action: '/account/billing/update', style: 'primary' },
      { label: vocab('Cancel Subscription', ctx), action: '/account/billing/cancel', style: 'ghost' },
    ],
    layout: { maxWidth: '2xl' },
  };
}

function resolveNotificationsSection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'NotificationsSection',
    content: {
      title: { value: vocab('Notifications', ctx), type: 'text' },
      subtitle: { value: vocab('Configure your notification preferences', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Email Notifications', ctx), description: vocab('Receive updates via email', ctx), icon: 'mail', metadata: { enabled: 'true' } },
      { title: vocab('Push Notifications', ctx), description: vocab('Receive push notifications', ctx), icon: 'bell', metadata: { enabled: 'false' } },
      { title: vocab('SMS Notifications', ctx), description: vocab('Receive text messages', ctx), icon: 'smartphone', metadata: { enabled: 'false' } },
    ],
    layout: { maxWidth: '2xl' },
  };
}

function resolvePlanDetails(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'PlanDetails',
    content: {
      title: { value: vocab('Your Plan', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Plan Name', ctx), description: 'Pro', icon: 'package' },
      { title: vocab('Price', ctx), description: '$29/month', icon: 'dollar-sign' },
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
  return {
    type: 'AddressBook',
    content: {
      title: { value: vocab('Address Book', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Home', ctx), description: vocab('123 Main St, City, State 12345', ctx), icon: 'home', metadata: { default: 'true' } },
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
): ComponentSpec {
  return {
    type: 'AboutSection',
    content: {
      title: { value: vocab('Our Story', ctx), type: 'text' },
      subtitle: { value: ctx.blueprint.description ?? vocab('Learn more about us', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Founded', ctx), description: vocab('Started with a vision to transform the industry', ctx), icon: 'flag' },
      { title: vocab('Mission', ctx), description: vocab('Making technology accessible to everyone', ctx), icon: 'target' },
      { title: vocab('Growth', ctx), description: vocab('Serving thousands of customers worldwide', ctx), icon: 'trending-up' },
    ],
    layout: { alignment: 'center', maxWidth: '4xl' },
  };
}

function resolveTeamSection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'TeamSection',
    content: {
      title: { value: vocab('Meet Our Team', ctx), type: 'text' },
      subtitle: { value: vocab('The people behind the product', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Leadership', ctx), description: vocab('Driving our vision forward', ctx), icon: 'users' },
      { title: vocab('Engineering', ctx), description: vocab('Building the future', ctx), icon: 'code' },
      { title: vocab('Design', ctx), description: vocab('Crafting beautiful experiences', ctx), icon: 'palette' },
    ],
    layout: { alignment: 'center', maxWidth: '6xl' },
  };
}

function resolveTeamGrid(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'TeamGrid',
    content: {
      title: { value: vocab('Our Team', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Team Member', ctx), description: vocab('Role', ctx), icon: 'user' },
      { title: vocab('Team Member', ctx), description: vocab('Role', ctx), icon: 'user' },
      { title: vocab('Team Member', ctx), description: vocab('Role', ctx), icon: 'user' },
    ],
    layout: { alignment: 'center', maxWidth: '6xl' },
  };
}

function resolveMissionSection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'MissionSection',
    content: {
      title: { value: vocab('Our Mission', ctx), type: 'text' },
      subtitle: { value: vocab('What drives us every day', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Innovation', ctx), description: vocab('Pushing boundaries of what is possible', ctx), icon: 'zap' },
      { title: vocab('Accessibility', ctx), description: vocab('Technology for everyone', ctx), icon: 'globe' },
      { title: vocab('Impact', ctx), description: vocab('Making a real difference', ctx), icon: 'heart' },
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
