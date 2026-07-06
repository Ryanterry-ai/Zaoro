// ─── Project Intake Stage ─────────────────────────────────────────────────────
//
// Parses and validates the user's project description. Produces a structured
// ProjectManifest with goals, constraints, and scope.
// Also produces human-readable markdown documentation of the parsed intent.
// ──────────────────────────────────────────────────────────────────────────────

import { BaseStage } from './base-stage.js';
import type { StageMeta, StageContext, StageResult, AgentRole, LLMTaskType } from '../types.js';

const meta: StageMeta = {
  id: 'project-intake',
  name: 'Project Intake',
  description: 'Parse and validate the project description into a structured manifest',
  agentRole: 'business-analysis' as AgentRole,
  dependencies: [],
  inputs: [],
  outputs: ['manifest'],
  estimatedDurationSec: 60,
  skippable: false,
  maxRetries: 1,
  parallelizable: false,
};

export class ProjectIntakeStage extends BaseStage {
  meta = meta;

  async execute(ctx: StageContext): Promise<StageResult> {
    const start = Date.now();
    const warnings: string[] = [];

    const userInput = ctx.manifest?.userInput;
    if (!userInput) {
      return this.fail('No project description provided', Date.now() - start);
    }

    // Build BOS-aware prompt
    const bosHint = ctx.bos.pack
      ? `\n## Industry context detected: ${ctx.bos.pack.name}\nDomain entities to consider: ${ctx.bos.pack.entities.map(e => e.name).join(', ')}\n`
      : '';

    const prompt = `Parse the following project description into a structured manifest.

## User Input
${typeof userInput === 'string' ? userInput : JSON.stringify(userInput, null, 2)}
${bosHint}

## Required Output (JSON)
{
  "name": "kebab-case project name (2-4 words)",
  "displayName": "Human-readable project name",
  "description": "One-sentence project description",
  "goals": ["list of primary goals"],
  "constraints": ["list of constraints or requirements"],
  "scope": {
    "included": ["features/modules to build"],
    "excluded": ["explicitly out of scope"]
  },
  "targetUsers": ["description of target users"],
  "category": "one of: saas, ecommerce, portfolio, blog, marketplace, dashboard, mobile-app, api, other",
  "complexity": "one of: simple, moderate, complex, enterprise"
}`;

    const llmResult = await ctx.callLLM({
      taskType: 'structured-extraction' as LLMTaskType,
      systemPrompt: 'Extract structured project information. Output only valid JSON.',
      prompt,
      temperature: 0.3,
    });

    const manifest = llmResult.parsed ?? JSON.parse(llmResult.content);
    if (!manifest) {
      return this.fail('Failed to parse project manifest from LLM output', Date.now() - start);
    }

    ctx.setArtifact('manifest', manifest);

    // Generate markdown documentation
    const markdown = this.generateMarkdown('Project Intake', [
      { heading: 'Project Name', content: `**${String(manifest.displayName ?? manifest.name ?? 'Unknown')}**` },
      { heading: 'Description', content: String(manifest.description ?? 'No description') },
      { heading: 'Category', content: String(manifest.category ?? 'Unknown') },
      { heading: 'Complexity', content: String(manifest.complexity ?? 'Unknown') },
      { heading: 'Goals', content: (manifest.goals as string[] ?? []).map(g => `- ${g}`).join('\n') || '- (none specified)' },
      { heading: 'Target Users', content: (manifest.targetUsers as string[] ?? []).map(u => `- ${u}`).join('\n') || '- (not specified)' },
      { heading: 'Scope', content: this.jsonToBulletList(manifest.scope as Record<string, unknown> ?? {}) },
      { heading: 'Constraints', content: (manifest.constraints as string[] ?? []).map(c => `- ${c}`).join('\n') || '- (none)' },
      { heading: 'Industry Detection', content: ctx.bos.pack ? `Detected: ${ctx.bos.pack.name} (confidence: ${Math.round(ctx.bos.detectionConfidence * 100)}%)` : 'No industry detected' },
    ]);

    return this.ok(
      { manifest },
      Date.now() - start,
      1,
      llmResult.usage.total,
      warnings,
      markdown,
    );
  }
}
