import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { writeComponentSpecManifest, loadComponentSpecManifest, writePerComponentSpecFile } from '../src/generation/component-spec-writer.js';
import type { ApplicationSpec } from '../src/bos/schemas/blueprint/execution-blueprint.schema.js';

const TEST_DIR = path.join(process.cwd(), '.test-component-spec-writer');

function makeSpec(pages?: number): ApplicationSpec {
  const result: ApplicationSpec = {
    id: 'test-spec-001',
    createdAt: new Date().toISOString(),
    appId: 'test-app',
    appName: 'TestApp',
    industry: 'technology',
    themeId: 'dark',
    pages: [],
    metadata: {},
  };
  if (pages) {
    for (let i = 0; i < pages; i++) {
      result.pages.push({
        pageId: `page-${i}`,
        path: i === 0 ? '/' : `/page-${i}`,
        name: `Page ${i}`,
        type: 'public',
        layout: 'default',
        components: [
          {
            type: 'HeroBanner',
            content: { title: { value: `Hero ${i}`, type: 'text' } },
          },
          {
            type: 'FeatureGrid',
            items: [{ title: `Feature A of ${i}`, description: 'Desc' }],
          },
        ],
        seo: { title: `Page ${i}`, description: `Page ${i} description` },
      });
    }
  }
  return result;
}

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('writeComponentSpecManifest', () => {
  it('writes manifest JSON to disk', () => {
    const spec = makeSpec(2);
    const manifest = writeComponentSpecManifest(spec, TEST_DIR);
    expect(fs.existsSync(path.join(TEST_DIR, '.component-spec-manifest.json'))).toBe(true);
    expect(manifest.totalPages).toBe(2);
    expect(manifest.totalComponents).toBe(4);
    expect(manifest.records.length).toBe(4);
  });

  it('each record has required fields', () => {
    const spec = makeSpec(1);
    const manifest = writeComponentSpecManifest(spec, TEST_DIR);
    for (const rec of manifest.records) {
      expect(rec.pagePath).toBeTruthy();
      expect(rec.componentType).toBeTruthy();
      expect(rec.contentHash).toBeTruthy();
      expect(typeof rec.componentIndex).toBe('number');
      expect(rec.spec).toBeTruthy();
    }
  });

  it('content hashes are deterministic', () => {
    const spec = makeSpec(1);
    const m1 = writeComponentSpecManifest(spec, TEST_DIR);
    const m2 = writeComponentSpecManifest(spec, TEST_DIR);
    for (let i = 0; i < m1.records.length; i++) {
      expect(m1.records[i].contentHash).toBe(m2.records[i].contentHash);
    }
  });

  it('custom filename works', () => {
    const spec = makeSpec(1);
    writeComponentSpecManifest(spec, TEST_DIR, 'custom-manifest.json');
    expect(fs.existsSync(path.join(TEST_DIR, 'custom-manifest.json'))).toBe(true);
  });
});

describe('loadComponentSpecManifest', () => {
  it('loads previously written manifest', () => {
    const spec = makeSpec(1);
    writeComponentSpecManifest(spec, TEST_DIR);
    const loaded = loadComponentSpecManifest(TEST_DIR);
    expect(loaded).not.toBeNull();
    expect(loaded!.totalComponents).toBe(2);
    expect(loaded!.id).toBe('test-spec-001');
  });

  it('returns null when no manifest exists', () => {
    const result = loadComponentSpecManifest(TEST_DIR, 'nonexistent.json');
    expect(result).toBeNull();
  });
});

describe('writePerComponentSpecFile', () => {
  it('writes a spec file in the specs subdirectory', () => {
    const spec = makeSpec(1);
    const manifest = writeComponentSpecManifest(spec, TEST_DIR);
    const record = manifest.records[0];
    const filename = writePerComponentSpecFile(record, TEST_DIR);
    const filePath = path.join(TEST_DIR, '.component-specs', filename);
    expect(fs.existsSync(filePath)).toBe(true);
    const loaded = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(loaded.pagePath).toBe('/');
    expect(loaded.componentType).toBe('HeroBanner');
  });
});
