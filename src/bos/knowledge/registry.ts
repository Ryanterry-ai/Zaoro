import type { DesignProfile } from '../schemas/knowledge/design-profile.schema.js';
import type { Pattern } from '../schemas/knowledge/pattern.schema.js';
import type { SkillPack } from '../schemas/knowledge/skill-pack.schema.js';
import type { BusinessModel } from '../schemas/knowledge/business-model.schema.js';
import type { Journey } from '../schemas/knowledge/journey.schema.js';
import type { CompliancePack } from '../schemas/knowledge/compliance-pack.schema.js';
import { LUXURY_DARK_OPULENCE } from './design-profiles/luxury-dark-opulence.js';
import { SAAS_MODERN } from './design-profiles/saas-modern.js';
import { HEALTHCARE_CLEAN, ECOMMERCE_MODERN } from './design-profiles/healthcare-clean.js';
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
} from './patterns/industry-templates.js';

export const DESIGN_PROFILES: DesignProfile[] = [
  LUXURY_DARK_OPULENCE,
  SAAS_MODERN,
  HEALTHCARE_CLEAN,
  ECOMMERCE_MODERN,
];

export const PATTERNS: Pattern[] = [
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
];

export const SKILL_PACKS: SkillPack[] = [
  CAP_INVENTORY_LITE,
  CAP_AUTH,
  CAP_PAYMENT,
  CAP_NOTIFICATION,
  CAP_COMPLIANCE,
  CAP_ANALYTICS,
];

export const BUSINESS_MODELS: BusinessModel[] = [
  {
    id: 'bm.subscription', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Subscription',
    description: 'Recurring billing model',
    influences: {
      pages: [{ condition: 'true', action: 'add_pricing_page', priority: 10 }],
      pricing: [{ condition: 'true', action: 'show_tiers', priority: 10 }],
      kpis: [{ condition: 'true', action: 'track_mrr_churn_ltv', priority: 10 }],
      integrations: [],
      workflows: [],
      dashboards: [],
    },
    compatibleIndustries: ['saas', 'fitness', 'education', 'media'],
    keywords: ['subscription', 'recurring', 'monthly', 'annual'],
  },
  {
    id: 'bm.direct-sales', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Direct Sales',
    description: 'Direct to consumer sales',
    influences: {
      pages: [{ condition: 'true', action: 'add_shop_page', priority: 10 }],
      integrations: [{ condition: 'true', action: 'add_payment_gateway', priority: 10 }],
      pricing: [],
      workflows: [],
      kpis: [],
      dashboards: [],
    },
    compatibleIndustries: ['luxury', 'fashion', 'electronics', 'ecommerce'],
    keywords: ['direct', 'ecommerce', 'shop', 'buy'],
  },
  {
    id: 'bm.marketplace', version: '1.0.0', status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00', updatedAt: '2025-01-01T00:00:00+00:00',
    evidenceRefs: [], kind: 'BusinessModel', name: 'Marketplace',
    description: 'Multi-vendor marketplace',
    influences: {
      pages: [{ condition: 'true', action: 'add_vendor_dashboard', priority: 10 }],
      workflows: [{ condition: 'true', action: 'add_vendor_onboarding', priority: 10 }],
      pricing: [],
      integrations: [],
      kpis: [],
      dashboards: [],
    },
    compatibleIndustries: ['ecommerce', 'services', 'food'],
    keywords: ['marketplace', 'vendor', 'multi-seller'],
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
