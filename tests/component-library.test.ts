import { describe, it, expect } from 'vitest';
import { getComponentsForCapabilities, getComponentById, COMPONENT_LIBRARY } from '../src/bos/components/index.js';

describe('component library (Step 5)', () => {
  it('selects components for a canonical capability', () => {
    const comps = getComponentsForCapabilities(['commerce.checkout']);
    const ids = comps.map(c => c.id);
    expect(ids).toContain('checkout-flow');
  });

  it('resolves an alias to the same components as its canonical capability', () => {
    const byAlias = getComponentsForCapabilities(['shop']);
    const byCanonical = getComponentsForCapabilities(['commerce.catalog']);
    const aliasIds = new Set(byAlias.map(c => c.id));
    const canonIds = new Set(byCanonical.map(c => c.id));
    expect(aliasIds).toEqual(canonIds);
  });

  it('expands dependencies into the resolved component set', () => {
    const comps = getComponentsForCapabilities(['commerce.checkout']);
    const ids = comps.map(c => c.id);
    // checkout depends on payments -> checkout-flow references payments
    expect(comps.some(c => c.capabilities.includes('payments'))).toBe(true);
    expect(ids).toContain('checkout-flow');
  });

  it('every component links to canonical capability ids only', () => {
    for (const c of COMPONENT_LIBRARY) {
      expect(c.capabilities.length).toBeGreaterThan(0);
      for (const cap of c.capabilities) expect(cap).toMatch(/^[a-z0-9]+(\.[a-z0-9]+)*$/);
    }
  });

  it('looks up by id', () => {
    expect(getComponentById('deal-pipeline')?.name).toBe('Deal Pipeline');
  });
});
