/**
 * Revenue Intelligence Engine: Determines revenue streams, monetization models,
 * and conversion paths for any business type. Domain agnostic.
 */

export type MonetizationModel =
  | 'subscription'
  | 'transactional'
  | 'freemium'
  | 'advertising'
  | 'commission'
  | 'hybrid'
  | 'custom';

export interface RevenueStream {
  id: string;
  name: string;
  type: 'primary' | 'secondary' | 'tertiary';
  model: MonetizationModel;
  description: string;
  estimatedContribution: string; // percentage range
  conversionPath: string[];
  dependencies: string[];
}

export interface ConversionPath {
  id: string;
  name: string;
  stages: string[];
  estimatedRate: string;
  touchpoints: string[];
}

export interface RevenueModel {
  streams: RevenueStream[];
  conversionPaths: ConversionPath[];
  primaryModel: MonetizationModel;
  averageRevenuePerUser: string;
  lifetimeValueEstimate: string;
  monetizationOpportunities: string[];
}

// ─── Revenue Pattern Detection ───────────────────────────────────

interface RevenuePattern {
  capability: string;
  primaryModel: MonetizationModel;
  streams: Array<{ name: string; type: 'primary' | 'secondary' | 'tertiary'; model: MonetizationModel; description: string }>;
  conversionPaths: Array<{ name: string; stages: string[]; touchpoints: string[] }>;
  arpuRange: string;
  ltvRange: string;
}

