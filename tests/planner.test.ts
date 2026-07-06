import { describe, it, expect } from 'vitest';
import { Planner, createPlanner } from '../src/orchestration/planner.js';
import type { StageDefinition, ProjectManifest } from '../src/orchestration/types.js';

const MANIFEST: ProjectManifest = {
  id: 'test',
  description: 'Test project',
  createdAt: new Date().toISOString(),
  version: '1.0.0',
};

function makeStage(id: string, deps: string[] = []): StageDefinition {
  return {
    meta: {
      id, name: id, description: `Stage ${id}`,
      agentRole: 'research' as any,
      dependencies: deps,
      inputs: [], outputs: [],
      estimatedDurationSec: 30,
    },
    async execute() { return { success: true, artifacts: {}, warnings: [], durationMs: 0, llmCalls: 0, tokensUsed: 0 }; },
    validate() { return { valid: true, errors: [], warnings: [] }; },
  };
}

describe('Planner', () => {
  it('should create a plan from stages', () => {
    const planner = new Planner();
    const stages = [makeStage('intake'), makeStage('research', ['intake']), makeStage('design', ['research'])];
    const plan = planner.createPlan(MANIFEST, stages);
    expect(plan.id).toBeDefined();
    expect(plan.stages.length).toBe(3);
    expect(plan.parallelGroups.length).toBeGreaterThan(0);
  });

  it('should handle parallel stages', () => {
    const planner = new Planner();
    const stages = [
      makeStage('intake'),
      makeStage('a', ['intake']),
      makeStage('b', ['intake']),
    ];
    const plan = planner.createPlan(MANIFEST, stages);
    expect(plan.stages.length).toBe(3);
    // a and b should be in the same parallel group
    const groupWithAB = plan.parallelGroups.find(g => g.includes('a') && g.includes('b'));
    expect(groupWithAB).toBeDefined();
  });

  it('should get ready stages', () => {
    const planner = new Planner();
    const stages = [makeStage('intake'), makeStage('research', ['intake'])];
    const plan = planner.createPlan(MANIFEST, stages);
    const ready = planner.getReadyStages(plan, new Set(), new Set());
    expect(ready.length).toBe(1);
    expect(ready[0].stageId).toBe('intake');
  });

  it('should not return stages with unmet dependencies', () => {
    const planner = new Planner();
    const stages = [makeStage('intake'), makeStage('research', ['intake'])];
    const plan = planner.createPlan(MANIFEST, stages);
    const ready = planner.getReadyStages(plan, new Set(), new Set());
    expect(ready.every(s => s.stageId === 'intake')).toBe(true);
  });

  it('should create via factory', () => {
    const planner = createPlanner();
    expect(planner).toBeInstanceOf(Planner);
  });
});
