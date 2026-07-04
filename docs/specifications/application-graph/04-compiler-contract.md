# Application Graph — Compiler Contract

**Version**: 1.0.0-draft  
**Status**: Draft  
**Last Updated**: 2026-07-04

---

## Table of Contents

1. [Compiler Pass Architecture](#1-compiler-pass-architecture)
2. [Pass Contract Interface](#2-pass-contract-interface)
3. [Pass Definitions](#3-pass-definitions)
4. [Read/Write Permissions](#4-readwrite-permissions)
5. [Validation Rules](#5-validation-rules)
6. [Mutation Scope](#6-mutation-scope)
7. [Error Handling](#7-error-handling)
8. [Pass Execution Order](#8-pass-execution-order)
9. [Pass Dependencies](#9-pass-dependencies)
10. [Pass Testing](#10-pass-testing)

---

## 1. Compiler Pass Architecture

### 1.1 Overview

The Application Graph (AG) is transformed by a series of **compiler passes**. Each pass:

1. **Reads** from the input AG (immutable)
2. **Computes** the output AG (new version)
3. **Validates** the output AG (invariants)
4. **Returns** the output AG (never modifies input)

```
Input AG ──▶ [Pass] ──▶ Output AG
```

### 1.2 Pass Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    Compiler Pass Pipeline                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Pass 0: Knowledge Enrichment                                    │
│  └── Reads: context                                              │
│  └── Writes: capability, feature, requirement                    │
│                                                                  │
│  Pass 1: BRE v2 → Application Blueprint                         │
│  └── Reads: context, knowledge                                   │
│  └── Writes: blueprint                                           │
│                                                                  │
│  Pass 2: Pipeline-v2 Enrichment                                  │
│  └── Reads: blueprint, context                                   │
│  └── Writes: entity, table, endpoint, workflow, page, nav-item   │
│                                                                  │
│  Pass 3: ApplicationGraph Construction                           │
│  └── Reads: all pipeline-v2 outputs                              │
│  └── Writes: ApplicationGraph (canonical IR)                     │
│                                                                  │
│  Pass 4: Content Resolution                                      │
│  └── Reads: ApplicationGraph                                     │
│  └── Writes: resolved content                                    │
│                                                                  │
│  Pass 5: Rendering                                               │
│  └── Reads: ApplicationGraph, resolved content                   │
│  └── Writes: component, section, layout                          │
│                                                                  │
│  Pass 6: Code Generation                                         │
│  └── Reads: ApplicationGraph                                     │
│  └── Writes: source files                                        │
│                                                                  │
│  Pass 7: Quality Gate                                            │
│  └── Reads: ApplicationGraph, source files                       │
│  └── Writes: validation results                                  │
│                                                                  │
│  Pass 8: Self-Healing                                            │
│  └── Reads: validation results, source files                     │
│  └── Writes: fixed source files                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Pass Contract Interface

### 2.1 CompilerPassContract

Every compiler pass must implement this interface:

```typescript
interface CompilerPassContract {
  id: string;
  name: string;
  version: string;
  
  // What this pass can READ from the graph
  reads: PassReadScope;
  
  // What this pass can WRITE to the graph
  writes: PassWriteScope;
  
  // What this pass VALIDATES
  validates: PassValidationScope;
  
  // What this pass can MUTATE
  mutates: PassMutationScope;
  
  // Execute the pass
  execute(input: PassInput): Promise<PassOutput>;
}
```

### 2.2 PassReadScope

Defines what the pass can read from the graph:

```typescript
interface PassReadScope {
  nodeKinds: GraphNodeKind[];
  edgeKinds: EdgeKind[];
  metadata: string[];
  subgraphs: string[];
}
```

### 2.3 PassWriteScope

Defines what the pass can write to the graph:

```typescript
interface PassWriteScope {
  nodeKinds: GraphNodeKind[];
  edgeKinds: EdgeKind[];
  metadata: string[];
}
```

### 2.4 PassValidationScope

Defines what the pass validates:

```typescript
interface PassValidationScope {
  invariants: string[];
  customRules: string[];
  constraints: string[];
}
```

### 2.5 PassMutationScope

Defines how the pass can mutate the graph:

```typescript
interface PassMutationScope {
  allowed: boolean;
  scope: 'none' | 'add-only' | 'replace' | 'full';
  constraints: string[];
}
```

### 2.6 PassInput/PassOutput

```typescript
interface PassInput {
  graph: ApplicationGraph;
  context: BREContext;
  blueprint?: ApplicationBlueprint;
  executionBlueprint?: ExecutionBlueprint;
  applicationSpec?: ApplicationSpec;
  renderResult?: RenderResult;
  files?: RenderedFile[];
  stats?: AppGraphStats;
  warnings?: string[];
}

interface PassOutput {
  graph: ApplicationGraph;
  context?: Partial<BREContext>;
  blueprint?: ApplicationBlueprint;
  executionBlueprint?: ExecutionBlueprint;
  applicationSpec?: ApplicationSpec;
  renderResult?: RenderResult;
  files?: RenderedFile[];
  stats?: AppGraphStats;
  warnings?: string[];
}
```

---

## 3. Pass Definitions

### 3.1 Pass 0: Knowledge Enrichment

```typescript
const pass0: CompilerPassContract = {
  id: 'pass-0-knowledge-enrichment',
  name: 'Knowledge Graph Enrichment',
  version: '1.0.0',
  
  reads: {
    nodeKinds: [],
    edgeKinds: [],
    metadata: [],
    subgraphs: ['knowledge'],
  },
  
  writes: {
    nodeKinds: ['capability', 'feature', 'requirement'],
    edgeKinds: ['capability_has_feature', 'feature_has_requirement'],
    metadata: [],
  },
  
  validates: {
    invariants: ['I-7'],
    customRules: ['knowledge-completeness'],
    constraints: [],
  },
  
  mutates: {
    allowed: true,
    scope: 'add-only',
    constraints: ['can only add new nodes, cannot modify existing'],
  },
};
```

### 3.2 Pass 1: BRE v2 → Application Blueprint

```typescript
const pass1: CompilerPassContract = {
  id: 'pass-1-bre-v2',
  name: 'BRE v2 → Application Blueprint',
  version: '1.0.0',
  
  reads: {
    nodeKinds: ['capability', 'feature', 'requirement'],
    edgeKinds: ['capability_has_feature', 'feature_has_requirement'],
    metadata: ['industry', 'appName', 'businessModels'],
    subgraphs: ['knowledge'],
  },
  
  writes: {
    nodeKinds: [],
    edgeKinds: [],
    metadata: [],
  },
  
  validates: {
    invariants: ['I-7'],
    customRules: ['blueprint-completeness'],
    constraints: [],
  },
  
  mutates: {
    allowed: false,
    scope: 'none',
    constraints: [],
  },
};
```

### 3.3 Pass 2: Pipeline-v2 Enrichment

```typescript
const pass2: CompilerPassContract = {
  id: 'pass-2-pipeline-v2',
  name: 'Pipeline-v2 Enrichment',
  version: '1.0.0',
  
  reads: {
    nodeKinds: ['capability', 'feature', 'requirement'],
    edgeKinds: ['capability_has_feature', 'feature_has_requirement'],
    metadata: ['industry', 'appName', 'businessModels', 'databaseEngine'],
    subgraphs: ['knowledge', 'blueprint'],
  },
  
  writes: {
    nodeKinds: [
      'entity', 'value-object', 'enum',
      'table', 'index', 'view',
      'endpoint', 'field', 'auth-rule',
      'workflow', 'step', 'event',
      'page', 'nav-item',
    ],
    edgeKinds: [
      'has_table', 'has_endpoint', 'has_workflow', 'has_page',
      'entity_relation', 'value_object_of', 'enum_used_by',
      'endpoint_for_entity', 'workflow_uses_entity', 'page_uses_entity',
      'feature_requires_entity',
    ],
    metadata: [],
  },
  
  validates: {
    invariants: ['I-2', 'I-3', 'I-4', 'I-8'],
    customRules: ['entity-table-linking', 'endpoint-uniqueness'],
    constraints: [],
  },
  
  mutates: {
    allowed: true,
    scope: 'add-only',
    constraints: ['can only add new nodes/edges, cannot modify existing'],
  },
};
```

### 3.4 Pass 3: ApplicationGraph Construction

```typescript
const pass3: CompilerPassContract = {
  id: 'pass-3-application-graph',
  name: 'ApplicationGraph Construction',
  version: '1.0.0',
  
  reads: {
    nodeKinds: [
      'entity', 'value-object', 'enum',
      'table', 'index', 'view',
      'endpoint', 'field', 'auth-rule',
      'workflow', 'step', 'event',
      'page', 'nav-item',
      'capability', 'feature', 'requirement',
    ],
    edgeKinds: [
      'has_table', 'has_endpoint', 'has_workflow', 'has_page',
      'entity_relation', 'value_object_of', 'enum_used_by',
      'endpoint_for_entity', 'workflow_uses_entity', 'page_uses_entity',
      'feature_requires_entity',
      'capability_has_feature', 'feature_has_requirement',
    ],
    metadata: ['industry', 'appName', 'databaseEngine', 'businessModels', 'compliancePacks'],
    subgraphs: ['knowledge', 'blueprint', 'pipeline-v2'],
  },
  
  writes: {
    nodeKinds: [],
    edgeKinds: [],
    metadata: [],
  },
  
  validates: {
    invariants: ['I-1', 'I-2', 'I-3', 'I-4', 'I-5', 'I-6', 'I-7', 'I-8'],
    customRules: ['graph-completeness', 'metadata-completeness'],
    constraints: [],
  },
  
  mutates: {
    allowed: false,
    scope: 'none',
    constraints: [],
  },
};
```

### 3.5 Pass 4: Content Resolution

```typescript
const pass4: CompilerPassContract = {
  id: 'pass-4-content-resolution',
  name: 'Content Resolution',
  version: '1.0.0',
  
  reads: {
    nodeKinds: [
      'entity', 'table', 'endpoint', 'workflow', 'page',
      'capability', 'feature',
    ],
    edgeKinds: [
      'has_table', 'has_endpoint', 'has_workflow', 'has_page',
      'entity_relation', 'endpoint_for_entity',
    ],
    metadata: ['industry', 'appName', 'businessModels'],
    subgraphs: [],
  },
  
  writes: {
    nodeKinds: [],
    edgeKinds: [],
    metadata: [],
  },
  
  validates: {
    invariants: [],
    customRules: ['content-completeness'],
    constraints: [],
  },
  
  mutates: {
    allowed: false,
    scope: 'none',
    constraints: [],
  },
};
```

### 3.6 Pass 5: Rendering

```typescript
const pass5: CompilerPassContract = {
  id: 'pass-5-rendering',
  name: 'Rendering',
  version: '1.0.0',
  
  reads: {
    nodeKinds: [
      'entity', 'table', 'endpoint', 'workflow', 'page',
      'capability', 'feature',
    ],
    edgeKinds: [
      'has_table', 'has_endpoint', 'has_workflow', 'has_page',
      'entity_relation', 'endpoint_for_entity',
    ],
    metadata: ['industry', 'appName'],
    subgraphs: [],
  },
  
  writes: {
    nodeKinds: ['component', 'section', 'layout'],
    edgeKinds: [
      'has_component', 'has_section', 'has_layout',
      'component_uses_entity', 'page_has_layout', 'layout_has_component',
    ],
    metadata: [],
  },
  
  validates: {
    invariants: [],
    customRules: ['rendering-completeness'],
    constraints: [],
  },
  
  mutates: {
    allowed: true,
    scope: 'add-only',
    constraints: ['can only add new nodes/edges, cannot modify existing'],
  },
};
```

### 3.7 Pass 6: Code Generation

```typescript
const pass6: CompilerPassContract = {
  id: 'pass-6-code-generation',
  name: 'Code Generation',
  version: '1.0.0',
  
  reads: {
    nodeKinds: [
      'entity', 'table', 'endpoint', 'workflow', 'page',
      'component', 'section', 'layout',
      'capability', 'feature',
    ],
    edgeKinds: [
      'has_table', 'has_endpoint', 'has_workflow', 'has_page',
      'has_component', 'has_section', 'has_layout',
      'entity_relation', 'endpoint_for_entity',
      'component_uses_entity', 'page_has_layout', 'layout_has_component',
    ],
    metadata: ['industry', 'appName', 'databaseEngine'],
    subgraphs: [],
  },
  
  writes: {
    nodeKinds: [],
    edgeKinds: [],
    metadata: [],
  },
  
  validates: {
    invariants: [],
    customRules: ['code-completeness'],
    constraints: [],
  },
  
  mutates: {
    allowed: false,
    scope: 'none',
    constraints: [],
  },
};
```

### 3.8 Pass 7: Quality Gate

```typescript
const pass7: CompilerPassContract = {
  id: 'pass-7-quality-gate',
  name: 'Quality Gate',
  version: '1.0.0',
  
  reads: {
    nodeKinds: [
      'entity', 'table', 'endpoint', 'workflow', 'page',
      'component', 'section', 'layout',
      'capability', 'feature',
    ],
    edgeKinds: [
      'has_table', 'has_endpoint', 'has_workflow', 'has_page',
      'has_component', 'has_section', 'has_layout',
      'entity_relation', 'endpoint_for_entity',
      'component_uses_entity', 'page_has_layout', 'layout_has_component',
    ],
    metadata: ['industry', 'appName', 'databaseEngine'],
    subgraphs: [],
  },
  
  writes: {
    nodeKinds: [],
    edgeKinds: [],
    metadata: [],
  },
  
  validates: {
    invariants: ['I-1', 'I-2', 'I-3', 'I-4', 'I-5', 'I-6', 'I-7', 'I-8'],
    customRules: ['quality-completeness', 'validation-completeness'],
    constraints: [],
  },
  
  mutates: {
    allowed: false,
    scope: 'none',
    constraints: [],
  },
};
```

### 3.9 Pass 8: Self-Healing

```typescript
const pass8: CompilerPassContract = {
  id: 'pass-8-self-healing',
  name: 'Self-Healing',
  version: '1.0.0',
  
  reads: {
    nodeKinds: [
      'entity', 'table', 'endpoint', 'workflow', 'page',
      'component', 'section', 'layout',
    ],
    edgeKinds: [
      'has_table', 'has_endpoint', 'has_workflow', 'has_page',
      'has_component', 'has_section', 'has_layout',
    ],
    metadata: ['industry', 'appName', 'databaseEngine'],
    subgraphs: [],
  },
  
  writes: {
    nodeKinds: [],
    edgeKinds: [],
    metadata: [],
  },
  
  validates: {
    invariants: [],
    customRules: ['healing-completeness'],
    constraints: [],
  },
  
  mutates: {
    allowed: true,
    scope: 'replace',
    constraints: ['can replace existing nodes/edges, cannot add new kinds'],
  },
};
```

---

## 4. Read/Write Permissions

### 4.1 Permission Matrix

| Pass | Read Nodes | Write Nodes | Read Edges | Write Edges |
|------|------------|-------------|------------|-------------|
| Pass 0 | - | capability, feature, requirement | - | capability_has_feature, feature_has_requirement |
| Pass 1 | capability, feature, requirement | - | capability_has_feature, feature_has_requirement | - |
| Pass 2 | capability, feature, requirement | entity, table, endpoint, workflow, page, nav-item | capability_has_feature, feature_has_requirement | has_table, has_endpoint, has_workflow, has_page, entity_relation, endpoint_for_entity, workflow_uses_entity, page_uses_entity, feature_requires_entity |
| Pass 3 | all | - | all | - |
| Pass 4 | entity, table, endpoint, workflow, page, capability, feature | - | has_table, has_endpoint, has_workflow, has_page, entity_relation, endpoint_for_entity | - |
| Pass 5 | entity, table, endpoint, workflow, page, capability, feature | component, section, layout | has_table, has_endpoint, has_workflow, has_page, entity_relation, endpoint_for_entity | has_component, has_section, has_layout, component_uses_entity, page_has_layout, layout_has_component |
| Pass 6 | all | - | all | - |
| Pass 7 | all | - | all | - |
| Pass 8 | all | - | all | - |

### 4.2 Permission Violations

If a pass tries to read/write outside its scope:

1. **Throw an error** immediately
2. **Log the violation** with details
3. **Fail the build** with a clear message

```typescript
function checkPermission(pass: CompilerPassContract, operation: 'read' | 'write', kind: string) {
  const scope = operation === 'read' ? pass.reads : pass.writes;
  
  if (operation === 'read' && !scope.nodeKinds.includes(kind as GraphNodeKind)) {
    throw new Error(`Pass ${pass.id} cannot read node kind ${kind}`);
  }
  
  if (operation === 'write' && !scope.nodeKinds.includes(kind as GraphNodeKind)) {
    throw new Error(`Pass ${pass.id} cannot write node kind ${kind}`);
  }
}
```

---

## 5. Validation Rules

### 5.1 Invariant Validation

Every pass must validate that the output AG maintains all invariants:

| Invariant | Description | Passes Required |
|-----------|-------------|-----------------|
| I-1 | Single Root | Pass 3, 7 |
| I-2 | Acyclic Ownership | Pass 2, 3, 7 |
| I-3 | Referential Integrity | Pass 2, 3, 7 |
| I-4 | Kind Consistency | Pass 2, 3, 7 |
| I-5 | Immutability | All passes |
| I-6 | Version Monotonicity | All passes |
| I-7 | Metadata Completeness | Pass 1, 3, 7 |
| I-8 | Entity-Table Linking | Pass 2, 3, 7 |

### 5.2 Custom Validation Rules

Each pass can define custom validation rules:

```typescript
interface CustomValidationRule {
  id: string;
  name: string;
  description: string;
  check: (graph: ApplicationGraph) => ValidationResult;
}
```

### 5.3 Validation Output

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
}
```

---

## 6. Mutation Scope

### 6.1 Mutation Types

| Scope | Description | Use Cases |
|-------|-------------|-----------|
| `none` | Cannot mutate the graph | Passes 1, 3, 4, 6, 7 |
| `add-only` | Can only add new nodes/edges | Passes 0, 2, 5 |
| `replace` | Can replace existing nodes/edges | Pass 8 |
| `full` | Can modify anything | Reserved for future use |

### 6.2 Mutation Rules

1. **Immutability Principle**: Never modify the input graph
2. **Versioning**: Create a new version for each mutation
3. **Validation**: Validate the output graph after mutation
4. **Rollback**: If validation fails, discard the output and keep the input

### 6.3 Mutation Examples

```typescript
// Add-only mutation (Pass 2)
function addEntity(graph: ApplicationGraph, entity: EntityNode): ApplicationGraph {
  return {
    ...graph,
    nodes: [...graph.nodes, entity],
    updatedAt: new Date().toISOString(),
  };
}

// Replace mutation (Pass 8)
function replaceNode(graph: ApplicationGraph, oldId: string, newNode: GraphNode): ApplicationGraph {
  return {
    ...graph,
    nodes: graph.nodes.map(n => n.id === oldId ? newNode : n),
    updatedAt: new Date().toISOString(),
  };
}
```

---

## 7. Error Handling

### 7.1 Error Types

```typescript
interface CompilerError {
  type: 'permission' | 'validation' | 'mutation' | 'dependency' | 'runtime';
  passId: string;
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
}
```

### 7.2 Error Handling Rules

1. **Permission Errors**: Fail immediately, do not continue
2. **Validation Errors**: Fail the pass, do not propagate invalid graph
3. **Mutation Errors**: Rollback to input graph
4. **Dependency Errors**: Skip the pass, continue with next
5. **Runtime Errors**: Log and continue if possible

### 7.3 Error Recovery

```typescript
async function executePassWithRecovery(
  pass: CompilerPassContract,
  input: PassInput
): Promise<PassOutput | null> {
  try {
    return await pass.execute(input);
  } catch (error) {
    if (error instanceof CompilerError) {
      if (error.type === 'permission') {
        // Fail immediately
        throw error;
      }
      
      if (error.type === 'validation') {
        // Log and skip
        console.error(`Validation error in ${pass.id}:`, error.message);
        return null;
      }
      
      if (error.type === 'mutation') {
        // Rollback
        console.warn(`Mutation error in ${pass.id}, rolling back`);
        return null;
      }
    }
    
    // Unknown error, log and continue
    console.error(`Unknown error in ${pass.id}:`, error);
    return null;
  }
}
```

---

## 8. Pass Execution Order

### 8.1 Strict Ordering

Passes must execute in the defined order:

```
Pass 0 → Pass 1 → Pass 2 → Pass 3 → Pass 4 → Pass 5 → Pass 6 → Pass 7 → Pass 8
```

### 8.2 Dependency Graph

```
Pass 0 ──▶ Pass 1 ──▶ Pass 2 ──▶ Pass 3
                                      │
                                      ▼
                              Pass 4 ──▶ Pass 5 ──▶ Pass 6 ──▶ Pass 7 ──▶ Pass 8
```

### 8.3 Parallel Execution

Some passes can execute in parallel if they have no dependencies:

- **Pass 0** and **Pass 1** can run in parallel (if Pass 0 doesn't depend on Pass 1)
- **Pass 4**, **Pass 5**, **Pass 6** can run in parallel (if they don't depend on each other)

However, for simplicity and debugging, we recommend sequential execution.

---

## 9. Pass Dependencies

### 9.1 Input Dependencies

Each pass declares what it needs from previous passes:

```typescript
interface PassDependencies {
  required: string[];  // Pass IDs that must complete before this pass
  optional: string[];  // Pass IDs that can be skipped
}
```

### 9.2 Dependency Resolution

```typescript
function resolveDependencies(pass: CompilerPassContract, completedPasses: string[]): boolean {
  return pass.reads.subgraphs.every(
    subgraph => completedPasses.some(
      completed => completed.includes(subgraph)
    )
  );
}
```

### 9.3 Missing Dependencies

If a required dependency is missing:

1. **Log a warning** with details
2. **Skip the pass** if possible
3. **Fail the build** if the pass is required

---

## 10. Pass Testing

### 10.1 Unit Testing

Each pass should be tested independently:

```typescript
describe('Pass 2: Pipeline-v2 Enrichment', () => {
  it('should add entity nodes', async () => {
    const input = createTestInput();
    const output = await pass2.execute(input);
    
    expect(output.graph.nodes.filter(n => n.kind === 'entity')).toHaveLength(3);
  });
  
  it('should add table nodes', async () => {
    const input = createTestInput();
    const output = await pass2.execute(input);
    
    expect(output.graph.nodes.filter(n => n.kind === 'table')).toHaveLength(3);
  });
  
  it('should maintain invariants', async () => {
    const input = createTestInput();
    const output = await pass2.execute(input);
    
    const result = validateGraph(output.graph);
    expect(result.valid).toBe(true);
  });
});
```

### 10.2 Integration Testing

Test passes together:

```typescript
describe('Compiler Pipeline', () => {
  it('should execute all passes in order', async () => {
    let graph = createInitialGraph();
    
    for (const pass of COMPILER_PASSES) {
      const output = await pass.execute({ graph });
      graph = output.graph;
    }
    
    const result = validateGraph(graph);
    expect(result.valid).toBe(true);
  });
});
```

### 10.3 Regression Testing

Test that changes don't break existing functionality:

```typescript
describe('Regression Tests', () => {
  it('should produce same output for same input', async () => {
    const input = createTestInput();
    
    const output1 = await pass2.execute(input);
    const output2 = await pass2.execute(input);
    
    expect(output1.graph).toEqual(output2.graph);
  });
});
```

---

**End of Compiler Contract**
