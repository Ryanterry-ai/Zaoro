# Build-Engine Audit Report

**Generated:** 2026-06-27  
**Phase:** 1 — Static Audit (read-only)  
**Scope:** Full codebase scan for Bucket A/B violations, adapter leakage, orchestration duplication, gate enforcement, template integrity

---

## Executive Summary

| Severity | Count |
|----------|-------|
| **Critical** | 4 |
| **High** | 7 |
| **Medium** | 5 |
| **Low** | 3 |

**Bottom line:** The system has strong deterministic foundations (all 10 tools are pure Bucket A, BOS reasoning engine exists), but the runtime pipeline **does not wire the SKILL.md agents into execution**. Instead it runs a parallel `pipeline-orchestrator.ts` that makes 15+ unscoped LLM calls per build. The adapter (`skills/_adapter`) **does not exist** — LLM calls are scattered across `LLMGateway` and `BILLMCaller` with no central guardrail, no per-call logging, and no `taskType` taxonomy enforcement.

---

## 1.1 — Skill Classification (Bucket A vs B)

### Pipeline Skills (13 files, `skills/`)

| Skill | Bucket (declared) | Tasks | Classification | Finding |
|-------|-------------------|-------|----------------|---------|
| `orchestrator` | A | route clone/generative/hybrid → emit PipelinePlan → execute steps in dependency order → gate transitions | A (routing), A (plan emission), A (execution), A (gating) | ✅ No LLM for Bucket A |
| `build-orchestrator` | A | assembly → dep check → lint → typecheck → build → content validation → source audit | All A | ✅ No LLM |
| `skill-integrator` | A | read visual-dna + specs → lookup table mapping → write component-manifest | A (lookup) | ✅ No LLM |
| `crawl-site` | A | receive URL → invoke tools/crawler → keyword classify URLs → dedupe → write crawl-map | A (crawler call), A (classification), A (dedupe) | ✅ No LLM |
| `extract-design-tokens` | A | read crawl-map → headless browser per page → tools/token-extractor → aggregate → write tokens.json | A (browser), A (extraction), A (aggregation) | ✅ No LLM |
| `localize-assets` | A | read crawl-map + scraped HTML → extract asset refs → download → rename → write asset-manifest → rewrite refs | A (extraction), A (download), A (rename), A (rewrite) | ✅ No LLM |
| `deploy-target-selector` | A | read project-config → table lookup → write deploy-target.json | A (table lookup) | ✅ No LLM |
| `state-weaver` | A | read component-manifest + visual-dna → template fill App.tsx + contexts | A (template) | ✅ No LLM |
| `data-model-extractor` | B | read scraped/ → 1 LLM call per data type → validate schema → write content/{type}.json | B (LLM per type) | ✅ Bucket B scoped to 1 call per data type |
| `content-generator` | B | read component-manifest + visual-dna → 1 LLM call per page → validate → write content/pages/{page}.json | B (LLM per page) | ✅ Bucket B scoped to 1 call per page |
| `parallel-builder` | B | receive 1 section spec + VisualDNA + data → 1 LLM call → write 1 component file | B (LLM per component) | ✅ Bucket B scoped to 1 component |
| `moodboard-director` | B | receive tokens/brief → 1 LLM call → write visual-dna.json | B (LLM per build) | ✅ Bucket B scoped to 1 global artifact |
| `component-spec-writer` | B | read crawl-map + tokens + scraped HTML → 1 LLM call per page → write specs/{page}.json | B (LLM per page) | ✅ Bucket B scoped to 1 page |

**1.1 Findings:**  
- No Bucket A skill instructs LLM usage — **all clean**  
- All Bucket B skills scope LLM calls to single units (page/component/data type) — **all clean**  
- ⚠️ **Medium**: `moodboard-director` declares "one call per build" — technically a global artifact, but scope is still singular. Acceptable.

---

### Business-Reasoning Skills (20 files, `skills/business-reasoning/`)

