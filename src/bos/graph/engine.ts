// ─── Knowledge Graph Engine ───────────────────────────────────────
// Core graph storage and query engine for business knowledge.
// Supports pattern matching, traversal, and composition queries.
//
// This is the foundation that allows scaling from 6 to 500+ industries
// through composition rather than duplication.

import {
  NodeId, BaseNode, NodeType, Edge, EdgeType,
  NodeQuery, EdgeQuery, TraversalQuery, PatternQuery,
  IndustryNode, SubIndustryNode, CapabilityNode, FeatureNode,
  WorkflowNode, EntityNode, UISectionNode, ComponentNode,
  VocabularyNode,
} from './types.js';

// ─── Knowledge Graph ──────────────────────────────────────────────

export class KnowledgeGraph {
  private nodes = new Map<NodeId, BaseNode>();
  private edges = new Map<string, Edge>();
  private nodeIndex = new Map<NodeType, Set<NodeId>>();
  private edgeIndex = new Map<EdgeType, Set<string>>();
  private adjacencyOut = new Map<NodeId, Set<string>>();
  private adjacencyIn = new Map<NodeId, Set<string>>();

  constructor() {
    // Initialize indexes for each node type
    const nodeTypes: NodeType[] = [
      'Industry', 'SubIndustry', 'Capability', 'Feature', 'Workflow',
      'Entity', 'UISection', 'Component', 'Service', 'DataStore',
      'Integration', 'ComplianceRule', 'RevenueModel', 'Vocabulary',
      'DesignPattern', 'Primitive', 'Role', 'Kpi',
      'TechnologyStack', 'ProviderCapability', 'ArchitecturalPattern',
    ];
    for (const t of nodeTypes) {
      this.nodeIndex.set(t, new Set());
    }

    // Initialize indexes for each edge type
    const edgeTypes: EdgeType[] = [
      'contains', 'requires', 'implements', 'uses', 'triggers',
      'displays', 'composes', 'extends', 'depends_on', 'overrides', 'related_to',
      'recommended_for', 'performs_well_for', 'suited_for',
    ];
    for (const t of edgeTypes) {
      this.edgeIndex.set(t, new Set());
    }
  }

  // ─── Node Operations ──────────────────────────────────────────

  addNode<T extends BaseNode>(node: T): T {
    if (this.nodes.has(node.id)) {
      throw new Error(`Node ${node.id} already exists`);
    }

    this.nodes.set(node.id, node);
    this.nodeIndex.get(node.type)?.add(node.id);
    this.adjacencyOut.set(node.id, new Set());
    this.adjacencyIn.set(node.id, new Set());

    return node;
  }

  getNode(id: NodeId): BaseNode | undefined {
    return this.nodes.get(id);
  }

  getTypedNode<T extends BaseNode>(id: NodeId): T | undefined {
    return this.nodes.get(id) as T | undefined;
  }

