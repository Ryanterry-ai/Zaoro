---
name: orchestrator
description: Entry point that routes clone vs generative vs hybrid pipeline and sequences all steps
bucket: A
reason: Deterministic routing logic; no LLM calls
---

# Orchestrator

## Role
Single entry point for every build request. Reads the user input, selects the pipeline variant (clone, generative, or hybrid), and sequences every downstream skill in the correct order. Nothing else starts until Orchestrator emits a step plan.

## Process
1. Parse user input. Classify as:
   - **Clone** — input contains a URL, no business description.
   - **Generative** — input contains a business description, no URL.
   - **Hybrid** — input contains both URL and business description.
2. Emit `PipelinePlan` JSON listing every step, its skill name, bucket assignment, and dependency list.
3. Execute steps in dependency order. Steps with no inter-dependencies run in parallel.
4. Gate every transition: the previous step's output must exist on disk and pass schema validation before the next step starts.
5. On any step failure, halt the pipeline and report the failing step name and error.

## Pipeline Steps — Clone Path
1. `crawl-site` — discover URL graph from source.
2. `extract-design-tokens` — headless CSS extraction per page.
3. `localize-assets` — download and rename all media.
4. `data-model-extractor` — structured data extraction from scraped content.
5. `moodboard-director` — visual world definition from extracted tokens.
6. `skill-integrator` — map sections to component libraries.
7. `component-spec-writer` — produce locked spec per page.
8. `parallel-builder` — generate component code, one per invocation.
9. `state-weaver` — generate App.tsx with shared state.
10. `content-generator` — produce real page copy (if source text cannot be reused).
11. `build-orchestrator` — assembly + quality gates.
12. `deploy-target-selector` — tier selection.

## Pipeline Steps — Generative Path
1. `business-reasoning/orchestration` — run 19 business-reasoning agents in sequence.
2. `moodboard-director` — visual world definition from business brief.
3. `skill-integrator` — map sections to component libraries.
4. `component-spec-writer` — produce locked spec per page.
5. `parallel-builder` — generate component code.
6. `state-weaver` — generate App.tsx with shared state.
7. `content-generator` — generate page copy from structured briefs.
8. `build-orchestrator` — assembly + quality gates.
9. `deploy-target-selector` — tier selection.

## Pipeline Steps — Hybrid Path
1. `crawl-site` → `extract-design-tokens` → `localize-assets` — clone pipeline for design/structure inspiration only.
2. `business-reasoning/orchestration` — generative pipeline for business logic and content.
3. `moodboard-director` — merge clone-derived tokens with generative brief.
4. Continue as generative path from step 3 onward.
5. **Never** copy competitor text, prices, or proprietary content verbatim.

## Input
- `userRequest`: raw user message containing URL, business description, or both.
- `projectDir`: working directory for the build.

## Output
- `pipeline.json` — the ordered step plan with statuses.
- Directory scaffold under `projectDir` with subdirectories: `src/`, `content/`, `assets/`, `specs/`.

## Rules
1. No step may be skipped. The pipeline is a fixed DAG; only the entry conditions change.
2. Bucket A skills are run by the orchestrator directly. Bucket B skills are invoked one-component-at-a-time.
3. The orchestrator never writes component code. It delegates to `parallel-builder`.
4. A step's output schema is validated against `schemas/` before any downstream step runs.
5. If a step fails, the pipeline halts. No partial builds are shipped.
