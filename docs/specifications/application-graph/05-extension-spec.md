# Application Graph — Extension Specification

**Version**: 1.0.0-draft  
**Status**: Draft  
**Last Updated**: 2026-07-04

---

## Table of Contents

1. [Extension Philosophy](#1-extension-philosophy)
2. [Adding New Node Types](#2-adding-new-node-types)
3. [Adding New Edge Types](#3-adding-new-edge-types)
4. [Backward Compatibility](#4-backward-compatibility)
5. [Forward Compatibility](#5-forward-compatibility)
6. [Versioning Extensions](#6-versioning-extensions)
7. [Testing Extensions](#7-testing-extensions)
8. [Extension Registry](#8-extension-registry)
9. [Deprecation Policy](#9-deprecation-policy)
10. [Extension Examples](#10-extension-examples)

---

## 1. Extension Philosophy

### 1.1 Core Principles

1. **Never Break Existing Code**: All extensions must be backward compatible
2. **Additive Only**: New node/edge types are additions, not modifications
3. **Optional Fields**: New fields on existing types must be optional
4. **Graceful Degradation**: Old code must ignore unknown types and fields
5. **Clear Ownership**: Every extension must have a clear owner

### 1.2 The One Rule

> **From this point onward, every new feature added to Build.same must first answer one question: "How does this affect the Application Graph?"**

If a feature cannot be represented in the Application Graph—or intentionally remains outside it as infrastructure—it should not be added until its relationship to the AG is understood.

### 1.3 Extension Types

| Type | Description | Impact |
|------|-------------|--------|
| **Node Kind** | New concept in the graph | Low - additive |
| **Edge Kind** | New relationship type | Low - additive |
| **Node Field** | New field on existing node | Low - additive if optional |
| **Edge Field** | New field on existing edge | Low - additive if optional |
| **Validation Rule** | New invariant or constraint | Medium - may break existing graphs |
| **Compiler Pass** | New transformation step | Low - additive |
| **Serializer Format** | New serialization format | Low - additive |

---

## 2. Adding New Node Types

### 2.1 Step-by-Step Process

#### Step 1: Define the Node Data Interface

```typescript
// In 02-formal-schema/nodes.ts
export interface NewNodeData {
  name: string;           // Required: PascalCase name
  description?: string;   // Optional: Description
  // ... other fields
}
```

#### Step 2: Add to GraphNode Union

```typescript
// In 02-formal-schema/nodes.ts
export type GraphNodeKind =
  | 'entity'
  | 'table'
  // ... existing kinds
  | 'new-kind';  // Add new kind

export interface NewNode extends GraphNodeBase {
  kind: 'new-kind';
  data: NewNodeData;
}

export type GraphNode =
  | EntityNode
  | TableNode
  // ... existing types
  | NewNode;  // Add new type
```

#### Step 3: Define Edge Constraints

```typescript
// In 02-formal-schema/edges.ts
export const NEW_NODE_EDGES: EdgeConstraint[] = [
  {
    kind: 'has_new_kind',
    source: ['entity'],  // Which node kinds can have this edge
    target: ['new-kind'],  // Which node kinds can be the target
    label: 'has',
    required: false,
    unique: false,
  },
];
```

#### Step 4: Add Zod Schema

```typescript
// In 02-formal-schema/validation.ts
export const NewNodeDataSchema = z.object({
  name: z.string().min(1).regex(/^[A-Z][a-zA-Z0-9]*$/),
  description: z.string().optional(),
  // ... other fields
});
```

#### Step 5: Update Compiler Pass Contracts

```typescript
// In 04-compiler-contract.md
const pass2: CompilerPassContract = {
  // ... existing contract
  writes: {
    nodeKinds: [
      // ... existing kinds
      'new-kind',  // Add new kind
    ],
    // ...
  },
};
```

#### Step 6: Add Validation Rules

```typescript
// In 02-formal-schema/validation.ts
export const NEW_NODE_VALIDATION: ValidationRule[] = [
  {
    id: 'NEW-1',
    name: 'New node must have name',
    level: 'L2',
    severity: 'error',
    check: (graph) => {
      // ... validation logic
    },
  },
];
```

#### Step 7: Update Documentation

- Update `01-architecture-spec.md` node taxonomy
- Update `03-developer-guide.md` examples
- Update `README.md` summary

#### Step 8: Create ADR

Create `06-adr/006-new-kind-extension.md` documenting the decision.

### 2.2 Example: Adding `cache` Node

```typescript
// 1. Define data interface
export interface CacheNodeData {
  name: string;
  type: 'redis' | 'memcached' | 'in-memory';
  ttl: number;
  entities: string[];
}

// 2. Add to union
export interface CacheNode extends GraphNodeBase {
  kind: 'cache';
  data: CacheNodeData;
}

// 3. Define edges
export const CACHE_EDGES: EdgeConstraint[] = [
  {
    kind: 'entity_uses_cache',
    source: ['entity'],
    target: ['cache'],
    label: 'cached by',
    required: false,
    unique: false,
  },
];

// 4. Add Zod schema
export const CacheNodeDataSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['redis', 'memcached', 'in-memory']),
  ttl: z.number().positive(),
  entities: z.array(z.string()),
});

// 5. Update pass contracts
// In pass 2 or a new infrastructure pass
writes: {
  nodeKinds: ['cache'],
  edgeKinds: ['entity_uses_cache'],
},

// 6. Add validation
export const CACHE_VALIDATION: ValidationRule[] = [
  {
    id: 'CACHE-1',
    name: 'Cache must have positive TTL',
    level: 'L2',
    severity: 'error',
    check: (graph) => {
      const caches = graph.nodes.filter(n => n.kind === 'cache');
      const errors: ValidationError[] = [];
      
      for (const cache of caches) {
        if (cache.data.ttl <= 0) {
          errors.push({
            ruleId: 'CACHE-1',
            message: `Cache ${cache.id} must have positive TTL`,
            node: cache.id,
          });
        }
      }
      
      return { valid: errors.length === 0, errors, warnings: [], info: [] };
    },
  },
];
```

---

## 3. Adding New Edge Types

### 3.1 Step-by-Step Process

#### Step 1: Define the Edge Kind

```typescript
// In 02-formal-schema/edges.ts
export type EdgeKind =
  | 'has_table'
  | 'has_endpoint'
  // ... existing kinds
  | 'new_edge_kind';  // Add new kind
```

#### Step 2: Define Source/Target Constraints

```typescript
// In 02-formal-schema/edges.ts
export const NEW_EDGE_CONSTRAINTS: EdgeConstraint[] = [
  {
    kind: 'new_edge_kind',
    source: ['entity', 'table'],  // Allowed source node kinds
    target: ['endpoint', 'workflow'],  // Allowed target node kinds
    label: 'connects to',
    required: false,
    unique: false,
  },
];
```

#### Step 3: Update Compiler Pass Contracts

```typescript
// In 04-compiler-contract.md
const pass2: CompilerPassContract = {
  // ... existing contract
  writes: {
    edgeKinds: [
      // ... existing kinds
      'new_edge_kind',  // Add new kind
    ],
    // ...
  },
};
```

#### Step 4: Add Validation Rules

```typescript
// In 02-formal-schema/validation.ts
export const NEW_EDGE_VALIDATION: ValidationRule[] = [
  {
    id: 'EDGE-NEW-1',
    name: 'New edge kind must connect valid source/target',
    level: 'L1',
    severity: 'error',
    check: (graph) => {
      const edges = graph.edges.filter(e => e.kind === 'new_edge_kind');
      const errors: ValidationError[] = [];
      
      for (const edge of edges) {
        if (!isValidEdge('new_edge_kind', edge.from, edge.to)) {
          errors.push({
            ruleId: 'EDGE-NEW-1',
            message: `Edge ${edge.kind} connects invalid source/target`,
            edge: `${edge.kind}:${edge.from}->${edge.to}`,
          });
        }
      }
      
      return { valid: errors.length === 0, errors, warnings: [], info: [] };
    },
  },
];
```

### 3.2 Example: Adding `entity_uses_cache` Edge

```typescript
// 1. Define edge kind
export type EdgeKind =
  | 'has_table'
  // ... existing kinds
  | 'entity_uses_cache';

// 2. Define constraints
export const ENTITY_USES_CACHE_EDGE: EdgeConstraint = {
  kind: 'entity_uses_cache',
  source: ['entity'],
  target: ['cache'],
  label: 'cached by',
  required: false,
  unique: false,
};

// 3. Update pass contracts
writes: {
  edgeKinds: ['entity_uses_cache'],
},

// 4. Add validation
export const ENTITY_USES_CACHE_VALIDATION: ValidationRule[] = [
  {
    id: 'EDGE-CACHE-1',
    name: 'entity_uses_cache must connect entity to cache',
    level: 'L1',
    severity: 'error',
    check: (graph) => {
      const edges = graph.edges.filter(e => e.kind === 'entity_uses_cache');
      const errors: ValidationError[] = [];
      
      for (const edge of edges) {
        const source = graph.nodes.find(n => n.id === edge.from);
        const target = graph.nodes.find(n => n.id === edge.to);
        
        if (!source || source.kind !== 'entity') {
          errors.push({
            ruleId: 'EDGE-CACHE-1',
            message: `entity_uses_cache source must be entity`,
            edge: `${edge.kind}:${edge.from}->${edge.to}`,
          });
        }
        
        if (!target || target.kind !== 'cache') {
          errors.push({
            ruleId: 'EDGE-CACHE-1',
            message: `entity_uses_cache target must be cache`,
            edge: `${edge.kind}:${edge.from}->${edge.to}`,
          });
        }
      }
      
      return { valid: errors.length === 0, errors, warnings: [], info: [] };
    },
  },
];
```

---

## 4. Backward Compatibility

### 4.1 Compatibility Guarantees

1. **Old Code + New Graphs**: Old code must work with new graphs
2. **New Code + Old Graphs**: New code must work with old graphs
3. **Unknown Types**: Code must ignore unknown node/edge kinds
4. **Unknown Fields**: Code must skip unknown fields

### 4.2 Implementation

```typescript
// Old code that doesn't know about new node kinds
function processNodes(graph: ApplicationGraph) {
  for (const node of graph.nodes) {
    switch (node.kind) {
      case 'entity':
        // Handle entity
        break;
      case 'table':
        // Handle table
        break;
      // ... other known kinds
      default:
        // Ignore unknown kinds
        console.warn(`Unknown node kind: ${node.kind}`);
        break;
    }
  }
}
```

### 4.3 Testing Compatibility

```typescript
describe('Backward Compatibility', () => {
  it('should handle old graphs with new code', () => {
    const oldGraph = createOldGraph();
    const newCode = new NewCode();
    
    // Should not throw
    expect(() => newCode.process(oldGraph)).not.toThrow();
  });
  
  it('should handle new graphs with old code', () => {
    const newGraph = createNewGraph();
    const oldCode = new OldCode();
    
    // Should not throw
    expect(() => oldCode.process(newGraph)).not.toThrow();
  });
});
```

---

## 5. Forward Compatibility

### 5.1 Forward Compatibility Rules

1. **Ignore Unknown Kinds**: Don't fail on unknown node/edge kinds
2. **Skip Unknown Fields**: Don't fail on unknown fields
3. **Log Warnings**: Log warnings for unrecognized data
4. **Continue Processing**: Continue processing known data

### 5.2 Implementation

```typescript
// New code that handles unknown kinds gracefully
function processNodes(graph: ApplicationGraph) {
  for (const node of graph.nodes) {
    switch (node.kind) {
      case 'entity':
        // Handle entity
        break;
      case 'table':
        // Handle table
        break;
      // ... other known kinds
      case 'new-kind':
        // Handle new kind
        break;
      default:
        // Log warning but don't fail
        console.warn(`Unknown node kind: ${node.kind}, skipping`);
        break;
    }
  }
}
```

### 5.3 Testing Forward Compatibility

```typescript
describe('Forward Compatibility', () => {
  it('should handle new graphs with old code', () => {
    const newGraph = createGraphWithNewKinds();
    const oldCode = new OldCode();
    
    // Should not throw, but should log warnings
    expect(() => oldCode.process(newGraph)).not.toThrow();
  });
  
  it('should handle new fields gracefully', () => {
    const graphWithNewFields = createGraphWithNewFields();
    const oldCode = new OldCode();
    
    // Should not throw
    expect(() => oldCode.process(graphWithNewFields)).not.toThrow();
  });
});
```

---

## 6. Versioning Extensions

### 6.1 Version Numbering

Extensions follow semantic versioning:

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes (node/edge removal, schema changes)
MINOR: New features (new node/edge types, new fields)
PATCH: Bug fixes (validation rule corrections, serialization fixes)
```

### 6.2 Version Impact

| Change Type | Version Impact | Migration Required |
|-------------|----------------|-------------------|
| New node kind | MINOR | No |
| New edge kind | MINOR | No |
| New field on node | PATCH | No |
| Node kind removal | MAJOR | Yes |
| Edge kind removal | MAJOR | Yes |
| Schema change | MAJOR | Yes |

### 6.3 Version Migration

When a MAJOR version bump is required:

1. **Create migration script** to update old graphs
2. **Document migration steps** in `migration/`
3. **Provide compatibility layer** for transition period
4. **Set deprecation timeline** for old format

---

## 7. Testing Extensions

### 7.1 Unit Testing

```typescript
describe('New Node Kind', () => {
  it('should create valid node', () => {
    const node: NewNode = {
      kind: 'new-kind',
      id: 'new-kind:test',
      data: {
        name: 'Test',
        // ... other fields
      },
    };
    
    expect(node.kind).toBe('new-kind');
    expect(node.id).toBe('new-kind:test');
  });
  
  it('should validate node', () => {
    const node = createTestNode();
    const result = validateNode(node);
    
    expect(result.valid).toBe(true);
  });
});
```

### 7.2 Integration Testing

```typescript
describe('Extension Integration', () => {
  it('should work with existing passes', async () => {
    const graph = createGraphWithExtension();
    
    for (const pass of COMPILER_PASSES) {
      const output = await pass.execute({ graph });
      // Should not throw
    }
  });
  
  it('should maintain invariants', () => {
    const graph = createGraphWithExtension();
    const result = validateGraph(graph);
    
    expect(result.valid).toBe(true);
  });
});
```

### 7.3 Compatibility Testing

```typescript
describe('Compatibility', () => {
  it('should work with old code', () => {
    const graph = createGraphWithExtension();
    const oldCode = new OldCode();
    
    // Should not throw
    expect(() => oldCode.process(graph)).not.toThrow();
  });
  
  it('should work with new code', () => {
    const graph = createOldGraph();
    const newCode = new NewCode();
    
    // Should not throw
    expect(() => newCode.process(graph)).not.toThrow();
  });
});
```

---

## 8. Extension Registry

### 8.1 Registry Structure

```typescript
interface ExtensionRegistry {
  nodeKinds: Map<string, NodeKindExtension>;
  edgeKinds: Map<string, EdgeKindExtension>;
  validationRules: Map<string, ValidationRule>;
  compilerPasses: Map<string, CompilerPassContract>;
}

interface NodeKindExtension {
  kind: string;
  dataSchema: z.ZodSchema;
  edges: EdgeConstraint[];
  validation: ValidationRule[];
  passes: string[];  // Pass IDs that can read/write this kind
}

interface EdgeKindExtension {
  kind: string;
  source: GraphNodeKind[];
  target: GraphNodeKind[];
  validation: ValidationRule[];
  passes: string[];  // Pass IDs that can read/write this kind
}
```

### 8.2 Registry Operations

```typescript
// Register new node kind
registry.nodeKinds.set('cache', {
  kind: 'cache',
  dataSchema: CacheNodeDataSchema,
  edges: CACHE_EDGES,
  validation: CACHE_VALIDATION,
  passes: ['pass-2-infrastructure'],
});

// Register new edge kind
registry.edgeKinds.set('entity_uses_cache', {
  kind: 'entity_uses_cache',
  source: ['entity'],
  target: ['cache'],
  validation: ENTITY_USES_CACHE_VALIDATION,
  passes: ['pass-2-infrastructure'],
});
```

### 8.3 Registry Validation

```typescript
function validateRegistry(registry: ExtensionRegistry): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Check for duplicate kinds
  const nodeKindList = Array.from(registry.nodeKinds.keys());
  const edgeKindList = Array.from(registry.edgeKinds.keys());
  
  // Check for conflicts
  for (const kind of nodeKindList) {
    if (edgeKindList.includes(kind)) {
      errors.push({
        ruleId: 'REGISTRY-1',
        message: `Duplicate kind: ${kind} is both a node and edge kind`,
      });
    }
  }
  
  return { valid: errors.length === 0, errors, warnings, info: [] };
}
```

---

## 9. Deprecation Policy

### 9.1 Deprecation Process

1. **Mark as Deprecated**: Add deprecation notice to documentation
2. **Log Warnings**: Log warnings when deprecated features are used
3. **Provide Alternatives**: Document alternative approaches
4. **Set Timeline**: Set removal timeline (minimum 6 months)
5. **Remove**: Remove deprecated features after timeline

### 9.2 Deprecation Notices

```typescript
/** @deprecated Use 'new-kind' instead */
interface OldNodeData {
  // ...
}

// In validation
export const DEPRECATED_VALIDATION: ValidationRule[] = [
  {
    id: 'DEPRECATED-1',
    name: 'Deprecated node kind',
    level: 'L2',
    severity: 'warning',
    check: (graph) => {
      const deprecated = graph.nodes.filter(n => n.kind === 'old-kind');
      const warnings: ValidationWarning[] = [];
      
      for (const node of deprecated) {
        warnings.push({
          ruleId: 'DEPRECATED-1',
          message: `Node kind '${node.kind}' is deprecated, use 'new-kind' instead`,
          node: node.id,
        });
      }
      
      return { valid: true, errors: [], warnings, info: [] };
    },
  },
];
```

### 9.3 Removal Process

1. **Check Usage**: Ensure no code uses deprecated feature
2. **Create Migration**: Create migration script if needed
3. **Update Documentation**: Remove deprecated feature from docs
4. **Bump Major Version**: Bump MAJOR version number
5. **Release**: Release new version

---

## 10. Extension Examples

### 10.1 Example: Adding `cache` Node

See [Section 2.2](#22-example-adding-cache-node) for a complete example.

### 10.2 Example: Adding `entity_uses_cache` Edge

See [Section 3.2](#32-example-adding-entity_uses_cache-edge) for a complete example.

### 10.3 Example: Adding `rate-limit` Node

```typescript
// 1. Define data interface
export interface RateLimitNodeData {
  name: string;
  requestsPerMinute: number;
  burstSize: number;
  endpoints: string[];
}

// 2. Add to union
export interface RateLimitNode extends GraphNodeBase {
  kind: 'rate-limit';
  data: RateLimitNodeData;
}

// 3. Define edges
export const RATE_LIMIT_EDGES: EdgeConstraint[] = [
  {
    kind: 'endpoint_has_rate_limit',
    source: ['endpoint'],
    target: ['rate-limit'],
    label: 'has',
    required: false,
    unique: true,
  },
];

// 4. Add Zod schema
export const RateLimitNodeDataSchema = z.object({
  name: z.string().min(1),
  requestsPerMinute: z.number().positive(),
  burstSize: z.number().positive(),
  endpoints: z.array(z.string()),
});

// 5. Update pass contracts
writes: {
  nodeKinds: ['rate-limit'],
  edgeKinds: ['endpoint_has_rate_limit'],
},

// 6. Add validation
export const RATE_LIMIT_VALIDATION: ValidationRule[] = [
  {
    id: 'RATE-LIMIT-1',
    name: 'Rate limit must have positive values',
    level: 'L2',
    severity: 'error',
    check: (graph) => {
      const rateLimits = graph.nodes.filter(n => n.kind === 'rate-limit');
      const errors: ValidationError[] = [];
      
      for (const rateLimit of rateLimits) {
        if (rateLimit.data.requestsPerMinute <= 0) {
          errors.push({
            ruleId: 'RATE-LIMIT-1',
            message: `Rate limit ${rateLimit.id} must have positive requestsPerMinute`,
            node: rateLimit.id,
          });
        }
        
        if (rateLimit.data.burstSize <= 0) {
          errors.push({
            ruleId: 'RATE-LIMIT-1',
            message: `Rate limit ${rateLimit.id} must have positive burstSize`,
            node: rateLimit.id,
          });
        }
      }
      
      return { valid: errors.length === 0, errors, warnings: [], info: [] };
    },
  },
];
```

---

**End of Extension Specification**
