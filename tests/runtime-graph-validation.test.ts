import { describe, it, expect } from 'vitest';
import { ArtifactGraph } from '../src/orchestration/artifact-graph/artifact-graph.js';
import { validateRuntimeGraph } from '../src/orchestration/artifact-graph/validation.js';
import type { StageContract, ArtifactNode } from '../src/orchestration/artifact-graph/types.js';

function contract(id: string, inputs: string[], outputs: string[], skippable = false): StageContract {
  return { stageId: id, name: id, inputs, outputs, skippable };
}

function rawNode(id: string, inputs: string[], outputs: string[], skippable = false): ArtifactNode {
  return { id, contract: contract(id, inputs, outputs, skippable), status: 'pending', artifacts: {} };
}

describe('validateRuntimeGraph', () => {
  it('passes a clean linear graph with single ownership', () => {
    const g = new ArtifactGraph('clean');
    g.addNode(contract('a', [], ['x']));
    g.addNode(contract('b', ['x'], ['y']));
    g.addEdge({ from: 'a', to: 'b', artifactKey: 'x' });
    const res = validateRuntimeGraph(g);
    expect(res.passed).toBe(true);
    expect(res.issues.length).toBe(0);
  });

  it('flags duplicate ownership as critical error', () => {
    const g = new ArtifactGraph('dup');
    g.addNode(contract('a', [], ['x']));
    g.addNode(contract('b', [], ['x']));
    const res = validateRuntimeGraph(g);
    expect(res.passed).toBe(false);
    expect(res.issues.some(i => i.type === 'duplicate-ownership')).toBe(true);
  });

  it('flags cycle as critical error', () => {
    const g = new ArtifactGraph('cycle');
    g.addNode(contract('a', [], ['x']));
    g.addNode(contract('b', ['x'], ['x']));
    g.addEdge({ from: 'a', to: 'b', artifactKey: 'x' });
    g.addEdge({ from: 'b', to: 'a', artifactKey: 'x' });
    const res = validateRuntimeGraph(g);
    expect(res.passed).toBe(false);
    expect(res.issues.some(i => i.type === 'cycle')).toBe(true);
  });

  it('warns on orphan consumer', () => {
    const g = new ArtifactGraph('orphan');
    g.addNode(contract('a', ['missing-key'], ['x']));
    const res = validateRuntimeGraph(g);
    expect(res.issues.some(i => i.type === 'orphan-consumer')).toBe(true);
  });

  it('warns on dead stage (skippable + unconsumed output)', () => {
    const g = new ArtifactGraph('dead');
    g.addNode(contract('a', [], ['x'], true));
    const res = validateRuntimeGraph(g);
    expect(res.issues.some(i => i.type === 'dead-stage')).toBe(true);
  });

  it('flags unreachable non-root stage', () => {
    const g = new ArtifactGraph('unreach');
    g.addNode(contract('a', [], ['x']));
    g.addNode(contract('b', [], ['y']));
    g.addNode(contract('c', ['x', 'y'], ['z']));
    g.addEdge({ from: 'a', to: 'c', artifactKey: 'x' });
    g.addEdge({ from: 'b', to: 'c', artifactKey: 'y' });
    // root set = {a, b}. All reachable. No unreachable.
    const res = validateRuntimeGraph(g);
    expect(res.issues.some(i => i.type === 'unreachable')).toBe(false);
  });
});
