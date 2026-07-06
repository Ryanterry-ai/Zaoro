import * as fs from 'fs';
import * as path from 'path';

export interface BuildRecord {
  id: string;
  ts: number;
  prompt: string;
  industry: string;
  appName: string;
  confidence: number;
  filesGenerated: number;
  pagesGenerated: number;
  errors: number;
  warnings: string[];
  durationMs: number;
  success: boolean;
  usedLLM: boolean;
  workspaceId: string;
  platform: string;
  graphStats?: {
    nodes: number;
    edges: number;
    entities: number;
    tables: number;
    endpoints: number;
  };
  selfHealing?: {
    iterations: number;
    errorsFixed: number;
    remainingErrors: number;
  };
}

export class BuildHistoryManager {
  private historyDir: string;

  constructor(baseDir: string) {
    this.historyDir = path.join(baseDir, '.build-history');
    fs.mkdirSync(this.historyDir, { recursive: true });
  }

  saveBuild(record: BuildRecord): string {
    const id = record.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry = { ...record, id };
    const filePath = path.join(this.historyDir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
    this.appendToIndex(entry);
    return id;
  }

  getRecentBuilds(limit = 20): BuildRecord[] {
    const index = this.readIndex();
    return index.slice(-limit).reverse();
  }

  getBuild(id: string): BuildRecord | null {
    const filePath = path.join(this.historyDir, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  getBuildCount(): number {
    return this.readIndex().length;
  }

  deleteBuild(id: string): boolean {
    const filePath = path.join(this.historyDir, `${id}.json`);
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    this.rebuildIndex();
    return true;
  }

  getAllBuilds(): BuildRecord[] {
    return this.readIndex();
  }

  getStats(): { totalBuilds: number; successRate: number; avgConfidence: number; avgDurationMs: number; totalFilesGenerated: number } {
    const builds = this.getAllBuilds();
    if (builds.length === 0) return { totalBuilds: 0, successRate: 0, avgConfidence: 0, avgDurationMs: 0, totalFilesGenerated: 0 };
    const succeeded = builds.filter(b => b.success).length;
    return {
      totalBuilds: builds.length,
      successRate: succeeded / builds.length,
      avgConfidence: builds.reduce((s, b) => s + b.confidence, 0) / builds.length,
      avgDurationMs: builds.reduce((s, b) => s + b.durationMs, 0) / builds.length,
      totalFilesGenerated: builds.reduce((s, b) => s + b.filesGenerated, 0),
    };
  }

  private get indexFile(): string {
    return path.join(this.historyDir, 'index.json');
  }

  private readIndex(): BuildRecord[] {
    try {
      if (!fs.existsSync(this.indexFile)) return [];
      const raw = fs.readFileSync(this.indexFile, 'utf-8');
      return JSON.parse(raw);
    } catch { return []; }
  }

  private appendToIndex(record: BuildRecord): void {
    const index = this.readIndex();
    index.push(this.summarize(record));
    try {
      fs.writeFileSync(this.indexFile, JSON.stringify(index, null, 2), 'utf-8');
    } catch {}
  }

  private rebuildIndex(): void {
    const files = fs.readdirSync(this.historyDir).filter(f => f.endsWith('.json') && f !== 'index.json');
    const index: BuildRecord[] = [];
    for (const file of files) {
      try {
        const record: BuildRecord = JSON.parse(fs.readFileSync(path.join(this.historyDir, file), 'utf-8'));
        index.push(this.summarize(record));
      } catch {}
    }
    index.sort((a, b) => a.ts - b.ts);
    fs.writeFileSync(this.indexFile, JSON.stringify(index, null, 2), 'utf-8');
  }

  private summarize(record: BuildRecord): BuildRecord {
    return {
      id: record.id,
      ts: record.ts,
      prompt: (record.prompt ?? '').slice(0, 120),
      industry: record.industry,
      appName: record.appName,
      confidence: record.confidence,
      filesGenerated: record.filesGenerated,
      pagesGenerated: record.pagesGenerated,
      errors: record.errors,
      warnings: (record.warnings ?? []).slice(0, 5),
      durationMs: record.durationMs,
      success: record.success,
      usedLLM: record.usedLLM,
      workspaceId: record.workspaceId,
      platform: record.platform,
    };
  }
}
