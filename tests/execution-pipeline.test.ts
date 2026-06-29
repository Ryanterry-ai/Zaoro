import { describe, it, expect } from 'vitest';
import { mapSectionToSlot, getRegisteredSections, getComponentForSection } from '../src/bos/section-mapper.js';
import { buildExecutionBlueprint } from '../src/bos/execution-planner.js';
import { resolveContent } from '../src/bos/content-resolver.js';
import { runBREV2Pipeline } from '../src/bos/bre-v2-pipeline.js';
import { buildBREContext } from '../src/bos/intake-parser.js';
import { ReactRenderer } from '../src/generation/renderers/react-renderer.js';
import { registerRenderer, renderWith } from '../src/generation/renderers/renderer.js';
import type { ApplicationBlueprint } from '../src/bos/schemas/blueprint/application-blueprint.schema.js';
import type { PagePlan } from '../src/bos/schemas/blueprint/application-blueprint.schema.js';

describe('Section Mapper', () => {
  it('should map hero-banner to HeroBanner', () => {
    const result = mapSectionToSlot('hero-banner', {} as PagePlan, {} as ApplicationBlueprint);
    expect(result).toBeDefined();
    expect(result?.component).toBe('HeroBanner');
    expect(result?.slot).toBe('hero-banner');
  });

  it('should map pricing-table to PricingTable', () => {
    const result = mapSectionToSlot('pricing-table', {} as PagePlan, {} as ApplicationBlueprint);
    expect(result?.component).toBe('PricingTable');
  });

  it('should map testimonials to Testimonials', () => {
    const result = mapSectionToSlot('testimonials', {} as PagePlan, {} as ApplicationBlueprint);
    expect(result?.component).toBe('Testimonials');
  });

  it('should map login-form to AuthForm', () => {
    const result = mapSectionToSlot('login-form', {} as PagePlan, {} as ApplicationBlueprint);
    expect(result?.component).toBe('AuthForm');
  });

  it('should return placeholder for unknown sections', () => {
    const result = mapSectionToSlot('custom-section', {} as PagePlan, {} as ApplicationBlueprint);
    expect(result?.component).toBe('PlaceholderSection');
  });

  it('should return all registered sections', () => {
    const sections = getRegisteredSections();
    expect(sections.length).toBeGreaterThan(20);
    expect(sections).toContain('hero-banner');
    expect(sections).toContain('pricing-table');
    expect(sections).toContain('testimonials');
  });

  it('should get component for section', () => {
    expect(getComponentForSection('hero-banner')).toBe('HeroBanner');
    expect(getComponentForSection('pricing')).toBe('PricingTable');
    expect(getComponentForSection('faq')).toBe('FAQSection');
  });
});

describe('Execution Planner', () => {
  it('should build ExecutionBlueprint from ApplicationBlueprint', () => {
    const ctx = buildBREContext('Build a restaurant called Bella Vista');
    const breResult = runBREV2Pipeline(ctx);
    const execBlueprint = buildExecutionBlueprint(breResult.blueprint);

    expect(execBlueprint).toBeDefined();
    expect(execBlueprint.appName).toBe('Bella Vista');
    expect(execBlueprint.industry).toBe('restaurant');
    expect(execBlueprint.pages.length).toBeGreaterThan(0);
    expect(execBlueprint.themeId).toBeDefined();
  });

  it('should map sections to component slots', () => {
    const ctx = buildBREContext('Build a SaaS platform called CloudDash');
    const breResult = runBREV2Pipeline(ctx);
    const execBlueprint = buildExecutionBlueprint(breResult.blueprint);

    const homePage = execBlueprint.pages.find(p => p.path === '/');
    expect(homePage).toBeDefined();
    expect(homePage?.slots.length).toBeGreaterThan(0);
    expect(homePage?.slots.some(s => s.component === 'HeroBanner')).toBe(true);
  });

  it('should include dashboard layout for dashboard pages', () => {
    const ctx = buildBREContext('Build a SaaS platform with dashboard');
    const breResult = runBREV2Pipeline(ctx);
    const execBlueprint = buildExecutionBlueprint(breResult.blueprint);

    const dashboardPage = execBlueprint.pages.find(p => p.path === '/dashboard');
    expect(dashboardPage?.layout).toBe('dashboard');
  });
});

