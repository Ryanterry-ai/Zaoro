/**
 * LLMPlanningAgent — called by the BRE v2 pipeline when the confidence gate
 * decides the deterministic system can't adequately handle a prompt.
 *
 * The agent uses the LLM to produce:
 *   1. An enriched BREContext (filling gaps left by keyword matching)
 *   2. Additional RuleDecision-shaped page/entity/integration suggestions
 *      that merge into the existing BlueprintCompilerV2 input without
 *      requiring a parallel blueprint construction path.
 *
 * This deliberately avoids asking the LLM to generate a full ApplicationBlueprint
 * from scratch — that would bypass all the existing validation, constraint-solver,
 * and design-token machinery. Instead it outputs the same RuleAction vocabulary
 * that the rules engine uses, so the compiler sees a combined decision list
 * (deterministic rules + LLM suggestions) and handles them identically.
 *
 * Zero network calls when no API key is available — falls back gracefully
 * to the original BREContext unchanged.
 */

import type { BREContext, RuleDecision } from './reasoning/rules-engine.js';
import type { LLMConfig } from '../types/index.js';
import { LLMGateway } from '../core/llm-gateway.js';
import { stageLogger } from '../core/debug-logger.js';

const log = stageLogger('llm-planner');

export interface LLMPlanningResult {
  enrichedContext: BREContext;
  additionalDecisions: RuleDecision[];
  usedLLM: boolean;
}

// The structured output schema the LLM must produce.
// Kept deliberately narrow — only the fields we actually need filled in.
interface LLMPlanningOutput {
  industry: string;
  subIndustry?: string | undefined;
  businessModels: string[];
  capabilities: string[];
  journeys: string[];
  entities: string[];
  appName?: string;
  pages: Array<{
    path: string;
    name: string;
    sections: string[];
  }>;
  integrations: Array<{
    type: string;
    name: string;
    required: boolean;
  }>;
}

// Valid section names from the section-mapper registry — the LLM must use
// these names so that content-resolver can find real resolvers for them.
// This is the complete list from section-mapper.ts confirmed in Phase 3.
const VALID_SECTIONS = [
  'hero', 'hero-banner', 'features', 'feature-grid', 'product-grid',
  'pricing-table', 'testimonials', 'cta', 'faq', 'stats-cards',
  'data-table', 'auth-form', 'contact-form', 'footer', 'calendar',
  'booking-form', 'dashboard-widgets', 'charts', 'profile', 'team-grid',
  'gallery', 'blog-grid', 'search', 'filters', 'sidebar', 'activity-feed',
  'order-history', 'cart-items', 'order-summary', 'wishlist',
  'category-grid', 'sort-bar', 'mission', 'notifications',
] as const;

const SYSTEM_PROMPT = `You are a software architect AI. Your job is to analyze a user's app-building request
and produce a structured planning output when the standard keyword-matching system has low confidence.

You must respond with ONLY a valid JSON object — no markdown, no code fences, no explanation.

The JSON must match this schema exactly:
{
  "industry": string,                    // Primary industry: healthcare, saas, ecommerce, etc.
  "subIndustry": string | null,          // More specific: "hospital-erp", "dental-clinic", etc.
  "businessModels": string[],            // From: subscription, direct-sales, marketplace, service-booking, membership, donation, wholesale
  "capabilities": string[],             // From: analytics, crm, payments, booking, inventory, content, scheduling, search, commerce
  "journeys": string[],                 // From: visitor, customer, admin — which user types need distinct flows
  "entities": string[],                 // Core data entities: e.g. ["Patient", "Doctor", "Department", "Appointment"]
  "appName": string | null,             // Inferred app name if clear from the prompt
  "pages": [                            // Suggested pages — use these paths only
    { "path": string, "name": string, "sections": string[] }
  ],
  "integrations": [                     // Required external services
    { "type": string, "name": string, "required": boolean }
  ]
}

Valid section names for the "sections" array:
hero, features, feature-grid, product-grid, pricing-table, testimonials, cta, faq,
stats-cards, data-table, auth-form, contact-form, footer, calendar, booking-form,
dashboard-widgets, charts, profile, team-grid, gallery, blog-grid, search, filters,
sidebar, activity-feed, order-history, cart-items, order-summary, wishlist,
category-grid, sort-bar, mission, notifications

Rules:
- Include ONLY sections that make sense for this specific business. Do not add generic marketing
  sections (hero, testimonials, cta) to internal operational tools.
- For ERP/internal tools: include admin journey, dashboard pages, data-table sections, charts.
- For consumer apps: include visitor journey, marketing pages, product/booking sections.
- "pages" should be ADDITIONAL pages beyond what the standard rules already add.
  The standard rules always add: /, /about, /contact plus industry-specific pages.
  Add pages the standard rules would miss: /dashboard, /admin, /inventory, /reports, etc.
- Keep entities focused: 3-8 core domain entities, PascalCase names.`;

