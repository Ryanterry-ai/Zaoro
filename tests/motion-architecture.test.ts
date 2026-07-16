// ─── Motion Architecture Tests ──────────────────────────────────────────────
//
// Tests the new motion architecture:
//   - SSR safety: section wrappers never animate
//   - Motion Compiler: blueprints → props
//   - Motion Tokens: all tokens valid
//   - Accessibility: reduced motion cascade
//   - Budget: enforcement works
//   - Motion Director: review scoring
//   - Integration: react-renderer uses compiler
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { MotionCompiler, compileMotion, createRevealBlueprint } from '../src/motion/compiler.js';
import { REVEAL_TOKENS, INTERACTION_TOKENS, CINEMATIC_TOKENS, DEFAULT_ANIMATION_BUDGET, SECTION_WRAPPER_PROPS } from '../src/motion/tokens.js';
import { applyReducedMotion, getReducedMotionOverrides, generateReducedMotionCss, generateHydrationCss, isAnimationAccessible } from '../src/motion/accessibility.js';
import { AnimationBudgetTracker, filterByBudget } from '../src/motion/budget.js';
import { MotionDirector } from '../src/motion/directors/motion-director.js';
import type { MotionBlueprint, CompiledMotionProps, AnimationBudget, PageMotionBlueprint } from '../src/motion/types.js';

// ─── Motion Compiler Tests ──────────────────────────────────────────────────

describe('Motion Compiler', () => {
  it('section wrapper returns ssrVisible: true with no animation props', () => {
    const bp: MotionBlueprint = {
      id: 'section-wrapper',
      target: 'section-wrapper',
      purpose: 'reveal',
      trigger: { type: 'viewport' },
      physics: { type: 'tween', durationMs: 500 },
      budgetCategory: 'standard',
      skippable: true,
      maxDurationMs: 500,
    };

    const result = compileMotion(bp);
    expect(result.props.ssrVisible).toBe(true);
    expect(result.props.initial).toBeUndefined();
    expect(result.props.whileInView).toBeUndefined();
    expect(result.skipped).toBe(false);
    expect(result.estimatedCostBytes).toBe(0);
  });

  it('card reveal compiles to visible SSR props', () => {
    const bp: MotionBlueprint = {
      id: 'card-reveal',
      target: 'card',
      purpose: 'reveal',
      direction: 'up',
      trigger: { type: 'viewport', viewportAmount: 0.3, once: true },
      physics: { type: 'tween', durationMs: 400, easing: [0.4, 0, 0.2, 1] },
      budgetCategory: 'standard',
      skippable: true,
      maxDurationMs: 600,
      reducedMotionFallback: { type: 'instant-reveal' },
    };

    const result = compileMotion(bp);
    expect(result.props.ssrVisible).toBe(true);
    expect(result.props.initial).toBeDefined();
    expect(result.props.whileInView).toBeDefined();
    expect(result.props.viewport).toEqual({ once: true, amount: 0.2 });
  });

  it('reduced motion returns minimal props', () => {
    const bp: MotionBlueprint = {
      id: 'hero',
      target: 'section-inner',
      purpose: 'cinematic',
      direction: 'up',
      trigger: { type: 'viewport' },
      physics: { type: 'tween', durationMs: 700 },
      budgetCategory: 'critical',
      skippable: false,
      maxDurationMs: 1000,
      reducedMotionFallback: { type: 'instant-reveal' },
    };

    const result = compileMotion(bp, { reducedMotion: true });
    expect(result.props.ssrVisible).toBe(true);
    expect(result.props.initial).toBeUndefined();
    expect(result.props.whileInView).toBeUndefined();
  });

  it('spring physics compiles correctly', () => {
    const bp: MotionBlueprint = {
      id: 'bounce',
      target: 'button',
      purpose: 'bounce-in',
      trigger: { type: 'viewport' },
      physics: { type: 'spring', stiffness: 400, damping: 15 },
      budgetCategory: 'decorative',
      skippable: true,
      maxDurationMs: 1000,
    };

    const result = compileMotion(bp);
    expect(result.props.transition).toBeDefined();
    expect((result.props.transition as any).type).toBe('spring');
    expect((result.props.transition as any).stiffness).toBe(400);
  });

  it('hover compiles to whileHover props', () => {
    const bp: MotionBlueprint = {
      id: 'button-hover',
      target: 'button',
      purpose: 'hover',
      trigger: { type: 'hover' },
      physics: { type: 'spring', stiffness: 400, damping: 17 },
      budgetCategory: 'decorative',
      skippable: true,
      maxDurationMs: 300,
    };

    const result = compileMotion(bp);
    expect(result.props.whileHover).toBeDefined();
  });

  it('page compilation returns map of all blueprints', () => {
    const page: PageMotionBlueprint = {
      pagePath: '/',
      blueprints: [
        {
          id: 'section-wrapper',
          target: 'section-wrapper',
          purpose: 'reveal',
          trigger: { type: 'viewport' },
          physics: { type: 'tween', durationMs: 0 },
          budgetCategory: 'standard',
          skippable: true,
          maxDurationMs: 0,
        },
        {
          id: 'card-reveal',
          target: 'card',
          purpose: 'reveal',
          direction: 'up',
          trigger: { type: 'viewport' },
          physics: { type: 'tween', durationMs: 400 },
          budgetCategory: 'standard',
          skippable: true,
          maxDurationMs: 600,
        },
      ],
      budget: DEFAULT_ANIMATION_BUDGET,
      global: {
        enabled: true,
        level: 'moderate',
        respectReducedMotion: true,
        defaultViewportAmount: 0.3,
        sectionWrapperAnimation: false,
      },
    };

    const compiler = new MotionCompiler();
    const results = compiler.compilePage(page);
    expect(results.size).toBe(2);
    expect(results.get('section-wrapper')?.ssrVisible).toBe(true);
    expect(results.get('card-reveal')?.initial).toBeDefined();
  });
});

