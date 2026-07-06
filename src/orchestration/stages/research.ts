// ─── Research Stage ────────────────────────────────────────────────────────────
//
// Conducts domain research, market analysis, and competitive intelligence.
// Produces research findings with sources and confidence levels.
// Uses BOS knowledge for industry-specific research prompts.
// ──────────────────────────────────────────────────────────────────────────────

import { BaseStage } from './base-stage.js';
import type { StageMeta, StageContext, StageResult, AgentRole, LLMTaskType } from '../types.js';

const meta: StageMeta = {
  id: 'research',
  name: 'Domain Research',
  description: 'Research domain, market, and competitive landscape',
  agentRole: 'research' as AgentRole,
  dependencies: ['project-intake'],
  inputs: ['manifest'],
  outputs: ['research.domain', 'research.competitive'],
  estimatedDurationSec: 120,
  skippable: false,
  maxRetries: 2,
  parallelizable: false,
};

export class ResearchStage extends BaseStage {
  meta = meta;

  async execute(ctx: StageContext): Promise<StageResult> {
    const start = Date.now();
    const warnings: string[] = [];

    const manifest = ctx.getArtifact<Record<string, unknown>>('manifest');
    if (!manifest) {
      return this.fail('Manifest not found — project-intake must run first', Date.now() - start);
    }

    // Build BOS-aware prompts
    const bosContext = ctx.bos.pack
      ? `\n## Industry: ${ctx.bos.pack.name}\nKey KPIs: ${ctx.bos.pack.kpis.join(', ')}\nCommon integrations: ${ctx.bos.pack.integrations.map(i => i.name).join(', ')}\n${ctx.bos.pack.stagePrompts['research'] ?? ''}\n`
      : '';

    const [domainResult, competitiveResult] = await Promise.all([
      ctx.callLLM({
        taskType: 'analysis' as LLMTaskType,
        systemPrompt: 'Research the domain and provide findings as structured JSON with sections, confidence levels, and cited sources.',
        prompt: `Research the following domain and provide findings.

## Project: ${String(manifest.name ?? manifest.displayName ?? 'unknown')}
## Category: ${String(manifest.category ?? 'unknown')}
## Description: ${String(manifest.description ?? 'No description')}
${bosContext}

Provide:
1. Industry overview and trends
2. Target audience analysis
3. Key technologies commonly used in this space
4. Common patterns and best practices
5. Regulatory or compliance considerations (if any)

Output as JSON with sections, confidence levels, and cited sources where applicable.`,
        temperature: 0.4,
      }),
      ctx.callLLM({
        taskType: 'analysis' as LLMTaskType,
        systemPrompt: 'Analyze the competitive landscape and provide findings as structured JSON.',
        prompt: `Analyze the competitive landscape for a ${String(manifest.category ?? 'web application')} project: "${String(manifest.name ?? 'unknown')}"
${bosContext}

Provide:
1. Direct competitors or similar products
2. Feature comparison matrix
3. Differentiation opportunities
4. Market gaps to exploit
5. Pricing model analysis (if applicable)

Output as JSON with sections and confidence levels.`,
        temperature: 0.4,
      }),
    ]);

    const domain = domainResult.parsed ?? JSON.parse(domainResult.content);
    const competitive = competitiveResult.parsed ?? JSON.parse(competitiveResult.content);

    ctx.setArtifact('research.domain', domain);
    ctx.setArtifact('research.competitive', competitive);

    // Generate markdown
    const markdown = this.generateMarkdown('Domain Research', [
      { heading: 'Industry Overview', content: this.jsonToBulletList(domain?.industryOverview as Record<string, unknown> ?? domain ?? {}) },
      { heading: 'Target Audience', content: this.jsonToBulletList(domain?.targetAudience as Record<string, unknown> ?? {}) },
      { heading: 'Key Technologies', content: Array.isArray(domain?.keyTechnologies) ? (domain.keyTechnologies as string[]).map(t => `- ${t}`).join('\n') : 'See JSON artifact' },
      { heading: 'Competitive Landscape', content: this.jsonToBulletList(competitive as Record<string, unknown> ?? {}) },
      { heading: 'Market Gaps', content: Array.isArray(competitive?.gaps) ? (competitive.gaps as string[]).map(g => `- ${g}`).join('\n') : 'See JSON artifact' },
    ]);

    return this.ok(
      { domain, competitive },
      Date.now() - start,
      2,
      domainResult.usage.total + competitiveResult.usage.total,
      warnings,
      markdown,
    );
  }
}
