import { describe, it, expect } from 'vitest';
import {
  getCapabilityExperienceHints,
  getExperienceProfileForCapabilities,
} from '../src/orchestration/experience-intelligence/experience-profiles.js';

describe('experience by capability (Phase R2)', () => {
  it('derives experience hints from canonical capabilities', () => {
    const hints = getCapabilityExperienceHints(['ecommerce']);
    expect(hints.emotionalQualities.length).toBeGreaterThan(0);
    // checkout implies a high-conversion, trust/urgency bias
    const checkout = getCapabilityExperienceHints(['commerce.checkout']);
    expect(checkout.conversionFocus).toBe('high');
    expect(checkout.emotionalQualities).toContain('trust');
  });

  it('resolves legacy capability aliases through the registry', () => {
    const alias = getCapabilityExperienceHints(['booking']);
    const canonical = getCapabilityExperienceHints(['booking.reservation']);
    expect(alias.conversionFocus).toBe(canonical.conversionFocus);
  });

  it('builds an experience profile from capabilities', () => {
    const profile = getExperienceProfileForCapabilities(['ecommerce']);
    expect(profile.industry).toBeDefined();
    expect(profile.emotionalQualities.length).toBeGreaterThan(0);
  });

  it('returns safe defaults when no capability resolves', () => {
    const hints = getCapabilityExperienceHints(['not-a-real-cap']);
    expect(hints.emotionalQualities).toEqual([]);
    expect(hints.hoverDefaults).toEqual([]);
  });
});
