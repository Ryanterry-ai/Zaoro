/**
 * DomainDataProvider — industry-specific fallback content from domain-data.ts.
 *
 * When scraped content is empty and other providers don't have enough
 * industry-specific content, this provider fills in with pre-built
 * domain data (hero, features, testimonials, stats, CTA, team).
 *
 * Priority: 5 (lowest — only fills gaps left by higher-priority providers).
 * BUT: provides the richest industry-specific seed data for stats and testimonials.
 */

import type { ContentProvider, ContentBag, ProviderContext } from './interfaces.js';
import { getDomainData, type DomainMockData } from '../../generation/domain-data.js';
import { resolveDomainImages } from '../../generation/image-resolver.js';

// ─── Industry-Specific Seed Data ─────────────────────────────────────────────

const INDUSTRY_STATS: Record<string, Array<{ label: string; value: string; trend: 'up' | 'down' | 'neutral' }>> = {
  restaurant: [
    { label: 'Happy Customers', value: '2,400+', trend: 'up' },
    { label: 'Menu Items', value: '85+', trend: 'up' },
    { label: 'Daily Orders', value: '320+', trend: 'up' },
    { label: 'Years Serving', value: '8+', trend: 'neutral' },
  ],
  saas: [
    { label: 'Active Users', value: '12,400', trend: 'up' },
    { label: 'Uptime', value: '99.9%', trend: 'neutral' },
    { label: 'Integrations', value: '120+', trend: 'up' },
    { label: 'Support Response', value: '< 2h', trend: 'up' },
  ],
  ecommerce: [
    { label: 'Products', value: '5,000+', trend: 'up' },
    { label: 'Orders Delivered', value: '48,000+', trend: 'up' },
    { label: 'Happy Customers', value: '18,500+', trend: 'up' },
    { label: 'Avg Rating', value: '4.8 / 5', trend: 'neutral' },
  ],
  fitness: [
    { label: 'Active Members', value: '1,200+', trend: 'up' },
    { label: 'Weekly Classes', value: '60+', trend: 'up' },
    { label: 'Certified Trainers', value: '24', trend: 'up' },
    { label: 'Transformations', value: '850+', trend: 'neutral' },
  ],
  healthcare: [
    { label: 'Patients Served', value: '8,500+', trend: 'up' },
    { label: 'Years of Care', value: '15+', trend: 'neutral' },
    { label: 'Specialists', value: '32', trend: 'up' },
    { label: 'Patient Satisfaction', value: '98%', trend: 'up' },
  ],
  realestate: [
    { label: 'Properties Sold', value: '1,200+', trend: 'up' },
    { label: 'Happy Clients', value: '980+', trend: 'up' },
    { label: 'Years Experience', value: '12+', trend: 'neutral' },
    { label: 'Market Value', value: '$450M+', trend: 'up' },
  ],
};

const INDUSTRY_TESTIMONIALS: Record<string, Array<{ name: string; role: string; quote: string }>> = {
  restaurant: [
    { name: 'Sarah M.', role: 'Regular Customer', quote: 'Best coffee in Austin — I come here every morning before work. The pour-over is exceptional.' },
    { name: 'James K.', role: 'Food Blogger', quote: 'The pastries are baked fresh daily and the staff genuinely care about your experience.' },
    { name: 'Priya R.', role: 'Local Resident', quote: 'Neighborhood gem. Cozy atmosphere, great WiFi, and the best flat white I have ever had.' },
  ],
  saas: [
    { name: 'Alex Chen', role: 'CTO, TechStartup', quote: 'Cut our deployment time by 60%. The API is clean, the docs are excellent, and support is fast.' },
    { name: 'Maria Santos', role: 'Product Manager', quote: 'Finally a tool that the whole team actually uses. Onboarding took 20 minutes.' },
    { name: 'David Park', role: 'Engineering Lead', quote: 'Reliability is unmatched. 99.9% uptime in 18 months with zero incidents on our end.' },
  ],
  ecommerce: [
    { name: 'Emma L.', role: 'Verified Buyer', quote: 'Order arrived next day, product exactly as described, and returns are hassle-free.' },
    { name: 'Raj K.', role: 'Repeat Customer', quote: 'Been ordering monthly for 2 years. Quality never drops and prices are consistently fair.' },
    { name: 'Sophie T.', role: 'First-time Buyer', quote: 'Was nervous about buying online but the experience was seamless from browse to doorstep.' },
  ],
  fitness: [
    { name: 'Marcus T.', role: 'Member since 2022', quote: 'Lost 18kg in 6 months with the personal training program. The coaches actually care.' },
    { name: 'Lisa W.', role: 'Yoga Class Member', quote: 'The morning yoga classes changed my life. Flexible booking makes it easy to stay consistent.' },
    { name: 'Carlos R.', role: 'CrossFit Member', quote: 'Best gym community I have been part of. Equipment is top-notch and always clean.' },
  ],
  healthcare: [
    { name: 'Robert J.', role: 'Patient', quote: 'The doctors here truly listen. My treatment plan was explained clearly and results were excellent.' },
    { name: 'Amanda S.', role: 'Parent', quote: 'Took my kids here for their checkups. The staff made them feel comfortable and at ease.' },
    { name: 'Michael L.', role: 'Long-term Patient', quote: 'Been coming here for 5 years. Consistent quality care and minimal wait times.' },
  ],
  realestate: [
    { name: 'Jennifer H.', role: 'Home Buyer', quote: 'Found our dream home in just 2 weeks. The agent knew exactly what we were looking for.' },
    { name: 'Tom & Lisa M.', role: 'First-time Buyers', quote: 'Made the entire process stress-free. Great communication and negotiation skills.' },
    { name: 'David K.', role: 'Property Investor', quote: 'Excellent market knowledge. Helped me identify properties with the best ROI potential.' },
  ],
};

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
    const industry = ctx.blueprint.industry ?? 'general';

    // Get industry-specific seed data
    const stats = INDUSTRY_STATS[industry] ?? [
      { label: 'Customers Served', value: '5,000+', trend: 'up' as const },
      { label: 'Years in Business', value: '10+', trend: 'neutral' as const },
      { label: 'Team Members', value: '50+', trend: 'up' as const },
      { label: 'Satisfaction Rate', value: '97%', trend: 'up' as const },
    ];

    const testimonials = INDUSTRY_TESTIMONIALS[industry] ?? [
      { name: 'Alex Johnson', role: 'Customer', quote: 'Outstanding service and quality. Highly recommend to anyone looking for the best.' },
      { name: 'Sam Williams', role: 'Returning Client', quote: 'Consistent excellence every single time. My go-to choice for years.' },
      { name: 'Jordan Lee', role: 'Verified Review', quote: 'Exceeded expectations. The team went above and beyond to deliver a great experience.' },
    ];

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
        items: testimonials.map(t => ({
          name: t.name,
          role: t.role,
          quote: t.quote,
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
        items: stats.map(s => ({
          label: s.label,
          value: s.value,
          trend: s.trend,
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
      products: {
        items: (() => {
          const items = (data as any).items ?? [];
          if (items.length === 0) return [];
          
          // Resolve images for products
          const images = resolveDomainImages(
            data.imageKeywords ?? [],
            items.length,
            0, // team count not needed for products
          );
          
          return items.map((item: any, i: number) => ({
            name: item.name,
            description: item.description,
            price: item.price,
            tag: item.tag,
            rating: item.rating,
            reviews: item.reviews,
            emoji: item.emoji,
            details: item.details,
            image: images.items[i % images.items.length],
          }));
        })(),
      },
    };
  }
}
