/**
 * BuildPipeline — the complete deterministic build pipeline.
 *
 * Architecture:
 *   Prompt → BRE v2 → Execution Blueprint → Content Resolver → Application Spec → Renderer → Code
 *
 * Each layer is independent, testable, and platform-agnostic.
 * Zero LLM calls in the common case.
 */

import type { BREContext } from '../bos/reasoning/rules-engine.js';
import type { ApplicationBlueprint } from '../bos/schemas/blueprint/application-blueprint.schema.js';
import type { ExecutionBlueprint } from '../bos/schemas/blueprint/execution-blueprint.schema.js';
import type { ApplicationSpec } from '../bos/schemas/blueprint/execution-blueprint.schema.js';
import type { Pattern } from '../bos/schemas/knowledge/pattern.schema.js';
import type { DesignProfile } from '../bos/schemas/knowledge/design-profile.schema.js';
import type { RenderResult } from './renderers/renderer.js';
import { runBREV2Pipeline, type BREv2Result } from '../bos/bre-v2-pipeline.js';
import { buildExecutionBlueprint } from '../bos/execution-planner.js';
import { resolveContent } from '../bos/content-resolver.js';
import { registerRenderer, renderWith, getRegisteredPlatforms } from './renderers/index.js';
import { ReactRenderer } from './renderers/react-renderer.js';
import { FlutterRenderer } from './renderers/flutter-renderer.js';
import { PATTERNS, DESIGN_PROFILES } from '../bos/knowledge/registry.js';
import { stageLogger, debugLog } from '../core/debug-logger.js';

const log = stageLogger('pipeline');

// ─── Pipeline Configuration ──────────────────────────────────────────────────

export interface PipelineConfig {
  /** Target platform for code generation */
  platform?: string;

  /** Whether to include comments in generated code */
  includeComments?: boolean;

  /** Whether to generate test files */
  includeTests?: boolean;

  /** Output directory path */
  outputDir?: string;
}

export interface PipelineResult {
  /** BRE v2 result with full blueprint */
  breResult: BREv2Result;

  /** Structural execution plan */
  executionBlueprint: ExecutionBlueprint;

  /** Declarative application spec with resolved content */
  applicationSpec: ApplicationSpec;

  /** Generated code files */
  renderResult: RenderResult;

  /** Available platforms */
  availablePlatforms: string[];
}

// ─── Pipeline Execution ──────────────────────────────────────────────────────

/**
 * Run the full deterministic build pipeline.
 *
 * @param context - BRE context from user prompt
 * @param config - Pipeline configuration
 * @returns Complete pipeline result with generated code
 */
export function runBuildPipeline(
  context: BREContext,
  config: PipelineConfig = {},
): PipelineResult {
  const {
    platform = 'react',
    includeComments = true,
    includeTests = false,
    outputDir = './workspace/src',
  } = config;

  log.info('Pipeline started', {
    industry: context.industry,
    appName: context.appName,
    platform,
  });

  // Register renderers if not already registered
  ensureRenderers();

  const pipelineStart = Date.now();

  // Layer 1: BRE v2 → Application Blueprint
  const t1 = Date.now();
  const breResult = runBREV2Pipeline(context);
  log.info('Layer 1: BRE v2 complete', {
    pages: breResult.blueprint.pages.length,
    entities: breResult.blueprint.entities.length,
    confidence: breResult.confidence,
    duration: Date.now() - t1,
  });

  // Layer 2: Application Blueprint → Execution Blueprint
  const t2 = Date.now();
  const executionBlueprint = buildExecutionBlueprint(breResult.blueprint);
  log.info('Layer 2: Execution Blueprint complete', {
    pages: executionBlueprint.pages.length,
    totalSlots: executionBlueprint.pages.reduce((s, p) => s + p.slots.length, 0),
    duration: Date.now() - t2,
  });

  // Layer 3: Execution Blueprint → Application Spec (content resolution)
  const t3 = Date.now();
  const matchedPattern = breResult.selectedPattern
    ? PATTERNS.find(p => p.id === breResult.selectedPattern!.id)
    : undefined;
  const matchedDesignProfile = breResult.selectedDesignProfile
    ? DESIGN_PROFILES.find(dp => dp.id === breResult.selectedDesignProfile!.id)
    : undefined;

  const applicationSpec = resolveContent(executionBlueprint, {
    blueprint: breResult.blueprint,
    vocabulary: breResult.blueprint.vocabulary ?? {},
    ...(matchedPattern ? { pattern: matchedPattern } : {}),
    ...(matchedDesignProfile ? { designProfile: matchedDesignProfile } : {}),
  });
  log.info('Layer 3: Content Resolution complete', {
    pages: applicationSpec.pages.length,
    totalComponents: applicationSpec.pages.reduce((s, p) => s + p.components.length, 0),
    duration: Date.now() - t3,
  });

  // Layer 4: Application Spec → Platform Code
  const t4 = Date.now();
  const renderResult = renderWith(applicationSpec, platform, {
    theme: breResult.blueprint.designTokens as Record<string, unknown>,
    includeComments,
    includeTests,
    outputDir,
  });
  log.info('Layer 4: Rendering complete', {
    files: renderResult.files.length,
    warnings: renderResult.warnings.length,
    duration: Date.now() - t4,
  });

  const totalDuration = Date.now() - pipelineStart;
  log.info('Pipeline complete', {
    totalDuration,
    files: renderResult.files.length,
    warnings: renderResult.warnings,
  });

  // Flush debug logs to file
  debugLog.flush();

  return {
    breResult,
    executionBlueprint,
    applicationSpec,
    renderResult,
    availablePlatforms: getRegisteredPlatforms(),
  };
}

// ─── Renderer Registration ───────────────────────────────────────────────────

let renderersRegistered = false;

function ensureRenderers(): void {
  if (!renderersRegistered) {
    registerRenderer(new ReactRenderer());
    registerRenderer(new FlutterRenderer());
    renderersRegistered = true;
  }
}

/**
 * Get all available renderers.
 */
export function getAvailableRenderers(): string[] {
  ensureRenderers();
  return getRegisteredPlatforms();
}

/**
 * Run the pipeline with a specific renderer.
 */
export function runPipelineForPlatform(
  context: BREContext,
  platform: string,
): PipelineResult {
  return runBuildPipeline(context, { platform });
}
