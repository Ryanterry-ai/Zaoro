import { ArchitectDecision } from './architect.js';
import { DomainContext } from './domain-detector.js';

export interface CompetitorData {
  name: string;
  url: string;
  tagline: string;
  features: string[];
  pricing: PricingTier[];
  testimonials: Testimonial[];
  ctas: string[];
  colorScheme: string[];
  techStack: string[];
}

export interface PricingTier {
  name: string;
  price: string;
  interval: string;
  features: string[];
  highlighted: boolean;
}

export interface Testimonial {
  text: string;
  name: string;
  role: string;
  rating: number;
}

export interface MarketInsight {
  industryTrends: string[];
  customerExpectations: string[];
  conversionPatterns: string[];
  trustSignals: string[];
  differentiators: string[];
}

export interface ResearchResult {
  competitors: CompetitorData[];
  market: MarketInsight;
  recommendedSections: string[];
  recommendedFeatures: string[];
  recommendedPricing: PricingTier[];
  contentStrategy: ContentStrategy;
}

export interface ContentStrategy {
  toneOfVoice: string;
  keyMessages: string[];
  callToActions: string[];
  socialProof: string;
  urgencyTriggers: string[];
}

// ─── Industry-specific competitor data ────────────────────────────

const INDUSTRY_COMPETITORS: Record<string, CompetitorData[]> = {
  ecommerce: [
    { name: 'Shopify Stores', url: '', tagline: 'Sell online', features: ['Product catalog', 'Cart', 'Checkout', 'Inventory'], pricing: [{ name: 'Basic', price: '$29', interval: '/mo', features: ['Unlimited products', '24/7 support'], highlighted: false }, { name: 'Shopify', price: '$79', interval: '/mo', features: ['Advanced reports', 'Gift cards'], highlighted: true }], testimonials: [], ctas: ['Start free trial', 'Get started', 'See pricing'], colorScheme: ['#96bf48', '#5c6ac4'], techStack: ['React', 'Node.js'] },
  ],
  saas: [
    { name: 'SaaS Leaders', url: '', tagline: 'Ship faster', features: ['Dashboard', 'Analytics', 'Integrations', 'API'], pricing: [{ name: 'Starter', price: '$0', interval: '/mo', features: ['100 contacts', 'Basic features'], highlighted: false }, { name: 'Pro', price: '$49', interval: '/mo', features: ['Unlimited contacts', 'Priority support'], highlighted: true }, { name: 'Enterprise', price: 'Custom', interval: '', features: ['SSO', 'Dedicated support'], highlighted: false }], testimonials: [], ctas: ['Start for free', 'Book a demo', 'See plans'], colorScheme: ['#6366f1', '#8b5cf6'], techStack: ['Next.js', 'TypeScript'] },
  ],
  'local-business': [
    { name: 'Local Leaders', url: '', tagline: 'Your neighborhood experts', features: ['Services', 'Booking', 'Reviews', 'Contact'], pricing: [], testimonials: [{ text: 'Best service in town!', name: 'Sarah M.', role: 'Local Customer', rating: 5 }], ctas: ['Book now', 'Call us', 'Get a quote'], colorScheme: ['#059669', '#0d9488'], techStack: ['WordPress', 'PHP'] },
  ],
  restaurant: [
    { name: 'Restaurant Leaders', url: '', tagline: 'Fresh & fast', features: ['Menu', 'Order online', 'Reservations', 'Delivery'], pricing: [], testimonials: [], ctas: ['Order now', 'View menu', 'Reserve a table'], colorScheme: ['#dc2626', '#ea580c'], techStack: ['Custom', 'Node.js'] },
  ],
  fitness: [
    { name: 'Gym Leaders', url: '', tagline: 'Transform your body', features: ['Classes', 'Trainers', 'Membership', 'Schedule'], pricing: [{ name: 'Basic', price: '$29', interval: '/mo', features: ['Gym access', '2 classes'], highlighted: false }, { name: 'Premium', price: '$59', interval: '/mo', features: ['Unlimited classes', 'Personal trainer'], highlighted: true }], testimonials: [], ctas: ['Join now', 'Start free trial', 'See classes'], colorScheme: ['#dc2626', '#f97316'], techStack: ['React', 'Firebase'] },
  ],
  healthcare: [
    { name: 'Clinic Leaders', url: '', tagline: 'Care you can trust', features: ['Doctors', 'Appointments', 'Services', 'Insurance'], pricing: [], testimonials: [], ctas: ['Book appointment', 'Find a doctor', 'Patient portal'], colorScheme: ['#059669', '#0891b2'], techStack: ['EHR Integration', 'HIPAA'] },
  ],
  education: [
    { name: 'EdTech Leaders', url: '', tagline: 'Learn without limits', features: ['Courses', 'Instructors', 'Certification', 'Progress tracking'], pricing: [{ name: 'Free', price: '$0', interval: '', features: ['5 courses', 'Basic quizzes'], highlighted: false }, { name: 'Pro', price: '$19', interval: '/mo', features: ['Unlimited courses', 'Certificates'], highlighted: true }], testimonials: [], ctas: ['Start learning', 'Browse courses', 'Join for free'], colorScheme: ['#2563eb', '#4f46e5'], techStack: ['Next.js', 'PostgreSQL'] },
  ],
};

