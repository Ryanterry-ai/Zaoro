import { describe, it, expect, beforeAll } from 'vitest';
import { mapSectionToSlot, getRegisteredSections, getComponentForSection } from '../src/bos/section-mapper.js';
import { buildExecutionBlueprint } from '../src/bos/execution-planner.js';
import { resolveContent } from '../src/bos/content-resolver.js';
import { runBREV2Pipeline } from '../src/bos/bre-v2-pipeline.js';
import { buildBREContext } from '../src/bos/intake-parser.js';
import { ReactRenderer } from '../src/generation/renderers/react-renderer.js';
import { registerRenderer, renderWith } from '../src/generation/renderers/renderer.js';
import type { ApplicationBlueprint, PagePlan } from '../src/bos/schemas/blueprint/application-blueprint.schema.js';

// Shared pipeline results — run once before all tests
let restaurantResult: Awaited<ReturnType<typeof runBREV2Pipeline>>;
let saasResult: Awaited<ReturnType<typeof runBREV2Pipeline>>;

beforeAll(async () => {
  const restaurantCtx = await buildBREContext('Build a restaurant called Bella Vista');
  restaurantResult = await runBREV2Pipeline(restaurantCtx);

  const saasCtx = await buildBREContext('Build a SaaS subscription platform called CloudDash');
  saasResult = await runBREV2Pipeline(saasCtx);
}, 60000);

describe('Section Mapper', () => {
  it('should map hero-banner to HeroBanner', () => {
    const page = { id: 'p1', path: '/', name: 'Home', type: 'home', sections: ['hero-banner', 'features'] };
    const result = mapSectionToSlot('hero-banner', page, {} as ApplicationBlueprint);
    expect(result).toBeDefined();
    expect(result?.component).toBe('HeroBanner');
    expect(result?.slot).toBe('hero-banner');
    expect(result?.order).toBe(0);
  });

  it('should map pricing-table to PricingTable', () => {
    const page = { id: 'p1', path: '/pricing', name: 'Pricing', type: 'marketing', sections: ['pricing-table', 'faqs'] };
    const result = mapSectionToSlot('pricing-table', page, {} as ApplicationBlueprint);
    expect(result).toBeDefined();
    expect(result?.component).toBe('PricingTable');
    expect(result?.order).toBe(0);
  });

  it('should map testimonials to Testimonials', () => {
    const page = { id: 'p1', path: '/testimonials', name: 'Testimonials', type: 'marketing', sections: ['testimonials', 'hero-banner'] };
    const result = mapSectionToSlot('testimonials', page, {} as ApplicationBlueprint);
    expect(result).toBeDefined();
    expect(result?.component).toBe('Testimonials');
    expect(result?.order).toBe(0);
  });

  it('should map login-form to AuthForm', () => {
    const page = { id: 'p1', path: '/login', name: 'Login', type: 'auth', sections: ['login-form', 'hero'] };
    const result = mapSectionToSlot('login-form', page, {} as ApplicationBlueprint);
    expect(result).toBeDefined();
    expect(result?.component).toBe('AuthForm');
    expect(result?.slot).toBe('login-form');
    expect(result?.order).toBe(0);
  });

  it('should register all standard sections', () => {
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
    const execBlueprint = buildExecutionBlueprint(restaurantResult.blueprint);

    expect(execBlueprint).toBeDefined();
    expect(execBlueprint.appName).toBe('Bella Vista');
    expect(execBlueprint.industry).toBe('restaurant');
    expect(execBlueprint.pages.length).toBeGreaterThan(0);
    expect(execBlueprint.themeId).toBeDefined();
  });

  it('should map sections to component slots', () => {
    const execBlueprint = buildExecutionBlueprint(saasResult.blueprint);

    const homePage = execBlueprint.pages.find(p => p.path === '/');
    expect(homePage).toBeDefined();
    expect(homePage?.slots.length).toBeGreaterThan(0);
    expect(homePage?.slots.some(s => s.component === 'HeroBanner')).toBe(true);
  });

  it('should include dashboard layout for dashboard pages', () => {
    const execBlueprint = buildExecutionBlueprint(saasResult.blueprint);

    const dashboardPage = execBlueprint.pages.find(p => p.path === '/dashboard');
    expect(dashboardPage?.layout).toBe('dashboard');
  });
});

