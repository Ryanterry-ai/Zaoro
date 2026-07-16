// ─── Experience Reasoning Engine (XRE) ─────────────────────────────
// Sits between the Semantic Primitive Graph and the Creative Director.
//
// Intent Graph (from BRE v2 + Primitive Conflict Resolver)
//        ↓
// Experience Reasoning Engine
//        ↓
// Candidate Experience Plans (5–10)
//        ↓
// Score each plan on 8 dimensions:
//   - Emotion fit        (does it evoke the right emotions?)
//   - Business fit       (does it serve the business goals?)
//   - Conversion potential (will it drive action?)
//   - Accessibility      (is it usable by everyone?)
//   - Performance budget (can it hit 60fps?)
//   - Novelty            (is it fresh, not generic?)
//   - Brand consistency  (does it match the primitive set?)
//   - Implementation cost (how expensive to build?)
//        ↓
// Winner
//        ↓
// Creative Director → CompiledExperience
//
// NO industry logic.  NO hardcoded decision trees.  Everything is scored
// on universal dimensions derived from the primitive graph.

import type { PrimitiveSet, ResolvedPrimitive } from '../primitives/types.js';
import { scoreConsistency, isCoherent } from '../primitives/scoring.js';
import { buildGrammar } from './grammar.js';
import type { ExperienceGrammar } from './grammar.js';
import type { ExperienceConcept } from './types.js';
import { generateCandidateConcepts } from './candidates.js';
import type { CompiledExperience, CompiledSection, UniversalSectionRole } from './compiled.js';

// ─── Inputs ─────────────────────────────────────────────────────────

export interface XREInput {
  /** Resolved primitive set (from Conflict Resolver). */
  primitiveSet: PrimitiveSet;
  /** Business capabilities (universal). */
  capabilities: string[];
  /** Business entities (universal). */
  entities: string[];
  /** Business description. */
  description?: string;
  /** Max candidate plans to generate. */
  maxPlans?: number;
  /** Renderer target. */
  rendererTarget?: CompiledExperience['rendererTarget'];
  /** Experience themes detected from prompt narrative/scroll cues
   *  (e.g. transformation, scroll-journey, sound-to-silence). Boosts matching
   *  candidate concepts during scoring — primitive-based, no vertical lookup. */
  experienceThemes?: string[];
}

// ─── Scoring Dimensions ─────────────────────────────────────────────

export interface XREScoreDimension {
  name: string;
  score: number; // 0–1
  weight: number; // contribution to final
  reasoning: string;
}

export interface XREPlanScore {
  conceptId: string;
  conceptName: string;
  dimensions: XREScoreDimension[];
  overallScore: number; // 0–100
  coherent: boolean;
  rejectionReason?: string;
}

// ─── Scoring Weights (universal, not industry-specific) ────────────

const XRE_WEIGHTS = {
  emotionFit: 0.15,
  businessFit: 0.15,
  conversionPotential: 0.15,
  accessibility: 0.10,
  performanceBudget: 0.10,
  novelty: 0.05,
  themeFit: 0.10,
  brandConsistency: 0.15,
  implementationCost: 0.05,
};

// ─── Dimension Scoring Functions ───────────────────────────────────

/**
 * Emotion fit: how well the concept's emotional arc matches the
 * business's emotional primitives (from the primitive set).
 */
function scoreEmotionFit(
  concept: ExperienceConcept,
  primitiveSet: PrimitiveSet,
): XREScoreDimension {
  const emotionPrimitives = new Set(
    primitiveSet.primitives
      .filter(p => ['confidence', 'calm', 'energy', 'desire', 'trust', 'curiosity', 'exclusivity'].includes(p.primitive.id))
      .map(p => p.primitive.id)
  );

  const arcSet = new Set(concept.emotionalArc);
  let overlap = 0;
  for (const e of emotionPrimitives) {
    if (arcSet.has(e)) overlap++;
  }
  const score = emotionPrimitives.size === 0 ? 0.5 : overlap / emotionPrimitives.size;

  return {
    name: 'emotionFit',
    score: Math.round(score * 100) / 100,
    weight: XRE_WEIGHTS.emotionFit,
    reasoning: `Concept arc covers ${overlap}/${emotionPrimitives.size} emotional primitives in the set`,
  };
}

