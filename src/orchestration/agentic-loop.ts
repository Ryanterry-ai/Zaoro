/**
 * Agentic Loop
 * ==============
 *
 * The core execution engine that:
 * 1. Dispatches tasks to appropriate agents/skills
 * 2. Evaluates output quality
 * 3. Retries with different strategies if quality is insufficient
 * 4. Escalates to human if stuck
 * 5. Converges on real output
 *
 * This is the "intelligence" layer that makes the system autonomous.
 * It doesn't just run — it thinks, evaluates, and adapts.
 */

import type { TaskAtom, DecompositionResult } from './prompt-decomposer.js';
import type { OrchestrationPlan, SkillMatch } from './skill-orchestrator.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AgentStatus = 'pending' | 'running' | 'success' | 'failed' | 'retrying' | 'escalated' | 'completed';

export interface AgentTask {
  /** Unique task ID */
  id: string;
  /** The skill assigned to this task */
  skillId: string;
  /** The task atom this task implements */
  atom: TaskAtom;
  /** Input for the agent */
  input: string;
  /** Current status */
  status: AgentStatus;
  /** Number of attempts */
  attempts: number;
  /** Maximum attempts before escalation */
  maxAttempts: number;
  /** Output from the agent (if completed) */
  output?: AgentOutput;
  /** Error message (if failed) */
  error?: string;
  /** Execution history */
  history: AttemptRecord[];
}

export interface AgentOutput {
  /** The generated artifact(s) */
  artifacts: GeneratedArtifact[];
  /** Quality score (0..1) */
  qualityScore: number;
  /** Whether the output meets requirements */
  meetsRequirements: boolean;
  /** Issues found during evaluation */
  issues: string[];
  /** Suggestions for improvement */
  suggestions: string[];
  /** Token usage */
  tokenUsage: number;
  /** Execution time in ms */
  executionTime: number;
}

export interface GeneratedArtifact {
  /** Artifact type */
  type: 'component' | 'page' | 'style' | 'config' | 'data' | 'test' | 'documentation';
  /** File path */
  path: string;
  /** Content */
  content: string;
  /** Language/framework */
  language: string;
  /** Size in bytes */
  size: number;
}

export interface AttemptRecord {
  /** Attempt number */
  attempt: number;
  /** Strategy used */
  strategy: string;
  /** Quality score achieved */
  qualityScore: number;
  /** Issues found */
  issues: string[];
  /** Timestamp */
  timestamp: number;
  /** Execution time in ms */
  executionTime: number;
}

export interface LoopResult {
  /** All tasks and their final status */
  tasks: AgentTask[];
  /** Overall success (all tasks completed) */
  success: boolean;
  /** Total attempts across all tasks */
  totalAttempts: number;
  /** Total execution time */
  totalTime: number;
  /** Final quality scores per task */
  qualityScores: Record<string, number>;
  /** Whether any task was escalated to human */
  hasEscalation: boolean;
  /** Summary of what was built */
  summary: string;
}

export interface AgentQualityGate {
  /** Gate name */
  name: string;
  /** Minimum quality score to pass */
  threshold: number;
  /** Checks to perform */
  checks: QualityCheck[];
}

export interface QualityCheck {
  /** Check name */
  name: string;
  /** Check function */
  check: (output: AgentOutput, task: AgentTask) => QualityCheckResult;
}

export interface QualityCheckResult {
  passed: boolean;
  score: number;
  message: string;
}

// ─── Execution Strategies ───────────────────────────────────────────────────

const STRATEGIES = [
  'standard',        // Normal execution
  'detailed',        // More thorough, higher quality
  'creative',        // More creative approach
  'minimal',         // Simpler, faster
  'reference-based', // Use reference examples
  'step-by-step',    // Break into smaller pieces
];

// ─── Quality Gates ──────────────────────────────────────────────────────────

const DEFAULT_QUALITY_GATES: AgentQualityGate[] = [
  {
    name: 'code-quality',
    threshold: 0.7,
    checks: [
      {
        name: 'has-output',
        check: (output) => ({
          passed: output.artifacts.length > 0,
          score: output.artifacts.length > 0 ? 1 : 0,
          message: output.artifacts.length > 0 ? 'Has output artifacts' : 'No output generated',
        }),
      },
      {
        name: 'has-content',
        check: (output) => {
          const totalSize = output.artifacts.reduce((sum, a) => sum + a.size, 0);
          return {
            passed: totalSize > 100,
            score: totalSize > 100 ? 1 : totalSize / 100,
            message: `Total content size: ${totalSize} bytes`,
          };
        },
      },
    ],
  },
  {
    name: 'completeness',
    threshold: 0.6,
    checks: [
      {
        name: 'covers-requirements',
        check: (output, task) => {
          const score = output.meetsRequirements ? 1 : output.qualityScore;
          return {
            passed: score >= 0.6,
            score,
            message: output.meetsRequirements ? 'Requirements covered' : 'Partial coverage',
          };
        },
      },
    ],
  },
];

