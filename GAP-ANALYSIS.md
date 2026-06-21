# Build.same Engine — Architectural Gap Analysis Report

**Date:** June 21, 2026
**Engine Version:** V4
**Report Type:** Pre-production capability audit

---

## Executive Summary

Build.same has a **production-quality AST mutation engine** but is **not a viable product** in its current state. The core code synthesis pipeline (AST patching → validation → simulation → compilation audit → rollback) is solid and battle-tested. However, the system lacks the three things a paying customer needs: **real AI generation**, **multi-file output**, and **deployment**.

The generation layer architecture added in this phase provides the scaffolding for future capability, but the critical path to revenue requires LLM integration, business-type-aware prompt engineering, and a working deployment pipeline.

---

## Current Capability Matrix

### Core Engine (EXISTS — PRODUCTION QUALITY)

| Capability | Status | Justification |
|---|---|---|
| AST patching (insert/update/delete) | **SUPPORTED** | Recast-based AST manipulation with export resolution, works for React components |
| Dependency graphing | **SUPPORTED** | Full dependency graph with import/export tracking, content-hash caching, module resolution |
| TypeScript auditing | **SUPPORTED** | Programmatic `ts.getPreEmitDiagnostics()` with structured error output |
| Validation (schema + syntax) | **SUPPORTED** | Pre-flight gate: schema validation, path security, export existence, code parseability |
| Rollback systems | **SUPPORTED** | Filesystem snapshots with surgical restore, untracked file purge, post-order directory cleanup |
| Simulation (dry-run) | **SUPPORTED** | In-memory AST mutation without disk writes, structural integrity verification |
| Orchestration (7-step loop) | **SUPPORTED** | Self-healing compilation loop with retry, error compression, regression prediction |
| Risk analysis | **SUPPORTED** | Impact analyzer, patch ranker, regression predictor with blast-radius scoring |

### Generation Layer (EXISTS — ARCHITECTURAL CONTRACTS)

| Capability | Status | Justification |
|---|---|---|
| Business type classification | **SUPPORTED** | Keyword + domain + structural pattern matching across 11 business verticals |
| Capability registry | **SUPPORTED** | Extensible capability system with 6 registered capabilities |
| Clone plan generation | **SUPPORTED** | Strategy-based plan generation (full/structure/style) with data model inference |
| Project blueprint generation | **SUPPORTED** | 6 business-type templates with pages, layouts, components, integrations |
| Website analysis (contract) | **PARTIALLY SUPPORTED** | Architecture defined, HTML parsing works, but no live crawling |
| Orchestrator integration | **SUPPORTED** | `GenerationIntent` routing with 5 intent types, no break to existing flow |

### Web UI (EXISTS — FUNCTIONAL)

| Capability | Status | Justification |
|---|---|---|
| Prompt input | **SUPPORTED** | Landing page with prompt input and example suggestions |
| Chat progress streaming | **SUPPORTED** | Real-time progress polling with filtered engine steps |
| Code editor | **SUPPORTED** | File tree with source code viewing |
| Server-side preview | **SUPPORTED** | JSX → HTML rendering via React SSR in sandbox |
| Workspace management | **SUPPORTED** | Create, build, poll, read files, read file content APIs |

---

## Critical Business Gaps (BLOCKING REVENUE)

### 1. No Real LLM Integration — CRITICAL

**Status:** NOT SUPPORTED
**Impact:** Product is non-functional for any real use case

The build API contains a hardcoded mock client that returns the same NutriPlex supplement store regardless of user input. There are zero API calls to any LLM provider. The "AI agent" messages in the chat are cosmetic delays (400ms + 400ms + 300ms setTimeout).

**What's needed:**
- OpenAI/Anthropic/Google API integration
- System prompts that generate contextual, multi-file AST patches
- Error feedback loops (compiler errors → LLM retry with context)
- Token management and rate limiting

**Without this:** Every user gets the same hardcoded page. Churn on first use.