  updateNode(id: NodeId, updates: Partial<BaseNode>): void {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node ${id} not found`);

    this.nodes.set(id, {
      ...node,
      ...updates,
      updatedAt: Date.now(),
    });
  }

  deleteNode(id: NodeId): void {
    const node = this.nodes.get(id);
    if (!node) return;

    // Remove all edges involving this node
    const outEdges = this.adjacencyOut.get(id) || new Set();
    const inEdges = this.adjacencyIn.get(id) || new Set();

    for (const edgeId of [...outEdges, ...inEdges]) {
      this.deleteEdge(edgeId);
    }

    this.nodes.delete(id);
    this.nodeIndex.get(node.type)?.delete(id);
    this.adjacencyOut.delete(id);
    this.adjacencyIn.delete(id);
  }

  // ─── Edge Operations ──────────────────────────────────────────

  addEdge(edge: Edge): Edge {
    if (this.edges.has(edge.id)) {
      throw new Error(`Edge ${edge.id} already exists`);
    }

    // Validate nodes exist
    if (!this.nodes.has(edge.source)) {
      throw new Error(`Source node ${edge.source} not found`);
    }
    if (!this.nodes.has(edge.target)) {
      throw new Error(`Target node ${edge.target} not found`);
    }

    this.edges.set(edge.id, edge);
    this.edgeIndex.get(edge.type)?.add(edge.id);
    this.adjacencyOut.get(edge.source)?.add(edge.id);
    this.adjacencyIn.get(edge.target)?.add(edge.id);

    return edge;
  }

  getEdge(id: string): Edge | undefined {
    return this.edges.get(id);
  }

  deleteEdge(id: string): void {
    const edge = this.edges.get(id);
    if (!edge) return;

    this.edges.delete(id);
    this.edgeIndex.get(edge.type)?.delete(id);
    this.adjacencyOut.get(edge.source)?.delete(id);
    this.adjacencyIn.get(edge.target)?.delete(id);
  }

  // ─── Query Operations ─────────────────────────────────────────

  queryNodes(query: NodeQuery): BaseNode[] {
    let candidates: NodeId[] = [];

    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      for (const t of types) {
        const ids = this.nodeIndex.get(t);
        if (ids) candidates.push(...ids);
      }
    } else {
      // All nodes
      candidates = Array.from(this.nodes.keys());
    }

    // Apply property filters
    if (query.properties) {
      candidates = candidates.filter(id => {
        const node = this.nodes.get(id);
        if (!node) return false;
        return this.matchesProperties(node.properties, query.properties!);
      });
    }

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || candidates.length;

    return candidates
      .slice(offset, offset + limit)
      .map(id => this.nodes.get(id)!)
      .filter(Boolean);
  }

  queryEdges(query: EdgeQuery): Edge[] {
    let candidates: string[] = [];

    if (query.source) {
      const outEdges = this.adjacencyOut.get(query.source) || new Set();
      candidates = Array.from(outEdges);
    } else if (query.target) {
      const inEdges = this.adjacencyIn.get(query.target) || new Set();
      candidates = Array.from(inEdges);
    } else if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      for (const t of types) {
        const ids = this.edgeIndex.get(t);
        if (ids) candidates.push(...ids);
      }
    } else {
      candidates = Array.from(this.edges.keys());
    }

    // Apply filters
    candidates = candidates.filter(id => {
      const edge = this.edges.get(id);
      if (!edge) return false;
      if (query.type) {
        const types = Array.isArray(query.type) ? query.type : [query.type];
        if (!types.includes(edge.type)) return false;
      }
      if (query.minWeight !== undefined && edge.weight < query.minWeight) return false;
      if (query.source && edge.source !== query.source) return false;
      if (query.target && edge.target !== query.target) return false;
      return true;
    });

    // Apply limit
    const limit = query.limit || candidates.length;
    return candidates
      .slice(0, limit)
      .map(id => this.edges.get(id)!)
      .filter(Boolean);
  }

  // ─── Traversal Operations ─────────────────────────────────────

  traverse(query: TraversalQuery): BaseNode[] {
    const visited = new Set<NodeId>();
    const result: BaseNode[] = [];
    const queue: Array<{ nodeId: NodeId; depth: number }> = [
      { nodeId: query.startNode, depth: 0 },
    ];

    while (queue.length > 0 && result.length < (query.limit || Infinity)) {
      const { nodeId, depth } = queue.shift()!;
      
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = this.nodes.get(nodeId);
      if (!node) continue;

      if (depth > 0) {
        // Apply node filter only to result candidates (not the start node)
        if (query.nodeFilter && !query.nodeFilter.includes(node.type)) {
          continue;
        }
        result.push(node);
      }

      if (depth >= query.maxDepth) continue;

      // Get connected edges
      let edgeIds: Set<string>;
      if (query.direction === 'outgoing') {
        edgeIds = this.adjacencyOut.get(nodeId) || new Set();
      } else if (query.direction === 'incoming') {
        edgeIds = this.adjacencyIn.get(nodeId) || new Set();
      } else {
        // Both directions
        const out = this.adjacencyOut.get(nodeId) || new Set();
        const in_ = this.adjacencyIn.get(nodeId) || new Set();
        edgeIds = new Set([...out, ...in_]);
      }

      // Filter by edge types and add targets
      for (const edgeId of edgeIds) {
        const edge = this.edges.get(edgeId);
        if (!edge) continue;
        if (!query.edgeTypes.includes(edge.type)) continue;

        const nextNode = edge.source === nodeId ? edge.target : edge.source;
        if (!visited.has(nextNode)) {
          queue.push({ nodeId: nextNode, depth: depth + 1 });
        }
      }
    }

    return result;
  }

  // ─── Pattern Matching ─────────────────────────────────────────

  findPattern(pattern: PatternQuery): Array<Record<string, BaseNode>> {
    // Simple pattern matching for small graphs
    // For complex patterns, consider using a dedicated graph database
    const results: Array<Record<string, BaseNode>> = [];

    // Get candidates for first node variable
    const firstNodePattern = pattern.nodes[0];
    if (!firstNodePattern) return results;

    const candidates = this.queryNodes({ type: firstNodePattern.type, limit: 1000 });

    for (const candidate of candidates) {
      const bindings = this.matchPattern(pattern, 0, candidate, new Map());
      if (bindings) {
        // Convert Map to Record for return type
        const record: Record<string, BaseNode> = {};
        bindings.forEach((value, key) => { record[key] = value; });
        results.push(record);
      }
      if (results.length >= (pattern.limit || 100)) break;
    }

    return results;
  }

  private matchPattern(
    pattern: PatternQuery,
    nodeIndex: number,
    currentNode: BaseNode,
    bindings: Map<string, BaseNode>
  ): Map<string, BaseNode> | null {
    const nodePattern = pattern.nodes[nodeIndex];
    if (!nodePattern) return bindings;

    // Check type match
    if (currentNode.type !== nodePattern.type) return null;

    // Check if already bound to same node
    const existing = bindings.get(nodePattern.variable);
    if (existing && existing.id !== currentNode.id) return null;

    // Create new bindings
    const newBindings = new Map(bindings);
    newBindings.set(nodePattern.variable, currentNode);

    // Check edges from this node
    const relevantEdges = pattern.edges.filter(
      e => e.from === nodePattern.variable || e.to === nodePattern.variable
    );

    for (const edgePattern of relevantEdges) {
      const fromVar = edgePattern.from;
      const toVar = edgePattern.to;
      const fromNode = newBindings.get(fromVar);
      const toNode = newBindings.get(toVar);

      if (fromNode && toNode) {
        // Both bound, verify edge exists
        const edgeExists = this.findEdge(fromNode.id, toNode.id, edgePattern.type);
        if (!edgeExists) return null;
      } else if (fromNode && !toNode) {
        // From bound, find matching to nodes
        const direction = edgePattern.direction || 'outgoing';
        const connectedIds = this.getConnected(fromNode.id, edgePattern.type, direction);
        
        for (const connectedId of connectedIds) {
          const connectedNode = this.nodes.get(connectedId);
          if (!connectedNode) continue;

          const nextIndex = pattern.nodes.findIndex(n => n.variable === toVar);
          if (nextIndex === -1) continue;

          const result = this.matchPattern(pattern, nextIndex, connectedNode, newBindings);
          if (result) return result;
        }
        return null;
      }
    }

    // Continue to next node pattern
    return this.matchPattern(pattern, nodeIndex + 1, currentNode, newBindings);
  }

  // ─── Composition Helpers ──────────────────────────────────────

  /**
   * Get all capabilities for an industry via composition
   * This is how we scale to 500+ industries without duplicating data
   */
  getIndustryCapabilities(industryId: NodeId): CapabilityNode[] {
    const capabilities = new Set<NodeId>();

    // Direct capabilities
    const directEdges = this.queryEdges({ source: industryId, type: 'contains' });
    for (const edge of directEdges) {
      const node = this.getNode(edge.target);
      if (node?.type === 'Capability') capabilities.add(node.id);
    }

    // Capabilities from primitives
    const primitives = this.traverse({
      startNode: industryId,
      edgeTypes: ['composes'],
      direction: 'outgoing',
      maxDepth: 2,
      nodeFilter: ['Primitive', 'Capability'],
    });

    for (const node of primitives) {
      if (node.type === 'Capability') capabilities.add(node.id);
    }

    return Array.from(capabilities)
      .map(id => this.getTypedNode<CapabilityNode>(id))
      .filter((n): n is CapabilityNode => n !== undefined);
  }

  /**
   * Get vocabulary overrides for an industry
   */
  getVocabularyOverrides(industryId: NodeId): VocabularyNode[] {
    const vocabularies = this.traverse({
      startNode: industryId,
      edgeTypes: ['overrides'],
      direction: 'incoming',
      maxDepth: 2,
      nodeFilter: ['Vocabulary'],
    });

    return vocabularies
      .map(n => this.getTypedNode<VocabularyNode>(n.id))
      .filter((n): n is VocabularyNode => n !== undefined);
  }

  /**
   * Compose a new industry from primitives and existing industries
   */
  composeIndustry(
    id: NodeId,
    name: string,
    primitives: NodeId[],
    extendsIndustry?: NodeId
  ): IndustryNode {
    const node: IndustryNode = {
      id,
      type: 'Industry',
      properties: {
        name,
        slug: id,
        description: `Composed industry: ${name}`,
        maturity: 'emerging',
        tags: [],
        compositionPrimitives: primitives,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.addNode(node);

    // Add composition edges
    for (let i = 0; i < primitives.length; i++) {
      const primId = primitives[i];
      if (primId) {
        this.addEdge({
          id: `compose-${id}-${i}`,
          source: id,
          target: primId,
          type: 'composes',
          weight: 1.0,
          properties: {},
          createdAt: Date.now(),
        });
      }
    }

    // Add extension edge if applicable
    if (extendsIndustry) {
      this.addEdge({
        id: `extends-${id}-${extendsIndustry}`,
        source: id,
        target: extendsIndustry,
        type: 'extends',
        weight: 1.0,
        properties: {},
        createdAt: Date.now(),
      });
    }

    return node;
  }

  // ─── Utility Methods ──────────────────────────────────────────

  private findEdge(source: NodeId, target: NodeId, type: EdgeType): Edge | undefined {
    const outEdges = this.adjacencyOut.get(source) || new Set();
    for (const edgeId of outEdges) {
      const edge = this.edges.get(edgeId);
      if (edge && edge.target === target && edge.type === type) {
        return edge;
      }
    }
    return undefined;
  }

  private getConnected(nodeId: NodeId, edgeType: EdgeType, direction: 'outgoing' | 'incoming'): NodeId[] {
    const result: NodeId[] = [];
    const edgeIds = direction === 'outgoing'
      ? (this.adjacencyOut.get(nodeId) || new Set())
      : (this.adjacencyIn.get(nodeId) || new Set());

    for (const edgeId of edgeIds) {
      const edge = this.edges.get(edgeId);
      if (edge && edge.type === edgeType) {
        result.push(direction === 'outgoing' ? edge.target : edge.source);
      }
    }

    return result;
  }

  private matchesProperties(
    nodeProps: Record<string, unknown>,
    queryProps: Record<string, unknown>
  ): boolean {
    for (const [key, value] of Object.entries(queryProps)) {
      if (nodeProps[key] !== value) return false;
    }
    return true;
  }

  // ─── Decision Graph Queries ───────────────────────────────────

  /**
   * Get technology stack recommendations for an industry.
   */
  getRecommendationsForIndustry(industryId: string): BaseNode[] {
    const results: BaseNode[] = [];
    const outgoing = this.adjacencyOut.get(industryId);
    if (!outgoing) return results;

    for (const edgeId of outgoing) {
      const edge = this.edges.get(edgeId);
      if (edge && edge.type === 'recommended_for') {
        const node = this.nodes.get(edge.source);
        if (node && node.type === 'TechnologyStack') results.push(node);
      }
    }

    const incoming = this.adjacencyIn.get(industryId);
    if (incoming) {
      for (const edgeId of incoming) {
        const edge = this.edges.get(edgeId);
        if (edge && edge.type === 'recommended_for') {
          const node = this.nodes.get(edge.source);
          if (node && node.type === 'TechnologyStack') results.push(node);
        }
      }
    }

    return results;
  }

  /**
   * Get provider capabilities for a task type.
   */
  getProvidersForTaskType(taskType: string): BaseNode[] {
    const results: BaseNode[] = [];
    const providerIds = this.nodeIndex.get('ProviderCapability');
    if (!providerIds) return results;

    for (const id of providerIds) {
      const node = this.nodes.get(id);
      if (node && node.type === 'ProviderCapability') {
        const props = node.properties as { taskTypes?: string[] };
        if (props.taskTypes?.includes(taskType)) {
          results.push(node);
        }
      }
    }

    return results;
  }

  /**
   * Get architectural patterns suited for an industry.
   */
  getPatternsForIndustry(industryId: string): BaseNode[] {
    const results: BaseNode[] = [];
    const incoming = this.adjacencyIn.get(industryId);
    if (!incoming) return results;

    for (const edgeId of incoming) {
      const edge = this.edges.get(edgeId);
      if (edge && edge.type === 'suited_for') {
        const node = this.nodes.get(edge.source);
        if (node && node.type === 'ArchitecturalPattern') results.push(node);
      }
    }

    return results;
  }

  // ─── Serialization ────────────────────────────────────────────

  toJSON(): { nodes: BaseNode[]; edges: Edge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
    };
  }

  static fromJSON(data: { nodes: BaseNode[]; edges: Edge[] }): KnowledgeGraph {
    const graph = new KnowledgeGraph();
    for (const node of data.nodes) {
      graph.addNode(node);
    }
    for (const edge of data.edges) {
      graph.addEdge(edge);
    }
    return graph;
  }

  // ─── Stats ────────────────────────────────────────────────────

  stats(): { nodes: number; edges: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    for (const [type, ids] of this.nodeIndex) {
      byType[type] = ids.size;
    }
    return {
      nodes: this.nodes.size,
      edges: this.edges.size,
      byType,
    };
  }
}