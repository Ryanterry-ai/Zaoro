# Application Graph Specification Package

**Version**: 1.0.0-draft  
**Status**: Draft  
**Last Updated**: 2026-07-04

---

## Overview

The Application Graph (AG) is the canonical, immutable intermediate representation (IR) of a software application produced by the planning pipeline. It is the single source of truth for compilation, validation, rendering, replay, debugging, deployment, and future evolution.

**The One Rule**: From this point onward, every new feature added to Build.same must first answer one question: "How does this affect the Application Graph?"

---

## Package Structure

```
application-graph/
├── README.md                          # This file
├── 01-architecture-spec.md            # Philosophy, invariants, lifecycle (20-30 pages)
├── 02-formal-schema/
│   ├── nodes.ts                       # TypeScript definitions for all node types
│   ├── edges.ts                       # TypeScript definitions for all edge types
│   ├── graph.ts                       # ApplicationGraph root type
│   ├── validation.ts                  # Zod schemas + validation rules
│   └── schema.json                    # JSON Schema export (machine-readable)
├── 03-developer-guide.md             # Examples, patterns, migration guide (15-20 pages)
├── 04-compiler-contract.md           # What each pass can read/write/validate
├── 05-extension-spec.md              # How to add new node/edge types safely
├── 06-adr/                            # Architecture Decision Records
│   ├── 001-graph-as-canonical-ir.md
│   ├── 002-node-kind-taxonomy.md
│   ├── 003-edge-semantics.md
│   ├── 004-versioning-strategy.md
│   └── 005-plugin-architecture.md
└── migration/
    ├── MVP-to-v1.md                  # Migration plan from current implementation
    └── backward-compatibility.md     # Compatibility guarantees
```

---

## Quick Start

### For Planners

If you're building a new planner or modifying an existing one:

1. Read the [Architecture Specification](01-architecture-spec.md) to understand the AG philosophy
2. Check the [Node Taxonomy](02-formal-schema/nodes.ts) for available node types
3. Check the [Edge Taxonomy](02-formal-schema/edges.ts) for available edge types
4. Follow the [Developer Guide](03-developer-guide.md) for examples

### For Compiler Pass Authors

If you're building a new compiler pass:

1. Read the [Compiler Contract](04-compiler-contract.md) to understand what you can read/write
2. Check the [Validation Rules](02-formal-schema/validation.ts) for invariants you must preserve
3. Follow the [Extension Specification](05-extension-spec.md) if you need new node/edge types

### For Tool Builders

If you're building tools that consume the AG:

1. Read the [Query APIs](01-architecture-spec.md#10-query-apis) section
2. Check the [Serialization](01-architecture-spec.md#8-serialization-and-versioning) section
3. Follow the [Replay and Debugging](01-architecture-spec.md#11-replay-inspection-and-debugging) section

---

## Node Taxonomy Summary

| Category | Node Kinds | Count |
|----------|------------|-------|
| Domain | entity, value-object, enum | 3 |
| Storage | table, index, view | 3 |
| API | endpoint, field, auth-rule | 3 |
| Process | workflow, step, event | 3 |
| UI | page, component, section, layout | 4 |
| Navigation | nav-item, nav-group | 2 |
| Capability | capability, feature, requirement | 3 |
| Infrastructure | service, queue, cache | 3 |
| Metadata | design-token, theme, i18n-key | 3 |
| **Total** | | **27** |

---

## Edge Taxonomy Summary

| Category | Edge Kinds | Count |
|----------|------------|-------|
| Ownership | has_*, has_component, has_field, has_step, has_feature, has_requirement, has_group | 10 |
| Relation | entity_relation, value_object_of, enum_used_by | 3 |
| Dependency | endpoint_for_entity, workflow_uses_entity, page_uses_entity, feature_requires_entity, component_uses_entity, service_consumes | 6 |
| Flow | workflow_step, step_triggers_event, event_consumed_by | 3 |
| Navigation | nav_item_page, nav_group_item | 2 |
| UI | page_has_layout, layout_has_component, component_renders_entity | 3 |
| Capability | capability_has_feature, feature_has_requirement | 2 |
| Metadata | entity_has_token, page_has_theme, entity_has_i18n | 3 |
| **Total** | | **32** |

---

## Invariants

1. **I-1: Single Root** — Every AG has exactly one metadata node
2. **I-2: Acyclic Ownership** — Ownership edges must not form cycles
3. **I-3: Referential Integrity** — Every edge must reference existing nodes
4. **I-4: Kind Consistency** — Edge kind constraints must be respected
5. **I-5: Immutability** — Once constructed, nodes cannot be modified
6. **I-6: Version Monotonicity** — Graph version must only increase
7. **I-7: Metadata Completeness** — Required metadata fields must be present
8. **I-8: Entity-Table Linking** — Every entity must have a table (or be virtual)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-draft | 2026-07-04 | Initial draft |

---

## References

- [Architecture Specification](01-architecture-spec.md)
- [Formal Schemas](02-formal-schema/)
- [Developer Guide](03-developer-guide.md)
- [Compiler Contract](04-compiler-contract.md)
- [Extension Specification](05-extension-spec.md)
- [Architecture Decision Records](06-adr/)
- [Migration Plans](migration/)

---

**End of README**