/**
 * Business fit: how well the concept's required capabilities match
 * what the business actually has.
 */
function scoreBusinessFit(
  concept: ExperienceConcept,
  capabilities: string[],
): XREScoreDimension {
  const caps = new Set(capabilities);
  const required = concept.requiredCapabilities;
  const score = required.length === 0
    ? 0.6
    : [...required].filter(c => caps.has(c)).length / required.length;

  return {
    name: 'businessFit',
    score: Math.round(score * 100) / 100,
    weight: XRE_WEIGHTS.businessFit,
    reasoning: `${[...required].filter(c => caps.has(c)).length}/${required.length} required capabilities present`,
  };
}

/**
 * Conversion potential: derived from conversion strategy quality and
 * the presence of conversion-oriented primitives in the set.
 */
function scoreConversionPotential(
  concept: ExperienceConcept,
  primitiveSet: PrimitiveSet,
): XREScoreDimension {
  const conversionPrimitives = new Set(['urgency', 'social-proof', 'trust', 'efficiency']);
  const present = primitiveSet.primitives.filter(p => conversionPrimitives.has(p.primitive.id)).length;

  const strategyScore = concept.conversionStrategy.includes('trust') ? 0.9 :
                        concept.conversionStrategy.includes('action') ? 0.85 :
                        concept.conversionStrategy.includes('education') ? 0.75 : 0.7;

  const score = Math.min(1, strategyScore * 0.7 + (present / 4) * 0.3);

  return {
    name: 'conversionPotential',
    score: Math.round(score * 100) / 100,
    weight: XRE_WEIGHTS.conversionPotential,
    reasoning: `Strategy=${strategyScore.toFixed(2)}, ${present} conversion primitives present`,
  };
}

/**
 * Accessibility: lighter concepts are more accessible (less motion = better
 * for reduced-motion users, cognitive load).  This is a universal concern.
 */
function scoreAccessibility(concept: ExperienceConcept): XREScoreDimension {
  const score = concept.performanceProfile === 'light' ? 0.95 :
                concept.performanceProfile === 'standard' ? 0.85 :
                concept.performanceProfile === 'heavy' ? 0.65 : 0.55;

  return {
    name: 'accessibility',
    score,
    weight: XRE_WEIGHTS.accessibility,
    reasoning: `Performance profile ${concept.performanceProfile} → accessibility ${score}`,
  };
}

/**
 * Performance budget: can it hit 60fps given the primitive weights?
 * Heavy motion primitives + heavy performance profile = risky.
 */
function scorePerformanceBudget(
  concept: ExperienceConcept,
  primitiveSet: PrimitiveSet,
): XREScoreDimension {
  const motionWeight = primitiveSet.primitives
    .filter(p => ['energy', 'movement', 'speed', 'neon'].includes(p.primitive.id))
    .reduce((s, p) => s + p.resolvedWeight, 0);

  const profileScore = concept.performanceProfile === 'light' ? 1.0 :
                       concept.performanceProfile === 'standard' ? 0.85 :
                       concept.performanceProfile === 'heavy' ? 0.65 : 0.5;

  // Penalize if motion weight is high but profile is light (mismatch)
  const mismatchPenalty = (motionWeight > 0.6 && concept.performanceProfile === 'light') ? 0.2 : 0;
  const score = Math.max(0, profileScore - mismatchPenalty);

  return {
    name: 'performanceBudget',
    score: Math.round(score * 100) / 100,
    weight: XRE_WEIGHTS.performanceBudget,
    reasoning: `Motion weight=${motionWeight.toFixed(2)}, profile=${concept.performanceProfile}`,
  };
}

