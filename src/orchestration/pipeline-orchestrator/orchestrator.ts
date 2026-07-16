/**
 * Pipeline Orchestrator Implementation
 *
 * Runs the intelligence layers in strict order:
 *
 * Business Intelligence → Knowledge Acquisition → Experience Intelligence
 * → Design Intelligence → Content Intelligence → Technology Planner
 * → Application Blueprint → Execution Blueprint → Renderer
 */

import type {
  IPipelineOrchestrator,
  ILayerRegistry,
  PipelineState,
  PipelineEvent,
  ValidationResult,
  PipelineError
} from './types.js';
import type { BusinessKnowledge } from '../business-intelligence/types.js';

// ============================================================================
// LAYER REGISTRY IMPLEMENTATION
// ============================================================================

/**
 * Layer registry - maps layer names to their implementations.
 */
export class LayerRegistry implements ILayerRegistry {
  private layers: Map<string, unknown> = new Map();

  register(name: string, layer: unknown): void {
    this.layers.set(name, layer);
  }

  get(name: string): unknown {
    return this.layers.get(name);
  }

  has(name: string): boolean {
    return this.layers.has(name);
  }

  getNames(): string[] {
    return Array.from(this.layers.keys());
  }
}

// ============================================================================
// PIPELINE ORCHESTRATOR IMPLEMENTATION
// ============================================================================

/**
 * @deprecated (Phase R1, 2026-07-15) — NOT a production execution path.
 * All entry points return HTTP 410 Gone. The canonical production runtime is
 * `DeterministicOrchestratorV4`. Kept for rollback reference and the
 * BusinessIntelligencePipeline staged runtime only. DO NOT DELETE.
 *
 * Pipeline Orchestrator - runs the intelligence layers in strict order.
 */
export class PipelineOrchestrator implements IPipelineOrchestrator {
  readonly id: string;

  private state: PipelineState;
  private registry: ILayerRegistry;
  private eventHandlers: Array<(event: PipelineEvent) => void> = [];

  // Layer execution order
  private static readonly LAYER_ORDER = [
    'business-intelligence',
    'knowledge-acquisition',
    'experience-intelligence',
    'design-intelligence',
    'content-intelligence',
    'technology-planner',
    'application-blueprint',
    'execution-blueprint',
    'renderer'
  ];

  constructor(registry: ILayerRegistry) {
    this.id = `pipeline-${Date.now()}`;
    this.registry = registry;

    this.state = {
      id: this.id,
      startTime: new Date(),
      status: 'pending',
      prompt: '',
      layerExecutionTimes: {},
      layerValidationResults: {},
      errors: [],
      warnings: []
    };
  }

  /**
   * Execute the full pipeline.
   */
  async execute(prompt: string): Promise<PipelineState> {
    this.state.prompt = prompt;
    this.state.status = 'running';
    this.state.startTime = new Date();

    this.emit({ type: 'pipeline-started', state: this.state });

    try {
      // Execute each layer in order
      for (const layerName of PipelineOrchestrator.LAYER_ORDER) {
        await this.executeLayer(layerName, this.state);
      }

      // All layers completed
      this.state.status = 'completed';
      this.state.endTime = new Date();

      this.emit({ type: 'pipeline-completed', state: this.state });

      return this.state;
    } catch (error) {
      this.state.status = 'failed';
      this.state.endTime = new Date();

      const pipelineError: PipelineError = {
        layer: 'pipeline',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
        timestamp: new Date()
      };

      this.state.errors.push(pipelineError);

      this.emit({ type: 'pipeline-failed', state: this.state, error: pipelineError });

      return this.state;
    }
  }

