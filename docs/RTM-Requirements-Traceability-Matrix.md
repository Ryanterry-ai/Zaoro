# Requirements Traceability Matrix (RTM)
## build-same-engine — BRD ↔ FRD ↔ Code Traceability

**Version:** 1.0
**Date:** 2026-06-22

---

## How to Read This Matrix

| Column | Meaning |
|--------|---------|
| **BRD Ref** | Business requirement ID from BRD |
| **FRD Ref** | Functional module ID from FRD |
| **Source File** | Actual code file implementing the requirement |
| **Status** | Implemented / Partial / Planned / Not Started |
| **Verification** | Script or test that validates the requirement |

---

## 1. Core Engine Requirements

| BRD Ref | Requirement | FRD Ref | Source File | Status | Verification |
|---------|-------------|---------|-------------|--------|--------------|
| BRD-1.1 | AST-based code patching | M1 | `src/core/ast-patcher.ts` | ✅ Implemented | `verify-generation-layer.ts` |
| BRD-1.2 | Export-level targeting | M1 | `src/core/ast-patcher.ts` | ✅ Implemented | Unit tests in patcher |
| BRD-1.3 | Insert/update/delete actions | M1 | `src/core/ast-patcher.ts` | ✅ Implemented | `verify-multi-file.ts` |
| BRD-1.4 | Regression prevention | M12 | `src/intelligence/regression-predictor.ts` | ✅ Implemented | `verify-multi-file.ts` (gate 2) |
| BRD-1.5 | Pre-flight validation | M13 | `src/validation/ast-patch-validator.ts` | ✅ Implemented | `verify-multi-file.ts` (gate 3) |
| BRD-1.6 | In-memory simulation | M14 | `src/validation/patch-simulator.ts` | ✅ Implemented | `verify-multi-file.ts` (gate 4) |
| BRD-1.7 | Self-healing compile loop | M20 | `src/agents/deterministic-orchestrator-v4.ts` | ✅ Implemented | `verify-multi-file.ts` (5 attempts) |
| BRD-1.8 | Dependency graph analysis | M8 | `src/graph/ast-dependency-graph.ts` | ✅ Implemented | `verify-generation-layer.ts` |
| BRD-1.9 | Export signature indexing | M9 | `src/graph/export-indexer.ts` | ✅ Implemented | Graph module tests |
| BRD-1.10 | Import path resolution | M10 | `src/graph/module-resolver.ts` | ✅ Implemented | Graph module tests |
| BRD-1.11 | Impact analysis | M11 | `src/intelligence/impact-analyzer.ts` | ✅ Implemented | Intelligence tests |
| BRD-1.12 | Patch ranking | M15 | `src/intelligence/patch-ranker.ts` | ✅ Implemented | `verify-multi-file.ts` (gate 2) |

## 2. LLM Gateway Requirements

| BRD Ref | Requirement | FRD Ref | Source File | Status | Verification |
|---------|-------------|---------|-------------|--------|--------------|
| BRD-2.1 | Multi-provider support | M16 | `src/core/llm-gateway.ts` | ✅ Implemented | `verify-generation-layer.ts` |
| BRD-2.2 | OpenAI GPT-4o integration | M16 | `src/core/llm-gateway.ts:callOpenAI()` | ✅ Implemented | Manual (requires API key) |
| BRD-2.3 | Anthropic Claude integration | M16 | `src/core/llm-gateway.ts:callAnthropic()` | ✅ Implemented | Manual (requires API key) |
| BRD-2.4 | Gemini integration | M16 | `src/core/llm-gateway.ts:callGemini()` | ✅ Implemented | Manual (requires API key) |
| BRD-2.5 | Retry with backoff | M16 | `src/core/llm-gateway.ts` | ✅ Implemented | `verify-telemetry.ts` |
| BRD-2.6 | Graceful fallback to JIT | M16 | `src/core/llm-gateway.ts:synthesizeFallback()` | ✅ Implemented | `verify-generation-layer.ts` (gate 1) |
| BRD-2.7 | Structured JSON output | M16 | `src/core/llm-gateway.ts:parseAndValidatePatches()` | ✅ Implemented | Parser tests |
| BRD-2.8 | System prompt engineering | M16 | `src/core/llm-gateway.ts:buildSystemPrompt()` | ✅ Implemented | Prompt output verification |

## 3. Generation Layer Requirements

