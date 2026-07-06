// ─── Build Stage ─────────────────────────────────────────────────────────────
//
// Executes the full build lifecycle using RuntimeEngine:
//   1. Install dependencies
//   2. Build the project
//   3. Run tests
//   4. Start preview server
//   5. Capture screenshots
//   6. Detect and classify failures
//   7. Attempt auto-fixes on failure
//
// This is the bridge between planning and a running application.
// ──────────────────────────────────────────────────────────────────────────────

import { BaseStage } from './base-stage.js';
import type { StageMeta, StageContext, StageResult, AgentRole, LLMTaskType } from '../types.js';

const meta: StageMeta = {
  id: 'build',
  name: 'Build & Test',
  description: 'Install, build, test, and preview the application',
  agentRole: 'devops' as AgentRole,
  dependencies: ['integration', 'quality-assurance'],
  inputs: ['manifest', 'architecture.system', 'architecture.tech-stack', 'qa.plan'],
  outputs: ['build.result', 'build.screenshots', 'build.failures'],
  estimatedDurationSec: 300,
  skippable: false,
  maxRetries: 2,
  parallelizable: false,
};

export class BuildStage extends BaseStage {
  meta = meta;

  async execute(ctx: StageContext): Promise<StageResult> {
    const start = Date.now();
    const warnings: string[] = [];

    if (!ctx.runtime) {
      return this.fail('Runtime context not available. Ensure RuntimeEngine is configured.', Date.now() - start);
    }

    const manifest = ctx.getArtifact<Record<string, unknown>>('manifest');
    const projectRoot = (manifest?.workingDirectory as string) ?? ctx.manifest.name ?? process.cwd();

    ctx.log.info(`Starting build lifecycle for: ${projectRoot}`);
    ctx.emit('build:start', { projectRoot });

    // Run the full lifecycle
    const result = await ctx.runtime.run(projectRoot);

    ctx.log.info(`Build completed: success=${result.success}, duration=${result.durationMs}ms`);

    // Store artifacts
    ctx.setArtifact('build.result', {
      success: result.success,
      install: result.install,
      build: result.build,
      test: result.test,
      previewUrl: result.previewUrl,
      durationMs: result.durationMs,
      failures: result.failures,
    });

    ctx.setArtifact('build.screenshots', result.screenshots ?? []);

    ctx.setArtifact('build.failures', result.failures);

    // Generate warnings from failures
    for (const failure of result.failures) {
      warnings.push(`[${failure.category}] ${failure.message}`);
      if (failure.suggestedFix) {
        warnings.push(`  Suggested fix: ${failure.suggestedFix}`);
      }
    }

    // Generate markdown report
    const md = this.generateBuildReport(result);

    ctx.emit('build:complete', {
      success: result.success,
      durationMs: result.durationMs,
      failureCount: result.failures.length,
    });

    return this.ok(
      {
        result: {
          success: result.success,
          install: result.install,
          build: result.build,
          test: result.test,
          previewUrl: result.previewUrl,
          durationMs: result.durationMs,
        },
        screenshots: result.screenshots,
        failures: result.failures,
      },
      Date.now() - start,
      0,
      0,
      warnings,
      md,
    );
  }

  private generateBuildReport(result: {
    success: boolean;
    install?: { status: string; durationMs: number } | undefined;
    build?: { status: string; durationMs: number } | undefined;
    test?: { status: string; durationMs: number } | undefined;
    previewUrl?: string | undefined;
    failures: Array<{ category: string; message: string; suggestedFix?: string | undefined }>;
    durationMs: number;
  }): string {
    const lines: string[] = ['# Build & Test Report\n'];

    lines.push(`**Status**: ${result.success ? 'Passed' : 'Failed'}`);
    lines.push(`**Duration**: ${(result.durationMs / 1000).toFixed(1)}s`);
    lines.push('');

    if (result.install) {
      lines.push(`## Install: ${result.install.status} (${(result.install.durationMs / 1000).toFixed(1)}s)`);
    }
    if (result.build) {
      lines.push(`## Build: ${result.build.status} (${(result.build.durationMs / 1000).toFixed(1)}s)`);
    }
    if (result.test) {
      lines.push(`## Test: ${result.test.status} (${(result.test.durationMs / 1000).toFixed(1)}s)`);
    }

    if (result.previewUrl) {
      lines.push(`\n## Preview: ${result.previewUrl}`);
    }

    if (result.failures.length > 0) {
      lines.push(`\n## Failures (${result.failures.length})`);
      for (const f of result.failures) {
        lines.push(`- **${f.category}**: ${f.message.slice(0, 120)}`);
        if (f.suggestedFix) {
          lines.push(`  - Fix: ${f.suggestedFix}`);
        }
      }
    }

    return lines.join('\n');
  }
}
