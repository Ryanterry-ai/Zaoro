# Anchored Session Summary — build-same-engine (Experience Intelligence Engine)

## Objective
- Build a deterministic AI web application engine (`build-same-engine`) that takes a user prompt and produces a fully functional web app with real, industry-specific content — wired through an orchestrator-subagent system → BRE v2 → scraping → content validation → design intelligence → Experience Intelligence → Solution Architecture Planning → rendering → preview.
- **User directive (critical)**: Everything must be dynamic. Prompt analysis must extract business type, user personas, revenue flow, customer flow, payment methods, business workflow, KPIs. Scraped data from real businesses must flow through to seed files, UI content, and all generated artifacts. Nothing hardcoded.
- **Earlier directive**: Build an **Experience Intelligence Engine** — a new architectural layer that transforms Build.Anything from a page generator into an experience generator. Produces `ExperienceBlueprint` with scroll storytelling, motion, hover, micro-interactions, scene orchestration, emotional pacing. Must integrate into existing architecture, never duplicate engines.
- **Earlier directive (prior session)**: Complete all remaining Experience Intelligence deliverables (renderer integration, benchmark suite, E2E tests, design-lineage provenance, type fixes) and fix the pre-existing `react-renderer.ts` `ColorRecommendation` type gap so `tsc` is clean across the experience engine + renderer.
- **Latest directive (this session)**: Run the real `runBuildPipeline(breContext, config)` test suite, check output for issues, and ensure nothing blocks the build or the real result output after completion.

## Important Details
- `tsconfig.json` has `exactOptionalPropertyTypes: true`
- Node.js at `C:\Users\viren\AppData\Local\nvm\v22.23.1` — must set `$env:PATH` prefix for all shell commands
- **Test infrastructure**: `vitest.config.ts` has `testTimeout: 30_000`, `hookTimeout: 120_000`
- **framer-motion IS in scaffoldWorkspace() deps** (`engine.ts`) and in `renderPackageJson()` (`react-renderer.ts`)
- **Industry type** includes: `ecommerce`, `saas`, `fintech`, `healthcare`, `education`, `restaurant`, `fitness`, `real-estate`, `media`, `portfolio`, `marketplace`, `nonprofit`, `other`
- **Experience Intelligence pipeline position**: DesignDNA → Design Intelligence → **Experience Intelligence** → Renderer (Layer 3b in build-pipeline.ts)
- **Pre-existing `tsc` errors (UNRELATED to our work)**: 4 errors in `scripts/test-all-domains.ts`, `scripts/test-domain-patch.ts`, `scripts/verify-generation-layer.ts` (cannot find `../src/generation/compiler-pipeline.js`) and `tests/design-dna.test.ts` (`IntentDNA` not exported from `design-dna.js`). These existed before this session and are not in the generation/renderers or design-intelligence files we touched.
- **`src/orchestration/experience-engine.ts`** is the OLD metrics tracker (`PipelineOutcome`, `recordOutcome`), NOT the new Experience Intelligence Engine.
- **User's `result.blueprint` note was from `/home/claude/zaoro-audit`** (different machine/dir). In THIS repo, `PipelineResult` has NO top-level `.blueprint`; the blueprint is nested at `result.breResult.blueprint`, and the Experience Intelligence blueprint is `result.experienceBlueprint`. All real test suites already use this correct shape.
- **`src/orchestration/design-intelligence/types-experience.ts`** is the new Experience Intelligence type module (ExperienceBlueprint, ExperienceStyle, NarrativeRole, etc.).

