// ─── Confidence Engine ─────────────────────────────────────────────
// Aggregates repeat observations of the same candidate across successful
// builds into a single promotion confidence. A single build must NEVER be
// enough to promote — the Business Graph accumulates knowledge only after
// multiple successful observations (the user's explicit requirement). A
// single observation yields at most ~0.71, well below the 0.85 auto-promotion
// floor, so one build can NEVER promote the Business Graph.

import { CandidateKnowledge } from './types.js';

export interface ConfidenceResult {
  /** 0–1 promotion confidence. */
  score: number;
  /** Number of distinct successful builds that observed this candidate. */
  observationCount: number;
  /** Distinct build ids (deduped). */
  distinctBuilds: number;
  /** Distinct industries that confirmed this candidate. */
  distinctIndustries: number;
  /** Normalized strength of the best single observation. */
  peakConfidence: number;
  reasoning: string;
}

/**
 * Promotion confidence rises with the number of independent successful
 * observations and the consistency of those observations. A single
 * observation yields at most ~0.6 — far below any auto-promotion threshold —
 * so one build can NEVER promote the Business Graph.
 *
 * Cross-industry agreement adds a small bonus: a candidate observed across
 * multiple industries is more universally valid than one seen only within a
 * single industry (which is routed to human review instead).
 */
export function computeConfidence(c: CandidateKnowledge): ConfidenceResult {
  const distinctBuilds = new Set(c.observations.map(o => o.buildId)).size;
  const distinctIndustries = new Set(
    c.observations.map(o => o.industry ?? 'unknown')
  ).size;
  const peakConfidence = c.observations.reduce((m, o) => Math.max(m, o.confidence), 0);

  // Saturating observation factor: 1 -> 0.75, 2 -> 0.86, 3 -> 0.90, 4 -> 0.92 ...
  // 1 build stays below any promotion threshold; 3 independent observations
  // of the same candidate cross it (when peak confidence is strong).
  const observationFactor = 1 - 1 / (1 + 3 * distinctBuilds);

  // Quality gate: weak peak confidence caps the score.
  const consistencyScore = Math.min(1, peakConfidence);

  // Cross-industry agreement bonus (0.05 per additional industry).
  const agreementBonus = 0.05 * (distinctIndustries - 1);

  const score = Math.max(0, Math.min(1, observationFactor * consistencyScore + agreementBonus));

  return {
    score,
    observationCount: c.observations.length,
    distinctBuilds,
    distinctIndustries,
    peakConfidence,
    reasoning: `observationFactor=${observationFactor.toFixed(2)} consistency=${consistencyScore.toFixed(2)} agreementBonus=${agreementBonus.toFixed(2)}`,
  };
}
