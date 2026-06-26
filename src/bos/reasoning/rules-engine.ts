export interface BREContext {
  industry: string;
  subIndustry?: string;
  businessModels: string[];
  country?: string;
  compliancePacks: string[];
  capabilities: string[];
  journeys: string[];
  entities: string[];
  designStyle?: string;
  audience?: string;
  appName?: string;
  description?: string;
}

export interface Rule {
  id: string;
  name: string;
  priority: number;
  condition: (ctx: BREContext) => boolean;
  actions: RuleAction[];
  source: string;
}

export type RuleAction =
  | { type: 'add_pattern'; patternId: string }
  | { type: 'add_page'; path: string; name: string; sections: string[] }
  | { type: 'add_entity'; name: string; fields: string[] }
  | { type: 'add_workflow'; name: string; steps: string[] }
  | { type: 'add_kpi'; name: string; formula: string }
  | { type: 'add_design_profile'; profileId: string }
  | { type: 'add_integration'; integrationType: string; name: string; required: boolean }
  | { type: 'add_compliance'; packId: string }
  | { type: 'add_skill_pack'; packId: string }
  | { type: 'set_navigation'; style: string }
  | { type: 'set_vocabulary'; original: string; replacement: string }
  | { type: 'add_permission'; role: string; resource: string; actions: string[] };

export interface RuleDecision {
  ruleId: string;
  ruleName: string;
  action: RuleAction;
  confidence: number;
  trace: string;
}

export class RulesEngine {
  private rules: Rule[] = [];

  constructor() {
    for (const rule of createDefaultRules()) {
      this.register(rule);
    }
  }

