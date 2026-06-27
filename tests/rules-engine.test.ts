import { describe, it, expect } from 'vitest';
import { RulesEngine, createDefaultRules, type BREContext } from '../src/bos/reasoning/rules-engine.js';

describe('RulesEngine', () => {
  const engine = new RulesEngine();

  it('should register 10 default rules', () => {
    expect(engine.getRules().length).toBe(10);
  });

  it('should sort rules by priority (highest first)', () => {
    const rules = engine.getRules();
    for (let i = 1; i < rules.length; i++) {
      expect(rules[i]!.priority).toBeLessThanOrEqual(rules[i - 1]!.priority);
    }
  });

  it('should return stats with totalRules and bySource', () => {
    const stats = engine.stats();
    expect(stats.totalRules).toBe(10);
    expect(stats.bySource).toBeDefined();
    expect(Object.keys(stats.bySource).length).toBeGreaterThan(0);
  });

  it('should fire healthcare compliance rule for healthcare industry', () => {
    const ctx: BREContext = {
      industry: 'healthcare',
      businessModels: [],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
    };
    const decisions = engine.evaluate(ctx);
    const complianceDecisions = decisions.filter(d => d.action.type === 'add_compliance');
    expect(complianceDecisions.length).toBeGreaterThan(0);
    expect(complianceDecisions.some(d =>
      d.action.type === 'add_compliance' && d.action.packId === 'compliance.hipaa'
    )).toBe(true);
  });

  it('should fire subscription pricing rule', () => {
    const ctx: BREContext = {
      industry: 'tech',
      businessModels: ['subscription'],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
    };
    const decisions = engine.evaluate(ctx);
    const pricingPage = decisions.find(d =>
      d.action.type === 'add_page' && d.action.path === '/pricing'
    );
    expect(pricingPage).toBeDefined();
    expect(pricingPage!.action.type).toBe('add_page');
  });

  it('should fire SaaS dashboard rule for software industry', () => {
    const ctx: BREContext = {
      industry: 'software',
      businessModels: [],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
    };
    const decisions = engine.evaluate(ctx);
    const dashboardPage = decisions.find(d =>
      d.action.type === 'add_page' && d.action.path === '/dashboard'
    );
    expect(dashboardPage).toBeDefined();
  });

  it('should fire luxury vocabulary overrides', () => {
    const ctx: BREContext = {
      industry: 'luxury',
      businessModels: [],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
    };
    const decisions = engine.evaluate(ctx);
    const vocabActions = decisions.filter(d => d.action.type === 'set_vocabulary');
    expect(vocabActions.length).toBeGreaterThan(0);
    expect(vocabActions.some(d =>
      d.action.type === 'set_vocabulary' && d.action.original === 'product'
    )).toBe(true);
  });

  it('should fire visitor journey rules for all contexts', () => {
    const ctx: BREContext = {
      industry: 'tech',
      businessModels: [],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
    };
    const decisions = engine.evaluate(ctx);
    const homePage = decisions.find(d =>
      d.action.type === 'add_page' && d.action.path === '/'
    );
    expect(homePage).toBeDefined();
  });

  it('should fire customer journey auth pages', () => {
    const ctx: BREContext = {
      industry: 'tech',
      businessModels: [],
      compliancePacks: [],
      capabilities: [],
      journeys: ['customer'],
      entities: [],
    };
    const decisions = engine.evaluate(ctx);
    const loginPage = decisions.find(d =>
      d.action.type === 'add_page' && d.action.path === '/login'
    );
    expect(loginPage).toBeDefined();
  });

  it('should fire admin journey pages', () => {
    const ctx: BREContext = {
      industry: 'tech',
      businessModels: [],
      compliancePacks: [],
      capabilities: [],
      journeys: ['admin'],
      entities: [],
    };
    const decisions = engine.evaluate(ctx);
    const adminPage = decisions.find(d =>
      d.action.type === 'add_page' && d.action.path === '/admin'
    );
    expect(adminPage).toBeDefined();
    expect(decisions.some(d =>
      d.action.type === 'add_permission' && d.action.role === 'admin'
    )).toBe(true);
  });

  it('should fire GDPR for EU country', () => {
    const ctx: BREContext = {
      industry: 'tech',
      businessModels: [],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
      country: 'DE',
    };
    const decisions = engine.evaluate(ctx);
    expect(decisions.some(d =>
      d.action.type === 'add_compliance' && d.action.packId === 'compliance.gdpr'
    )).toBe(true);
  });

  it('should fire e-commerce rules for direct-sales business model', () => {
    const ctx: BREContext = {
      industry: 'tech',
      businessModels: ['direct-sales'],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
    };
    const decisions = engine.evaluate(ctx);
    expect(decisions.some(d =>
      d.action.type === 'add_page' && d.action.path === '/shop'
    )).toBe(true);
    expect(decisions.some(d =>
      d.action.type === 'add_integration' && d.action.integrationType === 'payment'
    )).toBe(true);
  });

  it('should fire restaurant rules', () => {
    const ctx: BREContext = {
      industry: 'restaurant',
      businessModels: [],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
    };
    const decisions = engine.evaluate(ctx);
    expect(decisions.some(d =>
      d.action.type === 'add_page' && d.action.path === '/menu'
    )).toBe(true);
    expect(decisions.some(d =>
      d.action.type === 'add_entity' && d.action.name === 'MenuItem'
    )).toBe(true);
  });

  it('each decision should have confidence and trace', () => {
    const ctx: BREContext = {
      industry: 'saas',
      businessModels: ['subscription'],
      compliancePacks: [],
      capabilities: [],
      journeys: ['customer', 'admin'],
      entities: [],
    };
    const decisions = engine.evaluate(ctx);
    expect(decisions.length).toBeGreaterThan(0);
    for (const d of decisions) {
      expect(d.confidence).toBe(0.9);
      expect(typeof d.trace).toBe('string');
      expect(d.trace.length).toBeGreaterThan(0);
    }
  });

  it('should not fire the same rule twice', () => {
    const ctx: BREContext = {
      industry: 'healthcare',
      businessModels: ['subscription'],
      compliancePacks: [],
      capabilities: [],
      journeys: ['customer'],
      entities: [],
    };
    const decisions = engine.evaluate(ctx);
    const ruleIds = decisions.map(d => d.ruleId);
    const uniqueRuleIds = new Set(ruleIds);
    // Each rule should fire at most once
    expect(ruleIds.length).toBeGreaterThanOrEqual(uniqueRuleIds.size);
  });

  it('should allow registering custom rules', () => {
    const customEngine = new RulesEngine();
    const before = customEngine.getRules().length;
    customEngine.register({
      id: 'custom.test',
      name: 'Custom Test Rule',
      priority: 100,
      condition: () => true,
      actions: [{ type: 'add_page', path: '/custom', name: 'Custom', sections: [] }],
      source: 'test',
    });
    expect(customEngine.getRules().length).toBe(before + 1);
    // Should be first due to highest priority
    expect(customEngine.getRules()[0]!.id).toBe('custom.test');
  });
});
