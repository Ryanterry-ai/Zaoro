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
import { Scorer, type ScoredOption, type ScoringContext } from './reasoning/scorer.js';
import { BlueprintCompilerV2, type BlueprintCompilerInput } from './reasoning/blueprint-compiler-v2.js';
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
}

/**
 * Run the full BRE v2 pipeline: Rules → Constraints → Scoring → Blueprint.
 * Deterministic path for well-covered prompts.
 * LLM escalation path for low-confidence cases (configurable via llmConfig).
 */
export async function runBREV2Pipeline(ctx: BREContext, llmConfig?: LLMConfig, industryScore?: number): Promise<BREv2Result> {
  log.info('Running BRE v2 pipeline', {
    industry: ctx.industry,
    businessModels: ctx.businessModels,
    entities: ctx.entities,
    appName: ctx.appName,
  });

  const rulesEngine = new RulesEngine();
  const constraintSolver = new ConstraintSolver();
  const scorer = new Scorer();
  const compiler = new BlueprintCompilerV2();

  // Step 1: Evaluate rules against context
  const t1 = Date.now();
  let decisions = rulesEngine.evaluate(ctx);
  log.info('Rules evaluated', { count: decisions.length, duration: Date.now() - t1 });

  // Step 2: Check constraints
  const t2 = Date.now();
  let constraintReport = constraintSolver.evaluate(ctx, decisions);
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
  log.info('Scoring complete', {
    designProfile: selectedDesignProfile?.name,
    pattern: selectedPattern?.name,
    duration: Date.now() - t3,
  });

  // Step 3b: Confidence Gate — evaluate whether the deterministic system
  // adequately understood this prompt, or whether LLM escalation is needed.
  const gateResult = evaluateConfidence(
    ctx,
    industryScore ?? 99, // 99 = trusted caller, no penalty for missing score
    selectedPattern,
    scoredPatterns,
  );

  let activeCtx = ctx;
  let usedLLMPlanning = false;

  if (gateResult.shouldEscalate) {
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
  // selectedPattern is now wired into page compilation via mapPatternPagesToBlueprintPages.
  const t4 = Date.now();
  const vocabulary: Record<string, string> = {};
  for (const decision of decisions) {
    if (decision.action.type === 'set_vocabulary') {
      vocabulary[decision.action.original] = decision.action.replacement;
    }
  }

  // Resolve the full Pattern object for page-merging (fixes the selectedPattern dead-code bug)
  const fullSelectedPattern = selectedPattern
    ? PATTERNS.find(p => p.id === selectedPattern.id)
    : undefined;

  const input: BlueprintCompilerInput = {
    context: activeCtx,
    decisions,
    constraintReport,
    selectedDesignProfile,
    selectedPattern,
    fullSelectedPattern, // NEW: full Pattern object, not just ScoredOption
    vocabulary,
    knowledgeRefs: [],
    ...(ctx.revenueIntelligence ? { revenueIntelligence: ctx.revenueIntelligence } : {}),
  };

  const blueprint = compiler.compile(input);
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
  };
}
