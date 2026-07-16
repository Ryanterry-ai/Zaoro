// ─── Experience OS v2 — Canonical Types ─────────────────────────────────────
//
// The single source of truth for Experience OS v2.
// Every downstream layer reads from these types.
//
// Architecture:
//   ExperienceStrategy (top-level decisions)
//     → ExperienceGraph (adaptive, non-linear flow)
//       → Scene selections from SceneLibrary (reusable, composable)
//         → ExperienceBlueprint v2 (canonical artifact)
//           → Knowledge Base (captures patterns for continuous improvement)
// ─────────────────────────────────────────────────────────────────────────────

import type { ProvenanceAware, Provenance } from '../experience-intelligence/types.js';
import type { Industry } from '../types.js';

// ─── Experience Strategy ────────────────────────────────────────────────────

/** Top-level strategic decisions for the experience */
export interface ExperienceStrategy {
  /** Unique strategy ID */
  id: string;
  /** Industry context */
  industry: Industry;
  /** Sub-industry or niche */
  subIndustry?: string;
  /** Overall experience style */
  style: ExperienceStyle;
  /** Narrative arc: how the story unfolds */
  narrativeArc: NarrativeArc;
  /** Conversion strategy: how users are guided to act */
  conversionStrategy: ConversionStrategy;
  /** Emotional journey: target emotional states per section */
  emotionalJourney: EmotionalJourney;
  /** Pacing strategy: rhythm and tempo of the experience */
  pacingStrategy: PacingStrategy;
  /** Content density strategy */
  densityStrategy: DensityStrategy;
  /** Performance budget */
  performanceBudget: PerformanceBudgetV2;
  /** Why these decisions were made (provenance) */
  reasoning: string;
}

export type ExperienceStyle =
  | 'cinematic' | 'luxury' | 'minimal' | 'editorial'
  | 'enterprise' | 'playful' | 'technical' | 'premium'
  | 'storytelling' | 'brutalist' | 'organic' | 'futuristic';

/** How the narrative unfolds */
export interface NarrativeArc {
  /** Arc type */
  type: 'hook-problem-solution' | 'journey' | 'before-after' | 'discovery'
    | 'transformation' | 'comparison' | 'progressive' | 'storytelling'
    | 'data-driven' | 'emotional' | 'authority' | 'community';
  /** Target emotional arc */
  emotionalArc: 'rising' | 'bell' | 'wave' | 'tension-release' | 'steady' | 'climactic';
  /** Number of acts (typically 3-5) */
  actCount: number;
  /** Beat pattern within each act */
  beatPattern: BeatPattern;
}

export interface BeatPattern {
  /** Beats per act */
  beatsPerAct: number;
  /** Types of beats allowed */
  allowedBeatTypes: BeatType[];
  /** Maximum beat duration (ms) */
  maxBeatDurationMs: number;
}

export type BeatType =
  | 'hook' | 'problem' | 'agitation' | 'insight' | 'solution'
  | 'proof' | 'trust' | 'transformation' | 'benefits' | 'offer'
  | 'cta' | 'social-proof' | 'reflection' | 'climax' | 'resolution'
  | 'transition' | 'breath' | 'contrast';

/** How conversion is designed */
export interface ConversionStrategy {
  /** Primary conversion goal */
  primaryGoal: 'purchase' | 'signup' | 'contact' | 'download' | 'booking' | 'inquiry' | 'subscription' | 'demo' | 'trial';
  /** Number of conversion touchpoints */
  touchpointCount: number;
  /** Urgency approach */
  urgency: 'none' | 'subtle' | 'moderate' | 'strong';
  /** Trust signals to include */
  trustSignals: TrustSignal[];
  /** Friction reduction approach */
  frictionReduction: 'minimal' | 'progressive' | 'assisted' | 'automated';
}

export type TrustSignal =
  | 'testimonials' | 'case-studies' | 'certifications' | 'guarantees'
  | 'social-proof-numbers' | 'partner-logos' | 'security-badges'
  | 'money-back' | 'free-trial' | 'live-demo' | 'expert-endorsement';

