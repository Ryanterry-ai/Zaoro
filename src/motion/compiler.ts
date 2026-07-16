// ─── Motion Compiler ────────────────────────────────────────────────────────
//
// Converts MotionBlueprints into Framer Motion props.
// This is the SINGLE point of translation between intent and code.
// The renderer never generates raw animation strings — it calls this.
//
// Rules:
// 1. Section wrappers ALWAYS get ssrVisible: true, no initial opacity: 0
// 2. Every animation references tokens, never raw values
// 3. Budget enforcement drops animations if limits exceeded
// 4. Reduced motion is always respected
// ─────────────────────────────────────────────────────────────────────────────

import type {
  MotionBlueprint,
  CompiledMotionProps,
  CompilationResult,
  AnimationBudget,
  MotionPhysics,
  PageMotionBlueprint,
  GlobalMotionSettings,
} from './types.js';
import {
  REVEAL_TOKENS,
  INTERACTION_TOKENS,
  STAGGER_TOKENS,
  REDUCED_MOTION_TOKENS,
  DEFAULT_ANIMATION_BUDGET,
  SECTION_WRAPPER_PROPS,
  shouldAnimateVisibility,
} from './tokens.js';

// ─── Compiler ───────────────────────────────────────────────────────────────

export class MotionCompiler {
  private budget: AnimationBudget;
  private activeAnimationCount = 0;
  private activeMovingLayers = 0;
  private activeParallaxGroups = 0;
  private activeStickyScenes = 0;
  private totalJsBytes = 0;
  private reducedMotion = false;

  constructor(opts?: { budget?: AnimationBudget; reducedMotion?: boolean }) {
    this.budget = opts?.budget ?? DEFAULT_ANIMATION_BUDGET;
    this.reducedMotion = opts?.reducedMotion ?? false;
  }

  /**
   * Compile a full page blueprint into per-component props.
   * Returns a map of blueprint ID → compiled props.
   */
  compilePage(blueprint: PageMotionBlueprint): Map<string, CompiledMotionProps> {
    this.resetBudget();
    const results = new Map<string, CompiledMotionProps>();

    for (const bp of blueprint.blueprints) {
      const result = this.compile(bp);
      results.set(bp.id, result.props);
    }

    return results;
  }

  /**
   * Compile a single blueprint into Framer Motion props.
   */
  compile(blueprint: MotionBlueprint): CompilationResult {
    // Rule 1: Section wrappers NEVER animate for visibility
    if (blueprint.target === 'section-wrapper') {
      return {
        props: { ...SECTION_WRAPPER_PROPS },
        blueprint,
        skipped: false,
        estimatedCostBytes: 0,
      };
    }

    // Check budget
    const budgetCheck = this.checkBudget(blueprint);
    if (!budgetCheck.allowed) {
      return {
        props: { ...SECTION_WRAPPER_PROPS },
        blueprint,
        skipped: true,
        skipReason: budgetCheck.reason,
        estimatedCostBytes: 0,
      };
    }

    // Reduced motion: replace with fallback
    if (this.reducedMotion) {
      return {
        props: this.compileReducedMotion(blueprint),
        blueprint,
        skipped: false,
        estimatedCostBytes: 40,
      };
    }

    // Build props from blueprint
    const props = this.compileBlueprint(blueprint);
    const cost = this.estimateCost(props);

    // Track budget
    this.incrementBudget(blueprint, cost);

    return {
      props,
      blueprint,
      skipped: false,
      estimatedCostBytes: cost,
    };
  }

  /**
   * Compile a blueprint into Framer Motion props.
   */
  private compileBlueprint(bp: MotionBlueprint): CompiledMotionProps {
    const props: CompiledMotionProps = {
      ssrVisible: true, // Always SSR-visible
    };

    // Apply trigger
    if (bp.trigger.type === 'viewport' || bp.trigger.type === 'scroll') {
      props.viewport = {
        once: bp.trigger.once ?? true,
        amount: bp.trigger.viewportAmount ?? 0.3,
      };
    }

    // Apply physics/transition
    props.transition = this.compilePhysics(bp.physics);

    // Apply stagger if present
    if (bp.stagger) {
      props.transition = {
        ...props.transition,
        staggerChildren: bp.stagger.delayMs / 1000,
        ...(bp.stagger.from ? { delayChildren: bp.stagger.from === 'first' ? 0 : 0.1 } : {}),
      };
    }

    // Build initial/whileInView based on purpose
    const animationProps = this.resolveAnimationByPurpose(bp);
    Object.assign(props, animationProps);

    // Add delay if specified
    if (bp.trigger.delayMs && bp.trigger.delayMs > 0) {
      props.transition = {
        ...props.transition,
        delay: bp.trigger.delayMs / 1000,
      };
    }

    return props;
  }