| Skill | Bucket | Tasks | Classification | Finding |
|-------|--------|-------|----------------|---------|
| `business-research` | (none) | classify business type/model/industry → stakeholders → competitors → opportunities → risks → assumptions | B (judgment + web search) | ✅ Single cohesive analysis |
| `industry-intelligence` | (none) | org chart → departments → processes → roles → regulations → software → KPIs → integrations → canonical workflows | B (judgment + web search) | ✅ |
| `business-problems` | (none) | diff against canonical → walk departments → categorize → rank by severity | B (judgment) | ✅ |
| `customer-journey` | (none) | canonical stages → adapt → per-stage: action/touchpoint/data/risk/owner | B (judgment) | ✅ |
| `workflow-research` | (none) | pull workflows → linear steps → trigger/actor/system/state/exceptions → mark broken → handoffs | B (judgment) | ✅ |
| `revenue-model` | (none) | primary/secondary/upsell/cross-sell/recurring/indirect → systematization % → growth lever | B (judgment) | ✅ |
| `solution-generator` | (none) | per problem: propose system + right-size (MVP/P2/P3) → inventory → sequence | B (judgment) | ✅ |
| `ui-research` | (none) | choose 3–6 ref products → extract nav/layout/cards/spacing/motion/typography | B (judgment + web search) | ✅ |
| `ux-research` | (none) | drop-off risks → context of use → a11y scaled → interaction principles → simplicity flags | B (judgment) | ✅ |
| `design-research` | (none) | reconcile UI/UX → pick base system → tokens → archetypes → dark mode → motion defaults | B (judgment) | ✅ |
| `compliance` | (none) | pull regs → GDPR/DPDP/CCPA → PCI if payments → per-reg: requirements/entities/flows/controls | B (judgment + search) | ✅ |
| `database-generator` | (none) | collect entities → define fields/relations/enums/indexes/audit/perms/blob storage → Prisma schema | B (judgment) | ✅ |
| `website-architect` | (none) | confirm site recommended → derive pages from journey → per page: purpose/components/CTA/data/SEO → sitemap + nav/footer | B (judgment) | 🔴 **HIGH** — "design the full website architecture" and "per-page blocks" spans entire site (plural scope) |
| `mobile-app-architect` | (none) | confirm app recommended → standard screens → per screen: purpose/components/nav/offline/push → native vs cross | B (judgment) | 🔴 **HIGH** — "design the full mobile app architecture" spans all screens |
| `dashboard-generator` | (none) | pull roles → per role: widgets/charts/KPIs/alerts/drill-downs → limit 6–8 above fold | B (judgment) | ✅ Per-role scope |
| `integrations` | (none) | payment/comms/maps/CRM/logistics/tax/accounting/auth/infra → triggers/data flow/fallback | B (judgment) | ✅ |
| `automation` | (none) | collect exceptions/manual steps → trigger/action/integration/HITL → AI agent opportunities → ROI sequence | B (judgment) | ✅ |
| `reporting` | (none) | compile KPIs → calc/owner/target/frequency → standing reports → flag vanity | B (judgment) | ✅ |
| `content-strategy` | B | read business-plan → 1 LLM call → editorial voice + content types + SEO + page copy | B (LLM per build) | ✅ Scoped to 1 output |
| `orchestration` | (none) | scope engagement → run 19 agents in stages → assemble deliverable → offer next steps | A (routing) + B (assembly) | 🟡 **MEDIUM** — Hybrid: routing is deterministic (A) but final assembly requires LLM synthesis (B). Not declared in frontmatter. |

**1.1 Business-Reasoning Findings:**  
- 🔴 **HIGH (2)**: `website-architect` and `mobile-app-architect` scope LLM output to entire site/app (plural pages/screens). Should be decomposed into per-page / per-screen calls or restructured as Bucket A templates.
- 🟡 **MEDIUM (1)**: `orchestration` missing `bucket:` frontmatter and mixes A routing with B assembly.
- ⚠️ **LOW (17)**: Missing `bucket:` frontmatter on all other business-reasoning skills — implicit Bucket B but not auditable.

---

## 1.2 — Tool Adapter Leakage

**Tools scanned (10):** quality-gate, dependency-checker, content-validator, crawler, token-extractor, asset-downloader, screenshot-diff, schema-codegen, deploy-codegen, audit-log/check

