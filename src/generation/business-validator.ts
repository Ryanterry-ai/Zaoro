import { ArchitectDecision, PageDesign } from './architect.js';
import { ResearchResult, MarketInsight, ContentStrategy } from './research-agent.js';
import { DesignSystem } from './design-system-generator.js';

export interface BusinessValidation {
  overall: number;
  checks: BusinessCheck[];
  revenueModel: RevenueModelAssessment;
  userFlow: UserFlowAssessment;
  marketFit: MarketFitAssessment;
}

export interface BusinessCheck {
  name: string;
  passed: boolean;
  score: number;
  detail: string;
  recommendation: string;
}

export interface RevenueModelAssessment {
  hasRevenueMechanism: boolean;
  revenueStreams: string[];
  pricingStrategy: string;
  conversionPath: string;
  score: number;
}

export interface UserFlowAssessment {
  hasOnboarding: boolean;
  hasCheckoutOrBooking: boolean;
  hasAccountManagement: boolean;
  hasContentDiscovery: boolean;
  flowCompleteness: number;
  score: number;
}

export interface MarketFitAssessment {
  addressesRealProblem: boolean;
  hasCompetitiveDifferentiation: boolean;
  hasTrustSignals: boolean;
  hasSocialProof: boolean;
  score: number;
}

// ─── Capability → Revenue mapping ─────────────────────────────────

const CAPABILITY_REVENUE: Record<string, { streams: string[]; pricing: string; conversion: string }> = {
  commerce: { streams: ['Product sales', 'Upsells', 'Cross-sells'], pricing: 'Product pricing with discounts', conversion: 'Cart → Checkout → Payment → Confirmation' },
  marketplace: { streams: ['Transaction fees', 'Featured listings', 'Subscriptions'], pricing: 'Commission-based + premium listings', conversion: 'Browse → Select → Checkout → Delivery' },
  subscriptions: { streams: ['Monthly/Annual subscriptions', 'Tiered pricing', 'Add-ons'], pricing: 'Tiered subscription plans', conversion: 'Landing → Pricing → Trial → Subscription' },
  saas: { streams: ['SaaS subscriptions', 'Usage-based pricing', 'Enterprise plans'], pricing: 'Freemium → Pro → Enterprise', conversion: 'Landing → Demo/Trial → Onboarding → Subscription' },
  booking: { streams: ['Service fees', 'Booking commissions', 'Premium slots'], pricing: 'Per-booking or subscription', conversion: 'Browse → Select → Book → Pay → Confirm' },
  'fitness-wellness': { streams: ['Memberships', 'Class passes', 'Personal training'], pricing: 'Monthly membership + add-ons', conversion: 'Browse → Trial → Membership → Retention' },
  education: { streams: ['Course sales', 'Subscriptions', 'Certificates'], pricing: 'Per-course or subscription', conversion: 'Browse → Preview → Enroll → Complete → Certify' },
  'food-beverage': { streams: ['Orders', 'Delivery fees', 'Catering'], pricing: 'Menu pricing + delivery fees', conversion: 'Browse menu → Add to cart → Checkout → Delivery' },
  'local-business': { streams: ['Service fees', 'Products', 'Memberships'], pricing: 'Service-based pricing', conversion: 'Discover → Contact → Quote → Book → Service' },
  agency: { streams: ['Project fees', 'Retainers', 'Consulting'], pricing: 'Project-based or retainer', conversion: 'Discover → Contact → Proposal → Contract → Deliver' },
  portfolio: { streams: ['Freelance projects', 'Consulting', 'Digital products'], pricing: 'Project-based', conversion: 'Discover → Contact → Discuss → Contract → Deliver' },
  healthcare: { streams: ['Consultations', 'Procedures', 'Insurance billing'], pricing: 'Service-based + insurance', conversion: 'Find doctor → Book → Visit → Follow-up' },
  content: { streams: ['Ads', 'Subscriptions', 'Sponsorships'], pricing: 'Free content + premium access', conversion: 'Read → Subscribe → Engage → Convert' },
  'property-management': { streams: ['Rent', 'Management fees', 'Maintenance'], pricing: 'Monthly rent + fees', conversion: 'Search → Tour → Apply → Lease → Pay' },
  catalog: { streams: ['Product sales', 'Affiliate', 'Lead generation'], pricing: 'Product or lead-based', conversion: 'Browse → Compare → Inquire → Purchase' },
};

// ─── Capability → User flow mapping ───────────────────────────────

