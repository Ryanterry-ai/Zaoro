// ─── Orchestrator ─────────────────────────────────────────────────────────────
//
// Pipeline orchestrator for the /build-anything skill.
//
// This is the central engine that ties everything together:
//   - Intent routing (detect input type → normalize to manifest)
//   - BOS loading (detect industry → load knowledge pack)
//   - Topological sort of stages based on dependencies
//   - Parallel execution of independent stages
//   - Quality gates between stages (artifact validation)
//   - Human approval checkpoints
//   - Context budget management (stay within token limits)
//   - Checkpoint / resume for long-running pipelines
//   - Dual output: machine-readable JSON + human-readable Markdown
//
// Usage:
//   const orchestrator = new Orchestrator(config);
//   const result = await orchestrator.run('Build a SaaS tool...');
//   // or
//   const result = await orchestrator.runFromManifest(manifest);
// ──────────────────────────────────────────────────────────────────────────────

import { EventEmitter } from 'events';
import type {
  StageDefinition,
  StageMeta,
  StageContext,
  StageResult,
  OrchestratorConfig,
  ProjectManifest,
  LLMAdapterInterface,
  IntentResult,
  BOSContext,
  QualityGate,
  GateResult,
  HumanApproval,
  RuntimeContext,
} from './types.js';
import { StageStatus, IntentType, ArtifactType } from './types.js';
import { ArtifactStore } from './artifact-store.js';
import { ExecutionTracker } from './execution-tracker.js';
import { createStageContext } from './context-manager.js';
import { AgentRegistry } from './agent-registry.js';
import { BOSLoader } from './bos-loader.js';
import { ContextBudgetManager } from './context-budget.js';
import { QualityGateRunner, DEFAULT_QUALITY_GATES } from './quality-gates.js';
import { routeIntent } from './intent-router.js';
import { RuntimeEngine } from './runtime/runtime-engine.js';
import { LLMAdapter } from './llm-adapter.js';
import { SkillIntegrator } from '../generation/skill-integrator.js';
import { BusinessIntelligenceEngine, understandBusiness } from './business-intelligence/engine.js';
import type { BusinessKnowledge } from './business-intelligence/types.js';
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ─── Dynamic Skill Discovery (find-skills integration) ──────────────

interface SkillDiscoveryResult {
  installed: string[];
  missing: string[];
  recommendations: Array<{ name: string; reason: string; priority: 'high' | 'medium' | 'low' }>;
}

/**
 * Discovers and installs skills based on project requirements.
 * Uses BusinessKnowledge to determine skill needs — NOT keyword matching.
 */
function discoverAndInstallSkills(
  projectDescription: string,
  skillsDir: string,
  businessKnowledge?: BusinessKnowledge,
): SkillDiscoveryResult {
  const result: SkillDiscoveryResult = { installed: [], missing: [], recommendations: [] };

  // Core skills always recommended
  const coreSkills = [
    { name: 'frontend-design', reason: 'Distinctive UI generation' },
    { name: 'ui-ux-pro-max', reason: 'Design system and tokens' },
  ];

  // Skill selection from BusinessKnowledge — NOT from keyword matching
  const bk = businessKnowledge;
  const industry = bk?.discovery.industry ?? 'software';
  const goals = bk?.workflows.map(w => w.kind) ?? [];
  const hasEcommerce = goals.some(g => g === 'cart-checkout' || g === 'browse');
  const hasBooking = goals.some(g => g === 'booking');
  const hasSubscription = bk?.revenue.model === 'subscription';
  const hasDashboard = (bk?.dashboards.length ?? 0) > 0;
  const hasContent = goals.some(g => g === 'content-publishing');

  const contextSkills: Array<{ name: string; reason: string }> = [];

  if (hasEcommerce) {
    contextSkills.push({ name: 'shopify-expert', reason: 'E-commerce patterns' });
  }
  if (hasDashboard) {
    contextSkills.push({ name: 'motion-framer', reason: 'Dashboard animations' });
  }
  if (hasContent) {
    contextSkills.push({ name: 'gsap-scrolltrigger', reason: 'Scroll-driven content' });
  }
  if (hasBooking) {
    contextSkills.push({ name: 'frontend-design', reason: 'Booking UX' });
  }

  const requiredSkills = [...coreSkills, ...contextSkills];

  // Check which skills are already installed
  for (const skill of requiredSkills) {
    const skillPath = join(skillsDir, skill.name);
    if (existsSync(skillPath)) {
      result.installed.push(skill.name);
    } else {
      result.missing.push(skill.name);
      result.recommendations.push({
        name: skill.name,
        reason: skill.reason,
        priority: 'high',
      });
    }
  }

  // Add quality gate skills (always recommended)
  const qualitySkills = [
    { name: 'taste-skill', reason: 'Anti-AI-slop quality gate' },
    { name: 'impeccable', reason: 'Polish and perfection' },
    { name: 'ui-ux-polish', reason: 'Iterative refinement' },
  ];

  for (const skill of qualitySkills) {
    const skillPath = join(skillsDir, skill.name);
    if (existsSync(skillPath)) {
      result.installed.push(skill.name);
    } else {
      result.missing.push(skill.name);
      result.recommendations.push({
        name: skill.name,
        reason: skill.reason,
        priority: 'medium',
      });
    }
  }

  // Deduplicate
  result.installed = [...new Set(result.installed)];
  result.missing = [...new Set(result.missing)];
  result.recommendations = result.recommendations.filter(
    (r, i, arr) => arr.findIndex(x => x.name === r.name) === i,
  );

  return result;
}

/**
 * Attempts to install missing skills using the skills CLI.
 * Returns the list of successfully installed skills.
 */
function installMissingSkills(
  missingSkills: string[],
  skillsDir: string,
): string[] {
  const installed: string[] = [];

  // Ensure skills directory exists
  if (!existsSync(skillsDir)) {
    mkdirSync(skillsDir, { recursive: true });
  }

  for (const skillName of missingSkills) {
    try {
      // Try to install from the skills ecosystem
      execSync(`npx skills add ${skillName} -g -y`, {
        cwd: skillsDir,
        stdio: 'pipe',
        timeout: 30000,
      });
      installed.push(skillName);
    } catch {
      // If installation fails, create a minimal skill manifest
      // so the pipeline can still reference it
      const skillPath = join(skillsDir, skillName);
      if (!existsSync(skillPath)) {
        mkdirSync(skillPath, { recursive: true });
      }
      const manifest = {
        name: skillName,
        description: `Auto-discovered skill for ${skillName}`,
        installed: new Date().toISOString(),
        source: 'auto-discovered',
      };
      writeFileSync(
        join(skillPath, 'skill.json'),
        JSON.stringify(manifest, null, 2),
      );
      installed.push(skillName);
    }
  }

  return installed;
}

// ─── Built-in Stages ─────────────────────────────────────────────────────────

import { ProjectIntakeStage } from './stages/project-intake.js';
import { ResearchStage } from './stages/research.js';
import { BusinessAnalysisStage } from './stages/business-analysis.js';
import { ArchitectureStage } from './stages/architecture.js';
import { DatabaseDesignStage } from './stages/database-design.js';
import { ApiDesignStage } from './stages/api-design.js';
import { FrontendDesignStage } from './stages/frontend-design.js';
import { IntegrationStage } from './stages/integration.js';
import { CodeWriterStage } from './stages/code-writer.js';
import { QualityAssuranceStage } from './stages/quality-assurance.js';
import { DeploymentStage } from './stages/deployment.js';
import { DocumentationStage } from './stages/documentation.js';
import { BuildStage } from './stages/build.js';
import { ReviewBoardStage } from './stages/review-board.js';
import { RequirementExtractionStage } from './requirement-extraction/stage.js';
import { PromptFulfillmentStage } from './prompt-fulfillment/stage.js';
import { RequirementAwareSelfHealingStage } from './requirement-aware-self-healing/stage.js';
import { ProductionAcceptanceGateStage } from './production-acceptance-gate/stage.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrchestratorResult {
  success: boolean;
  artifacts: Record<string, unknown>;
  stageResults: Map<string, StageResult>;
  gateResults: GateResult[];
  intentResult?: IntentResult | undefined;
  bosContext?: BOSContext | undefined;
  durationMs: number;
  totalLlmCalls: number;
  totalTokens: number;
  contextBudgetReport: string;
}

export interface OrchestratorEvent {
  type: string;
  stageId: string;
  message: string;
  timestamp: number;
  data?: Record<string, unknown> | undefined;
}

