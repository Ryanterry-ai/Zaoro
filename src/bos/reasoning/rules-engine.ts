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
  | { type: 'add_entity'; name: string; fields: string[]; capabilities?: string[] }
  | { type: 'add_workflow'; name: string; steps: string[]; trigger?: string; entities?: string[] }
  | { type: 'add_kpi'; name: string; formula: string }
  | { type: 'add_design_profile'; profileId: string }
  | { type: 'add_integration'; integrationType: string; name: string; required: boolean }
  | { type: 'add_compliance'; packId: string }
  | { type: 'add_skill_pack'; packId: string }
  | { type: 'set_navigation'; style: string }
  | { type: 'set_vocabulary'; original: string; replacement: string }
  | { type: 'add_permission'; role: string; resource: string; actions: string[] }
  | { type: 'add_capability'; name: string; features?: string[] }
  | { type: 'add_feature'; name: string; capability: string; uiSections?: string[]; entities?: string[] }
  | { type: 'add_relationship'; source: string; target: string; relationType?: string; foreignKey?: string };

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const is = (ctx: BREContext, industry: string) =>
  ctx.industry.toLowerCase().includes(industry);

const hasModel = (ctx: BREContext, model: string) =>
  ctx.businessModels.some(m => m.toLowerCase().includes(model));

const hasJourney = (ctx: BREContext, journey: string) =>
  ctx.journeys.some(j => j.toLowerCase().includes(journey));

const hasCap = (ctx: BREContext, cap: string) =>
  ctx.capabilities.some(c => c.toLowerCase().includes(cap));

// ─── Default Rules ────────────────────────────────────────────────────────────