  register(rule: Rule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  evaluate(ctx: BREContext): RuleDecision[] {
    const decisions: RuleDecision[] = [];
    const firedRules = new Set<string>();

    for (const rule of this.rules) {
      if (firedRules.has(rule.id)) continue;

      try {
        if (rule.condition(ctx)) {
          firedRules.add(rule.id);
          for (const action of rule.actions) {
            decisions.push({
              ruleId: rule.id,
              ruleName: rule.name,
              action,
              confidence: 0.9,
              trace: `Rule "${rule.name}" (${rule.id}) fired: ${JSON.stringify(action)}`,
            });
          }
        }
      } catch {
        // rule evaluation failed, skip
      }
    }

    return decisions;
  }

  getRules(): Rule[] {
    return [...this.rules];
  }

  stats(): { totalRules: number; bySource: Record<string, number> } {
    const bySource: Record<string, number> = {};
    for (const rule of this.rules) {
      bySource[rule.source] = (bySource[rule.source] ?? 0) + 1;
    }
    return { totalRules: this.rules.length, bySource };
  }
}

export function createDefaultRules(): Rule[] {
  return [
    {
      id: 'rule.subscription.pricing',
      name: 'Subscription businesses need pricing pages',
      priority: 10,
      condition: (ctx) => ctx.businessModels.includes('subscription') || ctx.businessModels.includes('Subscription'),
      actions: [
        { type: 'add_page', path: '/pricing', name: 'Pricing', sections: ['pricing-table', 'feature-comparison', 'faq'] },
        { type: 'add_kpi', name: 'MRR', formula: 'sum(subscription.revenue)' },
        { type: 'add_kpi', name: 'Churn Rate', formula: 'churned / total' },
        { type: 'add_kpi', name: 'LTV', formula: 'arpu / churn_rate' },
      ],
      source: 'business_model',
    },
    {
      id: 'rule.ecommerce.shop',
      name: 'E-commerce needs shop pages',
      priority: 10,
      condition: (ctx) => ctx.industry.toLowerCase().includes('commerce') || ctx.businessModels.includes('direct-sales') || ctx.businessModels.includes('Direct Sales'),
      actions: [
        { type: 'add_page', path: '/shop', name: 'Shop', sections: ['product-grid', 'filters', 'categories'] },
        { type: 'add_page', path: '/cart', name: 'Cart', sections: ['cart-items', 'summary', 'checkout'] },
        { type: 'add_entity', name: 'Product', fields: ['name', 'price', 'description', 'image', 'stock'] },
        { type: 'add_entity', name: 'Order', fields: ['items', 'total', 'status', 'createdAt'] },
        { type: 'add_integration', integrationType: 'payment', name: 'Stripe', required: true },
      ],
      source: 'industry',
    },
    {
      id: 'rule.luxury.hero',
      name: 'Luxury brands need premium hero sections',
      priority: 15,
      condition: (ctx) => ctx.industry.toLowerCase().includes('luxury'),
      actions: [
        { type: 'add_design_profile', profileId: 'design.luxury.dark-opulence' },
        { type: 'add_pattern', patternId: 'pattern.luxury.watch-brand' },
        { type: 'set_vocabulary', original: 'product', replacement: 'timepiece' },
        { type: 'set_vocabulary', original: 'buy', replacement: 'acquire' },
        { type: 'set_vocabulary', original: 'price', replacement: 'investment' },
      ],
      source: 'industry',
    },
    {
      id: 'rule.healthcare.compliance',
      name: 'Healthcare needs HIPAA compliance',
      priority: 20,
      condition: (ctx) => ctx.industry.toLowerCase().includes('healthcare') || ctx.industry.toLowerCase().includes('medical'),
      actions: [
        { type: 'add_compliance', packId: 'compliance.hipaa' },
        { type: 'add_page', path: '/appointments', name: 'Appointments', sections: ['booking-form', 'calendar'] },
        { type: 'add_entity', name: 'Patient', fields: ['name', 'email', 'phone', 'dob'] },
        { type: 'add_entity', name: 'Appointment', fields: ['patientId', 'date', 'time', 'type', 'status'] },
      ],
      source: 'industry',
    },
    {
      id: 'rule.saas.dashboard',
      name: 'SaaS apps need dashboards',
      priority: 10,
      condition: (ctx) => ctx.industry.toLowerCase().includes('saas') || ctx.industry.toLowerCase().includes('software'),
      actions: [
        { type: 'add_design_profile', profileId: 'design.saas.modern' },
        { type: 'add_page', path: '/dashboard', name: 'Dashboard', sections: ['stats-cards', 'charts', 'activity-feed'] },
        { type: 'add_page', path: '/settings', name: 'Settings', sections: ['profile', 'billing', 'notifications'] },
        { type: 'add_skill_pack', packId: 'cap.inventory-lite' },
      ],
      source: 'industry',
    },
    {
      id: 'rule.restaurant.booking',
      name: 'Restaurants need booking and menu',
      priority: 10,
      condition: (ctx) => ctx.industry.toLowerCase().includes('restaurant') || ctx.industry.toLowerCase().includes('food'),
      actions: [
        { type: 'add_page', path: '/menu', name: 'Menu', sections: ['menu-categories', 'menu-items'] },
        { type: 'add_page', path: '/reservations', name: 'Reservations', sections: ['booking-form', 'calendar'] },
        { type: 'add_entity', name: 'MenuItem', fields: ['name', 'description', 'price', 'category', 'image'] },
        { type: 'add_entity', name: 'Reservation', fields: ['name', 'date', 'time', 'guests', 'phone'] },
      ],
      source: 'industry',
    },
    {
      id: 'rule.gdpr.applicable',
      name: 'GDPR applies to EU businesses',
      priority: 12,
      condition: (ctx) => ctx.country === 'EU' || ctx.country === 'DE' || ctx.country === 'FR' || ctx.country === 'GB',
      actions: [
        { type: 'add_compliance', packId: 'compliance.gdpr' },
      ],
      source: 'compliance',
    },
    {
      id: 'rule.journey.visitor',
      name: 'All apps have visitor journeys',
      priority: 5,
      condition: () => true,
      actions: [
        { type: 'add_page', path: '/', name: 'Home', sections: ['hero', 'features', 'testimonials', 'cta'] },
        { type: 'add_page', path: '/about', name: 'About', sections: ['story', 'team', 'values'] },
        { type: 'add_page', path: '/contact', name: 'Contact', sections: ['form', 'info'] },
      ],
      source: 'journey',
    },
    {
      id: 'rule.journey.customer',
      name: 'Customer journey needs auth',
      priority: 8,
      condition: (ctx) => ctx.journeys.includes('customer') || ctx.journeys.includes('Customer'),
      actions: [
        { type: 'add_page', path: '/login', name: 'Login', sections: ['login-form'] },
        { type: 'add_page', path: '/register', name: 'Register', sections: ['register-form'] },
        { type: 'add_permission', role: 'user', resource: 'own_data', actions: ['read', 'write'] },
      ],
      source: 'journey',
    },
    {
      id: 'rule.journey.admin',
      name: 'Admin journey needs admin panel',
      priority: 8,
      condition: (ctx) => ctx.journeys.includes('admin') || ctx.journeys.includes('Admin'),
      actions: [
        { type: 'add_page', path: '/admin', name: 'Admin Dashboard', sections: ['stats', 'user-management'] },
        { type: 'add_permission', role: 'admin', resource: 'all', actions: ['create', 'read', 'update', 'delete'] },
      ],
      source: 'journey',
    },
  ];
}
