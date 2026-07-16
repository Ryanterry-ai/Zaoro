// ─── Cross-Domain Learning ──────────────────────────────────────────
// When "craftsmanship" is discovered for one business, it should transfer
// to other businesses that share primitive relationships — NOT because
// they're in the same "industry", but because their semantic primitive
// graphs overlap.
//
// Cross-Domain Learning discovers which primitives transfer across
// businesses by finding shared primitive connections in the graph.
//
// Example:
//   Business A → warmth → craftsmanship → slow-reveal → macro-photography
//   Business B → craftsmanship → precision → time → slow-reveal
//
// Shared: craftsmanship, slow-reveal
// These transfer: Business A learns from Business B's craftsmanship path.
//
// NO industry labels are used.  Transfer is purely relationship-driven.

import type { Primitive, PrimitiveRelationship } from './types.js';
import { primitiveRegistry } from './registry.js';

// ─── Transfer Discovery ─────────────────────────────────────────────

export interface TransferDiscovery {
  /** Primitive that transfers. */
  primitiveId: string;
  /** Source context label (entity/brand name, NOT industry). */
  sourceContext: string;
  /** Target context label (entity/brand name, NOT industry). */
  targetContext: string;
  /** Strength of the transfer (0–1). */
  strength: number;
  /** The chain that connects them. */
  chain: string[];
  /** What the primitive implies in the target context. */
  implications: string[];
}

// ─── Cross-Domain Learner ───────────────────────────────────────────

export class CrossDomainLearner {
  /**
   * Find primitive transfers between two contexts (entities/brands).
   *
   * Given a source context's primitive set and a target context's
   * primitive set, find primitives effective in the source that could
   * transfer to the target via shared relationships.
   */
  findTransfers(
    sourceContext: string,
    targetContext: string,
    maxTransfers: number = 5,
  ): TransferDiscovery[] {
    const sourcePrimitives = primitiveRegistry.forBrand(sourceContext);
    const targetPrimitives = primitiveRegistry.forBrand(targetContext);
    const targetIds = new Set(targetPrimitives.map(p => p.id));

    const transfers: TransferDiscovery[] = [];

    for (const sourcePrim of sourcePrimitives) {
      const chains = primitiveRegistry.chains(sourcePrim.id, 3);

      for (const chain of chains) {
        const terminalId = chain.path[chain.path.length - 1];

        // Transfer happens when a chain from the source reaches a
        // primitive the target already embodies.
        if (targetIds.has(terminalId) && terminalId !== sourcePrim.id) {
          const implications = this.findImplications(sourcePrim, targetContext);

          transfers.push({
            primitiveId: sourcePrim.id,
            sourceContext,
            targetContext,
            strength: chain.strength,
            chain: chain.path,
            implications,
          });
        }
      }
    }

    transfers.sort((a, b) => b.strength - a.strength);
    const seen = new Set<string>();
    return transfers.filter(t => {
      const key = `${t.primitiveId}:${t.targetContext}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, maxTransfers);
  }

  /**
   * Find all contexts (entities/brands) that could benefit from a primitive
   * via their shared relationship graph.
   */
  findBeneficiaryContexts(
    primitiveId: string,
    maxContexts: number = 10,
  ): Array<{
    context: string;
    transferStrength: number;
    implications: string[];
  }> {
    const primitive = primitiveRegistry.get(primitiveId);
    if (!primitive) return [];

    const chains = primitiveRegistry.chains(primitiveId, 3);
    const contextMap = new Map<string, { strength: number; implications: string[] }>();

    for (const chain of chains) {
      const terminalId = chain.path[chain.path.length - 1];
      const terminal = primitiveRegistry.get(terminalId);
      if (!terminal) continue;

      // Find brand contexts that embody the terminal primitive
      for (const [brand, ids] of Object.entries(BRAND_PRIMITIVES_REF)) {
        if (ids.includes(terminalId) && brand !== primitiveId) {
          const existing = contextMap.get(brand) ?? { strength: 0, implications: [] };
          existing.strength = Math.max(existing.strength, chain.strength);
          if (!existing.implications.includes(terminalId)) {
            existing.implications.push(terminalId);
          }
          contextMap.set(brand, existing);
        }
      }
    }

    return [...contextMap.entries()]
      .map(([context, data]) => ({
        context,
        transferStrength: data.strength,
        implications: data.implications,
      }))
      .sort((a, b) => b.transferStrength - a.transferStrength)
      .slice(0, maxContexts);
  }

  /**
   * Find what a primitive implies in a specific context (entity/brand).
   */
  private findImplications(
    primitive: Primitive,
    targetContext: string,
  ): string[] {
    const targetPrimitives = new Set(
      primitiveRegistry.forBrand(targetContext).map(p => p.id)
    );
    const implications: string[] = [];
    const visited = new Set<string>();

    const dfs = (id: string, depth: number) => {
      if (depth > 3 || visited.has(id)) return;
      visited.add(id);

      const rels = primitiveRegistry.relationships(id);
      for (const rel of rels) {
        if (rel.type === 'conflicts') continue;
        if (targetPrimitives.has(rel.targetId)) {
          implications.push(rel.targetId);
        }
        dfs(rel.targetId, depth + 1);
      }
    };

    dfs(primitive.id, 0);
    return [...new Set(implications)];
  }

  /**
   * Build a transfer matrix: for each pair of contexts, how strong is the
   * primitive transfer between them?
   */
  buildTransferMatrix(
    contexts: string[],
  ): Map<string, Map<string, number>> {
    const matrix = new Map<string, Map<string, number>>();
    const brandKeys = Object.keys(BRAND_PRIMITIVES_REF);

    for (const source of contexts) {
      const sourceMap = new Map<string, number>();
      for (const target of contexts) {
        if (source === target) {
          sourceMap.set(target, 1.0);
          continue;
        }
        const transfers = this.findTransfers(source, target, 3);
        const avgStrength = transfers.length > 0
          ? transfers.reduce((s, t) => s + t.strength, 0) / transfers.length
          : 0;
        sourceMap.set(target, Math.round(avgStrength * 100) / 100);
      }
      matrix.set(source, sourceMap);
    }

    return matrix;
  }
}

// Import BRAND_PRIMITIVES lazily to avoid circular import at module load
import { BRAND_PRIMITIVES as BRAND_PRIMITIVES_REF } from './registry.js';

// Singleton
let _instance: CrossDomainLearner | undefined;
export function getCrossDomainLearner(): CrossDomainLearner {
  if (!_instance) _instance = new CrossDomainLearner();
  return _instance;
}
