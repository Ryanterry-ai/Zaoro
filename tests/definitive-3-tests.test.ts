import { describe, it, expect } from 'vitest';
import { runBuildPipeline } from '../src/generation/build-pipeline.js';
import { buildBREContext } from '../src/bos/intake-parser.js';

describe('Definitive Test 1 — Content Specificity (not just structure)', () => {
  it('coffee shop produces real coffee content, not generic filler', async () => {
    const ctx = buildBREContext('a coffee shop in Austin with online ordering');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    const allContent = result.renderResult.files.map(f => f.content).join('\n').toLowerCase();

    // Must mention actual coffee terms
    const coffeeTerms = ['coffee', 'espresso', 'brew', 'roast', 'bean', 'latte', 'cappuccino', 'drip'];
    const hasCoffeeContent = coffeeTerms.some(term => allContent.includes(term));
    expect(hasCoffeeContent).toBe(true);

    // Must NOT contain generic filler
    const genericPhrases = ['everything you need', 'product management', 'order management', 'category management'];
    const hasGeneric = genericPhrases.some(phrase => allContent.includes(phrase));
    expect(hasGeneric).toBe(false);

    // Must NOT contain raw prompt echo
    expect(allContent).not.toContain('build a fully functional');
    expect(allContent).not.toContain('features / everything');
  }, 120000);
});

describe('Definitive Test 2 — Original Broken Prompt (regression)', () => {
  it('supplement store for Indian customers produces correct content', async () => {
    const ctx = buildBREContext('Build a fully functional interactive responsive multi brands e commerce supplement store for Indian customers');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    // App name must NOT be just "Indian"
    const appName = result.breResult.blueprint.name.toLowerCase();
    expect(appName).not.toBe('indian');
    expect(appName).not.toBe('indian store');
    expect(appName.length).toBeGreaterThan(2);

    // Hero subtitle must NOT echo raw prompt
    const homePage = result.applicationSpec.pages.find(p => p.path === '/');
    if (homePage) {
      const hero = homePage.components.find(c => c.type === 'HeroBanner');
      if (hero) {
        const subtitle = hero.content?.subtitle?.value?.toLowerCase() ?? '';
        expect(subtitle).not.toContain('build a fully functional');
        expect(subtitle).not.toContain('interactive responsive');
        expect(subtitle.length).toBeGreaterThan(5);
      }
    }

    // Must mention supplement content
    const allContent = result.renderResult.files.map(f => f.content).join('\n').toLowerCase();
    const supplementTerms = ['protein', 'creatine', 'whey', 'supplement', 'muscle', 'nutrition', 'fitness'];
    const hasSupplementContent = supplementTerms.some(term => allContent.includes(term));
    expect(hasSupplementContent).toBe(true);

    // Next build should succeed (no crash)
    expect(result.renderResult.files.length).toBeGreaterThan(0);
  }, 120000);
});

describe('Definitive Test 3 — B2B Regression Check', () => {
  it('B2B wholesale distributor classified correctly', async () => {
    const ctx = buildBREContext('B2B wholesale supplement distributor selling proteins to gyms across India');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    // Should NOT be classified as FITNESS_GYM
    const industry = result.breResult.blueprint.industry.toLowerCase();
    expect(industry).not.toBe('fitness');
    expect(industry).not.toBe('gym');

    // Must mention B2B/wholesale content
    const allContent = result.renderResult.files.map(f => f.content).join('\n').toLowerCase();
    const b2bTerms = ['wholesale', 'bulk', 'dealer', 'distributor', 'moq', 'purchase order', 'b2b', 'supplier'];
    const hasB2bContent = b2bTerms.some(term => allContent.includes(term));
    expect(hasB2bContent).toBe(true);

    // Must NOT contain consumer-facing content
    const consumerTerms = ['membership', 'class schedule', 'trainer booking', 'personal training'];
    const hasConsumerContent = consumerTerms.some(term => allContent.includes(term));
    expect(hasConsumerContent).toBe(false);

    // Must produce valid output
    expect(result.renderResult.files.length).toBeGreaterThan(0);
  }, 120000);
});
