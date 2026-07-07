import { describe, it, expect } from 'vitest';
import { buildBREContext } from '../src/bos/intake-parser.js';
import { classify } from '../src/bos/reasoning/application-family-classifier.js';
import { Scorer, shouldUseNoPattern } from '../src/bos/reasoning/scorer.js';
import { PATTERNS, DESIGN_PROFILES } from '../src/bos/knowledge/registry.js';
import { RulesEngine } from '../src/bos/reasoning/rules-engine.js';

function reason(prompt: string) {
  const ctx = buildBREContext(prompt);
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

describe('Verification: Productivity tools → no CRM output', () => {
  it('task tracker → productivity-tool, NoPattern', () => {
    const { appFamily, useNoPattern } = reason('Build a simple task tracker');
    expect(appFamily.family).toBe('productivity-tool');
    expect(appFamily.appType).toBe('task-tracker');
    expect(appFamily.primaryEntity).toBe('Task');
    expect(useNoPattern).toBe(true);
  });

  it('habit tracker → productivity-tool, NoPattern', () => {
    const { appFamily, useNoPattern } = reason('Build a habit tracker app');
    expect(appFamily.family).toBe('productivity-tool');
    expect(appFamily.appType).toBe('habit-tracker');
    expect(useNoPattern).toBe(true);
  });

  it('note taking app → productivity-tool, NoPattern', () => {
    const { appFamily, useNoPattern } = reason('Build a note taking app');
    expect(appFamily.family).toBe('productivity-tool');
    expect(useNoPattern).toBe(true);
  });
});

describe('Verification: Developer tools', () => {
  it('bug tracker → developer-tool, NoPattern', () => {
    const { appFamily, useNoPattern } = reason('Build a bug tracker');
    expect(appFamily.family).toBe('developer-tool');
    expect(appFamily.appType).toBe('bug-tracker');
    expect(useNoPattern).toBe(true);
  });

  it('issue tracker → developer-tool, NoPattern', () => {
    const { appFamily, useNoPattern } = reason('Build an issue tracker');
    expect(appFamily.family).toBe('developer-tool');
    expect(useNoPattern).toBe(true);
  });
});

describe('Verification: Data organisers', () => {
  it('recipe organiser → data-organiser, NoPattern', () => {
    const { appFamily, useNoPattern } = reason('Build a recipe organiser');
    expect(appFamily.family).toBe('data-organiser');
    expect(appFamily.appType).toBe('recipe-organiser');
    expect(appFamily.primaryEntity).toBe('Recipe');
    expect(useNoPattern).toBe(true);
  });
});

describe('Verification: Industry-specific → existing patterns still work', () => {
  it('gym CRM → industry-specific, uses a real pattern', () => {
    const { appFamily, useNoPattern, topPattern } = reason('Build a gym CRM');
    expect(appFamily.family).toBe('industry-specific');
    expect(useNoPattern).toBe(false);
    expect(topPattern).toBeDefined();
  });

  it('hospital ERP → industry-specific, uses HOSPITAL_MANAGEMENT pattern', () => {
    const { appFamily, useNoPattern, topPattern } = reason('Build a hospital ERP');
    expect(appFamily.family).toBe('industry-specific');
    expect(useNoPattern).toBe(false);
    expect(topPattern).toBeDefined();
    const patternName = topPattern!.name.toLowerCase();
    expect(patternName).toMatch(/hospital|healthcare|medical/);
  });

  it('restaurant POS → industry-specific, uses restaurant pattern', () => {
    const { appFamily, useNoPattern, ctx } = reason('Build a restaurant POS');
    expect(appFamily.family).toBe('industry-specific');
    expect(ctx.industry).toMatch(/restaurant/);
    expect(useNoPattern).toBe(false);
  });

  it('ecommerce store → commerce family, uses ecommerce pattern', () => {
    const { appFamily, useNoPattern, topPattern } = reason('Build an ecommerce store');
    expect(appFamily.family).toBe('commerce');
    expect(useNoPattern).toBe(false);
    expect(topPattern).toBeDefined();
  });

  it('LMS → industry-specific, uses education/LMS pattern', () => {
    const { ctx, topPattern, useNoPattern } = reason('Build an LMS for our school');
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
    it(`"${prompt}" — still produces a real pattern (not NoPattern)`, () => {
      const { useNoPattern, topPattern } = reason(prompt);
      expect(useNoPattern).toBe(false);
      expect(topPattern).toBeDefined();
      expect(topPattern!.score).toBeGreaterThan(30);
    });
  }
});