// ─── Orchestration Framework Types ────────────────────────────────────────────
//
// Core type definitions for the /build-anything orchestration system.
// This module defines the contracts between all orchestration components:
// stages, artifacts, context, execution tracking, and the orchestrator itself.
//
// Design principles:
//   - Every stage declares its inputs/outputs as artifact keys
//   - Artifacts are typed and versioned for schema evolution
//   - Execution state is checkpointed for resumability
//   - Context is scoped: stages receive only what they declare
//   - The system is provider-agnostic; LLM access goes through an adapter
// ──────────────────────────────────────────────────────────────────────────────

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum StageStatus {
  Pending = 'pending',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Skipped = 'skipped',
  Retrying = 'retrying',
  Cancelled = 'cancelled',
}

export enum ArtifactType {
  Json = 'json',
  Markdown = 'markdown',
  Code = 'code',
  Schema = 'schema',
  Config = 'config',
  Report = 'report',
  Binary = 'binary',
}

export enum OrchestratorEvent {
  PipelineStarted = 'pipeline.started',
  PipelineCompleted = 'pipeline.completed',
  PipelineFailed = 'pipeline.failed',
  PipelineResumed = 'pipeline.resumed',
  StageQueued = 'stage.queued',
  StageStarted = 'stage.started',
  StageCompleted = 'stage.completed',
  StageFailed = 'stage.failed',
  StageRetrying = 'stage.retrying',
  StageSkipped = 'stage.skipped',
  CheckpointSaved = 'checkpoint.saved',
  CheckpointLoaded = 'checkpoint.loaded',
  ArtifactStored = 'artifact.stored',
  ArtifactRead = 'artifact.read',
  ContextCreated = 'context.created',
  LLMCallStarted = 'llm.call_started',
  LLMCallCompleted = 'llm.call_completed',
  LLMCallFailed = 'llm.call_failed',
}

export enum AgentRole {
  Research = 'research',
  BusinessAnalysis = 'business-analysis',
  Architecture = 'architecture',
  Database = 'database',
  Backend = 'backend',
  Frontend = 'frontend',
  Integration = 'integration',
  QualityAssurance = 'quality-assurance',
  Documentation = 'documentation',
  DevOps = 'devops',
}

// ─── Stage Contracts ──────────────────────────────────────────────────────────

/**
 * Metadata for a stage definition. Immutable after registration.
 */
export interface StageMeta {
  /** Unique stage identifier (e.g., 'research', 'architecture') */
  id: string;
  /** Human-readable name */
  name: string;
  /** What this stage does (shown in progress UI) */
  description: string;
  /** Agent role responsible for this stage */
  agentRole: AgentRole;
  /** Stage IDs that must complete before this stage can start */
  dependencies: string[];
  /** Artifact keys this stage reads from context */
  inputs: string[];
  /** Artifact keys this stage writes to context */
  outputs: string[];
  /** Estimated duration in seconds (for progress display) */
  estimatedDurationSec: number;
  /** Whether this stage can be skipped if its inputs are unchanged from a prior run */
  skippable: boolean;
  /** Maximum retry attempts (default: 3) */
  maxRetries: number;
  /** Whether this stage can run in parallel with other independent stages */
  parallelizable: boolean;
}

/**
 * Result returned by a stage after execution.
 */
export interface StageResult {
  /** Whether the stage completed successfully */
  success: boolean;
  /** Artifacts produced by this stage (key → value) */
  artifacts: Record<string, unknown>;
  /** Human-readable markdown documentation produced by this stage */
  markdown?: string | undefined;
  /** Warnings that don't prevent completion */
  warnings: string[];
  /** Error message if success is false */
  error?: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Number of LLM calls made (for cost tracking) */
  llmCalls: number;
  /** Tokens consumed (for cost tracking) */
  tokensUsed: number;
}

/**
 * Validation result for stage output.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Full definition of a stage: metadata + execution logic.
 */
