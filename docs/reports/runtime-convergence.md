# Runtime Convergence Report

## Executive Summary

The codebase has **two parallel type systems** with significant gaps between the formal orchestration architecture and the actual runtime implementation.

**Critical Finding**: The formal pipeline orchestrator is defined but not wired to runtime. The runtime uses BOS schema types, not orchestration layer types.

---

## Critical Gaps

### 1. Dual Type Systems (CRITICAL)

| Concept | Orchestration Type | BOS/Runtime Type | Gap |
|---------|-------------------|------------------|-----|
| ApplicationBlueprint | `orchestration/application-blueprint/types.ts` | `bos/schemas/blueprint/application-blueprint.schema.ts` | COMPLETELY DIFFERENT |
| ExecutionBlueprint | `orchestration/execution-blueprint/types.ts` | `bos/schemas/blueprint/execution-blueprint.schema.ts` | COMPLETELY DIFFERENT |
| SolutionArchitecture | `orchestration/technology-planner/types.ts` | `bos/types-solution-architecture.ts` | DIFFERENT STRUCTURE |
| ExperienceBlueprint | `orchestration/experience-intelligence/types.ts` | `orchestration/design-intelligence/types-experience.ts` | DIFFERENT + RE-EXPORT |
| RendererOutput | `orchestration/renderer-engine/types.ts` | `generation/renderers/renderer.ts` (RenderResult) | DIFFERENT TYPES |

### 2. Missing Engine Implementations (HIGH)

| Artifact | Canonical Owner | Has Engine? | Status |
|----------|----------------|-------------|--------|
| BusinessKnowledge | Business Intelligence | ✅ YES | `business-intelligence/engine.ts` |
| EvidenceCollection | Knowledge Acquisition | ❌ NO | Only types defined |
| ExperienceBlueprint | Experience Intelligence | ⚠️ PARTIAL | In `design-intelligence/experience-engine.ts` |
| DesignDecision | Design Intelligence | ✅ YES | `design-intelligence/engine.ts` |
| ContentBlueprint | Content Intelligence | ❌ NO | Only types defined |
| SolutionArchitecture | Technology Planner | ⚠️ PARTIAL | Uses `SolutionArchitectureDecision` instead |
| ApplicationBlueprint | Application Blueprint | ❌ NO | Only types defined |
| ExecutionBlueprint | Execution Blueprint | ⚠️ PARTIAL | Uses BOS schema version |
| RendererOutput | Renderer | ❌ NO | Renderers produce `RenderResult` instead |

### 3. Pipeline Orchestrator Not Wired (MEDIUM)

The `PipelineOrchestrator` in `src/orchestration/pipeline-orchestrator/orchestrator.ts`:
- Defines 9-layer order ✅
- Has `executeBusinessIntelligence()` ✅
- Has `executeExperienceIntelligence()` ✅
- Has `executeContentIntelligence()` ✅
- Has `executeTechnologyPlanner()` ✅
- Has `executeApplicationBlueprint()` ✅
- Has `executeExecutionBlueprint()` ✅
- Has `executeRenderer()` ✅

**BUT**: `createPipelineOrchestrator()` creates an empty registry. No layers are registered. No code calls `registry.register()`.

### 4. Renderer Consumes Business Logic (MEDIUM)

Despite constraints that "Renderer must not infer business logic", the `RenderContext` in `generation/renderers/renderer.ts` receives:
- `businessKnowledge` (BusinessKnowledge)
- `designDecision` (DesignDecision)
- `solutionArchitecture` (SolutionArchitectureDecision)
- `experienceBlueprint` (ExperienceBlueprint)
- `knowledge` (vocabulary, domainEntities, additionalCapabilities)

---

## Disconnected Nodes

### Produced but NEVER Consumed

| Artifact | Producer | Consumers | Status |
|----------|----------|-----------|--------|
| `RendererOutput` | `renderer-engine/types.ts` | Only `pipeline-orchestrator/types.ts` | ORPHANED |
| `EvidenceCollection` | `knowledge-acquisition/types.ts` | Only `pipeline-orchestrator/types.ts` | ORPHANED |
| `ApplicationBlueprint` (orchestration) | `application-blueprint/types.ts` | Only other orchestration types | ORPHANED |
| `ExecutionBlueprint` (orchestration) | `execution-blueprint/types.ts` | Only other orchestration types | ORPHANED |
| `ContentBlueprint` | `content-intelligence/types.ts` | Only other orchestration types | ORPHANED |
| `SolutionArchitecture` (orchestration) | `technology-planner/types.ts` | Only other orchestration types | ORPHANED |

### Consumed but NEVER Produced

