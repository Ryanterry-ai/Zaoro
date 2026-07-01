import { stageLogger } from '../../core/debug-logger.js';
import type { StageInput, StageOutput, PipelineEvent } from './stages.js';
import { runCapabilityGraphStage } from './stages/capability-graph.js';
import { runEntityGraphStage } from './stages/entity-graph.js';
import { runWorkflowGraphStage } from './stages/workflow-graph.js';
import { runNavigationGraphStage } from './stages/navigation-graph.js';
import { runDatabaseGraphStage } from './stages/database-graph.js';
import { runAPIGraphStage } from './stages/api-graph.js';
import { runBlueprintStage } from './stages/blueprint.js';
import { runExecutionDAGStage } from './stages/execution-dag.js';

const log = stageLogger('pipeline-v2');

export interface PipelineResult {
  output: StageOutput;
  events: PipelineEvent[];
  duration: number;
}

export async function runNormalizedPipeline(input: StageInput): Promise<PipelineResult> {
  const events: PipelineEvent[] = [];
  const output: StageOutput = {};
  const tStart = Date.now();

  log.info('Starting normalized pipeline', {
    industry: input.context.industry,
    decisions: input.decisions.length,
  });

  // Stage 1: CapabilityGraph
  {
    const t = Date.now();
    const event: PipelineEvent = { stage: 'capability-graph', status: 'running', duration: 0 };
    try {
      output.capabilityGraph = runCapabilityGraphStage(input);
      event.status = 'completed';
      event.duration = Date.now() - t;
      event.output = `${output.capabilityGraph.capabilities.length} capabilities`;
      log.info('capability-graph', { count: output.capabilityGraph.capabilities.length, duration: event.duration });
    } catch (e: unknown) {
      event.status = 'failed';
      event.duration = Date.now() - t;
      event.error = (e as Error).message;
      log.error('capability-graph failed', { error: event.error });
    }
    events.push(event);
  }

  // Stage 2: EntityGraph
  {
    const t = Date.now();
    const event: PipelineEvent = { stage: 'entity-graph', status: 'running', duration: 0 };
    try {
      output.entityGraph = runEntityGraphStage(input, output.capabilityGraph!);
      event.status = 'completed';
      event.duration = Date.now() - t;
      event.output = `${output.entityGraph.entities.length} entities, ${output.entityGraph.relationships.length} relationships`;
      log.info('entity-graph', { count: output.entityGraph.entities.length, duration: event.duration });
    } catch (e: unknown) {
      event.status = 'failed';
      event.duration = Date.now() - t;
      event.error = (e as Error).message;
      log.error('entity-graph failed', { error: event.error });
    }
    events.push(event);
  }

  // Stage 3: WorkflowGraph
  {
    const t = Date.now();
    const event: PipelineEvent = { stage: 'workflow-graph', status: 'running', duration: 0 };
    try {
      output.workflowGraph = runWorkflowGraphStage(input, output.entityGraph!);
      event.status = 'completed';
      event.duration = Date.now() - t;
      event.output = `${output.workflowGraph.workflows.length} workflows`;
      log.info('workflow-graph', { count: output.workflowGraph.workflows.length, duration: event.duration });
    } catch (e: unknown) {
      event.status = 'failed';
      event.duration = Date.now() - t;
      event.error = (e as Error).message;
      log.error('workflow-graph failed', { error: event.error });
    }
    events.push(event);
  }

  // Stage 4: NavigationGraph
  {
    const t = Date.now();
    const event: PipelineEvent = { stage: 'navigation-graph', status: 'running', duration: 0 };
    try {
      output.navigationGraph = runNavigationGraphStage(input, output.workflowGraph!, output.entityGraph!);
      event.status = 'completed';
      event.duration = Date.now() - t;
      event.output = `${output.navigationGraph.pages.length} pages`;
      log.info('navigation-graph', { count: output.navigationGraph.pages.length, duration: event.duration });
    } catch (e: unknown) {
      event.status = 'failed';
      event.duration = Date.now() - t;
      event.error = (e as Error).message;
      log.error('navigation-graph failed', { error: event.error });
    }
    events.push(event);
  }

  // Stage 5: DatabaseGraph
  {
    const t = Date.now();
    const event: PipelineEvent = { stage: 'database-graph', status: 'running', duration: 0 };
    try {
      output.databaseGraph = runDatabaseGraphStage(input, output.entityGraph!);
      event.status = 'completed';
      event.duration = Date.now() - t;
      event.output = `${output.databaseGraph.tables.length} tables (${output.databaseGraph.engine})`;
      log.info('database-graph', { tables: output.databaseGraph.tables.length, duration: event.duration });
    } catch (e: unknown) {
      event.status = 'failed';
      event.duration = Date.now() - t;
      event.error = (e as Error).message;
      log.error('database-graph failed', { error: event.error });
    }
    events.push(event);
  }

  // Stage 6: APIGraph
  {
    const t = Date.now();
    const event: PipelineEvent = { stage: 'api-graph', status: 'running', duration: 0 };
    try {
      output.apiGraph = runAPIGraphStage(input, output.entityGraph!, output.workflowGraph!);
      event.status = 'completed';
      event.duration = Date.now() - t;
      event.output = `${output.apiGraph.endpoints.length} endpoints`;
      log.info('api-graph', { count: output.apiGraph.endpoints.length, duration: event.duration });
    } catch (e: unknown) {
      event.status = 'failed';
      event.duration = Date.now() - t;
      event.error = (e as Error).message;
      log.error('api-graph failed', { error: event.error });
    }
    events.push(event);
  }

  // Stage 7: Blueprint Assembly
  {
    const t = Date.now();
    const event: PipelineEvent = { stage: 'blueprint', status: 'running', duration: 0 };
    try {
      output.blueprint = runBlueprintStage(input, output);
      event.status = 'completed';
      event.duration = Date.now() - t;
      event.output = `${output.blueprint.pages.length} pages, ${output.blueprint.entities.length} entities, ${output.blueprint.apis.length} APIs`;
      log.info('blueprint', { pages: output.blueprint.pages.length, duration: event.duration });
    } catch (e: unknown) {
      event.status = 'failed';
      event.duration = Date.now() - t;
      event.error = (e as Error).message;
      log.error('blueprint failed', { error: event.error });
    }
    events.push(event);
  }

  // Stage 8: ExecutionDAG
  {
    const t = Date.now();
    const event: PipelineEvent = { stage: 'execution-dag', status: 'running', duration: 0 };
    try {
      output.executionDAG = runExecutionDAGStage(output.blueprint!);
      event.status = 'completed';
      event.duration = Date.now() - t;
      event.output = `${output.executionDAG.pages.length} pages, ${output.executionDAG.pages.reduce((s, p) => s + p.slots.length, 0)} component slots`;
      log.info('execution-dag', { pages: output.executionDAG.pages.length, duration: event.duration });
    } catch (e: unknown) {
      event.status = 'failed';
      event.duration = Date.now() - t;
      event.error = (e as Error).message;
      log.error('execution-dag failed', { error: event.error });
    }
    events.push(event);
  }

  const totalDuration = Date.now() - tStart;
  log.info('Pipeline complete', { stages: events.length, failed: events.filter(e => e.status === 'failed').length, duration: totalDuration });

  return { output, events, duration: totalDuration };
}
