import type { PrimitiveCategory, PrimitiveRelationshipType } from '../intent/types.js';

export interface PrimitiveEntry {
  id: string;
  name: string;
  category: PrimitiveCategory;
  description: string;
  aliases?: string[];
  createdAt: number;
}

export interface PrimitiveRelationship {
  source: string;
  target: string;
  type: PrimitiveRelationshipType;
  weight: number;
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
