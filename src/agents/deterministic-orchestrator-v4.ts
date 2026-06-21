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

import { ASTPatch, CompilationError, WorkspaceConfig, LLMContext } from '../types/index.js';
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

    // Flush parsing cache at startup to guarantee absolute compilation isolation
    this.indexer.clearCache();

    while (attempts < maxRetries) {
      // --- STEP 1: Construct & Align Dependency Graph Baseline ---
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

      // --- STEP 2: Rank Patches Ascending (Safest Executed First) ---
      console.log(`[build.same.orchestrator-v4] Scoring patches using graph risk matrix...`);
      const rankedPatches = this.ranker.rank(patches);

      // --- STEP 3: API Contract Collision & Regression Gate ---
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

      // --- STEP 4: Strict Schema & AST Pre-Flight Validation ---
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

      // --- STEP 5: In-Memory Dry-Run Mutation Simulation ---
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

      // --- STEP 6: Execute Staged File System Transaction ---
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

      // --- STEP 7: Audit Compilation State ---
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

    this.snapshot.clearSnapshots(workspace.rootPath); // Prevent memory leaks on failure
    throw new Error(`Orchestration loops exhausted without compiling error-free build.`);
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

  public stopDevInstance(workspaceId: string): void {
    this.sandbox.stopDevInstance(workspaceId);
  }
}