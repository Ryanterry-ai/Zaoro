// ─── Experience Strategy Engine ─────────────────────────────────────────────
//
// The TOP-LEVEL decision maker for the entire experience.
// Replaces the linear 14-step pipeline with strategic decision-making.
//
// Flow:
//   BusinessKnowledge
//     → ExperienceStrategy (strategic decisions)
//       → ExperienceGraph (adaptive flow)
//         → Scene selections (from library)
//           → ExperienceBlueprint v2 (canonical artifact)
//
// This engine decides:
//   - Narrative arc (how the story unfolds)
//   - Conversion strategy (how users are guided to act)
//   - Emotional journey (target emotional states)
//   - Pacing strategy (rhythm and tempo)
//   - Content density (how much content per section)
//   - Performance budget (animation limits)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ExperienceStrategy,
  NarrativeArc,
  ConversionStrategy,
  EmotionalJourney,
  PacingStrategy,
  DensityStrategy,
  PerformanceBudgetV2,
  ExperienceStyle,
  EmotionalJourneyPoint,
  PausePoint,
  TrustSignal,
  BeatType,
  EmotionTarget,
} from './types.js';
import type { Industry } from '../types.js';

// ─── Strategy Engine ────────────────────────────────────────────────────────

export interface StrategyEngineInput {
  industry: Industry;
  subIndustry?: string;
  pageType: string;
  sections: string[];
  personality?: string;
  businessGoal?: string;
  targetAudience?: string;
}

/**
 * Experience Strategy Engine — the top-level decision maker.
 * Produces an ExperienceStrategy from business context.
 */
export class ExperienceStrategyEngine {
  /**
   * Generate an experience strategy from business context.
   */
  generate(input: StrategyEngineInput): ExperienceStrategy {
    const style = this.determineStyle(input);
    const narrativeArc = this.determineNarrativeArc(input);
    const conversionStrategy = this.determineConversionStrategy(input);
    const emotionalJourney = this.determineEmotionalJourney(input, narrativeArc);
    const pacingStrategy = this.determinePacingStrategy(input, style);
    const densityStrategy = this.determineDensityStrategy(input, style);
    const performanceBudget = this.determinePerformanceBudget(input);

    return {
      id: `strategy-${Date.now()}`,
      industry: input.industry,
      subIndustry: input.subIndustry,
      style,
      narrativeArc,
      conversionStrategy,
      emotionalJourney,
      pacingStrategy,
      densityStrategy,
      performanceBudget,
      reasoning: this.buildReasoning(input, style, narrativeArc, conversionStrategy),
    };
  }

  // ─── Style Determination ──────────────────────────────────────────────

  private determineStyle(input: StrategyEngineInput): ExperienceStyle {
    const industry = input.industry;
    const personality = input.personality?.toLowerCase() ?? '';

    // Industry-based defaults
    const industryStyles: Record<string, ExperienceStyle> = {
      'saas': 'premium',
      'fintech': 'enterprise',
      'healthcare': 'minimal',
      'education': 'storytelling',
      'restaurant': 'editorial',
      'fitness': 'premium',
      'real-estate': 'luxury',
      'media': 'editorial',
      'portfolio': 'cinematic',
      'marketplace': 'premium',
      'nonprofit': 'storytelling',
      'ecommerce': 'premium',
      'luxury': 'luxury',
      'perfume': 'luxury',
      'fragrance': 'luxury',
      'beauty': 'luxury',
    };

    let style = industryStyles[industry] ?? 'premium';

    // Personality overrides
    if (personality.includes('playful') || personality.includes('fun')) style = 'playful';
    if (personality.includes('minimal') || personality.includes('clean')) style = 'minimal';
    if (personality.includes('luxury') || personality.includes('premium')) style = 'luxury';
    if (personality.includes('bold') || personality.includes('brutal')) style = 'brutalist';
    if (personality.includes('tech') || personality.includes('modern')) style = 'futuristic';
    if (personality.includes('organic') || personality.includes('natural')) style = 'organic';
    if (personality.includes('editorial') || personality.includes('magazine')) style = 'editorial';
    if (personality.includes('cinematic') || personality.includes('film')) style = 'cinematic';
    if (personality.includes('enterprise') || personality.includes('corporate')) style = 'enterprise';

    return style;
  }

  // ─── Narrative Arc ────────────────────────────────────────────────────

