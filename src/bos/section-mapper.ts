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
  'hero-spotlight': 'HeroBanner',
  'hero-search': 'HeroBanner',
  'hero-image': 'HeroBanner',
  'hero-article': 'HeroBanner',
  'product-hero': 'HeroBanner',
  'craftsmanship-hero': 'HeroBanner',

  // Features
  'features': 'FeatureGrid',
  'featured-products': 'ProductGrid',
  'product-grid': 'ProductGrid',
  'product-gallery': 'ProductGallery',
  'product-info': 'ProductInfo',
  'categories': 'CategoryGrid',
  'feature-list': 'FeatureGrid',
  'benefits': 'FeatureGrid',
  'process-steps': 'FeatureGrid',
  'service-list': 'FeatureGrid',
  'service-menu': 'FeatureGrid',
  'services-overview': 'FeatureGrid',
  'process': 'FeatureGrid',
  'technologies': 'FeatureGrid',
  'insurance': 'FeatureGrid',
  'warranty': 'FeatureGrid',
  'warranty-info': 'FeatureGrid',
  'expertise': 'FeatureGrid',
  'craftsmanship-teaser': 'FeatureGrid',
  'area-grid': 'FeatureGrid',
  'featured-programs': 'FeatureGrid',
  'service-grid': 'ProductGrid',
  'team-grid': 'TeamGrid',
  'trainer-grid': 'TeamGrid',
  'agent-grid': 'TeamGrid',
  'attorney-grid': 'TeamGrid',
  'collection-grid': 'ProductGrid',
  'featured-collections': 'ProductGrid',
  'featured-dishes': 'ProductGrid',
  'menu-grid': 'ProductGrid',
  'specials': 'ProductGrid',
  'popular-items': 'ProductGrid',
  'promotions': 'ProductGrid',
  'featured-listings': 'ProductGrid',
  'property-grid': 'ProductGrid',
  'destination-grid': 'ProductGrid',
  'popular-destinations': 'ProductGrid',
  'deals': 'ProductGrid',
  'deal-grid': 'ProductGrid',
  'flash-sale': 'ProductGrid',
  'class-grid': 'ProductGrid',
  'course-grid': 'ProductGrid',
  'project-grid': 'ProductGrid',
  'featured-projects': 'ProductGrid',
  'portfolio-grid': 'ProductGrid',
  'case-study-preview': 'ProductGrid',
  'featured-gallery': 'Gallery',
  'gallery-grid': 'Gallery',
  'macro-gallery': 'Gallery',
  'photo-grid': 'Gallery',
  'sample-gallery': 'Gallery',
  'lookbook': 'Gallery',
  'floor-plan': 'Gallery',
  'article-grid': 'ProductGrid',
  'featured-articles': 'ProductGrid',
  'trending': 'ProductGrid',
  'event-grid': 'ProductGrid',
  'vehicle-grid': 'ProductGrid',
  'package-grid': 'ProductGrid',
  'related-products': 'RecommendedProducts',
  'similar-properties': 'RecommendedProducts',
  'related-articles': 'RecommendedProducts',
  'recommendations': 'RecommendedProducts',
  'items': 'CartItems',
  'tracking': 'OrderTracking',
  'filter-bar': 'SortBar',
  'filter': 'FilterSidebar',
  'category-nav': 'FilterSidebar',
  'category-filter': 'FilterSidebar',
  'sidebar': 'FilterSidebar',
  'search': 'FilterSidebar',
  'service-select': 'FilterSidebar',

  // Pricing
  'pricing': 'PricingTable',
  'pricing-table': 'PricingTable',
  'feature-comparison': 'FeatureComparison',
  'comparisons': 'FeatureComparison',
  'comparison': 'FeatureComparison',
  'pricing-preview': 'PricingTable',
  'financing': 'PricingTable',
  'calculator': 'PricingTable',
  'recurring-options': 'PricingTable',

  // Social proof
  'testimonials': 'Testimonials',
  'reviews': 'Testimonials',
  'social-proof': 'Testimonials',
  'clients': 'Testimonials',
  'stories': 'Testimonials',

  // CTA
  'cta': 'CTASection',
  'call-to-action': 'CTASection',
  'dealer-cta': 'CTASection',
  'enroll-cta': 'CTASection',
  'newsletter-cta': 'CTASection',
  'donate-cta': 'CTASection',
  'consultation-cta': 'CTASection',
  'emergency': 'CTASection',
  'next-project': 'CTASection',

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
  'dashboard-widgets': 'StatsCards',
  'impact-stats': 'StatsCards',
  'donation-stats': 'StatsCards',
  'milestones': 'StatsCards',
  'awards': 'StatsCards',
  'countdown': 'StatsCards',
  'progress-overview': 'StatsCards',
  'results': 'StatsCards',
  'progress': 'ChartsPanel',
  'campaign-progress': 'ChartsPanel',
  'impact-breakdown': 'ChartsPanel',

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
  'team-members': 'TeamGrid',
  'team-preview': 'TeamGrid',
  'plan-details': 'PlanDetails',
  'payment-method': 'PaymentMethod',
  'invoices': 'InvoiceList',
  'instructor': 'TeamSection',
  'chef': 'TeamSection',
  'agent-card': 'TeamSection',
  'trainer-detail': 'ProfileSection',
  'attorney-detail': 'ProfileSection',
  'client-detail': 'ProfileSection',
  'agent-detail': 'ProfileSection',
  'course-info': 'ProductInfo',
  'area-detail': 'ProductInfo',
  'property-info': 'ProductInfo',
  'project-info': 'ProductInfo',
  'service-detail': 'ProductInfo',
  'specifications': 'ProductInfo',
  'specs': 'ProductInfo',

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
  'trip-status': 'OrderStatus',
  'case-status': 'OrderStatus',
  'favorites': 'Wishlist',
  'enrolled-courses': 'DataTable',
  'certificates': 'DataTable',

  // Account
  'addresses': 'AddressBook',
  'wishlist': 'Wishlist',

  // Content
  'about': 'AboutSection',
  'contact': 'ContactForm',
  'contact-form': 'ContactForm',
  'inquiry-form': 'ContactForm',
  'donation-form': 'ContactForm',
  'rfp-form': 'ContactForm',
  'volunteer-signup': 'ContactForm',
  'claims-form': 'ContactForm',
  'apply-form': 'ContactForm',
  'contact-dealer': 'ContactForm',
  'map-directory': 'ContactForm',
  'concierge-service': 'ContactForm',
  'office-info': 'ContactForm',
  'location-info': 'ContactForm',
  'hours': 'ContactForm',
  'footer': 'Footer',
  'gallery': 'Gallery',
  'mission': 'MissionSection',
  'profile-section': 'ProfileSection',
  'story': 'AboutSection',
  'heritage-story': 'AboutSection',
  'brand-story': 'AboutSection',
  'artisan-story': 'AboutSection',
  'culture': 'AboutSection',
  'sustainability': 'AboutSection',
  'heritage-timeline': 'DataTable',
  'timeline': 'DataTable',
  'curriculum': 'DataTable',
  'document-viewer': 'DataTable',
  'case-studies': 'DataTable',
  'annual-report': 'DataTable',
  'article-list': 'DataTable',
  'article-body': 'DataTable',
  'role-list': 'DataTable',
  'bios': 'DataTable',
  'grading': 'DataTable',
  'exports': 'DataTable',
  'dealer-list': 'DataTable',
  'article': 'DataTable',

  // Filters / Data
  'filters': 'FilterSidebar',
  'filter-sidebar': 'FilterSidebar',
  'sort-bar': 'SortBar',
  'data-table': 'DataTable',

  // Layout
  'page-header': 'PageHeader',
  'auth-form': 'AuthForm',
  'article-header': 'PageHeader',

  // Healthcare / Restaurant (from rules engine)
  'booking-form': 'ContactForm',
  'calendar': 'CalendarWidget',
  'booking-calendar': 'BookingCalendar',
  'menu-categories': 'CategoryGrid',
  'menu-items': 'ProductGrid',
  'availability-calendar': 'CalendarWidget',
  'class-schedule': 'CalendarWidget',
  'schedule': 'CalendarWidget',
  'booking': 'BookingCalendar',
  'registration': 'BookingCalendar',
  'shift-schedule': 'CalendarWidget',
  'prescription-form': 'DataTable',
  'receiving-form': 'DataTable',
  'location-assignment': 'DataTable',
  'pick-list': 'DataTable',
  'shipping-form': 'DataTable',
  'photo-gallery': 'Gallery',
  'lightbox': 'Gallery',
  'video': 'Gallery',
  'neighborhoods': 'CategoryGrid',
  'topic-grid': 'CategoryGrid',
  'brands': 'CategoryGrid',
  'map-view': 'ContactForm',

  // Misc domain-specific → closest semantic match
  'social-links': 'ContactForm',
  'promo-code': 'CheckoutForm',
  'delivery-info': 'CheckoutForm',
  'transfer-form': 'CheckoutForm',

  // Supplement marketplace specific sections
  'supplement-hero': 'HeroBanner',
  'supplement-grid': 'ProductGrid',
  'supplement-gallery': 'ProductGallery',
  'supplement-info': 'ProductInfo',
  'supplement-detail': 'ProductInfo',
  'brand-filter': 'CategoryGrid',
  'ingredient-list': 'FeatureGrid',
  'ingredient-info': 'FeatureGrid',
  'dosage-guide': 'FeatureGrid',
  'nutrition-facts': 'FeatureGrid',
  'fssai-badge': 'FeatureGrid',
  'certification-badge': 'FeatureGrid',
  'health-goal': 'CategoryGrid',
  'multi-vendor-cart': 'CheckoutForm',
  'seller-info': 'TeamGrid',
  'seller-list': 'TeamGrid',
  'customer-reviews': 'FeatureGrid',
  'review-carousel': 'FeatureGrid',
  'supplement-comparison': 'FeatureGrid',
  'supplement-bundle': 'ProductGrid',
  'supplement-subscription': 'ProductGrid',
  'supplement-category': 'CategoryGrid',
  'supplement-featured': 'ProductGrid',
  'supplement-bestseller': 'ProductGrid',
  'supplement-new': 'ProductGrid',
  'supplement-sale': 'ProductGrid',
  'supplement-related': 'ProductGrid',
  'supplement-also-bought': 'ProductGrid',
  'supplement-trust': 'FeatureGrid',
  'supplement-disclaimer': 'FeatureGrid',
  'supplement-faq': 'FeatureGrid',
  'supplement-contact': 'ContactForm',
  'supplement-blog': 'FeatureGrid',
  'supplement-newsletter': 'ContactForm',
  'supplement-social-proof': 'FeatureGrid',
  'supplement-testimonials': 'FeatureGrid',
  'supplement-cta': 'HeroBanner',
  'supplement-promo': 'HeroBanner',
  'supplement-banner': 'HeroBanner',
  'supplement-deal': 'HeroBanner',
  'supplement-brand-story': 'AboutSection',
  'supplement-brand-page': 'AboutSection',
  'supplement-brand-list': 'TeamGrid',
  'supplement-ingredient-detail': 'FeatureGrid',
  'supplement-ingredient-grid': 'FeatureGrid',
  'supplement-lab-report': 'FeatureGrid',
  'supplement-trust-badges': 'FeatureGrid',
  'supplement-shipping': 'CheckoutForm',
  'supplement-returns': 'FeatureGrid',
  'supplement-support': 'ContactForm',

  // Industry template specific sections (from industry-templates.ts)
  'info': 'FeatureGrid',
  'practice-areas': 'FeatureGrid',
  'case-results': 'StatsCards',
  'reminders': 'DataTable',
  'featured-work': 'ProductGrid',
  'featured-vehicles': 'ProductGrid',
  'featured-events': 'ProductGrid',
  'packages': 'PricingTable',
  'availability': 'CalendarWidget',
  'publications': 'DataTable',
  'featured-cases': 'ProductGrid',
  'case-grid': 'ProductGrid',
  'screenshots': 'Gallery',
  'featured-collection': 'ProductGrid',
  'size-guide': 'DataTable',
  'shop-the-look': 'ProductGrid',
  'values': 'FeatureGrid',
  'eta': 'StatsCards',
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
    return {
      slot: sectionName,
      component: 'FeatureGrid',
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