// ─── Industry market insights ─────────────────────────────────────

const MARKET_INSIGHTS: Record<string, MarketInsight> = {
  ecommerce: {
    industryTrends: ['Social commerce', 'Subscription boxes', 'AR try-on', 'Same-day delivery', 'Sustainability focus'],
    customerExpectations: ['Free shipping', 'Easy returns', 'Product reviews', 'Quick checkout', 'Mobile-first'],
    conversionPatterns: ['Urgency timers', 'Social proof', 'Free shipping thresholds', 'Abandoned cart recovery', 'One-click checkout'],
    trustSignals: ['Secure payment badges', 'Money-back guarantee', 'Customer reviews', 'Trust seals', 'Clear return policy'],
    differentiators: ['Unique products', 'Brand story', 'Customer service', 'Loyalty program', 'Sustainability'],
  },
  saas: {
    industryTrends: ['AI-powered features', 'Usage-based pricing', 'API-first', 'Vertical SaaS', 'PLG (product-led growth)'],
    customerExpectations: ['Free trial', 'Easy onboarding', 'Integrations', 'API documentation', 'Uptime SLA'],
    conversionPatterns: ['Free tier', 'Interactive demo', 'Case studies', 'ROI calculator', 'Migration support'],
    trustSignals: ['SOC2 compliance', 'Uptime guarantees', 'Customer logos', 'Security page', 'GDPR compliance'],
    differentiators: ['Developer experience', 'Pricing transparency', 'Feature depth', 'Integration ecosystem', 'Support quality'],
  },
  'local-business': {
    industryTrends: ['Online booking', 'Google Business Profile', 'Local SEO', 'Review management', 'SMS reminders'],
    customerExpectations: ['Easy contact', 'Clear pricing', 'Online booking', 'Reviews', 'Location info'],
    conversionPatterns: ['Click-to-call', 'Map integration', 'Service menu', 'First-time discount', 'Loyalty rewards'],
    trustSignals: ['Google reviews', 'Years in business', 'Certifications', 'Before/after photos', 'Community involvement'],
    differentiators: ['Personal service', 'Local knowledge', 'Convenience', 'Quality guarantee', 'Relationship'],
  },
  restaurant: {
    industryTrends: ['Online ordering', 'Ghost kitchens', 'QR code menus', 'Delivery partnerships', 'Sustainability'],
    customerExpectations: ['Menu online', 'Online ordering', 'Reservations', 'Nutrition info', 'Allergen info'],
    conversionPatterns: ['First-order discount', 'Free delivery', 'Loyalty program', 'Combo deals', 'Limited-time offers'],
    trustSignals: ['Food photos', 'Hygiene ratings', 'Reviews', 'Ingredient sourcing', 'Chef credentials'],
    differentiators: ['Unique cuisine', 'Chef story', 'Local sourcing', 'Ambiance', 'Speed'],
  },
  fitness: {
    industryTrends: ['Hybrid memberships', 'On-demand classes', 'Wearable integration', 'Community features', 'Personalization'],
    customerExpectations: ['Class schedule', 'Trainer profiles', 'Trial period', 'Equipment list', 'Reviews'],
    conversionPatterns: ['Free trial', 'Day pass', 'Bring a friend', 'Transformation photos', 'Limited spots'],
    trustSignals: ['Trainer certifications', 'Before/after', 'Member testimonials', 'Facility photos', 'Safety protocols'],
    differentiators: ['Community', 'Results', 'Trainer quality', 'Equipment', 'Convenience'],
  },
  healthcare: {
    industryTrends: ['Telehealth', 'Patient portals', 'AI diagnostics', 'Preventive care', 'Value-based care'],
    customerExpectations: ['Online booking', 'Insurance info', 'Doctor profiles', 'Wait times', 'Reviews'],
    conversionPatterns: ['Online scheduling', 'Insurance verification', 'New patient specials', 'Referral programs', 'Health assessments'],
    trustSignals: ['Board certifications', 'Hospital affiliations', 'Patient reviews', 'Accreditations', 'Years of experience'],
    differentiators: ['Specialization', 'Patient experience', 'Technology', 'Outcomes', 'Convenience'],
  },
  education: {
    industryTrends: ['Micro-credentials', 'AI tutoring', 'Project-based learning', 'Industry partnerships', 'Mobile learning'],
    customerExpectations: ['Course preview', 'Instructor reviews', 'Certificate value', 'Job placement', 'Flexibility'],
    conversionPatterns: ['Free course', 'Money-back guarantee', 'Limited enrollment', 'Scholarship', 'Employer sponsorship'],
    trustSignals: ['Accreditation', 'Alumni success', 'Employer partnerships', 'Completion rates', 'Reviews'],
    differentiators: ['Curriculum quality', 'Instructor expertise', 'Career outcomes', 'Community', 'Price'],
  },
};

