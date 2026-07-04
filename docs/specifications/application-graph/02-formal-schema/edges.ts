/**
 * Application Graph — Edge Type Definitions
 * 
 * This file defines all edge types in the Application Graph.
 * It is the canonical source of truth for edge schemas.
 * 
 * DO NOT modify this file without updating the Architecture Specification.
 */

import type { GraphNodeKind } from './nodes.js';

// ─── Base Types ──────────────────────────────────────────────────────────────

export interface GraphEdge {
  kind: EdgeKind;
  from: string;
  to: string;
  label?: string;
  weight?: number;
  metadata?: Record<string, unknown>;
}

export type EdgeKind =
  // Ownership Edges
  | 'has_table'
  | 'has_endpoint'
  | 'has_workflow'
  | 'has_page'
  | 'has_component'
  | 'has_field'
  | 'has_step'
  | 'has_feature'
  | 'has_requirement'
  | 'has_group'
  // Relation Edges
  | 'entity_relation'
  | 'value_object_of'
  | 'enum_used_by'
  // Dependency Edges
  | 'endpoint_for_entity'
  | 'workflow_uses_entity'
  | 'page_uses_entity'
  | 'feature_requires_entity'
  | 'component_uses_entity'
  | 'service_consumes'
  // Flow Edges
  | 'workflow_step'
  | 'step_triggers_event'
  | 'event_consumed_by'
  // Navigation Edges
  | 'nav_item_page'
  | 'nav_group_item'
  // UI Edges
  | 'page_has_layout'
  | 'layout_has_component'
  | 'component_renders_entity'
  // Capability Edges
  | 'capability_has_feature'
  | 'feature_has_requirement'
  // Metadata Edges
  | 'entity_has_token'
  | 'page_has_theme'
  | 'entity_has_i18n';

// ─── Edge Constraints ────────────────────────────────────────────────────────

export interface EdgeConstraint {
  kind: EdgeKind;
  source: GraphNodeKind[];
  target: GraphNodeKind[];
  label?: string;
  required: boolean;
  unique: boolean;
  maxWeight?: number;
  minWeight?: number;
}

// ─── Ownership Edges ─────────────────────────────────────────────────────────

export const OWNERSHIP_EDGES: EdgeConstraint[] = [
  {
    kind: 'has_table',
    source: ['entity'],
    target: ['table'],
    label: 'has',
    required: false,
    unique: true,
  },
  {
    kind: 'has_endpoint',
    source: ['entity'],
    target: ['endpoint'],
    label: 'has',
    required: false,
    unique: false,
  },
  {
    kind: 'has_workflow',
    source: ['entity'],
    target: ['workflow'],
    label: 'has',
    required: false,
    unique: false,
  },
  {
    kind: 'has_page',
    source: ['page'],
    target: ['section'],
    label: 'contains',
    required: false,
    unique: false,
  },
  {
    kind: 'has_component',
    source: ['section'],
    target: ['component'],
    label: 'contains',
    required: false,
    unique: false,
  },
  {
    kind: 'has_field',
    source: ['endpoint'],
    target: ['field'],
    label: 'has',
    required: false,
    unique: false,
  },
  {
    kind: 'has_step',
    source: ['workflow'],
    target: ['step'],
    label: 'contains',
    required: false,
    unique: false,
  },
  {
    kind: 'has_feature',
    source: ['capability'],
    target: ['feature'],
    label: 'contains',
    required: false,
    unique: false,
  },
  {
    kind: 'has_requirement',
    source: ['feature'],
    target: ['requirement'],
    label: 'has',
    required: false,
    unique: false,
  },
  {
    kind: 'has_group',
    source: ['nav-item'],
    target: ['nav-group'],
    label: 'belongs to',
    required: false,
    unique: true,
  },
];

// ─── Relation Edges ──────────────────────────────────────────────────────────

export const RELATION_EDGES: EdgeConstraint[] = [
  {
    kind: 'entity_relation',
    source: ['entity'],
    target: ['entity'],
    label: 'relation type',
    required: false,
    unique: false,
  },
  {
    kind: 'value_object_of',
    source: ['value-object'],
    target: ['entity'],
    label: 'belongs to',
    required: false,
    unique: false,
  },
  {
    kind: 'enum_used_by',
    source: ['enum'],
    target: ['entity'],
    label: 'used by',
    required: false,
    unique: false,
  },
];

// ─── Dependency Edges ────────────────────────────────────────────────────────

