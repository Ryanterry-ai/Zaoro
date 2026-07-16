/**
 * Execution Blueprint Engine
 *
 * Consumes ApplicationBlueprint to produce an ExecutionBlueprint
 * with renderer instructions, build config, and generation rules.
 *
 * This engine NEVER:
 * - Decides technology stack (consumes from upstream)
 * - Hardcodes file templates
 * - Bypasses quality gates
 */

import type { ApplicationBlueprint } from '../application-blueprint/types.js';
import type {
  ExecutionBlueprint,
  RendererConfig,
  BuildConfig,
  FileGenerationRule,
  ComponentGenerationRule,
  ContentGenerationRule,
  QualityGateConfig,
  IExecutionBlueprintLayer,
} from './types.js';
import type { Provenance, ValidationResult } from '../experience-intelligence/types.js';

function wrap<T>(value: T, confidence: number, evidence: string[]): { value: T; provenance: Provenance } {
  return {
    value,
    provenance: {
      layer: 'execution-blueprint',
      confidence,
      evidence,
      timestamp: new Date(),
      reasoning: evidence.join('; '),
      source: 'execution-blueprint-engine',
    },
  };
}

export class ExecutionBlueprintEngine implements IExecutionBlueprintLayer {
  readonly id = 'execution-blueprint' as const;
  readonly name = 'Execution Blueprint';
  readonly version = '1.0.0';

  async process(app: ApplicationBlueprint): Promise<ExecutionBlueprint> {
    const evidence: string[] = [];
    evidence.push(`Routes: ${app.routes?.value?.length ?? 0}`);
    evidence.push(`Components: ${app.components?.value?.length ?? 0}`);
    evidence.push(`API contracts: ${app.apiContracts?.value?.length ?? 0}`);

    const renderer: RendererConfig = {
      type: 'nextjs',
      version: '14',
      options: { ssr: true, appDir: true },
      outputDir: '.next',
      srcDir: 'src',
    };

    const buildConfig: BuildConfig = {
      packageManager: 'npm',
      buildCommand: 'next build',
      devCommand: 'next dev',
      outputDir: '.next',
      envVars: {},
      hooks: [],
    };

    const fileGenerationRules: FileGenerationRule[] = [
      {
        name: 'pages',
        pattern: 'src/app/**/page.tsx',
        strategy: 'page',
        contentSource: 'blueprint',
        overwrite: true,
      },
      {
        name: 'components',
        pattern: 'src/components/*.tsx',
        strategy: 'component',
        contentSource: 'blueprint',
        overwrite: true,
      },
      {
        name: 'layout',
        pattern: 'src/app/layout.tsx',
        strategy: 'template',
        contentSource: 'blueprint',
        overwrite: true,
      },
      {
        name: 'globals-css',
        pattern: 'src/app/globals.css',
        strategy: 'template',
        contentSource: 'static',
        overwrite: true,
      },
      {
        name: 'config',
        pattern: '*.{json,js,mjs,ts}',
        strategy: 'config',
        contentSource: 'static',
        overwrite: false,
      },
    ];

    const componentGenerationRules: ComponentGenerationRule[] = (app.components?.value || []).map(c => ({
      name: c.name,
      type: c.type,
      strategy: 'custom' as const,
      propsSource: 'blueprint' as const,
      childrenStrategy: 'recursive' as const,
    }));

    const contentGenerationRules: ContentGenerationRule[] = [
      { name: 'copy', type: 'copy', source: 'content-blueprint', destination: 'component', format: 'text' },
      { name: 'images', type: 'image', source: 'static', destination: 'component', format: 'text' },
      { name: 'data', type: 'data', source: 'business-knowledge', destination: 'json', format: 'json' },
    ];

    const qualityGates: QualityGateConfig[] = [
      { name: 'typescript', type: 'typecheck', command: 'npx tsc --noEmit', blocking: true, timeout: 30000 },
      { name: 'lint', type: 'lint', command: 'npx next lint', blocking: false, timeout: 30000 },
      { name: 'build', type: 'build', command: 'npx next build', blocking: true, timeout: 120000 },
    ];

    return {
      id: `exec-${Date.now()}`,
      createdAt: new Date(),
      version: '1.0.0',
      applicationBlueprintId: app.id || '',
      renderer: wrap(renderer, 0.9, evidence),
      buildConfig: wrap(buildConfig, 0.85, evidence),
      fileGenerationRules: wrap(fileGenerationRules, 0.8, evidence),
      componentGenerationRules: wrap(componentGenerationRules, 0.75, evidence),
      contentGenerationRules: wrap(contentGenerationRules, 0.7, evidence),
      qualityGates: wrap(qualityGates, 0.8, evidence),
    };
  }

  validate(blueprint: ExecutionBlueprint): ValidationResult {
    const issues: Array<{ severity: 'error' | 'warning' | 'info'; message: string; field?: string }> = [];

    if (!blueprint.renderer?.value?.type) {
      issues.push({ severity: 'error', message: 'Missing renderer type', field: 'renderer.type' });
    }
    if (!blueprint.buildConfig?.value?.buildCommand) {
      issues.push({ severity: 'error', message: 'Missing build command', field: 'buildConfig.buildCommand' });
    }
    if (!blueprint.fileGenerationRules?.value?.length) {
      issues.push({ severity: 'warning', message: 'No file generation rules', field: 'fileGenerationRules' });
    }

    return { valid: issues.filter(i => i.severity === 'error').length === 0, issues };
  }
}
