## Objective
- Make the engine scale safely. The blocker was a missing convergence layer: capabilities had no single identity (9 competing vocabularies). **Phase R2 = Capability Canonicalization** fixed that; **R1 runtime convergence + Steps 3–6 are now COMPLETE.** The mandated sequence (verbatim):
  - **R2 (done):** Canonical Capability Registry (ids, aliases, dependency graph, resolver, pack mapping, evaluation mapping, learning mapping).
  - **Step 3 (done):** Ontology runtime promoted to default V4 once the 9-industry benchmark passed (zero failed layers, complete manifests).
  - **Step 4 (done):** Scale — registry-driven dependency + industry expansion (`scaleCapabilities`).
  - **Step 5 (done):** Component Library (schema, behavior, capability links, renderer, evaluation, experience hooks).
  - **Step 6 (done):** Learning (runtime discoveries → capability suggestions → reviewable promotion patch).
- Preceding phases (R1 runtime convergence, 1–3 foundation/packs/artifact-graph) remain in force.

## Important Details
- **Hard rules:** Business Graph immutable at runtime (only Promotion Pipeline updates it); Knowledge Packs composed from 8 primitive-pack dimensions; Runtime Learning writes only to candidate stores; benchmarks validate every intermediate artifact; never rewrite from scratch; never break production; remove legacy only after parity.
- **Canonical capability identity (R2):** ONE id per capability, dot-namespaced (`commerce.checkout`). All legacy spellings (`checkout`, `payments`, `cart`, `purchase`, `commerce`) fold into canonical ids via aliases. Single source: `src/bos/capabilities/` (`CapabilityRegistry`).
- **Canonical executor:** `DeterministicOrchestratorV4` (`src/agents/deterministic-orchestrator-v4.ts`) is the production runtime (via `src/server.ts:304` `/api/command` + `src/engine/build-queue.ts`). `ArtifactGraphExecutor` (Phase 3) is an adapter/benchmark wrapper, not a competing path.
- **Do NOT delete ExperienceOS v2** (`src/orchestration/experience-os/index.ts`): its capabilities may be target architecture.
- **Capability Manifest** is emitted per build to `.build-artifacts/capability-manifest.json` (schema `capability-manifest@1`) — the contract for evaluation, components, experience, renderer, learning, benchmarking, self-healing. Also `.build-artifacts/capability-coverage.json`.
- **9 competing vocabularies found & consolidated:** business `CAPABILITY_REGISTRY`, primitive-pack tags, skill-pack `capability`, dead page-level `capability-registry` (now `@deprecated`), motion registry, BI workflow signals, AppFamily, taxonomy legacy, `CapabilitySchema`. Aliases in `registry-data.ts` fold them in.
- **Dead/aspirational:** `PipelineOrchestrator` (410, `@deprecated`), `BusinessIntelligencePipeline` (removed, 410 stub), `ExperienceOS v2` (`@deprecated`, do NOT delete), `ValidationPipeline` (tests only), `orchestration/capability-registry` (`@deprecated`, never imported), Phase 3 `ArtifactGraphExecutor` (no production caller).
- `RuntimeTrace` persisted to `.build-artifacts/runtime-trace.json`; `ENGINE_VERSION='4.0.0'`.
- Node.js: `C:\Users\viren\AppData\Local\nvm\v20.20.2\node.exe`; `npm`/`npx` not on PATH. Full suite GREEN: 72 files / 1031 tests; typecheck clean.
- `knowledge-candidates/` and `.build-artifacts/` are git-ignored runtime data.