// ─── Agentic Loop Engine ────────────────────────────────────────────────────

/**
 * Run the agentic loop for a complete build.
 *
 * This is the main entry point. It:
 * 1. Creates tasks from the orchestration plan
 * 2. Dispatches tasks to agents
 * 3. Evaluates quality
 * 4. Retries if needed
 * 5. Returns final results
 *
 * @param plan - The orchestration plan from skill-orchestrator
 * @param decomposition - The original prompt decomposition
 * @param originalPrompt - The user's original prompt
 * @param config - Optional configuration
 * @returns LoopResult with all tasks and their final status
 */
export async function runAgenticLoop(
  plan: OrchestrationPlan,
  decomposition: DecompositionResult,
  originalPrompt: string,
  config?: {
    maxRetries?: number;
    qualityThreshold?: number;
    timeout?: number;
    verbose?: boolean;
  },
): Promise<LoopResult> {
  const maxRetries = config?.maxRetries ?? 3;
  const qualityThreshold = config?.qualityThreshold ?? 0.7;
  const verbose = config?.verbose ?? false;

  const startTime = Date.now();
  const tasks: AgentTask[] = [];

  // 1. Create tasks from the plan
  for (const match of plan.matches) {
    tasks.push(createTask(match, originalPrompt, maxRetries));
  }

  if (verbose) {
    console.log(`[agentic-loop] Created ${tasks.length} tasks`);
    console.log(`[agentic-loop] Execution groups: ${plan.executionGroups.length}`);
  }

  // 2. Execute tasks in groups (parallel within each group)
  for (let groupIdx = 0; groupIdx < plan.executionGroups.length; groupIdx++) {
    const group = plan.executionGroups[groupIdx];

    if (verbose) {
      console.log(`[agentic-loop] Executing group ${groupIdx + 1}/${plan.executionGroups.length} (${group.length} tasks)`);
    }

    // Execute tasks in this group (could be parallelized)
    const groupTasks = tasks.filter(t =>
      group.some(g => g.atom.value === t.atom.value)
    );

    for (const task of groupTasks) {
      await executeTaskWithRetry(task, qualityThreshold, verbose);
    }
  }

  // 3. Calculate results
  const totalAttempts = tasks.reduce((sum, t) => sum + t.attempts, 0);
  const totalTime = Date.now() - startTime;
  const allSuccess = tasks.every(t => t.status === 'completed' || t.status === 'success');
  const hasEscalation = tasks.some(t => t.status === 'escalated');

  const qualityScores: Record<string, number> = {};
  for (const task of tasks) {
    qualityScores[task.id] = task.output?.qualityScore ?? 0;
  }

  const summary = generateLoopSummary(tasks, allSuccess, totalAttempts, totalTime);

  return {
    tasks,
    success: allSuccess,
    totalAttempts,
    totalTime,
    qualityScores,
    hasEscalation,
    summary,
  };
}

/**
 * Execute a single task with retry logic.
 */
async function executeTaskWithRetry(
  task: AgentTask,
  qualityThreshold: number,
  verbose: boolean,
): Promise<void> {
  let strategyIdx = 0;

  while (task.attempts < task.maxAttempts) {
    task.attempts++;
    task.status = 'running';

    const strategy = STRATEGIES[strategyIdx % STRATEGIES.length];

    if (verbose) {
      console.log(`[agentic-loop] Task ${task.id}: attempt ${task.attempts} with strategy "${strategy}"`);
    }

    const attemptStart = Date.now();

    try {
      // Simulate agent execution (in production, this calls the LLM/agent)
      const output = await executeAgent(task, strategy);

      const attemptRecord: AttemptRecord = {
        attempt: task.attempts,
        strategy,
        qualityScore: output.qualityScore,
        issues: output.issues,
        timestamp: Date.now(),
        executionTime: Date.now() - attemptStart,
      };

      task.history.push(attemptRecord);

      // Evaluate quality
      const gateResult = evaluateQuality(output, task);

      if (gateResult.passed || output.qualityScore >= qualityThreshold) {
        task.output = output;
        task.status = 'completed';

        if (verbose) {
          console.log(`[agentic-loop] Task ${task.id}: PASSED (score: ${output.qualityScore.toFixed(2)})`);
        }
        return;
      }

      // Quality insufficient — prepare for retry
      if (verbose) {
        console.log(`[agentic-loop] Task ${task.id}: quality ${output.qualityScore.toFixed(2)} < ${qualityThreshold}, retrying...`);
      }

      task.status = 'retrying';
      strategyIdx++;

    } catch (error) {
      task.error = error instanceof Error ? error.message : String(error);
      task.history.push({
        attempt: task.attempts,
        strategy,
        qualityScore: 0,
        issues: [task.error],
        timestamp: Date.now(),
        executionTime: Date.now() - attemptStart,
      });

      if (verbose) {
        console.error(`[agentic-loop] Task ${task.id}: ERROR on attempt ${task.attempts}:`, error);
      }

      strategyIdx++;
    }
  }

  // All attempts exhausted — escalate
  task.status = 'escalated';
  if (verbose) {
    console.warn(`[agentic-loop] Task ${task.id}: ESCALATED after ${task.attempts} attempts`);
  }
}

