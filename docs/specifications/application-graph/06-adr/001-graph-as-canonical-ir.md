# ADR-001: Application Graph as Canonical IR

**Status**: Accepted  
**Date**: 2026-07-04  
**Deciders**: Build.same Architecture Team

---

## Context

Build.same is a dual-mode system that either clones an existing website or generates a new one from a business description. Both modes converge on the same build-orchestrator, quality gates, and deploy pipeline.

The system needs a **single source of truth** for what an application *is*—not the prompt, not the blueprint, not the code. This source of truth must be:

1. **Canonical**: The definitive representation of the application
2. **Immutable**: Once constructed, never modified
3. **Validated**: Invariants enforced at construction time
4. **Serializable**: Complete state capture for replay and debugging
5. **Queryable**: Efficient access patterns for all consumers

## Decision

**We will use the Application Graph (AG) as the canonical intermediate representation (IR) of all software applications produced by Build.same.**

### Definition

**Application Graph (AG)**: The canonical, immutable intermediate representation (IR) of a software application produced by the planning pipeline. It is the single source of truth for compilation, validation, rendering, replay, debugging, deployment, and future evolution.

### The One Rule

> **From this point onward, every new feature added to Build.same must first answer one question: "How does this affect the Application Graph?"**

If a feature cannot be represented in the Application Graph—or intentionally remains outside it as infrastructure—it should not be added until its relationship to the AG is understood.

## Rationale

### Why a Graph?

1. **Natural Representation**: Applications are inherently graph-like (entities relate to tables, pages use entities, workflows operate on entities)
2. **Traversal**: Graph algorithms enable efficient queries (shortest path, subgraph extraction)
3. **Validation**: Graph invariants are well-understood and enforceable
4. **Visualization**: Graphs are naturally visualizable for debugging and inspection

### Why Canonical?

1. **Single Source of Truth**: Eliminates ambiguity about what the application "is"
2. **Consistency**: All passes read from/write to the same structure
3. **Auditability**: Changes are traceable through versioning

### Why Immutable?

1. **Replay**: Any previous state can be reconstructed
2. **Debugging**: Compare graph versions to find where issues were introduced
3. **Concurrency**: Multiple passes can read the same graph without locks
4. **Caching**: Intermediate results can be cached safely

### Why a Compiler IR?

1. **Clear Architecture**: Planners write it, validators verify it, renderers read it
2. **Separation of Concerns**: Each pass has a clear, limited scope
3. **Testability**: Passes can be tested independently
4. **Extensibility**: New passes can be added without modifying existing ones

## Consequences

### Positive

1. **Architectural Clarity**: Everyone understands the role of the AG
2. **Better Debugging**: Can inspect any intermediate state
3. **Easier Testing**: Passes can be tested with mock graphs
4. **Future Extensibility**: New node/edge types can be added without breaking existing code
5. **Plugin Architecture**: External services (PostHog, Sentry, Supabase) become optional plugins that consume derived artifacts

### Negative

1. **Initial Complexity**: More upfront design work
2. **Learning Curve**: Team must understand graph concepts
3. **Performance**: Graph operations may be slower than flat structures for simple cases

### Mitigations

1. **Documentation**: Comprehensive specification package
2. **Examples**: Developer guide with practical examples
3. **Tooling**: Query APIs and visualization tools
4. **Performance**: Optimize critical paths, cache intermediate results

## Alternatives Considered

### Alternative 1: Flat Data Structures

**Description**: Use plain objects/arrays for each concept (entities, tables, etc.)

**Pros**:
- Simpler to understand
- Faster for simple operations
- Easier to serialize

**Cons**:
- No natural relationships
- Hard to traverse
- No invariant enforcement
- No replay capability

**Verdict**: Rejected. Doesn't scale to complex applications.

### Alternative 2: Relational Database

**Description**: Store application structure in a relational database

**Pros**:
- Strong consistency
- ACID transactions
- Query language (SQL)

**Cons**:
- Overkill for most use cases
- Hard to serialize/deserialize
- No natural graph traversal
- External dependency

**Verdict**: Rejected. Too heavy for a compiler IR.

### Alternative 3: Document Store

**Description**: Store application structure as JSON documents

**Pros**:
- Flexible schema
- Easy to serialize
- Natural for TypeScript

**Cons**:
- No relationships
- No invariant enforcement
- Hard to query efficiently
- No replay capability

**Verdict**: Rejected. Doesn't meet requirements.

## Related ADRs

- [ADR-002: Node Kind Taxonomy](002-node-kind-taxonomy.md)
- [ADR-003: Edge Semantics](003-edge-semantics.md)
- [ADR-004: Versioning Strategy](004-versioning-strategy.md)
- [ADR-005: Plugin Architecture](005-plugin-architecture.md)

---

**End of ADR-001**
