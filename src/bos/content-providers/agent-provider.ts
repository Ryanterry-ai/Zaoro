/**
 * AgentProvider — content from AI agent reasoning.
 *
 * Provides: domain-specific copy, business artifacts, enriched content.
 * Priority: 50 (highest — agent has final say on content).
 *
 * In agent mode, the agent generates TSX directly from the spec.
 * This provider supplies the enriched context the agent needs.
 */

import type { ContentProvider, ContentBag, ProviderContext } from './interfaces.js';

export class AgentProvider implements ContentProvider {
  readonly name = 'agent';
  readonly priority = 50;

  canProvide(_ctx: ProviderContext): boolean {
    // Agent provider always contributes — it enriches everything
    return true;
  }

  provide(ctx: ProviderContext): ContentBag {
    const { blueprint, vocabulary, subCategory, revenueIntelligence } = ctx;

    // The agent provider enriches content with domain-aware terminology
    // and provides the highest-quality fallback content
    return {
      hero: {
        badge: subCategory
          ? `${subCategory.charAt(0).toUpperCase() + subCategory.slice(1)} — ${blueprint.industry}`
          : blueprint.industry,
      },
      features: {
        title: `${blueprint.name ?? blueprint.industry} Capabilities`,
        subtitle: `What makes ${blueprint.name ?? 'this platform'} different`,
      },
      about: {
        title: `About ${blueprint.name ?? blueprint.industry}`,
      },
      testimonials: {
        items: this.generateTestimonials(blueprint, vocabulary, subCategory),
      },
      mission: {
        items: [
          { title: 'Domain Expertise', description: `Deep ${blueprint.industry} knowledge built into every feature`, icon: 'target' as const },
          { title: 'Continuous Innovation', description: 'Always evolving to meet industry demands', icon: 'refresh-cw' as const },
          { title: 'Client Success', description: 'Dedicated support and measurable outcomes', icon: 'heart' as const },
        ],
      },
      stats: {
        items: revenueIntelligence?.kpis?.slice(0, 4).map(kpi => ({
          label: kpi.label,
          value: kpi.benchmark ?? '—',
          trend: 'neutral' as const,
        })) ?? [
          { label: 'Clients', value: '500+', trend: 'up' as const },
          { label: 'Uptime', value: '99.9%', trend: 'neutral' as const },
          { label: 'Support', value: '24/7', trend: 'neutral' as const },
          { label: 'Growth', value: '40%', trend: 'up' as const },
        ],
      },
      cta: {
        title: this.generateCTATitle(blueprint),
        subtitle: this.generateCTASubtitle(blueprint),
        actions: this.generateCTAActions(blueprint),
      },
    };
  }

  private generateCTATitle(blueprint: ProviderContext['blueprint']): string {
    const name = blueprint.name ?? 'us';
    const industry = blueprint.industry;
    const ctaMap: Record<string, string> = {
      ecommerce: `Shop ${name} Today`,
      restaurant: `Reserve Your Table at ${name}`,
      cafe: `Visit ${name} for Fresh Brews`,
      gym: `Join ${name} and Start Training`,
      fitness: `Start Your Fitness Journey with ${name}`,
      supplement: `Order from ${name} — Lab-Tested & Trusted`,
      healthcare: `Book an Appointment at ${name}`,
      dental: `Schedule Your Visit to ${name}`,
      salon: `Book Your Session at ${name}`,
      spa: `Experience ${name} — Relax & Rejuvenate`,
      saas: `Get Started with ${name}`,
      realestate: `Explore Properties with ${name}`,
      legal: `Consult with ${name} Today`,
      agency: `Partner with ${name}`,
      education: `Enroll at ${name}`,
      travel: `Plan Your Trip with ${name}`,
      technology: `Try ${name} Now`,
      media: `Subscribe to ${name}`,
      nonprofit: `Support ${name}`,
      portfolio: `View Our Work at ${name}`,
    };
    return ctaMap[industry] ?? `Get Started with ${name}`;
  }

  private generateCTASubtitle(blueprint: ProviderContext['blueprint']): string {
    const industry = blueprint.industry;
    const subMap: Record<string, string> = {
      ecommerce: `Browse our curated collection and find exactly what you need.`,
      restaurant: `Fresh ingredients, crafted dishes, and an unforgettable dining experience.`,
      cafe: ` specialty coffee, fresh pastries, and a welcoming space every morning.`,
      gym: `State-of-the-art equipment, expert trainers, and a community that keeps you going.`,
      fitness: `Personalized programs, group classes, and results you can see.`,
      supplement: `Premium, lab-tested supplements delivered to your door.`,
      healthcare: `Compassionate care with experienced professionals.`,
      dental: `Modern dentistry for a healthier, brighter smile.`,
      salon: `Expert stylists and premium treatments for every look.`,
      spa: `Unwind with our luxury treatments and peaceful atmosphere.`,
      saas: `Streamline your workflow and boost productivity.`,
      realestate: `Find your perfect property with our expert guidance.`,
      legal: `Trusted legal counsel for your business and personal needs.`,
      agency: `Creative solutions that drive real results for your brand.`,
      education: `Quality education that empowers lifelong success.`,
      travel: `Curated experiences and unforgettable destinations.`,
      technology: `Cutting-edge solutions built for your success.`,
      media: `Stay informed with quality content and journalism.`,
      nonprofit: `Every contribution makes a meaningful difference.`,
      portfolio: `See our creative work and innovative projects.`,
    };
    return subMap[industry] ?? `Join thousands who trust ${blueprint.name ?? 'us'} for quality and reliability.`;
  }

