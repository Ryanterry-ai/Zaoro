import { describe, it, expect } from 'vitest';
import { detectDomain } from '../src/generation/domain-detector.js';
import type { BusinessKnowledge } from '../src/orchestration/business-intelligence/types.js';

function makeBK(overrides: {
  industry: string;
  subIndustry?: string;
  workflows?: string[];
  vocabulary?: Record<string, string>;
}): BusinessKnowledge {
  return {
    version: '1.0.0',
    sources: [],
    discovery: {
      intent: 'test',
      businessType: overrides.industry,
      industry: overrides.industry,
      subIndustry: overrides.subIndustry,
      domain: overrides.industry,
      signals: [],
    },
    customerPersonas: [],
    businessPersonas: [],
    userRoles: [],
    customerJourney: { stages: [], loops: [] },
    workflows: (overrides.workflows ?? []).map(kind => ({
      id: kind,
      kind,
      scope: 'customer' as const,
      description: '',
      steps: [],
      automationCandidate: false,
    })),
    revenue: { model: 'unknown', source: 'unknown', pricing: { structure: 'flat' }, payment: { methods: [], steps: [], considerations: [] }, currency: 'USD' },
    acquisition: [],
    retention: { strategy: 'none', mechanisms: [] },
    compliance: [],
    kpis: [],
    entities: [],
    relationships: [],
    pages: [],
    dashboards: [],
    automations: [],
    integrations: [],
    vocabulary: { terms: overrides.vocabulary ?? {}, domainNouns: [], tone: [] },
    contentStrategy: { pillars: [], formats: [], cadence: '', voice: '' },
    designStrategy: { direction: 'modern', density: 'balanced', emphasis: [] },
    experienceGoals: { arc: [], interactionDensity: 'moderate', motionLanguage: [], perStage: {} },
  };
}

