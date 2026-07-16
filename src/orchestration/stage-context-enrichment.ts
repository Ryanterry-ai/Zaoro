// ─── Stage Context Enrichment ──────────────────────────────────────────────
//
// Enriches stage prompts with business knowledge.
// Supports both legacy BOSPack and new BusinessKnowledge.
// When BusinessKnowledge is available, it takes precedence as the single
// source of truth for all business understanding.
// ─────────────────────────────────────────────────────────────────────────────

import type { BOSPack, StageContext } from './types.js';
import type { BusinessKnowledge } from './business-intelligence/types.js';

export interface EnrichedPrompt {
  systemPrompt: string;
  userPrompt: string;
  contextSummary: string;
}

/**
 * Enrich a stage's system prompt with business knowledge.
 * BusinessKnowledge takes precedence over BOSPack when available.
 */
export function enrichStagePrompt(
  baseSystemPrompt: string,
  baseUserPrompt: string,
  pack: BOSPack | undefined,
  stageId: string,
  bk?: BusinessKnowledge,
): EnrichedPrompt {
  // If we have BusinessKnowledge, use it as the primary source
  if (bk) {
    return enrichFromBusinessKnowledge(baseSystemPrompt, baseUserPrompt, bk, stageId);
  }

  // Fallback to legacy BOSPack
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
 * Enrich a stage's system prompt from BusinessKnowledge — the single source of truth.
 */
function enrichFromBusinessKnowledge(
  baseSystemPrompt: string,
  baseUserPrompt: string,
  bk: BusinessKnowledge,
  stageId: string,
): EnrichedPrompt {
  const sections: string[] = [];

  // Discovery context
  sections.push(`## Business Understanding\n- **Type**: ${bk.discovery.businessType}\n- **Industry**: ${bk.discovery.industry}\n- **Domain**: ${bk.discovery.domain}\n- **Intent**: ${bk.discovery.intent}`);

  // Entities
  if (bk.entities.length > 0) {
    const entityList = bk.entities.map(e =>
      `- **${e.name}** (${e.archetype}): ${e.fields.join(', ')} — ${e.relationships.join('; ')}`
    ).join('\n');
    sections.push(`## Domain Entities\n${entityList}`);
  }

  // Workflows
  if (bk.workflows.length > 0) {
    const wfList = bk.workflows.map(w =>
      `- **${w.id}** (${w.scope}): ${w.description} — Steps: ${w.steps.join(' → ')}${w.automationCandidate ? ' [AUTOMATION]' : ''}`
    ).join('\n');
    sections.push(`## Business Workflows\n${wfList}`);
  }

  // Compliance
  if (bk.compliance.length > 0) {
    const compList = bk.compliance.map(c =>
      `- **${c.pack}** [${c.severity}]: ${c.trigger}`
    ).join('\n');
    sections.push(`## Compliance Requirements\n${compList}`);
  }

  // Revenue model
  sections.push(`## Revenue Model\n- **Type**: ${bk.revenue.model}\n- **Source**: ${bk.revenue.source}\n- **Pricing**: ${bk.revenue.pricing.structure}\n- **Currency**: ${bk.revenue.currency}\n- **Payment methods**: ${bk.revenue.payment.methods.join(', ')}`);

  // KPIs
  if (bk.kpis.length > 0) {
    sections.push(`## Key Performance Indicators\n${bk.kpis.map(k => `- **${k.name}**: ${k.question} (dashboard: ${k.dashboard})`).join('\n')}`);
  }

  // Customer journey
  if (bk.customerJourney.stages.length > 0) {
    const journeyList = bk.customerJourney.stages.map(s =>
      `- **${s.stage}**: ${s.action} (emotional target: ${s.emotionalTarget})`
    ).join('\n');
    sections.push(`## Customer Journey\n${journeyList}`);
  }

  // Vocabulary
  sections.push(`## Domain Vocabulary\n${Object.entries(bk.vocabulary.terms).map(([k, v]) => `- "${k}" → "${v}"`).join('\n')}\n- Tone: ${bk.vocabulary.tone.join(', ')}`);

  const contextBlock = sections.join('\n\n');

  return {
    systemPrompt: `${baseSystemPrompt}\n\n## Business Knowledge: ${bk.discovery.businessType}\n\n${contextBlock}`,
    userPrompt: baseUserPrompt,
    contextSummary: `Enriched with BusinessKnowledge: ${bk.discovery.businessType} (${bk.discovery.industry}) — ${bk.entities.length} entities, ${bk.workflows.length} workflows, ${bk.compliance.length} compliance rules`,
  };
}

/**
 * Get a compact context summary for a pack (for logging/reporting).
 */
export function getPackSummary(pack: BOSPack | undefined, bk?: BusinessKnowledge): string {
  if (bk) {
    return [
      `${bk.discovery.businessType} (${bk.discovery.industry})`,
      `${bk.entities.length} entities`,
      `${bk.workflows.length} workflows`,
      `${bk.compliance.length} compliance rules`,
      `${bk.integrations.length} integrations`,
      `revenue: ${bk.revenue.model}`,
    ].join(' | ');
  }
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
