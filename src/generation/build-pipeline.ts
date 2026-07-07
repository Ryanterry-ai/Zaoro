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
import type { Industry } from '../orchestration/types.js';
import { runBREV2Pipeline, type BREv2Result } from '../bos/bre-v2-pipeline.js';
import { buildExecutionBlueprint } from '../bos/execution-planner.js';
import { resolveContent } from '../bos/content-resolver.js';
import { registerRenderer, renderWith, getRegisteredPlatforms, type ComponentSourceRec } from './renderers/index.js';
import { ReactRenderer } from './renderers/react-renderer.js';
import { FlutterRenderer } from './renderers/flutter-renderer.js';
import { PATTERNS, DESIGN_PROFILES } from '../bos/knowledge/registry.js';
import { stageLogger, debugLog } from '../core/debug-logger.js';
import { SkillIntegrator, type DesignRecommendation } from './skill-integrator.js';
import { DesignIntelligenceEngine } from '../orchestration/design-intelligence/engine.js';
import type { DesignDecision } from '../orchestration/design-intelligence/types.js';
import { ProgressEmitter } from '../core/progress-emitter.js';
import { getSkillDiscovery } from '../core/skill-discovery.js';

// Pipeline-v2 enrichment — provides richer entity, DB, and API detail
import { runNormalizedPipeline } from '../bos/pipeline-v2/pipeline.js';
import type { EntityDef, TableDef, EndpointDef, EntityRelation } from '../bos/pipeline-v2/stages.js';

// Pass 3: graph-driven code generation
import { buildApplicationGraph, computeAppGraphStats } from '../bos/graph/application-graph.js';
import type { ApplicationGraph, AppGraphStats } from '../bos/graph/application-graph.js';
import { runPass3CodeGeneration } from './pass3-code-generator.js';

// Knowledge Graph — domain knowledge enrichment
import { initializeKnowledgeGraph, enrichFromKnowledgeGraph } from '../bos/knowledge/seeds/index.js';
import * as path from 'path';

