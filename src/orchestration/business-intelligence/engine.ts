/**
 * Business Intelligence Engine
 * ============================
 *
 * `understandBusiness(prompt)` is the entry point. It converts a free-text
 * prompt into a complete, vertical-agnostic `BusinessKnowledge` — the single
 * source of truth consumed by every downstream layer.
 *
 * The reasoning is entirely primitive-based:
 *   prompt → signals (dimensions.ts) → discovery (archetypes.ts) → knowledge.
 * No keyword→vertical mapping, no hardcoded industry templates.
 */

import type {
  BusinessKnowledge, BusinessDiscovery, CustomerPersona, BusinessPersona, UserRole,
  CustomerJourney, JourneyStage, BusinessWorkflow, RevenueFlow, PricingModel,
  PaymentFlow, AcquisitionChannel, RetentionModel, ComplianceRequirement, Kpi,
  BusinessEntity, EntityRelationship, RequiredPage, RequiredDashboard, Automation,
  Integration, BusinessVocabulary, ContentStrategy, DesignStrategy, ExperienceGoals,
  KnowledgeSource, DiscoveredSignal, BusinessIntelligenceInput,
} from './types.js';
import { extractSignals, signalValues, hasSignal, extractDomainNouns } from './dimensions.js';
import { composeDiscovery } from './archetypes.js';

const VERSION = '1.0.0';

export class BusinessIntelligenceEngine {
  static understandBusiness(input: BusinessIntelligenceInput): BusinessKnowledge {
    const prompt = input.prompt;
    const signals = extractSignals(prompt);
    const discovery = composeDiscovery(prompt, signals);
    const domainNouns = extractDomainNouns(prompt);
    const sources: KnowledgeSource[] = input.sources ?? [
      { type: 'prompt', label: 'Prompt analysis', confidence: 1, ref: undefined },
    ];

    const goals = inferGoals(signals);
    const locale = signalValues(signals, 'locale')[0] ?? 'IN';

    return {
      version: VERSION,
      sources,
      discovery,
      customerPersonas: derivePersonas(signals, domainNouns),
      businessPersonas: deriveBusinessPersonas(),
      userRoles: deriveRoles(),
      customerJourney: deriveJourney(signals, goals),
      workflows: deriveWorkflows(signals, goals),
      revenue: deriveRevenue(signals, locale),
      acquisition: deriveAcquisition(signals, goals),
      retention: deriveRetention(signals),
      compliance: deriveCompliance(signals, locale),
      kpis: deriveKpis(goals),
      entities: deriveEntities(signals, goals),
      relationships: deriveRelationships(),
      pages: derivePages(signals, goals),
      dashboards: deriveDashboards(),
      automations: deriveAutomations(signals),
      integrations: deriveIntegrations(signals),
      vocabulary: deriveVocabulary(signals, domainNouns),
      contentStrategy: deriveContentStrategy(signals, domainNouns),
      designStrategy: deriveDesignStrategy(signals, discovery),
      experienceGoals: deriveExperienceGoals(signals, discovery),
      experienceThemes: deriveExperienceThemes(signals),
    };
  }
}

/**
 * Infer business goals from primitive signals when the prompt doesn't state
 * them literally. A coffee *website* may never say "sell", but beverage +
 * channel primitives imply a selling business. This is primitive reasoning,
 * not vertical lookup.
 */
/**
 * Derive experience themes from prompt narrative/scroll cues. These are
 * primitive signals (not vertical labels) that let the experience engine pick
 * a matching concept — e.g. a "soundwave → silence" transformation brief.
 */
function deriveExperienceThemes(s: DiscoveredSignal[]): string[] {
  return [...new Set(signalValues(s, 'experience-theme'))];
}

function inferGoals(s: DiscoveredSignal[]): string[] {
  const goals = new Set(signalValues(s, 'goal'));
  if (hasSignal(s, 'product-nature', 'beverage') || hasSignal(s, 'product-nature', 'food') || hasSignal(s, 'product-nature', 'physical-good') || hasSignal(s, 'product-nature', 'digital-good')) {
    goals.add('sell-products');
  }
  if (hasSignal(s, 'product-nature', 'service')) goals.add('sell-services');
  if (hasSignal(s, 'product-nature', 'content')) goals.add('share-content');
  if (hasSignal(s, 'audience', 'internal')) goals.add('manage-internally');
  return [...goals];
}