// ─── Motion Tokens Tests ────────────────────────────────────────────────────

describe('Motion Tokens', () => {
  it('REVEAL_TOKENS have valid structure', () => {
    expect(REVEAL_TOKENS.heroReveal.initial).toBeDefined();
    expect(REVEAL_TOKENS.heroReveal.whileInView).toBeDefined();
    expect(REVEAL_TOKENS.cardReveal.transition).toBeDefined();
    expect(REVEAL_TOKENS.sectionTransition.viewport).toBeDefined();
  });

  it('INTERACTION_TOKENS have valid structure', () => {
    expect(INTERACTION_TOKENS.hoverLift.whileHover).toBeDefined();
    expect(INTERACTION_TOKENS.tapPress.whileTap).toBeDefined();
    expect(INTERACTION_TOKENS.cardHover.whileHover).toBeDefined();
  });

  it('CINEMATIC_TOKENS have valid structure', () => {
    expect(CINEMATIC_TOKENS.cameraPush.initial).toBeDefined();
    expect(CINEMATIC_TOKENS.depthBlur.initial).toBeDefined();
  });

  it('SECTION_WRAPPER_PROPS has ssrVisible: true', () => {
    expect(SECTION_WRAPPER_PROPS.ssrVisible).toBe(true);
  });

  it('DEFAULT_ANIMATION_BUDGET has valid values', () => {
    expect(DEFAULT_ANIMATION_BUDGET.maxSimultaneous).toBe(20);
    expect(DEFAULT_ANIMATION_BUDGET.maxMovingLayers).toBe(8);
    expect(DEFAULT_ANIMATION_BUDGET.targetFps).toBe(60);
    expect(DEFAULT_ANIMATION_BUDGET.maxAnimationJsBytes).toBe(100 * 1024);
  });
});

// ─── Accessibility Tests ────────────────────────────────────────────────────