describe('Content Resolver', () => {
  it('should resolve ExecutionBlueprint into ApplicationSpec', () => {
    const execBlueprint = buildExecutionBlueprint(restaurantResult.blueprint);
    const appSpec = resolveContent(execBlueprint, {
      blueprint: restaurantResult.blueprint,
      vocabulary: restaurantResult.blueprint.vocabulary ?? {},
    });

    expect(appSpec).toBeDefined();
    expect(appSpec.appName).toBe('Bella Vista');
    expect(appSpec.pages.length).toBeGreaterThan(0);
    expect(appSpec.pages[0]?.components.length).toBeGreaterThan(0);
  });

  it('should fill hero banner with business content', () => {
    const execBlueprint = buildExecutionBlueprint(restaurantResult.blueprint);
    const appSpec = resolveContent(execBlueprint, {
      blueprint: restaurantResult.blueprint,
      vocabulary: restaurantResult.blueprint.vocabulary ?? {},
      ...(restaurantResult.businessResearch ? { businessResearch: restaurantResult.businessResearch } : {}),
    });

    const homePage = appSpec.pages.find(p => p.path === '/');
    const hero = homePage?.components.find(c => c.type === 'HeroBanner');
    expect(hero).toBeDefined();
    expect(hero?.content?.title?.value).toBe('Bella Vista');
    expect(hero?.content?.subtitle?.value.toLowerCase()).toMatch(/cuisine|dining|table|menu|culinary|food|restaurant/);
    expect(hero?.actions?.length).toBeGreaterThan(0);
  });

  it('should fill pricing tiers for subscription businesses', () => {
    const execBlueprint = buildExecutionBlueprint(saasResult.blueprint);
    const appSpec = resolveContent(execBlueprint, {
      blueprint: saasResult.blueprint,
      vocabulary: saasResult.blueprint.vocabulary ?? {},
      ...(saasResult.businessResearch ? { businessResearch: saasResult.businessResearch } : {}),
    });

    const pricingPage = appSpec.pages.find(p => p.path === '/pricing');
    const pricing = pricingPage?.components.find(c => c.type === 'PricingTable');
    expect(pricing).toBeDefined();
    expect(pricing?.tiers?.length).toBeGreaterThan(0);
    expect(pricing?.tiers?.some(t => t.highlighted)).toBe(true);
  });

  it('should generate features from entities', () => {
    const execBlueprint = buildExecutionBlueprint(restaurantResult.blueprint);
    const appSpec = resolveContent(execBlueprint, {
      blueprint: restaurantResult.blueprint,
      vocabulary: restaurantResult.blueprint.vocabulary ?? {},
      ...(restaurantResult.businessResearch ? { businessResearch: restaurantResult.businessResearch } : {}),
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
    expect(result.content).toContain('Get Started');
    expect(result.content).toContain("'use client'");
    expect(result.content).toContain('export default function HeroBanner');
    expect(result.content).toContain('HeroBannerProps');
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
    const execBlueprint = buildExecutionBlueprint(restaurantResult.blueprint);
    const appSpec = resolveContent(execBlueprint, {
      blueprint: restaurantResult.blueprint,
      vocabulary: restaurantResult.blueprint.vocabulary ?? {},
    });

    const result = renderWith(appSpec, 'react', {
      theme: restaurantResult.blueprint.designTokens as Record<string, unknown>,
      includeComments: true,
      includeTests: false,
      outputDir: './test',
    });

    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files.some(f => f.path.includes('page.tsx'))).toBe(true);
    expect(result.files.some(f => f.path.includes('.tsx') && f.path.includes('components/'))).toBe(true);
  });
});

describe('Full Pipeline', () => {
  it('should run complete pipeline from prompt to code', () => {
    const execBlueprint = buildExecutionBlueprint(restaurantResult.blueprint);
    const appSpec = resolveContent(execBlueprint, {
      blueprint: restaurantResult.blueprint,
      vocabulary: restaurantResult.blueprint.vocabulary ?? {},
    });

    registerRenderer(new ReactRenderer());
    const renderResult = renderWith(appSpec, 'react', {
      theme: restaurantResult.blueprint.designTokens as Record<string, unknown>,
      includeComments: true,
      includeTests: false,
      outputDir: './test',
    });

    expect(restaurantResult.blueprint).toBeDefined();
    expect(execBlueprint.pages.length).toBeGreaterThan(0);
    expect(appSpec.pages.length).toBeGreaterThan(0);
    expect(renderResult.files.length).toBeGreaterThan(0);
  });
});