// Spec-first + worktree parallel pipeline
import { writeComponentSpecManifest, loadComponentSpecManifest } from './component-spec-writer.js';
import { WorktreeManager } from './worktree-manager.js';
import { assembleRenderResults, writeAssemblyResult } from './assembly-gate.js';

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

  /** Workspace root directory for spec/worktree artifacts */
  workspaceDir?: string;
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

  /** Domain knowledge enrichment from Knowledge Graph */
  knowledgeEnrichment: {
    additionalCapabilities: string[];
    vocabulary: Record<string, string>;
    domainEntities: string[];
  };

  /** Available platforms */
  availablePlatforms: string[];

  /** Serialized component spec manifest from spec-lock layer */
  componentSpecManifest?: import('./component-spec-writer.js').ComponentSpecManifest;

  /** Assembly result from parallel worktree build */
  assemblyResult?: import('./assembly-gate.js').AssemblyResult;

  /** Worktree names used in the parallel build */
  usedWorktrees?: string[];
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
  progress?: ProgressEmitter,
): Promise<PipelineResult> {
  const {
    platform = 'react',
    includeComments = true,
    includeTests = false,
    outputDir = './workspace/src',
    workspaceDir,
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
  progress?.emit('bre', 'started', 'Running BRE v2 pipeline...');
  const breResult = await runBREV2Pipeline(context, llmConfig, industryScore, progress);
  progress?.emit('bre', 'completed', `BRE v2: ${breResult.blueprint.pages.length} pages, ${breResult.blueprint.entities.length} entities, confidence=${breResult.confidence.toFixed(2)}`, { duration: Date.now() - t1 });
  log.info('Layer 1: BRE v2 complete', {
    pages: breResult.blueprint.pages.length,
    entities: breResult.blueprint.entities.length,
    confidence: breResult.confidence,
    duration: Date.now() - t1,
  });

  // Layer 1a: Knowledge Graph enrichment — domain-specific context
  let knowledgeCapabilities: string[] = [];
  let knowledgeVocabulary: Record<string, string> = {};
  let knowledgeDomainEntities: string[] = [];
  try {
    const t1a = Date.now();
    await initializeKnowledgeGraph();
    const kgResult = enrichFromKnowledgeGraph(context.industry);
    knowledgeCapabilities = kgResult.additionalCapabilities;
    knowledgeVocabulary = kgResult.vocabulary;
    knowledgeDomainEntities = kgResult.domainEntities;
    log.info('Layer 1a: Knowledge Graph enrichment complete', {
      additionalCapabilities: knowledgeCapabilities.length,
      vocabularyTerms: Object.keys(knowledgeVocabulary).length,
      domainEntities: knowledgeDomainEntities.length,
      industry: context.industry,
      duration: Date.now() - t1a,
    });
  } catch (e: unknown) {
    log.warn('Layer 1a: Knowledge Graph enrichment failed (continuing without)', {
      error: (e as Error).message,
    });
  }

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

  // Layer 1c: Build ApplicationGraph from pipeline-v2 sub-graphs + business context
  // This is the canonical IR — built early so all downstream passes can read it.
  const t1c = Date.now();
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
    businessModels: context.businessModels,
    compliancePacks: context.compliancePacks,
    ...(context.subIndustry ? { subIndustry: context.subIndustry } : {}),
    ...(context.country ? { country: context.country } : {}),
    ...(context.audience ? { audience: context.audience } : {}),
  });
  log.info('Layer 1c: ApplicationGraph constructed (canonical IR)', {
    nodes: applicationGraph.nodes.length,
    edges: applicationGraph.edges.length,
    industry: applicationGraph.metadata.industry,
    country: applicationGraph.metadata.country,
    businessModels: applicationGraph.metadata.businessModels,
    duration: Date.now() - t1c,
  });

  // Layer 2: Application Blueprint → Execution Blueprint
  progress?.emit('architect', 'info', 'Building execution blueprint...');
  const t2 = Date.now();
  const executionBlueprint = buildExecutionBlueprint(breResult.blueprint);
  progress?.emit('architect', 'info', `Execution blueprint: ${executionBlueprint.pages.length} pages, ${executionBlueprint.pages.reduce((s, p) => s + p.slots.length, 0)} slots`, { duration: Date.now() - t2 });
  log.info('Layer 2: Execution Blueprint complete', {
    pages: executionBlueprint.pages.length,
    totalSlots: executionBlueprint.pages.reduce((s, p) => s + p.slots.length, 0),
    duration: Date.now() - t2,
  });

  // Layer 2a: Skill Discovery & Integration — UI/UX Pro Max, 21st.dev, Design Intelligence
  progress?.emit('compile', 'info', 'Running skill discovery and design intelligence...');
  const t2a = Date.now();
  let skillRecommendations: DesignRecommendation | undefined;
  let designDecision: DesignDecision | undefined;
  let skillDiscoveryResult: import('../core/skill-discovery.js').DiscoveryResult | undefined;

  // Discover and install required skills
  const requiredSkills = [
    'ui-ux-pro-max',
    'framer-motion',
    'gsap-scrolltrigger',
    'impeccable',
    'high-end-visual-design',
    'frontend-design',
  ];

  try {
    const skillDiscovery = getSkillDiscovery();
    skillDiscoveryResult = await skillDiscovery.discoverAndInstall(requiredSkills);

    if (skillDiscoveryResult.installed.length > 0) {
      progress?.emit('compile', 'info', `Auto-installed skills: ${skillDiscoveryResult.installed.join(', ')}`);
    }

    if (skillDiscoveryResult.missing.length > 0) {
      progress?.emit('compile', 'info', `Missing skills (using defaults): ${skillDiscoveryResult.missing.join(', ')}`);
    }

    log.info('Layer 2a: SkillDiscovery complete', {
      found: skillDiscoveryResult.found.length,
      installed: skillDiscoveryResult.installed.length,
      missing: skillDiscoveryResult.missing.length,
      twentyFirstDevAvailable: skillDiscoveryResult.twentyFirstDevAvailable,
      duration: Date.now() - t2a,
    });
  } catch (e: unknown) {
    log.warn('Layer 2a: SkillDiscovery failed (continuing without)', { error: (e as Error).message });
  }

  try {
    // SkillIntegrator: provides color palettes, typography, layout, animation recommendations
    const skillIntegrator = new SkillIntegrator();
    skillRecommendations = skillIntegrator.getDesignRecommendations(
      context.industry,
      context.subIndustry,
    );
    progress?.emit('compile', 'info', `Skill recommendations: ${skillRecommendations.components.length} components, ${skillRecommendations.uxGuidelines.length} UX guidelines`);
    log.info('Layer 2a: SkillIntegrator complete', {
      industry: context.industry,
      components: skillRecommendations.components.length,
      animationLib: skillRecommendations.animation.library,
      duration: Date.now() - t2a,
    });
  } catch (e: unknown) {
    log.warn('Layer 2a: SkillIntegrator failed (continuing without)', { error: (e as Error).message });
  }

  try {
    // DesignIntelligenceEngine: runs 6 sub-engines for comprehensive design tokens
    const designEngine = new DesignIntelligenceEngine();
    designDecision = designEngine.recommend({
      industry: context.industry as Industry,
      stage: 'frontend',
      artifacts: {},
      subIndustry: context.subIndustry,
      audience: context.audience,
      personality: context.appName,
      bosIndustry: context.industry,
    });
    progress?.emit('compile', 'info', `Design intelligence: ${designDecision.recommendations.length} recommendations`);
    log.info('Layer 2a: DesignIntelligenceEngine complete', {
      recommendations: designDecision.recommendations.length,
      duration: Date.now() - t2a,
    });
  } catch (e: unknown) {
    log.warn('Layer 2a: DesignIntelligenceEngine failed (continuing without)', { error: (e as Error).message });
  }

  // Layer 3: Execution Blueprint → Application Spec (content resolution)
  progress?.emit('compile', 'started', 'Resolving content and generating component specs...');
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
    ...(breResult.revenueIntelligence ? { revenueIntelligence: breResult.revenueIntelligence } : {}),
    ...(skillRecommendations ? { skillRecommendations } : {}),
    ...(designDecision ? { designDecision } : {}),
  });
  progress?.emit('compile', 'completed', `Content resolved: ${applicationSpec.pages.length} pages, ${applicationSpec.pages.reduce((s, p) => s + p.components.length, 0)} components`, { duration: Date.now() - t3 });
  log.info('Layer 3: Content Resolution complete', {
    pages: applicationSpec.pages.length,
    totalComponents: applicationSpec.pages.reduce((s, p) => s + p.components.length, 0),
    duration: Date.now() - t3,
  });

  // Layer 4: Spec-lock + worktree parallel build
  progress?.emit('compile', 'info', 'Writing component specs and running parallel build...');
  const t4 = Date.now();
  let componentSources: ComponentSourceRec[] | undefined = [];
  let renderResult: RenderResult;
  let usedWorktrees: string[] | undefined;
  let componentSpecManifest: import('./component-spec-writer.js').ComponentSpecManifest | undefined;
  let assemblyResult: import('./assembly-gate.js').AssemblyResult | undefined;

  // Spec-lock phase: write component spec manifest
  if (workspaceDir) {
    log.info('Layer 4a: Writing component spec manifest', {
      workspaceDir,
      pages: applicationSpec.pages.length,
      components: applicationSpec.pages.reduce((s, p) => s + p.components.length, 0),
    });
    console.log(`[spec-writer] Writing component spec manifest to ${workspaceDir}`);
    componentSpecManifest = writeComponentSpecManifest(applicationSpec, workspaceDir);
    console.log(`[spec-writer] Manifest written: ${componentSpecManifest.totalComponents} components across ${componentSpecManifest.totalPages} pages`);

    // Distribute specs across worktrees
    const specFilenames = componentSpecManifest.records.map((r, i) => {
      const safePath = r.pagePath.replace(/[\\/:*?"<>|]/g, '_');
      return `${safePath}__${r.componentIndex}__${r.contentHash.slice(0, 12)}.spec.json`;
    });

    const wtManager = new WorktreeManager({
      repoPath: process.cwd(),
      worktreeBase: path.join(workspaceDir, '.worktrees'),
      maxWorktrees: 4,
    });
    wtManager.init();

    const groups = wtManager.distributeSpecs(specFilenames, undefined);

    for (const [groupName, specs] of groups) {
      const wt = await wtManager.createWorktree(groupName, specs);
      console.log(`[worktree] Created worktree '${wt.name}' at ${wt.path} with ${specs.length} specs`);
      usedWorktrees = usedWorktrees || [];
      usedWorktrees.push(wt.name);
    }

    // Each worktree runs renderWith independently on its assigned page group
    const groupEntries = Array.from(groups.entries());
    const assemblyInputs: import('./assembly-gate.js').AssemblyInput[] = [];

    for (let gi = 0; gi < groupEntries.length; gi++) {
      const entry = groupEntries[gi];
      if (!entry) continue;
      const [groupName, _specs] = entry;
      const wtSpec = wtManager.getWorktree(groupName);
      if (!wtSpec) continue;
      const wtPages = applicationSpec.pages.filter(p =>
        _specs.some((s: string) => s.includes(p.path.replace(/[\\/:*?"<>|]/g, '_'))),
      );
      const wtAppSpec = { ...applicationSpec, pages: wtPages };

      try {
        const wtResult = renderWith(wtAppSpec, platform, {
          theme: breResult.blueprint.designTokens as Record<string, unknown>,
          includeComments,
          includeTests,
          outputDir: path.join(wtSpec.path, 'src'),
          componentSources: [],
          // Only the first group generates singleton files (shell, layout, Icon, nav-data)
          skipSingletons: gi > 0,
        });
        wtManager.markReady(groupName);
        console.log(`[worktree] Worktree '${groupName}' completed: ${wtResult.files.length} files`);

        assemblyInputs.push({
          sourceName: groupName,
          files: wtResult.files,
          errors: wtResult.warnings.map(w => `warning: ${w}`),
        });
      } catch (wtErr) {
        const msg = (wtErr as Error).message;
        wtManager.markFailed(groupName, msg);
        console.error(`[worktree] Worktree '${groupName}' failed: ${msg}`);

        assemblyInputs.push({
          sourceName: groupName,
          files: [],
          errors: [msg],
        });
      }
    }

    // Assembly phase: merge worktree results
    console.log(`[assembly] Assembling ${assemblyInputs.length} worktree results`);
    assemblyResult = assembleRenderResults(assemblyInputs);
    console.log(`[assembly] Assembly complete: ${assemblyResult.mergedFiles.size} files, ${assemblyResult.conflicts.length} conflicts`);

    // Write final assembly to the workspace output dir
    renderResult = writeAssemblyResult(assemblyResult, outputDir, workspaceDir);

    // Clean up worktrees
    await wtManager.removeAll();
    console.log(`[assembly] Worktrees cleaned up`);
  } else {
    // Fallback: original single-thread render
    componentSources = [];
    renderResult = renderWith(applicationSpec, platform, {
      theme: breResult.blueprint.designTokens as Record<string, unknown>,
      includeComments,
      includeTests,
      outputDir,
      componentSources: [],
    });
  }

  log.info('Layer 4: Rendering complete', {
    files: renderResult.files.length,
    warnings: renderResult.warnings.length,
    usedWorktrees: usedWorktrees?.length ?? 0,
    duration: Date.now() - t4,
  });

  // Layer 5: Pass 3 code generation from the canonical ApplicationGraph
  // The ApplicationGraph was already built at Layer 1c — Pass 3 reads it as the IR.
  const t5 = Date.now();
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
  progress?.emit('compile', 'completed', `Pipeline complete: ${renderResult.files.length} files generated (${totalDuration}ms)`, { duration: totalDuration, files: renderResult.files.length });
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
    knowledgeEnrichment: {
      additionalCapabilities: knowledgeCapabilities,
      vocabulary: knowledgeVocabulary,
      domainEntities: knowledgeDomainEntities,
    },
    availablePlatforms: getRegisteredPlatforms(),
    ...(componentSpecManifest ? { componentSpecManifest } : {}),
    ...(assemblyResult ? { assemblyResult } : {}),
    ...(usedWorktrees ? { usedWorktrees } : {}),
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
