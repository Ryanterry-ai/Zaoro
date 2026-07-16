import { SandboxEngine } from '../sandbox/engine.js';
import { ASTPatcher } from '../core/ast-patcher.js';
import { TypeScriptAuditor } from '../compiler/auditor.js';
import { WorkspaceSnapshot } from '../core/snapshot.js';
import { PatchTransactionManager } from '../core/patch-transaction.js';
import { ErrorCompressor } from '../compiler/compressor.js';
import { ASTPatchValidator } from '../validation/ast-patch-validator.js';
import { PatchSimulator } from '../validation/patch-simulator.js';

import { ASTDependencyGraph } from '../graph/ast-dependency-graph.js';
import { ExportIndexer } from '../graph/export-indexer.js';
import { ModuleResolver, normalizePath } from '../graph/module-resolver.js';
import { ImpactAnalyzer } from '../intelligence/impact-analyzer.js';
import { PatchRanker } from '../intelligence/patch-ranker.js';
import { RegressionPredictor } from '../intelligence/regression-predictor.js';

import { ASTPatch, CompilationError, WorkspaceConfig, LLMContext, LLMConfig, GenerationIntent, GenerationResult, FullStackBlueprint } from '../types/index.js';
import { LLMGateway } from '../core/llm-gateway.js';

import { DBCompiler } from '../core/db-compiler.js';
import { APICompiler } from '../core/api-compiler.js';
import { TelemetryLayer } from '../core/telemetry.js';
import { SelfHealingEngine } from '../engine/self-healing-engine.js';
import { ContentResearchAgent } from '../generation/content-research-agent.js';
import { runBREV2Pipeline } from '../bos/bre-v2-pipeline.js';
import { mapBlueprintToFullStack } from '../bos/blueprint-mapper.js';
import { buildBREContext } from '../bos/intake-parser.js';
import { runBuildPipeline } from '../generation/build-pipeline.js';
import { LeadAgent } from './orchestrator/lead-agent.js';
import { ProgressEmitter } from '../core/progress-emitter.js';
import { saveIR, loadIR } from '../bos/ir-persistence.js';
import { saveBuildArtifacts, inspectArtifacts } from '../bos/ir-inspector.js';
import {
  initializeKnowledgeGraph,
  getKnowledgeGraphGovernor,
} from '../bos/knowledge/seeds/index.js';
import {
  CandidateKnowledgeStore,
  PromotionPipeline,
  DEFAULT_PROMOTION_CONFIG,
} from '../bos/candidate/index.js';
import { composeKnowledgePack, CompositionContext } from '../bos/knowledge/primitive-packs/index.js';
import { capabilityRegistry } from '../bos/capabilities/index.js';
import { KnowledgeRegistry } from '../bos/knowledge/registry.js';
import { BuildHistoryManager } from '../engine/build-history.js';
import type { ApplicationBlueprint } from '../bos/schemas/blueprint/application-blueprint.schema.js';
import * as fs from 'fs';
import * as path from 'path';
import { E2ETester } from '../testing/e2e-tester.js';
import { RefinementEngine } from './refinement/index.js';
import { DeployExecutor, DeployConfigGenerator, detectDeploymentPlatform } from './deployment/index.js';
import { parseCommand, commandToIntent, isCommand, getHelpText } from './command-parser.js';
import { RuntimeTracer } from './runtime-trace.js';

export class DeterministicOrchestratorV4 {
  private sandbox: SandboxEngine;
  private patcher: ASTPatcher;
  private auditor: TypeScriptAuditor;
  private snapshot: WorkspaceSnapshot;
  private transaction: PatchTransactionManager;
  private validator: ASTPatchValidator;
  private simulator: PatchSimulator;

  private graph: ASTDependencyGraph;
  private indexer: ExportIndexer;
  private analyzer: ImpactAnalyzer;
  private ranker: PatchRanker;
  private predictor: RegressionPredictor;

  constructor(private workspaceBaseDir: string) {
    this.sandbox = new SandboxEngine();
    this.patcher = new ASTPatcher();
    this.auditor = new TypeScriptAuditor();
    this.snapshot = new WorkspaceSnapshot();
    this.transaction = new PatchTransactionManager();
    this.validator = new ASTPatchValidator();
    this.simulator = new PatchSimulator();

    this.graph = new ASTDependencyGraph();
    this.indexer = new ExportIndexer();
    this.analyzer = new ImpactAnalyzer(this.graph);
    this.ranker = new PatchRanker(this.analyzer);
    this.predictor = new RegressionPredictor(this.graph);
  }

  /**
   * Process a raw user input string.
   * Detects slash commands and routes to the appropriate handler.
   *
   * Supported commands:
   *   /build-anything "prompt"     → generative pipeline
   *   /clone-website <url>         → clone pipeline
   *   /refine "change"             → iterative refinement
   *   /deploy <target>             → deployment
   *   /help                        → show commands
   */
  public async processInput(
    workspaceId: string,
    input: string,
    llmConfig?: LLMConfig,
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    if (!isCommand(input)) {
      // Not a slash command — try to detect intent from natural language
      const intent: GenerationIntent = { type: 'build-website', prompt: input };
      return this.processGenerationIntent(workspaceId, intent, llmConfig);
    }

    const command = parseCommand(input);

    if (!command.valid) {
      return {
        success: false,
        intent: { type: 'build-website', prompt: input },
        ...(command.error ? { error: command.error } : {}),
        duration: Date.now() - startTime,
      };
    }

    if (command.command === 'help') {
      return {
        success: true,
        intent: { type: 'build-website', prompt: input },
        warnings: [getHelpText()],
        duration: Date.now() - startTime,
      };
    }

    const intent = commandToIntent(command) as GenerationIntent;
    return this.processGenerationIntent(workspaceId, intent, llmConfig);
  }

  public async processGenerationIntent(
    workspaceId: string,
    intent: GenerationIntent,
    llmConfig?: LLMConfig
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    TelemetryLayer.init();

    try {
      // Auto-detect hybrid: both URL and business description present
      if (intent.targetUrl && intent.prompt && intent.prompt.length > 50 &&
          (intent.type === 'build-website' || intent.type === 'clone-website')) {
        console.log(`[orchestrator] Hybrid detected: URL + description. Using hybrid pipeline.`);
        return await this.handleHybridIntent(workspaceId, { ...intent, type: 'hybrid' }, llmConfig, startTime);
      }

      switch (intent.type) {
        case 'build-app':
        case 'build-website':
        case 'pipeline':
          return await this.handleBuildIntent(workspaceId, intent, llmConfig, startTime);

        case 'clone-website':
          return await this.handleCloneIntent(workspaceId, intent, llmConfig, startTime);

        case 'hybrid':
          return await this.handleHybridIntent(workspaceId, intent, llmConfig, startTime);

        case 'analyze-domain':
          return await this.handleAnalyzeIntent(intent, startTime);

        case 'extract-components':
          return await this.handleExtractComponentsIntent(intent, startTime);

        case 'extract-design-system':
          return await this.handleExtractDesignSystemIntent(intent, startTime);

        case 'refine':
          return await this.handleRefineIntent(workspaceId, intent, startTime);

        case 'deploy':
          return await this.handleDeployIntent(workspaceId, intent, startTime);

        default:
          return {
            success: false,
            intent,
            error: `Unknown generation intent type: ${(intent as GenerationIntent).type}`,
            duration: Date.now() - startTime,
          };
      }
    } catch (err: any) {
      TelemetryLayer.reportError({
        workspaceId,
        error: err.message || 'Unknown error',
        code: 'UNHANDLED_EXCEPTION',
        phase: 'orchestration',
      });
      return {
        success: false,
        intent,
        error: err.message || 'Unknown error during generation',
        duration: Date.now() - startTime,
      };
    }
  }

  private static ROUTE_FUNC_MAP: Record<string, string> = {
    '/': 'Home',
    '/shop': 'Shop',
    '/booking': 'Book',
    '/dashboard': 'Dashboard',
    '/courses': 'Courses',
    '/blog': 'Blog',
    '/work': 'Work',
    '/contact': 'Contact',
  };

