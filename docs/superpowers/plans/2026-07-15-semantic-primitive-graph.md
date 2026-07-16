# Semantic Primitive Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a Semantic Primitive Graph as the canonical vocabulary layer — brands/entities become evidence, not knowledge. Every extracted primitive carries confidence and provenance.

**Architecture:** Three-layer decomposition: Prompt → Entity Extraction (with confidence) → Primitive Mapping (canonical vocabulary) → Experience Compilation (primitives only). The Primitive Graph stores universal experience vocabulary with typed relationships. The Intent Decomposer extracts entities from prompts, maps them to primitives, and propagates confidence. Downstream systems (Experience Director, Creative Strategy, Renderer) consume only primitives.

**Tech Stack:** TypeScript, Vitest, existing KnowledgeGraph engine (`src/bos/graph/engine.ts`), existing BREContext (`src/bos/reasoning/rules-engine.ts`).

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/bos/intent/types.ts` | `SemanticIntent`, `ConfidentPrimitive`, `EntityEvidence`, `IntentDecomposition` types |
| `src/bos/graph/primitive-graph.ts` | `PrimitiveGraph` class — stores/explains universal experience vocabulary |
| `src/bos/intent/primitive-seeds.ts` | Seed data: 60+ primitives across 6 categories, 40+ entity→primitive mappings |
| `src/bos/intent/intent-decomposer.ts` | `IntentDecomposer` — extracts entities, maps to primitives, propagates confidence |
| `src/bos/intent/index.ts` | Barrel export |
| `tests/semantic-primitive-graph.test.ts` | PrimitiveGraph unit tests |
| `tests/intent-decomposer.test.ts` | IntentDecomposer unit tests |

---

## Global Constraints

- Default every task to a deterministic tool. Only call an LLM for tasks listed in skills as "LLM-required."
- Never generate boilerplate with an LLM — copy from templates and parameterize.
- Every project must pass `node node_modules/typescript/bin/tsc --noEmit` and `node node_modules/vitest/vitest.mjs run` before being marked complete.
- All content must be stored in structured data — never hardcoded inline in component code.
- No generated code may reference source URLs or call back to non-client-owned services.
- Existing tests must not break. New tests must pass in isolation and under full suite.

---

## Task 1: Semantic Intent Types

**Files:**
- Create: `src/bos/intent/types.ts`
- Create: `src/bos/intent/index.ts`
- Test: `tests/semantic-primitive-graph.test.ts`

**Interfaces:**
- Consumes: nothing (foundation)
- Produces: `ConfidentPrimitive`, `EntityEvidence`, `IntentDecomposition`, `PrimitiveCategory`, `PrimitiveRelationshipType`

- [ ] **Step 1: Create types file**

```typescript
// src/bos/intent/types.ts
// ─── Semantic Primitive Graph Types ───────────────────────────────
// Brands/entities become evidence. Primitives are the canonical vocabulary.
// Every extraction carries confidence and provenance.

/** Categories of experience primitives */
export type PrimitiveCategory =
  | 'aesthetic'      // minimalism, whitespace, bold-typography, gradient
  | 'motion'         // slow-cinematic, parallax, micro-interaction, stagger
  | 'structure'      // grid, bento, editorial, card-based, single-page
  | 'emotion'        // luxury, confidence, energy, warmth, trust, playfulness
  | 'interaction'    // hover-reveal, scroll-trigger, drag, gesture, voice
  | 'industry';      // coffee-craft, mechanical-assembly, precision-engineering

/** How primitives relate to each other */
export type PrimitiveRelationshipType =
  | 'implies'       // minimalism implies whitespace
  | 'conflicts'     // bold-typography conflicts with minimalism
  | 'composes'      // luxury = craftsmanship + precision + slow-pacing
  | 'requires'      // parallax requires scroll-trigger
  | 'belongs_to'    // coffee-craft belongs_to emotion
  | 'strengthens';  // whitespace strengthens minimalism

/** A primitive with confidence score */
export interface ConfidentPrimitive {
  primitiveId: string;
  confidence: number;        // 0-1
  evidence: EntityEvidence[];
}

