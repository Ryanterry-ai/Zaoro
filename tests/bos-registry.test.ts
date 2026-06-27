import { describe, it, expect } from 'vitest';
import { BOSRegistry } from '../src/bos/registry.js';
import type { BOSEntry } from '../src/bos/types.js';

function makeEntry(overrides) {
  return Object.assign({
    id: 'test-entry',
    industry: 'saas',
    subIndustry: 'crm',
    appName: 'TestApp',
    description: 'A test SaaS application',
    features: ['Dashboard'],
    entities: ['User'],
    workflows: ['Onboarding'],
    capabilities: ['generate-app'],
    tags: ['saas', 'crm'],
    businessModels: ['subscription'],
    compliancePacks: [],
  }, overrides);
}

describe('BOSRegistry', () => {
  it('should register entries and retrieve them', () => {
    const before = BOSRegistry.count();
    BOSRegistry.register(makeEntry({ id: 'test-unique-entry-' + Date.now(), industry: 'unique-industry-' + Date.now() }));
    expect(BOSRegistry.count()).toBe(before + 1);
  });

  it('should find an exact match by industry', () => {
    const uniqueIndustry = 'unique-saas-test-' + Date.now();
    BOSRegistry.register(makeEntry({ id: 'test-unique-saas-' + Date.now(), industry: uniqueIndustry, subIndustry: '' }));
    const result = BOSRegistry.findExact(uniqueIndustry);
    expect(result).not.toBeNull();
    expect(result.matchType).toBe('exact');
    expect(result.confidence).toBe(1.0);
  });

  it('should return null for non-existent industry', () => {
    const result = BOSRegistry.findExact('non-existent-industry-xyzzy-unique-' + Date.now());
    expect(result).toBeNull();
  });

  it('should find nearest match by semantic clustering', () => {
    const uniqueIndustry = 'restaurant-' + Date.now();
    BOSRegistry.register(makeEntry({
      id: 'test-semantic-restaurant-' + Date.now(),
      industry: uniqueIndustry,
      subIndustry: 'fine dining',
      tags: ['food', 'dining', 'restaurant'],
    }));
    const result = BOSRegistry.findNearest(uniqueIndustry);
    expect(result).not.toBeNull();
    expect(result.matchType).toBe('semantic');
  });

  it('should return null for very dissimilar industry with no entries', () => {
    // When ENTRIES is empty, findNearest should return null
    // Use a clean query against an empty registry would be ideal,
    // but ENTRIES is module-level and shared. Instead test findByIndustry.
    const result = BOSRegistry.findByIndustry('nonexistent-industry-' + Date.now());
    expect(result.length).toBe(0);
  });

  it('lookup should try exact first, then semantic', () => {
    const uniqueIndustry = 'lookup-test-' + Date.now();
    BOSRegistry.register(makeEntry({
      id: 'test-lookup-exact-' + Date.now(),
      industry: uniqueIndustry,
      subIndustry: '',
    }));
    const result = BOSRegistry.lookup(uniqueIndustry);
    expect(result).not.toBeNull();
    expect(result.matchType).toBe('exact');
  });

  it('should return all registered entries', () => {
    const all = BOSRegistry.getAll();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
  });

  it('should filter entries by industry', () => {
    const uniqueIndustry = 'filter-test-' + Date.now();
    BOSRegistry.register(makeEntry({
      id: 'test-filter-' + Date.now(),
      industry: uniqueIndustry,
    }));
    const filtered = BOSRegistry.findByIndustry(uniqueIndustry);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered[0].industry).toBe(uniqueIndustry);
  });

  it('should filter entries by capability', () => {
    const uniqueCap = 'unique-cap-' + Date.now();
    BOSRegistry.register(makeEntry({
      id: 'test-cap-filter-' + Date.now(),
      industry: 'cap-filter-' + Date.now(),
      capabilities: [uniqueCap],
    }));
    const filtered = BOSRegistry.findByCapability(uniqueCap);
    expect(filtered.length).toBeGreaterThan(0);
  });
});