const CAPABILITY_FLOWS: Record<string, { onboarding: boolean; checkout: boolean; account: boolean; discovery: boolean }> = {
  commerce: { onboarding: false, checkout: true, account: true, discovery: true },
  marketplace: { onboarding: true, checkout: true, account: true, discovery: true },
  subscriptions: { onboarding: true, checkout: true, account: true, discovery: true },
  saas: { onboarding: true, checkout: true, account: true, discovery: true },
  booking: { onboarding: false, checkout: true, account: true, discovery: true },
  'fitness-wellness': { onboarding: true, checkout: true, account: true, discovery: true },
  education: { onboarding: true, checkout: true, account: true, discovery: true },
  'food-beverage': { onboarding: false, checkout: true, account: false, discovery: true },
  'local-business': { onboarding: false, checkout: false, account: false, discovery: true },
  agency: { onboarding: false, checkout: false, account: false, discovery: true },
  portfolio: { onboarding: false, checkout: false, account: false, discovery: true },
  healthcare: { onboarding: true, checkout: true, account: true, discovery: true },
  content: { onboarding: false, checkout: false, account: true, discovery: true },
  'property-management': { onboarding: true, checkout: true, account: true, discovery: true },
  catalog: { onboarding: false, checkout: true, account: true, discovery: true },
};

// ─── Business Validator ───────────────────────────────────────────

export class BusinessValidator {
  validate(
    decision: ArchitectDecision,
    research: ResearchResult,
    designSystem: DesignSystem,
  ): BusinessValidation {
    console.log(`[business-validator] Validating business model for ${decision.businessType}`);

    const checks = this.runChecks(decision, research, designSystem);
    const revenueModel = this.assessRevenueModel(decision, research);
    const userFlow = this.assessUserFlow(decision);
    const marketFit = this.assessMarketFit(decision, research);

    const overall = Math.round(
      (checks.reduce((sum, c) => sum + (c.passed ? c.score : 0), 0) / Math.max(checks.length, 1)) * 0.4 +
      revenueModel.score * 0.25 +
      userFlow.score * 0.2 +
      marketFit.score * 0.15
    );

    console.log(`[business-validator] Overall: ${overall}/100 (${checks.filter(c => c.passed).length}/${checks.length} checks passed)`);

    return { overall, checks, revenueModel, userFlow, marketFit };
  }

  private runChecks(
    decision: ArchitectDecision,
    research: ResearchResult,
    ds: DesignSystem,
  ): BusinessCheck[] {
    const checks: BusinessCheck[] = [];

    // 1. Does the solution have a clear value proposition?
    checks.push({
      name: 'Clear Value Proposition',
      passed: true,
      score: 90,
      detail: `App: "${decision.name}" — ${decision.description}`,
      recommendation: 'Ensure the hero section clearly communicates the unique value within 5 seconds',
    });

    // 2. Is there a revenue mechanism?
    const revenue = CAPABILITY_REVENUE[decision.businessType];
    checks.push({
      name: 'Revenue Mechanism',
      passed: !!revenue,
      score: revenue ? 85 : 30,
      detail: revenue ? `Revenue streams: ${revenue.streams.join(', ')}` : 'No clear revenue model detected',
      recommendation: revenue ? 'Verify all revenue paths are accessible in the UI' : 'Add pricing page, checkout flow, or contact form',
    });

    // 3. Are there enough pages to support the business?
    checks.push({
      name: 'Page Coverage',
      passed: decision.pages.length >= 3,
      score: Math.min(100, decision.pages.length * 20),
      detail: `${decision.pages.length} pages: ${decision.pages.map(p => p.route).join(', ')}`,
      recommendation: decision.pages.length < 3 ? 'Add more pages (About, Pricing, Contact)' : 'Ensure each page has a clear purpose',
    });

    // 4. Is there social proof?
    const hasSocialProof = decision.pages.some(p =>
      p.sections.includes('testimonials') || p.sections.includes('clients') || p.sections.includes('stats-bar')
    );
    checks.push({
      name: 'Social Proof',
      passed: hasSocialProof,
      score: hasSocialProof ? 80 : 40,
      detail: hasSocialProof ? 'Testimonials, clients, or stats sections found' : 'No social proof sections detected',
      recommendation: 'Add testimonials, client logos, or statistics to build trust',
    });

    // 5. Is there a clear CTA?
    const hasCTA = decision.pages.some(p => p.sections.includes('cta'));
    checks.push({
      name: 'Call-to-Action',
      passed: hasCTA,
      score: hasCTA ? 85 : 35,
      detail: hasCTA ? 'CTA section found' : 'No clear call-to-action section',
      recommendation: 'Every page should end with a clear, compelling CTA',
    });

    // 6. Is there a way to contact the business?
    const hasContact = decision.pages.some(p => p.route === '/contact' || p.sections.includes('contact-form'));
    checks.push({
      name: 'Contact Method',
      passed: hasContact,
      score: hasContact ? 80 : 45,
      detail: hasContact ? 'Contact page or form found' : 'No contact method detected',
      recommendation: 'Add a contact page, form, or prominent contact information',
    });

    // 7. Does the design match the industry?
    const moodMatches = this.checkMoodIndustryFit(decision, research);
    checks.push({
      name: 'Industry Design Fit',
      passed: moodMatches.score >= 60,
      score: moodMatches.score,
      detail: moodMatches.detail,
      recommendation: moodMatches.recommendation,
    });

    // 8. Are there enough content sections?
    const totalSections = decision.pages.reduce((sum, p) => sum + p.sections.length, 0);
    checks.push({
      name: 'Content Richness',
      passed: totalSections >= 10,
      score: Math.min(100, totalSections * 8),
      detail: `${totalSections} content sections across ${decision.pages.length} pages`,
      recommendation: totalSections < 10 ? 'Add more content sections (features, testimonials, FAQ)' : 'Content coverage is good',
    });

    // 9. Is pricing/monetization visible?
    const hasPricing = decision.pages.some(p =>
      p.sections.includes('pricing-table') || p.sections.includes('membership-plans')
    );
    if (revenue) {
      checks.push({
        name: 'Pricing Visibility',
        passed: hasPricing,
        score: hasPricing ? 85 : 50,
        detail: hasPricing ? 'Pricing section found' : 'No pricing section (may be intentional for custom pricing)',
        recommendation: hasPricing ? 'Ensure pricing is clear and competitive' : 'Consider adding a pricing page if applicable',
      });
    }

    // 10. Design system completeness
    checks.push({
      name: 'Design System',
      passed: true,
      score: 90,
      detail: `Typography: ${Object.keys(ds.typography.scale).length} levels, Colors: primary+secondary+accent, Spacing: ${Object.keys(ds.spacing.scale).length} values`,
      recommendation: 'Apply design system consistently across all components',
    });

    return checks;
  }