describe('Accessibility', () => {
  it('applyReducedMotion returns instant reveal for reduced motion', () => {
    const bp: MotionBlueprint = {
      id: 'test',
      target: 'card',
      purpose: 'reveal',
      trigger: { type: 'viewport' },
      physics: { type: 'tween', durationMs: 400 },
      budgetCategory: 'standard',
      skippable: true,
      maxDurationMs: 600,
      reducedMotionFallback: { type: 'instant-reveal' },
    };

    const result = applyReducedMotion(bp, true);
    expect(result.ssrVisible).toBe(true);
    expect(result.initial).toBeUndefined();
  });

  it('applyReducedMotion returns fade for reduced motion with fade fallback', () => {
    const bp: MotionBlueprint = {
      id: 'test',
      target: 'card',
      purpose: 'reveal',
      trigger: { type: 'viewport' },
      physics: { type: 'tween', durationMs: 400 },
      budgetCategory: 'standard',
      skippable: true,
      maxDurationMs: 600,
      reducedMotionFallback: { type: 'fade', durationMs: 100 },
    };

    const result = applyReducedMotion(bp, true);
    expect(result.ssrVisible).toBe(true);
    expect(result.initial).toEqual({ opacity: 0 });
    expect(result.whileInView).toEqual({ opacity: 1 });
  });

  it('getReducedMotionOverrides disables parallax', () => {
    const bps: MotionBlueprint[] = [
      {
        id: 'parallax',
        target: 'card',
        purpose: 'parallax',
        trigger: { type: 'scroll' },
        physics: { type: 'tween', durationMs: 500 },
        budgetCategory: 'standard',
        skippable: true,
        maxDurationMs: 500,
      },
      {
        id: 'card',
        target: 'card',
        purpose: 'reveal',
        trigger: { type: 'viewport' },
        physics: { type: 'tween', durationMs: 400 },
        budgetCategory: 'standard',
        skippable: true,
        maxDurationMs: 600,
      },
    ];

    const overrides = getReducedMotionOverrides(bps, true);
    expect(overrides.has('parallax')).toBe(true);
    expect(overrides.get('parallax')?.ssrVisible).toBe(true);
    expect(overrides.has('card')).toBe(false);
  });

  it('generateReducedMotionCss contains prefers-reduced-motion', () => {
    const css = generateReducedMotionCss();
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('animation-duration: 0.01ms');
  });

  it('generateHydrationCss contains hydration safety', () => {
    const css = generateHydrationCss();
    expect(css).toContain('no-js');
    expect(css).toContain('motion-ready');
  });

  it('isAnimationAccessible returns true for safe animations', () => {
    const bp: MotionBlueprint = {
      id: 'safe',
      target: 'card',
      purpose: 'reveal',
      trigger: { type: 'viewport' },
      physics: { type: 'tween', durationMs: 400 },
      budgetCategory: 'standard',
      skippable: true,
      maxDurationMs: 600,
    };
    expect(isAnimationAccessible(bp)).toBe(true);
  });

  it('isAnimationAccessible returns false for glitch without fallback', () => {
    const bp: MotionBlueprint = {
      id: 'glitch',
      target: 'decorative',
      purpose: 'glitch',
      trigger: { type: 'viewport' },
      physics: { type: 'tween', durationMs: 400 },
      budgetCategory: 'decorative',
      skippable: true,
      maxDurationMs: 600,
    };
    expect(isAnimationAccessible(bp)).toBe(false);
  });

  it('isAnimationAccessible returns true for glitch with fallback', () => {
    const bp: MotionBlueprint = {
      id: 'glitch',
      target: 'decorative',
      purpose: 'glitch',
      trigger: { type: 'viewport' },
      physics: { type: 'tween', durationMs: 400 },
      budgetCategory: 'decorative',
      skippable: true,
      maxDurationMs: 600,
      reducedMotionFallback: { type: 'none' },
    };
    expect(isAnimationAccessible(bp)).toBe(true);
  });
});

// ─── Budget Tests ───────────────────────────────────────────────────────────

