/**
 * Application Graph — Validation Schemas
 * 
 * This file defines Zod schemas for validating the Application Graph.
 * It is the canonical source of truth for validation rules.
 * 
 * DO NOT modify this file without updating the Architecture Specification.
 */

import { z } from 'zod';
import type { GraphNodeKind } from './nodes.js';
import type { EdgeKind } from './edges.js';

// ─── Common Schemas ──────────────────────────────────────────────────────────

export const EntityFieldSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'date', 'enum', 'reference']),
  required: z.boolean(),
  indexed: z.boolean(),
  unique: z.boolean(),
  defaultValue: z.unknown().optional(),
  constraints: z.array(z.object({
    type: z.enum(['min', 'max', 'minLength', 'maxLength', 'pattern', 'custom']),
    value: z.unknown(),
    message: z.string().optional(),
  })).optional(),
});

export const TableIndexSchema = z.object({
  name: z.string().min(1),
  columns: z.array(z.string()).min(1),
  unique: z.boolean(),
  type: z.enum(['btree', 'hash', 'gin', 'gist', 'brin']),
});

export const TableForeignKeySchema = z.object({
  column: z.string().min(1),
  references: z.string().min(1),
  onDelete: z.enum(['cascade', 'restrict', 'set null', 'no action']),
});

export const WorkflowStepSchema = z.object({
  name: z.string().min(1),
  action: z.string().min(1),
  entity: z.string().optional(),
  condition: z.string().optional(),
  timeout: z.number().positive().optional(),
  compensatingAction: z.string().optional(),
});

export const ComponentPropSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  required: z.boolean(),
  defaultValue: z.unknown().optional(),
});

export const NavItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().startsWith('/'),
  icon: z.string().optional(),
  children: z.lazy(() => z.array(NavItemSchema)).optional(),
});

// ─── Node Schemas ────────────────────────────────────────────────────────────

export const EntityNodeDataSchema = z.object({
  name: z.string().min(1).regex(/^[A-Z][a-zA-Z0-9]*$/),
  slug: z.string().min(1).regex(/^[a-z][a-z0-9-]*$/),
  fields: z.array(EntityFieldSchema).min(1),
  workflows: z.array(z.string()),
  capabilities: z.array(z.string()),
  isVirtual: z.boolean(),
});

export const ValueObjectNodeDataSchema = z.object({
  name: z.string().min(1).regex(/^[A-Z][a-zA-Z0-9]*$/),
  fields: z.array(EntityFieldSchema).min(1),
  parentEntity: z.string().optional(),
});

export const EnumNodeDataSchema = z.object({
  name: z.string().min(1).regex(/^[A-Z][a-zA-Z0-9]*$/),
  values: z.array(z.string()).min(1),
  parentEntity: z.string().optional(),
});

export const TableNodeDataSchema = z.object({
  name: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/),
  columns: z.array(EntityFieldSchema).min(1),
  indexes: z.array(TableIndexSchema),
  foreignKeys: z.array(TableForeignKeySchema),
  engine: z.string().min(1),
});

export const IndexNodeDataSchema = z.object({
  name: z.string().min(1),
  table: z.string().min(1),
  columns: z.array(z.string()).min(1),
  unique: z.boolean(),
  type: z.string().min(1),
});

export const ViewNodeDataSchema = z.object({
  name: z.string().min(1),
  query: z.string().min(1),
  columns: z.array(EntityFieldSchema),
});

export const EndpointNodeDataSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  path: z.string().startsWith('/'),
  entity: z.string().optional(),
  auth: z.boolean(),
  rateLimit: z.number().positive().optional(),
  inputSchema: z.record(z.unknown()).optional(),
  outputSchema: z.record(z.unknown()).optional(),
});

export const FieldNodeDataSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  required: z.boolean(),
  parent: z.string().min(1),
  location: z.enum(['body', 'query', 'path', 'header']),
});

