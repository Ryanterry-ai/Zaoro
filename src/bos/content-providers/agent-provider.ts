/**
 * AgentProvider — content from AI agent reasoning.
 *
 * Uses BusinessResearch for dynamic content generation:
 * - userPersonas → testimonials, hero badge
 * - revenueFlow → CTA actions and titles
 * - kpis → stats section
 * - vocabulary → industry-specific terminology
 * - businessWorkflow → mission items
 *
 * Priority: 50 (highest — agent has final say on content).
 */

import type { ContentProvider, ContentBag, ProviderContext } from './interfaces.js';
import type { BusinessResearch } from '../types.js';

export class AgentProvider implements ContentProvider {
  readonly name = 'agent';
  readonly priority = 50;

  canProvide(_ctx: ProviderContext): boolean {
    return true;
  }

  provide(ctx: ProviderContext): ContentBag {
    const { blueprint, vocabulary, subCategory, revenueIntelligence, businessResearch, scrapedContent } = ctx;

    // Vertical-agnostic badge: prefer a scraped trust signal, else the
    // business's own name/type — never a hardcoded industry pool.
    const badge = vocabulary?.['appName'] ?? blueprint.name ?? blueprint.industry ?? 'Business';

    // Only generate testimonials if scraped content doesn't have them
    const hasScrapedTestimonials = scrapedContent?.testimonials && scrapedContent.testimonials.length > 0;

    // Only generate stats if no scraped or BI stats exist
    const hasScrapedStats = scrapedContent?.productSpecs && scrapedContent.productSpecs.length > 0;
    const hasBIStats = revenueIntelligence?.kpis && revenueIntelligence.kpis.length > 0;

    return {
      hero: {
        badge,
        // Do NOT set title here — let ScrapedContentProvider provide it
      },
      features: {
        title: 'What we offer',
        subtitle: `Everything ${blueprint.name ?? 'we'} deliver, built around your needs`,
      },
      about: {
        title: `About ${blueprint.name ?? blueprint.industry}`,
      },
      // Only provide testimonials if scraped content doesn't have them
      ...(hasScrapedTestimonials ? {} : {
        testimonials: {
          items: this.generateTestimonials(blueprint, vocabulary, businessResearch),
        },
      }),
      mission: {
        items: this.generateMission(businessResearch, blueprint.industry),
      },
      // Only provide stats if no scraped or BI stats exist
      ...(hasScrapedStats || hasBIStats ? {} : {
        stats: {
          items: this.generateStats(businessResearch, revenueIntelligence),
        },
      }),
      cta: {
        title: this.generateCTATitle(blueprint, businessResearch),
        subtitle: this.generateCTASubtitle(businessResearch),
        actions: this.generateCTAActions(blueprint, businessResearch),
      },
    };
  }

  /**
   * Generate mission items from BusinessResearch.businessWorkflow.
   */
  private generateMission(research?: BusinessResearch, industry?: string): Array<{ title: string; description: string; icon: string }> {
    if (research?.businessWorkflow && research.businessWorkflow.length > 0) {
      const icons = ['target', 'refresh-cw', 'heart', 'shield', 'zap'];
      return research.businessWorkflow.slice(0, 3).map((workflow, i) => ({
        title: workflow.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        description: `Expert ${workflow.replace(/-/g, ' ')} for ${research.industry}`,
        icon: icons[i % icons.length] ?? 'target',
      }));
    }
    return [
      { title: 'Domain Expertise', description: `Deep ${industry || 'business'} knowledge built into every feature`, icon: 'target' },
      { title: 'Continuous Innovation', description: 'Always evolving to meet industry demands', icon: 'refresh-cw' },
      { title: 'Client Success', description: 'Dedicated support and measurable outcomes', icon: 'heart' },
    ];
  }

  /**
   * Generate stats from BusinessResearch.kpis.
   */
  private generateStats(
    research?: BusinessResearch,
    revenueIntelligence?: ProviderContext['revenueIntelligence'],
  ): Array<{ label: string; value: string; trend: 'up' | 'down' | 'neutral' }> {
    // Use BI profile KPIs if available
    if (revenueIntelligence?.kpis && revenueIntelligence.kpis.length > 0) {
      return revenueIntelligence.kpis.slice(0, 4).map(kpi => ({
        label: kpi.label,
        value: kpi.benchmark ?? '—',
        trend: 'neutral' as const,
      }));
    }

    // Use BusinessResearch KPIs
    if (research?.kpis && research.kpis.length > 0) {
      return research.kpis.slice(0, 4).map(kpi => ({
        label: kpi.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).slice(0, 20),
        value: '—',
        trend: 'neutral' as const,
      }));
    }

