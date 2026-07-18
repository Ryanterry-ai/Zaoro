/**
 * Revenue Intelligence derivation — vertical-agnostic.
 *
 * Projects the signal-derived `BusinessKnowledge` into the legacy
 * `BusinessIntelligenceProfile` shape that downstream layers (content-resolver,
 * rules-engine, blueprint-compiler) consume.
 *
 * This REPLACES the hardcoded per-vertical BI profiles under
 * `src/bos/knowledge/bi-profiles/*` and the dead `BOSRegistry` lookup. Every
 * field here is composed from PRIMITIVES — revenue model, retention strategy,
 * workflow kinds, entities, personas, KPIs — never from an industry string.
 * A café and a SaaS both flow through the same code; their profiles differ
 * only because their primitive signals differ.
 */

import type { BusinessKnowledge } from './types.js';
import type {
  BusinessIntelligenceProfile,
  RevenueCycle,
  RevenueStep,
  ConversionFunnel,
  ChurnSignal,
  RetentionAutomation,
  KPI,
  DashboardWidget,
  LeadCaptureMechanism,
} from '../../bos/schemas/knowledge/business-intelligence.schema.js';

// ── Primitive → phrasing maps (closed sets, NOT vertical enumerations) ────────

const REVENUE_MODEL_LABEL: Record<string, string> = {
  'one-time': 'One-Time Purchase',
  subscription: 'Recurring Subscription',
  'service-fee': 'Service Fee',
  'marketplace-take-rate': 'Marketplace Take-Rate',
  advertising: 'Advertising',
  donation: 'Donation',
  freemium: 'Freemium Upgrade',
  wholesale: 'Wholesale',
};

// The revenue verb the whole funnel converges on, keyed by conversion intent.
const CONVERSION_ACTION: Record<string, { verb: string; nextStep: string; funnelTail: string }> = {
  checkout: { verb: 'completes checkout', nextStep: 'Order confirmed', funnelTail: 'Paid order' },
  book: { verb: 'confirms a booking', nextStep: 'Booking confirmed', funnelTail: 'Confirmed booking' },
  booking: { verb: 'confirms a booking', nextStep: 'Booking confirmed', funnelTail: 'Confirmed booking' },
  subscribe: { verb: 'starts a subscription', nextStep: 'Subscription active', funnelTail: 'Active subscriber' },
  'lead-form': { verb: 'submits an enquiry', nextStep: 'Lead routed to sales', funnelTail: 'Qualified lead' },
  donate: { verb: 'makes a donation', nextStep: 'Receipt sent', funnelTail: 'Completed donation' },
};

function primaryConversion(bk: BusinessKnowledge): string {
  return bk.intents?.conversion?.[0] ?? inferConversionFromRevenue(bk.revenue.model);
}

function inferConversionFromRevenue(model: string): string {
  switch (model) {
    case 'subscription':
    case 'freemium':
      return 'subscribe';
    case 'service-fee':
      return 'book';
    case 'donation':
      return 'donate';
    case 'marketplace-take-rate':
    case 'one-time':
    case 'wholesale':
      return 'checkout';
    default:
      return 'lead-form';
  }
}

