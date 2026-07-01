/**
 * SectionMapper — maps section names to component types.
 *
 * This is PURELY structural mapping. No business logic, no prop resolution.
 * It answers: "Given a section named 'hero-banner', what component type renders it?"
 *
 * Business content is resolved separately by ContentResolver.
 */

import type { ApplicationBlueprint, PagePlan } from './schemas/blueprint/application-blueprint.schema.js';
import type { ComponentSlot } from './schemas/blueprint/execution-blueprint.schema.js';

// ─── Section → Component Mapping ────────────────────────────────────────────

/**
 * Registry of section-name → component-type mappings.
 * Keys are normalized section names (lowercase, hyphenated).
 * Values are just the component type name — nothing else.
 */
const SECTION_REGISTRY: Record<string, string> = {
  // Hero
  'hero': 'HeroBanner',
  'hero-banner': 'HeroBanner',
  'hero-cta': 'HeroBanner',

  // Features
  'features': 'FeatureGrid',
  'featured-products': 'ProductGrid',
  'product-grid': 'ProductGrid',
  'product-gallery': 'ProductGallery',
  'product-info': 'ProductInfo',
  'categories': 'CategoryGrid',

  // Pricing
  'pricing': 'PricingTable',
  'pricing-table': 'PricingTable',
  'feature-comparison': 'FeatureComparison',

  // Social proof
  'testimonials': 'Testimonials',
  'reviews': 'Testimonials',

  // CTA
  'cta': 'CTASection',
  'call-to-action': 'CTASection',

  // FAQ
  'faq': 'FAQSection',

  // Dashboard
  'stats-cards': 'StatsCards',
  'stats': 'StatsCards',
  'overview': 'StatsCards',
  'charts': 'ChartsPanel',
  'activity-feed': 'ActivityFeed',
  'data-grid': 'DataGrid',
  'user-management': 'DataTable',

  // Auth
  'login-form': 'AuthForm',
  'signup-form': 'AuthForm',
  'register-form': 'AuthForm',
  'social-auth': 'SocialAuth',

  // Dashboard sections
  'profile': 'ProfileSection',
  'billing': 'BillingSection',
  'notifications': 'NotificationsSection',
  'team': 'TeamSection',
  'plan-details': 'PlanDetails',
  'payment-method': 'PaymentMethod',
  'invoices': 'InvoiceList',

  // Cart / Order
  'cart-items': 'CartItems',
  'order-summary': 'OrderSummary',
  'order-review': 'OrderReview',
  'order-status': 'OrderStatus',
  'order-history': 'OrderHistory',
  'order-tracking': 'OrderTracking',
  'recommended': 'RecommendedProducts',
  'checkout-form': 'CheckoutForm',
  'payment': 'PaymentForm',

  // Account
  'addresses': 'AddressBook',
  'wishlist': 'Wishlist',

  // Content
  'about': 'AboutSection',
  'contact': 'ContactForm',
  'footer': 'Footer',
  'team-members': 'TeamGrid',
  'gallery': 'Gallery',
  'mission': 'MissionSection',
  'profile-section': 'ProfileSection',

  // Filters / Data
  'filters': 'FilterSidebar',
  'filter-sidebar': 'FilterSidebar',
  'sort-bar': 'SortBar',
  'data-table': 'DataTable',

  // Layout
  'page-header': 'PageHeader',
  'auth-form': 'AuthForm',

  // Healthcare / Restaurant (from rules engine)
  'booking-form': 'ContactForm',
  'calendar': 'CalendarWidget',
  'booking-calendar': 'BookingCalendar',
  'menu-categories': 'CategoryGrid',
  'menu-items': 'ProductGrid',
};

// ─── Section Name Normalization ──────────────────────────────────────────────

function normalizeSectionName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Map a section name to a ComponentSlot.
 * Returns undefined if no mapping exists.
 */
export function mapSectionToSlot(
  sectionName: string,
  page: PagePlan,
  blueprint: ApplicationBlueprint,
): ComponentSlot | undefined {
  const normalized = normalizeSectionName(sectionName);
  const component = SECTION_REGISTRY[normalized];

  if (!component) {
    // Fallback: create a generic placeholder
    return {
      slot: sectionName,
      component: 'PlaceholderSection',
      order: page.sections.indexOf(sectionName),
    };
  }

  return {
    slot: sectionName,
    component,
    order: page.sections.indexOf(sectionName),
  };
}

/**
 * Get all registered section names.
 */
export function getRegisteredSections(): string[] {
  return Object.keys(SECTION_REGISTRY);
}

/**
 * Get the component type for a section name.
 */
export function getComponentForSection(sectionName: string): string | undefined {
  const normalized = normalizeSectionName(sectionName);
  return SECTION_REGISTRY[normalized];
}
