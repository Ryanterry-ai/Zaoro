// ─── Learning → Promotion (Phase R2 / Step 6) ────────────────────────
// Runtime Learning records observations. This module aggregates high-confidence
// candidate knowledge into CAPABILITY ONTOLOGY SUGGESTIONS — i.e. discoveries
// the system made at runtime that should (under human/trusted review) update the
// canonical capability vocabulary. It NEVER mutates the registry at runtime; it
// only produces a reviewable patch for the Promotion Pipeline. This is what makes
// "the system gets better at capabilities, not industries" concrete.

import { capabilityRegistry, type CapabilityId } from '../capabilities/index.js';
import type { CandidateKnowledge } from '../candidate/types.js';

export type SuggestionKind = 'alias' | 'dependency' | 'primitiveTag' | 'industry';

export interface CapabilitySuggestion {
  kind: SuggestionKind;
  /** Canonical capability id the suggestion targets/relates to. */
  capability: CapabilityId;
  /** The proposed value (alias string, dependency id, primitive tag, or industry). */
  value: string;
  evidence: string;
  confidence: number;
}

export interface CapabilityPatch {
  /** New aliases to add to existing canonical capabilities. */
  aliases: Array<{ capability: CapabilityId; alias: string }>;
  /** New dependency edges between canonical capabilities. */
  dependencies: Array<{ capability: CapabilityId; dependsOn: CapabilityId }>;
  /** New primitive tags observed for a capability. */
  primitiveTags: Array<{ capability: CapabilityId; tag: string }>;
  suggestions: CapabilitySuggestion[];
}

export interface SuggestOptions {
  /** Minimum candidate confidence to count as evidence. */
  minConfidence?: number;
  /** Minimum co-occurrence count before an unknown tag becomes an alias suggestion. */
  minCoOccurrence?: number;
}

interface RawTagStat {
  /** canonical capability ids this raw tag co-occurred with. */
  coOccurrences: Map<CapabilityId, number>;
  count: number;
}

/**
 * Aggregate candidate knowledge into capability ontology suggestions.
 */
export function suggestFromCandidates(
  candidates: CandidateKnowledge[],
  opts: SuggestOptions = {},
): CapabilitySuggestion[] {
  const minConfidence = opts.minConfidence ?? 0.7;
  const minCoOccurrence = opts.minCoOccurrence ?? 3;

  const rawTagStats = new Map<string, RawTagStat>();
  const pairCount = new Map<string, number>(); // `${a}->${b}` (sorted) -> count

  for (const c of candidates) {
    const conf = c.observations.reduce((acc, o) => Math.max(acc, o.confidence), 0);
    if (conf < minConfidence) continue;
    const rawTags = c.capabilities ?? [];
    const canonicalInCandidate: CapabilityId[] = [];
    for (const tag of rawTags) {
      const norm = capabilityRegistry.normalize(tag);
      if (norm) {
        canonicalInCandidate.push(norm);
      } else {
        const stat = rawTagStats.get(tag) ?? { coOccurrences: new Map<CapabilityId, number>(), count: 0 };
        stat.count += 1;
        for (const canon of canonicalInCandidate) {
          stat.coOccurrences.set(canon, (stat.coOccurrences.get(canon) ?? 0) + 1);
        }
        rawTagStats.set(tag, stat);
      }
    }
    for (let i = 0; i < canonicalInCandidate.length; i++) {
      for (let j = i + 1; j < canonicalInCandidate.length; j++) {
        const [a, b] = [canonicalInCandidate[i], canonicalInCandidate[j]].sort();
        const key = `${a}->${b}`;
        pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
      }
    }
  }

  const suggestions: CapabilitySuggestion[] = [];

  for (const [rawTag, stat] of rawTagStats) {
    if (stat.count < minCoOccurrence) continue;
    let best: CapabilityId | undefined;
    let bestCount = 0;
    for (const [canon, n] of stat.coOccurrences) {
      if (n > bestCount) {
        bestCount = n;
        best = canon;
      }
    }
    if (!best) continue;
    suggestions.push({
      kind: 'alias',
      capability: best,
      value: rawTag,
      evidence: `Observed ${stat.count} high-confidence candidates tagged '${rawTag}' co-occurring with '${best}'`,
      confidence: Math.min(0.99, bestCount / stat.count),
    });
  }

  for (const [key, n] of pairCount) {
    if (n < minCoOccurrence) continue;
    const [a, b] = key.split('->') as [CapabilityId, CapabilityId];
    suggestions.push({
      kind: 'dependency',
      capability: a,
      value: b,
      evidence: `Canonical capabilities '${a}' and '${b}' co-occurred in ${n} high-confidence candidates`,
      confidence: Math.min(0.99, n / (n + 1)),
    });
  }

  return suggestions;
}

/**
 * Build a reviewable patch from suggestions. Returns empty arrays when there is
 * nothing to promote. The caller (Promotion Pipeline) decides whether to apply.
 */
export function buildCapabilityPatch(suggestions: CapabilitySuggestion[]): CapabilityPatch {
  const aliases: CapabilityPatch['aliases'] = [];
  const dependencies: CapabilityPatch['dependencies'] = [];
  const primitiveTags: CapabilityPatch['primitiveTags'] = [];
  for (const s of suggestions) {
    if (s.kind === 'alias') aliases.push({ capability: s.capability, alias: s.value });
  }
  return { aliases, dependencies, primitiveTags, suggestions };
}
