import type { BusinessIntelligenceProfile } from '../../schemas/knowledge/business-intelligence.schema.js';

export const FITNESS_GYM_BI: BusinessIntelligenceProfile = {
  id: 'bi.fitness.gym',
  version: '1.0.0',
  name: 'Gym & Fitness Center',
  description: 'How a gym makes money: lead capture → free trial → membership conversion → retention through engagement → expansion revenue',

  revenueCycle: {
    name: 'Lead → Membership Cash → Expansion Revenue',
    description: 'Stranger sees ad → books free trial → attends 3 classes → converts to membership → upgrades to PT → refers friends',
    steps: [
      { name: 'Lead captures email', action: 'Visitor fills free trial form on website', conversionRate: 0.15, avgTimeToNext: '0-1 days', revenueImpact: 'critical' },
      { name: 'Books free trial', action: 'Lead books 7-day free trial, provides phone number', conversionRate: 0.40, avgTimeToNext: '1-3 days', revenueImpact: 'critical' },
      { name: 'Attends first class', action: 'Lead shows up for first class, meets trainer', conversionRate: 0.60, avgTimeToNext: '1-2 days', revenueImpact: 'high' },
      { name: 'Attends 3+ classes', action: 'Lead returns for 3+ classes in trial period', conversionRate: 0.55, avgTimeToNext: '3-7 days', revenueImpact: 'high' },
      { name: 'Converts to membership', action: 'Lead signs monthly membership after trial', conversionRate: 0.35, avgTimeToNext: '7-14 days', revenueImpact: 'critical' },
      { name: 'Upgrades to PT', action: 'Member adds personal training sessions', conversionRate: 0.12, avgTimeToNext: '30-90 days', revenueImpact: 'medium' },
      { name: 'Refers a friend', action: 'Member refers friend who also converts', conversionRate: 0.08, avgTimeToNext: '60-180 days', revenueImpact: 'high' },
    ],
    avgCycleLength: '7-14 days',
    avgRevenuePerCustomer: '₹2,500-5,000/month',
  },

  conversionFunnel: {
    name: 'Free Trial → Membership Funnel',
    stages: ['Website Visit', 'Free Trial Signup', 'First Visit', '3+ Visits', 'Membership Sale', 'PT Upgrade', 'Referral'],
    overallConversionRate: '3-5% of website visitors become members',
    biggestDropOff: 'Trial signup → First visit (40% no-show rate)',
  },

  churnSignals: [
    { name: 'Missed 3 workouts in 2 weeks', detection: 'Check-in frequency dropped below 1.5x/week', window: '14 days', severity: 'high' },
    { name: 'No class booking in 7 days', detection: 'Member hasn\'t booked any class in a week', window: '7 days', severity: 'medium' },
    { name: 'No visit in 14 days', detection: 'Zero check-ins for 2 consecutive weeks', window: '14 days', severity: 'critical' },
    { name: 'Cancellation request', detection: 'Member initiates cancellation flow', window: '0 days', severity: 'critical' },
    { name: 'Payment failure', detection: 'Recurring payment declined', window: '3 days', severity: 'critical' },
    { name: 'Complaint filed', detection: 'Member submits complaint or negative review', window: '7 days', severity: 'high' },
  ],

  retentionAutomations: [
    { name: 'Re-engagement email after 7 days inactive', trigger: 'No check-in for 7 days', action: 'Send personalized email with class recommendations', expectedImpact: 'Reduces churn by 15%' },
    { name: 'Win-back call after 14 days', trigger: 'No check-in for 14 days', action: 'Personal call from trainer offering free session', expectedImpact: 'Recovers 20% of at-risk members' },
    { name: 'Anniversary celebration', trigger: '1 year membership anniversary', action: 'Send congratulations + free PT session', expectedImpact: 'Increases retention by 10%' },
    { name: 'Payment failure retry', trigger: 'Payment declined', action: 'Retry payment + notify member via SMS', expectedImpact: 'Recovers 60% of failed payments' },
    { name: 'Class reminder', trigger: '2 hours before booked class', action: 'SMS reminder with class details', expectedImpact: 'Reduces no-shows by 25%' },
    { name: 'Monthly progress report', trigger: 'First of each month', action: 'Send workout summary + goals progress', expectedImpact: 'Increases engagement by 30%' },
  ],

  kpis: [
    { name: 'Monthly Recurring Revenue', label: 'MRR', formula: 'Sum of all active membership fees', benchmark: '₹5-15L/month', unit: '₹', category: 'revenue' },
    { name: 'Churn Rate', label: 'Churn', formula: 'Members lost / Total members × 100', benchmark: '5-8%/month', unit: '%', category: 'retention' },
    { name: 'Check-in Count', label: 'Check-ins', formula: 'Total check-ins this period', benchmark: '300-800/month', unit: 'count', category: 'engagement' },
    { name: 'Trial-to-Member Conversion', label: 'Trial Conv.', formula: 'Members converted / Trials started × 100', benchmark: '25-40%', unit: '%', category: 'growth' },
    { name: 'Average Revenue Per Member', label: 'ARPM', formula: 'MRR / Active members', benchmark: '₹2,500-4,000', unit: '₹', category: 'revenue' },
    { name: 'Class Utilization', label: 'Class Util.', formula: 'Booked spots / Total spots × 100', benchmark: '60-80%', unit: '%', category: 'operations' },
    { name: 'Member Lifetime Value', label: 'LTV', formula: 'ARPM × Average membership duration', benchmark: '₹30,000-60,000', unit: '₹', category: 'revenue' },
    { name: 'Referral Rate', label: 'Referrals', formula: 'Referral conversions / Total members × 100', benchmark: '8-15%', unit: '%', category: 'growth' },
  ],

  dashboardWidgets: [
    { name: 'Revenue Trend', type: 'chart', description: 'Monthly revenue trend with MRR breakdown', kpis: ['Monthly Recurring Revenue'], priority: 'primary' },
    { name: 'Membership Stats', type: 'stat-card', description: 'Active members, new joins, cancellations', kpis: ['Churn Rate', 'Trial-to-Member Conversion'], priority: 'primary' },
    { name: 'Check-in Heatmap', type: 'chart', description: 'Check-in patterns by day of week and hour', kpis: ['Check-in Count', 'Class Utilization'], priority: 'secondary' },
    { name: 'At-Risk Members', type: 'table', description: 'Members showing churn signals with risk score', kpis: ['Churn Rate'], priority: 'primary' },
    { name: 'Revenue Per Member', type: 'gauge', description: 'ARPM vs target with trend indicator', kpis: ['Average Revenue Per Member'], priority: 'secondary' },
    { name: 'Class Capacity', type: 'table', description: 'Upcoming classes with booking status', kpis: ['Class Utilization'], priority: 'secondary' },
    { name: 'Referral Pipeline', type: 'list', description: 'Active referrals and their conversion status', kpis: ['Referral Rate'], priority: 'tertiary' },
  ],

  leadCaptureMechanisms: [
    { name: 'Free Trial Form', headline: 'Start Your Free 7-Day Trial', fields: ['name', 'email', 'phone', 'fitness_goal'], nextStep: 'Book trial classes via SMS', conversionRate: '12-18% of visitors' },
    { name: 'Class Booking', headline: 'Book Your First Class Free', fields: ['name', 'email', 'preferred_class'], nextStep: 'Confirmation email + trainer intro', conversionRate: '20-25% of visitors' },
    { name: 'BMI Calculator', headline: 'Calculate Your BMI & Get a Free Plan', fields: ['name', 'email', 'height', 'weight', 'goal'], nextStep: 'Personalized plan email + trial offer', conversionRate: '15-20% of visitors' },
  ],

  morningCheck: {
    primaryMetrics: ['MRR', 'Today\'s check-ins', 'Trial bookings today', 'Payment failures'],
    secondaryMetrics: ['Class capacity', 'At-risk members', 'Staff schedule', 'Equipment status'],
    alertConditions: ['MRR dropped >5%', 'Payment failures >3', 'No-show rate >30%', 'Member complaint filed'],
  },

  revenueModels: [
    { name: 'Monthly Membership', description: 'Recurring monthly access fee', percentage: 65 },
    { name: 'Personal Training', description: '1-on-1 or small group PT sessions', percentage: 15 },
    { name: 'Drop-in Classes', description: 'Pay-per-class for non-members', percentage: 8 },
    { name: 'Merchandise', description: 'Branded gear, supplements, accessories', percentage: 7 },
    { name: 'Annual Membership', description: 'Discounted yearly commitment', percentage: 5 },
  ],

  vocabulary: {
    'customer': 'member',
    'product': 'class',
    'buy': 'join',
    'store': 'gym',
    'cart': 'membership',
    'checkout': 'enroll',
    'price': 'rate',
    'order': 'enrollment',
    'purchase': 'membership',
    'refund': 'cancellation',
    'subscription': 'membership plan',
  },
};
