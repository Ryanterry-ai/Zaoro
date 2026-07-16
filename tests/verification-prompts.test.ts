import { describe, it, expect } from 'vitest';
import { buildBREContext } from '../src/bos/intake-parser.js';
import { classify } from '../src/bos/reasoning/application-family-classifier.js';
import { Scorer, shouldUseNoPattern } from '../src/bos/reasoning/scorer.js';
import { PATTERNS, DESIGN_PROFILES } from '../src/bos/knowledge/registry.js';
import { RulesEngine } from '../src/bos/reasoning/rules-engine.js';

async function reason(prompt: string) {
  const ctx = await buildBREContext(prompt);
  const appFamily = classify(prompt, ctx);
  ctx.appFamilyResult = appFamily;

  const engine = new RulesEngine();
  const decisions = engine.evaluate(ctx);

  const scorer = new Scorer();
  const scoredPatterns = scorer.scorePatterns({
    industry: ctx.industry,
    subIndustry: ctx.subIndustry,
    description: ctx.description,
    businessModels: ctx.businessModels,
    capabilities: ctx.capabilities,
    decisions,
    designProfiles: DESIGN_PROFILES,
    patterns: PATTERNS,
  });
  const topPattern = scorer.selectBest(scoredPatterns);
  const useNoPattern = shouldUseNoPattern(topPattern, appFamily);

  return { ctx, appFamily, decisions, topPattern, useNoPattern, scoredPatterns };
}

describe('Verification: Productivity tools → pattern-based compilation', () => {
  it('task tracker → productivity-tool, uses Task & Project Management pattern', async () => {
    const { appFamily, useNoPattern, topPattern } = await reason('Build a simple task tracker');
    expect(appFamily.family).toBe('productivity-tool');
    expect(appFamily.appType).toBe('task-tracker');
    expect(appFamily.primaryEntity).toBe('Task');
    expect(useNoPattern).toBe(false);
    expect(topPattern).toBeDefined();
    expect(topPattern!.name).toMatch(/Task|Project/);
  });

  it('habit tracker → productivity-tool, uses pattern', async () => {
    const { appFamily, useNoPattern, topPattern } = await reason('Build a habit tracker app');
    expect(appFamily.family).toBe('productivity-tool');
    expect(appFamily.appType).toBe('habit-tracker');
    expect(useNoPattern).toBe(false);
    expect(topPattern).toBeDefined();
  });

  it('note taking app → productivity-tool, uses pattern', async () => {
    const { appFamily, useNoPattern, topPattern } = await reason('Build a note taking app');
    expect(appFamily.family).toBe('productivity-tool');
    expect(useNoPattern).toBe(false);
    expect(topPattern).toBeDefined();
  });
});

describe('Verification: Developer tools', () => {
  it('bug tracker → developer-tool, uses pattern', async () => {
    const { appFamily, useNoPattern, topPattern } = await reason('Build a bug tracker');
    expect(appFamily.family).toBe('developer-tool');
    expect(appFamily.appType).toBe('bug-tracker');
    expect(useNoPattern).toBe(false);
    expect(topPattern).toBeDefined();
  });

  it('issue tracker → developer-tool, uses pattern', async () => {
    const { appFamily, useNoPattern, topPattern } = await reason('Build an issue tracker');
    expect(appFamily.family).toBe('developer-tool');
    expect(useNoPattern).toBe(false);
    expect(topPattern).toBeDefined();
  });
});

describe('Verification: Data organisers', () => {
  it('recipe organiser → data-organiser, NoPattern', async () => {
    const { appFamily, useNoPattern } = await reason('Build a recipe organiser');
    expect(appFamily.family).toBe('data-organiser');
    expect(appFamily.appType).toBe('recipe-organiser');
    expect(appFamily.primaryEntity).toBe('Recipe');
    expect(useNoPattern).toBe(true);
  });
});

describe('Verification: Industry-specific → existing patterns still work', () => {
  it('gym CRM → industry-specific, uses a real pattern', async () => {
    const { appFamily, useNoPattern, topPattern } = await reason('Build a gym CRM');
    expect(appFamily.family).toBe('industry-specific');
    expect(useNoPattern).toBe(false);
    expect(topPattern).toBeDefined();
  });

  it('hospital ERP → industry-specific, uses HOSPITAL_MANAGEMENT pattern', async () => {
    const { appFamily, useNoPattern, topPattern } = await reason('Build a hospital ERP');
    expect(appFamily.family).toBe('industry-specific');
    expect(useNoPattern).toBe(false);
    expect(topPattern).toBeDefined();
    const patternName = topPattern!.name.toLowerCase();
    expect(patternName).toMatch(/hospital|healthcare|medical/);
  });

  it('restaurant POS → industry-specific, uses restaurant pattern', async () => {
    const { appFamily, useNoPattern, ctx } = await reason('Build a restaurant POS');
    expect(appFamily.family).toBe('industry-specific');
    expect(ctx.industry).toMatch(/restaurant/);
    expect(useNoPattern).toBe(false);
  });

  it('ecommerce store → commerce family, uses ecommerce pattern', async () => {
    const { appFamily, useNoPattern, topPattern } = await reason('Build an ecommerce store');
    expect(appFamily.family).toBe('commerce');
    expect(useNoPattern).toBe(false);
    expect(topPattern).toBeDefined();
  });

  it('LMS → industry-specific, uses education/LMS pattern', async () => {
    const { ctx, topPattern, useNoPattern } = await reason('Build an LMS for our school');
    expect(ctx.industry).toMatch(/education/);
    expect(useNoPattern).toBe(false);
    expect(topPattern).toBeDefined();
  });
});

describe('Verification: No regression on working prompts', () => {
  const workingPrompts = [
    'Build a dental clinic website',
    'Build a fitness gym membership platform',
    'Build a restaurant reservation system',
    'Build a supplement ecommerce store',
    'Build a real estate listing website',
    'Build a SaaS analytics dashboard',
  ];

  for (const prompt of workingPrompts) {
    it(`"${prompt}" — still produces a real pattern (not NoPattern)`, async () => {
      const { useNoPattern, topPattern } = await reason(prompt);
      expect(useNoPattern).toBe(false);
      expect(topPattern).toBeDefined();
      expect(topPattern!.score).toBeGreaterThan(30);
    });
  }
});
