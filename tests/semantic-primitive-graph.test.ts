import { describe, it, expect } from 'vitest';
import type {
  ConfidentPrimitive,
  EntityEvidence,
  IntentDecomposition,
  PrimitiveCategory,
} from '../src/bos/intent/types.js';
import { PrimitiveGraph } from '../src/bos/graph/primitive-graph.js';
import { SEED_PRIMITIVES, SEED_RELATIONSHIPS, ENTITY_TO_PRIMITIVES, buildPrimitiveGraph } from '../src/bos/intent/primitive-seeds.js';

describe('Semantic Primitive Graph', () => {
  describe('types', () => {
    it('ConfidentPrimitive has required fields', () => {
      const cp: ConfidentPrimitive = {
        primitiveId: 'minimalism',
        confidence: 0.92,
        evidence: [{ entity: 'Apple', source: 'keyword', confidence: 0.9 }],
      };
      expect(cp.primitiveId).toBe('minimalism');
      expect(cp.confidence).toBe(0.92);
      expect(cp.evidence.length).toBe(1);
    });

    it('IntentDecomposition has required fields', () => {
      const id: IntentDecomposition = {
        entities: [{ name: 'Apple', confidence: 0.92, type: 'brand' }],
        primitives: [{ primitiveId: 'minimalism', confidence: 0.9, evidence: [] }],
        overallConfidence: 0.88,
        evidenceTrail: [],
      };
      expect(id.entities.length).toBe(1);
      expect(id.primitives.length).toBe(1);
    });
  });

  describe('PrimitiveGraph', () => {
    it('adds and retrieves primitives by category', () => {
      const g = new PrimitiveGraph();
      g.addPrimitive({ id: 'minimalism', name: 'Minimalism', category: 'aesthetic', description: 'Clean, reduced design' });
      g.addPrimitive({ id: 'whitespace', name: 'Whitespace', category: 'aesthetic', description: 'Generous negative space' });
      g.addPrimitive({ id: 'slow-cinematic', name: 'Slow Cinematic', category: 'motion', description: 'Deliberate pacing' });

      const aesthetic = g.getPrimitivesByCategory('aesthetic');
      expect(aesthetic.length).toBe(2);
      const motion = g.getPrimitivesByCategory('motion');
      expect(motion.length).toBe(1);
    });

    it('adds and queries relationships', () => {
      const g = new PrimitiveGraph();
      g.addPrimitive({ id: 'minimalism', name: 'Minimalism', category: 'aesthetic', description: '' });
      g.addPrimitive({ id: 'whitespace', name: 'Whitespace', category: 'aesthetic', description: '' });
      g.addRelationship({ source: 'minimalism', target: 'whitespace', type: 'implies', weight: 0.9 });

      const related = g.getRelationships('minimalism');
      expect(related.length).toBe(1);
      expect(related[0].type).toBe('implies');
    });

    it('finds path between primitives', () => {
      const g = new PrimitiveGraph();
      g.addPrimitive({ id: 'minimalism', name: 'Minimalism', category: 'aesthetic', description: '' });
      g.addPrimitive({ id: 'whitespace', name: 'Whitespace', category: 'aesthetic', description: '' });
      g.addPrimitive({ id: 'luxury', name: 'Luxury', category: 'emotion', description: '' });
      g.addRelationship({ source: 'minimalism', target: 'whitespace', type: 'implies', weight: 0.9 });
      g.addRelationship({ source: 'whitespace', target: 'luxury', type: 'strengthens', weight: 0.7 });

      const path = g.findPath('minimalism', 'luxury');
      expect(path).toEqual(['minimalism', 'whitespace', 'luxury']);
    });

    it('explains a primitive via evidence trail', () => {
      const g = new PrimitiveGraph();
      g.addPrimitive({ id: 'minimalism', name: 'Minimalism', category: 'aesthetic', description: 'Clean design' });
      g.addPrimitive({ id: 'precision', name: 'Precision', category: 'aesthetic', description: '' });
      g.addRelationship({ source: 'minimalism', target: 'precision', type: 'implies', weight: 0.85 });

      const explanation = g.explain('minimalism');
      expect(explanation.primitive.id).toBe('minimalism');
      expect(explanation.implied.length).toBe(1);
      expect(explanation.implied[0].id).toBe('precision');
    });

    it('serializes and deserializes', () => {
      const g = new PrimitiveGraph();
      g.addPrimitive({ id: 'minimalism', name: 'Minimalism', category: 'aesthetic', description: '' });
      g.addRelationship({ source: 'minimalism', target: 'minimalism', type: 'implies', weight: 1 });

      const json = g.toJSON();
      const g2 = PrimitiveGraph.fromJSON(json);
      expect(g2.getPrimitivesByCategory('aesthetic').length).toBe(1);
    });
  });

  describe('Primitive Seeds', () => {
    it('has 60+ primitives across 6 categories', () => {
      expect(SEED_PRIMITIVES.length).toBeGreaterThanOrEqual(60);
      const categories = new Set(SEED_PRIMITIVES.map(p => p.category));
      expect(categories.size).toBe(6);
    });

    it('has 40+ relationships', () => {
      expect(SEED_RELATIONSHIPS.length).toBeGreaterThanOrEqual(40);
    });

    it('has 40+ entity-to-primitive mappings', () => {
      const entityCount = Object.keys(ENTITY_TO_PRIMITIVES).length;
      expect(entityCount).toBeGreaterThanOrEqual(40);
    });

    it('buildPrimitiveGraph returns a populated graph', () => {
      const g = buildPrimitiveGraph();
      expect(g.getPrimitivesByCategory('aesthetic').length).toBeGreaterThan(0);
      expect(g.getPrimitivesByCategory('motion').length).toBeGreaterThan(0);
      expect(g.getPrimitivesByCategory('emotion').length).toBeGreaterThan(0);
    });

    it('Apple maps to minimalism, whitespace, premium', () => {
      const primitives = ENTITY_TO_PRIMITIVES['Apple'];
      expect(primitives).toBeDefined();
      expect(primitives).toContain('minimalism');
      expect(primitives).toContain('whitespace');
    });

    it('Iron Man maps to mechanical-assembly, engineering, innovation', () => {
      const primitives = ENTITY_TO_PRIMITIVES['Iron Man'];
      expect(primitives).toBeDefined();
      expect(primitives).toContain('mechanical-assembly');
      expect(primitives).toContain('engineering');
    });

    it('Coffee maps to warmth, organic, craft', () => {
      const primitives = ENTITY_TO_PRIMITIVES['Coffee'];
      expect(primitives).toBeDefined();
      expect(primitives).toContain('warmth');
      expect(primitives).toContain('organic');
    });
  });
});
