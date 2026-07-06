// ─── Orchestration Framework ──────────────────────────────────────────────────
//
// Barrel exports for the /build-anything orchestration system.
// ──────────────────────────────────────────────────────────────────────────────

// Enums
export {
  StageStatus,
  ArtifactType,
  OrchestratorEvent as OrchestratorEventType,
  AgentRole,
  LLMTaskType,
  IntentType,
  DEFAULT_ORCHESTRATOR_CONFIG,
} from './types.js';

// Core types
export type {
  StageMeta,
  StageResult,
  ValidationResult,
  StageDefinition,
  StageContext,
  StageLogger,
  Artifact,
  ArtifactMeta,
  ArtifactSchema,
  ProjectManifest,
  TechStackPreferences,
  DeploymentTarget,
  QualityRequirements,
  ProjectReference,
  LLMCallParams,
  LLMCallResult,
  LLMAdapterInterface,
  OrchestratorConfig,
  ExecutionState,
  StageExecutionRecord,
  PipelineDefinition,
  BOSKnowledgePack,
  AgentConfig,
} from './types.js';

// Intent routing types
export type {
  IntentResult,
} from './types.js';

// BOS types
export type {
  BOSPack,
  BOSContext,
  Industry,
  BOSEntity,
  BOSCompliance,
  BOSIntegration,
  BOSJourney,
} from './types.js';

// Context budget types
export type {
  ContextBudget,
  ArtifactSummary,
} from './types.js';

// Quality gate types
export type {
  QualityGate,
  QualityGateRule,
  GateResult,
  HumanApproval,
  ApprovalHandler,
  DualOutput,
} from './types.js';

// Core components
export { Orchestrator, createOrchestrator } from './orchestrator.js';
export type { OrchestratorResult, OrchestratorEvent } from './orchestrator.js';
export { ArtifactStore } from './artifact-store.js';
export { ExecutionTracker } from './execution-tracker.js';
export { createStageContext } from './context-manager.js';
export { AgentRegistry } from './agent-registry.js';
export { LLMAdapter } from './llm-adapter.js';
export type { LLMProviderConfig } from './llm-adapter.js';
export { BaseStage } from './stages/base-stage.js';

// New infrastructure
export { routeIntent, describeIntent } from './intent-router.js';
export { BOSLoader } from './bos-loader.js';
export { ContextBudgetManager } from './context-budget.js';
export { QualityGateRunner, DEFAULT_QUALITY_GATES } from './quality-gates.js';

// Stages
export { ProjectIntakeStage } from './stages/project-intake.js';
export { ResearchStage } from './stages/research.js';
export { BusinessAnalysisStage } from './stages/business-analysis.js';
export { ArchitectureStage } from './stages/architecture.js';
export { DatabaseDesignStage } from './stages/database-design.js';
export { ApiDesignStage } from './stages/api-design.js';
export { FrontendDesignStage } from './stages/frontend-design.js';
export { IntegrationStage } from './stages/integration.js';
export { QualityAssuranceStage } from './stages/quality-assurance.js';
export { BuildStage } from './stages/build.js';
export { ReviewBoardStage } from './stages/review-board.js';
export { DeploymentStage } from './stages/deployment.js';
export { DocumentationStage } from './stages/documentation.js';

// ─── Input Adapters ─────────────────────────────────────────────────────────

export { AdapterRegistry, createAdapterRegistry } from './input-adapters/index.js';
export { WebsiteAdapter } from './input-adapters/website-adapter.js';
export { FigmaAdapter } from './input-adapters/figma-adapter.js';
export { PRDAdapter } from './input-adapters/prd-adapter.js';
export { CodebaseAdapter } from './input-adapters/codebase-adapter.js';
export { DatabaseAdapter } from './input-adapters/database-adapter.js';
export { ApiAdapter } from './input-adapters/api-adapter.js';
export type { InputAdapter, AdapterResult } from './input-adapters/index.js';

// ─── Milestone 1: Intelligence Layer ────────────────────────────────────────

// Event Bus
export { EventBus, createEventBus } from './event-bus.js';
export type {
  BusEventType,
  BusEventPayloadMap,
  BusEvent,
  EventHandler,
  Subscription,
  PipelineStartedPayload,
  StageStartedPayload,
  ModelSelectedPayload,
  CacheHitPayload,
  CacheMissPayload,
  ArtifactCreatedPayload,
  ValidationPassedPayload,
  ValidationFailedPayload,
  RetryStartedPayload,
  RetrySucceededPayload,
  StageCompletedPayload,
  PipelineCompletedPayload,
} from './event-bus.js';

// Experience Engine
export { ExperienceEngine, createExperienceEngine } from './experience-engine.js';
export type {
  StageOutcome,
  PipelineOutcome,
  DecisionContext,
  ExperienceRecommendations,
  HistoryQuery,
  StatsFilter,
  ExperienceStats,
  ProviderStats,
  StageStats,
} from './experience-engine.js';

// Decision Engine
export { DecisionEngine, createDecisionEngine } from './decision-engine.js';
export type {
  ProviderHealth,
  ModelSelectionContext,
  ModelDecision as DecisionModelDecision,
  CacheContext,
  CacheDecision as DecisionCacheDecision,
  RetryContext,
  RetryDecision as DecisionRetryDecision,
  ConcurrencyContext,
  ConcurrencyDecision as DecisionConcurrencyDecision,
  DecisionType,
  DecisionOutcome,
} from './decision-engine.js';

