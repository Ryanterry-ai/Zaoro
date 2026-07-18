/**
 * Domain mock data — vertical-agnostic.
 *
 * This module NO LONGER contains per-industry hardcoded content pools (the old
 * `DOMAIN_DATA` map held literal `dental`, `luxury`, `footwear`, `perfume`,
 * `supplement`, … entries). Those were a direct violation of the system's "no
 * hardcoded verticals" rule and the source of cross-domain leakage (e.g. the
 * "athletes" copy appearing on unrelated builds). They have been removed.
 *
 * `getDomainData` now returns a single neutral generic dataset. It is only ever
 * a SEED / fallback: every real caller (pass3, domain-synthesizer) overrides it
 * with scraped content and BusinessResearch data before generating output. The
 * generic seed contains no business-specific names, so even in the pure-fallback
 * path no wrong-domain copy can appear.
 */

export interface DomainMockData {
  hero: { badge: string; headline: string; subtitle: string; cta: string; ctaSecondary?: string };
  stats: Array<{ value: string; label: string }>;
  items: Array<{ name: string; description: string; price?: number; tag?: string; rating?: number; reviews?: number; emoji: string; details?: string[] }>;
  testimonials: Array<{ name: string; role: string; text: string; rating: number }>;
  features: Array<{ icon: string; title: string; description: string; iconKeyword?: string }>;
  services: Array<{ name: string; description: string; icon: string }>;
  team: Array<{ name: string; role: string; bio: string; emoji: string }>;
  cta: { headline: string; subtitle: string; button: string };
  footer: { tagline: string; links: Array<{ label: string; href: string }> };
  imageKeywords: string[];
}

export interface DomainDataContext {
  appName?: string;
  businessType?: string;
  productTerm?: string;
}

function buildGeneric(ctx?: DomainDataContext): DomainMockData {
  const name = ctx?.appName ?? ctx?.businessType ?? 'your business';
  const productTerm = ctx?.productTerm ?? 'product';
  return {
    hero: {
      badge: 'Welcome',
      headline: name,
      subtitle: `Everything ${name} delivers, built around what you actually need.`,
      cta: 'Get Started',
      ctaSecondary: `View ${productTerm}`,
    },
    stats: [
      { value: '5,000+', label: 'Customers served' },
      { value: '10+', label: 'Years in business' },
      { value: '97%', label: 'Satisfaction rate' },
      { value: '24/7', label: 'Support' },
    ],
    items: [
      { name: `${name} ${productTerm}`, description: `A core ${productTerm} from ${name}.`, price: 49, tag: 'Popular', rating: 4.7, reviews: 234, emoji: '📦', details: ['Quality assured', 'Fast delivery', 'Easy returns'] },
      { name: `Pro ${productTerm}`, description: `An advanced ${productTerm} with more for power users.`, price: 99, tag: 'Best value', rating: 4.8, reviews: 189, emoji: '⭐', details: ['Priority support', 'More features', 'Flexible'] },
    ],
    testimonials: [
      { name: 'Alex Rivera', role: 'Customer', text: `Switching to ${name} was the easiest decision we made this year. It just works.`, rating: 5 },
      { name: 'Maria Garcia', role: 'Regular user', text: `The team behind ${name} clearly understands what we need. Genuinely impressed.`, rating: 5 },
      { name: 'Chris Williams', role: 'Verified review', text: `Best investment we made. The value was obvious from the first week.`, rating: 5 },
    ],
    features: [
      { icon: 'zap', title: 'Purpose-Built', description: `Designed for how ${name} actually works.`, iconKeyword: 'zap' },
      { icon: 'mouse-pointer', title: 'Easy to Use', description: 'Intuitive from the first visit — no training required.', iconKeyword: 'mouse-pointer' },
      { icon: 'shield', title: 'Secure', description: 'Your data and your customers are protected.', iconKeyword: 'shield' },
      { icon: 'sliders', title: 'Flexible', description: 'Adapts to your workflow, not the other way around.', iconKeyword: 'sliders' },
      { icon: 'lock', title: 'Reliable', description: 'Built to perform consistently, every time.', iconKeyword: 'lock' },
      { icon: 'life-buoy', title: 'Supported', description: 'Help is there when you need it.', iconKeyword: 'life-buoy' },
    ],
    services: [
      { name: 'Consulting', description: 'Expert guidance for your challenges.', icon: 'compass' },
      { name: 'Delivery', description: 'Fast, reliable fulfilment.', icon: 'truck' },
      { name: 'Support', description: 'Ongoing help whenever you need it.', icon: 'life-buoy' },
      { name: 'Custom', description: 'Tailored to your exact requirements.', icon: 'sliders' },
    ],
    team: [
      { name: 'Jordan Smith', role: 'Founder', bio: 'Passionate about building solutions that make a difference.', emoji: '🧑‍💼' },
      { name: 'Taylor Brown', role: 'Lead Specialist', bio: 'Deep expertise with a focus on results.', emoji: '🧑‍🔧' },
      { name: 'Morgan Davis', role: 'Experience Lead', bio: 'Obsessed with the details that matter to customers.', emoji: '🧑‍🎨' },
    ],
    cta: {
      headline: `Ready to get started with ${name}?`,
      subtitle: 'No commitment required — explore at your own pace.',
      button: 'Get Started',
    },
    footer: {
      tagline: `Building something worth coming back to.`,
      links: [
        { label: 'About', href: '/about' },
        { label: 'Services', href: '/services' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    imageKeywords: ['modern business', 'professional', 'workspace'],
  };
}

/**
 * Get generic seed domain data. Never keyed by industry — the same neutral
 * dataset is returned for every business; real pipelines override it with
 * scraped content and BusinessResearch before generating output.
 */
export function getDomainData(industry?: string, _subIndustry?: string, ctx?: DomainDataContext): DomainMockData {
  return buildGeneric(ctx);
}

/**
 * Map a section type to its items from a (generic or pre-populated) dataset.
 * Vertical-agnostic: section names are structural, not industry-specific.
 */
export function getSectionData(
  _domain: string,
  section: string,
  data: DomainMockData,
): { label: string; items: Array<{ name: string; description: string; emoji?: string; price?: number; tag?: string; rating?: number; reviews?: number; details?: string[] }> } {
  switch (section) {
    case 'hero':
      return { label: 'Hero', items: [] };
    case 'featured-properties':
    case 'product-grid':
    case 'featured-products':
    case 'menu-highlights':
    case 'courses':
    case 'featured-projects':
      return { label: 'Featured', items: data.items };
    case 'services':
    case 'services-grid':
    case 'practice-areas':
      return { label: 'Services', items: data.services.map((s) => ({ name: s.name, description: s.description, emoji: s.icon })) };
    case 'team':
    case 'team/doctors':
    case 'trainers':
      return { label: 'Team', items: data.team.map((t) => ({ name: t.name, description: t.bio, emoji: t.emoji })) };
    case 'testimonials':
      return { label: 'Testimonials', items: data.testimonials.map((t) => ({ name: t.name, description: t.text, emoji: '⭐'.repeat(t.rating), rating: t.rating, reviews: undefined })) };
    case 'features':
    case 'features-grid':
      return { label: 'Features', items: data.features.map((f) => ({ name: f.title, description: f.description, emoji: f.icon })) };
    case 'pricing-table':
    case 'membership-plans':
      return { label: 'Pricing', items: data.items.filter((i) => i.price !== undefined).map((i) => ({ ...i, emoji: i.emoji || '📦' })) };
    default:
      return { label: section, items: data.items };
  }
}
