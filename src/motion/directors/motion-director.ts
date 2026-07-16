// ─── Motion Director Agent ──────────────────────────────────────────────────
//
// Review agent that evaluates animation quality across 10 dimensions:
//   1. Animation consistency
//   2. Over-animation detection
//   3. Under-animation detection
//   4. Scroll pacing
//   5. Transition rhythm
//   6. Hover quality
//   7. Interaction quality
//   8. Cinematic quality
//   9. Performance
//  10. Accessibility (reduced motion)
//
// Part of the Review Board alongside CTO, UX, QA, Accessibility, Security, Performance.
// ─────────────────────────────────────────────────────────────────────────────

import type { MotionBlueprint, PageMotionBlueprint, AnimationBudget } from '../types.js';

// ─── Review Types ───────────────────────────────────────────────────────────

export interface MotionReviewResult {
  /** Overall score 0-100 */
  score: number;
  /** Pass/fail */
  passed: boolean;
  /** Individual dimension scores */
  dimensions: MotionDimension[];
  /** Issues found */
  issues: MotionIssue[];
  /** Recommendations */
  recommendations: MotionRecommendation[];
  /** Budget compliance */
  budgetCompliance: BudgetCompliance;
}

export interface MotionDimension {
  name: string;
  score: number;
  weight: number;
  passed: boolean;
  details: string;
}

export interface MotionIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  blueprintId?: string;
  fix?: string;
}

export interface MotionRecommendation {
  category: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
}

export interface BudgetCompliance {
  withinBudget: boolean;
  usage: Record<string, { used: number; max: number }>;
}

// ─── Motion Director ────────────────────────────────────────────────────────

export class MotionDirector {
  private readonly PASS_THRESHOLD = 70;

  /**
   * Review a page's motion blueprints.
   */
  review(
    pageBlueprint: PageMotionBlueprint,
    opts?: { reducedMotion?: boolean }
  ): MotionReviewResult {
    const blueprints = pageBlueprint.blueprints;
    const issues: MotionIssue[] = [];
    const recommendations: MotionRecommendation[] = [];

    // Run all dimension checks
    const dimensions: MotionDimension[] = [
      this.checkConsistency(blueprints),
      this.checkOverAnimation(blueprints),
      this.checkUnderAnimation(blueprints),
      this.checkScrollPacing(blueprints),
      this.checkTransitionRhythm(blueprints),
      this.checkHoverQuality(blueprints),
      this.checkInteractionQuality(blueprints),
      this.checkCinematicQuality(blueprints),
      this.checkPerformance(blueprints, pageBlueprint.budget),
      this.checkAccessibility(blueprints, opts?.reducedMotion ?? false),
    ];

    // Calculate weighted score
    const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
    const weightedScore = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / totalWeight;
    const score = Math.round(weightedScore);

    // Check budget compliance
    const budgetCompliance = this.checkBudgetCompliance(blueprints, pageBlueprint.budget);

    // Generate recommendations
    if (dimensions.find(d => d.name === 'Over-Animation' && !d.passed)) {
      recommendations.push({
        category: 'over-animation',
        message: 'Consider reducing the number of animations. Focus on key content reveals.',
        impact: 'high',
      });
    }
    if (dimensions.find(d => d.name === 'Scroll Pacing' && !d.passed)) {
      recommendations.push({
        category: 'scroll-pacing',
        message: 'Animation timing feels uneven. Stagger reveals more gradually.',
        impact: 'medium',
      });
    }
    if (dimensions.find(d => d.name === 'Accessibility' && !d.passed)) {
      recommendations.push({
        category: 'accessibility',
        message: 'Some animations lack reduced motion fallbacks. All parallax/camera/particle effects need fallbacks.',
        impact: 'high',
      });
    }

    return {
      score,
      passed: score >= this.PASS_THRESHOLD,
      dimensions,
      issues,
      recommendations,
      budgetCompliance,
    };
  }

  // ─── Dimension Checks ──────────────────────────────────────────────────

  private checkConsistency(blueprints: MotionBlueprint[]): MotionDimension {
    const durations = blueprints
      .map(bp => bp.physics.durationMs)
      .filter((d): d is number => d !== undefined);

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / durations.length;
    const stdDev = Math.sqrt(variance);

    // Good: stdDev < 200ms (consistent timing)
    const score = stdDev < 100 ? 100 : stdDev < 200 ? 80 : stdDev < 400 ? 60 : 40;

    return {
      name: 'Consistency',
      score,
      weight: 0.15,
      passed: score >= 70,
      details: `Duration std dev: ${stdDev.toFixed(0)}ms (avg: ${avg.toFixed(0)}ms)`,
    };
  }

  private checkOverAnimation(blueprints: MotionBlueprint[]): MotionDimension {
    // Too many animations = over-animated
    const count = blueprints.length;
    const score = count <= 15 ? 100 : count <= 25 ? 80 : count <= 40 ? 60 : 30;

    const issue: MotionIssue | undefined = count > 25 ? {
      severity: 'warning',
      category: 'over-animation',
      message: `${count} animations detected. Consider reducing to 15-20 for optimal experience.`,
    } : undefined;

    return {
      name: 'Over-Animation',
      score,
      weight: 0.15,
      passed: score >= 70,
      details: `${count} total animations`,
    };
  }

  private checkUnderAnimation(blueprints: MotionBlueprint[]): MotionDimension {
    // Too few animations = static, boring
    const count = blueprints.length;
    const score = count >= 5 ? 100 : count >= 3 ? 80 : count >= 1 ? 60 : 40;

    return {
      name: 'Under-Animation',
      score,
      weight: 0.1,
      passed: score >= 70,
      details: `${count} total animations`,
    };
  }