// ─── Content strategy by mood ─────────────────────────────────────

const MOOD_CONTENT_STRATEGY: Record<string, ContentStrategy> = {
  premium: { toneOfVoice: 'Confident, refined, aspirational', keyMessages: ['Excellence without compromise', 'Trusted by industry leaders', 'Crafted for those who demand more'], callToActions: ['Get Started', 'See It in Action', 'Join the Elite'], socialProof: 'Trusted by 10,000+ companies worldwide', urgencyTriggers: ['Limited availability', 'Exclusive access', 'By invitation only'] },
  vibrant: { toneOfVoice: 'Energetic, bold, playful', keyMessages: ['Make an impact', 'Stand out from the crowd', 'Express yourself'], callToActions: ['Start Creating', 'Join the Movement', 'Make It Happen'], socialProof: 'Loved by creators everywhere', urgencyTriggers: ['Trending now', 'Limited edition', 'Don\'t miss out'] },
  tech: { toneOfVoice: 'Clear, precise, forward-thinking', keyMessages: ['Built for developers', 'Ship faster', 'The modern stack'], callToActions: ['Start Building', 'Read the Docs', 'View on GitHub'], socialProof: 'Used by engineering teams at top companies', urgencyTriggers: ['Early access', 'Beta program', 'Open source'] },
  minimal: { toneOfVoice: 'Calm, clean, purposeful', keyMessages: ['Less is more', 'Focus on what matters', 'Simple by design'], callToActions: ['Get Started', 'Learn More', 'Try It Free'], socialProof: 'Chosen by teams who value simplicity', urgencyTriggers: ['Limited time', 'Special offer', 'New arrival'] },
  energetic: { toneOfVoice: 'Motivating, dynamic, empowering', keyMessages: ['Push your limits', 'Transform your life', 'No excuses'], callToActions: ['Start Now', 'Join the Challenge', 'Get Moving'], socialProof: '50,000+ members transformed', urgencyTriggers: ['Spots filling fast', 'Challenge starts Monday', 'Free trial ending'] },
  creative: { toneOfVoice: 'Inspiring, imaginative, artistic', keyMessages: ['Bring ideas to life', 'Design without limits', 'Create your vision'], callToActions: ['Start Creating', 'Explore Templates', 'See Examples'], socialProof: 'Trusted by creative professionals', urgencyTriggers: ['New features', 'Creative contest', 'Limited templates'] },
  trustworthy: { toneOfVoice: 'Reliable, professional, caring', keyMessages: ['Your trusted partner', 'Quality you can count on', 'Here for the long term'], callToActions: ['Get a Quote', 'Schedule a Visit', 'Contact Us'], socialProof: 'Serving the community for 15+ years', urgencyTriggers: ['Schedule today', 'Limited appointments', 'New patient special'] },
  warm: { toneOfVoice: 'Friendly, approachable, genuine', keyMessages: ['Welcome to the family', 'Made with love', 'Feel at home'], callToActions: ['Order Now', 'View Our Menu', 'Reserve a Table'], socialProof: 'Rated #1 by our community', urgencyTriggers: ['Today\'s special', 'Happy hour', 'Seasonal menu'] },
  authoritative: { toneOfVoice: 'Expert, decisive, trustworthy', keyMessages: ['Industry authority', 'Proven results', 'Expert guidance'], callToActions: ['Schedule Consultation', 'View Case Studies', 'Contact Our Team'], socialProof: '20+ years of industry expertise', urgencyTriggers: ['Free consultation', 'Limited slots', 'Act now'] },
  editorial: { toneOfVoice: 'Thoughtful, narrative, intellectual', keyMessages: ['Stories that matter', 'Deep dives', 'Perspective shifts'], callToActions: ['Read More', 'Subscribe', 'Explore Topics'], socialProof: 'Read by 100,000+ thinkers', urgencyTriggers: ['New series', 'Subscriber exclusive', 'Limited edition'] },
};