## Work State
### Completed (prior sessions)
- **GAP 1-4 + Runtime Influence Audit**: DesignDNA→Rendering semantic CSS vars; ComponentEngine→ReactRenderer wiring; Framer Motion patterns; UI/UX Pro Max library; skillRecommendations in RenderContext
- **Task 1-5 + Phase 6a-c**: scraped data wiring, worktree dedup, agent feedback, industry templates, smoke test verification, business name extraction, hero subtitle safety, icon rendering
- **EXPERIENCE INTELLIGENCE ENGINE**: all sub-modules (types-experience, experience-profiles, scene-planner, scroll-narrative, hover-intelligence, motion-language, experience-engine orchestrator + validation)
- **Pipeline wiring**: Layer 3b in build-pipeline.ts; `experienceBlueprint` in RenderContext + PipelineResult; forward-declared before designLineage (fixed TDZ); null-guarded post-gen logging
- **Deep renderer integration**: `resolveCurrentScene()`, `resolveHoverProps()` (14 strategies), expanded `resolveAnimationProps()` to 20+ motion types consuming scene config, `resolveStaggerProps()`, `resolveChildMotion()`, `resolveParallaxLayer()`; buttons → `<motion.a>`; card hover
- **design-lineage provenance**: `experience: string` added to `DesignLineage`; pipeline sets `'experience-intelligence'` after Layer 3b
- **Validation relaxed**: missing hook/CTA and <3 scenes are warnings; zero scenes and all-motion-none remain fatal
- **E2E test** (`tests/experience-intelligence-e2e.test.ts`, 5 tests) and **Benchmark suite** (`tests/experience-benchmark.test.ts`, 10 industries + verdict writer → `audit-output/experience-benchmark-*.json`, 9 PASS / 1 WARN) and **type fixes** (invalid enum values across 4 engine files; `ColorRecommendation` extended in skill-integrator.ts)

### Completed (this session — Business Intelligence Engine, Layer 1)
- **Built the canonical Business Intelligence Engine** (Layer 1 of the 5-layer upstream-intelligence architecture) — the single source of truth for business understanding, replacing vertical-keyword lookup with primitive reasoning:
  - **Canonical model** (`types.ts`): `BusinessKnowledge` with all required sections — `BusinessDiscovery`, `CustomerPersona[]`, `BusinessPersona[]`, `UserRole[]`, `CustomerJourney`, `BusinessWorkflow[]`, `RevenueFlow`, `AcquisitionChannel[]`, `RetentionModel`, `ComplianceRequirement[]`, `Kpi[]`, `BusinessEntity[]`, `EntityRelationship[]`, `RequiredPage[]`, `RequiredDashboard[]`, `Automation[]`, `Integration[]`, `BusinessVocabulary`, `ContentStrategy`, `DesignStrategy`, `ExperienceGoals`, plus `KnowledgeSource` for extensibility.
  - **Primitive signal extraction** (`dimensions.ts`): 8 orthogonal dimensions (product-nature, channel, fulfillment, monetization, audience, goal, quality, locale) with concept lexicons. Normalized token matching (`normalizeToken` strips inflections: `supplying→supply`, `cafes→cafe`, `teams→team`) avoids substring false positives (`booking≠book`, `teams≠tea`). Collision-prone noun `book` removed from physical-good lexicon.
  - **Shape composition** (`archetypes.ts`): Business type labels composed from primitives — e.g., `beverage+wholesale→Roastery`, `beverage+subscription→Subscription Coffee`, `beverage+dine-in/takeaway→Cafe`, `service+appointment+health-terms→Clinic`. Fallback derives base label from product-nature (beverage→Cafe, food→Restaurant, service→Service, software→Platform, content→Publication) so plain "coffee website" resolves to `Coffee Cafe` without any coffee template.
  - **Full derivation engine** (`engine.ts`): All downstream sections (personas, journey, workflows, revenue, growth, compliance, KPIs, entities, pages, dashboards, automations, integrations, vocabulary, content/design/experience strategy) derived from primitives. Goal inference adds `sell-products` when product-nature is sellable, so vague prompts still yield `Order`/`Product` entities.
  - **Adapters** (`adapters.ts`): Legacy-compat helpers (`toVocabulary`, `toCapabilities`, `toPagePaths`, `toCompliancePacks`, `summarize`).
  - **Pipeline wiring**: `BREContext.businessKnowledge?` (rules-engine), attached in `buildBREContext` (intake-parser), surfaced in `RenderContext` + `PipelineResult` (renderer + build-pipeline). Zero breaking changes — legacy fields (`industry`, `capabilities`, `journeys`, `entities`, …) preserved.
  - **Tests** (`tests/business-intelligence.test.ts`): 9 passing tests proving vertical-agnostic reasoning — coffee resolves to `food-and-beverage` + `Cafe` (not `restaurant`); roastery/subscription/marketplace discriminated from primitives; clinic recognized via health terms + appointment; SaaS as `software`; same `product-nature=beverage` fires for coffee AND juice bar; entities are generic (`Product`, `Order`) with no coffee-specific hardcoded content; vocabulary uses user's own noun ("coffee") + primitive mapping (`product→menu item`).