  /**
   * Resolve initial/whileInView/whileHover/whileTap based on the blueprint's purpose.
   */
  private resolveAnimationByPurpose(bp: MotionBlueprint): Partial<CompiledMotionProps> {
    const dir = bp.direction ?? 'up';
    const dist = this.getDirectionDistance(dir);

    switch (bp.purpose) {
      case 'reveal':
      case 'entrance':
        return this.buildRevealProps(bp, dist);

      case 'hover':
        return INTERACTION_TOKENS.hoverLift as Partial<CompiledMotionProps>;

      case 'tap':
        return INTERACTION_TOKENS.tapPress as Partial<CompiledMotionProps>;

      case 'scroll':
        return this.buildScrollProps(bp, dist);

      case 'parallax':
        return this.buildParallaxProps(bp);

      case 'stagger':
        return this.buildStaggerProps(bp);

      case 'cinematic':
        return this.buildCinematicProps(bp);

      case 'text-reveal':
        return {
          initial: { clipPath: 'inset(0 100% 0 0)' },
          whileInView: { clipPath: 'inset(0 0% 0 0)' },
        };

      case 'blur-in':
        return {
          initial: { filter: 'blur(8px)', opacity: 0 },
          whileInView: { filter: 'blur(0px)', opacity: 1 },
        };

      case 'rotate-in':
        return {
          initial: { rotate: -8, opacity: 0 },
          whileInView: { rotate: 0, opacity: 1 },
        };

      case 'scale-in':
        return {
          initial: { scale: 0.92, opacity: 0 },
          whileInView: { scale: 1, opacity: 1 },
        };

      case 'bounce-in':
        return {
          initial: { scale: 0, opacity: 0 },
          whileInView: { scale: 1, opacity: 1 },
          transition: { type: 'spring', stiffness: 400, damping: 15 },
        };

      case 'countup':
        return REVEAL_TOKENS.statReveal as Partial<CompiledMotionProps>;

      case 'marquee':
        return {
          animate: { x: [0, -1000] },
          transition: { duration: 20, ease: 'linear', repeat: Infinity },
        };

      case 'unveil':
        return {
          initial: { clipPath: 'inset(100% 0 0 0)' },
          whileInView: { clipPath: 'inset(0% 0 0 0)' },
        };

      case 'glitch':
        return {
          initial: { x: -4, opacity: 0 },
          whileInView: { x: 0, opacity: 1 },
        };

      case 'exit':
      case 'none':
        return {};

      default:
        // Default: subtle fade-up reveal
        return {
          initial: { y: 20, opacity: 0 },
          whileInView: { y: 0, opacity: 1 },
        };
    }
  }

  /**
   * Build reveal props based on blueprint target and direction.
   */
  private buildRevealProps(bp: MotionBlueprint, dist: number): Partial<CompiledMotionProps> {
    // Target-specific defaults
    const targetDefaults: Record<string, Partial<CompiledMotionProps>> = {
      card: REVEAL_TOKENS.cardReveal as Partial<CompiledMotionProps>,
      'text-heading': {
        initial: { y: 16, opacity: 0 },
        whileInView: { y: 0, opacity: 1 },
      },
      media: {
        initial: { scale: 1.05, opacity: 0 },
        whileInView: { scale: 1, opacity: 1 },
      },
      overlay: {
        initial: { opacity: 0 },
        whileInView: { opacity: 1 },
      },
      icon: {
        initial: { scale: 0.8, opacity: 0 },
        whileInView: { scale: 1, opacity: 1 },
      },
      badge: {
        initial: { scale: 0.9, opacity: 0 },
        whileInView: { scale: 1, opacity: 1 },
      },
    };

    const defaults = targetDefaults[bp.target] ?? {
      initial: { y: dist, opacity: 0 },
      whileInView: { y: 0, opacity: 1 },
    };

    return defaults;
  }

