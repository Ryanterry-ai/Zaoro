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

import { ASTPatch, CompilationError, WorkspaceConfig, LLMContext, LLMConfig, GenerationIntent, GenerationResult } from '../types/index.js';
import { LLMGateway } from '../core/llm-gateway.js';
import { BusinessClassifier } from '../generation/business-classifier.js';
import { ProjectBlueprintGenerator } from '../generation/project-blueprint.js';
import { ClonePlanGenerator } from '../generation/clone-plan-generator.js';
import { WebsiteAnalyzer } from '../generation/website-analyzer.js';
import { ArchitectAgent } from '../generation/architect.js';
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

  private classifier: BusinessClassifier;
  private blueprintGenerator: ProjectBlueprintGenerator;
  private clonePlanGenerator: ClonePlanGenerator;
  private websiteAnalyzer: WebsiteAnalyzer;
  private architect: ArchitectAgent;

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

    this.classifier = new BusinessClassifier();
    this.blueprintGenerator = new ProjectBlueprintGenerator();
    this.clonePlanGenerator = new ClonePlanGenerator();
    this.websiteAnalyzer = new WebsiteAnalyzer();
    this.architect = new ArchitectAgent();
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

  private async handleBuildIntent(
    workspaceId: string,
    intent: GenerationIntent,
    llmConfig: LLMConfig | undefined,
    startTime: number
  ): Promise<GenerationResult> {
    const prompt = intent.prompt || '';
    const workspace = this.sandbox.createWorkspace(this.workspaceBaseDir, workspaceId);

    const decision = this.architect.designArchitecture(prompt);
    console.log(`[build.same.generation] Architect: ${decision.businessType} (${decision.subDomains.join(', ')})`);
    console.log(`[build.same.generation] Pages: ${decision.pages.map(p => p.route).join(', ')}`);

    for (const page of decision.pages) {
      const pagePath = path.join(workspace.rootPath, 'src', 'app', page.route === '/' ? 'page.tsx' : `${page.route}/page.tsx`);
      fs.mkdirSync(path.dirname(pagePath), { recursive: true });
      if (!fs.existsSync(pagePath)) {
        const funcName = page.route === '/' ? 'Home' : page.name.replace(/\s+/g, '');
        fs.writeFileSync(pagePath, `export default function ${funcName}() { return <div>${page.name}</div>; }`, 'utf-8');
      }
    }

    const blueprint = this.blueprintGenerator.generateForBusinessType(decision.businessType as import('../generation/types.js').BusinessType, decision.name);

    if (!llmConfig) {
      return {
        success: true,
        intent,
        workspaceId: workspace.workspaceId,
        blueprint,
        duration: Date.now() - startTime,
      };
    }

    const gateway = new LLMGateway(llmConfig);
    const config = await this.runCompilationFlow(
      workspaceId,
      intent.prompt || '',
      async (ctx: LLMContext) => await gateway.generatePatches(ctx),
      5,
      true
    );

    return {
      success: true,
      intent,
      workspaceId: config.workspaceId,
      blueprint,
      duration: Date.now() - startTime,
    };
  }

  private async handleCloneIntent(
    intent: GenerationIntent,
    startTime: number
  ): Promise<GenerationResult> {
    const targetUrl = intent.targetUrl || '';
    const domain = new URL(targetUrl).hostname;

    console.log(`[build.same.generation] Clone target: ${domain}`);

    const analysis = this.websiteAnalyzer.createAnalysis({
      domain,
      url: targetUrl,
      title: `Clone of ${domain}`,
      description: `Cloned from ${targetUrl}`,
    });

    const clonePlan = this.clonePlanGenerator.generate(analysis, intent.strategy);

    console.log(`[build.same.generation] Clone plan: ${clonePlan.routesToBuild.length} routes, ${clonePlan.componentsToCreate.length} components, ${clonePlan.dataModels.length} data models`);

    return {
      success: true,
      intent,
      clonePlan,
      analysis,
      duration: Date.now() - startTime,
    };
  }

  private async handleAnalyzeIntent(
    intent: GenerationIntent,
    startTime: number
  ): Promise<GenerationResult> {
    const domain = intent.domain || '';
    console.log(`[build.same.generation] Analyzing domain: ${domain}`);

    const analysis = this.websiteAnalyzer.createAnalysis({
      domain,
      url: `https://${domain}`,
      title: domain,
    });

    return {
      success: true,
      intent,
      analysis,
      duration: Date.now() - startTime,
    };
  }

  private async handleExtractComponentsIntent(
    intent: GenerationIntent,
    startTime: number
  ): Promise<GenerationResult> {
    const domain = intent.domain || '';
    console.log(`[build.same.generation] Extracting components from: ${domain}`);

    const analysis = this.websiteAnalyzer.createAnalysis({
      domain,
      url: `https://${domain}`,
      title: domain,
    });

    return {
      success: true,
      intent,
      analysis,
      duration: Date.now() - startTime,
    };
  }

  private async handleExtractDesignSystemIntent(
    intent: GenerationIntent,
    startTime: number
  ): Promise<GenerationResult> {
    const domain = intent.domain || '';
    console.log(`[build.same.generation] Extracting design system from: ${domain}`);

    const analysis = this.websiteAnalyzer.createAnalysis({
      domain,
      url: `https://${domain}`,
      title: domain,
    });

    return {
      success: true,
      intent,
      analysis,
      duration: Date.now() - startTime,
    };
  }

  public async runCompilationFlow(
    workspaceId: string,
    prompt: string,
    llmClientGateway: (context: LLMContext) => Promise<ASTPatch[]>,
    maxRetries: number = 5,
    skipDevServer: boolean = false
  ): Promise<WorkspaceConfig> {
    const workspace = this.sandbox.createWorkspace(this.workspaceBaseDir, workspaceId);

    console.log(`[build.same.orchestrator-v4] Performing package dependency install...`);
    await this.sandbox.runPackageInstall(workspace);

    let activeErrors: CompilationError[] = [];
    let attempts = 0;

    this.indexer.clearCache();

    while (attempts < maxRetries) {
      console.log(`[build.same.orchestrator-v4] Indexing dynamic import trees...`);
      this.buildDependencyGraph(workspace.rootPath);

      console.log(`[build.same.orchestrator-v4] Saving filesystem rollback version: [V${attempts}]`);
      this.snapshot.takeSnapshot(workspace.rootPath, attempts);

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
        this.snapshot.restore(workspace.rootPath, attempts);

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
        this.snapshot.restore(workspace.rootPath, attempts);

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
        this.snapshot.restore(workspace.rootPath, attempts);

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
        this.snapshot.restore(workspace.rootPath, attempts);

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
        this.snapshot.clearSnapshots(workspace.rootPath);
        if (!skipDevServer) {
          await this.sandbox.launchDevInstance(workspace);
        }
        return workspace;
      }

      console.warn(`[build.same.orchestrator-v4] Build failed. Compiler reported ${activeErrors.length} type/syntax errors.`);

      this.snapshot.restore(workspace.rootPath, attempts);
      attempts++;
    }

    this.snapshot.clearSnapshots(workspace.rootPath);
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

  public getClassifier(): BusinessClassifier {
    return this.classifier;
  }

  public getBlueprintGenerator(): ProjectBlueprintGenerator {
    return this.blueprintGenerator;
  }

  public getClonePlanGenerator(): ClonePlanGenerator {
    return this.clonePlanGenerator;
  }

  public getWebsiteAnalyzer(): WebsiteAnalyzer {
    return this.websiteAnalyzer;
  }
}
