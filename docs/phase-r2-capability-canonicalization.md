# Phase R2 — Capability Canonicalization

**Status:** Core registry + resolver + manifest + primitive-pack wiring + candidate
capability dimension complete. Evaluation/components/experience full rewiring is the
next incremental step (they now consume the registry where seams exist).
**Goal:** ONE capability identity. Every subsystem references canonical ids
(e.g. `commerce.checkout`) instead of ad-hoc tags (`checkout`, `payments`, `cart`,
`purchase`, `commerce`).

## Why
The codebase had **9 competing capability vocabularies** (business `CAPABILITY_REGISTRY`,
primitive-pack tags, skill-pack `capability`, dead page-level `capability-registry`,
motion registry, BI workflow signals, AppFamily, taxonomy legacy, `CapabilitySchema`).
No single identity → cannot scale (would create duplicate capabilities per spelling).

## What was built
- `src/bos/capabilities/types.ts` — `Capability` (id, displayName, aliases, domain,
  parents, children, dependencies, requiredEntities/Workflows/Components/Evaluators/
  Experience, rendererSupport, industries, primitivePackTags), `ResolvedCapabilities`,
  `CapabilityManifest` (`capability-manifest@1`).
- `src/bos/capabilities/registry-data.ts` — `CANONICAL_CAPABILITIES`: a curated,
  dot-namespaced set spanning commerce / food / booking / crm / erp / healthcare /
  notifications / content / auth / membership / subscriptions / analytics / social.
  `aliases` fold the legacy vocabularies; `primitivePackTags` bridge to legacy packs;
  `industries` drive industry → capability expansion; `dependencies` form the graph.
- `src/bos/capabilities/registry.ts` — `CapabilityRegistry` with:
  - `normalize(raw)` → canonical id (folds every legacy alias)
  - `resolve(inputs, { industry })` → canonical ids + **transitive dependency expansion**
    + industry expansion; returns `unknown` for unresolvable tags
  - `primitivePackTagsFor(ids)` → legacy pack tags to activate
  - `coverageScore(requiredExpanded, fulfilled)` → fraction covered (feeds the
    production acceptance gate's `capabilityCoverage` check)
  - `buildManifest(inputs, { industry })` → `CapabilityManifest`
  - singleton `capabilityRegistry` + `resolveCapabilities()` convenience
- `src/bos/capabilities/index.ts` — barrel export.

## How it is consumed (single vocabulary)
- **Knowledge Packs:** `composeForCapabilities` (primitive-packs/composer.ts) now
  routes requested capabilities through `capabilityRegistry.resolve` + `primitivePackTagsFor`
  before pack lookup — legacy pack graph now driven by canonical ids.
- **Build Manifest:** `DeterministicOrchestratorV4.handleBuildIntent` emits
  `.build-artifacts/capability-manifest.json` (the contract for evaluation, components,
  experience, renderer, learning, benchmarking, self-healing) and
  `.build-artifacts/capability-coverage.json`.
- **Learning improves capabilities (not just industries):** `CandidateKnowledge` /
  `CandidateObservation` / `CandidateSubmission` gain a `capabilities?` dimension;
  `candidateSignature` scopes records by capability; V4 records the build's resolved
  capabilities on every candidate. A `checkout` improvement now propagates to every
  business that uses `commerce.checkout`.
- **Dead registry deprecated:** `src/orchestration/capability-registry/index.ts` marked
  `@deprecated` (page/section-level, never imported) → canonical source is `src/bos/capabilities`.

## Remaining (incremental, each consumes the registry)
- **Evaluation by capability:** route `production-acceptance-gate` `coverageScore` from
  the manifest (helper exists); add per-capability evaluators keyed by canonical id.
- **Experience by capability:** `experience-engine.getExperienceProfile(industry)` →
  capability-driven profile join.
- **Components by capability:** `primitives.getPrimitivesForCapabilities` / `architect.ts`
  consume canonical ids.
- **Ontology → capabilities:** `taxonomy/resolver` + AppFamily emit canonical ids.

## Tests
`tests/capability-registry.test.ts` (12): alias normalization, transitive dependency
expansion, industry expansion, parents/children derivation, primitive-pack bridge,
coverageScore, manifest shape, dataset integrity (unique ids, no dangling deps).
