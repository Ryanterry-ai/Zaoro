// ─── Experience OS → Capability Selection Tests ─────────────────────────────
//
// Verifies M2/M3 wiring:
//   - ExperienceStrategy maps deterministically to a capability set
//     (style → level, plus pacing / conversion goal / performance budget).
//   - Selection depends ONLY on strategy signals, never an industry name.
//   - ExperienceOS tracks + exposes the selected capabilities.
//   - The ExperienceOSAdapter propagates the capability set into the
//     legacy blueprint metadata for downstream consumers.
//   - MotionEngine consumes ctx.experienceStrategy (M2 wiring).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import type { ExperienceStrategy, ExperienceStyle } from '../src/orchestration/experience-os/types.js';
import {
  deriveLevelFromStyle,
  strategyToSelectionInput,
  selectCapabilitiesForStrategy,
} from '../src/orchestration/experience-os/index.js';
import { ExperienceOS, createExperienceOS } from '../src/orchestration/experience-os/index.js';
import { createExperienceOSAdapter } from '../src/orchestration/experience-os/index.js';
import { createMotionEngine } from '../src/orchestration/design-intelligence/engines/motion-engine.js';

type Pace = 'slow' | 'moderate' | 'fast' | 'variable';
type Goal = ExperienceStrategy['conversionStrategy']['primaryGoal'];

/** Build a minimal ExperienceStrategy carrying only the signals selection reads. */
function makeStrategy(opts: {
  style: ExperienceStyle;
  industry?: string;
  pace?: Pace;
  goal?: Goal;
  maxAnimations?: number;
}): ExperienceStrategy {
  return {
    id: 'test-strategy',
    industry: (opts.industry ?? 'saas') as ExperienceStrategy['industry'],
    style: opts.style,
    pacingStrategy: opts.pace ? { pace: opts.pace } as ExperienceStrategy['pacingStrategy'] : undefined,
    conversionStrategy: opts.goal
      ? { primaryGoal: opts.goal } as ExperienceStrategy['conversionStrategy']
      : undefined,
    performanceBudget: opts.maxAnimations
      ? ({ maxAnimations: opts.maxAnimations } as ExperienceStrategy['performanceBudget'])
      : undefined,
  } as unknown as ExperienceStrategy;
}

describe('deriveLevelFromStyle', () => {
  it('maps heavy-motion styles to expressive', () => {
    for (const s of ['cinematic', 'luxury', 'playful', 'brutalist', 'futuristic'] as ExperienceStyle[]) {
      expect(deriveLevelFromStyle(s)).toBe('expressive');
    }
  });

  it('maps restrained styles to subtle', () => {
    for (const s of ['minimal', 'enterprise'] as ExperienceStyle[]) {
      expect(deriveLevelFromStyle(s)).toBe('subtle');
    }
  });

  it('defaults other styles to moderate', () => {
    for (const s of ['editorial', 'technical', 'premium', 'storytelling', 'organic'] as ExperienceStyle[]) {
      expect(deriveLevelFromStyle(s)).toBe('moderate');
    }
  });
});

describe('strategyToSelectionInput', () => {
  it('derives level from style and forwards pacing/goal/budget', () => {
    const input = strategyToSelectionInput(
      makeStrategy({ style: 'luxury', pace: 'slow', goal: 'purchase', maxAnimations: 20 })
    );
    expect(input.level).toBe('expressive');
    expect(input.style).toBe('luxury');
    expect(input.pacing).toBe('slow');
    expect(input.conversionGoal).toBe('purchase');
    expect(input.performanceTier).toBe('cinematic');
  });

  it('treats missing signals as wildcards', () => {
    const input = strategyToSelectionInput(makeStrategy({ style: 'editorial' }));
    expect(input.level).toBe('moderate');
    expect(input.pacing).toBeUndefined();
    expect(input.conversionGoal).toBeUndefined();
  });
});