/**
 * Execute an agent task (simulated — in production, calls LLM).
 */
async function executeAgent(task: AgentTask, strategy: string): Promise<AgentOutput> {
  // Simulate execution time
  const executionTime = 500 + Math.random() * 2000;

  // Simulate quality based on strategy and attempt
  const baseQuality = 0.5 + Math.random() * 0.3;
  const strategyBonus = strategy === 'detailed' ? 0.15 : strategy === 'step-by-step' ? 0.1 : 0;
  const attemptBonus = Math.min(task.attempts * 0.05, 0.15);
  const qualityScore = Math.min(baseQuality + strategyBonus + attemptBonus, 1);

  // Generate simulated artifacts
  const artifacts: GeneratedArtifact[] = [
    {
      type: 'component',
      path: `src/components/${task.atom.value.replace(/-/g, '/')}.tsx`,
      content: `// ${task.atom.value} component\n// Strategy: ${strategy}\n// Generated by ${task.skillId}`,
      language: 'tsx',
      size: 200 + Math.random() * 800,
    },
  ];

  const issues: string[] = [];
  if (qualityScore < 0.7) issues.push('Needs more detail');
  if (qualityScore < 0.5) issues.push('Missing key features');

  return {
    artifacts,
    qualityScore,
    meetsRequirements: qualityScore >= 0.7,
    issues,
    suggestions: qualityScore < 0.8 ? ['Consider adding more interactive elements'] : [],
    tokenUsage: Math.floor(500 + Math.random() * 2000),
    executionTime,
  };
}

/**
 * Evaluate quality using the quality gate system.
 */
function evaluateQuality(output: AgentOutput, task: AgentTask): { passed: boolean; score: number } {
  let totalScore = 0;
  let totalChecks = 0;
  let allPassed = true;

  for (const gate of DEFAULT_QUALITY_GATES) {
    for (const check of gate.checks) {
      const result = check.check(output, task);
      totalScore += result.score;
      totalChecks++;
      if (!result.passed) allPassed = false;
    }
  }

  const avgScore = totalChecks > 0 ? totalScore / totalChecks : 0;

  return {
    passed: allPassed && avgScore >= 0.7,
    score: avgScore,
  };
}

/**
 * Create a task from a skill match.
 */
function createTask(match: SkillMatch, originalPrompt: string, maxRetries: number): AgentTask {
  return {
    id: `task-${match.atom.type}-${match.atom.value}`,
    skillId: match.skill.id,
    atom: match.atom,
    input: originalPrompt,
    status: 'pending',
    attempts: 0,
    maxAttempts: maxRetries,
    history: [],
  };
}

/**
 * Generate a summary of the loop execution.
 */
function generateLoopSummary(
  tasks: AgentTask[],
  success: boolean,
  totalAttempts: number,
  totalTime: number,
): string {
  const completed = tasks.filter(t => t.status === 'completed').length;
  const escalated = tasks.filter(t => t.status === 'escalated').length;
  const avgQuality = tasks.reduce((sum, t) => sum + (t.output?.qualityScore ?? 0), 0) / tasks.length;

  const lines = [
    `Build ${success ? 'SUCCEEDED' : 'COMPLETED WITH ISSUES'}`,
    `Tasks: ${completed}/${tasks.length} completed, ${escalated} escalated`,
    `Total attempts: ${totalAttempts}`,
    `Total time: ${(totalTime / 1000).toFixed(1)}s`,
    `Average quality: ${(avgQuality * 100).toFixed(0)}%`,
  ];

  if (escalated > 0) {
    lines.push(`\nEscalated tasks require human intervention.`);
  }

  return lines.join('\n');
}
