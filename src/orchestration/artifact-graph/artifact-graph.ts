// ─── Artifact Graph (Phase 3) ──────────────────────────────────────
// A directed acyclic graph of artifact-producing stages. Validates
// acyclicity at construction time, provides topological sort for execution,
// and tracks artifact flow between nodes.

import type {
  ArtifactNode,
  ArtifactEdge,
  ExecutionPlan,
  NodeStatus,
  StageContract,
} from './types.js';

export class ArtifactGraph {
  private nodes = new Map<string, ArtifactNode>();
  private edges: ArtifactEdge[] = [];
  private adjacency = new Map<string, Set<string>>(); // from → {to}
  private inDegree = new Map<string, number>();

  /** Register a stage as a graph node. */
  addNode(contract: StageContract): ArtifactNode {
    if (this.nodes.has(contract.stageId)) {
      throw new Error(`Duplicate node: ${contract.stageId}`);
    }
    const node: ArtifactNode = {
      id: contract.stageId,
      contract,
      status: 'pending',
      artifacts: {},
    };
    this.nodes.set(contract.stageId, node);
    this.inDegree.set(contract.stageId, 0);
    this.adjacency.set(contract.stageId, new Set());
    return node;
  }

  /** Register a node from an existing ArtifactNode (e.g. restored from disk). */
  addNodeRaw(node: ArtifactNode): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`Duplicate node: ${node.id}`);
    }
    this.nodes.set(node.id, node);
    this.inDegree.set(node.id, 0);
    this.adjacency.set(node.id, new Set());
  }

  /** Add a dependency edge. Validates that both nodes exist. */
  addEdge(edge: ArtifactEdge): void {
    if (!this.nodes.has(edge.from)) throw new Error(`Unknown source node: ${edge.from}`);
    if (!this.nodes.has(edge.to)) throw new Error(`Unknown target node: ${edge.to}`);
    this.edges.push(edge);
    this.adjacency.get(edge.from)!.add(edge.to);
    this.inDegree.set(edge.to, (this.inDegree.get(edge.to) ?? 0) + 1);
  }

  /** Auto-discover edges from stage contracts (inputs → outputs of upstream nodes). */
  discoverEdges(): ArtifactEdge[] {
    const outputIndex = new Map<string, string[]>(); // artifactKey → [nodeId]
    for (const [, node] of this.nodes) {
      for (const key of node.contract.outputs) {
        const producers = outputIndex.get(key) ?? [];
        producers.push(node.id);
        outputIndex.set(key, producers);
      }
    }

    const discovered: ArtifactEdge[] = [];
    for (const [, node] of this.nodes) {
      for (const inputKey of node.contract.inputs) {
        const producers = outputIndex.get(inputKey) ?? [];
        for (const producerId of producers) {
          if (producerId === node.id) continue; // no self-loops
          const edge: ArtifactEdge = { from: producerId, to: node.id, artifactKey: inputKey };
          // avoid duplicates
          if (!this.edges.some(e => e.from === edge.from && e.to === edge.to && e.artifactKey === edge.artifactKey)) {
            this.edges.push(edge);
            this.adjacency.get(producerId)!.add(node.id);
            this.inDegree.set(node.id, (this.inDegree.get(node.id) ?? 0) + 1);
            discovered.push(edge);
          }
        }
      }
    }
    return discovered;
  }

  /** Validate that the graph is a DAG (no cycles). Returns true if valid. */
  validate(): { valid: boolean; error?: string } {
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      if (inStack.has(nodeId)) return false; // cycle
      if (visited.has(nodeId)) return true;
      visited.add(nodeId);
      inStack.add(nodeId);
      for (const neighbor of this.adjacency.get(nodeId) ?? []) {
        if (!dfs(neighbor)) return false;
      }
      inStack.delete(nodeId);
      return true;
    };

    for (const nodeId of this.nodes.keys()) {
      if (!dfs(nodeId)) {
        return { valid: false, error: `Cycle detected involving node: ${nodeId}` };
      }
    }
    return { valid: true };
  }

  /**
   * Topological sort returning execution levels.
   * Each level contains nodes that can run in parallel.
   */
  executionPlan(): ExecutionPlan {
    const inDeg = new Map(this.inDegree);
    const queue: string[] = [];
    for (const [id, deg] of inDeg) {
      if (deg === 0) queue.push(id);
    }

    const levels: string[][] = [];
    let processed = 0;

    while (queue.length > 0) {
      const level = [...queue];
      levels.push(level);
      queue.length = 0;
      for (const nodeId of level) {
        processed++;
        for (const neighbor of this.adjacency.get(nodeId) ?? []) {
          const newDeg = (inDeg.get(neighbor) ?? 1) - 1;
          inDeg.set(neighbor, newDeg);
          if (newDeg === 0) queue.push(neighbor);
        }
      }
    }

    if (processed !== this.nodes.size) {
      throw new Error(`Execution plan incomplete: processed ${processed}/${this.nodes.size} nodes (possible cycle)`);
    }

    return { levels, totalNodes: this.nodes.size };
  }

  /** Get a node by id. */
  getNode(id: string): ArtifactNode | undefined {
    return this.nodes.get(id);
  }

  /** Get all nodes. */
  allNodes(): ArtifactNode[] {
    return Array.from(this.nodes.values());
  }

  /** Get all edges. */
  allEdges(): ArtifactEdge[] {
    return [...this.edges];
  }

  /** Update a node's status and artifacts. */
  updateNode(id: string, update: { status?: NodeStatus; artifacts?: Record<string, unknown>; error?: string; durationMs?: number; llmCalls?: number }): void {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Unknown node: ${id}`);
    if (update.status) node.status = update.status;
    if (update.artifacts) Object.assign(node.artifacts, update.artifacts);
    if (update.error !== undefined) node.error = update.error;
    if (update.durationMs !== undefined) node.durationMs = update.durationMs;
    if (update.llmCalls !== undefined) node.llmCalls = update.llmCalls;
  }

  /** Collect all artifacts from completed nodes, keyed by artifact key. */
  collectArtifacts(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [, node] of this.nodes) {
      for (const [key, value] of Object.entries(node.artifacts)) {
        if (key in result) {
          console.warn(`[artifact-graph] Artifact key "${key}" produced by multiple nodes; last writer wins.`);
        }
        result[key] = value;
      }
    }
    return result;
  }

  /** Snapshot the graph state for persistence. */
  snapshot(): { nodes: ArtifactNode[]; edges: ArtifactEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()).map(n => ({ ...n, artifacts: { ...n.artifacts } })),
      edges: [...this.edges],
    };
  }

  /** Restore graph from a snapshot. */
  static fromSnapshot(snapshot: { nodes: ArtifactNode[]; edges: ArtifactEdge[] }): ArtifactGraph {
    const graph = new ArtifactGraph();
    for (const node of snapshot.nodes) {
      graph.addNodeRaw(node);
    }
    for (const edge of snapshot.edges) {
      // Re-add edge without re-validation (snapshot was validated before persistence)
      graph.edges.push(edge);
      graph.adjacency.get(edge.from)!.add(edge.to);
      graph.inDegree.set(edge.to, (graph.inDegree.get(edge.to) ?? 0) + 1);
    }
    return graph;
  }
}