/** Emotional journey through the experience */
export interface EmotionalJourney {
  /** Starting emotion */
  startEmotion: EmotionTarget;
  /** Peak emotion (at climax) */
  peakEmotion: EmotionTarget;
  /** Ending emotion (at CTA) */
  endEmotion: EmotionTarget;
  /** Emotion curve points */
  points: EmotionalJourneyPoint[];
}

export interface EmotionalJourneyPoint {
  /** Position in the experience (0-1, where 0 is start and 1 is end) */
  position: number;
  /** Target emotion */
  emotion: EmotionTarget;
  /** Intensity (0-1) */
  intensity: number;
}

export type EmotionTarget =
  | 'trust' | 'excitement' | 'calm' | 'urgency'
  | 'aspiration' | 'confidence' | 'curiosity' | 'delight'
  | 'motivation' | 'serenity' | 'energy' | 'warmth';

/** Rhythm and tempo */
export interface PacingStrategy {
  /** Overall pace */
  pace: 'slow' | 'moderate' | 'fast' | 'variable';
  /** Time between beats (ms) */
  beatIntervalMs: number;
  /** Maximum scroll speed before content is skipped */
  maxSkippedScrollSpeed: number;
  /** Whether to use scroll-snap */
  useScrollSnap: boolean;
  /** Pause moments (where user should stop) */
  pausePoints: PausePoint[];
}

export interface PausePoint {
  /** Position in experience (0-1) */
  position: number;
  /** Type of pause */
  type: 'breath' | 'reflection' | 'decision' | 'immersion';
  /** Duration suggestion (ms) */
  suggestedDurationMs: number;
}

/** Content density strategy */
export interface DensityStrategy {
  /** Hero density */
  hero: 'minimal' | 'moderate' | 'rich';
  /** Body density */
  body: 'minimal' | 'moderate' | 'rich';
  /** Visual-to-text ratio */
  visualTextRatio: number;
  /** Whitespace strategy */
  whitespace: 'generous' | 'balanced' | 'tight';
}

/** Performance budget */
export interface PerformanceBudgetV2 {
  /** Maximum concurrent animations */
  maxAnimations: number;
  /** Maximum moving layers */
  maxMovingLayers: number;
  /** Maximum parallax groups */
  maxParallaxGroups: number;
  /** Target FPS */
  targetFps: number;
  /** Maximum animation JS size (bytes) */
  maxAnimJsBytes: number;
  /** Maximum LCP (ms) */
  maxLcpMs: number;
  /** Maximum CLS */
  maxCls: number;
}

// ─── Experience Graph ───────────────────────────────────────────────────────

/** The Experience Graph — adaptive, non-linear experience flow */
export interface ExperienceGraph {
  /** Unique graph ID */
  id: string;
  /** All nodes in the graph */
  nodes: GraphNode[];
  /** All edges (transitions) between nodes */
  edges: GraphEdge[];
  /** Entry points */
  entryPoints: string[];
  /** Exit points (conversion targets) */
  exitPoints: string[];
  /** Branching conditions */
  branches: BranchCondition[];
  /** Graph metadata */
  metadata: GraphMetadata;
}

/** A node in the experience graph */
export interface GraphNode {
  /** Unique node ID */
  id: string;
  /** Scene reference (from SceneLibrary) */
  sceneId: string;
  /** Scene parameters (override defaults) */
  params: Record<string, unknown>;
  /** Node type */
  type: 'standard' | 'entry' | 'exit' | 'branch' | 'merge' | 'loop' | 'checkpoint';
  /** Priority (higher = more important) */
  priority: number;
  /** Whether this node can be skipped */
  skippable: boolean;
  /** Conditions under which this node is shown */
  conditions?: NodeCondition[];
  /** Estimated duration (ms) */
  estimatedDurationMs: number;
}

/** An edge (transition) between nodes */
export interface GraphEdge {
  /** Source node ID */
  from: string;
  /** Target node ID */
  to: string;
  /** Transition type */
  type: 'scroll' | 'click' | 'auto' | 'conditional' | 'time';
  /** Transition animation */
  transition: string;
  /** Transition duration (ms) */
  durationMs: number;
  /** Condition for this edge (if conditional) */
  condition?: string;
  /** Edge weight (for path selection) */
  weight: number;
}

