# Resource Graph Specification v1.0

A graph representation of all execution resources in Build.same — workspaces, containers, volumes, images, networks, CPU/memory slots, ports, and artifacts — with their capacities, usage, reservations, and relationships.

## Purpose

The Resource Graph answers one question: **what resources are available, and can this execution node run right now?**

It is consumed by the Scheduler's Resource Allocator to determine feasibility of execution plans.

```
Resource Graph ──► Scheduler ──► Execution Graph
(what's free)      (decides)      (what needs resources)
```

## Documents

| Document | Description |
|----------|-------------|
| [01-resource-graph-spec.md](01-resource-graph-spec.md) | Canonical specification — resource kinds, capacities, invariants |
| [02-resource-graph-types.ts](02-resource-graph-types.ts) | Formal type definitions |
| [03-capacity-planning.md](03-capacity-planning.md) | Capacity modeling, overcommit, reservation strategies |
| [04-resource-queries.md](04-resource-queries.md) | Query patterns for the Scheduler |

## Status

**Frozen** — v1.0.0. Approved for implementation.
