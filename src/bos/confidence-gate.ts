/**
 * ConfidenceGate — evaluates how well the deterministic BRE pipeline
 * actually understood a prompt, and decides whether to escalate to the
 * LLM planning path or proceed with the deterministic blueprint.
 *
 * Design principle: the deterministic path is fast, free, and correct for
 * well-covered prompts (12 industries, 20 patterns). This gate preserves
 * that path for those cases. It only escalates when there is concrete
 * evidence the deterministic system is guessing rather than knowing.
 *
 * Called from: bos/bre-v2-pipeline.ts, after scoring but before compilation.
 */

import type { BREContext } from './reasoning/rules-engine.js';
import type { ScoredOption } from './reasoning/scorer.js';
import { stageLogger } from '../core/debug-logger.js';

const log = stageLogger('confidence-gate');

// ─── Score thresholds (calibrated against Phase 2 trace data) ─────────────
// These were set conservatively based on one traced prompt ("Build ERP for
// hospitals") and should be recalibrated once more prompts are traced.
// See Phase 6 audit doc for the rationale.

/**
 * Minimum keyword-match score from detectIndustry to be considered a
 * confident industry match. Score 8 (hospital ERP trace) is near the
 * minimum >= 3 threshold — clearly a borderline match.
 * Score 15+ is a comfortable multi-keyword match.
 */
const INDUSTRY_SCORE_THRESHOLD = 12;

/**
 * Minimum pattern score out of 100 to be considered a good pattern match.
 * Scores below this indicate the "best available" pattern is still a poor
 * fit — the system is forcing a match where none exists.
 * 45 corresponds to industryFit=5 (no match) + modelFit=25 + some page/component
 * coverage — i.e. the pattern matched only on business model, not industry.
 */
const PATTERN_SCORE_THRESHOLD = 45;

/**
 * Minimum ratio of detected capabilities. If capabilities is empty despite
 * a complex request (like ERP), it's a strong signal the intake parser
 * couldn't understand what the system is supposed to do.
 */
const MIN_CAPABILITY_COUNT = 0; // 0 = tolerate empty, gate uses it as a penalty signal

export interface ConfidenceSignals {
  industryScore: number;        // Raw keyword-match score from detectIndustry
  patternScore: number;         // Best pattern score from Scorer (0-100)
  patternIndustryFit: boolean;  // Did the winning pattern actually match industry?
  capabilityCount: number;      // Number of capabilities detected
  hasAdminJourney: boolean;     // Did any journey signal produce 'admin'?
  businessModelsEmpty: boolean; // Did business model detection find nothing?
}

export interface ConfidenceGateResult {
  shouldEscalate: boolean;
  confidence: number;           // 0.0-1.0 composite signal
  signals: ConfidenceSignals;
  reasons: string[];            // Human-readable explanation of what failed
}

/**
 * Evaluate whether the current BRE context + scoring results are
 * confident enough to proceed deterministically, or need LLM escalation.
 */
export function evaluateConfidence(
  ctx: BREContext,
  industryScore: number,
  selectedPattern: ScoredOption | undefined,
  scoredPatterns: ScoredOption[],
): ConfidenceGateResult {
  const reasons: string[] = [];

  // Signal 1: industry keyword-match score
  const industryScoreOk = industryScore >= INDUSTRY_SCORE_THRESHOLD;
  if (!industryScoreOk) {
    reasons.push(
      `Industry match weak (score ${industryScore}, threshold ${INDUSTRY_SCORE_THRESHOLD}): ` +
      `"${ctx.industry}" may be a borderline or forced match.`
    );
  }

  // Signal 2: pattern score quality
  const patternScore = selectedPattern?.score ?? 0;
  const patternScoreOk = patternScore >= PATTERN_SCORE_THRESHOLD;
  if (!patternScoreOk) {
    reasons.push(
      `Pattern match poor (score ${patternScore}/100, threshold ${PATTERN_SCORE_THRESHOLD}): ` +
      `"${selectedPattern?.name ?? 'none'}" is the best available but likely wrong for this domain.`
    );
  }

  // Signal 3: did the winning pattern actually match industry (not just business model)?
  // This catches the ERP/hospital case where pattern wins on 'direct-sales' tiebreak
  // with industryFit=5 (no match), not on actual industry relevance.
  const patternIndustryFit = (selectedPattern?.breakdown?.['industryFit'] ?? 0) >= 20;
  if (!patternIndustryFit && selectedPattern) {
    reasons.push(
      `Pattern industry mismatch: "${selectedPattern.name}" scored ${selectedPattern.breakdown?.['industryFit'] ?? 0} ` +
      `on industry fit (needs ≥20). Pattern may have been selected on business model alone.`
    );
  }

  // Signal 4: capabilities — complex requests with zero detected capabilities
  // (like "Build ERP for hospitals") signal that the intake parser couldn't
  // extract what the system should do
  const capabilityCount = ctx.capabilities.length;
  const complexPromptKeywords = ['erp', 'crm', 'platform', 'system', 'management', 'enterprise', 'workflow'];
  const isComplexPrompt = complexPromptKeywords.some(kw =>
    (ctx.description ?? '').toLowerCase().includes(kw)
  );
  if (isComplexPrompt && capabilityCount === 0) {
    reasons.push(
      `Complex request ("${ctx.description?.slice(0, 60)}") but zero capabilities detected. ` +
      `Intake parser likely failed to understand the domain.`
    );
  }

  // Signal 5: business models were empty (defaulted behavior removed, now honest)
  const businessModelsEmpty = ctx.businessModels.length === 0;

  // Signal 6: admin journey missing for clearly operational/internal prompts
  const hasAdminJourney = ctx.journeys.includes('admin');
  const operationalKeywords = ['erp', 'admin', 'management', 'dashboard', 'back office', 'operations', 'workflow', 'internal'];
  const isOperational = operationalKeywords.some(kw =>
    (ctx.description ?? '').toLowerCase().includes(kw)
  );
  if (isOperational && !hasAdminJourney) {
    reasons.push(
      `Operational/internal tool request but no admin journey detected. ` +
      `The prompt likely needs admin pages that the journey detector missed.`
    );
  }

  // ─── Composite confidence score ─────────────────────────────────────────
  // Start at 1.0, subtract penalties for each failed signal.
  let confidence = 1.0;
  if (!industryScoreOk)     confidence -= 0.25;
  if (!patternScoreOk)      confidence -= 0.20;
  if (!patternIndustryFit)  confidence -= 0.15;
  if (isComplexPrompt && capabilityCount === 0) confidence -= 0.20;
  if (isOperational && !hasAdminJourney)        confidence -= 0.15;
  if (businessModelsEmpty)  confidence -= 0.05; // small penalty — can be correct
  confidence = Math.max(0.0, Math.min(1.0, confidence));

  // Escalate if confidence drops below 0.60 (i.e. at least two signals failed)
  const shouldEscalate = confidence < 0.60;

  const signals: ConfidenceSignals = {
    industryScore,
    patternScore,
    patternIndustryFit,
    capabilityCount,
    hasAdminJourney,
    businessModelsEmpty,
  };

  if (shouldEscalate) {
    log.info('Confidence gate: ESCALATE to LLM planning', {
      confidence: confidence.toFixed(2),
      reasons,
    });
  } else {
    log.info('Confidence gate: PROCEED deterministically', {
      confidence: confidence.toFixed(2),
    });
  }

  return { shouldEscalate, confidence, signals, reasons };
}
