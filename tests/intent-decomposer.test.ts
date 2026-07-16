import { describe, it, expect } from 'vitest';
import { IntentDecomposer } from '../src/bos/intent/intent-decomposer.js';
import { buildPrimitiveGraph, ENTITY_TO_PRIMITIVES } from '../src/bos/intent/primitive-seeds.js';

const graph = buildPrimitiveGraph();
const decomposer = new IntentDecomposer(graph, ENTITY_TO_PRIMITIVES);

describe('IntentDecomposer', () => {
  it('extracts entities from a prompt', () => {
    const result = decomposer.decompose('Build me something like Apple but with Tesla vibes');
    expect(result.entities.length).toBeGreaterThanOrEqual(2);
    const names = result.entities.map(e => e.name);
    expect(names).toContain('Apple');
    expect(names).toContain('Tesla');
  });

  it('maps entities to primitives', () => {
    const result = decomposer.decompose('Build me something like Apple');
    expect(result.primitives.length).toBeGreaterThan(0);
    const primitiveIds = result.primitives.map(p => p.primitiveId);
    expect(primitiveIds).toContain('minimalism');
  });

  it('assigns confidence scores', () => {
    const result = decomposer.decompose('Build me something like Apple with Iron Man HUD');
    for (const p of result.primitives) {
      expect(p.confidence).toBeGreaterThan(0);
      expect(p.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('propagates confidence through relationships', () => {
    const result = decomposer.decompose('Premium Apple headphones');
    // Confidence should be > 0 for mapped primitives
    const minimalism = result.primitives.find(p => p.primitiveId === 'minimalism');
    expect(minimalism).toBeDefined();
    expect(minimalism!.confidence).toBeGreaterThan(0);
    // Whitespace should also appear (propagated from minimalism via implies)
    const whitespace = result.primitives.find(p => p.primitiveId === 'whitespace');
    expect(whitespace).toBeDefined();
    expect(whitespace!.confidence).toBeGreaterThan(0);
  });

  it('handles unknown entities gracefully', () => {
    const result = decomposer.decompose('Build me a widget for flurbing');
    expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
  });

  it('returns evidence trail', () => {
    const result = decomposer.decompose('Apple minimalism luxury');
    expect(result.evidenceTrail.length).toBeGreaterThan(0);
    for (const e of result.evidenceTrail) {
      expect(e.entity).toBeTruthy();
      expect(e.source).toBeTruthy();
      expect(e.confidence).toBeGreaterThan(0);
    }
  });

  it('builds confidence > 0.7 for well-known patterns', () => {
    const result = decomposer.decompose('Premium Apple luxury minimalism whitespace');
    expect(result.overallConfidence).toBeGreaterThan(0.7);
  });

  it('builds low confidence for obscure/unknown inputs', () => {
    const result = decomposer.decompose('xyzzy flurbo snazzle');
    expect(result.overallConfidence).toBeLessThan(0.3);
  });

  it('decomposition runs without errors for realistic prompts', () => {
    const result = decomposer.decompose('Build a premium headphones ecommerce site like Apple');
    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.primitives.length).toBeGreaterThan(0);
    expect(result.overallConfidence).toBeGreaterThan(0);
  });

  it('Iron Man maps to mechanical-assembly and engineering primitives', () => {
    const result = decomposer.decompose('Iron Man HUD interface');
    const primitiveIds = result.primitives.map(p => p.primitiveId);
    expect(primitiveIds).toContain('mechanical-assembly');
    expect(primitiveIds).toContain('engineering');
  });

  it('Coffee maps to warmth and organic primitives', () => {
    const result = decomposer.decompose('Artisan coffee shop website');
    const primitiveIds = result.primitives.map(p => p.primitiveId);
    expect(primitiveIds).toContain('warmth');
    expect(primitiveIds).toContain('organic');
  });
});
