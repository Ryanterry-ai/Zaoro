import { buildBREContext } from '../src/bos/intake-parser.js';
import { runBREV2Pipeline } from '../src/bos/bre-v2-pipeline.js';
import { mapBlueprintToFullStack } from '../src/bos/blueprint-mapper.js';
import { buildExecutionBlueprint } from '../src/bos/execution-planner.js';
import { resolveContent } from '../src/bos/content-resolver.js';
import { PATTERNS, DESIGN_PROFILES } from '../src/bos/knowledge/registry.js';
import { describe, it, expect, beforeAll } from 'vitest';

describe('E2E: Supplement Store for Indian Customers', () => {
  const prompt = 'Build a fully functional, interactive, responsive multi brands e commerce supplement store for Indian customers';

  // Run pipeline once, share across all tests
  let ctx: Awaited<ReturnType<typeof buildBREContext>>;
  let breResult: Awaited<ReturnType<typeof runBREV2Pipeline>>;

  beforeAll(async () => {
    ctx = await buildBREContext(prompt);
    breResult = await runBREV2Pipeline(ctx);
  }, 60000);

  it('intake parser detects correct context', () => {
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

  it('BRE v2 pipeline produces valid blueprint', () => {
    console.log('=== BLUEPRINT ===');
    console.log('Name:', breResult.blueprint.name);
    console.log('Industry:', breResult.blueprint.industry);
    console.log('Pages:', breResult.blueprint.pages.map(p => p.path));
    console.log('Entities:', breResult.blueprint.entities.map(e => e.name));
    console.log('Integrations:', breResult.blueprint.integrations.map(i => `${i.name} (${i.type})`));
    console.log('Dashboard Widgets:', breResult.blueprint.dashboardWidgets.length);
    console.log('Charts:', breResult.blueprint.charts.length);
    console.log('Compliance:', breResult.blueprint.compliancePacks);
    console.log('Confidence:', breResult.confidence);
    console.log('Decisions:', breResult.decisions.length);
    console.log('Design Profile:', breResult.selectedDesignProfile?.name);
    console.log('Pattern:', breResult.selectedPattern?.name);

    expect(breResult.blueprint).toBeDefined();
    expect(breResult.blueprint.industry).toBe('ecommerce');
    expect(breResult.blueprint.pages.length).toBeGreaterThan(3);
    expect(breResult.blueprint.entities.length).toBeGreaterThan(2);
    expect(breResult.confidence).toBeGreaterThan(0);

    const entityNames = breResult.blueprint.entities.map(e => e.name);
    expect(entityNames).toContain('Product');
    expect(entityNames).toContain('Order');
    expect(breResult.blueprint.compliancePacks).toContain('compliance.fssai');
    expect(breResult.blueprint.integrations.map(i => i.type)).toContain('payment');
    const pagePaths = breResult.blueprint.pages.map(p => p.path);
    expect(pagePaths).toContain('/shop');
    expect(pagePaths).toContain('/cart');
    expect(pagePaths.some(p => p.includes('product'))).toBe(true);
  });

  it('blueprint mapper produces valid FullStackBlueprint', () => {
    const fsBlueprint = mapBlueprintToFullStack(breResult.blueprint);

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

  it('blueprint has e-commerce specific sections', () => {
    console.log('=== PAGE SECTIONS ===');
    for (const page of breResult.blueprint.pages) {
      console.log(`  ${page.path} (${page.type}): [${page.sections.join(', ')}]`);
    }

    const shopPage = breResult.blueprint.pages.find(p => p.path === '/shop');
    expect(shopPage).toBeDefined();
    expect(shopPage!.sections.length).toBeGreaterThan(0);

    const homePage = breResult.blueprint.pages.find(p => p.path === '/');
    expect(homePage).toBeDefined();
    expect(homePage!.sections).toContain('hero');
  });

  it('decision trace is complete', () => {
    console.log('=== DECISIONS ===');
    for (const d of breResult.decisions) {
      console.log(`  [${d.ruleId}] ${d.action.type}`);
    }

    const sources = new Set(breResult.decisions.map(d => d.ruleId.split('.')[1]));
    console.log('Rule sources:', [...sources]);

    expect(breResult.decisions.length).toBeGreaterThan(5);
    expect(breResult.decisions.some(d => d.ruleId.includes('ecommerce'))).toBe(true);
    expect(breResult.decisions.some(d => d.ruleId.includes('journey'))).toBe(true);
  });

  it('app name is not a single adjective', async () => {
    const adjectives = ['indian', 'local', 'modern', 'best', 'top', 'great', 'new', 'simple',
      'easy', 'fast', 'quick', 'smart', 'premium', 'basic', 'mini', 'mega',
      'full', 'complete', 'online', 'digital', 'global'];
    for (const adj of adjectives) {
      const c = await buildBREContext(`Build a ${adj} supplement store`);
      expect(c.appName.toLowerCase()).not.toBe(adj);
      expect(c.appName.length).toBeGreaterThan(2);
      console.log(`  "${adj}" → "${c.appName}"`);
    }
  });

  it('resolved content has signal-derived, domain-grounded features', () => {
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
      ...(breResult.businessResearch ? { businessResearch: breResult.businessResearch } : {}),
      ...(breResult.businessKnowledge ? { businessKnowledge: breResult.businessKnowledge } : {}),
    });

    console.log('=== APP SPEC ===');
    console.log('App:', appSpec.appName);
    console.log('Pages:', appSpec.pages.length);
    for (const page of appSpec.pages) {
      console.log(`  ${page.path} (${page.type}): ${page.components.map(c => c.type)}`);
    }

    expect(appSpec).toBeDefined();
    expect(appSpec.pages.length).toBeGreaterThan(0);

    const homePage = appSpec.pages.find(p => p.path === '/');
    expect(homePage).toBeDefined();

    const heroBanner = homePage!.components.find(c => c.type === 'HeroBanner');
    expect(heroBanner).toBeDefined();

    const subtitle = heroBanner!.content?.subtitle?.value ?? '';
    const buildKeywords = ['build', 'fully functional', 'interactive', 'responsive'];
    for (const kw of buildKeywords) {
      expect(subtitle.toLowerCase()).not.toContain(kw);
    }

    expect(subtitle.length).toBeGreaterThan(10);
    console.log('Hero subtitle:', subtitle);

    const featureGrid = homePage!.components.find(c => c.type === 'FeatureGrid');
    expect(featureGrid).toBeDefined();

    const featureItems = featureGrid!.items ?? [];
    expect(featureItems.length).toBeGreaterThan(0);

    const allFeatureText = featureItems.map(i => `${i.title} ${i.description}`).join(' ').toLowerCase();

    // Features must be signal-derived from the store's real domain — its
    // entities and customer-facing workflows — NOT hardcoded brand names or
    // internal analytics widgets. We assert the copy is grounded in the
    // blueprint's own vocabulary and free of the admin-metric leak.
    const entityNames = breResult.blueprint.entities.map(e => e.name.toLowerCase());
    const grounded = entityNames.some(name => name.length > 2 && allFeatureText.includes(name))
      || /product|order|cart|checkout|catalog|browse|shop|purchase|delivery/.test(allFeatureText);
    expect(grounded).toBe(true);

    // The dashboard-widget leak must never resurface as marketing copy.
    expect(allFeatureText).not.toMatch(/revenue trend|engagement overview|retention health|recent activity/);

    console.log(`Feature count: ${featureItems.length}`);
    for (const f of featureItems) {
      console.log(`  - ${f.title}: ${f.description}`);
    }

    const aboutPage = appSpec.pages.find(p => p.path === '/about');
    if (aboutPage) {
      for (const comp of aboutPage.components) {
        const aboutTitle = comp.content?.title?.value ?? '';
        const aboutSubtitle = comp.content?.subtitle?.value ?? '';
        const combinedAbout = `${aboutTitle} ${aboutSubtitle}`.toLowerCase();
        for (const kw of buildKeywords) {
          expect(combinedAbout).not.toContain(kw);
        }
      }
    }
  });
});