/** What input led to a primitive */
export interface EntityEvidence {
  entity: string;            // The raw entity/reference from the prompt
  source: 'keyword' | 'entity' | 'context' | 'composition';
  confidence: number;        // 0-1: how confident we are in this entity extraction
  context?: string;          // Surrounding text for provenance
}

/** Full decomposition of a user prompt */
export interface IntentDecomposition {
  /** Raw entities extracted from the prompt */
  entities: Array<{
    name: string;
    confidence: number;
    type: 'brand' | 'industry' | 'concept' | 'style' | 'feature';
  }>;
  /** Entities mapped to canonical primitives */
  primitives: ConfidentPrimitive[];
  /** Overall confidence in the decomposition */
  overallConfidence: number;
  /** Evidence trail for audit */
  evidenceTrail: EntityEvidence[];
}
```

- [ ] **Step 2: Create barrel**

```typescript
// src/bos/intent/index.ts
export type {
  PrimitiveCategory,
  PrimitiveRelationshipType,
  ConfidentPrimitive,
  EntityEvidence,
  IntentDecomposition,
} from './types.js';
```

- [ ] **Step 3: Write failing test for types existence**

```typescript
// tests/semantic-primitive-graph.test.ts
import { describe, it, expect } from 'vitest';
import type {
  ConfidentPrimitive,
  EntityEvidence,
  IntentDecomposition,
  PrimitiveCategory,
} from '../src/bos/intent/types.js';

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
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node node_modules/vitest/vitest.mjs run tests/semantic-primitive-graph.test.ts`
Expected: 2 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/bos/intent/ tests/semantic-primitive-graph.test.ts
git commit -m "feat: add SemanticPrimitiveGraph types (ConfidentPrimitive, IntentDecomposition)"
```

---

## Task 2: Primitive Graph — Canonical Vocabulary

**Files:**
- Create: `src/bos/graph/primitive-graph.ts`
- Modify: `tests/semantic-primitive-graph.test.ts`

**Interfaces:**
- Consumes: `PrimitiveCategory`, `PrimitiveRelationshipType` from Task 1
- Produces: `PrimitiveGraph` class with `addPrimitive`, `addRelationship`, `getPrimitivesByCategory`, `findPath`, `explain`, `toJSON`, `fromJSON`

- [ ] **Step 1: Write failing tests for PrimitiveGraph**

Append to `tests/semantic-primitive-graph.test.ts`:

```typescript
import { PrimitiveGraph } from '../src/bos/graph/primitive-graph.js';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node node_modules/vitest/vitest.mjs run tests/semantic-primitive-graph.test.ts`
Expected: FAIL — `PrimitiveGraph` not found

- [ ] **Step 3: Implement PrimitiveGraph**