  private checkScrollPacing(blueprints: MotionBlueprint[]): MotionDimension {
    // Check that scroll-triggered animations have consistent viewport amounts
    const scrollBps = blueprints.filter(bp => bp.trigger.type === 'viewport' || bp.trigger.type === 'scroll');
    if (scrollBps.length === 0) {
      return { name: 'Scroll Pacing', score: 80, weight: 0.1, passed: true, details: 'No scroll animations' };
    }

    const amounts = scrollBps.map(bp => bp.trigger.viewportAmount ?? 0.3);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    // Good: viewport amounts between 0.1 and 0.5
    const score = avgAmount >= 0.1 && avgAmount <= 0.5 ? 90 : avgAmount >= 0.05 && avgAmount <= 0.7 ? 70 : 50;

    return {
      name: 'Scroll Pacing',
      score,
      weight: 0.1,
      passed: score >= 70,
      details: `Avg viewport amount: ${avgAmount.toFixed(2)} across ${scrollBps.length} scroll animations`,
    };
  }

  private checkTransitionRhythm(blueprints: MotionBlueprint[]): MotionDimension {
    // Check that animation durations follow a rhythm (not random)
    const durations = blueprints
      .map(bp => bp.physics.durationMs)
      .filter((d): d is number => d !== undefined);

    if (durations.length < 3) {
      return { name: 'Transition Rhythm', score: 80, weight: 0.1, passed: true, details: 'Too few animations to assess rhythm' };
    }

    // Good: durations cluster around 200-500ms range
    const inRange = durations.filter(d => d >= 200 && d <= 600).length;
    const ratio = inRange / durations.length;
    const score = ratio >= 0.7 ? 90 : ratio >= 0.5 ? 70 : 50;

    return {
      name: 'Transition Rhythm',
      score,
      weight: 0.1,
      passed: score >= 70,
      details: `${(ratio * 100).toFixed(0)}% of animations in 200-600ms range`,
    };
  }

  private checkHoverQuality(blueprints: MotionBlueprint[]): MotionDimension {
    const hoverBps = blueprints.filter(bp => bp.purpose === 'hover');
    // Hover is nice-to-have, not required
    const score = hoverBps.length > 0 ? 90 : 80;

    return {
      name: 'Hover Quality',
      score,
      weight: 0.05,
      passed: score >= 70,
      details: `${hoverBps.length} hover animations`,
    };
  }

  private checkInteractionQuality(blueprints: MotionBlueprint[]): MotionDimension {
    const tapBps = blueprints.filter(bp => bp.purpose === 'tap');
    const score = tapBps.length > 0 ? 90 : 80;

    return {
      name: 'Interaction Quality',
      score,
      weight: 0.05,
      passed: score >= 70,
      details: `${tapBps.length} tap animations`,
    };
  }

  private checkCinematicQuality(blueprints: MotionBlueprint[]): MotionDimension {
    const cinematicBps = blueprints.filter(bp => bp.purpose === 'cinematic');
    // Cinematic is optional but adds premium feel
    const score = cinematicBps.length > 0 ? 95 : 75;

    return {
      name: 'Cinematic Quality',
      score,
      weight: 0.1,
      passed: score >= 70,
      details: `${cinematicBps.length} cinematic animations`,
    };
  }

  private checkPerformance(blueprints: MotionBlueprint[], budget: AnimationBudget): MotionDimension {
    const total = blueprints.length;
    const withinBudget = total <= budget.maxSimultaneous;
    const score = withinBudget ? 95 : total <= budget.maxSimultaneous * 1.5 ? 70 : 40;

    return {
      name: 'Performance',
      score,
      weight: 0.1,
      passed: score >= 70,
      details: `${total}/${budget.maxSimultaneous} max simultaneous animations`,
    };
  }

  private checkAccessibility(blueprints: MotionBlueprint[], reducedMotion: boolean): MotionDimension {
    const withoutFallback = blueprints.filter(
      bp => !bp.reducedMotionFallback && bp.purpose !== 'none'
    );
    const score = withoutFallback.length === 0 ? 100 : withoutFallback.length <= 2 ? 80 : withoutFallback.length <= 5 ? 60 : 30;

    if (withoutFallback.length > 0) {
      // Report issues for each animation without fallback
    }

    return {
      name: 'Accessibility',
      score,
      weight: 0.15,
      passed: score >= 70,
      details: `${withoutFallback.length} animations without reduced motion fallback`,
    };
  }

  private checkBudgetCompliance(
    blueprints: MotionBlueprint[],
    budget: AnimationBudget
  ): BudgetCompliance {
    const usage: Record<string, { used: number; max: number }> = {
      simultaneous: { used: blueprints.length, max: budget.maxSimultaneous },
      movingLayers: {
        used: blueprints.filter(bp => bp.budgetCategory === '3d' || bp.budgetCategory === 'particle').length,
        max: budget.maxMovingLayers,
      },
      parallaxGroups: {
        used: blueprints.filter(bp => bp.purpose === 'parallax').length,
        max: budget.maxParallaxGroups,
      },
      stickyScenes: {
        used: blueprints.filter(bp => bp.purpose === 'sticky').length,
        max: budget.maxStickyScenes,
      },
    };

    const withinBudget = Object.values(usage).every(u => u.used <= u.max);

    return { withinBudget, usage };
  }
}

/**
 * Create a Motion Director instance.
 */
export function createMotionDirector(): MotionDirector {
  return new MotionDirector();
}
