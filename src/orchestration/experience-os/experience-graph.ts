// ─── Experience Graph ───────────────────────────────────────────────────────
//
// Adaptive, non-linear experience flow.
// Instead of a strictly linear timeline, the Experience Graph allows:
//   - Branching paths based on user behavior
//   - Conditional scenes
//   - Loops and revisits
//   - Multiple entry/exit points
//   - Priority-based path selection
//
// The graph is traversed by the renderer to determine which scenes
// to render and in what order.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ExperienceGraph,
  GraphNode,
  GraphEdge,
  BranchCondition,
  GraphMetadata,
  NodeCondition,
  ExperienceStrategy,
  SceneDefinition,
  SelectedScene,
} from './types.js';

// ─── Graph Builder ──────────────────────────────────────────────────────────

export interface GraphBuilderInput {
  strategy: ExperienceStrategy;
  scenes: SceneDefinition[];
  params: Record<string, Record<string, unknown>>;
}

/**
 * Builds an ExperienceGraph from strategy and scenes.
 * The graph is adaptive — it can branch based on conditions.
 */
export class ExperienceGraphBuilder {
  /**
   * Build a linear graph (default for most experiences).
   */
  buildLinear(input: GraphBuilderInput): ExperienceGraph {
    const { strategy, scenes, params } = input;
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const entryPoints: string[] = [];
    const exitPoints: string[] = [];
    let order = 0;

    for (const scene of scenes) {
      const nodeId = `node-${order}`;
      const node: GraphNode = {
        id: nodeId,
        sceneId: scene.id,
        params: params[scene.id] ?? {},
        type: order === 0 ? 'entry' : order === scenes.length - 1 ? 'exit' : 'standard',
        priority: order === 0 ? 10 : order === scenes.length - 1 ? 9 : 5,
        skippable: scene.composability.maxOccurrences > 1,
        estimatedDurationMs: this.estimateDuration(scene),
      };
      nodes.push(node);

      if (order === 0) entryPoints.push(nodeId);
      if (order === scenes.length - 1) exitPoints.push(nodeId);

      // Add edge from previous node
      if (order > 0) {
        edges.push({
          from: `node-${order - 1}`,
          to: nodeId,
          type: 'scroll',
          transition: scene.defaults.animation,
          durationMs: 300,
          weight: 1,
        });
      }

      order++;
    }

    return {
      id: `graph-${Date.now()}`,
      nodes,
      edges,
      entryPoints,
      exitPoints,
      branches: [],
      metadata: this.buildMetadata(nodes, edges),
    };
  }

  /**
   * Build a branching graph with conditional paths.
   * Used for experiences that adapt to user behavior.
   */
  buildAdaptive(input: GraphBuilderInput): ExperienceGraph {
    const linear = this.buildLinear(input);

    // Add branching for key decision points
    const branches: BranchCondition[] = [];
    const nodes = [...linear.nodes];
    const edges = [...linear.edges];

    // Find CTA/decision nodes and add branches
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const scene = input.scenes.find(s => s.id === node.sceneId);

      if (scene?.narrativeRole === 'cta' || scene?.narrativeRole === 'offer') {
        // Add a skip branch: if user has seen enough proof, skip to CTA
        const branchId = `branch-${node.id}`;
        const skipTarget = nodes.findIndex(n => {
          const s = input.scenes.find(sc => sc.id === n.sceneId);
          return s?.narrativeRole === 'cta';
        });

        if (skipTarget > i + 1) {
          branches.push({
            id: branchId,
            expression: 'scrollDepth > 0.7 && timeOnPage > 10000',
            trueTarget: nodes[skipTarget].id,
            falseTarget: node.id,
            description: 'Skip to CTA if user has seen enough',
          });
        }
      }
    }

