# Business Requirements Document (BRD)
## build-same-engine — Universal Application Generation Platform

**Version:** 1.0
**Date:** 2026-06-22
**Classification:** Internal — Architecture Review

---

## 1. Executive Summary

### 1.1 What build-same-engine Is

build-same-engine is an **AI-powered full-stack code generation engine** that transforms natural language prompts into complete, compilable Next.js applications. It combines LLM-driven code synthesis with AST-level code patching, a multi-gate validation pipeline, and self-healing compilation loops to produce production-quality output from a single sentence.

### 1.2 Business Problem Solved

Building a full-stack web application requires expertise across frontend (React, Tailwind CSS), backend (API routes), database (Prisma, PostgreSQL), state management (React Context), and infrastructure (TypeScript compilation). This process typically takes days to weeks for a skilled developer. build-same-engine reduces this to minutes by:

- Automating the entire scaffold-to-working-app pipeline
- Using AST-level patching to modify code without breaking existing structure
- Running a self-healing loop that automatically repairs compilation errors
- Generating realistic, domain-specific content rather than placeholder text

### 1.3 Target Users

| User Segment | Use Case | Value Proposition |
|---|---|---|
| **Solo Founders** | Rapid prototyping of MVPs | Ship a working prototype in minutes, not weeks |
| **Product Managers** | Instant proof-of-concept creation | Validate ideas without engineering resources |
| **Development Agencies** | Accelerated project kickoff | Generate starter codebases for client projects |
| **Hackathon Teams** | Rapid full-stack build | Focus on unique features, not boilerplate |
| **Educational Institutions** | Teaching full-stack development | Students see complete apps generated from prompts |
| **Enterprise Innovation Labs** | Internal tool prototyping | Business users create tools without IT bottlenecks |

### 1.4 Target Outcomes

| Outcome | Metric | Current State |
|---|---|---|
| Prompt-to-app generation | < 5 minutes for 4-page app | Achieved (JIT synthesis path) |
| Compilation success rate | > 90% first-try | Achieved (self-healing loop) |
| Multi-page output | 2-8 pages per generation | Achieved (per-page isolation) |
| Database generation | Prisma schema + CRUD API | Achieved (DBCompiler + APICompiler) |
| Business domain coverage | 11 business types | Achieved (BusinessClassifier) |
| Cross-domain generation | Gym + tea + therapy in one app | Achieved (ArchitectAgent) |

---

## 2. Product Vision

### 2.1 Currently Implemented Vision

| Vision Component | Status | Evidence |
|---|---|---|
| **AI Website Generator** | Implemented | `FullStackArchitect.design()` + `FullStackCompilerPipeline.compile()` + `LLMGateway` JIT synthesis |
| **Self-Healing Code Generation** | Implemented | `DeterministicOrchestratorV4.runCompilationFlow()` — retry loop with snapshot rollback |
| **AST-Level Code Patching** | Implemented | `ASTPatcher` using recast/babel — insert, update, delete operations on export declarations |
| **Multi-Provider LLM Gateway** | Implemented | `LLMGateway` — OpenAI, Anthropic, Gemini with retry-with-backoff |
| **Full-Stack Output** | Implemented | Pages + Prisma schema + API routes + state stores + DB client |
| **Domain-Aware Generation** | Implemented | `BusinessClassifier` (11 types) + `ArchitectAgent` (13 sub-domains) |
| **Web UI Builder** | Implemented | Next.js 16 app with prompt input, chat panel, code editor, live preview |

### 2.2 Future Vision

| Vision Component | Status | Gap |
|---|---|---|
| **Universal Application Generation** | Partial | Currently limited to Next.js; no mobile, desktop, or API-only generation |
| **Website Cloning** | Planned | `ClonePlanGenerator` exists but actual crawling (`Playwright`) not implemented |
| **AI Software Factory** | Planned | Single-agent architecture; multi-agent coordination not implemented |
| **Autonomous Deployment** | Missing | No Vercel/Netlify/Docker deployment pipeline |
| **Visual Design Synthesis** | Missing | No screenshot-to-code or design-to-code capability |
| **Memory Systems** | Missing | No cross-session learning or preference retention |
| **Knowledge Graph** | Missing | No code knowledge base or pattern library |
| **MCP Execution Layer** | Missing | No Model Context Protocol integration |
| **Real-Time Collaboration** | Missing | Single-user workspace model |
| **Multi-Framework Support** | Missing | Locked to Next.js; no React Native, Vue, Svelte, etc. |

---

## 3. Business Objectives

### 3.1 Primary Objectives