/** A branching condition */
export interface BranchCondition {
  /** Condition ID */
  id: string;
  /** Condition expression */
  expression: string;
  /** True branch target */
  trueTarget: string;
  /** False branch target */
  falseTarget: string;
  /** Description */
  description: string;
}

/** Node condition */
export interface NodeCondition {
  /** Condition type */
  type: 'viewport' | 'scroll' | 'time' | 'interaction' | 'device' | 'analytics';
  /** Condition parameters */
  params: Record<string, unknown>;
}

/** Graph metadata */
export interface GraphMetadata {
  /** Total estimated duration (ms) */
  totalDurationMs: number;
  /** Total node count */
  nodeCount: number;
  /** Maximum depth (for non-linear graphs) */
  maxDepth: number;
  /** Whether the graph has cycles */
  hasCycles: boolean;
  /** Critical path (longest path through graph) */
  criticalPath: string[];
}

// ─── Scene Library ──────────────────────────────────────────────────────────

/** A reusable, composable scene definition */
export interface SceneDefinition {
  /** Unique scene ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Scene category */
  category: SceneCategory;
  /** What role this scene plays in the narrative */
  narrativeRole: NarrativeRole;
  /** Scene parameters (what can be customized) */
  parameters: SceneParameter[];
  /** Default configuration */
  defaults: SceneDefaults;
  /** Composability: which scenes this can combine with */
  composability: SceneComposability;
  /** Industry suitability (0-1, higher = more suitable) */
  industryFit: Record<string, number>;
  /** Performance tier */
  performanceTier: 'light' | 'standard' | 'heavy' | 'cinematic';
}

export type SceneCategory =
  | 'hero' | 'content' | 'social-proof' | 'conversion'
  | 'navigation' | 'media' | 'interactive' | 'data'
  | 'story' | 'utility' | 'layout';

export type NarrativeRole =
  | 'hook' | 'problem' | 'agitation' | 'insight' | 'solution'
  | 'proof' | 'trust' | 'transformation' | 'benefits' | 'offer'
  | 'cta' | 'social-proof' | 'reflection' | 'breath' | 'transition'
  | 'features' | 'pricing' | 'faq' | 'about' | 'team'
  | 'demo' | 'comparison' | 'process' | 'gallery';

/** A parameter that can be overridden when using this scene */
export interface SceneParameter {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: 'string' | 'number' | 'boolean' | 'image' | 'color' | 'array';
  /** Default value */
  defaultValue: unknown;
  /** Description */
  description: string;
  /** Whether this parameter is required */
  required: boolean;
}

/** Default scene configuration */
export interface SceneDefaults {
  /** Default layout */
  layout: string;
  /** Default spacing */
  spacing: string;
  /** Default background */
  background: string;
  /** Default animation */
  animation: string;
  /** Default content density */
  contentDensity: 'minimal' | 'moderate' | 'rich';
  /** Default visual complexity */
  visualComplexity: 'simple' | 'moderate' | 'complex';
}

/** How this scene composes with others */
export interface SceneComposability {
  /** Scenes this can be placed before */
  canFollow: string[];
  /** Scenes this can be placed after */
  canPrecede: string[];
  /** Scenes this can be combined with (nested) */
  canCombineWith: string[];
  /** Maximum times this scene can appear in a flow */
  maxOccurrences: number;
}

// ─── Experience Blueprint v2 ────────────────────────────────────────────────

/** The canonical artifact — Experience Blueprint v2 */
export interface ExperienceBlueprintV2 {
  /** Unique blueprint ID */
  id: string;
  /** Timestamp */
  createdAt: string;
  /** Version */
  version: string;
  /** The strategic decisions that shaped this blueprint */
  strategy: ProvenanceAware<ExperienceStrategy>;
  /** The experience graph (non-linear flow) */
  graph: ProvenanceAware<ExperienceGraph>;
  /** Selected scenes from the library (with parameters filled in) */
  scenes: ProvenanceAware<SelectedScene[]>;
  /** Page-level experience configs */
  pageExperiences: ProvenanceAware<PageExperience[]>;
  /** Global experience settings */
  globalSettings: ProvenanceAware<GlobalExperienceSettings>;
  /** Knowledge base references (what patterns were used) */
  knowledgeRefs: ProvenanceAware<KnowledgeReference[]>;
  /** Validation result */
  validation: ExperienceValidation;
}

