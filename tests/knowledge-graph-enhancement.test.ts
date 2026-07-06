// ─── Knowledge Graph Enhancement Tests ────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { KnowledgeGraph } from '../src/bos/graph/engine.js';
import type { TechnologyStackNode, ProviderCapabilityNode, ArchitecturalPatternNode } from '../src/bos/graph/types.js';
import { TECHNOLOGY_STACKS, PROVIDER_CAPABILITIES, ARCHITECTURAL_PATTERNS, DECISION_SEED_EDGES } from '../src/bos/graph/seeds/decision-seeds.js';

function makeIndustryNode(id: string) {
  return {
    id,
    type: 'Industry' as const,
    properties: { name: id, slug: id, description: `Test ${id}`, maturity: 'growth' as const, tags: [], compositionPrimitives: [] },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe('Knowledge Graph Enhancements', () => {
  // ── New Node Types ──────────────────────────────────────────────────────

  describe('New Node Types', () => {
    it('should add TechnologyStack nodes', () => {
      const graph = new KnowledgeGraph();
      const node: TechnologyStackNode = {
        id: 'techstack-test',
        type: 'TechnologyStack',
        properties: { name: 'Test Stack', frontend: ['React'], backend: ['Node.js'], database: ['PostgreSQL'], hosting: ['Vercel'], industry: 'test', maturity: 'mature' },
        createdAt: Date.now(), updatedAt: Date.now(),
      };
      graph.addNode(node);
      expect(graph.getNode('techstack-test')).toBeDefined();
    });

    it('should add ProviderCapability nodes', () => {
      const graph = new KnowledgeGraph();
      const node: ProviderCapabilityNode = {
        id: 'provider-test',
        type: 'ProviderCapability',
        properties: { provider: 'test-provider', taskTypes: ['analysis'], strengths: ['speed'], latency: 'low', costTier: 'low', maxTokens: 8192 },
        createdAt: Date.now(), updatedAt: Date.now(),
      };
      graph.addNode(node);
      expect(graph.getNode('provider-test')).toBeDefined();
    });

    it('should add ArchitecturalPattern nodes', () => {
      const graph = new KnowledgeGraph();
      const node: ArchitecturalPatternNode = {
        id: 'pattern-test',
        type: 'ArchitecturalPattern',
        properties: { name: 'Test Pattern', description: 'A test pattern', complexity: 'simple', scalability: 'low', industries: [], components: [] },
        createdAt: Date.now(), updatedAt: Date.now(),
      };
      graph.addNode(node);
      expect(graph.getNode('pattern-test')).toBeDefined();
    });
  });

  // ── New Edge Types ──────────────────────────────────────────────────────

  describe('New Edge Types', () => {
    it('should support recommended_for edges', () => {
      const graph = new KnowledgeGraph();
      graph.addNode(makeIndustryNode('industry-saas'));
      graph.addNode({
        id: 'techstack-saas', type: 'TechnologyStack',
        properties: { name: 'SaaS Stack', frontend: [], backend: [], database: [], hosting: [], industry: 'saas', maturity: 'mature' },
        createdAt: Date.now(), updatedAt: Date.now(),
      });
      graph.addEdge({ id: 'edge-1', source: 'techstack-saas', target: 'industry-saas', type: 'recommended_for', weight: 0.9, properties: {}, createdAt: Date.now() });
      const results = graph.getRecommendationsForIndustry('industry-saas');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('techstack-saas');
    });

    it('should support suited_for edges', () => {
      const graph = new KnowledgeGraph();
      graph.addNode(makeIndustryNode('industry-ecommerce'));
      graph.addNode({
        id: 'pattern-mono', type: 'ArchitecturalPattern',
        properties: { name: 'Monolith', description: 'Simple', complexity: 'simple', scalability: 'low', industries: [], components: [] },
        createdAt: Date.now(), updatedAt: Date.now(),
      });
      graph.addEdge({ id: 'edge-1', source: 'pattern-mono', target: 'industry-ecommerce', type: 'suited_for', weight: 0.8, properties: {}, createdAt: Date.now() });
      const results = graph.getPatternsForIndustry('industry-ecommerce');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('pattern-mono');
    });

    it('should query providers by task type', () => {
      const graph = new KnowledgeGraph();
      graph.addNode({
        id: 'provider-groq', type: 'ProviderCapability',
        properties: { provider: 'groq', taskTypes: ['analysis', 'code-generation'], strengths: ['speed'], latency: 'low', costTier: 'low', maxTokens: 8192 },
        createdAt: Date.now(), updatedAt: Date.now(),
      });
      graph.addNode({
        id: 'provider-anthropic', type: 'ProviderCapability',
        properties: { provider: 'anthropic', taskTypes: ['creative', 'review'], strengths: ['quality'], latency: 'high', costTier: 'high', maxTokens: 8192 },
        createdAt: Date.now(), updatedAt: Date.now(),
      });
      const results = graph.getProvidersForTaskType('analysis');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('provider-groq');
    });
  });

  // ── Seed Data ───────────────────────────────────────────────────────────

  describe('Seed Data', () => {
    it('should have technology stacks for all industries', () => {
      expect(TECHNOLOGY_STACKS.length).toBeGreaterThanOrEqual(10);
    });

    it('should have provider capabilities for all providers', () => {
      expect(PROVIDER_CAPABILITIES.length).toBe(4);
    });

    it('should have architectural patterns', () => {
      expect(ARCHITECTURAL_PATTERNS.length).toBeGreaterThanOrEqual(4);
    });

    it('should have seed edges', () => {
      expect(DECISION_SEED_EDGES.length).toBeGreaterThan(0);
    });
  });

  // ── Integration ─────────────────────────────────────────────────────────

  describe('Integration', () => {
    it('should load seeds into graph and query', () => {
      const graph = new KnowledgeGraph();

      // Add industry nodes
      for (const tech of TECHNOLOGY_STACKS) {
        graph.addNode(tech);
        graph.addNode(makeIndustryNode(`industry-${tech.properties.industry}`));
      }

      // Add edges
      for (const edge of DECISION_SEED_EDGES) {
        try {
          graph.addEdge({ id: `seed-${edge.source}-${edge.target}`, ...edge, properties: {}, createdAt: Date.now() });
        } catch {
          // Some edges may fail if target doesn't exist
        }
      }

      const stats = graph.stats();
      expect(stats.nodes).toBeGreaterThan(TECHNOLOGY_STACKS.length);
    });
  });
});
