// ─── Motion Engine ──────────────────────────────────────────────────────────
//
// Drives animation from COMPOSABLE CAPABILITIES, selected deterministically
// from strategy signals (animation level, style, pacing, conversion goal,
// performance tier) — never from an industry-name lookup.
//
// This replaces the old hardcoded INDUSTRY_MOTION vertical-template map.
// Capabilities compose to serve ANY business type through one pipeline.
// ─────────────────────────────────────────────────────────────────────────────

import type { DesignSubEngine, DesignContext, DesignRecommendation, AnimationSuggestion, MotionTokens } from '../types.js';
import { DEFAULT_ANIMATION_BUDGET } from '../../../motion/tokens.js';
import type { MotionBlueprint } from '../../../motion/types.js';
import {
  capabilityRegistry,
  selectCapabilities,
  performanceTierFromBudget,
  type SelectionInput,
} from '../../../motion/capabilities/index.js';
import { strategyToSelectionInput } from '../../experience-os/capability-selection.js';

// ─── Context → Selection mapping ────────────────────────────────────────────

/**
 * Map a DesignContext to deterministic capability-selection signals.
 *
 * Strategy-driven (M2): when `ctx.experienceStrategy` is present, all five
 * signals (level, style, pacing, conversion goal, performance tier) come from
 * the ExperienceStrategy — the canonical source of motion intent. This is the
 * single deterministic mapping shared with ExperienceOS via
 * `strategyToSelectionInput`.
 *
 * Personality-driven (fallback): when no strategy is present, style is derived
 * from the user's PERSONALITY signal (not an industry lookup) and pacing /
 * conversionGoal are wildcards — still deterministic, never industry-keyed.
 */
function contextToSelection(ctx: DesignContext): SelectionInput {
  if (ctx.experienceStrategy) {
    return strategyToSelectionInput(ctx.experienceStrategy);
  }
  const level = ctx.preferences?.animationLevel ?? 'moderate';
  const style = ctx.personality?.toLowerCase();
  const performanceTier = performanceTierFromBudget(DEFAULT_ANIMATION_BUDGET.maxSimultaneous);
  return { level, style, performanceTier };
}

// ─── Motion Engine ──────────────────────────────────────────────────────────

export class MotionEngine implements DesignSubEngine {
  readonly name = 'Motion Engine';
  readonly domain = 'motion' as const;