// ─── Recommended sections by capability ───────────────────────────

const CAPABILITY_SECTION_RECOMMENDATIONS: Record<string, string[]> = {
  commerce: ['hero', 'featured-products', 'categories', 'testimonials', 'newsletter-cta', 'cta'],
  marketplace: ['hero', 'featured-products', 'categories', 'testimonials', 'newsletter-cta', 'cta'],
  booking: ['hero', 'services-grid', 'testimonials', 'booking-form', 'cta'],
  'healthcare-clinic': ['hero', 'services-grid', 'team', 'testimonials', 'booking-form', 'cta'],
  'fitness-wellness': ['hero', 'class-schedule', 'trainers', 'membership-plans', 'testimonials', 'cta'],
  education: ['hero', 'course-featured', 'stats', 'testimonials', 'cta'],
  content: ['hero', 'post-grid', 'newsletter-cta', 'testimonials', 'cta'],
  crm: ['hero', 'features-grid', 'stats', 'testimonials', 'cta'],
  analytics: ['hero', 'features-grid', 'stats', 'testimonials', 'cta'],
  'project-management': ['hero', 'features-grid', 'stats', 'testimonials', 'cta'],
  'property-management': ['hero', 'featured-properties', 'testimonials', 'cta'],
  'case-management': ['hero', 'features-grid', 'testimonials', 'cta'],
  'membership-platform': ['hero', 'features-grid', 'testimonials', 'cta'],
  'food-beverage': ['hero', 'featured-products', 'categories', 'testimonials', 'cta'],
  catalog: ['hero', 'featured-products', 'categories', 'testimonials', 'cta'],
  portfolio: ['hero', 'featured-projects', 'services', 'skills', 'cta'],
  agency: ['hero', 'services', 'case-studies', 'team', 'clients', 'cta'],
  subscriptions: ['hero', 'features-grid', 'pricing-table', 'testimonials', 'faq', 'cta'],
};

// ─── Research Agent ───────────────────────────────────────────────

