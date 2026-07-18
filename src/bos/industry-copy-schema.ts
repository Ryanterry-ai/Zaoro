/**
 * Industry copy — vertical-agnostic.
 *
 * This module NO LONGER contains per-industry hardcoded copy pools. Every
 * returned schema is derived from the business's own signals (its name and the
 * vocabulary passed in via context) or from a single neutral generic shape.
 *
 * Previously this file held ~30 hardcoded vertical schemas (restaurant, saas,
 * dental, luxury, perfume, supplement, …) keyed by industry string — a direct
 * violation of the system's "no hardcoded verticals" rule. Those pools have
 * been removed. Copy is now composed from primitives: the business name, its
 * declared vocabulary, and neutral, business-agnostic section structure.
 *
 * `detectForbiddenPhrase` is retained as a FORMAT guard: it flags generic
 * boilerplate/slop phrasing that should never appear in any output regardless
 * of vertical (e.g. "no credit card required for software", "trusted by
 * thousands of businesses"). It is NOT an industry enumeration.
 */

export interface IndustryCopySchema {
  nameFromPrompt: boolean;
  nameFallbackPatterns: string[];

  heroPrimaryHeading: string;
  heroSubheading: string;
  heroPrimaryButton: string;
  heroSecondaryButton: string;
  heroTrustBadges: string[];
  heroImageKeywords: string[];

  featuresHeading: string;
  featuresSubheading: string;
  featureItems: Array<{ title: string; description: string; icon: string }>;

  testimonialsHeading: string;
  testimonialsSubheading: string;
  testimonialTemplates: Array<{ text: string; author: string; role: string; rating: number }>;

  ctaHeading: string;
  ctaPrimaryButton: string;
  ctaTrustLine: string;

  pricingHeading: string;
  pricingSubheading: string;

  stats: Array<{ value: string; label: string }>;

  footerTagline: string;

  forbiddenPhrases: string[];
}

export interface CopyContext {
  appName?: string;
  vocabulary?: Record<string, string>;
  businessType?: string;
}

const GENERIC_SCHEMA = (ctx?: CopyContext): IndustryCopySchema => {
  const name = ctx?.appName ?? ctx?.businessType ?? 'your business';
  const productTerm = ctx?.vocabulary?.['product'] ?? 'offerings';
  return {
    nameFromPrompt: true,
    nameFallbackPatterns: ['[Adj] [Domain]', '[City] [Domain]', '[Brand]'],
    heroPrimaryHeading: '{appName}',
    heroSubheading: `Everything ${name} delivers, built around what you actually need.`,
    heroPrimaryButton: 'Get Started',
    heroSecondaryButton: `View ${productTerm}`,
    heroTrustBadges: ['Trusted by real customers', 'Built around your needs', 'No commitment required'],
    heroImageKeywords: ['modern business', 'professional', 'workspace'],
    featuresHeading: 'What we offer',
    featuresSubheading: `Everything ${name} delivers, built around your needs`,
    featureItems: [
      { title: 'Purpose-Built', description: `Designed for how ${name} actually works.`, icon: 'zap' },
      { title: 'Easy to Use', description: 'Intuitive from the first visit — no training required.', icon: 'mouse-pointer' },
      { title: 'Reliable', description: 'Built to perform consistently, every time.', icon: 'shield' },
      { title: 'Flexible', description: 'Adapts to your workflow, not the other way around.', icon: 'sliders' },
      { title: 'Secure', description: 'Your data and your customers are protected.', icon: 'lock' },
      { title: 'Supported', description: 'Help is there when you need it.', icon: 'life-buoy' },
    ],
    testimonialsHeading: 'What customers say',
    testimonialsSubheading: 'Real experiences from people who use the product',
    testimonialTemplates: [
      { text: `Switching to ${name} was the easiest decision we made this year. It just works.`, author: 'Alex R.', role: 'Customer', rating: 5 },
      { text: `The team behind ${name} clearly understands what we need. Genuinely impressed.`, author: 'Priya S.', role: 'Regular user', rating: 5 },
      { text: `We looked at everything else and ${name} was the obvious choice. No regrets.`, author: 'Jordan M.', role: 'Verified review', rating: 5 },
    ],
    ctaHeading: `Ready to get started with ${name}?`,
    ctaPrimaryButton: 'Get Started',
    ctaTrustLine: 'No commitment required — explore at your own pace',
    pricingHeading: `Our ${productTerm}`,
    pricingSubheading: 'Transparent options that scale with you',
    stats: [
      { value: '5,000+', label: 'Customers served' },
      { value: '10+', label: 'Years in business' },
      { value: '97%', label: 'Satisfaction rate' },
      { value: '24/7', label: 'Support' },
    ],
    footerTagline: `Building something worth coming back to.`,
    forbiddenPhrases: [
      'no credit card required for software',
      'trusted by thousands of businesses',
      'capabilities',
      'workflow automation platform',
      'roi measurement',
      'b2b dashboard',
      'sign up for our platform',
      'api integration',
    ],
  };
};

/**
 * Get the (vertical-agnostic) copy schema. All copy is derived from the
 * business's own name/vocabulary — never from a hardcoded industry pool.
 */
export function getIndustryCopy(industry?: string, ctx?: CopyContext): IndustryCopySchema {
  return GENERIC_SCHEMA(ctx);
}

/**
 * Check a generated string against the neutral format-guard forbidden phrases.
 * Returns the offending phrase if found, null if clean.
 */
export function detectForbiddenPhrase(text: string, _industry?: string): string | null {
  const lower = (text ?? '').toLowerCase();
  return GENERIC_SCHEMA().forbiddenPhrases.find((phrase) => lower.includes(phrase)) ?? null;
}
