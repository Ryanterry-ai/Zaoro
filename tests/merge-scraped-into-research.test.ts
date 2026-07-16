import { describe, it, expect } from 'vitest';
import { mergeScrapedIntoResearch } from '../src/bos/intake-parser.js';
import type { BREContext } from '../src/bos/reasoning/rules-engine.js';
import type { ScrapedContent } from '../src/bos/types.js';

function makeContext(overrides?: Partial<BREContext>): BREContext {
  return {
    industry: 'ecommerce',
    businessModels: ['direct-sales'],
    capabilities: ['commerce', 'payments'],
    journeys: ['visitor', 'customer'],
    entities: ['Product', 'Order'],
    compliancePacks: [],
    businessResearch: {
      businessType: 'online-store',
      industry: 'ecommerce',
      subIndustry: 'ecommerce',
      domain: 'ecommerce',
      userPersonas: [],
      customerFlow: [],
      revenueFlow: [],
      paymentMethods: [],
      businessWorkflow: [],
      kpis: [],
      vocabulary: {},
      referenceUrls: [],
      realProducts: [],
      realTestimonials: [],
    },
    ...overrides,
  };
}

function makeScraped(overrides?: Partial<ScrapedContent>): ScrapedContent {
  return {
    heroHeadline: 'Premium Office Supplies for Businesses',
    aboutText: 'We are a trusted wholesale distributor of office supplies.',
    contactAddress: '123 Business Park, Austin, TX',
    productSpecs: ['Paper A4 reams', 'Ballpoint pens bulk', 'Sticky notes 12-pack'],
    prices: [
      { name: 'Paper A4 Ream', price: '$4.99', description: '500 sheets, 80gsm' },
      { name: 'Ballpoint Pens (100)', price: '$12.99', description: 'Blue ink, medium tip' },
      { name: 'Sticky Notes 12-Pack', price: '$8.49', description: 'Assorted colors, 3x3 inch' },
    ],
    teamMembers: [
      { name: 'John Smith', role: 'Account Manager', bio: '10 years in B2B sales' },
    ],
    testimonials: [
      { text: 'Great bulk pricing and fast delivery.', author: 'Sarah K.', role: 'Procurement Manager' },
      { text: 'Reliable supplier for our office needs.', author: 'Mike R.', role: 'Office Manager' },
    ],
    sourceUrl: 'https://example-office-supplies.com',
    scrapedAt: Date.now(),
    ...overrides,
  };
}

describe('mergeScrapedIntoResearch', () => {
  it('should populate realProducts from scraped prices', () => {
    const ctx = makeContext();
    const scraped = makeScraped();

    mergeScrapedIntoResearch(ctx, scraped);

    expect(ctx.businessResearch!.realProducts).toHaveLength(3);
    expect(ctx.businessResearch!.realProducts[0]).toEqual({
      name: 'Paper A4 Ream',
      price: '$4.99',
      description: '500 sheets, 80gsm',
    });
    expect(ctx.businessResearch!.realProducts[1]).toEqual({
      name: 'Ballpoint Pens (100)',
      price: '$12.99',
      description: 'Blue ink, medium tip',
    });
  });

  it('should populate realTestimonials from scraped testimonials', () => {
    const ctx = makeContext();
    const scraped = makeScraped();

    mergeScrapedIntoResearch(ctx, scraped);

    expect(ctx.businessResearch!.realTestimonials).toHaveLength(2);
    expect(ctx.businessResearch!.realTestimonials[0]).toEqual({
      text: 'Great bulk pricing and fast delivery.',
      author: 'Sarah K.',
      role: 'Procurement Manager',
    });
  });

  it('should store scrapedContent on businessResearch', () => {
    const ctx = makeContext();
    const scraped = makeScraped();

    mergeScrapedIntoResearch(ctx, scraped);

    expect(ctx.businessResearch!.scrapedContent).toBe(scraped);
    expect(ctx.businessResearch!.scrapedContent!.sourceUrl).toBe('https://example-office-supplies.com');
  });

  it('should handle empty prices and testimonials gracefully', () => {
    const ctx = makeContext();
    const scraped = makeScraped({ prices: [], testimonials: [] });

    mergeScrapedIntoResearch(ctx, scraped);

    expect(ctx.businessResearch!.realProducts).toHaveLength(0);
    expect(ctx.businessResearch!.realTestimonials).toHaveLength(0);
  });

  it('should detect currency from scraped prices (rupee)', () => {
    const ctx = makeContext();
    const scraped = makeScraped({
      prices: [
        { name: 'Whey Protein', price: '₹1,299', description: '2kg' },
        { name: 'Creatine', price: 'Rs 499', description: '500g' },
      ],
    });

    mergeScrapedIntoResearch(ctx, scraped);

    expect(ctx.businessResearch!.vocabulary.currency).toBe('INR');
    expect(ctx.businessResearch!.vocabulary.currencySymbol).toBe('₹');
  });

  it('should detect customer term from scraped text', () => {
    const ctx = makeContext();
    const scraped = makeScraped({
      aboutText: 'We help gym members find the right supplements for their training goals.',
      testimonials: [
        { text: 'Great products!', author: 'Coach Dave', role: 'Gym owner' },
      ],
    });

    mergeScrapedIntoResearch(ctx, scraped);

    expect(ctx.businessResearch!.vocabulary.customerTerm).toBe('member');
  });

  it('should not mutate context if businessResearch is undefined', () => {
    const ctx = makeContext({ businessResearch: undefined });
    const scraped = makeScraped();

    // Should not throw
    mergeScrapedIntoResearch(ctx, scraped);

    expect(ctx.businessResearch).toBeUndefined();
  });
});
