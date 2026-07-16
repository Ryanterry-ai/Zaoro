// ─── Primitive Scoring ──────────────────────────────────────────────
// Scores the consistency of a set of primitives.
// The Creative Director uses this to reject incoherent combinations.
//
// Example:
//   Mechanical Assembly: 0.94
//   Luxury: 0.21
//   Cute: 0.03
//   Playful: 0.11
//
// → Incoherent.  The Experience Compiler should refuse this.

import type { Primitive, PrimitiveSet, ResolvedPrimitive } from './types.js';
import { primitiveRegistry } from './registry.js';

// ─── Scoring Dimensions ─────────────────────────────────────────────

export interface ConsistencyScore {
  /** Overall coherence (0–1). */
  overall: number;
  /** How well primitives reinforce each other. */
  reinforcement: number;
  /** How many conflicts were detected. */
  conflictCount: number;
  /** Normalized conflict penalty (0–1, lower is better). */
  conflictPenalty: number;
  /** Domain diversity — too many domains = unfocused, too few = shallow. */
  domainDiversity: number;
  /** Weight distribution — are weights concentrated or spread? */
  weightDistribution: number;
  /** Chain depth — are there multi-hop relationships? */
  chainDepth: number;
  /** Per-primitive consistency scores. */
  perPrimitive: Array<{
    primitiveId: string;
    weight: number;
    reinforcementScore: number;
    conflictExposure: number;
    overallContribution: number;
  }>;
}

// ─── Scoring ────────────────────────────────────────────────────────

/**
 * Score the consistency of a resolved primitive set.
 */
export function scoreConsistency(primitiveSet: PrimitiveSet): ConsistencyScore {
  if (primitiveSet.primitives.length === 0) {
    return {
      overall: 0,
      reinforcement: 0,
      conflictCount: 0,
      conflictPenalty: 0,
      domainDiversity: 0,
      weightDistribution: 0,
      chainDepth: 0,
      perPrimitive: [],
    };
  }

  const ids = new Set(primitiveSet.primitives.map(p => p.primitive.id));

  // 1. Reinforcement: how much do primitives strengthen each other?
  let reinforcementSum = 0;
  let reinforcementCount = 0;
  for (const rp of primitiveSet.primitives) {
    const rels = primitiveRegistry.relationships(rp.primitive.id);
    for (const rel of rels) {
      if (ids.has(rel.targetId) && rel.type !== 'conflicts') {
        reinforcementSum += rel.strength * rp.resolvedWeight;
        reinforcementCount++;
      }
    }
  }
  const reinforcement = reinforcementCount > 0
    ? Math.min(1, reinforcementSum / reinforcementCount)
    : 0.5; // neutral if no relationships

  // 2. Conflict penalty
  const conflictPenalty = Math.min(1,
    primitiveSet.conflictsResolved.length * 0.15
  );

  // 3. Domain diversity: entropy of domain distribution
  const domainCounts = new Map<string, number>();
  for (const rp of primitiveSet.primitives) {
    domainCounts.set(
      rp.primitive.domain,
      (domainCounts.get(rp.primitive.domain) ?? 0) + 1,
    );
  }
  const domainEntropy = computeEntropy([...domainCounts.values()]);
  const maxEntropy = Math.log2(Math.max(1, domainCounts.size));
  const domainDiversity = maxEntropy > 0 ? domainEntropy / maxEntropy : 0;

  // 4. Weight distribution: are weights concentrated or spread?
  const weights = primitiveSet.primitives.map(p => p.resolvedWeight);
  const weightVariance = computeVariance(weights);
  const weightDistribution = 1 - Math.min(1, weightVariance * 4); // lower variance = more balanced

  // 5. Chain depth
  let maxChainDepth = 0;
  for (const chain of primitiveSet.chains) {
    maxChainDepth = Math.max(maxChainDepth, chain.path.length);
  }
  const chainDepth = Math.min(1, maxChainDepth / 5);

  // 6. Per-primitive scoring
  const perPrimitive = primitiveSet.primitives.map(rp => {
    const rels = primitiveRegistry.relationships(rp.primitive.id);
    let reinforcementScore = 0;
    let conflictExposure = 0;

    for (const rel of rels) {
      if (ids.has(rel.targetId)) {
        if (rel.type === 'conflicts') {
          conflictExposure += rel.strength;
        } else {
          reinforcementScore += rel.strength;
        }
      }
    }

    const overallContribution =
      rp.resolvedWeight * 0.4 +
      reinforcementScore * 0.3 -
      conflictExposure * 0.3;

    return {
      primitiveId: rp.primitive.id,
      weight: rp.resolvedWeight,
      reinforcementScore: Math.round(reinforcementScore * 100) / 100,
      conflictExposure: Math.round(conflictExposure * 100) / 100,
      overallContribution: Math.round(overallContribution * 100) / 100,
    };
  });

  // Overall consistency
  const overall = Math.round(
    (reinforcement * 0.35 +
     (1 - conflictPenalty) * 0.25 +
     domainDiversity * 0.15 +
     weightDistribution * 0.15 +
     chainDepth * 0.10) * 100
  ) / 100;

  return {
    overall,
    reinforcement: Math.round(reinforcement * 100) / 100,
    conflictCount: primitiveSet.conflictsResolved.length,
    conflictPenalty: Math.round(conflictPenalty * 100) / 100,
    domainDiversity: Math.round(domainDiversity * 100) / 100,
    weightDistribution: Math.round(weightDistribution * 100) / 100,
    chainDepth: Math.round(chainDepth * 100) / 100,
    perPrimitive,
  };
}

/**
 * Check if a primitive set is coherent enough to proceed.
 * Returns true if above threshold.
 */
export function isCoherent(
  score: ConsistencyScore,
  minOverall: number = 0.50,
  maxConflicts: number = 3,
): { coherent: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (score.overall < minOverall) {
    reasons.push(`Overall consistency ${score.overall.toFixed(2)} below threshold ${minOverall}`);
  }
  if (score.conflictCount > maxConflicts) {
    reasons.push(`${score.conflictCount} conflicts exceeds max ${maxConflicts}`);
  }
  if (score.conflictPenalty > 0.4) {
    reasons.push(`Conflict penalty ${score.conflictPenalty.toFixed(2)} too high`);
  }

  return {
    coherent: reasons.length === 0,
    reasons,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function computeEntropy(values: number[]): number {
  const total = values.reduce((s, v) => s + v, 0);
  if (total === 0) return 0;
  let entropy = 0;
  for (const v of values) {
    const p = v / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy;
}

function computeVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const squaredDiffs = values.map(v => (v - mean) ** 2);
  return squaredDiffs.reduce((s, v) => s + v, 0) / values.length;
}
