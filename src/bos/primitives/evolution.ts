// ─── Primitive Evolution ────────────────────────────────────────────
// Primitives start as temporary nodes when they're first discovered
// (e.g., a user asks for "Nothing Phone" which isn't in the registry).
// After enough observations, they're promoted to permanent primitives.
//
// Lifecycle:
//   1. Unknown brand → Knowledge Acquisition searches
//   2. Finds primitives (transparent, glyph, industrial, minimal, etc.)
//   3. Temporary node created in Candidate Knowledge Store
//   4. Each build that uses the brand adds an observation
//   5. When confidence crosses threshold → promoted to canonical
//
// This is how every build improves the system.

import type { Primitive, PrimitiveStatus } from './types.js';
import { primitiveRegistry } from './registry.js';
import { CandidateKnowledgeStore } from '../candidate/store.js';
import type { CandidateSubmission } from '../candidate/types.js';

// ─── Configuration ──────────────────────────────────────────────────

export interface EvolutionConfig {
  /** Minimum observations before a primitive can be promoted. */
  minObservations: number;
  /** Minimum average confidence to promote. */
  minConfidence: number;
  /** Maximum observations before auto-promote (if confidence is high enough). */
  maxObservationsBeforeAutoPromote: number;
}

const DEFAULT_EVOLUTION_CONFIG: EvolutionConfig = {
  minObservations: 3,
  minConfidence: 0.70,
  maxObservationsBeforeAutoPromote: 10,
};

// ─── Primitive Candidate ────────────────────────────────────────────

export interface PrimitiveCandidate {
  /** Primitive id (derived from brand + attribute). */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Brand that introduced this primitive. */
  brand: string;
  /** Domain it belongs to. */
  domain: Primitive['domain'];
  /** Description. */
  description: string;
  /** Industries relevant to. */
  industries: string[];
  /** Current observation count. */
  observationCount: number;
  /** Average confidence across observations. */
  averageConfidence: number;
  /** Lifecycle status. */
  status: PrimitiveStatus;
  /** When first observed. */
  createdAt: number;
  /** When last observed. */
  updatedAt: number;
}

// ─── Evolution Engine ───────────────────────────────────────────────

export class PrimitiveEvolution {
  private candidates = new Map<string, PrimitiveCandidate>();
  private candidateStore: CandidateKnowledgeStore;

  constructor(config?: Partial<EvolutionConfig>) {
    this.config = { ...DEFAULT_EVOLUTION_CONFIG, ...config };
    this.candidateStore = new CandidateKnowledgeStore();
    this.loadFromCandidateStore();
  }

  private config: EvolutionConfig;

  /** Load existing candidates from the candidate knowledge store. */
  private loadFromCandidateStore(): void {
    const summaries = this.candidateStore.list({ status: 'pending' });
    for (const candidate of summaries) {
      if (candidate.kind !== 'entity') continue;
      // Convert candidate to primitive candidate
      const id = `learned:${candidate.key}`;
      if (!this.candidates.has(id)) {
        this.candidates.set(id, {
          id,
          name: candidate.label,
          brand: candidate.key,
          domain: 'experience',
          description: `Learned from ${candidate.industry ?? 'unknown'} builds`,
          industries: candidate.industry ? [candidate.industry] : [],
          observationCount: candidate.observations.length,
          averageConfidence: candidate.observations.reduce((s: number, o: { confidence: number }) => s + o.confidence, 0) /
            Math.max(1, candidate.observations.length),
          status: candidate.status === 'promoted' ? 'learned' : 'temporary',
          createdAt: candidate.createdAt,
          updatedAt: candidate.updatedAt,
        });
      }
    }
  }

