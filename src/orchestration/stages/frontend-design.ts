// ─── Frontend Design Stage ────────────────────────────────────────────────────
//
// Designs UI components, page layouts, design tokens, and interaction patterns.
// ──────────────────────────────────────────────────────────────────────────────

import { BaseStage } from './base-stage.js';
import type { StageMeta, StageContext, StageResult, AgentRole, LLMTaskType } from '../types.js';

const meta: StageMeta = {
  id: 'frontend-design',
  name: 'Frontend Design',
  description: 'Design UI components, pages, and interaction patterns',
  agentRole: 'frontend' as AgentRole,
  dependencies: ['architecture', 'api-design'],
  inputs: ['manifest', 'requirements', 'architecture.tech-stack', 'api.endpoints'],
  outputs: ['frontend.pages', 'frontend.components', 'frontend.design-tokens'],
  estimatedDurationSec: 180,
  skippable: false,
  maxRetries: 2,
  parallelizable: false,
};

export class FrontendDesignStage extends BaseStage {
  meta = meta;

  async execute(ctx: StageContext): Promise<StageResult> {
    const start = Date.now();
    const warnings: string[] = [];

    const manifest = ctx.getArtifact<Record<string, unknown>>('manifest');
    const requirements = ctx.getArtifact<Record<string, unknown>>('requirements');
    const techStack = ctx.getArtifact<Record<string, unknown>>('architecture.tech-stack');
    const endpoints = ctx.getArtifact<unknown>('api.endpoints');

    const prompt = `Design the frontend for this project.

## Project
${JSON.stringify(manifest, null, 2)}

## Requirements
${requirements ? JSON.stringify(requirements, null, 2) : 'No requirements'}

## Tech Stack
${techStack ? JSON.stringify(techStack, null, 2) : 'No frontend stack'}

## API Endpoints
${endpoints ? JSON.stringify(endpoints, null, 2) : 'No endpoints defined'}

## Required Output (JSON)
{
  "pages": [
    {
      "name": "page-name",
      "path": "/route",
      "description": "What this page shows",
      "layout": "full-width | sidebar | centered | dashboard",
      "sections": ["hero", "features", "pricing"],
      "auth": false
    }
  ],
  "components": [
    {
      "name": "ComponentName",
      "type": "layout | ui | form | data-display | feedback",
      "description": "What it does",
      "props": [
        { "name": "propName", "type": "string", "required": true, "description": "desc" }
      ],
      "states": ["loading", "empty", "error", "success"]
    }
  ],
  "designTokens": {
    "colors": { "primary": "#hex", "secondary": "#hex", "background": "#hex", "text": "#hex", "border": "#hex" },
    "typography": { "fontFamily": "font stack", "scale": ["12px", "14px", "16px", "20px", "24px", "32px"] },
    "spacing": ["4px", "8px", "12px", "16px", "24px", "32px", "48px", "64px"],
    "borderRadius": { "sm": "4px", "md": "8px", "lg": "12px", "full": "9999px" }
  },
  "navigation": {
    "type": "top | sidebar | bottom",
    "items": [
      { "label": "Home", "path": "/", "icon": "home" }
    ]
  }
}`;

    const llmResult = await ctx.callLLM({
      taskType: 'creative' as LLMTaskType,
      systemPrompt: 'Design the frontend and output structured JSON with pages, components, design tokens, and navigation.',
      prompt,
      temperature: 0.4,
    });

    const design = llmResult.parsed ?? JSON.parse(llmResult.content);
    if (!design) {
      return this.fail('Failed to parse frontend design', Date.now() - start);
    }

    ctx.setArtifact('frontend.pages', design.pages ?? []);
    ctx.setArtifact('frontend.components', design.components ?? []);
    ctx.setArtifact('frontend.design-tokens', design.designTokens ?? {});

    const md = this.generateMarkdown('Frontend Design', [
      { heading: 'Pages', content: this.arrayToMarkdownTable((design.pages ?? []).map((p: Record<string, unknown>) => ({
        name: p.name,
        path: p.path,
        layout: p.layout,
        auth: p.auth ? 'yes' : 'no',
      })), ['name', 'path', 'layout', 'auth']) },
      { heading: 'Components', content: this.arrayToMarkdownTable((design.components ?? []).map((c: Record<string, unknown>) => ({
        name: c.name,
        type: c.type,
        description: c.description,
      })), ['name', 'type', 'description']) },
      { heading: 'Design Tokens', content: this.jsonToBulletList(design.designTokens ?? {}) },
      { heading: 'Navigation', content: this.jsonToBulletList(design.navigation ?? {}) },
    ]);

    return this.ok(
      { pages: design.pages, components: design.components, tokens: design.designTokens },
      Date.now() - start,
      1,
      llmResult.usage.total,
      warnings,
      md,
    );
  }
}
