import { describe, it, expect } from 'vitest';
import { suggestFromCandidates, buildCapabilityPatch, type CapabilitySuggestion } from '../src/bos/learning/index.js';
import type { CandidateKnowledge, CandidateKind, CandidateStatus, CandidatePayload } from '../src/bos/candidate/types.js';

function makeCandidate(id: string, capabilities: string[], confidence: number): CandidateKnowledge {
  const payload: CandidatePayload = { node: { type: 'pattern', properties: {} } };
  return {
    id,
    kind: 'pattern' as CandidateKind,
    key: id,
    label: id,
    capabilities,
    payload,
    observations: [{ buildId: id, industry: 'x', capabilities, confidence, timestamp: 1, context: {} }],
    status: 'validated' as CandidateStatus,
    validationReasons: [],
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('learning → promotion (Step 6)', () => {
  it('suggests an alias for an unknown raw tag co-occurring with a canonical capability', () => {
    const cands = [
      makeCandidate('a', ['payments', 'stripepay'], 0.9),
      makeCandidate('b', ['payments', 'stripepay'], 0.9),
      makeCandidate('c', ['payments', 'stripepay'], 0.9),
    ];
    const suggestions = suggestFromCandidates(cands, { minCoOccurrence: 3 });
    const alias = suggestions.find(s => s.kind === 'alias' && s.value === 'stripepay');
    expect(alias).toBeDefined();
    expect(alias!.capability).toBe('payments');
    expect(alias!.confidence).toBeGreaterThan(0.5);
  });

  it('suggests a dependency between co-occurring canonical capabilities', () => {
    const cands = [
      makeCandidate('a', ['commerce.checkout', 'payments'], 0.9),
      makeCandidate('b', ['commerce.checkout', 'payments'], 0.9),
      makeCandidate('c', ['commerce.checkout', 'payments'], 0.9),
    ];
    const suggestions = suggestFromCandidates(cands, { minCoOccurrence: 3 });
    const dep = suggestions.find(s => s.kind === 'dependency' && s.value === 'payments');
    expect(dep).toBeDefined();
    expect(dep!.capability).toBe('commerce.checkout');
  });

  it('ignores low-confidence candidates', () => {
    const cands = [
      makeCandidate('a', ['payments', 'stripepay'], 0.2),
      makeCandidate('b', ['payments', 'stripepay'], 0.2),
      makeCandidate('c', ['payments', 'stripepay'], 0.2),
    ];
    const suggestions = suggestFromCandidates(cands, { minCoOccurrence: 3 });
    expect(suggestions.find(s => s.value === 'stripepay')).toBeUndefined();
  });

  it('builds a reviewable patch without mutating the registry', () => {
    const cands = [
      makeCandidate('a', ['payments', 'stripepay'], 0.9),
      makeCandidate('b', ['payments', 'stripepay'], 0.9),
      makeCandidate('c', ['payments', 'stripepay'], 0.9),
    ];
    const suggestions: CapabilitySuggestion[] = suggestFromCandidates(cands, { minCoOccurrence: 3 });
    const patch = buildCapabilityPatch(suggestions);
    expect(patch.aliases.length).toBe(1);
    expect(patch.aliases[0].alias).toBe('stripepay');
  });
});
