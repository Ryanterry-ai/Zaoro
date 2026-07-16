// ─── Primitives Barrel ──────────────────────────────────────────────

export * from './types.js';
export { primitiveRegistry, BRAND_PRIMITIVES } from './registry.js';
export { resolveConflicts, type ConflictResolverInput } from './conflict-resolver.js';
export { PrimitiveEvolution, getPrimitiveEvolution, type PrimitiveCandidate, type EvolutionConfig } from './evolution.js';
export { CrossDomainLearner, getCrossDomainLearner, type TransferDiscovery } from './cross-domain.js';
export { scoreConsistency, isCoherent, type ConsistencyScore } from './scoring.js';