export function understandBusiness(prompt: string, sources?: KnowledgeSource[]): BusinessKnowledge {
  return BusinessIntelligenceEngine.understandBusiness({ prompt, sources });
}

// ─── Derivations (all primitive-based) ──────────────────────────────────────

function derivePersonas(s: DiscoveredSignal[], nouns: string[]): CustomerPersona[] {
  const noun = nouns[0] ?? 'product';
  const personas: CustomerPersona[] = [
    {
      id: 'guest', role: 'guest', label: 'Walk-in / first-time visitor',
      needs: [`Discover the ${noun}`, 'Understand value quickly'], friction: ['Unclear offering', 'Slow load'],
      lifecycle: 'acquire',
    },
    {
      id: 'member', role: 'member', label: 'Returning customer',
      needs: ['Repeat access', 'Recognition'], friction: ['Re-entering details'], lifecycle: 'retain',
    },
  ];
  if (hasSignal(s, 'audience', 'b2b')) {
    personas.push({
      id: 'client', role: 'client', label: 'Business client',
      needs: ['Bulk / contract terms', 'Reliable supply'], friction: ['Procurement friction'], lifecycle: 'retain',
    });
  }
  if (hasSignal(s, 'monetization', 'subscription')) {
    personas.push({
      id: 'subscriber', role: 'member', label: 'Subscriber',
      needs: ['Ongoing value', 'Easy cancel'], friction: ['Churn triggers'], lifecycle: 'retain',
    });
  }
  return personas;
}

function deriveBusinessPersonas(): BusinessPersona[] {
  return [
    { id: 'owner', label: 'Owner / Founder', role: 'owner', responsibilities: ['Strategy', 'Finance', 'Brand'] },
    { id: 'admin', label: 'Administrator', role: 'admin', responsibilities: ['Catalog', 'Orders', 'Users'] },
    { id: 'staff', label: 'Staff / Operator', role: 'staff', responsibilities: ['Fulfilment', 'Support'] },
  ];
}

function deriveRoles(): UserRole[] {
  return [
    { id: 'public', label: 'Public visitor', tier: 'public', capabilities: ['browse', 'view'] },
    { id: 'authenticated', label: 'Signed-in user', tier: 'authenticated', capabilities: ['save', 'track'] },
    { id: 'member', label: 'Member', tier: 'member', capabilities: ['purchase', 'subscribe'] },
    { id: 'staff', label: 'Staff', tier: 'staff', capabilities: ['fulfil', 'support'] },
    { id: 'admin', label: 'Admin', tier: 'admin', capabilities: ['manage', 'configure'] },
  ];
}

function deriveJourney(s: DiscoveredSignal[], goals: string[]): CustomerJourney {
  const stages: JourneyStage[] = [
    { stage: 'awareness', action: 'Discovers the business', workflows: ['seo', 'social'], emotionalTarget: 'curiosity' },
    { stage: 'consideration', action: 'Evaluates fit', workflows: ['browse', 'search-filter'], emotionalTarget: 'trust' },
    { stage: 'conversion', action: hasSignal(s, 'fulfillment', 'appointment') ? 'Books / reserves' : 'Buys', workflows: hasSignal(s, 'fulfillment', 'appointment') ? ['booking'] : ['cart-checkout'], emotionalTarget: 'confidence' },
    { stage: 'onboarding', action: 'First successful use', workflows: ['auth-account'], emotionalTarget: 'relief' },
    { stage: 'retention', action: 'Comes back', workflows: hasSignal(s, 'monetization', 'subscription') ? ['subscription'] : ['loyalty'], emotionalTarget: 'belonging' },
    { stage: 'advocacy', action: 'Recommends', workflows: ['review-rating', 'social'], emotionalTarget: 'pride' },
  ];
  return { stages, loops: ['conversion → retention → conversion'] };
}

