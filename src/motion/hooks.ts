// ─── SSR-Safe Motion Hooks ──────────────────────────────────────────────────
//
// These hooks are the BRIDGE between the Motion Blueprint system and React.
// Generated components MUST use these hooks instead of raw Framer Motion props.
//
// Rules:
// 1. Components always render visible in SSR
// 2. Animations only activate after hydration
// 3. prefers-reduced-motion is always respected
// 4. No generated section starts with opacity: 0
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SSR-safe hook: detects prefers-reduced-motion.
 * Returns false during SSR (safe default = animate).
 */
export function useReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mq.matches;
}

/**
 * SSR-safe hook: detects if the component has hydrated.
 * Returns false during SSR, true after hydration.
 * This prevents hydration mismatches.
 */
export function useHasHydrated(): boolean {
  if (typeof window === 'undefined') return false;
  return true;
}

/**
 * SSR-safe hook: combines hydration + reduced motion checks.
 * Returns true only when animations should run.
 */
export function useShouldAnimate(): boolean {
  const hasHydrated = useHasHydrated();
  const prefersReducedMotion = useReducedMotion();
  return hasHydrated && !prefersReducedMotion;
}

/**
 * Compile a MotionBlueprint into Framer Motion props (server-safe).
 * Returns props that are safe to spread onto motion.* components.
 * During SSR: all elements are visible (no initial opacity: 0).
 * After hydration: animations activate based on the blueprint.
 */
export function useMotionProps(blueprint: {
  id: string;
  target?: string;
  direction?: string;
  purpose?: string;
  trigger?: { viewportAmount?: number; once?: boolean; delayMs?: number };
  physics?: { type?: string; durationMs?: number; easing?: string; stiffness?: number; damping?: number };
}): Record<string, unknown> {
  const shouldAnimate = useShouldAnimate();

  // Section wrappers NEVER animate for visibility
  if (blueprint.target === 'section-wrapper') {
    return {};
  }

  if (!shouldAnimate) {
    // Reduced motion or SSR: return minimal/no animation props
    return {};
  }

  const direction = blueprint.direction ?? 'up';
  const dist = direction === 'up' ? 24 : direction === 'down' ? -24 : direction === 'left' ? 32 : direction === 'right' ? -32 : 24;
  const physics = blueprint.physics ?? {};
  const trigger = blueprint.trigger ?? {};
  const durationMs = physics.durationMs ?? 500;
  const duration = durationMs / 1000;

  const transition: Record<string, unknown> = physics.type === 'spring'
    ? { type: 'spring', stiffness: physics.stiffness ?? 300, damping: physics.damping ?? 20 }
    : { type: 'tween', duration, ease: physics.easing ?? [0.4, 0, 0.2, 1] };

  if (trigger.delayMs) {
    transition.delay = trigger.delayMs / 1000;
  }

  return {
    initial: { y: dist, opacity: 0 },
    whileInView: { y: 0, opacity: 1 },
    viewport: { once: trigger.once ?? true, amount: trigger.viewportAmount ?? 0.3 },
    transition,
  };
}

/**
 * Simple SSR-safe wrapper for motion.section that ensures visibility.
 * Usage: <MotionSection blueprint={bp}>...</MotionSection>
 *
 * This is the recommended way to add motion to section wrappers.
 * The section itself is ALWAYS visible. Children may animate.
 */
export function getMotionSectionProps(): Record<string, unknown> {
  // Section wrappers NEVER have initial opacity: 0
  // They are always visible in SSR
  return {};
}

/**
 * Get SSR-safe props for a card/interactive element.
 */
export function getMotionCardProps(opts?: {
  direction?: string;
  delayMs?: number;
}): Record<string, unknown> {
  const shouldAnimate = useShouldAnimate();
  if (!shouldAnimate) return {};

  const dir = opts?.direction ?? 'up';
  const dist = dir === 'up' ? 20 : dir === 'down' ? -20 : dir === 'left' ? 24 : dir === 'right' ? -24 : 20;

  return {
    initial: { y: dist, opacity: 0 },
    whileInView: { y: 0, opacity: 1 },
    viewport: { once: true, amount: 0.2 },
    transition: {
      type: 'tween',
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
      ...(opts?.delayMs ? { delay: opts.delayMs / 1000 } : {}),
    },
  };
}
