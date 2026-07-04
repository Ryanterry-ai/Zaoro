/**
 * ApplicationGraph — unified graph of the entire application being built.
 *
 * Merges the 6 pipeline-v2 sub-graphs (capability, entity, workflow,
 * navigation, database, API) into one coherent structure that the
 * Renderer and CodeGenerator can consume directly.
 *
 * Pass 3 reads this graph and emits framework-specific source files
 * (API routes, Prisma schema, DB client) without guessing or templating.
 */

import type {
  EntityDef,
  EntityField,
  EntityRelation,
  TableDef,
  EndpointDef,
  WorkflowDef,
  PageDef,
  CapabilityNode,
  FeatureDef,
  NavItemDef,
} from '../pipeline-v2/stages.js';

// ─── Graph Node Types ────────────────────────────────────────────────────────

export type GraphNodeKind =
  | 'entity'
  | 'table'
  | 'endpoint'
  | 'workflow'
  | 'page'
  | 'capability'
  | 'feature'
  | 'nav-item'
  | 'layout';

export interface GraphNodeBase {
  kind: GraphNodeKind;
  id: string;
}

export interface EntityNode extends GraphNodeBase {
  kind: 'entity';
  data: EntityDef;
}

export interface TableNode extends GraphNodeBase {
  kind: 'table';
  data: TableDef;
}

export interface EndpointNode extends GraphNodeBase {
  kind: 'endpoint';
  data: EndpointDef;
}

export interface WorkflowNode extends GraphNodeBase {
  kind: 'workflow';
  data: WorkflowDef;
}

export interface PageNode extends GraphNodeBase {
  kind: 'page';
  data: PageDef;
}

export interface CapabilityNodeEntry extends GraphNodeBase {
  kind: 'capability';
  data: CapabilityNode;
}

export interface FeatureNodeEntry extends GraphNodeBase {
  kind: 'feature';
  data: FeatureDef;
}

export interface NavItemNode extends GraphNodeBase {
  kind: 'nav-item';
  data: NavItemDef;
}

export type GraphNode =
  | EntityNode
  | TableNode
  | EndpointNode
  | WorkflowNode
  | PageNode
  | CapabilityNodeEntry
  | FeatureNodeEntry
  | NavItemNode;

// ─── Graph Edge Types ────────────────────────────────────────────────────────

export type EdgeKind =
  | 'has_table'
  | 'has_endpoint'
  | 'has_workflow'
  | 'has_page'
  | 'has_capability'
  | 'has_feature'
  | 'has_nav_item'
  | 'entity_relation'
  | 'endpoint_for_entity'
  | 'workflow_uses_entity'
  | 'page_uses_entity'
  | 'feature_requires_entity';

export interface GraphEdge {
  kind: EdgeKind;
  from: string;  // source node id
  to: string;    // target node id
  label?: string;
}

// ─── ApplicationGraph ────────────────────────────────────────────────────────

export interface AppGraphMetadata {
  industry: string;
  subIndustry?: string;
  appName: string;
  databaseEngine: string;
  country?: string;
  businessModels: string[];
  compliancePacks: string[];
  audience?: string;
  createdAt: string;
}

export interface ApplicationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: AppGraphMetadata;
}

// ─── AppGraphStats ───────────────────────────────────────────────────────────

export interface AppGraphStats {
  nodes: number;
  edges: number;
  byKind: Record<GraphNodeKind, number>;
  entityCount: number;
  tableCount: number;
  endpointCount: number;
  workflowCount: number;
  pageCount: number;
  capabilityCount: number;
  crudEndpoints: number;
  authEndpoints: number;
  totalFields: number;
  totalColumns: number;
}

// ─── Graph Builder ───────────────────────────────────────────────────────────

