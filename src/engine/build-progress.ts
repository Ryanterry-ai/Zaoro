// ─── Build Progress Types ─────────────────────────────────────────
// Full progress tracking for every operation during build pipeline

export type BuildStage =
  | 'bi'            // Business Intelligence
  | 'research'      // Research Agent
  | 'architect'     // Architect
  | 'design-dna'    // Design DNA Generation
  | 'design'        // Design System
  | 'components'    // Component Sourcer
  | 'assets'        // Asset Intelligence
  | 'motion'        // Motion Engine
  | 'synthesize'    // Domain Synthesis + LLM
  | 'ux-eval'       // UX Evaluator
  | 'biz-eval'      // Business Validator
  | 'assembly'      // Assembly QA
  | 'correction'    // Self-Correction
  | 'compile'       // Compile & Validate
  | 'browser-verify'// Browser Verification (Sprint B)
  | 'repair'        // Repair Loop (Sprint B)
  | 'preview'       // Render Preview
  | 'complete';     // Done

export type BuildItemStatus = 'pending' | 'active' | 'done' | 'failed' | 'skipped';

export interface BuildProgressEvent {
  ts: number;
  stage: BuildStage;
  stageStatus: 'active' | 'done' | 'failed';
  message: string;
  data?: Record<string, unknown> | undefined;
}

// ─── Stage-level progress ─────────────────────────────────────────

export interface BuildStageProgress {
  stage: BuildStage;
  status: 'pending' | 'active' | 'done' | 'failed';
  startedAt: number | undefined;
  completedAt: number | undefined;
  itemsTotal: number;
  itemsDone: number;
  itemsFailed: number;
  errors: BuildError[];
}

export interface BuildError {
  stage: BuildStage;
  item: string;
  reason: string;
  severity: 'error' | 'warning' | 'info';
  recoverable: boolean;
}

// ─── Full build state ─────────────────────────────────────────────

export interface BuildState {
  prompt: string;
  stages: Record<BuildStage, BuildStageProgress>;
  events: BuildProgressEvent[];
  scores: {
    ux: number;
    business: number;
    build: number;
  } | undefined;
  iteration: number;
  maxIterations: number;
  filesWritten: string[];
  patchesGenerated: number;
  startedAt: number;
  completedAt: number | undefined;
  totalDuration: number;
  success: boolean;
  error: string | undefined;
}

// ─── Helper to create initial state ───────────────────────────────

export function createBuildState(prompt: string): BuildState {
  const now = Date.now();
  const stageIds: BuildStage[] = [
    'bi', 'research', 'architect', 'design-dna', 'design', 'components', 'assets',
    'motion', 'synthesize', 'ux-eval', 'biz-eval', 'assembly',
    'correction', 'compile', 'browser-verify', 'repair', 'preview', 'complete',
  ];

  const stages: Record<BuildStage, BuildStageProgress> = {} as any;
  for (const s of stageIds) {
    stages[s] = {
      stage: s,
      status: 'pending',
      startedAt: undefined,
      completedAt: undefined,
      itemsTotal: 0,
      itemsDone: 0,
      itemsFailed: 0,
      errors: [],
    };
  }

  return {
    prompt,
    stages,
    events: [],
    scores: undefined,
    iteration: 0,
    maxIterations: 3,
    filesWritten: [],
    patchesGenerated: 0,
    startedAt: now,
    completedAt: undefined,
    totalDuration: 0,
    success: false,
    error: undefined,
  };
}
