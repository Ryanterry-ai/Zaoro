// ─── Promotion Pipeline ────────────────────────────────────────────
// The "Promotion" half of Runtime Learning. The "Learning" half (accumulating
// observations) lives in CandidateKnowledgeStore. This stage decides what may
// enter the Business Graph.
//
// Flow:
//   Candidate → Validation → Confidence →
//     (confidence >= autoPromote threshold AND enough observations)
//        → Trusted Auto Promotion (GraphGovernor.applyPromotion)
//     else
//        → Human Review queue (never mutates the graph)
//
// A single successful build can NEVER promote, because the observation count
// requirement is never satisfied by one build.

import { CandidateKnowledgeStore } from './store.js';
import { GraphGovernor } from '../graph/governor.js';
import { validateCandidate } from './validation.js';
import { computeConfidence } from './confidence.js';
import { CandidateKnowledge, CandidateStatus } from './types.js';

export interface PromotionConfig {
  /** Minimum distinct successful builds before auto-promotion is allowed. */
  autoPromoteMinObservations: number;
  /** Minimum confidence before auto-promotion is allowed. */
  autoPromoteMinConfidence: number;
}

export const DEFAULT_PROMOTION_CONFIG: PromotionConfig = {
  autoPromoteMinObservations: 3,
  autoPromoteMinConfidence: 0.85,
};

export interface PromotionReport {
  evaluated: number;
  promoted: Array<{ id: string; kind: string; key: string; confidence: number }>;
  needsReview: Array<{ id: string; kind: string; key: string; confidence: number; observations: number }>;
  rejected: Array<{ id: string; reason: string }>;
  appliedVersion: number;
}

export interface ReviewQueueItem {
  id: string;
  kind: string;
  key: string;
  label: string;
  industry?: string;
  confidence: number;
  observations: number;
  distinctBuilds: number;
  distinctIndustries: number;
  payload: CandidateKnowledge['payload'];
}

export class PromotionPipeline {
  private store: CandidateKnowledgeStore;
  private governor: GraphGovernor;
  private config: PromotionConfig;

  constructor(
    store: CandidateKnowledgeStore,
    governor: GraphGovernor,
    config: PromotionConfig = DEFAULT_PROMOTION_CONFIG
  ) {
    this.store = store;
    this.governor = governor;
    this.config = config;
  }

  /**
   * Evaluate all non-final candidates and promote / queue / reject them.
   * Safe to run repeatedly: already-promoted/rejected candidates are skipped.
   */
  run(): PromotionReport {
    const candidates = this.store.list().filter(c => c.status === 'pending' || c.status === 'validated');
    const report: PromotionReport = {
      evaluated: candidates.length,
      promoted: [],
      needsReview: [],
      rejected: [],
      appliedVersion: this.governor.getVersion(),
    };

    for (const c of candidates) {
      const validation = validateCandidate(c);
      if (!validation.valid) {
        this.store.updateStatus(c.id, 'rejected', validation.reasons);
        report.rejected.push({ id: c.id, reason: validation.reasons.join('; ') });
        continue;
      }

      this.store.updateStatus(c.id, 'validated');
      const conf = computeConfidence(c);

      const autoPromote =
        conf.distinctBuilds >= this.config.autoPromoteMinObservations &&
        conf.score >= this.config.autoPromoteMinConfidence;

      if (autoPromote) {
        const result = this.governor.applyPromotion(c);
        this.store.updateStatus(c.id, 'promoted');
        report.promoted.push({ id: c.id, kind: c.kind, key: c.key, confidence: conf.score });
        report.appliedVersion = result.version;
      } else {
        this.store.updateStatus(c.id, 'needs_review');
        report.needsReview.push({
          id: c.id,
          kind: c.kind,
          key: c.key,
          confidence: conf.score,
          observations: c.observations.length,
        });
      }
    }

    return report;
  }

  /** Read-only view of candidates awaiting human review. */
  getReviewQueue(): ReviewQueueItem[] {
    return this.store
      .list({ status: 'needs_review' })
      .map(c => {
        const conf = computeConfidence(c);
        return {
          id: c.id,
          kind: c.kind,
          key: c.key,
          label: c.label,
          industry: c.industry,
          confidence: conf.score,
          observations: c.observations.length,
          distinctBuilds: conf.distinctBuilds,
          distinctIndustries: conf.distinctIndustries,
          payload: c.payload,
        };
      });
  }

  /**
   * Human-review approval: promote a specific candidate regardless of the
   * automatic threshold. This is the "Human Review" promotion path.
   */
  approve(id: string): boolean {
    const c = this.store.get(id);
    if (!c) return false;
    const result = this.governor.applyPromotion(c);
    this.store.updateStatus(c.id, 'promoted');
    return result.applied;
  }

  /**
   * Human-review rejection: permanently exclude a candidate.
   */
  reject(id: string, reason = 'rejected by human reviewer'): void {
    this.store.updateStatus(id, 'rejected', [reason]);
  }
}