| ID | Objective | Priority | Status |
|---|---|---|---|
| OBJ-01 | Faster software creation from natural language | Critical | Implemented |
| OBJ-02 | Reduced engineering effort for common app patterns | High | Implemented |
| OBJ-03 | Autonomous code synthesis with self-healing | High | Implemented |
| OBJ-04 | Domain-agnostic application generation | High | Partial (11 types) |
| OBJ-05 | Website replication from existing sites | Medium | Planned (stubs only) |
| OBJ-06 | Production-grade output quality | High | Partial (JIT synthesis floor) |
| OBJ-07 | Multi-framework support (React Native, Vue, etc.) | Medium | Missing |
| OBJ-08 | Autonomous deployment to cloud | Medium | Missing |
| OBJ-09 | Cross-session learning and memory | Low | Missing |
| OBJ-10 | Visual design synthesis from screenshots | Low | Missing |

### 3.2 Secondary Objectives

| ID | Objective | Priority | Status |
|---|---|---|---|
| OBJ-11 | Real-time collaboration on generated apps | Low | Missing |
| OBJ-12 | Version control integration (Git sync) | Medium | Missing |
| OBJ-13 | Component library extraction and reuse | Low | Missing |
| OBJ-14 | Performance optimization of generated code | Medium | Missing |
| OBJ-15 | Security hardening of generated output | High | Partial (path traversal prevention) |

---

## 4. Stakeholders

### 4.1 Stakeholder Map

| Stakeholder | Role | Interest | Current Engagement |
|---|---|---|---|
| **End Users** | Prompt creators | Get working apps from descriptions | Web UI (prompt → build → preview) |
| **Product Owners** | Platform vision holders | Commercialize as SaaS product | Architecture decisions, feature prioritization |
| **Developers** | Engine contributors | Build and maintain the generation engine | Core engine development |
| **AI Agents** | LLM providers | Generate code patches via API | LLM Gateway integration (OpenAI/Anthropic/Gemini) |
| **Platform Administrators** | Infrastructure managers | Deploy and scale the platform | CI/CD pipeline, telemetry, monitoring |
| **Enterprise Clients** | Future buyers | Generate internal tools and apps | Not yet engaged |

---

## 5. End-to-End User Journey

### 5.1 Current Implementation Flow

```
User Prompt (natural language)
    │
    ▼
POST /api/create → saves prompt to .prompts/{id}.json
    │
    ▼
Browser navigates to /workspace/{id}
    │
    ▼
POST /api/workspace/{id}/build → triggers engine
    │
    ▼
DeterministicOrchestratorV4.processGenerationIntent()
    │
    ├──► FullStackArchitect.design(prompt)
    │       │
    │       ▼
    │    FullStackBlueprint { appName, dataModels, apiRoutes, stateStores, pages }
    │
    ├──► FullStackCompilerPipeline.compile(workspace, blueprint)
    │       │
    │       ▼
    │    Scaffolded files: pages, prisma/schema.prisma, src/lib/store.tsx
    │
    ├──► DBCompiler.scaffoldPrismaClient() + APICompiler.compileAPIRoutes()
    │       │
    │       ▼
    │    src/lib/db.ts + src/app/api/{model}/route.ts
    │
    └──► FOR EACH page in blueprint.pages:
            │
            ▼
         runCompilationFlow() [3 retries per page]
            │
            ├──► buildDependencyGraph() → index all TS/TSX files
            ├──► snapshot.takeSnapshot() → save filesystem state
            ├──► LLMGateway.generatePatches() → ASTPatch[]
            │       │
            │       ├──► With API key → callOpenAI/callAnthropic/callGemini
            │       └──► Without API key → synthesizeFallback() (JIT)
            │
            ├──► PatchRanker.rank() → risk-scored patches
            ├──► RegressionPredictor.predict() → safety gate
            ├──► ASTPatchValidator.validate() → schema/security gate
            ├──► PatchSimulator.simulate() → in-memory mutation gate
            ├──► PatchTransactionManager.commit() → apply to disk
            └──► TypeScriptAuditor.audit() → compilation gate
                    │
                    ├──► Zero errors → page complete ✓
                    └──► Errors → snapshot.restore() → retry
```

### 5.2 User Experience Touchpoints

| Step | User Action | System Response | UI Component |
|---|---|---|---|
| 1 | Types prompt in textarea | — | Landing page (`page.tsx`) |
| 2 | Clicks "Build" button | Creates workspace, navigates to builder | Loading spinner |
| 3 | — | Build progress streams to chat panel | Chat panel (left) |
| 4 | — | Per-page compilation events appear | Progress steps with timestamps |
| 5 | Build completes | File tree populates, preview renders | Files tab + Preview iframe |
| 6 | Clicks files in tree | File content displays in code editor | Code Editor tab |
| 7 | Types follow-up in chat | New build triggered with context | Follow-up input bar |