const REVENUE_PATTERNS: RevenuePattern[] = [
  {
    capability: 'membership',
    primaryModel: 'subscription',
    streams: [
      { name: 'Membership Fees', type: 'primary', model: 'subscription', description: 'Recurring monthly/annual membership dues' },
      { name: 'Personal Training', type: 'secondary', model: 'transactional', description: 'One-on-one training sessions' },
      { name: 'Merchandise', type: 'tertiary', model: 'transactional', description: 'Branded products and supplements' },
    ],
    conversionPaths: [
      { name: 'Free Trial to Paid', stages: ['sign_up', 'trial', 'convert', 'retain'], touchpoints: ['website', 'email', 'in-app'] },
      { name: 'Walk-in to Member', stages: ['visit', 'tour', 'sign_up', 'onboard'], touchpoints: ['in-person', 'website', 'phone'] },
    ],
    arpuRange: '$50-150/month',
    ltvRange: '$600-2,400',
  },
  {
    capability: 'ecommerce',
    primaryModel: 'transactional',
    streams: [
      { name: 'Product Sales', type: 'primary', model: 'transactional', description: 'Direct product sales revenue' },
      { name: 'Shipping Fees', type: 'secondary', model: 'transactional', description: 'Shipping and handling charges' },
      { name: 'Affiliate Revenue', type: 'tertiary', model: 'commission', description: 'Commission from affiliate partnerships' },
    ],
    conversionPaths: [
      { name: 'Browse to Buy', stages: ['awareness', 'consideration', 'purchase', 'retain'], touchpoints: ['website', 'social', 'email'] },
      { name: 'Cart Recovery', stages: ['cart_abandon', 'reminder', 'return', 'purchase'], touchpoints: ['email', 'push', 'ads'] },
    ],
    arpuRange: '$30-200/order',
    ltvRange: '$150-1,000',
  },
  {
    capability: 'marketplace',
    primaryModel: 'commission',
    streams: [
      { name: 'Transaction Fees', type: 'primary', model: 'commission', description: 'Commission on each transaction' },
      { name: 'Featured Listings', type: 'secondary', model: 'transactional', description: 'Paid placement for sellers' },
      { name: 'Seller Subscriptions', type: 'tertiary', model: 'subscription', description: 'Premium seller accounts' },
    ],
    conversionPaths: [
      { name: 'List to Sell', stages: ['list', 'optimize', 'convert', 'fulfill'], touchpoints: ['dashboard', 'analytics'] },
      { name: 'Buyer Journey', stages: ['search', 'compare', 'purchase', 'review'], touchpoints: ['website', 'app', 'email'] },
    ],
    arpuRange: '$5-50/transaction',
    ltvRange: '$100-500',
  },
  {
    capability: 'saas',
    primaryModel: 'subscription',
    streams: [
      { name: 'SaaS Subscriptions', type: 'primary', model: 'subscription', description: 'Monthly/annual software subscriptions' },
      { name: 'API Usage', type: 'secondary', model: 'transactional', description: 'Pay-per-use API access' },
      { name: 'Enterprise Plans', type: 'secondary', model: 'subscription', description: 'Custom enterprise pricing' },
      { name: 'Add-ons', type: 'tertiary', model: 'transactional', description: 'Premium features and integrations' },
    ],
    conversionPaths: [
      { name: 'Free to Paid', stages: ['sign_up', 'activate', 'engage', 'convert'], touchpoints: ['website', 'in-app', 'email'] },
      { name: 'Expansion', stages: ['use', 'hit_limits', 'upgrade', 'retain'], touchpoints: ['in-app', 'sales', 'support'] },
    ],
    arpuRange: '$20-500/month',
    ltvRange: '$500-10,000',
  },
  {
    capability: 'education',
    primaryModel: 'transactional',
    streams: [
      { name: 'Course Sales', type: 'primary', model: 'transactional', description: 'One-time course purchases' },
      { name: 'Subscriptions', type: 'secondary', model: 'subscription', description: 'Monthly learning subscriptions' },
      { name: 'Certifications', type: 'secondary', model: 'transactional', description: 'Professional certification fees' },
      { name: 'Corporate Training', type: 'tertiary', model: 'transactional', description: 'B2B training packages' },
    ],
    conversionPaths: [
      { name: 'Preview to Purchase', stages: ['preview', 'enroll', 'complete', 'certify'], touchpoints: ['website', 'email', 'in-app'] },
      { name: 'Subscription Retention', stages: ['subscribe', 'engage', 'renew', 'upgrade'], touchpoints: ['in-app', 'email'] },
    ],
    arpuRange: '$50-500/course',
    ltvRange: '$200-2,000',
  },
  {
    capability: 'services',
    primaryModel: 'transactional',
    streams: [
      { name: 'Service Fees', type: 'primary', model: 'transactional', description: 'Project-based service fees' },
      { name: 'Retainers', type: 'secondary', model: 'subscription', description: 'Monthly retainer agreements' },
      { name: 'Consulting', type: 'tertiary', model: 'transactional', description: 'Advisory and consulting services' },
    ],
    conversionPaths: [
      { name: 'Inquiry to Client', stages: ['inquiry', 'proposal', 'contract', 'deliver'], touchpoints: ['website', 'email', 'phone'] },
      { name: 'Upsell', stages: ['deliver', 'satisfy', 'propose', 'expand'], touchpoints: ['meetings', 'email'] },
    ],
    arpuRange: '$500-10,000/project',
    ltvRange: '$2,000-50,000',
  },
  {
    capability: 'booking',
    primaryModel: 'transactional',
    streams: [
      { name: 'Booking Fees', type: 'primary', model: 'transactional', description: 'Per-booking service fees' },
      { name: 'Premium Slots', type: 'secondary', model: 'transactional', description: 'Premium time slot pricing' },
      { name: 'Memberships', type: 'tertiary', model: 'subscription', description: 'Priority booking memberships' },
    ],
    conversionPaths: [
      { name: 'Browse to Book', stages: ['browse', 'select', 'book', 'attend'], touchpoints: ['website', 'app', 'email'] },
      { name: 'Rebooking', stages: ['complete', 'review', 'rebook', 'refer'], touchpoints: ['email', 'sms', 'app'] },
    ],
    arpuRange: '$20-200/booking',
    ltvRange: '$200-2,000',
  },
  {
    capability: 'content',
    primaryModel: 'subscription',
    streams: [
      { name: 'Content Subscriptions', type: 'primary', model: 'subscription', description: 'Premium content access' },
      { name: 'Advertising', type: 'secondary', model: 'advertising', description: 'Display and native ads' },
      { name: 'Sponsored Content', type: 'tertiary', model: 'transactional', description: 'Branded content partnerships' },
    ],
    conversionPaths: [
      { name: 'Reader to Subscriber', stages: ['read', 'register', 'subscribe', 'retain'], touchpoints: ['website', 'email', 'social'] },
      { name: 'Engagement', stages: ['visit', 'read', 'share', 'return'], touchpoints: ['website', 'social', 'email'] },
    ],
    arpuRange: '$5-30/month',
    ltvRange: '$60-500',
  },
  {
    capability: 'real_estate',
    primaryModel: 'commission',
    streams: [
      { name: 'Agent Commissions', type: 'primary', model: 'commission', description: 'Commission on property sales' },
      { name: 'Listing Fees', type: 'secondary', model: 'transactional', description: 'Fees for listing properties' },
      { name: 'Referral Fees', type: 'tertiary', model: 'commission', description: 'Referral commissions' },
    ],
    conversionPaths: [
      { name: 'Search to Sale', stages: ['search', 'view', 'offer', 'close'], touchpoints: ['website', 'agent', 'office'] },
      { name: 'List to Sell', stages: ['list', 'market', 'show', 'close'], touchpoints: ['agent', 'website', 'marketing'] },
    ],
    arpuRange: '$10,000-50,000/sale',
    ltvRange: '$20,000-100,000',
  },
  {
    capability: 'restaurant',
    primaryModel: 'transactional',
    streams: [
      { name: 'Food Sales', type: 'primary', model: 'transactional', description: 'Dine-in and takeout orders' },
      { name: 'Delivery Fees', type: 'secondary', model: 'transactional', description: 'Delivery service charges' },
      { name: 'Catering', type: 'tertiary', model: 'transactional', description: 'Catering and event services' },
    ],
    conversionPaths: [
      { name: 'Visit to Order', stages: ['visit', 'browse', 'order', 'return'], touchpoints: ['website', 'app', 'in-person'] },
      { name: 'Online to Pickup', stages: ['browse', 'order', 'pay', 'pickup'], touchpoints: ['website', 'app', 'sms'] },
    ],
    arpuRange: '$15-80/order',
    ltvRange: '$200-2,000',
  },
  {
    capability: 'healthcare',
    primaryModel: 'transactional',
    streams: [
      { name: 'Service Fees', type: 'primary', model: 'transactional', description: 'Medical service fees' },
      { name: 'Insurance Claims', type: 'secondary', model: 'transactional', description: 'Insurance reimbursements' },
      { name: 'Membership Plans', type: 'tertiary', model: 'subscription', description: 'Healthcare membership plans' },
    ],
    conversionPaths: [
      { name: 'Find to Book', stages: ['search', 'research', 'book', 'return'], touchpoints: ['website', 'phone', 'referral'] },
      { name: 'Patient Retention', stages: ['treat', 'follow_up', 'rebook', 'refer'], touchpoints: ['email', 'sms', 'phone'] },
    ],
    arpuRange: '$100-500/visit',
    ltvRange: '$500-5,000',
  },
  {
    capability: 'fitness',
    primaryModel: 'subscription',
    streams: [
      { name: 'Gym Memberships', type: 'primary', model: 'subscription', description: 'Monthly gym memberships' },
      { name: 'Class Packages', type: 'secondary', model: 'transactional', description: 'Multi-class packages' },
      { name: 'Personal Training', type: 'secondary', model: 'transactional', description: 'One-on-one training' },
      { name: 'Merchandise', type: 'tertiary', model: 'transactional', description: 'Branded gear and supplements' },
    ],
    conversionPaths: [
      { name: 'Trial to Member', stages: ['trial', 'join', 'engage', 'retain'], touchpoints: ['website', 'in-person', 'app'] },
      { name: 'Class Booking', stages: ['browse', 'book', 'attend', 'rebook'], touchpoints: ['app', 'website', 'sms'] },
    ],
    arpuRange: '$30-200/month',
    ltvRange: '$360-2,400',
  },
  {
    capability: 'beauty',
    primaryModel: 'transactional',
    streams: [
      { name: 'Service Fees', type: 'primary', model: 'transactional', description: 'Beauty service fees' },
      { name: 'Product Sales', type: 'secondary', model: 'transactional', description: 'Retail product sales' },
      { name: 'Memberships', type: 'tertiary', model: 'subscription', description: 'VIP membership programs' },
    ],
    conversionPaths: [
      { name: 'Book to Return', stages: ['book', 'visit', 'rebook', 'refer'], touchpoints: ['app', 'email', 'sms'] },
      { name: 'Product Upsell', stages: ['service', 'recommend', 'purchase', 'return'], touchpoints: ['in-person', 'email'] },
    ],
    arpuRange: '$50-200/visit',
    ltvRange: '$500-3,000',
  },
];

