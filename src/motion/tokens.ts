// ─── Motion Tokens ──────────────────────────────────────────────────────────
//
// Single source of truth for ALL animation values.
// Just like colors and typography, animations reference tokens.
// Never use raw values — always reference these tokens.
//
// Every token is a named, reusable animation primitive.
// The Motion Compiler resolves blueprints → tokens → Framer Motion props.
// ─────────────────────────────────────────────────────────────────────────────

import type { MotionBlueprint, CompiledMotionProps, AnimationBudget } from './types.js';

// ─── Reveal Tokens ──────────────────────────────────────────────────────────

export const REVEAL_TOKENS = {
  /** Hero section — cinematic entrance, no opacity start for SSR */
  heroReveal: {
    initial: { y: 40, opacity: 0 },
    whileInView: { y: 0, opacity: 1 },
    transition: { duration: 0.7, ease: [0.0, 0.0, 0.2, 1] },
    viewport: { once: true, amount: 0.3 },
  },
  /** Card element — subtle lift */
  cardReveal: {
    initial: { y: 20, opacity: 0 },
    whileInView: { y: 0, opacity: 1 },
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
    viewport: { once: true, amount: 0.2 },
  },
  /** Section transition — gentle fade */
  sectionTransition: {
    initial: { opacity: 0 },
    whileInView: { opacity: 1 },
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
    viewport: { once: true, amount: 0.15 },
  },
  /** Stat number — count up entrance */
  statReveal: {
    initial: { y: 16, opacity: 0 },
    whileInView: { y: 0, opacity: 1 },
    transition: { duration: 0.4, ease: [0.0, 0.0, 0.2, 1] },
    viewport: { once: true, amount: 0.3 },
  },
  /** Feature grid item — staggered child */
  featureReveal: {
    initial: { y: 20, opacity: 0 },
    whileInView: { y: 0, opacity: 1 },
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
    viewport: { once: true, amount: 0.2 },
  },
} as const;

// ─── Interaction Tokens ─────────────────────────────────────────────────────

export const INTERACTION_TOKENS = {
  /** Button hover — subtle lift */
  hoverLift: {
    whileHover: { y: -2, scale: 1.01 },
    transition: { type: 'spring', stiffness: 400, damping: 17 },
  },
  /** Button hover — glow effect */
  hoverGlow: {
    whileHover: { boxShadow: '0 0 20px rgba(var(--primary), 0.3)' },
    transition: { duration: 0.2 },
  },
  /** Card hover — elevated shadow */
  cardHover: {
    whileHover: { y: -4, boxShadow: '0 10px 40px rgba(0,0,0,0.08)' },
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
  /** Button tap — press down */
  tapPress: {
    whileTap: { scale: 0.97 },
    transition: { type: 'spring', stiffness: 400, damping: 17 },
  },
  /** Magnetic cursor follow */
  magneticButton: {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
    transition: { type: 'spring', stiffness: 300, damping: 15 },
  },
} as const;

// ─── Scroll Tokens ──────────────────────────────────────────────────────────

export const SCROLL_TOKENS = {
  /** Parallax layer — moves at different scroll speed */
  parallaxLayer: (speed: number = 0.5) => ({
    initial: { y: 0 },
    style: { transform: `translateY(calc(var(--scroll) * ${speed}))` },
  }),
  /** Sticky section — pins to viewport */
  stickyExit: {
    position: 'sticky' as const,
    top: 0,
  },
  /** Scroll-linked horizontal movement */
  horizontalScroll: {
    initial: { x: 0 },
    whileInView: { x: -100 },
    transition: { duration: 20, ease: 'linear', repeat: Infinity },
  },
} as const;

// ─── Cinematic Tokens ───────────────────────────────────────────────────────

export const CINEMATIC_TOKENS = {
  /** Camera push — 3D depth zoom */
  cameraPush: {
    initial: { z: -200, opacity: 0 },
    whileInView: { z: 0, opacity: 1 },
    transition: { duration: 1.0, ease: [0.0, 0.0, 0.2, 1] },
    viewport: { once: true, amount: 0.3 },
  },
  /** Camera orbit — 3D rotation */
  cameraOrbit: {
    initial: { rotateY: -15, opacity: 0 },
    whileInView: { rotateY: 0, opacity: 1 },
    transition: { duration: 1.2, ease: [0.0, 0.0, 0.2, 1] },
    viewport: { once: true, amount: 0.3 },
  },
  /** Depth blur — focus plane effect */
  depthBlur: {
    initial: { filter: 'blur(8px)', opacity: 0 },
    whileInView: { filter: 'blur(0px)', opacity: 1 },
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
    viewport: { once: true, amount: 0.3 },
  },
} as const;

// ─── Builder Tokens ─────────────────────────────────────────────────────────

export const BUILDER_TOKENS = {
  /** Builder drop — element lands from above */
  builderDrop: {
    initial: { y: -30, opacity: 0, scale: 0.95 },
    animate: { y: 0, opacity: 1, scale: 1 },
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
} as const;

// ─── Stagger Tokens ─────────────────────────────────────────────────────────

export const STAGGER_TOKENS = {
  /** Grid children — sequential reveal */
  gridStagger: {
    staggerChildren: 0.08,
    delayChildren: 0.1,
  },
  /** List children — faster sequential reveal */
  listStagger: {
    staggerChildren: 0.05,
    delayChildren: 0.05,
  },
  /** Navigation items — entrance stagger */
  navStagger: {
    staggerChildren: 0.03,
    delayChildren: 0,
  },
} as const;

// ─── Reduced Motion Tokens ──────────────────────────────────────────────────

export const REDUCED_MOTION_TOKENS = {
  /** Replace all animations with instant reveal */
  instantReveal: {
    transition: { duration: 0 },
  },
  /** Replace animations with simple fade (fast) */
  simpleFade: {
    transition: { duration: 0.1 },
  },
  /** Static — no animation at all */
  static: {},
} as const;

// ─── All Tokens Registry ────────────────────────────────────────────────────

export const MOTION_TOKEN_REGISTRY = {
  ...REVEAL_TOKENS,
  ...INTERACTION_TOKENS,
  ...SCROLL_TOKENS,
  ...CINEMATIC_TOKENS,
  ...BUILDER_TOKENS,
  ...STAGGER_TOKENS,
  ...REDUCED_MOTION_TOKENS,
} as const;

// ─── Default Animation Budget ───────────────────────────────────────────────

export const DEFAULT_ANIMATION_BUDGET: AnimationBudget = {
  maxSimultaneous: 20,
  maxMovingLayers: 8,
  maxParallaxGroups: 4,
  maxStickyScenes: 2,
  targetFps: 60,
  maxAnimationJsBytes: 100 * 1024, // 100KB
} as const;

// ─── SSR Safety: Section Wrappers NEVER Animate ─────────────────────────────

/**
 * Section wrappers must always be visible in SSR.
 * This is the golden rule. Content is NEVER hidden.
 * Only decorative elements (cards, images, overlays) animate.
 */
export const SECTION_WRAPPER_PROPS: CompiledMotionProps = {
  ssrVisible: true,
};

/**
 * Check if a target should animate for visibility.
 * Returns false for section-wrapper and text-body.
 */
export function shouldAnimateVisibility(target: string): boolean {
  return target !== 'section-wrapper' && target !== 'text-body';
}
