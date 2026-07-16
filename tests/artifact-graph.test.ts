import { describe, it, expect } from 'vitest';
import { ArtifactGraph } from '../src/orchestration/artifact-graph/artifact-graph.js';
import { ArtifactExecutor, isArtifactGraphEnabled } from '../src/orchestration/artifact-graph/executor.js';
import { legacyStageContracts } from '../src/orchestration/artifact-graph/legacy-adapters.js';
import type { StageContract, NodeExecutionResult } from '../src/orchestration/artifact-graph/types.js';

describe('ArtifactGraph', () => {
  it('registers nodes and counts them', () => {
    const graph = new ArtifactGraph();
    graph.addNode({ stageId: 'a', name: 'A', inputs: [], outputs: ['x'] });
    graph.addNode({ stageId: 'b', name: 'B', inputs: ['x'], outputs: ['y'] });
    expect(graph.allNodes().length).toBe(2);
  });

  it('rejects duplicate node ids', () => {
    const graph = new ArtifactGraph();
    graph.addNode({ stageId: 'a', name: 'A', inputs: [], outputs: [] });
    expect(() => graph.addNode({ stageId: 'a', name: 'A2', inputs: [], outputs: [] })).toThrow('Duplicate node');
  });

  it('validates a simple DAG', () => {
    const graph = new ArtifactGraph();
    graph.addNode({ stageId: 'a', name: 'A', inputs: [], outputs: ['x'] });
    graph.addNode({ stageId: 'b', name: 'B', inputs: ['x'], outputs: ['y'] });
    graph.addEdge({ from: 'a', to: 'b', artifactKey: 'x' });
    expect(graph.validate().valid).toBe(true);
  });

  it('detects cycles', () => {
    const graph = new ArtifactGraph();
    graph.addNode({ stageId: 'a', name: 'A', inputs: ['y'], outputs: ['x'] });
    graph.addNode({ stageId: 'b', name: 'B', inputs: ['x'], outputs: ['y'] });
    graph.addEdge({ from: 'a', to: 'b', artifactKey: 'x' });
    graph.addEdge({ from: 'b', to: 'a', artifactKey: 'y' });
    expect(graph.validate().valid).toBe(false);
  });

  it('produces correct execution plan (topological sort)', () => {
    const graph = new ArtifactGraph();
    graph.addNode({ stageId: 'a', name: 'A', inputs: [], outputs: ['x'] });
    graph.addNode({ stageId: 'b', name: 'B', inputs: [], outputs: ['y'] });
    graph.addNode({ stageId: 'c', name: 'C', inputs: ['x', 'y'], outputs: ['z'] });
    graph.addEdge({ from: 'a', to: 'c', artifactKey: 'x' });
    graph.addEdge({ from: 'b', to: 'c', artifactKey: 'y' });

    const plan = graph.executionPlan();
    expect(plan.totalNodes).toBe(3);
    expect(plan.levels.length).toBe(2); // level 0: [a,b], level 1: [c]
    expect(plan.levels[0]).toContain('a');
    expect(plan.levels[0]).toContain('b');
    expect(plan.levels[1]).toContain('c');
  });

  it('auto-discovers edges from input/output contracts', () => {
    const graph = new ArtifactGraph();
    graph.addNode({ stageId: 'producer', name: 'P', inputs: [], outputs: ['data'] });
    graph.addNode({ stageId: 'consumer', name: 'C', inputs: ['data'], outputs: [] });
    const discovered = graph.discoverEdges();
    expect(discovered.length).toBe(1);
    expect(discovered[0]).toEqual({ from: 'producer', to: 'consumer', artifactKey: 'data' });
  });

  it('collects artifacts from completed nodes', () => {
    const graph = new ArtifactGraph();
    graph.addNode({ stageId: 'a', name: 'A', inputs: [], outputs: ['x'] });
    graph.updateNode('a', { status: 'completed', artifacts: { x: 42 } });
    const all = graph.collectArtifacts();
    expect(all.x).toBe(42);
  });

  it('snapshots and restores', () => {
    const graph = new ArtifactGraph();
    graph.addNode({ stageId: 'a', name: 'A', inputs: [], outputs: ['x'] });
    graph.addNode({ stageId: 'b', name: 'B', inputs: ['x'], outputs: ['y'] });
    graph.addEdge({ from: 'a', to: 'b', artifactKey: 'x' });
    graph.updateNode('a', { status: 'completed', artifacts: { x: 1 } });

    const snapshot = graph.snapshot();
    const restored = ArtifactGraph.fromSnapshot(snapshot);
    expect(restored.allNodes().length).toBe(2);
    expect(restored.allEdges().length).toBe(1);
    expect(restored.getNode('a')?.artifacts.x).toBe(1);
  });
});