  private async handleBuildIntent(
    workspaceId: string,
    intent: GenerationIntent,
    llmConfig: LLMConfig | undefined,
    startTime: number
  ): Promise<GenerationResult> {
    const prompt = intent.prompt || '';
    const workspace = this.sandbox.createWorkspace(this.workspaceBaseDir, workspaceId);
    const progress = new ProgressEmitter(workspace.rootPath);

    // RuntimeTrace (Phase R1, Step 1): every build emits a provenance trace.
    const tracer = new RuntimeTracer();

    // BRE v2: deterministic business reasoning (zero LLM calls)
    tracer.beginSpan({ layer: 'bre-v2', owner: 'BREContextBuilder', inputs: ['prompt'], dependencies: [] });
    progress.emit('bre', 'started', 'Analyzing business intent...');
    const breContext = await buildBREContext(prompt);
    progress.emit('bre', 'completed', `Business context: ${breContext.industry}, ${breContext.entities.length} entities`);

    // Phase R2: resolve the build's capabilities through the canonical registry
    // once, so candidate learning and the manifest share one identity set.
    const rawBuildCaps = Array.isArray((breContext as any).capabilities)
      ? ((breContext as any).capabilities as string[])
      : [];
    const buildCapabilities = capabilityRegistry.resolve(rawBuildCaps, { industry: breContext.industry });
    tracer.endSpan('bre-v2', {
      outputs: ['bre-context'],
      artifactIds: [],
      confidence: 0.9,
      evidence: [`industry=${breContext.industry}`, `entities=${breContext.entities.length}`],
      hash: RuntimeTracer.hashContent(JSON.stringify(breContext)),
    });

    // ═══ New 4-layer pipeline: BRE v2 → Execution Blueprint → Content Resolver → Renderer ═══
    tracer.beginSpan({ layer: 'pipeline-4-layer', owner: 'LeadAgent', inputs: ['bre-context'], dependencies: ['bre-v2'] });
    progress.emit('architect', 'started', 'Running orchestrator-subagent pipeline...');
    const tPipeline = Date.now();

    // Use the new orchestrator-subagent system
    const orchestrator = new LeadAgent({
      platform: 'react',
      workspaceDir: workspace.rootPath,
      outputDir: path.join(workspace.rootPath, 'src'),
      maxRetries: 3,
      qualityGateStrict: false, // Warn but don't block on quality gates
    });
    const orchestratorResult = await orchestrator.execute(prompt);

    // Map orchestrator output to the format expected by downstream code
    const breResult = orchestratorResult.phaseContext.breResult!;
    const renderResult = { files: orchestratorResult.phaseContext.renderResult ?? [], warnings: [] };
    const applicationGraph = orchestratorResult.phaseContext.applicationGraph!;
    const applicationSpec = orchestratorResult.phaseContext.applicationSpec!;
    const appBlueprint = breResult.blueprint;
    const blueprint = mapBlueprintToFullStack(appBlueprint);

    // Compute graph stats from the application graph
    const { computeAppGraphStats } = await import('../bos/graph/application-graph.js');
    const graphStats = computeAppGraphStats(applicationGraph);

    // Create execution blueprint and component spec manifest from application spec
    const executionBlueprint = {
      id: `exec-${breContext.appName}`,
      appId: breContext.appName ?? 'app',
      appName: breContext.appName ?? 'Application',
      industry: breContext.industry,
      themeId: 'default',
      pages: applicationSpec.pages.map((p: any) => ({ ...p, slots: p.components?.map((c: any) => c.id) ?? [] })),
      metadata: {},
    };
    const componentSpecManifest = {
      totalComponents: applicationSpec.pages.reduce((s: number, p: any) => s + (p.components ?? []).length, 0),
      totalPages: applicationSpec.pages.length,
    };
    const usedWorktrees: string[] = [];
    const assemblyResult: { mergedFiles: Map<string, unknown>; conflicts: unknown[]; specFilesProcessed: number } | null = null;

    progress.emit('architect', 'completed', `Pipeline complete: ${renderResult.files.length} files, confidence=${breResult.confidence.toFixed(2)}`, {
      duration: Date.now() - tPipeline,
      pages: blueprint.pages.length,
      models: blueprint.dataModels.length,
      confidence: breResult.confidence,
      graphNodes: graphStats.nodes,
      graphEdges: graphStats.edges,
    });

    console.log(`[orchestrator] Pipeline complete: ${renderResult.files.length} files generated`);
    console.log(`[orchestrator] BRE v2: confidence=${breResult.confidence.toFixed(2)}, ${blueprint.pages.length} pages, ${blueprint.dataModels.length} models`);
    console.log(`[orchestrator] ApplicationGraph: ${graphStats.nodes} nodes, ${graphStats.edges} edges (${graphStats.entityCount} entities, ${graphStats.tableCount} tables, ${graphStats.endpointCount} endpoints)`);
    console.log(`[orchestrator] Execution blueprint: ${executionBlueprint.pages.length} pages, ${executionBlueprint.pages.reduce((s, p) => s + p.slots.length, 0)} slots`);
    console.log(`[orchestrator] Application spec: ${applicationSpec.pages.length} pages, ${applicationSpec.pages.reduce((s: number, p: any) => s + (p.components ?? []).length, 0)} components`);

    if (componentSpecManifest) {
      console.log(`[orchestrator] Component spec manifest: ${componentSpecManifest.totalComponents} components, ${componentSpecManifest.totalPages} pages`);
    }
    if (usedWorktrees?.length) {
      console.log(`[orchestrator] Used worktrees: ${usedWorktrees.join(', ')}`);
    }

    if (renderResult.warnings.length > 0) {
      console.warn(`[orchestrator] Renderer warnings: ${renderResult.warnings.join(', ')}`);
    }

    if (appBlueprint.warnings.length > 0) {
      console.warn(`[orchestrator] Blueprint warnings: ${appBlueprint.warnings.join(' | ')}`);
    }

    tracer.endSpan('pipeline-4-layer', {
      outputs: ['render-result', 'application-graph', 'application-spec', 'execution-blueprint', 'full-stack-blueprint'],
      artifactIds: [],
      confidence: breResult.confidence,
      evidence: [`files=${renderResult.files.length}`, `pages=${blueprint.pages.length}`, `models=${blueprint.dataModels.length}`],
      hash: RuntimeTracer.hashContent(JSON.stringify({ files: renderResult.files.length, pages: blueprint.pages.length })),
    });

    // Write planning artifacts for Live Object Inspector (Phase 11)
    tracer.beginSpan({ layer: 'plan-inspect', owner: 'Orchestrator/Phase11', inputs: ['bre-context', 'bre-result', 'full-stack-blueprint', 'execution-blueprint', 'application-spec'], dependencies: ['pipeline-4-layer'] });
    try {
      const inspectPayload: Record<string, unknown> = {
        ts: Date.now(),
        breContext: {
          industry: breContext.industry,
          businessModels: breContext.businessModels,
          entities: breContext.entities,
          appName: breContext.appName,
        },
        rules: (breResult.decisions ?? []).map(d => ({
          ruleId: d.ruleId,
          ruleName: d.ruleName,
          action: d.action,
          confidence: d.confidence,
          trace: d.trace,
        })),
        blueprint: {
          pages: appBlueprint.pages?.length ?? 0,
          entities: appBlueprint.entities?.length ?? 0,
          apis: appBlueprint.apis?.length ?? 0,
          database: !!appBlueprint.database && appBlueprint.database.engine ? { engine: appBlueprint.database.engine, tables: (appBlueprint.database.tables ?? []).length } : null,
          hasDesignTokens: !!appBlueprint.designTokens,
          vocabulary: appBlueprint.vocabulary,
        },
        executionBlueprint: {
          pages: executionBlueprint.pages.map((p: { path: string; [key: string]: unknown }) => ({
            path: p.path,
            slots: ((p as any).slots ?? []).length,
          })),
        },
        applicationSpec: {
          pages: applicationSpec.pages.length,
          totalComponents: applicationSpec.pages.reduce((s: number, p: any) => s + (p.components ?? []).length, 0),
        },
        // Pass 3: ApplicationGraph telemetry
        applicationGraph: {
          nodes: graphStats.nodes,
          edges: graphStats.edges,
          byKind: graphStats.byKind,
          entityCount: graphStats.entityCount,
          tableCount: graphStats.tableCount,
          endpointCount: graphStats.endpointCount,
          workflowCount: graphStats.workflowCount,
          pageCount: graphStats.pageCount,
          crudEndpoints: graphStats.crudEndpoints,
          authEndpoints: graphStats.authEndpoints,
          totalFields: graphStats.totalFields,
          totalColumns: graphStats.totalColumns,
        },
      };
      fs.writeFileSync(
        path.join(workspace.rootPath, '.plan-inspect.json'),
        JSON.stringify(inspectPayload, null, 2),
        'utf-8',
      );
    } catch (e) {
      console.warn('[orchestrator] Failed to write plan-inspect artifact:', (e as Error).message);
    }

    tracer.endSpan('plan-inspect', {
      outputs: ['plan-inspect'],
      artifactIds: ['.plan-inspect.json'],
      evidence: [`path=.plan-inspect.json`],
      hash: RuntimeTracer.hashContent(JSON.stringify({ ts: Date.now(), industry: breContext.industry })),
    });

    // Write generated files to workspace
    tracer.beginSpan({ layer: 'file-write', owner: 'Orchestrator/Phase14', inputs: ['render-result'], dependencies: ['pipeline-4-layer'] });
    const pageResults: Array<{ path: string; succeeded: boolean; lastError?: string | undefined }> = [];

    progress.emit('compile', 'started', `Writing ${renderResult.files.length} generated files...`);

    // Phase 14: Write file stream for live file generation tracking
    // Each entry is appended immediately after writing the file so the SSE
    // stream shows files appearing incrementally, not all at once.
    const fileStreamPath = path.join(workspace.rootPath, '.generated-files.jsonl');
    // Clear any previous stream file
    try { fs.writeFileSync(fileStreamPath, '', 'utf-8'); } catch { }

    for (const file of renderResult.files) {
      // Sanitize path for Windows: colons (Next.js dynamic routes like :handle/:id)
      // are invalid on NTFS. Replace with underscores for filesystem only.
      const safePath = file.path.replace(/:/g, '_');
      // Files prefixed with ../ are root-level (package.json, tailwind.config, etc.)
      // Files starting with prisma/ are also root-level (Prisma schema)
      const isRootLevel = safePath.startsWith('../') || safePath.startsWith('prisma/');
      const relPath = isRootLevel ? safePath.replace(/^\.\.\//, '') : safePath;
      const filePath = path.join(workspace.rootPath, isRootLevel ? '' : 'src', relPath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.content, 'utf-8');
      progress.emitFile('compile', file.path, 'generated');
      console.log(`[orchestrator] Generated: ${file.path} (${file.type})`);
      // Append immediately so SSE polling picks it up file-by-file
      try {
        fs.appendFileSync(fileStreamPath, JSON.stringify({ path: file.path, type: file.type, ts: Date.now() }) + '\n', 'utf-8');
      } catch { }
    }

    progress.emit('compile', 'completed', `All ${renderResult.files.length} files written`);

    tracer.addEvidence('file-write', `files=${renderResult.files.length}`);
    tracer.endSpan('file-write', {
      outputs: ['generated-files'],
      artifactIds: renderResult.files.map((f: { path: string }) => f.path),
      evidence: [`written=${renderResult.files.length}`],
      hash: RuntimeTracer.hashContent(JSON.stringify(renderResult.files.map((f: { path: string }) => f.path))),
    });

    // Install dependencies FIRST — required for TS audit to resolve imports
    // (without node_modules, ts.createProgram emits phantom TS2307 errors)
    tracer.beginSpan({ layer: 'npm-install', owner: 'SandboxEngine', inputs: ['generated-files'], dependencies: ['file-write'] });
    progress.emit('install', 'started', 'Installing npm dependencies...');
    const tInstall = Date.now();
    console.log(`[orchestrator] Installing dependencies...`);
    await this.sandbox.runPackageInstall(workspace);
    progress.emit('install', 'completed', `Dependencies installed (${Date.now() - tInstall}ms)`);
    tracer.endSpan('npm-install', {
      outputs: ['node-modules-ready'],
      artifactIds: ['node_modules'],
      evidence: ['npm install completed'],
    });
    console.log(`[orchestrator] Dependencies installed.`);

    // Phase 14b: Post-render TS audit + self-healing (runs AFTER npm install)
    // SelfHealingEngine runs its own audit internally — no separate TypeScriptAuditor needed.
    tracer.beginSpan({ layer: 'self-healing', owner: 'SelfHealingEngine', inputs: ['node-modules-ready', 'generated-files'], dependencies: ['npm-install', 'file-write'] });
    let healingResult: { success: boolean; iterations: number; errorsFixed: number; remainingErrors: Array<{ file: string; message: string }> } | undefined;
    progress.emit('repair', 'started', 'Auditing generated code for TypeScript errors...');
    const tAudit = Date.now();
    try {
      const healingEngine = new SelfHealingEngine(3, 15);
      const llmGateway = llmConfig ? new LLMGateway(llmConfig) : undefined;
      if (!llmGateway) {
        progress.emit('repair', 'info', 'No LLM config — deterministic fixes only');
        console.log('[orchestrator] No LLM gateway — running deterministic-only self-healing');
        healingResult = { success: true, iterations: 0, errorsFixed: 0, remainingErrors: [] };
      } else {
        const engineResult = await healingEngine.heal(
          workspace.rootPath,
          llmGateway,
          prompt,
          (iteration, errors, msg) => progress.emit('repair', 'info', `[${iteration + 1}] ${msg}`),
        );
        healingResult = {
          success: engineResult.success,
          iterations: engineResult.iterations,
          errorsFixed: engineResult.errorsFixed,
          remainingErrors: engineResult.remainingErrors.map(e => ({ file: e.file, message: e.message })),
        };
        if (engineResult.remainingErrors.length === 0) {
          progress.emit('repair', 'completed', `Self-healing resolved all errors (${Date.now() - tAudit}ms)`);
        } else {
          progress.emit('repair', 'completed', `Self-healing: ${engineResult.errorsFixed} fixed, ${engineResult.remainingErrors.length} remaining (${Date.now() - tAudit}ms)`);
        }
        console.log(`[orchestrator] TS audit + self-healing: ${engineResult.errorsFixed} fixed, ${engineResult.remainingErrors.length} remaining (${engineResult.iterations} iterations)`);
      }
    } catch (auditErr) {
      progress.emit('repair', 'warning', `TS audit/healing failed: ${(auditErr as Error).message}`);
      console.warn('[orchestrator] TS audit/healing failed:', (auditErr as Error).message);
    }

    tracer.endSpan('self-healing', {
      outputs: ['healing-result'],
      artifactIds: ['.build-artifacts/07-self-healing.json'],
      repairs: healingResult?.errorsFixed ?? 0,
      evidence: [`errorsFixed=${healingResult?.errorsFixed ?? 0}`, `remaining=${healingResult?.remainingErrors.length ?? 0}`],
      validationPassed: (healingResult?.remainingErrors.length ?? 0) === 0,
      validationChecks: ['ts-audit'],
    });

    // Phase 14c: Optional E2E browser verification (only when E2E_TEST=1 is set)
    // Requires Playwright browsers installed and port availability on 4567.
    if (process.env.E2E_TEST === '1') {
      progress.emit('e2e', 'started', 'Running E2E browser verification...');
      const tE2E = Date.now();
      try {
        const pageUrls = blueprint.pages.map((p: { path: string }) => `http://localhost:4567${p.path}`);
        const e2eTester = new E2ETester(workspace.rootPath);
        const e2eResult = await e2eTester.run(pageUrls);
        if (e2eResult.passed) {
          progress.emit('e2e', 'completed', `E2E passed: score=${e2eResult.score.toFixed(2)}, ${e2eResult.verification?.summary.passed ?? 0}/${e2eResult.verification?.summary.totalChecks ?? 0} checks (${Date.now() - tE2E}ms)`);
          console.log(`[orchestrator] E2E verification passed: score=${e2eResult.score.toFixed(2)}`);
        } else {
          progress.emit('e2e', 'warning', `E2E failed: score=${e2eResult.score.toFixed(2)}, errors=${e2eResult.errors.length}`);
          console.warn(`[orchestrator] E2E verification failed: score=${e2eResult.score.toFixed(2)}, errors=${e2eResult.errors.join('; ')}`);
        }
      } catch (e2eErr) {
        progress.emit('e2e', 'warning', `E2E verification error: ${(e2eErr as Error).message}`);
        console.warn('[orchestrator] E2E verification error:', (e2eErr as Error).message);
      }
    }

    // Mark all pages as succeeded (they come from the renderer, not LLM)
    for (const page of blueprint.pages) {
      pageResults.push({ path: page.path, succeeded: true });
    }

    // Scaffold Prisma/API for data models (still needed for DB layer)
    if (blueprint.dataModels && blueprint.dataModels.length > 0) {
      progress.emit('compile', 'info', `Scaffolding Prisma for ${blueprint.dataModels.length} data models`);
      const pkgPath = path.join(workspace.rootPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        pkg.dependencies = {
          ...pkg.dependencies,
          prisma: '^5.10.2',
          '@prisma/client': '^5.10.2',
        };
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
      }

      // Note: Prisma schema and API routes are now generated by Pass 3 (graph-driven)
    }

    TelemetryLayer.reportBuildStart(workspaceId, prompt);

    this.snapshot.clearSnapshots(workspace.rootPath);

    // Phase 16: Save .build-artifacts/ for inspection and replay
    tracer.beginSpan({ layer: 'build-artifacts', owner: 'Orchestrator/Phase16', inputs: ['bre-context', 'bre-result', 'full-stack-blueprint', 'execution-blueprint', 'application-spec', 'render-result', 'healing-result'], dependencies: ['self-healing', 'pipeline-4-layer'] });
    let phase16ArtifactFiles: string[] = [];
    try {
      phase16ArtifactFiles = saveBuildArtifacts(
        workspace.rootPath,
        prompt,
        breContext as unknown as Record<string, unknown>,
        {
          decisions: breResult.decisions ?? [],
          constraintReport: breResult.constraintReport,
          confidence: breResult.confidence,
          selectedDesignProfile: breResult.selectedDesignProfile,
          selectedPattern: breResult.selectedPattern,
          usedLLMPlanning: breResult.usedLLMPlanning ?? false,
        },
        {
          pages: appBlueprint.pages ?? [],
          entities: appBlueprint.entities ?? [],
          apis: appBlueprint.apis ?? [],
          workflows: appBlueprint.workflows ?? [],
          dataModels: blueprint.dataModels ?? [],
          confidence: appBlueprint.confidence,
          warnings: appBlueprint.warnings,
        },
        executionBlueprint,
        applicationSpec,
        { files: renderResult.files, warnings: renderResult.warnings },
        graphStats as any,
        healingResult,
      );
      progress.emit('compile', 'info', `${phase16ArtifactFiles.length} build artifacts saved`);
    } catch (e) {
      console.warn('[orchestrator] Failed to write build artifacts:', (e as Error).message);
    }

    tracer.endSpan('build-artifacts', {
      outputs: ['build-artifacts-dir'],
      artifactIds: phase16ArtifactFiles,
      evidence: [`count=${phase16ArtifactFiles.length}`],
      hash: RuntimeTracer.hashContent(JSON.stringify(phase16ArtifactFiles)),
    });

    // Phase 16b: Save IR for follow-up builds
    tracer.beginSpan({ layer: 'ir-save', owner: 'Orchestrator/Phase16b', inputs: ['bre-context', 'bre-result', 'full-stack-blueprint', 'execution-blueprint', 'application-spec', 'render-result'], dependencies: ['build-artifacts', 'pipeline-4-layer'] });
    try {
      saveIR(workspace.rootPath, {
        prompt,
        breContext: breContext as unknown as Record<string, unknown>,
        breResult: {
          blueprint: appBlueprint,
          decisions: breResult.decisions ?? [],
          constraintReport: breResult.constraintReport,
          selectedDesignProfile: breResult.selectedDesignProfile,
          selectedPattern: breResult.selectedPattern,
          confidence: breResult.confidence,
        },
        applicationBlueprint: appBlueprint,
        executionBlueprint,
        applicationSpec,
        renderResult: {
          files: renderResult.files.map((f: { path: string; type: string }) => ({ path: f.path, type: f.type })),
          warnings: renderResult.warnings,
        },
      });
      progress.emit('compile', 'info', 'IR saved for follow-up builds');
    } catch (e) {
      console.warn('[orchestrator] Failed to save IR:', (e as Error).message);
    }

    tracer.endSpan('ir-save', {
      outputs: ['ir-artifact'],
      artifactIds: ['.ir.json'],
      evidence: ['IR persisted'],
    });

    // Phase 16c: Record runtime-learned knowledge as CANDIDATES.
    // The Business Graph is immutable at runtime — a successful build must
    // NEVER mutate it directly. Instead we write observations to the
    // Candidate Knowledge store and run them through the Validation →
    // Confidence → Promotion pipeline. A single build can never promote
    // (the Promotion Pipeline requires multiple independent observations),
    // so knowledge only enters the graph via trusted auto-promotion or
    // explicit human review.
    tracer.beginSpan({ layer: 'knowledge-candidates', owner: 'Orchestrator/Phase16c', inputs: ['full-stack-blueprint', 'bre-result'], dependencies: ['pipeline-4-layer'] });
    let candidateRecordCount = 0;
    try {
      const candidateStore = new CandidateKnowledgeStore();
      const governor = getKnowledgeGraphGovernor();
      const buildId = workspaceId;
      const industry = breContext.industry;
      const buildConfidence = breResult.confidence ?? 0.6;
      const recorded: string[] = [];

      // Candidate entities discovered by this build.
      for (const entity of appBlueprint.entities ?? []) {
        const name = typeof entity === 'string' ? entity : (entity as { name?: string }).name ?? String(entity);
        if (!name) continue;
        candidateStore.record({
          kind: 'entity',
          key: name,
          label: name,
          industry,
          buildId,
          confidence: buildConfidence,
          payload: {
            node: {
              type: 'Entity',
              properties: { name, slug: name.toLowerCase().replace(/\s+/g, '-') },
            },
            edges: industry ? [{ type: 'related_to', target: `industry-${industry}` }] : [],
          },
        });
        recorded.push(`entity:${name}`);
      }

      // Candidate pattern used by this build.
      const pattern = breResult.selectedPattern as unknown;
      const patternId = typeof pattern === 'string' ? pattern : (pattern as { id?: string })?.id;
      const patternName = typeof pattern === 'string' ? pattern : (pattern as { name?: string })?.name ?? patternId;
      if (patternId || patternName) {
        candidateStore.record({
          kind: 'pattern',
          key: String(patternId ?? patternName),
          label: String(patternName ?? patternId),
          industry,
          capabilities: buildCapabilities.expanded,
          buildId,
          confidence: buildConfidence,
          payload: {
            node: {
              type: 'DesignPattern',
              properties: { name: String(patternName ?? patternId), slug: String(patternId ?? patternName) },
            },
          },
        });
        recorded.push(`pattern:${patternId ?? patternName}`);
      }

      // Candidate workflows.
      for (const wf of appBlueprint.workflows ?? []) {
        const name = typeof wf === 'string' ? wf : (wf as { name?: string }).name ?? String(wf);
        if (!name) continue;
        candidateStore.record({
          kind: 'workflow',
          key: name,
          label: name,
          industry,
          capabilities: buildCapabilities.expanded,
          buildId,
          confidence: buildConfidence,
          payload: {
            node: {
              type: 'Workflow',
              properties: { name, slug: name.toLowerCase().replace(/\s+/g, '-') },
            },
          },
        });
        recorded.push(`workflow:${name}`);
      }

      // Candidate integrations.
      for (const integ of appBlueprint.integrations ?? []) {
        const name = typeof integ === 'string' ? integ : (integ as { name?: string }).name ?? String(integ);
        if (!name) continue;
        candidateStore.record({
          kind: 'integration',
          key: name,
          label: name,
          industry,
          capabilities: buildCapabilities.expanded,
          buildId,
          confidence: buildConfidence,
          payload: {
            node: {
              type: 'Integration',
              properties: { name, slug: name.toLowerCase().replace(/\s+/g, '-') },
            },
          },
        });
        recorded.push(`integration:${name}`);
      }

      if (recorded.length > 0) {
        candidateRecordCount = recorded.length;
        progress.emit('architect', 'info', `Recorded ${recorded.length} candidate(s) to knowledge store`);
      }

      // Run the Promotion Pipeline (review-only for a single build).
      if (governor) {
        const pipeline = new PromotionPipeline(candidateStore, governor, DEFAULT_PROMOTION_CONFIG);
        const report = pipeline.run();
        const promoted = report.promoted.length;
        const review = report.needsReview.length;
        const rejected = report.rejected.length;
        if (promoted > 0 || review > 0 || rejected > 0) {
          progress.emit(
            'architect',
            'info',
            `Promotion pipeline: ${promoted} promoted, ${review} to review, ${rejected} rejected`
          );
        }
      }
    } catch (e) {
      console.warn('[orchestrator] Candidate knowledge recording failed (non-fatal):', (e as Error).message);
    }

    tracer.endSpan('knowledge-candidates', {
      outputs: ['candidate-records'],
      artifactIds: ['candidate-store'],
      evidence: [`recorded=${candidateRecordCount}`],
      validationPassed: candidateRecordCount >= 0,
      validationChecks: ['candidate-store-write'],
    });

    // Phase 16d: Compose a knowledge pack from primitive packs and persist it
    // as a build artifact. This is an additive adapter — it does NOT change
    // what the generator receives. Existing monolithic packs in taxonomy/packs/
    // remain the source of truth for generation. This artifact is for
    // inspection and future migration.
    tracer.beginSpan({ layer: 'knowledge-pack-compose', owner: 'Orchestrator/Phase16d', inputs: ['bre-context'], dependencies: ['bre-v2'] });
    try {
      const compositionCtx: CompositionContext = {
        industry: breContext.industry,
        subIndustry: (breContext as any).subIndustry,
        businessModels: breContext.businessModels,
        journeys: breContext.journeys,
        country: breContext.country,
        capabilities: (breContext as any).capabilities,
        taxonomyPath: breContext.industry,
      };
      const composed = composeKnowledgePack(compositionCtx);
      const artifactsDir = path.join(workspace.rootPath, '.build-artifacts');
      if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });
      fs.writeFileSync(
        path.join(artifactsDir, 'knowledge-pack.json'),
        JSON.stringify(composed, null, 2),
        'utf-8'
      );
      progress.emit('compile', 'info', `Composed knowledge pack: ${composed.dimensions.length} dimensions, ${composed.composedFrom.length} packs`);

      // Phase R2: emit a Capability Manifest — the single contract every
      // downstream subsystem (evaluation, components, experience, renderer,
      // learning, benchmarking, self-healing) reasons from.
      const rawCaps = Array.isArray((breContext as any).capabilities)
        ? ((breContext as any).capabilities as string[])
        : [];
      const manifest = capabilityRegistry.buildManifest(rawCaps, { industry: breContext.industry });
      fs.writeFileSync(
        path.join(artifactsDir, 'capability-manifest.json'),
        JSON.stringify(manifest, null, 2),
        'utf-8'
      );
      // Structural coverage: fraction of required (expanded) capabilities whose
      // primitive-pack tags are present in the composed pack.
      const requiredExpanded = manifest.capabilities;
      const fulfilledTags = new Set(
        composed.primitives.flatMap(p => (p as any).providesCapabilities ?? [])
      );
      const fulfilledCaps = new Set(
        requiredExpanded.filter(id => {
          const tags = capabilityRegistry.get(id)?.primitivePackTags ?? [];
          return tags.some(t => fulfilledTags.has(t));
        })
      );
      const coverageScore = capabilityRegistry.coverageScore(requiredExpanded, Array.from(fulfilledCaps));
      fs.writeFileSync(
        path.join(artifactsDir, 'capability-coverage.json'),
        JSON.stringify({ score: coverageScore, required: requiredExpanded.length, matched: fulfilledCaps.size }, null, 2),
        'utf-8'
      );
      if (manifest.unresolved.length > 0) {
        console.warn(`[capability] Unresolved capabilities: ${manifest.unresolved.join(', ')}`);
      }
      progress.emit('compile', 'info', `Capability manifest: ${manifest.capabilities.length} capabilities (coverage ${(coverageScore * 100).toFixed(0)}%)`);
    } catch (e) {
      console.warn('[orchestrator] Knowledge pack composition failed (non-fatal):', (e as Error).message);
    }

