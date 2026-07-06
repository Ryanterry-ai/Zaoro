// ─── Business Analysis Stage ──────────────────────────────────────────────────
//
// Analyzes business requirements, user stories, and feature specifications.
// Produces a detailed business requirements document.
// ──────────────────────────────────────────────────────────────────────────────

import { BaseStage } from './base-stage.js';
import type { StageMeta, StageContext, StageResult, AgentRole, LLMTaskType } from '../types.js';

const meta: StageMeta = {
  id: 'business-analysis',
  name: 'Business Analysis',
  description: 'Define business requirements, user stories, and feature specs',
  agentRole: 'business-analysis' as AgentRole,
  dependencies: ['project-intake', 'research'],
  inputs: ['manifest', 'research.domain'],
  outputs: ['requirements', 'features'],
  estimatedDurationSec: 120,
  skippable: false,
  maxRetries: 2,
  parallelizable: false,
};

export class BusinessAnalysisStage extends BaseStage {
  meta = meta;

  async execute(ctx: StageContext): Promise<StageResult> {
    const start = Date.now();
    const warnings: string[] = [];

    const manifest = ctx.getArtifact<Record<string, unknown>>('manifest');
    const domain = ctx.getArtifact<Record<string, unknown>>('research.domain');

    if (!manifest) {
      return this.fail('Manifest not found', Date.now() - start);
    }

    const prompt = `Based on the project manifest and domain research, create a detailed business analysis.

## Project Manifest
${JSON.stringify(manifest, null, 2)}

## Domain Research
${domain ? JSON.stringify(domain, null, 2) : 'No research data available'}

## Required Output (JSON)
{
  "userStories": [
    {
      "id": "US-001",
      "role": "user role",
      "action": "what they do",
      "benefit": "why they do it",
      "priority": "must-have | should-have | nice-to-have"
    }
  ],
  "features": [
    {
      "id": "F-001",
      "name": "Feature Name",
      "description": "What it does",
      "priority": "P0 | P1 | P2",
      "userStories": ["US-001"],
      "complexity": "low | medium | high"
    }
  ],
  "businessRules": ["list of business rules and constraints"],
  "successMetrics": ["measurable success criteria"],
  "risks": [
    {
      "risk": "description",
      "impact": "high | medium | low",
      "mitigation": "how to address"
    }
  ]
}`;

    const llmResult = await ctx.callLLM({
      taskType: 'analysis' as LLMTaskType,
      systemPrompt: 'Analyze business requirements and output structured JSON with user stories, features, business rules, and risks.',
      prompt,
      temperature: 0.3,
    });

    const analysis = llmResult.parsed ?? JSON.parse(llmResult.content);
    if (!analysis) {
      return this.fail('Failed to parse business analysis', Date.now() - start);
    }

    ctx.setArtifact('requirements', analysis);
    ctx.setArtifact('features', analysis.features ?? []);

    const md = this.generateMarkdown('Business Analysis', [
      { heading: 'User Stories', content: this.arrayToMarkdownTable(analysis.userStories ?? [], ['id', 'role', 'action', 'benefit', 'priority']) },
      { heading: 'Features', content: this.arrayToMarkdownTable(analysis.features ?? [], ['id', 'name', 'description', 'priority', 'complexity']) },
      { heading: 'Business Rules', content: this.jsonToBulletList({ rules: analysis.businessRules ?? [] }) },
      { heading: 'Success Metrics', content: (analysis.successMetrics ?? []).map((m: string) => `- ${m}`).join('\n') },
      { heading: 'Risks', content: this.arrayToMarkdownTable(analysis.risks ?? [], ['risk', 'impact', 'mitigation']) },
    ]);

    return this.ok(
      { requirements: analysis, features: analysis.features },
      Date.now() - start,
      1,
      llmResult.usage.total,
      warnings,
      md,
    );
  }
}
