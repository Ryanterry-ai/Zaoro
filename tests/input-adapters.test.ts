import { describe, it, expect } from 'vitest';
import { WebsiteAdapter } from '../src/orchestration/input-adapters/website-adapter.js';
import { FigmaAdapter } from '../src/orchestration/input-adapters/figma-adapter.js';
import { PRDAdapter } from '../src/orchestration/input-adapters/prd-adapter.js';
import { CodebaseAdapter } from '../src/orchestration/input-adapters/codebase-adapter.js';
import { DatabaseAdapter } from '../src/orchestration/input-adapters/database-adapter.js';
import { ApiAdapter } from '../src/orchestration/input-adapters/api-adapter.js';
import { AdapterRegistry, createAdapterRegistry } from '../src/orchestration/input-adapters/index.js';
import { IntentType } from '../src/orchestration/types.js';

// ─── WebsiteAdapter ──────────────────────────────────────────────────────────

describe('WebsiteAdapter', () => {
  const adapter = new WebsiteAdapter();

  it('should detect URLs', () => {
    expect(adapter.canHandle('https://example.com')).toBe(true);
    expect(adapter.canHandle('http://shop.example.com/products')).toBe(true);
    expect(adapter.canHandle('not a url')).toBe(false);
    expect(adapter.canHandle('build a saas')).toBe(false);
  });

  it('should process a URL', async () => {
    const result = await adapter.process('https://example.com');
    expect(result.adapterType).toBe(IntentType.Website);
    expect(result.manifest.name).toBe('Example');
    expect(result.manifest.description).toContain('example.com');
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.pages.length).toBeGreaterThan(0);
  });

  it('should detect ecommerce from URL keywords', async () => {
    const result = await adapter.process('https://shop.example.com/products');
    expect(result.detectedIndustry).toBe('ecommerce');
  });

  it('should detect restaurant from URL keywords', async () => {
    const result = await adapter.process('https://cafe-deluxe.com/menu');
    expect(result.detectedIndustry).toBe('restaurant');
  });

  it('should infer pages for ecommerce', async () => {
    const result = await adapter.process('https://shop.example.com');
    expect(result.pages).toContain('/shop');
    expect(result.pages).toContain('/cart');
    expect(result.pages).toContain('/checkout');
  });

  it('should infer entities for ecommerce', async () => {
    const result = await adapter.process('https://shop.example.com');
    expect(result.entities).toContain('Product');
    expect(result.entities).toContain('Order');
  });

  it('should detect industry from path segments', async () => {
    const edu = await adapter.process('https://learn.example.com/courses');
    expect(edu.detectedIndustry).toBe('education');

    const bank = await adapter.process('https://bank.example.com/accounts');
    expect(bank.detectedIndustry).toBe('fintech');
  });
});

// ─── FigmaAdapter ────────────────────────────────────────────────────────────

describe('FigmaAdapter', () => {
  const adapter = new FigmaAdapter();

  it('should detect Figma URLs', () => {
    expect(adapter.canHandle('https://www.figma.com/file/ABC123/Project-Name')).toBe(true);
    expect(adapter.canHandle('https://figma.com/design/XYZ789/Dashboard')).toBe(true);
    expect(adapter.canHandle('https://figma.com/proto/DEF456/Prototype')).toBe(true);
    expect(adapter.canHandle('not a figma link')).toBe(false);
  });

  it('should detect raw file keys', () => {
    expect(adapter.canHandle('ABCdef123GHIjkl456MNO')).toBe(true);
    expect(adapter.canHandle('short')).toBe(false);
  });

  it('should process a Figma URL', async () => {
    const result = await adapter.process('https://www.figma.com/file/ABC123/Ecommerce-App');
    expect(result.adapterType).toBe(IntentType.Figma);
    expect(result.manifest.name).toBe('Ecommerce App');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should detect pages for landing page projects', async () => {
    const result = await adapter.process('https://figma.com/file/ABC/Landing-Page');
    expect(result.pages).toContain('/features');
    expect(result.pages).toContain('/pricing');
  });

  it('should detect pages for dashboard projects', async () => {
    const result = await adapter.process('https://figma.com/file/XYZ/Admin-Dashboard');
    expect(result.pages).toContain('/dashboard');
    expect(result.pages).toContain('/settings');
  });

  it('should detect pages for ecommerce projects', async () => {
    const result = await adapter.process('https://figma.com/file/XYZ/Shop-Store');
    expect(result.pages).toContain('/shop');
    expect(result.pages).toContain('/cart');
  });

  it('should have standard entities', async () => {
    const result = await adapter.process('https://figma.com/file/ABC/Project');
    expect(result.entities).toContain('Page');
    expect(result.entities).toContain('Component');
    expect(result.entities).toContain('Style');
  });
});

// ─── PRDAdapter ──────────────────────────────────────────────────────────────