/**
 * Novelty: how different is this concept from generic defaults?
 * Concepts with high implied primitive overlap with the set are
 * "expected" — moderate novelty.  Completely off-concept = high novelty
 * but low fit.  We reward the sweet spot.
 */
function scoreNovelty(
  concept: ExperienceConcept,
  primitiveSet: PrimitiveSet,
): XREScoreDimension {
  const implied = new Set(concept.impliedPrimitives);
  const setIds = new Set(primitiveSet.primitives.map(p => p.primitive.id));
  const overlap = [...implied].filter(p => setIds.has(p)).length / Math.max(1, implied.size);

  // Sweet spot: 0.4–0.7 overlap = novel but coherent
  const score = overlap < 0.3 ? 0.9 : overlap > 0.8 ? 0.4 : 0.7;

  return {
    name: 'novelty',
    score: Math.round(score * 100) / 100,
    weight: XRE_WEIGHTS.novelty,
    reasoning: `Primitive overlap=${overlap.toFixed(2)} → novelty ${score}`,
  };
}

/**
 * Theme fit: how well a concept matches the experience themes detected from
 * the prompt (transformation, scroll-journey, sound-to-silence, immersive).
 * Pure primitive/audience-hint overlap — no vertical lookup. When no themes
 * are present this returns a neutral 0.5 so it never penalises generic briefs.
 */
function scoreThemeFit(
  concept: ExperienceConcept,
  experienceThemes: string[] | undefined,
): XREScoreDimension {
  if (!experienceThemes || experienceThemes.length === 0) {
    return {
      name: 'themeFit',
      score: 0.5,
      weight: XRE_WEIGHTS.themeFit,
      reasoning: 'No experience themes detected — neutral',
    };
  }
  const themes = new Set(experienceThemes);
  const hints = new Set([...concept.audienceAlignment, ...concept.impliedPrimitives]);
  const overlap = [...themes].filter(t => hints.has(t)).length / themes.size;
  const score = 0.5 + 0.5 * overlap; // 0.5 neutral → 1.0 full match
  return {
    name: 'themeFit',
    score: Math.round(score * 100) / 100,
    weight: XRE_WEIGHTS.themeFit,
    reasoning: `Theme overlap ${overlap}/${themes.size} (matched: ${[...themes].filter(t => hints.has(t)).join(', ') || 'none'})`,
  };
}

/**
 * Brand consistency: how well the concept aligns with the primitive set's
 * overall character.  Uses primitive consistency scoring.
 */
function scoreBrandConsistency(
  concept: ExperienceConcept,
  primitiveSet: PrimitiveSet,
): XREScoreDimension {
  const consistency = scoreConsistency(primitiveSet);
  const score = consistency.overall;

  return {
    name: 'brandConsistency',
    score: Math.round(score * 100) / 100,
    weight: XRE_WEIGHTS.brandConsistency,
    reasoning: `Primitive consistency=${score.toFixed(2)} (conflicts=${consistency.conflictCount})`,
  };
}

/**
 * Implementation cost: lighter profiles + fewer required capabilities =
 * cheaper to build.  Universal concern, not industry-specific.
 */
function scoreImplementationCost(concept: ExperienceConcept): XREScoreDimension {
  const profileCost = concept.performanceProfile === 'light' ? 0.9 :
                      concept.performanceProfile === 'standard' ? 0.7 :
                      concept.performanceProfile === 'heavy' ? 0.4 : 0.3;

  const capCost = Math.max(0.3, 1 - concept.requiredCapabilities.length * 0.1);

  const score = Math.min(1, (profileCost + capCost) / 2);

  return {
    name: 'implementationCost',
    score: Math.round(score * 100) / 100,
    weight: XRE_WEIGHTS.implementationCost,
    reasoning: `Profile=${concept.performanceProfile}, caps=${concept.requiredCapabilities.length}`,
  };
}