  /**
   * Record an observation of a new primitive.
   * Called when a build discovers a primitive not in the canonical registry.
   */
  observe(input: {
    id: string;
    name: string;
    brand: string;
    domain: Primitive['domain'];
    description: string;
    industries: string[];
    buildId: string;
    confidence: number;
  }): PrimitiveCandidate {
    const existing = this.candidates.get(input.id);

    if (existing) {
      // Update existing candidate
      existing.observationCount++;
      existing.averageConfidence =
        (existing.averageConfidence * (existing.observationCount - 1) + input.confidence) /
        existing.observationCount;
      existing.updatedAt = Date.now();
      existing.status = this.determineStatus(existing);
      return existing;
    }

    // Create new candidate
    const candidate: PrimitiveCandidate = {
      id: input.id,
      name: input.name,
      brand: input.brand,
      domain: input.domain,
      description: input.description,
      industries: input.industries,
      observationCount: 1,
      averageConfidence: input.confidence,
      status: 'temporary',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.candidates.set(input.id, candidate);

    // Record in candidate knowledge store
    this.candidateStore.record({
      kind: 'entity',
      key: input.brand,
      label: input.name,
      industry: input.industries[0],
      payload: {
        node: {
          type: 'primitive',
          properties: {
            primitiveId: input.id,
            domain: input.domain,
            description: input.description,
          },
        },
      },
      buildId: input.buildId,
      confidence: input.confidence,
      context: { type: 'primitive-evolution', primitiveId: input.id },
    });

    return candidate;
  }

  /**
   * Determine the status of a candidate based on observations.
   */
  private determineStatus(candidate: PrimitiveCandidate): PrimitiveStatus {
    if (candidate.observationCount >= this.config.maxObservationsBeforeAutoPromote &&
        candidate.averageConfidence >= this.config.minConfidence) {
      return 'canonical'; // auto-promote
    }
    if (candidate.observationCount >= this.config.minObservations &&
        candidate.averageConfidence >= this.config.minConfidence) {
      return 'learned'; // eligible for promotion
    }
    if (candidate.observationCount >= this.config.minObservations) {
      return 'temporary'; // enough observations but confidence too low
    }
    return 'temporary';
  }

  /**
   * Promote a candidate to the canonical registry.
   */
  promote(candidateId: string): boolean {
    const candidate = this.candidates.get(candidateId);
    if (!candidate) return false;
    if (candidate.status !== 'learned' && candidate.status !== 'canonical') return false;

    // Register in the primitive registry
    const primitive: Primitive = {
      id: candidate.id,
      name: candidate.name,
      domain: candidate.domain,
      description: candidate.description,
      weight: candidate.averageConfidence * 0.8,
      confidence: candidate.averageConfidence,
      status: 'learned',
      industries: candidate.industries,
      relationships: [],
      lastObserved: candidate.updatedAt,
      observationCount: candidate.observationCount,
    };

    primitiveRegistry.register(primitive);
    candidate.status = 'learned';

    // Candidate is locally promoted; the candidate store tracks observations
    // and is reloaded via loadFromCandidateStore on next construction.
    return true;
  }

  /**
   * Get all candidates, sorted by observation count.
   */
  getCandidates(): PrimitiveCandidate[] {
    return [...this.candidates.values()]
      .sort((a, b) => b.observationCount - a.observationCount);
  }

  /**
   * Get candidates eligible for promotion.
   */
  getPromotable(): PrimitiveCandidate[] {
    return this.getCandidates().filter(
      c => c.status === 'learned' || c.status === 'canonical'
    );
  }

  /**
   * Get statistics.
   */
  stats(): {
    total: number;
    byStatus: Record<PrimitiveStatus, number>;
    promotable: number;
  } {
    const candidates = this.getCandidates();
    const byStatus: Record<PrimitiveStatus, number> = {
      canonical: 0,
      learned: 0,
      temporary: 0,
    };
    for (const c of candidates) {
      byStatus[c.status]++;
    }
    return {
      total: candidates.length,
      byStatus,
      promotable: this.getPromotable().length,
    };
  }
}

// Singleton
let _instance: PrimitiveEvolution | undefined;
export function getPrimitiveEvolution(): PrimitiveEvolution {
  if (!_instance) _instance = new PrimitiveEvolution();
  return _instance;
}