    return [
      { label: 'Clients', value: '—', trend: 'neutral' as const },
      { label: 'Uptime', value: '99.9%', trend: 'neutral' as const },
      { label: 'Support', value: '24/7', trend: 'neutral' as const },
    ];
  }

  /**
   * Generate CTA title from BusinessResearch.revenueFlow.
   */
  private generateCTATitle(blueprint: ProviderContext['blueprint'], research?: BusinessResearch): string {
    const name = blueprint.name ?? 'us';
    return `Ready to get started with ${name}?`;
  }

  /**
   * Generate CTA subtitle from BusinessResearch.
   */
  private generateCTASubtitle(research?: BusinessResearch): string {
    return '';  // Let content-resolver.ts fill this from schema
  }

  /**
   * Generate CTA actions from BusinessResearch.revenueFlow.
   */
  private generateCTAActions(
    blueprint: ProviderContext['blueprint'],
    research?: BusinessResearch,
  ): Array<{ label: string; action: string; style: 'primary' | 'ghost' }> {
    const name = blueprint.name ?? 'us';
    const revenueFlow = research?.revenueFlow?.[0] || 'direct-sales';

    if (revenueFlow === 'subscription') {
      return [
        { label: 'Start Free Trial', action: '/register', style: 'primary' },
        { label: 'View Plans', action: '#pricing', style: 'ghost' },
      ];
    }
    if (revenueFlow === 'membership') {
      return [
        { label: 'Join Now', action: '/register', style: 'primary' },
        { label: 'View Membership', action: '#pricing', style: 'ghost' },
      ];
    }
    if (revenueFlow === 'service-booking') {
      return [
        { label: 'Book Now', action: '/booking', style: 'primary' },
        { label: 'View Services', action: '#services', style: 'ghost' },
      ];
    }
    if (revenueFlow === 'marketplace') {
      return [
        { label: 'Start Selling', action: '/register', style: 'primary' },
        { label: 'Browse Marketplace', action: '/browse', style: 'ghost' },
      ];
    }
    if (revenueFlow === 'freemium') {
      return [
        { label: `Try ${name} Free`, action: '/register', style: 'primary' },
        { label: 'See Features', action: '#features', style: 'ghost' },
      ];
    }
    const productTerm = blueprint.vocabulary?.['product'] ?? 'offerings';
    return [
      { label: 'Get Started', action: '/register', style: 'primary' },
      { label: `View ${productTerm}`, action: '/about', style: 'ghost' },
    ];
  }

  /**
   * Generate testimonials from BusinessKnowledge (preferred) or BusinessResearch fallback.
   * Uses customerPersonas, vocabulary, and businessType for relevant quotes.
   */
  private generateTestimonials(
    blueprint: ProviderContext['blueprint'],
    vocabulary: Record<string, string>,
    research?: BusinessResearch,
  ): Array<{ name: string; role: string; quote: string }> {
    const appName = blueprint.name ?? 'this platform';
    const customerTerm = vocabulary['customer'] ?? 'customer';
    const productTerm = vocabulary['product'] ?? 'solution';
    const businessType = blueprint.industry;
    const domain = research?.domain ?? '';
    const domainNoun = domain.replace(/-/g, ' ');

    // Prefer BusinessResearch userPersonas
    const personas = research?.userPersonas ?? [];

    if (personas.length > 0) {
      const names = ['Alex Rivera', 'Jordan Lee', 'Sam Patel', 'Casey Morgan', 'Taylor Kim'];
      
      // Build domain-aware quotes using business knowledge
      const revenueFlow = research?.revenueFlow?.[0] ?? 'one-time';
      const primaryGoal = research?.customerFlow?.[2] ?? 'convert';
      const domainLabel = domainNoun || domain.replace(/-/g, ' ') || 'business';
      
      const quotes = [
        `${appName} transformed how we ${primaryGoal.toLowerCase()} ${domainLabel} — measurable improvement from day one.`,
        `The ${productTerm} is exactly what we needed. Our ${customerTerm}s love the ${domainLabel} experience.`,
        `Fast, reliable, and built for ${personas[0]?.toLowerCase() ?? 'our customers'}. Best decision we made.`,
      ];

      return personas.slice(0, 3).map((persona, i) => ({
        name: ['Alex Rivera', 'Jordan Lee', 'Sam Patel', 'Casey Morgan', 'Taylor Kim'][i % 5] ?? 'User',
        role: persona.charAt(0).toUpperCase() + persona.slice(1),
        quote: quotes[i % quotes.length] ?? `${appName} is great.`,
      }));
    }

// Fallback: generic testimonials using business knowledge
    const fallbackDomain = domainNoun || domain.replace(/-/g, ' ') || 'business';
    return [
      { 
        name: 'Alex Rivera', 
        role: customerTerm.charAt(0).toUpperCase() + customerTerm.slice(1), 
        quote: `${appName} streamlined how we work with ${fallbackDomain} — we saw measurable improvement in the first month.` 
      },
      { name: 'Jordan Lee', role: 'Operations Lead', quote: `The ${productTerm} is exactly what we needed for ${fallbackDomain}. Integration took less than a day.` },
      { name: 'Sam Patel', role: 'Manager', quote: `Our team adopted ${appName} faster than any other ${businessType.toLowerCase()} tool we've tried.` },
    ];

  }
}