// ─── Plan Generation ────────────────────────────────────────────────

/**
 * Generate candidate experience plans and score each on 8 dimensions.
 */
export function reasonExperience(input: XREInput): {
  plans: XREPlanScore[];
  selected: XREPlanScore | null;
  reasoning: string[];
} {
  const maxPlans = input.maxPlans ?? 6;
  const reasoning: string[] = [];

  // 1. Generate candidates (universal — no industry)
  const candidates = generateCandidateConcepts({
    capabilities: input.capabilities as any,
    entities: input.entities,
    description: input.description,
  }).slice(0, maxPlans);

  // 2. Check coherence of the primitive set
  const consistency = scoreConsistency(input.primitiveSet);
  const coherenceCheck = isCoherent(consistency);

  if (!coherenceCheck.coherent) {
    reasoning.push(`Primitive set incoherent: ${coherenceCheck.reasons.join('; ')}`);
    reasoning.push('Some candidate plans may be rejected for incoherence.');
  }

  // 3. Score each candidate plan
  const plans: XREPlanScore[] = candidates.map(concept => {
    const dimensions: XREScoreDimension[] = [
      scoreEmotionFit(concept, input.primitiveSet),
      scoreBusinessFit(concept, input.capabilities),
      scoreConversionPotential(concept, input.primitiveSet),
      scoreAccessibility(concept),
      scorePerformanceBudget(concept, input.primitiveSet),
      scoreNovelty(concept, input.primitiveSet),
      scoreThemeFit(concept, input.experienceThemes),
      scoreBrandConsistency(concept, input.primitiveSet),
      scoreImplementationCost(concept),
    ];

    const overall = dimensions.reduce((s, d) => s + d.score * d.weight, 0);
    const coherent = isCoherent(consistency).coherent;

    // Theme-decisiveness: when a concept fully embodies every detected
    // experience theme (themeFit === 1.0), it was purpose-built for exactly
    // this prompt's expressed intent. Give it a decisive bonus so a generic,
    // lower-cost concept cannot win over the semantically-correct one. This is
    // theme-driven, never industry-driven.
    const themeDim = dimensions.find(d => d.name === 'themeFit');
    const fullThemeMatch = themeDim && input.experienceThemes && input.experienceThemes.length > 0 && themeDim.score >= 1.0;
    const bonus = fullThemeMatch ? 0.18 : 0;
    const overallScore = Math.round((overall + bonus) * 100);

    const plan: XREPlanScore = {
      conceptId: concept.id,
      conceptName: concept.name,
      dimensions,
      overallScore,
      coherent,
    };

    if (!coherent) {
      plan.rejectionReason = `Incoherent primitive set: ${coherenceCheck.reasons.join('; ')}`;
    }

    return plan;
  });

  // 4. Sort by overall score
  plans.sort((a, b) => b.overallScore - a.overallScore);

  // 5. Select the best (prefer coherent)
  const coherentPlans = plans.filter(p => p.coherent);
  const selected = coherentPlans[0] ?? plans[0] ?? null;

  reasoning.push(`Generated ${plans.length} candidate plans.`);
  if (selected) {
    reasoning.push(`Selected '${selected.conceptName}' (${selected.overallScore}/100).`);
    reasoning.push(`Runner-up: '${plans[1]?.conceptName ?? 'none'}' (${plans[1]?.overallScore ?? 0}/100).`);
  }

  return { plans, selected, reasoning };
}

// ─── Creative Director (CompiledExperience builder) ────────────────

/**
 * The Creative Director takes the selected plan and produces a
 * CompiledExperience — the universal, renderer-consumable output.
 *
 * The renderer NEVER decides anything.  It only translates this.
 */
