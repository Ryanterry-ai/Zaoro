// ─── Motion Blueprint Types ─────────────────────────────────────────────────
//
// The single source of truth for animation intent.
// Experience Intelligence produces MotionBlueprints.
// The MotionCompiler compiles them into Framer Motion props.
// No component ever generates raw animation strings again.
// ─────────────────────────────────────────────────────────────────────────────

/** Where the animation lives in the DOM hierarchy */
export type MotionTarget =
  | 'section-wrapper'   // NEVER animated for visibility
  | 'section-inner'     // Container — only layout transitions
  | 'card'
  | 'button'
  | 'media'             // Images, videos, iframes
  | 'overlay'           // Decorative layers on top of content
  | 'floating'          // Floating UI elements (badges, pips)
  | 'decorative'        // Purely ornamental (particles, blurs)
  | 'text-heading'      // Headlines — subtle reveal only
  | 'text-body'         // Body copy — should NOT animate for readability
  | 'icon'
  | 'input'
  | 'badge'
  | 'navigation';

/** The animation's purpose */
export type MotionPurpose =
  | 'reveal'            // Content becomes visible on scroll
  | 'entrance'          // Element enters the page on mount
  | 'exit'              // Element leaves (page transitions)
  | 'hover'             // Interactive hover feedback
  | 'tap'               // Press/click feedback
  | 'scroll'            // Scroll-linked movement
  | 'parallax'          // Depth-based scroll movement
  | 'stagger'           // Sequential reveal of children
  | 'transition'        // State change (tab switch, accordion)
  | 'cinematic'         // Hero-level dramatic reveal
  | 'countup'           // Number counting animation
  | 'marquee'           // Infinite scroll loop
  | 'magnetic'          // Cursor-following element
  | 'sticky'            // Pin/unpin behavior
  | 'camera-push'       // 3D camera movement
  | 'camera-orbit'      // 3D rotation around point
  | 'depth-blur'        // Focus/defocus depth effect
  | 'particle'          // Particle system
  | 'morph'             // Shape morphing
  | 'text-reveal'       // Clip-path text animation
  | 'blur-in'           // Deblur entrance
  | 'rotate-in'         // Rotation entrance
  | 'scale-in'          // Scale entrance
  | 'bounce-in'         // Spring bounce entrance
  | 'glitch'            // Glitch effect
  | 'unveil'            // Curtain unveil
  | 'none';             // Explicitly no animation

/** A single Motion Blueprint — describes ONE animation intent */
export interface MotionBlueprint {
  /** Unique ID for this blueprint (e.g., "hero-reveal", "card-stagger-1") */
  id: string;
  /** The DOM element this animation targets */
  target: MotionTarget;
  /** What this animation does */
  purpose: MotionPurpose;
  /** Animation direction (for reveal/scroll types) */
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'rotate' | 'none';
  /** Trigger: when does this animation start? */
  trigger: MotionTrigger;
  /** Physics/easing configuration */
  physics: MotionPhysics;
  /** Stagger configuration (if animating children) */
  stagger?: MotionStagger;
  /** Budget category for resource allocation */
  budgetCategory: MotionBudgetCategory;
  /** Whether this animation is safe to skip for performance */
  skippable: boolean;
  /** Maximum duration in ms (hard cap) */
  maxDurationMs: number;
  /** Which motion tokens this references */
  tokenRefs?: string[];
  /** Reduced motion fallback (if omitted, animation is disabled) */
  reducedMotionFallback?: ReducedMotionFallback;
}

/** How the animation is triggered */
export interface MotionTrigger {
  type: 'scroll' | 'viewport' | 'mount' | 'hover' | 'tap' | 'gesture' | 'time' | 'manual';
  /** Viewport threshold (0-1) — how much of the element must be visible */
  viewportAmount?: number;
  /** Whether to trigger once or re-trigger */
  once?: boolean;
  /** Scroll offset in px or % for scroll-linked animations */
  scrollOffset?: number;
  /** Delay before animation starts (ms) */
  delayMs?: number;
}

