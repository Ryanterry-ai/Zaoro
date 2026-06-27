import { describe, it, expect } from 'vitest';
import { detectDomain } from '../src/generation/domain-detector.js';

describe('detectDomain', () => {
  it('should detect real-estate from keywords', () => {
    const ctx = detectDomain('We are a luxury real estate agency selling premium properties');
    expect(ctx.industry).toBe('real-estate');
    expect(ctx.subIndustry).toBe('luxury');
    expect(ctx.colorHint).toBe('emerald');
    expect(ctx.suggestedSections).toContain('featured-properties');
  });

  it('should detect dental practice', () => {
    const ctx = detectDomain('Modern dental clinic with teeth whitening and orthodontics');
    expect(ctx.industry).toBe('dental');
    expect(ctx.colorHint).toBe('cyan');
  });

  it('should detect coffee shop', () => {
    const ctx = detectDomain('Artisan coffee bar with specialty espresso and cold brew');
    expect(ctx.industry).toBe('coffee-shop');
    expect(ctx.colorHint).toBe('amber');
  });

  it('should detect restaurant with fine dining sub-industry', () => {
    const ctx = detectDomain('Fine dining restaurant with gourmet michelin star menu');
    expect(ctx.industry).toBe('restaurant');
    expect(ctx.subIndustry).toBe('fine_dining');
    expect(ctx.colorHint).toBe('amber');
  });

  it('should detect fitness gym', () => {
    const ctx = detectDomain('Modern gym with personal trainers and crossfit workouts');
    expect(ctx.industry).toBe('fitness');
    expect(ctx.subIndustry).toBe('gym');
    expect(ctx.colorHint).toBe('rose');
  });

  it('should detect SaaS with CRM sub-industry', () => {
    const ctx = detectDomain('Cloud SaaS platform for customer relationship management');
    expect(ctx.industry).toBe('saas');
    expect(ctx.subIndustry).toBe('crm');
    expect(ctx.colorHint).toBe('violet');
    expect(ctx.suggestedSections).toContain('pricing-table');
  });

  it('should detect healthcare', () => {
    const ctx = detectDomain('Medical hospital with patient care and psychology therapy');
    expect(ctx.industry).toBe('healthcare');
    expect(ctx.colorHint).toBe('cyan');
  });

  it('should detect law firm', () => {
    const ctx = detectDomain('Corporate law firm specializing in mergers and acquisitions');
    expect(ctx.industry).toBe('law-firm');
    expect(ctx.subIndustry).toBe('corporate');
    expect(ctx.colorHint).toBe('slate');
  });

  it('should detect education', () => {
    const ctx = detectDomain('Online university with e-learning courses and digital curriculum');
    expect(ctx.industry).toBe('education');
    expect(ctx.subIndustry).toBe('online');
    expect(ctx.colorHint).toBe('blue');
  });

  it('should detect ecommerce with fashion sub-industry', () => {
    // Use keywords that clearly match ecommerce, not saas ("app" is a substring of "apparel")
    const ctx = detectDomain('Ecommerce fashion shop selling clothing and apparel items');
    expect(ctx.industry).toBe('ecommerce');
    expect(ctx.subIndustry).toBe('fashion');
    expect(ctx.colorHint).toBe('orange');
  });

  it('should detect portfolio', () => {
    const ctx = detectDomain('Creative designer portfolio showcasing graphic and ui ux work');
    expect(ctx.industry).toBe('portfolio');
    expect(ctx.subIndustry).toBe('design');
    expect(ctx.colorHint).toBe('pink');
  });

  it('should detect agency', () => {
    const ctx = detectDomain('Digital marketing agency with seo and social media advertising');
    expect(ctx.industry).toBe('agency');
    expect(ctx.subIndustry).toBe('marketing');
    expect(ctx.colorHint).toBe('indigo');
  });

  it('should detect nonprofit', () => {
    const ctx = detectDomain('Charity foundation for community volunteer impact');
    expect(ctx.industry).toBe('nonprofit');
    expect(ctx.colorHint).toBe('green');
  });

  it('should detect luxury brand with watch sub-industry', () => {
    const ctx = detectDomain('Swiss luxury watch brand with premium timepieces and chronographs');
    expect(ctx.industry).toBe('luxury');
    expect(ctx.subIndustry).toBe('watches');
    expect(ctx.colorHint).toBe('amber');
  });

  it('should detect premium mood from keywords (requires industry match)', () => {
    const ctx = detectDomain('Luxury premium elegant sophisticated exclusive saas platform');
    expect(ctx.mood).toBe('premium');
  });

  it('should detect modern mood from keywords (requires industry match)', () => {
    const ctx = detectDomain('SaaS platform with modern innovative futuristic sleek dashboard');
    expect(ctx.mood).toBe('modern');
  });

  it('should detect bold mood from keywords (requires industry match)', () => {
    const ctx = detectDomain('Restaurant bold striking dramatic powerful intense vibrant cuisine');
    expect(ctx.mood).toBe('bold');
  });

  it('should detect dark mood from keywords (requires industry match)', () => {
    const ctx = detectDomain('Luxury dark moody noir gothic mysterious shadowy watch brand');
    expect(ctx.mood).toBe('dark');
  });

  it('should extract features from keywords', () => {
    const ctx = detectDomain('Online ecommerce shop with shopping and buy product');
    expect(ctx.features).toContain('ecommerce');
  });

  it('should detect booking feature', () => {
    const ctx = detectDomain('Business with appointment booking and calendar scheduling');
    expect(ctx.features).toContain('booking');
  });

  it('should detect blog feature', () => {
    const ctx = detectDomain('Content platform with blog articles and newsletter subscribe');
    expect(ctx.features).toContain('blog');
    expect(ctx.features).toContain('newsletter');
  });

  it('should return general for unrecognized input', () => {
    const ctx = detectDomain('xyzzy quux plugh unknown random');
    expect(ctx.industry).toBe('general');
    expect(ctx.mood).toBe('modern');
    expect(ctx.suggestedSections).toContain('hero');
  });

  it('should extract content keywords', () => {
    const ctx = detectDomain('Modern dental clinic with teeth whitening services');
    expect(ctx.contentKeywords.length).toBeGreaterThan(0);
    expect(ctx.contentKeywords).toContain('dental');
  });

  it('should generate image keywords for detected industry', () => {
    const ctx = detectDomain('Fine dining restaurant with gourmet food menu');
    expect(ctx.imageKeywords.length).toBeGreaterThan(0);
    expect(ctx.imageKeywords.some(kw => kw.includes('dining') || kw.includes('food') || kw.includes('restaurant'))).toBe(true);
  });
});
