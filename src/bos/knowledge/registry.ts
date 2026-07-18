import type { DesignProfile } from '../schemas/knowledge/design-profile.schema.js';
import type { Pattern } from '../schemas/knowledge/pattern.schema.js';
import type { SkillPack } from '../schemas/knowledge/skill-pack.schema.js';
import type { BusinessModel } from '../schemas/knowledge/business-model.schema.js';
import type { Journey } from '../schemas/knowledge/journey.schema.js';
import type { CompliancePack } from '../schemas/knowledge/compliance-pack.schema.js';
import { LUXURY_DARK_OPULENCE } from './design-profiles/luxury-dark-opulence.js';
import { SAAS_MODERN } from './design-profiles/saas-modern.js';
import { HEALTHCARE_CLEAN, ECOMMERCE_MODERN } from './design-profiles/healthcare-clean.js';
import { SUPPLEMENT_MARKETPLACE } from './design-profiles/supplement-marketplace.js';
import {
  RESTAURANT_WARM,
  FITNESS_ENERGETIC,
  EDUCATION_FRIENDLY,
  REALESTATE_PREMIUM,
  FINTECH_SECURE,
  ENTERPRISE_CLEAN,
  NONPROFIT_WARM,
  MEDIA_CONTENT,
  TRAVEL_VIBRANT,
  LEGAL_TRUST,
  AGENCY_BOLD,
  LOGISTICS_RELIABLE,
} from './design-profiles/industry-profiles.js';
import { LUXURY_WATCH_BRAND } from './patterns/luxury-watch-brand.js';
import { ECOMMERCE_MARKETPLACE, SAAS_PLATFORM } from './patterns/ecommerce-marketplace.js';
import { CAP_INVENTORY_LITE } from './skill-packs/cap-inventory-lite.js';
import { CAP_AUTH, CAP_PAYMENT, CAP_NOTIFICATION, CAP_COMPLIANCE, CAP_ANALYTICS } from './skill-packs/capability-packs.js';
import {
  RESTAURANT_BOOKING, FITNESS_GYM, EDUCATION_ELEARNING, REAL_ESTATE_LISTING,
  TRAVEL_AGENCY, LEGAL_FIRM, AGENCY_CREATIVE, MEDIA_PUBLISHING,
  NONPROFIT_CHARITY, AUTOMOTIVE_DEALER, PET_SERVICES, WEDDING_EVENTS,
  DENTAL_CLINIC, ARCHITECTURE_FIRM, PHOTOGRAPHY_STUDIO, CONSULTING_FIRM,
  SAAS_STARTUP, ECOMMERCE_FASHION, ECOMMERCE_FOOD_DELIVERY, ECOMMERCE_ELECTRONICS,
  WHOLESALE_B2B,
} from './patterns/industry-templates.js';
// ─── Phase 1A: Enterprise Patterns ───────────────────────────────────────────
import {
  HOSPITAL_MANAGEMENT,
  ERP_SYSTEM,
  HRM_SYSTEM,
  SCHOOL_LMS,
  CRM_ENTERPRISE,
  LOGISTICS_PLATFORM,
  MANUFACTURING_ERP,
  TASK_TRACKER,
} from './patterns/enterprise-patterns.js';
// ─── Phase 1B: Enterprise Skill Packs ────────────────────────────────────────
import {
  CAP_APPOINTMENTS,
  CAP_HR_MANAGEMENT,
  CAP_BILLING_ENTERPRISE,
  CAP_WORKFLOW_ENGINE,
  CAP_REPORTING,
  CAP_DOCUMENT_MANAGEMENT,
  CAP_ROLE_PERMISSIONS,
  CAP_AUDIT_LOG,
} from './skill-packs/enterprise-packs.js';

export const DESIGN_PROFILES: DesignProfile[] = [
  LUXURY_DARK_OPULENCE,
  SAAS_MODERN,
  HEALTHCARE_CLEAN,
  ECOMMERCE_MODERN,
  SUPPLEMENT_MARKETPLACE,
  RESTAURANT_WARM,
  FITNESS_ENERGETIC,
  EDUCATION_FRIENDLY,
  REALESTATE_PREMIUM,
  FINTECH_SECURE,
  ENTERPRISE_CLEAN,
  NONPROFIT_WARM,
  MEDIA_CONTENT,
  TRAVEL_VIBRANT,
  LEGAL_TRUST,
  AGENCY_BOLD,
  LOGISTICS_RELIABLE,
];