  recommend(ctx: DesignContext): DesignRecommendation[] {
    const sel = contextToSelection(ctx);
    const caps = capabilityRegistry.select(sel);
    const level = sel.level;
    const recs: DesignRecommendation[] = [];

    const tokens: MotionTokens = {
      duration: { fast: '150ms', normal: '250ms', slow: '400ms', slower: '600ms' },
      easing: {
        default: 'cubic-bezier(0.4, 0, 0.2, 1)',
        in: 'cubic-bezier(0.4, 0, 1, 1)',
        out: 'cubic-bezier(0, 0, 0.2, 1)',
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      reducedMotion: true,
    };

    // Motion tokens
    recs.push({
      domain: 'motion',
      title: 'Motion Tokens',
      description: `${level} animation level with ${tokens.duration.normal} default duration`,
      confidence: 0.9,
      priority: 'must',
      tokens: tokens as unknown as Record<string, unknown>,
    });

    // Selected capability set (composable, deterministic)
    const animations: AnimationSuggestion[] = [];
    const ALLOWED: AnimationSuggestion['type'][] = ['entrance', 'exit', 'hover', 'scroll', 'transition', 'micro'];
    for (const cap of caps) {
      if (cap.signals.default) continue;
      // Surface up to two representative animation types per capability
      const types = cap.fulfills.filter(p => (ALLOWED as string[]).includes(p)) as AnimationSuggestion['type'][];
      const reps = types.length > 0 ? types.slice(0, 2) : (['micro'] as AnimationSuggestion['type'][]);
      for (const t of reps) {
        animations.push({ name: `${cap.name} · ${t}`, type: t, config: {} });
      }
    }

    recs.push({
      domain: 'motion',
      title: 'Capability Set',
      description: `${caps.length} composable motion capabilities selected from strategy signals`,
      confidence: 0.9,
      priority: 'must',
      tokens: {
        capabilities: caps.map(c => c.id),
        dependencies: capabilityRegistry.dependenciesFor(caps),
      },
      animations,
    });

    // Capability-specific recommendations
    for (const cap of caps) {
      if (cap.signals.default) continue; // base safety nets described separately
      recs.push({
        domain: 'motion',
        title: cap.name,
        description: cap.description,
        confidence: 0.85,
        priority: cap.performanceTier === 'light' ? 'should' : 'nice',
        tokens: {
          id: cap.id,
          category: cap.category,
          dependencies: cap.dependencies,
          ssrSafe: cap.ssrSafe,
          mobileSafe: cap.mobileSafe,
          reducedMotionSafe: cap.reducedMotionSafe,
        },
      });
    }

    // Reduced motion (always)
    recs.push({
      domain: 'motion',
      title: 'Reduced Motion',
      description: 'Respect prefers-reduced-motion media query; content stays instantly visible.',
      confidence: 1.0,
      priority: 'must',
      tokens: { respectReducedMotion: true, fallbackDuration: '0ms' },
    });

    // Scroll animations (when motion enabled)
    if (level !== 'none') {
      recs.push({
        domain: 'motion',
        title: 'Scroll Animations',
        description: 'Scroll-triggered reveal animations with viewport detection',
        confidence: 0.8,
        priority: 'nice',
        tokens: { scrollTrigger: 'whileInView', viewportOnce: true },
      });
    }

    // Page transitions
    if (caps.some(c => c.id === 'premium-transitions')) {
      recs.push({
        domain: 'motion',
        title: 'Page Transitions',
        description: 'AnimatePresence-based route and layout transitions',
        confidence: 0.75,
        priority: 'nice',
        tokens: { transitionType: 'fade', duration: tokens.duration.normal },
      });
    }

    return recs;
  }

  /**
   * Generate MotionBlueprints for a page's components.
   * Single source of animation intent — the renderer consumes these.
   * The set of purposes honours the selected capability set (no industry presets).
   */
  generateBlueprints(
    ctx: DesignContext,
    components: Array<{ type: string; props?: Record<string, unknown> }>
  ): MotionBlueprint[] {
    const sel = contextToSelection(ctx);
    const caps = capabilityRegistry.select(sel);
    const level = sel.level;

    if (level === 'none') return [];

    const hasThree = caps.some(c => c.id === 'three-r3f');
    const blueprints: MotionBlueprint[] = [];

    for (let i = 0; i < components.length; i++) {
      const comp = components[i];
      const type = comp.type.toLowerCase();
      const isHero = i === 0 || type.includes('hero');
      const isCard = type.includes('card') || type.includes('feature');
      const isMedia = type.includes('gallery') || type.includes('image') || type.includes('video');

      // Section wrapper: NEVER animate for visibility (SSR-safe rule)
      if (i === 0 || type.includes('section')) {
        blueprints.push({
          id: `${type}-wrapper-${i}`,
          target: 'section-wrapper',
          purpose: 'reveal',
          direction: 'none',
          trigger: { type: 'viewport', viewportAmount: 0.3, once: true },
          physics: { type: 'tween', durationMs: 0 },
          budgetCategory: 'standard',
          skippable: true,
          maxDurationMs: 0,
          reducedMotionFallback: { type: 'none' },
        });
      }

      // Hero: cinematic reveal (uses gsap/cinematic capabilities when present)
      if (isHero) {
        blueprints.push({
          id: `${type}-hero-reveal`,
          target: 'section-inner',
          purpose: hasThree ? 'camera-push' : 'cinematic',
          direction: 'up',
          trigger: { type: 'viewport', viewportAmount: 0.3, once: true },
          physics: { type: 'tween', durationMs: 700, easing: [0.0, 0.0, 0.2, 1] },
          budgetCategory: 'critical',
          skippable: false,
          maxDurationMs: 1000,
          reducedMotionFallback: { type: 'instant-reveal' },
        });
      }

      // Cards: staggered reveal
      if (isCard) {
        blueprints.push({
          id: `${type}-card-${i}`,
          target: 'card',
          purpose: 'reveal',
          direction: 'up',
          trigger: { type: 'viewport', viewportAmount: 0.2, once: true },
          physics: { type: 'tween', durationMs: 400, easing: [0.4, 0, 0.2, 1] },
          stagger: { delayMs: 80, from: 'first' },
          budgetCategory: 'standard',
          skippable: true,
          maxDurationMs: 600,
          reducedMotionFallback: { type: 'instant-reveal' },
        });
      }

      // Media: scale reveal (or 3D camera-orbit when three-r3f selected)
      if (isMedia) {
        blueprints.push({
          id: `${type}-media-${i}`,
          target: 'media',
          purpose: hasThree ? 'depth-blur' : 'reveal',
          direction: 'scale',
          trigger: { type: 'viewport', viewportAmount: 0.3, once: true },
          physics: { type: 'tween', durationMs: 500, easing: [0.4, 0, 0.2, 1] },
          budgetCategory: hasThree ? '3d' : 'standard',
          skippable: true,
          maxDurationMs: 800,
          reducedMotionFallback: { type: 'fade', durationMs: 100 },
        });
      }

      // Default: standard reveal
      if (!isHero && !isCard && !isMedia) {
        blueprints.push({
          id: `${type}-reveal-${i}`,
          target: 'card',
          purpose: 'reveal',
          direction: 'up',
          trigger: { type: 'viewport', viewportAmount: 0.3, once: true },
          physics: { type: 'tween', durationMs: 400, easing: [0.4, 0, 0.2, 1] },
          budgetCategory: 'standard',
          skippable: true,
          maxDurationMs: 600,
          reducedMotionFallback: { type: 'instant-reveal' },
        });
      }
    }

    // Hover interactions (only if hover-choreography capability selected)
    if (caps.some(c => c.id === 'hover-choreography')) {
      blueprints.push({
        id: 'button-hover',
        target: 'button',
        purpose: 'hover',
        trigger: { type: 'hover' },
        physics: { type: 'spring', stiffness: 400, damping: 17 },
        budgetCategory: 'decorative',
        skippable: true,
        maxDurationMs: 300,
      });
    }

    return blueprints;
  }
}

export function createMotionEngine(): MotionEngine {
  return new MotionEngine();
}
