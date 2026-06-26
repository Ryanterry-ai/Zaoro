// ─── Evidence Layer ───────────────────────────────────────────────
// Collects and validates information from external sources.
// Evidence is immutable once collected and has freshness tracking.
//
// Design Principles:
// - Evidence is collected offline, not during generation
// - Each evidence item has source, timestamp, confidence, and freshness
// - Evidence is validated before being promoted to Knowledge Layer
// - Supports multiple evidence types: research, scraping, citations

// ─── Evidence Types ───────────────────────────────────────────────

export type EvidenceType =
  | 'research'      // Manual research findings
  | 'scrape'        // Automated web scraping
  | 'citation'      // Academic or industry citations
  | 'user_input'    // Direct user input
  | 'derived';      // Derived from other evidence

export type EvidenceStatus =
  | 'raw'           // Just collected, not validated
  | 'validated'     // Passed validation checks
  | 'stale'         // Past freshness window
  | 'superseded'    // Replaced by newer evidence
  | 'rejected';     // Failed validation

export interface EvidenceSource {
  type: EvidenceType;
  url?: string;
  title?: string;
  author?: string;
  accessedAt: number;
  reliability: 'high' | 'medium' | 'low';
}

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  source: EvidenceSource;
  content: Record<string, unknown>;
  confidence: number;         // 0-1
  freshness: {
    collectedAt: number;
    expiresAt: number;        // When this evidence becomes stale
    ttlMs: number;            // Time to live in milliseconds
  };
  status: EvidenceStatus;
  tags: string[];
  validationErrors?: string[] | undefined;
}

// ─── Evidence Collector Interface ─────────────────────────────────

export interface EvidenceCollector {
  type: EvidenceType;
  collect(url: string): Promise<EvidenceItem[]>;
  validate(item: EvidenceItem): Promise<EvidenceItem>;
}

// ─── Evidence Store ───────────────────────────────────────────────

export class EvidenceStore {
  private items = new Map<string, EvidenceItem>();
  private indexByType = new Map<EvidenceType, Set<string>>();
  private indexByTag = new Map<string, Set<string>>();

  constructor() {
    // Initialize type index
    const types: EvidenceType[] = ['research', 'scrape', 'citation', 'user_input', 'derived'];
    for (const t of types) {
      this.indexByType.set(t, new Set());
    }
  }

  /**
   * Add evidence to the store
   */
  add(item: EvidenceItem): void {
    this.items.set(item.id, item);
    this.indexByType.get(item.type)?.add(item.id);
    for (const tag of item.tags) {
      if (!this.indexByTag.has(tag)) {
        this.indexByTag.set(tag, new Set());
      }
      this.indexByTag.get(tag)?.add(item.id);
    }
  }

  /**
   * Get evidence by ID
   */
  get(id: string): EvidenceItem | undefined {
    return this.items.get(id);
  }

  /**
   * Query evidence with filters
   */
  query(filters: {
    type?: EvidenceType;
    status?: EvidenceStatus;
    tags?: string[];
    minConfidence?: number;
    limit?: number;
  }): EvidenceItem[] {
    let candidates: string[] = [];

    if (filters.type) {
      candidates = Array.from(this.indexByType.get(filters.type) || []);
    } else {
      candidates = Array.from(this.items.keys());
    }

    // Apply tag filter
    if (filters.tags && filters.tags.length > 0) {
      const tagSets = filters.tags
        .map(t => this.indexByTag.get(t))
        .filter((s): s is Set<string> => s !== undefined);
      
      if (tagSets.length > 0) {
        candidates = candidates.filter(id =>
          tagSets.every(s => s.has(id))
        );
      }
    }

    // Apply other filters
    const results: EvidenceItem[] = [];
    for (const id of candidates) {
      const item = this.items.get(id);
      if (!item) continue;
      if (filters.status && item.status !== filters.status) continue;
      if (filters.minConfidence !== undefined && item.confidence < filters.minConfidence) continue;
      results.push(item);
      if (filters.limit && results.length >= filters.limit) break;
    }

    return results;
  }

  /**
   * Check if evidence is fresh
   */
  isFresh(id: string): boolean {
    const item = this.items.get(id);
    if (!item) return false;
    return Date.now() < item.freshness.expiresAt;
  }

  /**
   * Update evidence status
   */
  updateStatus(id: string, status: EvidenceStatus, errors?: string[]): void {
    const item = this.items.get(id);
    if (!item) return;

    item.status = status;
    if (errors) {
      item.validationErrors = errors;
    }
  }

  /**
   * Get all fresh, validated evidence for a topic
   */
  getValidatedEvidence(tags: string[]): EvidenceItem[] {
    return this.query({
      status: 'validated',
      tags,
      minConfidence: 0.5,
    }).filter(item => this.isFresh(item.id));
  }

  /**
   * Statistics
   */
  stats(): { total: number; byType: Record<string, number>; byStatus: Record<string, number> } {
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const [type, ids] of this.indexByType) {
      byType[type] = ids.size;
    }

    for (const item of this.items.values()) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    }

    return {
      total: this.items.size,
      byType,
      byStatus,
    };
  }
}

// ─── Evidence Factory ─────────────────────────────────────────────

export function createEvidenceItem(
  type: EvidenceType,
  source: EvidenceSource,
  content: Record<string, unknown>,
  confidence: number,
  ttlMs: number,
  tags: string[]
): EvidenceItem {
  const now = Date.now();
  return {
    id: `${type}-${now}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    source,
    content,
    confidence: Math.max(0, Math.min(1, confidence)),
    freshness: {
      collectedAt: now,
      expiresAt: now + ttlMs,
      ttlMs,
    },
    status: 'raw',
    tags,
  };
}

// ─── Default TTLs ─────────────────────────────────────────────────

export const EVIDENCE_TTL = {
  scrape: 7 * 24 * 60 * 60 * 1000,      // 7 days
  research: 30 * 24 * 60 * 60 * 1000,    // 30 days
  citation: 90 * 24 * 60 * 60 * 1000,    // 90 days
  user_input: 365 * 24 * 60 * 60 * 1000, // 1 year
  derived: 7 * 24 * 60 * 60 * 1000,      // 7 days
};