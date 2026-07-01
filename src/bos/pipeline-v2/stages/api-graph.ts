import type { StageInput, EntityGraph, WorkflowGraph, APIGraph, EndpointDef } from '../stages.js';

export function runAPIGraphStage(_input: StageInput, entityGraph: EntityGraph, workflowGraph: WorkflowGraph): APIGraph {
  const endpoints: EndpointDef[] = [];

  for (const entity of entityGraph.entities) {
    endpoints.push(
      { path: `/api/${entity.slug}`, method: 'GET', auth: false, entity: entity.name, description: `List ${entity.name}s` },
      { path: `/api/${entity.slug}/:id`, method: 'GET', auth: false, entity: entity.name, description: `Get ${entity.name}` },
      { path: `/api/${entity.slug}`, method: 'POST', auth: true, entity: entity.name, description: `Create ${entity.name}` },
      { path: `/api/${entity.slug}/:id`, method: 'PUT', auth: true, entity: entity.name, description: `Update ${entity.name}` },
      { path: `/api/${entity.slug}/:id`, method: 'DELETE', auth: true, entity: entity.name, description: `Delete ${entity.name}` },
    );
  }

  // Add auth endpoints
  if (entityGraph.entities.some(e => e.name === 'User')) {
    endpoints.push(
      { path: '/api/auth/login', method: 'POST', auth: false, entity: 'User', description: 'Login' },
      { path: '/api/auth/register', method: 'POST', auth: false, entity: 'User', description: 'Register' },
      { path: '/api/auth/logout', method: 'POST', auth: true, entity: 'User', description: 'Logout' },
      { path: '/api/auth/me', method: 'GET', auth: true, entity: 'User', description: 'Get current user' },
    );
  }

  // Add workflow endpoints
  for (const workflow of workflowGraph.workflows) {
    const slug = workflow.name.toLowerCase().replace(/\s+/g, '-');
    endpoints.push({
      path: `/api/workflows/${slug}`,
      method: 'POST',
      auth: true,
      description: `Execute workflow: ${workflow.name}`,
    });
  }

  return { endpoints };
}