export function buildApplicationGraph(opts: {
  entities: EntityDef[];
  entityRelations: EntityRelation[];
  tables: TableDef[];
  endpoints: EndpointDef[];
  workflows: WorkflowDef[];
  pages: PageDef[];
  capabilities: CapabilityNode[];
  features: FeatureDef[];
  navItems: NavItemDef[];
  industry: string;
  subIndustry?: string;
  appName: string;
  databaseEngine: string;
  country?: string;
  businessModels: string[];
  compliancePacks: string[];
  audience?: string;
}): ApplicationGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Entity nodes
  for (const entity of opts.entities) {
    const id = `entity:${entity.name}`;
    nodes.push({ kind: 'entity', id, data: entity });

    // Find matching table (database-graph stage pluralizes names: "products" for "Product")
    const entityLower = entity.name.toLowerCase();
    const table = opts.tables.find(
      t => {
        const tName = t.name.toLowerCase();
        return tName === entityLower ||
          tName === entityLower + 's' ||
          tName === entity.slug + 's' ||
          tName.replace(/s$/, '') === entityLower;
      },
    );
    if (table) {
      const tableId = `table:${table.name}`;
      nodes.push({ kind: 'table', id: tableId, data: table });
      edges.push({ kind: 'has_table', from: id, to: tableId });
    }

    // Find matching endpoints
    for (const ep of opts.endpoints) {
      if (ep.entity?.toLowerCase() === entity.name.toLowerCase()) {
        const epId = `endpoint:${ep.method}:${ep.path}`;
        nodes.push({ kind: 'endpoint', id: epId, data: ep });
        edges.push({ kind: 'has_endpoint', from: id, to: epId });
        edges.push({ kind: 'endpoint_for_entity', from: epId, to: id });
      }
    }
  }

  // Standalone endpoints (not linked to an entity)
  const linkedEndpointPaths = new Set(
    edges.filter(e => e.kind === 'endpoint_for_entity').map(e => e.from),
  );
  for (const ep of opts.endpoints) {
    const epId = `endpoint:${ep.method}:${ep.path}`;
    if (!linkedEndpointPaths.has(epId)) {
      nodes.push({ kind: 'endpoint', id: epId, data: ep });
    }
  }

  // Entity relations as edges
  for (const rel of opts.entityRelations) {
    edges.push({
      kind: 'entity_relation',
      from: `entity:${rel.source}`,
      to: `entity:${rel.target}`,
      label: rel.type,
    });
  }

  // Workflow nodes
  for (const wf of opts.workflows) {
    const id = `workflow:${wf.name}`;
    nodes.push({ kind: 'workflow', id, data: wf });
    for (const entityName of wf.entities) {
      edges.push({ kind: 'workflow_uses_entity', from: id, to: `entity:${entityName}` });
    }
  }

  // Page nodes
  for (const page of opts.pages) {
    const id = `page:${page.path}`;
    nodes.push({ kind: 'page', id, data: page });
    for (const entityName of page.entities) {
      edges.push({ kind: 'page_uses_entity', from: id, to: `entity:${entityName}` });
    }
  }

  // Capability nodes
  for (const cap of opts.capabilities) {
    const id = `capability:${cap.name}`;
    nodes.push({ kind: 'capability', id, data: cap });
  }

  // Feature nodes
  for (const feat of opts.features) {
    const id = `feature:${feat.name}`;
    nodes.push({ kind: 'feature', id, data: feat });
    for (const entityName of feat.entities) {
      edges.push({ kind: 'feature_requires_entity', from: id, to: `entity:${entityName}` });
    }
  }

  // Nav item nodes
  for (const nav of opts.navItems) {
    const id = `nav:${nav.href}`;
    nodes.push({ kind: 'nav-item', id, data: nav });
  }

  const metadata: AppGraphMetadata = {
    industry: opts.industry,
    appName: opts.appName,
    databaseEngine: opts.databaseEngine,
    businessModels: opts.businessModels,
    compliancePacks: opts.compliancePacks,
    createdAt: new Date().toISOString(),
  };
  if (opts.subIndustry) metadata.subIndustry = opts.subIndustry;
  if (opts.country) metadata.country = opts.country;
  if (opts.audience) metadata.audience = opts.audience;

  return { nodes, edges, metadata };
}

// ─── Stats Computation ───────────────────────────────────────────────────────

export function computeAppGraphStats(graph: ApplicationGraph): AppGraphStats {
  const byKind = {} as Record<GraphNodeKind, number>;
  for (const kind of [
    'entity', 'table', 'endpoint', 'workflow', 'page',
    'capability', 'feature', 'nav-item', 'layout',
  ] as GraphNodeKind[]) {
    byKind[kind] = 0;
  }
  for (const node of graph.nodes) {
    byKind[node.kind]++;
  }

  const endpoints = graph.nodes.filter((n): n is EndpointNode => n.kind === 'endpoint');
  const entities = graph.nodes.filter((n): n is EntityNode => n.kind === 'entity');
  const tables = graph.nodes.filter((n): n is TableNode => n.kind === 'table');

  return {
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    byKind,
    entityCount: byKind.entity,
    tableCount: byKind.table,
    endpointCount: byKind.endpoint,
    workflowCount: byKind.workflow,
    pageCount: byKind.page,
    capabilityCount: byKind.capability,
    crudEndpoints: endpoints.filter(e =>
      ['GET', 'POST', 'PUT', 'DELETE'].includes(e.data.method),
    ).length,
    authEndpoints: endpoints.filter(e => e.data.auth).length,
    totalFields: entities.reduce((s, e) => s + e.data.fields.length, 0),
    totalColumns: tables.reduce((s, t) => s + t.data.columns.length, 0),
  };
}
