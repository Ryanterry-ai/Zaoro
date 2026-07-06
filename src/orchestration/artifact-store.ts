// ─── Artifact Store ───────────────────────────────────────────────────────────
//
// Persistent artifact storage for the orchestration framework.
// Each stage writes its outputs as versioned, hashed artifacts.
// The store supports schema evolution, change detection, and
// selective reading (stages only see what they declared).
//
// Storage layout:
//   .build-anything/
//     artifacts/
//       research.domain.json
//       architecture.system.json
//       ...
//     metadata/
//       manifest.json
//       execution.json
//     checkpoints/
//       stage-id.json
// ──────────────────────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  Artifact,
  ArtifactMeta,
  ArtifactType,
} from './types.js';

export class ArtifactStore {
  private artifactsDir: string;
  private metadataDir: string;

  constructor(workingDirectory: string) {
    this.artifactsDir = path.join(workingDirectory, 'artifacts');
    this.metadataDir = path.join(workingDirectory, 'metadata');
    this.ensureDirs();
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Store an artifact. Overwrites if key exists (version increments).
   */
  store(key: string, content: unknown, type: ArtifactType, producedBy: string, description?: string): Artifact {
    const existing = this.getMeta(key);
    const version = (existing?.version ?? 0) + 1;
    const contentStr = JSON.stringify(content, null, 2);
    const hash = crypto.createHash('sha256').update(contentStr).digest('hex').slice(0, 16);

    const artifact: Artifact = {
      key,
      content,
      type,
      producedBy,
      createdAt: new Date().toISOString(),
      version,
      hash,
      description,
    };

    // Write content
    const filePath = this.artifactPath(key);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contentStr, 'utf-8');

    // Write metadata
    const meta: ArtifactMeta = {
      key,
      type,
      producedBy,
      createdAt: artifact.createdAt,
      version,
      hash,
      sizeBytes: Buffer.byteLength(contentStr, 'utf-8'),
      description,
    };
    const metaPath = this.metaPath(key);
    fs.mkdirSync(path.dirname(metaPath), { recursive: true });
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

    return artifact;
  }

  /**
   * Read an artifact's content by key.
   */
  read<T = unknown>(key: string): T | undefined {
    const filePath = this.artifactPath(key);
    if (!fs.existsSync(filePath)) return undefined;
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  /**
   * Read artifact metadata (without loading full content).
   */
  getMeta(key: string): ArtifactMeta | undefined {
    const metaPath = this.metaPath(key);
    if (!fs.existsSync(metaPath)) return undefined;
    try {
      const raw = fs.readFileSync(metaPath, 'utf-8');
      return JSON.parse(raw) as ArtifactMeta;
    } catch {
      return undefined;
    }
  }

  /**
   * Check if an artifact exists.
   */
  exists(key: string): boolean {
    return fs.existsSync(this.artifactPath(key));
  }

  /**
   * Check if an artifact has changed since a given hash.
   */
  hasChanged(key: string, sinceHash: string): boolean {
    const meta = this.getMeta(key);
    return meta ? meta.hash !== sinceHash : true;
  }

  /**
   * List all stored artifacts.
   */
  list(): ArtifactMeta[] {
    if (!fs.existsSync(this.artifactsDir)) return [];
    const results: ArtifactMeta[] = [];
    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.name.endsWith('.json') && !entry.name.startsWith('.')) {
          const relPath = path.relative(this.artifactsDir, fullPath).replace(/\\/g, '/');
          const key = relPath.replace(/\.json$/, '');
          const meta = this.getMeta(key);
          if (meta) results.push(meta);
        }
      }
    };
    walk(this.artifactsDir);
    return results;
  }

  /**
   * Get artifacts produced by a specific stage.
   */
  listByStage(stageId: string): ArtifactMeta[] {
    return this.list().filter(m => m.producedBy === stageId);
  }

  /**
   * Delete an artifact.
   */
  delete(key: string): boolean {
    const filePath = this.artifactPath(key);
    const metaPath = this.metaPath(key);
    let deleted = false;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      deleted = true;
    }
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
    }
    return deleted;
  }

  /**
   * Get the content hash of a stored artifact (for change detection).
   */
  hash(key: string): string | undefined {
    return this.getMeta(key)?.hash;
  }

  /**
   * Clear all artifacts (for re-runs).
   */
  clear(): void {
    if (fs.existsSync(this.artifactsDir)) {
      fs.rmSync(this.artifactsDir, { recursive: true, force: true });
    }
    if (fs.existsSync(this.metadataDir)) {
      fs.rmSync(this.metadataDir, { recursive: true, force: true });
    }
    this.ensureDirs();
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  private artifactPath(key: string): string {
    // Convert dot notation to path: 'research.domain' → 'research/domain.json'
    const safeKey = key.replace(/[^a-zA-Z0-9._/-]/g, '_');
    return path.join(this.artifactsDir, `${safeKey}.json`);
  }

  private metaPath(key: string): string {
    const safeKey = key.replace(/[^a-zA-Z0-9._/-]/g, '_');
    return path.join(this.metadataDir, `${safeKey}.meta.json`);
  }

  private ensureDirs(): void {
    fs.mkdirSync(this.artifactsDir, { recursive: true });
    fs.mkdirSync(this.metadataDir, { recursive: true });
  }
}
