import { describe, it, expect } from 'vitest';
import { BlueprintCompilerV2, type BlueprintCompilerInput } from '../src/bos/reasoning/blueprint-compiler-v2.js';
import type { BREContext, RuleDecision } from '../src/bos/reasoning/rules-engine.js';
import type { ConstraintReport } from '../src/bos/reasoning/constraint-solver.js';

describe('BlueprintCompilerV2', () => {
  const compiler = new BlueprintCompilerV2();

  function makeContext(overrides: Partial<BREContext> = {}): BREContext {
    return {
      industry: 'saas',
      businessModels: ['subscription'],
      compliancePacks: [],
      capabilities: [],
      journeys: ['customer'],
      entities: [],
      appName: 'TestSaaS',
      description: 'A test SaaS application',
      ...overrides,
    };
  }

  function makeDecision(action: RuleDecision['action'], ruleId = 'test.rule'): RuleDecision {
    return {
      ruleId,
      ruleName: 'Test Rule',
      action,
      confidence: 0.9,
      trace: 'test trace',
    };
  }

  function makeConstraintReport(overrides: Partial<ConstraintReport> = {}): ConstraintReport {
    return {
      totalConstraints: 0,
      satisfied: 0,
      violated: 0,
      violations: [],
      ...overrides,
    };
  }

  function makeInput(overrides: Partial<BlueprintCompilerInput> = {}): BlueprintCompilerInput {
    return {
      context: makeContext(),
      decisions: [],
      constraintReport: makeConstraintReport(),
      vocabulary: {},
      knowledgeRefs: [],
      ...overrides,
    };
  }

  it('should compile a basic blueprint from empty decisions', () => {
    const blueprint = compiler.compile(makeInput());
    expect(blueprint).toBeDefined();
    expect(blueprint.id).toMatch(/^blueprint-/);
    expect(blueprint.version).toBe('2.0.0');
    expect(blueprint.name).toBe('TestSaaS');
    expect(blueprint.industry).toBe('saas');
    expect(blueprint.createdAt).toBeDefined();
  });

  it('should compile pages from add_page decisions', () => {
    const decisions: RuleDecision[] = [
      makeDecision({ type: 'add_page', path: '/', name: 'Home', sections: ['hero', 'features'] }),
      makeDecision({ type: 'add_page', path: '/pricing', name: 'Pricing', sections: ['pricing-table'] }),
      makeDecision({ type: 'add_page', path: '/dashboard', name: 'Dashboard', sections: ['stats'] }),
    ];

    const blueprint = compiler.compile(makeInput({ decisions }));
    expect(blueprint.pages.length).toBeGreaterThanOrEqual(3);

    const home = blueprint.pages.find(p => p.path === '/');
    expect(home).toBeDefined();
    expect(home!.name).toBe('Home');
    expect(home!.type).toBe('home');
    expect(home!.isEntry).toBe(true);

    const dashboard = blueprint.pages.find(p => p.path === '/dashboard');
    expect(dashboard).toBeDefined();
    expect(dashboard!.type).toBe('dashboard');

    const pricing = blueprint.pages.find(p => p.path === '/pricing');
    expect(pricing).toBeDefined();
    expect(pricing!.type).toBe('page');
  });

  it('should merge sections for duplicate page paths', () => {
    const decisions: RuleDecision[] = [
      makeDecision({ type: 'add_page', path: '/', name: 'Home', sections: ['hero'] }),
      makeDecision({ type: 'add_page', path: '/', name: 'Home', sections: ['features'] }),
    ];

    const blueprint = compiler.compile(makeInput({ decisions }));
    const home = blueprint.pages.find(p => p.path === '/');
    expect(home!.sections).toContain('hero');
    expect(home!.sections).toContain('features');
  });

  it('should compile entities from add_entity decisions', () => {
    const decisions: RuleDecision[] = [
      makeDecision({ type: 'add_entity', name: 'Product', fields: ['name', 'price', 'sku'] }),
      makeDecision({ type: 'add_entity', name: 'Category', fields: ['name', 'slug'] }),
    ];

    const blueprint = compiler.compile(makeInput({ decisions }));
    const entities = blueprint.entities.filter(e => e.name !== 'User');
    expect(entities).toHaveLength(2);

    const product = entities.find(e => e.name === 'Product');
    expect(product).toBeDefined();
    expect(product!.fields.length).toBe(3);
    expect(product!.fields.find(f => f.name === 'sku')!.unique).toBe(true);
  });

  it('should always include a User entity', () => {
    const blueprint = compiler.compile(makeInput({ decisions: [] }));
    const user = blueprint.entities.find(e => e.name === 'User');
    expect(user).toBeDefined();
    expect(user!.fields.find(f => f.name === 'email')!.unique).toBe(true);
    expect(user!.fields.find(f => f.name === 'id')!.required).toBe(true);
  });

  it('should add default User entity even when other entities exist', () => {
    const decisions: RuleDecision[] = [
      makeDecision({ type: 'add_entity', name: 'Post', fields: ['title', 'content'] }),
    ];
    const blueprint = compiler.compile(makeInput({ decisions }));
    const user = blueprint.entities.find(e => e.name === 'User');
    expect(user).toBeDefined();
  });

  it('should compile workflows from add_workflow decisions', () => {
    const decisions: RuleDecision[] = [
      makeDecision({ type: 'add_workflow', name: 'Checkout', steps: ['validate', 'charge', 'confirm'] }),
    ];

    const blueprint = compiler.compile(makeInput({ decisions }));
    expect(blueprint.workflows).toHaveLength(1);
    expect(blueprint.workflows[0]!.name).toBe('Checkout');
    expect(blueprint.workflows[0]!.steps).toHaveLength(3);
  });

  it('should compile integrations from add_integration decisions', () => {
    const decisions: RuleDecision[] = [
      makeDecision({ type: 'add_integration', integrationType: 'payment', name: 'Stripe', required: true }),
    ];

    const blueprint = compiler.compile(makeInput({ decisions }));
    expect(blueprint.integrations).toHaveLength(1);
    expect(blueprint.integrations[0]!.name).toBe('Stripe');
    expect(blueprint.integrations[0]!.required).toBe(true);
  });

  it('should compile permissions from add_permission decisions', () => {
    const decisions: RuleDecision[] = [
      makeDecision({ type: 'add_permission', role: 'admin', resource: 'users', actions: ['create', 'read', 'update', 'delete'] }),
    ];

    const blueprint = compiler.compile(makeInput({ decisions }));
    expect(blueprint.permissions).toHaveLength(1);
    expect(blueprint.permissions[0]!.role).toBe('admin');
    expect(blueprint.permissions[0]!.resource).toBe('users');
  });

  it('should generate navigation from page decisions', () => {
    const decisions: RuleDecision[] = [
      makeDecision({ type: 'add_page', path: '/', name: 'Home', sections: [] }),
      makeDecision({ type: 'add_page', path: '/about', name: 'About', sections: [] }),
      makeDecision({ type: 'add_page', path: '/pricing', name: 'Pricing', sections: [] }),
    ];

    const blueprint = compiler.compile(makeInput({ decisions }));
    expect(blueprint.navigation.items).toHaveLength(3);
    expect(blueprint.navigation.style).toBe('horizontal');
    expect(blueprint.navigation.sticky).toBe(true);
    expect(blueprint.navigation.logo).toBe(true);
  });

  it('should exclude dynamic routes from navigation', () => {
    const decisions: RuleDecision[] = [
      makeDecision({ type: 'add_page', path: '/', name: 'Home', sections: [] }),
      makeDecision({ type: 'add_page', path: '/products/:id', name: 'Product Detail', sections: [] }),
    ];

    const blueprint = compiler.compile(makeInput({ decisions }));
    expect(blueprint.navigation.items).toHaveLength(1);
    expect(blueprint.navigation.items[0]!.href).toBe('/');
  });

  it('should compile database plan from entities', () => {
    const decisions: RuleDecision[] = [
      makeDecision({ type: 'add_entity', name: 'Product', fields: ['id', 'name', 'email'] }),
    ];

    const blueprint = compiler.compile(makeInput({ decisions }));
    expect(blueprint.database.engine).toBe('postgresql');
    expect(blueprint.database.tables.length).toBeGreaterThanOrEqual(1);

    const productTable = blueprint.database.tables.find(t => t.name === 'products');
    expect(productTable).toBeDefined();
    expect(productTable!.columns.length).toBe(3);
  });

  it('should compile routes for pages', () => {
    const decisions: RuleDecision[] = [
      makeDecision({ type: 'add_page', path: '/', name: 'Home', sections: [] }),
      makeDecision({ type: 'add_page', path: '/about', name: 'About', sections: [] }),
    ];

    const blueprint = compiler.compile(makeInput({ decisions }));
    const pageRoutes = blueprint.routes.filter(r => r.handler.startsWith('page:'));
    expect(pageRoutes.length).toBeGreaterThanOrEqual(2);
  });

  it('should compile layout plans', () => {
    const blueprint = compiler.compile(makeInput());
    expect(blueprint.layouts.length).toBeGreaterThanOrEqual(2);
    expect(blueprint.layouts.find(l => l.name === 'Default Layout')).toBeDefined();
    expect(blueprint.layouts.find(l => l.name === 'Dashboard Layout')).toBeDefined();
  });

  it('should compile API endpoints for entities', () => {
    const decisions: RuleDecision[] = [
      makeDecision({ type: 'add_entity', name: 'Order', fields: ['id', 'total'] }),
    ];

    const blueprint = compiler.compile(makeInput({ decisions }));
    const orderApis = blueprint.apis.filter(a => a.path.includes('order'));
    expect(orderApis.length).toBe(5);
    expect(orderApis.some(a => a.method === 'GET')).toBe(true);
    expect(orderApis.some(a => a.method === 'POST')).toBe(true);
    expect(orderApis.some(a => a.method === 'DELETE')).toBe(true);
  });

  it('should compile dashboard widgets when dashboard page exists', () => {
    const decisions: RuleDecision[] = [
      makeDecision({ type: 'add_page', path: '/dashboard', name: 'Dashboard', sections: [] }),
      makeDecision({ type: 'add_entity', name: 'Sale', fields: ['id', 'amount'] }),
    ];

    const blueprint = compiler.compile(makeInput({ decisions }));
    expect(blueprint.dashboardWidgets.length).toBeGreaterThanOrEqual(3);
    expect(blueprint.charts.length).toBeGreaterThanOrEqual(2);
  });

  it('should not compile dashboard widgets when no dashboard page', () => {
    const decisions: RuleDecision[] = [
      makeDecision({ type: 'add_page', path: '/', name: 'Home', sections: [] }),
    ];

    const blueprint = compiler.compile(makeInput({ decisions }));
    expect(blueprint.dashboardWidgets).toHaveLength(0);
    expect(blueprint.charts).toHaveLength(0);
  });

  it('should compile forms for each entity', () => {
    const decisions: RuleDecision[] = [
      makeDecision({ type: 'add_entity', name: 'Contact', fields: ['id', 'name', 'email'] }),
    ];

    const blueprint = compiler.compile(makeInput({ decisions }));
    const contactForm = blueprint.forms.find(f => f.entity === 'Contact');
    expect(contactForm).toBeDefined();
    expect(contactForm!.fields.length).toBe(2);
    expect(contactForm!.submitAction).toBe('/api/contact');
  });

  it('should compile tables for each entity', () => {
    const decisions: RuleDecision[] = [
      makeDecision({ type: 'add_entity', name: 'User', fields: ['id', 'name', 'email'] }),
    ];

    const blueprint = compiler.compile(makeInput({ decisions }));
    const userTable = blueprint.tables.find(t => t.entity === 'User');
    expect(userTable).toBeDefined();
    expect(userTable!.pagination).toBe(true);
    expect(userTable!.pageSize).toBe(20);
  });

  it('should compile design tokens from selected profile', () => {
    const selectedDesignProfile = { id: 'dark-tech', name: 'Dark Tech', score: 85, breakdown: {}, reason: 'good fit' };
    const blueprint = compiler.compile(makeInput({ selectedDesignProfile }));
    expect(blueprint.designTokens).toBeDefined();
    expect((blueprint.designTokens as Record<string, unknown>).profileId).toBe('dark-tech');
  });

  it('should use default design tokens when no profile selected', () => {
    const blueprint = compiler.compile(makeInput());
    expect(blueprint.designTokens).toBeDefined();
    const tokens = blueprint.designTokens as Record<string, Record<string, string>>;
    expect(tokens.colors?.primary).toBe('#7C3AED');
  });

  it('should compile vocabulary from input', () => {
    const vocabulary = { product: 'item', user: 'member' };
    const blueprint = compiler.compile(makeInput({ vocabulary }));
    expect(blueprint.vocabulary).toEqual(vocabulary);
  });

  it('should compute confidence based on decisions and constraints', () => {
    const decisions: RuleDecision[] = Array.from({ length: 12 }, (_, i) =>
      makeDecision({ type: 'add_page', path: `/${i}`, name: `Page ${i}`, sections: [] }, `rule.${i}`)
    );

    const blueprint = compiler.compile(makeInput({
      decisions,
      constraintReport: makeConstraintReport({ violated: 0 }),
    }));

    expect(blueprint.confidence).toBeGreaterThan(0.5);
    expect(blueprint.confidence).toBeLessThanOrEqual(1);
  });

  it('should decrease confidence when constraints are violated', () => {
    const decisions: RuleDecision[] = Array.from({ length: 12 }, (_, i) =>
      makeDecision({ type: 'add_page', path: `/${i}`, name: `Page ${i}`, sections: [] }, `rule.${i}`)
    );

    const blueprintViolated = compiler.compile(makeInput({
      decisions,
      constraintReport: makeConstraintReport({ violated: 3, violations: [] }),
    }));

    const blueprintClean = compiler.compile(makeInput({
      decisions,
      constraintReport: makeConstraintReport({ violated: 0, violations: [] }),
    }));

    expect(blueprintViolated.confidence).toBeLessThan(blueprintClean.confidence);
  });

  it('should compile warnings from constraint violations', () => {
    const constraintReport = makeConstraintReport({
      violated: 1,
      violations: [
        {
          constraintId: 'c1',
          constraintName: 'Test Constraint',
          violations: ['Missing required field'],
          suggestions: ['Add the field'],
        },
      ],
    });

    const blueprint = compiler.compile(makeInput({ constraintReport }));
    expect(blueprint.warnings).toContain('Missing required field');
    expect(blueprint.warnings).toContain('Suggestion: Add the field');
  });

  it('should include provenance with compiler name', () => {
    const blueprint = compiler.compile(makeInput({
      knowledgeRefs: [{ id: 'k1', version: '1.0.0' }],
    }));

    expect(blueprint.provenance.compilers).toContain('blueprint-compiler-v2');
    expect(blueprint.provenance.knowledge).toHaveLength(1);
  });

  it('should infer page type from path', () => {
    const decisions: RuleDecision[] = [
      makeDecision({ type: 'add_page', path: '/', name: 'Home', sections: [] }),
      makeDecision({ type: 'add_page', path: '/login', name: 'Login', sections: [] }),
      makeDecision({ type: 'add_page', path: '/register', name: 'Register', sections: [] }),
      makeDecision({ type: 'add_page', path: '/dashboard', name: 'Dashboard', sections: [] }),
      makeDecision({ type: 'add_page', path: '/products/:id', name: 'Product', sections: [] }),
    ];

    const blueprint = compiler.compile(makeInput({ decisions }));
    expect(blueprint.pages.find(p => p.path === '/')!.type).toBe('home');
    expect(blueprint.pages.find(p => p.path === '/login')!.type).toBe('auth');
    expect(blueprint.pages.find(p => p.path === '/register')!.type).toBe('auth');
    expect(blueprint.pages.find(p => p.path === '/dashboard')!.type).toBe('dashboard');
    expect(blueprint.pages.find(p => p.path === '/products/:id')!.type).toBe('detail');
  });
});