| Tool | Imports Adapter? | LLM Calls? | Network to LLM Provider? | Verdict |
|------|-----------------|------------|--------------------------|---------|
| quality-gate | ❌ | ❌ | ❌ | ✅ Pure Bucket A |
| dependency-checker | ❌ | ❌ | ❌ | ✅ Pure Bucket A |
| content-validator | ❌ | ❌ | ❌ | ✅ Pure Bucket A |
| crawler | ❌ | ❌ | ❌ (Playwright to target site only) | ✅ Pure Bucket A |
| token-extractor | ❌ | ❌ | ❌ (Playwright to target site only) | ✅ Pure Bucket A |
| asset-downloader | ❌ | ❌ | ❌ (HTTPS to target site only) | ✅ Pure Bucket A |
| screenshot-diff | ❌ | ❌ | ❌ | ✅ Pure Bucket A |
| schema-codegen | ❌ | ❌ | ❌ | ✅ Pure Bucket A |
| deploy-codegen | ❌ | ❌ | ❌ | ✅ Pure Bucket A |
| audit-log/check | ❌ | ❌ | ❌ | ✅ Pure Bucket A |

**Critical Finding:** `skills/_adapter/` **does not exist** anywhere in the project. The adapter is entirely absent — no central LLM gateway, no `taskType` presets, no per-call logging. LLM calls are made directly via `fetch()` in `LLMGateway` and `BILLMCaller` with no guardrails.

---

## 1.3 — Orchestration Mapping & Duplication

### Call Graph Analysis

```
Top-level orchestrator (skills/orchestrator/SKILL.md)
    │
    ├── Classifies input: Clone / Generative / Hybrid
    │
    ├── Clone path:
    │   └── crawl-site → extract-design-tokens → localize-assets → component-spec-writer → moodboard-director → skill-integrator → parallel-builder → content-generator → build-orchestrator
    │
    ├── Generative path:
    │   └── (no business-reasoning agents listed in pipeline plan!)
    │
    └── Hybrid path:
        └── NOT IMPLEMENTED — no stage for hybrid in PipelinePlan
```

```
Business-reasoning orchestrator (skills/business-reasoning/orchestration/SKILL.md)
    │
    ├── Stage 0: business-research (business profiling)
    ├── Stage 1: industry-intelligence + business-problems (parallel)
    ├── Stage 2: customer-journey + workflow-research + revenue-model (parallel)
    ├── Stage 3: solution-generator + ui-research + ux-research + design-research + compliance (parallel)
    ├── Stage 4: website-architect + mobile-app-architect + dashboard-generator + database-generator (parallel)
    ├── Stage 5: integrations + automation + reporting (parallel)
    └── Stage 6: content-strategy → assemble deliverable
```

```
Pipeline Orchestrator (src/generation/pipeline-orchestrator.ts)
    │
    ├── IntentDNAExtractor → LLM call (intent parsing)
    ├── SkillIntegrator → getDesignRecommendations() (deterministic)
    ├── BuildMemory → check
    ├── BOS BRE v2 → RulesEngine + ConstraintSolver + Scorer + BlueprintCompilerV2 (deterministic)
    ├── DesignDNA (deterministic)
    ├── ResearchAgent (deterministic web scraping)
    ├── ReferenceScraper (deterministic)
    ├── FeatureEnricher → LLM call (component blueprints)
    ├── ArchitectAgent + DesignSystem (deterministic)
    ├── ComponentSourcer (deterministic)
    ├── AssetIntelligence + MotionEngine (deterministic)
    ├── DomainSynthesizer (deterministic template generation)
    ├── generateSectionWithLLM() → LLM call PER SECTION
    ├── generatePageWithLLM() → LLM call PER PAGE
    ├── UXEvaluator (deterministic)
    ├── BusinessValidator (deterministic)
    ├── AssemblyQA (deterministic)
    ├── QualityGates (deterministic)
    ├── Self-Correction Loop (max 3)
    ├── BrowserVerification (deterministic Playwright)
    ├── RepairLoop → LLM call per failure
    └── BuildMemoryStore (deterministic)
```

```
Deterministic Orchestrator V4 (src/agents/deterministic-orchestrator-v4.ts)
    │
    ├── FullStackArchitect.design() (deterministic)
    ├── FullStackCompilerPipeline.compile() (deterministic)
    ├── DBCompiler + APICompiler (deterministic)
    ├── BusinessIntelligencePipeline.run() → 8 LLM phases (BILLMCaller)
    ├── ContentResearchAgent.research() (deterministic web scraping)
    ├── gateway.generateAllPatchesCombined() → 1 LLM call for ALL pages
    ├── Per-page patch application
    ├── SelfHealingEngine.heal() → LLM call per error batch
    └── TypeScriptAuditor.audit() (deterministic)
```

### Duplication Findings