- **Architecture doc** (`docs/architecture/business-intelligence-engine.md`) and **migration plan** (`docs/architecture/business-intelligence-migration.md`) written.

### Completed (this session — real build + preview)
- **Real build run** via `scripts/run-build-once.ts` (tsx) on prompt "build me a modern coffee website for Indian customers":
  - Created `sandbox_workspaces/ws-coffee-1783676175711` (55 files, Next.js app, 11 pages, 4 entities, 2 scenes / 4 hover behaviors)
  - `npm install` succeeded (120 pkgs); `next dev -p 3001` started ("Ready in 25.3s")
- **BUG FIX 1 — `0.20s` invalid JS duration** (`react-renderer.ts`): `resolveHoverProps` (line 900) and `resolveAnimationProps` (line 961) built `dur`/`sceneDur` as `\`...toFixed(2)}s\`` → injected `duration: 0.20s` (syntax error → 500 on CTASection). Fixed to bare number `0.20`. Regenerated workspace + dev server hot-reloaded → HTTP 200.
- **BUG FIX 2 — `text-foreground0` typo** (invalid Tailwind class) across renderer + templates: literal `text-foreground0` should be `text-muted-foreground`. Bulk-fixed in 5 source files (`react-renderer.ts` + `templates/{content,ecommerce,restaurant,saas}.ts`) and 7 generated workspace files. Verified 0 bad-class hits in served HTML.
- **Preview confirmed live**: `http://localhost:3001` returns 200, renders navbar/hero/features/testimonials/CTA/footer with `whileInView` + `motion.a` (blueprint motion active), no `@21st-dev`, no `0.20s`, no `text-foreground0`.
- **Content-quality gaps identified (NOT yet fixed)** — violate the "real, industry-specific, non-generic" directive:
  1. **Coffee → restaurant misclassification**: prompt mapped to `restaurant`, so features are *Farm-to-Table, Curated Wine List, Live Music, Valet Parking* (no coffee-specific content like Single Origin / Cold Brew / Barista). No dedicated cafe/coffee vertical or coffee template set.
  2. **Hero badge bug**: renders `"me modern coffee - restaurant"` — the prompt chunk "build **me a** modern coffee" is mangled into the badge label (extraction bug in hero badge generation).
  3. **Generic testimonial copy**: `"TableIndia transformed how we handle direct sales"` reads like SaaS, not coffee; personas "Indian consumer"/"Price-sensitive buyer" are generic.

### Active
- (Business Intelligence Engine Layer 1 complete with tests + docs)
- (content-quality gaps above — classification + badge extraction + testimonial copy)

### Blocked
- (none)

## Next Move
- The Business Intelligence Engine (Layer 1) is now the foundation. Next upstream layers per the architectural priority:
  1. **Knowledge Acquisition Engine** (Layer 2) — wire OpenClaw Ultra Scraper + other sources to feed `BusinessKnowledge.sources` / enrich primitives with real competitor data, market vocab, layout patterns.
  2. **Component Intelligence Engine** (Layer 4) — replace fixed industry template sets (`templates/*.ts`) with dynamic component assembly from `BusinessKnowledge.workflows` + `pages` + `entities`.
  3. **Renderer** (Layer 5) — migrate to read `BusinessKnowledge.vocabulary` + `pages` + `designStrategy` instead of hardcoded templates.