/** Physics/easing configuration */
export interface MotionPhysics {
  type: 'spring' | 'tween' | 'keyframes';
  /** Duration in ms (for tween) */
  durationMs?: number;
  /** Easing curve name or custom bezier array [x1, y1, x2, y2] */
  easing?: string | number[];
  /** Spring stiffness (for spring type) */
  stiffness?: number;
  /** Spring damping (for spring type) */
  damping?: number;
  /** Spring mass (for spring type) */
  mass?: number;
  /** Bounce amount (0-1, for spring) */
  bounce?: number;
}

/** Stagger configuration for child animations */
export interface MotionStagger {
  /** Delay between each child (ms) */
  delayMs: number;
  /** How to calculate the stagger */
  from?: 'first' | 'last' | 'center' | number;
  /** Stagger direction for grid layouts */
  direction?: 'row' | 'column';
}

/** Budget categories for resource allocation */
export type MotionBudgetCategory =
  | 'critical'    // Hero, above-fold — always runs
  | 'important'   // Key content sections
  | 'standard'    // Regular content animations
  | 'decorative'  // Nice-to-have, can be dropped
  | '3d'          // Three.js / WebGL animations
  | 'particle';   // Particle systems

/** What to do when prefers-reduced-motion is active */
export interface ReducedMotionFallback {
  type: 'none' | 'instant-reveal' | 'fade' | 'static';
  /** Duration for the fallback (ms) — 0 = instant */
  durationMs?: number;
}

/** The complete Motion Blueprint for a page/section */
export interface PageMotionBlueprint {
  /** Page path */
  pagePath: string;
  /** All blueprints for this page */
  blueprints: MotionBlueprint[];
  /** Budget constraints */
  budget: AnimationBudget;
  /** Global motion settings */
  global: GlobalMotionSettings;
}

/** Animation budget constraints */
export interface AnimationBudget {
  /** Maximum simultaneous animations */
  maxSimultaneous: number;
  /** Maximum moving layers */
  maxMovingLayers: number;
  /** Maximum parallax groups */
  maxParallaxGroups: number;
  /** Maximum sticky scenes */
  maxStickyScenes: number;
  /** Target FPS */
  targetFps: number;
  /** Maximum animation JS size in bytes */
  maxAnimationJsBytes: number;
}

/** Global motion settings */
export interface GlobalMotionSettings {
  /** Whether animations are enabled at all */
  enabled: boolean;
  /** Global animation level */
  level: 'none' | 'subtle' | 'moderate' | 'expressive';
  /** Whether to respect prefers-reduced-motion */
  respectReducedMotion: boolean;
  /** Default viewport amount */
  defaultViewportAmount: number;
  /** Whether section wrappers should animate (ALWAYS false) */
  sectionWrapperAnimation: false;
}

/** The compiled output — ready for Framer Motion */
export interface CompiledMotionProps {
  /** Framer Motion initial props (empty for section wrappers) */
  initial?: Record<string, unknown>;
  /** Framer Motion whileInView props (empty for section wrappers) */
  whileInView?: Record<string, unknown>;
  /** Framer Motion animate props */
  animate?: Record<string, unknown>;
  /** Framer Motion exit props */
  exit?: Record<string, unknown>;
  /** Framer Motion whileHover props */
  whileHover?: Record<string, unknown>;
  /** Framer Motion whileTap props */
  whileTap?: Record<string, unknown>;
  /** Framer Motion viewport config */
  viewport?: { once?: boolean; amount?: number };
  /** Framer Motion transition config */
  transition?: Record<string, unknown>;
  /** Framer Motion layout props */
  layout?: boolean | string;
  /** CSS class to add for reduced motion */
  reducedMotionClass?: string;
  /** Whether this element should be visible by default (SSR) */
  ssrVisible: boolean;
}

/** Compilation result with metadata */
export interface CompilationResult {
  /** Compiled Framer Motion props */
  props: CompiledMotionProps;
  /** The original blueprint */
  blueprint: MotionBlueprint;
  /** Whether this animation was skipped (budget) */
  skipped: boolean;
  /** Reason if skipped */
  skipReason?: string;
  /** Estimated JS cost in bytes */
  estimatedCostBytes: number;
}
