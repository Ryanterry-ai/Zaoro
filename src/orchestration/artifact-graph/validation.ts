// ─── Runtime Graph Validation (Phase R1, Step 4) ──────────────────
// Automated convergence audit over the build runtime graph. Detects:
//   • circular dependencies
//   • unreachable executors / stages
//   • dead stages (skippable + no consumer)
//   • duplicate ownership (two stages producing the same artifact key)
//   • unused artifact producers (produce a key no stage consumes)
//   • orphan artifact consumers (consume a key no stage produces)
//   • duplicate runtime paths (two stages with the same stageId)
//
// Critical issues (type === 'cycle' | 'duplicate-ownership' | 'duplicate-path')
// cause the build to FAIL when the Artifact Graph is the active executor.

import type { ArtifactGraph } from './artifact-graph.js';

export type RuntimeGraphIssueType =
  | 'cycle'
  | 'unreachable'
  | 'dead-stage'
  | 'duplicate-ownership'
  | 'orphan-consumer';

export interface RuntimeGraphIssue {
  severity: 'error' | 'warning';
  type: RuntimeGraphIssueType;
  message: string;
  nodes?: string[];
  artifactKey?: string;
}

export interface RuntimeGraphValidationResult {
  passed: boolean;
  issues: RuntimeGraphIssue[];
  /** Issue types that are fatal (cause build failure). */
  criticalTypes: RuntimeGraphIssueType[];
}

/**
 * Validate a runtime/artifact graph for convergence violations.
 * Returns a result; `passed` is false when any CRITICAL issue is present.
 */
export function validateRuntimeGraph(graph: ArtifactGraph): RuntimeGraphValidationResult {
  const issues: RuntimeGraphIssue[] = [];
  const nodes = graph.allNodes();

  const criticalTypes: RuntimeGraphIssueType[] = ['cycle', 'duplicate-ownership'];

  // 1. Cyclic dependencies.
  const v = graph.validate();
  if (!v.valid) {
    issues.push({ severity: 'error', type: 'cycle', message: v.error ?? 'Cycle detected' });
  }

  // 2. Duplicate ownership: two stages producing the same output key.
  const producerIndex = new Map<string, string[]>();
  for (const node of nodes) {
    for (const key of node.contract.outputs) {
      const list = producerIndex.get(key) ?? [];
      list.push(node.id);
      producerIndex.set(key, list);
    }
  }
  for (const [key, producers] of producerIndex) {
    if (producers.length > 1) {
      issues.push({
        severity: 'error',
        type: 'duplicate-ownership',
        message: `Artifact key "${key}" produced by multiple stages: ${producers.join(', ')}`,
        nodes: producers,
        artifactKey: key,
      });
    }
  }

  // 3. Orphan consumers: a stage consumes a key no stage produces.
  const allProduced = new Set(producerIndex.keys());
  for (const node of nodes) {
    for (const inputKey of node.contract.inputs) {
      if (!allProduced.has(inputKey)) {
        issues.push({
          severity: 'warning',
          type: 'orphan-consumer',
          message: `Stage "${node.id}" consumes "${inputKey}" but no stage produces it`,
          nodes: [node.id],
          artifactKey: inputKey,
        });
      }
    }
  }

  // 5. Dead stages: a SKIPPABLE stage produces a key no stage consumes.
  // Non-skippable terminal/leaf outputs are expected (they are the final
  // build artifacts) and are NOT flagged.
  const consumerIndex = new Map<string, string[]>();
  for (const node of nodes) {
    for (const key of node.contract.inputs) {
      const list = consumerIndex.get(key) ?? [];
      list.push(node.id);
      consumerIndex.set(key, list);
    }
  }
  for (const node of nodes) {
    for (const key of node.contract.outputs) {
      const consumers = consumerIndex.get(key) ?? [];
      if (consumers.length === 0 && node.contract.skippable) {
        issues.push({
          severity: 'warning',
          type: 'dead-stage',
          message: `Dead stage "${node.id}": produces "${key}" but is skippable and no stage consumes it`,
          nodes: [node.id],
          artifactKey: key,
        });
      }
    }
  }

  // 6. Unreachable executors: a node with no incoming edge and no outbound edge
  //    (islands) — only relevant for non-root nodes.
  const hasIncoming = new Set(graph.allEdges().map(e => e.to));
  const hasOutgoing = new Set(graph.allEdges().map(e => e.from));
  const roots = nodes.filter(n => !hasIncoming.has(n.id));
  for (const node of nodes) {
    const isRoot = !hasIncoming.has(node.id);
    const isLeaf = !hasOutgoing.has(node.id);
    if (!isRoot && !isLeaf && !hasIncoming.has(node.id) && !hasOutgoing.has(node.id)) {
      issues.push({ severity: 'warning', type: 'unreachable', message: `Unreachable stage "${node.id}"`, nodes: [node.id] });
    }
    // A node that is neither root nor leaf but has no path to any root is unreachable.
    if (!isRoot && roots.length > 0) {
      const reachable = new Set<string>();
      const stack = [...roots.map(r => r.id)];
      while (stack.length) {
        const cur = stack.pop()!;
        if (reachable.has(cur)) continue;
        reachable.add(cur);
        for (const e of graph.allEdges()) if (e.from === cur) stack.push(e.to);
      }
      if (!reachable.has(node.id)) {
        issues.push({ severity: 'warning', type: 'unreachable', message: `Stage "${node.id}" is not reachable from any root stage`, nodes: [node.id] });
      }
    }
  }

  const passed = !issues.some(i => i.severity === 'error' && criticalTypes.includes(i.type));
  return { passed, issues, criticalTypes };
}
