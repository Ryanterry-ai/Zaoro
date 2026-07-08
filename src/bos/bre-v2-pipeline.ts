/**
 * BRE v2 Pipeline — Deterministic business reasoning, zero LLM calls.
 *
 * Usage:
 *   const blueprint = runBREV2Pipeline({
 *     industry: 'restaurant',
 *     businessModels: ['direct-sales'],
 *     country: 'US',
 *     compliancePacks: [],
 *     capabilities: ['booking', 'gallery'],
 *     journeys: ['visitor', 'customer'],
 *     entities: ['MenuItem', 'Reservation'],
 *     appName: 'Bella Vista',
 *     description: 'Italian restaurant with online reservations',
 *   });
 */

import { RulesEngine, type BREContext, type RuleDecision } from './reasoning/rules-engine.js';
import { ConstraintSolver, type ConstraintReport } from './reasoning/constraint-solver.js';
import { Scorer, shouldUseNoPattern, type ScoredOption, type ScoringContext } from './reasoning/scorer.js';
import { BlueprintCompilerV2, buildNoPatternBlueprint, type BlueprintCompilerInput } from './reasoning/blueprint-compiler-v2.js';
import { classify } from './reasoning/application-family-classifier.js';
import type { ApplicationBlueprint } from './schemas/blueprint/application-blueprint.schema.js';
import type { DesignProfile } from './schemas/knowledge/design-profile.schema.js';
import type { Pattern } from './schemas/knowledge/pattern.schema.js';
import type { BusinessIntelligenceProfile } from './schemas/knowledge/business-intelligence.schema.js';
import {
  KnowledgeRegistry,
  DESIGN_PROFILES,
  PATTERNS,
} from './knowledge/registry.js';
import { evaluateConfidence } from './confidence-gate.js';
import { runLLMPlanning } from './llm-planning-agent.js';
import type { LLMConfig } from '../types/index.js';
import { stageLogger } from '../core/debug-logger.js';
import { ContentScraper } from '../generation/content-scraper.js';
import type { ProgressEmitter } from '../core/progress-emitter.js';

const log = stageLogger('bre');

export interface BREv2Result {
  blueprint: ApplicationBlueprint;
  decisions: RuleDecision[];
  constraintReport: ConstraintReport;
  selectedDesignProfile: ScoredOption | undefined;
  selectedPattern: ScoredOption | undefined;
  confidence: number;
  usedLLMPlanning: boolean;
  revenueIntelligence?: BusinessIntelligenceProfile;
  /** Raw scraped content — preserves testimonials, about text, product specs, team members */
  scrapedContent?: import('./types.js').ScrapedContent;
}

/**
 * Run the full BRE v2 pipeline: Rules → Constraints → Scoring → Blueprint.
 * Deterministic path for well-covered prompts.
 * LLM escalation path for low-confidence cases (configurable via llmConfig).
 */
