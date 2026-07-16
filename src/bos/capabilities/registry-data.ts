// ─── Canonical Capability Dataset (Phase R2) ──────────────────────────
// The single vocabulary. `aliases` fold the legacy namespaces (vocab A
// CAPABILITY_REGISTRY, primitive-pack tags, skill-pack capability, page-level
// capability-registry, motion, BI workflow, AppFamily, taxonomy legacy,
// CapabilitySchema.category) into one canonical id.
//
// `primitivePackTags` bridge canonical ids onto the existing primitive-pack
// `providesCapabilities` tags so the legacy knowledge-composition graph can be
// driven by canonical ids without rewriting every pack.

import type { Capability } from './types.js';

interface CapabilitySeed {
  id: string;
  displayName: string;
  aliases: string[];
  dependencies?: string[];
  industries?: string[];
  primitivePackTags?: string[];
}

function cap(s: CapabilitySeed): Capability {
  const domain = s.id.includes('.') ? s.id.split('.')[0] : s.id;
  return {
    id: s.id,
    displayName: s.displayName,
    aliases: s.aliases,
    domain,
    parents: [],
    children: [],
    dependencies: s.dependencies ?? [],
    requiredEntities: [],
    requiredWorkflows: [],
    requiredComponents: [],
    requiredEvaluators: [],
    requiredExperience: [],
    rendererSupport: [],
    industries: s.industries ?? [],
    primitivePackTags: s.primitivePackTags,
  };
}