export const AuthRuleNodeDataSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['authentication', 'authorization']),
  mechanism: z.string().min(1),
  permissions: z.array(z.string()),
  endpoints: z.array(z.string()),
});

export const WorkflowNodeDataSchema = z.object({
  name: z.string().min(1).regex(/^[A-Z][a-zA-Z0-9]*$/),
  trigger: z.string().min(1),
  steps: z.array(WorkflowStepSchema),
  entities: z.array(z.string()),
  timeout: z.number().positive().optional(),
  retryPolicy: z.object({
    maxRetries: z.number().positive(),
    backoffMs: z.number().positive(),
  }).optional(),
});

export const StepNodeDataSchema = z.object({
  name: z.string().min(1),
  action: z.string().min(1),
  entity: z.string().optional(),
  condition: z.string().optional(),
  timeout: z.number().positive().optional(),
  compensatingAction: z.string().optional(),
});

export const EventNodeDataSchema = z.object({
  name: z.string().min(1).regex(/^[A-Z][a-zA-Z0-9]*$/),
  type: z.enum(['command', 'event', 'query']),
  payload: z.record(z.unknown()),
  source: z.string().min(1),
  consumers: z.array(z.string()),
});

export const PageNodeDataSchema = z.object({
  path: z.string().startsWith('/'),
  name: z.string().min(1),
  type: z.enum(['home', 'listing', 'detail', 'auth', 'dashboard', 'static', 'page']),
  sections: z.array(z.string()),
  entities: z.array(z.string()),
  workflows: z.array(z.string()),
  auth: z.boolean(),
  layout: z.string().optional(),
});

export const ComponentNodeDataSchema = z.object({
  name: z.string().min(1).regex(/^[A-Z][a-zA-Z0-9]*$/),
  type: z.enum(['atom', 'molecule', 'organism', 'template', 'page']),
  props: z.array(ComponentPropSchema),
  entities: z.array(z.string()),
  variants: z.array(z.string()),
});

export const SectionNodeDataSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['hero', 'content', 'sidebar', 'footer', 'header', 'custom']),
  components: z.array(z.string()),
  layout: z.string().min(1),
});

export const LayoutNodeDataSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  areas: z.array(z.string()).min(1),
  components: z.array(z.string()),
});

export const NavItemNodeDataSchema = z.object({
  label: z.string().min(1),
  href: z.string().startsWith('/'),
  icon: z.string().optional(),
  children: z.array(NavItemSchema).optional(),
  auth: z.boolean(),
  roles: z.array(z.string()).optional(),
});

export const NavGroupNodeDataSchema = z.object({
  name: z.string().min(1),
  items: z.array(z.string()),
  order: z.number(),
  visible: z.boolean(),
});

export const CapabilityNodeDataSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['core', 'enhancement', 'integration', 'compliance']),
  features: z.array(z.string()),
  priority: z.enum(['must_have', 'should_have', 'nice_to_have']),
});

export const FeatureNodeDataSchema = z.object({
  name: z.string().min(1),
  capability: z.string().min(1),
  uiSections: z.array(z.string()),
  entities: z.array(z.string()),
  requirements: z.array(z.string()),
});

export const RequirementNodeDataSchema = z.object({
  id: z.string().min(1).regex(/^REQ-\d+$/),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(['must', 'should', 'could', 'wont']),
  status: z.enum(['draft', 'approved', 'implemented', 'verified']),
});

export const ServiceNodeDataSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['rest', 'grpc', 'graphql', 'websocket']),
  baseUrl: z.string().url(),
  authentication: z.string().min(1),
  entities: z.array(z.string()),
});

export const QueueNodeDataSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['rabbitmq', 'kafka', 'redis', 'sqs']),
  messages: z.array(z.string()),
  consumers: z.array(z.string()),
});

