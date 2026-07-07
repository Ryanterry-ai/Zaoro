// ─── Documentation Stage ──────────────────────────────────────────────────────
//
// Generates technical documentation, README, and API docs.
// Produces both structured JSON and human-readable markdown.
// ──────────────────────────────────────────────────────────────────────────────

import { BaseStage } from './base-stage.js';
import type { StageMeta, StageContext, StageResult, AgentRole, LLMTaskType } from '../types.js';

const meta: StageMeta = {
  id: 'documentation',
  name: 'Documentation',
  description: 'Generate technical documentation and README',
  agentRole: 'documentation' as AgentRole,
  dependencies: ['architecture', 'api-design', 'frontend-design', 'deployment'],
  inputs: ['manifest', 'architecture.system', 'architecture.tech-stack', 'api.endpoints', 'deployment.config'],
  outputs: ['docs.readme', 'docs.api'],
  estimatedDurationSec: 180,
  skippable: false,
  maxRetries: 2,
  parallelizable: false,
};

export class DocumentationStage extends BaseStage {
  meta = meta;

  async execute(ctx: StageContext): Promise<StageResult> {
    const start = Date.now();
    const warnings: string[] = [];

    const manifest = ctx.getArtifact<Record<string, unknown>>('manifest');
    const architecture = ctx.getArtifact<Record<string, unknown>>('architecture.system');
    const techStack = ctx.getArtifact<Record<string, unknown>>('architecture.tech-stack');
    const endpoints = ctx.getArtifact<unknown>('api.endpoints');
    const config = ctx.getArtifact<Record<string, unknown>>('deployment.config');

    const prompt = `Generate documentation for this project.

## Project
${JSON.stringify(manifest, null, 2)}

## Architecture
${JSON.stringify(architecture, null, 2)}

## Tech Stack
${techStack ? JSON.stringify(techStack, null, 2) : 'N/A'}

## API Endpoints
${endpoints ? JSON.stringify(endpoints, null, 2) : 'N/A'}

## Deployment
${config ? JSON.stringify(config, null, 2) : 'N/A'}

## Required Output (JSON)
{
  "readme": {
    "title": "Project Title",
    "description": "What this project does",
    "features": ["feature 1", "feature 2"],
    "prerequisites": ["Node.js 18+", "npm or pnpm"],
    "installation": ["npm install", "npm run dev"],
    "usage": "How to use the application",
    "environmentVariables": ["VAR_NAME - Description"],
    "deployment": "How to deploy",
    "techStack": ["list of technologies"],
    "license": "MIT"
  },
  "apiDocs": {
    "overview": "API overview",
    "authentication": "How to authenticate",
    "endpoints": [
      {
        "method": "GET",
        "path": "/resource",
        "description": "What it does",
        "request": "Request details",
        "response": "Response details"
      }
    ]
  }
}`;

    let docs: Record<string, unknown>;
    try {
      const llmResult = await ctx.callLLM({
        taskType: 'creative' as LLMTaskType,
        systemPrompt: 'Generate documentation and output structured JSON with README and API docs.',
        prompt,
        temperature: 0.3,
      });
      docs = llmResult.parsed ?? JSON.parse(llmResult.content);
    } catch {
      // Fallback for agent-driven mode
      const projectName = (manifest?.name ?? 'Project').toString();
      docs = {
        readme: {
          title: projectName,
          description: manifest?.description ?? `${projectName} application`,
          installation: ['npm install', 'npm run dev'],
          usage: 'Open http://localhost:3000',
        },
        apiDocs: { endpoints: [] },
      };
    }

    ctx.setArtifact('docs.readme', docs.readme ?? {});
    ctx.setArtifact('docs.api', docs.apiDocs ?? {});

    // Build markdown from the readme JSON
    const readme = docs.readme as Record<string, unknown> | undefined;
    const features = (readme?.features as string[] ?? []).map(f => '- ' + f).join('\n');
    const prereqs = (readme?.prerequisites as string[] ?? []).map(p => '- ' + p).join('\n');
    const install = (readme?.installation as string[] ?? []).join('\n');
    const techList = (readme?.techStack as string[] ?? []).join(', ');
    const envVars = (readme?.environmentVariables as string[] ?? []).map(e => '- ' + e).join('\n');

    const markdown = [
      '# ' + String(readme?.title ?? 'Project'),
      '',
      String(readme?.description ?? ''),
      '',
      '## Features',
      features || '- (none)',
      '',
      '## Prerequisites',
      prereqs || '- (none)',
      '',
      '## Installation',
      '```bash',
      install,
      '```',
      '',
      '## Usage',
      String(readme?.usage ?? ''),
      '',
      '## Environment Variables',
      envVars || '- (none)',
      '',
      '## Deployment',
      String(readme?.deployment ?? ''),
      '',
      '## Tech Stack',
      techList,
      '',
      '## License',
      String(readme?.license ?? 'MIT'),
    ].join('\n');

    return this.ok(
      { readme: docs.readme, apiDocs: docs.apiDocs },
      Date.now() - start,
      1,
      0,
      warnings,
      markdown,
    );
  }
}
