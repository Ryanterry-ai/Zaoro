import type { CompiledGraphData, CompiledIndexesData, CompiledNodeRecord, CompiledEdgeRecord } from '../compiled/types.js';

export interface QueryResult {
  nodes: CompiledNodeRecord[];
  edges: CompiledEdgeRecord[];
}

export class CompiledIndexQuery {
  private graph: CompiledGraphData;
  private indexes: CompiledIndexesData;
  private nodeById: Map<number, CompiledNodeRecord>;
  private bloomSize: number;
  private bloomHashes: number[];

  constructor(graph: CompiledGraphData, indexes: CompiledIndexesData) {
    this.graph = graph;
    this.indexes = indexes;
    this.nodeById = new Map(graph.nodes.map(n => [n.id, n]));
    this.bloomSize = indexes.bloomFilter?.size ?? 0;
    this.bloomHashes = indexes.bloomFilter?.hashes ?? [];
  }

  getByRole(role: string): CompiledNodeRecord[] {
    const ids = this.indexes.byRole[role] ?? [];
    return ids.map(id => this.nodeById.get(id)).filter((n): n is CompiledNodeRecord => n !== undefined);
  }

  getByEntity(entity: string): CompiledNodeRecord[] {
    const ids = this.indexes.byEntity[entity] ?? [];
    return ids.map(id => this.nodeById.get(id)).filter((n): n is CompiledNodeRecord => n !== undefined);
  }

  getByPattern(pattern: string): CompiledNodeRecord[] {
    const ids = this.indexes.byPattern[pattern] ?? [];
    return ids.map(id => this.nodeById.get(id)).filter((n): n is CompiledNodeRecord => n !== undefined);
  }

  getByCapability(capability: string): CompiledNodeRecord[] {
    const ids = this.indexes.byCapability[capability] ?? [];
    return ids.map(id => this.nodeById.get(id)).filter((n): n is CompiledNodeRecord => n !== undefined);
  }

  getByIndustry(industry: string): CompiledNodeRecord[] {
    const ids = this.indexes.byIndustry[industry] ?? [];
    return ids.map(id => this.nodeById.get(id)).filter((n): n is CompiledNodeRecord => n !== undefined);
  }

  getByJourney(journey: string): CompiledNodeRecord[] {
    const ids = this.indexes.byJourney[journey] ?? [];
    return ids.map(id => this.nodeById.get(id)).filter((n): n is CompiledNodeRecord => n !== undefined);
  }

  getByBusinessModel(model: string): CompiledNodeRecord[] {
    const ids = this.indexes.byBusinessModel[model] ?? [];
    return ids.map(id => this.nodeById.get(id)).filter((n): n is CompiledNodeRecord => n !== undefined);
  }

  getDesignTokens(profile: string): Record<string, unknown> | undefined {
    return this.indexes.designTokens[profile];
  }

  exists(key: string): boolean {
    if (this.bloomSize === 0) return this.nodeById.size > 0;
    const h = this.simpleHash(key);
    return this.bloomHashes[h % this.bloomSize] === 1;
  }

  getNode(id: number): CompiledNodeRecord | undefined {
    return this.nodeById.get(id);
  }

  getEdgesFrom(nodeId: number, edgeType?: string): CompiledEdgeRecord[] {
    return this.graph.edges.filter(e =>
      e.source === nodeId && (edgeType === undefined || e.type === edgeType),
    );
  }

  getEdgesTo(nodeId: number, edgeType?: string): CompiledEdgeRecord[] {
    return this.graph.edges.filter(e =>
      e.target === nodeId && (edgeType === undefined || e.type === edgeType),
    );
  }

  traverse(startId: number, edgeType: string, direction: 'outgoing' | 'incoming' | 'both' = 'outgoing', maxDepth: number = 3): CompiledNodeRecord[] {
    const visited = new Set<number>();
    const result: CompiledNodeRecord[] = [];
    const queue: Array<{ id: number; depth: number }> = [{ id: startId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      if (depth > 0) {
        const node = this.nodeById.get(id);
        if (node) result.push(node);
      }

      if (depth >= maxDepth) continue;

      let edgeIds: CompiledEdgeRecord[];
      if (direction === 'outgoing') {
        edgeIds = this.graph.edges.filter(e => e.source === id && (!edgeType || e.type === edgeType));
      } else if (direction === 'incoming') {
        edgeIds = this.graph.edges.filter(e => e.target === id && (!edgeType || e.type === edgeType));
      } else {
        edgeIds = this.graph.edges.filter(e =>
          (e.source === id || e.target === id) && (!edgeType || e.type === edgeType),
        );
      }

      for (const edge of edgeIds) {
        const nextId = edge.source === id ? edge.target : edge.source;
        if (!visited.has(nextId)) {
          queue.push({ id: nextId, depth: depth + 1 });
        }
      }
    }

    return result;
  }

  stats(): {
    nodeCount: number;
    edgeCount: number;
    indexSize: number;
    bloomFilterSize: number;
  } {
    return {
      nodeCount: this.graph.nodeCount,
      edgeCount: this.graph.edgeCount,
      indexSize:
        Object.keys(this.indexes.byRole).length +
        Object.keys(this.indexes.byEntity).length +
        Object.keys(this.indexes.byPattern).length +
        Object.keys(this.indexes.byCapability).length +
        Object.keys(this.indexes.byJourney).length +
        Object.keys(this.indexes.byIndustry).length +
        Object.keys(this.indexes.byBusinessModel).length,
      bloomFilterSize: this.bloomSize,
    };
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }
}
