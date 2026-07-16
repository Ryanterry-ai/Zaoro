/**
 * Orchestrator Types — shared types for the orchestrator-subagent system.
 *
 * The orchestrator pattern:
 *   Lead Agent → plans, dispatches subagents, synthesizes results
 *   Subagents → each has ONE scope, runs independently, returns structured output
 *   Quality Gates → validate results between phases, trigger retry loops
 *
 * Execution order:
 *   Phase 1: Research Agent (sequential — foundation for everything)
 *   Phase 2: Blueprint Agent + Content Agent (PARALLEL — no dependencies between them)
 *   Phase 3: Build Agent (sequential — needs both blueprint + content)
 *   Phase 4: Quality Gates + Retry Loop (agentic loop until quality met)
 */

import type { BREContext } from '../../bos/reasoning/rules-engine.js';
import type { BusinessResearch, ScrapedContent } from '../../bos/types.js';
import type { BREv2Result } from '../../bos/bre-v2-pipeline.js';
import type { RenderedFile } from '../../generation/renderers/renderer.js';
import type { ApplicationGraph } from '../../bos/graph/application-graph.js';
import type { ApplicationSpec } from '../../bos/schemas/blueprint/execution-blueprint.schema.js';
import type { SolutionArchitectureDecision } from '../../bos/types-solution-architecture.js';
import type { BusinessKnowledge } from '../../orchestration/business-intelligence/types.js';

// ─── Agent Status ────────────────────────────────────────────────────────────

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying';

export interface AgentResult<T> {
  status: AgentStatus;
  data?: T;
  error?: string;
  duration: number;
  attempts: number;
}

// ─── Phase Context (what the lead agent passes to each subagent) ─────────────

export interface PhaseContext {
  /** The original user prompt */
  prompt: string;
  /** Parsed BRE context from intake */
  breContext: BREContext;
  /** Business Knowledge from Business Intelligence layer (preferred) */
  businessKnowledge?: BusinessKnowledge | undefined;
  /** Business research (filled after Phase 1) */
  businessResearch?: BusinessResearch | undefined;
  /** BRE result (filled after Phase 2) */
  breResult?: BREv2Result | undefined;
  /** Scraped content (filled after Phase 2) */
  scrapedContent?: ScrapedContent | undefined;
  /** Design brief (filled after Phase 2 — parallel with Research) */
  designBrief?: import('./subagents/design-agent.js').DesignBrief | undefined;
  /** Solution architecture decision (filled after Phase 2 — SAP output) */
  solutionArchitecture?: SolutionArchitectureDecision | undefined;
  /** Application graph (filled after Phase 3) */
  applicationGraph?: ApplicationGraph | undefined;
  /** Application spec (filled after Phase 3) */
  applicationSpec?: ApplicationSpec | undefined;
  /** Generated files (filled after Phase 3) */
  renderResult?: RenderedFile[] | undefined;
  /** Pipeline config */
  config: {
    platform: string;
    workspaceDir: string;
    outputDir: string;
  };
  /** Retry count for agentic loop */
  retryCount: number;
  /** Max retries before giving up */
  maxRetries: number;
}

// ─── Quality Gate ────────────────────────────────────────────────────────────

export interface QualityGateResult {
  passed: boolean;
  failures: QualityGateFailure[];
}

export interface QualityGateFailure {
  gate: string;
  message: string;
  severity: 'error' | 'warning';
  /** Suggestion for how to fix */
  suggestion?: string;
}

// ─── Subagent Interfaces ─────────────────────────────────────────────────────

/**
 * Research Agent — gathers business intelligence.
 * Runs FIRST. Foundation for all downstream agents.
 *
 * Scope: prompt analysis → business type, user personas, revenue flow,
 * customer journey, payment methods, KPIs, reference URLs.
 */
export interface IResearchAgent {
  name: string;
  run(ctx: PhaseContext): Promise<AgentResult<BusinessResearch>>;
}

/**
 * Blueprint Agent — deterministic business reasoning.
 * Runs IN PARALLEL with Content Agent (after Research).
 *
 * Scope: BRE v2 pipeline → rules, constraints, scoring, pattern selection,
 * blueprint compilation. Deterministic (no LLM in normal path).
 */
export interface IBlueprintAgent {
  name: string;
  run(ctx: PhaseContext): Promise<AgentResult<BREv2Result>>;
}

/**
 * Content Agent — web scraping + content enrichment.
 * Runs IN PARALLEL with Blueprint Agent (after Research).
 *
 * Scope: scrape reference sites, extract real products/testimonials/prices,
 * validate scraped data, enrich with domain knowledge.
 */
export interface IContentAgent {
  name: string;
  run(ctx: PhaseContext): Promise<AgentResult<ScrapedContent>>;
}

/**
 * Build Agent — rendering + code generation.
 * Runs AFTER Blueprint + Content (needs both).
 *
 * Scope: execution blueprint, content resolution, rendering,
 * Prisma schema, API routes, seed file generation.
 */
export interface IBuildAgent {
  name: string;
  run(ctx: PhaseContext): Promise<AgentResult<{ renderResult: RenderedFile[]; applicationGraph: ApplicationGraph; applicationSpec: ApplicationSpec }>>;
}

/**
 * Design Agent — reads UI/UX skill instructions and generates design briefs.
 * Runs IN PARALLEL with Blueprint + Content (after Research).
 *
 * Scope: industry → design brief (colors, typography, layout, animation, components)
 */
export interface IDesignAgent {
  name: string;
  run(ctx: PhaseContext): Promise<AgentResult<import('./subagents/design-agent.js').DesignBrief>>;
}

/**
 * Solution Architecture Planner (SAP) — single authority for technology selection.
 * Runs AFTER Research + Design (needs business research + design brief).
 *
 * Scope: platform, architecture style, framework, rendering, state management,
 * backend, database, auth, deployment, integrations, security, observability, scalability.
 *
 * SAP is the SINGLE AUTHORITY for all technology decisions. The renderer remains
 * framework-agnostic and only consumes the resulting Execution Blueprint.
 */
export interface ISolutionArchitecturePlanner {
  name: string;
  run(ctx: PhaseContext): Promise<AgentResult<SolutionArchitectureDecision>>;
}

// ─── Lead Agent (Orchestrator) ───────────────────────────────────────────────

export interface OrchestratorConfig {
  platform: string;
  workspaceDir: string;
  outputDir: string;
  maxRetries: number;
  qualityGateStrict: boolean;
}

export interface OrchestratorResult {
  success: boolean;
  phaseContext: PhaseContext;
  agentResults: {
    research: AgentResult<BusinessResearch>;
    blueprint: AgentResult<BREv2Result>;
    content: AgentResult<ScrapedContent>;
    design: AgentResult<import('./subagents/design-agent.js').DesignBrief>;
    architecture: AgentResult<SolutionArchitectureDecision>;
    build: AgentResult<{ renderResult: RenderedFile[]; applicationGraph: ApplicationGraph; applicationSpec: ApplicationSpec }>;
  };
  qualityGates: QualityGateResult;
  totalDuration: number;
  retryCount: number;
}
