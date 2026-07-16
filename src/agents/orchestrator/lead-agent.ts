/**
 * Lead Agent — orchestrates the entire build process.
 *
 * Job: Plan → Delegate → Synthesize → Quality Gate → Retry Loop
 *
 * Execution order:
 *   Phase 1: Research Agent (sequential — foundation for everything)
 *   Phase 2: Blueprint Agent + Content Agent (PARALLEL — no dependencies)
 *   Phase 3: Build Agent (sequential — needs both blueprint + content)
 *   Phase 4: Quality Gates (validate, retry if needed)
 *
 * The lead agent does NOT do the work itself. It delegates to specialized
 * subagents and synthesizes their results into a coherent build.
 *
 * Agentic loop:
 *   If quality gate fails → identify which agent needs re-running →
 *   enrich context → re-run that agent → re-validate → repeat until
 *   quality met or max retries exceeded.
 */

import type {
  PhaseContext,
  OrchestratorConfig,
  OrchestratorResult,
  AgentResult,
  QualityGateResult,
} from './types.js';
import type { BREContext } from '../../bos/reasoning/rules-engine.js';
import type { BusinessResearch, ScrapedContent } from '../../bos/types.js';
import type { BREv2Result } from '../../bos/bre-v2-pipeline.js';
import type { RenderedFile } from '../../generation/renderers/renderer.js';
import type { ApplicationGraph } from '../../bos/graph/application-graph.js';
import type { ApplicationSpec } from '../../bos/schemas/blueprint/execution-blueprint.schema.js';
import type { SolutionArchitectureDecision } from '../../bos/types-solution-architecture.js';
import { buildBREContext } from '../../bos/intake-parser.js';

// Subagents
import { ResearchAgent } from './subagents/research-agent.js';
import { BlueprintAgent } from './subagents/blueprint-agent.js';
import { ContentAgent } from './subagents/content-agent.js';
import { DesignAgent } from './subagents/design-agent.js';
import { SolutionArchitecturePlanner } from './subagents/solution-architecture-planner.js';
import { BuildAgent } from './subagents/build-agent.js';

