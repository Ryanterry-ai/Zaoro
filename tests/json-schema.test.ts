import { describe, it, expect, beforeAll } from 'vitest';
import {
  ApplicationGraphSchema,
  NODE_KINDS,
  EDGE_KINDS,
  validateGraph,
  validateGraphStructure,
  sanitizeGraph,
  type ApplicationGraph,
} from '../src/core/schemas.js';

describe('Application Graph JSON Schema Guardrails', () => {
  describe('Schema Constants', () => {
    it('should have all required node kinds', () => {
      expect(NODE_KINDS).toContain('entity');
      expect(NODE_KINDS).toContain('page');
      expect(NODE_KINDS).toContain('endpoint');
      expect(NODE_KINDS).toContain('workflow');
      expect(NODE_KINDS).toContain('component');
      expect(NODE_KINDS).toContain('table');
      expect(NODE_KINDS).toContain('capability');
      expect(NODE_KINDS).toContain('feature');
      expect(NODE_KINDS.length).toBeGreaterThanOrEqual(20);
    });

    it('should have all required edge kinds', () => {
      expect(EDGE_KINDS).toContain('has_table');
      expect(EDGE_KINDS).toContain('has_endpoint');
      expect(EDGE_KINDS).toContain('has_page');
      expect(EDGE_KINDS).toContain('entity_relation');
      expect(EDGE_KINDS).toContain('page_has_layout');
      expect(EDGE_KINDS).toContain('layout_has_component');
      expect(EDGE_KINDS.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Valid Payloads', () => {
    it('should validate a perfectly structural compliant payload', async () => {
      const validPayload = {
        nodes: [
          { id: 'node-1', kind: 'layout', label: 'Main Header Shell', properties: {} },
          { id: 'node-2', kind: 'page', label: 'Home Page', properties: { path: '/' } },
        ],
        edges: [
          { source: 'node-1', target: 'node-2', relation: 'layout_has_component' },
        ],
        metadata: {
          industry: 'saas',
          appName: 'TestApp',
          databaseEngine: 'postgresql',
          createdAt: new Date().toISOString(),
        },
      };

      const result = await validateGraph(validPayload);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a minimal graph with only required fields', async () => {
      const minimalPayload = {
        nodes: [
          { id: 'entity:User', kind: 'entity', label: 'User' },
        ],
        edges: [],
        metadata: {
          industry: 'saas',
          appName: 'MinimalApp',
          databaseEngine: 'postgresql',
          createdAt: new Date().toISOString(),
        },
      };

      const result = await validateGraph(minimalPayload);
      expect(result.valid).toBe(true);
    });

    it('should validate a graph with all node kinds', async () => {
      const allKindsPayload = {
        nodes: NODE_KINDS.map((kind, i) => ({
          id: `node-${i}`,
          kind,
          label: `Node ${i}`,
        })),
        edges: [],
        metadata: {
          industry: 'saas',
          appName: 'AllKindsApp',
          databaseEngine: 'postgresql',
          createdAt: new Date().toISOString(),
        },
      };

      const result = await validateGraph(allKindsPayload);
      expect(result.valid).toBe(true);
    });

    it('should validate a graph with all edge kinds', async () => {
      const allEdgesPayload = {
        nodes: [
          { id: 'node-1', kind: 'entity', label: 'Source' },
          { id: 'node-2', kind: 'entity', label: 'Target' },
        ],
        edges: EDGE_KINDS.map((relation, i) => ({
          source: 'node-1',
          target: 'node-2',
          relation,
          label: `Edge ${i}`,
        })),
        metadata: {
          industry: 'saas',
          appName: 'AllEdgesApp',
          databaseEngine: 'postgresql',
          createdAt: new Date().toISOString(),
        },
      };

      const result = await validateGraph(allEdgesPayload);
      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid Payloads', () => {
    it('should reject structures missing nodes', async () => {
      const invalidPayload = {
        edges: [],
        metadata: {
          industry: 'saas',
          appName: 'NoNodesApp',
          databaseEngine: 'postgresql',
          createdAt: new Date().toISOString(),
        },
      };

      const result = await validateGraph(invalidPayload);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject structures missing edges', async () => {
      const invalidPayload = {
        nodes: [
          { id: 'node-1', kind: 'entity', label: 'User' },
        ],
        metadata: {
          industry: 'saas',
          appName: 'NoEdgesApp',
          databaseEngine: 'postgresql',
          createdAt: new Date().toISOString(),
        },
      };

      const result = await validateGraph(invalidPayload);
      expect(result.valid).toBe(false);
    });

    it('should reject structures missing metadata', async () => {
      const invalidPayload = {
        nodes: [
          { id: 'node-1', kind: 'entity', label: 'User' },
        ],
        edges: [],
      };

      const result = await validateGraph(invalidPayload);
      expect(result.valid).toBe(false);
    });

    it('should reject nodes missing required fields', async () => {
      const invalidPayload = {
        nodes: [
          { id: 'node-missing-kind', label: 'No Kind' },
        ],
        edges: [],
        metadata: {
          industry: 'saas',
          appName: 'MissingFieldsApp',
          databaseEngine: 'postgresql',
          createdAt: new Date().toISOString(),
        },
      };

      const result = await validateGraph(invalidPayload);
      expect(result.valid).toBe(false);
    });

    it('should reject edges missing required fields', async () => {
      const invalidPayload = {
        nodes: [
          { id: 'node-1', kind: 'entity', label: 'User' },
        ],
        edges: [
          { source: 'node-1', target: 'node-2' },
        ],
        metadata: {
          industry: 'saas',
          appName: 'MissingEdgeFieldsApp',
          databaseEngine: 'postgresql',
          createdAt: new Date().toISOString(),
        },
      };

      const result = await validateGraph(invalidPayload);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid node kind', async () => {
      const invalidPayload = {
        nodes: [
          { id: 'node-1', kind: 'invalid-kind', label: 'Invalid' },
        ],
        edges: [],
        metadata: {
          industry: 'saas',
          appName: 'InvalidKindApp',
          databaseEngine: 'postgresql',
          createdAt: new Date().toISOString(),
        },
      };

      const result = await validateGraph(invalidPayload);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid edge relation', async () => {
      const invalidPayload = {
        nodes: [
          { id: 'node-1', kind: 'entity', label: 'User' },
          { id: 'node-2', kind: 'entity', label: 'Product' },
        ],
        edges: [
          { source: 'node-1', target: 'node-2', relation: 'invalid-relation' },
        ],
        metadata: {
          industry: 'saas',
          appName: 'InvalidRelationApp',
          databaseEngine: 'postgresql',
          createdAt: new Date().toISOString(),
        },
      };

      const result = await validateGraph(invalidPayload);
      expect(result.valid).toBe(false);
    });

    it('should reject additional properties in nodes', async () => {
      const invalidPayload = {
        nodes: [
          { id: 'node-1', kind: 'entity', label: 'User', extra: 'not allowed' },
        ],
        edges: [],
        metadata: {
          industry: 'saas',
          appName: 'ExtraPropsApp',
          databaseEngine: 'postgresql',
          createdAt: new Date().toISOString(),
        },
      };

      const result = await validateGraph(invalidPayload);
      expect(result.valid).toBe(false);
    });

    it('should reject additional properties in edges', async () => {
      const invalidPayload = {
        nodes: [
          { id: 'node-1', kind: 'entity', label: 'User' },
          { id: 'node-2', kind: 'entity', label: 'Product' },
        ],
        edges: [
          { source: 'node-1', target: 'node-2', relation: 'entity_relation', extra: 'not allowed' },
        ],
        metadata: {
          industry: 'saas',
          appName: 'ExtraEdgePropsApp',
          databaseEngine: 'postgresql',
          createdAt: new Date().toISOString(),
        },
      };

      const result = await validateGraph(invalidPayload);
      expect(result.valid).toBe(false);
    });
  });

  describe('Graph Structure Validation', () => {
    it('should detect duplicate node IDs', () => {
      const graph: ApplicationGraph = {
        nodes: [
          { id: 'node-1', kind: 'entity', label: 'User' },
          { id: 'node-1', kind: 'entity', label: 'Duplicate' },
        ],
        edges: [],
        metadata: {
          industry: 'saas',
          appName: 'DuplicateApp',
          databaseEngine: 'postgresql',
          createdAt: new Date().toISOString(),
        },
      };

      const result = validateGraphStructure(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate node ID'))).toBe(true);
    });

    it('should detect invalid edge references', () => {
      const graph: ApplicationGraph = {
        nodes: [
          { id: 'node-1', kind: 'entity', label: 'User' },
        ],
        edges: [
          { source: 'node-1', target: 'nonexistent', relation: 'entity_relation' },
        ],
        metadata: {
          industry: 'saas',
          appName: 'InvalidRefApp',
          databaseEngine: 'postgresql',
          createdAt: new Date().toISOString(),
        },
      };

      const result = validateGraphStructure(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Edge target not found'))).toBe(true);
    });

    it('should accept a valid graph structure', () => {
      const graph: ApplicationGraph = {
        nodes: [
          { id: 'node-1', kind: 'entity', label: 'User' },
          { id: 'node-2', kind: 'table', label: 'users' },
        ],
        edges: [
          { source: 'node-1', target: 'node-2', relation: 'has_table' },
        ],
        metadata: {
          industry: 'saas',
          appName: 'ValidApp',
          databaseEngine: 'postgresql',
          createdAt: new Date().toISOString(),
        },
      };

      const result = validateGraphStructure(graph);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Sanitize Graph', () => {
    it('should sanitize valid data', () => {
      const data = {
        nodes: [
          { id: 'node-1', kind: 'entity', label: 'User', properties: { name: 'test' } },
        ],
        edges: [
          { source: 'node-1', target: 'node-2', relation: 'entity_relation' },
        ],
        metadata: {
          industry: 'saas',
          appName: 'SanitizedApp',
          databaseEngine: 'postgresql',
          createdAt: new Date().toISOString(),
        },
      };

      const graph = sanitizeGraph(data);
      expect(graph).not.toBeNull();
      expect(graph!.nodes).toHaveLength(1);
      expect(graph!.edges).toHaveLength(1);
    });

    it('should filter invalid nodes', () => {
      const data = {
        nodes: [
          { id: 'node-1', kind: 'entity', label: 'User' },
          { id: 'node-2' }, // Missing kind and label
          { kind: 'entity', label: 'NoId' }, // Missing id
        ],
        edges: [],
        metadata: {
          industry: 'saas',
          appName: 'FilterApp',
          databaseEngine: 'postgresql',
          createdAt: new Date().toISOString(),
        },
      };

      const graph = sanitizeGraph(data);
      expect(graph).not.toBeNull();
      expect(graph!.nodes).toHaveLength(1);
    });

    it('should return null for invalid input', () => {
      expect(sanitizeGraph(null)).toBeNull();
      expect(sanitizeGraph('string')).toBeNull();
      expect(sanitizeGraph(123)).toBeNull();
      expect(sanitizeGraph({ nodes: 'not-array' })).toBeNull();
    });
  });
});
