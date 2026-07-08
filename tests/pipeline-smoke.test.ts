import { describe, it, expect } from 'vitest';
import { runBuildPipeline } from '../src/generation/build-pipeline.js';
import { buildBREContext } from '../src/bos/intake-parser.js';

describe('Pipeline Smoke: Supplement Store', () => {
  it('produces valid output with all layers', async () => {
    const ctx = buildBREContext('Build a fully functional, interactive, responsive multi brands e commerce supplement store for Indian customers');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    expect(result.breResult).toBeDefined();
    expect(result.executionBlueprint).toBeDefined();
    expect(result.applicationSpec).toBeDefined();
    expect(result.renderResult).toBeDefined();
    expect(result.applicationGraph).toBeDefined();
    expect(result.graphStats).toBeDefined();

    expect(result.breResult.blueprint.industry).toBe('ecommerce');
    expect(result.breResult.blueprint.pages.length).toBeGreaterThan(3);
    expect(result.breResult.blueprint.entities.length).toBeGreaterThan(2);

    expect(result.executionBlueprint.pages.length).toBeGreaterThan(0);
    expect(result.applicationSpec.pages.length).toBeGreaterThan(0);
    expect(result.renderResult.files.length).toBeGreaterThan(0);
    expect(result.graphStats.nodes).toBeGreaterThan(0);
  });

  it('rendered TSX files have no placeholder content or invalid imports', async () => {
    const ctx = buildBREContext('Build a fully functional, interactive, responsive multi brands e commerce supplement store for Indian customers');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    const content = result.renderResult.files.map(f => f.content).join('\n');

    expect(content).not.toContain('@21st-dev');
    expect(content).not.toContain('21st.dev');
    expect(content).not.toContain('lorem ipsum');

    const homePage = result.applicationSpec.pages.find(p => p.path === '/');
    expect(homePage).toBeDefined();
    const hero = homePage!.components.find(c => c.type === 'HeroBanner');
    expect(hero).toBeDefined();
    const subtitle = hero!.content?.subtitle?.value ?? '';
    const buildKeywords = ['build', 'fully functional', 'interactive', 'responsive'];
    for (const kw of buildKeywords) {
      expect(subtitle.toLowerCase()).not.toContain(kw);
    }
    expect(subtitle.length).toBeGreaterThan(10);
  });

  it('rendered TSX files reference real SVG icon names', async () => {
    const ctx = buildBREContext('Build a supplement store for Indian customers');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    const appSpec = result.applicationSpec;
    for (const page of appSpec.pages) {
      for (const comp of page.components) {
        if (comp.type === 'FeatureGrid' && comp.items) {
          for (const item of comp.items) {
            expect(item.icon).toBeDefined();
            expect(item.icon?.length).toBeGreaterThan(0);
            if (item.description) {
              expect(item.description.length).toBeGreaterThan(10);
            }
          }
        }
      }
    }
  });

  it('app name is a compound word, not a single adjective', async () => {
    const adjectives = ['indian', 'local', 'modern', 'best', 'top', 'great', 'new'];
    for (const adj of adjectives) {
      const ctx = buildBREContext(`Build a ${adj} supplement store`);
      const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });
      expect(result.breResult.blueprint.name.toLowerCase()).not.toBe(adj + ' store');
      expect(result.breResult.blueprint.name.toLowerCase()).not.toBe(adj);
      expect(result.breResult.blueprint.name.length).toBeGreaterThan(2);
    }
  }, 60_000);

  it('generates all expected page types', async () => {
    const ctx = buildBREContext('Build a multi brand supplement store for Indian customers');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    const pagePaths = result.breResult.blueprint.pages.map(p => p.path);
    expect(pagePaths).toContain('/');
    expect(pagePaths).toContain('/shop');
    expect(pagePaths).toContain('/cart');
    expect(pagePaths.some(p => p.includes('product'))).toBe(true);
    expect(pagePaths).toContain('/about');
    expect(pagePaths).toContain('/contact');
  });

  it('rendered code exports default function components', async () => {
    const ctx = buildBREContext('Build a supplement store');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    for (const file of result.renderResult.files) {
      if (file.path.endsWith('.tsx')) {
        expect(file.content).toContain('export default function');
      }
    }
  });
});

describe('Pipeline Smoke: Restaurant', () => {
  it('produces valid output for restaurant domain', async () => {
    const ctx = buildBREContext('Build a restaurant called Bella Vista');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    expect(result.renderResult.files.length).toBeGreaterThan(0);
    expect(result.breResult.blueprint.pages.length).toBeGreaterThan(3);

    const allCode = result.renderResult.files.map(f => f.content).join('\n');
    expect(allCode).toContain('Bella Vista');
    expect(allCode).not.toContain('@21st-dev');
  });
});

describe('Pipeline Smoke: SaaS', () => {
  it('produces valid output for SaaS domain', async () => {
    const ctx = buildBREContext('Build a SaaS analytics platform called CloudDash');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    expect(result.renderResult.files.length).toBeGreaterThan(0);
    expect(result.breResult.blueprint.pages.length).toBeGreaterThan(3);

    const allCode = result.renderResult.files.map(f => f.content).join('\n');
    expect(allCode).not.toContain('@21st-dev');
    expect(allCode).not.toContain('lorem ipsum');
  });
});

describe('Pipeline Smoke: Fitness Gym', () => {
  it('produces valid output for fitness/gym domain', async () => {
    const ctx = buildBREContext('Build a gym membership app called FitZone');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    expect(result.renderResult.files.length).toBeGreaterThan(0);
    expect(result.breResult.blueprint.pages.length).toBeGreaterThan(3);

    const allCode = result.renderResult.files.map(f => f.content).join('\n');
    expect(allCode).not.toContain('@21st-dev');

    const homeHero = result.applicationSpec.pages.find(p => p.path === '/')
      ?.components.find(c => c.type === 'HeroBanner');
    expect(homeHero).toBeDefined();
    const subtitle = homeHero!.content?.subtitle?.value ?? '';
    const buildKeywords = ['build', 'fully functional', 'interactive', 'responsive'];
    for (const kw of buildKeywords) {
      expect(subtitle.toLowerCase()).not.toContain(kw);
    }
  });
});