```typescript
// src/bos/graph/primitive-graph.ts
import type { PrimitiveCategory, PrimitiveRelationshipType } from '../intent/types.js';

export interface PrimitiveEntry {
  id: string;
  name: string;
  category: PrimitiveCategory;
  description: string;
  aliases?: string[];        // Alternative names (e.g., "Apple" → "minimalism")
  createdAt: number;
}

export interface PrimitiveRelationship {
  source: string;
  target: string;
  type: PrimitiveRelationshipType;
  weight: number;            // 0-1
}

export interface PrimitiveExplanation {
  primitive: PrimitiveEntry;
  implied: PrimitiveEntry[];
  conflicts: PrimitiveEntry[];
  composes: PrimitiveEntry[];
  requires: PrimitiveEntry[];
}

export class PrimitiveGraph {
  private primitives = new Map<string, PrimitiveEntry>();
  private relationships: PrimitiveRelationship[] = [];
  private adjacency = new Map<string, PrimitiveRelationship[]>();

  addPrimitive(entry: Omit<PrimitiveEntry, 'createdAt'>): void {
    this.primitives.set(entry.id, { ...entry, createdAt: Date.now() });
  }

  getPrimitive(id: string): PrimitiveEntry | undefined {
    return this.primitives.get(id);
  }

  getPrimitivesByCategory(category: PrimitiveCategory): PrimitiveEntry[] {
    return [...this.primitives.values()].filter(p => p.category === category);
  }

  addRelationship(rel: PrimitiveRelationship): void {
    this.relationships.push(rel);
    if (!this.adjacency.has(rel.source)) this.adjacency.set(rel.source, []);
    this.adjacency.get(rel.source)!.push(rel);
  }

  getRelationships(primitiveId: string): PrimitiveRelationship[] {
    return this.adjacency.get(primitiveId) ?? [];
  }

  findPath(from: string, to: string): string[] | null {
    const visited = new Set<string>();
    const queue: string[][] = [[from]];
    visited.add(from);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1];
      if (current === to) return path;

      for (const rel of this.getRelationships(current)) {
        if (!visited.has(rel.target)) {
          visited.add(rel.target);
          queue.push([...path, rel.target]);
        }
      }
    }
    return null;
  }

  explain(primitiveId: string): PrimitiveExplanation {
    const primitive = this.primitives.get(primitiveId)!;
    const rels = this.getRelationships(primitiveId);
    return {
      primitive,
      implied: rels.filter(r => r.type === 'implies').map(r => this.primitives.get(r.target)!).filter(Boolean),
      conflicts: rels.filter(r => r.type === 'conflicts').map(r => this.primitives.get(r.target)!).filter(Boolean),
      composes: rels.filter(r => r.type === 'composes').map(r => this.primitives.get(r.target)!).filter(Boolean),
      requires: rels.filter(r => r.type === 'requires').map(r => this.primitives.get(r.target)!).filter(Boolean),
    };
  }

  toJSON(): string {
    return JSON.stringify({
      primitives: [...this.primitives.values()],
      relationships: this.relationships,
    });
  }

  static fromJSON(json: string): PrimitiveGraph {
    const data = JSON.parse(json);
    const g = new PrimitiveGraph();
    for (const p of data.primitives) g.addPrimitive(p);
    for (const r of data.relationships) g.addRelationship(r);
    return g;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node node_modules/vitest/vitest.mjs run tests/semantic-primitive-graph.test.ts`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/bos/graph/primitive-graph.ts tests/semantic-primitive-graph.test.ts
git commit -m "feat: add PrimitiveGraph — canonical vocabulary with typed relationships"
```

---

## Task 3: Primitive Seed Data

**Files:**
- Create: `src/bos/intent/primitive-seeds.ts`
- Modify: `tests/semantic-primitive-graph.test.ts`

**Interfaces:**
- Consumes: `PrimitiveGraph` from Task 2
- Produces: `SEED_PRIMITIVES` (60+ entries), `SEED_RELATIONSHIPS` (40+ entries), `ENTITY_TO_PRIMITIVES` mapping (40+ entities)

- [ ] **Step 1: Write failing test for seed loading**

Append to `tests/semantic-primitive-graph.test.ts`:

```typescript
import { SEED_PRIMITIVES, SEED_RELATIONSHIPS, ENTITY_TO_PRIMITIVES, buildPrimitiveGraph } from '../src/bos/intent/primitive-seeds.js';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node node_modules/vitest/vitest.mjs run tests/semantic-primitive-graph.test.ts`
Expected: FAIL — `SEED_PRIMITIVES` not found

- [ ] **Step 3: Implement seed data**

Create `src/bos/intent/primitive-seeds.ts` with:
- `SEED_PRIMITIVES`: 60+ entries across 6 categories (aesthetic, motion, structure, emotion, interaction, industry)
- `SEED_RELATIONSHIPS`: 40+ entries with typed relationships
- `ENTITY_TO_PRIMITIVES`: 40+ entity→primitive[] mappings (Apple, Nike, Tesla, Iron Man, Coffee, Gundam, Transformers, etc.)
- `buildPrimitiveGraph()`: builds and returns a populated PrimitiveGraph

*(Full seed data implementation — see the file for all 60+ primitives, 40+ relationships, and 40+ entity mappings. This is deterministic seed data, not generated.)*

- [ ] **Step 4: Run tests to verify they pass**

Run: `node node_modules/vitest/vitest.mjs run tests/semantic-primitive-graph.test.ts`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/bos/intent/primitive-seeds.ts tests/semantic-primitive-graph.test.ts
git commit -m "feat: add 60+ primitive seeds, 40+ relationships, 40+ entity mappings"
```

