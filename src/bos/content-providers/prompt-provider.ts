/**
 * PromptProvider — content from user prompt + BusinessResearch.
 *
 * Uses BusinessResearch to generate dynamic content based on:
 * - userPersonas → hero subtitle targeting
 * - customerFlow → feature descriptions
 * - revenueFlow → CTA actions
 * - vocabulary → industry-specific terminology
 *
 * Priority: 20 (above base knowledge).
 */

import type { ContentProvider, ContentBag, ProviderContext } from './interfaces.js';
import type { BusinessResearch } from '../types.js';

export class PromptProvider implements ContentProvider {
  readonly name = 'prompt';
  readonly priority = 20;

  canProvide(ctx: ProviderContext): boolean {
    return !!(ctx.blueprint.description || ctx.blueprint.name);
  }

  provide(ctx: ProviderContext): ContentBag {
    const desc = (ctx.blueprint.description ?? '').toLowerCase();
    const name = ctx.blueprint.name ?? 'Business';
    const research = ctx.businessResearch;

    // Vertical-agnostic section copy derived from the business itself
    // (its vocabulary / business type), never from a hardcoded industry pool.
    const copy = this.deriveCopy(ctx);

    return {
      hero: {
        title: name,
        subtitle: this.generateSubtitle(desc, name, research),
      },
      features: {
        title: copy.featuresHeading,
        subtitle: copy.featuresSubheading,
        items: this.generateFeatures(desc, research),
      },
      about: {
        title: `About ${name}`,
        description: this.generateAbout(desc, name, research),
      },
      cta: {
        title: copy.ctaHeading,
        subtitle: copy.ctaTrustLine,
        actions: this.generateCTAActions(research, copy),
      },
      ...(research?.vocabulary ? { vocabulary: research.vocabulary } : {}),
    };
  }

  /** Derive neutral section headings from the blueprint vocabulary/type. */
  private deriveCopy(ctx: ProviderContext): {
    featuresHeading: string; featuresSubheading: string;
    ctaHeading: string; ctaTrustLine: string;
    ctaPrimaryButton: string; heroSecondaryButton: string;
  } {
    const name = ctx.blueprint.name ?? 'us';
    const productTerm = ctx.blueprint.vocabulary?.['product'] ?? 'offerings';
    return {
      featuresHeading: 'What we offer',
      featuresSubheading: `Everything ${name} delivers, built around your needs`,
      ctaHeading: `Ready to get started with ${name}?`,
      ctaTrustLine: 'No commitment required — explore at your own pace',
      ctaPrimaryButton: 'Get Started',
      heroSecondaryButton: `View ${productTerm}`,
    };
  }

  /**
   * Generate hero subtitle from BusinessResearch.userPersonas.
   * Falls back to domain data for richer content.
   */
  private generateSubtitle(desc: string, name: string, research?: BusinessResearch): string {
    if (research?.userPersonas && research.userPersonas.length > 0) {
      const personas = research.userPersonas.slice(0, 3).join(', ');
      // Use a clean description — never echo raw prompt text
      const cleanIndustry = research.industry.replace(/-/g, ' ');
      return `Designed for ${personas} — ${cleanIndustry} made simple`;
    }
    return `Built for how ${name} actually works`;
  }

  /**
   * Generate features from BusinessResearch.customerFlow or domain data.
   */
  private generateFeatures(desc: string, research?: BusinessResearch): Array<{ title: string; description: string; icon: string }> {
    const features: Array<{ title: string; description: string; icon: string }> = [];

    if (research?.customerFlow && research.customerFlow.length > 0) {
      const icons = ['search', 'layout-grid', 'shopping-cart', 'credit-card', 'truck', 'star', 'heart', 'bell'];
      for (let i = 0; i < Math.min(research.customerFlow.length, 6); i++) {
        const flow = research.customerFlow[i] ?? '';
        const title = flow.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        features.push({
          title,
          description: `${title} — designed for ${research.userPersonas?.[0] || 'your users'}`,
          icon: icons[i % icons.length] ?? 'zap',
        });
      }
    }

    // Fallback: generic features from description keywords
    if (features.length === 0) {
      if (desc.includes('analytics') || desc.includes('dashboard')) {
        features.push({ title: 'Analytics Dashboard', description: 'Real-time data visualization and reporting', icon: 'bar-chart' });
      }
      if (desc.includes('api') || desc.includes('integration')) {
        features.push({ title: 'API Access', description: 'Integrate with your existing tools', icon: 'code' });
      }
      if (desc.includes('team') || desc.includes('collaboration')) {
        features.push({ title: 'Team Collaboration', description: 'Work together in real-time', icon: 'users' });
      }
      if (features.length === 0) {
        features.push(
          { title: 'Core Functionality', description: 'Purpose-built for your workflow', icon: 'zap' },
          { title: 'Smart Automation', description: 'Reduce manual work with intelligent automation', icon: 'bot' },
          { title: 'Real-Time Insights', description: 'Data-driven decisions with live analytics', icon: 'activity' },
        );
      }
    }

    return features;
  }

  /**
   * Generate about text from BusinessResearch.
   * Uses businessType, userPersonas, and revenueFlow.
   */
  /**
   * Generate about text from BusinessResearch or domain data.
   */
  private generateAbout(desc: string, name: string, research?: BusinessResearch): string {
    if (research) {
      const personas = research.userPersonas?.slice(0, 2).join(' and ') || 'your users';
      const revenueDesc = research.revenueFlow?.[0]?.replace(/-/g, ' ') || 'direct sales';
      return `${name} — a ${research.businessType} serving ${personas} through ${revenueDesc}`;
    }
    return `${name} — purpose-built for how your team actually works`;
  }

  private generateCTASubtitle(research?: BusinessResearch): string {
    if (research?.revenueFlow?.includes('subscription')) return 'Start your subscription today';
    if (research?.revenueFlow?.includes('membership')) return 'Join our community';
    if (research?.revenueFlow?.includes('service-booking')) return 'Book your first session';
    if (research?.revenueFlow?.includes('marketplace')) return 'Start selling today';
    return 'Get started in minutes';
  }

  /**
   * Generate CTA actions from BusinessResearch.revenueFlow.
   */
  private generateCTAActions(research?: BusinessResearch, copy?: ReturnType<typeof PromptProvider.prototype.deriveCopy>): Array<{ label: string; action: string; style: 'link' | 'primary' | 'secondary' | 'ghost' }> {
    const revenueFlow = research?.revenueFlow?.[0] || 'direct-sales';
    const ctaLabel = copy?.ctaPrimaryButton ?? 'Get Started';
    const secondaryLabel = copy?.heroSecondaryButton ?? 'Learn More';

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
    // direct-sales, freemium, etc. — use industry schema
    return [
      { label: ctaLabel, action: '/register', style: 'primary' },
      { label: secondaryLabel, action: '#features', style: 'ghost' },
    ];
  }
}