export interface StageDefinition {
  meta: StageMeta;
  /** Execute the stage with the given context and return results */
  execute: (ctx: StageContext) => Promise<StageResult>;
  /** Validate that the stage's outputs are well-formed */
  validate: (result: StageResult) => ValidationResult;
  /** Save a checkpoint for resume (optional — only if stage has mid-execution state) */
  checkpoint?: (ctx: StageContext) => Promise<unknown>;
  /** Restore from checkpoint (optional) */
  restore?: (ctx: StageContext, checkpoint: unknown) => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

/**
 * Scoped context passed to a stage during execution.
 * Stages can only read artifacts they declared as inputs and
 * write to artifacts they declared as outputs.
 */
export interface StageContext {
  /** Unique execution ID for this pipeline run */
  executionId: string;
  /** The stage being executed */
  stageId: string;
  /** Read-only access to declared input artifacts */
  getArtifact: <T = unknown>(key: string) => T | undefined;
  /** Write access to declared output artifacts */
  setArtifact: (key: string, value: unknown, type?: ArtifactType) => void;
  /** Access to the full project manifest */
  manifest: ProjectManifest;
  /** Call the LLM through the adapter (only available if agent uses LLM) */
  callLLM: (params: LLMCallParams) => Promise<LLMCallResult>;
  /** Emit a progress event */
  emit: (event: string, data?: unknown) => void;
  /** Get a checkpoint value saved by this stage */
  getCheckpoint: <T = unknown>(key: string) => T | undefined;
  /** Save a checkpoint value */
  setCheckpoint: (key: string, value: unknown) => void;
  /** Logger scoped to this stage */
  log: StageLogger;
  /** BOS knowledge context (industry-specific data and prompts) */
  bos: BOSContext;
  /** Runtime engine for build/test/preview (available after build stage) */
  runtime?: RuntimeContext | undefined;
}

export interface StageLogger {
  info: (msg: string, data?: unknown) => void;
  warn: (msg: string, data?: unknown) => void;
  error: (msg: string, data?: unknown) => void;
  debug: (msg: string, data?: unknown) => void;
}

// ─── Artifacts ────────────────────────────────────────────────────────────────

/**
 * Stored artifact with metadata.
 */
export interface Artifact {
  /** Unique key (e.g., 'research.domain', 'architecture.system') */
  key: string;
  /** The actual data */
  content: unknown;
  /** Content type */
  type: ArtifactType;
  /** Stage that produced this artifact */
  producedBy: string;
  /** ISO timestamp */
  createdAt: string;
  /** Schema version for evolution */
  version: number;
  /** Content hash for change detection */
  hash: string;
  /** Human-readable description */
  description?: string | undefined;
}

/**
 * Artifact metadata (stored alongside content for quick inspection).
 */
export interface ArtifactMeta {
  key: string;
  type: ArtifactType;
  producedBy: string;
  createdAt: string;
  version: number;
  hash: string;
  sizeBytes: number;
  description?: string | undefined;
}

// ─── Project Manifest ─────────────────────────────────────────────────────────

/**
 * The input specification for a /build-anything invocation.
 * This is what the user provides and what drives the entire pipeline.
 */
export interface ProjectManifest {
  /** Unique project identifier */
  id: string;
  /** User's natural language description of what to build */
  description: string;
  /** Raw user input (the original prompt or file content) */
  userInput?: string;
  /** Optional project name */
  name?: string;
  /** Target domain/industry (if known) */
  domain?: string;
  /** Target tech stack preferences */
  techStack?: TechStackPreferences;
  /** Deployment target */
  deploymentTarget?: DeploymentTarget;
  /** Quality requirements */
  qualityRequirements?: QualityRequirements;
  /** Constraints (budget, timeline, compliance) */
  constraints?: string[];
  /** Optional reference URLs or files */
  references?: ProjectReference[];
  /** When this manifest was created */
  createdAt: string;
  /** Manifest version for schema evolution */
  version: number;
}

export interface TechStackPreferences {
  /** Frontend framework preference */
  frontend?: string | undefined;
  /** Backend framework preference */
  backend?: string | undefined;
  /** Database preference */
  database?: string | undefined;
  /** Any other preferences */
  other?: Record<string, string> | undefined;
}

export interface DeploymentTarget {
  /** Platform (e.g., 'vercel', 'aws', 'docker', 'self-hosted') */
  platform: string;
  /** Region preference */
  region?: string;
  /** Environment variables needed */
  envVars?: Record<string, string>;
}

export interface QualityRequirements {
  /** Required test coverage percentage */
  testCoverage?: number;
  /** Whether E2E tests are required */
  e2eRequired?: boolean;
  /** Performance budget (ms for LCP) */
  performanceBudgetMs?: number;
  /** Accessibility level (A, AA, AAA) */
  accessibilityLevel?: string;
}

export interface ProjectReference {
  /** URL or file path */
  url: string;
  /** Type of reference */
  type: 'url' | 'file' | 'image' | 'design';
  /** Optional description */
  description?: string;
}

// ─── LLM Adapter ──────────────────────────────────────────────────────────────

export interface LLMCallParams {
  /** The prompt or instruction */
  prompt: string;
  /** System prompt / context */
  systemPrompt?: string;
  /** Structured output schema (if JSON response needed) */
  responseSchema?: Record<string, unknown>;
  /** Temperature (0.0 = deterministic, 1.0 = creative) */
  temperature?: number;
  /** Max tokens */
  maxTokens?: number;
  /** Task type for adapter routing */
  taskType: LLMTaskType;
  /** Previous conversation context (for multi-turn) */
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface LLMCallResult {
  /** The response text */
  content: string;
  /** Parsed JSON if responseSchema was provided */
  parsed?: unknown;
  /** Token usage */
  usage: { input: number; output: number; total: number };
  /** Which provider/model was used */
  provider: string;
  model: string;
  /** Duration in milliseconds */
  durationMs: number;
}

export enum LLMTaskType {
  /** Structured data extraction (temp 0.0, JSON output) */
  StructuredExtraction = 'structured-extraction',
  /** Analysis and reasoning (temp 0.2, text output) */
  Analysis = 'analysis',
  /** Creative content generation (temp 0.7, text output) */
  Creative = 'creative',
  /** Code generation (temp 0.0, code output) */
  CodeGeneration = 'code-generation',
  /** Review and critique (temp 0.1, text output) */
  Review = 'review',
  /** Planning and strategy (temp 0.3, text output) */
  Planning = 'planning',
}

// ─── Intent Routing ───────────────────────────────────────────────────────────

/**
 * The type of input the user provided. Determines which intake path runs.
 */
export enum IntentType {
  /** Natural language project description */
  Prompt = 'prompt',
  /** URL of an existing website to clone/analyze */
  Website = 'website',
  /** Product requirements document */
  PRD = 'prd',
  /** Figma design file or link */
  Figma = 'figma',
  /** Existing codebase to modernize or extend */
  Codebase = 'codebase',
  /** Database schema to build around */
  Database = 'database',
}

/**
 * Result from the intent router. Normalized into a ProjectManifest
 * regardless of input type.
 */
export interface IntentResult {
  /** Detected intent type */
  intent: IntentType;
  /** Confidence score (0-1) */
  confidence: number;
  /** The normalized manifest */
  manifest: ProjectManifest;
  /** Raw input preserved for reference */
  rawInput: string;
  /** Any extracted metadata from the input (e.g., scraped website data, parsed PRD sections) */
  extractedMetadata?: Record<string, unknown> | undefined;
}

// ─── BOS (Business Operating System) ─────────────────────────────────────────

/**
 * Industry identifiers for BOS knowledge packs.
 */
export type Industry =
  | 'ecommerce'
  | 'saas'
  | 'fintech'
  | 'healthcare'
  | 'education'
  | 'restaurant'
  | 'fitness'
  | 'real-estate'
  | 'media'
  | 'portfolio'
  | 'marketplace'
  | 'nonprofit'
  | 'other';

/**
 * A BOS knowledge pack provides industry-specific knowledge that
 * enriches every stage of the pipeline. Loaded before research begins.
 */
export interface BOSPack {
  /** Pack identifier */
  id: string;
  /** Industry this pack covers */
  industry: Industry;
  /** Human-readable name */
  name: string;
  /** Pack version */
  version: string;
  /** Domain keywords for detection */
  detectionKeywords: string[];
  /** Domain-specific entities to model */
  entities: BOSEntity[];
  /** Industry-specific compliance rules */
  compliance: BOSCompliance[];
  /** Common integrations for this industry */
  integrations: BOSIntegration[];
  /** Industry-standard KPIs */
  kpis: string[];
  /** Typical user journeys */
  journeys: BOSJourney[];
  /** Domain-specific prompts to inject into stages */
  stagePrompts: Record<string, string>;
  /** Example artifacts for few-shot learning */
  exampleArtifacts: Record<string, unknown>;
}

export interface BOSEntity {
  name: string;
  description: string;
  fields: Array<{ name: string; type: string; required: boolean }>;
  relationships: Array<{ to: string; type: string }>;
}

export interface BOSCompliance {
  id: string;
  name: string;
  description: string;
  required: boolean;
  checklist: string[];
}

export interface BOSIntegration {
  name: string;
  category: string;
  purpose: string;
  apiType: string;
}

export interface BOSJourney {
  id: string;
  name: string;
  role: string;
  steps: string[];
  conversionGoal: string;
}

// ─── Context Budget ───────────────────────────────────────────────────────────

/**
 * Tracks token budget across the pipeline to stay within context limits.
 */
export interface ContextBudget {
  /** Maximum total tokens for the entire pipeline */
  maxTotalTokens: number;
  /** Maximum tokens per single LLM call */
  maxPerCallTokens: number;
  /** Tokens consumed so far */
  consumedTokens: number;
  /** Per-stage token usage */
  stageUsage: Record<string, number>;
}

/**
 * Summary of an artifact for context-efficient passing between stages.
 */
export interface ArtifactSummary {
  /** Original artifact key */
  key: string;
  /** One-line summary */
  summary: string;
  /** Token count of the summary */
  tokenCount: number;
  /** Whether this is a truncated summary (true) or full artifact (false) */
  isSummary: boolean;
  /** Full artifact size in tokens (for budget decisions) */
  fullSizeTokens: number;
}

// ─── Quality Gates ────────────────────────────────────────────────────────────

/**
 * A quality gate that validates artifact quality before downstream stages consume it.
 */
export interface QualityGate {
  /** Gate identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Stage this gate runs after */
  afterStage: string;
  /** Validation rules */
  rules: QualityGateRule[];
  /** Whether failure blocks the pipeline (true) or just warns (false) */
  blocking: boolean;
  /** Whether human approval is required */
  requiresApproval: boolean;
}

export interface QualityGateRule {
  /** Rule identifier */
  id: string;
  /** What this rule checks */
  description: string;
  /** Artifact key(s) to validate */
  artifactKeys: string[];
  /** Validation function name or custom validator */
  validator: string;
  /** Severity if this rule fails */
  severity: 'error' | 'warning';
}

/**
 * Result of running a quality gate.
 */
export interface GateResult {
  /** Gate ID */
  gateId: string;
  /** Whether the gate passed */
  passed: boolean;
  /** Individual rule results */
  ruleResults: Array<{
    ruleId: string;
    passed: boolean;
    message: string;
  }>;
  /** Warnings (non-blocking failures) */
  warnings: string[];
  /** Errors (blocking failures) */
  errors: string[];
  /** Whether human approval is pending */
  approvalPending: boolean;
  /** Timestamp */
  timestamp: string;
}

// ─── Human Approval ───────────────────────────────────────────────────────────

/**
 * Represents a human approval checkpoint between stages.
 */
export interface HumanApproval {
  /** Unique approval ID */
  id: string;
  /** Stage that requires approval */
  stageId: string;
  /** What needs to be approved */
  description: string;
  /** Artifacts to review */
  artifactKeys: string[];
  /** Approval status */
  status: 'pending' | 'approved' | 'rejected' | 'modified';
  /** Human feedback (if provided) */
  feedback?: string | undefined;
  /** Timestamp of decision */
  decidedAt?: string | undefined;
  /** Who decided (for audit) */
  decidedBy?: string | undefined;
}

/**
 * Callback interface for human-in-the-loop approval.
 * The orchestrator calls this when a stage requires approval.
 */
export interface ApprovalHandler {
  /** Request approval from the human */
  requestApproval(approval: HumanApproval): Promise<HumanApproval>;
}

// ─── Dual Output (JSON + Markdown) ───────────────────────────────────────────

/**
 * Every stage produces both machine-readable JSON and human-readable Markdown.
 */
export interface DualOutput {
  /** Machine-readable structured data */
  json: unknown;
  /** Human-readable markdown documentation */
  markdown: string;
}

// ─── Enhanced Stage Context ───────────────────────────────────────────────────

/**
 * BOS-enriched context available to stages.
 */
export interface BOSContext {
  /** The loaded BOS pack (if any) */
  pack: BOSPack | undefined;
  /** Detected industry */
  industry: Industry | undefined;
  /** Confidence of industry detection */
  detectionConfidence: number;
}

// ─── Enhanced Orchestrator Config ─────────────────────────────────────────────

export interface OrchestratorConfig {
  /** Maximum concurrent stages (default: 1 — sequential) */
  maxConcurrency: number;
  /** Default retry attempts per stage */
  defaultMaxRetries: number;
  /** Base delay for exponential backoff (ms) */
  retryBaseDelayMs: number;
  /** Maximum retry delay (ms) */
  retryMaxDelayMs: number;
  /** Stage timeout in seconds (0 = no timeout) */
  stageTimeoutSec: number;
  /** Whether to save checkpoints after each stage */
  enableCheckpoints: boolean;
  /** Whether to enable LLM calls (false = dry run) */
  enableLLM: boolean;
  /** Working directory for artifact storage */
  workingDirectory: string;
  /** Maximum tokens per LLM call */
  maxTokensPerCall: number;
  /** Default temperature */
  defaultTemperature: number;
  /** Maximum total token budget for the pipeline */
  contextBudgetTokens: number;
  /** Whether to require human approval between stages */
  requireApproval: boolean;
  /** Approval handler (if requireApproval is true) */
  approvalHandler?: ApprovalHandler | undefined;
  /** Quality gates to run between stages */
  qualityGates: QualityGate[];
  /** Whether to produce dual output (JSON + Markdown) */
  dualOutput: boolean;
  /** BOS packs directory */
  bosPacksDir: string;
}

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  maxConcurrency: 1,
  defaultMaxRetries: 3,
  retryBaseDelayMs: 1000,
  retryMaxDelayMs: 30000,
  stageTimeoutSec: 300,
  enableCheckpoints: true,
  enableLLM: true,
  workingDirectory: '.build-anything',
  maxTokensPerCall: 8192,
  defaultTemperature: 0.2,
  contextBudgetTokens: 100_000,
  requireApproval: false,
  approvalHandler: undefined,
  qualityGates: [],
  dualOutput: true,
  bosPacksDir: '.build-anything/bos-packs',
};

// ─── Execution State ──────────────────────────────────────────────────────────

/**
 * Complete execution state for a pipeline run.
 * Persisted as a checkpoint file for resumability.
 */
export interface ExecutionState {
  /** Unique execution ID */
  executionId: string;
  /** The manifest that started this execution */
  manifest: ProjectManifest;
  /** Current pipeline status */
  status: StageStatus;
  /** Per-stage execution records */
  stages: Record<string, StageExecutionRecord>;
  /** When execution started */
  startedAt: string;
  /** When execution last updated */
  updatedAt: string;
  /** When execution completed (if finished) */
  completedAt?: string | undefined;
  /** Total duration in milliseconds */
  totalDurationMs: number;
  /** Checkpoint data for mid-stage resume */
  checkpoints: Record<string, unknown>;
}

/**
 * Execution record for a single stage.
 */
export interface StageExecutionRecord {
  stageId: string;
  status: StageStatus;
  startedAt?: string | undefined;
  completedAt?: string | undefined;
  durationMs: number;
  attempt: number;
  maxAttempts: number;
  error?: string | undefined;
  warnings: string[];
  /** Keys of artifacts produced */
  artifactKeys: string[];
  /** LLM usage stats */
  llmCalls: number;
  tokensUsed: number;
  /** Checkpoint data for this stage */
  checkpoint?: unknown | undefined;
}

// ─── Pipeline Definition ──────────────────────────────────────────────────────

/**
 * A pipeline is an ordered collection of stages with dependency edges.
 * The orchestrator resolves execution order from this definition.
 */
export interface PipelineDefinition {
  /** Pipeline identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description: string;
  /** All stages in this pipeline */
  stages: StageDefinition[];
  /** Which stages can run in parallel (grouped by parallel group ID) */
  parallelGroups?: string[][];
}

// ─── BOS Integration ──────────────────────────────────────────────────────────

/**
 * A BOS knowledge pack that can extend the orchestration pipeline.
 * Knowledge packs provide domain-specific stages, agents, and artifacts.
 */
export interface BOSKnowledgePack {
  /** Pack identifier */
  id: string;
  /** Pack name */
  name: string;
  /** Version */
  version: string;
  /** Domain this pack covers */
  domain: string;
  /** Additional stages this pack provides */
  stages: StageDefinition[];
  /** Additional agent configurations */
  agents: AgentConfig[];
  /** Artifact schemas this pack defines */
  artifactSchemas: ArtifactSchema[];
  /** Seed data for the knowledge graph */
  seedData?: unknown[];
}

export interface AgentConfig {
  role: AgentRole;
  name: string;
  description: string;
  /** System prompt for this agent */
  systemPrompt: string;
  /** Task types this agent is optimized for */
  taskTypes: LLMTaskType[];
  /** Max concurrent calls */
  maxConcurrency: number;
}

export interface ArtifactSchema {
  /** Artifact key pattern (e.g., 'research.*', 'architecture.system') */
  keyPattern: string;
  /** JSON Schema for validation */
  schema: Record<string, unknown>;
  /** Description */
  description: string;
}

// ─── LLM Adapter Interface ────────────────────────────────────────────────────

/**
 * Interface for the LLM adapter used by the orchestrator.
 * The orchestrator depends on this interface, not the concrete LLMAdapter class.
 */
export interface LLMAdapterInterface {
  /** Make an LLM call */
  call(params: LLMCallParams): Promise<LLMCallResult>;
  /** Get total usage stats */
  getTotalUsage(): { calls: number; totalTokens: number; byProvider: Record<string, number> };
}

// ─── Runtime Context ────────────────────────────────────────────────────────

/**
 * Runtime context available to stages that need build/test/preview capabilities.
 * Wraps RuntimeEngine to keep the StageContext decoupled from implementation.
 */
export interface RuntimeContext {
  /** Install dependencies */
  install: (cwd?: string) => Promise<RuntimeStepResult>;
  /** Run build command */
  build: (cwd?: string, command?: string) => Promise<RuntimeStepResult>;
  /** Run test command */
  test: (cwd?: string, command?: string) => Promise<RuntimeStepResult>;
  /** Run full lifecycle (install + build + test + preview) */
  run: (cwd?: string) => Promise<RuntimeFullResult>;
  /** Get a human-readable report of the last run */
  report: () => string;
  /** Get log capture for error analysis */
  getFailures: () => Array<{
    category: string;
    message: string;
    suggestedFix?: string | undefined;
    retryable: boolean;
  }>;
}

export interface RuntimeStepResult {
  status: 'success' | 'failure' | 'timeout' | 'pending' | 'killed' | 'running';
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export interface RuntimeFullResult {
  success: boolean;
  install?: RuntimeStepResult | undefined;
  build?: RuntimeStepResult | undefined;
  test?: RuntimeStepResult | undefined;
  previewUrl?: string | undefined;
  screenshots?: string[];
  failures: Array<{
    category: string;
    message: string;
    suggestedFix?: string | undefined;
  }>;
  durationMs: number;
}

// ─── Milestone 1: Decision Engine Types ──────────────────────────────────────

export type DecisionType = 'model' | 'cache' | 'retry' | 'concurrency';

export type CachePolicy = 'always' | 'never' | 'stable-only' | 'large-only';

export type RetryStrategyType = 'aggressive' | 'moderate' | 'conservative' | 'none';

export interface ModelDecision {
  provider: string;
  model: string;
  reasoning: string;
  confidence: number;
}

export interface CacheDecision {
  shouldCache: boolean;
  reason: string;
  ttlMs: number;
}

export interface RetryDecision {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface ConcurrencyDecision {
  maxConcurrency: number;
  reasoning: string;
}

// ─── Milestone 1: Experience Engine Types ────────────────────────────────────

export interface StageOutcome {
  stageId: string;
  provider: string | undefined;
  model: string | undefined;
  taskType: LLMTaskType | undefined;
  durationMs: number;
  tokensUsed: number;
  llmCalls: number;
  success: boolean;
  error: string | undefined;
  cacheHit: boolean;
}

export interface PipelineOutcome {
  executionId: string;
  industry: Industry | undefined;
  stages: StageOutcome[];
  totalDurationMs: number;
  totalTokens: number;
  totalLlmCalls: number;
  success: boolean;
  completedAt: number;
}

// ─── Milestone 1: Execution Intelligence Types ──────────────────────────────

export interface StageStrategy {
  model: ModelDecision;
  cache: CacheDecision;
  retry: RetryDecision;
  concurrency: ConcurrencyDecision;
  estimatedDurationMs: number;
  estimatedTokens: number;
}

// ─── Milestone 2: Validation Types ──────────────────────────────────────────

export type ValidationTier = 'schema' | 'semantic' | 'cross-stage' | 'quality-gate';

export interface ValidationRule {
  id: string;
  tier: ValidationTier;
  description: string;
  validate: (artifact: unknown, context: ValidationContext) => ValidationResult;
}

export interface ValidationContext {
  stageId: string;
  executionId: string;
  previousArtifacts: Record<string, unknown>;
  manifest: ProjectManifest;
}

// ─── Milestone 3: Planner Types ─────────────────────────────────────────────

export interface ExecutionPlan {
  id: string;
  stages: PlannedStage[];
  estimatedTotalDurationMs: number;
  estimatedTotalTokens: number;
  parallelGroups: string[][];
}

export interface PlannedStage {
  stageId: string;
  strategy: StageStrategy;
  dependencies: string[];
  estimatedStartMs: number;
  estimatedDurationMs: number;
}

// ─── Milestone 4: Reporting Types ───────────────────────────────────────────

export interface ExecutionReport {
  executionId: string;
  manifest: ProjectManifest;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  success: boolean;
  stages: StageReport[];
  costSummary: CostSummary;
  experienceSummary: ExperienceSummary;
}

export interface StageReport {
  stageId: string;
  status: StageStatus;
  durationMs: number;
  tokensUsed: number;
  llmCalls: number;
  provider: string | undefined;
  model: string | undefined;
  artifacts: string[];
  errors: string[];
}

export interface CostSummary {
  totalTokens: number;
  estimatedCostUsd: number;
  byProvider: Record<string, { tokens: number; estimatedCostUsd: number }>;
}

export interface ExperienceSummary {
  totalExecutions: number;
  successRate: number;
  avgDurationMs: number;
  topProviders: Array<{ provider: string; usageCount: number; successRate: number }>;
}