### 2. Single-File Generation — CRITICAL

**Status:** NOT SUPPORTED
**Impact:** Output is not a usable application

The engine generates exactly 1 file (`src/app/page.tsx`) per build. A real website needs:
- Root layout (`layout.tsx`)
- Multiple pages (home, about, contact, etc.)
- Reusable components (navbar, footer, cards)
- API routes (for dynamic functionality)
- Configuration files (`next.config.js`, `tailwind.config.js`)
- Styles (global CSS, component styles)

**What's needed:**
- Multi-patch generation per LLM call
- Blueprint-driven file planning (pages, components, layouts, APIs)
- Sequential patch application with compilation checks between steps

### 3. No Deployment Pipeline — CRITICAL

**Status:** NOT SUPPORTED
**Impact:** Generated sites cannot be used by end users

The "Deploy" button in the UI does nothing. There is no Vercel, Netlify, or any hosting integration.

**What's needed:**
- Vercel API integration (create project → deploy)
- Build output optimization (Next.js static export)
- Domain assignment
- Environment variable injection

### 4. No Iterative Refinement — HIGH

**Status:** NOT SUPPORTED
**Impact:** Users cannot customize generated output

The follow-up chat input re-triggers the full build from scratch. It doesn't modify the existing generated code.

**What's needed:**
- Conversation context preservation
- Targeted patch generation (modify specific components)
- Diff-based updates (only change what the user requested)

---

## Partially Supported Capabilities

### 5. Website Cloning — PARTIALLY SUPPORTED

**Status:** Architecture exists, implementation missing
**Impact:** Cannot clone real websites

The `ClonePlanGenerator` produces a plan (routes, components, assets, data models) but there is no:
- **Web crawler** (Playwright/Puppeteer) to fetch HTML
- **DOM extractor** to identify components
- **Asset downloader** to save images/fonts
- **Design token extractor** to extract colors/fonts/spacing from CSS
- **Content scraper** to extract text, prices, descriptions

**What's needed:**
- Playwright-based headless browser crawling
- DOM-to-component decomposition
- Asset pipeline (download → optimize → localize)
- Design system extraction from CSS/inline styles

### 6. Business-Type-Aware Generation — PARTIALLY SUPPORTED

**Status:** Classification works, generation templates exist, but LLM prompts don't use them
**Impact:** All prompts produce the same output regardless of business type

The `BusinessClassifier` correctly identifies 11 business types from prompts. The `ProjectBlueprintGenerator` has templates for 6 types with page structures, component lists, and integration configs. But none of this feeds into the actual code generation because the LLM client is hardcoded.

**What's needed:**
- Blueprint-to-prompt translation (blueprint → structured LLM prompt)
- Business-type-specific system prompts
- Template-aware code generation (use blueprint pages/components as context)

### 7. Design System Extraction — PARTIALLY SUPPORTED

**Status:** Token structure defined, extraction from HTML works, but no live analysis
**Impact:** Cannot extract design systems from real websites

The `WebsiteAnalyzer` can extract colors, fonts, and breakpoints from HTML strings. But there's no way to fetch HTML from a live URL.

---

## Not Supported Capabilities

| Capability | Status | Priority | Effort |
|---|---|---|---|
| Real LLM code generation | NOT SUPPORTED | P0 | 2-3 weeks |
| Multi-file patch generation | NOT SUPPORTED | P0 | 1-2 weeks |
| Deployment pipeline | NOT SUPPORTED | P0 | 1 week |
| Iterative refinement | NOT SUPPORTED | P1 | 2 weeks |
| Web crawling (Playwright) | NOT SUPPORTED | P1 | 1-2 weeks |
| DOM component extraction | NOT SUPPORTED | P1 | 2 weeks |
| Asset downloading | NOT SUPPORTED | P1 | 1 week |
| Database schema generation | NOT SUPPORTED | P1 | 1 week |
| API route generation | NOT SUPPORTED | P1 | 1 week |
| Authentication setup | NOT SUPPORTED | P2 | 1 week |
| Payment integration | NOT SUPPORTED | P2 | 1 week |
| SEO optimization | NOT SUPPORTED | P2 | 3 days |
| Responsive design validation | NOT SUPPORTED | P2 | 3 days |
| Figma import | NOT SUPPORTED | P3 | 3+ weeks |
| CMS migration | NOT SUPPORTED | P3 | 2+ weeks |
| Screenshot-to-code | NOT SUPPORTED | P3 | 2+ weeks |

