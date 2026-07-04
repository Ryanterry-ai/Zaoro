/**
 * Application Graph — Root Type Definition
 * 
 * This file defines the root ApplicationGraph type.
 * It is the canonical source of truth for the graph structure.
 * 
 * DO NOT modify this file without updating the Architecture Specification.
 */

import type { GraphNode, GraphNodeKind } from './nodes.js';
import type { GraphEdge, EdgeKind } from './edges.js';

// ─── Graph Metadata ──────────────────────────────────────────────────────────

export interface AGMetadata {
  industry: string;
  subIndustry?: string;
  appName: string;
  databaseEngine: string;
  country?: string;
  businessModels: string[];
  compliancePacks: string[];
  audience?: string;
  description?: string;
}

// ─── Application Graph ───────────────────────────────────────────────────────

export interface ApplicationGraph {
  version: string;
  id: string;
  metadata: AGMetadata;
  nodes: GraphNode[];
  edges: GraphEdge[];
  createdAt: string;
  updatedAt: string;
}

// ─── Graph Statistics ────────────────────────────────────────────────────────

export interface AppGraphStats {
  nodes: number;
  edges: number;
  byKind: Record<GraphNodeKind, number>;
  edgesByKind: Record<EdgeKind, number>;
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

// ─── Graph Version ───────────────────────────────────────────────────────────

export interface GraphVersion {
  version: string;
  previousVersion: string;
  changes: GraphChange[];
  timestamp: string;
  reason: string;
}

export interface GraphChange {
  type: 'add' | 'remove' | 'replace';
  target: 'node' | 'edge';
  id: string;
  before?: unknown;
  after?: unknown;
}

// ─── Graph Diff ──────────────────────────────────────────────────────────────

export interface GraphDiff {
  added: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  removed: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  modified: {
    nodes: Array<{
      id: string;
      before: GraphNode;
      after: GraphNode;
    }>;
    edges: Array<{
      kind: EdgeKind;
      from: string;
      to: string;
      before: GraphEdge;
      after: GraphEdge;
    }>;
  };
}

// ─── Graph Query Interface ───────────────────────────────────────────────────

export interface GraphQuery {
  // Node queries
  getNode(id: string): GraphNode | undefined;
  getNodesByKind(kind: GraphNodeKind): GraphNode[];
  getNodesByProperty<K extends keyof GraphNode>(
    property: K,
    value: GraphNode[K]
  ): GraphNode[];
  
  // Edge queries
  getEdgesFrom(nodeId: string): GraphEdge[];
  getEdgesTo(nodeId: string): GraphEdge[];
  getEdgesByKind(kind: EdgeKind): GraphEdge[];
  
  // Relationship queries
  getRelatedNodes(nodeId: string, edgeKind?: EdgeKind): GraphNode[];
  getRelatedEdges(nodeId: string, edgeKind?: EdgeKind): GraphEdge[];
  
  // Path queries
  findPath(from: string, to: string): GraphEdge[];
  findShortestPath(from: string, to: string): GraphEdge[];
  
  // Subgraph queries
  getSubgraph(nodeIds: string[]): ApplicationGraph;
  getSubgraphByKind(kind: GraphNodeKind): ApplicationGraph;
  
  // Statistics
  getStats(): AppGraphStats;
}

// ─── Graph Builder ───────────────────────────────────────────────────────────

export interface GraphBuilder {
  // Add nodes
  addNode(node: GraphNode): GraphBuilder;
  addNodes(nodes: GraphNode[]): GraphBuilder;
  
  // Add edges
  addEdge(edge: GraphEdge): GraphBuilder;
  addEdges(edges: GraphEdge[]): GraphBuilder;
  
  // Build
  build(): ApplicationGraph;
}

// ─── Graph Validator ─────────────────────────────────────────────────────────

export interface GraphValidator {
  // Validate graph
  validate(graph: ApplicationGraph): ValidationResult;
  
  // Validate specific invariants
  validateInvariants(graph: ApplicationGraph): ValidationResult;
  validateStructural(graph: ApplicationGraph): ValidationResult;
  validateSemantic(graph: ApplicationGraph): ValidationResult;
  validateBusiness(graph: ApplicationGraph): ValidationResult;
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
  severity: 'error';
  node?: string;
  edge?: string;
  context?: Record<string, unknown>;
}

export interface ValidationWarning {
  ruleId: string;
  message: string;
  severity: 'warning';
  node?: string;
  edge?: string;
  context?: Record<string, unknown>;
}

export interface ValidationInfo {
  ruleId: string;
  message: string;
  severity: 'info';
  node?: string;
  edge?: string;
  context?: Record<string, unknown>;
}

// ─── Graph Serializer ────────────────────────────────────────────────────────

export interface GraphSerializer {
  // Serialize
  serialize(graph: ApplicationGraph, format: SerializationFormat): SerializedGraph;
  
  // Deserialize
  deserialize(data: SerializedGraph): ApplicationGraph;
  
  // Validate serialized data
  validateSerialized(data: SerializedGraph): boolean;
}

export type SerializationFormat = 'json' | 'msgpack' | 'protobuf' | 'jsonl';

export interface SerializedGraph {
  format: SerializationFormat;
  version: string;
  checksum: string;
  size: number;
  data: string | Uint8Array;
  metadata: {
    serializedAt: string;
    serializer: string;
    compression?: string;
  };
}

// ─── Graph Store ─────────────────────────────────────────────────────────────

export interface GraphStore {
  // Save
  save(graph: ApplicationGraph): Promise<void>;
  
  // Load
  load(id: string): Promise<ApplicationGraph | null>;
  
  // List
  list(): Promise<ApplicationGraph[]>;
  
  // Delete
  delete(id: string): Promise<void>;
  
  // Version
  getVersion(id: string): Promise<string>;
  getVersions(id: string): Promise<GraphVersion[]>;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

export function createGraphId(): string {
  return `ag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createGraphMetadata(
  industry: string,
  appName: string,
  databaseEngine: string,
  options: Partial<AGMetadata> = {}
): AGMetadata {
  return {
    industry,
    appName,
    databaseEngine,
    businessModels: options.businessModels || [],
    compliancePacks: options.compliancePacks || [],
    ...options,
  };
}

export function createApplicationGraph(
  metadata: AGMetadata,
  nodes: GraphNode[] = [],
  edges: GraphEdge[] = []
): ApplicationGraph {
  const now = new Date().toISOString();
  return {
    version: '1.0.0',
    id: createGraphId(),
    metadata,
    nodes,
    edges,
    createdAt: now,
    updatedAt: now,
  };
}