/**
 * Enrich a low-confidence BREContext using an LLM call.
 * Falls back to the original context + empty additional decisions if no API key.
 */
export async function runLLMPlanning(
  originalCtx: BREContext,
  existingDecisions: RuleDecision[],
  llmConfig?: LLMConfig,
): Promise<LLMPlanningResult> {
  // If no API key is available, skip gracefully — don't block the build
  const apiKey = llmConfig?.apiKey || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    log.info('No API key available, skipping LLM planning enrichment');
    return {
      enrichedContext: originalCtx,
      additionalDecisions: [],
      usedLLM: false,
    };
  }

  const userPrompt = buildPlanningPrompt(originalCtx, existingDecisions);

  try {
    log.info('Calling LLM for planning enrichment', {
      prompt: originalCtx.description?.slice(0, 80),
      industry: originalCtx.industry,
    });

    const gateway = new LLMGateway({
      provider: llmConfig?.provider ?? 'openai',
      apiKey,
      ...(llmConfig?.model !== undefined ? { model: llmConfig.model } : {}),
    });

    const raw = await gateway.generateText(userPrompt, {
      temperature: 0.2,  // Low temperature for deterministic structured output
      maxTokens: 2048,
    });

    const parsed = parseAndValidateLLMOutput(raw);
    if (!parsed) {
      log.info('LLM output failed validation, using original context');
      return { enrichedContext: originalCtx, additionalDecisions: [], usedLLM: false };
    }

    const enrichedContext = mergeIntoContext(originalCtx, parsed);
    const additionalDecisions = buildAdditionalDecisions(parsed, existingDecisions);

    log.info('LLM planning enrichment complete', {
      addedPages: additionalDecisions.filter(d => d.action.type === 'add_page').length,
      addedEntities: additionalDecisions.filter(d => d.action.type === 'add_entity').length,
      journeys: enrichedContext.journeys,
      capabilities: enrichedContext.capabilities.length,
    });

    return { enrichedContext, additionalDecisions, usedLLM: true };

  } catch (err: any) {
    log.info('LLM planning call failed, proceeding with original context', { error: err.message });
    return { enrichedContext: originalCtx, additionalDecisions: [], usedLLM: false };
  }
}

function buildPlanningPrompt(ctx: BREContext, existingDecisions: RuleDecision[]): string {
  const existingPages = existingDecisions
    .filter(d => d.action.type === 'add_page')
    .map(d => d.action.type === 'add_page' ? d.action.path : '')
    .filter(Boolean);

  const appFamily = ctx.appFamilyResult;
  const familyContext = appFamily && appFamily.family !== 'industry-specific'
    ? `
APPLICATION FAMILY CONTEXT (high priority signal):
- This is a "${appFamily.appType}" — an application of type "${appFamily.family}"
- Primary data entity: ${appFamily.primaryEntity ?? 'unknown'}
- Complexity: ${appFamily.complexity} (${appFamily.complexity === 'micro' ? 'keep it minimal — 1-2 pages max' : 'standard feature set'})
- UI mode: ${appFamily.uiMode}
- Data model: ${appFamily.dataModel}
- CRITICAL: DO NOT produce CRM pages (leads, pipeline, accounts, contacts) for this app type.
- CRITICAL: DO NOT add marketing sections (hero, testimonials, cta) to an operational tool.
- Produce only the pages needed for the ${appFamily.appType} use case.`
    : '';

  return `Analyze this app-building request and produce the planning JSON.

User request: "${ctx.description ?? ''}"${familyContext}

What the standard keyword-matching system detected (may be incomplete or wrong):
- Industry: ${ctx.industry} (confidence: LOW — this is why LLM planning was triggered)
- Business models detected: ${ctx.businessModels.length ? ctx.businessModels.join(', ') : 'none'}
- Capabilities detected: ${ctx.capabilities.length ? ctx.capabilities.join(', ') : 'none'}
- Journeys detected: ${ctx.journeys.join(', ')}
- Entities detected: ${ctx.entities.join(', ')}
- Pages already being generated by standard rules: ${existingPages.join(', ') || 'none'}

Your job: Produce the correct planning output for this specific request.
Focus especially on pages and journeys that the standard system missed.
Do NOT include pages already in the "already being generated" list above.`;
}