// Execution Intelligence
export { ExecutionIntelligence, createExecutionIntelligence } from './execution-intelligence.js';
export type {
  IntelligenceContext,
  StageStrategy,
  ExecutionIntelligenceConfig,
} from './execution-intelligence.js';

// ─── Milestone 1: Extended Types ────────────────────────────────────────────

export type {
  DecisionType as DecisionTypeExtended,
  CachePolicy,
  RetryStrategyType,
  StageOutcome as StageOutcomeExtended,
  PipelineOutcome as PipelineOutcomeExtended,
  StageStrategy as StageStrategyExtended,
  ValidationTier,
  ValidationRule,
  ValidationContext,
  ExecutionPlan,
  PlannedStage,
  ExecutionReport,
  StageReport,
  CostSummary,
  ExperienceSummary,
} from './types.js';

// ─── Milestone 2: Stage Context Enrichment ──────────────────────────────────

export { enrichStagePrompt, getPackSummary } from './stage-context-enrichment.js';
export type { EnrichedPrompt } from './stage-context-enrichment.js';

// ─── Milestone 3: Validation Pipeline ───────────────────────────────────────

export { ValidationPipeline, createValidationPipeline } from './validation-pipeline.js';
export type {
  ValidationTierConfig,
  TierResult,
  ValidationReport,
  CrossStageRule,
} from './validation-pipeline.js';

// ─── Milestone 3: Planner ──────────────────────────────────────────────────

export { Planner, createPlanner } from './planner.js';
export type {
  PlannerConfig,
  CheckpointData,
} from './planner.js';

// ─── Milestone 4: Progress Reporter ────────────────────────────────────────

export { ProgressReporter, createProgressReporter } from './progress-reporter.js';
export type {
  StageProgress,
  PipelineProgress,
  ProgressUpdate,
  ProgressCallback,
} from './progress-reporter.js';

// ─── Milestone 4: Execution Reports ────────────────────────────────────────

export { ExecutionReportGenerator, createExecutionReportGenerator } from './execution-report.js';
export type { ReportOptions } from './execution-report.js';

// ─── Design Intelligence Engine ─────────────────────────────────────────────

export { DesignIntelligenceEngine, createDesignIntelligenceEngine } from './design-intelligence/engine.js';
export type { DesignIntelligenceConfig } from './design-intelligence/engine.js';

// Sub-engines
export { createUXEngine } from './design-intelligence/engines/ux-engine.js';
export { createVisualEngine } from './design-intelligence/engines/visual-engine.js';
export { createDesignSystemEngine } from './design-intelligence/engines/design-system-engine.js';
export { createComponentEngine } from './design-intelligence/engines/component-engine.js';
export { createMotionEngine } from './design-intelligence/engines/motion-engine.js';
export { createPolishEngine } from './design-intelligence/engines/polish-engine.js';

// Design Intelligence types
export type {
  DesignContext,
  DesignPreferences,
  DesignDomain,
  DesignRecommendation,
  ComponentSuggestion,
  AnimationSuggestion,
  DesignDecision,
  ColorTokens,
  TypographyTokens,
  LayoutTokens,
  MotionTokens,
  ComponentMap,
  ComponentConfig,
  DesignSubEngine,
} from './design-intelligence/types.js';

export { INDUSTRY_PERSONALITIES } from './design-intelligence/types.js';

// ─── Runtime Layer ──────────────────────────────────────────────────────────

export { RuntimeEngine, createRuntimeEngine } from './runtime/runtime-engine.js';
export { ProcessManager, createProcessManager } from './runtime/process-manager.js';
export { LogCapture, createLogCapture } from './runtime/log-capture.js';
export { RetryEngine, createRetryEngine } from './runtime/retry-engine.js';
export { PreviewServer, createPreviewServer } from './runtime/preview-server.js';
export { VisualRegression, createVisualRegression } from './runtime/visual-regression.js';

export type {
  RuntimeConfig,
  RuntimeRunResult,
  ProcessSpec,
  ProcessResult,
  ProcessStatus,
  DevServerHandle,
  LogEntry,
  LogLevel,
  FailureInfo,
  FailureCategory,
  RuntimeRetryContext,
  FixSuggestion,
  FilePatch,
  PreviewConfig,
  PreviewResult,
  ScreenshotOptions,
  ScreenshotResult,
  PageMetrics,
  VisualDiffResult,
} from './runtime/types.js';

// ─── Benchmark Suite ────────────────────────────────────────────────────────

export { BenchmarkSuite, createBenchmarkSuite } from './benchmark/benchmark-suite.js';
export type {
  BenchmarkApp,
  BenchmarkResult,
  BenchmarkSuiteResult,
  BenchmarkSuiteConfig,
} from './benchmark/benchmark-suite.js';

// Runtime Context (for StageContext integration)
export type {
  RuntimeContext,
  RuntimeStepResult,
  RuntimeFullResult,
} from './types.js';

export type { RetryConfig } from './runtime/retry-engine.js';

// ─── Multi-Agent Review Board ──────────────────────────────────────────────

export type {
  ReviewIssue,
  ReviewResult,
  ReviewBoardResult,
} from './stages/review-board.js';
