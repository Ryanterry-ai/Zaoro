import { describe, it, expect } from 'vitest';
import {
  BlueprintCompiler,
  serializeBlueprint,
  deserializeBlueprint,
  type BlueprintInput,
  type Blueprint,
} from '../src/bos/reasoning/blueprint-compiler.js';

describe('BlueprintCompiler', () => {
  const compiler = new BlueprintCompiler();

  function makeInput(overrides: Partial<BlueprintInput> = {}): BlueprintInput {
    return {
      name: 'TestApp',
      description: 'A test application',
      industry: 'saas',
      pages: [
        { path: '/', name: 'Home', sections: ['hero', 'features'] },
        { path: '/about', name: 'About' },
      ],
      ...overrides,
    };
  }

  it('should compile a valid blueprint from basic input', () => {
    const blueprint = compiler.compile(makeInput());
    expect(blueprint).toBeDefined();
    expect(blueprint.id).toMatch(/^blueprint-\d+$/);
    expect(blueprint.version).toBe('1.0.0');
    expect(blueprint.name).toBe('TestApp');
    expect(blueprint.description).toBe('A test application');
    expect(blueprint.industry).toBe('saas');
    expect(blueprint.compiledAt).toBeTypeOf('number');
  });

  it('should compile pages with correct structure', () => {
    const blueprint = compiler.compile(makeInput());
    expect(blueprint.pages).toHaveLength(2);

    const home = blueprint.pages[0]!;
    expect(home.id).toBe('page-0');
    expect(home.path).toBe('/');
    expect(home.name).toBe('Home');
    expect(home.isEntry).toBe(true);
    expect(home.sections).toEqual(['hero', 'features']);
    expect(home.seo.title).toBe('TestApp');
    expect(home.seo.keywords).toEqual(['saas']);

    const about = blueprint.pages[1]!;
    expect(about.id).toBe('page-1');
    expect(about.path).toBe('/about');
    expect(about.isEntry).toBe(false);
  });

  it('should compile entities with fields and relationships', () => {
    const input = makeInput({
      entities: [
        {
          name: 'Product',
          fields: [
            { name: 'name', type: 'string', required: true },
            { name: 'price', type: 'number', required: true },
            { name: 'sku', type: 'string', unique: true },
          ],
          relationships: [{ target: 'Category', type: 'belongs_to', foreignKey: 'categoryId' }],
          uiSections: ['product-list'],
        },
      ],
    });

    const blueprint = compiler.compile(input);
    expect(blueprint.entities).toHaveLength(1);

    const entity = blueprint.entities[0]!;
    expect(entity.id).toBe('entity-0');
    expect(entity.name).toBe('Product');
    expect(entity.slug).toBe('product');
    expect(entity.fields).toHaveLength(3);
    expect(entity.fields[0]!.name).toBe('name');
    expect(entity.fields[0]!.required).toBe(true);
    expect(entity.fields[2]!.unique).toBe(true);
    expect(entity.relationships).toHaveLength(1);
    expect(entity.relationships[0]!.target).toBe('Category');
    expect(entity.relationships[0]!.foreignKey).toBe('categoryId');
    expect(entity.uiSections).toEqual(['product-list']);
  });

  it('should compile workflows with steps', () => {
    const input = makeInput({
      workflows: [
        {
          name: 'Order Process',
          description: 'Process an order',
          trigger: 'order.created',
          steps: [
            { name: 'Validate', action: 'validate', entity: 'Order' },
            { name: 'Notify', action: 'notify', service: 'EmailService' },
          ],
          entities: ['Order'],
          services: ['EmailService'],
        },
      ],
    });

    const blueprint = compiler.compile(input);
    expect(blueprint.workflows).toHaveLength(1);

    const wf = blueprint.workflows[0]!;
    expect(wf.id).toBe('workflow-0');
    expect(wf.name).toBe('Order Process');
    expect(wf.trigger).toBe('order.created');
    expect(wf.steps).toHaveLength(2);
    expect(wf.steps[0]!.action).toBe('validate');
    expect(wf.steps[1]!.action).toBe('notify');
  });

  it('should compile design system with defaults', () => {
    const blueprint = compiler.compile(makeInput());
    const ds = blueprint.designSystem;

    expect(ds.colors.primary).toBe('#3B82F6');
    expect(ds.colors.background).toBe('#FFFFFF');
    expect(ds.typography.fontFamily).toContain('Inter');
    expect(ds.typography.fontSizes).toBeDefined();
    expect(ds.typography.fontWeights.normal).toBe(400);
    expect(ds.spacing).toBeDefined();
    expect(ds.borderRadius).toBeDefined();
    expect(ds.shadows).toBeDefined();
    expect(ds.animations.duration.fast).toBe('150ms');
  });

  it('should merge custom design system overrides', () => {
    const input = makeInput({
      designSystem: {
        colors: { primary: '#FF0000', background: '#000000' },
        typography: { fontFamily: 'Roboto, sans-serif' },
      },
    });

    const blueprint = compiler.compile(input);
    expect(blueprint.designSystem.colors.primary).toBe('#FF0000');
    expect(blueprint.designSystem.colors.background).toBe('#000000');
    expect(blueprint.designSystem.typography.fontFamily).toBe('Roboto, sans-serif');
    expect(blueprint.designSystem.colors.secondary).toBe('#10B981');
  });

  it('should compile sections', () => {
    const input = makeInput({
      sections: [
        {
          name: 'Hero Section',
          type: 'hero',
          layout: 'full',
          content: { title: 'Welcome' },
        },
      ],
    });

    const blueprint = compiler.compile(input);
    expect(blueprint.sections).toHaveLength(1);
    expect(blueprint.sections[0]!.id).toBe('section-0');
    expect(blueprint.sections[0]!.type).toBe('hero');
    expect(blueprint.sections[0]!.content).toEqual({ title: 'Welcome' });
  });

  it('should compile features with priorities', () => {
    const input = makeInput({
      features: [
        { name: 'Auth', description: 'User authentication', priority: 'must_have', implementation: 'full_stack' },
        { name: 'Analytics', priority: 'nice_to_have', implementation: 'ui_only' },
      ],
    });

    const blueprint = compiler.compile(input);
    expect(blueprint.features).toHaveLength(2);
    expect(blueprint.features[0]!.priority).toBe('must_have');
    expect(blueprint.features[1]!.priority).toBe('nice_to_have');
  });

  it('should compile integrations', () => {
    const input = makeInput({
      integrations: [
        { type: 'payment', name: 'Stripe', required: true, config: { apiKey: 'xxx' } },
      ],
    });

    const blueprint = compiler.compile(input);
    expect(blueprint.integrations).toHaveLength(1);
    expect(blueprint.integrations[0]!.name).toBe('Stripe');
    expect(blueprint.integrations[0]!.required).toBe(true);
  });

  it('should compile compliance requirements', () => {
    const input = makeInput({
      compliance: [
        { type: 'gdpr', name: 'GDPR', requirements: ['consent', 'right-to-erasure'], implementation: 'cookie-banner' },
      ],
    });

    const blueprint = compiler.compile(input);
    expect(blueprint.compliance).toHaveLength(1);
    expect(blueprint.compliance[0]!.requirements).toEqual(['consent', 'right-to-erasure']);
  });

  it('should populate vocabulary from input', () => {
    const input = makeInput({ vocabulary: { product: 'item', user: 'member' } });
    const blueprint = compiler.compile(input);
    expect(blueprint.vocabulary).toEqual({ product: 'item', user: 'member' });
  });

  it('should populate sourceIndustries and compositionPrimitives', () => {
    const input = makeInput({
      sourceIndustries: ['tech', 'startup'],
      compositionPrimitives: ['hero', 'pricing'],
      confidence: 0.95,
    });

    const blueprint = compiler.compile(input);
    expect(blueprint.sourceIndustries).toEqual(['tech', 'startup']);
    expect(blueprint.compositionPrimitives).toEqual(['hero', 'pricing']);
    expect(blueprint.confidence).toBe(0.95);
  });

  it('should add warnings for missing required fields', () => {
    const input = makeInput({ name: '', industry: '', pages: [] });
    const blueprint = compiler.compile(input);
    expect(blueprint.warnings).toContain('Missing name');
    expect(blueprint.warnings).toContain('Missing industry');
    expect(blueprint.warnings).toContain('No pages defined');
  });

  it('should default confidence to 0.8 when not provided', () => {
    const input = makeInput();
    delete (input as Record<string, unknown>).confidence;
    const blueprint = compiler.compile(input);
    expect(blueprint.confidence).toBe(0.8);
  });

  it('should serialize and deserialize a blueprint', () => {
    const blueprint = compiler.compile(makeInput());
    const json = serializeBlueprint(blueprint);
    expect(typeof json).toBe('string');

    const restored = deserializeBlueprint(json);
    expect(restored.id).toBe(blueprint.id);
    expect(restored.name).toBe(blueprint.name);
    expect(restored.pages).toHaveLength(blueprint.pages.length);
    expect(restored.designSystem.colors.primary).toBe(blueprint.designSystem.colors.primary);
  });
});