// ─── Revenue Engine ──────────────────────────────────────────────

export class RevenueEngine {
  /**
   * Detect revenue model from capabilities.
   */
  detectRevenueModel(capabilities: string[]): RevenueModel {
    const matchedPatterns = REVENUE_PATTERNS.filter(p =>
      capabilities.includes(p.capability)
    );

    if (matchedPatterns.length === 0) {
      return this.getDefaultRevenueModel();
    }

    // Merge streams from all matched patterns
    const allStreams: RevenueStream[] = [];
    const allPaths: ConversionPath[] = [];
    const allOpportunities: string[] = [];

    for (const pattern of matchedPatterns) {
      for (const stream of pattern.streams) {
        allStreams.push({
          id: `${pattern.capability}_${stream.name.toLowerCase().replace(/\s+/g, '_')}`,
          ...stream,
          estimatedContribution: this.estimateContribution(stream.type),
          conversionPath: [],
          dependencies: [],
        });
      }

      for (const path of pattern.conversionPaths) {
        allPaths.push({
          id: `${pattern.capability}_${path.name.toLowerCase().replace(/\s+/g, '_')}`,
          ...path,
          estimatedRate: this.estimateConversionRate(path.stages.length),
        });
      }

      allOpportunities.push(...this.identifyOpportunities(pattern));
    }

    // Deduplicate streams
    const uniqueStreams = this.deduplicateStreams(allStreams);
    const firstPattern = matchedPatterns[0];

    return {
      streams: uniqueStreams,
      conversionPaths: allPaths,
      primaryModel: firstPattern?.primaryModel ?? 'custom',
      averageRevenuePerUser: firstPattern?.arpuRange ?? '$0',
      lifetimeValueEstimate: firstPattern?.ltvRange ?? '$0',
      monetizationOpportunities: [...new Set(allOpportunities)],
    };
  }

