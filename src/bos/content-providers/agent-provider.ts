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
        title: `Ready to transform your ${blueprint.industry} workflow?`,
        subtitle: `Join hundreds of ${blueprint.industry} professionals who trust ${blueprint.name ?? 'this platform'}`,
        actions: [
          { label: `Start with ${blueprint.name ?? 'us'}`, action: '/signup', style: 'primary' },
          { label: 'Schedule a Demo', action: '/contact', style: 'ghost' },
        ],
      },
    };
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
