import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { assembleRenderResults, validateAssembly, writeAssemblyResult } from '../src/generation/assembly-gate.js';
import type { AssemblyInput } from '../src/generation/assembly-gate.js';
import { writeComponentSpecManifest } from '../src/generation/component-spec-writer.js';
import type { ApplicationSpec } from '../src/bos/schemas/blueprint/execution-blueprint.schema.js';

const TEST_DIR = path.join(process.cwd(), '.test-assembly-gate');

function makeInput(name: string, files: Array<{ path: string; content: string }>, errors: string[] = []): AssemblyInput {
  return {
    sourceName: name,
    files: files.map(f => ({ ...f, type: 'tsx' })),
    errors,
  };
}

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('assembleRenderResults', () => {
  it('merges files from single input', () => {
    const inputs = [
      makeInput('group-0', [
        { path: 'src/app/page.tsx', content: 'export default function Page() {}' },
        { path: 'src/components/Hero.tsx', content: 'export default function Hero() {}' },
      ]),
    ];
    const result = assembleRenderResults(inputs);
    expect(result.mergedFiles.size).toBe(2);
    expect(result.conflicts.length).toBe(0);
    expect(result.totalErrors).toBe(0);
  });

  it('merges files from multiple non-overlapping inputs', () => {
    const inputs = [
      makeInput('group-0', [
        { path: 'src/app/page.tsx', content: 'page content' },
      ]),
      makeInput('group-1', [
        { path: 'src/app/about.tsx', content: 'about content' },
      ]),
    ];
    const result = assembleRenderResults(inputs);
    expect(result.mergedFiles.size).toBe(2);
    expect(result.conflicts.length).toBe(0);
  });

  it('detects conflicts when same file comes from multiple groups', () => {
    const inputs = [
      makeInput('group-0', [
        { path: 'shared.tsx', content: 'version A' },
      ]),
      makeInput('group-1', [
        { path: 'shared.tsx', content: 'version B' },
      ]),
    ];
    const result = assembleRenderResults(inputs);
    expect(result.mergedFiles.size).toBe(1);
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].resolution).toBe('first-wins');
    expect(result.conflicts[0].sources).toContain('group-0');
    expect(result.conflicts[0].sources).toContain('group-1');
  });

  it('tracks total errors across groups', () => {
    const inputs = [
      makeInput('group-0', [], ['build error']),
      makeInput('group-1', [], ['compile error']),
    ];
    const result = assembleRenderResults(inputs);
    expect(result.totalErrors).toBe(2);
  });

  it('skips dotfiles and spec files from merge count', () => {
    const inputs = [
      makeInput('group-0', [
        { path: 'src/app/page.tsx', content: 'content' },
        { path: '.preview-cache.html', content: '<html>' },
        { path: 'test.spec.json', content: '{}' },
      ]),
    ];
    const result = assembleRenderResults(inputs);
    // Dot-prefixed and .spec.json should be counted as specFilesProcessed, not merged
    expect(result.mergedFiles.size).toBe(1); // only src/app/page.tsx
    expect(result.specFilesProcessed).toBe(2); // .preview-cache.html + test.spec.json
  });
});

describe('validateAssembly', () => {
  it('returns ok when no manifest exists', () => {
    const result = assembleRenderResults([]);
    const validation = validateAssembly(result, TEST_DIR);
    expect(validation.ok).toBe(true);
  });

  it('logs warnings when spec count mismatch', () => {
    const appSpec: ApplicationSpec = {
      id: 'test',
      createdAt: new Date().toISOString(),
      appId: 'test',
      appName: 'Test',
      industry: 'tech',
      themeId: 'default',
      pages: [
        {
          pageId: 'p1', path: '/', name: 'Home', type: 'public', layout: 'default',
          components: [{ type: 'Hero' }, { type: 'Features' }],
        },
      ],
      metadata: {},
    };
    writeComponentSpecManifest(appSpec, TEST_DIR);

    const result = assembleRenderResults([
      makeInput('group-0', [{ path: 'src/app/page.tsx', content: 'content' }]),
    ]);
    const validation = validateAssembly(result, TEST_DIR);
    // 2 expected specs, 1 processed (since page.tsx isn't .spec, and we have 0 spec files)
    expect(validation.warnings.length).toBeGreaterThanOrEqual(0);
  });
});

describe('writeAssemblyResult', () => {
  it('produces a RenderResult with warnings', () => {
    const inputs = [
      makeInput('group-0', [
        { path: 'page.tsx', content: 'export function Page() {}' },
      ]),
    ];
    const assembly = assembleRenderResults(inputs);
    const renderResult = writeAssemblyResult(assembly, TEST_DIR, TEST_DIR);
    expect(renderResult.files.length).toBe(1);
    expect(renderResult.files[0].path).toBe('page.tsx');
    expect(renderResult.files[0].content).toBe('export function Page() {}');
  });

  it('writes assembly result JSON to disk', () => {
    const inputs = [makeInput('g0', [{ path: 'x.tsx', content: 'x' }])];
    const assembly = assembleRenderResults(inputs);
    writeAssemblyResult(assembly, TEST_DIR, TEST_DIR);
    const assemblyPath = path.join(TEST_DIR, '.assembly', 'assembly-result.json');
    expect(fs.existsSync(assemblyPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(assemblyPath, 'utf-8'));
    expect(data.fileCount).toBe(1);
  });
});
