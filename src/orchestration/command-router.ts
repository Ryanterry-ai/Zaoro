/**
 * Command Router
 * ===============
 *
 * Handles `/build-anything` and `/find-skills` commands with the new
 * decomposition → orchestration → agentic loop pipeline.
 *
 * This is the user-facing entry point that:
 * 1. Parses the command
 * 2. Decomposes the prompt
 * 3. Discovers and installs skills
 * 4. Runs the agentic loop
 * 5. Returns results
 */

import { decomposePrompt, type DecompositionResult } from './prompt-decomposer.js';
import {
  createOrchestrationPlan,
  getInstalledSkills,
  installSkills,
  type OrchestrationPlan,
} from './skill-orchestrator.js';
import { runAgenticLoop, type LoopResult } from './agentic-loop.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CommandType = 'build-anything' | 'find-skills' | 'unknown';

export interface CommandInput {
  /** The command type */
  command: CommandType;
  /** The raw prompt text */
  prompt: string;
  /** Any flags/options */
  options: Record<string, string>;
}

export interface CommandResult {
  /** The command that was executed */
  command: CommandType;
  /** The decomposition result */
  decomposition: DecompositionResult;
  /** The orchestration plan */
  plan: OrchestrationPlan;
  /** The agentic loop result (if build was executed) */
  loopResult?: LoopResult;
  /** Human-readable summary */
  summary: string;
  /** Whether the command succeeded */
  success: boolean;
}

// ─── Command Parsing ────────────────────────────────────────────────────────

/**
 * Parse a command string into a structured CommandInput.
 *
 * Examples:
 *   "/build-anything Build me a real estate website with 3D effects"
 *   → { command: 'build-anything', prompt: 'Build me a real estate website with 3D effects' }
 *
 *   "/find-skills three.js animation scroll"
 *   → { command: 'find-skills', prompt: 'three.js animation scroll' }
 */
export function parseCommand(input: string): CommandInput {
  const trimmed = input.trim();

  if (trimmed.startsWith('/build-anything')) {
    const prompt = trimmed.replace(/^\/build-anything\s*/, '').trim();
    return {
      command: 'build-anything',
      prompt,
      options: extractOptions(prompt),
    };
  }

  if (trimmed.startsWith('/find-skills')) {
    const prompt = trimmed.replace(/^\/find-skills\s*/, '').trim();
    return {
      command: 'find-skills',
      prompt,
      options: {},
    };
  }

  return {
    command: 'unknown',
    prompt: trimmed,
    options: {},
  };
}

function extractOptions(prompt: string): Record<string, string> {
  const options: Record<string, string> = {};
  const matches = prompt.matchAll(/--(\w+)\s+(\S+)/g);
  for (const match of matches) {
    options[match[1]] = match[2];
  }
  return options;
}

// ─── Find Skills Command ────────────────────────────────────────────────────

/**
 * Execute the `/find-skills` command.
 * Discovers what skills are needed for a prompt and shows availability.
 */
export function executeFindSkills(prompt: string): {
  decomposition: DecompositionResult;
  neededSkills: Array<{ skill: string; installed: boolean; capability: string }>;
  summary: string;
} {
  const installed = getInstalledSkills();
  const decomposition = decomposePrompt(prompt, installed);

  const neededSkills = decomposition.allRequiredSkills.map(skill => ({
    skill,
    installed: installed.some(i => i.includes(skill) || skill.includes(i)),
    capability: decomposition.atoms
      .filter(a => a.knownSkills.includes(skill))
      .map(a => a.value)
      .join(', '),
  }));

  const installedCount = neededSkills.filter(s => s.installed).length;
  const missingCount = neededSkills.filter(s => !s.installed).length;

  const lines = [
    `Skills Analysis for: "${prompt.slice(0, 80)}${prompt.length > 80 ? '...' : ''}"`,
    '',
    `Industry: ${decomposition.byType.industry?.[0]?.value || 'generic'}`,
    `Complexity: ${(decomposition.complexity * 100).toFixed(0)}%`,
    '',
    `Found ${decomposition.atoms.length} requirements:`,
    ...decomposition.atoms.map(a => `  - ${a.type}: ${a.value} (confidence: ${(a.confidence * 100).toFixed(0)}%)`),
    '',
    `Skills needed: ${neededSkills.length}`,
    `  Installed: ${installedCount}`,
    `  Missing: ${missingCount}`,
  ];

  if (missingCount > 0) {
    lines.push('');
    lines.push('Missing skills:');
    for (const s of neededSkills.filter(s => !s.installed)) {
      lines.push(`  - ${s.skill} (for: ${s.capability})`);
    }
    lines.push('');
    lines.push('To install missing skills, run:');
    lines.push('  npx skills add <skill-id> -g -y');
  }

  return {
    decomposition,
    neededSkills,
    summary: lines.join('\n'),
  };
}

// ─── Build Anything Command ─────────────────────────────────────────────────

/**
 * Execute the `/build-anything` command.
 * Full pipeline: decompose → orchestrate → install → build → evaluate → retry
 */
