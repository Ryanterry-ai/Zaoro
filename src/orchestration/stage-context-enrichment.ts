// ─── Stage Context Enrichment ──────────────────────────────────────────────
//
// Enriches stage prompts with BOS pack context. Injects industry-specific
// entities, compliance requirements, integrations, KPIs, and user journeys
// into stage prompts for more accurate generation.
// ─────────────────────────────────────────────────────────────────────────────

import type { BOSPack, StageContext } from './types.js';

export interface EnrichedPrompt {
  systemPrompt: string;
  userPrompt: string;
  contextSummary: string;
}

/**
 * Enrich a stage's system prompt with BOS pack context.
 */
export function enrichStagePrompt(
  baseSystemPrompt: string,
  baseUserPrompt: string,
  pack: BOSPack | undefined,
  stageId: string,
): EnrichedPrompt {
  if (!pack) {
    return {
      systemPrompt: baseSystemPrompt,
      userPrompt: baseUserPrompt,
      contextSummary: 'No industry context available',
    };
  }

  const sections: string[] = [];

  // Industry-specific stage guidance
  const stageGuidance = pack.stagePrompts[stageId];
  if (stageGuidance) {
    sections.push(`## Industry Guidance\n${stageGuidance}`);
  }

  // Entity context
  if (pack.entities.length > 0) {
    const entityList = pack.entities.map(e =>
      `- **${e.name}**: ${e.description} (fields: ${e.fields.map(f => f.name).join(', ')})`
    ).join('\n');
    sections.push(`## Domain Entities\n${entityList}`);
  }

  // Compliance requirements
  if (pack.compliance.length > 0) {
    const complianceList = pack.compliance.map(c =>
      `- **${c.name}**: ${c.description}${c.required ? ' [REQUIRED]' : ''}\n  Checklist: ${c.checklist.join(', ')}`
    ).join('\n');
    sections.push(`## Compliance Requirements\n${complianceList}`);
  }

  // Integrations
  if (pack.integrations.length > 0) {
    const integrationList = pack.integrations.map(i =>
      `- **${i.name}** (${i.category}): ${i.purpose} [${i.apiType}]`
    ).join('\n');
    sections.push(`## Recommended Integrations\n${integrationList}`);
  }

  // KPIs
  if (pack.kpis.length > 0) {
    sections.push(`## Key Performance Indicators\n${pack.kpis.map(k => `- ${k}`).join('\n')}`);
  }

  // User Journeys
  if (pack.journeys.length > 0) {
    const journeyList = pack.journeys.map(j =>
      `- **${j.name}** (${j.role}): ${j.steps.join(' → ')} → Goal: ${j.conversionGoal}`
    ).join('\n');
    sections.push(`## User Journeys\n${journeyList}`);
  }

  const contextBlock = sections.join('\n\n');

  return {
    systemPrompt: `${baseSystemPrompt}\n\n## Industry Context: ${pack.name}\n\n${contextBlock}`,
    userPrompt: baseUserPrompt,
    contextSummary: `Enriched with ${pack.name} context: ${pack.entities.length} entities, ${pack.compliance.length} compliance rules, ${pack.integrations.length} integrations`,
  };
}

/**
 * Get a compact context summary for a pack (for logging/reporting).
 */
export function getPackSummary(pack: BOSPack | undefined): string {
  if (!pack) return 'No BOS pack loaded';
  return [
    `${pack.name} (${pack.industry})`,
    `${pack.entities.length} entities`,
    `${pack.compliance.length} compliance rules`,
    `${pack.integrations.length} integrations`,
    `${pack.kpis.length} KPIs`,
    `${pack.journeys.length} journeys`,
  ].join(' | ');
}