  private generateCTAActions(blueprint: ProviderContext['blueprint']): Array<{ label: string; action: string; style: 'primary' | 'ghost' }> {
    const name = blueprint.name ?? 'us';
    const industry = blueprint.industry;
    const actionMap: Record<string, Array<{ label: string; action: string; style: 'primary' | 'ghost' }>> = {
      ecommerce: [
        { label: `Shop Now`, action: '/shop', style: 'primary' },
        { label: 'Browse Categories', action: '/shop', style: 'ghost' },
      ],
      restaurant: [
        { label: 'Reserve a Table', action: '/contact', style: 'primary' },
        { label: 'View Menu', action: '/menu', style: 'ghost' },
      ],
      cafe: [
        { label: 'Visit Us', action: '/contact', style: 'primary' },
        { label: 'See Menu', action: '/menu', style: 'ghost' },
      ],
      gym: [
        { label: 'Join Now', action: '/register', style: 'primary' },
        { label: 'View Plans', action: '/pricing', style: 'ghost' },
      ],
      fitness: [
        { label: 'Start Free Trial', action: '/register', style: 'primary' },
        { label: 'See Programs', action: '/programs', style: 'ghost' },
      ],
      supplement: [
        { label: 'Order Now', action: '/shop', style: 'primary' },
        { label: 'View Products', action: '/shop', style: 'ghost' },
      ],
      saas: [
        { label: `Start with ${name}`, action: '/register', style: 'primary' },
        { label: 'Schedule a Demo', action: '/contact', style: 'ghost' },
      ],
    };
    return actionMap[industry] ?? [
      { label: `Get Started`, action: '/register', style: 'primary' as const },
      { label: 'Learn More', action: '/about', style: 'ghost' as const },
    ];
  }

  private generateTestimonials(
    blueprint: ProviderContext['blueprint'],
    vocabulary: Record<string, string>,
    subCategory?: string,
  ): Array<{ name: string; role: string; quote: string }> {
    const industry = blueprint.industry;
    const appName = blueprint.name ?? 'this platform';
    const customerTerm = vocabulary['customer'] ?? 'customer';
    const productTerm = vocabulary['product'] ?? 'solution';

    if (subCategory === 'coffee') {
      return [
        { name: 'Maria Santos', role: 'Coffee Enthusiast', quote: `The cold brew at ${appName} is the best I've had — smooth, rich, and perfectly balanced every time.` },
        { name: 'David Chen', role: 'Regular Customer', quote: `I order through the app every morning. The pickup is always ready when I arrive.` },
        { name: 'Sarah Kim', role: 'Local Business Owner', quote: `We host our team meetings here. The space is welcoming and the espresso keeps us going.` },
      ];
    }

    if (subCategory === 'wholesale') {
      return [
        { name: 'Rajesh Kumar', role: 'Gym Owner', quote: `Bulk ordering through ${appName} cut our procurement time by 60%. The dealer portal is excellent.` },
        { name: 'Mike Thompson', role: 'Retail Chain Manager', quote: `Reliable supply chain and competitive wholesale pricing. Our shelves are always stocked.` },
        { name: 'Priya Sharma', role: 'Distributor', quote: `The PO system automated our entire ordering workflow. No more manual spreadsheets.` },
      ];
    }

    if (subCategory === 'supplement') {
      return [
        { name: 'Alex Rivera', role: 'Fitness Trainer', quote: `I recommend ${appName} to all my clients. The lab-tested quality gives me confidence.` },
        { name: 'Jordan Lee', role: 'Athlete', quote: `Fast delivery and genuine products. The subscription bundle saves me time every month.` },
        { name: 'Sam Patel', role: 'Health Enthusiast', quote: `Finally a supplement store I can trust. Every product is verified and the prices are fair.` },
      ];
    }

    // Generic industry testimonials
    return [
      { name: 'Alex Rivera', role: `${customerTerm.charAt(0).toUpperCase() + customerTerm.slice(1)}`, quote: `${appName} streamlined our ${industry} workflow — we saw measurable improvement in the first month.` },
      { name: 'Jordan Lee', role: 'Operations Lead', quote: `The ${productTerm} is exactly what we needed. Integration took less than a day.` },
      { name: 'Sam Patel', role: 'Manager', quote: `Our team adopted ${appName} faster than any other tool we've tried.` },
    ];
  }
}
