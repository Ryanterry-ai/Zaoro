// ─── Experience Director ────────────────────────────────────────────
// The Experience Director sits between Business Knowledge resolution and
// component selection.  It:
//   1. Generates candidate experience concepts (candidates.ts)
//   2. Scores each candidate against the Business Knowledge
//   3. Selects the strongest concept
//   4. Produces an ExperienceBlueprintPlan that drives downstream rendering
//
// This is the "plan, compare, then generate" layer — it replaces the old
// "generate then critique" pattern with structured creative direction.

import type { CapabilityId } from '../capabilities/types.js';
import { capabilityRegistry } from '../capabilities/index.js';
import type {
  ExperienceConcept,
  ExperienceBlueprintPlan,
  ConceptScore,
  ExperienceDesign,
} from './types.js';
import { generateCandidateConcepts } from './candidates.js';

// ─── Business Knowledge (input) ─────────────────────────────────────

interface BusinessKnowledge {
  industry: string;
  capabilities: CapabilityId[];
  entities: string[];
  description?: string;
}

// ─── Scoring weights ────────────────────────────────────────────────

const SCORING_WEIGHTS = {
  narrativeFit: 0.15,
  capabilityFit: 0.30,
  conversionPotential: 0.15,
  emotionalResonance: 0.15,
  performanceFeasibility: 0.10,
  audienceMatch: 0.15,
};

// Industry categories that boost specific experience styles
const INDUSTRY_STYLE_BOOSTS: Record<string, ExperienceConcept['style'][]> = {
  'headphones': ['immersive-3d', 'cinematic'],
  'audio': ['immersive-3d', 'cinematic'],
  'fashion': ['cinematic', 'minimal-luxe'],
  'luxury': ['minimal-luxe', 'cinematic'],
  'beauty': ['cinematic', 'dynamic'],
  'food': ['editorial', 'cinematic'],
  'restaurant': ['editorial', 'cinematic'],
  'saas': ['conversion', 'editorial'],
  'crm': ['conversion', 'editorial'],
  'erp': ['conversion', 'editorial'],
  'healthcare': ['editorial', 'minimal-luxe'],
  'marketplace': ['dynamic', 'conversion'],
  'footwear': ['dynamic', 'immersive-3d'],
  'manufacturing': ['conversion', 'editorial'],
};

const MIN_CONFIDENCE = 0.55;

// ─── Score a single candidate ───────────────────────────────────────

function scoreCandidate(
  concept: ExperienceConcept,
  bk: BusinessKnowledge,
): ConceptScore {
  const caps = new Set(bk.capabilities);
  const conceptCaps = new Set(concept.requiredCapabilities);

  // Capability fit: what fraction of required caps exist in the build?
  const capabilityFit = conceptCaps.size === 0
    ? 0.5
    : [...conceptCaps].filter(c => caps.has(c)).length / conceptCaps.size;

  // Narrative fit: emotional arc length vs entity count (complexity match)
  const narrativeFit = Math.min(1,
    (concept.emotionalArc.length / 6) * // 6-step arc is ideal
    (bk.entities.length > 0 ? 1 : 0.7)  // entities = story material
  );

  // Conversion potential: based on conversion strategy quality + CTA clarity
  const conversionPotential = concept.conversionStrategy.includes('trust')
    ? 0.9
    : concept.conversionStrategy.includes('action')
      ? 0.85
      : concept.conversionStrategy.includes('education')
        ? 0.75
        : 0.7;

  // Emotional resonance: based on arc length and motion principle count
  const emotionalResonance = Math.min(1,
    (concept.emotionalArc.length * 0.12) +
    (concept.motionPrinciples.length * 0.05)
  );

  // Performance feasibility: lighter = more feasible
  const performanceFeasibility =
    concept.performanceProfile === 'light' ? 1.0 :
    concept.performanceProfile === 'standard' ? 0.85 :
    concept.performanceProfile === 'heavy' ? 0.65 : 0.5;

  // Audience match: industry keywords vs audience hints + style boost
  const rawAudience = computeAudienceFit(bk.industry, concept.audienceAlignment);
  const industryBoosts = Object.entries(INDUSTRY_STYLE_BOOSTS)
    .filter(([key]) => bk.industry.toLowerCase().includes(key))
    .flatMap(([, styles]) => styles);
  const styleBoost = industryBoosts.includes(concept.style) ? 0.3 : 0;
  const audienceMatch = Math.min(1, rawAudience + styleBoost);

  // Composite
  const overallScore =
    narrativeFit * SCORING_WEIGHTS.narrativeFit +
    capabilityFit * SCORING_WEIGHTS.capabilityFit +
    conversionPotential * SCORING_WEIGHTS.conversionPotential +
    emotionalResonance * SCORING_WEIGHTS.emotionalResonance +
    performanceFeasibility * SCORING_WEIGHTS.performanceFeasibility +
    audienceMatch * SCORING_WEIGHTS.audienceMatch;

  return {
    conceptId: concept.id,
    overallScore: Math.round(overallScore * 100),
    dimensionScores: {
      narrativeFit: Math.round(narrativeFit * 100),
      capabilityFit: Math.round(capabilityFit * 100),
      conversionPotential: Math.round(conversionPotential * 100),
      emotionalResonance: Math.round(emotionalResonance * 100),
      performanceFeasibility: Math.round(performanceFeasibility * 100),
      audienceMatch: Math.round(audienceMatch * 100),
    },
  };
}