    return {
      ...linear,
      nodes,
      edges,
      branches,
      metadata: this.buildMetadata(nodes, edges),
    };
  }

  /**
   * Build a graph with loop support (for experiences that cycle through content).
   */
  buildLooping(input: GraphBuilderInput): ExperienceGraph {
    const linear = this.buildLinear(input);
    const nodes = [...linear.nodes];
    const edges = [...linear.edges];

    // Add a loop edge from end back to a content section
    const contentNodes = nodes.filter((n, i) => i > 0 && i < nodes.length - 1);
    if (contentNodes.length > 0) {
      const loopTarget = contentNodes[0];
      const lastNode = nodes[nodes.length - 1];

      edges.push({
        from: lastNode.id,
        to: loopTarget.id,
        type: 'conditional',
        transition: 'fade',
        durationMs: 500,
        condition: 'userClickedExplore',
        weight: 0.5,
      });
    }

    return {
      ...linear,
      nodes,
      edges,
      metadata: this.buildMetadata(nodes, edges),
      hasCycles: true,
    } as ExperienceGraph;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private estimateDuration(scene: SceneDefinition): number {
    const tierDurations: Record<string, number> = {
      light: 500,
      standard: 1000,
      heavy: 2000,
      cinematic: 3000,
    };
    return tierDurations[scene.performanceTier] ?? 1000;
  }

  private buildMetadata(nodes: GraphNode[], edges: GraphEdge[]): GraphMetadata {
    const totalDurationMs = nodes.reduce((sum, n) => sum + n.estimatedDurationMs, 0);
    const maxDepth = this.calculateMaxDepth(nodes, edges);
    const criticalPath = this.findCriticalPath(nodes, edges);

    return {
      totalDurationMs,
      nodeCount: nodes.length,
      maxDepth,
      hasCycles: false,
      criticalPath,
    };
  }

  private calculateMaxDepth(nodes: GraphNode[], edges: GraphEdge[]): number {
    // Simple depth calculation: longest path from entry to exit
    const adjacency = new Map<string, string[]>();
    for (const edge of edges) {
      const existing = adjacency.get(edge.from) ?? [];
      existing.push(edge.to);
      adjacency.set(edge.from, existing);
    }

    const entry = nodes.find(n => n.type === 'entry');
    if (!entry) return nodes.length;

    let maxDepth = 0;
    const visited = new Set<string>();

    const dfs = (nodeId: string, depth: number) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      maxDepth = Math.max(maxDepth, depth);
      const neighbors = adjacency.get(nodeId) ?? [];
      for (const neighbor of neighbors) {
        dfs(neighbor, depth + 1);
      }
      visited.delete(nodeId);
    };

    dfs(entry.id, 1);
    return maxDepth;
  }

  private findCriticalPath(nodes: GraphNode[], edges: GraphEdge[]): string[] {
    // Simplified: return the longest weighted path
    const entry = nodes.find(n => n.type === 'entry');
    if (!entry) return nodes.map(n => n.id);

    const adjacency = new Map<string, { to: string; weight: number }[]>();
    for (const edge of edges) {
      const existing = adjacency.get(edge.from) ?? [];
      existing.push({ to: edge.to, weight: edge.weight });
      adjacency.set(edge.from, existing);
    }

    let bestPath: string[] = [];
    let bestWeight = 0;

    const dfs = (nodeId: string, path: string[], weight: number) => {
      const neighbors = adjacency.get(nodeId) ?? [];
      if (neighbors.length === 0) {
        if (weight > bestWeight) {
          bestWeight = weight;
          bestPath = [...path];
        }
        return;
      }
      for (const { to, weight: w } of neighbors) {
        if (!path.includes(to)) {
          dfs(to, [...path, to], weight + w);
        }
      }
    };

    dfs(entry.id, [entry.id], 0);
    return bestPath;
  }
}

// ─── Graph Traversal ────────────────────────────────────────────────────────

/**
 * Traverse an ExperienceGraph to get the linear order for rendering.
 * Handles branching and conditional edges.
 */
export function traverseGraph(
  graph: ExperienceGraph,
  conditions?: Record<string, boolean>
): GraphNode[] {
  const visited = new Set<string>();
  const result: GraphNode[] = [];

  const adjacency = new Map<string, GraphEdge[]>();
  for (const edge of graph.edges) {
    const existing = adjacency.get(edge.from) ?? [];
    existing.push(edge);
    adjacency.set(edge.from, existing);
  }

  // BFS from entry points
  const queue = [...graph.entryPoints];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = graph.nodes.find(n => n.id === nodeId);
    if (node) {
      result.push(node);
    }

    const outEdges = adjacency.get(nodeId) ?? [];
    for (const edge of outEdges) {
      // Check conditions for conditional edges
      if (edge.type === 'conditional' && edge.condition) {
        if (conditions && !conditions[edge.condition]) {
          continue; // Skip this edge
        }
      }
      queue.push(edge.to);
    }
  }

  return result;
}

// ─── Factory ────────────────────────────────────────────────────────────────

export function createExperienceGraphBuilder(): ExperienceGraphBuilder {
  return new ExperienceGraphBuilder();
}
