// ─── Capability Registry ───────────────────────────────────────────────────
//
// The single authority for which motion capabilities apply to a build.
// Selection is DETERMINISTIC and driven by ExperienceStrategy signals
// (animation level, style, pacing, conversion goal, performance tier) —
// never by an industry name. This is what eliminates hardcoded vertical
// templates and duplicated intelligence.
// ─────────────────────────────────────────────────────────────────────────────

import type { MotionCapability, MotionCapabilityCategory, CapabilitySignals } from './types.js';
import { CAPABILITIES, CAPABILITY_BY_ID } from './presets.js';
import type { MotionPurpose } from '../types.js';

/** Signals used to select capabilities — all derived from strategy, not industry */
export interface SelectionInput {
  /** Animation level (subtle..expressive). Required. */
  level: 'none' | 'subtle' | 'moderate' | 'expressive';
  /** Experience style (e.g. 'cinematic', 'luxury', 'playful'). Optional → wildcard if absent. */
  style?: string;
  /** Pacing strategy. Optional → wildcard if absent. */
  pacing?: 'slow' | 'moderate' | 'fast' | 'variable';
  /** Primary conversion goal. Optional → wildcard if absent. */
  conversionGoal?: string;
  /** Available performance tier (from budget). Capabilities needing more are dropped. */
  performanceTier: 'light' | 'standard' | 'heavy' | 'cinematic';
  /** When true, exclude non-reduced-motion-safe capabilities. */
  reducedMotion?: boolean;
}

const TIER_RANK: Record<string, number> = { light: 0, standard: 1, heavy: 2, cinematic: 3 };

/**
 * The Capability Registry — indexes all capabilities and selects applicable
 * ones deterministically from strategy signals.
 */
export class CapabilityRegistry {
  private byId: Record<string, MotionCapability>;
  private all: MotionCapability[];

  constructor(capabilities: MotionCapability[] = CAPABILITIES) {
    this.all = capabilities;
    this.byId = Object.fromEntries(capabilities.map(c => [c.id, c]));
  }

  /** Get a capability by id */
  get(id: string): MotionCapability | undefined {
    return this.byId[id];
  }

  /** All registered capabilities */
  allCapabilities(): MotionCapability[] {
    return [...this.all];
  }

  /** Capabilities in a category */
  byCategory(category: MotionCapabilityCategory): MotionCapability[] {
    return this.all.filter(c => c.category === category);
  }

  /** Capabilities that can fulfill a given MotionPurpose */
  byFulfills(purpose: MotionPurpose): MotionCapability[] {
    return this.all.filter(c => c.fulfills.includes(purpose));
  }

  /**
   * Deterministically select the capability set for a build.
   *
   * Algorithm:
   *   1. Always include base capabilities (default: true — perf/accessibility safety net).
   *   2. Include capabilities whose signals match the input.
   *   3. Drop capabilities that exceed the available performance tier.
   *   4. Drop non-reduced-motion-safe capabilities when reducedMotion is set.
   *   5. Resolve conflicts (prefer higher-performance-tier, fewer deps).
   */
  select(input: SelectionInput): MotionCapability[] {
    const selected: MotionCapability[] = [];

    for (const cap of this.all) {
      // Base safety capabilities always included
      if (cap.signals.default) {
        selected.push(cap);
        continue;
      }

      if (!this.matches(cap, input)) continue;
      if (!this.meetsPerformance(cap, input)) continue;
      if (input.reducedMotion && !cap.reducedMotionSafe) continue;

      selected.push(cap);
    }

    return this.resolveConflicts(selected);
  }

  /** Whether a capability's signals match the input (wildcard-aware) */
  private matches(cap: MotionCapability, input: SelectionInput): boolean {
    const s = cap.signals;

    // 'none' level excludes all non-base capabilities
    if (input.level === 'none') return false;

    // Level filter (declared → must be present and included)
    if (s.levels && s.levels.length > 0) {
      if (!s.levels.includes(input.level)) return false;
    }

    // Style filter — the primary creative gatekeeper. Requires an explicit
    // match: a capability that declares styles is excluded when the build
    // has no (or a non-matching) style. This keeps selection lean without
    // a style hint while never keying on industry.
    if (s.styles && s.styles.length > 0) {
      if (!input.style || !s.styles.includes(input.style.toLowerCase())) return false;
    }

    // Pacing filter — refinement only. Absent pacing = wildcard pass.
    if (s.pacing && s.pacing.length > 0 && input.pacing) {
      if (!s.pacing.includes(input.pacing)) return false;
    }

    // Conversion goal filter — refinement only. Absent goal = wildcard pass.
    if (s.conversionGoals && s.conversionGoals.length > 0 && input.conversionGoal) {
      if (!s.conversionGoals.includes(input.conversionGoal)) return false;
    }

    return true;
  }

  /** Whether the capability fits within the available performance budget */
  private meetsPerformance(cap: MotionCapability, input: SelectionInput): boolean {
    const min = cap.signals.minPerformanceTier;
    if (!min) return true;
    return TIER_RANK[cap.performanceTier] >= TIER_RANK[min] &&
           TIER_RANK[input.performanceTier] >= TIER_RANK[min];
  }

  /** Resolve conflicts — keep the higher-tier, fewer-dependency capability */
  private resolveConflicts(caps: MotionCapability[]): MotionCapability[] {
    const result = [...caps];
    for (const cap of caps) {
      for (const conflictId of cap.conflictsWith) {
        const conflict = this.byId[conflictId];
        if (conflict && result.includes(conflict)) {
          // Prefer the one with fewer dependencies (lighter wins ties)
          const keep = cap.dependencies.length <= conflict.dependencies.length ? cap : conflict;
          const drop = keep === cap ? conflict : cap;
          const idx = result.indexOf(drop);
          if (idx >= 0) result.splice(idx, 1);
        }
      }
    }
    return result;
  }

  /** Unique dependency list for the selected capabilities (for package.json) */
  dependenciesFor(caps: MotionCapability[]): string[] {
    const deps = new Set<string>();
    for (const cap of caps) {
      for (const d of cap.dependencies) deps.add(d);
    }
    return Array.from(deps);
  }
}

/** Singleton registry */
export const capabilityRegistry = new CapabilityRegistry();

/** Convenience: select capabilities for a build */
export function selectCapabilities(input: SelectionInput): MotionCapability[] {
  return capabilityRegistry.select(input);
}

/**
 * Map a PerformanceBudgetV2-style config to a performance tier.
 * Heavy/3D budgets → 'cinematic'; standard → 'standard'; thin → 'light'.
 */
export function performanceTierFromBudget(maxAnimations: number): 'light' | 'standard' | 'heavy' | 'cinematic' {
  if (maxAnimations >= 18) return 'cinematic';
  if (maxAnimations >= 14) return 'heavy';
  if (maxAnimations >= 10) return 'standard';
  return 'light';
}
