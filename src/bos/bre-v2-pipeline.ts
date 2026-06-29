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
import {
  KnowledgeRegistry,
  DESIGN_PROFILES,
  PATTERNS,
} from './knowledge/registry.js';
import { stageLogger } from '../core/debug-logger.js';

const log = stageLogger('bre');

export interface BREv2Result {
  blueprint: ApplicationBlueprint;
  decisions: RuleDecision[];
  constraintReport: ConstraintReport;
  selectedDesignProfile: ScoredOption | undefined;
  selectedPattern: ScoredOption | undefined;
  confidence: number;
}

/**
 * Run the full BRE v2 pipeline: Rules → Constraints → Scoring → Blueprint.
 * Purely deterministic. Zero LLM calls.
 */
export function runBREV2Pipeline(ctx: BREContext): BREv2Result {
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
  const decisions = rulesEngine.evaluate(ctx);
  log.info('Rules evaluated', { count: decisions.length, duration: Date.now() - t1 });

  // Step 2: Check constraints
  const t2 = Date.now();
  const constraintReport = constraintSolver.evaluate(ctx, decisions);
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

  // Step 4: Compile blueprint
  const t4 = Date.now();
  const vocabulary: Record<string, string> = {};
  for (const decision of decisions) {
    if (decision.action.type === 'set_vocabulary') {
      vocabulary[decision.action.original] = decision.action.replacement;
    }
  }

  const input: BlueprintCompilerInput = {
    context: ctx,
    decisions,
    constraintReport,
    selectedDesignProfile,
    selectedPattern,
    vocabulary,
    knowledgeRefs: [],
  };

  const blueprint = compiler.compile(input);
  log.info('Blueprint compiled', {
    pages: blueprint.pages.length,
    entities: blueprint.entities.length,
    apis: blueprint.apis.length,
    workflows: blueprint.workflows.length,
    confidence: blueprint.confidence,
    duration: Date.now() - t4,
  });

  return {
    blueprint,
    decisions,
    constraintReport,
    selectedDesignProfile,
    selectedPattern,
    confidence: blueprint.confidence,
  };
}
