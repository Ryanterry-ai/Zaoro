// ─── Primitive Conflict Resolver ────────────────────────────────────
// Users rarely ask for one thing.  They ask:
//
//   "Build an Apple website with Tesla animations and Nike energy."
//   "Luxury Rolex aesthetics with Formula 1 telemetry."
//   "IKEA simplicity mixed with cyberpunk."
//
// These produce conflicting primitives.  Apple says minimalism (0.98),
// Nike says energy (0.85), Tesla says engineering (0.78) + dark (0.71).
// The Conflict Resolver decides what to do:
//
//   - Reconcile: weighted blend, keeping each brand's strongest traits
//   - Average:   simple mean of conflicting weights
//   - Max:       take the highest weight
//   - Dominant:  the most intense brand wins
//
// The resolver produces a single ResolvedPrimitiveSet with no conflicts.

import type {
  BrandReference,
  ConflictResolutionConfig,
  Primitive,
  PrimitiveSet,
  ResolvedPrimitive,
} from './types.js';
import { DEFAULT_CONFLICT_CONFIG } from './types.js';
import { primitiveRegistry, BRAND_PRIMITIVES } from './registry.js';

// ─── Input ──────────────────────────────────────────────────────────

export interface ConflictResolverInput {
  /** Brand references from the user prompt. */
  brands: BrandReference[];
  /** Industry context for filtering. */
  industry?: string;
  /** Override config. */
  config?: Partial<ConflictResolutionConfig>;
}

// ─── Resolution ─────────────────────────────────────────────────────

interface RawPrimitive {
  id: string;
  source: string;       // which brand contributed it
  weight: number;       // brand intensity × base weight
  confidence: number;
  domain: Primitive['domain'];
  name: string;
}

/**
 * Resolve conflicting brand references into a single weighted primitive set.
 *
 * Algorithm:
 *   1. Collect all primitives from all brands
 *   2. Detect conflicts (pairwise)
 *   3. Apply resolution strategy per conflict
 *   4. Normalize weights to fit within budget
 *   5. Discover multi-hop chains
 *   6. Return clean PrimitiveSet
 */