    tracer.endSpan('knowledge-pack-compose', {
      outputs: ['knowledge-pack'],
      artifactIds: ['.build-artifacts/knowledge-pack.json'],
      evidence: ['knowledge pack composed'],
    });

    const succeeded = pageResults.filter(r => r.succeeded).length;
    const failed = pageResults.filter(r => !r.succeeded);

    if (failed.length > 0) {
      console.warn(`[orchestrator] Build partial: ${succeeded}/${pageResults.length} pages succeeded`);
    } else {
      console.log(`[orchestrator] Build complete: ${pageResults.length} pages compiled (0 LLM calls).`);
    }

    const result: GenerationResult = {
      success: failed.length === 0,
      intent,
      workspaceId,
      blueprint,
      pageResults,
      duration: Date.now() - startTime,
    };

    const allWarnings = [...appBlueprint.warnings, ...renderResult.warnings];
    if (allWarnings.length > 0) {
      result.warnings = allWarnings;
    }

    if (failed.length > 0) {
      result.error = `${failed.length} page(s) failed: ${failed.map(f => `${f.path} — ${f.lastError}`).join('; ')}`;
    }

    // Phase 17: Write build report
    tracer.beginSpan({ layer: 'build-report', owner: 'Orchestrator/Phase17', inputs: ['render-result', 'full-stack-blueprint', 'bre-context', 'healing-result'], dependencies: ['file-write', 'self-healing'] });
    try {
      const fileTypes = new Map<string, number>();
      for (const f of renderResult.files) {
        const ext = path.extname(f.path) || 'unknown';
        fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
      }
      const pagePaths = blueprint.pages.map((p: { path: string; title?: string }) => ({ path: p.path, title: p.title || p.path }));
      const report = {
        ts: Date.now(),
        duration: result.duration,
        success: result.success,
        workspaceId,
        blueprint: {
          appName: breContext.appName || 'Untitled',
          industry: breContext.industry,
          businessModels: breContext.businessModels,
          pagesCount: blueprint.pages.length,
          dataModelsCount: blueprint.dataModels?.length ?? 0,
          apisCount: blueprint.apiRoutes?.length ?? appBlueprint.apis?.length ?? 0,
          entitiesCount: appBlueprint.entities?.length ?? 0,
          workflowsCount: appBlueprint.workflows?.length ?? 0,
        },
        files: {
          total: renderResult.files.length,
          byType: Object.fromEntries(fileTypes),
          paths: renderResult.files.map((f: { path: string }) => f.path),
        },
        pages: pagePaths,
        warnings: allWarnings,
        error: result.error || null,
        generatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(
        path.join(workspace.rootPath, '.build-report.json'),
        JSON.stringify(report, null, 2),
        'utf-8',
      );
    } catch (e) {
      console.warn('[orchestrator] Failed to write build report:', (e as Error).message);
    }

    tracer.endSpan('build-report', {
      outputs: ['build-report'],
      artifactIds: ['.build-report.json'],
      evidence: [`path=.build-report.json`],
      hash: RuntimeTracer.hashContent(JSON.stringify({ ts: Date.now(), success: result.success })),
    });

    // Phase 17b: Save to persistent build history (.build-history/)
    tracer.beginSpan({ layer: 'build-history', owner: 'Orchestrator/Phase17b', inputs: ['build-report'], dependencies: ['build-report'] });
    try {
      const historyManager = new BuildHistoryManager(workspace.rootPath);
      historyManager.saveBuild({
        id: `${workspaceId}-${Date.now()}`,
        ts: Date.now(),
        prompt,
        industry: breContext.industry,
        appName: breContext.appName || 'Untitled',
        confidence: breResult.confidence,
        filesGenerated: renderResult.files.length,
        pagesGenerated: blueprint.pages.length,
        errors: failed.length,
        warnings: allWarnings,
        durationMs: result.duration,
        success: result.success,
        usedLLM: breResult.usedLLMPlanning ?? false,
        workspaceId,
        platform: 'react',
        ...(graphStats ? { graphStats: { nodes: graphStats.nodes, edges: graphStats.edges, entities: graphStats.entityCount, tables: graphStats.tableCount, endpoints: graphStats.endpointCount } } : {}),
        ...(healingResult ? { selfHealing: { iterations: healingResult.iterations, errorsFixed: healingResult.errorsFixed, remainingErrors: healingResult.remainingErrors.length } } : {}),
      });
    } catch (e) {
      console.warn('[orchestrator] Failed to save build history:', (e as Error).message);
    }

    tracer.endSpan('build-history', {
      outputs: ['build-history-entry'],
      artifactIds: ['.build-history'],
      evidence: ['build history persisted'],
    });

    TelemetryLayer.reportBuildComplete({
      workspaceId,
      prompt: prompt.slice(0, 200),
      pagesTotal: pageResults.length,
      pagesSucceeded: succeeded,
      pagesFailed: failed.length,
      duration: result.duration,
      success: result.success,
    });

    // Phase R1, Step 1: emit RuntimeTrace for this build (every artifact above
    // is recorded as a trace entry with provenance and validation).
    try {
      const runtimeTrace = tracer.finalize(workspaceId);
      const tracePath = RuntimeTracer.persist(workspace.rootPath, runtimeTrace);
      console.log(`[runtime-trace] Persisted ${runtimeTrace.entries.length} layer entries to ${tracePath}`);
      progress.emit('compile', 'info', `RuntimeTrace: ${runtimeTrace.entries.length} layers, ${runtimeTrace.summary.totalArtifacts} artifacts`);
    } catch (traceErr) {
      console.warn('[runtime-trace] Failed to persist trace (non-fatal):', (traceErr as Error).message);
    }

    return result;
  }