function title(s: string): string {
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

// ── Revenue cycle ─────────────────────────────────────────────────────────────

function buildRevenueCycle(bk: BusinessKnowledge, conv: string): RevenueCycle {
  const action = CONVERSION_ACTION[conv] ?? CONVERSION_ACTION['lead-form']!;
  const persona = bk.customerPersonas[0]?.label ?? 'Visitor';

  const steps: RevenueStep[] = [
    { name: 'Discovers the business', action: `${persona} arrives from ${bk.acquisition[0]?.channel ?? 'search'}`, revenueImpact: 'high' },
    { name: 'Evaluates the offer', action: 'Reviews the value proposition and proof', conversionRate: 0.4, revenueImpact: 'high' },
    { name: 'Takes the revenue action', action: `${persona} ${action.verb}`, conversionRate: 0.15, revenueImpact: 'critical' },
    { name: action.nextStep, action: 'Value is delivered and the relationship begins', revenueImpact: 'medium' },
  ];

  return {
    name: `${title(bk.discovery.domain)} → ${REVENUE_MODEL_LABEL[bk.revenue.model] ?? title(bk.revenue.model)}`,
    description: `How ${bk.discovery.businessType} converts a first-time visitor into revenue via ${bk.revenue.source}.`,
    steps,
    avgCycleLength: bk.revenue.model === 'subscription' ? '14-30 days' : bk.revenue.model === 'service-fee' ? '3-10 days' : '1-3 days',
    avgRevenuePerCustomer: bk.revenue.model === 'subscription' ? 'recurring monthly' : 'per transaction',
  };
}

function buildConversionFunnel(bk: BusinessKnowledge, conv: string): ConversionFunnel {
  const action = CONVERSION_ACTION[conv] ?? CONVERSION_ACTION['lead-form']!;
  return {
    name: `${title(conv)} funnel`,
    stages: ['Visitor', 'Engaged', 'Intent', action.funnelTail],
    overallConversionRate: '2-5%',
    biggestDropOff: 'Engaged → Intent',
  };
}

// ── Churn + retention (from retention strategy primitive) ─────────────────────

function buildChurnSignals(bk: BusinessKnowledge): ChurnSignal[] {
  const base: ChurnSignal[] = [
    { name: 'Inactivity', detection: 'No return visit or repeat action', window: '30 days', severity: 'high' },
  ];
  if (bk.revenue.model === 'subscription' || bk.retention.strategy === 'subscription') {
    base.push({ name: 'Failed renewal payment', detection: 'Payment declined on billing cycle', window: '3 days', severity: 'critical' });
    base.push({ name: 'Usage decline', detection: 'Sessions drop below baseline', window: '14 days', severity: 'medium' });
  }
  if (bk.retention.strategy === 'community') {
    base.push({ name: 'Disengagement', detection: 'No posts, comments, or logins', window: '21 days', severity: 'medium' });
  }
  return base;
}

function buildRetentionAutomations(bk: BusinessKnowledge): RetentionAutomation[] {
  const out: RetentionAutomation[] = [];
  for (const m of bk.retention.mechanisms.slice(0, 4)) {
    out.push({
      name: title(m),
      trigger: 'Lifecycle signal detected',
      action: `Trigger ${m} to re-engage the customer`,
      expectedImpact: 'Reduces churn on the targeted cohort',
    });
  }
  if (out.length === 0) {
    out.push({ name: 'Win-back email', trigger: '30 days inactive', action: 'Send a re-engagement email', expectedImpact: 'Recovers a share of lapsing customers' });
  }
  return out;
}

// ── KPIs + dashboard widgets (from bk.kpis + revenue model) ───────────────────

function kpiCategory(question: string): KPI['category'] {
  const q = question.toLowerCase();
  if (/revenue|sales|order value|mrr|arr|payment/.test(q)) return 'revenue';
  if (/retention|churn|repeat|renew|loyal/.test(q)) return 'retention';
  if (/engag|visit|session|active|traffic/.test(q)) return 'engagement';
  if (/growth|acqui|signup|new/.test(q)) return 'growth';
  return 'operations';
}

function buildKpis(bk: BusinessKnowledge): KPI[] {
  const kpis: KPI[] = bk.kpis.map((k) => ({
    name: k.name,
    label: k.name,
    formula: k.question,
    unit: 'count',
    category: kpiCategory(k.question),
  }));
  // Guarantee a revenue KPI exists so revenue widgets always have data.
  if (!kpis.some((k) => k.category === 'revenue')) {
    kpis.unshift({
      name: bk.revenue.model === 'subscription' ? 'Monthly Recurring Revenue' : 'Total Revenue',
      label: bk.revenue.model === 'subscription' ? 'MRR' : 'Revenue',
      formula: 'Sum of completed payments in period',
      unit: 'currency',
      category: 'revenue',
    });
  }
  return kpis;
}

function buildDashboardWidgets(kpis: KPI[]): DashboardWidget[] {
  const widgets: DashboardWidget[] = [];
  const revenueKpis = kpis.filter((k) => k.category === 'revenue').map((k) => k.name);
  if (revenueKpis.length) {
    widgets.push({ name: 'Revenue Trend', type: 'chart', description: 'Revenue over time', kpis: revenueKpis, priority: 'primary' });
  }
  const engagement = kpis.filter((k) => k.category === 'engagement').map((k) => k.name);
  if (engagement.length) {
    widgets.push({ name: 'Engagement Overview', type: 'stat-card', description: 'Active usage snapshot', kpis: engagement, priority: 'secondary' });
  }
  const retention = kpis.filter((k) => k.category === 'retention').map((k) => k.name);
  if (retention.length) {
    widgets.push({ name: 'Retention Health', type: 'gauge', description: 'Churn and repeat-rate health', kpis: retention, priority: 'secondary' });
  }
  widgets.push({ name: 'Recent Activity', type: 'table', description: 'Latest transactions and events', kpis: kpis.slice(0, 3).map((k) => k.name), priority: 'tertiary' });
  return widgets;
}

// ── Lead capture (from primary conversion + persona needs) ────────────────────

function buildLeadCapture(bk: BusinessKnowledge, conv: string): LeadCaptureMechanism[] {
  const persona = bk.customerPersonas[0];
  const need = persona?.needs?.[0] ?? 'get started';
  const map: Record<string, LeadCaptureMechanism> = {
    checkout: { name: 'Cart & Checkout', headline: `Ready to ${need}?`, fields: ['email', 'shipping', 'payment'], nextStep: 'Order confirmation' },
    subscribe: { name: 'Subscription Signup', headline: 'Start your plan', fields: ['email', 'plan', 'payment'], nextStep: 'Account activation' },
    book: { name: 'Booking Form', headline: 'Book your slot', fields: ['name', 'email', 'date', 'time'], nextStep: 'Booking confirmation' },
    booking: { name: 'Booking Form', headline: 'Book your slot', fields: ['name', 'email', 'date', 'time'], nextStep: 'Booking confirmation' },
    'lead-form': { name: 'Enquiry Form', headline: 'Get in touch', fields: ['name', 'email', 'message'], nextStep: 'Sales follow-up' },
    donate: { name: 'Donation Form', headline: 'Support the cause', fields: ['amount', 'email', 'payment'], nextStep: 'Thank-you receipt' },
  };
  return [map[conv] ?? map['lead-form']!];
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Derive a full BusinessIntelligenceProfile from signal-derived
 * BusinessKnowledge. Deterministic, vertical-agnostic, no network.
 */
export function deriveRevenueIntelligence(bk: BusinessKnowledge): BusinessIntelligenceProfile {
  const conv = primaryConversion(bk);
  const kpis = buildKpis(bk);

  return {
    id: `bi.derived.${bk.discovery.subIndustry || bk.discovery.industry || 'general'}`,
    version: '2.0.0',
    name: `${bk.discovery.businessType} revenue intelligence`,
    description: `Signal-derived revenue model for ${bk.discovery.businessType}.`,
    revenueCycle: buildRevenueCycle(bk, conv),
    conversionFunnel: buildConversionFunnel(bk, conv),
    churnSignals: buildChurnSignals(bk),
    retentionAutomations: buildRetentionAutomations(bk),
    kpis,
    dashboardWidgets: buildDashboardWidgets(kpis),
    leadCaptureMechanisms: buildLeadCapture(bk, conv),
    morningCheck: {
      primaryMetrics: kpis.filter((k) => k.category === 'revenue').map((k) => k.name).slice(0, 2),
      secondaryMetrics: kpis.filter((k) => k.category !== 'revenue').map((k) => k.name).slice(0, 3),
      alertConditions: buildChurnSignals(bk).filter((c) => c.severity === 'critical').map((c) => c.name),
    },
    revenueModels: [
      {
        name: REVENUE_MODEL_LABEL[bk.revenue.model] ?? title(bk.revenue.model),
        description: bk.revenue.source,
        percentage: 100,
      },
    ],
    vocabulary: bk.vocabulary.terms,
  };
}