function computeAudienceFit(industry: string, audienceHints: string[]): number {
  const ind = industry.toLowerCase();
  const terms = ind.split(/[\s-_]+/);
  let hits = 0;
  for (const hint of audienceHints) {
    for (const t of terms) {
      if (hint.toLowerCase().includes(t) || t.includes(hint.toLowerCase())) hits++;
    }
  }
  return Math.min(1, hits / Math.max(1, audienceHints.length));
}

// ─── Build the blueprint plan from a selected concept ───────────────

function buildBlueprintPlan(
  concept: ExperienceConcept,
  score: ConceptScore,
  bk: BusinessKnowledge,
): ExperienceBlueprintPlan {
  const sections = concept.emotionalArc.map((emotion, i) => ({
    name: `Section ${i + 1}`,
    emotion,
    motionType: concept.motionPrinciples[i % concept.motionPrinciples.length],
    conversionRole: i === concept.emotionalArc.length - 1 ? 'primary-cta' : 'engagement',
  }));

  const threeJsRequired = concept.style === 'immersive-3d' || concept.style === 'cinematic';
  const gsapRequired = concept.performanceProfile === 'cinematic' || concept.performanceProfile === 'heavy';

  return {
    concept,
    score,
    sections,
    motionScript: `A ${concept.style} experience where the visitor ${concept.emotionalArc.join(' → ')}. ` +
      `${concept.conversionStrategy} ` +
      `Motion: ${concept.motionPrinciples.join(', ')}.`,
    performanceBudget: {
      maxAnimatedElements: concept.performanceProfile === 'light' ? 10 :
        concept.performanceProfile === 'standard' ? 25 :
          concept.performanceProfile === 'heavy' ? 50 : 80,
      targetFrameRate: concept.performanceProfile === 'cinematic' ? 30 : 60,
      lazyLoadStrategy: concept.performanceProfile === 'heavy' || concept.performanceProfile === 'cinematic'
        ? 'aggressive-intersection' : 'standard',
    },
    rendererHints: {
      framework: 'react',
      threeJsRequired,
      gsapRequired,
      lottieOpportunities: concept.motionPrinciples.filter(p =>
        p.includes('micro') || p.includes('reveal') || p.includes('typography')
      ),
    },
  };
}

// ─── Public API ─────────────────────────────────────────────────────

export interface ExperienceDirectorOptions {
  minConfidence?: number;
  maxCandidates?: number;
}

/**
 * The Experience Director: scores experience concepts and selects the best one.
 */
export function directExperience(
  bk: BusinessKnowledge,
  opts: ExperienceDirectorOptions = {},
): ExperienceDesign {
  const minConfidence = opts.minConfidence ?? MIN_CONFIDENCE;
  const maxCandidates = opts.maxCandidates ?? 6;

  // 1. Generate candidates
  const allCandidates = generateCandidateConcepts(bk).slice(0, maxCandidates);

  // 2. Score each candidate
  const scoredCandidates = allCandidates.map(c => scoreCandidate(c, bk));

  // 3. Sort by overall score descending
  scoredCandidates.sort((a, b) => b.overallScore - a.overallScore);

  // 4. Select the best (if above threshold)
  const best = scoredCandidates[0];
  const bestConcept = allCandidates.find(c => c.id === best.conceptId);

  if (!best || best.overallScore < minConfidence * 100 || !bestConcept) {
    return {
      selectedBlueprint: null,
      scoredCandidates,
      allCandidates,
      reasoning: best
        ? `Best candidate '${best.conceptId}' scored ${best.overallScore}/100 (below ${minConfidence * 100} threshold). No concept meets the confidence bar for this business.`
        : 'No candidates generated.',
      experienceProfile: {},
    };
  }

  // 5. Build the blueprint plan
  const selectedBlueprint = buildBlueprintPlan(bestConcept, best, bk);

  // 6. Reasoning
  const runner = scoredCandidates[1];
  const runnerConcept = runner ? allCandidates.find(c => c.id === runner.conceptId) : null;
  const reasoning = [
    `Selected '${bestConcept.name}' (${best.overallScore}/100) over '${runnerConcept?.name ?? 'none'}' (${runner?.overallScore ?? 0}/100).`,
    `Capability fit: ${best.dimensionScores.capabilityFit}%. Narrative fit: ${best.dimensionScores.narrativeFit}%.`,
    `Conversion: ${best.dimensionScores.conversionPotential}%. Performance: ${best.dimensionScores.performanceFeasibility}%.`,
    `${selectedBlueprint.motionScript}`,
  ].join(' ');

  // 7. Experience profile for downstream consumption
  const experienceProfile = {
    style: bestConcept.style,
    emotionalArc: bestConcept.emotionalArc,
    motionPrinciples: bestConcept.motionPrinciples,
    conversionStrategy: bestConcept.conversionStrategy,
    performanceProfile: bestConcept.performanceProfile,
  };

  return {
    selectedBlueprint,
    scoredCandidates,
    allCandidates,
    reasoning,
    experienceProfile,
  };
}
