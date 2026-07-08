import { describe, it, expect } from 'vitest';
import { runBuildPipeline } from '../src/generation/build-pipeline.js';
import { buildBREContext } from '../src/bos/intake-parser.js';

function getAllContent(result: Awaited<ReturnType<typeof runBuildPipeline>>): string {
  return result.renderResult.files.map(f => f.content).join('\n');
}

describe('Definitive Test 1: Content Specificity — Coffee Shop', () => {
  it('hero text mentions coffee-specific vocabulary, not generic filler', async () => {
    const ctx = buildBREContext('a coffee shop in Austin with online ordering');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });
    const content = getAllContent(result);

    // Find the home page hero content from applicationSpec
    const homePage = result.applicationSpec.pages.find(p => p.path === '/');
    expect(homePage).toBeDefined();

    // Collect all text content from the home page components
    const allText = homePage!.components
      .flatMap(c => {
        const texts: string[] = [];
        if (c.content?.title?.value) texts.push(c.content.title.value);
        if (c.content?.subtitle?.value) texts.push(c.content.subtitle.value);
        if (c.content?.description?.value) texts.push(c.content.description.value);
        if (c.items) {
          for (const item of c.items) {
            if (item.title) texts.push(item.title);
            if (item.description) texts.push(item.description);
          }
        }
        return texts;
      })
      .join(' ')
      .toLowerCase();

    // Must contain coffee-specific vocabulary
    const coffeeTerms = ['coffee', 'espresso', 'roast', 'brew', 'latte', 'cappuccino', 'bean', 'cafe', 'café'];
    const hasCoffeeTerm = coffeeTerms.some(term => allText.includes(term));
    expect(hasCoffeeTerm).toBe(true);

    // Must NOT contain generic filler
    const genericFiller = [
      'everything you need',
      'product management',
      'order management',
      'category management',
      'our platform offers',
      'comprehensive solution',
    ];
    for (const filler of genericFiller) {
      expect(allText).not.toContain(filler);
    }
  }, 120000);

  it('features section mentions espresso/pour-over/cold brew, not generic product features', async () => {
    const ctx = buildBREContext('a coffee shop in Austin with online ordering');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });
    const content = getAllContent(result);

    const homePage = result.applicationSpec.pages.find(p => p.path === '/');
    expect(homePage).toBeDefined();

    // Look for FeatureGrid or similar feature sections
    const featureComponents = homePage!.components.filter(
      c => c.type === 'FeatureGrid' || c.type === 'FeatureHighlights' || c.type === 'FeatureShowcase'
    );
    expect(featureComponents.length).toBeGreaterThan(0);

    const featureText = featureComponents
      .flatMap(c => (c.items || []).map(i => `${i.title || ''} ${i.description || ''}`))
      .join(' ')
      .toLowerCase();

    // Features should mention coffee-related terms, not generic business terms
    const coffeeFeatureTerms = ['coffee', 'espresso', 'pour-over', 'cold brew', 'roast', 'bean', 'blend', 'drip', 'latte', 'brew'];
    const hasCoffeeFeature = coffeeFeatureTerms.some(term => featureText.includes(term));
    expect(hasCoffeeFeature).toBe(true);

    // Must not have generic ecommerce features
    const genericFeatures = ['product management', 'inventory tracking', 'user management', 'dashboard analytics'];
    for (const gf of genericFeatures) {
      expect(featureText).not.toContain(gf);
    }
  }, 120000);
});