---

## 6. Current Business Capabilities

### 6.1 Fully Implemented

| Capability | Module | Evidence |
|---|---|---|
| Natural language to app generation | `DeterministicOrchestratorV4` | `processGenerationIntent()` with `build-website` intent |
| Multi-page generation | Per-page isolation loop | `handleBuildIntent()` iterates `blueprint.pages` |
| AST-level code patching | `ASTPatcher` | recast-based insert/update/delete on export declarations |
| Self-healing compilation | `runCompilationFlow()` | Up to 5 retries with snapshot rollback |
| Regression prevention | `RegressionPredictor` | Structural hash comparison of export signatures |
| Dependency graph analysis | `ASTDependencyGraph` + `ExportIndexer` | File-level import/export mapping |
| Risk-based patch ranking | `PatchRanker` | Weighted scoring formula (centrality + dependents + depth) |
| Prisma schema generation | `DBCompiler` | Type-mapped schema from DataModel[] |
| CRUD API route generation | `APICompiler` | Next.js App Router GET+POST handlers per model |
| State store generation | `FullStackCompilerPipeline.compileStateStores()` | React Context + Provider + hooks |
| Business domain classification | `BusinessClassifier` | 11 business types with keyword/pattern matching |
| Atomic UI primitives catalog | `ATOMIC_PRIMITIVES` | 31 primitives across 10 categories |
| Multi-provider LLM gateway | `LLMGateway` | OpenAI, Anthropic, Gemini with retry-with-backoff |
| JIT synthesis fallback | `LLMGateway.synthesizeFallback()` | Deterministic code generation without API keys |
| Filesystem snapshot/rollback | `WorkspaceSnapshot` | In-memory point-in-time restore with surgical cleanup |
| Transactional patch application | `PatchTransactionManager` | Begin/stage/commit/rollback semantics |
| Error compression for LLM | `ErrorCompressor` | Regex-based message normalization (120 char limit) |
| Production telemetry | `TelemetryLayer` | Sentry + PostHog + Supabase integration |
| Web UI builder | Next.js 16 app | Prompt input, chat, code editor, live preview |
| CI/CD pipeline | GitHub Actions | Node 20/22 matrix, tsc, build, 4 verification scripts |

### 6.2 Partially Implemented

| Capability | Module | Gap |
|---|---|---|
| Website cloning | `ClonePlanGenerator` + `WebsiteAnalyzer` | Analysis works; actual crawling not implemented |
| Cross-domain generation | `ArchitectAgent` | Works for gym+tea+therapy; not verified for arbitrary combinations |
| Database client generation | `DBCompiler` | Generates `src/lib/db.ts` but requires `@prisma/client` at runtime |
| API route generation | `APICompiler` | Generates GET+POST only; no PUT, DELETE, PATCH, auth, validation |
| State management | `FullStackCompilerPipeline` | React Context only; no Redux, Zustand, or server state |
| Live preview | Preview API | Server-side rendering via `ReactDOMServer`; no hot reload |
| Error recovery | Self-healing loop | Works for compilation errors; not for runtime errors |

### 6.3 Missing Capabilities

| Capability | Impact | Priority |
|---|---|---|
| Website crawling (Playwright) | Cannot clone real websites | High |
| DOM component extraction | Cannot extract reusable components | Medium |
| Design token extraction | Cannot extract colors/fonts from live sites | Medium |
| Multi-framework support | Locked to Next.js only | High |
| Authentication scaffolding | No auth (NextAuth, Clerk, etc.) | High |
| Deployment automation | No Vercel/Netlify/Docker integration | High |
| PUT/DELETE/PATCH API routes | Only GET+POST generated | Medium |
| Form validation | No Zod/Yup schema generation | Medium |
| Testing scaffolding | No Jest/Vitest/Playwright test generation | Medium |
| CI/CD generation | No GitHub Actions generation | Low |
| Mobile app generation | No React Native/Flutter support | Medium |
| Desktop app generation | No Electron/Tauri support | Low |
| Memory/persistence | No cross-session learning | Low |
| Knowledge graph | No code pattern library | Low |
| MCP execution | No Model Context Protocol integration | Low |
| Visual design synthesis | No screenshot-to-code | Medium |
| Real-time collaboration | Single-user workspaces | Low |
| Version control | No Git integration | Medium |
| Performance optimization | No bundle analysis or code splitting | Low |
| Security hardening | No CSP, rate limiting, input sanitization | Medium |