function deriveWorkflows(s: DiscoveredSignal[], goals: string[]): BusinessWorkflow[] {
  const wf: BusinessWorkflow[] = [];
  const add = (id: string, kind: string, scope: 'customer' | 'operational', description: string, steps: string[]) =>
    wf.push({ id, kind, scope, description, steps, automationCandidate: scope === 'operational' || kind === 'cart-checkout' || kind === 'booking' });

  if (goals.includes('sell-products') || goals.includes('sell-services')) {
    add('browse', 'browse', 'customer', 'Browse the offering', ['List items', 'Show details']);
    add('search', 'search-filter', 'customer', 'Search & filter', ['Query', 'Filter', 'Sort']);
  }
  if (hasSignal(s, 'monetization', 'one-time') || hasSignal(s, 'monetization', 'wholesale')) {
    add('checkout', 'cart-checkout', 'customer', 'Add to cart & pay', ['Add to cart', 'Enter details', 'Pay', 'Confirm']);
  }
  if (hasSignal(s, 'fulfillment', 'appointment')) {
    add('booking', 'booking', 'customer', 'Book / reserve', ['Pick slot', 'Enter details', 'Confirm']);
  }
  if (hasSignal(s, 'monetization', 'subscription')) {
    add('subscription', 'subscription', 'customer', 'Subscribe', ['Pick plan', 'Pay recurring', 'Manage']);
  }
  if (hasSignal(s, 'monetization', 'marketplace')) {
    add('marketplace', 'marketplace', 'customer', 'Browse multi-seller listings', ['List sellers', 'Listings', 'Checkout']);
  }
  if (goals.includes('share-content')) {
    add('content', 'content-publishing', 'customer', 'Consume & engage content', ['List posts', 'Read', 'Comment']);
  }
  if (goals.includes('generate-leads')) {
    add('lead', 'contact-lead', 'customer', 'Submit inquiry', ['Open form', 'Submit', 'Receive reply']);
  }
  add('auth', 'auth-account', 'customer', 'Authenticate & manage account', ['Sign up', 'Log in', 'Manage profile'], );

  // Operational
  add('fulfilment', 'order-fulfilment', 'operational', 'Fulfil orders/bookings', ['Receive', 'Process', 'Complete'], );
  add('inventory', 'inventory', 'operational', 'Track stock & supply', ['Sync stock', 'Alert low'], );
  add('scheduling', 'scheduling', 'operational', 'Manage capacity', ['Set slots', 'Assign staff'], );
  add('moderation', 'content-moderation', 'operational', 'Moderate UGC', ['Review', 'Approve'], );

  return wf;
}

function deriveRevenue(s: DiscoveredSignal[], locale: string): RevenueFlow {
  let model = 'one-time';
  if (hasSignal(s, 'monetization', 'subscription')) model = 'subscription';
  else if (hasSignal(s, 'monetization', 'service-fee')) model = 'service-fee';
  else if (hasSignal(s, 'monetization', 'marketplace')) model = 'marketplace-take-rate';
  else if (hasSignal(s, 'monetization', 'advertising')) model = 'advertising';
  else if (hasSignal(s, 'monetization', 'donation')) model = 'donation';
  else if (hasSignal(s, 'monetization', 'freemium')) model = 'freemium';
  else if (hasSignal(s, 'monetization', 'wholesale')) model = 'wholesale';

  const pricing: PricingModel = { structure: model === 'subscription' ? 'tiered' : 'flat' };
  const methods = locale === 'IN' ? ['upi', 'cards', 'cod', 'wallet']
    : locale === 'US' ? ['cards', 'paypal', 'wallet']
    : ['cards', 'sepa', 'paypal'];
  const payment: PaymentFlow = {
    methods,
    steps: ['Collect details', 'Tokenise', 'Authorise', 'Settle'],
    considerations: ['PCI scope minimised via hosted fields', 'Receipt + invoice'],
  };
  const currency = locale === 'IN' ? 'INR' : locale === 'US' ? 'USD' : 'EUR';
  return { model, source: model === 'one-time' ? 'direct sales' : model, pricing, payment, currency };
}