export async function runBREV2Pipeline(ctx: BREContext, llmConfig?: LLMConfig, industryScore?: number, progress?: ProgressEmitter): Promise<BREv2Result> {
  progress?.emit('bre', 'started', `Analyzing ${ctx.industry} business context: ${ctx.appName}`);
  log.info('Running BRE v2 pipeline', {
    industry: ctx.industry,
    businessModels: ctx.businessModels,
    entities: ctx.entities,
    appName: ctx.appName,
  });

  // Step 0: Web intelligence — scrape real business data if we have a name
  progress?.emit('research', 'started', 'Gathering business intelligence...');
  const t0 = Date.now();
  if (ctx.appName && ctx.appName !== 'MyApp' && ctx.appName !== 'BrandName') {
    const workspaceRoot = process.cwd();
    try {
      const scraper = new ContentScraper(workspaceRoot);
      const scraped = await scraper.scrapePromptData(ctx.appName, ctx.industry, ctx.country, ctx.description);
      if (scraped && (scraped.heroHeadline || scraped.aboutText || scraped.prices.length > 0)) {
        const profile = scraper.scrapedToBusinessProfile(scraped, ctx.industry, ctx.appName);
        ctx = { ...ctx, revenueIntelligence: profile as BusinessIntelligenceProfile, scrapedContent: scraped };
        log.info('Web intelligence gathered', {
          source: scraped.sourceUrl,
          headline: scraped.heroHeadline?.substring(0, 60),
          prices: scraped.prices.length,
          testimonials: scraped.testimonials.length,
        });
      } else {
        log.info('No web data found, using deterministic pools');
      }
    } catch (err: any) {
      log.warn('Web scraping failed, continuing deterministically', err.message);
    }
  }
  log.info('Web intelligence done', { duration: Date.now() - t0 });

  // Step 0b: Application family classification — structural app-type detection
  // This runs before industry-based scoring and provides context that prevents
  // size-based pattern wins (e.g., CRM beating task-tracker because CRM has more pages).
  const appFamilyResult = classify(ctx.description ?? ctx.appName ?? '', ctx);
  ctx.appFamilyResult = appFamilyResult;
  console.log(`[bre-v2] App family: ${appFamilyResult.family}/${appFamilyResult.appType} (confidence=${appFamilyResult.confidence.toFixed(2)})`);

  const rulesEngine = new RulesEngine();
  const constraintSolver = new ConstraintSolver();
  const scorer = new Scorer();
  const compiler = new BlueprintCompilerV2();

  progress?.emit('research', 'completed', 'Business intelligence gathered', { duration: Date.now() - t0 });

  // Step 1: Evaluate rules against context
  progress?.emit('architect', 'info', 'Evaluating business rules...');
  const t1 = Date.now();
  let decisions = rulesEngine.evaluate(ctx);
  progress?.emit('architect', 'info', `${decisions.length} business rules evaluated`, { duration: Date.now() - t1 });
  log.info('Rules evaluated', { count: decisions.length, duration: Date.now() - t1 });

  // Step 2: Check constraints
  progress?.emit('architect', 'info', 'Checking constraints...');
  const t2 = Date.now();
  let constraintReport = constraintSolver.evaluate(ctx, decisions);
  progress?.emit('architect', 'info', `Constraints: ${constraintReport.satisfied} satisfied, ${constraintReport.violated} violated`, { duration: Date.now() - t2 });
  log.info('Constraints evaluated', {
    satisfied: constraintReport.satisfied,
    violated: constraintReport.violated,
    duration: Date.now() - t2,
  });

  // Step 3: Score design profiles and patterns
  const t3 = Date.now();
  const scoringContext: ScoringContext = {
    industry: ctx.industry,
    businessModels: ctx.businessModels,
    capabilities: ctx.capabilities,
    decisions,
    designProfiles: DESIGN_PROFILES,
    patterns: PATTERNS,
    ...(ctx.subIndustry ? { subIndustry: ctx.subIndustry } : {}),
    ...(ctx.description ? { description: ctx.description } : {}),
  };

  const scoredProfiles = scorer.scoreDesignProfiles(scoringContext);
  const scoredPatterns = scorer.scorePatterns(scoringContext);
  const selectedDesignProfile = scorer.selectBest(scoredProfiles);
  const selectedPattern = scorer.selectBest(scoredPatterns);

  // Step 3b: Check if we should bypass pattern selection and use NoPatternBlueprint
  // This fires when family classifier identified a specific app type (task-tracker, etc.)
  // with high confidence AND the best pattern won on size, not domain relevance.
  const useNoPattern = shouldUseNoPattern(selectedPattern, appFamilyResult);
  if (useNoPattern) {
    console.log(`[bre-v2] NoPattern path: family=${appFamilyResult.family}, type=${appFamilyResult.appType}`);
  }

  log.info('Scoring complete', {
    designProfile: selectedDesignProfile?.name,
    pattern: selectedPattern?.name,
    duration: Date.now() - t3,
  });

  // Step 3b: Confidence Gate — evaluate whether the deterministic system
  // adequately understood this prompt, or whether LLM escalation is needed.
  progress?.emit('architect', 'info', `Best profile: ${selectedDesignProfile?.name ?? 'none'}, best pattern: ${selectedPattern?.name ?? 'none'}`, { duration: Date.now() - t3 });
  const gateResult = evaluateConfidence(
    ctx,
    industryScore ?? 99, // 99 = trusted caller, no penalty for missing score
    selectedPattern,
    scoredPatterns,
  );

  let activeCtx = ctx;
  let usedLLMPlanning = false;

  if (gateResult.shouldEscalate) {
    progress?.emit('architect', 'warning', `Confidence ${(gateResult.confidence * 100).toFixed(0)}% — escalating to LLM: ${gateResult.reasons[0] ?? ''}`);
    console.log(`[bre-v2] Confidence gate triggered (${(gateResult.confidence * 100).toFixed(0)}%): ${gateResult.reasons[0] ?? 'low confidence'}`);
    console.log(`[bre-v2] Escalating to LLM planning agent...`);

    const planningResult = await runLLMPlanning(ctx, decisions, llmConfig);

    if (planningResult.usedLLM) {
      activeCtx = planningResult.enrichedContext;
      // Merge LLM-derived decisions with deterministic ones.
      // LLM decisions go AFTER deterministic ones so constraints evaluated
      // on deterministic decisions remain valid.
      decisions = [...decisions, ...planningResult.additionalDecisions];
      usedLLMPlanning = true;

      // Re-run constraints on the expanded decision set
      constraintReport = constraintSolver.evaluate(activeCtx, decisions);
      console.log(`[bre-v2] LLM planning added ${planningResult.additionalDecisions.length} decisions`);
    } else {
      console.log(`[bre-v2] LLM planning unavailable (no API key), proceeding with deterministic output`);
    }
  }

  // Step 4: Compile blueprint
  // Check NoPattern path first - when useNoPattern is true, bypass pattern-based compilation
  // and produce a minimal, correct blueprint for the identified app family.
  const t4 = Date.now();

  let blueprint: ApplicationBlueprint;
  if (useNoPattern) {
    // Build minimal blueprint for cross-industry app types (task-tracker, recipe organiser, etc.)
    console.log(`[bre-v2] Building NoPatternBlueprint for family=${appFamilyResult.family}`);
    blueprint = buildNoPatternBlueprint(ctx, appFamilyResult);
  } else {
    // Standard pattern-based compilation
    progress?.emit('architect', 'info', `Compiling blueprint (${decisions.length} decisions, ${constraintReport.satisfied} constraints)...`);
    const vocabulary: Record<string, string> = {};
    for (const decision of decisions) {
      if (decision.action.type === 'set_vocabulary') {
        vocabulary[decision.action.original] = decision.action.replacement;
      }
    }

    const fullSelectedPattern = selectedPattern
      ? PATTERNS.find(p => p.id === selectedPattern.id)
      : undefined;

    const input: BlueprintCompilerInput = {
      context: activeCtx,
      decisions,
      constraintReport,
      selectedDesignProfile,
      selectedPattern,
      fullSelectedPattern,
      vocabulary,
      knowledgeRefs: [],
      ...(ctx.revenueIntelligence ? { revenueIntelligence: ctx.revenueIntelligence } : {}),
    };

    blueprint = compiler.compile(input);
  }

  progress?.emit('architect', 'completed', `Blueprint compiled: ${blueprint.pages.length} pages, ${blueprint.entities.length} entities, ${blueprint.apis.length} APIs`, { confidence: blueprint.confidence, duration: Date.now() - t4, usedLLMPlanning, noPattern: useNoPattern });
  log.info('Blueprint compiled', {
    pages: blueprint.pages.length,
    entities: blueprint.entities.length,
    apis: blueprint.apis.length,
    workflows: blueprint.workflows.length,
    confidence: blueprint.confidence,
    usedLLMPlanning,
    duration: Date.now() - t4,
  });

  return {
    blueprint,
    decisions,
    constraintReport,
    selectedDesignProfile,
    selectedPattern,
    confidence: blueprint.confidence,
    usedLLMPlanning,
    ...(ctx.revenueIntelligence ? { revenueIntelligence: ctx.revenueIntelligence } : {}),
    ...(ctx.scrapedContent ? { scrapedContent: ctx.scrapedContent } : {}),
  };
}
