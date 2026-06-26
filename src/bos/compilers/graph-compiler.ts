import type { KnowledgeGraph } from '../graph/engine.js';
import type { BaseNode, Edge } from '../graph/types.js';
import type {
  CompiledNodeRecord,
  CompiledEdgeRecord,
  DictionaryPack,
  CompiledGraphData,
  CompiledIndexesData,
  CompiledOutput,
} from '../compiled/types.js';

export class GraphCompiler {
  private stringTable: Map<string, number> = new Map();
  private strings: string[] = [];
  private typeTable: Map<string, number> = new Map();
  private edgeTypeTable: Map<string, number> = new Map();

  compile(graph: KnowledgeGraph, version: string): CompiledOutput {
    this.stringTable.clear();
    this.strings = [];
    this.typeTable.clear();
    this.edgeTypeTable.clear();

    const nodes = graph.queryNodes({});
    const edges = graph.queryEdges({});

    const compiledNodes: CompiledNodeRecord[] = [];
    const nodeIdMap: Map<string, number> = new Map();

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node) continue;
      const compiledId = i;
      nodeIdMap.set(node.id, compiledId);

      const key = this.internString(node.id);

      const evidenceIds: number[] = [];
      const rawEvidence = (node.properties as Record<string, unknown>)?.evidenceRefs;
      if (Array.isArray(rawEvidence)) {
        for (const ref of rawEvidence) {
          if (ref && typeof ref === 'object' && 'id' in ref) {
            evidenceIds.push(this.internString((ref as { id: string }).id));
          }
        }
      }

