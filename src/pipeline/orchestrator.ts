/**
 * Production Pipeline Orchestrator
 * Runs the 3-stage generation pipeline: Schemas → Business Logic → Component Fusion.
 * No mock data. No templates. Real connected code.
 */

import { SchemaGenerator, type Stage1Output } from './schema-generator.js';
import { BusinessLogicGenerator, type Stage2Output } from './business-logic-generator.js';
import { ComponentFusion, type FusionOutput } from './component-fusion.js';
import type { SchemaModel } from './schema-generator.js';
import type { ServiceClass, ServerAction, StateSlice } from './business-logic-generator.js';

export interface PipelineResult {
  stage1: Stage1Output;
  stage2: Stage2Output;
  stage3: FusionOutput;
  totalFiles: number;
  durationMs: number;
  summary: string;
}

export class ProductionPipeline {
  private schemaGen = new SchemaGenerator();
  private logicGen = new BusinessLogicGenerator();
  private fusion = new ComponentFusion();

  /**
   * Run the complete 3-stage pipeline.
   */
  async run(
    appName: string,
    prompt: string,
    capabilities: string[],
    blueprint: {
      models: Array<{ name: string; fields: Array<{ name: string; type: string; required: boolean; isId?: boolean }> }>;
      apis: Array<{ path: string; method: string; description: string; auth: boolean }>;
      pages: Array<{ route: string; name: string; type: string }>;
    },
    workspacePath: string,
  ): Promise<PipelineResult> {
    const startTime = Date.now();

    console.log('='.repeat(60));
    console.log('PRODUCTION PIPELINE — 3-Stage Generation');
    console.log('='.repeat(60));

    // Stage 1: Schemas & Contracts
    console.log('\n📦 Stage 1: Schemas & Contracts');
    const stage1 = this.schemaGen.generate(
      appName,
      capabilities,
      blueprint.models,
      blueprint.apis,
      workspacePath,
    );

    // Stage 2: Business Logic
    console.log('\n⚙️  Stage 2: Business Logic');
    const stage2 = this.logicGen.generate(
      appName,
      stage1.models,
      capabilities,
      workspacePath,
    );

    // Stage 3: Component Fusion
    console.log('\n🔗 Stage 3: Component Fusion');
    const stage3 = this.fusion.generate(
      appName,
      stage1.models,
      stage2.services,
      stage2.serverActions,
      stage2.stateSlices,
      blueprint.pages,
      workspacePath,
    );

    const durationMs = Date.now() - startTime;
    const totalFiles = stage1.generatedFiles.length + stage2.generatedFiles.length + stage3.generatedFiles.length;

    const summary = [
      `Pipeline complete in ${durationMs}ms`,
      `Stage 1: ${stage1.models.length} models, ${stage1.interfaces.length} interfaces, ${stage1.apiContracts.length} contracts`,
      `Stage 2: ${stage2.services.length} services, ${stage2.stateSlices.length} state slices, ${stage2.serverActions.length} server actions`,
      `Stage 3: ${stage3.pages.length} pages, ${stage3.apiRoutes.length} API routes`,
      `Total files: ${totalFiles}`,
    ].join('\n');

    console.log('\n' + '='.repeat(60));
    console.log(summary);
    console.log('='.repeat(60));

    return { stage1, stage2, stage3, totalFiles, durationMs, summary };
  }
}
