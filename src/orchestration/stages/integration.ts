// ─── Integration Stage ────────────────────────────────────────────────────────
//
// Plans third-party integrations, webhooks, and data synchronization.
// ──────────────────────────────────────────────────────────────────────────────

import { BaseStage } from './base-stage.js';
import type { StageMeta, StageContext, StageResult, AgentRole, LLMTaskType } from '../types.js';

const meta: StageMeta = {
  id: 'integration',
  name: 'Integration Planning',
  description: 'Plan third-party integrations, webhooks, and data sync',
  agentRole: 'integration' as AgentRole,
  dependencies: ['api-design', 'architecture'],
  inputs: ['manifest', 'requirements', 'architecture.system', 'api.endpoints'],
  outputs: ['integrations'],
  estimatedDurationSec: 120,
  skippable: false,
  maxRetries: 2,
  parallelizable: false,
};

export class IntegrationStage extends BaseStage {
  meta = meta;

  async execute(ctx: StageContext): Promise<StageResult> {
    const start = Date.now();
    const warnings: string[] = [];

    const manifest = ctx.getArtifact<Record<string, unknown>>('manifest');
    const requirements = ctx.getArtifact<Record<string, unknown>>('requirements');
    const architecture = ctx.getArtifact<Record<string, unknown>>('architecture.system');

    const prompt = `Plan third-party integrations for this project.

## Project
${JSON.stringify(manifest, null, 2)}

## Requirements
${requirements ? JSON.stringify(requirements, null, 2) : 'No requirements'}

## Architecture
${JSON.stringify(architecture, null, 2)}

## Required Output (JSON)
{
  "integrations": [
    {
      "name": "Service Name",
      "type": "auth | payment | email | analytics | storage | crm | api",
      "provider": "provider name",
      "purpose": "Why it's needed",
      "apiType": "REST | GraphQL | SDK | webhook",
      "authMethod": "API key | OAuth | token",
      "endpoints": ["endpoints to use"],
      "dataFlow": "inbound | outbound | bidirectional",
      "fallbackStrategy": "What happens if service is down"
    }
  ],
  "webhooks": [
    {
      "name": "webhook-name",
      "trigger": "What triggers it",
      "payload": "What data it sends",
      "handler": "Where it's processed"
    }
  ],
  "environmentVariables": [
    { "name": "SERVICE_API_KEY", "description": "API key for Service", "required": true, "example": "sk_xxx" }
  ]
}`;

    const llmResult = await ctx.callLLM({
      taskType: 'planning' as LLMTaskType,
      systemPrompt: 'Plan integrations and output structured JSON with integrations, webhooks, and environment variables.',
      prompt,
      temperature: 0.3,
    });

    const integrations = llmResult.parsed ?? JSON.parse(llmResult.content);
    if (!integrations) {
      return this.fail('Failed to parse integration plan', Date.now() - start);
    }

    ctx.setArtifact('integrations', integrations);

    const md = this.generateMarkdown('Integration Plan', [
      { heading: 'Services', content: this.arrayToMarkdownTable((integrations.integrations ?? []).map((i: Record<string, unknown>) => ({
        name: i.name,
        type: i.type,
        provider: i.provider,
        purpose: i.purpose,
        dataFlow: i.dataFlow,
      })), ['name', 'type', 'provider', 'purpose', 'dataFlow']) },
      { heading: 'Webhooks', content: this.arrayToMarkdownTable(integrations.webhooks ?? [], ['name', 'trigger', 'handler']) },
      { heading: 'Environment Variables', content: this.arrayToMarkdownTable(integrations.environmentVariables ?? [], ['name', 'description', 'required']) },
    ]);

    return this.ok(
      { integrations },
      Date.now() - start,
      1,
      llmResult.usage.total,
      warnings,
      md,
    );
  }
}
