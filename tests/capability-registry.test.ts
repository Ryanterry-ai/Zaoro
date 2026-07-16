import { describe, it, expect } from 'vitest';
import { capabilityRegistry, resolveCapabilities, CapabilityRegistry, CANONICAL_CAPABILITIES } from '../src/bos/capabilities/index.js';
import type { CapabilityManifest, Capability } from '../src/bos/capabilities/types.js';

describe('CapabilityRegistry — canonicalization', () => {
  it('normalizes legacy alias spellings to one canonical id', () => {
    expect(capabilityRegistry.normalize('checkout')).toBe('commerce.checkout');
    expect(capabilityRegistry.normalize('CHECKOUT')).toBe('commerce.checkout');
    expect(capabilityRegistry.normalize('purchase')).toBe('commerce.checkout');
    expect(capabilityRegistry.normalize('cart')).toBe('commerce.cart');
    expect(capabilityRegistry.normalize('payment')).toBe('payments');
    expect(capabilityRegistry.normalize('reservation')).toBe('booking.reservation');
  });

  it('returns null for unknown tags', () => {
    expect(capabilityRegistry.normalize('zzz-not-a-cap')).toBeNull();
  });

  it('expands dependencies transitively', () => {
    const r = resolveCapabilities(['checkout']);
    // requested collapses the alias; expanded pulls in the whole dependency closure.
    expect(r.requested).toContain('commerce.checkout');
    expect(r.expanded).toContain('commerce.checkout');
    expect(r.expanded).toContain('payments');
    expect(r.expanded).toContain('commerce.cart');
    expect(r.expanded).toContain('tax');
    expect(r.expanded).toContain('discounts');
    expect(r.expanded.length).toBeGreaterThan(r.requested.length);
  });

  it('expands unknown inputs without throwing', () => {
    const r = resolveCapabilities(['totally-unknown']);
    expect(r.unknown).toContain('totally-unknown');
    expect(r.canonical).toHaveLength(0);
  });

  it('expands capabilities from an industry', () => {
    const r = resolveCapabilities([], { industry: 'restaurant' });
    expect(r.expanded).toContain('food.menu');
    expect(r.expanded).toContain('commerce.checkout'); // via food.ordering deps
    expect(r.expanded).toContain('booking.reservation');
  });

  it('derives parents/children from dependency edges', () => {
    // payments is a dependency of commerce.checkout, so it is a PARENT of checkout.
    const checkout = capabilityRegistry.get('commerce.checkout')!;
    expect(checkout.parents).toContain('payments');
    const payments = capabilityRegistry.get('payments')!;
    expect(payments.children).toContain('commerce.checkout');
  });

  it('bridges canonical ids to primitive-pack tags', () => {
    const tags = capabilityRegistry.primitivePackTagsFor(['commerce.checkout']);
    expect(tags).toContain('ecommerce');
    const tags2 = capabilityRegistry.primitivePackTagsFor(['content.marketing']);
    expect(tags2).toContain('content:seo-heavy');
  });

  it('coverageScore measures fulfilled fraction of required capabilities', () => {
    expect(capabilityRegistry.coverageScore(['a', 'b'], ['a', 'b'])).toBe(1);
    expect(capabilityRegistry.coverageScore(['a', 'b'], ['a'])).toBe(0.5);
    expect(capabilityRegistry.coverageScore([], ['anything'])).toBe(1);
  });

  it('builds a Capability Manifest', () => {
    const m: CapabilityManifest = capabilityRegistry.buildManifest(['checkout'], { industry: 'restaurant' });
    expect(m.schema).toBe('capability-manifest@1');
    expect(m.capabilities).toContain('commerce.checkout');
    expect(m.requested).toContain('checkout');
    expect(m.industry).toBe('restaurant');
    expect(m.unresolved).not.toContain('checkout');
  });

  it('every canonical capability has a unique id and at least one alias', () => {
    const ids = new Set<string>();
    for (const c of CANONICAL_CAPABILITIES as Capability[]) {
      expect(ids.has(c.id)).toBe(false);
      ids.add(c.id);
      expect(c.aliases.length).toBeGreaterThan(0);
    }
  });

  it('no capability depends on a non-existent capability', () => {
    const ids = new Set(CANONICAL_CAPABILITIES.map(c => c.id));
    for (const c of CANONICAL_CAPABILITIES as Capability[]) {
      for (const dep of c.dependencies) {
        expect(ids.has(dep)).toBe(true);
      }
    }
  });
});

describe('CapabilityRegistry — independent instance', () => {
  it('can be instantiated with a subset', () => {
    const sub = new CapabilityRegistry([
      { id: 'x.a', displayName: 'A', aliases: ['a'], domain: 'x', dependencies: [] },
      { id: 'x.b', displayName: 'B', aliases: ['b'], domain: 'x', dependencies: ['x.a'] },
    ] as any);
    const r = sub.resolve(['b']);
    expect(r.expanded).toEqual(['x.a', 'x.b']);
  });
});