describe('Animation Budget', () => {
  it('allows animations within budget', () => {
    const tracker = new AnimationBudgetTracker();
    const bp: MotionBlueprint = {
      id: 'test',
      target: 'card',
      purpose: 'reveal',
      trigger: { type: 'viewport' },
      physics: { type: 'tween', durationMs: 400 },
      budgetCategory: 'standard',
      skippable: true,
      maxDurationMs: 600,
    };

    expect(tracker.canAdd(bp).allowed).toBe(true);
    tracker.track(bp, 80);
    expect(tracker.getUsage().simultaneous.used).toBe(1);
  });

  it('rejects when max simultaneous exceeded', () => {
    const tracker = new AnimationBudgetTracker({ ...DEFAULT_ANIMATION_BUDGET, maxSimultaneous: 2 });

    for (let i = 0; i < 2; i++) {
      tracker.track({
        id: `test-${i}`,
        target: 'card',
        purpose: 'reveal',
        trigger: { type: 'viewport' },
        physics: { type: 'tween', durationMs: 400 },
        budgetCategory: 'standard',
        skippable: true,
        maxDurationMs: 600,
      }, 80);
    }

    const check = tracker.canAdd({
      id: 'test-2',
      target: 'card',
      purpose: 'reveal',
      trigger: { type: 'viewport' },
      physics: { type: 'tween', durationMs: 400 },
      budgetCategory: 'standard',
      skippable: true,
      maxDurationMs: 600,
    });

    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('simultaneous');
  });

  it('rejects when max parallax groups exceeded', () => {
    const tracker = new AnimationBudgetTracker({ ...DEFAULT_ANIMATION_BUDGET, maxParallaxGroups: 1 });

    tracker.track({
      id: 'parallax-1',
      target: 'card',
      purpose: 'parallax',
      trigger: { type: 'scroll' },
      physics: { type: 'tween', durationMs: 500 },
      budgetCategory: 'standard',
      skippable: true,
      maxDurationMs: 500,
    }, 80);

    const check = tracker.canAdd({
      id: 'parallax-2',
      target: 'card',
      purpose: 'parallax',
      trigger: { type: 'scroll' },
      physics: { type: 'tween', durationMs: 500 },
      budgetCategory: 'standard',
      skippable: true,
      maxDurationMs: 500,
    });

    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('parallax');
  });

  it('filterByBudget returns only blueprints within budget', () => {
    const bps: MotionBlueprint[] = Array.from({ length: 25 }, (_, i) => ({
      id: `bp-${i}`,
      target: 'card' as const,
      purpose: 'reveal' as const,
      trigger: { type: 'viewport' as const },
      physics: { type: 'tween' as const, durationMs: 400 },
      budgetCategory: 'standard' as const,
      skippable: true,
      maxDurationMs: 600,
    }));

    const filtered = filterByBudget(bps, { ...DEFAULT_ANIMATION_BUDGET, maxSimultaneous: 10 });
    expect(filtered.length).toBeLessThanOrEqual(10);
  });

  it('getReport returns formatted string', () => {
    const tracker = new AnimationBudgetTracker();
    tracker.track({
      id: 'test',
      target: 'card',
      purpose: 'reveal',
      trigger: { type: 'viewport' },
      physics: { type: 'tween', durationMs: 400 },
      budgetCategory: 'standard',
      skippable: true,
      maxDurationMs: 600,
    }, 80);

    const report = tracker.getReport();
    expect(report).toContain('Animation Budget Report');
    expect(report).toContain('Simultaneous:  1/20');
  });

  it('isOverBudget detects over-budget state', () => {
    const tracker = new AnimationBudgetTracker({ ...DEFAULT_ANIMATION_BUDGET, maxSimultaneous: 1 });
    tracker.track({
      id: 'test',
      target: 'card',
      purpose: 'reveal',
      trigger: { type: 'viewport' },
      physics: { type: 'tween', durationMs: 400 },
      budgetCategory: 'standard',
      skippable: true,
      maxDurationMs: 600,
    }, 80);

    expect(tracker.isOverBudget()).toBe(false);

    tracker.track({
      id: 'test-2',
      target: 'card',
      purpose: 'reveal',
      trigger: { type: 'viewport' },
      physics: { type: 'tween', durationMs: 400 },
      budgetCategory: 'standard',
      skippable: true,
      maxDurationMs: 600,
    }, 80);

    expect(tracker.isOverBudget()).toBe(true);
  });
});

// ─── Motion Director Tests ──────────────────────────────────────────────────