| BRD Ref | Requirement | FRD Ref | Source File | Status | Verification |
|---------|-------------|---------|-------------|--------|--------------|
| BRD-3.1 | Business classification | M21 | `src/generation/business-classifier.ts` | ✅ Implemented | `verify-generation-layer.ts` (gate 2) |
| BRD-3.2 | Website analysis (clone) | M22 | `src/generation/website-analyzer.ts` | ✅ Implemented | `verify-generation-layer.ts` |
| BRD-3.3 | Clone plan generation | M23 | `src/generation/clone-plan-generator.ts` | ✅ Implemented | `verify-generation-layer.ts` |
| BRD-3.4 | Project blueprint | M24 | `src/generation/project-blueprint.ts` | ✅ Implemented | `verify-generation-layer.ts` |
| BRD-3.5 | Capability registry | M7 | `src/generation/capabilities.ts` | ✅ Implemented | Capability tests |
| BRD-3.6 | Atomic primitives catalog | — | `src/generation/primitives.ts` | ✅ Implemented | Primitive count verification |
| BRD-3.7 | Full-stack architect | — | `src/generation/architect.ts:FullStackArchitect` | ✅ Implemented | `verify-generation-layer.ts` (gate 3) |
| BRD-3.8 | Compiler pipeline | — | `src/generation/compiler-pipeline.ts` | ✅ Implemented | `verify-multi-file.ts` |

## 4. Per-Page Isolation Requirements

| BRD Ref | Requirement | FRD Ref | Source File | Status | Verification |
|---------|-------------|---------|-------------|--------|--------------|
| BRD-4.1 | Independent page builds | M20 | `handleBuildIntent()` per-page loop | ✅ Implemented | `verify-multi-file.ts` (Part B) |
| BRD-4.2 | Per-page retry budget (3) | M20 | `PER_PAGE_RETRIES = 3` | ✅ Implemented | `verify-multi-file.ts` |
| BRD-4.3 | Independent snapshot scope | M20 | `snapshotBase = pageIndex * 4` | ✅ Implemented | Snapshot isolation test |
| BRD-4.4 | Honest aggregate result | M20 | `PageBuildResult[]` in `GenerationResult` | ✅ Implemented | `verify-multi-file.ts` |
| BRD-4.5 | Per-page narrowed prompt | M20 | `buildPagePrompt()` | ✅ Implemented | Prompt content verification |
| BRD-4.6 | Scoped temp files | M20 | `.build-config-{id}.json` | ✅ Implemented | File naming verification |

## 5. Full-Stack Compilation Requirements

| BRD Ref | Requirement | FRD Ref | Source File | Status | Verification |
|---------|-------------|---------|-------------|--------|--------------|
| BRD-5.1 | Prisma schema generation | — | `src/core/db-compiler.ts:compileSchema()` | ✅ Implemented | `verify-fullstack-db.ts` (schema) |
| BRD-5.2 | Prisma client scaffolding | — | `src/core/db-compiler.ts:scaffoldPrismaClient()` | ✅ Implemented | `verify-fullstack-db.ts` (client) |
| BRD-5.3 | REST API route generation | — | `src/core/api-compiler.ts:compileAPIRoutes()` | ✅ Implemented | `verify-fullstack-db.ts` (routes) |
| BRD-5.4 | package.json Prisma injection | M20 | `handleBuildIntent()` | ✅ Implemented | `verify-fullstack-db.ts` (pkg) |
| BRD-5.5 | State store compilation | — | `compileStateStores()` | ✅ Implemented | `verify-multi-file.ts` |

## 6. Telemetry Requirements

| BRD Ref | Requirement | FRD Ref | Source File | Status | Verification |
|---------|-------------|---------|-------------|--------|--------------|
| BRD-6.1 | Sentry error tracking | — | `src/core/telemetry.ts:init()` | ✅ Implemented | `verify-telemetry.ts` (init) |
| BRD-6.2 | PostHog analytics | — | `src/core/telemetry.ts:safePostHogCapture()` | ✅ Implemented | `verify-telemetry.ts` (capture) |
| BRD-6.3 | Supabase event persistence | — | `src/core/telemetry.ts:supabaseInsert()` | ✅ Implemented | `verify-telemetry.ts` (insert) |
| BRD-6.4 | Non-blocking degradation | — | `src/core/telemetry.ts` try-catch wrappers | ✅ Implemented | `verify-telemetry.ts` (graceful) |
| BRD-6.5 | Build event tracking | — | Orchestrator telemetry wiring | ✅ Implemented | `verify-telemetry.ts` (events) |
| BRD-6.6 | Page event tracking | — | Per-page telemetry in orchestrator | ✅ Implemented | `verify-telemetry.ts` (events) |

## 7. Web UI Requirements

