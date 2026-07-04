// ─── BOS Entry: SaaS (Software as a Service) ─────────────────────────

import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';
import { SAAS_BI } from '../knowledge/bi-profiles/saas.js';

const SaaSEntry: BOSEntry = {
  id: 'technology.saas',
  industry: 'Technology',
  subIndustry: 'SaaS',
  description: 'Software as a Service platform with subscription billing, user management, and dashboard',
  
  capabilities: [
    'hero',
    'features_grid',
    'pricing_table',
    'testimonials',
    'cta',
    'dashboard_preview',
    'integration_showcase',
    'faq',
    'newsletter'
  ],
  
  references: {
    urls: [
      'https://www.slack.com',
      'https://www.notion.so',
      'https://www.linear.app'
    ],
    selectors: {
      heroHeadline: 'h1',
      heroSubtitle: '[data-testid="hero-subtitle"]',
      pricingCards: '.pricing-card, [class*="pricing"]',
      featureList: '[class*="feature"] li, .feature-list li',
      testimonial: '[class*="testimonial"], .customer-review',
      ctaButton: 'a[href*="signup"], a[href*="trial"]'
    }
  },
  
  vocabularyOverrides: {
    'product': 'platform',
    'buy': 'subscribe',
    'store': 'workspace',
    'cart': 'subscription',
    'checkout': 'sign up',
    'price': 'plan',
    'customer': 'team',
    'order': 'subscription'
  },
  
  workflows: [
    {
      name: 'User Onboarding',
      steps: ['Sign up', 'Onboarding wizard', 'First project creation', 'Invite team'],
      revenue_impact: 'Reduces churn by 40%'
    },
    {
      name: 'Subscription Management',
      steps: ['Free trial', 'Upgrade prompt', 'Payment', 'Plan management'],
      revenue_impact: 'Primary revenue driver'
    }
  ],
  
  entities: ['User', 'Workspace', 'Project', 'Subscription', 'Team', 'Feature', 'Usage'],
  
  revenueModel: ['subscription', 'freemium', 'tiered_pricing', 'usage_based'],
  revenueIntelligence: SAAS_BI,
  
  compliance: ['GDPR', 'SOC2', 'Data Processing Agreement'],
  
  priority: 1,
  
  tags: ['software', 'subscription', 'cloud', 'platform', 'dashboard', 'api', 'integration']
};

BOSRegistry.register(SaaSEntry);
export default SaaSEntry;
