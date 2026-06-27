import { describe, it, expect } from 'vitest';
import { ConstraintSolver } from '../src/bos/reasoning/constraint-solver.js';
import type { BREContext, RuleDecision } from '../src/bos/reasoning/rules-engine.js';

describe('ConstraintSolver', () => {
  const solver = new ConstraintSolver();

  it('should register 5 default constraints', () => {
    expect(solver.getConstraints().length).toBe(5);
  });

  it('should satisfy e-commerce payment constraint when payment integration exists', () => {
    const ctx: BREContext = {
      industry: 'ecommerce',
      businessModels: ['direct-sales'],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
    };
    const decisions: RuleDecision[] = [
      {
        ruleId: 'test',
        ruleName: 'test',
        action: { type: 'add_integration', integrationType: 'payment', name: 'Stripe', required: true },
        confidence: 0.9,
        trace: 'test',
      },
    ];
    const report = solver.evaluate(ctx, decisions);
    const ecomConstraint = report.violations.find(v => v.constraintId === 'constraint.ecommerce.needs_payment');
    expect(ecomConstraint).toBeUndefined();
  });

  it('should violate e-commerce payment constraint when no payment integration', () => {
    const ctx: BREContext = {
      industry: 'ecommerce',
      businessModels: ['direct-sales'],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
    };
    const decisions: RuleDecision[] = [];
    const report = solver.evaluate(ctx, decisions);
    expect(report.violated).toBeGreaterThan(0);
    const ecomViolation = report.violations.find(v => v.constraintId === 'constraint.ecommerce.needs_payment');
    expect(ecomViolation).toBeDefined();
  });

  it('should satisfy subscription pricing constraint when pricing page exists', () => {
    const ctx: BREContext = {
      industry: 'tech',
      businessModels: ['subscription'],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
    };
    const decisions: RuleDecision[] = [
      {
        ruleId: 'test',
        ruleName: 'test',
        action: { type: 'add_page', path: '/pricing', name: 'Pricing', sections: [] },
        confidence: 0.9,
        trace: 'test',
      },
    ];
    const report = solver.evaluate(ctx, decisions);
    const pricingViolation = report.violations.find(v => v.constraintId === 'constraint.subscription.needs_pricing');
    expect(pricingViolation).toBeUndefined();
  });

  it('should violate subscription pricing constraint when no pricing page', () => {
    const ctx: BREContext = {
      industry: 'tech',
      businessModels: ['subscription'],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
    };
    const decisions: RuleDecision[] = [];
    const report = solver.evaluate(ctx, decisions);
    const pricingViolation = report.violations.find(v => v.constraintId === 'constraint.subscription.needs_pricing');
    expect(pricingViolation).toBeDefined();
  });

  it('should satisfy healthcare compliance constraint', () => {
    const ctx: BREContext = {
      industry: 'healthcare',
      businessModels: [],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
    };
    const decisions: RuleDecision[] = [
      {
        ruleId: 'test',
        ruleName: 'test',
        action: { type: 'add_compliance', packId: 'compliance.hipaa' },
        confidence: 0.9,
        trace: 'test',
      },
    ];
    const report = solver.evaluate(ctx, decisions);
    const hipaaViolation = report.violations.find(v => v.constraintId === 'constraint.healthcare.needs_compliance');
    expect(hipaaViolation).toBeUndefined();
  });

  it('should violate healthcare compliance constraint when no compliance pack', () => {
    const ctx: BREContext = {
      industry: 'medical',
      businessModels: [],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
    };
    const decisions: RuleDecision[] = [];
    const report = solver.evaluate(ctx, decisions);
    const hipaaViolation = report.violations.find(v => v.constraintId === 'constraint.healthcare.needs_compliance');
    expect(hipaaViolation).toBeDefined();
  });

  it('should satisfy mutually exclusive design profiles when one profile', () => {
    const ctx: BREContext = {
      industry: 'tech',
      businessModels: [],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
    };
    const decisions: RuleDecision[] = [
      {
        ruleId: 'test',
        ruleName: 'test',
        action: { type: 'add_design_profile', profileId: 'design.saas.modern' },
        confidence: 0.9,
        trace: 'test',
      },
    ];
    const report = solver.evaluate(ctx, decisions);
    const designViolation = report.violations.find(v => v.constraintId === 'constraint.mutually_exclusive.design_styles');
    expect(designViolation).toBeUndefined();
  });

  it('should violate mutually exclusive design profiles when two profiles', () => {
    const ctx: BREContext = {
      industry: 'tech',
      businessModels: [],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
    };
    const decisions: RuleDecision[] = [
      {
        ruleId: 'test',
        ruleName: 'test',
        action: { type: 'add_design_profile', profileId: 'design.saas.modern' },
        confidence: 0.9,
        trace: 'test',
      },
      {
        ruleId: 'test2',
        ruleName: 'test2',
        action: { type: 'add_design_profile', profileId: 'design.luxury.dark-opulence' },
        confidence: 0.9,
        trace: 'test2',
      },
    ];
    const report = solver.evaluate(ctx, decisions);
    const designViolation = report.violations.find(v => v.constraintId === 'constraint.mutually_exclusive.design_styles');
    expect(designViolation).toBeDefined();
  });

  it('should satisfy page count constraint with 5 pages', () => {
    const ctx: BREContext = {
      industry: 'tech',
      businessModels: [],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
    };
    const decisions: RuleDecision[] = Array.from({ length: 5 }, (_, i) => ({
      ruleId: 'test',
      ruleName: 'test',
      action: { type: 'add_page' as const, path: '/page-' + String(i), name: 'Page ' + String(i), sections: [] },
      confidence: 0.9,
      trace: 'test',
    }));
    const report = solver.evaluate(ctx, decisions);
    const pageCountViolation = report.violations.find(v => v.constraintId === 'constraint.performance.page_count');
    expect(pageCountViolation).toBeUndefined();
  });

  it('should violate page count constraint with too few pages', () => {
    const ctx: BREContext = {
      industry: 'tech',
      businessModels: [],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
    };
    const decisions: RuleDecision[] = [
      {
        ruleId: 'test',
        ruleName: 'test',
        action: { type: 'add_page', path: '/', name: 'Home', sections: [] },
        confidence: 0.9,
        trace: 'test',
      },
    ];
    const report = solver.evaluate(ctx, decisions);
    const pageCountViolation = report.violations.find(v => v.constraintId === 'constraint.performance.page_count');
    expect(pageCountViolation).toBeDefined();
  });

  it('should skip non-applicable constraints', () => {
    const ctx: BREContext = {
      industry: 'tech',
      businessModels: [],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
    };
    const decisions: RuleDecision[] = [];
    const report = solver.evaluate(ctx, decisions);
    const ecomViolation = report.violations.find(v => v.constraintId === 'constraint.ecommerce.needs_payment');
    expect(ecomViolation).toBeUndefined();
  });

  it('report should have correct totals', () => {
    const ctx: BREContext = {
      industry: 'tech',
      businessModels: [],
      compliancePacks: [],
      capabilities: [],
      journeys: [],
      entities: [],
    };
    const decisions: RuleDecision[] = [];
    const report = solver.evaluate(ctx, decisions);
    expect(report.totalConstraints).toBe(5);
    expect(report.satisfied + report.violated).toBe(report.totalConstraints);
  });
});
