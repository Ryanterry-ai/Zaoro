import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { generateULID, hashContent, hashObject } from './fingerprint.js';

export interface EvidenceRecord {
  id: string;
  version: string;
  kind: 'web' | 'doc' | 'api' | 'standard' | 'competitor' | 'design' | 'agent';
  uri: string | undefined;
  retrievedAt: string;
  hash: string;
  license: string | undefined;
  locale: string | undefined;
  contentPtr: { store: 'local'; key: string };
  annotations: Array<{
    by: 'human' | 'agent';
    note: string;
    at: string;
    tags?: string[];
  }>;
  qualityScore: number | undefined;
  supersedes: string | undefined;
  status: 'active' | 'superseded' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceQuery {
  kind?: EvidenceRecord['kind'];
  hash?: string;
  minQuality?: number;
  locale?: string;
  status?: EvidenceRecord['status'];
  limit?: number;
  offset?: number;
}

const EVIDENCE_TTL_MS: Record<string, number> = {
  web: 7 * 24 * 60 * 60 * 1000,
  doc: 30 * 24 * 60 * 60 * 1000,
  api: 7 * 24 * 60 * 60 * 1000,
  standard: 90 * 24 * 60 * 60 * 1000,
  competitor: 7 * 24 * 60 * 60 * 1000,
  design: 30 * 24 * 60 * 60 * 1000,
  agent: 7 * 24 * 60 * 60 * 1000,
};

export class PersistentEvidenceStore {
  private baseDir: string;
  private metaDir: string;
  private contentDir: string;
  private index: Map<string, EvidenceRecord> = new Map();
  private hashIndex: Map<string, string> = new Map();

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    this.metaDir = join(baseDir, 'evidence', 'meta');
    this.contentDir = join(baseDir, 'evidence', 'content');
    this.ensureDirs();
    this.loadIndex();
  }

  private ensureDirs(): void {
    mkdirSync(this.metaDir, { recursive: true });
    mkdirSync(this.contentDir, { recursive: true });
  }

  private loadIndex(): void {
    if (!existsSync(this.metaDir)) return;

    const files = readdirSync(this.metaDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const raw = readFileSync(join(this.metaDir, file), 'utf-8');
        const record = JSON.parse(raw) as EvidenceRecord;
        this.index.set(record.id, record);
        if (record.hash) {
          this.hashIndex.set(record.hash, record.id);
        }
      } catch {
        // skip corrupted files
      }
    }
  }

  add(content: string | Buffer, meta: {
    kind: EvidenceRecord['kind'];
    uri?: string | undefined;
    license?: string | undefined;
    locale?: string | undefined;
    qualityScore?: number | undefined;
    annotations?: EvidenceRecord['annotations'];
  }): EvidenceRecord {
    const contentHash = hashContent(typeof content === 'string' ? content : content);

    const existing = this.hashIndex.get(contentHash);
    if (existing) {
      const existingRecord = this.index.get(existing);
      if (existingRecord && existingRecord.status === 'active') {
        return existingRecord;
      }
    }

    const id = generateULID();
    const now = new Date().toISOString();
    const contentKey = `${id}.bin`;

    const record: EvidenceRecord = {
      id,
      version: '1.0.0',
      kind: meta.kind,
      uri: meta.uri ?? undefined,
      retrievedAt: now,
      hash: contentHash,
      license: meta.license ?? undefined,
      locale: meta.locale ?? undefined,
      contentPtr: { store: 'local', key: contentKey },
      annotations: meta.annotations ?? [],
      qualityScore: meta.qualityScore ?? undefined,
      supersedes: undefined,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    writeFileSync(join(this.contentDir, contentKey), content);
    writeFileSync(join(this.metaDir, `${id}.json`), JSON.stringify(record, null, 2));

    this.index.set(id, record);
    this.hashIndex.set(contentHash, id);

    return record;
  }

  get(id: string): EvidenceRecord | undefined {
    return this.index.get(id);
  }

  getByHash(hash: string): EvidenceRecord | undefined {
    const id = this.hashIndex.get(hash);
    return id ? this.index.get(id) : undefined;
  }

  supersed(id: string, newContent: string | Buffer, meta: {
    kind: EvidenceRecord['kind'];
    uri?: string | undefined;
    license?: string | undefined;
    qualityScore?: number | undefined;
  }): EvidenceRecord {
    const existing = this.index.get(id);
    if (!existing) throw new Error(`Evidence ${id} not found`);

    existing.status = 'superseded';
    existing.updatedAt = new Date().toISOString();
    this.writeRecord(existing);

    const newRecord = this.add(newContent, {
      kind: meta.kind,
      uri: meta.uri,
      license: meta.license,
      qualityScore: meta.qualityScore ?? existing.qualityScore,
    });
    newRecord.supersedes = id;
    newRecord.updatedAt = new Date().toISOString();
    this.writeRecord(newRecord);

    return newRecord;
  }

  query(filters: EvidenceQuery): EvidenceRecord[] {
    let results = Array.from(this.index.values());

    if (filters.kind) {
      results = results.filter(r => r.kind === filters.kind);
    }
    if (filters.hash) {
      results = results.filter(r => r.hash === filters.hash);
    }
    if (filters.minQuality !== undefined) {
      results = results.filter(r => (r.qualityScore ?? 0) >= filters.minQuality!);
    }
    if (filters.locale) {
      results = results.filter(r => r.locale === filters.locale);
    }
    if (filters.status) {
      results = results.filter(r => r.status === filters.status);
    } else {
      results = results.filter(r => r.status === 'active');
    }

    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? 100;
    return results.slice(offset, offset + limit);
  }

  isFresh(id: string): boolean {
    const record = this.index.get(id);
    if (!record) return false;

    const ttl = EVIDENCE_TTL_MS[record.kind] ?? 7 * 24 * 60 * 60 * 1000;
    const age = Date.now() - new Date(record.retrievedAt).getTime();
    return age < ttl;
  }

  getValidated(tags?: string[]): EvidenceRecord[] {
    return this.query({ status: 'active' }).filter(r => {
      if (tags && tags.length > 0) {
        return r.annotations.some(a => a.tags?.some(t => tags.includes(t)));
      }
      return true;
    });
  }

  private writeRecord(record: EvidenceRecord): void {
    writeFileSync(join(this.metaDir, `${record.id}.json`), JSON.stringify(record, null, 2));
  }

  stats(): {
    total: number;
    active: number;
    superseded: number;
    byKind: Record<string, number>;
    avgQuality: number;
  } {
    const records = Array.from(this.index.values());
    const active = records.filter(r => r.status === 'active');
    const byKind: Record<string, number> = {};
    for (const r of records) {
      byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
    }
    const qualities = records.filter(r => r.qualityScore !== undefined).map(r => r.qualityScore!);
    const avgQuality = qualities.length > 0 ? qualities.reduce((a, b) => a + b, 0) / qualities.length : 0;

    return {
      total: records.length,
      active: active.length,
      superseded: records.filter(r => r.status === 'superseded').length,
      byKind,
      avgQuality,
    };
  }
}