| BRD Ref | Requirement | FRD Ref | Source File | Status | Verification |
|---------|-------------|---------|-------------|--------|--------------|
| BRD-7.1 | Landing page with prompt input | M25 | `web/src/app/page.tsx` | ✅ Implemented | Manual browser test |
| BRD-7.2 | Workspace builder (3-panel) | M25 | `web/src/app/workspace/[id]/page.tsx` | ✅ Implemented | Manual browser test |
| BRD-7.3 | Chat panel | M25 | Workspace page (left panel) | ✅ Implemented | Manual browser test |
| BRD-7.4 | Code editor with file tree | M25 | Workspace page (center panel) | ✅ Implemented | Manual browser test |
| BRD-7.5 | Live preview panel | M25 | Workspace page (right panel) | ✅ Implemented | Manual browser test |
| BRD-7.6 | File content viewer | M25 | File tree + code display | ✅ Implemented | Manual browser test |
| BRD-7.7 | Progress polling | M25 | Progress API + polling | ✅ Implemented | Manual browser test |

## 8. API Layer Requirements

| BRD Ref | Requirement | FRD Ref | Source File | Status | Verification |
|---------|-------------|---------|-------------|--------|--------------|
| BRD-8.1 | Create workspace API | M26.1 | `web/src/app/api/create/route.ts` | ✅ Implemented | Manual API test |
| BRD-8.2 | Build execution API | M26.2 | `web/src/app/api/workspace/[id]/build/route.ts` | ✅ Implemented | Manual API test |
| BRD-8.3 | Progress streaming API | M26.3 | `web/src/app/api/workspace/[id]/progress/route.ts` | ✅ Implemented | Manual API test |
| BRD-8.4 | File listing API | M26.4 | `web/src/app/api/workspace/[id]/files/route.ts` | ✅ Implemented | Manual API test |
| BRD-8.5 | File content API | M26.5 | `web/src/app/api/workspace/[id]/file/route.ts` | ✅ Implemented | Manual API test |
| BRD-8.6 | Preview SSR API | M26.6 | `web/src/app/api/workspace/[id]/preview/route.ts` | ✅ Implemented | Manual API test |

## 9. CI/CD Requirements

| BRD Ref | Requirement | FRD Ref | Source File | Status | Verification |
|---------|-------------|---------|-------------|--------|--------------|
| BRD-9.1 | TypeScript compilation check | — | `.github/workflows/ci.yml` | ✅ Implemented | CI pipeline |
| BRD-9.2 | Generation layer verification | M27.1 | CI step: `verify-generation-layer` | ✅ Implemented | CI pipeline |
| BRD-9.3 | Multi-file isolation verification | M27.2 | CI step: `verify-multi-file` | ✅ Implemented | CI pipeline |
| BRD-9.4 | Full-stack DB verification | M27.3 | CI step: `verify-fullstack-db` | ✅ Implemented | CI pipeline |
| BRD-9.5 | Telemetry contract verification | M27.4 | CI step: `verify-telemetry` | ✅ Implemented | CI pipeline |

---

## Coverage Summary

| Category | Total Requirements | Implemented | Coverage |
|----------|-------------------|-------------|----------|
| Core Engine | 12 | 12 | 100% |
| LLM Gateway | 8 | 8 | 100% |
| Generation Layer | 8 | 8 | 100% |
| Per-Page Isolation | 6 | 6 | 100% |
| Full-Stack Compilation | 5 | 5 | 100% |
| Telemetry | 6 | 6 | 100% |
| Web UI | 7 | 7 | 100% |
| API Layer | 6 | 6 | 100% |
| CI/CD | 5 | 5 | 100% |
| **Total** | **63** | **63** | **100%** |

---

## Requirements NOT Yet Implemented (Phase 2+)

| BRD Ref | Requirement | Priority | Status |
|---------|-------------|----------|--------|
| BRD-10.1 | Vercel deployment | High | Not Started |
| BRD-10.2 | Authentication (NextAuth) | High | Not Started |
| BRD-10.3 | Database (Supabase/Neon) | High | Not Started |
| BRD-10.4 | Complete CRUD (PUT/DELETE/PATCH) | Medium | Not Started |
| BRD-11.1 | Stripe payments | Medium | Not Started |
| BRD-11.2 | GitHub sync | Medium | Not Started |
| BRD-11.3 | Web clone engine (Playwright) | High | Not Started |
| BRD-11.4 | Visual QA agent | Medium | Not Started |
| BRD-12.1 | Workspace persistence | High | Not Started |
| BRD-12.2 | Parallel page generation | Medium | Not Started |
| BRD-12.3 | Incremental dependency graph | Low | Not Started |
| BRD-12.4 | Docker sandboxing | Low | Not Started |