export const CacheNodeDataSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['redis', 'memcached', 'in-memory']),
  ttl: z.number().positive(),
  entities: z.array(z.string()),
});

export const DesignTokenNodeDataSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['color', 'typography', 'spacing', 'shadow', 'border']),
  value: z.string().min(1),
  theme: z.string().optional(),
});

export const ThemeNodeDataSchema = z.object({
  name: z.string().min(1),
  tokens: z.array(z.string()),
  isDefault: z.boolean(),
});

export const I18nKeyNodeDataSchema = z.object({
  key: z.string().min(1),
  defaultValue: z.string().min(1),
  languages: z.record(z.string()),
});

// ─── Graph Node Schema ───────────────────────────────────────────────────────

export const GraphNodeBaseSchema = z.object({
  kind: z.string(),
  id: z.string().min(1),
  data: z.unknown(),
});

// ─── Graph Edge Schema ───────────────────────────────────────────────────────

export const GraphEdgeSchema = z.object({
  kind: z.string(),
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
  weight: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ─── Graph Metadata Schema ───────────────────────────────────────────────────

export const AGMetadataSchema = z.object({
  industry: z.string().min(1),
  subIndustry: z.string().optional(),
  appName: z.string().min(1),
  databaseEngine: z.string().min(1),
  country: z.string().optional(),
  businessModels: z.array(z.string()),
  compliancePacks: z.array(z.string()),
  audience: z.string().optional(),
  description: z.string().optional(),
});

// ─── Application Graph Schema ────────────────────────────────────────────────

export const ApplicationGraphSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  id: z.string().min(1),
  metadata: AGMetadataSchema,
  nodes: z.array(GraphNodeBaseSchema),
  edges: z.array(GraphEdgeSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ─── Validation Rules ────────────────────────────────────────────────────────

export interface ValidationRule {
  id: string;
  name: string;
  level: 'L1' | 'L2' | 'L3' | 'L4';
  severity: 'error' | 'warning' | 'info';
  check: (graph: z.infer<typeof ApplicationGraphSchema>) => ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
}

export interface ValidationError {
  ruleId: string;
  message: string;
  node?: string;
  edge?: string;
  context?: Record<string, unknown>;
}

export interface ValidationWarning {
  ruleId: string;
  message: string;
  node?: string;
  edge?: string;
  context?: Record<string, unknown>;
}

export interface ValidationInfo {
  ruleId: string;
  message: string;
  node?: string;
  edge?: string;
  context?: Record<string, unknown>;
}

// ─── Built-in Validation Rules ───────────────────────────────────────────────

export const VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'I-1',
    name: 'Single Root',
    level: 'L1',
    severity: 'error',
    check: (graph) => {
      const metadataNodes = graph.nodes.filter(n => n.kind === 'metadata');
      if (metadataNodes.length === 0) {
        return {
          valid: false,
          errors: [{ ruleId: 'I-1', message: 'Graph must have exactly one metadata node' }],
          warnings: [],
          info: [],
        };
      }
      if (metadataNodes.length > 1) {
        return {
          valid: false,
          errors: [{ ruleId: 'I-1', message: 'Graph must have exactly one metadata node' }],
          warnings: [],
          info: [],
        };
      }
      return { valid: true, errors: [], warnings: [], info: [] };
    },
  },
  {
    id: 'I-2',
    name: 'Acyclic Ownership',
    level: 'L1',
    severity: 'error',
    check: (graph) => {
      // Check for cycles in ownership edges
      const ownershipEdges = graph.edges.filter(e => e.kind.startsWith('has_'));
      const visited = new Set<string>();
      const recursionStack = new Set<string>();
      
      function hasCycle(nodeId: string): boolean {
        visited.add(nodeId);
        recursionStack.add(nodeId);
        
        for (const edge of ownershipEdges) {
          if (edge.from === nodeId) {
            if (!visited.has(edge.to)) {
              if (hasCycle(edge.to)) return true;
            } else if (recursionStack.has(edge.to)) {
              return true;
            }
          }
        }
        
        recursionStack.delete(nodeId);
        return false;
      }
      
      for (const node of graph.nodes) {
        if (!visited.has(node.id)) {
          if (hasCycle(node.id)) {
            return {
              valid: false,
              errors: [{ ruleId: 'I-2', message: 'Ownership edges contain a cycle' }],
              warnings: [],
              info: [],
            };
          }
        }
      }
      
      return { valid: true, errors: [], warnings: [], info: [] };
    },
  },
  {
    id: 'I-3',
    name: 'Referential Integrity',
    level: 'L1',
    severity: 'error',
    check: (graph) => {
      const nodeIds = new Set(graph.nodes.map(n => n.id));
      const errors: ValidationError[] = [];
      
      for (const edge of graph.edges) {
        if (!nodeIds.has(edge.from)) {
          errors.push({
            ruleId: 'I-3',
            message: `Edge references non-existent source node: ${edge.from}`,
            edge: `${edge.kind}:${edge.from}->${edge.to}`,
          });
        }
        if (!nodeIds.has(edge.to)) {
          errors.push({
            ruleId: 'I-3',
            message: `Edge references non-existent target node: ${edge.to}`,
            edge: `${edge.kind}:${edge.from}->${edge.to}`,
          });
        }
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings: [],
        info: [],
      };
    },
  },
  {
    id: 'I-7',
    name: 'Metadata Completeness',
    level: 'L2',
    severity: 'error',
    check: (graph) => {
      const metadata = graph.metadata;
      const requiredFields = ['industry', 'appName', 'databaseEngine', 'createdAt'];
      const missing = requiredFields.filter(field => !(field in metadata));
      
      if (missing.length > 0) {
        return {
          valid: false,
          errors: [{
            ruleId: 'I-7',
            message: `Missing required metadata fields: ${missing.join(', ')}`,
          }],
          warnings: [],
          info: [],
        };
      }
      
      return { valid: true, errors: [], warnings: [], info: [] };
    },
  },
];

// ─── Validation Functions ────────────────────────────────────────────────────

export function validateGraph(graph: z.infer<typeof ApplicationGraphSchema>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const info: ValidationInfo[] = [];
  
  // Run all validation rules
  for (const rule of VALIDATION_RULES) {
    const result = rule.check(graph);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    info.push(...result.info);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
  };
}

export function validateNode(node: z.infer<typeof GraphNodeBaseSchema>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const info: ValidationInfo[] = [];
  
  // Validate node ID
  if (!node.id || node.id.length === 0) {
    errors.push({
      ruleId: 'NODE-1',
      message: 'Node must have a non-empty ID',
      node: node.id,
    });
  }
  
  // Validate node kind
  if (!node.kind || node.kind.length === 0) {
    errors.push({
      ruleId: 'NODE-2',
      message: 'Node must have a non-empty kind',
      node: node.id,
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
  };
}

export function validateEdge(edge: z.infer<typeof GraphEdgeSchema>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const info: ValidationInfo[] = [];
  
  // Validate edge kind
  if (!edge.kind || edge.kind.length === 0) {
    errors.push({
      ruleId: 'EDGE-1',
      message: 'Edge must have a non-empty kind',
      edge: `${edge.kind}:${edge.from}->${edge.to}`,
    });
  }
  
  // Validate source and target
  if (!edge.from || edge.from.length === 0) {
    errors.push({
      ruleId: 'EDGE-2',
      message: 'Edge must have a non-empty source',
      edge: `${edge.kind}:${edge.from}->${edge.to}`,
    });
  }
  
  if (!edge.to || edge.to.length === 0) {
    errors.push({
      ruleId: 'EDGE-3',
      message: 'Edge must have a non-empty target',
      edge: `${edge.kind}:${edge.from}->${edge.to}`,
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
  };
}