export function resolveConflicts(input: ConflictResolverInput): PrimitiveSet {
  const config = { ...DEFAULT_CONFLICT_CONFIG, ...input.config };
  const conflictsResolved: PrimitiveSet['conflictsResolved'] = [];

  // 1. Collect all primitives from brands
  const rawMap = new Map<string, RawPrimitive[]>();
  for (const brand of input.brands) {
    const brandLower = brand.brand.toLowerCase();
    const primitiveIds = BRAND_PRIMITIVES[brandLower] ?? [];

    // Also try partial match
    const matchedIds = primitiveIds.length > 0
      ? primitiveIds
      : Object.entries(BRAND_PRIMITIVES)
          .filter(([key]) => key.includes(brandLower) || brandLower.includes(key))
          .flatMap(([, ids]) => ids);

    for (const id of matchedIds) {
      const node = primitiveRegistry.get(id);
      if (!node) continue;

      const raw: RawPrimitive = {
        id,
        source: brand.brand,
        weight: brand.intensity * (node.confidence * 0.8 + 0.2),
        confidence: node.confidence,
        domain: node.domain,
        name: node.name,
      };

      const existing = rawMap.get(id) ?? [];
      existing.push(raw);
      rawMap.set(id, existing);
    }
  }

  // 2. Detect and resolve conflicts
  const allIds = [...rawMap.keys()];
  const resolvedMap = new Map<string, { weight: number; reasoning: string }>();

  for (let i = 0; i < allIds.length; i++) {
    for (let j = i + 1; j < allIds.length; j++) {
      const a = allIds[i];
      const b = allIds[j];

      if (primitiveRegistry.conflicts(a, b)) {
        const sourcesA = rawMap.get(a) ?? [];
        const sourcesB = rawMap.get(b) ?? [];
        const avgA = sourcesA.reduce((s, r) => s + r.weight, 0) / sourcesA.length;
        const avgB = sourcesB.reduce((s, r) => s + r.weight, 0) / sourcesB.length;

        const strategy = determineStrategy(sourcesA, sourcesB, config.defaultStrategy);
        const result = applyStrategy(avgA, avgB, strategy);

        conflictsResolved.push({
          a,
          b,
          strategy,
          result: `Resolved ${a}(${avgA.toFixed(2)}) vs ${b}(${avgB.toFixed(2)}) → ${strategy} → ${result.toFixed(2)}`,
        });

        // Apply resolution: reduce the weaker one
        if (avgA > avgB) {
          resolvedMap.set(b, {
            weight: result,
            reasoning: `Conflict with ${a}: ${strategy} reduced from ${avgB.toFixed(2)} to ${result.toFixed(2)}`,
          });
        } else {
          resolvedMap.set(a, {
            weight: result,
            reasoning: `Conflict with ${b}: ${strategy} reduced from ${avgA.toFixed(2)} to ${result.toFixed(2)}`,
          });
        }
      }
    }
  }

  // 3. Build resolved primitives
  const resolved: ResolvedPrimitive[] = [];

  for (const [id, raws] of rawMap) {
    const existing = resolvedMap.get(id);
    let finalWeight: number;
    let reasoning: string;

    if (existing) {
      finalWeight = existing.weight;
      reasoning = existing.reasoning;
    } else {
      // No conflict — take the max weight from any source
      finalWeight = Math.max(...raws.map(r => r.weight));
      reasoning = `Max weight from ${raws.map(r => r.source).join(', ')}`;
    }

    const node = primitiveRegistry.get(id);
    resolved.push({
      primitive: node ?? {
        id,
        name: raws[0]?.name ?? id,
        domain: raws[0]?.domain ?? 'experience',
        description: '',
        weight: 0,
        confidence: raws[0]?.confidence ?? 0.5,
        status: 'canonical' as const,
        industries: [],
        relationships: [],
        lastObserved: Date.now(),
        observationCount: 1,
      },
      resolvedWeight: Math.round(finalWeight * 100) / 100,
      reasoning,
    });
  }

  // 4. Sort by weight, apply budget and min/max limits
  resolved.sort((a, b) => b.resolvedWeight - a.resolvedWeight);

  // Filter by min weight
  const filtered = resolved.filter(r => r.resolvedWeight >= config.minWeight);

  // Enforce max primitives
  const truncated = filtered.slice(0, config.maxPrimitives);

  // Normalize to budget
  const totalRaw = truncated.reduce((s, r) => s + r.resolvedWeight, 0);
  if (totalRaw > config.weightBudget) {
    const scale = config.weightBudget / totalRaw;
    for (const r of truncated) {
      r.resolvedWeight = Math.round(r.resolvedWeight * scale * 100) / 100;
    }
  }

  // 5. Discover multi-hop chains
  const chains: PrimitiveSet['chains'] = [];
  const seenChains = new Set<string>();

  for (const r of truncated) {
    const rawChains = primitiveRegistry.chains(r.primitive.id, 4);
    for (const chain of rawChains) {
      // Only include chains where all nodes are in the resolved set
      const allInSet = chain.path.every(
        p => p === r.primitive.id || truncated.some(t => t.primitive.id === p)
      );
      if (allInSet && chain.path.length > 2) {
        const key = chain.path.join('→');
        if (!seenChains.has(key)) {
          seenChains.add(key);
          chains.push({
            path: chain.path,
            domain: r.primitive.domain,
            totalStrength: Math.round(chain.strength * 100) / 100,
          });
        }
      }
    }
  }

  const totalWeight = truncated.reduce((s, r) => s + r.resolvedWeight, 0);

  return {
    primitives: truncated,
    totalWeight: Math.round(totalWeight * 100) / 100,
    conflictsResolved,
    chains,
  };
}

// ─── Strategy Helpers ───────────────────────────────────────────────

function determineStrategy(
  sourcesA: RawPrimitive[],
  sourcesB: RawPrimitive[],
  defaultStrategy: ConflictResolutionConfig['defaultStrategy'],
): ConflictResolutionConfig['defaultStrategy'] {
  // If one brand is much more intense, it dominates
  const maxA = Math.max(...sourcesA.map(s => s.weight));
  const maxB = Math.max(...sourcesB.map(s => s.weight));
  const intensityDiff = Math.abs(maxA - maxB);

  if (intensityDiff > 0.3) return 'dominant';
  if (sourcesA.length === 1 && sourcesB.length === 1) return 'reconcile';
  return defaultStrategy;
}

function applyStrategy(
  weightA: number,
  weightB: number,
  strategy: ConflictResolutionConfig['defaultStrategy'],
): number {
  switch (strategy) {
    case 'average':
      return (weightA + weightB) / 2;
    case 'max':
      return Math.max(weightA, weightB);
    case 'dominant':
      return Math.max(weightA, weightB) * 1.1; // boost the winner
    case 'reconcile':
      // Reconcile: keep both strong, slightly reduce the weaker
      const avg = (weightA + weightB) / 2;
      return avg * 0.85; // slight reduction for both
    default:
      return (weightA + weightB) / 2;
  }
}
