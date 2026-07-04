/**
 * Business Intelligence Profile Schema
 *
 * Defines how a specific business type makes money — the complete cycle from
 * "stranger discovers business" → "cash in account" → "customer comes back."
 *
 * Every pattern in the registry should have a matching BI profile that tells
 * the generation engine:
 *   - What KPIs the owner checks every morning
 *   - What the lead-to-cash conversion funnel looks like
 *   - Why customers churn and what automations prevent it
 *   - What dashboard widgets are actually useful (not generic)
 */

// ─── Revenue Cycle ───────────────────────────────────────────────────────────

export interface RevenueStep {
  /** Step name (e.g., "Lead captures email", "Books free trial") */
  name: string;
  /** What happens at this step */
  action: string;
  /** Conversion rate benchmark (0-1) */
  conversionRate?: number;
  /** Average time from this step to next */
  avgTimeToNext?: string;
  /** Revenue impact if this step fails */
  revenueImpact: 'critical' | 'high' | 'medium' | 'low';
}

export interface RevenueCycle {
  /** Human-readable name (e.g., "Lead → Membership Cash") */
  name: string;
  /** Description of the full cycle */
  description: string;
  /** Ordered steps from first touch to first payment */
  steps: RevenueStep[];
  /** Average cycle length (e.g., "7-14 days") */
  avgCycleLength: string;
  /** Average order value or monthly revenue per customer */
  avgRevenuePerCustomer: string;
}

// ─── Churn & Retention ───────────────────────────────────────────────────────

export interface ChurnSignal {
  /** Signal name (e.g., "Missed 3 workouts in 2 weeks") */
  name: string;
  /** How to detect this signal */
  detection: string;
  /** Time window for detection */
  window: string;
  /** Severity of this churn risk */
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface RetentionAutomation {
  /** Automation name (e.g., "Re-engagement email after 7 days inactive") */
  name: string;
  /** Trigger condition */
  trigger: string;
  /** What the automation does */
  action: string;
  /** Expected impact on retention */
  expectedImpact: string;
}

// ─── KPIs & Dashboard ────────────────────────────────────────────────────────

export interface KPI {
  /** KPI name (e.g., "Monthly Recurring Revenue") */
  name: string;
  /** Short label for dashboard display */
  label: string;
  /** How to calculate this KPI */
  formula: string;
  /** Benchmark or target value */
  benchmark?: string;
  /** Unit of measurement */
  unit: string;
  /** Category for dashboard grouping */
  category: 'revenue' | 'engagement' | 'operations' | 'growth' | 'retention';
}

export interface DashboardWidget {
  /** Widget name (e.g., "Revenue Trend Chart") */
  name: string;
  /** Widget type */
  type: 'chart' | 'stat-card' | 'table' | 'list' | 'gauge';
  /** What data it displays */
  description: string;
  /** KPIs it depends on */
  kpis: string[];
  /** Priority for dashboard layout */
  priority: 'primary' | 'secondary' | 'tertiary';
}

// ─── Lead Capture & Conversion ───────────────────────────────────────────────

export interface LeadCaptureMechanism {
  /** Mechanism name (e.g., "Free Trial Form") */
  name: string;
  /** What the lead sees */
  headline: string;
  /** What information is collected */
  fields: string[];
  /** What happens after capture */
  nextStep: string;
  /** Conversion rate benchmark */
  conversionRate?: string;
}

export interface ConversionFunnel {
  /** Funnel name */
  name: string;
  /** Stages from lead to paying customer */
  stages: string[];
  /** Overall conversion rate benchmark */
  overallConversionRate: string;
  /** Biggest drop-off point */
  biggestDropOff: string;
}

// ─── Business Intelligence Profile ───────────────────────────────────────────

export interface BusinessIntelligenceProfile {
  /** Profile ID: bi.{industry}.{sub-industry} */
  id: string;
  /** Profile version */
  version: string;
  /** Human-readable name */
  name: string;
  /** Description of this business type's revenue model */
  description: string;

  // Revenue understanding
  revenueCycle: RevenueCycle;
  conversionFunnel: ConversionFunnel;

  // Churn & retention
  churnSignals: ChurnSignal[];
  retentionAutomations: RetentionAutomation[];

  // KPIs & dashboard
  kpis: KPI[];
  dashboardWidgets: DashboardWidget[];

  // Lead capture
  leadCaptureMechanisms: LeadCaptureMechanism[];

  // Morning check: what does the owner check first?
  morningCheck: {
    /** What they look at first */
    primaryMetrics: string[];
    /** What they look at next */
    secondaryMetrics: string[];
    /** What triggers action */
    alertConditions: string[];
  };

  // Revenue models
  revenueModels: Array<{
    name: string;
    description: string;
    percentage: number; // % of total revenue
  }>;

  // Industry-specific vocabulary
  vocabulary: Record<string, string>;
}