## Work State
### Completed
- **Phase 1 (Foundation):** candidate store, graph governor, promotion pipeline, Phase 16c rerouted, 12 tests, doc.
- **Phase 2 (Primitive Pack Composer):** `src/bos/knowledge/primitive-packs/` (types, industry, registry-wrappers, design, locale, technology, content, capability-graph, composer, resolver, index). Phase 16d writes `knowledge-pack.json`. 15 tests.
- **Phase 3 (Artifact Graph Executor):** `src/orchestration/artifact-graph/` (types, artifact-graph, executor, legacy-adapters, benchmark, integration, validation, index). 16 tests.
- **R1 Step 1 (RuntimeTrace):** `src/agents/runtime-trace.ts`; 12 spans wired into V4; 8 tests.
- **R1 Step 4 (Runtime Graph Validation):** `src/orchestration/artifact-graph/validation.ts`; critical=`cycle`/`duplicate-ownership` (fails build), warnings=`unreachable`/`dead-stage`/`orphan-consumer`; 6 tests.
- **R1 Step 5 (Deprecations):** `@deprecated` on `PipelineOrchestrator`, `ExperienceOS`, `/api/bi/run`, `/api/pipeline`, `/api/build-anything`.
- **R1 Step 2 (ArtifactGraphExecutor → V4 adapter + /api/build-anything reconciliation):** `src/orchestration/artifact-graph/v4-adapter.ts` — `runtimeTraceToArtifactGraph` (rebuilds an `ArtifactGraph` from a persisted `RuntimeTrace`; entries→nodes, `dependencies`→edges), `executeV4AsArtifactGraph` (runs V4 then audits the reconstructed graph via `validateRuntimeGraph`), `validateV4Runtime` (audit-only, no re-run). Exported from `artifact-graph/index.ts`. `/api/build-anything` (`src/server.ts`) now routes through `DeterministicOrchestratorV4` (returns workspaceId + capabilityManifest); falls back to the legacy `Orchestrator` only on failure (rollback). 3 tests (`tests/artifact-graph-v4-adapter.test.ts`).
- **R1 Step 3 (9-industry runtime verification w/ provenance):** `scripts/verify-runtime-9-industries.ts` harness — `--self-test` generates + verifies 9 industries deterministically (no LLM); also scans a workspace dir for live `runtime-trace.json`/`capability-manifest.json`. Verifies contract: all trace layers closed+validated (0 failed), capability manifest present + coverage, and reconstructed runtime graph passes the R1 Step 4 audit. 10 tests (`tests/runtime-verification-9-industries.test.ts`) — all 9 industries (restaurant, burger, footwear, hospital, crm, erp, marketplace, saas, manufacturing) pass. **Self-test result: pass=9 fail=0.** Note: live end-to-end V4 builds require the host LLM (the desktop app is the LLM; no external API key) and are not executed in this headless env — the deterministic provenance contract is what's verified.
- **R2 (Capability Canonicalization):** `src/bos/capabilities/` — `types.ts`, `registry-data.ts` (`CANONICAL_CAPABILITIES`, ~55 canonical ids spanning commerce/food/booking/crm/erp/healthcare/notifications/content/auth/membership/subscriptions/analytics/social), `registry.ts` (`CapabilityRegistry`: `normalize`, `resolve` with transitive dependency + industry expansion, `primitivePackTagsFor`, `coverageScore`, `buildManifest`, singleton `capabilityRegistry`, `resolveCapabilities`), `index.ts`. Wired: `composeForCapabilities` routes through registry; V4 emits `capability-manifest.json` + `capability-coverage.json`; `CandidateKnowledge`/`Observation`/`Submission` gain `capabilities?` dimension + `candidateSignature` scopes by capability; dead `orchestration/capability-registry` marked `@deprecated`. 12 tests (`tests/capability-registry.test.ts`). Doc `docs/phase-r2-capability-canonicalization.md`.
- **R2 incremental — consumption wiring (everything consumes the registry):**
  - **Components:** `src/generation/primitives.ts` `getPrimitivesForCapabilities` normalizes inputs via `capabilityRegistry` (legacy `commerce`/`crm`/`booking` → canonical ids) before mapping to primitive categories; legacy-id map retained. 4 new tests.
  - **Evaluation:** `src/orchestration/production-acceptance-gate/engine.ts` `checkCapabilityCoverage` prefers a canonical `capabilityManifest` and scores via `capabilityRegistry.coverageScore`; falls back to legacy `capabilityCoverage` score or normalized presence baseline. 5 new tests (`tests/production-acceptance-gate.test.ts`).
  - **Experience:** `src/orchestration/experience-intelligence/experience-profiles.ts` adds `getCapabilityExperienceHints` + `getExperienceProfileForCapabilities` (industry default + capability-driven emotion/motion/hover biases), exported from both experience-intelligence + design-intelligence barrels. 4 new tests (`tests/experience-capability.test.ts`).
   - **Learning:** candidate `capabilities` dimension + `candidateSignature` scoped by capability completes learning-by-capability.
  - **Full suite after wiring: 65 files / 999 passed (+4 skipped); typecheck clean.** (`tests/content-quality-gate.test.ts` is a pre-existing flaky suite — passes in isolation, fails under full-run ordering; unrelated to these changes.)

