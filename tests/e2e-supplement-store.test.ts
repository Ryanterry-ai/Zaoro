import { buildBREContext } from '../src/bos/intake-parser.js';
import { runBREV2Pipeline } from '../src/bos/bre-v2-pipeline.js';
import { mapBlueprintToFullStack } from '../src/bos/blueprint-mapper.js';
import { buildExecutionBlueprint } from '../src/bos/execution-planner.js';
import { resolveContent } from '../src/bos/content-resolver.js';
import { PATTERNS, DESIGN_PROFILES } from '../src/bos/knowledge/registry.js';
import { describe, it, expect } from 'vitest';

describe('E2E: Supplement Store for Indian Customers', () => {
  const prompt = 'Build a fully functional, interactive, responsive multi brands e commerce supplement store for Indian customers';

  it('intake parser detects correct context', () => {
    const ctx = buildBREContext(prompt);
    console.log('=== INTAKE ===');
    console.log(JSON.stringify({
      industry: ctx.industry,
      subIndustry: ctx.subIndustry,
      businessModels: ctx.businessModels,
      compliancePacks: ctx.compliancePacks,
      entities: ctx.entities,
      appName: ctx.appName,
      country: ctx.country,
      capabilities: ctx.capabilities,
      journeys: ctx.journeys,
    }, null, 2));

    expect(ctx.industry).toBe('ecommerce');
    expect(ctx.subIndustry).toBe('supplement');
    expect(ctx.compliancePacks).toContain('compliance.fssai');
    expect(ctx.country).toBe('IN');
  });

  it('BRE v2 pipeline produces valid blueprint', async () => {
    const ctx = buildBREContext(prompt);
    const result = await runBREV2Pipeline(ctx);

    console.log('=== BLUEPRINT ===');
    console.log('Name:', result.blueprint.name);
    console.log('Industry:', result.blueprint.industry);
    console.log('Pages:', result.blueprint.pages.map(p => p.path));
    console.log('Entities:', result.blueprint.entities.map(e => e.name));
    console.log('Integrations:', result.blueprint.integrations.map(i => `${i.name} (${i.type})`));
    console.log('Dashboard Widgets:', result.blueprint.dashboardWidgets.length);
    console.log('Charts:', result.blueprint.charts.length);
    console.log('Compliance:', result.blueprint.compliancePacks);
    console.log('Confidence:', result.confidence);
    console.log('Decisions:', result.decisions.length);
    console.log('Design Profile:', result.selectedDesignProfile?.name);
    console.log('Pattern:', result.selectedPattern?.name);

    expect(result.blueprint).toBeDefined();
    expect(result.blueprint.industry).toBe('ecommerce');
    expect(result.blueprint.pages.length).toBeGreaterThan(3);
    expect(result.blueprint.entities.length).toBeGreaterThan(2);
    expect(result.confidence).toBeGreaterThan(0);

    // Check supplement-specific entities
    const entityNames = result.blueprint.entities.map(e => e.name);
    expect(entityNames).toContain('Product');
    expect(entityNames).toContain('Order');

    // Check FSSAI compliance
    expect(result.blueprint.compliancePacks).toContain('compliance.fssai');

    // Check integrations include payment
    const integrationTypes = result.blueprint.integrations.map(i => i.type);
    expect(integrationTypes).toContain('payment');

    // Check pages include supplement-specific paths
    const pagePaths = result.blueprint.pages.map(p => p.path);
    expect(pagePaths).toContain('/shop');
    expect(pagePaths).toContain('/cart');
    expect(pagePaths.some(p => p.includes('product'))).toBe(true);
  });

  it('blueprint mapper produces valid FullStackBlueprint', async () => {
    const ctx = buildBREContext(prompt);
    const result = await runBREV2Pipeline(ctx);
    const fsBlueprint = mapBlueprintToFullStack(result.blueprint);

    console.log('=== FULL STACK BLUEPRINT ===');
    console.log('App:', fsBlueprint.appName);
    console.log('Color:', fsBlueprint.colorScheme);
    console.log('Pages:', fsBlueprint.pages.length);
    console.log('Data Models:', fsBlueprint.dataModels.map(m => m.name));
    console.log('API Routes:', fsBlueprint.apiRoutes.length);
    console.log('State Stores:', fsBlueprint.stateStores.length);

    expect(fsBlueprint.appName).toBeDefined();
    expect(fsBlueprint.pages.length).toBeGreaterThan(3);
    expect(fsBlueprint.dataModels.length).toBeGreaterThan(2);
    expect(fsBlueprint.apiRoutes.length).toBeGreaterThan(0);
  });

  it('blueprint has e-commerce specific sections', async () => {
    const ctx = buildBREContext(prompt);
    const result = await runBREV2Pipeline(ctx);

    console.log('=== PAGE SECTIONS ===');
    for (const page of result.blueprint.pages) {
      console.log(`  ${page.path} (${page.type}): [${page.sections.join(', ')}]`);
    }

    // Shop page should have product-related sections
    const shopPage = result.blueprint.pages.find(p => p.path === '/shop');
    expect(shopPage).toBeDefined();
    expect(shopPage!.sections.length).toBeGreaterThan(0);

    // Home page should have hero
    const homePage = result.blueprint.pages.find(p => p.path === '/');
    expect(homePage).toBeDefined();
    expect(homePage!.sections).toContain('hero');
  });

  it('decision trace is complete', async () => {
    const ctx = buildBREContext(prompt);
    const result = await runBREV2Pipeline(ctx);

    console.log('=== DECISIONS ===');
    for (const d of result.decisions) {
      console.log(`  [${d.ruleId}] ${d.action.type}`);
    }

    // Should have decisions from multiple sources
    const sources = new Set(result.decisions.map(d => d.ruleId.split('.')[1]));
    console.log('Rule sources:', [...sources]);

    expect(result.decisions.length).toBeGreaterThan(5);

    // Should have ecommerce decisions
    expect(result.decisions.some(d => d.ruleId.includes('ecommerce'))).toBe(true);

    // Should have journey decisions
    expect(result.decisions.some(d => d.ruleId.includes('journey'))).toBe(true);
  });

  it('app name is not a single adjective', () => {
    const adjectives = ['indian', 'local', 'modern', 'best', 'top', 'great', 'new', 'simple',
      'easy', 'fast', 'quick', 'smart', 'premium', 'basic', 'mini', 'mega',
      'full', 'complete', 'online', 'digital', 'global'];
    for (const adj of adjectives) {
      const ctx = buildBREContext(`Build a ${adj} supplement store`);
      // Name should be a compound word/phrase, never just the adjective
      expect(ctx.appName.toLowerCase()).not.toBe(adj);
      expect(ctx.appName.length).toBeGreaterThan(2);
      console.log(`  "${adj}" → "${ctx.appName}"`);
    }
  });

  it('resolved content has supplement-specific features', async () => {
    const ctx = buildBREContext(prompt);
    const breResult = await runBREV2Pipeline(ctx);
    const executionBlueprint = buildExecutionBlueprint(breResult.blueprint);

    const matchedPattern = breResult.selectedPattern
      ? PATTERNS.find(p => p.id === breResult.selectedPattern!.id)
      : undefined;
    const matchedDesignProfile = breResult.selectedDesignProfile
      ? DESIGN_PROFILES.find(dp => dp.id === breResult.selectedDesignProfile!.id)
      : undefined;

    const appSpec = resolveContent(executionBlueprint, {
      blueprint: breResult.blueprint,
      vocabulary: breResult.blueprint.vocabulary ?? {},
      ...(matchedPattern ? { pattern: matchedPattern } : {}),
      ...(matchedDesignProfile ? { designProfile: matchedDesignProfile } : {}),
      ...(breResult.revenueIntelligence ? { revenueIntelligence: breResult.revenueIntelligence } : {}),
    });

    console.log('=== APP SPEC ===');
    console.log('App:', appSpec.appName);
    console.log('Pages:', appSpec.pages.length);
    for (const page of appSpec.pages) {
      console.log(`  ${page.path} (${page.type}): ${page.components.map(c => c.type)}`);
    }

    expect(appSpec).toBeDefined();
    expect(appSpec.pages.length).toBeGreaterThan(0);

    // Find the home page and check HeroBanner
    const homePage = appSpec.pages.find(p => p.path === '/');
    expect(homePage).toBeDefined();

    const heroBanner = homePage!.components.find(c => c.type === 'HeroBanner');
    expect(heroBanner).toBeDefined();

    // Hero subtitle must NOT contain build keywords from the prompt
    const subtitle = heroBanner!.content?.subtitle?.value ?? '';
    const buildKeywords = ['build', 'fully functional', 'interactive', 'responsive'];
    for (const kw of buildKeywords) {
      expect(subtitle.toLowerCase()).not.toContain(kw);
    }

    // Hero should have a meaningful value proposition (not empty)
    expect(subtitle.length).toBeGreaterThan(10);
    console.log('Hero subtitle:', subtitle);

    // Find FeatureGrid and verify supplement-specific content
    const featureGrid = homePage!.components.find(c => c.type === 'FeatureGrid');
    expect(featureGrid).toBeDefined();

    const featureItems = featureGrid!.items ?? [];
    expect(featureItems.length).toBeGreaterThan(0);

    // At least one feature mentions FSSAI or supplement-specific terms
    const allFeatureText = featureItems.map(i => `${i.title} ${i.description}`).join(' ').toLowerCase();
    expect(allFeatureText).toMatch(/fssai|supplement|protein|muscleblaze|nutrabay|genuine|certification/);

    console.log(`Feature count: ${featureItems.length}`);
    for (const f of featureItems) {
      console.log(`  - ${f.title}: ${f.description}`);
    }

    // Find about section on /about page for quality check
    const aboutPage = appSpec.pages.find(p => p.path === '/about');
    if (aboutPage) {
      for (const comp of aboutPage.components) {
        const aboutTitle = comp.content?.title?.value ?? '';
        const aboutSubtitle = comp.content?.subtitle?.value ?? '';
        const combinedAbout = `${aboutTitle} ${aboutSubtitle}`.toLowerCase();
        // About content should not contain build prompt keywords either
        for (const kw of buildKeywords) {
          expect(combinedAbout).not.toContain(kw);
        }
      }
    }
  });
});
