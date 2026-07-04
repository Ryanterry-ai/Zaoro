/**
 * Application Graph JSON Schema Definitions
 * 
 * Strict schema enforcement for LLM-generated graph output.
 * Used for runtime validation with AJV after LLM responses.
 */

// ─── Application Graph Schema ────────────────────────────────────────────────

export const ApplicationGraphSchema = {
  type: 'object',
  properties: {
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', minLength: 1 },
          kind: {
            type: 'string',
            enum: [
              // Domain
              'entity', 'value-object', 'enum',
              // Storage
              'table', 'index', 'view',
              // API
              'endpoint', 'field', 'auth-rule',
              // Process
              'workflow', 'step', 'event',
              // UI
              'page', 'component', 'section',
              // Navigation
              'nav-item', 'nav-group',
              // Capability
              'capability', 'feature', 'requirement',
              // Infrastructure
              'service', 'queue', 'cache',
              // Metadata
              'layout', 'design-token', 'theme', 'i18n-key',
            ],
          },
          label: { type: 'string', minLength: 1 },
          properties: { type: 'object' },
        },
        required: ['id', 'kind', 'label'],
        additionalProperties: false,
      },
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          source: { type: 'string', minLength: 1 },
          target: { type: 'string', minLength: 1 },
          relation: {
            type: 'string',
            enum: [
              // Ownership
              'has_table', 'has_endpoint', 'has_workflow', 'has_page',
              'has_component', 'has_section', 'has_nav_item', 'has_nav_group',
              'has_capability', 'has_feature', 'has_requirement',
              'has_field', 'has_step', 'has_group',
              // Relation
              'entity_relation', 'value_object_of', 'enum_used_by',
              // Dependency
              'feature_requires_entity', 'component_uses_entity', 'service_consumes',
              // Flow
              'endpoint_for_entity', 'workflow_uses_entity', 'page_uses_entity',
              'workflow_step', 'step_triggers_event', 'event_consumed_by',
              // Navigation
              'nav_item_page', 'nav_group_item',
              // UI
              'page_has_layout', 'layout_has_component', 'component_renders_entity',
              // Capability
              'capability_has_feature', 'feature_has_requirement',
              // Metadata
              'entity_has_token', 'page_has_theme', 'entity_has_i18n',
            ],
          },
          label: { type: 'string' },
        },
        required: ['source', 'target', 'relation'],
        additionalProperties: false,
      },
    },
    metadata: {
      type: 'object',
      properties: {
        industry: { type: 'string' },
        subIndustry: { type: 'string' },
        appName: { type: 'string' },
        databaseEngine: { type: 'string' },
        country: { type: 'string' },
        businessModels: { type: 'array', items: { type: 'string' } },
        compliancePacks: { type: 'array', items: { type: 'string' } },
        audience: { type: 'string' },
        createdAt: { type: 'string' },
      },
      required: ['industry', 'appName', 'databaseEngine', 'createdAt'],
    },
  },
  required: ['nodes', 'edges', 'metadata'],
  additionalProperties: false,
} as const;

// ─── Node Kinds ──────────────────────────────────────────────────────────────

export const NODE_KINDS = [
  // Domain
  'entity', 'value-object', 'enum',
  // Storage
  'table', 'index', 'view',
  // API
  'endpoint', 'field', 'auth-rule',
  // Process
  'workflow', 'step', 'event',
  // UI
  'page', 'component', 'section',
  // Navigation
  'nav-item', 'nav-group',
  // Capability
  'capability', 'feature', 'requirement',
  // Infrastructure
  'service', 'queue', 'cache',
  // Metadata
  'layout', 'design-token', 'theme', 'i18n-key',
] as const;

export type NodeKind = (typeof NODE_KINDS)[number];

// ─── Edge Kinds ──────────────────────────────────────────────────────────────

export const EDGE_KINDS = [
  // Ownership
  'has_table', 'has_endpoint', 'has_workflow', 'has_page',
  'has_component', 'has_section', 'has_nav_item', 'has_nav_group',
  'has_capability', 'has_feature', 'has_requirement',
  'has_field', 'has_step', 'has_group',
  // Relation
  'entity_relation', 'value_object_of', 'enum_used_by',
  // Dependency
  'feature_requires_entity', 'component_uses_entity', 'service_consumes',
  // Flow
  'endpoint_for_entity', 'workflow_uses_entity', 'page_uses_entity',
  'workflow_step', 'step_triggers_event', 'event_consumed_by',
  // Navigation
  'nav_item_page', 'nav_group_item',
  // UI
  'page_has_layout', 'layout_has_component', 'component_renders_entity',
  // Capability
  'capability_has_feature', 'feature_has_requirement',
  // Metadata
  'entity_has_token', 'page_has_theme', 'entity_has_i18n',
] as const;