export const DEPENDENCY_EDGES: EdgeConstraint[] = [
  {
    kind: 'endpoint_for_entity',
    source: ['endpoint'],
    target: ['entity'],
    label: 'operates on',
    required: false,
    unique: false,
  },
  {
    kind: 'workflow_uses_entity',
    source: ['workflow'],
    target: ['entity'],
    label: 'uses',
    required: false,
    unique: false,
  },
  {
    kind: 'page_uses_entity',
    source: ['page'],
    target: ['entity'],
    label: 'displays',
    required: false,
    unique: false,
  },
  {
    kind: 'feature_requires_entity',
    source: ['feature'],
    target: ['entity'],
    label: 'requires',
    required: false,
    unique: false,
  },
  {
    kind: 'component_uses_entity',
    source: ['component'],
    target: ['entity'],
    label: 'renders',
    required: false,
    unique: false,
  },
  {
    kind: 'service_consumes',
    source: ['entity'],
    target: ['service'],
    label: 'consumed from',
    required: false,
    unique: false,
  },
];

// ─── Flow Edges ──────────────────────────────────────────────────────────────

export const FLOW_EDGES: EdgeConstraint[] = [
  {
    kind: 'workflow_step',
    source: ['workflow'],
    target: ['step'],
    label: 'contains',
    required: false,
    unique: false,
  },
  {
    kind: 'step_triggers_event',
    source: ['step'],
    target: ['event'],
    label: 'triggers',
    required: false,
    unique: false,
  },
  {
    kind: 'event_consumed_by',
    source: ['event'],
    target: ['workflow'],
    label: 'consumed by',
    required: false,
    unique: false,
  },
];

// ─── Navigation Edges ────────────────────────────────────────────────────────

export const NAVIGATION_EDGES: EdgeConstraint[] = [
  {
    kind: 'nav_item_page',
    source: ['nav-item'],
    target: ['page'],
    label: 'links to',
    required: false,
    unique: false,
  },
  {
    kind: 'nav_group_item',
    source: ['nav-group'],
    target: ['nav-item'],
    label: 'contains',
    required: false,
    unique: false,
  },
];

// ─── UI Edges ────────────────────────────────────────────────────────────────

export const UI_EDGES: EdgeConstraint[] = [
  {
    kind: 'page_has_layout',
    source: ['page'],
    target: ['layout'],
    label: 'uses',
    required: false,
    unique: true,
  },
  {
    kind: 'layout_has_component',
    source: ['layout'],
    target: ['component'],
    label: 'contains',
    required: false,
    unique: false,
  },
  {
    kind: 'component_renders_entity',
    source: ['component'],
    target: ['entity'],
    label: 'renders',
    required: false,
    unique: false,
  },
];

// ─── Capability Edges ────────────────────────────────────────────────────────

export const CAPABILITY_EDGES: EdgeConstraint[] = [
  {
    kind: 'capability_has_feature',
    source: ['capability'],
    target: ['feature'],
    label: 'contains',
    required: false,
    unique: false,
  },
  {
    kind: 'feature_has_requirement',
    source: ['feature'],
    target: ['requirement'],
    label: 'has',
    required: false,
    unique: false,
  },
];

// ─── Metadata Edges ──────────────────────────────────────────────────────────

export const METADATA_EDGES: EdgeConstraint[] = [
  {
    kind: 'entity_has_token',
    source: ['entity'],
    target: ['design-token'],
    label: 'has',
    required: false,
    unique: false,
  },
  {
    kind: 'page_has_theme',
    source: ['page'],
    target: ['theme'],
    label: 'uses',
    required: false,
    unique: false,
  },
  {
    kind: 'entity_has_i18n',
    source: ['entity'],
    target: ['i18n-key'],
    label: 'has',
    required: false,
    unique: false,
  },
];

// ─── All Edge Constraints ────────────────────────────────────────────────────

export const ALL_EDGE_CONSTRAINTS: EdgeConstraint[] = [
  ...OWNERSHIP_EDGES,
  ...RELATION_EDGES,
  ...DEPENDENCY_EDGES,
  ...FLOW_EDGES,
  ...NAVIGATION_EDGES,
  ...UI_EDGES,
  ...CAPABILITY_EDGES,
  ...METADATA_EDGES,
];

// ─── Edge Constraint Lookup ──────────────────────────────────────────────────

export function getEdgeConstraint(kind: EdgeKind): EdgeConstraint | undefined {
  return ALL_EDGE_CONSTRAINTS.find(c => c.kind === kind);
}

export function getEdgesForSource(sourceKind: GraphNodeKind): EdgeConstraint[] {
  return ALL_EDGE_CONSTRAINTS.filter(c => c.source.includes(sourceKind));
}

export function getEdgesForTarget(targetKind: GraphNodeKind): EdgeConstraint[] {
  return ALL_EDGE_CONSTRAINTS.filter(c => c.target.includes(targetKind));
}

export function isValidEdge(
  kind: EdgeKind,
  sourceKind: GraphNodeKind,
  targetKind: GraphNodeKind
): boolean {
  const constraint = getEdgeConstraint(kind);
  if (!constraint) return false;
  return constraint.source.includes(sourceKind) && constraint.target.includes(targetKind);
}