| Finding | Severity | Evidence |
|---------|----------|----------|
| **Two independent orchestrators** with different stage models, different LLM call patterns, and no shared routing logic | **Critical** | `skills/orchestrator` (PipelinePlan JSON) vs `src/generation/pipeline-orchestrator.ts` (15 stages) vs `src/agents/deterministic-orchestrator-v4.ts` (monolithic) |
| **Business-reasoning orchestrator never invoked** by either pipeline orchestrator or deterministic orchestrator | **Critical** | `pipeline-orchestrator.ts` has no import/reference to business-reasoning agents. `deterministic-orchestrator-v4.ts` calls `BusinessIntelligencePipeline` which is a SEPARATE 8-LLM pipeline, not the 19-agent SKILL.md system. |
| **Hybrid path (URL + description) not implemented** | **High** | `skills/orchestrator/SKILL.md` lists "Hybrid" as a classification but `pipeline-orchestrator.ts` has no hybrid stage; `build-queue.ts` only handles `pipeline: true/false` boolean. |
| **BI Pipeline is a third parallel LLM pipeline** (8 calls) that duplicates business-reasoning agent purposes | **High** | `BusinessIntelligencePipeline` covers: input analysis, competitor research, intent mapping, industry research, flow mapping, problem identification, solution design, architecture generation — nearly identical to business-research + industry-intelligence + business-problems + customer-journey + solution-generator + website-architect |

---

## 1.4 — Adapter "Any LLM" Claim

### Adapter Existence
**`skills/_adapter/` does not exist.** Not in repo, not referenced in any import.

### LLM Gateway Analysis

**`src/core/llm-gateway.ts`** (primary gateway):
- Single entry point? **No** — `BILLMCaller` in `src/business-intelligence/core/llm-caller.ts` is a completely separate gateway
- JSON validation/repair? Yes — `parseAndValidatePatches()` has fallback JSON extraction, but **silent retries** (no log of repair attempt as distinct adapter call)
- `taskType` presets? **No** — no task taxonomy, calls use raw prompts
- Per-call logging? **No** — only `console.log` with `[gateway]` prefix, no structured log file with taskType/calling-skill/provider/model/timestamp

**`src/business-intelligence/core/llm-caller.ts`** (BI pipeline gateway):
- Separate `fetch()` implementation, no shared adapter
- No JSON repair, no retry logging, no taskType

**Critical Findings:**
- 🔴 **CRITICAL**: No adapter exists — LLM calls are unguarded, untyped, unlogged
- 🔴 **CRITICAL**: Silent JSON repair retry in `parseAndValidatePatches()` (lines 876-910) — malformed output triggers second parse attempt without counting as separate adapter invocation
- 🔴 **CRITICAL**: Two independent gateways (`LLMGateway` + `BILLMCaller`) with different retry/logic
- 🟡 **MEDIUM**: No `taskType` presets — skills cannot declare which LLM task they're performing

---

## 1.5 — Content & Placeholder Handling

### Content Generation Flow (per SKILL.md)
1. `content-generator` (Bucket B) → 1 LLM call per page → writes `content/pages/{pageName}.json`
2. `parallel-builder` (Bucket B) → reads `component-manifest.json` + `visual-dna.json` + `content/pages/{page}.json` → generates component
3. `state-weaver` (Bucket A) → generates `App.tsx` wiring contexts from `component-manifest.json`

### Findings
| Finding | Severity | Evidence |
|---------|----------|----------|
| No generated content found in repo — no test project directories under `sandbox_workspaces/` with `content/` folders | **High** | Cannot verify if content lives in structured JSON vs hardcoded in components. The pipeline writes to `sandbox_workspaces/{id}/` but those are ephemeral build artifacts. |
| No `needs-client-review: true` tagging mechanism for AI-selected images | **High** | `localize-assets` skill and `asset-downloader` tool download images but produce no review flag in `asset-manifest.json`. The schema lacks a `reviewRequired` field. |
| Content schema not enforced in `content-generator` output validation | **Medium** | `content-generator/SKILL.md` says "Validate output against content schema" but no schema file exists in repo. |

---

## 1.6 — Dependency/Quality Gates Enforcement

### Quality Gate (`tools/quality-gate/index.cjs`)
```javascript
// Runs sequentially: lint → typecheck → build
// Each step: execSync(cmd, { stdio: 'inherit' })
// If any fails: throws → process exits non-zero
```
- ✅ Halts on first failure (sequential with `execSync`)
- ✅ Runs lint → typecheck → build in order
- ❌ **Does not run tests** — no `npm test` step
- ❌ No integration with `build-orchestrator` skill — the skill says "run quality gates" but `pipeline-orchestrator.ts` calls `runAllGates()` which wraps this tool, but `build-queue.ts` child process doesn't gate on it

