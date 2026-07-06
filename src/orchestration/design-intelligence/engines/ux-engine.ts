// ─── UX Engine ──────────────────────────────────────────────────────────────
//
// Wraps UI UX Pro Max capabilities. Handles:
//   - User journey mapping
//   - Navigation architecture
//   - Layout patterns per industry
//   - Conversion optimization
//   - Accessibility (WCAG)
//   - Mobile-first responsive design
// ─────────────────────────────────────────────────────────────────────────────

import type { DesignSubEngine, DesignContext, DesignRecommendation } from '../types.js';

// ─── Industry UX Patterns ───────────────────────────────────────────────────

const UX_PATTERNS: Record<string, {
  navigation: string;
  layout: string;
  heroStyle: string;
  conversionPattern: string;
  mobileStrategy: string;
}> = {
  'ecommerce': { navigation: 'mega-menu', layout: 'grid-cards', heroStyle: 'product-showcase', conversionPattern: 'quick-checkout', mobileStrategy: 'bottom-nav' },
  'saas': { navigation: 'sidebar', layout: 'dashboard', heroStyle: 'value-prop', conversionPattern: 'trial-signup', mobileStrategy: 'hamburger' },
  'fintech': { navigation: 'sidebar', layout: 'dashboard-cards', heroStyle: 'trust-signals', conversionPattern: 'kyc-flow', mobileStrategy: 'bottom-nav' },
  'healthcare': { navigation: 'top-bar', layout: 'clean-grid', heroStyle: 'provider-focus', conversionPattern: 'appointment-booking', mobileStrategy: 'simplified' },
  'education': { navigation: 'sidebar', layout: 'course-grid', heroStyle: 'learning-outcomes', conversionPattern: 'enrollment', mobileStrategy: 'bottom-nav' },
  'restaurant': { navigation: 'top-bar', layout: 'menu-focused', heroStyle: 'food-visual', conversionPattern: 'order-flow', mobileStrategy: 'bottom-nav' },
  'fitness': { navigation: 'bottom-nav', layout: 'class-schedule', heroStyle: 'transformation', conversionPattern: 'trial-booking', mobileStrategy: 'bottom-nav' },
  'real-estate': { navigation: 'top-bar', layout: 'map-and-list', heroStyle: 'search-hero', conversionPattern: 'inquiry-form', mobileStrategy: 'bottom-nav' },
  'media': { navigation: 'top-bar', layout: 'article-grid', heroStyle: 'featured-story', conversionPattern: 'newsletter-signup', mobileStrategy: 'hamburger' },
  'portfolio': { navigation: 'minimal', layout: 'showcase', heroStyle: 'work-highlight', conversionPattern: 'contact-form', mobileStrategy: 'minimal' },
  'marketplace': { navigation: 'mega-menu', layout: 'product-grid', heroStyle: 'category-browse', conversionPattern: 'vendor-signup', mobileStrategy: 'bottom-nav' },
  'nonprofit': { navigation: 'top-bar', layout: 'impact-focused', heroStyle: 'mission-statement', conversionPattern: 'donation-flow', mobileStrategy: 'simplified' },
};

// ─── UX Engine ──────────────────────────────────────────────────────────────

export class UXEngine implements DesignSubEngine {
  readonly name = 'UX Engine';
  readonly domain = 'ux' as const;

  recommend(ctx: DesignContext): DesignRecommendation[] {
    const patterns = UX_PATTERNS[ctx.industry] ?? UX_PATTERNS['saas']!;
    const recs: DesignRecommendation[] = [];

    // Navigation recommendation
    recs.push({
      domain: 'ux',
      title: 'Navigation Architecture',
      description: `Use ${patterns.navigation} navigation for ${ctx.industry} industry`,
      confidence: 0.9,
      priority: 'must',
      tokens: { navigationType: patterns.navigation },
    });

    // Layout recommendation
    recs.push({
      domain: 'ux',
      title: 'Page Layout',
      description: `Apply ${patterns.layout} layout pattern`,
      confidence: 0.85,
      priority: 'must',
      tokens: { layoutPattern: patterns.layout },
    });

    // Hero section
    recs.push({
      domain: 'ux',
      title: 'Hero Section',
      description: `Design ${patterns.heroStyle} hero for maximum impact`,
      confidence: 0.85,
      priority: 'must',
      tokens: { heroStyle: patterns.heroStyle },
    });

    // Conversion optimization
    recs.push({
      domain: 'ux',
      title: 'Conversion Pattern',
      description: `Optimize for ${patterns.conversionPattern}`,
      confidence: 0.8,
      priority: 'should',
      tokens: { conversionPattern: patterns.conversionPattern },
    });

    // Mobile strategy
    recs.push({
      domain: 'ux',
      title: 'Mobile Strategy',
      description: `Use ${patterns.mobileStrategy} mobile navigation`,
      confidence: 0.9,
      priority: 'must',
      tokens: { mobileStrategy: patterns.mobileStrategy },
    });

    // Accessibility
    recs.push({
      domain: 'ux',
      title: 'Accessibility',
      description: 'Ensure WCAG 2.1 AA compliance with proper focus management, ARIA labels, and color contrast',
      confidence: 1.0,
      priority: 'must',
      tokens: { wcagLevel: 'AA', focusManagement: true, ariaLabels: true },
    });

    // Information architecture
    if (ctx.stage === 'frontend' || ctx.stage === 'architecture') {
      recs.push({
        domain: 'ux',
        title: 'Information Architecture',
        description: `Structure content with ${this.getIAPattern(ctx.industry)} hierarchy`,
        confidence: 0.8,
        priority: 'should',
        tokens: { iaPattern: this.getIAPattern(ctx.industry) },
      });
    }

    return recs;
  }

  private getIAPattern(industry: string): string {
    const patterns: Record<string, string> = {
      'ecommerce': 'category → subcategory → product',
      'saas': 'feature → module → settings',
      'healthcare': 'service → provider → appointment',
      'education': 'course → module → lesson',
      'restaurant': 'menu → category → item',
      'portfolio': 'project → detail → process',
    };
    return patterns[industry] ?? 'hierarchical';
  }
}

export function createUXEngine(): UXEngine {
  return new UXEngine();
}