export const CANONICAL_CAPABILITIES: Capability[] = [
  // ── Commerce domain ───────────────────────────────────────────────
  cap({
    id: 'commerce.catalog',
    displayName: 'Product Catalog',
    aliases: ['commerce', 'catalog', 'shop', 'store', 'products', 'ecommerce', 'retail', 'product-listing', 'shoes', 'sneakers', 'footwear'],
    dependencies: [],
    industries: ['ecommerce', 'retail', 'footwear', 'marketplace'],
    primitivePackTags: ['ecommerce', 'retail', 'shop'],
  }),
  cap({
    id: 'commerce.cart',
    displayName: 'Shopping Cart',
    aliases: ['cart', 'basket', 'shopping-cart'],
    dependencies: ['commerce.catalog'],
    industries: ['ecommerce', 'retail', 'marketplace', 'footwear'],
    primitivePackTags: ['ecommerce'],
  }),
  cap({
    id: 'commerce.checkout',
    displayName: 'Checkout',
    aliases: ['checkout', 'purchase', 'pay', 'buy', 'order-now', 'commerce-checkout'],
    dependencies: ['commerce.cart', 'payments', 'pricing', 'commerce.orders', 'tax', 'discounts', 'shipping'],
    industries: ['ecommerce', 'retail', 'marketplace', 'footwear'],
    primitivePackTags: ['ecommerce'],
  }),
  cap({
    id: 'commerce.orders',
    displayName: 'Order Management',
    aliases: ['orders', 'order-management', 'order', 'order-history'],
    dependencies: ['payments', 'commerce.catalog', 'notifications.email'],
    industries: ['ecommerce', 'retail', 'marketplace', 'footwear'],
    primitivePackTags: ['ecommerce'],
  }),
  cap({
    id: 'payments',
    displayName: 'Payments',
    aliases: ['payment', 'pay', 'billing', 'payment-gateway'],
    dependencies: ['commerce.cart'],
    industries: ['ecommerce', 'retail', 'marketplace', 'saas', 'membership'],
    primitivePackTags: ['ecommerce'],
  }),
  cap({
    id: 'pricing',
    displayName: 'Pricing',
    aliases: ['price', 'pricing', 'pricing-engine'],
    dependencies: [],
    industries: ['ecommerce', 'retail', 'marketplace', 'footwear', 'food'],
    primitivePackTags: ['ecommerce'],
  }),
  cap({
    id: 'tax',
    displayName: 'Tax',
    aliases: ['tax', 'vat', 'gst', 'taxation'],
    dependencies: [],
    industries: ['ecommerce', 'retail', 'marketplace'],
    primitivePackTags: ['ecommerce'],
  }),
  cap({
    id: 'discounts',
    displayName: 'Discounts & Coupons',
    aliases: ['discount', 'coupon', 'promo', 'discounts'],
    dependencies: [],
    industries: ['ecommerce', 'retail', 'marketplace'],
    primitivePackTags: ['ecommerce'],
  }),
  cap({
    id: 'shipping',
    displayName: 'Shipping',
    aliases: ['shipping', 'delivery-shipping', 'postage'],
    dependencies: ['commerce.orders'],
    industries: ['ecommerce', 'retail', 'marketplace'],
    primitivePackTags: ['ecommerce'],
  }),
  cap({
    id: 'fulfillment',
    displayName: 'Fulfillment',
    aliases: ['fulfillment', 'fulfilment', 'order-fulfillment'],
    dependencies: ['commerce.orders', 'shipping', 'notifications.email'],
    industries: ['ecommerce', 'retail', 'marketplace', 'food-delivery'],
    primitivePackTags: ['ecommerce'],
  }),
  cap({
    id: 'inventory.management',
    displayName: 'Inventory Management',
    aliases: ['inventory', 'stock', 'stock-management', 'inventory-management'],
    dependencies: ['commerce.catalog'],
    industries: ['manufacturing', 'erp', 'warehouse', 'retail', 'food', 'marketplace'],
    primitivePackTags: ['inventory'],
  }),
  cap({
    id: 'marketplace',
    displayName: 'Marketplace (Multi-vendor)',
    aliases: ['marketplace', 'multi-vendor', 'multivendor', 'marketplace-platform'],
    dependencies: ['commerce.catalog', 'commerce.orders', 'payments', 'inventory.management'],
    industries: ['marketplace'],
    primitivePackTags: ['marketplace'],
  }),

  // ── Food & Beverage domain ────────────────────────────────────────
  cap({
    id: 'food.menu',
    displayName: 'Menu',
    aliases: ['menu', 'food-menu', 'restaurant', 'dining', 'restaurant-menu', 'food-place'],
    dependencies: ['commerce.catalog'],
    industries: ['restaurant', 'burger', 'cafe', 'coffee', 'food'],
    primitivePackTags: ['restaurant', 'food', 'cafe', 'coffee'],
  }),
  cap({
    id: 'food.ordering',
    displayName: 'Online Food Ordering',
    aliases: ['food-ordering', 'online-ordering', 'order-food', 'food-order'],
    dependencies: ['food.menu', 'commerce.cart', 'commerce.checkout'],
    industries: ['restaurant', 'burger', 'food-delivery', 'cafe'],
    primitivePackTags: ['restaurant', 'food-delivery'],
  }),
  cap({
    id: 'food.delivery',
    displayName: 'Food Delivery',
    aliases: ['delivery', 'food-delivery', 'food-delivery-platform'],
    dependencies: ['food.ordering', 'fulfillment', 'notifications.sms'],
    industries: ['food-delivery', 'restaurant', 'burger'],
    primitivePackTags: ['food-delivery'],
  }),

  // ── Booking & Scheduling domain ───────────────────────────────────
  cap({
    id: 'scheduling',
    displayName: 'Scheduling & Calendar',
    aliases: ['schedule', 'calendar', 'slots', 'time-slots', 'scheduling'],
    dependencies: [],
    industries: ['booking', 'hotel', 'salon', 'spa', 'gym', 'healthcare'],
    primitivePackTags: ['booking'],
  }),
  cap({
    id: 'booking.reservation',
    displayName: 'Reservation',
    aliases: ['booking', 'reservation', 'reserve', 'table-booking', 'table-reservation'],
    dependencies: ['scheduling', 'notifications.email'],
    industries: ['restaurant', 'hotel', 'salon', 'spa'],
    primitivePackTags: ['restaurant', 'booking'],
  }),
  cap({
    id: 'booking.appointment',
    displayName: 'Appointment Booking',
    aliases: ['appointment', 'appointment-booking', 'book-appointment', 'appointments'],
    dependencies: ['scheduling', 'crm.contacts', 'notifications.email'],
    industries: ['healthcare', 'clinic', 'dental', 'salon', 'spa', 'gym', 'hospital'],
    primitivePackTags: ['booking', 'healthcare', 'clinic', 'dental'],
  }),

  // ── CRM / ERP domain ──────────────────────────────────────────────
  cap({
    id: 'crm.contacts',
    displayName: 'Contacts & Customer Management',
    aliases: ['crm', 'contacts', 'customers', 'customer-management', 'leads', 'lead'],
    dependencies: ['auth'],
    industries: ['saas', 'crm', 'erp', 'healthcare', 'manufacturing', 'marketplace'],
    primitivePackTags: ['crm', 'saas'],
  }),
  cap({
    id: 'crm.deals',
    displayName: 'Deal & Pipeline Management',
    aliases: ['deals', 'pipeline', 'sales-pipeline', 'crm-deals'],
    dependencies: ['crm.contacts'],
    industries: ['crm', 'saas'],
    primitivePackTags: ['crm'],
  }),
  cap({
    id: 'crm.support',
    displayName: 'Support & Helpdesk',
    aliases: ['support', 'helpdesk', 'ticketing', 'customer-support'],
    dependencies: ['crm.contacts', 'notifications.email'],
    industries: ['crm', 'saas', 'marketplace'],
    primitivePackTags: ['crm'],
  }),
  cap({
    id: 'erp.inventory',
    displayName: 'ERP Inventory',
    aliases: ['erp-inventory', 'stock-management-erp', 'erp-stock', 'erp', 'inventory-erp'],
    dependencies: ['inventory.management'],
    industries: ['manufacturing', 'erp', 'warehouse'],
    primitivePackTags: ['manufacturing', 'erp', 'warehouse'],
  }),
  cap({
    id: 'erp.procurement',
    displayName: 'Procurement',
    aliases: ['procurement', 'purchasing', 'erp-procurement'],
    dependencies: ['inventory.management'],
    industries: ['manufacturing', 'erp'],
    primitivePackTags: ['manufacturing', 'erp'],
  }),
  cap({
    id: 'erp.manufacturing',
    displayName: 'Manufacturing / Production',
    aliases: ['manufacturing', 'production', 'mrp', 'erp-manufacturing'],
    dependencies: ['inventory.management', 'erp.procurement'],
    industries: ['manufacturing', 'erp'],
    primitivePackTags: ['manufacturing', 'erp'],
  }),

  // ── Healthcare domain ─────────────────────────────────────────────
  cap({
    id: 'healthcare.records',
    displayName: 'Medical Records',
    aliases: ['medical-records', 'patient-records', 'ehr', 'emr', 'health-records', 'hospital', 'clinic-software'],
    dependencies: ['crm.contacts'],
    industries: ['healthcare', 'clinic', 'dental', 'hospital'],
    primitivePackTags: ['healthcare', 'clinic', 'dental'],
  }),
  cap({
    id: 'healthcare.appointments',
    displayName: 'Clinical Appointments',
    aliases: ['healthcare-appointment', 'clinic-booking', 'patient-booking', 'medical-appointment'],
    dependencies: ['booking.appointment', 'healthcare.records'],
    industries: ['healthcare', 'clinic', 'dental', 'hospital'],
    primitivePackTags: ['healthcare', 'clinic', 'dental'],
  }),
  cap({
    id: 'healthcare.telemedicine',
    displayName: 'Telemedicine',
    aliases: ['telemedicine', 'virtual-visit', 'online-consult', 'telehealth'],
    dependencies: ['healthcare.appointments', 'notifications.email'],
    industries: ['healthcare', 'clinic'],
    primitivePackTags: ['healthcare'],
  }),

  // ── Notifications domain ──────────────────────────────────────────
  cap({
    id: 'notifications.email',
    displayName: 'Email Notifications',
    aliases: ['email', 'notification', 'notifications', 'notify', 'email-notification'],
    dependencies: [],
    primitivePackTags: ['notification'],
  }),
  cap({
    id: 'notifications.sms',
    displayName: 'SMS Notifications',
    aliases: ['sms', 'text-message', 'sms-notification'],
    dependencies: [],
    primitivePackTags: ['notification'],
  }),
  cap({
    id: 'notifications.push',
    displayName: 'Push Notifications',
    aliases: ['push', 'push-notification', 'web-push'],
    dependencies: [],
    primitivePackTags: ['notification'],
  }),

  // ── Content & Auth domain ─────────────────────────────────────────
  cap({
    id: 'content.management',
    displayName: 'Content Management',
    aliases: ['content', 'cms', 'blog', 'content-management'],
    dependencies: [],
    industries: ['saas', 'marketplace', 'media'],
    primitivePackTags: ['content:standard'],
  }),
  cap({
    id: 'content.marketing',
    displayName: 'Content Marketing & SEO',
    aliases: ['marketing', 'seo', 'content-marketing', 'seo-content'],
    dependencies: [],
    industries: ['saas', 'ecommerce', 'marketplace', 'media'],
    primitivePackTags: ['content:seo-heavy', 'content:premium-brand'],
  }),
  cap({
    id: 'auth',
    displayName: 'Authentication',
    aliases: ['auth', 'authentication', 'login', 'authn', 'signin', 'sign-in'],
    dependencies: [],
    industries: ['saas', 'crm', 'marketplace', 'membership', 'healthcare', 'erp'],
    primitivePackTags: ['auth'],
  }),
  cap({
    id: 'membership',
    displayName: 'Membership',
    aliases: ['membership', 'member', 'members'],
    dependencies: ['auth', 'payments'],
    industries: ['membership', 'gym', 'saas', 'club'],
    primitivePackTags: ['membership'],
  }),
  cap({
    id: 'subscriptions',
    displayName: 'Subscriptions',
    aliases: ['subscription', 'subscription-billing', 'recurring-billing', 'subscriptions'],
    dependencies: ['auth', 'payments'],
    industries: ['saas', 'membership', 'gym', 'media'],
    primitivePackTags: ['subscription'],
  }),

  // ── Analytics domain ──────────────────────────────────────────────
  cap({
    id: 'analytics.dashboard',
    displayName: 'Analytics Dashboard',
    aliases: ['analytics', 'dashboard', 'metrics', 'analytics-dashboard'],
    dependencies: [],
    industries: ['saas', 'erp', 'marketplace', 'crm', 'media'],
    primitivePackTags: ['analytics', 'saas'],
  }),
  cap({
    id: 'analytics.reporting',
    displayName: 'Reporting',
    aliases: ['reporting', 'reports', 'analytics-reporting'],
    dependencies: ['analytics.dashboard'],
    industries: ['saas', 'erp', 'marketplace'],
    primitivePackTags: ['analytics', 'reporting'],
  }),

  // ── Social domain ─────────────────────────────────────────────────
  cap({
    id: 'social.ugc',
    displayName: 'User-Generated Content',
    aliases: ['ugc', 'reviews', 'community', 'user-generated-content', 'ratings'],
    dependencies: ['crm.contacts'],
    industries: ['marketplace', 'community', 'media'],
    primitivePackTags: ['ugc', 'reviews', 'community'],
  }),
];