  /**
   * Execute a specific layer.
   */
  async executeLayer(layerName: string, state: PipelineState): Promise<PipelineState> {
    const layer = this.registry.get(layerName);

    if (!layer) {
      throw new Error(`Layer '${layerName}' not registered`);
    }

    const startTime = Date.now();

    this.emit({ type: 'layer-started', layer: layerName, state });

    try {
      // Execute layer based on its type
      switch (layerName) {
        case 'business-intelligence':
          await this.executeBusinessIntelligence(layer, state);
          break;
        case 'knowledge-acquisition':
          await this.executeKnowledgeAcquisition(layer, state);
          break;
        case 'experience-intelligence':
          await this.executeExperienceIntelligence(layer, state);
          break;
        case 'design-intelligence':
          await this.executeDesignIntelligence(layer, state);
          break;
        case 'content-intelligence':
          await this.executeContentIntelligence(layer, state);
          break;
        case 'technology-planner':
          await this.executeTechnologyPlanner(layer, state);
          break;
        case 'application-blueprint':
          await this.executeApplicationBlueprint(layer, state);
          break;
        case 'execution-blueprint':
          await this.executeExecutionBlueprint(layer, state);
          break;
        case 'renderer':
          await this.executeRenderer(layer, state);
          break;
        default:
          throw new Error(`Unknown layer: ${layerName}`);
      }

      const duration = Date.now() - startTime;
      state.layerExecutionTimes[layerName] = duration;

      this.emit({ type: 'layer-completed', layer: layerName, state, duration });

      return state;
    } catch (error) {
      const pipelineError: PipelineError = {
        layer: layerName,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
        timestamp: new Date()
      };

      state.errors.push(pipelineError);

      this.emit({ type: 'layer-failed', layer: layerName, state, error: pipelineError });

      throw error;
    }
  }

  /**
   * Validate pipeline state.
   */
  validate(state: PipelineState): ValidationResult {
    const issues: ValidationResult['issues'] = [];

    // Check that all required artifacts exist
    if (!state.businessKnowledge) {
      issues.push({
        severity: 'error',
        message: 'BusinessKnowledge is missing',
        field: 'businessKnowledge'
      });
    }

    if (!state.experienceBlueprint) {
      issues.push({
        severity: 'error',
        message: 'ExperienceBlueprint is missing',
        field: 'experienceBlueprint'
      });
    }

    if (!state.contentBlueprint) {
      issues.push({
        severity: 'error',
        message: 'ContentBlueprint is missing',
        field: 'contentBlueprint'
      });
    }

    if (!state.solutionArchitecture) {
      issues.push({
        severity: 'error',
        message: 'SolutionArchitecture is missing',
        field: 'solutionArchitecture'
      });
    }

    if (!state.applicationBlueprint) {
      issues.push({
        severity: 'error',
        message: 'ApplicationBlueprint is missing',
        field: 'applicationBlueprint'
      });
    }

    if (!state.executionBlueprint) {
      issues.push({
        severity: 'error',
        message: 'ExecutionBlueprint is missing',
        field: 'executionBlueprint'
      });
    }

    // Check for errors
    if (state.errors.length > 0) {
      issues.push({
        severity: 'error',
        message: `Pipeline has ${state.errors.length} error(s)`,
        field: 'errors'
      });
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues
    };
  }

  /**
   * Get pipeline state.
   */
  getState(): PipelineState {
    return { ...this.state };
  }

  /**
   * Subscribe to pipeline events.
   */
  onEvent(handler: (event: PipelineEvent) => void): () => void {
    this.eventHandlers.push(handler);

    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index > -1) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE: Layer Execution Methods
  // --------------------------------------------------------------------------

  private emit(event: PipelineEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }

  private async executeBusinessIntelligence(layer: unknown, state: PipelineState): Promise<void> {
    const engine = layer as { process: (prompt: string) => Promise<BusinessKnowledge> };
    state.businessKnowledge = await engine.process(state.prompt);
  }

  private async executeKnowledgeAcquisition(layer: unknown, state: PipelineState): Promise<void> {
    if (!state.businessKnowledge) {
      throw new Error('BusinessKnowledge required for Knowledge Acquisition');
    }

    const engine = layer as { process: (bk: BusinessKnowledge) => Promise<unknown> };
    state.evidenceCollection = await engine.process(state.businessKnowledge) as any;
  }