describe('selectCapabilitiesForStrategy — deterministic & strategy-driven', () => {
  it('is deterministic for identical strategies', () => {
    const a = selectCapabilitiesForStrategy(makeStrategy({ style: 'cinematic', pace: 'slow' }));
    const b = selectCapabilitiesForStrategy(makeStrategy({ style: 'cinematic', pace: 'slow' }));
    expect(a.map(c => c.id).sort()).toEqual(b.map(c => c.id).sort());
  });

  it('does NOT depend on industry (no industry lookup)', () => {
    const a = selectCapabilitiesForStrategy(makeStrategy({ style: 'luxury', industry: 'saas', maxAnimations: 20 }));
    const b = selectCapabilitiesForStrategy(makeStrategy({ style: 'luxury', industry: 'restaurant', maxAnimations: 20 }));
    expect(a.map(c => c.id).sort()).toEqual(b.map(c => c.id).sort());
  });

  it('selects cinematic capabilities for cinematic + slow', () => {
    const ids = selectCapabilitiesForStrategy(makeStrategy({ style: 'cinematic', pace: 'slow' })).map(c => c.id);
    expect(ids).toContain('gsap-timeline');
    expect(ids).toContain('stop-scroll');
  });

  it('selects 3D + premium for luxury at heavy budget', () => {
    const ids = selectCapabilitiesForStrategy(
      makeStrategy({ style: 'luxury', maxAnimations: 20 })
    ).map(c => c.id);
    expect(ids).toContain('three-r3f');
    expect(ids).toContain('premium-transitions');
  });

  it('selects commerce capabilities for purchase goal', () => {
    const ids = selectCapabilitiesForStrategy(
      makeStrategy({ style: 'premium', goal: 'purchase' })
    ).map(c => c.id);
    expect(ids).toContain('configurator');
    expect(ids).toContain('live-pricing');
  });

  it('always includes base safety capabilities', () => {
    const ids = selectCapabilitiesForStrategy(makeStrategy({ style: 'luxury' })).map(c => c.id);
    for (const id of ['mobile-performance', 'reduced-motion', 'ssr-safe']) {
      expect(ids).toContain(id);
    }
  });
});

describe('ExperienceOS — capability tracking', () => {
  it('returns empty set before any blueprint is generated', () => {
    const os = createExperienceOS();
    expect(os.selectCapabilities()).toEqual([]);
  });

  it('returns the strategy-driven capability set after generate', () => {
    const os = createExperienceOS();
    os.generate({
      industry: 'saas' as any,
      pageType: 'home',
      pages: [{ path: '/', title: 'Home', sections: ['hero', 'features'] }],
      personality: 'luxury',
    });
    const ids = os.selectCapabilities().map(c => c.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).toContain('three-r3f');
    // coherence: the public selection already comes from strategyToSelectionInput
    expect(ids).toContain('premium-transitions');
  });
});

describe('ExperienceOSAdapter — capability propagation (M3)', () => {
  it('attaches the strategy-driven capability set to the legacy blueprint metadata', async () => {
    const adapter = createExperienceOSAdapter();
    const bk = {
      discovery: { industry: 'luxury', businessType: 'Luxury brand' },
      businessPersonas: [{ label: 'Founder' }],
      revenue: { model: 'subscription' },
      customerPersonas: [{ label: 'Operator' }],
      pages: [{ path: '/', purpose: 'Home', sections: ['hero', 'features'] }],
    } as any;
    const blueprint: any = await adapter.process(bk);
    expect(Array.isArray(blueprint.metadata.motionCapabilities)).toBe(true);
    expect(blueprint.metadata.motionCapabilities.length).toBeGreaterThan(0);
    // luxury industry → luxury style → expressive level → 3D capability selected
    expect(blueprint.metadata.motionCapabilities).toContain('three-r3f');
  });
});

describe('MotionEngine — strategy-driven selection (M2 wiring)', () => {
  it('uses ctx.experienceStrategy signals when present', () => {
    const engine = createMotionEngine();
    const ctx = {
      industry: 'saas' as any,
      stage: 'frontend' as const,
      artifacts: {},
      experienceStrategy: makeStrategy({ style: 'cinematic', pace: 'slow' }),
    };
    const recs = engine.recommend(ctx as any);
    const capRec = recs.find(r => r.title === 'Capability Set');
    expect(capRec).toBeDefined();
    const capabilities = (capRec!.tokens as any).capabilities as string[];
    expect(capabilities).toContain('gsap-timeline');
    expect(capabilities).toContain('stop-scroll');
  });

  it('falls back to personality/animationLevel when no strategy is present', () => {
    const engine = createMotionEngine();
    const ctx = {
      industry: 'saas' as any,
      stage: 'frontend' as const,
      artifacts: {},
      personality: 'luxury',
      preferences: { animationLevel: 'expressive' as const },
    };
    const recs = engine.recommend(ctx as any);
    const capRec = recs.find(r => r.title === 'Capability Set');
    const capabilities = (capRec!.tokens as any).capabilities as string[];
    expect(capabilities).toContain('three-r3f');
  });
});