function parseAndValidateLLMOutput(raw: string): LLMPlanningOutput | null {
  try {
    // Strip markdown fences if present despite instructions
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned) as LLMPlanningOutput;

    // Basic validation — industry and pages are required
    if (!parsed.industry || typeof parsed.industry !== 'string') return null;
    if (!Array.isArray(parsed.pages)) return null;

    // Sanitize sections — only keep names that exist in the registry
    // to prevent invalid section names reaching section-mapper.ts
    parsed.pages = parsed.pages.map(page => ({
      ...page,
      sections: (page.sections ?? []).filter(s =>
        (VALID_SECTIONS as readonly string[]).includes(s)
      ),
    }));

    return parsed;
  } catch {
    return null;
  }
}

function mergeIntoContext(original: BREContext, llm: LLMPlanningOutput): BREContext {
  const merged: BREContext = {
    ...original,
    // LLM wins on industry if original was 'general' (no match)
    industry: original.industry === 'general' ? llm.industry : original.industry,
    // Merge capabilities — union, no duplicates
    capabilities: [...new Set([...original.capabilities, ...(llm.capabilities ?? [])])],
    // Merge journeys — union, no duplicates
    journeys: [...new Set([...original.journeys, ...(llm.journeys ?? [])])],
    // Merge entities — union, no duplicates
    entities: [...new Set([...original.entities, ...(llm.entities ?? [])])],
    // Business models: use LLM's if original was empty
    businessModels: original.businessModels.length > 0
      ? original.businessModels
      : (llm.businessModels ?? []),
  };

  // Conditionally assign optional fields to satisfy exactOptionalPropertyTypes
  const resolvedSubIndustry = llm.subIndustry ?? original.subIndustry;
  if (resolvedSubIndustry !== undefined) merged.subIndustry = resolvedSubIndustry;

  const resolvedAppName = original.appName ?? llm.appName ?? undefined;
  if (resolvedAppName !== undefined) merged.appName = resolvedAppName;

  return merged;
}

function buildAdditionalDecisions(
  llm: LLMPlanningOutput,
  existingDecisions: RuleDecision[],
): RuleDecision[] {
  const existingPaths = new Set(
    existingDecisions
      .filter(d => d.action.type === 'add_page')
      .map(d => d.action.type === 'add_page' ? d.action.path : '')
  );

  const existingEntities = new Set(
    existingDecisions
      .filter(d => d.action.type === 'add_entity')
      .map(d => d.action.type === 'add_entity' ? d.action.name : '')
  );

  const decisions: RuleDecision[] = [];

  // Add pages the LLM suggests that don't already exist
  for (const page of llm.pages ?? []) {
    if (!existingPaths.has(page.path)) {
      decisions.push({
        ruleId: 'rule.llm.planning',
        ruleName: 'LLM Planning Agent',
        action: {
          type: 'add_page',
          path: page.path,
          name: page.name,
          sections: page.sections,
        },
        confidence: 0.8,
        trace: 'LLM planning enrichment',
      });
    }
  }

  // Add entities the LLM suggests that don't already exist
  for (const entity of llm.entities ?? []) {
    if (!existingEntities.has(entity)) {
      decisions.push({
        ruleId: 'rule.llm.planning',
        ruleName: 'LLM Planning Agent',
        action: {
          type: 'add_entity',
          name: entity,
          fields: ['id', 'createdAt', 'updatedAt'],
        },
        confidence: 0.75,
        trace: 'LLM planning enrichment',
      });
    }
  }

  // Add integrations the LLM suggests
  for (const integration of llm.integrations ?? []) {
    decisions.push({
      ruleId: 'rule.llm.planning',
      ruleName: 'LLM Planning Agent',
      action: {
        type: 'add_integration',
        integrationType: integration.type,
        name: integration.name,
        required: integration.required,
      },
      confidence: 0.7,
      trace: 'LLM planning enrichment',
    });
  }

  return decisions;
}
