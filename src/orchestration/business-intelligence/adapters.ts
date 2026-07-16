/**
 * Adapters — bridges between BusinessKnowledge and legacy consumers.
 *
 * These let existing layers (rules-engine, design-intelligence, renderer, …)
 * gradually migrate to read BusinessKnowledge WITHOUT breaking today. The
 * renderer never infers business logic; it may read vocabulary/capabilities
 * that BusinessKnowledge already derived.
 */

import type { BusinessKnowledge, BREContextLike } from './types.js';

/** Read BusinessKnowledge from any context that may carry it. */
export function getBusinessKnowledge(ctx: BREContextLike): BusinessKnowledge | undefined {
  return (ctx as { businessKnowledge?: BusinessKnowledge }).businessKnowledge;
}

/** Domain vocabulary mapping for downstream text generation. */
export function toVocabulary(bk: BusinessKnowledge): Record<string, string> {
  return bk.vocabulary.terms;
}

/** Capabilities derived from workflow primitives (legacy shape). */
export function toCapabilities(bk: BusinessKnowledge): string[] {
  const caps = new Set<string>();
  for (const wf of bk.workflows) caps.add(wf.kind);
  for (const p of bk.pages) for (const w of p.workflows) caps.add(w);
  return [...caps];
}

/** Required page paths (legacy shape). */
export function toPagePaths(bk: BusinessKnowledge): string[] {
  return bk.pages.map((p) => p.path);
}

/** Compliance pack ids (legacy shape). */
export function toCompliancePacks(bk: BusinessKnowledge): string[] {
  return bk.compliance.map((c) => c.pack);
}

/** Compact summary for logs / lineage. */
export function summarize(bk: BusinessKnowledge): string {
  return [
    `type=${bk.discovery.businessType}`,
    `industry=${bk.discovery.industry}`,
    `domain=${bk.discovery.domain}`,
    `workflows=${bk.workflows.length}`,
    `entities=${bk.entities.length}`,
    `compliance=${bk.compliance.length}`,
  ].join(' ');
}
