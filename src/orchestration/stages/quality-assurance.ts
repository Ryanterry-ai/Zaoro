// ─── Quality Assurance Stage ──────────────────────────────────────────────────
//
// Plans testing strategy, test cases, and quality gates.
// ──────────────────────────────────────────────────────────────────────────────

import { BaseStage } from './base-stage.js';
import type { StageMeta, StageContext, StageResult, AgentRole, LLMTaskType } from '../types.js';

const meta: StageMeta = {
  id: 'quality-assurance',
  name: 'Quality Assurance',
  description: 'Plan testing strategy, test cases, and quality gates',
  agentRole: 'quality-assurance' as AgentRole,
  dependencies: ['architecture', 'api-design', 'frontend-design'],
  inputs: ['manifest', 'requirements', 'features', 'architecture.system'],
  outputs: ['qa.plan', 'qa.quality-gates'],
  estimatedDurationSec: 120,
  skippable: false,
  maxRetries: 2,
  parallelizable: false,
};

export class QualityAssuranceStage extends BaseStage {
  meta = meta;

  async execute(ctx: StageContext): Promise<StageResult> {
    const start = Date.now();
    const warnings: string[] = [];

    const manifest = ctx.getArtifact<Record<string, unknown>>('manifest');
    const requirements = ctx.getArtifact<Record<string, unknown>>('requirements');
    const features = ctx.getArtifact<unknown>('features');
    const architecture = ctx.getArtifact<Record<string, unknown>>('architecture.system');

    const prompt = `Design the testing strategy and quality gates for this project.

## Project
${JSON.stringify(manifest, null, 2)}

## Features
${features ? JSON.stringify(features, null, 2) : 'No features defined'}

## Architecture
${JSON.stringify(architecture, null, 2)}

## Required Output (JSON)
{
  "testingStrategy": {
    "unit": { "framework": "vitest | jest", "coverage": "80%", "scope": "utils, hooks, services" },
    "integration": { "framework": "vitest | testing-library", "scope": "API routes, components" },
    "e2e": { "framework": "playwright | cypress", "scope": "critical user journeys" }
  },
  "testCases": [
    {
      "id": "TC-001",
      "name": "Test case name",
      "type": "unit | integration | e2e",
      "description": "What it tests",
      "preconditions": ["setup requirements"],
      "steps": ["step 1", "step 2"],
      "expectedResult": "What should happen",
      "priority": "P0 | P1 | P2"
    }
  ],
  "qualityGates": [
    {
      "name": "gate-name",
      "description": "What this gate checks",
      "passCriteria": "When does this gate pass",
      "automated": true
    }
  ],
  "accessibility": {
    "standard": "WCAG 2.1 AA",
    "checks": ["keyboard navigation", "screen reader", "color contrast"]
  }
}`;

    const llmResult = await ctx.callLLM({
      taskType: 'analysis' as LLMTaskType,
      systemPrompt: 'Design the testing strategy and output structured JSON with test strategy, test cases, quality gates, and accessibility checks.',
      prompt,
      temperature: 0.3,
    });

    const plan = llmResult.parsed ?? JSON.parse(llmResult.content);
    if (!plan) {
      return this.fail('Failed to parse QA plan', Date.now() - start);
    }

    ctx.setArtifact('qa.plan', plan);
    ctx.setArtifact('qa.quality-gates', plan.qualityGates ?? []);

    const md = this.generateMarkdown('Quality Assurance Plan', [
      { heading: 'Testing Strategy', content: this.jsonToBulletList(plan.testingStrategy ?? {}) },
      { heading: 'Test Cases', content: this.arrayToMarkdownTable((plan.testCases ?? []).map((tc: Record<string, unknown>) => ({
        id: tc.id,
        name: tc.name,
        type: tc.type,
        priority: tc.priority,
      })), ['id', 'name', 'type', 'priority']) },
      { heading: 'Quality Gates', content: this.arrayToMarkdownTable(plan.qualityGates ?? [], ['name', 'description', 'passCriteria', 'automated']) },
      { heading: 'Accessibility', content: this.jsonToBulletList(plan.accessibility ?? {}) },
    ]);

    return this.ok(
      { plan, gates: plan.qualityGates },
      Date.now() - start,
      1,
      llmResult.usage.total,
      warnings,
      md,
    );
  }
}