- Content-quality fixes for the coffee preview: (a) verify Business Intelligence Engine already produces `Cafe` for "coffee website" (it does — confirmed by debug), then ensure downstream layers consume it; (b) fix hero-badge extraction; (c) make testimonials derive from `BusinessKnowledge.contentStrategy` + `customerPersonas`.
- Source fixes (0.20s, text-foreground0) ensure future `runBuildPipeline` builds are clean; re-run `pipeline-smoke` + `experience-intelligence-e2e` to confirm no regression.
- Pre-existing `tsc` errors in `scripts/` (compiler-pipeline.js missing) and `tests/design-dna.test.ts` (IntentDNA) remain — separate effort.

## Relevant Files
- `src/generation/build-pipeline.ts` — `runBuildPipeline(breContext, config)` entry point; `PipelineResult` interface (line 89): `breResult` (has `.blueprint`), `executionBlueprint`, `applicationSpec`, `renderResult`, `experienceBlueprint?`, etc. Layer 3b wired; `componentSourcesFromEngine` extracted from designDecision.recommendations
- `src/generation/renderers/renderer.ts` — `RenderContext` (has `componentSources?`), `ComponentSourceRec` (source: 'custom'|'21st'|'shadcn'), `PipelineResult` (has `experienceBlueprint?`, `breResult`); `DesignLineage` (has `experience: string`)
- `src/generation/renderers/react-renderer.ts` — **FIXED this session**: removed `externalPackages` field + merge loop, removed external `@21st-dev` import wrapper, removed `sourceRec` lookup in `renderComponent`, dropped `ComponentSourceRec` import. Components now always generate inline/self-contained. Deep blueprint integration (`resolveCurrentScene`, `resolveHoverProps`, expanded `resolveAnimationProps`, `resolveStaggerProps`, `resolveChildMotion`, `resolveParallaxLayer`, `<motion.a>` buttons) retained.
- `src/orchestration/design-intelligence/types-experience.ts` — All Experience Intelligence types
- `src/orchestration/design-intelligence/experience-profiles.ts` — Per-industry profiles
- `src/orchestration/design-intelligence/scene-planner.ts` — Section→Scene conversion
- `src/orchestration/design-intelligence/scroll-narrative.ts` — Narrative structure
- `src/orchestration/design-intelligence/hover-intelligence.ts` — 14 hover strategies
- `src/orchestration/design-intelligence/motion-language.ts` — Motion timeline + micro-interactions
- `src/orchestration/design-intelligence/experience-engine.ts` — Orchestrator + validation (relaxed: missing hook/CTA and <3 scenes = warnings)
- `src/generation/skill-integrator.ts` — `ColorRecommendation` extended with optional semantic fields (card/muted/border/ring/etc.)
- `tests/experience-intelligence.test.ts` — 32 tests, pass
- `tests/experience-intelligence-e2e.test.ts` — 5 tests, pass (run verified this session)
- `tests/experience-benchmark.test.ts` — 10 industries + verdict writer, pass
- `tests/pipeline-smoke.test.ts` — **11/11 pass** (was 4 failing on `@21st-dev`; fixed this session)
- `tests/experience-engine.test.ts` — 15 tests, pass
- `tests/runtime-influence-audit.test.ts` — 20 tests, pass
- `tests/definitive-3-tests.test.ts` — 3 tests, pass
- `tests/assembly-gate.test.ts` — 9 tests, pass
- `tests/bre-v2-pipeline.test.ts` — 4 tests, pass
- `audit-output/experience-benchmark-*.json` — 10 verdict files (9 PASS, 1 WARN)
