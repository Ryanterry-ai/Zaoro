// ─── Candidate Validation Pipeline ─────────────────────────────────
// Pure validation of a candidate before it may enter the confidence/promotion
// stage. Graph-agnostic: it checks structural soundness and confidence floor,
// not graph membership (that belongs to the Promotion Pipeline).

import { CandidateKnowledge, CandidateStatus } from './types.js';

export interface ValidationOptions {
  /** Minimum per-observation confidence to be considered valid. */
  minConfidence?: number;
  /** Maximum payload size in bytes (sanity guard against runaway data). */
  maxPayloadBytes?: number;
}

export interface ValidationResult {
  valid: boolean;
  status: CandidateStatus; // 'validated' if valid, 'rejected' if not
  reasons: string[];
}

const DEFAULTS: Required<ValidationOptions> = {
  minConfidence: 0.3,
  maxPayloadBytes: 64 * 1024,
};

export function validateCandidate(
  c: CandidateKnowledge,
  options: ValidationOptions = {}
): ValidationResult {
  const opts = { ...DEFAULTS, ...options };
  const reasons: string[] = [];

  if (!c.key || c.key.trim().length === 0) {
    reasons.push('Candidate key is empty');
  }
  if (!c.label || c.label.trim().length === 0) {
    reasons.push('Candidate label is empty');
  }
  if (!c.payload || !c.payload.node || !c.payload.node.type) {
    reasons.push('Candidate payload is missing a node type');
  }
  if (!Array.isArray(c.observations) || c.observations.length === 0) {
    reasons.push('Candidate has no observations');
  }

  const payloadBytes = Buffer.byteLength(JSON.stringify(c.payload));
  if (payloadBytes > opts.maxPayloadBytes) {
    reasons.push(`Payload too large (${payloadBytes} > ${opts.maxPayloadBytes} bytes)`);
  }

  // Confidence: the best observation must clear the floor.
  const best = c.observations.reduce((m, o) => Math.max(m, o.confidence), 0);
  if (best < opts.minConfidence) {
    reasons.push(`Best observation confidence ${best.toFixed(2)} < floor ${opts.minConfidence}`);
  }

  if (reasons.length > 0) {
    return { valid: false, status: 'rejected', reasons };
  }
  return { valid: true, status: 'validated', reasons: [] };
}
