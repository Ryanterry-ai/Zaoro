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

// Pipeline-v2 enrichment — provides richer entity, DB, and API detail
import { runNormalizedPipeline } from '../bos/pipeline-v2/pipeline.js';
import type { EntityDef, TableDef, EndpointDef, EntityRelation } from '../bos/pipeline-v2/stages.js';

// Pass 3: graph-driven code generation
import { buildApplicationGraph, computeAppGraphStats } from '../bos/graph/application-graph.js';
import type { ApplicationGraph, AppGraphStats } from '../bos/graph/application-graph.js';
import { runPass3CodeGeneration } from './pass3-code-generator.js';

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

  /** Unified application graph (Pass 3 input) */
  applicationGraph: ApplicationGraph;

  /** Graph telemetry stats */
  graphStats: AppGraphStats;

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
export async function runBuildPipeline(
  context: BREContext,
  config: PipelineConfig = {},
  llmConfig?: import('../types/index.js').LLMConfig,
  industryScore?: number,
): Promise<PipelineResult> {
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
  const breResult = await runBREV2Pipeline(context, llmConfig, industryScore);
  log.info('Layer 1: BRE v2 complete', {
    pages: breResult.blueprint.pages.length,
    entities: breResult.blueprint.entities.length,
    confidence: breResult.confidence,
    duration: Date.now() - t1,
  });

  // Layer 1b: Pipeline-v2 enrichment — richer entity, DB, and API detail
  let pipelineV2Entities: EntityDef[] = [];
  let pipelineV2Relations: EntityRelation[] = [];
  let pipelineV2Tables: TableDef[] = [];
  let pipelineV2Endpoints: EndpointDef[] = [];
  let pipelineV2Workflows: import('../bos/pipeline-v2/stages.js').WorkflowDef[] = [];
  let pipelineV2Pages: import('../bos/pipeline-v2/stages.js').PageDef[] = [];
  let pipelineV2Capabilities: import('../bos/pipeline-v2/stages.js').CapabilityNode[] = [];
  let pipelineV2Features: import('../bos/pipeline-v2/stages.js').FeatureDef[] = [];
  let pipelineV2NavItems: import('../bos/pipeline-v2/stages.js').NavItemDef[] = [];

  // Clone blueprint before enrichment to prevent in-place mutation
  // that would cause inconsistency on IR reload
  breResult.blueprint = JSON.parse(JSON.stringify(breResult.blueprint));

  {
    const t1b = Date.now();
    try {
      const stageInput = {
        context,
        decisions: breResult.decisions,
        constraintReport: breResult.constraintReport,
        selectedDesignProfile: breResult.selectedDesignProfile ?? undefined,
        selectedPattern: breResult.selectedPattern ?? undefined,
        vocabulary: breResult.blueprint.vocabulary ?? {},
        knowledgeRefs: [],
      } as import('../bos/pipeline-v2/stages.js').StageInput;
      const pipelineV2Result = await runNormalizedPipeline(stageInput);
      log.info('Layer 1b: Pipeline-v2 enrichment complete', {
        duration: Date.now() - t1b,
        capabilities: pipelineV2Result.output.capabilityGraph?.capabilities.length,
        entities: pipelineV2Result.output.entityGraph?.entities.length,
        workflows: pipelineV2Result.output.workflowGraph?.workflows.length,
        pages: pipelineV2Result.output.navigationGraph?.pages.length,
        tables: pipelineV2Result.output.databaseGraph?.tables.length,
        endpoints: pipelineV2Result.output.apiGraph?.endpoints.length,
      });

      // Capture sub-graph outputs for ApplicationGraph construction
      pipelineV2Entities = pipelineV2Result.output.entityGraph?.entities ?? [];
      pipelineV2Relations = pipelineV2Result.output.entityGraph?.relationships ?? [];
      pipelineV2Tables = pipelineV2Result.output.databaseGraph?.tables ?? [];
      pipelineV2Endpoints = pipelineV2Result.output.apiGraph?.endpoints ?? [];
      pipelineV2Workflows = pipelineV2Result.output.workflowGraph?.workflows ?? [];
      pipelineV2Pages = pipelineV2Result.output.navigationGraph?.pages ?? [];
      pipelineV2Capabilities = pipelineV2Result.output.capabilityGraph?.capabilities ?? [];
      pipelineV2Features = pipelineV2Result.output.capabilityGraph?.features ?? [];
      pipelineV2NavItems = pipelineV2Result.output.navigationGraph?.navItems ?? [];

      // Enrich blueprint entities with detailed field definitions from pipeline-v2
      if (pipelineV2Result.output.entityGraph) {
        for (const pv2Entity of pipelineV2Result.output.entityGraph.entities) {
          const existing = breResult.blueprint.entities.find(
            e => e.name.toLowerCase() === pv2Entity.name.toLowerCase(),
          );
          if (existing && pv2Entity.fields.length > (existing.fields?.length ?? 0)) {
            existing.fields = pv2Entity.fields.map(f => ({
              name: f.name,
              type: f.type,
              required: f.required,
              indexed: f.indexed ?? false,
              unique: (f as any).unique ?? false,
            }));
          }
        }
      }

      // Enrich blueprint with database tables
      if (pipelineV2Result.output.databaseGraph) {
        const validEngines = ['postgresql', 'mysql', 'sqlite', 'mongodb', 'supabase', 'firebase'] as const;
        const engine = validEngines.includes(pipelineV2Result.output.databaseGraph.engine as any)
          ? (pipelineV2Result.output.databaseGraph.engine as 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'supabase' | 'firebase')
          : 'postgresql';
        breResult.blueprint.database = {
          engine,
          tables: pipelineV2Result.output.databaseGraph.tables.map(t => ({
            name: t.name,
            columns: t.columns as any,
            indexes: t.indexes,
            foreignKeys: (t as any).foreignKeys ?? [],
          })),
        };
      }

      // Enrich blueprint with API endpoints
      if (pipelineV2Result.output.apiGraph) {
        const existingEndpointPaths = new Set(breResult.blueprint.apis.map(a => a.path));
        for (const ep of pipelineV2Result.output.apiGraph.endpoints) {
          if (!existingEndpointPaths.has(ep.path)) {
            breResult.blueprint.apis.push({
              path: ep.path,
              method: ep.method,
              auth: ep.auth,
              description: ep.description,
            });
          }
        }
      }
    } catch (e: unknown) {
      log.warn('Layer 1b: Pipeline-v2 enrichment failed (continuing with base blueprint)', {
        error: (e as Error).message,
      });
    }
  }

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

  // Layer 5: Build ApplicationGraph + Pass 3 code generation
  const t5 = Date.now();
  const databaseEngine = breResult.blueprint.database?.engine ?? 'postgresql';
  const applicationGraph = buildApplicationGraph({
    entities: pipelineV2Entities,
    entityRelations: pipelineV2Relations,
    tables: pipelineV2Tables,
    endpoints: pipelineV2Endpoints,
    workflows: pipelineV2Workflows,
    pages: pipelineV2Pages,
    capabilities: pipelineV2Capabilities,
    features: pipelineV2Features,
    navItems: pipelineV2NavItems,
    industry: context.industry,
    appName: context.appName ?? 'Application',
    databaseEngine,
  });

  const pass3Result = runPass3CodeGeneration(applicationGraph);
  const graphStats = pass3Result.stats;

  // Merge Pass 3 files into renderResult
  renderResult.files.push(...pass3Result.files);
  renderResult.warnings.push(...pass3Result.warnings);

  log.info('Layer 5: Pass 3 (graph → code) complete', {
    graphNodes: graphStats.nodes,
    graphEdges: graphStats.edges,
    pass3Files: pass3Result.files.length,
    entities: graphStats.entityCount,
    tables: graphStats.tableCount,
    endpoints: graphStats.endpointCount,
    duration: Date.now() - t5,
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
    applicationGraph,
    graphStats,
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
export async function runPipelineForPlatform(
  context: BREContext,
  platform: string,
): Promise<PipelineResult> {
  return runBuildPipeline(context, { platform });
}
