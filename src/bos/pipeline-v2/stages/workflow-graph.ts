import type { StageInput, EntityGraph, WorkflowGraph, WorkflowDef } from '../stages.js';

export function runWorkflowGraphStage(input: StageInput, entityGraph: EntityGraph): WorkflowGraph {
  const workflows: WorkflowDef[] = [];
  const workflowNames = new Set<string>();

  for (const decision of input.decisions) {
    if (decision.action.type === 'add_workflow') {
      const name = decision.action.name;
      if (!workflowNames.has(name)) {
        workflowNames.add(name);
        workflows.push({
          name,
          trigger: decision.action.trigger ?? 'manual',
        steps: (decision.action.steps ?? []).map((s: string) => {
          const step: WorkflowDef['steps'][number] = { name: s, action: 'transform' };
          const entity = findEntityForStep(s, entityGraph);
          if (entity) step.entity = entity;
          return step;
        }),
          entities: decision.action.entities ?? [],
        });
      }
    }
  }

  // Derive workflows from entities if none explicitly added
  if (workflows.length === 0) {
    for (const entity of entityGraph.entities) {
      if (entity.name === 'User') continue;
      workflows.push({
        name: `${entity.name} Management`,
        trigger: 'manual',
        steps: [
          { name: `Create ${entity.name}`, action: 'create', entity: entity.name },
          { name: `View ${entity.name}`, action: 'read', entity: entity.name },
          { name: `Update ${entity.name}`, action: 'update', entity: entity.name },
          { name: `Delete ${entity.name}`, action: 'delete', entity: entity.name },
        ],
        entities: [entity.name],
      });
    }
  }

  return { workflows };
}

function findEntityForStep(stepName: string, entityGraph: EntityGraph): string | undefined {
  const lower = stepName.toLowerCase();
  for (const entity of entityGraph.entities) {
    if (lower.includes(entity.name.toLowerCase())) return entity.name;
  }
  return undefined;
}
