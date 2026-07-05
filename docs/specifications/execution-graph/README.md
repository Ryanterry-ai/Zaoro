# Execution Graph Specification

The canonical intermediate representation for all execution in Build.same. Where the Application Graph describes *what to build*, the Execution Graph describes *what to run*.

## Purpose

The Execution Graph bridges the Build Engine (orchestrator/compiler) and the Scheduler (which decides when/where to run). It captures a complete execution plan as a directed graph of tasks, steps, commands, artifacts, and their dependencies.

```
Application Graph ──► Execution Graph ──► Scheduler ──► Runtime Manager ──► Provider
   (what to build)      (what to run)       (when/where)      (how)           (where)
```

## Documents

| Document | Description |
|----------|-------------|
| [01-execution-graph-spec.md](01-execution-graph-spec.md) | Canonical specification — node/edge kinds, properties, invariants |
| [02-execution-graph-types.ts](02-execution-graph-types.ts) | Formal type definitions |
| [03-compiler-to-execution.md](03-compiler-to-execution.md) | How the compiler produces Execution Graphs from Application Graphs |
| [04-scheduler-contract.md](04-scheduler-contract.md) | Contract between Execution Graph and Scheduler |

## Status

**Frozen** — v1.0.0. Approved for implementation.