/** A scene selected from the library with parameters filled in */
export interface SelectedScene {
  /** Reference to SceneLibrary scene ID */
  sceneId: string;
  /** Filled-in parameters */
  params: Record<string, unknown>;
  /** Graph node this scene corresponds to */
  nodeId: string;
  /** Order in the page */
  order: number;
  /** Override defaults */
  overrides: Partial<SceneDefaults>;
}

/** Per-page experience configuration */
export interface PageExperience {
  /** Page path */
  pagePath: string;
  /** Page title */
  title: string;
  /** Ordered scene IDs for this page */
  sceneIds: string[];
  /** Page-specific strategy overrides */
  strategyOverrides?: Partial<ExperienceStrategy>;
}

/** Global experience settings */
export interface GlobalExperienceSettings {
  /** Global animation level */
  animationLevel: 'none' | 'subtle' | 'moderate' | 'expressive';
  /** Global reduced motion */
  reducedMotion: boolean;
  /** Global scroll behavior */
  scrollBehavior: 'smooth' | 'instant' | 'auto';
  /** Global font loading strategy */
  fontLoading: 'swap' | 'block' | 'fallback' | 'optional';
  /** Global image loading strategy */
  imageLoading: 'lazy' | 'eager' | 'blur-up';
  /** Global dark mode */
  darkMode: 'light' | 'dark' | 'auto';
}

/** Reference to a pattern from the knowledge base */
export interface KnowledgeReference {
  /** Pattern ID from knowledge base */
  patternId: string;
  /** Pattern name */
  patternName: string;
  /** How well this pattern applies (0-1) */
  relevanceScore: number;
  /** Where in the blueprint this pattern was applied */
  appliedTo: string;
}

/** Validation result */
export interface ExperienceValidation {
  /** Is the blueprint valid */
  valid: boolean;
  /** Errors */
  errors: string[];
  /** Warnings */
  warnings: string[];
  /** Score (0-100) */
  score: number;
}

// ─── Experience Knowledge Base ──────────────────────────────────────────────

/** A captured experience pattern */
export interface ExperiencePattern {
  /** Unique pattern ID */
  id: string;
  /** Pattern name */
  name: string;
  /** Pattern category */
  category: PatternCategory;
  /** Industries this pattern works for */
  industries: string[];
  /** The pattern definition */
  pattern: PatternDefinition;
  /** Effectiveness metrics */
  metrics: PatternMetrics;
  /** Usage count */
  usageCount: number;
  /** Last used timestamp */
  lastUsedAt: string;
  /** Creation timestamp */
  createdAt: string;
}

export type PatternCategory =
  | 'narrative-structure' | 'conversion-flow' | 'scene-composition'
  | 'animation-choreography' | 'scroll-pattern' | 'hover-strategy'
  | 'layout-composition' | 'emotional-arc' | 'pacing-strategy'
  | 'trust-signal' | 'cta-placement' | 'content-density';

/** Pattern definition */
export interface PatternDefinition {
  /** Scene sequence */
  sceneSequence?: string[];
  /** Narrative arc */
  narrativeArc?: string;
  /** Conversion strategy */
  conversionStrategy?: string;
  /** Animation choreography */
  choreography?: Record<string, unknown>;
  /** Layout composition */
  layout?: Record<string, unknown>;
  /** Any arbitrary data */
  data?: Record<string, unknown>;
}

/** Pattern effectiveness metrics */
export interface PatternMetrics {
  /** Average conversion rate improvement */
  conversionLift?: number;
  /** Average engagement score */
  engagementScore?: number;
  /** Average time on page */
  avgTimeOnPageMs?: number;
  /** Average scroll depth */
  avgScrollDepth?: number;
  /** Bounce rate impact */
  bounceRateImpact?: number;
  /** Number of times measured */
  sampleSize: number;
}