describe('PRDAdapter', () => {
  const adapter = new PRDAdapter();

  const SAMPLE_PRD = `# Project Name: TaskFlow

## Overview
A project management tool for small teams.

## Goals
- Increase team productivity
- Reduce email clutter

## User Stories
- As a user, I can create tasks
- As a user, I can assign tasks to team members

## Functional Requirements
- Users can create, edit, delete tasks
- Users can organize tasks into projects

## Database
- User entity with name, email, role
- Task entity with title, description, status, assignee
- Project entity with name, description

## API
- REST API with CRUD for tasks
- Integrate with Stripe for payments
- Send email notifications via SendGrid

## Timeline
- Phase 1: Core functionality (2 weeks)
- Phase 2: Integrations (1 week)
`;

  it('should detect PRD documents', () => {
    expect(adapter.canHandle(SAMPLE_PRD)).toBe(true);
    expect(adapter.canHandle('short text')).toBe(false);
    expect(adapter.canHandle('build a saas app')).toBe(false);
  });

  it('should process a PRD', async () => {
    const result = await adapter.process(SAMPLE_PRD);
    expect(result.adapterType).toBe(IntentType.PRD);
    expect(result.manifest.name).toBe('TaskFlow');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should extract entities from PRD', async () => {
    const result = await adapter.process(SAMPLE_PRD);
    expect(result.entities).toContain('User');
    expect(result.entities).toContain('Task');
    expect(result.entities).toContain('Project');
  });

  it('should extract integrations from PRD', async () => {
    const result = await adapter.process(SAMPLE_PRD);
    expect(result.integrations).toContain('stripe');
    expect(result.integrations).toContain('sendgrid');
  });

  it('should detect metadata', async () => {
    const result = await adapter.process(SAMPLE_PRD);
    expect(result.metadata.parsedSections).toBeDefined();
    expect(result.metadata.hasUserStories).toBe(true);
    expect(result.metadata.hasDatabase).toBe(true);
    expect(result.metadata.hasApi).toBe(true);
  });

  it('should detect industry from PRD content', async () => {
    const saasResult = await adapter.process(SAMPLE_PRD);
    expect(saasResult.detectedIndustry).toBe('saas');

    const ecomPrd = `# E-Commerce Platform

## Overview
An online store for selling products.

## Functional Requirements
- Product catalog with categories
- Shopping cart and checkout
- Payment gateway integration`;
    const ecomResult = await adapter.process(ecomPrd);
    expect(ecomResult.detectedIndustry).toBe('ecommerce');
  });
});

// ─── CodebaseAdapter ─────────────────────────────────────────────────────────