describe('Motion Director', () => {
  it('reviews a page and returns score', () => {
    const director = new MotionDirector();
    const page: PageMotionBlueprint = {
      pagePath: '/',
      blueprints: [
        {
          id: 'hero',
          target: 'section-inner',
          purpose: 'cinematic',
          direction: 'up',
          trigger: { type: 'viewport', viewportAmount: 0.3, once: true },
          physics: { type: 'tween', durationMs: 700 },
          budgetCategory: 'critical',
          skippable: false,
          maxDurationMs: 1000,
          reducedMotionFallback: { type: 'instant-reveal' },
        },
        {
          id: 'card-1',
          target: 'card',
          purpose: 'reveal',
          direction: 'up',
          trigger: { type: 'viewport', viewportAmount: 0.2, once: true },
          physics: { type: 'tween', durationMs: 400 },
          budgetCategory: 'standard',
          skippable: true,
          maxDurationMs: 600,
          reducedMotionFallback: { type: 'instant-reveal' },
        },
      ],
      budget: DEFAULT_ANIMATION_BUDGET,
      global: {
        enabled: true,
        level: 'moderate',
        respectReducedMotion: true,
        defaultViewportAmount: 0.3,
        sectionWrapperAnimation: false,
      },
    };

    const result = director.review(page);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.dimensions.length).toBe(10);
    expect(result.budgetCompliance.withinBudget).toBe(true);
  });

  it('flags over-animation when too many blueprints', () => {
    const director = new MotionDirector();
    const bps: MotionBlueprint[] = Array.from({ length: 30 }, (_, i) => ({
      id: `bp-${i}`,
      target: 'card' as const,
      purpose: 'reveal' as const,
      direction: 'up' as const,
      trigger: { type: 'viewport' as const, viewportAmount: 0.3, once: true },
      physics: { type: 'tween' as const, durationMs: 400 },
      budgetCategory: 'standard' as const,
      skippable: true,
      maxDurationMs: 600,
    }));

    const page: PageMotionBlueprint = {
      pagePath: '/',
      blueprints: bps,
      budget: DEFAULT_ANIMATION_BUDGET,
      global: {
        enabled: true,
        level: 'moderate',
        respectReducedMotion: true,
        defaultViewportAmount: 0.3,
        sectionWrapperAnimation: false,
      },
    };

    const result = director.review(page);
    const overAnimationDim = result.dimensions.find(d => d.name === 'Over-Animation');
    expect(overAnimationDim?.passed).toBe(false);
  });

  it('flags accessibility issues when blueprints lack reduced motion fallback', () => {
    const director = new MotionDirector();
    // Create multiple blueprints without fallbacks to trigger failure
    const bps: MotionBlueprint[] = Array.from({ length: 6 }, (_, i) => ({
      id: `no-fallback-${i}`,
      target: 'card' as const,
      purpose: 'parallax' as const,
      trigger: { type: 'scroll' as const },
      physics: { type: 'tween' as const, durationMs: 500 },
      budgetCategory: 'standard' as const,
      skippable: true,
      maxDurationMs: 500,
      // No reducedMotionFallback
    }));

    const page: PageMotionBlueprint = {
      pagePath: '/',
      blueprints: bps,
      budget: DEFAULT_ANIMATION_BUDGET,
      global: {
        enabled: true,
        level: 'moderate',
        respectReducedMotion: true,
        defaultViewportAmount: 0.3,
        sectionWrapperAnimation: false,
      },
    };

    const result = director.review(page);
    const accessDim = result.dimensions.find(d => d.name === 'Accessibility');
    expect(accessDim?.passed).toBe(false);
  });
});

// ─── createRevealBlueprint Convenience Tests ────────────────────────────────

describe('createRevealBlueprint', () => {
  it('creates a valid reveal blueprint with defaults', () => {
    const bp = createRevealBlueprint({ id: 'test' });
    expect(bp.id).toBe('test');
    expect(bp.target).toBe('card');
    expect(bp.purpose).toBe('reveal');
    expect(bp.direction).toBe('up');
    expect(bp.trigger.type).toBe('viewport');
    expect(bp.trigger.once).toBe(true);
    expect(bp.budgetCategory).toBe('standard');
    expect(bp.reducedMotionFallback).toBeDefined();
  });

  it('allows overriding defaults', () => {
    const bp = createRevealBlueprint({
      id: 'hero',
      target: 'section-inner',
      purpose: 'cinematic',
      direction: 'scale',
      physics: { type: 'spring', stiffness: 400 },
    });
    expect(bp.target).toBe('section-inner');
    expect(bp.purpose).toBe('cinematic');
    expect(bp.direction).toBe('scale');
    expect(bp.physics.type).toBe('spring');
  });
});
