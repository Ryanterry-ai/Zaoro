// ─── Strategy → Capability Selection ────────────────────────────────────────
//
// Lightweight, dependency-free bridge between an ExperienceStrategy and the
// deterministic capability registry. Lives in its own module so the
// design-intelligence MotionEngine can consume strategy-driven selection
// without loading the full ExperienceOS engine graph.
// ─────────────────────────────────────────────────────────────────────────────

import type { ExperienceStrategy, ExperienceStyle } from './types.js';
import {
  selectCapabilities,
  performanceTierFromBudget,
  type SelectionInput,
} from '../../motion/capabilities/index.js';
import type { MotionCapability } from '../../motion/capabilities/types.js';

/**
 * Derive animation level from experience style.
 * Styles with heavy motion → expressive; minimal/enterprise → subtle; else moderate.
 */
export function deriveLevelFromStyle(style: ExperienceStyle): 'subtle' | 'moderate' | 'expressive' {
  if (['minimal', 'enterprise'].includes(style)) return 'subtle';
  if (['cinematic', 'luxury', 'playful', 'brutalist', 'futuristic'].includes(style)) return 'expressive';
  return 'moderate';
}

/**
 * Convert an ExperienceStrategy into the deterministic SelectionInput
 * for capability registry. Selection depends ONLY on strategy signals
 * (style, pacing, conversion goal, performance budget) — never an
 * industry-name lookup.
 */
export function strategyToSelectionInput(strategy: ExperienceStrategy): SelectionInput {
  return {
    level: deriveLevelFromStyle(strategy.style),
    style: strategy.style,
    pacing: strategy.pacingStrategy?.pace,
    conversionGoal: strategy.conversionStrategy?.primaryGoal,
    performanceTier: performanceTierFromBudget(strategy.performanceBudget?.maxAnimations ?? 20),
  };
}

/**
 * Select composable motion capabilities from an ExperienceStrategy.
 * This is the deterministic, industry-agnostic selection used by the pipeline.
 */
export function selectCapabilitiesForStrategy(strategy: ExperienceStrategy): MotionCapability[] {
  return selectCapabilities(strategyToSelectionInput(strategy));
}