describe('ArtifactExecutor', () => {
  it('executes a simple two-node graph', async () => {
    const graph = new ArtifactGraph();
    graph.addNode({ stageId: 'a', name: 'A', inputs: [], outputs: ['x'] });
    graph.addNode({ stageId: 'b', name: 'B', inputs: ['x'], outputs: ['y'] });
    graph.discoverEdges();

    const runner = async (nodeId: string, _contract: any, artifacts: Record<string, unknown>) => {
      if (nodeId === 'a') return { x: 'hello' };
      if (nodeId === 'b') return { y: `${artifacts.x} world` };
      return {};
    };

    const executor = new ArtifactExecutor(graph, { persistArtifacts: false });
    const result = await executor.execute('test-1', runner);

    expect(result.success).toBe(true);
    expect(result.nodeResults.length).toBe(2);
    expect(result.allArtifacts.x).toBe('hello');
    expect(result.allArtifacts.y).toBe('hello world');
    expect(result.plan.levels.length).toBe(2);
  });

  it('skips nodes with missing required inputs when skippable', async () => {
    const graph = new ArtifactGraph();
    graph.addNode({ stageId: 'a', name: 'A', inputs: [], outputs: ['x'] });
    graph.addNode({ stageId: 'b', name: 'B', inputs: ['x', 'missing'], outputs: ['y'], skippable: true });
    graph.discoverEdges();

    const runner = async (nodeId: string) => {
      if (nodeId === 'a') return { x: 1 };
      return {};
    };

    const executor = new ArtifactExecutor(graph, { persistArtifacts: false });
    const result = await executor.execute('test-skip', runner);

    // Skippable nodes report success=true (skipping is an allowed outcome).
    expect(result.success).toBe(true);
    const bResult = result.nodeResults.find(r => r.nodeId === 'b');
    expect(bResult?.success).toBe(true); // skipped = allowed
    expect(bResult?.error).toContain('missing input');
    expect(result.allArtifacts.x).toBe(1); // 'a' still ran
  });

  it('fails on invalid graph (cycle)', async () => {
    const graph = new ArtifactGraph();
    graph.addNode({ stageId: 'a', name: 'A', inputs: ['y'], outputs: ['x'] });
    graph.addNode({ stageId: 'b', name: 'B', inputs: ['x'], outputs: ['y'] });
    graph.addEdge({ from: 'a', to: 'b', artifactKey: 'x' });
    graph.addEdge({ from: 'b', to: 'a', artifactKey: 'y' });

    const executor = new ArtifactExecutor(graph, { persistArtifacts: false });
    await expect(executor.execute('test-cycle', async () => ({}))).rejects.toThrow('validation failed');
  });
});

describe('legacyStageContracts', () => {
  it('returns a non-empty array of stage contracts', () => {
    const contracts = legacyStageContracts();
    expect(contracts.length).toBeGreaterThan(0);
    contracts.forEach(c => {
      expect(typeof c.stageId).toBe('string');
      expect(Array.isArray(c.inputs)).toBe(true);
      expect(Array.isArray(c.outputs)).toBe(true);
    });
  });

  it('first stage (bre-v2) has no inputs', () => {
    const contracts = legacyStageContracts();
    const bre = contracts.find(c => c.stageId === 'bre-v2');
    expect(bre).toBeDefined();
    expect(bre!.inputs.length).toBe(0);
  });

  it('last stage (build-history) outputs build-history-entry', () => {
    const contracts = legacyStageContracts();
    const last = contracts[contracts.length - 1];
    expect(last.outputs).toContain('build-history-entry');
  });
});

describe('isArtifactGraphEnabled', () => {
  it('returns false by default', () => {
    const original = process.env.ARTIFACT_GRAPH_ENABLED;
    delete process.env.ARTIFACT_GRAPH_ENABLED;
    expect(isArtifactGraphEnabled()).toBe(false);
    if (original) process.env.ARTIFACT_GRAPH_ENABLED = original;
  });

  it('returns true when env var is "1"', () => {
    const original = process.env.ARTIFACT_GRAPH_ENABLED;
    process.env.ARTIFACT_GRAPH_ENABLED = '1';
    expect(isArtifactGraphEnabled()).toBe(true);
    if (original) process.env.ARTIFACT_GRAPH_ENABLED = original;
    else delete process.env.ARTIFACT_GRAPH_ENABLED;
  });
});