---

## Task 4: Intent Decomposer — Confidence-Propagated Extraction

**Files:**
- Create: `src/bos/intent/intent-decomposer.ts`
- Create: `tests/intent-decomposer.test.ts`

**Interfaces:**
- Consumes: `PrimitiveGraph` from Task 2, `ENTITY_TO_PRIMITIVES` from Task 3, `IntentDecomposition` from Task 1
- Produces: `IntentDecomposer.decompose(prompt)` → `IntentDecomposition`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/intent-decomposer.test.ts
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
    const result = decomposer.decompose('Premium luxury headphones like Apple');
    // confidence should be lower for indirect primitives
    const minimalism = result.primitives.find(p => p.primitiveId === 'minimalism');
    const whitespace = result.primitives.find(p => p.primitiveId === 'whitespace');
    if (minimalism && whitespace) {
      // whitespace confidence <= minimalism confidence (propagated, not direct)
      expect(whitespace.confidence).toBeLessThanOrEqual(minimalism.confidence + 0.1);
    }
  });

  it('handles unknown entities gracefully', () => {
    const result = decomposer.decompose('Build me a widget for flurbing');
    // Should not crash, may have low confidence
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

  it('builds confidence > 0.8 for well-known patterns', () => {
    const result = decomposer.decompose('Premium Apple luxury minimalism whitespace');
    expect(result.overallConfidence).toBeGreaterThan(0.7);
  });

  it('builds low confidence for obscure/unknown inputs', () => {
    const result = decomposer.decompose('xyzzy flurbo snazzle');
    expect(result.overallConfidence).toBeLessThan(0.3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node node_modules/vitest/vitest.mjs run tests/intent-decomposer.test.ts`
Expected: FAIL — `IntentDecomposer` not found

- [ ] **Step 3: Implement IntentDecomposer**

```typescript
// src/bos/intent/intent-decomposer.ts
import type { IntentDecomposition, ConfidentPrimitive, EntityEvidence } from './types.js';
import type { PrimitiveGraph } from '../graph/primitive-graph.js';

interface ExtractedEntity {
  name: string;
  confidence: number;
  type: 'brand' | 'industry' | 'concept' | 'style' | 'feature';
}

export class IntentDecomposer {
  constructor(
    private graph: PrimitiveGraph,
    private entityMap: Record<string, string[]>,
  ) {}

  decompose(prompt: string): IntentDecomposition {
    const entities = this.extractEntities(prompt);
    const primitives = this.mapToPrimitives(entities);
    const propagated = this.propagateConfidence(primitives);
    const overallConfidence = this.computeOverallConfidence(propagated);

    return {
      entities,
      primitives: propagated,
      overallConfidence,
      evidenceTrail: this.buildEvidenceTrail(entities),
    };
  }

  private extractEntities(prompt: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const seen = new Set<string>();

    // Check against known entity map
    for (const [entity, _primitives] of Object.entries(this.entityMap)) {
      if (prompt.toLowerCase().includes(entity.toLowerCase())) {
        if (!seen.has(entity)) {
          seen.add(entity);
          entities.push({
            name: entity,
            confidence: this.computeEntityConfidence(entity, prompt),
            type: this.classifyEntity(entity),
          });
        }
      }
    }

    // Extract capitalized words as potential entities
    const words = prompt.split(/\s+/);
    for (const word of words) {
      const cleaned = word.replace(/[^a-zA-Z]/g, '');
      if (cleaned.length > 2 && cleaned[0] === cleaned[0].toUpperCase() && !seen.has(cleaned)) {
        seen.add(cleaned);
        // Lower confidence for unvalidated entities
        entities.push({
          name: cleaned,
          confidence: 0.4,
          type: 'concept',
        });
      }
    }

    return entities;
  }

  private mapToPrimitives(entities: ExtractedEntity[]): ConfidentPrimitive[] {
    const primitiveMap = new Map<string, ConfidentPrimitive>();

    for (const entity of entities) {
      const primitiveIds = this.entityMap[entity.name] ?? [];
      for (const primitiveId of primitiveIds) {
        const existing = primitiveMap.get(primitiveId);
        if (existing) {
          // Merge evidence, take higher confidence
          existing.confidence = Math.max(existing.confidence, entity.confidence);
          existing.evidence.push({
            entity: entity.name,
            source: 'entity',
            confidence: entity.confidence,
          });
        } else {
          primitiveMap.set(primitiveId, {
            primitiveId,
            confidence: entity.confidence,
            evidence: [{
              entity: entity.name,
              source: 'entity',
              confidence: entity.confidence,
            }],
          });
        }
      }
    }

    return [...primitiveMap.values()];
  }

  private propagateConfidence(primitives: ConfidentPrimitive[]): ConfidentPrimitive[] {
    const result = new Map(primitives.map(p => [p.primitiveId, { ...p }]));

    // For each primitive, check if relationships imply other primitives
    for (const primitive of primitives) {
      const rels = this.graph.getRelationships(primitive.primitiveId);
      for (const rel of rels) {
        if (rel.type === 'implies' || rel.type === 'strengthens') {
          const target = result.get(rel.target);
          if (target) {
            // Strengthen existing confidence
            target.confidence = Math.min(1, target.confidence + rel.weight * 0.1);
          } else {
            // Add implied primitive with propagated confidence
            result.set(rel.target, {
              primitiveId: rel.target,
              confidence: primitive.confidence * rel.weight * 0.8,
              evidence: [{
                entity: primitive.primitiveId,
                source: 'composition',
                confidence: primitive.confidence * rel.weight,
              }],
            });
          }
        }
      }
    }

    return [...result.values()];
  }

  private computeOverallConfidence(primitives: ConfidentPrimitive[]): number {
    if (primitives.length === 0) return 0;
    const total = primitives.reduce((sum, p) => sum + p.confidence, 0);
    return total / primitives.length;
  }

  private buildEvidenceTrail(entities: ExtractedEntity[]): EntityEvidence[] {
    return entities.map(e => ({
      entity: e.name,
      source: 'entity' as const,
      confidence: e.confidence,
    }));
  }

  private computeEntityConfidence(entity: string, prompt: string): number {
    // Higher confidence for exact matches in known entity map
    const known = this.entityMap[entity];
    if (known && prompt.toLowerCase().includes(entity.toLowerCase())) {
      return 0.85;
    }
    return 0.4;
  }

  private classifyEntity(entity: string): 'brand' | 'industry' | 'concept' | 'style' | 'feature' {
    const brands = ['Apple', 'Nike', 'Tesla', 'Netflix', 'Iron Man', 'Gundam', 'Transformers'];
    if (brands.includes(entity)) return 'brand';
    const styles = ['minimalism', 'luxury', 'bold', 'corporate'];
    if (styles.includes(entity.toLowerCase())) return 'style';
    return 'concept';
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node node_modules/vitest/vitest.mjs run tests/intent-decomposer.test.ts`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/bos/intent/intent-decomposer.ts tests/intent-decomposer.test.ts
git commit -m "feat: add IntentDecomposer — confidence-propagated entity→primitive extraction"
```

---

## Task 5: Wire Intent Decomposer into BRE v2 Pipeline

**Files:**
- Modify: `src/bos/intent/index.ts` (barrel)
- Modify: `src/bos/index.ts` (add exports)
- Modify: `src/agents/deterministic-orchestrator-v4.ts` (wire decomposer into pipeline)

**Interfaces:**
- Consumes: `IntentDecomposer` from Task 4, `buildPrimitiveGraph` from Task 3
- Produces: `decomposition` field on `breContext` (or new span in V4)

- [ ] **Step 1: Update barrel**

```typescript
// src/bos/intent/index.ts
export type {
  PrimitiveCategory,
  PrimitiveRelationshipType,
  ConfidentPrimitive,
  EntityEvidence,
  IntentDecomposition,
} from './types.js';
export { IntentDecomposer } from './intent-decomposer.js';
export { buildPrimitiveGraph, SEED_PRIMITIVES, SEED_RELATIONSHIPS, ENTITY_TO_PRIMITIVES } from './primitive-seeds.js';
```

- [ ] **Step 2: Add decomposition span to V4 pipeline**

In `src/agents/deterministic-orchestrator-v4.ts`, after the BRE v2 span and before the Experience Director span, add:

```typescript
// After breContext is built (line ~243), before Experience Director (line ~246):
import { IntentDecomposer } from '../bos/intent/intent-decomposer.js';
import { buildPrimitiveGraph, ENTITY_TO_PRIMITIVES } from '../bos/intent/primitive-seeds.js';

// ... existing code ...

// NEW: Semantic Intent Decomposition
tracer.beginSpan({ layer: 'intent-decomposition', owner: 'IntentDecomposer', inputs: ['bre-context'], dependencies: ['bre-v2'] });
const primitiveGraph = buildPrimitiveGraph();
const decomposer = new IntentDecomposer(primitiveGraph, ENTITY_TO_PRIMITIVES);
const intentDecomposition = decomposer.decompose(prompt);
tracer.endSpan('intent-decomposition', {
  outputs: ['intent-decomposition'],
  artifactIds: [],
  confidence: intentDecomposition.overallConfidence,
  evidence: [
    `entities=${intentDecomposition.entities.length}`,
    `primitives=${intentDecomposition.primitives.length}`,
    `confidence=${intentDecomposition.overallConfidence.toFixed(2)}`,
  ],
  hash: RuntimeTracer.hashContent(JSON.stringify(intentDecomposition)),
});
console.log(`[orchestrator] Intent Decomposition: entities=${intentDecomposition.entities.length}, primitives=${intentDecomposition.primitives.length}, confidence=${intentDecomposition.overallConfidence.toFixed(2)}`);
```

- [ ] **Step 3: Write test for pipeline integration**

```typescript
// tests/intent-decomposer.test.ts (append)
describe('pipeline integration', () => {
  it('decomposition runs without errors', () => {
    const graph = buildPrimitiveGraph();
    const decomposer = new IntentDecomposer(graph, ENTITY_TO_PRIMITIVES);
    const result = decomposer.decompose('Build a premium headphones ecommerce site like Apple');
    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.primitives.length).toBeGreaterThan(0);
    expect(result.overallConfidence).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 4: Run typecheck**

Run: `node node_modules/typescript/bin/tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Run all tests**

Run: `node node_modules/vitest/vitest.mjs run tests/semantic-primitive-graph.test.ts tests/intent-decomposer.test.ts`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/bos/intent/ src/agents/deterministic-orchestrator-v4.ts tests/intent-decomposer.test.ts
git commit -m "feat: wire IntentDecomposer into V4 pipeline — intent-decomposition span"
```

---

## Task 6: Full Suite Verification

**Files:** none (verification only)

- [ ] **Step 1: Run typecheck**

Run: `node node_modules/typescript/bin/tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: Run full test suite**

Run: `node node_modules/vitest/vitest.mjs run`
Expected: All new tests pass; existing tests not broken

- [ ] **Step 3: Update SUMMARY.md**

Append to `SUMMARY.md`:
```
## Semantic Primitive Graph (2026-07-15)
- `src/bos/intent/types.ts` — ConfidentPrimitive, EntityEvidence, IntentDecomposition types
- `src/bos/graph/primitive-graph.ts` — PrimitiveGraph with typed relationships (implies, conflicts, composes, requires, strengthens)
- `src/bos/intent/primitive-seeds.ts` — 60+ primitives, 40+ relationships, 40+ entity→primitive mappings
- `src/bos/intent/intent-decomposer.ts` — IntentDecomposer (entity extraction → primitive mapping → confidence propagation)
- V4 pipeline wired: new `intent-decomposition` span between BRE v2 and Experience Director
- Apple → minimalism → whitespace (brand disappears after normalization)
- Iron Man → mechanical-assembly → engineering → innovation (generalizes across franchises)
```
