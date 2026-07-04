# Application Graph — Backward Compatibility

**Version**: 1.0.0-draft  
**Status**: Draft  
**Last Updated**: 2026-07-04

---

## Overview

This document defines the backward and forward compatibility guarantees for the Application Graph specification.

---

## Compatibility Guarantees

### 1. Old Code + New Graphs

**Guarantee**: Old code must work with new graphs.

**Implementation**:
- Old code ignores unknown node kinds
- Old code ignores unknown edge kinds
- Old code skips unknown fields
- Old code continues processing known data

**Example**:
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

### 2. New Code + Old Graphs

**Guarantee**: New code must work with old graphs.

**Implementation**:
- New code handles missing fields gracefully
- New code uses default values for missing fields
- New code continues processing

**Example**:
```typescript
// New code that handles missing fields
function processNode(node: GraphNode) {
  if (node.kind === 'entity') {
    const entity = node.data as EntityNodeData;
    
    // Handle missing fields with defaults
    const name = entity.name || 'Unknown';
    const slug = entity.slug || name.toLowerCase();
    const fields = entity.fields || [];
    
    // Continue processing
  }
}
```

### 3. Unknown Types

**Guarantee**: Code must ignore unknown node/edge kinds.

**Implementation**:
- Switch statements have default cases
- Maps return undefined for unknown keys
- Arrays filter out unknown types

**Example**:
```typescript
// Switch with default case
switch (node.kind) {
  case 'entity':
    // Handle entity
    break;
  default:
    // Ignore unknown
    break;
}

// Map lookup
const handler = nodeHandlers.get(node.kind);
if (handler) {
  handler(node);
} else {
  // Ignore unknown
}

// Array filter
const knownNodes = graph.nodes.filter(n => 
  knownNodeKinds.includes(n.kind)
);
```

### 4. Unknown Fields

**Guarantee**: Code must skip unknown fields.

**Implementation**:
- Destructure with rest operator
- Use optional chaining
- Skip validation of unknown fields

**Example**:
```typescript
// Destructure with rest
const { name, slug, ...rest } = node.data;

// Optional chaining
const fields = node.data?.fields || [];

// Skip unknown fields
const validFields = Object.keys(node.data).filter(key => 
  knownFields.includes(key)
);
```

---

## Version Compatibility Matrix

| Code Version | Graph Version | Compatible? |
|--------------|---------------|-------------|
| v1.0 | v1.0 | ✅ Yes |
| v1.0 | v1.1 | ✅ Yes (forward compatible) |
| v1.0 | v2.0 | ❌ No (breaking changes) |
| v1.1 | v1.0 | ✅ Yes (backward compatible) |
| v2.0 | v1.0 | ❌ No (breaking changes) |

---

## Migration Paths

### Minor Version Bumps (1.0 → 1.1)

- New node kinds added
- New edge kinds added
- New fields added (optional)
- No breaking changes
- No migration required

### Major Version Bumps (1.0 → 2.0)

- Node kinds removed
- Edge kinds removed
- Required fields added
- Breaking changes
- Migration required

---

## Testing Compatibility

### Unit Tests

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

### Integration Tests

```typescript
describe('Integration Compatibility', () => {
  it('should work with all compiler passes', async () => {
    const graph = createGraphWithExtensions();
    
    for (const pass of COMPILER_PASSES) {
      const output = await pass.execute({ graph });
      // Should not throw
    }
  });
});
```

---

## Deprecation Policy

### Deprecation Process

1. Mark as deprecated in documentation
2. Log warnings when deprecated features are used
3. Provide alternatives
4. Set removal timeline (minimum 6 months)
5. Remove after timeline

### Deprecation Examples

```typescript
/** @deprecated Use 'new-kind' instead */
interface OldNodeData {
  // ...
}

// In validation
if (node.kind === 'old-kind') {
  console.warn(`Node kind '${node.kind}' is deprecated, use 'new-kind' instead`);
}
```

---

## Breaking Changes

### What is a Breaking Change?

1. Removing a node kind
2. Removing an edge kind
3. Making an optional field required
4. Changing field types
5. Changing edge constraints

### What is NOT a Breaking Change?

1. Adding a node kind
2. Adding an edge kind
3. Adding an optional field
4. Adding new validation rules
5. Adding new compiler passes

---

**End of Backward Compatibility**
