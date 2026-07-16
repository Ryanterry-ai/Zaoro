/**
 * Wired Pipeline Orchestrator
 *
 * This creates a pipeline orchestrator with all layers registered.
 * It bridges the formal orchestration architecture with the runtime.
 */

import { PipelineOrchestrator, LayerRegistry } from './orchestrator.js';
import type { IPipelineOrchestrator } from './types.js';

// Import actual engines
import { BusinessIntelligenceEngine } from '../business-intelligence/engine.js';
import { KnowledgeAcquisitionEngine } from '../knowledge-acquisition/engine.js';
import { ContentIntelligenceEngine } from '../content-intelligence/engine.js';
import { DesignIntelligenceEngine } from '../design-intelligence/engine.js';
import { TechnologyPlannerEngine } from '../technology-planner/engine.js';
import { ApplicationBlueprintEngine } from '../application-blueprint/engine.js';
import { ExecutionBlueprintEngine } from '../execution-blueprint/engine.js';
import { generateExperienceBlueprint, validateExperienceBlueprint } from '../experience-intelligence/experience-engine.js';

/**
 * Create a wired pipeline orchestrator with all layers registered.
 */
export function createWiredPipelineOrchestrator(): IPipelineOrchestrator {
  const registry = new LayerRegistry();

  // Register Business Intelligence
  registry.register('business-intelligence', new BusinessIntelligenceEngine());

  // Register Knowledge Acquisition — REAL ENGINE
  registry.register('knowledge-acquisition', new KnowledgeAcquisitionEngine());

  // Register Experience Intelligence — REAL ENGINE
  registry.register('experience-intelligence', {
    process: async (bk: any) => {
      const result = generateExperienceBlueprint({
        industry: bk.discovery?.industry || 'general',
        subIndustry: bk.discovery?.subIndustry,
        sections: (bk.workflows || []).map((w: any) => ({ type: w.kind, content: { description: w.description } })),
        pageType: 'landing',
        designDNA: bk._designDNA,
        designDecision: bk._designDecision,
      });
      return result;
    }
  });

  // Register Design Intelligence
  registry.register('design-intelligence', new DesignIntelligenceEngine());

  // Register Content Intelligence — REAL ENGINE
  registry.register('content-intelligence', new ContentIntelligenceEngine());

  // Register Technology Planner — REAL ENGINE
  registry.register('technology-planner', new TechnologyPlannerEngine());

  // Register Application Blueprint — REAL ENGINE
  registry.register('application-blueprint', new ApplicationBlueprintEngine());

  // Register Execution Blueprint — REAL ENGINE
  registry.register('execution-blueprint', new ExecutionBlueprintEngine());

  // Register Renderer (placeholder — the actual renderer is the build pipeline)
  registry.register('renderer', {
    process: async (exec: any, config: any) => {
      return {
        id: `render-${Date.now()}`,
        executionBlueprintId: exec.id,
        files: [],
        metadata: {
          framework: config?.type ?? 'nextjs',
          outputDir: config?.outputDir ?? './generated',
        },
        timestamp: new Date(),
      };
    }
  });

  return new PipelineOrchestrator(registry);
}
