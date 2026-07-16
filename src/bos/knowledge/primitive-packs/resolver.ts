// ─── Knowledge Pack Resolver (backward compatible) ────────────────
// Prefers an existing monolithic KnowledgePack (taxonomy/packs/*) when one
// matches the build context, otherwise returns a ComposedKnowledgePack from
// primitive packs. Existing monolithic packs keep working unchanged.

import type { KnowledgePack } from '../../../taxonomy/types.js';
import { CompositionContext, ComposedKnowledgePack } from './types.js';
import { composeKnowledgePack } from './composer.js';

export type ResolvedPack = KnowledgePack | ComposedKnowledgePack;

export function resolveKnowledgePack(
  ctx: CompositionContext,
  monolithic?: Record<string, KnowledgePack>
): ResolvedPack {
  if (monolithic) {
    const path = ctx.taxonomyPath;
    if (path && monolithic[path]) return monolithic[path];
    const industry = ctx.industry;
    if (industry) {
      const found = Object.entries(monolithic).find(
        ([k, p]) => p.id === industry || k.startsWith(industry) || (p as KnowledgePack).taxonomyPath === industry
      );
      if (found) return found[1];
    }
  }
  return composeKnowledgePack(ctx);
}
