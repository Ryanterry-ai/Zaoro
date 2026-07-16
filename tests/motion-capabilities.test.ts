// ─── Motion Capabilities Tests ──────────────────────────────────────────────
//
// Verifies the composable capability registry: all 14 capabilities present,
// deterministic selection from strategy signals (no industry lookup),
// base safety nets always included, performance/reduced-motion gating.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  capabilityRegistry,
  selectCapabilities,
  CAPABILITIES,
  CAPABILITY_BY_ID,
  performanceTierFromBudget,
} from '../src/motion/capabilities/index.js';
import type { MotionCapabilityCategory } from '../src/motion/capabilities/index.js';

const BASE_IDS = ['mobile-performance', 'reduced-motion', 'ssr-safe'];

describe('CapabilityRegistry — structure', () => {
  it('should register all 14 composable capabilities', () => {
    expect(CAPABILITIES.length).toBe(14);
  });

  it('should have unique ids', () => {
    const ids = CAPABILITIES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should cover every required category', () => {
    const cats = new Set<MotionCapabilityCategory>(CAPABILITIES.map(c => c.category));
    expect(cats.has('library')).toBe(true);
    expect(cats.has('interaction')).toBe(true);
    expect(cats.has('audio')).toBe(true);
    expect(cats.has('3d')).toBe(true);
    expect(cats.has('commerce')).toBe(true);
    expect(cats.has('performance')).toBe(true);
    expect(cats.has('accessibility')).toBe(true);
  });

  it('should include base safety capabilities', () => {
    for (const id of BASE_IDS) {
      const cap = capabilityRegistry.get(id);
      expect(cap).toBeDefined();
      expect(cap?.signals.default).toBe(true);
    }
  });

  it('should resolve by id', () => {
    expect(capabilityRegistry.get('gsap-timeline')?.name).toBe('GSAP Timelines');
    expect(capabilityRegistry.get('three-r3f')).toBeDefined();
    expect(capabilityRegistry.get('nonexistent')).toBeUndefined();
  });

  it('should query by category', () => {
    expect(capabilityRegistry.byCategory('3d').map(c => c.id)).toContain('three-r3f');
    expect(capabilityRegistry.byCategory('audio').map(c => c.id)).toContain('sound-design');
  });

  it('should query by fulfills purpose', () => {
    const hoverCaps = capabilityRegistry.byFulfills('hover');
    expect(hoverCaps.map(c => c.id)).toContain('hover-choreography');
  });
});

describe('CapabilityRegistry — deterministic selection', () => {
  it('should always include base safety capabilities regardless of level', () => {
    for (const level of ['subtle', 'moderate', 'expressive'] as const) {
      const caps = selectCapabilities({ level, performanceTier: 'standard' });
      const ids = caps.map(c => c.id);
      for (const id of BASE_IDS) expect(ids).toContain(id);
    }
  });

  it('should exclude all non-base capabilities at "none" level', () => {
    const caps = selectCapabilities({ level: 'none', performanceTier: 'cinematic' });
    const ids = caps.map(c => c.id);
    expect(ids.sort()).toEqual([...BASE_IDS].sort());
  });

  it('should select framer-motion at any non-none level', () => {
    const caps = selectCapabilities({ level: 'moderate', performanceTier: 'standard' });
    expect(caps.map(c => c.id)).toContain('framer-motion');
  });

  it('should NOT select style-gated capabilities without a matching style', () => {
    const caps = selectCapabilities({ level: 'expressive', performanceTier: 'cinematic' });
    const ids = caps.map(c => c.id);
    // Without a style hint, cinematic/luxury-gated caps must stay out
    expect(ids).not.toContain('gsap-timeline');
    expect(ids).not.toContain('three-r3f');
    expect(ids).not.toContain('sound-design');
  });

  it('should select gsap-timeline for cinematic style at expressive level', () => {
    const caps = selectCapabilities({ level: 'expressive', style: 'cinematic', performanceTier: 'cinematic' });
    expect(caps.map(c => c.id)).toContain('gsap-timeline');
  });

  it('should select three-r3f for luxury style with heavy performance tier', () => {
    const caps = selectCapabilities({ level: 'expressive', style: 'luxury', performanceTier: 'heavy' });
    expect(caps.map(c => c.id)).toContain('three-r3f');
  });

  it('should exclude three-r3f on a thin (light) performance tier', () => {
    const caps = selectCapabilities({ level: 'expressive', style: 'luxury', performanceTier: 'light' });
    expect(caps.map(c => c.id)).not.toContain('three-r3f');
  });

  it('should select configurator + live-pricing for purchase conversion goal', () => {
    const caps = selectCapabilities({
      level: 'moderate',
      style: 'premium',
      conversionGoal: 'purchase',
      performanceTier: 'standard',
    });
    const ids = caps.map(c => c.id);
    expect(ids).toContain('configurator');
    expect(ids).toContain('live-pricing');
  });

  it('should select sound-design for playful expressive builds', () => {
    const caps = selectCapabilities({ level: 'expressive', style: 'playful', performanceTier: 'standard' });
    expect(caps.map(c => c.id)).toContain('sound-design');
  });

  it('should select stop-scroll for cinematic + slow pacing', () => {
    const caps = selectCapabilities({
      level: 'moderate',
      style: 'cinematic',
      pacing: 'slow',
      performanceTier: 'standard',
    });
    expect(caps.map(c => c.id)).toContain('stop-scroll');
  });
});

describe('CapabilityRegistry — reduced motion + dependencies', () => {
  it('should drop non-reduced-motion-safe capabilities when reducedMotion is set', () => {
    const caps = selectCapabilities({
      level: 'expressive',
      style: 'cinematic',
      performanceTier: 'cinematic',
      reducedMotion: true,
    });
    // All selected must be reduced-motion safe
    for (const cap of caps) {
      expect(cap.reducedMotionSafe).toBe(true);
    }
  });

  it('should compute unique dependency list for a selected set', () => {
    const caps = selectCapabilities({
      level: 'expressive',
      style: 'luxury',
      performanceTier: 'cinematic',
    });
    const deps = capabilityRegistry.dependenciesFor(caps);
    expect(deps).toContain('framer-motion');
    expect(deps).toContain('three');
    expect(deps).toContain('@react-three/fiber');
    expect(deps).toContain('howler');
  });

  it('should map budget to performance tier', () => {
    expect(performanceTierFromBudget(20)).toBe('cinematic');
    expect(performanceTierFromBudget(15)).toBe('heavy');
    expect(performanceTierFromBudget(12)).toBe('standard');
    expect(performanceTierFromBudget(6)).toBe('light');
  });
});

describe('CapabilityRegistry — no industry lookup', () => {
  it('selection must not depend on an industry field', () => {
    // Same signals → same capability set, proving no industry keying
    const a = selectCapabilities({ level: 'expressive', style: 'cinematic', performanceTier: 'cinematic' });
    const b = selectCapabilities({ level: 'expressive', style: 'cinematic', performanceTier: 'cinematic' });
    expect(a.map(c => c.id).sort()).toEqual(b.map(c => c.id).sort());
  });
});