export type EdgeKind = (typeof EDGE_KINDS)[number];

// ─── Graph Node Interface ────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  kind: NodeKind;
  label: string;
  properties?: Record<string, unknown>;
}

// ─── Graph Edge Interface ────────────────────────────────────────────────────

export interface GraphEdge {
  source: string;
  target: string;
  relation: EdgeKind;
  label?: string;
}

// ─── Graph Metadata Interface ────────────────────────────────────────────────

export interface GraphMetadata {
  industry: string;
  subIndustry?: string;
  appName: string;
  databaseEngine: string;
  country?: string;
  businessModels?: string[];
  compliancePacks?: string[];
  audience?: string;
  createdAt: string;
}

// ─── Application Graph Interface ─────────────────────────────────────────────

export interface ApplicationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
}

// ─── Validation Result ───────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Schema Validation Functions ─────────────────────────────────────────────

/**
 * Validate a graph object against the Application Graph schema.
 * Uses AJV for JSON Schema validation.
 */
export async function validateGraph(data: unknown): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const ajvModule = await import('ajv');
    const Ajv = ajvModule.default || ajvModule;
    const ajv = new (Ajv as any)({ allErrors: true });
    const validate = ajv.compile(ApplicationGraphSchema);
    const valid = validate(data);

    if (!valid && validate.errors) {
      for (const err of validate.errors) {
        errors.push(`${err.instancePath || '/'}: ${err.message || 'validation error'}`);
      }
    }
  } catch (err) {
    errors.push(`Schema validation failed: ${(err as Error).message}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate a graph object synchronously (requires pre-compiled validator).
 */
export function validateGraphSync(
  data: unknown,
  validate: (data: unknown) => boolean
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const valid = validate(data);

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate graph structure (nodes, edges, references).
 */
export function validateGraphStructure(graph: ApplicationGraph): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for duplicate node IDs
  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  // Check edge references
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge source not found: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge target not found: ${edge.target}`);
    }
  }

  // Check for cycles (simple DFS)
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const adjacency = new Map<string, string[]>();

  for (const edge of graph.edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  }

  function dfs(nodeId: string): boolean {
    if (inStack.has(nodeId)) return true; // Cycle detected
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    inStack.add(nodeId);

    for (const neighbor of adjacency.get(nodeId) || []) {
      if (dfs(neighbor)) return true;
    }

    inStack.delete(nodeId);
    return false;
  }

  for (const node of graph.nodes) {
    if (dfs(node.id)) {
      warnings.push(`Cycle detected involving node: ${node.id}`);
      break;
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Sanitize and normalize graph data from LLM output.
 */
export function sanitizeGraph(data: unknown): ApplicationGraph | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) return null;

  const metadata = (obj.metadata && typeof obj.metadata === 'object')
    ? obj.metadata as Record<string, unknown>
    : {};

  return {
    nodes: obj.nodes.filter((n: unknown): n is GraphNode => {
      if (!n || typeof n !== 'object') return false;
      const node = n as Record<string, unknown>;
      return typeof node.id === 'string' && typeof node.kind === 'string' && typeof node.label === 'string';
    }),
    edges: obj.edges.filter((e: unknown): e is GraphEdge => {
      if (!e || typeof e !== 'object') return false;
      const edge = e as Record<string, unknown>;
      return typeof edge.source === 'string' && typeof edge.target === 'string' && typeof edge.relation === 'string';
    }),
    metadata: {
      industry: String(metadata.industry || 'unknown'),
      appName: String(metadata.appName || 'Untitled'),
      databaseEngine: String(metadata.databaseEngine || 'postgresql'),
      createdAt: String(metadata.createdAt || new Date().toISOString()),
      ...(metadata.subIndustry ? { subIndustry: String(metadata.subIndustry) } : {}),
      ...(metadata.country ? { country: String(metadata.country) } : {}),
      ...(Array.isArray(metadata.businessModels) ? { businessModels: metadata.businessModels.map(String) } : {}),
      ...(Array.isArray(metadata.compliancePacks) ? { compliancePacks: metadata.compliancePacks.map(String) } : {}),
      ...(metadata.audience ? { audience: String(metadata.audience) } : {}),
    },
  };
}