export const PATTERNS: Pattern[] = [
  // B2C / SMB patterns (existing — 23 total)
  LUXURY_WATCH_BRAND,
  ECOMMERCE_MARKETPLACE,
  SAAS_PLATFORM,
  RESTAURANT_BOOKING,
  FITNESS_GYM,
  EDUCATION_ELEARNING,
  REAL_ESTATE_LISTING,
  TRAVEL_AGENCY,
  LEGAL_FIRM,
  AGENCY_CREATIVE,
  MEDIA_PUBLISHING,
  NONPROFIT_CHARITY,
  AUTOMOTIVE_DEALER,
  PET_SERVICES,
  WEDDING_EVENTS,
  DENTAL_CLINIC,
  ARCHITECTURE_FIRM,
  PHOTOGRAPHY_STUDIO,
  CONSULTING_FIRM,
  SAAS_STARTUP,
  ECOMMERCE_FASHION,
  ECOMMERCE_FOOD_DELIVERY,
  ECOMMERCE_ELECTRONICS,
  WHOLESALE_B2B,
  // Enterprise patterns (Phase 1A — 7 new)
  HOSPITAL_MANAGEMENT,
  ERP_SYSTEM,
  HRM_SYSTEM,
  SCHOOL_LMS,
  CRM_ENTERPRISE,
  LOGISTICS_PLATFORM,
  MANUFACTURING_ERP,
  TASK_TRACKER,
];

export const SKILL_PACKS: SkillPack[] = [
  // Existing packs (6)
  CAP_INVENTORY_LITE,
  CAP_AUTH,
  CAP_PAYMENT,
  CAP_NOTIFICATION,
  CAP_COMPLIANCE,
  CAP_ANALYTICS,
  // Enterprise packs (Phase 1B — 8 new)
  CAP_APPOINTMENTS,
  CAP_HR_MANAGEMENT,
  CAP_BILLING_ENTERPRISE,
  CAP_WORKFLOW_ENGINE,
  CAP_REPORTING,
  CAP_DOCUMENT_MANAGEMENT,
  CAP_ROLE_PERMISSIONS,
  CAP_AUDIT_LOG,
];

/**
 * Canonical, ORTHOGONAL business models.
 *
 * These describe HOW a business makes money / captures value. They are a
 * first-class dimension independent of vertical (what the business IS) and of
 * audience scope. A single business may match several (e.g. a SaaS with a
 * freemium tier AND usage-based overages). They are keyed by `bm.<id>` and
 * consumed by capability resolution, pricing, KPI, and compliance engines.
 *
 * 35 models are registered below — a deliberately broad, non-exhaustive but
 * production-covering set spanning recurring, transactional, usage, service,
 * intermediary, audience, and mission-driven mechanics.
 */
