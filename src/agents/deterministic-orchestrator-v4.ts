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
import { FullStackArchitect } from '../generation/architect.js';
import { FullStackCompilerPipeline } from '../generation/compiler-pipeline.js';
import { DBCompiler } from '../core/db-compiler.js';
import { APICompiler } from '../core/api-compiler.js';
import { TelemetryLayer } from '../core/telemetry.js';
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
      switch (intent.type) {
        case 'build-app':
        case 'build-website':
          return await this.handleBuildIntent(workspaceId, intent, llmConfig, startTime);

        case 'clone-website':
          return await this.handleCloneIntent(workspaceId, intent, llmConfig, startTime);

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

    const blueprint = FullStackArchitect.design(prompt);
    console.log(`[orchestrator] Blueprint: ${blueprint.appName}, ${blueprint.pages.length} pages, ${blueprint.dataModels.length} models`);

    FullStackCompilerPipeline.compile(workspace, blueprint);

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

    TelemetryLayer.reportBuildStart(workspaceId, prompt);

    const gateway = new LLMGateway(llmConfig || { provider: 'openai', apiKey: '' });

    const pageResults: Array<{ path: string; succeeded: boolean; lastError?: string }> = [];
    const PER_PAGE_RETRIES = 3;

    // Build all page prompts upfront for the combined LLM call
    const pagePromptData = blueprint.pages.map((page, i) => {
      const funcName = DeterministicOrchestratorV4.ROUTE_FUNC_MAP[page.path]
        || page.path.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\s+/g, '');
      const targetFile = page.path === '/' ? 'src/app/page.tsx' : `src/app${page.path}/page.tsx`;
      const pagePrompt = this.buildPagePrompt(page, funcName, blueprint);
      return { pagePath: page.path, targetFile, funcName, prompt: pagePrompt };
    });

    // Single combined LLM call for ALL pages
    let patchMap: Map<string, ASTPatch[]>;
    try {
      patchMap = await gateway.generateAllPatchesCombined(prompt, pagePromptData);
    } catch (err: any) {
      console.error(`[orchestrator] Combined LLM call failed: ${err.message}. Falling back to per-page calls.`);
      patchMap = new Map();
      // Fallback: per-page calls
      for (const pp of pagePromptData) {
        try {
          const patches = await gateway.generatePatches({ prompt: pp.prompt, attempt: 0, changedFiles: [], errors: [] });
          patchMap.set(pp.targetFile, patches);
        } catch {}
      }
    }

    // Apply patches per-page with independent rollback scope
    for (const [i, page] of blueprint.pages.entries()) {
      const pp = pagePromptData[i];
      if (!pp) continue;
      const snapshotBase = i * (PER_PAGE_RETRIES + 1);

      console.log(`[orchestrator] Compiling page ${i + 1}/${blueprint.pages.length}: ${page.path}`);

      const pageStartTime = Date.now();
      try {
        await this.runCompilationFlow(
          workspaceId,
          pp.prompt,
          async (_ctx: LLMContext) => {
            const ppTarget = pp.targetFile;
            // Extract page-specific patches from the pre-computed map
            const pagePatch = patchMap.get(ppTarget)?.find(p => p.targetFile === ppTarget);
            const componentPatches = (patchMap.get(ppTarget) || []).filter(p => {
              if (!p.targetFile.startsWith('src/components/')) return false;
              const fullPath = path.join(workspace.rootPath, p.targetFile);
              return !fs.existsSync(fullPath);
            });
            // Also include component patches from other pages that don't exist yet
            for (const [, patches] of patchMap) {
              for (const p of patches) {
                if (p.targetFile.startsWith('src/components/') && !fs.existsSync(path.join(workspace.rootPath, p.targetFile))) {
                  if (!componentPatches.find(cp => cp.targetFile === p.targetFile)) {
                    componentPatches.push(p);
                  }
                }
              }
            }
            return [pagePatch, ...componentPatches].filter(Boolean) as ASTPatch[];
          },
          PER_PAGE_RETRIES,
          true,
          snapshotBase
        );
        pageResults.push({ path: page.path, succeeded: true });
        TelemetryLayer.reportPageComplete(workspaceId, {
          workspaceId, pagePath: page.path, succeeded: true,
          attemptCount: PER_PAGE_RETRIES, duration: Date.now() - pageStartTime,
        });
        console.log(`[orchestrator] Page ${page.path} compiled successfully.`);
      } catch (err: any) {
        const errMsg = err.message || 'Unknown error';
        pageResults.push({ path: page.path, succeeded: false, lastError: errMsg });
        TelemetryLayer.reportPageComplete(workspaceId, {
          workspaceId, pagePath: page.path, succeeded: false,
          attemptCount: PER_PAGE_RETRIES, lastError: errMsg,
          duration: Date.now() - pageStartTime,
        });
        console.error(`[orchestrator] Page ${page.path} failed: ${errMsg}`);
      }
    }

    this.snapshot.clearSnapshots(workspace.rootPath);

    const succeeded = pageResults.filter(r => r.succeeded).length;
    const failed = pageResults.filter(r => !r.succeeded);

    if (failed.length > 0) {
      console.warn(`[orchestrator] Build partial: ${succeeded}/${pageResults.length} pages succeeded`);
    } else {
      console.log(`[orchestrator] Build complete: ${pageResults.length} pages compiled.`);
    }

    const result: GenerationResult = {
      success: failed.length === 0,
      intent,
      workspaceId,
      blueprint,
      pageResults,
      duration: Date.now() - startTime,
    };

    if (failed.length > 0) {
      result.error = `${failed.length} page(s) failed: ${failed.map(f => `${f.path} — ${f.lastError}`).join('; ')}`;
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
    const blueprint = FullStackArchitect.design(prompt);

    // Scaffold the workspace structure
    FullStackCompilerPipeline.compile(workspace, blueprint);

    // Import and run clone orchestrator
    const { CloneOrchestrator } = await import('../cloning/clone-orchestrator.js');
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
