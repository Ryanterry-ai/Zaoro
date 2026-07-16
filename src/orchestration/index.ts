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

// ─── Intelligence Layers (Deterministic Pipeline) ─────────────────────────
//
// Each layer has exactly one responsibility.
// Each layer owns one canonical output object.
// No downstream layer may infer, recreate or override knowledge owned by upstream.
// Every decision has provenance.

// Business Intelligence (owns BusinessKnowledge)
// Re-export everything except 'Integration' which conflicts with technology-planner
export {
  type BusinessKnowledge,
  type KnowledgeSource,
  type BusinessDiscovery,
  type CustomerPersona,
  type BusinessPersona,
  type UserRole,
  type CustomerJourney,
  type JourneyStage,
  type JourneyStageName,
  type BusinessWorkflow,
  type RevenueFlow,
  type PricingModel,
  type PaymentFlow,
  type AcquisitionChannel,
  type RetentionModel,
  type ComplianceRequirement,
  type Kpi,
  type BusinessEntity,
  type EntityRelationship,
  type RequiredPage,
  type RequiredDashboard,
  type Automation,
  type BusinessVocabulary,
  type ContentStrategy,
  type DesignStrategy,
  type ExperienceGoals,
  type BusinessIntelligenceInput,
} from './business-intelligence/types.js';
export * from './business-intelligence/engine.js';
export * from './business-intelligence/dimensions.js';
export * from './business-intelligence/archetypes.js';
export * from './business-intelligence/adapters.js';

// Knowledge Acquisition (owns Evidence and Sources)
export * from './knowledge-acquisition/index.js';

// Experience Intelligence (owns ExperienceBlueprint)
export * from './experience-intelligence/index.js';

// Content Intelligence (owns ContentBlueprint)
export * from './content-intelligence/index.js';

// Technology Planner (owns SolutionArchitecture)
export * from './technology-planner/index.js';

// Application Blueprint (owns ApplicationBlueprint)
export * from './application-blueprint/index.js';

// Execution Blueprint (owns ExecutionBlueprint)
export * from './execution-blueprint/index.js';

// Renderer Engine (owns code generation ONLY)
export * from './renderer-engine/index.js';

// Pipeline Orchestrator (ties all layers together)
export * from './pipeline-orchestrator/index.js';

// Observability (debug artifact export)
export * from './observability/index.js';

// Shared Types (used across multiple layers)
export * from './shared/index.js';

// ─── Command Router (user-facing entry point) ───────────────────────────────

export {
  parseCommand,
  executeFindSkills,
  executeBuildAnything,
} from './command-router.js';
export type {
  CommandType,
  CommandInput,
  CommandResult,
} from './command-router.js';

// ─── Prompt Decomposer (breaks complex prompts into task atoms) ─────────────

export {
  decomposePrompt,
} from './prompt-decomposer.js';
export type {
  TaskAtomType,
  TaskAtom,
  DecompositionResult,
} from './prompt-decomposer.js';

// ─── Skill Orchestrator (matches atoms to skills) ───────────────────────────

export {
  findSkillsForCapability,
  findBestSkill,
  createOrchestrationPlan,
  getInstalledSkills,
  isSkillInstalled,
  installSkill,
  installSkills,
} from './skill-orchestrator.js';
export type {
  SkillManifest,
  SkillMatch,
  OrchestrationPlan,
} from './skill-orchestrator.js';

// ─── Agentic Loop (executes tasks with quality evaluation) ──────────────────

export {
  runAgenticLoop,
} from './agentic-loop.js';
export type {
  AgentStatus,
  AgentTask,
  AgentOutput,
  GeneratedArtifact,
  AttemptRecord,
  LoopResult,
  AgentQualityGate,
  QualityCheck,
  QualityCheckResult,
} from './agentic-loop.js';

// ─── Motion Architecture ───────────────────────────────────────────────────

export {
  MotionCompiler,
  compileMotion,
  compilePageMotion,
  createRevealBlueprint,
} from '../motion/compiler.js';

export {
  useReducedMotion,
  useHasHydrated,
  useShouldAnimate,
  useMotionProps,
  getMotionSectionProps,
  getMotionCardProps,
} from '../motion/hooks.js';

export {
  applyReducedMotion,
  getReducedMotionOverrides,
  generateReducedMotionCss,
  generateHydrationCss,
} from '../motion/accessibility.js';

export {
  AnimationBudgetTracker,
  filterByBudget,
} from '../motion/budget.js';

export {
  MotionDirector,
  createMotionDirector,
} from '../motion/directors/motion-director.js';

export {
  VisualValidator,
  createVisualValidator,
} from '../motion/directors/visual-validation.js';

export {
  AnimationTestSuite,
  createAnimationTestSuite,
} from '../motion/directors/animation-test-suite.js';

export {
  MOTION_TOKEN_REGISTRY,
  REVEAL_TOKENS,
  INTERACTION_TOKENS,
  CINEMATIC_TOKENS,
  DEFAULT_ANIMATION_BUDGET,
} from '../motion/tokens.js';

// ─── Motion Capabilities (composable, deterministic — no industry templates) ─

export type {
  MotionCapability,
  MotionCapabilityCategory,
  CapabilitySignals,
  SelectionInput,
} from '../motion/capabilities/index.js';

export {
  CAPABILITIES,
  CAPABILITY_BY_ID,
  CapabilityRegistry,
  capabilityRegistry,
  selectCapabilities,
  performanceTierFromBudget,
} from '../motion/capabilities/index.js';

// ─── Experience OS v2 ───────────────────────────────────────────────────────

export {
  ExperienceOS,
  createExperienceOS,
  ExperienceStrategyEngine,
  createExperienceStrategyEngine,
  ExperienceGraphBuilder,
  createExperienceGraphBuilder,
  ExperienceKnowledgeBase,
  createExperienceKnowledgeBase,
  getAllScenes,
  getScene,
  getScenesByCategory,
  getScenesByRole,
  getScenesForIndustry,
  buildSceneSequence,
  canScenesCompose,
  getCompatibleNextScenes,
  getCompatiblePrevScenes,
} from './experience-os/index.js';

export type {
  ExperienceStrategy,
  ExperienceGraph,
  ExperienceBlueprintV2,
  SelectedScene,
  PageExperience,
  GlobalExperienceSettings,
  KnowledgeReference,
  ExperienceValidation,
  ExperienceStyle,
} from './experience-os/index.js';