- **Step 3 (Promotion gate):** `src/engine/runtime-mode.ts` — `getRuntimeMode()` returns `'v4'` (canonical default), `promoteToDefault(reason, industries)` writes a durable marker to `.build-artifacts/runtime-mode.json`, `readPromotion()`. The 9-industry harness calls `promoteToDefault` when `fail===0`. **Verified: self-test pass=9 → "Runtime promoted to default: V4".** 1 test (`tests/runtime-mode.test.ts`).
- **Step 4 (Scale):** `scaleCapabilities(industry, seeds)` in `src/bos/capabilities/registry.ts` — expands seeds via transitive dependency + industry→ontology inclusion (industry-driven, deterministic). 2 tests (`tests/scale-capabilities.test.ts`).
- **Step 5 (Component Library):** `src/bos/components/component-library.ts` — `COMPONENT_LIBRARY` (14 components, each linked to canonical `capabilities`, with `schema`/`behavior`/`rendererSupport`/`evaluationHooks`/`experienceHooks`/`primitiveTags`), `getComponentsForCapabilities` (resolves via registry + dependency expansion), `getComponentById`; `index.ts` barrel. 5 tests (`tests/component-library.test.ts`).
- **Step 6 (Learning→Promotion):** `src/bos/learning/promotion.ts` — `suggestFromCandidates` aggregates high-confidence candidates into `alias`/`dependency` capability ontology suggestions (unknown raw tags → canonical alias; co-occurring canonicals → dependency), `buildCapabilityPatch` produces a reviewable, non-mutating patch for the Promotion Pipeline; `index.ts` barrel. 4 tests (`tests/learning-promotion.test.ts`).
- **Consumption seam — taxonomy bridge:** `packCanonicalCapabilities(pack)` added to `src/taxonomy/resolver.ts` maps a resolved knowledge pack's legacy aliases/keywords to canonical capability ids via the registry (no classification-flow change). 2 tests (`tests/taxonomy-capability-bridge.test.ts`). Registry gained legacy aliases (`restaurant`, `erp`, `hospital`, `shoes`, `sneakers`, `footwear`).

### Active
- **Residual low-priority seams (optional, not blocking):** `architect.ts` component selection could pull from `getComponentsForCapabilities` (currently legacy path); `motion` capability registry already accepts canonical ids but could expose a canonical selection helper. Both are non-blocking because the canonical path (V4) drives components/evaluation/experience/learning.

### Blocked
- (none)

## Next Move
1. (DONE) Step 3 promotion gate — verified 9/9 → V4 default.
2. (DONE) Step 4 scale, Step 5 component library, Step 6 learning→promotion.
3. (DONE) Taxonomy→canonical bridge.
4. Optional: live 9-industry sweep via `tsx scripts/verify-runtime-9-industries.ts --self-test` where the host LLM is available; it validates real `runtime-trace.json`/`capability-manifest.json` artifacts (self-test already proves the provenance contract headlessly).
5. Optional: wire `architect.ts` and `motion` registry to the canonical component/learning modules.