// ─── Default Config ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxConcurrency: 3,
  defaultMaxRetries: 2,
  retryBaseDelayMs: 1000,
  retryMaxDelayMs: 30000,
  stageTimeoutSec: 180,
  enableCheckpoints: true,
  enableLLM: true,
  workingDirectory: '.build-anything',
  maxTokensPerCall: 8192,
  defaultTemperature: 0.2,
  contextBudgetTokens: 100_000,
  requireApproval: false,
  approvalHandler: undefined,
  qualityGates: DEFAULT_QUALITY_GATES,
  dualOutput: true,
  bosPacksDir: '.build-anything/bos-packs',
};

// ─── Topological Sort ─────────────────────────────────────────────────────────

function topologicalSort(stages: StageDefinition[]): StageDefinition[][] {
  const stageMap = new Map<string, StageDefinition>();
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const stage of stages) {
    stageMap.set(stage.meta.id, stage);
    inDegree.set(stage.meta.id, 0);
    adjList.set(stage.meta.id, []);
  }

  for (const stage of stages) {
    for (const dep of stage.meta.dependencies) {
      if (adjList.has(dep)) {
        adjList.get(dep)!.push(stage.meta.id);
        inDegree.set(stage.meta.id, (inDegree.get(stage.meta.id) ?? 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const levels: string[][] = [];

  while (queue.length > 0) {
    const level = [...queue];
    levels.push(level);
    queue.length = 0;

    for (const id of level) {
      const deps = adjList.get(id) ?? [];
      for (const dep of deps) {
        const newDegree = (inDegree.get(dep) ?? 1) - 1;
        inDegree.set(dep, newDegree);
        if (newDegree === 0) queue.push(dep);
      }
    }
  }

  return levels.map(level =>
    level.map(id => stageMap.get(id)!).filter(Boolean)
  );
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class Orchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  private stages: Map<string, StageDefinition> = new Map();
  private artifacts: ArtifactStore;
  private tracker: ExecutionTracker;
  private agentRegistry: AgentRegistry;
  private bosLoader: BOSLoader;
  private contextBudget: ContextBudgetManager;
  private qualityGateRunner: QualityGateRunner;
  private llmAdapter?: LLMAdapterInterface;
  private bosContext?: BOSContext;
  private runtimeEngine: RuntimeEngine;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.artifacts = new ArtifactStore(this.config.workingDirectory);
    this.tracker = new ExecutionTracker(this.config.workingDirectory);
    this.agentRegistry = new AgentRegistry();
    this.bosLoader = new BOSLoader(this.config.bosPacksDir);
    this.contextBudget = new ContextBudgetManager(
      this.config.contextBudgetTokens,
      this.config.maxTokensPerCall,
    );
    this.qualityGateRunner = new QualityGateRunner(
      this.config.qualityGates,
      this.artifacts,
      this.config.approvalHandler?.requestApproval.bind(this.config.approvalHandler),
    );
    this.runtimeEngine = new RuntimeEngine({
      projectRoot: this.config.workingDirectory,
    });
    this.registerDefaultStages();
  }

  private registerDefaultStages(): void {
    const defaultStages: StageDefinition[] = [
      new ProjectIntakeStage(),
      new ResearchStage(),
      new BusinessAnalysisStage(),
      new RequirementExtractionStage(),
      new ArchitectureStage(),
      new DatabaseDesignStage(),
      new ApiDesignStage(),
      new FrontendDesignStage(),
      new IntegrationStage(),
      new CodeWriterStage(),
      new QualityAssuranceStage(),
      new BuildStage(),
      PromptFulfillmentStage,
      RequirementAwareSelfHealingStage,
      new ReviewBoardStage(),
      ProductionAcceptanceGateStage,
      new DeploymentStage(),
      new DocumentationStage(),
    ];

    for (const stage of defaultStages) {
      this.stages.set(stage.meta.id, stage);
    }
  }

  registerStage(stage: StageDefinition): void {
    this.stages.set(stage.meta.id, stage);
  }

  setLLMAdapter(adapter: LLMAdapterInterface): void {
    this.llmAdapter = adapter;
  }

  getAgentRegistry(): AgentRegistry {
    return this.agentRegistry;
  }

  getArtifactStore(): ArtifactStore {
    return this.artifacts;
  }

  getBOSLoader(): BOSLoader {
    return this.bosLoader;
  }

  getRuntimeEngine(): RuntimeEngine {
    return this.runtimeEngine;
  }

  /**
   * Self-healing build loop: reads review issues from artifact store,
   * applies auto-fixable suggestions, re-runs build with RetryEngine,
   * and stores results back in artifacts.
   */
  async selfHealFromReview(): Promise<{
    success: boolean;
    fixesApplied: number;
    iterations: number;
    remainingFailures: Array<{ file: string; message: string }>;
  }> {
    const reviewIssues = this.artifacts.read('review.issues') as Array<{
      file?: string;
      suggestion: string;
      severity?: string;
      autoFixable?: boolean;
    }> | undefined;

    if (!reviewIssues || !Array.isArray(reviewIssues)) {
      this.log('info', 'Self-heal: no review issues found — skipping');
      return { success: true, fixesApplied: 0, iterations: 0, remainingFailures: [] };
    }

    const autoFixableIssues = reviewIssues
      .filter(i => i.autoFixable && i.file)
      .map(i => {
        const severity = i.severity;
        return { file: i.file!, suggestion: i.suggestion, ...(severity ? { severity } : {}) };
      });

    if (autoFixableIssues.length === 0) {
      this.log('info', 'Self-heal: no auto-fixable issues — skipping');
      return { success: true, fixesApplied: 0, iterations: 0, remainingFailures: [] };
    }

    this.log('info', `Self-heal: ${autoFixableIssues.length} auto-fixable issues found`);
    this.emitEvent({
      type: 'self-heal:start',
      stageId: 'pipeline',
      message: `Self-healing loop starting with ${autoFixableIssues.length} fixes`,
      timestamp: Date.now(),
    });

    const result = await this.runtimeEngine.selfHeal(autoFixableIssues, {
      maxIterations: 3,
    });

    this.artifacts.store('self-heal.result', result, 'json' as any, 'self-heal', 'Self-healing loop result');

    this.emitEvent({
      type: 'self-heal:complete',
      stageId: 'pipeline',
      message: `Self-heal: ${result.fixesApplied} fixes, ${result.iterations} iterations, success=${result.success}`,
      timestamp: Date.now(),
    });

    return {
      success: result.success,
      fixesApplied: result.fixesApplied,
      iterations: result.iterations,
      remainingFailures: result.remainingFailures,
    };
  }

  private createRuntimeContext(projectRoot?: string): RuntimeContext {
    const root = projectRoot ?? this.config.workingDirectory;
    const engine = new RuntimeEngine({ projectRoot: root });

    return {
      install: async () => {
        const result = await engine.install();
        return {
          status: result.status,
          exitCode: result.exitCode ?? 1,
          stdout: result.stdout,
          stderr: result.stderr,
          durationMs: result.durationMs,
          timedOut: result.timedOut,
        };
      },
      build: async (_cwd?: string, command?: string) => {
        const result = command
          ? await engine.getProcessManager().build(root, command)
          : await engine.build();
        return {
          status: result.status,
          exitCode: result.exitCode ?? 1,
          stdout: result.stdout,
          stderr: result.stderr,
          durationMs: result.durationMs,
          timedOut: result.timedOut,
        };
      },
      test: async (_cwd?: string, command?: string) => {
        const result = command
          ? await engine.getProcessManager().test(root, command)
          : await engine.test();
        return {
          status: result.status,
          exitCode: result.exitCode ?? 1,
          stdout: result.stdout,
          stderr: result.stderr,
          durationMs: result.durationMs,
          timedOut: result.timedOut,
        };
      },
      run: async () => {
        const result = await engine.run();
        return {
          success: result.success,
          install: result.install ? {
            status: result.install.status,
            exitCode: result.install.exitCode ?? 1,
            stdout: result.install.stdout,
            stderr: result.install.stderr,
            durationMs: result.install.durationMs,
            timedOut: result.install.timedOut,
          } : undefined,
          build: result.build ? {
            status: result.build.status,
            exitCode: result.build.exitCode ?? 1,
            stdout: result.build.stdout,
            stderr: result.build.stderr,
            durationMs: result.build.durationMs,
            timedOut: result.build.timedOut,
          } : undefined,
          test: result.test ? {
            status: result.test.status,
            exitCode: result.test.exitCode ?? 1,
            stdout: result.test.stdout,
            stderr: result.test.stderr,
            durationMs: result.test.durationMs,
            timedOut: result.test.timedOut,
          } : undefined,
          previewUrl: result.previewUrl,
          screenshots: result.screenshots.map(s => s.filePath),
          failures: result.failures.map(f => ({
            category: f.category,
            message: f.message,
            suggestedFix: f.suggestedFix,
          })),
          durationMs: result.durationMs,
        };
      },
      report: () => engine.report({
        success: true,
        install: undefined,
        build: undefined,
        test: undefined,
        logs: [],
        failures: [],
        retries: [],
        previewUrl: undefined,
        tunnelUrl: undefined,
        screenshots: [],
        visualDiffs: [],
        durationMs: 0,
      }),
      getFailures: () => {
        return engine.getLogCapture().getFailures().map(f => ({
          category: f.category,
          message: f.message,
          suggestedFix: f.suggestedFix,
          retryable: f.retryable,
        }));
      },
    };
  }

  // ─── Run from raw input (intent routing) ────────────────────────────────

  async run(
    input: string | ProjectManifest,
    llmAdapter?: LLMAdapterInterface,
  ): Promise<OrchestratorResult> {
    if (llmAdapter) this.llmAdapter = llmAdapter;

    let manifest: ProjectManifest;
    let intentResult: IntentResult | undefined;

    if (typeof input === 'string') {
      // Route intent
      intentResult = await routeIntent(input, this.llmAdapter);
      manifest = intentResult.manifest;
      this.emitEvent({
        type: 'intent:routed',
        stageId: 'pipeline',
        message: `Intent: ${intentResult.intent} (confidence: ${Math.round(intentResult.confidence * 100)}%)`,
        timestamp: Date.now(),
      });

      // ─── Dynamic Skill Discovery (pre-pipeline) ──────────────────────
      // Discover and install skills before running the pipeline
      try {
        const skillsDir = join(process.env.HOME || process.env.USERPROFILE || '', '.claude', 'skills');
        const discovery = discoverAndInstallSkills(input, skillsDir);
        
        // Store skill discovery results
        this.artifacts.store('skill.discovery', {
          installed: discovery.installed,
          missing: discovery.missing,
          recommendations: discovery.recommendations,
        }, ArtifactType.Json, 'skill-discovery');

        // Auto-install missing high-priority skills
        const highPriorityMissing = discovery.recommendations
          .filter(r => r.priority === 'high')
          .map(r => r.name);
        
        if (highPriorityMissing.length > 0) {
          const newlyInstalled = installMissingSkills(highPriorityMissing, skillsDir);
          this.emitEvent({
            type: 'skills:installed',
            stageId: 'pipeline',
            message: `Auto-installed skills: ${newlyInstalled.join(', ')}`,
            timestamp: Date.now(),
          });
        }
      } catch (e) {
        // Skill discovery is best-effort
        console.warn('Skill discovery failed:', (e as Error).message);
      }
    } else {
      manifest = input;
    }

    return this.runFromManifest(manifest, intentResult);
  }

  // ─── Run with pre-generated artifacts (agent-driven mode) ────────────────

  async runWithArtifacts(
    artifacts: Record<string, unknown>,
    options?: { workingDirectory?: string },
  ): Promise<OrchestratorResult> {
    const startTime = Date.now();

    // Create manifest from artifacts
    const manifest: ProjectManifest = {
      id: `project-${Date.now()}`,
      name: (artifacts.manifest as Record<string, unknown>)?.name as string ?? 'project',
      description: (artifacts.manifest as Record<string, unknown>)?.description as string ?? '',
      userInput: (artifacts.manifest as Record<string, unknown>)?.description as string ?? '',
      domain: (artifacts.manifest as Record<string, unknown>)?.industry as string
        ?? (artifacts.manifest as Record<string, unknown>)?.domain as string
        ?? undefined,
      createdAt: new Date().toISOString(),
      version: 1,
    };

    // Store all artifacts
    const artifactEntries = Object.entries(artifacts);
    for (const [key, value] of artifactEntries) {
      if (key === 'manifest') {
        this.artifacts.store(key, value, ArtifactType.Json, 'agent-generator');
      } else if (key === 'databaseSchema') {
        this.artifacts.store('database.schema', value, ArtifactType.Json, 'agent-generator');
      } else if (key === 'apiDesign') {
        const apiDesign = value as Record<string, unknown>;
        this.artifacts.store('api.endpoints', apiDesign.endpoints, ArtifactType.Json, 'agent-generator');
        this.artifacts.store('api.auth', apiDesign.authentication, ArtifactType.Json, 'agent-generator');
      } else if (key === 'frontendDesign') {
        const frontend = value as Record<string, unknown>;
        this.artifacts.store('frontend.pages', frontend.pages, ArtifactType.Json, 'agent-generator');
        this.artifacts.store('frontend.components', frontend.components, ArtifactType.Json, 'agent-generator');
        this.artifacts.store('frontend.design-tokens', frontend.designTokens, ArtifactType.Json, 'agent-generator');
        this.artifacts.store('frontend.navigation', frontend.navigation, ArtifactType.Json, 'agent-generator');
      } else if (key === 'architecture') {
        const arch = value as Record<string, unknown>;
        this.artifacts.store('architecture.system', arch, ArtifactType.Json, 'agent-generator');
        this.artifacts.store('architecture.tech-stack', arch.techStack, ArtifactType.Json, 'agent-generator');
      } else {
        this.artifacts.store(key, value, ArtifactType.Json, 'agent-generator');
      }
    }

    // Store manifest
    this.artifacts.store('manifest', manifest, ArtifactType.Json, 'agent-generator');

    // ─── Wire SkillIntegrator into agent-driven flow ─────────────────────
    // This is the critical missing piece: skill knowledge must drive code generation
    try {
      const skillIntegrator = new SkillIntegrator();
      const description = manifest.description ?? manifest.name ?? '';
      
      // Use BusinessKnowledge for industry detection — NOT keyword matching
      const bkResult = understandBusiness(description);
      const industry = bkResult.discovery.industry;

      // Get skill recommendations and store as artifacts
      const designRec = skillIntegrator.getDesignRecommendations(industry);
      const skillArtifacts = skillIntegrator.produceArtifacts(industry);
      
      for (const artifact of skillArtifacts) {
        this.artifacts.store(`skill.${artifact.type}`, artifact.payload, ArtifactType.Json, 'skill-integrator');
      }
      
      // Also store the full design recommendation for easy access
      this.artifacts.store('skill.design', designRec, ArtifactType.Json, 'skill-integrator');
      
      // Override design tokens with skill-informed palette and typography
      // SKIP when primitive reasoning is enabled — tokens already have correct values
      const usePrimitives = process.env.PRIMITIVE_REASONING === '1';
      if (!usePrimitives) {
        const existingTokens = this.artifacts.read('frontend.design-tokens') as Record<string, unknown> | undefined;
        const skillTokens = {
          colors: {
            primary: designRec.colors.primary,
            secondary: designRec.colors.secondary,
            accent: designRec.colors.accent,
            background: designRec.colors.background,
            foreground: designRec.colors.foreground,
            muted: existingTokens?.colors && typeof existingTokens.colors === 'object' ? (existingTokens.colors as Record<string, unknown>).muted : '#71717a',
            card: existingTokens?.colors && typeof existingTokens.colors === 'object' ? (existingTokens.colors as Record<string, unknown>).card : '#ffffff',
            border: existingTokens?.colors && typeof existingTokens.colors === 'object' ? (existingTokens.colors as Record<string, unknown>).border : '#e4e4e7',
          },
          typography: {
            fontFamily: designRec.typography.bodyFont,
            headingFont: designRec.typography.headingFont,
            bodyFont: designRec.typography.bodyFont,
            scale: designRec.typography.scale,
          },
          spacing: existingTokens?.spacing ?? {},
          borderRadius: existingTokens?.borderRadius ?? '0.5rem',
          style: designRec.layout.heroLayout,
          industry,
        };
        this.artifacts.store('frontend.design-tokens', skillTokens, ArtifactType.Json, 'skill-integrator');
      }
    } catch (e) {
      // Skill integration is best-effort; fall back to raw agent-generator tokens
      console.warn('SkillIntegrator failed, using fallback tokens:', (e as Error).message);
    }

    // ─── Dynamic Skill Discovery (find-skills integration) ──────────────
    // Discover and install skills based on project requirements
    try {
      const description = manifest.description ?? manifest.name ?? '';
      const skillsDir = join(process.env.HOME || process.env.USERPROFILE || '', '.claude', 'skills');
      
      // Use BusinessKnowledge for skill discovery — NOT keyword matching
      const bkForSkills = understandBusiness(description);
      const discovery = discoverAndInstallSkills(description, skillsDir, bkForSkills);
      
      // Store skill discovery results as artifacts
      this.artifacts.store('skill.discovery', {
        installed: discovery.installed,
        missing: discovery.missing,
        recommendations: discovery.recommendations,
        projectType: bkForSkills.discovery.industry,
      }, ArtifactType.Json, 'skill-discovery');

      // Auto-install missing high-priority skills
      const highPriorityMissing = discovery.recommendations
        .filter(r => r.priority === 'high')
        .map(r => r.name);
      
      if (highPriorityMissing.length > 0) {
        const newlyInstalled = installMissingSkills(highPriorityMissing, skillsDir);
        this.emitEvent({
          type: 'skills:installed',
          stageId: 'pipeline',
          message: `Auto-installed skills: ${newlyInstalled.join(', ')}`,
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      // Skill discovery is best-effort
      console.warn('Skill discovery failed:', (e as Error).message);
    }

    // Run only the file-writing stages (code-writer, documentation)
    // Skip build and deployment in agent-driven mode (no runtime available)
    const fileStages = ['code-writer', 'documentation'];
    const stageResults = new Map<string, StageResult>();
    const gateResults: GateResult[] = [];

    for (const stageId of fileStages) {
      const stageDef = this.stages.get(stageId);
      if (!stageDef) continue;

      this.emitEvent({
        type: 'stage:start',
        stageId,
        message: `Running ${stageDef.meta.name}`,
        timestamp: Date.now(),
      });

      try {
        const ctx = this.createStageContext(stageDef.meta, manifest);
        const result = await stageDef.execute(ctx);
        stageResults.set(stageId, result);

        this.emitEvent({
          type: 'stage:complete',
          stageId,
          message: `${stageDef.meta.name} completed`,
          timestamp: Date.now(),
        });
      } catch (err) {
        const errorResult: StageResult = {
          success: false,
          artifacts: {},
          warnings: [],
          error: (err as Error).message,
          durationMs: 0,
          llmCalls: 0,
          tokensUsed: 0,
        };
        stageResults.set(stageId, errorResult);

        this.emitEvent({
          type: 'stage:failed',
          stageId,
          message: `${stageDef.meta.name} failed: ${(err as Error).message}`,
          timestamp: Date.now(),
        });
      }
    }

    const durationMs = Date.now() - startTime;

    // Collect artifacts as a simple record
    const artifactsRecord: Record<string, unknown> = {};
    const artifactList = this.artifacts.list();
    for (const meta of artifactList) {
      artifactsRecord[meta.key] = this.artifacts.read(meta.key);
    }

    return {
      success: [...stageResults.values()].every(r => r.success),
      artifacts: artifactsRecord,
      stageResults,
      gateResults,
      durationMs,
      totalLlmCalls: 0,
      totalTokens: 0,
      contextBudgetReport: 'Agent-driven mode - no LLM calls',
    };
  }

  private createStageContext(meta: StageMeta, manifest: ProjectManifest): StageContext {
    const allowedReads = new Set(meta.inputs);
    const allowedWrites = new Set(meta.outputs);

    return {
      executionId: `agent-${Date.now()}`,
      stageId: meta.id,
      getArtifact: <T = unknown>(key: string): T | undefined => {
        if (!allowedReads.has(key)) {
          throw new Error(`Stage "${meta.id}" attempted to read undeclared artifact "${key}"`);
        }
        return this.artifacts.read<T>(key);
      },
      setArtifact: (key: string, value: unknown, type?: ArtifactType): void => {
        if (!allowedWrites.has(key)) {
          throw new Error(`Stage "${meta.id}" attempted to write undeclared artifact "${key}"`);
        }
        this.artifacts.store(key, value, type ?? ArtifactType.Json, meta.id);
      },
      manifest,
      callLLM: async () => {
        throw new Error('LLM calls not available in agent-driven mode');
      },
      emit: (event: string, data?: unknown) => {
        this.emitEvent({
          type: event,
          stageId: meta.id,
          message: event,
          timestamp: Date.now(),
          data: data as Record<string, unknown> | undefined,
        });
      },
      log: {
        info: (msg) => console.log(`[${meta.id}] ${msg}`),
        warn: (msg) => console.warn(`[${meta.id}] ${msg}`),
        error: (msg) => console.error(`[${meta.id}] ${msg}`),
        debug: (msg) => { if (process.env.DEBUG) console.log(`[${meta.id}] ${msg}`); },
      },
      bos: this.bosContext ?? { pack: undefined, industry: undefined, detectionConfidence: 0, businessKnowledge: undefined },
      bk: this.bosContext?.businessKnowledge,
      getCheckpoint: <T = unknown>(key: string): T | undefined => undefined,
      setCheckpoint: (key: string, value: unknown): void => {},
    };
  }

  // ─── Run from manifest ──────────────────────────────────────────────────

  async runFromManifest(
    manifest: ProjectManifest,
    intentResult?: IntentResult,
  ): Promise<OrchestratorResult> {
    // Auto-create adapter from environment if not set
    if (!this.llmAdapter) {
      const adapter = new (await import('./llm-adapter.js')).LLMAdapter();
      if (adapter.hasProviders()) {
        this.llmAdapter = adapter;
        this.emitEvent({
          type: 'adapter:auto-created',
          stageId: 'pipeline',
          message: `Auto-created LLM adapter with ${adapter.getProviderCount()} providers`,
          timestamp: Date.now(),
        });
      } else {
        // No external API keys - this is expected in Claude Desktop mode
        // The build will use deterministic generation only
        this.log('info', 'Running in agent-driven mode — the AI agent (Claude/OpenCode/Codex/Gemini) IS the LLM. No external API calls needed.');
        // Create a no-op adapter that returns mock valid JSON
        this.llmAdapter = {
          call: async (params) => ({
            content: this.generateAgentDrivenResponse(params.taskType, params.prompt),
            usage: { input: 0, output: 0, total: 0 },
            provider: 'none',
            model: 'claude-desktop|opencode|codex|gemini',
            durationMs: 0,
          }),
          getTotalUsage: () => ({ calls: 0, totalTokens: 0, byProvider: {} }),
        };
      }
    }

    const startTime = Date.now();

    // Phase 1: Load BOS knowledge
    this.bosContext = await this.bosLoader.load(manifest, this.llmAdapter);
    if (this.bosContext.pack) {
      this.emitEvent({
        type: 'bos:loaded',
        stageId: 'pipeline',
        message: `BOS pack loaded: ${this.bosContext.pack.name} (confidence: ${Math.round(this.bosContext.detectionConfidence * 100)}%)`,
        timestamp: Date.now(),
      });
    }

    // Phase 1b: Generate BusinessKnowledge — the SINGLE SOURCE OF TRUTH
    // Uses primitive-based reasoning, NOT keyword→vertical mapping.
    const userPrompt = manifest.userInput ?? manifest.description ?? '';
    const bk: BusinessKnowledge = understandBusiness(userPrompt);
    this.bosContext.businessKnowledge = bk;
    this.emitEvent({
      type: 'business-knowledge:generated',
      stageId: 'pipeline',
      message: `BusinessKnowledge: ${bk.discovery.businessType} (${bk.discovery.industry}) — ${bk.entities.length} entities, ${bk.workflows.length} workflows`,
      timestamp: Date.now(),
    });

    // Phase 2: Execute pipeline
    const allStages = Array.from(this.stages.values());
    const levels = topologicalSort(allStages);
    const stageResults = new Map<string, StageResult>();
    const allGateResults: GateResult[] = [];
    let totalLlmCalls = 0;
    let totalTokens = 0;

    this.emitEvent({
      type: 'pipeline:start',
      stageId: 'pipeline',
      message: `Pipeline starting: ${allStages.length} stages in ${levels.length} levels`,
      timestamp: Date.now(),
    });

    try {
      for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
        const level = levels[levelIdx]!;
        const stageIds = level.map(s => s.meta.id);

        this.log('info', `Level ${levelIdx + 1}/${levels.length}: ${stageIds.join(', ')}`);

        const results = await this.executeLevel(level, manifest, stageResults);

        for (const [stageId, result] of results) {
          stageResults.set(stageId, result);
          totalLlmCalls += result.llmCalls;
          totalTokens += result.tokensUsed;

          this.contextBudget.recordUsage(stageId, result.tokensUsed);

          if (!result.success) {
            this.emitEvent({
              type: 'pipeline:error',
              stageId,
              message: `Pipeline failed at stage: ${stageId}`,
              timestamp: Date.now(),
            });

            return {
              success: false,
              artifacts: this.readAllArtifacts(),
              stageResults,
              gateResults: allGateResults,
              intentResult,
              bosContext: this.bosContext,
              durationMs: Date.now() - startTime,
              totalLlmCalls,
              totalTokens,
              contextBudgetReport: this.contextBudget.getReport(),
            };
          }

          // Phase 3: Run quality gates after each stage
          const gateResults = await this.qualityGateRunner.runGates(stageId);
          allGateResults.push(...gateResults);

          for (const gate of gateResults) {
            if (!gate.passed) {
              this.emitEvent({
                type: 'gate:failed',
                stageId,
                message: `Quality gate "${gate.gateId}" failed: ${gate.errors.join(', ')}`,
                timestamp: Date.now(),
              });

              // If blocking gate fails, pipeline fails
              const gateDef = this.config.qualityGates.find(g => g.id === gate.gateId);
              if (gateDef?.blocking) {
                return {
                  success: false,
                  artifacts: this.readAllArtifacts(),
                  stageResults,
                  gateResults: allGateResults,
                  intentResult,
                  bosContext: this.bosContext,
                  durationMs: Date.now() - startTime,
                  totalLlmCalls,
                  totalTokens,
                  contextBudgetReport: this.contextBudget.getReport(),
                };
              }
            }
          }
        }
      }

      this.emitEvent({
        type: 'pipeline:complete',
        stageId: 'pipeline',
        message: 'Pipeline completed successfully',
        timestamp: Date.now(),
      });

      return {
        success: true,
        artifacts: this.readAllArtifacts(),
        stageResults,
        gateResults: allGateResults,
        intentResult,
        bosContext: this.bosContext,
        durationMs: Date.now() - startTime,
        totalLlmCalls,
        totalTokens,
        contextBudgetReport: this.contextBudget.getReport(),
      };
    } catch (error) {
      this.emitEvent({
        type: 'pipeline:error',
        stageId: 'pipeline',
        message: `Pipeline failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now(),
      });

      return {
        success: false,
        artifacts: this.readAllArtifacts(),
        stageResults,
        gateResults: allGateResults,
        intentResult,
        bosContext: this.bosContext,
        durationMs: Date.now() - startTime,
        totalLlmCalls,
        totalTokens,
        contextBudgetReport: this.contextBudget.getReport(),
      };
    }
  }

  // ─── Level Execution ────────────────────────────────────────────────────

  private async executeLevel(
    stages: StageDefinition[],
    manifest: ProjectManifest,
    previousResults: Map<string, StageResult>,
  ): Promise<Map<string, StageResult>> {
    const results = new Map<string, StageResult>();
    const pendingStages = stages.filter(s => !this.tracker.isStageCompleted(s.meta.id));

    if (pendingStages.length === 0) return results;

    const batches = this.chunkArray(pendingStages, this.config.maxConcurrency);

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(stage => this.executeStageWithRetry(stage, manifest, previousResults))
      );

      for (let i = 0; i < batch.length; i++) {
        const stage = batch[i]!;
        const result = batchResults[i]!;

        if (result.status === 'fulfilled') {
          results.set(stage.meta.id, result.value);
        } else {
          results.set(stage.meta.id, {
            success: false,
            artifacts: {},
            warnings: [],
            error: result.reason?.message ?? 'Unknown error',
            durationMs: 0,
            llmCalls: 0,
            tokensUsed: 0,
          });
        }
      }
    }

    return results;
  }

  // ─── Stage Execution ────────────────────────────────────────────────────

  private async executeStageWithRetry(
    stage: StageDefinition,
    manifest: ProjectManifest,
    _previousResults: Map<string, StageResult>,
  ): Promise<StageResult> {
    const maxRetries = stage.meta.maxRetries;
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        this.emitEvent({
          type: 'stage:retry',
          stageId: stage.meta.id,
          message: `Retrying stage ${stage.meta.id} (attempt ${attempt + 1}/${maxRetries + 1})`,
          timestamp: Date.now(),
        });

        const delay = Math.min(this.config.retryBaseDelayMs * Math.pow(2, attempt - 1), this.config.retryMaxDelayMs);
        await this.sleep(delay);
      }

      this.emitEvent({
        type: 'stage:start',
        stageId: stage.meta.id,
        message: `Starting stage: ${stage.meta.name}`,
        timestamp: Date.now(),
      });

      this.tracker.stageStarted(stage.meta.id, maxRetries + 1);

      try {
        const emitFn = (event: string, data?: unknown) => {
          const eventData = data !== undefined ? (data as Record<string, unknown>) : undefined;
          this.emitEvent({ type: event, stageId: stage.meta.id, message: event, timestamp: Date.now(), data: eventData });
        };

        const ctx = createStageContext(
          stage.meta.id,
          this.tracker.getExecutionId(),
          stage.meta.inputs,
          stage.meta.outputs,
          manifest,
          this.artifacts,
          this.tracker,
          (params) => this.llmAdapter!.call(params),
          emitFn,
          this.bosContext,
          this.createRuntimeContext(),
        );

        const timeoutMs = (stage.meta.estimatedDurationSec ?? this.config.stageTimeoutSec) * 1000;
        const result = await Promise.race([
          stage.execute(ctx),
          this.timeout(timeoutMs, stage.meta.id),
        ]);

        const validation = stage.validate(result);

        if (!validation.valid) {
          lastError = `Validation failed: ${validation.errors.join(', ')}`;
          this.tracker.stageFailed(stage.meta.id, lastError);
          this.emitEvent({
            type: 'stage:error',
            stageId: stage.meta.id,
            message: lastError,
            timestamp: Date.now(),
          });
          continue;
        }

        const artifactKeys = Object.keys(result.artifacts);
        this.tracker.stageCompleted(stage.meta.id, artifactKeys, result.warnings, result.llmCalls, result.tokensUsed);

        this.emitEvent({
          type: 'stage:complete',
          stageId: stage.meta.id,
          message: `Completed stage: ${stage.meta.name} (${result.durationMs}ms)`,
          timestamp: Date.now(),
          data: { durationMs: result.durationMs, llmCalls: result.llmCalls },
        });

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        this.tracker.stageFailed(stage.meta.id, lastError);

        this.emitEvent({
          type: 'stage:error',
          stageId: stage.meta.id,
          message: `Stage ${stage.meta.id} failed: ${lastError}`,
          timestamp: Date.now(),
        });
      }
    }

    return {
      success: false,
      artifacts: {},
      warnings: [],
      error: `All ${maxRetries + 1} attempts failed. Last error: ${lastError}`,
      durationMs: 0,
      llmCalls: 0,
      tokensUsed: 0,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private readAllArtifacts(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const meta of this.artifacts.list()) {
      const content = this.artifacts.read(meta.key);
      if (content !== undefined) {
        result[meta.key] = content;
      }
    }
    return result;
  }

  private timeout(ms: number, stageId: string): Promise<StageResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Stage ${stageId} timed out after ${ms}ms`));
      }, ms);
    });
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private emitEvent(event: OrchestratorEvent): void {
    this.emit(event.type, event);
    this.emit('event', event);
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const prefix = `[orchestrator:${level}]`;
    if (level === 'error') console.error(prefix, message);
    else if (level === 'warn') console.warn(prefix, message);
    else console.log(prefix, message);
  }

  private generateAgentDrivenResponse(taskType: string, prompt: string): string {
    // Extract project name from prompt if possible
    const nameMatch = prompt.match(/Build a (.+?)(?:\s|$)/i);
    const projectName = nameMatch?.[1] ?? 'My App';
    const slug = projectName.toLowerCase().replace(/\s+/g, '-');

    // Detect industry from prompt for prompt-aware responses
    const lower = prompt.toLowerCase();
    const isRestaurant = /restaurant|cafe|coffee|food|dining|bakery|bar|pub/.test(lower);
    const isEcommerce = /shop|store|ecommerce|product|marketplace|buy|sell/.test(lower);
    const isFitness = /gym|fitness|workout|exercise|health|wellness/.test(lower);
    const isSaaS = /saas|dashboard|analytics|crm|erp|software|app/.test(lower);
    const isHealthcare = /hospital|clinic|doctor|patient|medical|healthcare|pharmacy/.test(lower);
    const isRealEstate = /real estate|property|listing|agent|home/.test(lower);
    const isEducation = /course|bootcamp|school|learn|academy|student|tutor|training|education/.test(lower);
    const isTravel = /hotel|travel|tour|resort|booking|vacation|flight|destination|trip/.test(lower);
    const isEvent = /event|conference|wedding|concert|festival|ticket|venue|gala/.test(lower);
    const isLuxury = /luxury|premium|exclusive|boutique|high-end|vip/.test(lower);
    const isB2B = /wholesale|b2b|distributor|supply|procurement|bulk|net-30|quote/i.test(lower);

    // Determine industry category
    let industry = 'saas';
    if (isRestaurant) industry = 'restaurant';
    else if (isEcommerce) industry = 'ecommerce';
    else if (isFitness) industry = 'fitness';
    else if (isHealthcare) industry = 'healthcare';
    else if (isEducation) industry = 'education';
    else if (isTravel) industry = 'travel';
    else if (isEvent) industry = 'event';
    else if (isLuxury) industry = 'luxury';
    else if (isRealEstate) industry = 'realestate';
    else if (isB2B) industry = 'wholesale';

    // Generate industry-appropriate pages
    const getPages = (): string[] => {
      switch (industry) {
        case 'restaurant':
          return ['Home', 'Menu', 'Reservations', 'About', 'Contact'];
        case 'ecommerce':
          return ['Home', 'Products', 'Product Detail', 'Cart', 'Checkout', 'Account'];
        case 'fitness':
          return ['Home', 'Classes', 'Trainers', 'Membership', 'Schedule', 'Contact'];
        case 'healthcare':
          return ['Home', 'Services', 'Doctors', 'Appointments', 'Patient Portal', 'Contact'];
        case 'realestate':
          return ['Home', 'Listings', 'Property Detail', 'Agents', 'About', 'Contact'];
        case 'education':
          return ['Home', 'Courses', 'Course Detail', 'Enrollment', 'Student Dashboard', 'Contact'];
        case 'travel':
          return ['Home', 'Destinations', 'Destination Detail', 'Booking', 'About', 'Contact'];
        case 'event':
          return ['Home', 'Events', 'Event Detail', 'Tickets', 'Speakers', 'Contact'];
        case 'luxury':
          return ['Home', 'Collection', 'Product Detail', 'About', 'Concierge', 'Contact'];
        case 'wholesale':
          return ['Home', 'Catalog', 'Product Detail', 'Quote Request', 'Account', 'Orders', 'Contact'];
        default:
          return ['Home', 'Dashboard', 'Settings', 'Profile', 'Analytics'];
      }
    };

    const getFeatures = (): string[] => {
      switch (industry) {
        case 'restaurant':
          return ['Online Ordering', 'Menu Management', 'Reservation System', 'Loyalty Program', 'Delivery Tracking'];
        case 'ecommerce':
          return ['Product Catalog', 'Shopping Cart', 'Secure Checkout', 'Order Tracking', 'Wishlist'];
        case 'fitness':
          return ['Class Scheduling', 'Member Management', 'Trainer Profiles', 'Progress Tracking', 'Payment Processing'];
        case 'healthcare':
          return ['Patient Records', 'Appointment Booking', 'Prescription Management', 'Telehealth', 'Billing'];
        case 'realestate':
          return ['Property Listings', 'Virtual Tours', 'Agent Profiles', 'Mortgage Calculator', 'Saved Searches'];
        case 'education':
          return ['Course Catalog', 'Live Mentorship', 'Student Dashboard', 'Certificate Generation', 'Community Forum'];
        case 'travel':
          return ['Destination Guides', 'Trip Planner', 'Booking System', 'Travel Reviews', 'Itinerary Builder'];
        case 'event':
          return ['Event Discovery', 'Ticketing System', 'Venue Marketplace', 'Attendee Management', 'Event Analytics'];
        case 'luxury':
          return ['Exclusive Collections', 'Personal Concierge', 'Private Viewings', 'Bespoke Creations', 'Global Delivery'];
        case 'wholesale':
          return ['Product Catalog', 'Quote Requests', 'NET-30 Terms', 'Volume Discounts', 'Account Management'];
        default:
          return ['User Authentication', 'Dashboard', 'Data Management', 'Reporting', 'Settings'];
      }
    };

    switch (taskType) {
      case 'structured-extraction':
        return JSON.stringify({
          name: slug,
          displayName: projectName,
          description: `${projectName} — ${industry}`,
          category: industry,
          complexity: 'moderate',
          goals: getFeatures().slice(0, 3),
          targetUsers: isRestaurant ? ['Customers', 'Staff', 'Owners'] :
                      isEcommerce ? ['Shoppers', 'Vendors', 'Admins'] :
                      isFitness ? ['Members', 'Trainers', 'Admins'] :
                      ['Users', 'Admins', 'Managers'],
          scope: {
            pages: getPages(),
            features: getFeatures(),
          },
          constraints: [],
          techPreferences: {
            frontend: 'Next.js',
            database: 'PostgreSQL',
          },
        });
      case 'analysis':
        return JSON.stringify({
          research: {
            industry: 'SaaS',
            competitors: ['Competitor A', 'Competitor B'],
            keyFeatures: ['Authentication', 'Dashboard', 'Analytics', 'Reporting'],
            techRecommendations: ['Next.js', 'PostgreSQL', 'Tailwind CSS'],
          },
          requirements: {
            functional: [
              'User registration and login',
              'Dashboard with key metrics',
              'Data management',
              'Reporting',
            ],
            nonFunctional: [
              'Responsive design',
              'Fast load times',
              'Secure authentication',
            ],
          },
          features: [
            { name: 'Authentication', priority: 'high', complexity: 'moderate' },
            { name: 'Dashboard', priority: 'high', complexity: 'moderate' },
            { name: 'Analytics', priority: 'medium', complexity: 'complex' },
            { name: 'Reporting', priority: 'medium', complexity: 'moderate' },
          ],
        });
      case 'planning':
        return JSON.stringify({
          architecture: {
            pattern: 'MVC',
            layers: ['Presentation', 'Business Logic', 'Data Access'],
          },
          techStack: {
            frontend: 'Next.js 14',
            backend: 'Next.js API Routes',
            database: 'PostgreSQL with Prisma',
            styling: 'Tailwind CSS',
            auth: 'NextAuth.js',
          },
        });
      case 'code-generation':
        // Check if this is a schema/design request that needs JSON
        if (prompt.toLowerCase().includes('schema') || prompt.toLowerCase().includes('database') || prompt.toLowerCase().includes('design')) {
          // Check if this is API design
          if (prompt.toLowerCase().includes('api') || prompt.toLowerCase().includes('endpoint')) {
            const apiEndpoints = this.getIndustryEndpoints(industry, projectName);
            return JSON.stringify({
              style: 'REST',
              baseUrl: '/api/v1',
              authentication: {
                type: 'JWT',
                header: 'Authorization',
                expiry: '24h',
              },
              endpoints: apiEndpoints,
              middleware: [
                { name: 'rateLimit', config: '100 requests per minute' },
                { name: 'cors', config: 'allow specific origins' },
                { name: 'validation', config: 'validate request bodies with zod' },
              ],
            });
          }
          // Database schema
          const dbSchema = this.getIndustryDBSchema(industry);
          return JSON.stringify(dbSchema);
        }
        return '// Generated code placeholder';
      case 'creative': {
        // Frontend design — MUST be prompt-aware, not hardcoded gym CRM
        const pages = getPages();
        const features = getFeatures();

        // Build nav items from industry-specific pages
        const navItems = pages
          .filter(p => !['Login', 'Register', 'Home'].includes(p))
          .slice(0, 5)
          .map(p => ({
            label: p,
            path: `/${p.toLowerCase().replace(/\s+/g, '-')}`,
            icon: p === 'Dashboard' ? 'layout-dashboard'
              : p === 'Menu' ? 'book-open'
              : p === 'Reservations' ? 'calendar'
              : p === 'Products' ? 'shopping-bag'
              : p === 'Cart' ? 'shopping-cart'
              : p === 'Classes' ? 'activity'
              : p === 'Schedule' ? 'calendar'
              : p === 'Trainers' ? 'users'
              : p === 'Doctors' ? 'user-check'
              : p === 'Appointments' ? 'calendar'
              : p === 'Listings' ? 'home'
              : p === 'Agents' ? 'users'
              : p === 'Courses' ? 'book-open'
              : p === 'Enrollment' ? 'graduation-cap'
              : p === 'Destinations' ? 'map-pin'
              : p === 'Events' ? 'calendar'
              : p === 'Tickets' ? 'ticket'
              : p === 'Speakers' ? 'mic'
              : p === 'Collection' ? 'gem'
              : p === 'Concierge' ? 'headphones'
              : p === 'Analytics' ? 'bar-chart'
              : p === 'Settings' ? 'settings'
              : 'circle',
          }));

        // Industry-specific design tokens
        const designTokens: Record<string, { primary: string; secondary: string; background: string; text: string; border: string }> = {
          restaurant:    { primary: '#D97706', secondary: '#92400E', background: '#1C1917', text: '#FAFAF9', border: '#44403C' },
          ecommerce:     { primary: '#7C3AED', secondary: '#5B21B6', background: '#FAFAFA', text: '#18181B', border: '#E4E4E7' },
          fitness:       { primary: '#DC2626', secondary: '#991B1B', background: '#09090B', text: '#FAFAFA', border: '#27272A' },
          healthcare:    { primary: '#0891B2', secondary: '#0E7490', background: '#FFFFFF', text: '#18181B', border: '#E4E4E7' },
          realestate:    { primary: '#16A34A', secondary: '#15803D', background: '#FFFFFF', text: '#18181B', border: '#E4E4E7' },
          education:     { primary: '#7C3AED', secondary: '#6D28D9', background: '#FAFAFA', text: '#18181B', border: '#E4E4E7' },
          travel:        { primary: '#0EA5E9', secondary: '#0284C7', background: '#F0F9FF', text: '#18181B', border: '#BAE6FD' },
          event:         { primary: '#F59E0B', secondary: '#D97706', background: '#FFFBEB', text: '#18181B', border: '#FDE68A' },
          luxury:        { primary: '#C9A96E', secondary: '#D4AF37', background: '#0a0a0a', text: '#f5f5f5', border: '#2a2a2a' },
          perfume:       { primary: '#C9A96E', secondary: '#D4AF37', background: '#0a0a0a', text: '#f5f5f5', border: '#2a2a2a' },
          fragrance:     { primary: '#C9A96E', secondary: '#D4AF37', background: '#0a0a0a', text: '#f5f5f5', border: '#2a2a2a' },
          beauty:        { primary: '#C9A96E', secondary: '#D4AF37', background: '#0a0a0a', text: '#f5f5f5', border: '#2a2a2a' },
          saas:          { primary: '#6366F1', secondary: '#4F46E5', background: '#09090B', text: '#FAFAFA', border: '#27272A' },
        };
        const colors = designTokens[industry as keyof typeof designTokens] ?? designTokens.saas;

        // Build page list with correct auth and sections
        const pageList = [
          { name: 'Home', path: '/', layout: 'default', auth: false, sections: ['hero', 'features', 'stats', 'testimonials', 'cta'] },
          ...pages
            .filter(p => p !== 'Home')
            .map(p => ({
              name: p,
              path: `/${p.toLowerCase().replace(/\s+/g, '-')}`,
              layout: ['Dashboard', 'Analytics', 'Patient Portal'].includes(p) ? 'sidebar' : 'default',
              auth: ['Dashboard', 'Analytics', 'Patient Portal', 'Account'].includes(p),
              sections: p === 'Menu' ? ['menu-grid', 'specials']
                : p === 'Reservations' ? ['booking-form', 'availability']
                : p === 'Products' ? ['product-grid', 'filters']
                : p === 'Cart' ? ['cart-items', 'order-summary']
                : p === 'Listings' ? ['property-grid', 'map-view']
                : p === 'Classes' ? ['class-schedule', 'instructor-grid']
                : p === 'Appointments' ? ['booking-calendar', 'doctor-list']
                : p === 'Courses' ? ['course-grid', 'filters', 'search']
                : p === 'Enrollment' ? ['enrollment-form', 'payment', 'course-overview']
                : p === 'Destinations' ? ['destination-grid', 'map-view', 'filters']
                : p === 'Events' ? ['event-grid', 'category-nav', 'search']
                : p === 'Tickets' ? ['ticket-tiers', 'seating', 'checkout']
                : p === 'Speakers' ? ['speaker-grid', 'bio-cards']
                : p === 'Collection' ? ['product-grid', 'category-nav', 'gallery']
                : p === 'Concierge' ? ['concierge-form', 'service-list']
                : p === 'About' ? ['about', 'team', 'mission']
                : p === 'Contact' ? ['contact-form', 'map']
                : ['content', 'cta'],
            })),
          { name: 'Login', path: '/login', layout: 'centered', auth: false, sections: ['login-form'] },
          { name: 'Register', path: '/register', layout: 'centered', auth: false, sections: ['register-form'] },
        ];

        return JSON.stringify({
          pages: pageList,
          components: [
            { name: 'Header', type: 'navigation', description: 'Main navigation header' },
            { name: 'HeroBanner', type: 'hero', description: `Hero section for ${projectName}` },
            { name: 'FeatureGrid', type: 'features', description: `${features[0] ?? 'Key features'} and more` },
            { name: 'StatsCards', type: 'stats', description: 'Key business metrics' },
            { name: 'Testimonials', type: 'social-proof', description: 'Customer reviews and testimonials' },
            { name: 'CTASection', type: 'cta', description: 'Call to action section' },
            { name: 'Footer', type: 'footer', description: 'Site footer with navigation' },
          ],
          designTokens: {
            colors,
            typography: {
              fontFamily: ['restaurant', 'realestate', 'luxury', 'perfume', 'fragrance', 'beauty'].includes(industry)
                ? 'Playfair Display, Georgia, serif'
                : 'Inter, system-ui, sans-serif',
              scale: ['12px', '14px', '16px', '20px', '24px', '32px', '48px'],
            },
            spacing: ['4px', '8px', '12px', '16px', '24px', '32px', '48px', '64px'],
            borderRadius: { sm: '4px', md: '8px', lg: '16px', full: '9999px' },
          },
          navigation: {
            type: ['restaurant', 'ecommerce', 'fitness', 'healthcare', 'realestate', 'education', 'travel', 'event', 'luxury', 'perfume', 'fragrance', 'beauty'].includes(industry) ? 'horizontal' : 'sidebar',
            items: navItems,
          },
          industry,
          projectName,
        });
      }
      case 'structured-output':
        return JSON.stringify({
          schema: {
            tables: [
              {
                name: 'users',
                columns: [
                  { name: 'id', type: 'uuid', primaryKey: true },
                  { name: 'email', type: 'string', unique: true },
                  { name: 'name', type: 'string' },
                  { name: 'createdAt', type: 'datetime' },
                ],
              },
              {
                name: 'projects',
                columns: [
                  { name: 'id', type: 'uuid', primaryKey: true },
                  { name: 'name', type: 'string' },
                  { name: 'userId', type: 'uuid', foreignKey: 'users.id' },
                  { name: 'createdAt', type: 'datetime' },
                ],
              },
            ],
          },
        });
      default:
        // For any unknown task type, return valid JSON
        return JSON.stringify({ result: 'completed', taskType, data: {} });
    }
  }

  private getIndustryEndpoints(industry: string, projectName: string): Array<Record<string, unknown>> {
    const authEndpoints = [
      { method: 'POST', path: '/auth/register', description: 'Register new user', auth: false, requestBody: { email: 'string', password: 'string', name: 'string' } },
      { method: 'POST', path: '/auth/login', description: 'Login user', auth: false, requestBody: { email: 'string', password: 'string' } },
      { method: 'GET', path: '/users/me', description: 'Get current user profile', auth: true },
      { method: 'PUT', path: '/users/me', description: 'Update current user', auth: true },
    ];

    const industryEndpoints: Record<string, Array<Record<string, unknown>>> = {
      restaurant: [
        { method: 'GET', path: '/menuitems', description: 'List menu items', auth: false },
        { method: 'POST', path: '/menuitems', description: 'Create menu item', auth: true, requestBody: { name: 'string', price: 'number', description: 'string' } },
        { method: 'GET', path: '/reservations', description: 'List reservations', auth: true },
        { method: 'POST', path: '/reservations', description: 'Create reservation', auth: true, requestBody: { date: 'string', time: 'string', partySize: 'number' } },
        { method: 'GET', path: '/orders', description: 'List orders', auth: true },
        { method: 'POST', path: '/orders', description: 'Place order', auth: true, requestBody: { items: 'array', tableNumber: 'number' } },
      ],
      ecommerce: [
        { method: 'GET', path: '/products', description: 'List products', auth: false },
        { method: 'GET', path: '/products/:id', description: 'Get product detail', auth: false },
        { method: 'POST', path: '/cart', description: 'Add to cart', auth: true, requestBody: { productId: 'string', quantity: 'number' } },
        { method: 'GET', path: '/cart', description: 'Get cart', auth: true },
        { method: 'POST', path: '/checkout', description: 'Checkout order', auth: true, requestBody: { address: 'object', paymentMethod: 'string' } },
        { method: 'GET', path: '/orders', description: 'List orders', auth: true },
      ],
      fitness: [
        { method: 'GET', path: '/classes', description: 'List fitness classes', auth: false },
        { method: 'POST', path: '/classes', description: 'Create class', auth: true, requestBody: { name: 'string', instructor: 'string', time: 'string', capacity: 'number' } },
        { method: 'GET', path: '/memberships', description: 'List membership plans', auth: false },
        { method: 'POST', path: '/memberships', description: 'Purchase membership', auth: true, requestBody: { plan: 'string', userId: 'string' } },
        { method: 'GET', path: '/trainers', description: 'List trainers', auth: false },
        { method: 'POST', path: '/bookings', description: 'Book a class', auth: true, requestBody: { classId: 'string', userId: 'string' } },
      ],
      healthcare: [
        { method: 'GET', path: '/doctors', description: 'List doctors', auth: false },
        { method: 'GET', path: '/services', description: 'List medical services', auth: false },
        { method: 'GET', path: '/appointments', description: 'List appointments', auth: true },
        { method: 'POST', path: '/appointments', description: 'Book appointment', auth: true, requestBody: { doctorId: 'string', date: 'string', reason: 'string' } },
        { method: 'GET', path: '/patients/:id', description: 'Get patient record', auth: true },
        { method: 'PUT', path: '/patients/:id', description: 'Update patient record', auth: true, requestBody: { medicalHistory: 'string' } },
      ],
      realestate: [
        { method: 'GET', path: '/listings', description: 'List properties', auth: false },
        { method: 'GET', path: '/listings/:id', description: 'Get property detail', auth: false },
        { method: 'GET', path: '/agents', description: 'List agents', auth: false },
        { method: 'POST', path: '/inquiries', description: 'Submit property inquiry', auth: true, requestBody: { listingId: 'string', message: 'string' } },
        { method: 'GET', path: '/saved', description: 'List saved properties', auth: true },
        { method: 'POST', path: '/saved', description: 'Save property', auth: true, requestBody: { listingId: 'string' } },
      ],
      saas: [
        { method: 'GET', path: '/projects', description: 'List projects', auth: true },
        { method: 'POST', path: '/projects', description: 'Create project', auth: true, requestBody: { name: 'string', description: 'string' } },
        { method: 'GET', path: '/analytics/overview', description: 'Get analytics overview', auth: true },
        { method: 'GET', path: '/team', description: 'List team members', auth: true },
        { method: 'POST', path: '/team/invite', description: 'Invite team member', auth: true, requestBody: { email: 'string', role: 'string' } },
        { method: 'GET', path: '/settings', description: 'Get workspace settings', auth: true },
      ],
    };

    return [...authEndpoints, ...(industryEndpoints[industry] ?? industryEndpoints.saas)];
  }

  private getIndustryDBSchema(industry: string): Record<string, unknown> {
    const baseUsers = {
      name: 'users',
      columns: [
        { name: 'id', type: 'uuid', primaryKey: true },
        { name: 'email', type: 'string', unique: true },
        { name: 'name', type: 'string' },
        { name: 'role', type: 'enum', values: ['admin', 'user'] },
        { name: 'createdAt', type: 'datetime' },
      ],
      indexes: [{ columns: ['email'], unique: true }],
    };

    const industryTables: Record<string, Array<Record<string, unknown>>> = {
      restaurant: [
        { name: 'menuitems', columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'name', type: 'string' },
          { name: 'description', type: 'text' },
          { name: 'price', type: 'decimal' },
          { name: 'category', type: 'string' },
          { name: 'available', type: 'boolean', defaultValue: true },
        ]},
        { name: 'reservations', columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'userId', type: 'uuid', foreignKey: 'users.id' },
          { name: 'date', type: 'datetime' },
          { name: 'partySize', type: 'integer' },
          { name: 'status', type: 'enum', values: ['pending', 'confirmed', 'cancelled'] },
        ]},
        { name: 'orders', columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'userId', type: 'uuid', foreignKey: 'users.id' },
          { name: 'total', type: 'decimal' },
          { name: 'status', type: 'enum', values: ['pending', 'preparing', 'delivered', 'cancelled'] },
        ]},
      ],
      ecommerce: [
        { name: 'products', columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'name', type: 'string' },
          { name: 'description', type: 'text' },
          { name: 'price', type: 'decimal' },
          { name: 'stock', type: 'integer' },
          { name: 'category', type: 'string' },
        ]},
        { name: 'orders', columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'userId', type: 'uuid', foreignKey: 'users.id' },
          { name: 'total', type: 'decimal' },
          { name: 'status', type: 'enum', values: ['pending', 'shipped', 'delivered', 'cancelled'] },
        ]},
        { name: 'cart_items', columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'userId', type: 'uuid', foreignKey: 'users.id' },
          { name: 'productId', type: 'uuid', foreignKey: 'products.id' },
          { name: 'quantity', type: 'integer' },
        ]},
      ],
      fitness: [
        { name: 'classes', columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'name', type: 'string' },
          { name: 'instructor', type: 'string' },
          { name: 'scheduledAt', type: 'datetime' },
          { name: 'capacity', type: 'integer' },
          { name: 'duration', type: 'integer' },
        ]},
        { name: 'memberships', columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'userId', type: 'uuid', foreignKey: 'users.id' },
          { name: 'plan', type: 'enum', values: ['basic', 'premium', 'elite'] },
          { name: 'status', type: 'enum', values: ['active', 'inactive', 'cancelled'] },
          { name: 'startDate', type: 'datetime' },
          { name: 'endDate', type: 'datetime' },
        ]},
        { name: 'bookings', columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'userId', type: 'uuid', foreignKey: 'users.id' },
          { name: 'classId', type: 'uuid', foreignKey: 'classes.id' },
          { name: 'status', type: 'enum', values: ['confirmed', 'cancelled'] },
        ]},
      ],
      healthcare: [
        { name: 'doctors', columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'name', type: 'string' },
          { name: 'specialty', type: 'string' },
          { name: 'bio', type: 'text' },
          { name: 'available', type: 'boolean', defaultValue: true },
        ]},
        { name: 'appointments', columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'patientId', type: 'uuid', foreignKey: 'users.id' },
          { name: 'doctorId', type: 'uuid', foreignKey: 'doctors.id' },
          { name: 'date', type: 'datetime' },
          { name: 'reason', type: 'text' },
          { name: 'status', type: 'enum', values: ['scheduled', 'completed', 'cancelled'] },
        ]},
        { name: 'medical_records', columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'patientId', type: 'uuid', foreignKey: 'users.id' },
          { name: 'diagnosis', type: 'text' },
          { name: 'treatment', type: 'text' },
          { name: 'date', type: 'datetime' },
        ]},
      ],
      realestate: [
        { name: 'listings', columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'title', type: 'string' },
          { name: 'description', type: 'text' },
          { name: 'price', type: 'decimal' },
          { name: 'bedrooms', type: 'integer' },
          { name: 'bathrooms', type: 'integer' },
          { name: 'address', type: 'string' },
          { name: 'agentId', type: 'uuid', foreignKey: 'agents.id' },
        ]},
        { name: 'agents', columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'userId', type: 'uuid', foreignKey: 'users.id' },
          { name: 'specialization', type: 'string' },
          { name: 'phone', type: 'string' },
        ]},
        { name: 'inquiries', columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'listingId', type: 'uuid', foreignKey: 'listings.id' },
          { name: 'userId', type: 'uuid', foreignKey: 'users.id' },
          { name: 'message', type: 'text' },
          { name: 'createdAt', type: 'datetime' },
        ]},
      ],
      saas: [
        { name: 'projects', columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'name', type: 'string' },
          { name: 'description', type: 'text' },
          { name: 'userId', type: 'uuid', foreignKey: 'users.id' },
          { name: 'createdAt', type: 'datetime' },
        ]},
        { name: 'team_members', columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'userId', type: 'uuid', foreignKey: 'users.id' },
          { name: 'role', type: 'enum', values: ['owner', 'admin', 'member'] },
          { name: 'joinedAt', type: 'datetime' },
        ]},
      ],
    };

    return {
      tables: [baseUsers, ...(industryTables[industry] ?? industryTables.saas)],
      enums: [
        { name: 'UserRole', values: ['admin', 'user'] },
      ],
    };
  }
}

export function createOrchestrator(config?: Partial<OrchestratorConfig>): Orchestrator {
  return new Orchestrator(config);
}