  private determineNarrativeArc(input: StrategyEngineInput): NarrativeArc {
    const industry = input.industry;
    const sections = input.sections;

    // Determine arc type based on industry and sections
    let arcType: NarrativeArc['type'] = 'hook-problem-solution';
    let emotionalArc: NarrativeArc['emotionalArc'] = 'rising';
    let actCount = 3;

    if (input.pageType === 'landing' || input.pageType === 'home') {
      if (sections.includes('testimonial') || sections.includes('case-study')) {
        arcType = 'authority';
        emotionalArc = 'bell';
      } else       if (sections.includes('process') || sections.includes('how-it-works')) {
        arcType = 'progressive';
        emotionalArc = 'rising';
      } else if (industry === 'luxury' || industry === 'perfume') {
        arcType = 'emotional';
        emotionalArc = 'climactic';
        actCount = 4;
      } else {
        arcType = 'hook-problem-solution';
        emotionalArc = 'rising';
      }
    } else if (input.pageType === 'about') {
      arcType = 'storytelling';
      emotionalArc = 'wave';
      actCount = 4;
    } else if (input.pageType === 'product' || input.pageType === 'properties') {
      arcType = 'progressive';
      emotionalArc = 'rising';
    }

    return {
      type: arcType,
      emotionalArc,
      actCount,
      beatPattern: {
        beatsPerAct: actCount <= 3 ? 3 : 2,
        allowedBeatTypes: this.getBeatTypesForArc(arcType),
        maxBeatDurationMs: 8000,
      },
    };
  }

  private getBeatTypesForArc(arcType: string): BeatType[] {
    const base: BeatType[] = ['hook', 'transition'];
    switch (arcType) {
      case 'hook-problem-solution':
        return [...base, 'problem', 'agitation', 'insight', 'solution', 'proof', 'cta'];
      case 'storytelling':
        return [...base, 'problem', 'insight', 'transformation', 'resolution', 'reflection'];
      case 'progressive':
        return [...base, 'benefits', 'proof', 'trust', 'offer', 'cta'];
      case 'emotional':
        return [...base, 'agitation', 'transformation', 'climax', 'resolution', 'cta'];
      case 'proof-driven':
        return [...base, 'proof', 'trust', 'social-proof', 'transformation', 'cta'];
      default:
        return [...base, 'problem', 'solution', 'proof', 'cta'];
    }
  }

  // ─── Conversion Strategy ──────────────────────────────────────────────

  private determineConversionStrategy(input: StrategyEngineInput): ConversionStrategy {
    const industry = input.industry;
    const goal = input.businessGoal?.toLowerCase() ?? '';

    // Determine primary goal
    let primaryGoal: ConversionStrategy['primaryGoal'] = 'signup';
    if (goal.includes('purchase') || goal.includes('buy') || goal.includes('shop')) primaryGoal = 'purchase';
    if (goal.includes('contact') || goal.includes('inquiry') || goal.includes('reach')) primaryGoal = 'contact';
    if (goal.includes('book') || goal.includes('reserve') || goal.includes('appointment')) primaryGoal = 'booking';
    if (goal.includes('download') || goal.includes('get')) primaryGoal = 'download';
    if (goal.includes('demo') || goal.includes('trial')) primaryGoal = 'demo';
    if (goal.includes('subscribe') || goal.includes('newsletter')) primaryGoal = 'subscription';

    // Industry-based adjustments
    if (industry === 'healthcare' || industry === 'real-estate') {
      primaryGoal = 'contact';
    }
    if (industry === 'saas' || industry === 'fintech') {
      primaryGoal = goal.includes('demo') ? 'demo' : 'trial';
    }
    if (industry === 'ecommerce') {
      primaryGoal = 'purchase';
    }

    // Trust signals based on industry
    const trustSignals: TrustSignal[] = ['testimonials', 'social-proof-numbers'];
    if (industry === 'healthcare') trustSignals.push('certifications', 'security-badges');
    if (industry === 'fintech' || industry === 'saas') trustSignals.push('partner-logos', 'security-badges');
    if (industry === 'ecommerce') trustSignals.push('money-back', 'guarantees');
    if (industry === 'luxury') trustSignals.push('expert-endorsement');
    if (industry === 'education') trustSignals.push('case-studies');

    // Urgency approach
    let urgency: ConversionStrategy['urgency'] = 'none';
    if (industry === 'ecommerce') urgency = 'moderate';
    if (industry === 'fitness') urgency = 'subtle';

    return {
      primaryGoal,
      touchpointCount: primaryGoal === 'purchase' ? 4 : primaryGoal === 'contact' ? 2 : 3,
      urgency,
      trustSignals,
      frictionReduction: primaryGoal === 'purchase' ? 'progressive' : primaryGoal === 'demo' ? 'assisted' : 'minimal',
    };
  }

  // ─── Emotional Journey ────────────────────────────────────────────────

  private determineEmotionalJourney(
    input: StrategyEngineInput,
    arc: NarrativeArc
  ): EmotionalJourney {
    const industry = input.industry;

    // Industry-based starting emotions
    const startEmotions: Record<string, EmotionTarget> = {
      saas: 'curiosity',
      fintech: 'confidence',
      healthcare: 'calm',
      education: 'curiosity',
      restaurant: 'warmth',
      fitness: 'energy',
      'real-estate': 'aspiration',
      luxury: 'aspiration',
      portfolio: 'curiosity',
      ecommerce: 'excitement',
    };

    const startEmotion = startEmotions[industry] ?? 'curiosity';
    const peakEmotion: EmotionTarget = arc.emotionalArc === 'climactic' ? 'excitement' : 'confidence';
    const endEmotion: EmotionTarget = 'motivation';

    const points: EmotionalJourneyPoint[] = [
      { position: 0, emotion: startEmotion, intensity: 0.6 },
      { position: 0.2, emotion: 'curiosity', intensity: 0.7 },
      { position: 0.4, emotion: 'confidence', intensity: 0.8 },
      { position: 0.6, emotion: peakEmotion, intensity: 0.9 },
      { position: 0.8, emotion: 'delight', intensity: 0.8 },
      { position: 1.0, emotion: endEmotion, intensity: 0.7 },
    ];

    return {
      startEmotion,
      peakEmotion,
      endEmotion,
      points,
    };
  }

