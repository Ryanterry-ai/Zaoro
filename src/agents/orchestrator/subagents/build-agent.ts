/**
 * Build Agent — rendering + code generation.
 *
 * Scope: ONE thing only — turn blueprint + content into generated files.
 * Output: RenderedFile[] + ApplicationGraph + ApplicationSpec
 * Runs AFTER Blueprint + Content (needs both).
 *
 * This agent delegates to the existing build pipeline for the actual
 * rendering and code generation. It orchestrates the sub-steps and
 * validates the output.
 */

import type { IBuildAgent, PhaseContext, AgentResult } from '../types.js';
import type { RenderedFile } from '../../../generation/renderers/renderer.js';
import type { ApplicationGraph } from '../../../bos/graph/application-graph.js';
import type { ApplicationSpec } from '../../../bos/schemas/blueprint/execution-blueprint.schema.js';
import { runBuildPipeline } from '../../../generation/build-pipeline.js';
import { computeAppGraphStats } from '../../../bos/graph/application-graph.js';

interface BuildOutput {
  renderResult: RenderedFile[];
  applicationGraph: ApplicationGraph;
  applicationSpec: ApplicationSpec;
}

export class BuildAgent implements IBuildAgent {
  readonly name = 'build-agent';

  async run(ctx: PhaseContext): Promise<AgentResult<BuildOutput>> {
    const start = Date.now();
    let attempts = 0;

    while (true) {
      attempts++;
      try {
        const output = await this.build(ctx);

        // Validate build output
        const validation = this.validate(output);
        if (!validation.passed && attempts < ctx.maxRetries) {
          ctx.retryCount = attempts;
          continue;
        }

        return {
          status: 'completed',
          data: output,
          duration: Date.now() - start,
          attempts,
        };
      } catch (err) {
        if (attempts >= ctx.maxRetries) {
          return {
            status: 'failed',
            error: (err as Error).message,
            duration: Date.now() - start,
            attempts,
          };
        }
      }
    }
  }

  /**
   * Build the application from blueprint + content.
   * Delegates to the existing build pipeline.
   */
  private async build(ctx: PhaseContext): Promise<BuildOutput> {
    const { breResult, businessResearch, breContext, scrapedContent, designBrief, solutionArchitecture, config } = ctx;

    if (!breResult) {
      throw new Error('BuildAgent requires breResult from BlueprintAgent');
    }

    // Attach business research, design brief, and solution architecture to BRE context
    const enrichedContext = {
      ...breContext,
      ...(businessResearch ? { businessResearch } : {}),
      ...(designBrief ? { designBrief } : {}),
      ...(solutionArchitecture ? { solutionArchitecture } : {}),
    };

    // Run the existing build pipeline
    const pipelineResult = await runBuildPipeline(enrichedContext, {
      platform: config.platform as any,
      outputDir: config.outputDir,
      workspaceDir: config.workspaceDir,
    });

    return {
      renderResult: pipelineResult.renderResult.files,
      applicationGraph: pipelineResult.applicationGraph,
      applicationSpec: pipelineResult.applicationSpec,
    };
  }

  /**
   * Validate build output.
   */
  private validate(output: BuildOutput): { passed: boolean; failures: Array<{ gate: string; message: string; severity: 'error' | 'warning' }> } {
    const failures: Array<{ gate: string; message: string; severity: 'error' | 'warning' }> = [];

    // Must have files
    if (output.renderResult.length === 0) {
      failures.push({
        gate: 'build.files',
        message: 'No files generated',
        severity: 'error',
      });
    }

    // Must have pages in spec
    if (output.applicationSpec.pages.length === 0) {
      failures.push({
        gate: 'build.pages',
        message: 'ApplicationSpec has zero pages',
        severity: 'error',
      });
    }

    // Must have at least one component per page on average
    const totalComponents = output.applicationSpec.pages.reduce((s: number, p: any) => s + (p.components ?? []).length, 0);
    if (totalComponents === 0) {
      failures.push({
        gate: 'build.components',
        message: 'ApplicationSpec has zero components',
        severity: 'error',
      });
    }

    return {
      passed: failures.filter(f => f.severity === 'error').length === 0,
      failures,
    };
  }
}