  private getDefaultRevenueModel(): RevenueModel {
    return {
      streams: [
        { id: 'default_service', name: 'Service Fees', type: 'primary', model: 'transactional', description: 'Core service revenue', estimatedContribution: '80-100%', conversionPath: [], dependencies: [] },
      ],
      conversionPaths: [
        { id: 'default_path', name: 'Basic Conversion', stages: ['awareness', 'consideration', 'purchase'], touchpoints: ['website'], estimatedRate: '2-5%' },
      ],
      primaryModel: 'transactional',
      averageRevenuePerUser: '$50-500',
      lifetimeValueEstimate: '$200-2,000',
      monetizationOpportunities: ['Add subscription tier', 'Implement referral program', 'Create premium tier'],
    };
  }

  private estimateContribution(type: string): string {
    switch (type) {
      case 'primary': return '60-80%';
      case 'secondary': return '15-30%';
      case 'tertiary': return '5-15%';
      default: return '10-20%';
    }
  }

  private estimateConversionRate(stages: number): string {
    // Rough estimate: each stage loses ~50% of potential
    const rate = Math.pow(0.5, stages - 1) * 100;
    return `${Math.round(rate)}%`;
  }

  private identifyOpportunities(pattern: RevenuePattern): string[] {
    const opportunities: string[] = [];

    if (pattern.primaryModel === 'transactional') {
      opportunities.push('Add subscription tier for recurring revenue');
      opportunities.push('Implement tiered pricing for different customer segments');
    }

    if (pattern.primaryModel === 'subscription') {
      opportunities.push('Add usage-based pricing for power users');
      opportunities.push('Create enterprise tier with custom pricing');
    }

    if (pattern.capability === 'ecommerce' || pattern.capability === 'marketplace') {
      opportunities.push('Implement affiliate program');
      opportunities.push('Add sponsored listings');
    }

    if (pattern.capability === 'services' || pattern.capability === 'education') {
      opportunities.push('Create self-service digital products');
      opportunities.push('Add certification programs');
    }

    return opportunities;
  }

  private deduplicateStreams(streams: RevenueStream[]): RevenueStream[] {
    const seen = new Set<string>();
    return streams.filter(s => {
      const key = s.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
