/**
 * DomainDataProvider — industry-specific fallback content from domain-data.ts.
 *
 * When scraped content is empty and other providers don't have enough
 * industry-specific content, this provider fills in with pre-built
 * domain data (hero, features, testimonials, stats, CTA, team).
 *
 * Priority: 5 (lowest — only fills gaps left by higher-priority providers).
 */

import type { ContentProvider, ContentBag, ProviderContext } from './interfaces.js';
import { getDomainData, type DomainMockData } from '../../generation/domain-data.js';

function lookupDomainData(ctx: ProviderContext): DomainMockData {
  const industry = ctx.blueprint.industry ?? 'general';
  return getDomainData(industry, ctx.subCategory);
}

export class DomainDataProvider implements ContentProvider {
  readonly name = 'domain-data';
  readonly priority = 5;

  canProvide(_ctx: ProviderContext): boolean {
    return true;
  }

  provide(ctx: ProviderContext): ContentBag {
    const data = lookupDomainData(ctx);

    return {
      hero: {
        badge: data.hero.badge,
        title: data.hero.headline,
        subtitle: data.hero.subtitle,
        actions: [
          { label: data.hero.cta, action: '#features', style: 'primary' as const },
          ...(data.hero.ctaSecondary ? [{ label: data.hero.ctaSecondary, action: '#contact', style: 'ghost' as const }] : []),
        ],
      },
      features: {
        title: 'Features',
        subtitle: 'What we offer',
        items: data.features.map(f => ({
          title: f.title,
          description: f.description,
          icon: f.iconKeyword ?? 'zap',
        })),
      },
      testimonials: {
        items: data.testimonials.map(t => ({
          name: t.name,
          role: t.role,
          quote: t.text,
        })),
      },
      about: {
        title: `About ${ctx.blueprint.name ?? 'Us'}`,
        description: data.hero.subtitle,
        items: data.services?.map(s => ({
          title: s.name,
          description: s.description,
          icon: 'zap',
        })),
      },
      stats: {
        items: data.stats.map(s => ({
          label: s.label,
          value: s.value,
          trend: 'neutral' as const,
        })),
      },
      cta: {
        title: data.cta.headline,
        subtitle: data.cta.subtitle,
        actions: [
          { label: data.cta.button, action: '#contact', style: 'primary' as const },
        ],
      },
      team: {
        items: data.team.map(t => ({
          title: t.name,
          description: `${t.role} — ${t.bio}`,
          icon: 'users',
        })),
      },
    };
  }
}