export class ResearchAgent {
  research(prompt: string, decision: ArchitectDecision, domain?: DomainContext): ResearchResult {
    const industry = domain?.industry || decision.businessType || 'saas';
    const mood = decision.colorScheme.mood || 'premium';

    console.log(`[research] Analyzing ${industry} industry (${mood} mood)`);

    const competitors = this.getCompetitors(industry);
    const market = this.getMarketInsights(industry);
    const recommendedSections = this.getRecommendedSections(decision.capabilities);
    const recommendedFeatures = this.extractRecommendedFeatures(decision.capabilities);
    const recommendedPricing = this.generatePricingRecommendations(decision.capabilities, industry);
    const contentStrategy = this.getContentStrategy(mood, industry);

    console.log(`[research] ${competitors.length} competitors, ${market.industryTrends.length} trends, ${recommendedSections.length} sections`);

    return {
      competitors,
      market,
      recommendedSections,
      recommendedFeatures,
      recommendedPricing,
      contentStrategy,
    };
  }

  private getCompetitors(industry: string): CompetitorData[] {
    return INDUSTRY_COMPETITORS[industry] || INDUSTRY_COMPETITORS.saas || [];
  }

  private getMarketInsights(industry: string): MarketInsight {
    return MARKET_INSIGHTS[industry] || MARKET_INSIGHTS.saas || {
      industryTrends: [],
      customerExpectations: [],
      conversionPatterns: [],
      trustSignals: [],
      differentiators: [],
    };
  }

  private getRecommendedSections(capabilities: string[]): string[] {
    const sections = new Set<string>();
    for (const cap of capabilities) {
      const recs = CAPABILITY_SECTION_RECOMMENDATIONS[cap] || [];
      for (const s of recs) sections.add(s);
    }
    return [...sections];
  }

  private extractRecommendedFeatures(capabilities: string[]): string[] {
    const features: string[] = [];
    const featureMap: Record<string, string[]> = {
      commerce: ['Product catalog', 'Shopping cart', 'Checkout flow', 'Order tracking', 'Wishlist', 'Product reviews'],
      booking: ['Calendar integration', 'Time slot selection', 'Automated reminders', 'Cancellation policy', 'Waitlist'],
      'healthcare-clinic': ['Patient portal', 'Insurance verification', 'Telehealth', 'Prescription refill', 'Lab results'],
      'fitness-wellness': ['Class booking', 'Workout tracking', 'Progress photos', 'Nutrition plans', 'Community challenges'],
      education: ['Course progress', 'Quizzes', 'Certificates', 'Discussion forums', 'Mentorship'],
      crm: ['Contact management', 'Deal pipeline', 'Activity logging', 'Email integration', 'Reporting'],
      analytics: ['Real-time dashboard', 'Custom reports', 'Export data', 'Team activity', 'Goal tracking'],
      content: ['Blog editor', 'Categories', 'Newsletter signup', 'Social sharing', 'Comments'],
      'project-management': ['Task boards', 'Time tracking', 'File sharing', 'Team chat', 'Gantt charts'],
      'property-management': ['Listings', 'Virtual tours', 'Tenant portal', 'Maintenance requests', 'Lease management'],
      subscriptions: ['Plan management', 'Usage tracking', 'Billing portal', 'Upgrade flow', 'Cancellation flow'],
      marketplace: ['Seller profiles', 'Product listings', 'Reviews', 'Messaging', 'Escrow'],
      agency: ['Portfolio showcase', 'Case studies', 'Team bios', 'Client logos', 'Contact form'],
      portfolio: ['Project gallery', 'Case studies', 'Skills', 'Resume', 'Contact'],
      'food-beverage': ['Online ordering', 'Menu management', 'Delivery tracking', 'Reservations', 'Loyalty program'],
    };
    for (const cap of capabilities) {
      const caps = featureMap[cap] || [];
      features.push(...caps);
    }
    return [...new Set(features)];
  }

