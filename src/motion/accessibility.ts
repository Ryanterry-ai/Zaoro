// ─── Accessibility Layer ────────────────────────────────────────────────────
//
// Automatic reduced motion cascade.
// When prefers-reduced-motion is active:
//   1. Disable parallax
//   2. Disable camera animations
//   3. Replace with simple fade
//   4. Disable particles
//   5. Disable sound-triggered animations
// No manual work required.
// ─────────────────────────────────────────────────────────────────────────────

import type { MotionBlueprint, CompiledMotionProps, ReducedMotionFallback } from './types.js';

// ─── Reduced Motion Cascade ─────────────────────────────────────────────────

/**
 * Given a blueprint and reduced-motion state, produce safe props.
 * This is the AUTOMATIC cascade — no manual per-component work.
 */
export function applyReducedMotion(
  blueprint: MotionBlueprint,
  reducedMotion: boolean
): CompiledMotionProps {
  if (!reducedMotion) return { ssrVisible: true } as CompiledMotionProps; // Caller handles normal compilation

  const fallback = blueprint.reducedMotionFallback;

  // No fallback specified: disable animation entirely
  if (!fallback || fallback.type === 'none') {
    return { ssrVisible: true } as CompiledMotionProps;
  }

  switch (fallback.type) {
    case 'instant-reveal':
      return {
        ssrVisible: true,
        // No initial/whileInView — content is always visible
      } as CompiledMotionProps;

    case 'fade':
      return {
        initial: { opacity: 0 },
        whileInView: { opacity: 1 },
        transition: { duration: (fallback.durationMs ?? 100) / 1000 },
        ssrVisible: true,
      } as CompiledMotionProps;

    case 'static':
      return {
        ssrVisible: true,
        // No animation at all
      } as CompiledMotionProps;

    default:
      return { ssrVisible: true } as CompiledMotionProps;
  }
}

/**
 * Auto-detect and disable unsafe animations for reduced motion.
 * Parallax, camera, particles, and marquee are always disabled.
 */
export function getReducedMotionOverrides(
  blueprints: MotionBlueprint[],
  reducedMotion: boolean
): Map<string, CompiledMotionProps> {
  const overrides = new Map<string, CompiledMotionProps>();

  if (!reducedMotion) return overrides;

  for (const bp of blueprints) {
    // These animation types are ALWAYS disabled in reduced motion
    const unsafeForReducedMotion = [
      'parallax', 'camera-push', 'camera-orbit', 'particle',
      'marquee', 'magnetic', 'depth-blur', 'morph',
    ];

    if (unsafeForReducedMotion.includes(bp.purpose)) {
      overrides.set(bp.id, {
        ssrVisible: true,
        // Completely disabled — content remains visible
      });
    }
  }

  return overrides;
}

/**
 * Generate CSS class for reduced motion.
 * Used in the generated component's className.
 */
export function getReducedMotionClass(): string {
  return 'motion-reduced';
}

/**
 * Generate the CSS that disables animations for reduced motion.
 * This goes into globals.css of the generated project.
 */
export function generateReducedMotionCss(): string {
  return `
/* ─── Reduced Motion ─────────────────────────────────────────────────────── */
/* Automatically disables animations when prefers-reduced-motion is active. */
/* No manual per-component work needed. */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .motion-reduced {
    animation: none !important;
    transition: none !important;
  }

  /* Ensure all content is visible */
  [style*="opacity: 0"],
  [style*="opacity:0"] {
    opacity: 1 !important;
  }

  /* Disable parallax */
  [style*="transform: translateY"] {
    transform: none !important;
  }
}
`.trim();
}

/**
 * Generate the hydration-safe wrapper CSS.
 * Ensures content is visible before JS hydrates.
 */
export function generateHydrationCss(): string {
  return `
/* ─── Hydration Safety ────────────────────────────────────────────────────── */
/* Content is always visible. Animations enhance after hydration. */

/* Before hydration: no motion classes applied */
.no-js [data-motion] {
  opacity: 1 !important;
  transform: none !important;
}

/* After hydration: motion classes take effect */
[data-motion-ready] [data-motion] {
  /* Animations controlled by Framer Motion */
}
`.trim();
}

/**
 * Check if an animation is safe to run (not harmful for accessibility).
 */
export function isAnimationAccessible(blueprint: MotionBlueprint): boolean {
  // Animations that flash, strobe, or move rapidly are not accessible
  const unsafePurposes = ['glitch', 'particle'];

  if (unsafePurposes.includes(blueprint.purpose)) {
    // Check if it has a reduced motion fallback
    return !!blueprint.reducedMotionFallback;
  }

  // Parallax can cause vestibular issues
  if (blueprint.purpose === 'parallax') {
    return !!blueprint.reducedMotionFallback;
  }

  return true;
}