  /**
   * Build scroll-linked animation props.
   */
  private buildScrollProps(bp: MotionBlueprint, dist: number): Partial<CompiledMotionProps> {
    return {
      initial: { y: dist, opacity: 0.5 },
      whileInView: { y: 0, opacity: 1 },
    };
  }

  /**
   * Build parallax props.
   */
  private buildParallaxProps(bp: MotionBlueprint): Partial<CompiledMotionProps> {
    const speed = bp.physics.mass ?? 0.5;
    return {
      initial: { y: 40 * speed },
      whileInView: { y: 0 },
    };
  }

  /**
   * Build stagger props (for parent container).
   */
  private buildStaggerProps(bp: MotionBlueprint): Partial<CompiledMotionProps> {
    return {
      transition: {
        staggerChildren: bp.stagger?.delayMs
          ? bp.stagger.delayMs / 1000
          : STAGGER_TOKENS.gridStagger.staggerChildren,
        delayChildren: STAGGER_TOKENS.gridStagger.delayChildren,
      },
    };
  }

  /**
   * Build cinematic props.
   */
  private buildCinematicProps(bp: MotionBlueprint): Partial<CompiledMotionProps> {
    const dir = bp.direction ?? 'up';
    switch (dir) {
      case 'scale':
        return {
          initial: { scale: 1.2, opacity: 0 },
          whileInView: { scale: 1, opacity: 1 },
          transition: { duration: 1.0, ease: [0.0, 0.0, 0.2, 1] },
        };
      case 'left':
      case 'right':
        return {
          initial: { x: dir === 'left' ? -60 : 60, opacity: 0 },
          whileInView: { x: 0, opacity: 1 },
          transition: { duration: 0.8, ease: [0.0, 0.0, 0.2, 1] },
        };
      default:
        return {
          initial: { y: 40, opacity: 0 },
          whileInView: { y: 0, opacity: 1 },
          transition: { duration: 0.7, ease: [0.0, 0.0, 0.2, 1] },
        };
    }
  }

  /**
   * Compile physics config into Framer Motion transition.
   */
  private compilePhysics(physics: MotionPhysics): Record<string, unknown> {
    if (physics.type === 'spring') {
      return {
        type: 'spring',
        stiffness: physics.stiffness ?? 300,
        damping: physics.damping ?? 20,
        mass: physics.mass ?? 1,
        ...(physics.bounce !== undefined ? { bounce: physics.bounce } : {}),
      };
    }

    if (physics.type === 'keyframes') {
      return {
        type: 'tween',
        duration: (physics.durationMs ?? 500) / 1000,
        ease: physics.easing ?? 'easeInOut',
      };
    }

    // Default tween
    return {
      type: 'tween',
      duration: (physics.durationMs ?? 500) / 1000,
      ease: physics.easing ?? [0.4, 0, 0.2, 1],
    };
  }

  /**
   * Compile reduced motion fallback.
   */
  private compileReducedMotion(bp: MotionBlueprint): CompiledMotionProps {
    const fallback = bp.reducedMotionFallback;
    if (!fallback || fallback.type === 'none') {
      return { ssrVisible: true };
    }

    if (fallback.type === 'instant-reveal') {
      return {
        ...REDUCED_MOTION_TOKENS.instantReveal,
        ssrVisible: true,
      };
    }

    if (fallback.type === 'fade') {
      return {
        initial: { opacity: 0 },
        whileInView: { opacity: 1 },
        transition: { duration: (fallback.durationMs ?? 100) / 1000 },
        ssrVisible: true,
      };
    }

    // static
    return { ssrVisible: true };
  }

  // ─── Budget Management ──────────────────────────────────────────────────

  private resetBudget(): void {
    this.activeAnimationCount = 0;
    this.activeMovingLayers = 0;
    this.activeParallaxGroups = 0;
    this.activeStickyScenes = 0;
    this.totalJsBytes = 0;
  }