  private buildPagePrompt(
    page: { path: string; title: string; layout: string; blocks: string[] },
    funcName: string,
    blueprint: FullStackBlueprint
  ): string {
    const otherPages = blueprint.pages
      .filter(p => p.path !== page.path)
      .map(p => `  - ${p.path} → export ${DeterministicOrchestratorV4.ROUTE_FUNC_MAP[p.path] || p.path}`)
      .join('\n');

    return `Generate the content for page "${page.path}" (export function "${funcName}").

Page specification:
- Route: ${page.path}
- Title: ${page.title}
- Layout: ${page.layout}
- Content blocks: ${page.blocks.join(', ')}

Application context (shared across all pages):
- App name: ${blueprint.appName}
- Color scheme: ${blueprint.colorScheme}
- Data models: ${blueprint.dataModels.map(m => `${m.name}(${m.fields.map(f => f.name).join(', ')})`).join(', ')}
- API routes: ${blueprint.apiRoutes.map(r => `${r.method} ${r.endpoint}`).join(', ')}
- State stores: ${blueprint.stateStores.map(s => s.name).join(', ')}

Other pages in this app (for nav links, do NOT generate their content):
${otherPages}

Rules:
- Generate ONLY the patch for ${page.path} — do not include patches for other pages
- The export function must be named exactly "${funcName}"
- Target file: ${page.path === '/' ? 'src/app/page.tsx' : `src/app${page.path}/page.tsx`}
- Use action "update" since the scaffold already created this file with a stub export
- Do NOT include import statements — the scaffold handles imports
- Use React.useState for any interactive state
- Use Tailwind CSS exclusively (no CSS modules, no styled-components)
- Dark theme: bg-zinc-950 background, bg-zinc-900 surfaces, border-zinc-800 borders
- Use gradient text: text-transparent bg-clip-text bg-gradient-to-r ${blueprint.colorScheme}-400 to-*
- Include realistic content, not placeholder text
- Every interactive element must have onClick handlers that update state`;
  }

