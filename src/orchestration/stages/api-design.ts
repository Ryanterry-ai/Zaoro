// ─── API Design Stage ─────────────────────────────────────────────────────────
//
// Designs API endpoints, request/response schemas, authentication,
// and error handling patterns.
// ──────────────────────────────────────────────────────────────────────────────

import { BaseStage } from './base-stage.js';
import type { StageMeta, StageContext, StageResult, AgentRole, LLMTaskType } from '../types.js';

const meta: StageMeta = {
  id: 'api-design',
  name: 'API Design',
  description: 'Design API endpoints, schemas, and authentication',
  agentRole: 'backend' as AgentRole,
  dependencies: ['architecture', 'database-design'],
  inputs: ['manifest', 'requirements', 'database.schema', 'architecture.system'],
  outputs: ['api.endpoints', 'api.auth'],
  estimatedDurationSec: 120,
  skippable: false,
  maxRetries: 2,
  parallelizable: false,
};

export class ApiDesignStage extends BaseStage {
  meta = meta;

  async execute(ctx: StageContext): Promise<StageResult> {
    const start = Date.now();
    const warnings: string[] = [];

    const manifest = ctx.getArtifact<Record<string, unknown>>('manifest');
    const requirements = ctx.getArtifact<Record<string, unknown>>('requirements');
    const dbSchema = ctx.getArtifact<Record<string, unknown>>('database.schema');
    const architecture = ctx.getArtifact<Record<string, unknown>>('architecture.system');

    const prompt = `Design the API layer for this project.

## Project
${JSON.stringify(manifest, null, 2)}

## Database Schema
${dbSchema ? JSON.stringify(dbSchema, null, 2) : 'No schema'}

## Architecture
${JSON.stringify(architecture, null, 2)}

## Required Output (JSON)
{
  "style": "rest | graphql | trpc",
  "baseUrl": "/api/v1",
  "authentication": {
    "method": "jwt | session | api-key | oauth",
    "providers": ["email-password", "social-logins"],
    "tokenExpiry": "1h",
    "refreshStrategy": "rotation"
  },
  "endpoints": [
    {
      "method": "GET | POST | PUT | PATCH | DELETE",
      "path": "/resource",
      "description": "What it does",
      "auth": true,
      "requestBody": {
        "fields": [
          { "name": "field", "type": "string", "required": true, "description": "desc" }
        ]
      },
      "response": {
        "type": "object | array | paginated",
        "schema": "description of response shape"
      },
      "errors": [
        { "code": 404, "message": "Resource not found" }
      ]
    }
  ],
  "middleware": [
    { "name": "rateLimit", "config": "100 requests per minute" },
    { "name": "cors", "config": "allow specific origins" },
    { "name": "validation", "config": "validate request bodies with zod" }
  ]
}`;

    const llmResult = await ctx.callLLM({
      taskType: 'code-generation' as LLMTaskType,
      systemPrompt: 'Design the API layer and output structured JSON with endpoints, authentication, middleware, and error handling.',
      prompt,
      temperature: 0.2,
    });

    const api = llmResult.parsed ?? JSON.parse(llmResult.content);
    if (!api) {
      return this.fail('Failed to parse API design', Date.now() - start);
    }

    ctx.setArtifact('api.endpoints', api.endpoints ?? []);
    ctx.setArtifact('api.auth', api.authentication ?? {});

    const md = this.generateMarkdown('API Design', [
      { heading: 'Overview', content: this.jsonToMarkdownTable({ style: api.style, baseUrl: api.baseUrl }) },
      { heading: 'Authentication', content: this.jsonToBulletList(api.authentication ?? {}) },
      { heading: 'Endpoints', content: this.arrayToMarkdownTable((api.endpoints ?? []).map((e: Record<string, unknown>) => ({
        method: e.method,
        path: e.path,
        description: e.description,
        auth: e.auth ? 'yes' : 'no',
      })), ['method', 'path', 'description', 'auth']) },
      { heading: 'Middleware', content: this.arrayToMarkdownTable(api.middleware ?? [], ['name', 'config']) },
    ]);

    return this.ok(
      { endpoints: api.endpoints, auth: api.authentication },
      Date.now() - start,
      1,
      llmResult.usage.total,
      warnings,
      md,
    );
  }
}