  private generatePricingRecommendations(capabilities: string[], industry: string): PricingTier[] {
    if (capabilities.includes('subscriptions') || capabilities.includes('saas')) {
      return [
        { name: 'Starter', price: '$0', interval: '/mo', features: ['5 projects', 'Basic features', 'Community support'], highlighted: false },
        { name: 'Pro', price: '$29', interval: '/mo', features: ['Unlimited projects', 'Advanced features', 'Priority support', 'Integrations'], highlighted: true },
        { name: 'Enterprise', price: '$99', interval: '/mo', features: ['Everything in Pro', 'SSO', 'Dedicated support', 'Custom integrations', 'SLA'], highlighted: false },
      ];
    }
    if (capabilities.includes('commerce') || capabilities.includes('marketplace')) {
      return [
        { name: 'Basic', price: '$9', interval: '/mo', features: ['100 products', 'Standard support', 'Basic analytics'], highlighted: false },
        { name: 'Growth', price: '$29', interval: '/mo', features: ['1,000 products', 'Priority support', 'Advanced analytics', 'Marketing tools'], highlighted: true },
        { name: 'Scale', price: '$79', interval: '/mo', features: ['Unlimited products', '24/7 support', 'Custom domain', 'API access'], highlighted: false },
      ];
    }
    if (capabilities.includes('fitness-wellness') || capabilities.includes('booking')) {
      return [
        { name: 'Drop-in', price: '$15', interval: '/class', features: ['Single class', 'Access to facilities'], highlighted: false },
        { name: 'Monthly', price: '$49', interval: '/mo', features: ['Unlimited classes', 'Locker access', 'App access'], highlighted: true },
        { name: 'Annual', price: '$399', interval: '/yr', features: ['Everything in Monthly', '2 months free', 'Guest passes'], highlighted: false },
      ];
    }
    if (capabilities.includes('education')) {
      return [
        { name: 'Free', price: '$0', interval: '', features: ['5 courses', 'Basic quizzes', 'Community access'], highlighted: false },
        { name: 'Pro', price: '$19', interval: '/mo', features: ['Unlimited courses', 'Certificates', 'Priority support'], highlighted: true },
        { name: 'Team', price: '$49', interval: '/mo', features: ['Everything in Pro', 'Team dashboard', 'Admin controls', 'SSO'], highlighted: false },
      ];
    }
    return [];
  }

  private getContentStrategy(mood: string, industry: string): ContentStrategy {
    const fallback: ContentStrategy = { toneOfVoice: 'Professional, confident', keyMessages: ['Quality you can trust', 'Built for you', 'Excellence delivered'], callToActions: ['Get Started', 'Learn More', 'Contact Us'], socialProof: 'Trusted by thousands', urgencyTriggers: ['Limited time', 'Act now', 'Special offer'] };
    const base = MOOD_CONTENT_STRATEGY[mood] || MOOD_CONTENT_STRATEGY.premium || fallback;

    const industryTweaks: Partial<ContentStrategy> = {};
    if (industry === 'healthcare' || industry === 'local-business') {
      industryTweaks.toneOfVoice = 'Warm, professional, trustworthy';
      industryTweaks.keyMessages = ['Your health is our priority', 'Experienced care team', 'Convenient locations'];
      industryTweaks.callToActions = ['Book Appointment', 'Call Now', 'Find a Location'];
    }
    if (industry === 'fitness') {
      industryTweaks.toneOfVoice = 'Motivating, empowering, supportive';
      industryTweaks.keyMessages = ['Transform your body', 'Expert coaching', 'Join our community'];
      industryTweaks.callToActions = ['Start Free Trial', 'View Classes', 'Join Now'];
    }
    if (industry === 'restaurant') {
      industryTweaks.toneOfVoice = 'Warm, inviting, appetizing';
      industryTweaks.keyMessages = ['Fresh ingredients daily', 'Chef-crafted menus', 'Fast delivery'];
      industryTweaks.callToActions = ['Order Now', 'View Menu', 'Reserve Table'];
    }

    return { ...base, ...industryTweaks };
  }
}