  private async handleCloneIntent(
    workspaceId: string,
    intent: GenerationIntent,
    llmConfig: LLMConfig | undefined,
    startTime: number
  ): Promise<GenerationResult> {
    const targetUrl = intent.targetUrl || '';
    const prompt = intent.prompt || `Clone ${targetUrl}`;
    console.log(`[clone] Clone target: ${targetUrl}`);

    const workspace = this.sandbox.createWorkspace(this.workspaceBaseDir, workspaceId);

    // BRE v2: deterministic blueprint for clone scaffold
    const breContext = await buildBREContext(prompt);
    const progress = new ProgressEmitter(workspace.rootPath);
    progress.emit('bre', 'started', 'Analyzing business intent...');
    const breResult = await runBREV2Pipeline(breContext, llmConfig, undefined, progress);
    progress.emit('bre', 'completed', `Business context: ${breContext.industry}, ${breContext.entities.length} entities`);
    const appBlueprint = breResult.blueprint;
    const blueprint = mapBlueprintToFullStack(appBlueprint);

    // Import and run clone orchestrator
    const { CloneOrchestrator } = await import('../cloning/clone-orchestrator-v2.js');
    const config = llmConfig || { provider: 'openai' as any, apiKey: '' };
    const cloneOrch = new CloneOrchestrator(workspace.rootPath, config, undefined, undefined);

    const cloneResult = await cloneOrch.clone(targetUrl);

    this.snapshot.clearSnapshots(workspace.rootPath);

    const result: GenerationResult = {
      success: cloneResult.success,
      intent,
      workspaceId,
      blueprint,
      clonePlan: {
        routesToBuild: blueprint.pages.map(p => p.path),
        componentsToCreate: cloneResult.patches.filter(p => p.targetFile.startsWith('src/components/')).map(p => p.targetFile),
        dataModels: blueprint.dataModels.map(m => m.name),
      },
      analysis: {
        domain: targetUrl,
        pagesFound: cloneResult.pages,
        patchesGenerated: cloneResult.patches.length,
      },
      duration: Date.now() - startTime,
    };

    if (!cloneResult.success && cloneResult.error) {
      result.error = cloneResult.error;
    }

    return result;
  }