      compiledNodes.push({
        id: compiledId,
        type: node.type,
        key: node.id,
        props: this.stripInternalProps(node.properties),
        evidenceIds,
        status: this.extractStatus(node.properties),
        version: this.extractVersion(node.properties),
      });
    }

    const compiledEdges: CompiledEdgeRecord[] = [];
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      if (!edge) continue;
      const sourceId = nodeIdMap.get(edge.source);
      const targetId = nodeIdMap.get(edge.target);
      if (sourceId === undefined || targetId === undefined) continue;

      compiledEdges.push({
        id: i,
        type: edge.type,
        source: sourceId,
        target: targetId,
        weight: edge.weight,
        props: this.stripInternalProps(edge.properties),
      });
    }

    const graphData: CompiledGraphData = {
      version,
      compiledAt: new Date().toISOString(),
      nodeCount: compiledNodes.length,
      edgeCount: compiledEdges.length,
      nodes: compiledNodes,
      edges: compiledEdges,
      dictionaries: {
        strings: this.strings,
        typeMap: Object.fromEntries(this.typeTable),
        edgeTypeMap: Object.fromEntries(this.edgeTypeTable),
      },
    };

    const indexes = this.computeIndexes(compiledNodes, compiledEdges, nodes, nodeIdMap);

    return { graph: graphData, indexes };
  }

  private computeIndexes(
    compiledNodes: CompiledNodeRecord[],
    compiledEdges: CompiledEdgeRecord[],
    originalNodes: BaseNode[],
    nodeIdMap: Map<string, number>,
  ): CompiledIndexesData {
    const byRole: Record<string, number[]> = {};
    const byEntity: Record<string, number[]> = {};
    const byPattern: Record<string, number[]> = {};
    const byCapability: Record<string, number[]> = {};
    const byJourney: Record<string, number[]> = {};
    const byIndustry: Record<string, number[]> = {};
    const byBusinessModel: Record<string, number[]> = {};
    const designTokens: Record<string, Record<string, unknown>> = {};

    for (let i = 0; i < compiledNodes.length; i++) {
      const node = compiledNodes[i];
      const original = originalNodes[i];
      if (!node || !original) continue;

      switch (node.type) {
        case 'Component': {
          const roles = this.extractArrayProp(original.properties, 'roles');
          for (const role of roles) {
            (byRole[role] ??= []).push(node.id);
          }
          break;
        }
        case 'Entity': {
          const name = this.extractStringProp(original.properties, 'name') ?? node.key;
          (byEntity[name] ??= []).push(node.id);
          break;
        }
        case 'Pattern': {
          const name = this.extractStringProp(original.properties, 'name') ?? node.key;
          (byPattern[name] ??= []).push(node.id);
          break;
        }
        case 'Capability': {
          const name = this.extractStringProp(original.properties, 'name') ?? node.key;
          (byCapability[name] ??= []).push(node.id);
          const category = this.extractStringProp(original.properties, 'category');
          if (category) {
            (byCapability[`cat:${category}`] ??= []).push(node.id);
          }
          break;
        }
        case 'Journey': {
          const name = this.extractStringProp(original.properties, 'name') ?? node.key;
          (byJourney[name] ??= []).push(node.id);
          break;
        }
        case 'Industry': {
          (byIndustry[node.key] ??= []).push(node.id);
          const primitives = this.extractArrayProp(original.properties, 'compositionPrimitives');
          for (const p of primitives) {
            (byIndustry[`prim:${p}`] ??= []).push(node.id);
          }
          break;
        }
        case 'BusinessModel': {
          const name = this.extractStringProp(original.properties, 'name') ?? node.key;
          (byBusinessModel[name] ??= []).push(node.id);
          break;
        }
        case 'DesignProfile': {
          designTokens[node.key] = this.extractDesignTokens(original.properties);
          break;
        }
      }
    }

    const adjacencyByType = this.computeEdgeAdjacency(compiledEdges);
    for (const [, edgeIds] of adjacencyByType) {
      for (const edgeId of edgeIds) {
        const edge = compiledEdges[edgeId];
        if (!edge) continue;
        const sourceNode = compiledNodes[edge.source];
        const targetNode = compiledNodes[edge.target];
        if (!sourceNode || !targetNode) continue;

        if (sourceNode.type === 'Industry' && targetNode.type === 'Component') {
          (byCapability[`industry:${sourceNode.key}`] ??= []).push(targetNode.id);
        }
        if (sourceNode.type === 'Industry' && targetNode.type === 'Pattern') {
          (byPattern[`industry:${sourceNode.key}`] ??= []).push(targetNode.id);
        }
      }
    }

    return {
      version: '',
      compiledAt: new Date().toISOString(),
      byRole,
      byEntity,
      byPattern,
      byCapability,
      byJourney,
      byIndustry,
      byBusinessModel,
      designTokens,
      bloomFilter: this.computeBloomFilter(compiledNodes),
    };
  }

  private computeEdgeAdjacency(edges: CompiledEdgeRecord[]): Map<string, number[]> {
    const adj = new Map<string, number[]>();
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      if (!edge) continue;
      if (!adj.has(edge.type)) {
        adj.set(edge.type, []);
      }
      adj.get(edge.type)!.push(i);
    }
    return adj;
  }

  private computeBloomFilter(nodes: CompiledNodeRecord[]): { size: number; hashes: number[] } {
    const size = Math.max(nodes.length * 2, 256);
    const hashes: number[] = new Array(size).fill(0);

    for (const node of nodes) {
      const h = this.simpleHash(node.key);
      hashes[h % size] = 1;
      hashes[(h * 31 + 7) % size] = 1;
      hashes[(h * 127 + 13) % size] = 1;
    }

    return { size, hashes };
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  private extractDesignTokens(props: Record<string, unknown>): Record<string, unknown> {
    const tokens: Record<string, unknown> = {};
    const skipKeys = ['id', 'type', 'createdAt', 'updatedAt', 'evidenceRefs', 'status', 'version'];

    for (const [key, value] of Object.entries(props)) {
      if (skipKeys.includes(key)) continue;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        tokens[key] = value;
      } else if (typeof value === 'string' || typeof value === 'number') {
        tokens[key] = value;
      }
    }

    return tokens;
  }

  private internString(str: string): number {
    let idx = this.stringTable.get(str);
    if (idx === undefined) {
      idx = this.strings.length;
      this.strings.push(str);
      this.stringTable.set(str, idx);
    }
    return idx;
  }

  private internType(type: string): number {
    let idx = this.typeTable.get(type);
    if (idx === undefined) {
      idx = this.typeTable.size;
      this.typeTable.set(type, idx);
    }
    return idx;
  }

  private stripInternalProps(props: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const skip = new Set(['id', 'type', 'createdAt', 'updatedAt']);
    for (const [key, value] of Object.entries(props)) {
      if (!skip.has(key)) {
        result[key] = value;
      }
    }
    return result;
  }

  private extractStatus(props: Record<string, unknown>): CompiledNodeRecord['status'] {
    const s = props['status'];
    if (s === 'active' || s === 'deprecated' || s === 'superseded' || s === 'experimental') return s;
    return 'active';
  }

  private extractVersion(props: Record<string, unknown>): string {
    const v = props['version'];
    return typeof v === 'string' ? v : '1.0.0';
  }

  private extractStringProp(props: Record<string, unknown>, key: string): string | undefined {
    const v = props[key];
    return typeof v === 'string' ? v : undefined;
  }

  private extractArrayProp(props: Record<string, unknown>, key: string): string[] {
    const v = props[key];
    if (Array.isArray(v)) {
      return v.filter((x): x is string => typeof x === 'string');
    }
    return [];
  }
}