function deriveAcquisition(s: DiscoveredSignal[], goals: string[]): AcquisitionChannel[] {
  const ch: AcquisitionChannel[] = [
    { channel: 'seo', rationale: 'Organic discovery of offering' },
    { channel: 'social', rationale: 'Visual / community reach' },
  ];
  if (hasSignal(s, 'monetization', 'marketplace')) ch.push({ channel: 'marketplace', rationale: 'Native demand' });
  if (goals.includes('generate-leads')) ch.push({ channel: 'paid-ads', rationale: 'Intent capture' });
  if (goals.includes('build-community')) ch.push({ channel: 'referral', rationale: 'Word of mouth' });
  return ch;
}

function deriveRetention(s: DiscoveredSignal[]): RetentionModel {
  if (hasSignal(s, 'monetization', 'subscription'))
    return { strategy: 'subscription', mechanisms: ['Recurring value', 'Easy manage', 'Win-back'] };
  if (hasSignal(s, 'quality', 'specialty') || hasSignal(s, 'goal', 'build-community'))
    return { strategy: 'community', mechanisms: ['Loyalty', 'Events', 'UGC'] };
  return { strategy: 'email-nurture', mechanisms: ['Newsletter', 'Post-purchase follow-up'] };
}

function deriveCompliance(s: DiscoveredSignal[], locale: string): ComplianceRequirement[] {
  const c: ComplianceRequirement[] = [];
  const foodish = hasSignal(s, 'product-nature', 'beverage') || hasSignal(s, 'product-nature', 'food');
  if (foodish && locale === 'IN') c.push({ pack: 'compliance.fssai', trigger: 'Food/beverage product-nature in India', severity: 'required' });
  if (locale === 'EU') c.push({ pack: 'compliance.gdpr', trigger: 'EU locale', severity: 'required' });
  if (hasSignal(s, 'monetization', 'one-time') || hasSignal(s, 'monetization', 'subscription') || hasSignal(s, 'monetization', 'wholesale'))
    c.push({ pack: 'compliance.pci-dss', trigger: 'Card payment present', severity: 'required' });
  if (hasSignal(s, 'product-nature', 'service') && /clinic|dentist|doctor|therapy|health/.test(signalValues(s, 'product-nature').join(' ')))
    c.push({ pack: 'compliance.hipaa', trigger: 'Health service signals', severity: 'recommended' });
  if (hasSignal(s, 'audience', 'internal') || hasSignal(s, 'audience', 'b2b'))
    c.push({ pack: 'compliance.soc2', trigger: 'Business/internal audience', severity: 'recommended' });
  c.push({ pack: 'accessibility', trigger: 'Always-on baseline', severity: 'recommended' });
  return c;
}

function deriveKpis(goals: string[]): Kpi[] {
  const k: Kpi[] = [
    { name: 'Visitor → customer conversion', question: 'What % of visitors convert?', dashboard: 'growth' },
  ];
  if (goals.includes('sell-products')) k.push({ name: 'Orders', question: 'How many orders per period?', dashboard: 'operations' });
  if (goals.includes('sell-services')) k.push({ name: 'Bookings', question: 'How many bookings per period?', dashboard: 'operations' });
  if (goals.includes('share-content')) k.push({ name: 'Engagement', question: 'Time on content / reads?', dashboard: 'growth' });
  if (goals.includes('build-community')) k.push({ name: 'Active members', question: 'How many active members?', dashboard: 'growth' });
  return k;
}

