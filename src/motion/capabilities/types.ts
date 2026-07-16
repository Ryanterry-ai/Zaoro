// ─── Motion Capability Types ────────────────────────────────────────────────
//
// A MotionCapability is a self-contained, declarative description of ONE
// composable animation/interaction capability. It is NOT a vertical template.
//
// Capabilities are selected deterministically from ExperienceStrategy signals
// (style, pacing, conversion, density, performance budget) — never from an
// industry name lookup. This is what makes the system work for ANY business
// without hardcoded vertical templates.
// ─────────────────────────────────────────────────────────────────────────────

import type { MotionPurpose, MotionBudgetCategory } from '../types.js';

/** Broad category a capability belongs to */
export type MotionCapabilityCategory =
  | 'library'        // Animation library (gsap, framer-motion)
  | 'interaction'    // Interaction patterns (hover, physics, transitions, stop-scroll)
  | 'audio'          // Sound design (howler)
  | '3d'             // 3D / WebGL (three, react-three-fiber)
  | 'commerce'       // Configurators, live pricing
  | 'performance'    // Mobile performance gating
  | 'accessibility'; // Reduced motion, SSR-safety

/** Deterministic selection signals — derived from ExperienceStrategy, not industry */
export interface CapabilitySignals {
  /**
   * Which animation levels this capability is appropriate for.
   * Empty array = appropriate at all levels (e.g. reduced-motion, ssr-safe).
   */
  levels?: Array<'none' | 'subtle' | 'moderate' | 'expressive'>;
  /**
   * Which experience styles this capability is appropriate for.
   * Empty array = appropriate for all styles.
   */
  styles?: string[];
  /**
   * Which pacing strategies this capability suits.
   * Empty array = appropriate for all pacing.
   */
  pacing?: Array<'slow' | 'moderate' | 'fast' | 'variable'>;
  /**
   * Conversion goals that benefit from this capability.
   * Empty array = not conversion-specific.
   */
  conversionGoals?: string[];
  /**
   * Minimum performance budget tier required (heavy capabilities excluded on thin budgets).
   */
  minPerformanceTier?: 'light' | 'standard' | 'heavy' | 'cinematic';
  /**
   * Whether this capability should be included by default (base layer).
   */
  default?: boolean;
}

/** A single composable motion capability */
export interface MotionCapability {
  /** Stable ID (e.g. "gsap-timeline", "three-r3f") */
  id: string;
  /** Human label */
  name: string;
  /** Category */
  category: MotionCapabilityCategory;
  /** What this capability does */
  description: string;
  /**
   * NPM dependencies injected into the generated project's package.json.
   * Empty for capabilities that need no extra deps (framer-motion is always present).
   */
  dependencies: string[];
  /** Capability IDs this composes cleanly with */
  compatibleWith: string[];
  /** Capability IDs this conflicts with (mutually exclusive choices) */
  conflictsWith: string[];
  /** Safe to render during SSR (no window/document access at module load) */
  ssrSafe: boolean;
  /** Safe on mobile (respects budget, no heavy GPU work) */
  mobileSafe: boolean;
  /** Has a graceful fallback under prefers-reduced-motion */
  reducedMotionSafe: boolean;
  /** Resource cost */
  performanceTier: 'light' | 'standard' | 'heavy' | 'cinematic';
  /** Deterministic selection signals */
  signals: CapabilitySignals;
  /** MotionPurposes this capability can fulfill */
  fulfills: MotionPurpose[];
  /** Budget categories this capability draws from */
  budgetCategories: MotionBudgetCategory[];
}
