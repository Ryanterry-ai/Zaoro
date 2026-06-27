import { describe, it, expect } from 'vitest';
import { DeterministicCodeGenerator, type GeneratedFile, type GenerationOptions } from '../src/generation/deterministic-generator.js';
import type { ApplicationBlueprint } from '../src/bos/schemas/blueprint/application-blueprint.schema.js';

function makeBlueprint(overrides: Partial<ApplicationBlueprint> = {}): ApplicationBlueprint {
  return {
    id: 'test-blueprint-1',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    name: 'TestApp',
    description: 'A test application',
    industry: 'saas',
    businessModels: [],
    compliancePacks: [],
    journeys: [],
    pages: [
      {
        id: 'page-0',
        path: '/',
        name: 'Home',
        type: 'home',
        sections: ['Hero', 'Features'],
        components: [],
        dataRequirements: [],
        permissions: [],
        isEntry: true,
      },
      {
        id: 'page-1',
        path: '/about',
        name: 'About',
        type: 'page',
        sections: ['AboutContent'],
        components: [],
        dataRequirements: [],
        permissions: [],
      },
    ],
    routes: [],
    layouts: [
      {
        id: 'layout-default',
        name: 'Default Layout',
        areas: ['header', 'main', 'footer'],
        components: ['Header', 'Footer'],
        responsive: {},
      },
    ],
    navigation: {
      items: [
        { label: 'Home', href: '/' },
        { label: 'About', href: '/about' },
      ],
      style: 'horizontal',
      sticky: true,
      logo: true,
    },
    permissions: [],
    entities: [
      {
        id: 'entity-product',
        name: 'Product',
        slug: 'product',
        fields: [
          { name: 'name', type: 'string', required: true, indexed: false, unique: false },
          { name: 'price', type: 'number', required: true, indexed: false, unique: false },
        ],
        relationships: [],
        uiSections: [],
        workflows: [],
        permissions: [],
      },
    ],
    relationships: [],
    database: { engine: 'postgresql', tables: [] },
    apis: [],
    workflows: [],
    dashboardWidgets: [],
    charts: [],
    forms: [],
    tables: [],
    integrations: [],
    designTokens: {
      colors: { primary: '#7C3AED', secondary: '#3B82F6', background: '#09090B', foreground: '#FAFAFA' },
      typography: { heading: 'Inter', body: 'Inter' },
      spacing: { sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
    },
    generationRules: [],
    provenance: { knowledge: [], compilers: [] },
    vocabulary: {},
    confidence: 0.8,
    warnings: [],
    ...overrides,
  };
}

function makeOptions(overrides: Partial<GenerationOptions> = {}): GenerationOptions {
  return {
    framework: 'nextjs',
    styling: 'tailwind',
    typescript: true,
    outputDir: '/tmp/test-output',
    ...overrides,
  };
}

describe('DeterministicCodeGenerator', () => {
  const generator = new DeterministicCodeGenerator();

  it('should generate files from a blueprint', () => {
    const files = generator.generate(makeBlueprint(), makeOptions());
    expect(files).toBeDefined();
    expect(files.length).toBeGreaterThan(0);
  });

  it('should generate config files for nextjs', () => {
    const files = generator.generate(makeBlueprint(), makeOptions());
    const configFiles = files.filter(f => f.type === 'config');
    expect(configFiles.length).toBeGreaterThanOrEqual(2);

    const nextConfig = configFiles.find(f => f.path === 'next.config.js');
    expect(nextConfig).toBeDefined();
    expect(nextConfig!.content).toContain('reactStrictMode');

    const packageJson = configFiles.find(f => f.path === 'package.json');
    expect(packageJson).toBeDefined();
    const pkg = JSON.parse(packageJson!.content);
    expect(pkg.name).toBe('testapp');
    expect(pkg.scripts.dev).toBe('next dev');
    expect(pkg.dependencies.next).toBeDefined();
  });

  it('should generate tailwind config with theme extensions', () => {
    const files = generator.generate(makeBlueprint(), makeOptions());
    const tailwindConfig = files.find(f => f.path === 'tailwind.config.js');
    expect(tailwindConfig).toBeDefined();
    expect(tailwindConfig!.content).toContain('tailwindcss');
    expect(tailwindConfig!.content).toContain('primary');
  });

  it('should generate type files for entities', () => {
    const files = generator.generate(makeBlueprint(), makeOptions());
    const typeFiles = files.filter(f => f.type === 'type');
    expect(typeFiles.length).toBeGreaterThan(0);

    const entityTypeFile = typeFiles.find(f => f.path === 'src/types/entities.ts');
    expect(entityTypeFile).toBeDefined();
    expect(entityTypeFile!.content).toContain('export interface Product');
    expect(entityTypeFile!.content).toContain('name: string');
    expect(entityTypeFile!.content).toContain('price: number');
  });

  it('should generate layout files', () => {
    const files = generator.generate(makeBlueprint(), makeOptions());
    const layoutFiles = files.filter(f => f.type === 'layout');
    expect(layoutFiles.length).toBeGreaterThan(0);

    const defaultLayout = layoutFiles.find(f => f.path.includes('default-layout'));
    expect(defaultLayout).toBeDefined();
    expect(defaultLayout!.content).toContain('DefaultLayout');
    expect(defaultLayout!.content).toContain('children');
  });

  it('should generate page files with imports', () => {
    const files = generator.generate(makeBlueprint(), makeOptions());
    const pageFiles = files.filter(f => f.type === 'page');
    expect(pageFiles.length).toBe(2);

    const homePage = pageFiles.find(f => f.path.includes('page.tsx') && f.path.startsWith('src/app/'));
    expect(homePage).toBeDefined();
    expect(homePage!.content).toContain('HomePage');
    expect(homePage!.content).toContain('Hero');
    expect(homePage!.content).toContain('Features');
    expect(homePage!.content).toContain("import { Hero } from '@/components/Hero'");
  });

  it('should generate component files for unique sections', () => {
    const files = generator.generate(makeBlueprint(), makeOptions());
    const componentFiles = files.filter(f => f.type === 'component');
    expect(componentFiles.length).toBeGreaterThanOrEqual(3);

    const heroComponent = componentFiles.find(f => f.path.includes('Hero'));
    expect(heroComponent).toBeDefined();
    expect(heroComponent!.content).toContain('export function Hero');
    expect(heroComponent!.content).toContain('className="py-16 px-6"');
  });

  it('should generate API route files for entities', () => {
    const files = generator.generate(makeBlueprint(), makeOptions());
    const apiFiles = files.filter(f => f.type === 'api');
    expect(apiFiles.length).toBeGreaterThanOrEqual(2);

    const listApi = apiFiles.find(f => f.path.includes('api/product/route.ts'));
    expect(listApi).toBeDefined();
    expect(listApi!.content).toContain('NextResponse');

    const detailApi = apiFiles.find(f => f.path.includes('api/product/[id]/route.ts'));
    expect(detailApi).toBeDefined();
    expect(detailApi!.content).toContain('DELETE');
  });

  it('should generate global CSS for tailwind styling', () => {
    const files = generator.generate(makeBlueprint(), makeOptions());
    const styleFiles = files.filter(f => f.type === 'style');
    expect(styleFiles.length).toBeGreaterThan(0);

    const globals = styleFiles.find(f => f.path === 'src/app/globals.css');
    expect(globals).toBeDefined();
    expect(globals!.content).toContain('@tailwind base');
    expect(globals!.content).toContain('--foreground');
    expect(globals!.content).toContain('--background');
  });

  it('should use .jsx extension when typescript is false', () => {
    const files = generator.generate(makeBlueprint(), makeOptions({ typescript: false }));

    const pageFiles = files.filter(f => f.type === 'page');
    expect(pageFiles.every(f => f.path.endsWith('.jsx'))).toBe(true);

    const componentFiles = files.filter(f => f.type === 'component');
    expect(componentFiles.every(f => f.path.endsWith('.jsx'))).toBe(true);

    const typeFiles = files.filter(f => f.type === 'type');
    expect(typeFiles.every(f => f.path.endsWith('.js'))).toBe(true);
  });

  it('should handle empty pages gracefully', () => {
    const blueprint = makeBlueprint({ pages: [] });
    const files = generator.generate(blueprint, makeOptions());
    const pageFiles = files.filter(f => f.type === 'page');
    expect(pageFiles).toHaveLength(0);
  });

  it('should handle empty entities gracefully', () => {
    const blueprint = makeBlueprint({ entities: [] });
    const files = generator.generate(blueprint, makeOptions());
    const apiFiles = files.filter(f => f.type === 'api');
    expect(apiFiles).toHaveLength(0);
  });

  it('should map field types to TypeScript types correctly', () => {
    const blueprint = makeBlueprint({
      entities: [
        {
          id: 'entity-all-types',
          name: 'AllTypes',
          slug: 'alltypes',
          fields: [
            { name: 'str', type: 'string', required: true, indexed: false, unique: false },
            { name: 'num', type: 'number', required: true, indexed: false, unique: false },
            { name: 'bool', type: 'boolean', required: true, indexed: false, unique: false },
            { name: 'date', type: 'date', required: true, indexed: false, unique: false },
            { name: 'img', type: 'image', required: true, indexed: false, unique: false },
          ],
          relationships: [],
          uiSections: [],
          workflows: [],
          permissions: [],
        },
      ],
    });

    const files = generator.generate(blueprint, makeOptions());
    const typeFile = files.find(f => f.path === 'src/types/entities.ts');
    expect(typeFile).toBeDefined();
    expect(typeFile!.content).toContain('str: string');
    expect(typeFile!.content).toContain('num: number');
    expect(typeFile!.content).toContain('bool: boolean');
    expect(typeFile!.content).toContain('date: string');
    expect(typeFile!.content).toContain('img: string');
  });

  it('should generate valid JSON in package.json', () => {
    const files = generator.generate(makeBlueprint(), makeOptions());
    const packageJson = files.find(f => f.path === 'package.json');
    expect(packageJson).toBeDefined();
    expect(() => JSON.parse(packageJson!.content)).not.toThrow();
  });

  it('should include design tokens in globals.css', () => {
    const blueprint = makeBlueprint({
      designTokens: {
        colors: { primary: '#FF0000', background: '#000000', foreground: '#FFFFFF' },
        typography: { heading: 'Poppins', body: 'Inter' },
      },
    });

    const files = generator.generate(blueprint, makeOptions());
    const globals = files.find(f => f.path === 'src/app/globals.css');
    expect(globals).toBeDefined();
    expect(globals!.content).toContain('#FF0000');
    expect(globals!.content).toContain('#000000');
  });

  it('each generated file should have path, content, and type', () => {
    const files = generator.generate(makeBlueprint(), makeOptions());
    for (const file of files) {
      expect(file.path).toBeTruthy();
      expect(file.content).toBeTruthy();
      expect(['page', 'component', 'api', 'config', 'layout', 'style', 'type']).toContain(file.type);
    }
  });
});
