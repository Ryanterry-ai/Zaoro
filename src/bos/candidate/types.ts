// ─── Candidate Knowledge Types ─────────────────────────────────────
// Runtime Learning writes ONLY to candidate knowledge stores. Nothing here
// mutates the canonical Business Graph. Candidates flow through the
// Validation Pipeline → Confidence Engine → Promotion Pipeline before they
// can ever become part of the Business Graph.
//
// Design rule (Phase 1 foundation):
//   Successful Build → Candidate Knowledge → Validation → Confidence →
//   Human Review / Trusted Auto Promotion → Business Graph
// The Business Graph is treated like a database schema / compiler: it never
// mutates itself because one build succeeded.

export type CandidateKind =
  | 'entity'
  | 'workflow'
  | 'pattern'
  | 'integration'
  | 'relationship';

export type CandidateStatus =
  | 'pending' // freshly recorded, not yet validated
  | 'validating' // currently in the validation pipeline
  | 'validated' // passed validation, awaiting confidence/promotion decision
  | 'needs_review' // passed validation but below auto-promotion confidence
  | 'promoted' // applied to the Business Graph via the Promotion Pipeline
  | 'rejected'; // failed validation or manually rejected

export interface CandidateObservation {
  buildId: string;
  industry: string;
  /** Canability ids this observation exercised (Phase R2: learning improves capabilities, not just industries). */
  capabilities?: string[];
  confidence: number;
  timestamp: number;
  context?: Record<string, unknown>;
}

/** Data needed to materialize this candidate onto the Business Graph. */
export interface CandidatePayload {
  /** The proposed node. `id` is derived by the governor if omitted. */
  node: {
    type: string; // NodeType string
    properties: Record<string, unknown>;
  };
  /** Edges from the new node to existing graph nodes. */
  edges?: Array<{
    type: string; // EdgeType string
    target: string; // existing node id
    weight?: number;
  }>;
}

export interface CandidateSubmission {
  kind: CandidateKind;
  key: string;
  label: string;
  industry?: string;
  capabilities?: string[];
  payload: CandidatePayload;
  buildId: string;
  confidence: number;
  context?: Record<string, unknown>;
}

export interface CandidateKnowledge {
  /** Deterministic signature: `${kind}:${industry?industry + '/'}${key}` (lowercased). */
  id: string;
  kind: CandidateKind;
  key: string;
  label: string;
  industry?: string;
  capabilities?: string[];
  payload: CandidatePayload;
  observations: CandidateObservation[];
  status: CandidateStatus;
  validationReasons: string[];
  createdAt: number;
  updatedAt: number;
}

export interface CandidateSummary {
  total: number;
  byKind: Record<CandidateKind, number>;
  byStatus: Record<CandidateStatus, number>;
}

export function candidateSignature(
  kind: CandidateKind,
  key: string,
  industry?: string,
  capabilities?: string[]
): string {
  const scope = `${industry ? `${industry}/` : ''}${capabilities && capabilities.length ? `${capabilities.join('+')}/` : ''}`;
  return `${kind}:${scope}${key}`.toLowerCase();
}
