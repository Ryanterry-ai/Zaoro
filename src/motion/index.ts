// ─── Motion Architecture ────────────────────────────────────────────────────
//
// The single motion pipeline for the entire build engine.
//
// Flow:
//   Experience Intelligence
//     → Motion Blueprint
//       → Motion Compiler
//         → Framer Motion Props
//           → Renderer
//
// Rules:
//   1. Section wrappers NEVER animate for visibility
//   2. SSR HTML is always fully visible
//   3. Animations enhance — they never reveal missing content
//   4. Every animation references tokens, never raw values
//   5. Budget enforcement prevents over-animation
//   6. Reduced motion is always respected
// ─────────────────────────────────────────────────────────────────────────────

// Types
export type {
  MotionTarget,
  MotionPurpose,
  MotionBlueprint,
  MotionTrigger,
  MotionPhysics,
  MotionStagger,
  MotionBudgetCategory,
  ReducedMotionFallback,
  PageMotionBlueprint,
  AnimationBudget,
  GlobalMotionSettings,
  CompiledMotionProps,
  CompilationResult,
} from './types.js';

// Tokens
export {
  REVEAL_TOKENS,
  INTERACTION_TOKENS,
  SCROLL_TOKENS,
  CINEMATIC_TOKENS,
  BUILDER_TOKENS,
  STAGGER_TOKENS,
  REDUCED_MOTION_TOKENS,
  MOTION_TOKEN_REGISTRY,
  DEFAULT_ANIMATION_BUDGET,
  SECTION_WRAPPER_PROPS,
  shouldAnimateVisibility,
} from './tokens.js';

// Compiler
export {
  MotionCompiler,
  compileMotion,
  compilePageMotion,
  createRevealBlueprint,
} from './compiler.js';

// Hooks (SSR-safe)
export {
  useReducedMotion,
  useHasHydrated,
  useShouldAnimate,
  useMotionProps,
  getMotionSectionProps,
  getMotionCardProps,
} from './hooks.js';

// Accessibility
export {
  applyReducedMotion,
  getReducedMotionOverrides,
  getReducedMotionClass,
  generateReducedMotionCss,
  generateHydrationCss,
  isAnimationAccessible,
} from './accessibility.js';

// Budget
export {
  AnimationBudgetTracker,
  filterByBudget,
} from './budget.js';

// Capabilities (composable, deterministic selection — replaces industry templates)
export type {
  MotionCapability,
  MotionCapabilityCategory,
  CapabilitySignals,
} from './capabilities/index.js';
export {
  CAPABILITIES,
  CAPABILITY_BY_ID,
  CapabilityRegistry,
  capabilityRegistry,
  selectCapabilities,
  performanceTierFromBudget,
} from './capabilities/index.js';
export type { SelectionInput } from './capabilities/index.js';