export async function executeBuildAnything(
  prompt: string,
  config?: {
    maxRetries?: number;
    qualityThreshold?: number;
    verbose?: boolean;
    dryRun?: boolean;
  },
): Promise<CommandResult> {
  const installed = getInstalledSkills();
  const verbose = config?.verbose ?? false;

  // 1. Decompose the prompt
  if (verbose) console.log('[command-router] Decomposing prompt...');
  const decomposition = decomposePrompt(prompt, installed);

  // 2. Create orchestration plan
  if (verbose) console.log('[command-router] Creating orchestration plan...');
  const plan = createOrchestrationPlan(decomposition);

  // 3. Install missing skills (if not dry run)
  if (!config?.dryRun && plan.toInstall.length > 0) {
    if (verbose) console.log(`[command-router] Installing ${plan.toInstall.length} missing skills...`);
    const { installed: newInstalls, failed } = installSkills(plan.toInstall);
    if (failed.length > 0) {
      console.warn(`[command-router] Failed to install: ${failed.join(', ')}`);
    }
  }

  // 4. Run the agentic loop (if not dry run)
  let loopResult: LoopResult | undefined;
  if (!config?.dryRun) {
    if (verbose) console.log('[command-router] Running agentic loop...');
    loopResult = await runAgenticLoop(plan, decomposition, prompt, {
      maxRetries: config?.maxRetries ?? 3,
      qualityThreshold: config?.qualityThreshold ?? 0.7,
      verbose,
    });
  }

  // 5. Generate summary
  const summary = generateCommandSummary(decomposition, plan, loopResult);

  return {
    command: 'build-anything',
    decomposition,
    plan,
    loopResult,
    summary,
    success: loopResult?.success ?? !config?.dryRun,
  };
}

// ─── Summary Generation ─────────────────────────────────────────────────────

function generateCommandSummary(
  decomposition: DecompositionResult,
  plan: OrchestrationPlan,
  loopResult?: LoopResult,
): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════');
  lines.push('  BUILD.ANYTHING — Execution Summary');
  lines.push('═══════════════════════════════════════════════');
  lines.push('');

  // Decomposition
  lines.push('📋 PROMPT DECOMPOSITION');
  lines.push('─'.repeat(40));
  const industry = decomposition.byType.industry?.[0]?.value || 'generic';
  lines.push(`  Industry: ${industry}`);
  lines.push(`  Requirements: ${decomposition.atoms.length}`);
  lines.push(`  Complexity: ${(decomposition.complexity * 100).toFixed(0)}%`);

  if (decomposition.byType.capability.length > 0) {
    lines.push(`  Capabilities: ${decomposition.byType.capability.map(a => a.value).join(', ')}`);
  }
  if (decomposition.byType['visual-style'].length > 0) {
    lines.push(`  Visual Style: ${decomposition.byType['visual-style'].map(a => a.value).join(', ')}`);
  }
  if (decomposition.byType.interaction.length > 0) {
    lines.push(`  Interactions: ${decomposition.byType.interaction.map(a => a.value).join(', ')}`);
  }

  lines.push('');

  // Skills
  lines.push('🛠️  SKILL ORCHESTRATION');
  lines.push('─'.repeat(40));
  lines.push(`  Skills needed: ${plan.matches.length}`);
  lines.push(`  Already installed: ${plan.alreadyAvailable.length}`);
  lines.push(`  Need to install: ${plan.toInstall.length}`);
  lines.push(`  Estimated time: ${plan.estimatedTime}`);

  if (plan.risks.length > 0) {
    lines.push('');
    lines.push('  ⚠️  Risks:');
    for (const risk of plan.risks) {
      lines.push(`    - ${risk}`);
    }
  }

  lines.push('');

  // Loop results
  if (loopResult) {
    lines.push('🔄 AGENTIC LOOP');
    lines.push('─'.repeat(40));
    lines.push(`  Status: ${loopResult.success ? '✅ SUCCESS' : '⚠️  COMPLETED WITH ISSUES'}`);
    lines.push(`  Tasks: ${loopResult.tasks.length}`);
    lines.push(`  Total attempts: ${loopResult.totalAttempts}`);
    lines.push(`  Total time: ${(loopResult.totalTime / 1000).toFixed(1)}s`);

    const avgQuality = Object.values(loopResult.qualityScores).reduce((a, b) => a + b, 0) / loopResult.tasks.length;
    lines.push(`  Average quality: ${(avgQuality * 100).toFixed(0)}%`);

    if (loopResult.hasEscalation) {
      lines.push('');
      lines.push('  🚨 Some tasks were escalated to human review.');
    }

    lines.push('');
    lines.push('  Per-task results:');
    for (const task of loopResult.tasks) {
      const icon = task.status === 'completed' ? '✅' : task.status === 'escalated' ? '🚨' : '❌';
      lines.push(`    ${icon} ${task.atom.value} (${task.skillId}) — ${task.status} — quality: ${((task.output?.qualityScore ?? 0) * 100).toFixed(0)}%`);
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════');

  return lines.join('\n');
}