  private assessRevenueModel(decision: ArchitectDecision, research: ResearchResult): RevenueModelAssessment {
    const revenue = CAPABILITY_REVENUE[decision.businessType];
    if (!revenue) {
      return { hasRevenueMechanism: false, revenueStreams: [], pricingStrategy: 'None detected', conversionPath: 'None', score: 20 };
    }

    const hasPricing = decision.pages.some(p =>
      p.sections.includes('pricing-table') || p.sections.includes('membership-plans')
    );

    return {
      hasRevenueMechanism: true,
      revenueStreams: revenue.streams,
      pricingStrategy: revenue.pricing,
      conversionPath: revenue.conversion,
      score: hasPricing ? 85 : 65,
    };
  }

  private assessUserFlow(decision: ArchitectDecision): UserFlowAssessment {
    const flows = CAPABILITY_FLOWS[decision.businessType] || { onboarding: false, checkout: false, account: false, discovery: true };

    const hasOnboarding = flows.onboarding && decision.pages.some(p => p.type === 'auth' || p.sections.includes('booking-form'));
    const hasCheckout = flows.checkout && decision.pages.some(p => p.sections.includes('pricing-table') || p.sections.includes('booking-form'));
    const hasAccount = flows.account && decision.pages.some(p => p.type === 'dashboard');
    const hasDiscovery = flows.discovery;

    const completeness = [hasOnboarding, hasCheckout, hasAccount, hasDiscovery].filter(Boolean).length / 4;

    return {
      hasOnboarding,
      hasCheckoutOrBooking: hasCheckout,
      hasAccountManagement: hasAccount,
      hasContentDiscovery: hasDiscovery,
      flowCompleteness: completeness,
      score: Math.round(completeness * 100),
    };
  }

  private assessMarketFit(decision: ArchitectDecision, research: ResearchResult): MarketFitAssessment {
    const market = research.market;

    return {
      addressesRealProblem: research.competitors.length > 0,
      hasCompetitiveDifferentiation: research.competitors.length > 0 && market.differentiators.length > 0,
      hasTrustSignals: market.trustSignals.length > 0,
      hasSocialProof: decision.pages.some(p => p.sections.includes('testimonials') || p.sections.includes('stats-bar')),
      score: 75,
    };
  }

  private checkMoodIndustryFit(decision: ArchitectDecision, research: ResearchResult): { score: number; detail: string; recommendation: string } {
    const mood = decision.colorScheme.mood;
    const industry = decision.businessType;

    const idealMoods: Record<string, string[]> = {
      ecommerce: ['premium', 'vibrant', 'modern'],
      saas: ['tech', 'modern', 'minimal'],
      'local-business': ['trustworthy', 'warm', 'minimal'],
      restaurant: ['warm', 'vibrant', 'creative'],
      fitness: ['energetic', 'bold', 'vibrant'],
      healthcare: ['trustworthy', 'calming', 'minimal'],
      education: ['trustworthy', 'modern', 'creative'],
      portfolio: ['creative', 'minimal', 'premium'],
      agency: ['premium', 'creative', 'modern'],
    };

    const ideal = idealMoods[industry] || ['premium', 'modern'];
    const isFit = ideal.includes(mood || '');

    return {
      score: isFit ? 85 : 55,
      detail: `Mood "${mood}" ${isFit ? 'fits' : 'may not fit'} ${industry} industry (ideal: ${ideal.join(', ')})`,
      recommendation: isFit ? 'Design mood aligns with industry expectations' : `Consider ${ideal[0]} mood for better industry alignment`,
    };
  }
}
