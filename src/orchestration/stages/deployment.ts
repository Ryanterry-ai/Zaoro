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

    // Skip LLM call if no LLM is available — return deterministic fallback
    const hasLLM = typeof ctx.callLLM === 'function';
    if (!hasLLM) {
      ctx.log.info('DeploymentStage: No LLM available, returning deterministic deployment config');
      const config = {
        hosting: {
          platform: 'vercel',
          region: 'global',
          environment: 'production',
        },
        cicd: {
          provider: 'github-actions',
          stages: ['lint', 'test', 'build', 'deploy'],
          branchStrategy: 'main for prod, PR for preview',
        },
        environmentVariables: integrations?.environmentVariables ?? [],
        monitoring: {
          errorTracking: 'sentry',
          analytics: 'posthog',
          uptime: 'better-uptime',
        },
        deploymentSteps: [
          'Push to main branch',
          'GitHub Actions runs lint, test, build',
          'Deploy to Vercel',
          'Preview URL generated for PRs',
        ],
        rollbackStrategy: 'Vercel instant rollback to previous deployment',
      };
      ctx.setArtifact('deployment.config', config);
      return this.ok(
        { config },
        Date.now() - start,
        0,
        0,
        warnings,
      );
    }

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

    let config: Record<string, unknown>;
    let tokensUsed = 0;
    try {
      const llmResult = await ctx.callLLM({
        taskType: 'planning' as LLMTaskType,
        systemPrompt: 'Design the deployment pipeline and output structured JSON with hosting, CI/CD, environment variables, monitoring, and rollback strategy.',
        prompt,
        temperature: 0.3,
      });
      config = llmResult.parsed ?? JSON.parse(llmResult.content);
      tokensUsed = llmResult.usage?.total ?? 0;
    } catch {
      // Fallback for agent-driven mode or when LLM is unavailable
      config = {
        hosting: { platform: 'vercel', region: 'global', environment: 'production' },
        cicd: { provider: 'github-actions', stages: ['lint', 'test', 'build', 'deploy'] },
        environmentVariables: integrations?.environmentVariables ?? [],
        monitoring: { errorTracking: 'sentry', analytics: 'posthog', uptime: 'better-uptime' },
        deploymentSteps: ['Push to main', 'CI runs tests', 'Deploy to Vercel', 'Preview URL for PRs'],
        rollbackStrategy: 'Vercel instant rollback',
      };
    }
    if (!config) {
      return this.fail('Failed to parse deployment config', Date.now() - start);
    }

    ctx.setArtifact('deployment.config', config);

    const md = this.generateMarkdown('Deployment Plan', [
      { heading: 'Hosting', content: this.jsonToMarkdownTable((config.hosting ?? {}) as Record<string, unknown>) },
      { heading: 'CI/CD', content: this.jsonToBulletList((config.cicd ?? {}) as Record<string, unknown>) },
      { heading: 'Environment Variables', content: this.arrayToMarkdownTable((config.environmentVariables ?? []) as Record<string, unknown>[], ['name', 'description', 'environment', 'required']) },
      { heading: 'Monitoring', content: this.jsonToBulletList((config.monitoring ?? {}) as Record<string, unknown>) },
      { heading: 'Deployment Steps', content: ((config.deploymentSteps ?? []) as string[]).map((s: string, i: number) => `${i + 1}. ${s}`).join('\n') },
      { heading: 'Rollback Strategy', content: (config.rollbackStrategy as string) ?? 'No rollback strategy defined' },
    ]);

    return this.ok(
      { config },
      Date.now() - start,
      1,
      tokensUsed,
      warnings,
      md,
    );
  }
}