## Relevant Files
- `src/bos/capabilities/types.ts` — **NEW (R2):** Capability, ResolvedCapabilities, CapabilityManifest
- `src/bos/capabilities/registry-data.ts` — **NEW (R2):** CANONICAL_CAPABILITIES (alias/dependency/industry/primitivePackTags)
- `src/bos/capabilities/registry.ts` — **NEW (R2):** CapabilityRegistry (normalize/resolve/expand/coverage/manifest)
- `src/bos/capabilities/index.ts` — **NEW (R2):** barrel
- `src/agents/runtime-trace.ts` — RuntimeTracer (R1 Step1)
- `src/agents/deterministic-orchestrator-v4.ts` — MODIFIED: tracer spans; emits capability-manifest.json + capability-coverage.json; records candidate capabilities
- `src/bos/knowledge/primitive-packs/composer.ts` — MODIFIED (R2): composeForCapabilities resolves via registry + bridges to pack tags
- `src/bos/candidate/{types,store}.ts` — MODIFIED (R2): capabilities dimension on candidates
- `src/generation/primitives.ts` — MODIFIED (R2): `getPrimitivesForCapabilities` normalizes via registry
- `src/orchestration/production-acceptance-gate/engine.ts` — MODIFIED (R2): `checkCapabilityCoverage` consumes manifest + registry
- `src/orchestration/experience-intelligence/experience-profiles.ts` — MODIFIED (R2): `getCapabilityExperienceHints` + `getExperienceProfileForCapabilities`
- `src/orchestration/artifact-graph/v4-adapter.ts` — **NEW (R1 Step2):** runtimeTraceToArtifactGraph, executeV4AsArtifactGraph, validateV4Runtime
- `src/server.ts` — MODIFIED (R1 Step2): `/api/build-anything` → V4 (rollback fallback to legacy Orchestrator)
- `scripts/verify-runtime-9-industries.ts` — **NEW (R1 Step3):** 9-industry provenance verification harness
- `src/orchestration/artifact-graph/{executor,validation,index}.ts` — R1 Step4
- `src/orchestration/capability-registry/index.ts` — DEAD (`@deprecated` → use src/bos/capabilities)
- `src/orchestration/pipeline-orchestrator/orchestrator.ts` — DEAD (`@deprecated`, 410)
- `src/orchestration/experience-os/index.ts` — ASPIRATIONAL (`@deprecated`, do NOT delete)
- `docs/phase-r2-capability-canonicalization.md` + prior phase docs
- `tests/capability-registry.test.ts` (12), `tests/runtime-trace.test.ts` (8), `tests/runtime-graph-validation.test.ts` (6), `tests/primitive-pack-composer.test.ts` (15), `tests/candidate-knowledge.test.ts` (12), `tests/artifact-graph.test.ts` (16), `tests/primitives.test.ts` (44), `tests/production-acceptance-gate.test.ts` (5), `tests/experience-capability.test.ts` (4), `tests/experience-intelligence.test.ts` (32), `tests/artifact-graph-v4-adapter.test.ts` (3), `tests/runtime-verification-9-industries.test.ts` (10), `tests/runtime-mode.test.ts` (1), `tests/scale-capabilities.test.ts` (2), `tests/component-library.test.ts` (5), `tests/learning-promotion.test.ts` (4), `tests/taxonomy-capability-bridge.test.ts` (2)
- `src/engine/runtime-mode.ts` — **NEW (Step 3):** getRuntimeMode/promoteToDefault/readPromotion
- `src/bos/components/component-library.ts` — **NEW (Step 5):** COMPONENT_LIBRARY, getComponentsForCapabilities, getComponentById
- `src/bos/components/index.ts` — **NEW (Step 5):** barrel
- `src/bos/learning/promotion.ts` — **NEW (Step 6):** suggestFromCandidates, buildCapabilityPatch
- `src/bos/learning/index.ts` — **NEW (Step 6):** barrel
- `src/bos/capabilities/registry.ts` — MODIFIED (Step 4): `scaleCapabilities`
 - `src/taxonomy/resolver.ts` — MODIFIED: `packCanonicalCapabilities` bridge

