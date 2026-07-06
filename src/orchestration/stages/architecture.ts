// ─── Architecture Stage ───────────────────────────────────────────────────────
//
// Designs the system architecture, selects technologies, and defines
// component boundaries. Produces an architecture document.
// Uses BOS knowledge for industry-specific architecture patterns.
// ──────────────────────────────────────────────────────────────────────────────

import { BaseStage } from './base-stage.js';
import type { StageMeta, StageContext, StageResult, AgentRole, LLMTaskType } from '../types.js';

const meta: StageMeta = {
  id: 'architecture',
  name: 'System Architecture',
  description: 'Design system architecture, tech stack, and component structure',
  agentRole: 'architecture' as AgentRole,
  dependencies: ['project-intake', 'research', 'business-analysis'],
  inputs: ['manifest', 'requirements', 'research.domain'],
  outputs: ['architecture.system', 'architecture.tech-stack'],
  estimatedDurationSec: 180,
  skippable: false,
  maxRetries: 2,
  parallelizable: false,
};

export class ArchitectureStage extends BaseStage {
  meta = meta;

  async execute(ctx: StageContext): Promise<StageResult> {
    const start = Date.now();
    const warnings: string[] = [];

    const manifest = ctx.getArtifact<Record<string, unknown>>('manifest');
    const requirements = ctx.getArtifact<Record<string, unknown>>('requirements');
    const domain = ctx.getArtifact<Record<string, unknown>>('research.domain');

    // BOS context for architecture
    const bosHint = ctx.bos.pack
      ? `\n## Industry: ${ctx.bos.pack.name}\n${ctx.bos.pack.stagePrompts['architecture'] ?? ''}\nEntities to model: ${ctx.bos.pack.entities.map(e => e.name).join(', ')}\nCompliance: ${ctx.bos.pack.compliance.map(c => c.name).join(', ') || 'none'}\n`
      : '';

    const prompt = `Design the system architecture for this project.

## Project
${JSON.stringify(manifest, null, 2)}

## Requirements
${requirements ? JSON.stringify(requirements, null, 2) : 'No requirements yet'}

## Domain Context
${domain ? JSON.stringify(domain, null, 2) : 'No domain research'}
${bosHint}

## Required Output (JSON)
{
  "architecture": {
    "pattern": "monolith | microservices | serverless | jamstack | spa",
    "description": "High-level architecture overview"
  },
  "techStack": {
    "frontend": { "framework": "", "language": "", "styling": "", "stateManagement": "" },
    "backend": { "framework": "", "language": "", "runtime": "" },
    "database": { "primary": "", "cache": "" },
    "hosting": { "platform": "", "region": "" },
    "tooling": { "bundler": "", "linter": "", "testing": "" }
  },
  "components": [
    {
      "name": "ComponentName",
      "type": "ui | service | store | util | api",
      "description": "What it does",
      "dependencies": ["other components"]
    }
  ],
  "dataFlow": ["description of how data flows through the system"],
  "securityConsiderations": ["security measures to implement"],
  "scalabilityNotes": ["how the system scales"]
}`;

    const llmResult = await ctx.callLLM({
      taskType: 'planning' as LLMTaskType,
      systemPrompt: 'Design system architecture and output structured JSON with architecture pattern, tech stack, components, data flow, and security considerations.',
      prompt,
      temperature: 0.3,
    });

    const arch = llmResult.parsed ?? JSON.parse(llmResult.content);
    if (!arch) {
      return this.fail('Failed to parse architecture document', Date.now() - start);
    }

    ctx.setArtifact('architecture.system', arch);
    ctx.setArtifact('architecture.tech-stack', arch.techStack ?? {});

    // Generate markdown
    const techStack = arch.techStack as Record<string, Record<string, string>> | undefined;
    const markdown = this.generateMarkdown('System Architecture', [
      { heading: 'Architecture Pattern', content: `**${String(arch.architecture?.pattern ?? 'Unknown')}**\n\n${String(arch.architecture?.description ?? '')}` },
      { heading: 'Tech Stack', content: techStack ? Object.entries(techStack).map(([cat, stack]) => `### ${cat}\n${this.jsonToBulletList(stack as Record<string, unknown>)}`).join('\n\n') : 'See JSON artifact' },
      { heading: 'Components', content: Array.isArray(arch.components) ? this.arrayToMarkdownTable(arch.components as Record<string, unknown>[]) : 'See JSON artifact' },
      { heading: 'Data Flow', content: Array.isArray(arch.dataFlow) ? (arch.dataFlow as string[]).map((d, i) => `${i + 1}. ${d}`).join('\n') : 'See JSON artifact' },
      { heading: 'Security Considerations', content: Array.isArray(arch.securityConsiderations) ? (arch.securityConsiderations as string[]).map(s => `- ${s}`).join('\n') : 'See JSON artifact' },
      { heading: 'Scalability', content: Array.isArray(arch.scalabilityNotes) ? (arch.scalabilityNotes as string[]).map(s => `- ${s}`).join('\n') : 'See JSON artifact' },
    ]);

    return this.ok(
      { architecture: arch, techStack: arch.techStack },
      Date.now() - start,
      1,
      llmResult.usage.total,
      warnings,
      markdown,
    );
  }
}
