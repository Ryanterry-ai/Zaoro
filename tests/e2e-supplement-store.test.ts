import { buildBREContext } from '../src/bos/intake-parser.js';
import { runBREV2Pipeline } from '../src/bos/bre-v2-pipeline.js';
import { mapBlueprintToFullStack } from '../src/bos/blueprint-mapper.js';
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
});