describe('Content Resolver', () => {
  it('should resolve ExecutionBlueprint into ApplicationSpec', () => {
    const ctx = buildBREContext('Build a restaurant called Bella Vista');
    const breResult = runBREV2Pipeline(ctx);
    const execBlueprint = buildExecutionBlueprint(breResult.blueprint);
    const appSpec = resolveContent(execBlueprint, {
      blueprint: breResult.blueprint,
      vocabulary: breResult.blueprint.vocabulary ?? {},
    });

    expect(appSpec).toBeDefined();
    expect(appSpec.appName).toBe('Bella Vista');
    expect(appSpec.pages.length).toBeGreaterThan(0);
    expect(appSpec.pages[0]?.components.length).toBeGreaterThan(0);
  });

  it('should fill hero banner with business content', () => {
    const ctx = buildBREContext('Build a restaurant called Bella Vista');
    const breResult = runBREV2Pipeline(ctx);
    const execBlueprint = buildExecutionBlueprint(breResult.blueprint);
    const appSpec = resolveContent(execBlueprint, {
      blueprint: breResult.blueprint,
      vocabulary: breResult.blueprint.vocabulary ?? {},
    });

    const homePage = appSpec.pages.find(p => p.path === '/');
    const hero = homePage?.components.find(c => c.type === 'HeroBanner');
    expect(hero).toBeDefined();
    expect(hero?.content?.title?.value).toBe('Bella Vista');
    expect(hero?.content?.subtitle?.value).toContain('restaurant');
    expect(hero?.actions?.length).toBeGreaterThan(0);
  });

  it('should fill pricing tiers for subscription businesses', () => {
    const ctx = buildBREContext('Build a SaaS subscription platform called CloudDash');
    const breResult = runBREV2Pipeline(ctx);
    const execBlueprint = buildExecutionBlueprint(breResult.blueprint);
    const appSpec = resolveContent(execBlueprint, {
      blueprint: breResult.blueprint,
      vocabulary: breResult.blueprint.vocabulary ?? {},
    });

    const pricingPage = appSpec.pages.find(p => p.path === '/pricing');
    const pricing = pricingPage?.components.find(c => c.type === 'PricingTable');
    expect(pricing).toBeDefined();
    expect(pricing?.tiers?.length).toBeGreaterThan(0);
    expect(pricing?.tiers?.some(t => t.highlighted)).toBe(true);
  });

  it('should generate features from entities', () => {
    const ctx = buildBREContext('Build a gym membership app called FitZone');
    const breResult = runBREV2Pipeline(ctx);
    const execBlueprint = buildExecutionBlueprint(breResult.blueprint);
    const appSpec = resolveContent(execBlueprint, {
      blueprint: breResult.blueprint,
      vocabulary: breResult.blueprint.vocabulary ?? {},
    });

    const homePage = appSpec.pages.find(p => p.path === '/');
    const features = homePage?.components.find(c => c.type === 'FeatureGrid');
    expect(features).toBeDefined();
    expect(features?.items?.length).toBeGreaterThan(0);
  });
});

describe('React Renderer', () => {
  it('should render a component spec to TSX', () => {
    const renderer = new ReactRenderer();
    const result = renderer.renderComponent({
      type: 'HeroBanner',
      content: {
        title: { value: 'Test App', type: 'text' },
        subtitle: { value: 'A test application', type: 'text' },
      },
      actions: [
        { label: 'Get Started', action: '/signup', style: 'primary' },
      ],
    }, {
      theme: {},
      includeComments: true,
      includeTests: false,
      outputDir: './test',
    });

    expect(result.path).toBe('components/HeroBanner.tsx');
    expect(result.content).toContain('HeroBanner');
    expect(result.content).toContain('Test App');
    expect(result.content).toContain('Get Started');
  });

  it('should render a page with multiple components', () => {
    const renderer = new ReactRenderer();
    const result = renderer.renderPage({
      pageId: 'page-home',
      path: '/',
      name: 'Home',
      type: 'home',
      layout: 'default',
      components: [
        { type: 'HeroBanner', content: { title: { value: 'Home', type: 'text' } } },
        { type: 'FeatureGrid', content: { title: { value: 'Features', type: 'text' } } },
      ],
    }, {
      theme: {},
      includeComments: true,
      includeTests: false,
      outputDir: './test',
    });

    expect(result.length).toBe(1);
    expect(result[0].content).toContain('HeroBanner');
    expect(result[0].content).toContain('FeatureGrid');
  });

  it('should render full application', () => {
    registerRenderer(new ReactRenderer());
    const ctx = buildBREContext('Build a restaurant called Bella Vista');
    const breResult = runBREV2Pipeline(ctx);
    const execBlueprint = buildExecutionBlueprint(breResult.blueprint);
    const appSpec = resolveContent(execBlueprint, {
      blueprint: breResult.blueprint,
      vocabulary: breResult.blueprint.vocabulary ?? {},
    });

    const result = renderWith(appSpec, 'react', {
      theme: breResult.blueprint.designTokens as Record<string, unknown>,
      includeComments: true,
      includeTests: false,
      outputDir: './test',
    });

    expect(result.files.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBe(0);
    expect(result.files.some(f => f.path.includes('page.tsx'))).toBe(true);
    expect(result.files.some(f => f.path.includes('.tsx') && f.path.includes('components/'))).toBe(true);
  });
});

describe('Full Pipeline', () => {
  it('should run complete pipeline from prompt to code', () => {
    const { runBuildPipeline } = require('../src/generation/build-pipeline.js');
    const result = runBuildPipeline({
      industry: 'restaurant',
      businessModels: ['direct-sales'],
      capabilities: ['booking'],
      journeys: ['visitor', 'customer'],
      entities: ['MenuItem', 'Reservation'],
      appName: 'Bella Vista',
      description: 'Italian restaurant with online reservations',
    });

    expect(result.breResult).toBeDefined();
    expect(result.executionBlueprint).toBeDefined();
    expect(result.applicationSpec).toBeDefined();
    expect(result.renderResult.files.length).toBeGreaterThan(0);
    expect(result.availablePlatforms).toContain('react');
  });
});
