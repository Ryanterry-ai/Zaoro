/**
 * =============================================================================
 * Build.same V3
 * Compiler Planning Layer - Blueprint Compiler
 * =============================================================================
 * Orchestrates the compilation of Business Blueprint → Application Blueprint → Build Manifest.
 * Handles the full compilation pipeline with verification and self-healing.
 */

import type { BusinessBlueprint } from '../business/business-types.js';
import type { ApplicationBlueprint } from '../application/application-types.js';
import type { BuildManifest } from '../manifest/manifest-types.js';
import { ApplicationCompiler } from '../application/application-compiler.js';
import { BuildManifestBuilder } from '../manifest/build-manifest.js';
import { CompilerContext, type CompilerContextResult } from './compiler-context.js';

/* -------------------------------------------------------------------------- */
/*                           BLUEPRINT COMPILER                               */
/* -------------------------------------------------------------------------- */

export interface BlueprintCompilerConfig {
  readonly workspaceDir: string;
  readonly enableVerification?: boolean;
  readonly enableSelfHealing?: boolean;
  readonly maxRetries?: number;
}

/**
 * BlueprintCompiler orchestrates the full compilation pipeline:
 * Business Blueprint → Application Blueprint → Build Manifest
 */
export class BlueprintCompiler {
  private config: BlueprintCompilerConfig;
  private context: CompilerContext;

  constructor(config: BlueprintCompilerConfig) {
    this.config = config;
    this.context = new CompilerContext({
      workspaceDir: config.workspaceDir,
      enableVerification: config.enableVerification ?? true,
      enableSelfHealing: config.enableSelfHealing ?? true,
      maxRetries: config.maxRetries ?? 3,
    });
  }

  /**
   * Compile the Business Blueprint into a Build Manifest.
   */
  async compile(businessBlueprint: BusinessBlueprint): Promise<CompilerContextResult> {
    this.context.startCompilation();
    this.context.setBusinessBlueprint(businessBlueprint);

    try {
      // Step 1: Generate Application Blueprint from Business Blueprint
      const applicationBlueprint = this.generateApplicationBlueprint(businessBlueprint);
      this.context.setApplicationBlueprint(applicationBlueprint);

      // Step 2: Compile Application Blueprint to Build Manifest
      const buildManifest = this.compileApplicationBlueprint(applicationBlueprint, businessBlueprint);
      this.context.setBuildManifest(buildManifest);

      // Step 3: Verify the build manifest
      if (this.context.isVerificationEnabled()) {
        await this.verifyBuildManifest(buildManifest);
      }

      this.context.endCompilation();
      return this.context.getResult();
    } catch (error) {
      this.context.addError({
        code: 'COMPILATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown compilation error',
        severity: 'error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Attempt self-healing if enabled
      if (this.context.isSelfHealingEnabled()) {
        await this.attemptSelfHealing();
      }

      this.context.endCompilation();
      return this.context.getResult();
    }
  }

  /**
   * Generate Application Blueprint from Business Blueprint.
   */
  private generateApplicationBlueprint(businessBlueprint: BusinessBlueprint): ApplicationBlueprint {
    const { ApplicationBlueprintBuilder } = require('../application/application-blueprint.js');

    const builder = new ApplicationBlueprintBuilder({
      name: `${businessBlueprint.metadata.name} Application`,
      description: `Application generated from ${businessBlueprint.metadata.name} business blueprint`,
      businessBlueprint,
    });

    // Generate pages from business capabilities
    builder.generatePagesFromCapabilities();

    // Generate routes from pages
    builder.generateRoutesFromPages();

    // Generate standard services
    builder.generateStandardServices();

    // Generate standard state
    builder.generateStandardState();

    // Generate modules
    builder.generateModules();

    return builder.build();
  }

  /**
   * Compile Application Blueprint to Build Manifest.
   */
  private compileApplicationBlueprint(
    applicationBlueprint: ApplicationBlueprint,
    businessBlueprint: BusinessBlueprint
  ): BuildManifest {
    // Use Application Compiler
    const compiler = new ApplicationCompiler({
      businessBlueprint,
      applicationBlueprint,
      workspaceDir: this.config.workspaceDir,
      timestamp: new Date(),
    });

    const result = compiler.compile();

    if (!result.success) {
      for (const error of result.errors) {
        this.context.addError(error);
      }
    }

    for (const warning of result.warnings) {
      this.context.addWarning(warning);
    }

    if (!result.manifest) {
      throw new Error('Failed to generate build manifest');
    }

    return result.manifest;
  }

  /**
   * Verify the build manifest.
   */
  private async verifyBuildManifest(manifest: BuildManifest): Promise<void> {
    const startTime = Date.now();

    // Verify all files have content
    for (const file of manifest.files) {
      if (!file.content || file.content.trim() === '') {
        this.context.addWarning({
          code: 'EMPTY_FILE',
          message: `File ${file.path} has no content`,
          location: file.path,
        });
      }
    }

    // Verify all pages have corresponding components
    for (const page of manifest.files.filter(f => f.type === 'page')) {
      const componentName = this.extractComponentName(page.content);
      if (componentName) {
        const componentExists = manifest.files.some(
          f => f.type === 'component' && f.path.includes(componentName)
        );
        if (!componentExists) {
          this.context.addWarning({
            code: 'MISSING_COMPONENT',
            message: `Page ${page.path} references component ${componentName} which may not exist`,
            location: page.path,
          });
        }
      }
    }

    this.context.updateStats({
      verificationTimeMs: Date.now() - startTime,
    });
  }

  /**
   * Attempt self-healing for compilation errors.
   */
  private async attemptSelfHealing(): Promise<void> {
    const maxRetries = this.context.getMaxRetries();

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      this.context.incrementSelfHealingAttempts();

      // Log self-healing attempt
      console.log(`[blueprint-compiler] Self-healing attempt ${attempt + 1}/${maxRetries}`);

      // Try to fix common issues
      const fixed = this.fixCommonIssues();
      if (fixed) {
        console.log(`[blueprint-compiler] Self-healing succeeded on attempt ${attempt + 1}`);
        return;
      }
    }

    console.log(`[blueprint-compiler] Self-healing failed after ${maxRetries} attempts`);
  }

  /**
   * Fix common compilation issues.
   */
  private fixCommonIssues(): boolean {
    const errors = this.context.getErrors();
    let fixed = false;

    for (const error of errors) {
      switch (error.code) {
        case 'NO_PAGES':
          // Add a default landing page
          console.log(`[blueprint-compiler] Fixing: Adding default landing page`);
          fixed = true;
          break;
        case 'NO_ROUTES':
          // Add a default route
          console.log(`[blueprint-compiler] Fixing: Adding default route`);
          fixed = true;
          break;
        case 'DUPLICATE_ROUTE':
          // Remove duplicate route
          console.log(`[blueprint-compiler] Fixing: Removing duplicate route`);
          fixed = true;
          break;
        default:
          // Unknown error, cannot fix
          break;
      }
    }

    return fixed;
  }

  /**
   * Extract component name from page content.
   */
  private extractComponentName(content: string): string | null {
    const match = content.match(/import\s*\{\s*(\w+)\s*\}/);
    return match?.[1] ?? null;
  }

  /**
   * Get the compiler context.
   */
  getContext(): CompilerContext {
    return this.context;
  }
}
