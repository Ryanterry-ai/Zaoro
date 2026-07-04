# Application Graph — Developer Guide

**Version**: 1.0.0-draft  
**Status**: Draft  
**Last Updated**: 2026-07-04

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Working with Nodes](#2-working-with-nodes)
3. [Working with Edges](#3-working-with-edges)
4. [Building Graphs](#4-building-graphs)
5. [Querying Graphs](#5-querying-graphs)
6. [Validating Graphs](#6-validating-graphs)
7. [Serializing Graphs](#7-serializing-graphs)
8. [Common Patterns](#8-common-patterns)
9. [Migration Guide](#9-migration-guide)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Getting Started

### 1.1 Installation

The Application Graph schemas are defined in `docs/specifications/application-graph/02-formal-schema/`. Import them in your code:

```typescript
import type { 
  ApplicationGraph, 
  GraphNode, 
  GraphEdge,
  EntityNode,
  TableNode 
} from '../docs/specifications/application-graph/02-formal-schema/nodes';

import { 
  ApplicationGraphSchema,
  validateGraph 
} from '../docs/specifications/application-graph/02-formal-schema/validation';
```

### 1.2 Core Concepts

#### The Application Graph (AG)

The AG is the **canonical intermediate representation** of your application. It's:

- **Immutable**: Once built, never modified
- **Validated**: Invariants enforced at construction
- **Serializable**: Complete state capture
- **Queryable**: Efficient access patterns

#### Nodes

Nodes represent concepts in your application:

- **Domain**: `entity`, `value-object`, `enum`
- **Storage**: `table`, `index`, `view`
- **API**: `endpoint`, `field`, `auth-rule`
- **Process**: `workflow`, `step`, `event`
- **UI**: `page`, `component`, `section`, `layout`
- **Navigation**: `nav-item`, `nav-group`
- **Capability**: `capability`, `feature`, `requirement`
- **Infrastructure**: `service`, `queue`, `cache`
- **Metadata**: `design-token`, `theme`, `i18n-key`

#### Edges

Edges represent relationships between nodes:

- **Ownership**: `has_table`, `has_endpoint`, `has_workflow`
- **Relation**: `entity_relation`, `value_object_of`
- **Dependency**: `endpoint_for_entity`, `page_uses_entity`
- **Flow**: `workflow_step`, `step_triggers_event`
- **Navigation**: `nav_item_page`, `nav_group_item`
- **UI**: `page_has_layout`, `layout_has_component`
- **Capability**: `capability_has_feature`, `feature_has_requirement`
- **Metadata**: `entity_has_token`, `page_has_theme`

---

## 2. Working with Nodes

### 2.1 Creating Nodes

Every node has a `kind`, `id`, and `data`:

```typescript
// Entity node
const userEntity: EntityNode = {
  kind: 'entity',
  id: 'entity:User',
  data: {
    name: 'User',
    slug: 'user',
    fields: [
      { name: 'id', type: 'string', required: true, indexed: true, unique: true },
      { name: 'email', type: 'string', required: true, indexed: true, unique: true },
      { name: 'name', type: 'string', required: true, indexed: false, unique: false },
    ],
    workflows: ['user-registration', 'password-reset'],
    capabilities: ['authentication', 'user-management'],
    isVirtual: false,
  },
};

// Table node
const userTable: TableNode = {
  kind: 'table',
  id: 'table:users',
  data: {
    name: 'users',
    columns: [
      { name: 'id', type: 'string', required: true, indexed: true, unique: true },
      { name: 'email', type: 'string', required: true, indexed: true, unique: true },
      { name: 'name', type: 'string', required: true, indexed: false, unique: false },
      { name: 'created_at', type: 'date', required: true, indexed: true, unique: false },
    ],
    indexes: [
      { name: 'idx_users_email', columns: ['email'], unique: true, type: 'btree' },
    ],
    foreignKeys: [],
    engine: 'postgres',
  },
};
```

### 2.2 Node ID Conventions

Node IDs follow a `kind:name` pattern:

| Kind | ID Pattern | Example |
|------|------------|---------|
| entity | `entity:PascalCase` | `entity:User` |
| table | `table:snake_case` | `table:users` |
| endpoint | `endpoint:METHOD:/path` | `endpoint:GET:/api/users` |
| workflow | `workflow:PascalCase` | `workflow:UserRegistration` |
| page | `page:/path` | `page:/users` |
| component | `component:PascalCase` | `component:UserProfile` |
| capability | `capability:kebab-case` | `capability:user-management` |
| feature | `feature:kebab-case` | `feature:password-reset` |
| requirement | `requirement:REQ-NNN` | `requirement:REQ-001` |

### 2.3 Node Data Shapes

Each node kind has a specific data shape. See `02-formal-schema/nodes.ts` for the complete definitions.

---

## 3. Working with Edges

### 3.1 Creating Edges

Edges connect nodes with a `kind`, `from`, and `to`:

```typescript
// Entity has a table
const hasTableEdge: GraphEdge = {
  kind: 'has_table',
  from: 'entity:User',
  to: 'table:users',
  label: 'has',
};

// Entity has an endpoint
const hasEndpointEdge: GraphEdge = {
  kind: 'has_endpoint',
  from: 'entity:User',
  to: 'endpoint:GET:/api/users',
  label: 'has',
};

// Entity relation
const entityRelationEdge: GraphEdge = {
  kind: 'entity_relation',
  from: 'entity:User',
  to: 'entity:Order',
  label: 'has_many',
};
```

### 3.2 Edge Constraints

Each edge kind has constraints on what source and target node kinds are allowed:

```typescript
import { isValidEdge } from '../docs/specifications/application-graph/02-formal-schema/edges';

// This is valid
isValidEdge('has_table', 'entity', 'table'); // true

// This is invalid
isValidEdge('has_table', 'table', 'entity'); // false
```

### 3.3 Edge Weights

Edges can have optional weights (0-1) for priority or strength:

```typescript
const weightedEdge: GraphEdge = {
  kind: 'entity_relation',
  from: 'entity:User',
  to: 'entity:Order',
  label: 'has_many',
  weight: 0.8, // Strong relationship
};
```

---

## 4. Building Graphs

### 4.1 Manual Construction

Build a graph by creating nodes and edges:

```typescript
import { createApplicationGraph } from '../docs/specifications/application-graph/02-formal-schema/graph';

const graph = createApplicationGraph(
  {
    industry: 'ecommerce',
    appName: 'MyStore',
    databaseEngine: 'postgres',
    businessModels: ['b2c'],
    compliancePacks: [],
  },
  [userEntity, userTable, userEndpoint],
  [hasTableEdge, hasEndpointEdge]
);
```

### 4.2 Builder Pattern

Use the builder for complex graphs:

```typescript
import { GraphBuilder } from '../docs/specifications/application-graph/02-formal-schema/graph';

const graph = new GraphBuilder()
  .addNode(userEntity)
  .addNode(userTable)
  .addNode(userEndpoint)
  .addEdge(hasTableEdge)
  .addEdge(hasEndpointEdge)
  .build();
```

### 4.3 Pipeline Integration

The planning pipeline builds the AG automatically:

```typescript
// In your compiler pass
async function pass2PipelineV2(input: PassInput): Promise<PassOutput> {
  const { context, blueprint } = input;
  
  // Build sub-graphs
  const entityGraph = buildEntityGraph(blueprint);
  const databaseGraph = buildDatabaseGraph(blueprint);
  const apiGraph = buildAPIGraph(blueprint);
  
  // Merge into ApplicationGraph
  const applicationGraph = buildApplicationGraph({
    entities: entityGraph.entities,
    entityRelations: entityGraph.relationships,
    tables: databaseGraph.tables,
    endpoints: apiGraph.endpoints,
    // ... other data
  });
  
  return { applicationGraph };
}
```

---

## 5. Querying Graphs

### 5.1 Node Queries

```typescript
// Get all entities
const entities = graph.getNodesByKind('entity');

// Get a specific node
const userNode = graph.getNode('entity:User');

// Get nodes by property
const virtualEntities = graph.getNodesByProperty('kind', 'entity')
  .filter(n => n.data.isVirtual);
```

### 5.2 Edge Queries

```typescript
// Get all edges from a node
const userEdges = graph.getEdgesFrom('entity:User');

// Get all edges to a node
const orderEdges = graph.getEdgesTo('entity:Order');

// Get edges by kind
const hasTableEdges = graph.getEdgesByKind('has_table');
```

### 5.3 Relationship Queries

```typescript
// Get related nodes
const userTables = graph.getRelatedNodes('entity:User', 'has_table');

// Get related edges
const userEndpoints = graph.getRelatedEdges('entity:User', 'has_endpoint');
```

### 5.4 Path Queries

```typescript
// Find path between nodes
const path = graph.findPath('entity:User', 'page:/users');

// Find shortest path
const shortestPath = graph.findShortestPath('entity:User', 'entity:Order');
```

### 5.5 Subgraph Queries

```typescript
// Get subgraph with specific nodes
const userSubgraph = graph.getSubgraph([
  'entity:User',
  'table:users',
  'endpoint:GET:/api/users',
]);

// Get subgraph by node kind
const entitiesSubgraph = graph.getSubgraphByKind('entity');
```

### 5.6 Statistics

```typescript
const stats = graph.getStats();
console.log(`Entities: ${stats.entityCount}`);
console.log(`Tables: ${stats.tableCount}`);
console.log(`Endpoints: ${stats.endpointCount}`);
```

---

## 6. Validating Graphs

### 6.1 Basic Validation

```typescript
import { validateGraph } from '../docs/specifications/application-graph/02-formal-schema/validation';

const result = validateGraph(graph);

if (!result.valid) {
  console.error('Validation errors:');
  for (const error of result.errors) {
    console.error(`  ${error.ruleId}: ${error.message}`);
  }
}
```

### 6.2 Custom Validation Rules

```typescript
import { ValidationRule } from '../docs/specifications/application-graph/02-formal-schema/validation';

const customRule: ValidationRule = {
  id: 'CUSTOM-1',
  name: 'Entity must have at least one endpoint',
  level: 'L2',
  severity: 'warning',
  check: (graph) => {
    const entities = graph.nodes.filter(n => n.kind === 'entity');
    const warnings: ValidationWarning[] = [];
    
    for (const entity of entities) {
      const hasEndpoint = graph.edges.some(
        e => e.kind === 'has_endpoint' && e.from === entity.id
      );
      
      if (!hasEndpoint) {
        warnings.push({
          ruleId: 'CUSTOM-1',
          message: `Entity ${entity.id} has no endpoints`,
          node: entity.id,
        });
      }
    }
    
    return {
      valid: true,
      errors: [],
      warnings,
      info: [],
    };
  },
};
```

---

## 7. Serializing Graphs

### 7.1 JSON Serialization

```typescript
import { GraphSerializer } from '../docs/specifications/application-graph/02-formal-schema/graph';

const serializer = new GraphSerializer();

// Serialize to JSON
const serialized = serializer.serialize(graph, 'json');
console.log(serialized.data); // JSON string

// Deserialize from JSON
const deserialized = serializer.deserialize(serialized);
```

### 7.2 File Storage

```typescript
import * as fs from 'fs';

// Save graph
const serialized = serializer.serialize(graph, 'json');
fs.writeFileSync('graph.ag.json', serialized.data);

// Load graph
const data = fs.readFileSync('graph.ag.json', 'utf-8');
const graph = serializer.deserialize({
  format: 'json',
  version: '1.0.0',
  checksum: '',
  size: data.length,
  data,
  metadata: {
    serializedAt: new Date().toISOString(),
    serializer: 'graph-spec-1.0.0',
  },
});
```

---

## 8. Common Patterns

### 8.1 Entity-Table Pattern

Every entity should have a corresponding table:

```typescript
// Create entity
const userEntity: EntityNode = {
  kind: 'entity',
  id: 'entity:User',
  data: { /* ... */ },
};

// Create table
const userTable: TableNode = {
  kind: 'table',
  id: 'table:users',
  data: { /* ... */ },
};

// Link them
const hasTableEdge: GraphEdge = {
  kind: 'has_table',
  from: 'entity:User',
  to: 'table:users',
};
```

### 8.2 Endpoint-Entity Pattern

Every endpoint should operate on an entity:

```typescript
// Create endpoint
const getUserEndpoint: EndpointNode = {
  kind: 'endpoint',
  id: 'endpoint:GET:/api/users/:id',
  data: {
    method: 'GET',
    path: '/api/users/:id',
    auth: true,
    entity: 'User',
  },
};

// Link to entity
const endpointForEntityEdge: GraphEdge = {
  kind: 'endpoint_for_entity',
  from: 'endpoint:GET:/api/users/:id',
  to: 'entity:User',
};
```

### 8.3 Page-Entity Pattern

Every page should display entities:

```typescript
// Create page
const userPage: PageNode = {
  kind: 'page',
  id: 'page:/users',
  data: {
    path: '/users',
    name: 'Users',
    type: 'listing',
    entities: ['User'],
    sections: ['user-list'],
    workflows: [],
    auth: true,
  },
};

// Link to entity
const pageUsesEntityEdge: GraphEdge = {
  kind: 'page_uses_entity',
  from: 'page:/users',
  to: 'entity:User',
};
```

### 8.4 Workflow-Entity Pattern

Every workflow should use entities:

```typescript
// Create workflow
const userRegistrationWorkflow: WorkflowNode = {
  kind: 'workflow',
  id: 'workflow:UserRegistration',
  data: {
    name: 'UserRegistration',
    trigger: 'POST /api/users',
    steps: [
      { name: 'validate', action: 'validateUser', entity: 'User' },
      { name: 'create', action: 'createUser', entity: 'User' },
      { name: 'sendEmail', action: 'sendWelcomeEmail' },
    ],
    entities: ['User'],
  },
};

// Link to entity
const workflowUsesEntityEdge: GraphEdge = {
  kind: 'workflow_uses_entity',
  from: 'workflow:UserRegistration',
  to: 'entity:User',
};
```

---

## 9. Migration Guide

### 9.1 Migrating from Current Implementation

The current implementation uses a simplified graph with 9 node kinds and 11 edge kinds. To migrate:

1. **Map existing nodes** to new node kinds
2. **Map existing edges** to new edge kinds
3. **Add missing fields** to node data
4. **Update validation** to use new rules

### 9.2 Backward Compatibility

The new specification maintains backward compatibility:

- All existing node kinds remain valid
- All existing edge kinds remain valid
- New fields are optional
- Old code continues to work with new graphs

### 9.3 Forward Compatibility

New code should:

- Ignore unknown node kinds
- Ignore unknown edge kinds
- Skip unknown fields
- Log warnings for unrecognized data

---

## 10. Troubleshooting

### 10.1 Common Errors

#### "Node not found" Error

This means an edge references a node that doesn't exist.

**Solution**: Check that all node IDs in edges match existing node IDs.

#### "Invalid edge kind" Error

This means an edge kind is not allowed for the given source/target node kinds.

**Solution**: Check the edge constraints in `02-formal-schema/edges.ts`.

#### "Missing required metadata" Error

This means the graph is missing required metadata fields.

**Solution**: Ensure the graph has `industry`, `appName`, `databaseEngine`, and `createdAt`.

### 10.2 Debugging Tips

1. **Validate early**: Run validation after constructing the graph
2. **Check invariants**: Ensure all invariants hold
3. **Use stats**: Check `getStats()` to understand graph composition
4. **Serialize and inspect**: Save the graph to JSON and examine it

### 10.3 Getting Help

- Read the [Architecture Specification](01-architecture-spec.md)
- Check the [Formal Schemas](02-formal-schema/)
- Review the [Extension Specification](05-extension-spec.md)

---

**End of Developer Guide**