  private checkBudget(bp: MotionBlueprint): { allowed: boolean; reason?: string } {
    if (this.activeAnimationCount >= this.budget.maxSimultaneous) {
      return { allowed: false, reason: `Budget exceeded: max ${this.budget.maxSimultaneous} simultaneous animations` };
    }

    if (bp.budgetCategory === '3d' || bp.budgetCategory === 'particle') {
      if (this.activeMovingLayers >= this.budget.maxMovingLayers) {
        return { allowed: false, reason: `Budget exceeded: max ${this.budget.maxMovingLayers} moving layers` };
      }
    }

    if (bp.purpose === 'parallax') {
      if (this.activeParallaxGroups >= this.budget.maxParallaxGroups) {
        return { allowed: false, reason: `Budget exceeded: max ${this.budget.maxParallaxGroups} parallax groups` };
      }
    }

    if (bp.purpose === 'sticky') {
      if (this.activeStickyScenes >= this.budget.maxStickyScenes) {
        return { allowed: false, reason: `Budget exceeded: max ${this.budget.maxStickyScenes} sticky scenes` };
      }
    }

    return { allowed: true };
  }

  private incrementBudget(bp: MotionBlueprint, costBytes: number): void {
    this.activeAnimationCount++;
    this.totalJsBytes += costBytes;

    if (bp.budgetCategory === '3d' || bp.budgetCategory === 'particle') {
      this.activeMovingLayers++;
    }
    if (bp.purpose === 'parallax') {
      this.activeParallaxGroups++;
    }
    if (bp.purpose === 'sticky') {
      this.activeStickyScenes++;
    }
  }

  private estimateCost(props: CompiledMotionProps): number {
    // Rough estimate: each prop object is ~40-80 bytes serialized
    let cost = 0;
    if (props.initial) cost += 60;
    if (props.whileInView) cost += 60;
    if (props.animate) cost += 40;
    if (props.exit) cost += 40;
    if (props.whileHover) cost += 50;
    if (props.whileTap) cost += 50;
    if (props.transition) cost += 80;
    if (props.viewport) cost += 30;
    return cost;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private getDirectionDistance(dir: string): number {
    const distances: Record<string, number> = {
      up: 24,
      down: -24,
      left: 32,
      right: -32,
      scale: 0,
      rotate: 0,
      none: 0,
    };
    return distances[dir] ?? 24;
  }
}

// ─── Convenience Functions ──────────────────────────────────────────────────

/**
 * Compile a single blueprint with default budget.
 */
export function compileMotion(
  blueprint: MotionBlueprint,
  opts?: { reducedMotion?: boolean; budget?: AnimationBudget }
): CompilationResult {
  const compiler = new MotionCompiler(opts);
  return compiler.compile(blueprint);
}

/**
 * Compile a page of blueprints.
 */
export function compilePageMotion(
  pageBlueprint: PageMotionBlueprint,
  opts?: { reducedMotion?: boolean }
): Map<string, CompiledMotionProps> {
  const compiler = new MotionCompiler({
    budget: pageBlueprint.budget,
    reducedMotion: opts?.reducedMotion,
  });
  return compiler.compilePage(pageBlueprint);
}

/**
 * Create a simple reveal blueprint.
 */
export function createRevealBlueprint(opts: {
  id: string;
  target?: MotionBlueprint['target'];
  direction?: MotionBlueprint['direction'];
  purpose?: MotionBlueprint['purpose'];
  trigger?: Partial<MotionBlueprint['trigger']>;
  physics?: Partial<MotionPhysics>;
}): MotionBlueprint {
  return {
    id: opts.id,
    target: opts.target ?? 'card',
    purpose: opts.purpose ?? 'reveal',
    direction: opts.direction ?? 'up',
    trigger: {
      type: 'viewport',
      viewportAmount: 0.3,
      once: true,
      ...opts.trigger,
    },
    physics: {
      type: 'tween',
      durationMs: 500,
      easing: [0.4, 0, 0.2, 1],
      ...opts.physics,
    },
    budgetCategory: 'standard',
    skippable: true,
    maxDurationMs: 2000,
    reducedMotionFallback: { type: 'instant-reveal' },
  };
}

// Re-export types for convenience
type MotionBlueprint_ = MotionBlueprint;
type MotionPhysics_ = MotionPhysics;