| Consumer | What It Expects | Actual Producer | Status |
|----------|----------------|-----------------|--------|
| `PipelineState.contentBlueprint` | `ContentBlueprint` | No engine exists | UNPRODUCED |
| `PipelineState.evidenceCollection` | `EvidenceCollection` | No engine exists | UNPRODUCED |
| `PipelineState.rendererOutput` | `RendererOutput` | Renderers produce `RenderResult` | TYPE MISMATCH |
| `PipelineState.designBlueprint` | `unknown` | `DesignIntelligenceEngine` | PARTIAL |

---

## Consumer Analysis

### ApplicationBlueprint Consumers

| Consumer | Imports From | Which Type? |
|----------|-------------|-------------|
| `orchestration/execution-blueprint/types.ts` | `../application-blueprint/types.js` | ORCHESTRATION |
| `orchestration/pipeline-orchestrator/types.ts` | `../application-blueprint/types.js` | ORCHESTRATION |
| `agents/deterministic-orchestrator-v4.ts` | `../bos/schemas/blueprint/application-blueprint.schema.js` | BOS |
| `bos/blueprint-mapper.ts` | `./schemas/blueprint/application-blueprint.schema.js` | BOS |
| `bos/bre-v2-pipeline.ts` | `./schemas/blueprint/application-blueprint.schema.js` | BOS |
| `bos/content-resolver.ts` | `./schemas/blueprint/application-blueprint.schema.js` | BOS |
| `bos/execution-planner.ts` | `./schemas/blueprint/application-blueprint.schema.js` | BOS |
| `generation/compiler-passes.ts` | `../bos/schemas/blueprint/application-blueprint.schema.js` | BOS |
| `generation/build-pipeline.ts` | `../bos/schemas/blueprint/application-blueprint.schema.js` | BOS |

**Verdict**: 86% of consumers use BOS schema version, 14% use orchestration version.

### ExecutionBlueprint Consumers

| Consumer | Imports From | Which Type? |
|----------|-------------|-------------|
| `orchestration/renderer-engine/types.ts` | `../execution-blueprint/types.js` | ORCHESTRATION |
| `orchestration/pipeline-orchestrator/types.ts` | `../execution-blueprint/types.js` | ORCHESTRATION |
| `bos/execution-planner.ts` | `./schemas/blueprint/execution-blueprint.schema.js` | BOS |
| `bos/pipeline-v2/stages/execution-dag.ts` | `../../schemas/blueprint/execution-blueprint.schema.js` | BOS |
| `generation/compiler-passes.ts` | `../bos/schemas/blueprint/execution-blueprint.schema.js` | BOS |
| `generation/build-pipeline.ts` | `../bos/schemas/blueprint/execution-blueprint.schema.js` | BOS |

**Verdict**: 67% of consumers use BOS schema version, 33% use orchestration version.

---

## Recommendations

### Priority 1: Unify Type Systems

**Option A**: Make orchestration types match BOS schema types
- Pros: Minimal code changes, runtime already works
- Cons: Orchestration types lose ProvenanceAware wrappers

**Option B**: Make BOS schema types match orchestration types
- Pros: Formal architecture matches runtime
- Cons: Major refactoring of runtime code

**Option C**: Create adapters between types
- Pros: Both systems can coexist
- Cons: Adds complexity, adapters need maintenance

**Recommendation**: Option C (Adapters) for now, with gradual migration to Option B.

### Priority 2: Wire Pipeline Orchestrator

1. Register layer implementations in `createPipelineOrchestrator()`
2. Connect to actual runtime pipeline
3. Make runtime use formal pipeline

### Priority 3: Implement Missing Engines

1. Content Intelligence Engine
2. Knowledge Acquisition Engine
3. Application Blueprint Engine
4. Execution Blueprint Engine

### Priority 4: Fix Renderer Constraints

1. Remove business logic from `RenderContext`
2. Make renderer only consume `ExecutionBlueprint`
3. Pass all context through `ExecutionBlueprint`

---

## Current State Score

| Category | Score | Notes |
|----------|-------|-------|
| Type Convergence | 40% | Dual type systems, many duplicates |
| Engine Implementation | 50% | 4/9 engines implemented |
| Pipeline Wiring | 20% | Defined but not connected |
| Runtime Usage | 60% | Runtime works but uses wrong types |
| Renderer Constraints | 30% | Consumes business logic |
| **Overall** | **40%** | Significant gaps remain |

---

## Next Steps

1. Create adapters for dual type systems
2. Wire pipeline orchestrator to runtime
3. Implement missing engines
4. Fix renderer constraints
5. Verify no disconnected nodes
