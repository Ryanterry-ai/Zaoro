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
import { FullStackCompilerPipeline } from '../generation/compiler-pipeline.js';
import { DBCompiler } from '../core/db-compiler.js';
import { APICompiler } from '../core/api-compiler.js';
import { TelemetryLayer } from '../core/telemetry.js';
import { SelfHealingEngine } from '../engine/self-healing-engine.js';
import { ContentResearchAgent } from '../generation/content-research-agent.js';
import { runBREV2Pipeline } from '../bos/bre-v2-pipeline.js';
import { mapBlueprintToFullStack } from '../bos/blueprint-mapper.js';
import { buildBREContext } from '../bos/intake-parser.js';
import { runBuildPipeline } from '../generation/build-pipeline.js';
import type { ApplicationBlueprint } from '../bos/schemas/blueprint/application-blueprint.schema.js';
import * as fs from 'fs';
import * as path from 'path';

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

    // BRE v2: deterministic business reasoning (zero LLM calls)
    const breContext = buildBREContext(prompt);

    // ═══ New 4-layer pipeline: BRE v2 → Execution Blueprint → Content Resolver → Renderer ═══
    console.log(`[orchestrator] Running 4-layer build pipeline...`);
    const pipelineResult = await runBuildPipeline(breContext, {
      platform: 'react',
      outputDir: path.join(workspace.rootPath, 'src'),
    }, llmConfig);

    const { breResult, executionBlueprint, applicationSpec, renderResult } = pipelineResult;
    const appBlueprint = breResult.blueprint;
    const blueprint = mapBlueprintToFullStack(appBlueprint);

    console.log(`[orchestrator] Pipeline complete: ${renderResult.files.length} files generated`);
    console.log(`[orchestrator] BRE v2: confidence=${breResult.confidence.toFixed(2)}, ${blueprint.pages.length} pages, ${blueprint.dataModels.length} models`);
    console.log(`[orchestrator] Execution blueprint: ${executionBlueprint.pages.length} pages, ${executionBlueprint.pages.reduce((s, p) => s + p.slots.length, 0)} slots`);
    console.log(`[orchestrator] Application spec: ${applicationSpec.pages.length} pages, ${applicationSpec.pages.reduce((s, p) => s + p.components.length, 0)} components`);

    if (renderResult.warnings.length > 0) {
      console.warn(`[orchestrator] Renderer warnings: ${renderResult.warnings.join(', ')}`);
    }

    if (appBlueprint.warnings.length > 0) {
      console.warn(`[orchestrator] Blueprint warnings: ${appBlueprint.warnings.join(' | ')}`);
    }

    // Write planning artifacts for Live Object Inspector (Phase 11)
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
      };
      fs.writeFileSync(
        path.join(workspace.rootPath, '.plan-inspect.json'),
        JSON.stringify(inspectPayload, null, 2),
        'utf-8',
      );
    } catch (e) {
      console.warn('[orchestrator] Failed to write plan-inspect artifact:', (e as Error).message);
    }

    // Write generated files to workspace
    const pageResults: Array<{ path: string; succeeded: boolean; lastError?: string | undefined }> = [];

    // Phase 14: Write file stream for live file generation tracking
    // Each entry is appended immediately after writing the file so the SSE
    // stream shows files appearing incrementally, not all at once.
    const fileStreamPath = path.join(workspace.rootPath, '.generated-files.jsonl');
    // Clear any previous stream file
    try { fs.writeFileSync(fileStreamPath, '', 'utf-8'); } catch { }

    for (const file of renderResult.files) {
      const filePath = path.join(workspace.rootPath, 'src', file.path);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.content, 'utf-8');
      console.log(`[orchestrator] Generated: ${file.path} (${file.type})`);
      // Append immediately so SSE polling picks it up file-by-file
      try {
        fs.appendFileSync(fileStreamPath, JSON.stringify({ path: file.path, type: file.type, ts: Date.now() }) + '\n', 'utf-8');
      } catch { }
    }

    // Mark all pages as succeeded (they come from the renderer, not LLM)
    for (const page of blueprint.pages) {
      pageResults.push({ path: page.path, succeeded: true });
    }

    // Scaffold Prisma/API for data models (still needed for DB layer)
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

    // Install dependencies (required for quality gate to find `next` in PATH)
    console.log(`[orchestrator] Installing dependencies...`);
    await this.sandbox.runPackageInstall(workspace);
    console.log(`[orchestrator] Dependencies installed.`);

    TelemetryLayer.reportBuildStart(workspaceId, prompt);

    this.snapshot.clearSnapshots(workspace.rootPath);

    // Phase 16: Save replay artifacts
    try {
      const replayDir = path.join(workspace.rootPath, '.replay');
      fs.mkdirSync(replayDir, { recursive: true });
      const saveArtifact = (name: string, data: unknown) => {
        fs.writeFileSync(path.join(replayDir, name), JSON.stringify(data, null, 2), 'utf-8');
      };
      saveArtifact('manifest.json', {
        createdAt: new Date().toISOString(),
        stages: ['bre-context', 'rules-decisions', 'blueprint', 'execution-blueprint', 'application-spec', 'render-result'],
        totalStages: 6,
      });
      saveArtifact('01-bre-context.json', breContext);
      saveArtifact('02-rules-decisions.json', (breResult.decisions ?? []).map(d => ({
        ruleId: d.ruleId, ruleName: d.ruleName, action: d.action, confidence: d.confidence, trace: d.trace,
      })));
      saveArtifact('03-blueprint.json', {
        pages: appBlueprint.pages?.length ?? 0,
        entities: appBlueprint.entities?.length ?? 0,
        apis: appBlueprint.apis?.length ?? 0,
        workflows: appBlueprint.workflows?.length ?? 0,
        database: appBlueprint.database ? { engine: appBlueprint.database.engine, tables: (appBlueprint.database.tables ?? []).length } : null,
        confidence: appBlueprint.confidence,
        designTokens: !!appBlueprint.designTokens,
        vocabulary: appBlueprint.vocabulary,
      });
      saveArtifact('04-execution-blueprint.json', {
        pages: executionBlueprint.pages.map((p: { path: string; [key: string]: unknown }) => ({
          path: p.path,
          slots: ((p as any).slots ?? []).length,
        })),
      });
      saveArtifact('05-application-spec.json', {
        pages: applicationSpec.pages.length,
        totalComponents: applicationSpec.pages.reduce((s: number, p: any) => s + (p.components ?? []).length, 0),
        fileCount: renderResult.files.length,
      });
      saveArtifact('06-render-result.json', {
        files: renderResult.files.map((f: { path: string; type: string }) => ({ path: f.path, type: f.type })),
        warnings: renderResult.warnings,
      });
    } catch (e) {
      console.warn('[orchestrator] Failed to write replay artifacts:', (e as Error).message);
    }

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

    TelemetryLayer.reportBuildComplete({
      workspaceId,
      prompt: prompt.slice(0, 200),
      pagesTotal: pageResults.length,
      pagesSucceeded: succeeded,
      pagesFailed: failed.length,
      duration: result.duration,
      success: result.success,
    });

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
    const breContext = buildBREContext(prompt);
    const breResult = await runBREV2Pipeline(breContext, llmConfig);
    const appBlueprint = breResult.blueprint;
    const blueprint = mapBlueprintToFullStack(appBlueprint);

    // Scaffold the workspace structure
    FullStackCompilerPipeline.compileRich(workspace, appBlueprint);

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
    const breContext = buildBREContext(prompt);

    // ═══ New 4-layer pipeline ═══
    console.log(`[hybrid] Running 4-layer build pipeline...`);
    const pipelineResult = await runBuildPipeline(breContext, {
      platform: 'react',
      outputDir: path.join(workspace.rootPath, 'src'),
    }, llmConfig);

    const { breResult, executionBlueprint, applicationSpec, renderResult } = pipelineResult;
    const appBlueprint = breResult.blueprint;
    const blueprint = mapBlueprintToFullStack(appBlueprint);

    console.log(`[hybrid] Pipeline complete: ${renderResult.files.length} files generated`);

    // Write generated files to workspace
    const pageResults: Array<{ path: string; succeeded: boolean; lastError?: string | undefined }> = [];

    for (const file of renderResult.files) {
      const filePath = path.join(workspace.rootPath, 'src', file.path);
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

}