  // ─── Pacing Strategy ──────────────────────────────────────────────────

  private determinePacingStrategy(
    input: StrategyEngineInput,
    style: ExperienceStyle
  ): PacingStrategy {
    const stylePacing: Record<string, PacingStrategy['pace']> = {
      cinematic: 'slow',
      luxury: 'slow',
      minimal: 'moderate',
      editorial: 'moderate',
      premium: 'moderate',
      enterprise: 'moderate',
      playful: 'fast',
      storytelling: 'variable',
      futuristic: 'fast',
      organic: 'moderate',
      brutalist: 'fast',
    };

    const pace = stylePacing[style] ?? 'moderate';
    const beatIntervalMs = pace === 'slow' ? 2000 : pace === 'fast' ? 800 : 1200;

    const pausePoints: PausePoint[] = [
      { position: 0.3, type: 'breath', suggestedDurationMs: 500 },
      { position: 0.6, type: 'reflection', suggestedDurationMs: 800 },
      { position: 0.85, type: 'decision', suggestedDurationMs: 1000 },
    ];

    return {
      pace,
      beatIntervalMs,
      maxSkippedScrollSpeed: 3000,
      useScrollSnap: style === 'cinematic' || style === 'storytelling',
      pausePoints,
    };
  }

  // ─── Density Strategy ─────────────────────────────────────────────────

  private determineDensityStrategy(
    input: StrategyEngineInput,
    style: ExperienceStyle
  ): DensityStrategy {
    const styleDensity: Record<string, DensityStrategy> = {
      minimal: { hero: 'minimal', body: 'minimal', visualTextRatio: 3, whitespace: 'generous' },
      luxury: { hero: 'minimal', body: 'moderate', visualTextRatio: 4, whitespace: 'generous' },
      editorial: { hero: 'moderate', body: 'rich', visualTextRatio: 2, whitespace: 'balanced' },
      premium: { hero: 'moderate', body: 'moderate', visualTextRatio: 2.5, whitespace: 'balanced' },
      enterprise: { hero: 'moderate', body: 'rich', visualTextRatio: 1.5, whitespace: 'balanced' },
      playful: { hero: 'moderate', body: 'moderate', visualTextRatio: 2, whitespace: 'balanced' },
      cinematic: { hero: 'minimal', body: 'minimal', visualTextRatio: 5, whitespace: 'generous' },
      storytelling: { hero: 'moderate', body: 'rich', visualTextRatio: 2, whitespace: 'balanced' },
    };

    return styleDensity[style] ?? { hero: 'moderate', body: 'moderate', visualTextRatio: 2, whitespace: 'balanced' };
  }

  // ─── Performance Budget ───────────────────────────────────────────────

  private determinePerformanceBudget(input: StrategyEngineInput): PerformanceBudgetV2 {
    const industry = input.industry;
    const isHeavy = industry === 'luxury' || industry === 'perfume' || industry === 'real-estate';

    return {
      maxAnimations: isHeavy ? 15 : 20,
      maxMovingLayers: isHeavy ? 6 : 8,
      maxParallaxGroups: isHeavy ? 3 : 4,
      targetFps: 60,
      maxAnimJsBytes: isHeavy ? 80 * 1024 : 100 * 1024,
      maxLcpMs: 2500,
      maxCls: 0.1,
    };
  }

  // ─── Reasoning ────────────────────────────────────────────────────────

  private buildReasoning(
    input: StrategyEngineInput,
    style: ExperienceStyle,
    arc: NarrativeArc,
    conversion: ConversionStrategy
  ): string {
    return [
      `Experience strategy for ${input.industry}${input.subIndustry ? `/${input.subIndustry}` : ''} (${input.pageType} page).`,
      `Style: ${style} — chosen for ${input.industry} industry with ${input.personality ?? 'default'} personality.`,
      `Narrative: ${arc.type} arc with ${arc.actCount} acts and ${arc.emotionalArc} emotional curve.`,
      `Conversion: ${conversion.primaryGoal} goal with ${conversion.touchpointCount} touchpoints and ${conversion.urgency} urgency.`,
      `Trust: ${conversion.trustSignals.join(', ')}.`,
    ].join(' ');
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

export function createExperienceStrategyEngine(): ExperienceStrategyEngine {
  return new ExperienceStrategyEngine();
}