### Dependency Checker (`tools/dependency-checker/index.cjs`)
```javascript
// Scans: .html, .css, .js, .ts, .tsx, .json, .jsx, .mjs, .cjs
// Regex: https?://, source domain patterns
// Reports: external URLs + source domain references
```
- ✅ Scans all relevant file types (not just .html)
- ✅ Reports both external URLs and source domain references
- ❌ **Not integrated into build-queue completion path** — `executeBuild()` in `build-queue.ts` marks job "completed" based on child process exit code, not on gate pass

### Build Queue Integration (`src/engine/build-queue.ts`)
- `executeBuild()` spawns child process → waits for exit code
- On exit code 0: `job.status = 'completed'`
- On non-zero: `job.status = 'failed'` → retry logic
- **No gate verification** — a build that exits 0 but fails quality gate would be marked complete (though `execSync` with `stdio: inherit` would surface failures)

### Findings
| Finding | Severity | Evidence |
|---------|----------|----------|
| `build-orchestrator` skill not wired as mandatory completion gate | **Critical** | `build-queue.ts` completes job on child process exit, not on gate pass |
| Quality gate missing test step | **High** | `quality-gate` runs lint/typecheck/build but no test suite |
| Dependency checker not blocking completion | **High** | Same — completion based on exit code, not gate output |
| `pipeline-orchestrator.ts` has `runAllGates()` but it's not the canonical completion path | **Medium** | Two parallel completion paths: `build-queue` (canonical) and `pipeline-orchestrator` (dead code path?) |

---

## 1.7 — Template Baselines

### Test Results: `npm install && npm run build` in each template

| Template | Install | Build | Errors |
|----------|---------|-------|--------|
| `templates/tier-static` (Astro 4) | ✅ | ✅ | None |
| `templates/tier-standard` (Next.js 15) | ✅ | ✅ | None |
| `templates/tier-fullstack` (Next.js 15 + Prisma) | ✅ | ✅ | Requires `DATABASE_URL` for `prisma generate` — build succeeds with env |

**All three templates build clean out of the box.** ✅ No Critical findings here.

---

## Phase 1 Summary — Findings Index

| ID | Severity | Category | File/Location | Description |
|----|----------|----------|---------------|-------------|
| F-1.1 | **Critical** | Orchestration | `skills/orchestrator` vs `src/generation/pipeline-orchestrator.ts` vs `src/agents/deterministic-orchestrator-v4.ts` | Three independent orchestrators with conflicting models |
| F-1.2 | **Critical** | Orchestration | `skills/business-reasoning/orchestration` | Business-reasoning 19-agent system never invoked by any pipeline |
| F-1.3 | **Critical** | Adapter | `skills/_adapter/` missing | No central LLM gateway, no taskType taxonomy, no per-call logging |
| F-1.4 | **Critical** | Adapter | `src/core/llm-gateway.ts:876-910` | Silent JSON repair retry without counting as separate adapter call |
| F-1.5 | **High** | Pipeline | `src/generation/pipeline-orchestrator.ts` | 15+ LLM calls per build (IntentDNA, FeatureEnricher, per-section, per-page, RepairLoop) — far exceeds Bucket B scope |
| F-1.6 | **High** | Pipeline | `src/agents/deterministic-orchestrator-v4.ts:199` | `generateAllPatchesCombined()` makes 1 LLM call for ALL pages (violates "one component per call") |
| F-1.7 | **High** | Pipeline | `src/business-intelligence/pipeline.ts` | BI Pipeline = 8 sequential LLM calls duplicating business-reasoning agents |
| F-1.8 | **High** | Hybrid | `skills/orchestrator/SKILL.md` | Hybrid path declared but not implemented |
| F-1.9 | **High** | Content | `content-generator/SKILL.md` | No content schema for validation; no `needs-client-review` for images |
| F-1.10 | **High** | Gates | `src/engine/build-queue.ts:94-110` | Job completion based on exit code, not gate pass |
| F-1.11 | **High** | Gates | `tools/quality-gate/index.cjs` | No test step in quality gate |
| F-1.12 | **High** | Skills | `skills/business-reasoning/website-architect/SKILL.md` | LLM scope spans entire site (plural pages) |
| F-1.13 | **High** | Skills | `skills/business-reasoning/mobile-app-architect/SKILL.md` | LLM scope spans entire app (plural screens) |
| F-1.14 | **Medium** | Skills | All 17 business-reasoning skills (except content-strategy) | Missing `bucket:` frontmatter |
| F-1.15 | **Medium** | Skills | `skills/business-reasoning/orchestration/SKILL.md` | Hybrid A/B skill without declared bucket |
| F-1.16 | **Medium** | Adapter | `src/core/llm-gateway.ts` | No `taskType` presets; skills cannot declare LLM task type |
| F-1.17 | **Medium** | Adapter | `src/business-intelligence/core/llm-caller.ts` | Second independent gateway with no shared infrastructure |
| F-1.18 | **Medium** | Pipeline | `src/generation/pipeline-orchestrator.ts:595` | `generatePageWithLLM()` composes full page via LLM (should be deterministic assembly) |
| F-1.19 | **Low** | Pipeline | `src/generation/pipeline-orchestrator.ts:216` | IntentDNA uses LLM for parsing (could be deterministic keyword + BOS) |
| F-1.20 | **Low** | Pipeline | `src/engine/self-healing-engine.ts` | LLM for error repair (common TS errors could be deterministic) |
| F-1.21 | **Low** | Pipeline | `src/engine/repair-loop.ts` | LLM for browser-verified repair (could be deterministic for known patterns) |

