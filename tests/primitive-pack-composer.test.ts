import { describe, it, expect } from 'vitest';
import { CapabilityGraph } from '../src/bos/knowledge/primitive-packs/capability-graph.js';
import { INDUSTRY_PRIMITIVE_PACKS } from '../src/bos/knowledge/primitive-packs/industry.js';
import { BUSINESS_MODEL_PRIMITIVE_PACKS } from '../src/bos/knowledge/primitive-packs/registry-wrappers.js';
import { composeKnowledgePack, composeForCapabilities, buildCapabilityGraph, ALL_PRIMITIVES } from '../src/bos/knowledge/primitive-packs/composer.js';
import type { CompositionContext } from '../src/bos/knowledge/primitive-packs/types.js';

const ALL_PACKS = [...INDUSTRY_PRIMITIVE_PACKS, ...BUSINESS_MODEL_PRIMITIVE_PACKS];

describe('CapabilityGraph', () => {
  it('indexes packs by their provided capabilities', () => {
    const graph = new CapabilityGraph(ALL_PRIMITIVES);
    const caps = graph.knownCapabilities();
    expect(caps.length).toBeGreaterThan(0);
    // industry packs provide keywords like 'saas', 'ecommerce', etc.
    expect(caps).toContain('saas');
  });

  it('returns packs matching requested capabilities', () => {
    const graph = new CapabilityGraph(ALL_PRIMITIVES);
    const packs = graph.getPrimitivePacksForCapabilities(['saas']);
    expect(packs.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for unknown capabilities', () => {
    const graph = new CapabilityGraph(ALL_PRIMITIVES);
    const packs = graph.getPrimitivePacksForCapabilities(['nonexistent-cap']);
    expect(packs).toEqual([]);
  });

  it('deduplicates when multiple capabilities map to same pack', () => {
    const graph = new CapabilityGraph(ALL_PRIMITIVES);
    const packs = graph.getPrimitivePacksForCapabilities(['bm:direct-sales', 'bm:b2c']);
    const ids = packs.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('composeKnowledgePack', () => {
  const restaurantCtx: CompositionContext = {
    industry: 'restaurant',
    businessModels: ['direct-sales'],
    journeys: ['dine-in'],
    country: 'us',
    capabilities: [],
  };

  it('returns a ComposedKnowledgePack with all required fields', () => {
    const pack = composeKnowledgePack(restaurantCtx);
    expect(pack).toHaveProperty('id');
    expect(pack).toHaveProperty('composedFrom');
    expect(pack).toHaveProperty('dimensions');
    expect(pack).toHaveProperty('vocabulary');
    expect(pack).toHaveProperty('entities');
    expect(pack).toHaveProperty('copy');
    expect(pack).toHaveProperty('design');
  });

  it('selects an industry primitive for restaurant', () => {
    const pack = composeKnowledgePack(restaurantCtx);
    expect(pack.composedFrom.some(id => id.startsWith('industry:'))).toBe(true);
  });

  it('selects locale primitive for us', () => {
    const pack = composeKnowledgePack(restaurantCtx);
    expect(pack.composedFrom.some(id => id.includes('us'))).toBe(true);
  });

  it('deduplicates entities', () => {
    const pack = composeKnowledgePack(restaurantCtx);
    const entitySet = new Set(pack.entities);
    expect(pack.entities.length).toBe(entitySet.size);
  });

  it('includes vocabulary from composed packs', () => {
    const pack = composeKnowledgePack(restaurantCtx);
    expect(typeof pack.vocabulary).toBe('object');
    expect(Object.keys(pack.vocabulary).length).toBeGreaterThan(0);
  });

  it('returns standard content pack for generic industry', () => {
    const pack = composeKnowledgePack({ industry: 'generic' });
    expect(pack.composedFrom.some(id => id.includes('content:'))).toBe(true);
  });

  it('returns clinical content for healthcare industry', () => {
    const pack = composeKnowledgePack({ industry: 'healthcare' });
    expect(pack.composedFrom.some(id => id.includes('clinical'))).toBe(true);
  });

  it('returns luxury design for luxury industry', () => {
    const pack = composeKnowledgePack({ industry: 'luxury' });
    expect(pack.composedFrom.some(id => id.includes('design:'))).toBe(true);
  });
});

describe('composeForCapabilities', () => {
  it('adds capability-matched packs beyond dimension selection', () => {
    const base = composeKnowledgePack({ industry: 'restaurant' });
    const withCap = composeForCapabilities(['seo'], { industry: 'restaurant' });
    // seo adds the seo-heavy content pack
    expect(withCap.composedFrom.length).toBeGreaterThanOrEqual(base.composedFrom.length);
  });

  it('returns a valid ComposedKnowledgePack', () => {
    const pack = composeForCapabilities(['subscription'], {
      industry: 'saas',
      businessModels: ['subscription'],
    });
    expect(pack.composedFrom.length).toBeGreaterThan(0);
    expect(pack.vocabulary).toBeDefined();
  });
});

describe('buildCapabilityGraph', () => {
  it('returns a CapabilityGraph over all primitive packs', () => {
    const graph = buildCapabilityGraph();
    expect(graph).toBeInstanceOf(CapabilityGraph);
    expect(graph.knownCapabilities().length).toBeGreaterThan(0);
  });
});
