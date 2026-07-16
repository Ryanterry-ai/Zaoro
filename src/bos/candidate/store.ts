// ─── Candidate Knowledge Store ─────────────────────────────────────
// File-backed, in-memory store of runtime-learned candidate knowledge.
// This is the ONLY place Runtime Learning writes. It never touches the
// Business Graph. Candidates are persisted under:
//
//   <baseDir>/
//     candidate-entities/   *.json
//     candidate-workflows/  *.json
//     candidate-patterns/   *.json
//     candidate-integrations/ *.json
//     candidate-relationships/ *.json
//
// The store is upsert-by-signature: repeated observations of the same
// candidate across successful builds accumulate into one record.

import * as fs from 'fs';
import * as path from 'path';
import {
  CandidateKnowledge,
  CandidateKind,
  CandidateStatus,
  CandidateSubmission,
  CandidateSummary,
  candidateSignature,
} from './types.js';

export const CANDIDATE_KIND_DIRS: Record<CandidateKind, string> = {
  entity: 'candidate-entities',
  workflow: 'candidate-workflows',
  pattern: 'candidate-patterns',
  integration: 'candidate-integrations',
  relationship: 'candidate-relationships',
};

function defaultBaseDir(): string {
  return process.env.CANDIDATE_STORE_DIR
    ? path.resolve(process.env.CANDIDATE_STORE_DIR)
    : path.resolve(process.cwd(), 'knowledge-candidates');
}

export class CandidateKnowledgeStore {
  private byId = new Map<string, CandidateKnowledge>();
  private baseDir: string;

  constructor(baseDir: string = defaultBaseDir()) {
    this.baseDir = baseDir;
    this.ensureDirs();
    this.loadFromDisk();
  }

  private ensureDirs(): void {
    try {
      for (const dir of Object.values(CANDIDATE_KIND_DIRS)) {
        fs.mkdirSync(path.join(this.baseDir, dir), { recursive: true });
      }
    } catch {
      // Read-only filesystem / tests: keep in-memory only.
    }
  }

  private dirFor(kind: CandidateKind): string {
    return path.join(this.baseDir, CANDIDATE_KIND_DIRS[kind]);
  }

  private fileFor(c: CandidateKnowledge): string {
    const safeId = c.id.replace(/[^a-z0-9_-]/g, '_');
    return path.join(this.dirFor(c.kind), `${safeId}.json`);
  }

  /**
   * Record a candidate submission. If a candidate with the same signature
   * already exists, the new observation is appended and the record is
   * moved back to `pending` so the pipeline re-evaluates it.
   */
  record(sub: CandidateSubmission): CandidateKnowledge {
    const id = candidateSignature(sub.kind, sub.key, sub.industry, sub.capabilities);
    const now = Date.now();
    const existing = this.byId.get(id);

    if (existing) {
      existing.observations.push({
        buildId: sub.buildId,
        industry: sub.industry ?? 'unknown',
        capabilities: sub.capabilities,
        confidence: sub.confidence,
        timestamp: now,
        context: sub.context,
      });
      if (sub.capabilities) existing.capabilities = sub.capabilities;
      existing.status = 'pending';
      existing.updatedAt = now;
      // Keep the richest payload (prefer the one with node properties).
      if (sub.payload?.node?.properties && Object.keys(sub.payload.node.properties).length > 0) {
        existing.payload = sub.payload;
      }
      this.persistOne(existing);
      return existing;
    }

    const candidate: CandidateKnowledge = {
      id,
      kind: sub.kind,
      key: sub.key,
      label: sub.label,
      industry: sub.industry,
      capabilities: sub.capabilities,
      payload: sub.payload,
      observations: [
        {
          buildId: sub.buildId,
          industry: sub.industry ?? 'unknown',
          capabilities: sub.capabilities,
          confidence: sub.confidence,
          timestamp: now,
          context: sub.context,
        },
      ],
      status: 'pending',
      validationReasons: [],
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(id, candidate);
    this.persistOne(candidate);
    return candidate;
  }

  get(id: string): CandidateKnowledge | undefined {
    return this.byId.get(id);
  }

  list(filter?: { kind?: CandidateKind; status?: CandidateStatus }): CandidateKnowledge[] {
    const all = Array.from(this.byId.values());
    return all.filter(c => {
      if (filter?.kind && c.kind !== filter.kind) return false;
      if (filter?.status && c.status !== filter.status) return false;
      return true;
    });
  }

  updateStatus(id: string, status: CandidateStatus, reasons: string[] = []): void {
    const c = this.byId.get(id);
    if (!c) return;
    c.status = status;
    c.validationReasons = reasons;
    c.updatedAt = Date.now();
    this.persistOne(c);
  }

  summary(): CandidateSummary {
    const byKind: Record<CandidateKind, number> = {
      entity: 0,
      workflow: 0,
      pattern: 0,
      integration: 0,
      relationship: 0,
    };
    const byStatus: Record<CandidateStatus, number> = {
      pending: 0,
      validating: 0,
      validated: 0,
      needs_review: 0,
      promoted: 0,
      rejected: 0,
    };
    for (const c of this.byId.values()) {
      byKind[c.kind] += 1;
      byStatus[c.status] += 1;
    }
    return { total: this.byId.size, byKind, byStatus };
  }

  private persistOne(c: CandidateKnowledge): void {
    try {
      fs.writeFileSync(this.fileFor(c), JSON.stringify(c, null, 2), 'utf-8');
    } catch {
      // In-memory only.
    }
  }

  private loadFromDisk(): void {
    try {
      for (const kind of Object.keys(CANDIDATE_KIND_DIRS) as CandidateKind[]) {
        const dir = this.dirFor(kind);
        if (!fs.existsSync(dir)) continue;
        for (const file of fs.readdirSync(dir)) {
          if (!file.endsWith('.json')) continue;
          const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
          const parsed = JSON.parse(raw) as CandidateKnowledge;
          this.byId.set(parsed.id, parsed);
        }
      }
    } catch {
      // No persisted candidates yet.
    }
  }
}