  private async executeExperienceIntelligence(layer: unknown, state: PipelineState): Promise<void> {
    if (!state.businessKnowledge) {
      throw new Error('BusinessKnowledge required for Experience Intelligence');
    }

    const layerObj = layer as Record<string, unknown>;

    // Check if the layer is using Experience OS v2 (via adapter)
    if (layerObj.useExperienceOSV2 === true && layerObj.adapter) {
      const adapter = layerObj.adapter as { process: (bk: BusinessKnowledge) => Promise<unknown> };
      const result = await adapter.process(state.businessKnowledge);

      // Store both v2 (canonical) and legacy blueprint
      const v2 = (result as { experienceBlueprintV2?: unknown })?.experienceBlueprintV2;
      if (v2) {
        state.experienceBlueprintV2 = v2 as any;
      }

      // Also store legacy blueprint
      state.experienceBlueprint = result as any;
      return;
    }

    const engine = layer as { process: (bk: BusinessKnowledge) => Promise<unknown> };
    state.experienceBlueprint = await engine.process(state.businessKnowledge) as any;
  }

  private async executeDesignIntelligence(layer: unknown, state: PipelineState): Promise<void> {
    if (!state.businessKnowledge) {
      throw new Error('BusinessKnowledge required for Design Intelligence');
    }

    const engine = layer as { process: (bk: BusinessKnowledge) => Promise<unknown> };
    state.designBlueprint = await engine.process(state.businessKnowledge);
  }

  private async executeContentIntelligence(layer: unknown, state: PipelineState): Promise<void> {
    if (!state.businessKnowledge || !state.experienceBlueprint) {
      throw new Error('BusinessKnowledge and ExperienceBlueprint required for Content Intelligence');
    }

    const engine = layer as {
      process: (bk: BusinessKnowledge, exp: unknown) => Promise<unknown>
    };
    state.contentBlueprint = await engine.process(state.businessKnowledge, state.experienceBlueprint) as any;
  }

  private async executeTechnologyPlanner(layer: unknown, state: PipelineState): Promise<void> {
    if (!state.businessKnowledge || !state.experienceBlueprint || !state.contentBlueprint) {
      throw new Error('BusinessKnowledge, ExperienceBlueprint, and ContentBlueprint required for Technology Planner');
    }

    const engine = layer as {
      process: (bk: BusinessKnowledge, exp: unknown, content: unknown) => Promise<unknown>
    };
    state.solutionArchitecture = await engine.process(
      state.businessKnowledge,
      state.experienceBlueprint,
      state.contentBlueprint
    ) as any;
  }

  private async executeApplicationBlueprint(layer: unknown, state: PipelineState): Promise<void> {
    if (!state.businessKnowledge || !state.experienceBlueprint || !state.contentBlueprint || !state.solutionArchitecture) {
      throw new Error('All upstream artifacts required for Application Blueprint');
    }

    const engine = layer as {
      process: (
        bk: BusinessKnowledge,
        exp: unknown,
        content: unknown,
        arch: unknown
      ) => Promise<unknown>
    };
    state.applicationBlueprint = await engine.process(
      state.businessKnowledge,
      state.experienceBlueprint,
      state.contentBlueprint,
      state.solutionArchitecture
    ) as any;
  }

  private async executeExecutionBlueprint(layer: unknown, state: PipelineState): Promise<void> {
    if (!state.applicationBlueprint) {
      throw new Error('ApplicationBlueprint required for Execution Blueprint');
    }

    const engine = layer as { process: (app: unknown) => Promise<unknown> };
    state.executionBlueprint = await engine.process(state.applicationBlueprint) as any;
  }

  private async executeRenderer(layer: unknown, state: PipelineState): Promise<void> {
    if (!state.executionBlueprint) {
      throw new Error('ExecutionBlueprint required for Renderer');
    }

    const engine = layer as {
      process: (exec: unknown, config: unknown) => Promise<unknown>
    };
    state.rendererOutput = await engine.process(
      state.executionBlueprint,
      { type: 'nextjs', outputDir: './generated', overwrite: true }
    ) as any;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a pipeline orchestrator with default layer registry.
 */
export function createPipelineOrchestrator(): IPipelineOrchestrator {
  const registry = new LayerRegistry();
  return new PipelineOrchestrator(registry);
}
