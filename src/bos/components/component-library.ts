// ─── Component Library (Phase R2 / Step 5) ───────────────────────────
// The single, canonical catalog of buildable components. Each component is
// linked to CANONICAL capability ids (never legacy tags), and declares its
// schema, behavior, renderer support, evaluation hooks, and experience hooks.
// Everything (architect, evaluation, experience, renderer) selects components
// from here via `getComponentsForCapabilities`, which resolves inputs through
// the canonical Capability Registry.

import { capabilityRegistry } from '../capabilities/index.js';
import type { CapabilityId } from '../capabilities/index.js';

export interface ComponentSpec {
  id: string;
  name: string;
  description: string;
  /** Canonical capability ids this component implements. */
  capabilities: CapabilityId[];
  schema: { props: Record<string, string>; required?: string[] };
  /** Interaction behaviors the component exhibits. */
  behavior: string[];
  /** Renderers/frameworks this component supports. */
  rendererSupport: string[];
  /** Named evaluation checks this component participates in. */
  evaluationHooks: string[];
  /** Motion / emotion biases this component implies. */
  experienceHooks: string[];
  /** Primitive-pack tags this component is composed from. */
  primitiveTags: string[];
}

export const COMPONENT_LIBRARY: ComponentSpec[] = [
  {
    id: 'checkout-flow',
    name: 'Checkout Flow',
    description: 'Multi-step purchase flow with cart, payments, and order confirmation.',
    capabilities: ['commerce.checkout', 'commerce.cart', 'payments'],
    schema: { props: { steps: 'string[]', onComplete: '() => void' }, required: ['onComplete'] },
    behavior: ['multi-step', 'validation', 'persist-cart'],
    rendererSupport: ['react', 'vue', 'svelte'],
    evaluationHooks: ['capabilityCoverage', 'promptFulfillment', 'accessibility'],
    experienceHooks: ['trust', 'urgency'],
    primitiveTags: ['ecommerce'],
  },
  {
    id: 'product-catalog',
    name: 'Product Catalog',
    description: 'Grid/list of products with filtering and detail navigation.',
    capabilities: ['commerce.catalog'],
    schema: { props: { products: 'Product[]', onSelect: '(id: string) => void' }, required: ['products'] },
    behavior: ['filter', 'paginate', 'search'],
    rendererSupport: ['react', 'vue', 'svelte'],
    evaluationHooks: ['capabilityCoverage', 'visualScore'],
    experienceHooks: ['delight'],
    primitiveTags: ['ecommerce'],
  },
  {
    id: 'cart-widget',
    name: 'Cart Widget',
    description: 'Floating cart summary with item management.',
    capabilities: ['commerce.cart'],
    schema: { props: { items: 'CartItem[]' }, required: ['items'] },
    behavior: ['add', 'remove', 'update-qty'],
    rendererSupport: ['react'],
    evaluationHooks: ['capabilityCoverage'],
    experienceHooks: ['delight'],
    primitiveTags: ['ecommerce'],
  },
  {
    id: 'order-history',
    name: 'Order History',
    description: 'List of past orders with status and detail.',
    capabilities: ['commerce.orders'],
    schema: { props: { orders: 'Order[]' }, required: ['orders'] },
    behavior: ['list', 'detail'],
    rendererSupport: ['react', 'vue'],
    evaluationHooks: ['capabilityCoverage'],
    experienceHooks: ['calm'],
    primitiveTags: ['ecommerce'],
  },
  {
    id: 'booking-calendar',
    name: 'Booking Calendar',
    description: 'Date/time slot picker for reservations and appointments.',
    capabilities: ['scheduling', 'booking.reservation', 'booking.appointment'],
    schema: { props: { slots: 'Slot[]', onBook: '(slot: Slot) => void' }, required: ['slots', 'onBook'] },
    behavior: ['select-slot', 'validate-availability'],
    rendererSupport: ['react', 'vue'],
    evaluationHooks: ['capabilityCoverage', 'accessibility'],
    experienceHooks: ['anticipation', 'calm'],
    primitiveTags: ['booking'],
  },
  {
    id: 'crm-contacts',
    name: 'CRM Contacts',
    description: 'Contact list with detail and pipeline linkage.',
    capabilities: ['crm.contacts'],
    schema: { props: { contacts: 'Contact[]' }, required: ['contacts'] },
    behavior: ['list', 'search', 'detail'],
    rendererSupport: ['react'],
    evaluationHooks: ['capabilityCoverage'],
    experienceHooks: ['trust', 'calm'],
    primitiveTags: ['crm'],
  },
  {
    id: 'deal-pipeline',
    name: 'Deal Pipeline',
    description: 'Kanban board of deals across stages.',
    capabilities: ['crm.deals'],
    schema: { props: { stages: 'Stage[]', deals: 'Deal[]' }, required: ['stages', 'deals'] },
    behavior: ['drag-drop', 'stage-transition'],
    rendererSupport: ['react'],
    evaluationHooks: ['capabilityCoverage'],
    experienceHooks: ['confidence'],
    primitiveTags: ['crm', 'kanban'],
  },
  {
    id: 'auth-gate',
    name: 'Auth Gate',
    description: 'Login / signup flow with session handling.',
    capabilities: ['auth'],
    schema: { props: { mode: "'login' | 'signup'", onAuth: '(u: User) => void' }, required: ['onAuth'] },
    behavior: ['authenticate', 'validate', 'session'],
    rendererSupport: ['react', 'vue', 'svelte'],
    evaluationHooks: ['capabilityCoverage', 'security'],
    experienceHooks: ['trust'],
    primitiveTags: ['auth'],
  },
  {
    id: 'subscription-plans',
    name: 'Subscription Plans',
    description: 'Plan selector with billing cycle toggle.',
    capabilities: ['subscriptions'],
    schema: { props: { plans: 'Plan[]', onSubscribe: '(plan: Plan) => void' }, required: ['plans', 'onSubscribe'] },
    behavior: ['select-plan', 'toggle-cycle'],
    rendererSupport: ['react'],
    evaluationHooks: ['capabilityCoverage'],
    experienceHooks: ['trust', 'aspiration'],
    primitiveTags: ['subscription'],
  },
  {
    id: 'analytics-dashboard',
    name: 'Analytics Dashboard',
    description: 'Metrics dashboard with charts and filters.',
    capabilities: ['analytics.dashboard'],
    schema: { props: { metrics: 'Metric[]', range: 'string' }, required: ['metrics'] },
    behavior: ['filter', 'visualize', 'export'],
    rendererSupport: ['react'],
    evaluationHooks: ['capabilityCoverage'],
    experienceHooks: ['confidence', 'clarity'],
    primitiveTags: ['analytics', 'dashboard'],
  },
  {
    id: 'content-editor',
    name: 'Content Editor',
    description: 'Rich content authoring and listing.',
    capabilities: ['content.management'],
    schema: { props: { documents: 'Doc[]' }, required: ['documents'] },
    behavior: ['author', 'publish', 'list'],
    rendererSupport: ['react'],
    evaluationHooks: ['capabilityCoverage'],
    experienceHooks: ['delight', 'aspiration'],
    primitiveTags: ['content'],
  },
  {
    id: 'marketplace-vendor',
    name: 'Marketplace Vendor',
    description: 'Multi-vendor storefront with vendor isolation.',
    capabilities: ['marketplace', 'commerce.catalog'],
    schema: { props: { vendors: 'Vendor[]', products: 'Product[]' }, required: ['vendors', 'products'] },
    behavior: ['vendor-switch', 'list', 'filter'],
    rendererSupport: ['react'],
    evaluationHooks: ['capabilityCoverage'],
    experienceHooks: ['trust'],
    primitiveTags: ['marketplace', 'ecommerce'],
  },
  {
    id: 'health-record',
    name: 'Health Record',
    description: 'Patient/medical record view (HIPAA-aware display).',
    capabilities: ['healthcare.records', 'healthcare.appointments'],
    schema: { props: { patient: 'Patient' }, required: ['patient'] },
    behavior: ['view', 'redact-sensitive'],
    rendererSupport: ['react'],
    evaluationHooks: ['capabilityCoverage', 'accessibility', 'security'],
    experienceHooks: ['calm', 'trust', 'serenity'],
    primitiveTags: ['healthcare'],
  },
  {
    id: 'notification-center',
    name: 'Notification Center',
    description: 'In-app notification feed (email/sms/push aware).',
    capabilities: ['notifications.email', 'notifications.sms', 'notifications.push'],
    schema: { props: { notifications: 'Notification[]' }, required: ['notifications'] },
    behavior: ['list', 'mark-read', 'dismiss'],
    rendererSupport: ['react'],
    evaluationHooks: ['capabilityCoverage'],
    experienceHooks: ['calm'],
    primitiveTags: ['notification'],
  },
];

/**
 * Resolve raw capability inputs to the components that implement them.
 * Inputs are normalized + dependency-expanded through the canonical registry,
 * so a request for `ecommerce` (alias) or `commerce.checkout` (canonical) both
 * return the Checkout Flow component and its transitive dependencies.
 */
export function getComponentsForCapabilities(capabilities: string[]): ComponentSpec[] {
  const resolved = capabilityRegistry.resolve(capabilities).expanded;
  const resolvedSet = new Set<CapabilityId>(resolved);
  const out: ComponentSpec[] = [];
  for (const comp of COMPONENT_LIBRARY) {
    if (comp.capabilities.some(c => resolvedSet.has(c))) out.push(comp);
  }
  return out;
}

export function getComponentById(id: string): ComponentSpec | undefined {
  return COMPONENT_LIBRARY.find(c => c.id === id);
}
