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

    try {
      switch (intent.type) {
        case 'build-app':
        case 'build-website':
          return await this.handleBuildIntent(workspaceId, intent, llmConfig, startTime);

        case 'clone-website':
          return await this.handleCloneIntent(intent, startTime);

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
    console.log(`[build.same.generation] FullStackArchitect: ${blueprint.appName} (${blueprint.colorScheme})`);
    console.log(`[build.same.generation] Data models: ${blueprint.dataModels.map(m => m.name).join(', ')}`);
    console.log(`[build.same.generation] API routes: ${blueprint.apiRoutes.length}`);
    console.log(`[build.same.generation] State stores: ${blueprint.stateStores.map(s => s.name).join(', ')}`);
    console.log(`[build.same.generation] Pages: ${blueprint.pages.map(p => p.path).join(', ')}`);

    FullStackCompilerPipeline.compile(workspace, blueprint);

    const gateway = new LLMGateway(llmConfig || { provider: 'openai', apiKey: '' });

    const pageResults: Array<{ path: string; succeeded: boolean; lastError?: string }> = [];
    const PER_PAGE_RETRIES = 3;

    for (const [i, page] of blueprint.pages.entries()) {
      const funcName = DeterministicOrchestratorV4.ROUTE_FUNC_MAP[page.path]
        || page.path.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\s+/g, '');
      const snapshotBase = i * (PER_PAGE_RETRIES + 1);

      console.log(`[build.same.orchestrator-v4] ─── Page ${i + 1}/${blueprint.pages.length}: ${page.path} (export ${funcName}) ───`);

      const pagePrompt = this.buildPagePrompt(page, funcName, blueprint);

      const targetFilePath = page.path === '/' ? 'src/app/page.tsx' : `src/app${page.path}/page.tsx`;

      try {
        await this.runCompilationFlow(
          workspaceId,
          pagePrompt,
          async (ctx: LLMContext) => {
            const allPatches = await gateway.generatePatches(ctx);
            return allPatches.filter(p => p.targetFile === targetFilePath);
          },
          PER_PAGE_RETRIES,
          true,
          snapshotBase
        );
        pageResults.push({ path: page.path, succeeded: true });
        console.log(`[build.same.orchestrator-v4] ✓ Page ${page.path} compiled successfully.`);
      } catch (err: any) {
        const errMsg = err.message || 'Unknown error';
        pageResults.push({ path: page.path, succeeded: false, lastError: errMsg });
        console.error(`[build.same.orchestrator-v4] ✗ Page ${page.path} failed after ${PER_PAGE_RETRIES} retries: ${errMsg}`);
      }
    }

    this.snapshot.clearSnapshots(workspace.rootPath);

    const succeeded = pageResults.filter(r => r.succeeded).length;
    const failed = pageResults.filter(r => !r.succeeded);

    if (failed.length > 0) {
      console.warn(`[build.same.orchestrator-v4] Build partial: ${succeeded}/${pageResults.length} pages succeeded. Failed: ${failed.map(f => f.path).join(', ')}`);
    } else {
      console.log(`[build.same.orchestrator-v4] Build complete: all ${pageResults.length} pages compiled successfully.`);
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
    intent: GenerationIntent,
    startTime: number
  ): Promise<GenerationResult> {
    const targetUrl = intent.targetUrl || '';
    console.log(`[build.same.generation] Clone target: ${targetUrl}`);

    return {
      success: true,
      intent,
      clonePlan: { routesToBuild: [], componentsToCreate: [], dataModels: [] },
      analysis: { domain: targetUrl },
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

    console.log(`[build.same.orchestrator-v4] Performing package dependency install...`);
    await this.sandbox.runPackageInstall(workspace);

    let activeErrors: CompilationError[] = [];
    let attempts = 0;

    this.indexer.clearCache();

    while (attempts < maxRetries) {
      const version = snapshotBase + attempts;
      console.log(`[build.same.orchestrator-v4] Indexing dynamic import trees...`);
      this.buildDependencyGraph(workspace.rootPath);

      console.log(`[build.same.orchestrator-v4] Saving filesystem rollback version: [V${version}]`);
      this.snapshot.takeSnapshot(workspace.rootPath, version);

      const payloadContext: LLMContext = {
        prompt,
        errors: ErrorCompressor.compress(activeErrors),
        attempt: attempts,
        changedFiles: this.locateModifiedFiles(workspace.rootPath)
      };

      const patches = await llmClientGateway(payloadContext);

      console.log(`[build.same.orchestrator-v4] Scoring patches using graph risk matrix...`);
      const rankedPatches = this.ranker.rank(patches);

      console.log(`[build.same.orchestrator-v4] Testing contract signature breaks...`);
      const safetyReport = this.predictor.predict(rankedPatches);
      if (!safetyReport.isSafe) {
        console.warn(`[build.same.orchestrator-v4] Regression Risk Gate Blocked: ${safetyReport.reason}`);
        this.snapshot.restore(workspace.rootPath, version);

        activeErrors = [{
          file: 'regression-engine',
          line: 0,
          code: 'AST_REGRESSION_REJECT',
          message: `Regression Blocked: ${safetyReport.reason}`
        }];
        attempts++;
        continue;
      }

      console.log(`[build.same.orchestrator-v4] Validating schema patterns and code syntax...`);
      const validationResult = this.validator.validate(workspace.rootPath, rankedPatches);

      if (!validationResult.valid) {
        console.warn(`[build.same.orchestrator-v4] AST Validation Rejected: ${validationResult.reason}`);
        this.snapshot.restore(workspace.rootPath, version);

        activeErrors = [{
          file: 'validator-engine',
          line: 0,
          code: 'AST_VALIDATION_REJECT',
          message: `AST Validation Gate Failure: ${validationResult.reason}`
        }];
        attempts++;
        continue;
      }

      console.log(`[build.same.orchestrator-v4] Simulating AST mutations in memory...`);
      const simulationResult = this.simulator.simulate(workspace.rootPath, validationResult.safeToApply);

      if (!simulationResult.success) {
        console.warn(`[build.same.orchestrator-v4] Simulation Gate Rejected: ${simulationResult.reason}`);
        this.snapshot.restore(workspace.rootPath, version);

        activeErrors = [{
          file: 'simulator-engine',
          line: 0,
          code: 'AST_SIMULATION_REJECT',
          message: `AST Simulation Gate Failure: ${simulationResult.reason}`
        }];
        attempts++;
        continue;
      }

      console.log(`[build.same.orchestrator-v4] Pre-flight gates verified. Mutating VFS...`);
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
        console.error(`[build.same.orchestrator-v4] Patcher runtime mutation crash. Invoking snapshot restore...`);
        this.transaction.rollback();
        this.snapshot.restore(workspace.rootPath, version);

        activeErrors = [{
          file: 'ast-patcher',
          line: 0,
          code: 'AST_MUTATION_CRASH',
          message: `AST Patcher Execution Failure: ${mutationError.message}`
        }];
        attempts++;
        continue;
      }

      console.log(`[build.same.orchestrator-v4] Executing compiler checks via TypeScript API...`);
      activeErrors = this.auditor.audit(workspace.rootPath);

      if (activeErrors.length === 0) {
        console.log(`[build.same.orchestrator-v4] Compile pass cleared with zero diagnostics.`);
        if (!skipDevServer) {
          await this.sandbox.launchDevInstance(workspace);
        }
        return workspace;
      }

      console.warn(`[build.same.orchestrator-v4] Build failed. Compiler reported ${activeErrors.length} type/syntax errors.`);

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
        } else {
          console.warn(`[build.same.graph] Unresolved import specifier detected: "${importStr}" in file "${relativePath}"`);
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
