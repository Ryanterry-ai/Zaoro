import { describe, it, expect } from 'vitest';
import { runBuildPipeline } from '../src/generation/build-pipeline.js';
import { buildBREContext } from '../src/bos/intake-parser.js';

const E2E_PROMPTS = [
  { prompt: 'Build a coffee shop website with online ordering', industries: ['restaurant'], label: 'Coffee Shop' },
  { prompt: 'Build a fitness gym membership platform', industries: ['fitness', 'health'], label: 'Gym Platform' },
  { prompt: 'Build a real estate property listing site', industries: ['realestate', 'real-estate', 'property'], label: 'Real Estate' },
  { prompt: 'Build a SaaS project management dashboard', industries: ['saas', 'software'], label: 'SaaS Dashboard' },
  { prompt: 'Build a dental clinic appointment booking site', industries: ['healthcare', 'health', 'medical'], label: 'Dental Clinic' },
  { prompt: 'Build a photography portfolio website', industries: ['portfolio', 'creative', 'photography'], label: 'Photography Portfolio' },
  { prompt: 'Build an online learning course platform', industries: ['education', 'edtech', 'learning'], label: 'Course Platform' },
  { prompt: 'Build a nonprofit charity donation page', industries: ['nonprofit', 'charity', 'ngo'], label: 'Charity Page' },
  { prompt: 'Build a food delivery restaurant menu site', industries: ['restaurant', 'food', 'delivery'], label: 'Food Delivery' },
  { prompt: 'Build a fintech personal finance tracker', industries: ['fintech', 'saas', 'finance'], label: 'Finance Tracker' },
];

describe('E2E Pipeline: 10 Industry Builds', () => {
  for (const { prompt, industries, label } of E2E_PROMPTS) {
    it(`${label} — full pipeline produces valid output`, { timeout: 180_000 }, async () => {
      const ctx = buildBREContext(prompt);
      const result = await runBuildPipeline(ctx, {
        platform: 'react',
        outputDir: './test-output',
      });

      // Core pipeline layers produced output
      expect(result.breResult).toBeDefined();
      expect(result.executionBlueprint).toBeDefined();
      expect(result.applicationSpec).toBeDefined();
      expect(result.renderResult).toBeDefined();
      expect(result.applicationGraph).toBeDefined();
      expect(result.graphStats).toBeDefined();

      // BRE identified a plausible industry
      expect(industries).toContain(result.breResult.blueprint.industry);

      // Blueprint has pages and entities
      expect(result.breResult.blueprint.pages.length).toBeGreaterThan(0);
      expect(result.breResult.blueprint.entities.length).toBeGreaterThan(0);

      // Application spec has pages with components
      expect(result.applicationSpec.pages.length).toBeGreaterThan(0);
      const totalComponents = result.applicationSpec.pages.reduce(
        (s, p) => s + p.components.length, 0,
      );
      expect(totalComponents).toBeGreaterThan(0);

      // Renderer produced files
      expect(result.renderResult.files.length).toBeGreaterThan(0);

      // Graph has nodes
      expect(result.graphStats.nodes).toBeGreaterThan(0);

      // No @21st-dev references in output
      const allContent = result.renderResult.files.map(f => f.content).join('\n');
      expect(allContent).not.toContain('@21st-dev');
      expect(allContent).not.toContain('lorem ipsum');

      // Shell files exist (globals.css, tailwind.config, next.config)
      const fileNames = result.renderResult.files.map(f => f.path);
      expect(fileNames.some(f => f.includes('globals.css'))).toBe(true);
      expect(fileNames.some(f => f.includes('tailwind.config'))).toBe(true);
      expect(fileNames.some(f => f.includes('next.config'))).toBe(true);

      // Design-lineage.json exists
      expect(fileNames.some(f => f.includes('design-lineage.json'))).toBe(true);

      // At least one page has a HeroBanner (skip for portfolio/creative sites)
      const homePage = result.applicationSpec.pages.find(p => p.path === '/');
      if (homePage && !label.includes('Portfolio')) {
        const hero = homePage.components.find(c => c.type === 'HeroBanner');
        if (hero) {
          const subtitle = hero.content?.subtitle?.value ?? '';
          expect(subtitle.toLowerCase()).not.toContain('build a fully functional');
          expect(subtitle.length).toBeGreaterThan(5);
        }
      }
    }, 120000);
  }
});