---

## Architecture Assessment

### What's Solid (Keep)

1. **AST Mutation Pipeline** — The 7-step orchestration loop with validation, simulation, and rollback is production-quality. This is the core IP.

2. **Error Feedback Loop** — Error compression + retry with context is exactly how production code generation should work.

3. **Risk Analysis** — Impact analysis, patch ranking, and regression prediction prevent breaking changes. This is unique value.

4. **Generation Layer Contracts** — The business classifier, blueprint generator, and clone plan generator provide clean abstractions for future implementation.

### What's Broken (Fix)

1. **Mock LLM Client** — The hardcoded client makes the product non-functional. This is the single biggest blocker.

2. **Single-File Output** — The engine only patches `page.tsx`. Real applications need 10-50+ files.

3. **No Deployment** — Generated code stays in a local sandbox. No way for users to use what's generated.

### What's Missing (Build)

1. **LLM Provider Integration** — OpenAI/Anthropic API client with structured prompt templates
2. **Multi-File Orchestrator** — Blueprint → sequential multi-patch generation
3. **Deployment Connector** — Vercel/Netlify API integration
4. **Web Crawler** — Playwright-based site analysis for cloning
5. **Asset Pipeline** — Download, optimize, and localize external assets

---

## Recommended Next Phase (Priority Order)

### Phase 1: Make It Work (2-3 weeks)
1. Integrate OpenAI/Claude API with structured prompts
2. Implement multi-file patch generation from blueprint
3. Add Vercel deployment
4. Fix iterative refinement (conversation context)

### Phase 2: Make It Clone (2-3 weeks)
1. Playwright web crawler
2. DOM component extraction
3. Asset downloading and optimization
4. Design token extraction from live sites

### Phase 3: Make It Scale (2-3 weeks)
1. Template library (50+ business types)
2. Component library (100+ pre-built components)
3. Database schema auto-generation
4. API route auto-generation
5. Authentication scaffolding

---

## File Inventory (New/Modified)

### New Files Created
```
src/generation/
├── types.ts                    (156 lines) — All generation type definitions
├── capabilities.ts             (97 lines)  — Capability registry system
├── business-classifier.ts      (134 lines) — 11-type business classification
├── website-analyzer.ts         (271 lines) — Website analysis with HTML parsing
├── clone-plan-generator.ts     (687 lines) — Clone plan with data model inference
├── project-blueprint.ts        (278 lines) — 6 business-type blueprint templates
└── index.ts                    (8 lines)   — Barrel exports

scripts/
└── verify-generation-layer.ts  (153 lines) — 57-check verification suite

Modified Files
src/types/index.ts              (77 lines)  — Added GenerationIntent, GenerationResult
src/agents/deterministic-orchestrator-v4.ts (389 lines) — Added generation layer integration
```

### Total New Code
- **~1,800 lines** of TypeScript across 7 new files
- **~120 lines** added to existing files
- **57 verification checks** all passing
- **0 TypeScript errors**
- **Existing test harness** still green

---

## Conclusion

Build.same has the **hardest part done** — a production-quality AST mutation engine with self-healing compilation. The generation layer architecture is clean and extensible. But the product gap is enormous: no real AI, no multi-file output, no deployment.

**Bottom line:** This is a 6/10 engine looking for a 10/10 product. The architecture is ready. The implementation needs LLM integration, multi-file orchestration, and deployment to become something a business user would pay for.
