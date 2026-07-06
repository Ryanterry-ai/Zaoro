import { KnowledgeGraph } from './engine.js';
import type { Edge, EdgeType } from './types.js';
import { KnowledgeRegistry, PATTERNS, DESIGN_PROFILES } from '../knowledge/registry.js';

export interface TypedRelationshipResult {
  edgesAdded: number;
  nodesAdded: number;
  relationships: Array<{
    type: string;
    source: string;
    target: string;
    sourceType: string;
    targetType: string;
  }>;
}

function createEdge(source: string, target: string, type: EdgeType, weight = 1.0): Edge {
  return {
    id: `${source}->${target}:${type}`,
    source,
    target,
    type,
    weight,
    properties: {} as Record<string, unknown>,
    createdAt: Date.now(),
  };
}

function toStringOrRecord(v: unknown): string | { name: string; [key: string]: unknown } {
  if (typeof v === 'string') return v;
  return (v as { name?: string })?.name || String(v);
}

export function connectKnowledgeGraph(graph: KnowledgeGraph, registry: KnowledgeRegistry = new KnowledgeRegistry()): TypedRelationshipResult {
  const result: TypedRelationshipResult = { edgesAdded: 0, nodesAdded: 0, relationships: [] };

  for (const pattern of PATTERNS) {
    const p = pattern as any;
    const patternNodeId = `pattern:${p.id}`;

    // Ensure pattern node exists
    if (!graph.getNode(patternNodeId)) {
      graph.addNode({
        id: patternNodeId,
        type: 'DesignPattern',
        properties: {
          name: p.name,
          slug: p.id,
          description: p.description || '',
          industryAffinity: p.industry || [],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      result.nodesAdded++;
    }

    // Connect to entities (from pattern.entities or pattern.defaultEntities)
    const entities: unknown[] = p.entities || p.defaultEntities || [];
    for (const entity of entities) {
      const resolved = toStringOrRecord(entity);
      const entityName = typeof resolved === 'string' ? resolved : resolved.name;
      const entityNodeId = `entity:${entityName.toLowerCase().replace(/\s+/g, '-')}`;
      if (!graph.getNode(entityNodeId)) {
        graph.addNode({
          id: entityNodeId,
          type: 'Entity',
          properties: {
            name: entityName,
            slug: entityName.toLowerCase().replace(/\s+/g, '-'),
            description: '',
            fields: [],
            relationships: [],
            uiSections: [],
            workflows: [],
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        result.nodesAdded++;
      }
      graph.addEdge(createEdge(patternNodeId, entityNodeId, 'governs_entity'));
      result.edgesAdded++;
      result.relationships.push({ type: 'governs_entity', source: patternNodeId, target: entityNodeId, sourceType: 'DesignPattern', targetType: 'Entity' });
    }

    // Connect to roles
    const roles: unknown[] = p.roles || [];
    for (const role of roles) {
      const resolved = toStringOrRecord(role);
      const roleName = typeof resolved === 'string' ? resolved : resolved.name;
      const roleNodeId = `role:${roleName.toLowerCase().replace(/\s+/g, '-')}`;
      if (!graph.getNode(roleNodeId)) {
        const permissions: string[] = typeof role === 'object' && role !== null ? (role as any).permissions || [] : [];
        graph.addNode({
          id: roleNodeId,
          type: 'Role',
          properties: {
            name: roleName,
            slug: roleName.toLowerCase().replace(/\s+/g, '-'),
            description: '',
            permissions,
            capabilities: [],
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        result.nodesAdded++;
      }
      graph.addEdge(createEdge(patternNodeId, roleNodeId, 'defines_role'));
      result.edgesAdded++;
      result.relationships.push({ type: 'defines_role', source: patternNodeId, target: roleNodeId, sourceType: 'DesignPattern', targetType: 'Role' });
    }

    // Connect to KPIs
    const kpis: unknown[] = p.kpis || [];
    for (const kpi of kpis) {
      const resolved = toStringOrRecord(kpi);
      const kpiName = typeof resolved === 'string' ? resolved : resolved.name;
      const kpiNodeId = `kpi:${kpiName.toLowerCase().replace(/\s+/g, '-')}`;
      if (!graph.getNode(kpiNodeId)) {
        const formula = typeof kpi === 'object' && kpi !== null ? (kpi as any).formula || '' : '';
        graph.addNode({
          id: kpiNodeId,
          type: 'Kpi',
          properties: {
            name: kpiName,
            slug: kpiName.toLowerCase().replace(/\s+/g, '-'),
            description: '',
            formula,
            category: 'growth',
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        result.nodesAdded++;
      }
      graph.addEdge(createEdge(patternNodeId, kpiNodeId, 'measures_kpi'));
      result.edgesAdded++;
      result.relationships.push({ type: 'measures_kpi', source: patternNodeId, target: kpiNodeId, sourceType: 'DesignPattern', targetType: 'Kpi' });
    }
  }

  return result;
}

export function getPatternRelationships(graph: KnowledgeGraph, patternId: string): {
  entities: string[];
  roles: string[];
  kpis: string[];
  capabilities: string[];
} {
  const patternNodeId = `pattern:${patternId}`;
  const result = { entities: [] as string[], roles: [] as string[], kpis: [] as string[], capabilities: [] as string[] };

  const allEdges = graph.queryEdges({ source: patternNodeId });
  for (const edge of allEdges) {
    const targetNode = graph.getNode(edge.target);
    if (!targetNode) continue;
    const name = (targetNode.properties.name as string) || edge.target;
    if (edge.type === 'governs_entity') result.entities.push(name);
    else if (edge.type === 'defines_role') result.roles.push(name);
    else if (edge.type === 'measures_kpi') result.kpis.push(name);
    else if (edge.type === 'requires') result.capabilities.push(name);
  }

  return result;
}
