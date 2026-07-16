# Phase 1 — Foundation: Immutable Business Graph + Candidate Knowledge + Promotion Pipeline

**Status:** Production-ready milestone (phased architecture convergence)
**Date:** 2026-07-15
**Constraint satisfied:** ✅ Business Graph is immutable at runtime; only the Promotion Pipeline updates it.
**Backward compatibility:** ✅ Existing builds continue to work (no behavior change to generated output).

---

## 1. What changed and why

Previously, a successful build **mutated the canonical Business Graph directly**:

```
Successful Build ──▶ connectKnowledgeGraph(graph) ──▶ graph.addNode / graph.addEdge
```

This was the exact anti-pattern called out in the redesign: the graph slowly
accumulated garbage because every build wrote pattern-derived relationship
edges straight into the singleton graph (and threw on the second build, which
was silently swallowed).

Phase 1 introduces the enforced boundary:

```
Successful Build ──▶ Candidate Knowledge ──▶ Validation ──▶ Confidence ──▶
Human Review / Trusted Auto Promotion ──▶ Business Graph
```

The Business Graph is now treated like a database schema / compiler: it never
mutates itself because one build succeeded.

---

## 2. New modules

| Module | File | Responsibility |
|---|---|---|
| Candidate types | `src/bos/candidate/types.ts` | CandidateKnowledge model + signature |
| Candidate store | `src/bos/candidate/store.ts` | File-backed store; the ONLY write target of Runtime Learning. Subdirs: `candidate-entities/`, `candidate-workflows/`, `candidate-patterns/`, `candidate-integrations/`, `candidate-relationships/` |
| Validation | `src/bos/candidate/validation.ts` | Structural + confidence-floor checks |
| Confidence | `src/bos/candidate/confidence.ts` | Aggregates repeat observations; a single build maxes at 0.5 |
| Promotion | `src/bos/candidate/promotion.ts` | The "Promotion" half. Decides auto-promote vs human review vs reject |
| Graph Governor | `src/bos/graph/governor.ts` | Immutable proxy + the ONLY runtime mutation path (`applyPromotion`) + durable promotion log + rollback |

---

## 3. Immutable boundary (enforcement)

- `initializeKnowledgeGraph()` builds the graph ONCE from seeds, materializes
  pattern relationships ONCE via `connectKnowledgeGraph`, wraps it in a
  `GraphGovernor`, and exposes the **read-only proxy** via `getKnowledgeGraph()`.
- Any code that calls a mutation method (`addNode`, `addEdge`, `updateNode`,
  `deleteNode`, `deleteEdge`, `composeIndustry`) on the runtime graph handle
  throws a clear error pointing at the Promotion Pipeline.
- `GraphGovernor.applyPromotion()` is the single controlled mutation path.
  Each promotion is appended to `knowledge-candidates/promotions.log`
  (append-only, carries the full payload) so the graph is **reproducible from
  canonical seeds + the log alone**.

---

## 4. Runtime Learning split (Learning vs Promotion)

- **Learning** (observational, never mutates graph): `CandidateKnowledgeStore`
  accumulates observations per candidate signature across builds.
- **Promotion** (decides graph updates): `PromotionPipeline` validates →
  scores confidence → auto-promotes only when `distinctBuilds >= 3` **and**
  `confidence >= 0.85`, otherwise routes to a **human-review queue**.
- A single successful build can NEVER promote (1 observation ⇒ confidence ≤ 0.5).

---

## 5. Build-path reroute (adapter, backward compatible)

`src/agents/deterministic-orchestrator-v4.ts` Phase 16c previously called
`connectKnowledgeGraph(kg, registry)` on the singleton graph every build. It now:

1. Records discovered entities / patterns / workflows / integrations as
   candidates via `CandidateKnowledgeStore.record(...)`.
2. Runs `PromotionPipeline.run()` (review-only for a single build).

Generated output and benchmark behavior are unchanged — the pattern
relationships that `connectKnowledgeGraph` used to add per-build are now added
once at initialization, so the graph state a build reads is identical
(minus the duplicate-edge throw, which is now gone).

---

## 6. Dependency graph (runtime mutation paths)

```
BEFORE
  build-pipeline.ts ──▶ initializeKnowledgeGraph() ──▶ seeds (buildFromSeeds)
  orchestrator.ts  ──▶ (singleton graph).getGraph() ──▶ connectKnowledgeGraph ──▶ MUTATE

AFTER
  build-pipeline.ts ──▶ initializeKnowledgeGraph() ──▶ buildFromSeeds
                                                      ──▶ connectKnowledgeGraph  (once)
                                                      ──▶ GraphGovernor (freeze + readonly)
  orchestrator.ts  ──▶ CandidateKnowledgeStore.record()  (NO graph mutation)
                    ──▶ PromotionPipeline.run() ──▶ GraphGovernor.applyPromotion (only if promoted)
  promote-candidates.ts ──▶ PromotionPipeline ──▶ GraphGovernor.applyPromotion / rollback
```

---

## 7. Rollback capability

- **Per-candidate:** `tsx scripts/promote-candidates.ts --reject <id>` or
  `--approve <id>` for human-review items.
- **Last promotion:** `tsx scripts/promote-candidates.ts --rollback-last`
  truncates the durable log and decrements the version.
- **Full graph:** delete `knowledge-candidates/promotions.log` and restart the
  engine — the graph rebuilds deterministically from canonical seeds. No
  generated asset depends on promotion state for reproducibility.

---

## 8. Tests

`tests/candidate-knowledge.test.ts` covers: store upsert/observation
accumulation, validation pass/fail, confidence monotonicity, promotion
auto-vs-review decision, the immutable proxy throwing on mutation, and
governor `applyPromotion` + rollback.

Run: `npm test` (or `npx vitest run tests/candidate-knowledge.test.ts`)

---

## 9. Next phases (not in this milestone)

- Phase 2: Capability Graph + Primitive Pack Composer (composable Knowledge Packs).
- Phase 3: Artifact Graph Executor migration (adapters keep legacy stages working).
- Phase 4: Replace legacy implementations only after benchmark parity.

Each phase remains additive and must compile, pass all tests, and preserve
benchmark results before the next begins.