function deriveEntities(s: DiscoveredSignal[], goals: string[]): BusinessEntity[] {
  const entities: BusinessEntity[] = [
    { name: 'User', archetype: 'User', fields: ['id', 'name', 'email', 'role'], relationships: ['places Order', 'books Booking', 'authors Review'] },
  ];
  if (goals.includes('sell-products')) {
    entities.push({ name: 'Product', archetype: 'Product', fields: ['id', 'name', 'price', 'description', 'image'], relationships: ['belongs to Category', 'appears in Order'] });
    entities.push({ name: 'Order', archetype: 'Order', fields: ['id', 'items', 'total', 'status', 'createdAt'], relationships: ['placed by User', 'contains Product'] });
    entities.push({ name: 'Cart', archetype: 'Cart', fields: ['id', 'items'], relationships: ['owned by User'] });
  }
  if (hasSignal(s, 'fulfillment', 'appointment')) {
    entities.push({ name: 'Booking', archetype: 'Booking', fields: ['id', 'slot', 'status'], relationships: ['made by User', 'for Service'] });
    entities.push({ name: 'Service', archetype: 'Service', fields: ['id', 'name', 'duration'], relationships: ['booked via Booking'] });
  }
  if (goals.includes('share-content')) {
    entities.push({ name: 'Article', archetype: 'Content', fields: ['id', 'title', 'body', 'author'], relationships: ['authored by User'] });
  }
  entities.push({ name: 'Review', archetype: 'Review', fields: ['id', 'rating', 'text'], relationships: ['written by User'] });
  entities.push({ name: 'Category', archetype: 'Category', fields: ['id', 'name'], relationships: ['groups Product'] });
  entities.push({ name: 'Payment', archetype: 'Payment', fields: ['id', 'amount', 'status'], relationships: ['settles Order'] });
  return entities;
}

function deriveRelationships(): EntityRelationship[] {
  return [
    { from: 'User', to: 'Order', type: 'one-to-many', label: 'places' },
    { from: 'Order', to: 'Product', type: 'many-to-many', label: 'contains' },
    { from: 'User', to: 'Review', type: 'one-to-many', label: 'writes' },
    { from: 'Category', to: 'Product', type: 'one-to-many', label: 'groups' },
  ];
}

function derivePages(s: DiscoveredSignal[], goals: string[]): RequiredPage[] {
  const pages: RequiredPage[] = [
    { path: '/', purpose: 'Home / hero', workflows: ['browse'] },
    { path: '/about', purpose: 'About / story', workflows: [] },
  ];
  if (goals.includes('sell-products')) {
    const base = hasSignal(s, 'product-nature', 'beverage') || hasSignal(s, 'product-nature', 'food') ? 'menu' : 'shop';
    pages.push({ path: `/${base}`, purpose: 'Catalog', workflows: ['browse', 'search-filter'] });
    if (hasSignal(s, 'monetization', 'one-time') || hasSignal(s, 'monetization', 'wholesale'))
      pages.push({ path: '/cart', purpose: 'Cart & checkout', workflows: ['cart-checkout'] });
  }
  if (hasSignal(s, 'fulfillment', 'appointment'))
    pages.push({ path: '/book', purpose: 'Booking', workflows: ['booking'] });
  if (hasSignal(s, 'monetization', 'subscription'))
    pages.push({ path: '/pricing', purpose: 'Plans', workflows: ['subscription'] });
  if (goals.includes('share-content'))
    pages.push({ path: '/blog', purpose: 'Content', workflows: ['content-publishing'] });
  if (goals.includes('generate-leads'))
    pages.push({ path: '/contact', purpose: 'Contact / lead', workflows: ['contact-lead'] });
  pages.push({ path: '/login', purpose: 'Account', workflows: ['auth-account'] });
  return pages;
}

function deriveDashboards(): RequiredDashboard[] {
  return [
    { id: 'operations', audience: 'staff', widgets: ['Orders', 'Fulfilment', 'Inventory'] },
    { id: 'bookings', audience: 'staff', widgets: ['Schedule', 'Utilisation'] },
    { id: 'growth', audience: 'owner', widgets: ['Conversion', 'Acquisition', 'Retention'] },
    { id: 'content', audience: 'admin', widgets: ['Posts', 'Engagement'] },
  ];
}

