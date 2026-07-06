import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { writeComponentSpecManifest, loadComponentSpecManifest } from '../src/generation/component-spec-writer.js';
import { WorktreeManager } from '../src/generation/worktree-manager.js';
import { assembleRenderResults, validateAssembly, writeAssemblyResult } from '../src/generation/assembly-gate.js';
import type { ApplicationSpec } from '../src/bos/schemas/blueprint/execution-blueprint.schema.js';
import type { AssemblyInput } from '../src/generation/assembly-gate.js';

const TEST_DIR = path.join(process.cwd(), '.test-e2e-worktree');

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

function make3PageSpec(): ApplicationSpec {
  return {
    id: 'e2e-test-ws',
    createdAt: new Date().toISOString(),
    appId: 'e2e-app',
    appName: 'E2E App',
    industry: 'technology',
    themeId: 'dark',
    pages: [
      {
        pageId: 'home', path: '/', name: 'Home', type: 'public', layout: 'default',
        components: [
          { type: 'HeroBanner', content: { title: { value: 'Welcome', type: 'text' } } },
          { type: 'FeatureGrid', items: [{ title: 'Fast', description: 'Really fast' }] },
          { type: 'CTA', actions: [{ label: 'Get Started', action: '/signup' }] },
        ],
      },
      {
        pageId: 'about', path: '/about', name: 'About', type: 'public', layout: 'default',
        components: [
          { type: 'HeroBanner', content: { title: { value: 'About Us', type: 'text' } } },
          { type: 'Stats', stats: [{ label: 'Users', value: '10K' }] },
        ],
      },
      {
        pageId: 'contact', path: '/contact', name: 'Contact', type: 'public', layout: 'default',
        components: [
          { type: 'ContactForm', fields: [{ name: 'email', label: 'Email', type: 'email', required: true }] },
        ],
      },
    ],
    metadata: {},
  };
}

describe('e2e worktree pipeline', () => {
  it('writes spec manifest with correct component counts', () => {
    const spec = make3PageSpec();
    const manifest = writeComponentSpecManifest(spec, TEST_DIR);
    expect(manifest.totalPages).toBe(3);
    // Home: 3 components, About: 2, Contact: 1 = 6
    expect(manifest.totalComponents).toBe(6);
    expect(manifest.records.length).toBe(6);
  });

  it('manifest records contain page paths', () => {
    const spec = make3PageSpec();
    const manifest = writeComponentSpecManifest(spec, TEST_DIR);
    const paths = new Set(manifest.records.map(r => r.pagePath));
    expect(paths.has('/')).toBe(true);
    expect(paths.has('/about')).toBe(true);
    expect(paths.has('/contact')).toBe(true);
  });

  it('component types are preserved', () => {
    const spec = make3PageSpec();
    const manifest = writeComponentSpecManifest(spec, TEST_DIR);
    const types = manifest.records.map(r => r.componentType);
    expect(types).toContain('HeroBanner');
    expect(types).toContain('FeatureGrid');
    expect(types).toContain('CTA');
    expect(types).toContain('Stats');
    expect(types).toContain('ContactForm');
  });

  it('reloaded manifest matches original', () => {
    const spec = make3PageSpec();
    writeComponentSpecManifest(spec, TEST_DIR);
    const loaded = loadComponentSpecManifest(TEST_DIR);
    expect(loaded).not.toBeNull();
    expect(loaded!.totalComponents).toBe(6);
    expect(loaded!.totalPages).toBe(3);
  });

  it('WorktreeManager distribution covers all spec filenames', () => {
    const spec = make3PageSpec();
    const manifest = writeComponentSpecManifest(spec, TEST_DIR);
    const specFilenames = manifest.records.map((r, i) => `spec-${i}.json`);
    const mgr = new WorktreeManager({ maxWorktrees: 2 });
    const groups = mgr.distributeSpecs(specFilenames, 3);
    let total = 0;
    for (const [, groupSpecs] of groups) {
      total += groupSpecs.length;
    }
    expect(total).toBe(specFilenames.length);
  });

  it('assembly merges non-overlapping files without conflicts', () => {
    const inputs: AssemblyInput[] = [
      {
        sourceName: 'home-group',
        files: [{ path: 'src/app/page.tsx', content: 'home', type: 'tsx' }],
        errors: [],
      },
      {
        sourceName: 'about-group',
        files: [{ path: 'src/app/about/page.tsx', content: 'about', type: 'tsx' }],
        errors: [],
      },
      {
        sourceName: 'contact-group',
        files: [{ path: 'src/app/contact/page.tsx', content: 'contact', type: 'tsx' }],
        errors: [],
      },
    ];
    const result = assembleRenderResults(inputs);
    expect(result.mergedFiles.size).toBe(3);
    expect(result.conflicts.length).toBe(0);
    expect(result.totalErrors).toBe(0);
  });

  it('assembly detects overlapping files as conflicts', () => {
    const inputs: AssemblyInput[] = [
      {
        sourceName: 'g0',
        files: [{ path: 'shared.tsx', content: 'v1', type: 'tsx' }],
        errors: [],
      },
      {
        sourceName: 'g1',
        files: [{ path: 'shared.tsx', content: 'v2', type: 'tsx' }],
        errors: [],
      },
    ];
    const result = assembleRenderResults(inputs);
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].resolution).toBe('first-wins');
    expect(result.conflicts[0].filePath).toBe('shared.tsx');
  });

  it('writeAssemblyResult produces valid output', () => {
    const inputs: AssemblyInput[] = [{
      sourceName: 'g0',
      files: [{ path: 'src/app/page.tsx', content: 'export default function Home() {}', type: 'tsx' }],
      errors: [],
    }];
    const assembly = assembleRenderResults(inputs);
    const renderResult = writeAssemblyResult(assembly, TEST_DIR, TEST_DIR);
    expect(renderResult.files.length).toBe(1);
    expect(renderResult.files[0].path).toBe('src/app/page.tsx');
  });

  it('worktree manager distributes across groups evenly', () => {
    const mgr = new WorktreeManager({ maxWorktrees: 4 });
    const specs = Array.from({ length: 10 }, (_, i) => `spec-${i}.json`);
    const groups = mgr.distributeSpecs(specs);
    expect(groups.size).toBeGreaterThanOrEqual(2);
    const sizes = Array.from(groups.values()).map(g => g.length);
    const max = Math.max(...sizes);
    const min = Math.min(...sizes);
    expect(max - min).toBeLessThanOrEqual(1);
  });
});