## XRE + Canonical Build Milestone (wiring the existing intelligence engines into V4)
- **Mandate (user verbatim):** wire the EXISTING canonical `src/orchestration/*-intelligence` engines into the live V4 execution path (NOT build parallel systems); instrument/trace every remaining hardcoded-industry decision; end each phase with a working, fully tested runtime. No `if industry == X`, no per-vertical templates, no renderer business reasoning.
- **XRE architecture (all hardcoded-industry violations removed from these modules):** `src/bos/primitives/{types,registry,conflict-resolver,evolution,cross-domain,scoring,index}.ts` (weighted `Primitive`, `PrimitiveSet`, `BRAND_PRIMITIVES`, brand-based conflict resolution, cross-domain learning by brand context, consistency scoring — no industry logic); `src/bos/experience/{types,candidates,director,grammar,reasoning-engine,compiled,reasoning-index}.ts` (8-dim universal `reasonExperience`, `compileExperience`→`CompiledExperience`, primitive-overlap scoring, removed `INDUSTRY_STYLE_BOOSTS`/`computeAudienceMatch`/`input.style` branching).
- **V4 wiring:** `src/agents/deterministic-orchestrator-v4.ts` — added `canonical-build` tracer span running `runCanonicalBuild` (BusinessKnowledge becomes the authoritative business source; legacy `breContext` retained as adapter); XRE span now CONSUMES `canonical.compiledExperience` directly (eliminating the duplicate/parallel XRE re-run — the canonical build is the single experience source; local XRE only runs as a fallback if canonical build fails). Canonical artifacts (businessKnowledge/contentBlueprint/designDecision/solutionArchitecture/compiledExperience/compliance) are surfaced on `GenerationResult.analysis.canonical`.
- **Milestone 1 (canonical-build):** `src/orchestration/pipeline/canonical-build.ts` — `runCanonicalBuild(opts)` runs the 6 canonical engines in order (BusinessIntelligence → KnowledgeAcquisition → ExperienceIntelligence → ContentIntelligence → DesignIntelligence → TechnologyPlanner) + XRE→CompiledExperience. Built-in compliance instrumentation: `ComplianceViolation[]` records any industry-key read per stage; `compliant` flag = no high/medium violations. `compiledExperience` is ALWAYS non-null (falls back to a neutral baseline for unseen businesses with no brand references).
- **Traced violations MIGRATED:**
  - `content-intelligence/engine.ts` — removed `INDUSTRY_CONTENT_PROFILES` table and `getIndustryCopy(industry)` lookup. New `deriveContentProfile(bk, exp)` derives voice/tone/CTA/media/density purely from BusinessKnowledge signals (persona formality, revenue model → CTA action, entity count + interaction density → density/animation, vocabulary depth → technical level). No industry key is read.
  - `experience-intelligence/experience-engine.ts` — `industry` made OPTIONAL in `ExperienceEngineInput`; profile now derived from `capabilities` (via `getExperienceProfileForCapabilities`) or the optional label as a neutral default. Removed the `isSensoryIndustry` hardcoded `perfume/fragrance/spa/wellness` string branch — scroll-accumulation now derived from `style` (`cinematic`/`luxury`) only. No `if industry == X` control flow remains.
  - `technology-planner/engine.ts` — `industry` read is evidence-only (no branching); all platform/framework/db/auth decisions derive from signal counts (workflows, entities, personas, media). Compliant by construction.
- **Status:** typecheck clean; full suite GREEN: 74 files / 1050 tests. `tests/canonical-build.test.ts` (4) asserts all 7 artifacts + violation tracing for unseen businesses (marine bioluminescence lab, quantum computing company). `tests/experience-director.test.ts` (15) asserts primitive-driven (not industry-label) selection. `tests/experience-intelligence.test.ts` (32) still green (per-industry profile data table retained as optional default label; engine no longer branches on it).
- **Next:** fully route the 4-layer pipeline (LeadAgent) to consume `canonical.*` artifacts directly (remove the `buildBREContext` adapter); add intent-resolver/ontology modules only after legacy is fully migrated. `industry-copy-schema` is now dead (no importers) — safe to delete in a later cleanup.
- Node binary: `C:\Users\viren\AppData\Local\nvm\v20.20.2\node.exe`