const log = {
  info: (msg: string, data?: Record<string, unknown>) => console.log(`[orchestrator] ${msg}`, data ? JSON.stringify(data) : ''),
  warn: (msg: string, data?: Record<string, unknown>) => console.warn(`[orchestrator] ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg: string, data?: Record<string, unknown>) => console.error(`[orchestrator] ${msg}`, data ? JSON.stringify(data) : ''),
};

export class LeadAgent {
  private researchAgent: ResearchAgent;
  private blueprintAgent: BlueprintAgent;
  private contentAgent: ContentAgent;
  private designAgent: DesignAgent;
  private architectureAgent: SolutionArchitecturePlanner;
  private buildAgent: BuildAgent;
  private config: OrchestratorConfig;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = {
      platform: config.platform ?? 'react',
      workspaceDir: config.workspaceDir ?? './workspace',
      outputDir: config.outputDir ?? './workspace/src',
      maxRetries: config.maxRetries ?? 3,
      qualityGateStrict: config.qualityGateStrict ?? true,
    };

    this.researchAgent = new ResearchAgent(this.config.workspaceDir);
    this.blueprintAgent = new BlueprintAgent();
    this.contentAgent = new ContentAgent(this.config.workspaceDir);
    this.designAgent = new DesignAgent();
    this.architectureAgent = new SolutionArchitecturePlanner();
    this.buildAgent = new BuildAgent();
  }

  /**
   * Execute the full build pipeline.
   *
   * Flow:
   *   1. Parse prompt → BREContext
   *   2. Phase 1: Research Agent (sequential)
   *   3. Phase 2: Blueprint + Content Agents (parallel)
   *   4. Phase 3: Build Agent (sequential)
   *   5. Phase 4: Quality gates + retry loop
   */
  async execute(prompt: string): Promise<OrchestratorResult> {
    const totalStart = Date.now();
    log.info('Orchestration started', { prompt: prompt.slice(0, 80) });

    // Step 0: Parse prompt → BREContext (deterministic, instant)
    const breContext = await buildBREContext(prompt);
    const industryScore = (breContext as any).__industryScore ?? 0;
    log.info('BRE context parsed', { industry: breContext.industry, appName: breContext.appName, industryScore });

    // Initialize phase context
    const phaseContext: PhaseContext = {
      prompt,
      breContext,
      config: {
        platform: this.config.platform,
        workspaceDir: this.config.workspaceDir,
        outputDir: this.config.outputDir,
      },
      retryCount: 0,
      maxRetries: this.config.maxRetries,
    };

    // ─── Phase 1: Research Agent (sequential) ─────────────────────────────
    log.info('Phase 1: Research Agent (sequential)');
    const researchResult = await this.researchAgent.run(phaseContext);
    if (researchResult.status === 'failed') {
      return this.fail(phaseContext, researchResult, totalStart);
    }
    phaseContext.businessResearch = researchResult.data;
    log.info('Phase 1 complete', { duration: researchResult.duration, attempts: researchResult.attempts });

    // ─── Phase 2: Blueprint + Content + Design + Architecture Agents (PARALLEL) ──
    log.info('Phase 2: Blueprint + Content + Design + Architecture Agents (parallel)');
    const [blueprintResult, contentResult, designResult, architectureResult] = await Promise.all([
      this.blueprintAgent.run(phaseContext),
      this.contentAgent.run(phaseContext),
      this.designAgent.run(phaseContext),
      this.architectureAgent.run(phaseContext),
    ]);

    if (blueprintResult.status === 'failed') {
      return this.fail(phaseContext, blueprintResult, totalStart);
    }
    phaseContext.breResult = blueprintResult.data;
    phaseContext.scrapedContent = contentResult.data;
    phaseContext.designBrief = designResult.status === 'completed' ? designResult.data : undefined;
    phaseContext.solutionArchitecture = architectureResult.status === 'completed' ? architectureResult.data : undefined;
    log.info('Phase 2 complete', {
      blueprintDuration: blueprintResult.duration,
      contentDuration: contentResult.duration,
      designDuration: designResult.duration,
      architectureDuration: architectureResult.duration,
      blueprintAttempts: blueprintResult.attempts,
      contentAttempts: contentResult.attempts,
      designAttempts: designResult.attempts,
      architectureAttempts: architectureResult.attempts,
      scrapedPrices: contentResult.data?.prices.length ?? 0,
      scrapedTestimonials: contentResult.data?.testimonials.length ?? 0,
      designBriefColors: designResult.data?.colors.primary ?? 'none',
      architecturePlatform: architectureResult.data?.platform ?? 'none',
      architectureFramework: architectureResult.data?.frontend.framework ?? 'none',
    });

    // ─── Phase 3: Build Agent (sequential) ────────────────────────────────
    log.info('Phase 3: Build Agent (sequential)');
    const buildResult = await this.buildAgent.run(phaseContext);
    if (buildResult.status === 'failed') {
      return this.fail(phaseContext, buildResult, totalStart);
    }
    phaseContext.renderResult = buildResult.data?.renderResult;
    phaseContext.applicationGraph = buildResult.data?.applicationGraph;
    phaseContext.applicationSpec = buildResult.data?.applicationSpec;
    log.info('Phase 3 complete', {
      duration: buildResult.duration,
      files: buildResult.data?.renderResult.length ?? 0,
      pages: buildResult.data?.applicationSpec.pages.length ?? 0,
    });

    // ─── Phase 4: Quality Gates + Agentic Retry Loop ──────────────────────
    log.info('Phase 4: Quality Gates');
    const qualityGates = this.runQualityGates(phaseContext);

    if (!qualityGates.passed && this.config.qualityGateStrict) {
      log.warn('Quality gates failed, attempting retry', {
        failures: qualityGates.failures.map(f => f.gate),
      });

      // Agentic retry loop
      for (let retry = 0; retry < this.config.maxRetries; retry++) {
        phaseContext.retryCount = retry + 1;
        log.info(`Retry ${retry + 1}/${this.config.maxRetries}`);

        // Identify which agent to re-run based on failures
        const agentToRerun = this.identifyRetryTarget(qualityGates);

        if (agentToRerun === 'research') {
          const retryResult = await this.researchAgent.run(phaseContext);
          if (retryResult.status === 'completed') {
            phaseContext.businessResearch = retryResult.data;
          }
        } else if (agentToRerun === 'blueprint') {
          const retryResult = await this.blueprintAgent.run(phaseContext);
          if (retryResult.status === 'completed') {
            phaseContext.breResult = retryResult.data;
          }
        } else if (agentToRerun === 'build') {
          const retryResult = await this.buildAgent.run(phaseContext);
          if (retryResult.status === 'completed') {
            phaseContext.renderResult = retryResult.data?.renderResult;
            phaseContext.applicationGraph = retryResult.data?.applicationGraph;
            phaseContext.applicationSpec = retryResult.data?.applicationSpec;
          }
        }

        // Re-validate
        const revalidation = this.runQualityGates(phaseContext);
        if (revalidation.passed) {
          log.info('Quality gates passed after retry');
          return this.succeed(phaseContext, {
            research: researchResult,
            blueprint: blueprintResult,
            content: contentResult,
            design: designResult,
            architecture: architectureResult,
            build: buildResult,
          }, revalidation, totalStart, retry + 1);
        }
      }

      log.warn('Max retries exceeded, returning best effort');
    }

    return this.succeed(phaseContext, {
      research: researchResult,
      blueprint: blueprintResult,
      content: contentResult,
      design: designResult,
      architecture: architectureResult,
      build: buildResult,
    }, qualityGates, totalStart, 0);
  }

  /**
   * Run quality gates on the build output.
   */
  private runQualityGates(ctx: PhaseContext): QualityGateResult {
    const failures: QualityGateFailure[] = [];

    // Gate 1: Business Research completeness
    if (ctx.businessResearch) {
      if (!ctx.businessResearch.userPersonas || ctx.businessResearch.userPersonas.length === 0) {
        failures.push({ gate: 'research.personas', message: 'No user personas', severity: 'warning' });
      }
      if (!ctx.businessResearch.revenueFlow || ctx.businessResearch.revenueFlow.length === 0) {
        failures.push({ gate: 'research.revenue', message: 'No revenue flow', severity: 'warning' });
      }
    }

    // Gate 2: Blueprint quality
    if (ctx.breResult) {
      if (!ctx.breResult.blueprint) {
        failures.push({ gate: 'blueprint.exists', message: 'No blueprint', severity: 'error' });
      }
      if (ctx.breResult.confidence < 0.3) {
        failures.push({ gate: 'blueprint.confidence', message: `Low confidence: ${ctx.breResult.confidence}`, severity: 'warning' });
      }
    }

    // Gate 3: Build output
    if (ctx.applicationSpec) {
      if (ctx.applicationSpec.pages.length === 0) {
        failures.push({ gate: 'build.pages', message: 'Zero pages', severity: 'error' });
      }
      const totalComponents = ctx.applicationSpec.pages.reduce((s, p) => s + p.components.length, 0);
      if (totalComponents === 0) {
        failures.push({ gate: 'build.components', message: 'Zero components', severity: 'error' });
      }
    }

    // Gate 4: Files generated
    if (ctx.renderResult && ctx.renderResult.length === 0) {
      failures.push({ gate: 'build.files', message: 'Zero files generated', severity: 'error' });
    }

    return {
      passed: failures.filter(f => f.severity === 'error').length === 0,
      failures,
    };
  }

  /**
   * Identify which agent to re-run based on quality gate failures.
   */
  private identifyRetryTarget(gates: QualityGateResult): 'research' | 'blueprint' | 'content' | 'build' {
    const errorGates = gates.failures.filter(f => f.severity === 'error');

    if (errorGates.some(g => g.gate.startsWith('research.'))) return 'research';
    if (errorGates.some(g => g.gate.startsWith('blueprint.'))) return 'blueprint';
    if (errorGates.some(g => g.gate.startsWith('build.'))) return 'build';
    return 'build'; // Default: re-run build with whatever we have
  }

  /**
   * Create a successful result.
   */
  private succeed(
    ctx: PhaseContext,
    agentResults: OrchestratorResult['agentResults'],
    qualityGates: QualityGateResult,
    totalStart: number,
    retryCount: number,
  ): OrchestratorResult {
    return {
      success: true,
      phaseContext: ctx,
      agentResults,
      qualityGates,
      totalDuration: Date.now() - totalStart,
      retryCount,
    };
  }

  /**
   * Create a failed result.
   */
  private fail(
    ctx: PhaseContext,
    failedResult: AgentResult<unknown>,
    totalStart: number,
  ): OrchestratorResult {
    return {
      success: false,
      phaseContext: ctx,
      agentResults: {
        research: { status: 'pending', duration: 0, attempts: 0 },
        blueprint: { status: 'pending', duration: 0, attempts: 0 },
        content: { status: 'pending', duration: 0, attempts: 0 },
        design: { status: 'pending', duration: 0, attempts: 0 },
        architecture: { status: 'pending', duration: 0, attempts: 0 },
        build: { status: 'pending', duration: 0, attempts: 0 },
      },
      qualityGates: { passed: false, failures: [{ gate: 'pipeline', message: failedResult.error ?? 'Unknown error', severity: 'error' }] },
      totalDuration: Date.now() - totalStart,
      retryCount: 0,
    };
  }
}

// Re-export types for convenience
type QualityGateFailure = import('./types.js').QualityGateFailure;
