import { describe, it, expect } from 'vitest';
import { scaleCapabilities } from '../src/bos/capabilities/index.js';

describe('scaling (Step 4)', () => {
  it('expands seed capabilities to full working set including dependencies', () => {
    const { expanded, crossCutting, domain } = scaleCapabilities('footwear', [
      'commerce.catalog',
      'commerce.cart',
      'commerce.checkout',
    ]);
    expect(expanded).toContain('commerce.checkout');
    expect(expanded).toContain('payments'); // dependency of checkout
    expect(domain).toContain('commerce.checkout');
    expect(crossCutting).toContain('payments');
  });

  it('scaling is industry-driven and deterministic (industry → ontology → capabilities)', () => {
    const saas = scaleCapabilities('saas', ['commerce.checkout']);
    const footwear = scaleCapabilities('footwear', ['commerce.checkout']);
    // The saas industry brings in its full canonical capability set (auth, crm, ...).
    expect(saas.expanded).toContain('auth');
    expect(saas.expanded).toContain('crm.contacts');
    expect(footwear.expanded).not.toContain('crm.contacts');
    // Deterministic: same inputs -> identical output.
    expect(scaleCapabilities('saas', ['commerce.checkout']).expanded).toEqual(saas.expanded);
  });
});
