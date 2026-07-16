import { describe, it, expect } from 'vitest';
import { getPackForPrompt, packCanonicalCapabilities } from '../src/taxonomy/resolver.js';

describe('taxonomy → canonical capability bridge', () => {
  it('maps a resolved pack to canonical capability ids', () => {
    const pack = getPackForPrompt('I run a restaurant');
    const caps = packCanonicalCapabilities(pack);
    expect(caps.length).toBeGreaterThan(0);
    expect(caps).toContain('food.menu');
  });

  it('returns empty for a null pack', () => {
    expect(packCanonicalCapabilities(null)).toEqual([]);
  });
});