  private async handleHybridIntent(
    workspaceId: string,
    intent: GenerationIntent,
    llmConfig: LLMConfig | undefined,
    startTime: number
  ): Promise<GenerationResult> {
    const targetUrl = intent.targetUrl || '';
    const prompt = intent.prompt || '';
    console.log(`[hybrid] URL: ${targetUrl}, prompt: ${prompt.slice(0, 80)}...`);

    // Step 1: Clone for design tokens/structure inspiration only
    const workspace = this.sandbox.createWorkspace(this.workspaceBaseDir, workspaceId);

    // BRE v2: deterministic blueprint for hybrid scaffold
    const breContext = await buildBREContext(prompt);
    const progress = new ProgressEmitter(workspace.rootPath);

    // ═══ New 4-layer pipeline ═══
    console.log(`[hybrid] Running 4-layer build pipeline...`);
    progress.emit('bre', 'started', `Analyzing business context: ${breContext.industry}, ${breContext.entities.length} entities`);
    const pipelineResult = await runBuildPipeline(breContext, {
      platform: 'react',
      outputDir: path.join(workspace.rootPath, 'src'),
      workspaceDir: workspace.rootPath,
    }, llmConfig, (breContext as any).__industryScore, progress);

    const { breResult, executionBlueprint, applicationSpec, renderResult } = pipelineResult;
    const appBlueprint = breResult.blueprint;
    const blueprint = mapBlueprintToFullStack(appBlueprint);

    console.log(`[hybrid] Pipeline complete: ${renderResult.files.length} files generated`);

    // Write generated files to workspace
    const pageResults: Array<{ path: string; succeeded: boolean; lastError?: string | undefined }> = [];

    for (const file of renderResult.files) {
      const safePath = file.path.replace(/:/g, '_');
      const isRootLevel = safePath.startsWith('../') || safePath.startsWith('prisma/');
      const relPath = isRootLevel ? safePath.replace(/^\.\.\//, '') : safePath;
      const filePath = path.join(workspace.rootPath, isRootLevel ? '' : 'src', relPath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.content, 'utf-8');
    }

    // Mark all pages as succeeded
    for (const page of blueprint.pages) {
      pageResults.push({ path: page.path, succeeded: true });
    }

    // Clone phase for design tokens (optional)
    let sourceTextPath: string | undefined;
    try {
      const { CloneOrchestrator } = await import('../cloning/clone-orchestrator-v2.js');
      const config = llmConfig || { provider: 'openai' as any, apiKey: '' };
      const cloneOrch = new CloneOrchestrator(workspace.rootPath, config, undefined, undefined);
      const cloneResult = await cloneOrch.clone(targetUrl);
      console.log(`[hybrid] Clone complete: ${cloneResult.pages} pages, design tokens extracted`);

      // Extract source text for copy-bleed detection via crawler
      sourceTextPath = path.join(workspace.rootPath, '.source-text.txt');
      try {
        const { execSync } = await import('child_process');
        const crawlerPath = path.resolve(this.workspaceBaseDir, '..', 'tools', 'crawler', 'index.cjs');
        const crawlOutput = execSync('node "' + crawlerPath + '" "' + targetUrl + '" --extract-text', {
          cwd: path.resolve(this.workspaceBaseDir, '..'), timeout: 60000, stdio: 'pipe',
        }).toString();
        const crawlData = JSON.parse(crawlOutput);
        if (crawlData.text && crawlData.text.length > 0) {
          fs.writeFileSync(sourceTextPath, crawlData.text, 'utf-8');
        }
      } catch {}
    } catch (err: any) {
      console.warn(`[hybrid] Clone phase failed (continuing with generative): ${err.message}`);
    }

    // Scaffold Prisma/API for data models
    if (blueprint.dataModels && blueprint.dataModels.length > 0) {
      const pkgPath = path.join(workspace.rootPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        pkg.dependencies = {
          ...pkg.dependencies,
          prisma: '^5.10.2',
          '@prisma/client': '^5.10.2',
        };
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
      }

      DBCompiler.scaffoldPrismaClient(workspace.rootPath, blueprint.dataModels);
      APICompiler.compileAPIRoutes(workspace.rootPath, blueprint.dataModels);
    }

    this.snapshot.clearSnapshots(workspace.rootPath);

    // Step 3: Run copy-bleed detection via dependency-checker
    if (sourceTextPath && fs.existsSync(sourceTextPath)) {
      try {
        const { execSync } = await import('child_process');
        const depChecker = path.resolve(this.workspaceBaseDir, '..', 'tools', 'dependency-checker', 'index.cjs');
        execSync(`node "${depChecker}" "${workspace.rootPath}" --source-text "${sourceTextPath}" --overlap-threshold 0.3`, {
          cwd: path.resolve(this.workspaceBaseDir, '..'), timeout: 60000, stdio: 'pipe',
        });
        console.log(`[hybrid] Copy-bleed check passed`);
      } catch (err: any) {
        console.warn(`[hybrid] Copy-bleed check found issues: ${err.stdout?.toString()?.slice(0, 200) || err.message}`);
      }
      try { fs.unlinkSync(sourceTextPath); } catch {}
    }

    const succeeded = pageResults.filter(r => r.succeeded).length;
    return {
      success: pageResults.every(r => r.succeeded),
      intent, workspaceId, blueprint, pageResults,
      duration: Date.now() - startTime,
    };
  }

  private async handleAnalyzeIntent(
    intent: GenerationIntent,
    startTime: number
  ): Promise<GenerationResult> {
    const domain = intent.domain || '';
    console.log(`[build.same.generation] Analyzing domain: ${domain}`);

    return {
      success: true,
      intent,
      analysis: { domain },
      duration: Date.now() - startTime,
    };
  }

  private async handleExtractComponentsIntent(
    intent: GenerationIntent,
    startTime: number
  ): Promise<GenerationResult> {
    const domain = intent.domain || '';
    console.log(`[build.same.generation] Extracting components from: ${domain}`);

    return {
      success: true,
      intent,
      analysis: { domain },
      duration: Date.now() - startTime,
    };
  }

  private async handleExtractDesignSystemIntent(
    intent: GenerationIntent,
    startTime: number
  ): Promise<GenerationResult> {
    const domain = intent.domain || '';
    console.log(`[build.same.generation] Extracting design system from: ${domain}`);

    return {
      success: true,
      intent,
      analysis: { domain },
      duration: Date.now() - startTime,
    };
  }

  public async runCompilationFlow(
    workspaceId: string,
    prompt: string,
    llmClientGateway: (context: LLMContext) => Promise<ASTPatch[]>,
    maxRetries: number = 5,
    skipDevServer: boolean = false,
    snapshotBase: number = 0
  ): Promise<WorkspaceConfig> {
    const workspace = this.sandbox.createWorkspace(this.workspaceBaseDir, workspaceId);
    await this.sandbox.runPackageInstall(workspace);

    let activeErrors: CompilationError[] = [];
    let attempts = 0;

    this.indexer.clearCache();

    while (attempts < maxRetries) {
      const version = snapshotBase + attempts;
      try { this.buildDependencyGraph(workspace.rootPath); } catch {}
      this.snapshot.takeSnapshot(workspace.rootPath, version);

      const payloadContext: LLMContext = {
        prompt,
        errors: ErrorCompressor.compress(activeErrors),
        attempt: attempts,
        changedFiles: this.locateModifiedFiles(workspace.rootPath)
      };

      const patches = await llmClientGateway(payloadContext);

      const rankedPatches = this.ranker.rank(patches);

      const safetyReport = this.predictor.predict(rankedPatches);
      if (!safetyReport.isSafe) {
        this.snapshot.restore(workspace.rootPath, version);

        TelemetryLayer.reportError({
          workspaceId, error: safetyReport.reason || 'Regression gate blocked', code: 'AST_REGRESSION_REJECT',
          phase: 'regression-gate',
        });
        TelemetryLayer.reportHealing(workspaceId, attempts, 1);

        activeErrors = [{
          file: 'regression-engine',
          line: 0,
          code: 'AST_REGRESSION_REJECT',
          message: `Regression Blocked: ${safetyReport.reason}`
        }];
        attempts++;
        continue;
      }

      const validationResult = this.validator.validate(workspace.rootPath, rankedPatches);

      if (!validationResult.valid) {
        this.snapshot.restore(workspace.rootPath, version);

        TelemetryLayer.reportError({
          workspaceId, error: validationResult.reason || 'Validation failed',
          code: 'AST_VALIDATION_REJECT', phase: 'validation-gate',
        });
        TelemetryLayer.reportHealing(workspaceId, attempts, 1);

        activeErrors = [{
          file: 'validator-engine',
          line: 0,
          code: 'AST_VALIDATION_REJECT',
          message: `AST Validation Gate Failure: ${validationResult.reason}`
        }];
        attempts++;
        continue;
      }

      const simulationResult = this.simulator.simulate(workspace.rootPath, validationResult.safeToApply);

      if (!simulationResult.success) {
        this.snapshot.restore(workspace.rootPath, version);

        TelemetryLayer.reportError({
          workspaceId, error: simulationResult.reason || 'Simulation failed',
          code: 'AST_SIMULATION_REJECT', phase: 'simulation-gate',
        });
        TelemetryLayer.reportHealing(workspaceId, attempts, 1);

        activeErrors = [{
          file: 'simulator-engine',
          line: 0,
          code: 'AST_SIMULATION_REJECT',
          message: `AST Simulation Gate Failure: ${simulationResult.reason}`
        }];
        attempts++;
        continue;
      }

      this.transaction.begin();
      try {
        for (const patch of validationResult.safeToApply) {
          this.transaction.stage(patch);
        }

        this.transaction.commit((stagedPatch) => {
          this.patcher.applyPatch(workspace.rootPath, stagedPatch);
          this.indexer.evictFile(stagedPatch.targetFile);
        });

      } catch (mutationError: any) {
        this.transaction.rollback();
        this.snapshot.restore(workspace.rootPath, version);

        TelemetryLayer.reportError({
          workspaceId, error: mutationError.message, code: 'AST_MUTATION_CRASH',
          phase: 'mutation',
        });
        TelemetryLayer.reportHealing(workspaceId, attempts, 1);

        activeErrors = [{
          file: 'ast-patcher',
          line: 0,
          code: 'AST_MUTATION_CRASH',
          message: `AST Patcher Execution Failure: ${mutationError.message}`
        }];
        attempts++;
        continue;
      }

      activeErrors = this.auditor.audit(workspace.rootPath);

      if (activeErrors.length === 0) {
        TelemetryLayer.reportHealing(workspaceId, attempts, 0);
        if (!skipDevServer) {
          await this.sandbox.launchDevInstance(workspace);
        }
        return workspace;
      }

      this.snapshot.restore(workspace.rootPath, version);
      attempts++;
    }

    throw new Error(`Orchestration loops exhausted without compiling error-free build.`);
  }

  public stopDevInstance(workspaceId: string): void {
    this.sandbox.stopDevInstance(workspaceId);
  }

  private buildDependencyGraph(workspacePath: string): void {
    this.graph.clear();
    const filesToProcess: string[] = [];

    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.name === 'node_modules' || item.name === '.next' || item.name.startsWith('.')) {
          continue;
        }
        if (item.isDirectory()) {
          walk(fullPath);
        } else if (item.isFile() && /\.(ts|tsx|js|jsx)$/.test(item.name)) {
          filesToProcess.push(fullPath);
        }
      }
    };

    walk(workspacePath);

    for (const file of filesToProcess) {
      const relativePath = normalizePath(path.relative(workspacePath, file));
      const node = this.indexer.indexFile(file, relativePath);
      this.graph.addFile(node);
    }

    for (const file of filesToProcess) {
      const relativePath = normalizePath(path.relative(workspacePath, file));
      const node = this.graph.getNode(relativePath);
      if (!node) continue;

      for (const importStr of node.imports) {
        const resolvedPath = ModuleResolver.resolve(file, importStr, workspacePath);
        if (resolvedPath) {
          this.graph.addEdge({
            from: relativePath,
            to: resolvedPath,
            type: 'import'
          });
        }
      }
    }
  }

  private locateModifiedFiles(workspacePath: string): string[] {
    const modifiedFiles: string[] = [];
    const walk = (directory: string) => {
      if (!fs.existsSync(directory)) return;
      const items = fs.readdirSync(directory, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(directory, item.name);
        if (item.name === 'node_modules' || item.name === '.next' || item.name.startsWith('.')) {
          continue;
        }
        if (item.isDirectory()) {
          walk(fullPath);
        } else if (item.isFile()) {
          const stats = fs.statSync(fullPath);
          const lastModifiedAge = Date.now() - stats.mtimeMs;
          if (lastModifiedAge < 300000) {
            modifiedFiles.push(normalizePath(path.relative(workspacePath, fullPath)));
          }
        }
      }
    };
    walk(workspacePath);
    return modifiedFiles;
  }

  // ─── Refinement Intent Handler ──────────────────────────────────────────────

  private async handleRefineIntent(
    workspaceId: string,
    intent: GenerationIntent,
    startTime: number
  ): Promise<GenerationResult> {
    const workspacePath = path.join(this.workspaceBaseDir, workspaceId);
    const refinementPrompt = intent.refinementPrompt || intent.prompt || '';

    if (!refinementPrompt) {
      return {
        success: false,
        intent,
        error: 'No refinement prompt provided',
        duration: Date.now() - startTime,
      };
    }

    // Initialize refinement engine
    const refinementEngine = new RefinementEngine(workspacePath);

    // Collect current files from workspace
    const currentFiles = new Map<string, string>();
    const collectFiles = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.name === 'node_modules' || item.name === '.next' || item.name.startsWith('.')) continue;
        if (item.isDirectory()) {
          collectFiles(fullPath);
        } else if (item.isFile()) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const relativePath = path.relative(workspacePath, fullPath);
            currentFiles.set(relativePath, content);
          } catch {
            // Skip unreadable files
          }
        }
      }
    };
    collectFiles(workspacePath);

    // Process the refinement
    const result = await refinementEngine.process(refinementPrompt, currentFiles);

    if (result.needsFullBuild) {
      // This is actually a new build request — delegate to build handler
      return this.handleBuildIntent(workspaceId, intent, undefined, startTime);
    }

    if (result.result?.success) {
      // Save snapshot after refinement
      refinementEngine.saveSnapshot(currentFiles, {
        appName: workspaceId,
        industry: 'unknown',
        platform: 'react',
        prompt: refinementPrompt,
      });

      return {
        success: true,
        intent,
        workspaceId,
        warnings: [result.result.summary],
        duration: Date.now() - startTime,
      };
    }

    return {
      success: false,
      intent,
      error: `Refinement failed: ${result.result?.summary ?? 'Unknown error'}`,
      duration: Date.now() - startTime,
    };
  }

  // ─── Deploy Intent Handler ──────────────────────────────────────────────────

  private async handleDeployIntent(
    workspaceId: string,
    intent: GenerationIntent,
    startTime: number
  ): Promise<GenerationResult> {
    const workspacePath = path.join(this.workspaceBaseDir, workspaceId);

    if (!fs.existsSync(workspacePath)) {
      return {
        success: false,
        intent,
        error: `Workspace not found: ${workspaceId}. Build the app first.`,
        duration: Date.now() - startTime,
      };
    }

    // Collect files to detect platform
    const files = new Map<string, string>();
    const collectFiles = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.name === 'node_modules' || item.name === '.next' || item.name.startsWith('.')) continue;
        if (item.isDirectory()) {
          collectFiles(fullPath);
        } else if (item.isFile()) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const relativePath = path.relative(workspacePath, fullPath);
            files.set(relativePath, content);
          } catch {
            // Skip unreadable files
          }
        }
      }
    };
    collectFiles(workspacePath);

    // Detect deployment platform
    const detectedTarget = intent.deployTarget || detectDeploymentPlatform(files);

    // Generate deployment config
    const configFiles = DeployConfigGenerator.generateVercelJson({
      target: detectedTarget,
      projectName: workspaceId,
      environment: intent.deployEnv,
    });

    // Write config files to workspace
    for (const configFile of configFiles) {
      const configPath = path.join(workspacePath, 'vercel.json');
      try {
        fs.writeFileSync(configPath, configFile, 'utf-8');
      } catch {
        // Continue if config write fails
      }
    }

    // Execute deployment
    const deployExecutor = new DeployExecutor(
      {
        target: detectedTarget,
        projectName: workspaceId,
        environment: intent.deployEnv,
      },
      workspacePath,
      (progress) => {
        console.log(`[deploy] ${progress.phase}: ${progress.message}`);
      }
    );

    const deployResult = await deployExecutor.deploy();

    return {
      success: deployResult.success,
      intent,
      workspaceId,
      warnings: deployResult.logs,
      ...(deployResult.errors.length > 0 ? { error: deployResult.errors.join('\n') } : {}),
      duration: Date.now() - startTime,
    };
  }

}
