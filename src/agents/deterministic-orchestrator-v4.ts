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
import { SelfHealingEngine } from '../engine/self-healing-engine.js';
import { ContentResearchAgent } from '../generation/content-research-agent.js';
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

    // Load industry knowledge from cache (deterministic — no LLM)
    let industryModel: Record<string, unknown> | null = null;
    try {
      const slug = prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
      const cachePath = path.join(process.cwd(), 'knowledge-base', 'industries', `${slug}.json`);
      if (fs.existsSync(cachePath)) {
        industryModel = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
        console.log(`[orchestrator] Loaded industry model from cache: ${slug}`);
      } else {
        console.log(`[orchestrator] No cached industry model for "${slug}" — industry-intelligence will seed on first run`);
      }
    } catch {}

    const gateway = new LLMGateway(llmConfig || { provider: 'openai', apiKey: '' });

    // ═══ Stage 1.5: Content Research (browse web for real business data) ═══
    try {
      const researcher = new ContentResearchAgent();
      const research = await researcher.research(prompt);
      gateway.setResearch(research);
      console.log(`[orchestrator] Content research: ${research.competitors.length} competitors, ${research.realContent.headlines.length} headlines, ${research.realContent.pricingData.length} pricing`);
    } catch (err: any) {
      console.warn(`[orchestrator] Content research failed (continuing without): ${err.message}`);
    }

    const pageResults: Array<{ path: string; succeeded: boolean; lastError?: string | undefined }> = [];
    const PER_PAGE_RETRIES = 3;

    // Build all page prompts upfront for the combined LLM call
    const pagePromptData = blueprint.pages.map((page, i) => {
      const funcName = DeterministicOrchestratorV4.ROUTE_FUNC_MAP[page.path]
        || page.path.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\s+/g, '');
      const targetFile = page.path === '/' ? 'src/app/page.tsx' : `src/app${page.path}/page.tsx`;
      const pagePrompt = this.buildPagePrompt(page, funcName, blueprint);
      return { pagePath: page.path, targetFile, funcName, prompt: pagePrompt };
    });

    // Per-page LLM calls (one call per page — never combine pages)
    const patchMap: Map<string, ASTPatch[]> = new Map();
    for (const pp of pagePromptData) {
      try {
        const patches = await gateway.generatePatches({ prompt: pp.prompt, attempt: 0, changedFiles: [], errors: [] });
        patchMap.set(pp.targetFile, patches);
        console.log(`[orchestrator] Page ${pp.pagePath}: ${patches.length} patches`);
      } catch (err: any) {
        console.warn(`[orchestrator] Page ${pp.pagePath} LLM call failed: ${err.message}`);
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
            // Domain patches always take priority over LLM patches for page files
            const allPagePatches = (patchMap.get(ppTarget) || []).filter(p => p.targetFile === ppTarget);
            console.log(`[orchestrator] Page ${pp.pagePath}: ${allPagePatches.length} patches for ${ppTarget}`);
            for (const [idx, p] of allPagePatches.entries()) {
              console.log(`  [${idx}] target=${p.targetFile} hasFunction=${p.codeBlock.includes('function ')} first80=${p.codeBlock.substring(0, 80).replace(/\n/g, ' ')}`);
            }
            // Always prefer the first patch with 'function ' (domain patches have this)
            const pagePatch = allPagePatches.find(p => p.codeBlock.includes('function ')) || allPagePatches[0];
            if (pagePatch) {
              console.log(`[orchestrator] Selected patch: first100=${pagePatch.codeBlock.substring(0, 100).replace(/\n/g, ' ')}`);
            }
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

    // ─── Self-Healing Loop ───────────────────────────────────────
    // If there are TypeScript errors remaining, run the self-healing engine
    // to automatically fix them via LLM-generated repairs.
    if (failed.length === 0 || pageResults.some(r => r.succeeded)) {
      const postCompileErrors = this.auditor.audit(workspace.rootPath);
      if (postCompileErrors.length > 0) {
        console.log(`[orchestrator] Post-compile: ${postCompileErrors.length} TypeScript errors detected — running self-healing engine...`);

        const healer = new SelfHealingEngine(5, 20);
        const healingResult = await healer.heal(
          workspace.rootPath,
          gateway,
          prompt,
          (iteration, errors, message) => {
            console.log(`[orchestrator] Self-heal iteration ${iteration}: ${message}`);
          }
        );

        console.log(`[orchestrator] Self-healing complete: ${healingResult.errorsFixed} errors fixed, ${healingResult.remainingErrors.length} remaining`);
        TelemetryLayer.reportHealing(workspaceId, healingResult.iterations, healingResult.errorsFixed);

        // Update page results based on healing outcome
        if (healingResult.success) {
          // All pages now compile
          for (const pr of pageResults) {
            pr.succeeded = true;
            pr.lastError = undefined;
          }
        }
      }
    }

    const finalFailed = pageResults.filter(r => !r.succeeded);

    if (finalFailed.length > 0) {
      console.warn(`[orchestrator] Build partial: ${succeeded}/${pageResults.length} pages succeeded`);
    } else {
      console.log(`[orchestrator] Build complete: ${pageResults.length} pages compiled.`);
    }

    const result: GenerationResult = {
      success: finalFailed.length === 0,
      intent,
      workspaceId,
      blueprint,
      pageResults,
      duration: Date.now() - startTime,
    };

    if (finalFailed.length > 0) {
      result.error = `${finalFailed.length} page(s) failed: ${finalFailed.map(f => `${f.path} — ${f.lastError}`).join('; ')}`;
    }

    TelemetryLayer.reportBuildComplete({
      workspaceId,
      prompt: prompt.slice(0, 200),
      pagesTotal: pageResults.length,
      pagesSucceeded: succeeded,
      pagesFailed: finalFailed.length,
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
    const blueprint = FullStackArchitect.design(prompt);
    FullStackCompilerPipeline.compile(workspace, blueprint);

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

    // Step 2: Generative pipeline for business logic and all content
    // (never copy competitor text/prices verbatim)
    console.log(`[hybrid] Running generative pipeline for business content...`);
    const gateway = new LLMGateway(llmConfig || { provider: 'openai', apiKey: '' });

    // Content research
    try {
      const researcher = new ContentResearchAgent();
      const research = await researcher.research(prompt);
      gateway.setResearch(research);
    } catch {}

    const pageResults: Array<{ path: string; succeeded: boolean; lastError?: string | undefined }> = [];
    const PER_PAGE_RETRIES = 3;

    const pagePromptData = blueprint.pages.map((page) => {
      const funcName = DeterministicOrchestratorV4.ROUTE_FUNC_MAP[page.path]
        || page.path.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\s+/g, '');
      const targetFile = page.path === '/' ? 'src/app/page.tsx' : `src/app${page.path}/page.tsx`;
      const pagePrompt = this.buildPagePrompt(page, funcName, blueprint);
      return { pagePath: page.path, targetFile, funcName, prompt: pagePrompt };
    });

    // Per-page LLM calls
    const patchMap: Map<string, ASTPatch[]> = new Map();
    for (const pp of pagePromptData) {
      try {
        const patches = await gateway.generatePatches({ prompt: pp.prompt, attempt: 0, changedFiles: [], errors: [] });
        patchMap.set(pp.targetFile, patches);
      } catch {}
    }

    // Apply patches
    for (const [i, page] of blueprint.pages.entries()) {
      const pp = pagePromptData[i];
      if (!pp) continue;
      try {
        await this.runCompilationFlow(
          workspaceId, pp.prompt,
          async () => {
            const allPagePatches = (patchMap.get(pp.targetFile) || []).filter(p => p.targetFile === pp.targetFile);
            const pagePatch = allPagePatches.find(p => p.codeBlock.includes('function ')) || allPagePatches[0];
            const componentPatches = (patchMap.get(pp.targetFile) || []).filter(p => p.targetFile.startsWith('src/components/'));
            return [pagePatch, ...componentPatches].filter(Boolean) as ASTPatch[];
          },
          PER_PAGE_RETRIES, true, i * (PER_PAGE_RETRIES + 1)
        );
        pageResults.push({ path: page.path, succeeded: true });
      } catch (err: any) {
        pageResults.push({ path: page.path, succeeded: false, lastError: err.message });
      }
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