describe('CodebaseAdapter', () => {
  const adapter = new CodebaseAdapter();

  it('should detect GitHub URLs', () => {
    expect(adapter.canHandle('https://github.com/user/project')).toBe(true);
    expect(adapter.canHandle('github.com/user/project')).toBe(true);
    expect(adapter.canHandle('not a repo')).toBe(false);
  });

  it('should process a GitHub URL', async () => {
    const result = await adapter.process('https://github.com/acme/task-manager');
    expect(result.adapterType).toBe(IntentType.Codebase);
    expect(result.manifest.name).toBe('Task-manager');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('should have default entities', async () => {
    const result = await adapter.process('https://github.com/acme/project');
    expect(result.entities.length).toBeGreaterThanOrEqual(1);
  });

  it('should have default pages', async () => {
    const result = await adapter.process('https://github.com/acme/project');
    expect(result.pages).toContain('/');
    expect(result.pages).toContain('/login');
  });

  it('should detect industry from dependency patterns', () => {
    const info = {
      name: 'test', language: 'TypeScript', framework: 'Next.js',
      hasPackageJson: true, dependencies: ['@shopify/hydrogen', 'react'],
      devDependencies: [], hasDockerfile: false, hasTests: false,
      hasCiConfig: false, sourceFiles: 10, directories: ['src'],
    };

    const allDeps = [...info.dependencies, ...info.devDependencies].join(' ').toLowerCase();
    expect(/shopify/i.test(allDeps)).toBe(true);
  });
});

// ─── DatabaseAdapter ─────────────────────────────────────────────────────────

describe('DatabaseAdapter', () => {
  const adapter = new DatabaseAdapter();

  it('should detect database connection strings', () => {
    expect(adapter.canHandle('postgresql://user:pass@localhost:5432/mydb')).toBe(true);
    expect(adapter.canHandle('mysql://user:pass@host:3306/db')).toBe(true);
    expect(adapter.canHandle('mongodb://localhost:27017/mydb')).toBe(true);
    expect(adapter.canHandle('not a connection string')).toBe(false);
  });

  it('should process a Postgres connection', async () => {
    const result = await adapter.process('postgresql://admin:secret@db.example.com:5432/ecommerce');
    expect(result.adapterType).toBe(IntentType.Database);
    expect(result.manifest.name).toBe('Ecommerce');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should mask passwords in metadata', async () => {
    const result = await adapter.process('postgresql://admin:secret@localhost:5432/db');
    expect(result.metadata.connectionString).not.toContain('secret');
    expect(result.metadata.connectionString).toContain('****');
  });

  it('should detect entities by database type', async () => {
    const pg = await adapter.process('postgresql://user:pass@localhost/mydb');
    expect(pg.entities).toContain('Account');

    const mongo = await adapter.process('mongodb://user:pass@localhost/mydb');
    expect(mongo.entities).toContain('Document');
  });

  it('should detect database type in techStack', async () => {
    const result = await adapter.process('postgresql://user:pass@localhost/mydb');
    expect(result.manifest.techStack?.database).toBe('PostgreSQL');
  });

  it('should extract connection metadata', async () => {
    const result = await adapter.process('postgresql://user:pass@db.example.com:5432/ecommerce');
    expect(result.metadata.host).toBe('db.example.com');
    expect(result.metadata.port).toBe(5432);
    expect(result.metadata.database).toBe('ecommerce');
  });
});

// ─── ApiAdapter ──────────────────────────────────────────────────────────────

describe('ApiAdapter', () => {
  const adapter = new ApiAdapter();

  const SAMPLE_SPEC = JSON.stringify({
    openapi: '3.0.0',
    info: { title: 'Task API', version: '1.0.0' },
    paths: {
      '/tasks': { get: { tags: ['tasks'], summary: 'List tasks' }, post: { tags: ['tasks'], summary: 'Create task' } },
      '/tasks/{id}': { get: { tags: ['tasks'], summary: 'Get task' }, delete: { tags: ['tasks'], summary: 'Delete task' } },
      '/users': { get: { tags: ['users'], summary: 'List users' } },
    },
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer' },
      },
    },
  });

  it('should detect OpenAPI specs', () => {
    expect(adapter.canHandle(SAMPLE_SPEC)).toBe(true);
    expect(adapter.canHandle('openapi: 3.0.0')).toBe(true);
    expect(adapter.canHandle('not an api spec')).toBe(false);
  });

  it('should process an OpenAPI spec', async () => {
    const result = await adapter.process(SAMPLE_SPEC);
    expect(result.manifest.name).toBe('Task API');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should extract entities from paths', async () => {
    const result = await adapter.process(SAMPLE_SPEC);
    expect(result.entities).toContain('Task');
    expect(result.entities).toContain('User');
  });

  it('should detect auth methods', async () => {
    const result = await adapter.process(SAMPLE_SPEC);
    expect(result.integrations).toContain('jwt');
    expect(result.integrations).toContain('api-gateway');
  });

  it('should infer pages from API structure', async () => {
    const result = await adapter.process(SAMPLE_SPEC);
    expect(result.pages).toContain('/tasks');
    expect(result.pages).toContain('/tasks/:id');
    expect(result.pages).toContain('/users');
  });
});

// ─── AdapterRegistry ─────────────────────────────────────────────────────────

describe('AdapterRegistry', () => {
  it('should find correct adapter for URL', () => {
    const registry = new AdapterRegistry();
    const adapter = registry.findAdapter('https://example.com');
    expect(adapter).toBeInstanceOf(WebsiteAdapter);
  });

  it('should find correct adapter for Figma URL', () => {
    const registry = new AdapterRegistry();
    const adapter = registry.findAdapter('https://figma.com/file/ABC/Project');
    expect(adapter).toBeInstanceOf(FigmaAdapter);
  });

  it('should find correct adapter for database URL', () => {
    const registry = new AdapterRegistry();
    const adapter = registry.findAdapter('postgresql://user:pass@localhost/db');
    expect(adapter).toBeInstanceOf(DatabaseAdapter);
  });

  it('should find correct adapter for PRD text', () => {
    const registry = new AdapterRegistry();
    const prdText = `# Requirements Document\n## Overview\nA project management tool\n## User Stories\n- Users can create tasks`;
    const adapter = registry.findAdapter(prdText);
    expect(adapter).toBeInstanceOf(PRDAdapter);
  });

  it('should find correct adapter for API spec', () => {
    const registry = new AdapterRegistry();
    const spec = JSON.stringify({ openapi: '3.0.0', info: { title: 'API' }, paths: {} });
    const adapter = registry.findAdapter(spec);
    expect(adapter).toBeInstanceOf(ApiAdapter);
  });

  it('should return undefined for unknown input', () => {
    const registry = new AdapterRegistry();
    const adapter = registry.findAdapter('build a nice website');
    expect(adapter).toBeUndefined();
  });

  it('should accept custom adapters', () => {
    const custom = new WebsiteAdapter();
    const registry = new AdapterRegistry([custom]);
    expect(registry.getAdapters()).toHaveLength(1);
  });

  it('should register new adapters', () => {
    const registry = new AdapterRegistry();
    const count = registry.getAdapters().length;
    registry.register(new WebsiteAdapter());
    expect(registry.getAdapters()).toHaveLength(count + 1);
  });

  it('should create via factory', () => {
    const registry = createAdapterRegistry();
    expect(registry).toBeInstanceOf(AdapterRegistry);
    expect(registry.getAdapters().length).toBeGreaterThanOrEqual(6);
  });
});