export function createDefaultRules(): Rule[] {
  return [

    // ── Compliance ──────────────────────────────────────────────────────────

    {
      id: 'rule.gdpr.applicable',
      name: 'GDPR applies to EU businesses',
      priority: 25,
      condition: (ctx) => ctx.country === 'EU' || ctx.country === 'DE' ||
        ctx.country === 'FR' || ctx.country === 'GB',
      actions: [{ type: 'add_compliance', packId: 'compliance.gdpr' }],
      source: 'compliance',
    },

    {
      id: 'rule.hipaa.applicable',
      name: 'HIPAA applies to healthcare',
      priority: 25,
      condition: (ctx) => is(ctx, 'healthcare'),
      actions: [{ type: 'add_compliance', packId: 'compliance.hipaa' }],
      source: 'compliance',
    },

    {
      id: 'rule.pci.applicable',
      name: 'PCI-DSS applies to fintech with payments',
      priority: 25,
      condition: (ctx) => is(ctx, 'fintech') || hasCap(ctx, 'payments'),
      actions: [{ type: 'add_compliance', packId: 'compliance.pci-dss' }],
      source: 'compliance',
    },

    // ── Industry — Healthcare ────────────────────────────────────────────────

    {
      id: 'rule.healthcare.compliance',
      name: 'Healthcare needs HIPAA compliance and appointment system',
      priority: 20,
      condition: (ctx) => is(ctx, 'healthcare'),
      actions: [
        { type: 'add_page', path: '/appointments', name: 'Appointments', sections: ['booking-calendar', 'calendar'] },
        { type: 'add_page', path: '/services', name: 'Services', sections: ['features', 'pricing-table'] },
        { type: 'add_entity', name: 'Patient', fields: ['name', 'email', 'phone', 'dob', 'medicalHistory'] },
        { type: 'add_entity', name: 'Appointment', fields: ['patientId', 'doctorId', 'date', 'time', 'type', 'status', 'notes'] },
        { type: 'add_entity', name: 'Doctor', fields: ['name', 'specialty', 'licenseNumber', 'schedule'] },
        { type: 'add_kpi', name: 'Appointments Today', formula: 'count(appointments.today)' },
        { type: 'add_kpi', name: 'Patients This Month', formula: 'count(patients.thisMonth)' },
      ],
      source: 'industry',
    },

    // ── Industry — Enterprise Software (ERP, HRM, etc.) ──────────────────────

    {
      id: 'rule.enterprise.operations',
      name: 'Enterprise software needs operations management',
      priority: 20,
      condition: (ctx) => is(ctx, 'enterprise-software') || is(ctx, 'manufacturing') ||
        (ctx.description?.toLowerCase().includes('erp') ?? false),
      actions: [
        { type: 'add_page', path: '/dashboard', name: 'Dashboard', sections: ['stats-cards', 'charts', 'activity-feed'] },
        { type: 'add_page', path: '/operations', name: 'Operations', sections: ['data-table', 'filters'] },
        { type: 'add_page', path: '/reports', name: 'Reports', sections: ['charts', 'data-table', 'filters'] },
        { type: 'add_page', path: '/settings', name: 'Settings', sections: ['profile', 'notifications'] },
        { type: 'add_entity', name: 'Department', fields: ['name', 'head', 'budget', 'headcount'] },
        { type: 'add_entity', name: 'Employee', fields: ['name', 'email', 'role', 'department', 'startDate', 'status'] },
        { type: 'add_kpi', name: 'Active Records', formula: 'count(records.active)' },
        { type: 'add_kpi', name: 'Open Tasks', formula: 'count(tasks.open)' },
        { type: 'add_kpi', name: 'System Uptime', formula: '99.9%' },
        { type: 'add_integration', integrationType: 'erp', name: 'Core ERP', required: true },
      ],
      source: 'industry',
    },

    {
      id: 'rule.enterprise.hrm',
      name: 'ERP/HRM needs people management',
      priority: 15,
      condition: (ctx) =>
        is(ctx, 'enterprise-software') &&
        (ctx.subIndustry?.includes('hrm') || ctx.capabilities.includes('hr') ||
         (ctx.description?.toLowerCase().includes('hr') ?? false) ||
         (ctx.description?.toLowerCase().includes('employee') ?? false)),
      actions: [
        { type: 'add_page', path: '/employees', name: 'Employees', sections: ['data-table', 'filters', 'stats-cards'] },
        { type: 'add_page', path: '/departments', name: 'Departments', sections: ['data-table', 'stats-cards'] },
        { type: 'add_page', path: '/leave', name: 'Leave Management', sections: ['data-table', 'calendar', 'stats-cards'] },
        { type: 'add_entity', name: 'LeaveRequest', fields: ['employeeId', 'type', 'startDate', 'endDate', 'status', 'reason'] },
        { type: 'add_kpi', name: 'Headcount', formula: 'count(employees.active)' },
        { type: 'add_kpi', name: 'Leave Requests Pending', formula: 'count(leaveRequests.pending)' },
      ],
      source: 'industry',
    },

    {
      id: 'rule.enterprise.finance',
      name: 'ERP needs financial management',
      priority: 15,
      condition: (ctx) =>
        is(ctx, 'enterprise-software') &&
        (ctx.subIndustry?.includes('finance') || ctx.capabilities.includes('reporting') ||
         (ctx.description?.toLowerCase().includes('accounting') ?? false) ||
         (ctx.description?.toLowerCase().includes('invoice') ?? false) ||
         (ctx.description?.toLowerCase().includes('billing') ?? false)),
      actions: [
        { type: 'add_page', path: '/finance', name: 'Finance', sections: ['stats-cards', 'charts', 'data-table'] },
        { type: 'add_page', path: '/invoices', name: 'Invoices', sections: ['data-table', 'filters'] },
        { type: 'add_entity', name: 'Invoice', fields: ['number', 'customerId', 'amount', 'tax', 'status', 'dueDate', 'items'] },
        { type: 'add_entity', name: 'Expense', fields: ['category', 'amount', 'date', 'approvedBy', 'receipt'] },
        { type: 'add_kpi', name: 'Revenue This Month', formula: 'sum(invoices.thisMonth.paid)' },
        { type: 'add_kpi', name: 'Outstanding AR', formula: 'sum(invoices.unpaid)' },
        { type: 'add_integration', integrationType: 'accounting', name: 'Accounting', required: false },
      ],
      source: 'industry',
    },

    // ── Industry — Logistics ─────────────────────────────────────────────────

    {
      id: 'rule.logistics.operations',
      name: 'Logistics needs dispatch and tracking',
      priority: 20,
      condition: (ctx) => is(ctx, 'logistics'),
      actions: [
        { type: 'add_page', path: '/dashboard', name: 'Dashboard', sections: ['stats-cards', 'charts', 'activity-feed'] },
        { type: 'add_page', path: '/shipments', name: 'Shipments', sections: ['data-table', 'filters', 'stats-cards'] },
        { type: 'add_page', path: '/tracking', name: 'Tracking', sections: ['data-table', 'calendar'] },
        { type: 'add_page', path: '/drivers', name: 'Drivers', sections: ['data-table', 'stats-cards'] },
        { type: 'add_entity', name: 'Shipment', fields: ['trackingNumber', 'origin', 'destination', 'status', 'eta', 'driverId'] },
        { type: 'add_entity', name: 'Driver', fields: ['name', 'license', 'vehicleId', 'status', 'currentLocation'] },
        { type: 'add_entity', name: 'Vehicle', fields: ['plate', 'type', 'capacity', 'status', 'lastService'] },
        { type: 'add_kpi', name: 'Shipments Today', formula: 'count(shipments.today)' },
        { type: 'add_kpi', name: 'On-Time Delivery Rate', formula: 'onTime / total * 100' },
        { type: 'add_kpi', name: 'Active Drivers', formula: 'count(drivers.active)' },
      ],
      source: 'industry',
    },

    // ── Industry — E-commerce ────────────────────────────────────────────────

    {
      id: 'rule.ecommerce.shop',
      name: 'E-commerce needs shop pages',
      priority: 18,
      condition: (ctx) => is(ctx, 'ecommerce') || hasModel(ctx, 'direct-sales') ||
        hasModel(ctx, 'marketplace'),
      actions: [
        { type: 'add_page', path: '/shop', name: 'Shop', sections: ['product-grid', 'filters', 'categories'] },
        { type: 'add_page', path: '/cart', name: 'Cart', sections: ['cart-items', 'order-summary', 'checkout-form'] },
        { type: 'add_page', path: '/product/:handle', name: 'Product Detail', sections: ['product-info', 'product-gallery', 'recommended'] },
        { type: 'add_entity', name: 'Product', fields: ['name', 'price', 'description', 'image', 'stock', 'sku', 'category'] },
        { type: 'add_entity', name: 'Order', fields: ['items', 'total', 'status', 'customerId', 'shippingAddress', 'createdAt'] },
        { type: 'add_entity', name: 'Category', fields: ['name', 'slug', 'image', 'parent'] },
        { type: 'add_integration', integrationType: 'payment', name: 'Stripe', required: true },
        { type: 'add_kpi', name: 'Revenue Today', formula: 'sum(orders.today.total)' },
        { type: 'add_kpi', name: 'Conversion Rate', formula: 'orders / sessions * 100' },
        { type: 'add_kpi', name: 'AOV', formula: 'sum(orders.total) / count(orders)' },
      ],
      source: 'industry',
    },

    // ── Industry — SaaS ──────────────────────────────────────────────────────

    {
      id: 'rule.saas.dashboard',
      name: 'SaaS apps need dashboards and subscription management',
      priority: 18,
      condition: (ctx) => is(ctx, 'saas') || hasModel(ctx, 'subscription'),
      actions: [
        { type: 'add_design_profile', profileId: 'design.saas.modern' },
        { type: 'add_page', path: '/dashboard', name: 'Dashboard', sections: ['stats-cards', 'charts', 'activity-feed'] },
        { type: 'add_page', path: '/settings', name: 'Settings', sections: ['profile', 'billing', 'notifications'] },
        { type: 'add_page', path: '/pricing', name: 'Pricing', sections: ['pricing-table', 'feature-comparison', 'faq'] },
        { type: 'add_entity', name: 'User', fields: ['email', 'name', 'role', 'plan', 'createdAt'] },
        { type: 'add_entity', name: 'Subscription', fields: ['userId', 'plan', 'status', 'billingCycle', 'nextBillingDate'] },
        { type: 'add_kpi', name: 'MRR', formula: 'sum(subscriptions.monthlyRevenue)' },
        { type: 'add_kpi', name: 'Churn Rate', formula: 'churned / total' },
        { type: 'add_kpi', name: 'Active Users', formula: 'count(users.activeThisWeek)' },
        { type: 'add_integration', integrationType: 'payment', name: 'Stripe', required: true },
        { type: 'add_skill_pack', packId: 'cap.inventory-lite' },
      ],
      source: 'industry',
    },

    // ── Industry — Restaurant ────────────────────────────────────────────────

    {
      id: 'rule.restaurant.core',
      name: 'Restaurants need menu and reservations',
      priority: 18,
      condition: (ctx) => is(ctx, 'restaurant'),
      actions: [
        { type: 'add_page', path: '/menu', name: 'Menu', sections: ['category-grid', 'product-grid'] },
        { type: 'add_page', path: '/reservations', name: 'Reservations', sections: ['booking-calendar', 'calendar'] },
        { type: 'add_page', path: '/order', name: 'Order Online', sections: ['product-grid', 'cart-items', 'order-summary'] },
        { type: 'add_entity', name: 'MenuItem', fields: ['name', 'description', 'price', 'category', 'image', 'dietary', 'available'] },
        { type: 'add_entity', name: 'Reservation', fields: ['name', 'date', 'time', 'guests', 'phone', 'email', 'status', 'notes'] },
        { type: 'add_entity', name: 'Order', fields: ['items', 'total', 'type', 'status', 'table', 'createdAt'] },
        { type: 'add_kpi', name: 'Covers Today', formula: 'count(reservations.today)' },
        { type: 'add_kpi', name: 'Orders This Week', formula: 'count(orders.thisWeek)' },
      ],
      source: 'industry',
    },

    // ── Industry — Fitness ───────────────────────────────────────────────────

    {
      id: 'rule.fitness.core',
      name: 'Fitness businesses need class scheduling and memberships',
      priority: 18,
      condition: (ctx) => is(ctx, 'fitness'),
      actions: [
        { type: 'add_page', path: '/classes', name: 'Classes', sections: ['product-grid', 'filters', 'category-grid'] },
        { type: 'add_page', path: '/membership', name: 'Membership', sections: ['pricing-table', 'feature-comparison'] },
        { type: 'add_page', path: '/trainers', name: 'Trainers', sections: ['team-grid'] },
        { type: 'add_page', path: '/schedule', name: 'Schedule', sections: ['calendar', 'data-table'] },
        { type: 'add_entity', name: 'Member', fields: ['name', 'email', 'phone', 'membershipType', 'startDate', 'status'] },
        { type: 'add_entity', name: 'Class', fields: ['name', 'trainer', 'time', 'duration', 'capacity', 'enrolled', 'location'] },
        { type: 'add_entity', name: 'Trainer', fields: ['name', 'specialty', 'bio', 'schedule', 'certifications'] },
        { type: 'add_kpi', name: 'Active Members', formula: 'count(members.active)' },
        { type: 'add_kpi', name: 'Classes This Week', formula: 'count(classes.thisWeek)' },
      ],
      source: 'industry',
    },

    // ── Industry — Real Estate ───────────────────────────────────────────────

    {
      id: 'rule.realestate.core',
      name: 'Real estate needs property listings and inquiry system',
      priority: 18,
      condition: (ctx) => is(ctx, 'realestate'),
      actions: [
        { type: 'add_page', path: '/properties', name: 'Properties', sections: ['product-grid', 'filters', 'sort-bar'] },
        { type: 'add_page', path: '/property/:id', name: 'Property Detail', sections: ['product-gallery', 'product-info', 'contact-form'] },
        { type: 'add_page', path: '/agents', name: 'Agents', sections: ['team-grid'] },
        { type: 'add_entity', name: 'Property', fields: ['title', 'address', 'price', 'bedrooms', 'bathrooms', 'area', 'type', 'status', 'images', 'description'] },
        { type: 'add_entity', name: 'Agent', fields: ['name', 'email', 'phone', 'photo', 'bio', 'listings'] },
        { type: 'add_entity', name: 'Inquiry', fields: ['propertyId', 'agentId', 'name', 'email', 'phone', 'message', 'createdAt'] },
        { type: 'add_kpi', name: 'Active Listings', formula: 'count(properties.active)' },
        { type: 'add_kpi', name: 'Inquiries This Month', formula: 'count(inquiries.thisMonth)' },
      ],
      source: 'industry',
    },

    // ── Industry — Education ─────────────────────────────────────────────────

    {
      id: 'rule.education.core',
      name: 'Education platforms need course catalog and enrollment',
      priority: 18,
      condition: (ctx) => is(ctx, 'education'),
      actions: [
        { type: 'add_page', path: '/courses', name: 'Courses', sections: ['product-grid', 'filters', 'category-grid'] },
        { type: 'add_page', path: '/course/:slug', name: 'Course Detail', sections: ['product-info', 'features', 'pricing-table'] },
        { type: 'add_page', path: '/dashboard', name: 'My Learning', sections: ['stats-cards', 'data-table', 'activity-feed'] },
        { type: 'add_entity', name: 'Course', fields: ['title', 'description', 'instructor', 'price', 'duration', 'level', 'category', 'thumbnail'] },
        { type: 'add_entity', name: 'Student', fields: ['name', 'email', 'enrolledCourses', 'progress', 'certificates'] },
        { type: 'add_entity', name: 'Enrollment', fields: ['studentId', 'courseId', 'enrolledAt', 'completedAt', 'progress', 'status'] },
        { type: 'add_kpi', name: 'Total Students', formula: 'count(students)' },
        { type: 'add_kpi', name: 'Courses Completed', formula: 'count(enrollments.completed)' },
        { type: 'add_kpi', name: 'Average Completion Rate', formula: 'avg(enrollments.progress)' },
      ],
      source: 'industry',
    },

    // ── Industry — Legal ─────────────────────────────────────────────────────

    {
      id: 'rule.legal.core',
      name: 'Law firms need case management and consultation booking',
      priority: 18,
      condition: (ctx) => is(ctx, 'legal'),
      actions: [
        { type: 'add_page', path: '/practice-areas', name: 'Practice Areas', sections: ['features', 'category-grid'] },
        { type: 'add_page', path: '/consultation', name: 'Book Consultation', sections: ['booking-calendar', 'contact-form'] },
        { type: 'add_page', path: '/attorneys', name: 'Attorneys', sections: ['team-grid'] },
        { type: 'add_entity', name: 'Client', fields: ['name', 'email', 'phone', 'caseType', 'status'] },
        { type: 'add_entity', name: 'Case', fields: ['clientId', 'type', 'status', 'openDate', 'attorney', 'notes', 'nextHearing'] },
        { type: 'add_entity', name: 'Consultation', fields: ['clientId', 'date', 'time', 'type', 'status', 'notes'] },
        { type: 'add_kpi', name: 'Active Cases', formula: 'count(cases.active)' },
        { type: 'add_kpi', name: 'Consultations This Month', formula: 'count(consultations.thisMonth)' },
      ],
      source: 'industry',
    },

    // ── Industry — Agency / Creative ─────────────────────────────────────────

    {
      id: 'rule.agency.core',
      name: 'Agencies need portfolio, services, and project management',
      priority: 18,
      condition: (ctx) => is(ctx, 'agency'),
      actions: [
        { type: 'add_page', path: '/work', name: 'Our Work', sections: ['product-grid', 'filters', 'category-grid'] },
        { type: 'add_page', path: '/services', name: 'Services', sections: ['features', 'pricing-table'] },
        { type: 'add_page', path: '/case-study/:slug', name: 'Case Study', sections: ['product-info', 'product-gallery', 'testimonials'] },
        { type: 'add_entity', name: 'Project', fields: ['title', 'client', 'industry', 'services', 'results', 'images', 'slug'] },
        { type: 'add_entity', name: 'Client', fields: ['name', 'logo', 'industry', 'testimonial'] },
        { type: 'add_entity', name: 'Service', fields: ['name', 'description', 'deliverables', 'timeline', 'price'] },
        { type: 'add_kpi', name: 'Projects Delivered', formula: 'count(projects.completed)' },
        { type: 'add_kpi', name: 'Active Clients', formula: 'count(clients.active)' },
      ],
      source: 'industry',
    },

    // ── Industry — Nonprofit ─────────────────────────────────────────────────

    {
      id: 'rule.nonprofit.core',
      name: 'Nonprofits need donation system and impact showcase',
      priority: 18,
      condition: (ctx) => is(ctx, 'nonprofit'),
      actions: [
        { type: 'add_page', path: '/donate', name: 'Donate', sections: ['pricing-table', 'stats-cards'] },
        { type: 'add_page', path: '/programs', name: 'Programs', sections: ['features', 'gallery'] },
        { type: 'add_page', path: '/volunteer', name: 'Volunteer', sections: ['booking-calendar', 'contact-form'] },
        { type: 'add_entity', name: 'Campaign', fields: ['name', 'goal', 'raised', 'deadline', 'description', 'image'] },
        { type: 'add_entity', name: 'Donor', fields: ['name', 'email', 'totalDonated', 'campaigns', 'recurring'] },
        { type: 'add_entity', name: 'Volunteer', fields: ['name', 'email', 'skills', 'availability', 'hours'] },
        { type: 'add_integration', integrationType: 'payment', name: 'Stripe', required: true },
        { type: 'add_kpi', name: 'Total Raised', formula: 'sum(donations.amount)' },
        { type: 'add_kpi', name: 'Active Volunteers', formula: 'count(volunteers.active)' },
      ],
      source: 'industry',
    },

    // ── Industry — Fintech ───────────────────────────────────────────────────

    {
      id: 'rule.fintech.core',
      name: 'Fintech needs transaction management and compliance',
      priority: 20,
      condition: (ctx) => is(ctx, 'fintech'),
      actions: [
        { type: 'add_page', path: '/dashboard', name: 'Dashboard', sections: ['stats-cards', 'charts', 'activity-feed'] },
        { type: 'add_page', path: '/transactions', name: 'Transactions', sections: ['data-table', 'filters', 'stats-cards'] },
        { type: 'add_page', path: '/accounts', name: 'Accounts', sections: ['data-table', 'stats-cards'] },
        { type: 'add_entity', name: 'Transaction', fields: ['id', 'amount', 'currency', 'type', 'status', 'fromAccount', 'toAccount', 'createdAt'] },
        { type: 'add_entity', name: 'Account', fields: ['userId', 'number', 'type', 'balance', 'currency', 'status'] },
        { type: 'add_compliance', packId: 'compliance.pci-dss' },
        { type: 'add_kpi', name: 'Transaction Volume', formula: 'sum(transactions.today.amount)' },
        { type: 'add_kpi', name: 'Active Accounts', formula: 'count(accounts.active)' },
      ],
      source: 'industry',
    },

    // ── Industry — Luxury ────────────────────────────────────────────────────

    {
      id: 'rule.luxury.hero',
      name: 'Luxury brands need premium design and vocabulary',
      priority: 22,
      condition: (ctx) => is(ctx, 'luxury'),
      actions: [
        { type: 'add_design_profile', profileId: 'design.luxury.dark-opulence' },
        { type: 'add_pattern', patternId: 'pattern.luxury.watch-brand' },
        { type: 'add_page', path: '/collection', name: 'Collection', sections: ['product-grid', 'filters', 'category-grid'] },
        { type: 'add_page', path: '/craftsmanship', name: 'Craftsmanship', sections: ['features', 'gallery'] },
        { type: 'set_vocabulary', original: 'product', replacement: 'piece' },
        { type: 'set_vocabulary', original: 'buy', replacement: 'acquire' },
        { type: 'set_vocabulary', original: 'price', replacement: 'investment' },
        { type: 'set_vocabulary', original: 'shop', replacement: 'collection' },
      ],
      source: 'industry',
    },

    // ── Industry — Travel ────────────────────────────────────────────────────

    {
      id: 'rule.travel.core',
      name: 'Travel businesses need booking and destination showcase',
      priority: 18,
      condition: (ctx) => is(ctx, 'travel'),
      actions: [
        { type: 'add_page', path: '/destinations', name: 'Destinations', sections: ['product-grid', 'filters', 'category-grid'] },
        { type: 'add_page', path: '/book', name: 'Book Now', sections: ['booking-calendar', 'contact-form', 'pricing-table'] },
        { type: 'add_entity', name: 'Destination', fields: ['name', 'country', 'description', 'images', 'price', 'duration', 'category'] },
        { type: 'add_entity', name: 'Booking', fields: ['destinationId', 'guestName', 'email', 'checkIn', 'checkOut', 'guests', 'total', 'status'] },
        { type: 'add_integration', integrationType: 'payment', name: 'Stripe', required: true },
        { type: 'add_kpi', name: 'Bookings This Month', formula: 'count(bookings.thisMonth)' },
        { type: 'add_kpi', name: 'Revenue This Month', formula: 'sum(bookings.thisMonth.total)' },
      ],
      source: 'industry',
    },

    // ── Industry — Media ─────────────────────────────────────────────────────

    {
      id: 'rule.media.core',
      name: 'Media businesses need content publishing and subscriber management',
      priority: 18,
      condition: (ctx) => is(ctx, 'media'),
      actions: [
        { type: 'add_page', path: '/articles', name: 'Articles', sections: ['data-table', 'filters', 'stats-cards'] },
        { type: 'add_page', path: '/subscribers', name: 'Subscribers', sections: ['data-table', 'stats-cards'] },
        { type: 'add_page', path: '/analytics', name: 'Analytics', sections: ['charts', 'stats-cards', 'activity-feed'] },
        { type: 'add_entity', name: 'Article', fields: ['title', 'slug', 'content', 'author', 'status', 'publishedAt', 'views'] },
        { type: 'add_entity', name: 'Subscriber', fields: ['email', 'name', 'plan', 'subscribedAt', 'status'] },
        { type: 'add_kpi', name: 'Total Subscribers', formula: 'count(subscribers.active)' },
        { type: 'add_kpi', name: 'Articles Published', formula: 'count(articles.published)' },
        { type: 'add_kpi', name: 'Page Views Today', formula: 'sum(articles.viewsToday)' },
        { type: 'add_integration', integrationType: 'email', name: 'Mailchimp', required: false },
      ],
      source: 'industry',
    },

    // ── Industry — Beauty ────────────────────────────────────────────────────

    {
      id: 'rule.beauty.core',
      name: 'Beauty businesses need service menus and booking',
      priority: 18,
      condition: (ctx) => is(ctx, 'beauty'),
      actions: [
        { type: 'add_page', path: '/services', name: 'Services', sections: ['product-grid', 'pricing-table'] },
        { type: 'add_page', path: '/stylists', name: 'Our Stylists', sections: ['team-grid', 'team'] },
        { type: 'add_page', path: '/book', name: 'Book Now', sections: ['booking-calendar', 'contact-form'] },
        { type: 'add_entity', name: 'Service', fields: ['name', 'description', 'duration', 'price', 'category'] },
        { type: 'add_entity', name: 'Stylist', fields: ['name', 'specialty', 'bio', 'avatar', 'available'] },
        { type: 'add_entity', name: 'Appointment', fields: ['serviceId', 'stylistId', 'clientName', 'email', 'date', 'time', 'status'] },
        { type: 'add_integration', integrationType: 'booking', name: 'Cal.com', required: true },
        { type: 'add_kpi', name: 'Appointments Today', formula: 'count(appointments.today)' },
        { type: 'add_kpi', name: 'Revenue This Week', formula: 'sum(appointments.thisWeek.total)' },
        { type: 'set_vocabulary', original: 'product', replacement: 'service' },
        { type: 'set_vocabulary', original: 'buy', replacement: 'book' },
      ],
      source: 'industry',
    },

    // ── Industry — Event ─────────────────────────────────────────────────────

    {
      id: 'rule.event.core',
      name: 'Event businesses need event discovery and ticketing',
      priority: 18,
      condition: (ctx) => is(ctx, 'event'),
      actions: [
        { type: 'add_page', path: '/events', name: 'Events', sections: ['product-grid', 'filters', 'calendar'] },
        { type: 'add_page', path: '/event/:id', name: 'Event Detail', sections: ['product-info', 'pricing-table', 'contact-form'] },
        { type: 'add_page', path: '/my-tickets', name: 'My Tickets', sections: ['data-table', 'stats-cards'] },
        { type: 'add_entity', name: 'Event', fields: ['name', 'date', 'venue', 'description', 'image', 'capacity', 'price', 'status'] },
        { type: 'add_entity', name: 'Ticket', fields: ['eventId', 'buyerName', 'email', 'type', 'price', 'qrCode', 'status'] },
        { type: 'add_integration', integrationType: 'payment', name: 'Stripe', required: true },
        { type: 'add_kpi', name: 'Tickets Sold', formula: 'count(tickets.sold)' },
        { type: 'add_kpi', name: 'Revenue', formula: 'sum(tickets.totalRevenue)' },
        { type: 'add_kpi', name: 'Events This Month', formula: 'count(events.thisMonth)' },
      ],
      source: 'industry',
    },

    // ── Industry — Portfolio ─────────────────────────────────────────────────

    {
      id: 'rule.portfolio.core',
      name: 'Portfolios need project showcase and contact',
      priority: 18,
      condition: (ctx) => is(ctx, 'portfolio'),
      actions: [
        { type: 'add_page', path: '/work', name: 'Work', sections: ['product-grid', 'filters', 'category-grid'] },
        { type: 'add_page', path: '/work/:id', name: 'Project Detail', sections: ['product-info', 'product-gallery', 'contact-form'] },
        { type: 'add_page', path: '/about', name: 'About', sections: ['about', 'team', 'gallery'] },
        { type: 'add_entity', name: 'Project', fields: ['title', 'description', 'client', 'category', 'images', 'url', 'year'] },
        { type: 'add_kpi', name: 'Projects', formula: 'count(projects)' },
        { type: 'set_vocabulary', original: 'product', replacement: 'project' },
        { type: 'set_vocabulary', original: 'buy', replacement: 'inquire' },
      ],
      source: 'industry',
    },

    // ── Industry — Automotive ────────────────────────────────────────────────

    {
      id: 'rule.automotive.core',
      name: 'Automotive businesses need inventory and test drive booking',
      priority: 18,
      condition: (ctx) => is(ctx, 'automotive'),
      actions: [
        { type: 'add_page', path: '/inventory', name: 'Inventory', sections: ['product-grid', 'filters', 'stats-cards'] },
        { type: 'add_page', path: '/vehicle/:id', name: 'Vehicle Detail', sections: ['product-info', 'product-gallery', 'pricing-table'] },
        { type: 'add_page', path: '/financing', name: 'Financing', sections: ['pricing-table', 'contact-form', 'faq'] },
        { type: 'add_page', path: '/service', name: 'Service', sections: ['booking-calendar', 'data-table'] },
        { type: 'add_entity', name: 'Vehicle', fields: ['make', 'model', 'year', 'price', 'mileage', 'color', 'vin', 'status', 'image'] },
        { type: 'add_entity', name: 'TestDrive', fields: ['vehicleId', 'customerName', 'email', 'phone', 'date', 'time', 'status'] },
        { type: 'add_entity', name: 'ServiceRecord', fields: ['vehicleId', 'type', 'date', 'cost', 'technician', 'notes'] },
        { type: 'add_integration', integrationType: 'maps', name: 'Mapbox', required: false },
        { type: 'add_kpi', name: 'Vehicles in Stock', formula: 'count(vehicles.available)' },
        { type: 'add_kpi', name: 'Test Drives This Week', formula: 'count(testDrives.thisWeek)' },
        { type: 'add_kpi', name: 'Service Appointments', formula: 'count(serviceRecords.scheduled)' },
      ],
      source: 'industry',
    },

    // ── Industry — Manufacturing ─────────────────────────────────────────────

    {
      id: 'rule.manufacturing.core',
      name: 'Manufacturing needs production planning and quality control',
      priority: 20,
      condition: (ctx) => is(ctx, 'manufacturing'),
      actions: [
        { type: 'add_page', path: '/production', name: 'Production', sections: ['data-table', 'stats-cards', 'charts'] },
        { type: 'add_page', path: '/inventory', name: 'Inventory', sections: ['data-table', 'filters', 'stats-cards'] },
        { type: 'add_page', path: '/quality', name: 'Quality Control', sections: ['data-table', 'stats-cards'] },
        { type: 'add_page', path: '/suppliers', name: 'Suppliers', sections: ['data-table', 'stats-cards'] },
        { type: 'add_entity', name: 'ProductionRun', fields: ['productId', 'quantity', 'startDate', 'endDate', 'status', 'defectRate'] },
        { type: 'add_entity', name: 'InventoryItem', fields: ['name', 'sku', 'quantity', 'unit', 'reorderPoint', 'warehouse'] },
        { type: 'add_entity', name: 'QualityCheck', fields: ['runId', 'inspector', 'date', 'result', 'defects', 'notes'] },
        { type: 'add_entity', name: 'Supplier', fields: ['name', 'contact', 'materials', 'leadTime', 'rating'] },
        { type: 'add_kpi', name: 'Output This Month', formula: 'sum(productionRun.quantity)' },
        { type: 'add_kpi', name: 'Defect Rate', formula: 'defects / total * 100' },
        { type: 'add_kpi', name: 'Inventory Value', formula: 'sum(inventoryItem.quantity * inventoryItem.unitCost)' },
      ],
      source: 'industry',
    },

    // ── Industry — PropTech ──────────────────────────────────────────────────

    {
      id: 'rule.proptech.core',
      name: 'PropTech needs tenant management and lease tracking',
      priority: 18,
      condition: (ctx) => is(ctx, 'proptech'),
      actions: [
        { type: 'add_page', path: '/properties', name: 'Properties', sections: ['product-grid', 'filters', 'stats-cards'] },
        { type: 'add_page', path: '/tenants', name: 'Tenants', sections: ['data-table', 'stats-cards'] },
        { type: 'add_page', path: '/leases', name: 'Leases', sections: ['data-table', 'calendar'] },
        { type: 'add_page', path: '/maintenance', name: 'Maintenance', sections: ['data-table', 'booking-calendar'] },
        { type: 'add_entity', name: 'Property', fields: ['name', 'address', 'type', 'units', 'occupancy', 'revenue'] },
        { type: 'add_entity', name: 'Tenant', fields: ['name', 'email', 'propertyId', 'unit', 'leaseStart', 'leaseEnd', 'rent'] },
        { type: 'add_entity', name: 'Lease', fields: ['tenantId', 'propertyId', 'unit', 'startDate', 'endDate', 'rent', 'deposit', 'status'] },
        { type: 'add_entity', name: 'MaintenanceRequest', fields: ['tenantId', 'propertyId', 'description', 'priority', 'status', 'assignedTo'] },
        { type: 'add_kpi', name: 'Occupancy Rate', formula: 'occupiedUnits / totalUnits * 100' },
        { type: 'add_kpi', name: 'Monthly Revenue', formula: 'sum(leases.active.rent)' },
        { type: 'add_kpi', name: 'Open Maintenance', formula: 'count(maintenanceRequests.open)' },
        { type: 'add_integration', integrationType: 'payment', name: 'Stripe', required: true },
      ],
      source: 'industry',
    },

    // ── Business Model Rules ─────────────────────────────────────────────────

    {
      id: 'rule.subscription.pricing',
      name: 'Subscription businesses need pricing page and KPIs',
      priority: 16,
      condition: (ctx) => hasModel(ctx, 'subscription'),
      actions: [
        { type: 'add_page', path: '/pricing', name: 'Pricing', sections: ['pricing-table', 'feature-comparison', 'faq'] },
        { type: 'add_kpi', name: 'MRR', formula: 'sum(subscription.revenue)' },
        { type: 'add_kpi', name: 'Churn Rate', formula: 'churned / total' },
        { type: 'add_kpi', name: 'LTV', formula: 'arpu / churn_rate' },
      ],
      source: 'business_model',
    },

    {
      id: 'rule.marketplace.seller',
      name: 'Marketplaces need seller onboarding',
      priority: 16,
      condition: (ctx) => hasModel(ctx, 'marketplace'),
      actions: [
        { type: 'add_page', path: '/sellers', name: 'Become a Seller', sections: ['features', 'pricing-table', 'faq'] },
        { type: 'add_entity', name: 'Seller', fields: ['name', 'email', 'storeName', 'status', 'rating', 'totalSales'] },
        { type: 'add_kpi', name: 'Active Sellers', formula: 'count(sellers.active)' },
        { type: 'add_kpi', name: 'GMV', formula: 'sum(orders.total)' },
      ],
      source: 'business_model',
    },

    // ── Journey Rules ────────────────────────────────────────────────────────

    {
      id: 'rule.journey.visitor',
      name: 'All apps have visitor journey pages',
      priority: 5,
      condition: () => true,
      actions: [
        { type: 'add_page', path: '/', name: 'Home', sections: ['hero', 'features', 'testimonials', 'cta'] },
        { type: 'add_page', path: '/about', name: 'About', sections: ['about', 'team', 'mission'] },
        { type: 'add_page', path: '/contact', name: 'Contact', sections: ['contact'] },
      ],
      source: 'journey',
    },

    {
      id: 'rule.journey.customer',
      name: 'Customer journey needs authentication',
      priority: 10,
      condition: (ctx) => hasJourney(ctx, 'customer'),
      actions: [
        { type: 'add_page', path: '/login', name: 'Login', sections: ['login-form'] },
        { type: 'add_page', path: '/register', name: 'Register', sections: ['register-form'] },
        { type: 'add_page', path: '/profile', name: 'Profile', sections: ['profile', 'order-history', 'wishlist'] },
        { type: 'add_permission', role: 'user', resource: 'own_data', actions: ['read', 'write'] },
      ],
      source: 'journey',
    },

    {
      id: 'rule.journey.admin',
      name: 'Admin journey needs management panel',
      priority: 12,
      condition: (ctx) => hasJourney(ctx, 'admin'),
      actions: [
        { type: 'add_page', path: '/admin', name: 'Admin', sections: ['stats-cards', 'activity-feed', 'data-table'] },
        { type: 'add_page', path: '/admin/users', name: 'User Management', sections: ['data-table', 'filters'] },
        { type: 'add_permission', role: 'admin', resource: 'all', actions: ['create', 'read', 'update', 'delete'] },
      ],
      source: 'journey',
    },
  ];
}