export function compileExperience(
  input: XREInput,
  selectedPlan: XREPlanScore,
  candidates: ExperienceConcept[],
): CompiledExperience {
  const concept = candidates.find(c => c.id === selectedPlan.conceptId)!;
  const primitiveWeights: Record<string, number> = {};
  for (const p of input.primitiveSet.primitives) {
    primitiveWeights[p.primitive.id] = p.resolvedWeight;
  }

  const grammar: ExperienceGrammar = buildGrammar({
    primitiveWeights,
    emotionalArc: concept.emotionalArc,
  });

  // Universal section flow — NOT industry-specific
  const sectionRoles: UniversalSectionRole[] = ['hook', 'problem', 'solution', 'proof', 'interaction', 'conversion'];
  const sections: CompiledSection[] = sectionRoles.map((role, i) => ({
    role,
    emotion: concept.emotionalArc[i] ?? concept.emotionalArc[concept.emotionalArc.length - 1],
    grammar: { ...grammar },
    primitives: input.primitiveSet.primitives.slice(0, 3).map(p => p.primitive.id),
    contentIntent: roleToContentIntent(role),
    conversionRole: role === 'conversion' ? 'action' :
                    role === 'proof' ? 'desire' :
                    role === 'solution' ? 'interest' : 'awareness',
  }));

  // Derive motion/camera/typography languages from primitives (reusable)
  const motionLanguage = deriveMotionLanguage(primitiveWeights);
  const cameraLanguage = deriveCameraLanguage(primitiveWeights);
  const typographyPersonality = deriveTypographyPersonality(primitiveWeights);

  const coherence = scoreConsistency(input.primitiveSet).overall;

  // Scroll-driven: a transformation/scroll-journey concept or theme means the
  // renderer must emit scroll-linked animation rather than static reveals.
  const scrollThemes = new Set(input.experienceThemes ?? []);
  const isScrollDriven = concept.style === 'cinematic' || concept.pageLayout === 'single-scroll' ||
    scrollThemes.has('scroll-journey') || scrollThemes.has('transformation') ||
    concept.impliedPrimitives.includes('scroll-journey') || concept.impliedPrimitives.includes('transformation');
  const scrollTriggers = isScrollDriven ? buildScrollTriggers(concept) : undefined;

  const rejected = candidates
    .filter(c => c.id !== selectedPlan.conceptId)
    .map(c => ({ id: c.id, reason: 'Lower overall XRE score' }));

  return {
    conceptId: concept.id,
    conceptName: concept.name,
    grammar,
    primitives: input.primitiveSet.primitives,
    sections,
    coherence,
    rendererTarget: input.rendererTarget ?? 'react',
    motionLanguage,
    scrollDriven: isScrollDriven || undefined,
    scrollTriggers,
    cameraLanguage,
    typographyPersonality,
    reasoning: selectedPlan.dimensions.map(d => `${d.name}: ${d.score} (${d.reasoning})`),
    provenance: {
      primitiveSetHash: hashObject(input.primitiveSet),
      grammarHash: hashObject(grammar),
      coherenceScore: coherence,
      rejectedConcepts: rejected,
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Build scroll-linked animation specs for a scroll-driven concept. Universal
 * mapping from section roles to scroll ranges — the renderer translates these
 * into scroll listeners. For a transformation concept (e.g. soundwave →
 * silence) the arcs move from turbulence (high motion) to stillness.
 */
function buildScrollTriggers(concept: ExperienceConcept): CompiledExperience['scrollTriggers'] {
  const transformation = concept.impliedPrimitives.includes('transformation') ||
    concept.impliedPrimitives.includes('sound-to-silence');
  if (transformation) {
    return [
      { selector: '.hero', property: 'opacity', scrollRange: [0, 0.2], outputRange: [0, 1], easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      { selector: '.hero .soundwave', property: 'scale', scrollRange: [0, 0.35], outputRange: [1, 2.4], easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      { selector: '.chaos', property: 'blur', scrollRange: [0.1, 0.4], outputRange: [0, 8], easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      { selector: '.transformation', property: 'opacity', scrollRange: [0.35, 0.65], outputRange: [0, 1], easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      { selector: '.calm', property: 'opacity', scrollRange: [0.6, 0.9], outputRange: [0, 1], easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      { selector: '.calm .soundwave', property: 'scale', scrollRange: [0.6, 1], outputRange: [2.4, 0.2], easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      { selector: '.cta', property: 'scale', scrollRange: [0.85, 1], outputRange: [0.96, 1], easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    ];
  }
  return [
    { selector: '.hero', property: 'translateY', scrollRange: [0, 0.3], outputRange: [80, 0], easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    { selector: '.section', property: 'opacity', scrollRange: [0.2, 0.9], outputRange: [0, 1], easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    { selector: '.cta', property: 'scale', scrollRange: [0.85, 1], outputRange: [0.96, 1], easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  ];
}

function roleToContentIntent(role: UniversalSectionRole): string {
  switch (role) {
    case 'hook': return 'hero-statement';
    case 'problem': return 'pain-point';
    case 'solution': return 'offering-showcase';
    case 'proof': return 'evidence-social-proof';
    case 'interaction': return 'try-configure';
    case 'conversion': return 'primary-cta';
  }
}

function deriveMotionLanguage(w: Record<string, number>): CompiledExperience['motionLanguage'] {
  if ((w['craftsmanship'] ?? 0) > 0.6) return 'elegant';
  if ((w['precision'] ?? 0) > 0.6) return 'precise';
  if ((w['energy'] ?? 0) > 0.6) return 'aggressive';
  if ((w['playful'] ?? 0) > 0.6) return 'playful';
  if ((w['calm'] ?? 0) > 0.6) return 'calm';
  if ((w['luxury'] ?? 0) > 0.6) return 'luxury';
  if ((w['innovation'] ?? 0) > 0.6) return 'scientific';
  if ((w['organic'] ?? 0) > 0.6 || (w['warm-palette'] ?? 0) > 0.6) return 'organic';
  return 'mechanical';
}

function deriveCameraLanguage(w: Record<string, number>): CompiledExperience['cameraLanguage'] {
  if ((w['craftsmanship'] ?? 0) > 0.6) return 'macro';
  if ((w['future'] ?? 0) > 0.6) return 'orbit';
  if ((w['energy'] ?? 0) > 0.6) return 'tracking';
  if ((w['desire'] ?? 0) > 0.6) return 'close-up';
  if ((w['minimalism'] ?? 0) > 0.6) return 'wide';
  if ((w['cinematic'] ?? 0) > 0.6) return 'push';
  if ((w['curiosity'] ?? 0) > 0.6) return 'pull';
  if ((w['narrative'] ?? 0) > 0.6) return 'parallax';
  return 'rack-focus';
}

function deriveTypographyPersonality(w: Record<string, number>): CompiledExperience['typographyPersonality'] {
  if ((w['luxury'] ?? 0) > 0.6) return 'luxury';
  if ((w['calm'] ?? 0) > 0.6 || (w['warm-palette'] ?? 0) > 0.6) return 'friendly';
  if ((w['precision'] ?? 0) > 0.6 || (w['innovation'] ?? 0) > 0.6) return 'technical';
  if ((w['narrative'] ?? 0) > 0.6 || (w['typography'] ?? 0) > 0.6) return 'editorial';
  if ((w['playful'] ?? 0) > 0.6) return 'playful';
  if ((w['confidence'] ?? 0) > 0.6) return 'corporate';
  if ((w['neon'] ?? 0) > 0.6 || (w['energy'] ?? 0) > 0.6) return 'experimental';
  return 'friendly';
}

function hashObject(obj: unknown): string {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return (hash >>> 0).toString(16);
}