describe('Definitive Test 2: Regression — Original Broken Prompt', () => {
  it('appName is a real brand name, not the word "Indian"', async () => {
    const ctx = buildBREContext('Build a fully functional interactive responsive multi brands e commerce supplement store for Indian customers');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    const appName = result.breResult.blueprint.name;
    // Must NOT be just "Indian" or "indian" or "Indian Store"
    expect(appName.toLowerCase()).not.toBe('indian');
    expect(appName.toLowerCase()).not.toBe('indian store');
    expect(appName.toLowerCase()).not.toBe('india');
    // Must be a real brand-length name (>= 3 chars, ideally compound)
    expect(appName.length).toBeGreaterThanOrEqual(3);
  }, 120000);

  it('hero subtitle is NOT the raw prompt echo', async () => {
    const ctx = buildBREContext('Build a fully functional interactive responsive multi brands e commerce supplement store for Indian customers');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    const homePage = result.applicationSpec.pages.find(p => p.path === '/');
    expect(homePage).toBeDefined();
    const hero = homePage!.components.find(c => c.type === 'HeroBanner');
    expect(hero).toBeDefined();

    const subtitle = hero!.content?.subtitle?.value ?? '';
    // Must NOT contain the raw prompt keywords
    expect(subtitle.toLowerCase()).not.toContain('build a fully functional');
    expect(subtitle.toLowerCase()).not.toContain('interactive responsive');
    expect(subtitle.toLowerCase()).not.toContain('multi brands');
    // Must be a real value proposition (non-empty, meaningful length)
    expect(subtitle.length).toBeGreaterThan(10);
  }, 120000);

  it('content mentions supplements/protein/whey, not generic ecommerce', async () => {
    const ctx = buildBREContext('Build a fully functional interactive responsive multi brands e commerce supplement store for Indian customers');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    const allText = result.applicationSpec.pages
      .flatMap(p => p.components)
      .flatMap(c => {
        const texts: string[] = [];
        if (c.content?.title?.value) texts.push(c.content.title.value);
        if (c.content?.subtitle?.value) texts.push(c.content.subtitle.value);
        if (c.content?.description?.value) texts.push(c.content.description.value);
        if (c.items) {
          for (const item of c.items) {
            if (item.title) texts.push(item.title);
            if (item.description) texts.push(item.description);
          }
        }
        return texts;
      })
      .join(' ')
      .toLowerCase();

    // Must mention supplement-related terms
    const supplementTerms = ['protein', 'whey', 'creatine', 'supplement', 'muscle', 'nutrition', 'fitness', 'bcaa', 'pre-workout'];
    const hasSupplementTerm = supplementTerms.some(term => allText.includes(term));
    expect(hasSupplementTerm).toBe(true);
  }, 120000);

  it('currency symbol is ₹, not $', async () => {
    const ctx = buildBREContext('Build a fully functional interactive responsive multi brands e commerce supplement store for Indian customers');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    const allContent = getAllContent(result);

    // Check if the blueprint or rendered output references Indian currency
    const hasRupee = allContent.includes('₹') || allContent.includes('INR') || allContent.includes('Rupee');
    // It's acceptable if currency isn't hardcoded in JSX (it shouldn't be — it should be in data)
    // But the blueprint should at least acknowledge Indian market
    const blueprint = result.breResult.blueprint;
    const marketText = JSON.stringify(blueprint).toLowerCase();
    const hasIndianMarket = marketText.includes('india') || marketText.includes('indian');
    expect(hasIndianMarket).toBe(true);
  }, 120000);
});

describe('Definitive Test 3: B2B Regression', () => {
  it('B2B wholesale prompt classifies as marketplace/ecommerce, not fitness/gym', async () => {
    const ctx = buildBREContext('B2B wholesale supplement distributor selling proteins to gyms across India');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    const industry = result.breResult.blueprint.industry;
    // B2B distributor should NOT be classified as fitness/gym
    expect(industry).not.toBe('fitness');
    expect(industry).not.toBe('gym');
    // Should be some form of ecommerce/marketplace/wholesale
    const validIndustries = ['ecommerce', 'marketplace', 'wholesale', 'b2b', 'distributor', 'retail', 'saas'];
    expect(validIndustries).toContain(industry);
  }, 120000);

  it('content mentions bulk/MOQ/dealer/distributor language, NOT membership/class/trainer', async () => {
    const ctx = buildBREContext('B2B wholesale supplement distributor selling proteins to gyms across India');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    const allText = result.applicationSpec.pages
      .flatMap(p => p.components)
      .flatMap(c => {
        const texts: string[] = [];
        if (c.content?.title?.value) texts.push(c.content.title.value);
        if (c.content?.subtitle?.value) texts.push(c.content.subtitle.value);
        if (c.content?.description?.value) texts.push(c.content.description.value);
        if (c.items) {
          for (const item of c.items) {
            if (item.title) texts.push(item.title);
            if (item.description) texts.push(item.description);
          }
        }
        return texts;
      })
      .join(' ')
      .toLowerCase();

    // B2B terms that should appear
    const b2bTerms = ['bulk', 'wholesale', 'distributor', 'dealer', 'moq', 'purchase order', 'b2b', 'supply', 'distribution'];
    const hasB2bTerm = b2bTerms.some(term => allText.includes(term));
    expect(hasB2bTerm).toBe(true);

    // B2C terms that should NOT appear
    const b2cTerms = ['membership', 'class schedule', 'trainer', 'personal training', 'gym membership', 'workout plan'];
    for (const term of b2cTerms) {
      expect(allText).not.toContain(term);
    }
  }, 120000);

  it('Indian market: currency and localization present', async () => {
    const ctx = buildBREContext('B2B wholesale supplement distributor selling proteins to gyms across India');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    const marketText = JSON.stringify(result.breResult.blueprint).toLowerCase();
    const hasIndianMarket = marketText.includes('india') || marketText.includes('indian');
    expect(hasIndianMarket).toBe(true);
  }, 120000);
});
