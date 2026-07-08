/**
 * Agent-mode pipeline — used when running inside Claude Code / Open Code.
 *
 * The agent IS the LLM. When running inside an AI coding agent, the pipeline
 * writes locked specs to disk and the agent generates artifacts directly.
 * No HTTP calls to LLM providers — the agent reads the spec and writes code.
 *
 * The _adapter/index.js stays for standalone server mode (engine on port 3001
 * without Claude Code). This module bypasses it entirely.
 */

import * as fs from 'fs';
import * as path from 'path';

// Type for the adapter's callModel function
type CallModelFn = (taskType: string, prompt: string, context?: unknown) => Promise<string>;

// ─── Agent Detection ─────────────────────────────────────────────────────────

/**
 * Detect whether we're running inside an AI coding agent.
 *
 * Signals:
 * - AGENT_MODE=true — explicit opt-in
 * - CLAUDE_CODE=true — Claude Code environment
 * - No ANTHROPIC_API_KEY — if there's no API key, we must be agent-driven
 *   (standalone server always requires a key)
 */
export const IS_AGENT_MODE: boolean =
  process.env.AGENT_MODE === 'true'
  || process.env.CLAUDE_CODE === 'true'
  || process.env.OPENCODE_AGENT === 'true'
  || (!process.env.ANTHROPIC_API_KEY && !process.env.BUILD_ENGINE_API_KEY);

/**
 * Get the agent mode status for logging / provenance.
 */
export function getAgentModeStatus(): {
  isAgentMode: boolean;
  detectionMethod: string;
} {
  if (process.env.AGENT_MODE === 'true') {
    return { isAgentMode: true, detectionMethod: 'AGENT_MODE env' };
  }
  if (process.env.CLAUDE_CODE === 'true') {
    return { isAgentMode: true, detectionMethod: 'CLAUDE_CODE env' };
  }
  if (process.env.OPENCODE_AGENT === 'true') {
    return { isAgentMode: true, detectionMethod: 'OPENCODE_AGENT env' };
  }
  if (!process.env.ANTHROPIC_API_KEY && !process.env.BUILD_ENGINE_API_KEY) {
    return { isAgentMode: true, detectionMethod: 'no API key (agent must generate)' };
  }
  return { isAgentMode: false, detectionMethod: 'standalone server (has API key)' };
}

// ─── Spec-First Generation ───────────────────────────────────────────────────

export interface ComponentGenTask {
  /** Component name (PascalCase) */
  componentName: string;
  /** Page path this component belongs to */
  pagePath: string;
  /** Full component spec JSON */
  spec: unknown;
  /** Skill instructions to follow */
  skillMd: string;
  /** Output file path (relative to workspace) */
  outputPath: string;
  /** Design tokens to apply */
  designTokens?: Record<string, unknown>;
}

/**
 * Generate a component from a locked spec.
 *
 * Agent mode: writes a task file for the agent to process directly.
 * Standalone mode: calls the LLM adapter via HTTP.
 *
 * In both cases, the output is a .task.md file that either the agent
 * or the adapter will produce the final .tsx from.
 */
export async function generateFromSpec(
  specPath: string,
  outputPath: string,
  skillPath: string,
): Promise<void> {
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const skillMd = fs.readFileSync(skillPath, 'utf8');

  if (IS_AGENT_MODE) {
    // Agent mode — write a task file the agent picks up directly
    const taskPath = specPath.replace('.spec.json', '.task.md');
    const taskContent = buildAgentTask(spec, skillMd, outputPath);
    fs.writeFileSync(taskPath, taskContent, 'utf8');
    console.log(`[agent-mode] Task written: ${taskPath}`);
    console.log(`[agent-mode] Agent should generate: ${outputPath}`);
    return;
  }

  // Standalone mode — call the LLM adapter (plain JS, no types)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const adapterMod = require('../../skills/_adapter/index.js') as { callModel: CallModelFn };
  const result = await adapterMod.callModel('code-generation', skillMd, { spec });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, result, 'utf8');
  console.log(`[adapter-mode] Generated: ${outputPath}`);
}

/**
 * Generate multiple components from a spec manifest.
 * In agent mode, writes all task files in batch.
 */
export async function generateBatchFromSpecs(
  specManifestPath: string,
  skillPath: string,
): Promise<void> {
  const manifest = JSON.parse(fs.readFileSync(specManifestPath, 'utf8'));
  const skillMd = fs.readFileSync(skillPath, 'utf8');

  if (IS_AGENT_MODE) {
    // Write a batch task file for the agent
    const batchTaskPath = specManifestPath.replace('.manifest.json', '.batch-tasks.md');
    const batchContent = buildBatchAgentTask(manifest, skillMd);
    fs.writeFileSync(batchTaskPath, batchContent, 'utf8');
    console.log(`[agent-mode] Batch tasks written: ${batchTaskPath} (${manifest.records.length} components)`);
    return;
  }

  // Standalone mode — call adapter for each component
  const adapterMod2 = require('../../skills/_adapter/index.js') as { callModel: CallModelFn };
  for (const record of manifest.records) {
    const specPath = path.join(path.dirname(specManifestPath), record.specFile);
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    const result = await adapterMod2.callModel('code-generation', skillMd, { spec });
    const outDir = path.dirname(record.outputPath);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(record.outputPath, result, 'utf8');
    console.log(`[adapter-mode] Generated: ${record.outputPath}`);
  }
}

// ─── Task File Builders ──────────────────────────────────────────────────────

function buildAgentTask(spec: unknown, skillMd: string, outputPath: string): string {
  return `# Component Generation Task

## Skill Instructions
${skillMd}

## Locked Spec
\`\`\`json
${JSON.stringify(spec, null, 2)}
\`\`\`

## Output
Write the generated component code to: \`${outputPath}\`

## Requirements
1. Follow the skill instructions exactly
2. Apply Framer Motion animations per the motion skill
3. Use lucide-react for all icons
4. Export as default
5. Use 'use client' directive
6. Use Tailwind CSS classes — no inline styles
7. Apply design tokens from the spec (colors, typography, spacing)
`;
}

function buildBatchAgentTask(manifest: unknown, skillMd: string): string {
  return `# Batch Component Generation Task

## Skill Instructions
${skillMd}

## Component Manifest
\`\`\`json
${JSON.stringify(manifest, null, 2)}
\`\`\`

## Instructions
For each component in the manifest:
1. Read the spec file
2. Generate TSX following the skill instructions
3. Write the output to the specified path
4. Use 'use client', Framer Motion, lucide-react, Tailwind CSS
5. Export as default

Generate all components in order. Each component is independent.
`;
}
