// ─── Deployment Stage ─────────────────────────────────────────────────────────
//
// Plans deployment architecture, CI/CD, and infrastructure.
// ──────────────────────────────────────────────────────────────────────────────

import { BaseStage } from './base-stage.js';
import type { StageMeta, StageContext, StageResult, AgentRole, LLMTaskType } from '../types.js';

const meta: StageMeta = {
  id: 'deployment',
  name: 'Deployment Planning',
  description: 'Plan deployment, CI/CD, and infrastructure',
  agentRole: 'quality-assurance' as AgentRole,
  dependencies: ['architecture', 'integration', 'quality-assurance'],
  inputs: ['manifest', 'architecture.system', 'architecture.tech-stack', 'integrations'],
  outputs: ['deployment.config'],
  estimatedDurationSec: 120,
  skippable: false,
  maxRetries: 2,
  parallelizable: false,
};

export class DeploymentStage extends BaseStage {
  meta = meta;

  async execute(ctx: StageContext): Promise<StageResult> {
    const start = Date.now();
    const warnings: string[] = [];

    const manifest = ctx.getArtifact<Record<string, unknown>>('manifest');
    const architecture = ctx.getArtifact<Record<string, unknown>>('architecture.system');
    const techStack = ctx.getArtifact<Record<string, unknown>>('architecture.tech-stack');
    const integrations = ctx.getArtifact<Record<string, unknown>>('integrations');

    const prompt = `Design the deployment and CI/CD pipeline for this project.

## Project
${JSON.stringify(manifest, null, 2)}

## Architecture
${JSON.stringify(architecture, null, 2)}

## Tech Stack
${techStack ? JSON.stringify(techStack, null, 2) : 'No tech stack'}

## Integrations
${integrations ? JSON.stringify(integrations.environmentVariables ?? [], null, 2) : 'No integrations'}

## Required Output (JSON)
{
  "hosting": {
    "platform": "vercel | netlify | aws | gcp | azure | railway",
    "region": "us-east-1 | global",
    "environment": "production | staging | preview"
  },
  "cicd": {
    "provider": "github-actions | gitlab-ci | circleci",
    "stages": ["lint", "test", "build", "deploy"],
    "branchStrategy": "main for prod, PR for preview"
  },
  "environmentVariables": [
    { "name": "VAR_NAME", "description": "desc", "environment": "all", "required": true }
  ],
  "monitoring": {
    "errorTracking": "sentry",
    "analytics": "posthog | mixpanel",
    "uptime": "better-uptime"
  },
  "deploymentSteps": ["step 1", "step 2", "step 3"],
  "rollbackStrategy": "How to rollback a bad deploy"
}`;

    const llmResult = await ctx.callLLM({
      taskType: 'planning' as LLMTaskType,
      systemPrompt: 'Design the deployment pipeline and output structured JSON with hosting, CI/CD, environment variables, monitoring, and rollback strategy.',
      prompt,
      temperature: 0.3,
    });

    const config = llmResult.parsed ?? JSON.parse(llmResult.content);
    if (!config) {
      return this.fail('Failed to parse deployment config', Date.now() - start);
    }

    ctx.setArtifact('deployment.config', config);

    const md = this.generateMarkdown('Deployment Plan', [
      { heading: 'Hosting', content: this.jsonToMarkdownTable(config.hosting ?? {}) },
      { heading: 'CI/CD', content: this.jsonToBulletList(config.cicd ?? {}) },
      { heading: 'Environment Variables', content: this.arrayToMarkdownTable(config.environmentVariables ?? [], ['name', 'description', 'environment', 'required']) },
      { heading: 'Monitoring', content: this.jsonToBulletList(config.monitoring ?? {}) },
      { heading: 'Deployment Steps', content: (config.deploymentSteps ?? []).map((s: string, i: number) => `${i + 1}. ${s}`).join('\n') },
      { heading: 'Rollback Strategy', content: config.rollbackStrategy ?? 'No rollback strategy defined' },
    ]);

    return this.ok(
      { config },
      Date.now() - start,
      1,
      llmResult.usage.total,
      warnings,
      md,
    );
  }
}