export const BUSINESS_MODELS: BusinessModel[] = [
  {
    id: 'bm.subscription', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Subscription',
    description: 'Recurring billing for ongoing access',
    influences: {
      pages: [{ condition: 'true', action: 'add_pricing_page', priority: 10 }],
      pricing: [{ condition: 'true', action: 'show_tiers', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_mrr_churn_ltv', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      workflows: [],
      dashboards: [],
    },
    compatibleIndustries: ['saas', 'fitness', 'education', 'media'],
    keywords: ['subscription', 'recurring', 'monthly', 'annual', 'membership-plan'],
  },
  {
    id: 'bm.direct-sales', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Direct Sales',
    description: 'One-time purchase, direct to buyer',
    influences: {
      pages: [{ condition: 'true', action: 'add_shop_page', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      pricing: [],
      workflows: [],
      kpis: [],
      dashboards: [],
    },
    compatibleIndustries: ['luxury', 'fashion', 'electronics', 'ecommerce'],
    keywords: ['direct', 'ecommerce', 'shop', 'buy', 'purchase'],
  },
  {
    id: 'bm.marketplace', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Marketplace',
    description: 'Multi-vendor platform taking commission on transactions',
    influences: {
      pages: [{ condition: 'true', action: 'add_vendor_dashboard', priority: 10 }],
      workflows: [{ condition: 'true', action: 'add_vendor_onboarding', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_gmv_take_rate', priority: 10 }],
      pricing: [],
      integrations: [],
      dashboards: [],
    },
    compatibleIndustries: ['ecommerce', 'services', 'food'],
    keywords: ['marketplace', 'vendor', 'multi-seller', 'platform'],
  },
  {
    id: 'bm.freemium', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Freemium',
    description: 'Free tier with paid upgrades',
    influences: {
      pages: [{ condition: 'true', action: 'add_pricing_page', priority: 10 }],
      pricing: [{ condition: 'true', action: 'show_tiers', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_conversion_to_paid', priority: 10 }],
      integrations: [],
      workflows: [],
      dashboards: [],
    },
    compatibleIndustries: ['saas', 'media', 'education'],
    keywords: ['freemium', 'free tier', 'free plan', 'free version'],
  },
  {
    id: 'bm.usage-based', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Usage-Based',
    description: 'Pay for what you consume (metered)',
    influences: {
      pages: [{ condition: 'true', action: 'add_pricing_page', priority: 10 }],
      pricing: [{ condition: 'true', action: 'show_metered', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_usage_revenue', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      workflows: [],
      dashboards: [],
    },
    compatibleIndustries: ['saas', 'cloud', 'utilities', 'logistics'],
    keywords: ['usage-based', 'pay-as-you-go', 'metered', 'per-use', 'consumption'],
  },
  {
    id: 'bm.wholesale', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Wholesale / B2B',
    description: 'Bulk sales to resellers and businesses',
    influences: {
      pages: [{ condition: 'true', action: 'add_quote_request', priority: 10 }],
      workflows: [{ condition: 'true', action: 'add_rfq_workflow', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_order_volume', priority: 10 }],
      integrations: [],
      pricing: [{ condition: 'true', action: 'show_volume_tiers', priority: 10 }],
      dashboards: [],
    },
    compatibleIndustries: ['manufacturing', 'distribution', 'food', 'retail'],
    keywords: ['wholesale', 'bulk', 'distributor', 'b2b', 'reseller'],
  },
  {
    id: 'bm.service-booking', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Service Booking',
    description: 'Time-based booking of services',
    influences: {
      pages: [{ condition: 'true', action: 'add_booking_page', priority: 10 }],
      workflows: [{ condition: 'true', action: 'add_scheduling', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_calendar', priority: 10 }],
      pricing: [],
      kpis: [],
      dashboards: [],
    },
    compatibleIndustries: ['healthcare', 'salon', 'fitness', 'hospitality', 'professional-services'],
    keywords: ['booking', 'appointment', 'reservation', 'schedule'],
  },
  {
    id: 'bm.membership', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Membership',
    description: 'Recurring access to a club or community',
    influences: {
      pages: [{ condition: 'true', action: 'add_membership_page', priority: 10 }],
      pricing: [{ condition: 'true', action: 'show_tiers', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_retention', priority: 10 }],
      workflows: [],
      dashboards: [],
    },
    compatibleIndustries: ['fitness', 'club', 'media', 'education'],
    keywords: ['membership', 'member', 'club'],
  },
  {
    id: 'bm.donation', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Donation',
    description: 'Mission-funded via donations and grants',
    influences: {
      pages: [{ condition: 'true', action: 'add_donate_page', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      workflows: [{ condition: 'true', action: 'add_volunteer_signup', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_donor_retention', priority: 10 }],
      pricing: [],
      dashboards: [],
    },
    compatibleIndustries: ['nonprofit', 'charity', 'education', 'community'],
    keywords: ['donation', 'donate', 'charity', 'nonprofit', 'contribute'],
  },
  {
    id: 'bm.advertising', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Advertising',
    description: 'Revenue from ad inventory / sponsored placements',
    influences: {
      pages: [{ condition: 'true', action: 'add_advertise_page', priority: 8 }],
      kpis: [{ condition: 'true', action: 'track_impressions_revenue', priority: 10 }],
      pricing: [],
      integrations: [],
      workflows: [],
      dashboards: [],
    },
    compatibleIndustries: ['media', 'content', 'social'],
    keywords: ['advertising', 'ads', 'sponsored', 'ad-space'],
  },
  {
    id: 'bm.commission', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Commission / Brokerage',
    description: 'Fee on matched transactions between parties',
    influences: {
      pages: [{ condition: 'true', action: 'add_listing_page', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_gmv_take_rate', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      pricing: [],
      workflows: [],
      dashboards: [],
    },
    compatibleIndustries: ['real-estate', 'finance', 'travel', 'recruitment'],
    keywords: ['commission', 'brokerage', 'referral-fee', 'match-fee'],
  },
  {
    id: 'bm.franchise', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Franchise',
    description: 'License the brand/model to operators',
    influences: {
      pages: [{ condition: 'true', action: 'add_franchise_page', priority: 10 }],
      workflows: [{ condition: 'true', action: 'add_franchise_inquiry', priority: 10 }],
      kpis: [],
      pricing: [],
      integrations: [],
      dashboards: [],
    },
    compatibleIndustries: ['food', 'retail', 'fitness', 'hospitality'],
    keywords: ['franchise', 'franchising', 'licensee', 'own-a-branch'],
  },
  {
    id: 'bm.licensing', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Licensing / IP',
    description: 'Monetize intellectual property and rights',
    influences: {
      pages: [{ condition: 'true', action: 'add_license_page', priority: 10 }],
      workflows: [{ condition: 'true', action: 'add_license_inquiry', priority: 10 }],
      kpis: [],
      pricing: [],
      integrations: [],
      dashboards: [],
    },
    compatibleIndustries: ['media', 'technology', 'creative', 'education'],
    keywords: ['licensing', 'license', 'royalty', 'ip', 'rights'],
  },
  {
    id: 'bm.transaction-fee', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Transaction Fee',
    description: 'Flat or percentage fee per processed transaction',
    influences: {
      pages: [{ condition: 'true', action: 'add_pricing_page', priority: 8 }],
      kpis: [{ condition: 'true', action: 'track_transaction_volume', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      pricing: [],
      workflows: [],
      dashboards: [],
    },
    compatibleIndustries: ['finance', 'saas', 'marketplace'],
    keywords: ['transaction-fee', 'per-transaction', 'processing-fee'],
  },
  {
    id: 'bm.saas', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'SaaS',
    description: 'Software delivered as a recurring service',
    influences: {
      pages: [{ condition: 'true', action: 'add_pricing_page', priority: 10 }],
      pricing: [{ condition: 'true', action: 'show_tiers', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_mrr_churn_ltv', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      workflows: [],
      dashboards: [{ condition: 'true', action: 'show_customer_dashboard', priority: 10 }],
    },
    compatibleIndustries: ['technology', 'finance', 'healthcare', 'education'],
    keywords: ['saas', 'software', 'platform', 'dashboard'],
  },
  {
    id: 'bm.lead-gen', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Lead Generation',
    description: 'Capture and monetize qualified leads',
    influences: {
      pages: [{ condition: 'true', action: 'add_contact_page', priority: 10 }],
      workflows: [{ condition: 'true', action: 'add_lead_capture', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_lead_volume', priority: 10 }],
      pricing: [],
      integrations: [],
      dashboards: [],
    },
    compatibleIndustries: ['professional-services', 'finance', 'real-estate', 'education'],
    keywords: ['lead', 'lead-gen', 'inquiry', 'quote-request', 'contact'],
  },
  {
    id: 'bm.affiliate', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Affiliate',
    description: 'Earn referral commissions on driven sales',
    influences: {
      pages: [{ condition: 'true', action: 'add_affiliate_page', priority: 8 }],
      kpis: [{ condition: 'true', action: 'track_referral_revenue', priority: 10 }],
      workflows: [],
      pricing: [],
      integrations: [],
      dashboards: [],
    },
    compatibleIndustries: ['media', 'content', 'ecommerce', 'travel'],
    keywords: ['affiliate', 'referral', 'partner-link'],
  },
  {
    id: 'bm.free-trial', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Free Trial',
    description: 'Time-limited full access before paid conversion',
    influences: {
      pages: [{ condition: 'true', action: 'add_pricing_page', priority: 10 }],
      pricing: [{ condition: 'true', action: 'show_tiers', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_trial_conversion', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      workflows: [],
      dashboards: [],
    },
    compatibleIndustries: ['saas', 'media', 'fitness', 'education'],
    keywords: ['free-trial', 'trial', 'try-free', '14-day'],
  },
  {
    id: 'bm.onsite', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'On-Demand / Instant',
    description: 'Request and pay for immediate service delivery',
    influences: {
      pages: [{ condition: 'true', action: 'add_booking_page', priority: 10 }],
      workflows: [{ condition: 'true', action: 'add_dispatch', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_fulfillment_time', priority: 10 }],
      pricing: [],
      dashboards: [],
    },
    compatibleIndustries: ['transport', 'food', 'services', 'logistics'],
    keywords: ['on-demand', 'instant', 'request-now', 'same-day'],
  },
  {
    id: 'bm.enterprise', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Enterprise / Contract',
    description: 'Custom annual contracts with large accounts',
    influences: {
      pages: [{ condition: 'true', action: 'add_enterprise_page', priority: 10 }],
      workflows: [{ condition: 'true', action: 'add_sales_inquiry', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_contract_value', priority: 10 }],
      pricing: [],
      integrations: [],
      dashboards: [],
    },
    compatibleIndustries: ['technology', 'manufacturing', 'finance', 'healthcare'],
    keywords: ['enterprise', 'contract', 'custom-quote', 'annual-agreement'],
  },
  {
    id: 'bm.d2c', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Direct-to-Consumer',
    description: 'Brand sells its own product straight to end buyers',
    influences: {
      pages: [{ condition: 'true', action: 'add_shop_page', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_repeat_purchase', priority: 10 }],
      pricing: [],
      workflows: [],
      dashboards: [],
    },
    compatibleIndustries: ['food', 'beauty', 'fashion', 'wellness', 'agriculture'],
    keywords: ['d2c', 'direct-to-consumer', 'subscription-box', 'own-brand'],
  },
  {
    id: 'bm.b2c', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'B2C Retail',
    description: 'Consumer-facing retail of goods or services',
    influences: {
      pages: [{ condition: 'true', action: 'add_shop_page', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      kpis: [],
      pricing: [],
      workflows: [],
      dashboards: [],
    },
    compatibleIndustries: ['retail', 'fashion', 'hospitality', 'food'],
    keywords: ['b2c', 'consumer', 'shop', 'store'],
  },
  {
    id: 'bm.b2b', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'B2B Supply',
    description: 'Sell goods or services to other businesses',
    influences: {
      pages: [{ condition: 'true', action: 'add_quote_request', priority: 10 }],
      workflows: [{ condition: 'true', action: 'add_rfq_workflow', priority: 10 }],
      kpis: [],
      pricing: [],
      integrations: [],
      dashboards: [],
    },
    compatibleIndustries: ['manufacturing', 'logistics', 'software', 'distribution'],
    keywords: ['b2b', 'business-to-business', 'supplier', 'oem'],
  },
  {
    id: 'bm.agency', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Agency / Retainer',
    description: 'Project and retainer-based professional services',
    influences: {
      pages: [{ condition: 'true', action: 'add_services_page', priority: 10 }],
      workflows: [{ condition: 'true', action: 'add_project_inquiry', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_utilization', priority: 10 }],
      pricing: [],
      integrations: [],
      dashboards: [],
    },
    compatibleIndustries: ['professional-services', 'creative', 'legal', 'consulting'],
    keywords: ['agency', 'retainer', 'project', 'studio'],
  },
  {
    id: 'bm.consulting', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Consulting',
    description: 'Expertise sold by the hour or engagement',
    influences: {
      pages: [{ condition: 'true', action: 'add_services_page', priority: 10 }],
      workflows: [{ condition: 'true', action: 'add_consultation_booking', priority: 10 }],
      kpis: [],
      pricing: [],
      integrations: [],
      dashboards: [],
    },
    compatibleIndustries: ['consulting', 'finance', 'technology', 'healthcare'],
    keywords: ['consulting', 'advisory', 'consultation', 'expert'],
  },
  {
    id: 'bm.marketplace-saas', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Marketplace + SaaS',
    description: 'Platform that is both a marketplace and a SaaS tool',
    influences: {
      pages: [{ condition: 'true', action: 'add_pricing_page', priority: 10 }],
      pricing: [{ condition: 'true', action: 'show_tiers', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_gmv_take_rate', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      workflows: [{ condition: 'true', action: 'add_vendor_onboarding', priority: 10 }],
      dashboards: [],
    },
    compatibleIndustries: ['saas', 'ecommerce', 'finance'],
    keywords: ['marketplace', 'saas', 'platform', 'two-sided'],
  },
  {
    id: 'bm.govt-permit', version: '1.0.0', status: 'active',
    createdAt: '2026-07-01T00:00:00+00:00', updatedAt: '2026-07-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Government / Public Permits',
    description: 'Public-sector service for permits, licenses, and civic requests',
    influences: {
      pages: [{ condition: 'true', action: 'add_permit_page', priority: 10 }],
      workflows: [{ condition: 'true', action: 'add_permit_workflow', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_request_volume', priority: 10 }],
      pricing: [],
      integrations: [],
      dashboards: [{ condition: 'true', action: 'show_admin_dashboard', priority: 10 }],
    },
    compatibleIndustries: ['government', 'public-sector', 'utilities'],
    keywords: ['permit', 'license', 'application', 'civic', 'government'],
  },
  {
    id: 'bm.crowdfunding', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Crowdfunding',
    description: 'Raise funds from many backers for a goal',
    influences: {
      pages: [{ condition: 'true', action: 'add_campaign_page', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_funding_progress', priority: 10 }],
      pricing: [],
      workflows: [],
      dashboards: [],
    },
    compatibleIndustries: ['creative', 'technology', 'nonprofit', 'media'],
    keywords: ['crowdfunding', 'backers', 'campaign', 'pledge'],
  },
  {
    id: 'bm.data-monetization', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Data / Insights',
    description: 'Sell data, reports, or analytics access',
    influences: {
      pages: [{ condition: 'true', action: 'add_reports_page', priority: 10 }],
      pricing: [{ condition: 'true', action: 'show_tiers', priority: 10 }],
      kpis: [],
      integrations: [],
      workflows: [],
      dashboards: [{ condition: 'true', action: 'show_customer_dashboard', priority: 10 }],
    },
    compatibleIndustries: ['finance', 'technology', 'media', 'research'],
    keywords: ['data', 'insights', 'reports', 'analytics-access'],
  },
  {
    id: 'bm.pay-per-use', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Pay-Per-Use',
    description: 'Charge per discrete use (event, seat, item)',
    influences: {
      pages: [{ condition: 'true', action: 'add_pricing_page', priority: 10 }],
      pricing: [{ condition: 'true', action: 'show_metered', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_usage_revenue', priority: 10 }],
      workflows: [],
      dashboards: [],
    },
    compatibleIndustries: ['saas', 'logistics', 'utilities', 'media'],
    keywords: ['pay-per-use', 'per-seat', 'per-event', 'per-item'],
  },
  {
    id: 'bm.freemium-trial', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Freemium + Trial',
    description: 'Free tier combined with a time-limited premium trial',
    influences: {
      pages: [{ condition: 'true', action: 'add_pricing_page', priority: 10 }],
      pricing: [{ condition: 'true', action: 'show_tiers', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_trial_conversion', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      workflows: [],
      dashboards: [],
    },
    compatibleIndustries: ['saas', 'media', 'education'],
    keywords: ['freemium', 'free-trial', 'trial', 'free-plan'],
  },
  {
    id: 'bm.hybrid', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Hybrid',
    description: 'Blends multiple monetization mechanics',
    influences: {
      pages: [{ condition: 'true', action: 'add_pricing_page', priority: 8 }],
      pricing: [{ condition: 'true', action: 'show_tiers', priority: 8 }],
      kpis: [],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 8 }],
      workflows: [],
      dashboards: [],
    },
    compatibleIndustries: ['saas', 'media', 'retail', 'education'],
    keywords: ['hybrid', 'multi-model', 'combined'],
  },
  {
    id: 'bm.agent-builder', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Agent / Builder Platform',
    description: 'Let users build and deploy on a metered platform',
    influences: {
      pages: [{ condition: 'true', action: 'add_builder_page', priority: 10 }],
      pricing: [{ condition: 'true', action: 'show_metered', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_usage_revenue', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      workflows: [],
      dashboards: [{ condition: 'true', action: 'show_customer_dashboard', priority: 10 }],
    },
    compatibleIndustries: ['technology', 'media', 'education'],
    keywords: ['agent', 'builder', 'no-code', 'platform', 'usage-based'],
  },
  {
    id: 'bm.community', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Community / Creator',
    description: 'Creator economy via memberships and tips',
    influences: {
      pages: [{ condition: 'true', action: 'add_membership_page', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_donor_retention', priority: 10 }],
      pricing: [],
      workflows: [],
      dashboards: [],
    },
    compatibleIndustries: ['media', 'education', 'creative', 'nonprofit'],
    keywords: ['community', 'creator', 'patron', 'tips', 'membership'],
  },
  {
    id: 'bm.event-ticketing', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Event Ticketing',
    description: 'Sell access to events and experiences',
    influences: {
      pages: [{ condition: 'true', action: 'add_events_page', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      workflows: [{ condition: 'true', action: 'add_ticketing', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_attendance', priority: 10 }],
      pricing: [],
      dashboards: [],
    },
    compatibleIndustries: ['events', 'media', 'sports', 'travel'],
    keywords: ['event', 'ticket', 'ticketing', 'rsvp', 'conference'],
  },
  {
    id: 'bm.placement-fee', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Placement / Listing Fee',
    description: 'Charge to list or be featured',
    influences: {
      pages: [{ condition: 'true', action: 'add_listing_page', priority: 10 }],
      pricing: [{ condition: 'true', action: 'show_featured_tiers', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      kpis: [],
      workflows: [],
      dashboards: [],
    },
    compatibleIndustries: ['real-estate', 'recruitment', 'marketplace', 'media'],
    keywords: ['listing-fee', 'featured', 'placement', 'promote-listing'],
  },
  {
    id: 'bm.subscription-box', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Subscription Box',
    description: 'Curated recurring physical delivery',
    influences: {
      pages: [{ condition: 'true', action: 'add_pricing_page', priority: 10 }],
      pricing: [{ condition: 'true', action: 'show_tiers', priority: 10 }],
      workflows: [{ condition: 'true', action: 'add_box_customization', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_mrr_churn_ltv', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      dashboards: [],
    },
    compatibleIndustries: ['food', 'beauty', 'wellness', 'retail'],
    keywords: ['subscription-box', 'monthly-box', 'curated', 'd2c'],
  },
];

export const JOURNEYS: Journey[] = [
  {
    id: 'journey.visitor', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'Journey', name: 'Visitor',
    stages: [
      { name: 'Discovery', goals: ['Understand value proposition'], touchpoints: ['landing_page', 'hero'], painPoints: [] },
      { name: 'Exploration', goals: ['Evaluate features and pricing'], touchpoints: ['features', 'pricing', 'testimonials'], painPoints: [] },
      { name: 'Conversion', goals: ['Sign up or purchase'], touchpoints: ['cta', 'form', 'checkout'], painPoints: [] },
    ],
    influences: {
      navigation: [{ condition: 'true', action: 'show_public_nav', priority: 10 }],
      pages: [{ condition: 'true', action: 'show_hero_features_pricing_cta', priority: 10 }],
      dashboard: [],
      automation: [],
      onboarding: [],
      permissions: [],
    },
    roles: ['anonymous'],
    permissions: ['read:public'],
  },
  {
    id: 'journey.customer', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'Journey', name: 'Customer',
    stages: [
      { name: 'Onboarding', goals: ['Complete setup'], touchpoints: ['onboarding_wizard', 'tutorial'], painPoints: [] },
      { name: 'Usage', goals: ['Achieve core value'], touchpoints: ['dashboard', 'core_features'], painPoints: [] },
      { name: 'Retention', goals: ['Renew or upgrade'], touchpoints: ['billing', 'support'], painPoints: [] },
    ],
    influences: {
      navigation: [{ condition: 'true', action: 'show_dashboard_nav', priority: 10 }],
      dashboard: [{ condition: 'true', action: 'show_customer_dashboard', priority: 10 }],
      onboarding: [{ condition: 'true', action: 'trigger_onboarding_flow', priority: 10 }],
      automation: [],
      permissions: [],
      pages: [],
    },
    roles: ['user', 'customer'],
    permissions: ['read:own', 'write:own'],
  },
  {
    id: 'journey.admin', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'Journey', name: 'Admin',
    stages: [
      { name: 'Management', goals: ['Manage entities and users'], touchpoints: ['admin_panel', 'crud_views'], painPoints: [] },
      { name: 'Monitoring', goals: ['Track metrics and issues'], touchpoints: ['dashboard', 'analytics'], painPoints: [] },
    ],
    influences: {
      navigation: [{ condition: 'true', action: 'show_admin_nav', priority: 10 }],
      dashboard: [{ condition: 'true', action: 'show_admin_dashboard', priority: 10 }],
      permissions: [{ condition: 'true', action: 'grant_full_access', priority: 10 }],
      automation: [],
      onboarding: [],
      pages: [],
    },
    roles: ['admin', 'manager'],
    permissions: ['read:all', 'write:all', 'delete:all'],
  },
];

export const COMPLIANCE_PACKS: CompliancePack[] = [
  {
    id: 'compliance.gdpr', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'CompliancePack', name: 'GDPR',
    description: 'EU General Data Protection Regulation',
    jurisdiction: 'EU',
    category: 'privacy',
    rules: [
      { rule: 'Consent before data collection', severity: 'must' },
      { rule: 'Right to erasure', severity: 'must' },
      { rule: 'Data portability', severity: 'must' },
      { rule: 'Privacy policy required', severity: 'must' },
    ],
    applicableIndustries: ['saas', 'healthcare', 'ecommerce', 'education'],
    applicableBusinessModels: ['subscription', 'marketplace', 'direct-sales'],
  },
  {
    id: 'compliance.pci', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'CompliancePack', name: 'PCI DSS',
    description: 'Payment Card Industry Data Security Standard',
    jurisdiction: 'Global',
    category: 'security',
    rules: [
      { rule: 'Never store raw card numbers', severity: 'must' },
      { rule: 'Use tokenized payments', severity: 'must' },
      { rule: 'Encrypt cardholder data', severity: 'must' },
    ],
    applicableIndustries: ['ecommerce', 'saas', 'hospitality'],
    applicableBusinessModels: ['direct-sales', 'subscription', 'marketplace'],
  },
  {
    id: 'compliance.hipaa', version: '1.0.0', status: 'active',
    createdAt: '2026-07-01T00:00:00+00:00', updatedAt: '2026-07-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'CompliancePack', name: 'HIPAA',
    description: 'Health Insurance Portability and Accountability Act',
    jurisdiction: 'US',
    category: 'privacy',
    rules: [
      { rule: 'PHI must be encrypted at rest and in transit', severity: 'must' },
      { rule: 'Access logs required for all PHI access', severity: 'must' },
      { rule: 'Minimum necessary access principle', severity: 'must' },
      { rule: 'BAA required with third-party vendors handling PHI', severity: 'must' },
      { rule: 'Breach notification within 60 days', severity: 'must' },
    ],
    applicableIndustries: ['healthcare', 'hospital', 'dental', 'pharmacy', 'medical-device'],
    applicableBusinessModels: ['subscription', 'direct-sales'],
  },
  {
    id: 'compliance.fssai', version: '1.0.0', status: 'active',
    createdAt: '2026-07-01T00:00:00+00:00', updatedAt: '2026-07-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'CompliancePack', name: 'FSSAI',
    description: 'Food Safety and Standards Authority of India',
    jurisdiction: 'IN',
    category: 'industry',
    rules: [
      { rule: 'FSSAI license number must be displayed on every product', severity: 'must' },
      { rule: 'Product ingredient list must be visible and accurate', severity: 'must' },
      { rule: 'Nutritional information per serving must be displayed', severity: 'must' },
      { rule: 'Health supplement disclaimer text required', severity: 'must' },
      { rule: 'Not a medicine disclaimer must appear prominently', severity: 'must' },
      { rule: 'Batch number and manufacturing date must be stored', severity: 'must' },
      { rule: 'Best before date must be displayed', severity: 'must' },
    ],
    applicableIndustries: ['ecommerce', 'ecommerce-supplement', 'food', 'beverage'],
    applicableBusinessModels: ['direct-sales', 'marketplace'],
  },
];

export class KnowledgeRegistry {
  private designProfiles: Map<string, DesignProfile> = new Map();
  private patterns: Map<string, Pattern> = new Map();
  private skillPacks: Map<string, SkillPack> = new Map();
  private businessModels: Map<string, BusinessModel> = new Map();
  private journeys: Map<string, Journey> = new Map();
  private compliancePacks: Map<string, CompliancePack> = new Map();

  constructor() {
    for (const dp of DESIGN_PROFILES) this.designProfiles.set(dp.id, dp);
    for (const p of PATTERNS) this.patterns.set(p.id, p);
    for (const sp of SKILL_PACKS) this.skillPacks.set(sp.id, sp);
    for (const bm of BUSINESS_MODELS) this.businessModels.set(bm.id, bm);
    for (const j of JOURNEYS) this.journeys.set(j.id, j);
    for (const cp of COMPLIANCE_PACKS) this.compliancePacks.set(cp.id, cp);
  }

  getDesignProfile(id: string): DesignProfile | undefined {
    return this.designProfiles.get(id);
  }

  getPattern(id: string): Pattern | undefined {
    return this.patterns.get(id);
  }

  getSkillPack(id: string): SkillPack | undefined {
    return this.skillPacks.get(id);
  }

  getBusinessModel(id: string): BusinessModel | undefined {
    return this.businessModels.get(id);
  }

  getJourney(id: string): Journey | undefined {
    return this.journeys.get(id);
  }

  getCompliancePack(id: string): CompliancePack | undefined {
    return this.compliancePacks.get(id);
  }

  findDesignProfilesByIndustry(industry: string): DesignProfile[] {
    return Array.from(this.designProfiles.values()).filter(dp =>
      dp.brandPersonality.some(p => industry.toLowerCase().includes(p)) ||
      dp.name.toLowerCase().includes(industry.toLowerCase()),
    );
  }

  findPatternsByIndustry(industry: string): Pattern[] {
    return Array.from(this.patterns.values()).filter(p =>
      p.compatibleIndustries.some(i => industry.toLowerCase().includes(i)),
    );
  }

  findPatternsByBusinessModel(model: string): Pattern[] {
    return Array.from(this.patterns.values()).filter(p =>
      p.compatibleBusinessModels.some(m => m === model),
    );
  }

  findSkillPacksByCapability(capability: string): SkillPack[] {
    return Array.from(this.skillPacks.values()).filter(sp =>
      sp.capability === capability,
    );
  }

  /** Returns enterprise patterns — those with roles defined */
  findEnterprisePatterns(): Pattern[] {
    return Array.from(this.patterns.values()).filter(p => p.roles && p.roles.length > 0);
  }

  stats(): {
    designProfiles: number;
    patterns: number;
    skillPacks: number;
    businessModels: number;
    journeys: number;
    compliancePacks: number;
  } {
    return {
      designProfiles: this.designProfiles.size,
      patterns: this.patterns.size,
      skillPacks: this.skillPacks.size,
      businessModels: this.businessModels.size,
      journeys: this.journeys.size,
      compliancePacks: this.compliancePacks.size,
    };
  }
}
