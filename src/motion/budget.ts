// ─── Animation Budget ───────────────────────────────────────────────────────
//
// Experience Intelligence owns the animation budget.
// The renderer follows the budget — never exceeds it.
//
// Budget ensures:
// - No more than 20 simultaneous animations
// - No more than 8 moving layers
// - No more than 4 parallax groups
// - No more than 2 sticky scenes
// - 60fps target
// - <100kb animation JS
// ─────────────────────────────────────────────────────────────────────────────

import type { MotionBlueprint, AnimationBudget } from './types.js';
import { DEFAULT_ANIMATION_BUDGET } from './tokens.js';

// ─── Budget Tracker ─────────────────────────────────────────────────────────

export class AnimationBudgetTracker {
  private budget: AnimationBudget;
  private counts = {
    simultaneous: 0,
    movingLayers: 0,
    parallaxGroups: 0,
    stickyScenes: 0,
  };
  private totalJsBytes = 0;

  constructor(budget?: AnimationBudget) {
    this.budget = budget ?? DEFAULT_ANIMATION_BUDGET;
  }

  /**
   * Check if a blueprint can be added within budget.
   * Returns { allowed, reason } — if not allowed, the animation should be skipped.
   */
  canAdd(blueprint: MotionBlueprint): { allowed: boolean; reason?: string } {
    if (this.counts.simultaneous >= this.budget.maxSimultaneous) {
      return {
        allowed: false,
        reason: `Budget limit: ${this.budget.maxSimultaneous} simultaneous animations reached`,
      };
    }

    if (blueprint.budgetCategory === '3d' || blueprint.budgetCategory === 'particle') {
      if (this.counts.movingLayers >= this.budget.maxMovingLayers) {
        return {
          allowed: false,
          reason: `Budget limit: ${this.budget.maxMovingLayers} moving layers reached`,
        };
      }
    }

    if (blueprint.purpose === 'parallax') {
      if (this.counts.parallaxGroups >= this.budget.maxParallaxGroups) {
        return {
          allowed: false,
          reason: `Budget limit: ${this.budget.maxParallaxGroups} parallax groups reached`,
        };
      }
    }

    if (blueprint.purpose === 'sticky') {
      if (this.counts.stickyScenes >= this.budget.maxStickyScenes) {
        return {
          allowed: false,
          reason: `Budget limit: ${this.budget.maxStickyScenes} sticky scenes reached`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Record that a blueprint has been added to the budget.
   */
  track(blueprint: MotionBlueprint, jsBytes: number): void {
    this.counts.simultaneous++;
    this.totalJsBytes += jsBytes;

    if (blueprint.budgetCategory === '3d' || blueprint.budgetCategory === 'particle') {
      this.counts.movingLayers++;
    }
    if (blueprint.purpose === 'parallax') {
      this.counts.parallaxGroups++;
    }
    if (blueprint.purpose === 'sticky') {
      this.counts.stickyScenes++;
    }
  }

  /**
   * Get current budget usage.
   */
  getUsage(): {
    simultaneous: { used: number; max: number };
    movingLayers: { used: number; max: number };
    parallaxGroups: { used: number; max: number };
    stickyScenes: { used: number; max: number };
    jsBytes: { used: number; max: number };
  } {
    return {
      simultaneous: { used: this.counts.simultaneous, max: this.budget.maxSimultaneous },
      movingLayers: { used: this.counts.movingLayers, max: this.budget.maxMovingLayers },
      parallaxGroups: { used: this.counts.parallaxGroups, max: this.budget.maxParallaxGroups },
      stickyScenes: { used: this.counts.stickyScenes, max: this.budget.maxStickyScenes },
      jsBytes: { used: this.totalJsBytes, max: this.budget.maxAnimationJsBytes },
    };
  }

  /**
   * Check if we're over budget on any dimension.
   */
  isOverBudget(): boolean {
    return (
      this.counts.simultaneous > this.budget.maxSimultaneous ||
      this.counts.movingLayers > this.budget.maxMovingLayers ||
      this.counts.parallaxGroups > this.budget.maxParallaxGroups ||
      this.counts.stickyScenes > this.budget.maxStickyScenes ||
      this.totalJsBytes > this.budget.maxAnimationJsBytes
    );
  }

  /**
   * Get a report of budget status.
   */
  getReport(): string {
    const usage = this.getUsage();
    const lines = [
      `Animation Budget Report`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `Simultaneous:  ${usage.simultaneous.used}/${usage.simultaneous.max}`,
      `Moving Layers: ${usage.movingLayers.used}/${usage.movingLayers.max}`,
      `Parallax:      ${usage.parallaxGroups.used}/${usage.parallaxGroups.max}`,
      `Sticky:        ${usage.stickyScenes.used}/${usage.stickyScenes.max}`,
      `JS Size:       ${(usage.jsBytes.used / 1024).toFixed(1)}KB/${(usage.jsBytes.max / 1024).toFixed(1)}KB`,
      `Over Budget:   ${this.isOverBudget() ? 'YES' : 'NO'}`,
    ];
    return lines.join('\n');
  }

  /**
   * Reset all counters (for a new page).
   */
  reset(): void {
    this.counts = {
      simultaneous: 0,
      movingLayers: 0,
      parallaxGroups: 0,
      stickyScenes: 0,
    };
    this.totalJsBytes = 0;
  }
}

/**
 * Pre-filter a list of blueprints to only those within budget.
 * Returns the blueprints that should actually be compiled.
 */
export function filterByBudget(
  blueprints: MotionBlueprint[],
  budget?: AnimationBudget
): MotionBlueprint[] {
  const tracker = new AnimationBudgetTracker(budget);
  return blueprints.filter(bp => {
    const check = tracker.canAdd(bp);
    if (!check.allowed) return false;
    tracker.track(bp, 80); // Estimate 80 bytes per animation
    return true;
  });
}