function deriveAutomations(s: DiscoveredSignal[]): Automation[] {
  const a: Automation[] = [
    { id: 'order-confirm', trigger: 'Order placed', action: 'Send confirmation', channel: 'email' },
    { id: 'review-ask', trigger: 'Order completed', action: 'Request review', channel: 'email' },
  ];
  if (hasSignal(s, 'fulfillment', 'appointment'))
    a.push({ id: 'booking-remind', trigger: 'Booking in 24h', action: 'Send reminder', channel: 'sms' });
  if (hasSignal(s, 'monetization', 'subscription'))
    a.push({ id: 'renew-nudge', trigger: 'Subscription lapsing', action: 'Send win-back', channel: 'email' });
  return a;
}

function deriveIntegrations(s: DiscoveredSignal[]): Integration[] {
  const i: Integration[] = [
    { category: 'payments', requirement: 'Card / UPI / wallet checkout', required: true },
    { category: 'email', requirement: 'Transactional + nurture email', required: true },
    { category: 'analytics', requirement: 'Product + growth analytics', required: true },
    { category: 'auth', requirement: 'Authentication', required: true },
  ];
  if (hasSignal(s, 'monetization', 'marketplace')) i.push({ category: 'search', requirement: 'Multi-seller discovery', required: true });
  if (hasSignal(s, 'goal', 'share-content')) i.push({ category: 'storage', requirement: 'Media storage/CDN', required: true });
  return i;
}

function deriveVocabulary(s: DiscoveredSignal[], nouns: string[]): BusinessVocabulary {
  const terms: Record<string, string> = {};
  const noun = nouns[0];
  if (hasSignal(s, 'product-nature', 'beverage') || hasSignal(s, 'product-nature', 'food')) {
    terms['product'] = noun ? `${noun} item` : 'menu item';
    terms['customer'] = 'guest';
  } else if (hasSignal(s, 'product-nature', 'service')) {
    terms['product'] = 'service';
    terms['customer'] = 'client';
  } else if (hasSignal(s, 'product-nature', 'content')) {
    terms['product'] = 'article';
    terms['customer'] = 'reader';
  } else {
    terms['product'] = noun ?? 'product';
    terms['customer'] = 'customer';
  }
  terms['order'] = hasSignal(s, 'fulfillment', 'appointment') ? 'booking' : 'order';
  const tone: string[] = ['clear', 'warm'];
  if (hasSignal(s, 'quality', 'luxury')) tone.unshift('refined');
  if (hasSignal(s, 'quality', 'specialty')) tone.unshift('craft-forward');
  if (hasSignal(s, 'quality', 'budget')) tone.unshift('friendly');
  return { terms, domainNouns: nouns, tone };
}

function deriveContentStrategy(s: DiscoveredSignal[], nouns: string[]): ContentStrategy {
  const noun = nouns[0] ?? 'business';
  return {
    pillars: [`${noun} expertise`, 'Behind the scenes', 'Customer stories'],
    formats: hasSignal(s, 'goal', 'share-content') ? ['article', 'video', 'social'] : ['social', 'email'],
    cadence: 'Weekly',
    voice: deriveVocabulary(s, nouns).tone.join(', '),
  };
}

function deriveDesignStrategy(s: DiscoveredSignal[], d: BusinessDiscovery): DesignStrategy {
  let direction = 'Clean, confident, conversion-focused';
  if (hasSignal(s, 'quality', 'luxury')) direction = 'Editorial, high-contrast, premium';
  else if (hasSignal(s, 'quality', 'specialty')) direction = 'Craft-led, tactile, warm';
  else if (d.industry === 'software') direction = 'Product-led, systematic, calm';
  return { direction, density: 'balanced', emphasis: ['hero clarity', 'primary action'] };
}

function deriveExperienceGoals(s: DiscoveredSignal[], d: BusinessDiscovery): ExperienceGoals {
  const density = hasSignal(s, 'quality', 'luxury') ? 'calm' : hasSignal(s, 'goal', 'build-community') ? 'energetic' : 'moderate';
  const arc = ['curiosity', 'trust', 'confidence', 'belonging'];
  const perStage: Record<string, string> = {
    awareness: 'intrigue', consideration: 'clarity', conversion: 'assurance', retention: 'delight',
  };
  return {
    arc,
    interactionDensity: density,
    motionLanguage: ['whileInView reveals', 'hover lift', 'calm easing'],
    perStage,
  };
}
