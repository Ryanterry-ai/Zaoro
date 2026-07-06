// ─── Motion Engine ──────────────────────────────────────────────────────────
//
// Wraps Framer Motion capabilities. Handles:
//   - Entrance/exit animations
//   - Scroll-triggered animations
//   - Hover and interaction animations
//   - Page transition animations
//   - Micro-interactions
//   - Reduced motion accessibility
// ─────────────────────────────────────────────────────────────────────────────

import type { DesignSubEngine, DesignContext, DesignRecommendation, AnimationSuggestion, MotionTokens } from '../types.js';

// ─── Motion Presets ─────────────────────────────────────────────────────────

const INDUSTRY_MOTION: Record<string, {
  level: 'none' | 'subtle' | 'moderate' | 'expressive';
  tokens: MotionTokens;
  animations: AnimationSuggestion[];
}> = {
  'ecommerce': {
    level: 'moderate',
    tokens: { duration: { fast: '150ms', normal: '250ms', slow: '400ms', slower: '600ms' }, easing: { default: 'cubic-bezier(0.4, 0, 0.2, 1)', in: 'cubic-bezier(0.4, 0, 1, 1)', out: 'cubic-bezier(0, 0, 0.2, 1)', bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }, reducedMotion: true },
    animations: [
      { name: 'fadeInUp', type: 'entrance', config: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } } },
      { name: 'scaleOnHover', type: 'hover', config: { whileHover: { scale: 1.02 }, transition: { type: 'spring', stiffness: 300 } } },
      { name: 'slideInRight', type: 'entrance', config: { initial: { x: 100, opacity: 0 }, animate: { x: 0, opacity: 1 } } },
    ],
  },
  'saas': {
    level: 'subtle',
    tokens: { duration: { fast: '100ms', normal: '200ms', slow: '350ms', slower: '500ms' }, easing: { default: 'cubic-bezier(0.4, 0, 0.2, 1)', in: 'cubic-bezier(0.4, 0, 1, 1)', out: 'cubic-bezier(0, 0, 0.2, 1)', bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }, reducedMotion: true },
    animations: [
      { name: 'fadeIn', type: 'entrance', config: { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } } },
      { name: 'slideUp', type: 'entrance', config: { initial: { y: 10, opacity: 0 }, animate: { y: 0, opacity: 1 } } },
      { name: 'scalePress', type: 'hover', config: { whileTap: { scale: 0.98 } } },
    ],
  },
  'fintech': {
    level: 'subtle',
    tokens: { duration: { fast: '100ms', normal: '200ms', slow: '300ms', slower: '500ms' }, easing: { default: 'cubic-bezier(0.4, 0, 0.2, 1)', in: 'cubic-bezier(0.4, 0, 1, 1)', out: 'cubic-bezier(0, 0, 0.2, 1)', bounce: 'cubic-bezier(0, 0, 0.2, 1)' }, reducedMotion: true },
    animations: [
      { name: 'countUp', type: 'entrance', config: { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } } },
      { name: 'slideIn', type: 'entrance', config: { initial: { x: -20, opacity: 0 }, animate: { x: 0, opacity: 1 } } },
    ],
  },
  'healthcare': {
    level: 'subtle',
    tokens: { duration: { fast: '150ms', normal: '250ms', slow: '400ms', slower: '600ms' }, easing: { default: 'cubic-bezier(0.4, 0, 0.2, 1)', in: 'cubic-bezier(0.4, 0, 1, 1)', out: 'cubic-bezier(0, 0, 0.2, 1)', bounce: 'cubic-bezier(0, 0, 0.2, 1)' }, reducedMotion: true },
    animations: [
      { name: 'fadeIn', type: 'entrance', config: { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } } },
      { name: 'gentleSlide', type: 'entrance', config: { initial: { y: 10, opacity: 0 }, animate: { y: 0, opacity: 1 } } },
    ],
  },
  'education': {
    level: 'moderate',
    tokens: { duration: { fast: '150ms', normal: '250ms', slow: '400ms', slower: '600ms' }, easing: { default: 'cubic-bezier(0.4, 0, 0.2, 1)', in: 'cubic-bezier(0.4, 0, 1, 1)', out: 'cubic-bezier(0, 0, 0.2, 1)', bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }, reducedMotion: true },
    animations: [
      { name: 'popIn', type: 'entrance', config: { initial: { scale: 0.9, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { type: 'spring', stiffness: 300 } } },
      { name: 'progressFill', type: 'entrance', config: { initial: { width: '0%' }, animate: { width: '100%' } } },
    ],
  },
  'restaurant': {
    level: 'moderate',
    tokens: { duration: { fast: '150ms', normal: '300ms', slow: '500ms', slower: '700ms' }, easing: { default: 'cubic-bezier(0.4, 0, 0.2, 1)', in: 'cubic-bezier(0.4, 0, 1, 1)', out: 'cubic-bezier(0, 0, 0.2, 1)', bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }, reducedMotion: true },
    animations: [
      { name: 'zoomIn', type: 'entrance', config: { initial: { scale: 1.1, opacity: 0 }, animate: { scale: 1, opacity: 1 } } },
      { name: 'slideReveal', type: 'scroll', config: { whileInView: { opacity: 1, y: 0 }, viewport: { once: true } } },
    ],
  },
  'fitness': {
    level: 'expressive',
    tokens: { duration: { fast: '100ms', normal: '200ms', slow: '350ms', slower: '500ms' }, easing: { default: 'cubic-bezier(0.4, 0, 0.2, 1)', in: 'cubic-bezier(0.4, 0, 1, 1)', out: 'cubic-bezier(0, 0, 0.2, 1)', bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }, reducedMotion: true },
    animations: [
      { name: 'bounceIn', type: 'entrance', config: { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { type: 'spring', stiffness: 400, damping: 15 } } },
      { name: 'pulseGlow', type: 'micro', config: { animate: { boxShadow: ['0 0 0 0 rgba(249,115,22,0.4)', '0 0 0 10px rgba(249,115,22,0)'] }, transition: { repeat: Infinity, duration: 2 } } },
    ],
  },
  'real-estate': {
    level: 'subtle',
    tokens: { duration: { fast: '150ms', normal: '250ms', slow: '400ms', slower: '600ms' }, easing: { default: 'cubic-bezier(0.4, 0, 0.2, 1)', in: 'cubic-bezier(0.4, 0, 1, 1)', out: 'cubic-bezier(0, 0, 0.2, 1)', bounce: 'cubic-bezier(0, 0, 0.2, 1)' }, reducedMotion: true },
    animations: [
      { name: 'imageZoom', type: 'hover', config: { whileHover: { scale: 1.05 }, transition: { duration: 0.3 } } },
      { name: 'cardLift', type: 'hover', config: { whileHover: { y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' } } },
    ],
  },
  'media': {
    level: 'moderate',
    tokens: { duration: { fast: '150ms', normal: '250ms', slow: '400ms', slower: '600ms' }, easing: { default: 'cubic-bezier(0.4, 0, 0.2, 1)', in: 'cubic-bezier(0.4, 0, 1, 1)', out: 'cubic-bezier(0, 0, 0.2, 1)', bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }, reducedMotion: true },
    animations: [
      { name: 'staggerChildren', type: 'entrance', config: { staggerChildren: 0.1 } },
      { name: 'parallaxScroll', type: 'scroll', config: { whileScroll: { y: [0, -50] } } },
    ],
  },
  'portfolio': {
    level: 'expressive',
    tokens: { duration: { fast: '150ms', normal: '300ms', slow: '500ms', slower: '800ms' }, easing: { default: 'cubic-bezier(0.4, 0, 0.2, 1)', in: 'cubic-bezier(0.4, 0, 1, 1)', out: 'cubic-bezier(0, 0, 0.2, 1)', bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }, reducedMotion: true },
    animations: [
      { name: 'revealText', type: 'entrance', config: { initial: { clipPath: 'inset(0 100% 0 0)' }, animate: { clipPath: 'inset(0 0% 0 0)' } } },
      { name: 'morphShape', type: 'micro', config: { animate: { borderRadius: ['0%', '50%', '0%'] }, transition: { repeat: Infinity, duration: 3 } } },
      { name: 'parallaxHero', type: 'scroll', config: { whileScroll: { y: [0, -100], opacity: [1, 0.5] } } },
    ],
  },
  'marketplace': {
    level: 'moderate',
    tokens: { duration: { fast: '150ms', normal: '250ms', slow: '400ms', slower: '600ms' }, easing: { default: 'cubic-bezier(0.4, 0, 0.2, 1)', in: 'cubic-bezier(0.4, 0, 1, 1)', out: 'cubic-bezier(0, 0, 0.2, 1)', bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }, reducedMotion: true },
    animations: [
      { name: 'gridReveal', type: 'entrance', config: { staggerChildren: 0.05 } },
      { name: 'cardHover', type: 'hover', config: { whileHover: { y: -4, scale: 1.01 } } },
    ],
  },
  'nonprofit': {
    level: 'subtle',
    tokens: { duration: { fast: '150ms', normal: '300ms', slow: '500ms', slower: '700ms' }, easing: { default: 'cubic-bezier(0.4, 0, 0.2, 1)', in: 'cubic-bezier(0.4, 0, 1, 1)', out: 'cubic-bezier(0, 0, 0.2, 1)', bounce: 'cubic-bezier(0, 0, 0.2, 1)' }, reducedMotion: true },
    animations: [
      { name: 'countUp', type: 'entrance', config: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } } },
      { name: 'scrollReveal', type: 'scroll', config: { whileInView: { opacity: 1, y: 0 }, viewport: { once: true } } },
    ],
  },
};

// ─── Motion Engine ──────────────────────────────────────────────────────────

export class MotionEngine implements DesignSubEngine {
  readonly name = 'Motion Engine';
  readonly domain = 'motion' as const;

  recommend(ctx: DesignContext): DesignRecommendation[] {
    const motion = INDUSTRY_MOTION[ctx.industry] ?? INDUSTRY_MOTION['saas']!;
    const level = ctx.preferences?.animationLevel ?? motion.level;
    const recs: DesignRecommendation[] = [];

    // Motion tokens
    recs.push({
      domain: 'motion',
      title: 'Motion Tokens',
      description: `${level} animation level with ${motion.tokens.duration.normal} default duration`,
      confidence: 0.9,
      priority: 'must',
      tokens: motion.tokens as unknown as Record<string, unknown>,
    });

    // Animation suggestions
    recs.push({
      domain: 'motion',
      title: 'Animation Library',
      description: `${motion.animations.length} pre-configured Framer Motion animations`,
      confidence: 0.85,
      priority: 'should',
      animations: motion.animations.filter(a => level !== 'none' || a.type !== 'micro'),
    });

    // Scroll animations
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

    // Reduced motion
    recs.push({
      domain: 'motion',
      title: 'Reduced Motion',
      description: 'Respect prefers-reduced-motion media query',
      confidence: 1.0,
      priority: 'must',
      tokens: { respectReducedMotion: true, fallbackDuration: '0ms' },
    });

    // Page transitions
    recs.push({
      domain: 'motion',
      title: 'Page Transitions',
      description: 'AnimatePresence-based page transitions',
      confidence: 0.75,
      priority: 'nice',
      tokens: { transitionType: 'fade', duration: motion.tokens.duration.normal },
    });

    return recs;
  }
}

export function createMotionEngine(): MotionEngine {
  return new MotionEngine();
}
