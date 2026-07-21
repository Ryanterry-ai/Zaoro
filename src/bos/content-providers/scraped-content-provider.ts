/**
 * ScrapedContentProvider — content from external web/document/Figma data.
 *
 * Provides: hero headlines, about text, testimonials, pricing, team members, product specs.
 * Priority: 40 (above design DNA — real data wins).
 */

import type { ContentProvider, ContentBag, ProviderContext } from './interfaces.js';

export class ScrapedContentProvider implements ContentProvider {
  readonly name = 'scraped-content';
  readonly priority = 40;

  canProvide(ctx: ProviderContext): boolean {
    return !!(ctx.scrapedContent || ctx.revenueIntelligence);
  }

  provide(ctx: ProviderContext): ContentBag {
    const scraped = ctx.scrapedContent;
    const bi = ctx.revenueIntelligence;
    const result: ContentBag = {};

    // Hero content from scraped headline
    if (scraped?.heroHeadline) {
      result.hero = {
        title: scraped.heroHeadline,
        subtitle: scraped.aboutText?.substring(0, 120),
        items: scraped.prices.slice(0, 3).map(p => ({
          title: p.name,
          description: p.description ?? p.price,
          icon: 'zap' as const,
        })),
      };
    } else if (bi?.leadCaptureMechanisms?.[0]) {
      result.hero = {
        title: bi.leadCaptureMechanisms[0].headline,
      };
    }

    // Customer-facing marketing features come ONLY from real product specs
    // scraped off the live site. Internal analytics dashboard widgets
    // ("Revenue Trend", "Engagement Overview") are admin-facing metrics and
    // must never leak into homepage feature copy. When no product specs exist,
    // leave `features` unset so the content-resolver derives them from the
    // business's capabilities/entities instead.
    if (scraped?.productSpecs && scraped.productSpecs.length > 0) {
      result.features = {
        items: scraped.productSpecs.slice(0, 6).map((spec, i) => ({
          title: spec,
          description: `${spec} — core capability`,
          icon: (['zap', 'database', 'shield', 'lock', 'trending-up', 'code'] as const)[i] ?? 'zap',
        })),
      };
    }

    // Testimonials from scraped reviews
    if (scraped?.testimonials && scraped.testimonials.length > 0) {
      result.testimonials = {
        items: scraped.testimonials.slice(0, 5).map(t => ({
          name: t.author,
          role: t.role ?? '',
          quote: t.text,
        })),
      };
    }

    // About from scraped about text
    if (scraped?.aboutText && scraped.aboutText.length > 20) {
      result.about = {
        description: scraped.aboutText,
      };
    } else if (bi?.description) {
      result.about = {
        description: bi.description,
      };
    }

    // Team from scraped team members
    if (scraped?.teamMembers && scraped.teamMembers.length > 0) {
      result.team = {
        items: scraped.teamMembers.slice(0, 5).map(tm => ({
          title: tm.role ?? tm.name,
          description: tm.bio ?? `${tm.name} — ${tm.role}`,
          icon: 'user' as const,
        })),
      };
    }

    // Pricing from scraped prices
    if (scraped?.prices && scraped.prices.length > 0) {
      result.pricing = {
        tiers: scraped.prices.slice(0, 3).map((p, i) => ({
          name: p.name,
          price: p.price,
          period: '',
          features: [p.description ?? '', 'Core features', 'Email support'],
          highlighted: i === 1,
        })),
      };
    } else if (bi?.revenueModels && bi.revenueModels.length > 0) {
      const country = ctx.blueprint?.country;
      const currency = country === 'IN' ? '\u20B9' : '$';
      const isIN = country === 'IN';
      result.pricing = {
        tiers: bi.revenueModels.slice(0, 3).map((rm, i) => ({
          name: rm.name,
          price: i === 2 ? 'Custom' : isIN ? `${currency}${(i + 1) * 499}` : `${currency}${(i + 1) * 29}`,
          period: i === 2 ? '' : isIN ? '/mo' : '/month',
          features: [rm.description, 'Core features', 'Email support'],
          highlighted: i === 1,
        })),
      };
    }

    // Vocabulary from BI
    if (bi?.vocabulary) {
      result.vocabulary = bi.vocabulary;
    }

    return result;
  }
}