---

## 7. Future Business Capabilities

### 7.1 Phase 2: Production Hardening (0-3 months)

| Capability | Description | Dependencies |
|---|---|---|
| Authentication scaffolding | NextAuth.js / Clerk integration | Prisma schema extension |
| CRUD completeness | PUT, DELETE, PATCH API routes | APICompiler extension |
| Form validation | Zod schema generation | Prisma-to-Zod mapping |
| Error boundaries | React error boundary components | AST patching |
| Loading states | Skeleton/spinner components | Atomic primitives |
| Responsive design | Mobile-first Tailwind breakpoints | Design system |
| SEO optimization | Meta tags, structured data, sitemap | Page generation |
| Testing scaffolding | Jest + React Testing Library setup | Sandbox extension |

### 7.2 Phase 3: Website Cloning (3-6 months)

| Capability | Description | Dependencies |
|---|---|---|
| Playwright web crawler | Navigate and extract from live sites | Playwright dependency |
| DOM component extraction | Identify and extract UI components | DOM analysis |
| Asset downloading | Download images, fonts, icons locally | Asset pipeline |
| Design token extraction | Extract colors, fonts, spacing from CSS | CSS parsing |
| Structure cloning | Replicate page hierarchy and navigation | Route mapping |
| Style cloning | Apply extracted styles to generated code | CSS-to-Tailwind conversion |

### 7.3 Phase 4: AI Software Factory (6-12 months)

| Capability | Description | Dependencies |
|---|---|---|
| Multi-agent orchestration | Specialized agents for frontend/backend/DB | Agent framework |
| MCP execution layer | Model Context Protocol for tool integration | MCP SDK |
| Memory systems | Cross-session learning and preference retention | Vector database |
| Knowledge graph | Code pattern library and best practices | Graph database |
| Visual design synthesis | Screenshot-to-code conversion | Vision model |
| Autonomous deployment | One-click deploy to Vercel/Netlify/Docker | Deployment APIs |
| Version control | Git commit/push/PR automation | GitHub API |
| Code review | AI-powered code quality review | LLM analysis |

---

## 8. Capability Maturity Assessment

| Capability | Maturity (0-100) | Evidence |
|---|---|---|
| Natural language understanding | 75 | BusinessClassifier (11 types) + ArchitectAgent (13 sub-domains) |
| Frontend generation | 70 | 31 atomic primitives, per-page JIT synthesis, Tailwind dark theme |
| Backend generation | 40 | APICompiler (GET+POST only), no auth, no validation |
| Database generation | 60 | DBCompiler (Prisma schema + client), no migrations, no seeds |
| State management | 35 | React Context only, no server state, no persistence |
| Code quality | 80 | 4-gate validation (regression, AST, simulation, TypeScript) |
| Self-healing | 75 | 5-retry loop with snapshot rollback, error compression |
| LLM integration | 70 | 3 providers with retry, JIT fallback, prompt engineering |
| Dependency intelligence | 85 | Full graph analysis, regression prediction, risk ranking |
| Testing | 45 | 4 verification scripts, test harness, no unit tests |
| Deployment | 10 | No deployment pipeline |
| Website cloning | 20 | ClonePlanGenerator exists, no crawler |
| Multi-framework | 0 | Locked to Next.js |
| Memory/learning | 0 | No persistence |
| Visual synthesis | 0 | No screenshot-to-code |
| **Overall Platform Maturity** | **45** | Strong engine core, weak surrounding infrastructure |

---

## Appendix A: Codebase Size Summary

| Category | Files | Lines |
|---|---|---|
| Core engine (`src/core/`) | 6 | 1,597 |
| Graph intelligence (`src/graph/`) | 3 | 259 |
| Decision intelligence (`src/intelligence/`) | 3 | 273 |
| Validation (`src/validation/`) | 2 | 333 |
| Compiler (`src/compiler/`) | 2 | 77 |
| Sandbox (`src/sandbox/`) | 1 | 149 |
| Generation (`src/generation/`) | 9 | 2,668 |
| Orchestrator (`src/agents/`) | 1 | 580 |
| Types (`src/types/`) | 1 | 124 |
| Templates (`src/compiler/`) | 27 | ~1,500 |
| Web UI (`web/`) | 12 | ~1,200 |
| Scripts (`scripts/`) | 4 | ~800 |
| **Total** | **~71** | **~9,560** |