---

## Phase 2 — Remediation Plan (for each Critical/High)

| Finding | Fix |
|---------|-----|
| F-1.1, F-1.2 | **Single router**: `skills/orchestrator` → emits PipelinePlan → **delegates generative path entirely to** `skills/business-reasoning/orchestration` as subroutine. Delete duplicate logic in `pipeline-orchestrator.ts` and `deterministic-orchestrator-v4.ts`. |
| F-1.3 | **Create `skills/_adapter/index.js`** with: single `callLLM(taskType, prompt, options)` function; `taskType` enum for every Bucket B skill; per-call JSONL logging (taskType, skill, provider, model, timestamp, tokens); JSON repair as explicit retry that logs as separate call. Refactor `LLMGateway` and `BILLMCaller` to delegate to adapter. |
| F-1.4 | Move JSON repair into adapter as explicit retry with logging. |
| F-1.5, F-1.6, F-1.7, F-1.18, F-1.19, F-1.20, F-1.21 | **Pipeline uses Bucket A agents first**: Replace `pipeline-orchestrator.ts` stages with calls to deterministic agents (BOS, DomainSynthesizer, SkillIntegrator). LLM only for: `moodboard-director` (1 call), `content-generator` (1 per page), `parallel-builder` (1 per component), `data-model-extractor` (1 per type), `component-spec-writer` (1 per page), `content-strategy` (1 call). Remove FeatureEnricher LLM, per-section LLM, per-page LLM, RepairLoop LLM — replace with deterministic fallbacks + self-healing AST transforms. |
| F-1.8 | Implement hybrid stage in `skills/orchestrator`: clone path runs `crawl-site` + `extract-design-tokens` → feeds tokens to generative path's `moodboard-director` as **inspiration only**; enforce `dependency-checker` blocks any source-domain text in output. |
| F-1.9 | Add `content/schema.json`; add `reviewRequired: boolean` to `asset-manifest.json` schema; `localize-assets` skill sets flag when no source image exists. |
| F-1.10 | `build-queue.ts` → after child process, run `quality-gate` + `dependency-checker` as **mandatory post-build steps** before marking `completed`. |
| F-1.11 | Add `npm test` (or `npx vitest run`) to `quality-gate` sequence. |
| F-1.12, F-1.13 | Decompose `website-architect` and `mobile-app-architect` into per-page/screen deterministic templates + Bucket B `component-spec-writer` (already 1 call per page). Remove "full site/app" LLM scope. |
| F-1.14 | Add `bucket: B` frontmatter to all 17 business-reasoning skills. |
| F-1.15 | Add `bucket: A` for routing logic, move assembly to Bucket B skill. |
| F-1.16 | Define `taskType` enum in adapter matching every Bucket B skill; all LLM calls go through adapter. |

---

*End of Phase 1 Audit Report*  
*Next: Phase 2 Remediation → Phase 3 Verification with LLM call counts*