describe('detectDomain', () => {
  it('should detect real-estate from keywords', () => {
    const ctx = detectDomain(makeBK({ industry: 'realestate', subIndustry: 'luxury' }), 'We are a luxury real estate agency selling premium properties');
    expect(ctx.industry).toBe('realestate');
    expect(ctx.subIndustry).toBe('luxury');
    expect(ctx.colorHint).toBe('emerald');
    expect(ctx.suggestedSections).toContain('featured-properties');
  });

  it('should detect dental practice', () => {
    const ctx = detectDomain(makeBK({ industry: 'healthcare', subIndustry: 'dental' }), 'Modern dental clinic with teeth whitening and orthodontics');
    expect(ctx.industry).toBe('healthcare');
    expect(ctx.subIndustry).toBe('dental');
    expect(ctx.colorHint).toBe('cyan');
  });

  it('should detect coffee shop', () => {
    const ctx = detectDomain(makeBK({ industry: 'restaurant', subIndustry: 'cafe' }), 'Artisan coffee bar with specialty espresso and cold brew');
    expect(ctx.industry).toBe('restaurant');
    expect(ctx.subIndustry).toBe('cafe');
    expect(ctx.colorHint).toBe('amber');
  });

  it('should detect restaurant with fine dining sub-industry', () => {
    const ctx = detectDomain(makeBK({ industry: 'restaurant', subIndustry: 'fine_dining' }), 'Fine dining restaurant with gourmet michelin star menu');
    expect(ctx.industry).toBe('restaurant');
    expect(ctx.subIndustry).toBe('fine_dining');
    expect(ctx.colorHint).toBe('amber');
  });

  it('should detect fitness gym', () => {
    const ctx = detectDomain(makeBK({ industry: 'fitness', subIndustry: 'gym' }), 'Modern gym with personal trainers and crossfit workouts');
    expect(ctx.industry).toBe('fitness');
    expect(ctx.subIndustry).toBe('gym');
    expect(ctx.colorHint).toBe('rose');
  });

  it('should detect SaaS with CRM sub-industry', () => {
    const ctx = detectDomain(makeBK({ industry: 'saas', subIndustry: 'crm' }), 'Cloud SaaS platform for customer relationship management');
    expect(ctx.industry).toBe('saas');
    expect(ctx.subIndustry).toBe('crm');
    expect(ctx.colorHint).toBe('violet');
    expect(ctx.suggestedSections).toContain('pricing-table');
  });

  it('should detect healthcare', () => {
    const ctx = detectDomain(makeBK({ industry: 'healthcare' }), 'Medical hospital with patient care and psychology therapy');
    expect(ctx.industry).toBe('healthcare');
    expect(ctx.colorHint).toBe('cyan');
  });

  it('should detect law firm', () => {
    const ctx = detectDomain(makeBK({ industry: 'legal', subIndustry: 'corporate' }), 'Corporate law firm specializing in mergers and acquisitions');
    expect(ctx.industry).toBe('legal');
    expect(ctx.subIndustry).toBe('corporate');
    expect(ctx.colorHint).toBe('slate');
  });

  it('should detect education', () => {
    const ctx = detectDomain(makeBK({ industry: 'education', subIndustry: 'online' }), 'Online university with e-learning courses and digital curriculum');
    expect(ctx.industry).toBe('education');
    expect(ctx.subIndustry).toBe('online');
    expect(ctx.colorHint).toBe('blue');
  });

  it('should detect ecommerce with fashion sub-industry', () => {
    const ctx = detectDomain(makeBK({ industry: 'ecommerce', subIndustry: 'fashion' }), 'Ecommerce fashion shop selling clothing and apparel items');
    expect(ctx.industry).toBe('ecommerce');
    expect(ctx.subIndustry).toBe('fashion');
    expect(ctx.colorHint).toBe('orange');
  });

  it('should detect portfolio', () => {
    const ctx = detectDomain(makeBK({ industry: 'portfolio', subIndustry: 'design' }), 'Creative designer portfolio showcasing graphic and ui ux work');
    expect(ctx.industry).toBe('portfolio');
    expect(ctx.subIndustry).toBe('design');
    expect(ctx.colorHint).toBe('pink');
  });

  it('should detect agency', () => {
    const ctx = detectDomain(makeBK({ industry: 'agency', subIndustry: 'marketing' }), 'Digital marketing agency with seo and social media advertising');
    expect(ctx.industry).toBe('agency');
    expect(ctx.subIndustry).toBe('marketing');
    expect(ctx.colorHint).toBe('indigo');
  });

  it('should detect nonprofit', () => {
    const ctx = detectDomain(makeBK({ industry: 'nonprofit' }), 'Charity foundation for community volunteer impact');
    expect(ctx.industry).toBe('nonprofit');
    expect(ctx.colorHint).toBe('green');
  });

  it('should detect luxury brand with watch sub-industry', () => {
    const ctx = detectDomain(makeBK({ industry: 'luxury', subIndustry: 'watches' }), 'Swiss luxury watch brand with premium timepieces and chronographs');
    expect(ctx.industry).toBe('luxury');
    expect(ctx.subIndustry).toBe('watches');
    expect(ctx.colorHint).toBe('amber');
  });

  it('should detect premium mood from keywords (requires industry match)', () => {
    const ctx = detectDomain(makeBK({ industry: 'saas' }), 'Luxury premium elegant sophisticated exclusive saas platform');
    expect(ctx.mood).toBe('premium');
  });

  it('should detect modern mood from keywords (requires industry match)', () => {
    const ctx = detectDomain(makeBK({ industry: 'saas' }), 'SaaS platform with modern innovative futuristic sleek dashboard');
    expect(ctx.mood).toBe('modern');
  });

  it('should detect bold mood from keywords (requires industry match)', () => {
    const ctx = detectDomain(makeBK({ industry: 'restaurant' }), 'Restaurant bold striking dramatic powerful intense vibrant cuisine');
    expect(ctx.mood).toBe('bold');
  });

  it('should detect dark mood from keywords (requires industry match)', () => {
    const ctx = detectDomain(makeBK({ industry: 'luxury' }), 'Luxury dark moody noir gothic mysterious shadowy watch brand');
    expect(ctx.mood).toBe('dark');
  });

  it('should extract features from keywords', () => {
    const ctx = detectDomain(
      makeBK({ industry: 'ecommerce', workflows: ['ecommerce', 'product-gallery', 'cart'] }),
      'Online ecommerce shop with shopping and buy product',
    );
    expect(ctx.features).toContain('ecommerce');
  });

  it('should detect booking feature', () => {
    const ctx = detectDomain(
      makeBK({ industry: 'healthcare', workflows: ['booking', 'calendar'] }),
      'Business with appointment booking and calendar scheduling',
    );
    expect(ctx.features).toContain('booking');
  });

  it('should detect blog feature', () => {
    const ctx = detectDomain(
      makeBK({ industry: 'media', workflows: ['blog', 'newsletter'] }),
      'Content platform with blog articles and newsletter subscribe',
    );
    expect(ctx.features).toContain('blog');
    expect(ctx.features).toContain('newsletter');
  });

  it('should return general for unrecognized input', () => {
    const ctx = detectDomain(makeBK({ industry: 'general' }), 'xyzzy quux plugh unknown random');
    expect(ctx.industry).toBe('general');
    expect(ctx.mood).toBe('modern');
    expect(ctx.suggestedSections).toContain('hero');
  });

  it('should extract content keywords', () => {
    const ctx = detectDomain(
      makeBK({ industry: 'healthcare', subIndustry: 'dental', vocabulary: { dental: 'dental care', teeth: 'teeth whitening' } }),
      'Modern dental clinic with teeth whitening services',
    );
    expect(ctx.contentKeywords.length).toBeGreaterThan(0);
    expect(ctx.contentKeywords).toContain('dental');
  });

  it('should generate image keywords for detected industry', () => {
    const ctx = detectDomain(makeBK({ industry: 'restaurant', subIndustry: 'fine_dining' }), 'Fine dining restaurant with gourmet food menu');
    expect(ctx.imageKeywords.length).toBeGreaterThan(0);
    expect(ctx.imageKeywords.some(kw => kw.includes('dining') || kw.includes('food') || kw.includes('restaurant'))).toBe(true);
  });
});
