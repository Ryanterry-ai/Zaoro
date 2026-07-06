import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import type { ApplicationSpec, ComponentSpec } from '../bos/schemas/blueprint/execution-blueprint.schema.js';

export interface ComponentSpecRecord {
  pagePath: string;
  pageName: string;
  componentType: string;
  componentIndex: number;
  spec: ComponentSpec;
  contentHash: string;
}

export interface ComponentSpecManifest {
  id: string;
  createdAt: string;
  totalComponents: number;
  totalPages: number;
  records: ComponentSpecRecord[];
}

export function writeComponentSpecManifest(
  appSpec: ApplicationSpec,
  workspaceDir: string,
  filename: string = '.component-spec-manifest.json',
): ComponentSpecManifest {
  const records: ComponentSpecRecord[] = [];

  for (const page of appSpec.pages) {
    for (let i = 0; i < page.components.length; i++) {
      const spec = page.components[i];
      if (!spec) continue;
      const serialized = JSON.stringify(spec);
      const contentHash = createHash('sha256').update(serialized).digest('hex');

      records.push({
        pagePath: page.path,
        pageName: page.name,
        componentType: spec.type,
        componentIndex: i,
        spec,
        contentHash,
      });
    }
  }

  const manifest: ComponentSpecManifest = {
    id: appSpec.id,
    createdAt: new Date().toISOString(),
    totalComponents: records.length,
    totalPages: appSpec.pages.length,
    records,
  };

  const manifestPath = path.join(workspaceDir, filename);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  return manifest;
}

export function loadComponentSpecManifest(
  workspaceDir: string,
  filename: string = '.component-spec-manifest.json',
): ComponentSpecManifest | null {
  const manifestPath = path.join(workspaceDir, filename);
  if (!fs.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as ComponentSpecManifest;
  } catch {
    return null;
  }
}

export function writePerComponentSpecFile(
  record: ComponentSpecRecord,
  workspaceDir: string,
  specsDir: string = '.component-specs',
): string {
  const dir = path.join(workspaceDir, specsDir);
  fs.mkdirSync(dir, { recursive: true });
  const safePath = record.pagePath.replace(/[\\/:*?"<>|]/g, '_');
  const filename = `${safePath}__${record.componentIndex}__${record.contentHash.slice(0, 12)}.spec.json`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
  return filename;
}
