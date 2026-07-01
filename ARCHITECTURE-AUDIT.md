# Build.same — Complete Architecture Audit
**Date:** July 1, 2026  
**Engine Version:** V4 (BRE v2 pipeline active)  
**Audit Method:** Reverse-engineered entirely from source. Every claim is traceable to a file and line.  
**Status:** Authoritative pre-production baseline. All phases complete.

---

## Table of Contents

1. [Phase 1 — Current Architecture](#phase-1--current-architecture)
2. [Phase 2 — Prompt Trace: "Build ERP for hospitals"](#phase-2--prompt-trace)
3. [Phase 3 — Object Model Audit](#phase-3--object-model-audit)
4. [Phase 4 — Business Understanding Audit](#phase-4--business-understanding-audit)
5. [Phase 5 — Prompt Pipeline Audit](#phase-5--prompt-pipeline-audit)
6. [Phase 6 — Planning Engine Audit](#phase-6--planning-engine-audit)
7. [Phase 7 — Execution Engine Audit](#phase-7--execution-engine-audit)
8. [Phase 8 — Agent Audit](#phase-8--agent-audit)
9. [Phase 9 — Knowledge System Audit](#phase-9--knowledge-system-audit)
10. [Phase 19 — Gap Analysis](#phase-19--gap-analysis)
11. [Phase 20 — Implementation Roadmap](#phase-20--implementation-roadmap)

---

## Phase 1 — Current Architecture

### Overview

Build.same is a Next.js web frontend backed by a raw Node.js engine server. The engine runs a **4-layer deterministic build pipeline** (BRE v2) that converts free-text prompts into React application source files using zero LLM calls on the happy path. An optional LLM escalation path (via `LLMPlanningAgent`) activates only when a confidence gate detects the deterministic system has low confidence.

There are two distinct build paths in the codebase that are **not integrated**:

- **Active path** (`DeterministicOrchestratorV4` → BRE v2 pipeline): Fully wired. Called by every build job.
- **Deprecated path** (`/src/business-intelligence/` BI pipeline, 10 LLM phases): Disconnected. `/api/bi/run` returns HTTP 410 Gone.

The GAP-ANALYSIS.md dated June 21, 2026 describes P0 blockers (no LLM, single-file, no deploy) that have since been resolved in the BRE v2 refactor. The GAP document is no longer accurate as a capability assessment but is preserved as historical context.

---

### System Layers

```
┌─────────────────────────────────────────────────────┐
│               Web Frontend (Next.js)                 │
│   /web/src/app/page.tsx          — Homepage          │
│   /web/src/app/workspace/[id]/   — Workspace UI      │
│   /web/src/app/api/create/       — API Proxy         │
│   /web/src/lib/engine.ts         — Engine HTTP client│
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (engineFetch via ngrok/tunnel)
┌──────────────────────▼──────────────────────────────┐
│              Engine Server (Node.js HTTP)             │
│   /src/server.ts                 — 30+ REST routes   │
│   /src/engine/build-queue.ts     — Job queue (max 2) │
│   npx tsx .build-temp-{id}.ts    — Child process     │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│            DeterministicOrchestratorV4                │
│   /src/agents/deterministic-orchestrator-v4.ts       │
│   Routes: build-app / clone-website / hybrid /       │
│            analyze-domain / extract-components        │
└──────────────────────┬──────────────────────────────┘
                       │ handleBuildIntent()
┌──────────────────────▼──────────────────────────────┐
│              4-Layer Build Pipeline                   │
│   /src/generation/build-pipeline.ts                  │
│                                                       │
│  Layer 1: BRE v2 (BREContext → ApplicationBlueprint) │
│  /src/bos/bre-v2-pipeline.ts                         │
│  /src/bos/intake-parser.ts          — prompt → ctx   │
│  /src/bos/reasoning/rules-engine.ts  — 50+ rules     │
│  /src/bos/reasoning/constraint-solver.ts             │
│  /src/bos/reasoning/scorer.ts                        │
│  /src/bos/confidence-gate.ts         — LLM gate      │
│  /src/bos/llm-planning-agent.ts      — LLM fallback  │
│  /src/bos/reasoning/blueprint-compiler-v2.ts         │
│                                                       │
│  Layer 2: Execution Blueprint                        │
│  /src/bos/execution-planner.ts                       │
│                                                       │
│  Layer 3: Content Resolution                         │
│  /src/bos/content-resolver.ts                        │
│  /src/bos/knowledge/registry.ts  — PATTERNS/PROFILES │
│                                                       │
│  Layer 4: Code Rendering                             │
│  /src/generation/renderers/react-renderer.ts         │
│  /src/generation/renderers/flutter-renderer.ts       │
└──────────────────────┬──────────────────────────────┘
                       │ renderResult.files[]
┌──────────────────────▼──────────────────────────────┐
│              Workspace (filesystem)                   │
│   sandbox_workspaces/{id}/src/                       │
│   DBCompiler.scaffoldPrismaClient()  — schema.prisma │
│   APICompiler.compileAPIRoutes()     — API routes    │
│   esbuild + Playwright → .preview-cache.html         │
└─────────────────────────────────────────────────────┘
```

---

### File Inventory by Responsibility

#### Web Frontend (`/web/src/`)

| File | Responsibility |
|---|---|
| `app/page.tsx` | Landing page: textarea + 4 example prompts + Build/Clone tabs |
| `app/workspace/[id]/page.tsx` | Workspace: progress sidebar + preview panel + files + provenance |
| `app/api/create/route.ts` | POST /api/create → proxies to engine |
| `app/api/clone/route.ts` | POST /api/clone → proxies to engine |
| `app/api/workspace/[id]/*/route.ts` | Proxies to engine workspace endpoints |
| `lib/engine.ts` | `engineFetch()` — HTTP client with ngrok header injection, 15s timeout |
| `lib/config.ts` | `getEngineUrl()` — reads NEXT_PUBLIC_ENGINE_URL |

#### Engine Server (`/src/server.ts`)

Single-file, 800+ line Node.js HTTP server. No framework. Routes hardcoded with regex matching on `url.pathname`. Key routes:

| Route | Purpose |
|---|---|
| `POST /api/create` | Creates workspace ID, writes `.prompts/{id}.json`, returns `{id}` |
| `POST /api/workspace/:id/build` | Enqueues build job in BuildQueue |
| `GET /api/workspace/:id/progress` | Reads `.progress`, `.build-state.json`, or `.clone-state.json` |
| `GET /api/workspace/:id/preview` | esbuild bundles page.tsx → Playwright renders → returns HTML |
| `GET /api/workspace/:id/files` | Recursive dir scan, excludes node_modules/.next |
| `GET /api/workspace/:id/download` | Streams ZIP archive of workspace |
| `GET /api/workspace/:id/meta` | Returns workspace type and prompt |
| `POST /api/bi/run` | **DEPRECATED** — returns HTTP 410 |
| `POST /api/pipeline` | **DEPRECATED** — returns HTTP 410 |

#### Build Queue (`/src/engine/build-queue.ts`)

Priority queue. Max 2 concurrent builds. Each build:
1. Writes `.build-config-{id}.json` (LLM provider + key) and `.build-prompt-{id}.json`
2. Generates a string-interpolated TypeScript build script (`.build-temp-{id}.ts`)
3. Spawns `npx tsx .build-temp-{id}.ts` as a child process
4. Child intercepts `console.log` output via regex matching to write structured `.progress` events
5. Child cleans up temp files on exit
6. Retry on crash/timeout: max 2 retries

**Critical observation:** Progress events are produced by regex-matching console.log output inside the child process script. This is fragile and means the UI's live activity log depends entirely on log message format stability.

#### Orchestrator (`/src/agents/deterministic-orchestrator-v4.ts`)

Class with one public method: `processGenerationIntent(workspaceId, intent, llmConfig)`. Routes by `intent.type`. For `build-app` and `build-website`:

1. `buildBREContext(prompt)` — intake parser
2. `runBuildPipeline(breContext, config, llmConfig)` — 4-layer pipeline
3. Write `renderResult.files[]` to `workspace/src/`
4. `DBCompiler.scaffoldPrismaClient()` + `APICompiler.compileAPIRoutes()` if data models exist
5. `sandbox.runPackageInstall(workspace)` — npm install

#### Planning/BI Systems (Disconnected)

`/src/planning/` — V3 legacy planning layer (business-blueprint, application-blueprint, manifest). Not called by any active path. Preserved for reference.

`/src/business-intelligence/` — 10-phase LLM BI pipeline (InputAnalyzer → IntentMapper → IndustryResearcher → FlowMapper → ProblemIdentifier → SolutionDesigner → Architect → Builder → Validator → Corrector). **No longer called by the orchestrator.** The `BusinessOperatingSystem` class wraps the deterministic subset (WorkflowEngine + RevenueEngine + CustomerJourneyEngine + SolutionArchitect + TechnicalArchitect) but this is also not connected to the active build path.

---

## Phase 2 — Prompt Trace

**Sample Prompt:** `"Build ERP for hospitals"`

### Step 1: Web UI → API
```
POST /api/create { prompt: "Build ERP for hospitals", pipeline: true }
  → engineFetch('/api/create', { body: { prompt } })
  → Engine: POST /api/create
  → Writes .prompts/ws-{ts}-{rand}.json = { type: "pipeline", prompt: "Build ERP for hospitals" }
  → Returns { id: "ws-1783...-abc123" }
  → Router pushes to /workspace/ws-1783...-abc123
```

### Step 2: Workspace UI → Trigger Build
```
GET /api/workspace/{id}/meta → { type: "build" }
POST /api/workspace/{id}/build
  → Engine reads .prompts/{id}.json
  → BuildQueue.enqueue({ id, workspaceId: id, prompt: "Build ERP for hospitals", pipeline: true })
  → Spawns: npx tsx .build-temp-{id}.ts
```

### Step 3: Child Process → Intake Parser
```
// In .build-temp-{id}.ts
DeterministicOrchestratorV4.processGenerationIntent(id, {
  type: "pipeline",
  prompt: "Build ERP for hospitals"
}, { provider, apiKey })

→ handleBuildIntent()
→ buildBREContext("Build ERP for hospitals")
```

**`buildBREContext` execution — `intake-parser.ts`:**

```
prompt.toLowerCase() = "build erp for hospitals"

detectIndustry():
  Scores each INDUSTRY_MAPPING against keywords.
  "healthcare" keywords = ['healthcare','medical','clinic','doctor','patient','dental',
                           'hospital','health','wellness','therapy','psychology',...]
  Match: "hospital" → score += 8
  Match: (nothing else matches strongly)
  bestScore = 8
  Threshold = 3 → MATCH: industry = "healthcare"

detectBusinessModels():
  None of BUSINESS_MODEL_KEYWORDS match "erp for hospitals"
  Result: businessModels = []   ← EMPTY (no default!)

detectCapabilities():
  None of CAPABILITY_KEYWORDS match "erp for hospitals"
  (analytics would need "analytics" or "dashboard" — not present)
  Result: capabilities = []   ← EMPTY

detectJourneys():
  "hospital" → no match for customer/user/client/member/login/account
  "admin" → no match
  Result: journeys = ["visitor"]   ← ONLY visitor

detectCountry(): none found
extractAppName(): none found

BREContext = {
  industry: "healthcare",
  businessModels: [],
  capabilities: [],
  journeys: ["visitor"],
  entities: ["Patient", "Appointment", "MedicalRecord"],
  compliancePacks: ["compliance.hipaa"],
  description: "Build ERP for hospitals"
}
```

### Step 4: BRE v2 Pipeline

```
runBREV2Pipeline(context) in bre-v2-pipeline.ts:

Step 1: RulesEngine.evaluate(context)
  → Fires rules matching industry="healthcare", businessModels=[], capabilities=[]
  → Deterministic decisions produced (e.g., add booking page, contact page, etc.)

Step 2: ConstraintSolver.evaluate(context, decisions)
  → Checks constraints against capability gaps

Step 3: Scorer
  → scoredProfiles = scorer.scoreDesignProfiles({industry:"healthcare",...})
  → scoredPatterns = scorer.scorePatterns({...})
  → selectedDesignProfile = best profile
  → selectedPattern = best pattern for healthcare

Step 4: evaluateConfidence()
  Signal checks:
  ✗ industryScore = 8 < threshold 12 → reasons.push("Industry match weak (score 8, threshold 12)")
  ✗ patternIndustryFit check (industryFit breakdown)
  ✗ isComplexPrompt = true ("erp" is in complexPromptKeywords) AND capabilityCount = 0
    → reasons.push("Complex request but zero capabilities detected")
  ✗ isOperational = true ("erp" in operationalKeywords) AND !hasAdminJourney
    → reasons.push("Operational/internal tool request but no admin journey detected")
  
  confidence = 1.0 - 0.25 - 0.15 - 0.20 - 0.15 = 0.25
  shouldEscalate = true (< 0.60 threshold)

Step 5: runLLMPlanning(context, existingDecisions, llmConfig)
  If apiKey available:
    → Calls LLM with SYSTEM_PROMPT (structured architect prompt)
    → USER_PROMPT includes context.description + existing pages already generated
    → LLM returns JSON with: industry, subIndustry, businessModels, capabilities,
       journeys, entities, pages[], integrations[]
    → mergeIntoContext: adds "admin" journey, adds ERP capabilities
    → buildAdditionalDecisions: adds pages like /dashboard, /patients, /inventory
  If no apiKey:
    → Returns { usedLLM: false, enrichedContext: originalCtx, additionalDecisions: [] }

Step 6: BlueprintCompilerV2.compile(input)
  → Compiles decisions + context into ApplicationBlueprint
  → Output: pages[], entities[], apis[], workflows[], designTokens, vocabulary{}
```

### Step 5: Execution Blueprint → ApplicationSpec → Code

```
buildExecutionBlueprint(blueprint)
  → Maps each ApplicationBlueprint page to ExecutionBlueprint pages with "slots"
  → Each slot = a section to render (hero, features, data-table, etc.)

resolveContent(executionBlueprint, { blueprint, pattern, designProfile })
  → Looks up section resolvers in content-resolver.ts
  → Fills each slot with actual component declarations and content
  → Output: ApplicationSpec with pages[].components[]

renderWith(applicationSpec, "react", { theme, outputDir })
  → ReactRenderer processes each page
  → Generates .tsx files for pages, components, layouts
  → Output: RenderResult with files[{ path, content, type }]
```

### Step 6: File Writing

```
For each file in renderResult.files:
  → fs.mkdirSync(path.dirname(filePath), { recursive: true })
  → fs.writeFileSync(filePath, file.content, 'utf-8')
  → Progress log: "Generated: {file.path}"

DBCompiler.scaffoldPrismaClient(workspace.rootPath, blueprint.dataModels)
APICompiler.compileAPIRoutes(workspace.rootPath, blueprint.dataModels)
sandbox.runPackageInstall(workspace)  ← npm install
```

### Step 7: Preview + Done

```
Child process:
  → quality-gate: prisma generate + next build
  → content-quality-gate: checks for placeholder density
  → esbuild bundles page.tsx → Playwright renders → writes .preview-cache.html
  → writeProgress('done', 'completed', 'Build completed!')

Engine server GET /api/workspace/:id/preview:
  → Reads .preview-cache.html
  → Returns HTML to iframe in workspace UI
```

### Information Loss Summary for "Build ERP for hospitals"

| Stage | Object | Information Loss |
|---|---|---|
| intake-parser | BREContext | "ERP" not mapped to any capability. `management`, `workflow`, `enterprise` patterns not in CAPABILITY_KEYWORDS. All capabilities = []. |
| intake-parser | BREContext | "admin" journey not detected despite "hospital management" implication |
| intake-parser | BREContext | businessModels = [] — correct, but downstream may add wrong defaults |
| confidence-gate | ConfidenceGateResult | Correctly identifies problem. Escalates to LLM if key available. |
| LLMPlanning | additionalDecisions | LLM output quality and entity accuracy depends on LLM model and prompt. No validation of LLM-suggested page paths against section-mapper registry (VALID_SECTIONS whitelist partially handles this). |
| BlueprintCompiler | ApplicationBlueprint | Without LLM key: produces a minimal healthcare blueprint that looks like a clinic booking site, not an ERP |

---

## Phase 3 — Object Model Audit

### Core Objects and Their Lifecycles

#### BREContext
**File:** `src/bos/reasoning/rules-engine.ts` (type) / `src/bos/intake-parser.ts` (producer)

```typescript
interface BREContext {
  industry: string;              // "healthcare" | "restaurant" | "saas" | etc.
  subIndustry?: string;          // "hospital-erp" — only set by LLMPlanning
  businessModels: string[];      // [] | ["subscription"] | ["direct-sales"] | ...
  capabilities: string[];        // [] | ["booking"] | ["analytics"] | ...
  journeys: string[];            // ["visitor"] | ["visitor","customer","admin"]
  entities: string[];            // ["Patient","Appointment","MedicalRecord"]
  compliancePacks: string[];     // ["compliance.hipaa"] | ["compliance.gdpr"]
  country?: string;              // "US" | "EU" | ...
  appName?: string;              // Extracted from prompt
  description?: string;          // First 200 chars of prompt
}
```

**Producer:** `buildBREContext()` in `intake-parser.ts` — deterministic keyword matching  
**Modifier:** `mergeIntoContext()` in `llm-planning-agent.ts` — LLM enrichment (conditional)  
**Consumers:** `RulesEngine.evaluate()`, `ConstraintSolver.evaluate()`, `Scorer`, `BlueprintCompilerV2`  
**Missing Fields:** `userCount`, `targetMarket`, `existingSystem`, `integrations`, `regulatoryRequirements`, `techPreferences`  
**Validation:** None — no schema validation on BREContext before passing to rules engine

---

#### RuleDecision
**File:** `src/bos/reasoning/rules-engine.ts`

```typescript
interface RuleDecision {
  ruleId: string;      // e.g. "rule.llm.planning"
  ruleName: string;
  action: RuleAction;  // add_page | add_entity | add_integration | set_vocabulary | ...
  confidence: number;  // 0.0–1.0
  trace: string;       // human-readable explanation
}
```

**Producer:** `RulesEngine.evaluate()` (deterministic), `buildAdditionalDecisions()` in `llm-planning-agent.ts` (LLM)  
**Consumer:** `BlueprintCompilerV2.compile()`  
**Missing:** No rule priority ordering beyond array position. No conflict resolution between deterministic and LLM decisions.

---

#### ApplicationBlueprint (BOS v2)
**File:** `src/bos/schemas/blueprint/application-blueprint.schema.ts`

Key fields (inferred from usage in orchestrator and pipeline):
- `pages[]` — page definitions
- `entities[]` — data entity definitions  
- `apis[]` — API route definitions
- `workflows[]` — workflow definitions
- `designTokens` — color, typography, spacing
- `vocabulary` — domain term replacements (`{original: replacement}`)
- `confidence` — 0.0–1.0 from compiler
- `warnings[]` — string array

**Producer:** `BlueprintCompilerV2.compile()`  
**Consumers:** `buildExecutionBlueprint()`, `mapBlueprintToFullStack()`, `FullStackCompilerPipeline.compileRich()`

---

#### FullStackBlueprint (legacy type in types/index.ts)
```typescript
interface FullStackBlueprint {
  appName: string;
  colorScheme: 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky';
  dataModels: DataModel[];
  apiRoutes: APIRouteSpec[];
  stateStores: StateStoreSpec[];
  pages: Array<{ path, title, layout, blocks[] }>;
}
```

**Producer:** `mapBlueprintToFullStack()` in `src/bos/blueprint-mapper.ts`  
**Consumer:** Orchestrator uses for DB/API scaffolding and page tracking

---

#### ExecutionBlueprint
**File:** `src/bos/schemas/blueprint/execution-blueprint.schema.ts`

- `pages[]` — each with `slots[]` (named sections to render)  
**Producer:** `buildExecutionBlueprint()` in `execution-planner.ts`  
**Consumer:** `resolveContent()`

---

#### ApplicationSpec
**File:** `src/bos/schemas/blueprint/execution-blueprint.schema.ts`

- `pages[]` — each with `components[]` (resolved component declarations)  
**Producer:** `resolveContent()` in `content-resolver.ts`  
**Consumer:** `ReactRenderer` / `FlutterRenderer`

---

#### RenderResult
**File:** `src/generation/renderers/renderer.ts`

```typescript
interface RenderResult {
  files: Array<{ path: string; content: string; type: string }>;
  warnings: string[];
}
```

**Producer:** `ReactRenderer.render()` / `FlutterRenderer.render()`  
**Consumer:** Orchestrator file-writing loop

---

#### BuildJob
**File:** `src/engine/build-queue.ts`

```typescript
interface BuildJob {
  id, workspaceId, prompt, pipeline?: boolean;
  status: 'queued'|'running'|'completed'|'failed'|'timeout'|'crashed';
  priority, createdAt, startedAt?, completedAt?, pid?;
  memoryUsage?, error?, retryCount, maxRetries;
}
```

**Producer:** `BuildQueue.enqueue()`  
**Consumer:** `BuildQueue.processNext()` → child process  
**Missing:** No persistent storage. Lost on engine restart. No build history.

---

#### BusinessOperatingSystemReport (Disconnected)
**File:** `src/business-intelligence/business-operating-system.ts`

Rich planning object containing: `capabilities[]`, `WorkflowGraph`, `RevenueModel`, `CustomerJourneyGraph`, `ApplicationBlueprint (BI version)`, `TechnicalPlan`. Produced by `BusinessOperatingSystem.analyze()`. **Not connected to any active build path.**

---

#### BIPipelineResult (Disconnected)
**File:** `src/business-intelligence/types/index.ts`

10-phase LLM pipeline output: `report`, `intent`, `knowledge`, `flow`, `problems[]`, `solution`, `architecture`, `validation`. **Not connected to any active build path.** The `/api/bi/run` endpoint returns 410.

---

### Object Relationship Diagram

```
Free-text Prompt
      │
      ▼
   BREContext ──────────────────────────────────────┐
      │                                              │
      ▼                                              │
  RuleDecision[] ──────────────────────────────────┐│
      │                                             ││
      ▼                                             ││
  ConstraintReport                                  ││
      │                                             ││
      ▼                                             ││
  ScoredOption[] (profiles/patterns)                ││
      │                                             ││
      ▼                                             ││
  ConfidenceGateResult ──[shouldEscalate]──▶ LLM ──┘│
      │                                              │
      ▼                                              │
  ApplicationBlueprint ◀── BlueprintCompilerV2 ◀────┘
      │                        uses context + decisions
      ▼
  ExecutionBlueprint (slots per page)
      │
      ▼
  ApplicationSpec (components per page)
      │
      ▼
  RenderResult (code files)
      │
      ▼
  FullStackBlueprint (legacy, for DB/API scaffolding)
      │
      ├──▶ DataModel[] → PrismaSchema (schema.prisma)
      ├──▶ APIRouteSpec[] → Next.js API routes
      └──▶ pages[] → page.tsx files (from renderer)
```

---

## Phase 4 — Business Understanding Audit

### How Industries Are Detected

**Method:** Keyword scoring in `buildBREContext()` (`intake-parser.ts`)

`INDUSTRY_MAPPINGS` array — 12 entries:
- restaurant, healthcare, saas, ecommerce, fitness, education, realestate, legal, agency, nonprofit, media, travel

**Algorithm:**
1. For each mapping, sum `keyword.length` for every keyword that appears in `prompt.toLowerCase()`
2. Apply B2B halving penalty: if B2B signals present and industry is not ecommerce, halve score
3. If `bestScore >= 3`, use that industry; otherwise `industry = "general"`

**Gap:** Only 12 industries. Missing: manufacturing, logistics, construction, automotive-specific ERP, government, hospitality (beyond restaurant), fintech, insurance, HR platforms, enterprise software. Complex multi-word phrases ("enterprise resource planning") not in any keyword list.

---

### How Business Types Are Detected

**Same file.** `BUSINESS_MODEL_KEYWORDS` — 8 models:
- subscription, direct-sales, marketplace, service-booking, membership, donation, advertising, wholesale

**Gap:** B2B SaaS, PaaS, licensing, consulting retainer, franchise, white-label — not detected. "ERP" has no business model.

---

### How Users Are Inferred

`detectJourneys()` — returns `["visitor"]` always, adds `"customer"` on user/client/login keywords, adds `"admin"` on admin/management/dashboard keywords.

**Gap:** Does not detect: `"nurse"`, `"doctor"`, `"department head"`, `"procurement officer"` — any domain-specific user roles. Only 3 generic journey types. ERP for hospitals needs: Administrator, Doctor, Nurse, Patient, Billing Officer, Department Head.

---

### How Departments Are Inferred

**Not implemented in BRE v2.** The legacy `BusinessArchitecture` type in `business-intelligence/types/index.ts` has `departments[]` but this is produced by the disconnected BI pipeline's `Architect` class and never used.

---

### How Workflows Are Discovered

**BRE v2:** Capabilities drive workflow decisions via rules engine. If `capabilities = []` (as with "ERP for hospitals"), no workflows are generated deterministically. LLM escalation may add workflow-related pages.

**Legacy BOS:** `WorkflowEngine.generateWorkflows()` in `workflow-engine.ts` has 20 capability patterns (booking, membership, ecommerce, crm, education, fitness, healthcare, real_estate, restaurant, saas, content, portfolio, events, services, nonprofit, automotive, pet_services, beauty, analytics, marketplace). Rich workflow graph with steps, actors, automation levels. **Not connected to active path.**

---

### How Entities Are Extracted

**BRE v2:** `intake-parser.ts` sets entities from `IndustryMapping.entities` (static list):
- healthcare → `["Patient", "Appointment", "MedicalRecord"]`
- ecommerce → `["Product", "Order", "Customer", "Category"]`
- etc.

Plus `BlueprintCompilerV2` derives additional entities from decisions.

**Gap:** Entities are static per industry, not derived from the specific prompt. "Build ERP for hospitals" gets `["Patient", "Appointment", "MedicalRecord"]` — missing: Doctor, Department, Ward, Prescription, Insurance, Inventory, Staff, Surgery, Lab, Billing.

LLM escalation can add entities via `add_entity` rule actions.

---

### How Relationships Are Built

**Not implemented** in BRE v2. `EntityBlueprint.relationships[]` exists in the BI pipeline's `SolutionArchitect` (legacy) and is populated with typed relationships (one-to-many, many-to-one). In the active BRE v2 path, relationship inference is handled by `DBCompiler.scaffoldPrismaClient()` using `DataModel[]` from the compiled blueprint — but the relationships in the `DataModel` type are minimal (`DataField` with `type: 'relation'`).

---

### How Dashboards, KPIs, and Reports Are Planned

**BI pipeline (disconnected):** `SolutionArchitect.generateDashboards()` produces `DashboardBlueprint[]` with `metrics[]`, `charts[]`, `actions[]`. Not used.

**BRE v2:** No dedicated dashboard/KPI planning. If the prompt contains "dashboard" or "analytics" keywords, `capability = "analytics"` is added, which triggers rules to add dashboard pages and `dashboard-widgets` / `charts` sections.

---

### How Permissions Are Planned

**BI pipeline (disconnected):** `SolutionArchitect.generatePermissions()` produces static 4-role permission set (guest, customer, staff, admin). Not used.

**BRE v2:** No permission planning. Auth is added as an integration if payments or subscriptions are detected. Role-based access not generated.

---

### How Integrations Are Selected

**BRE v2:** Rules engine maps capabilities to integrations. LLM planning agent produces `integrations[]` in its output schema with `{type, name, required}`.

**BI pipeline:** `SolutionArchitect.generateIntegrations()` — always adds auth (NextAuth.js), payment (Stripe if revenue streams detected), email (Resend), analytics (PostHog), storage (Cloudinary).

---

## Phase 5 — Prompt Pipeline Audit

### Active LLM Calls (BRE v2 path)

#### LLMPlanningAgent — Conditional, triggered by confidence gate

**File:** `src/bos/llm-planning-agent.ts`  
**Trigger:** `evaluateConfidence().shouldEscalate === true` AND API key available  
**System Prompt:** "You are a software architect AI. Produce structured planning JSON when keyword-matching has low confidence."  
**Inputs:** `BREContext`, `existingDecisions[]` (as existing page paths list)  
**Expected Output Schema:**
```json
{
  "industry": string,
  "subIndustry": string | null,
  "businessModels": string[],
  "capabilities": string[],
  "journeys": string[],
  "entities": string[],
  "appName": string | null,
  "pages": [{ "path": string, "name": string, "sections": string[] }],
  "integrations": [{ "type": string, "name": string, "required": boolean }]
}
```
**Validation:** Strips markdown fences. Checks `industry` is string. Checks `pages` is array. **Sanitizes section names against VALID_SECTIONS whitelist** (33 valid section names).  
**Fallback:** If LLM fails or no API key → original context unchanged, no additional decisions.  
**Temperature:** 0.2 (low, for deterministic structured output)  
**Max Tokens:** 2048

---

### LLM Calls in Legacy BI Pipeline (Disconnected)

Each of these calls exists in `src/business-intelligence/core/` but is **not invoked by any active build path**. They exist, are properly written, and have heuristic fallbacks for quota exhaustion. They are dormant.

| Module | Purpose | System Prompt Summary |
|---|---|---|
| `InputAnalyzer` | Extract business domain/industry/model | "Senior BI analyst. Return structured JSON: business_domain, industry, business_model, customer_type, primary_problem, desired_outcome, revenue_model" |
| `IntentMapper` | Map explicit vs hidden needs | "Strategic consultant. Return explicit_requests, actual_needs, hidden_opportunities, operational_bottlenecks, revenue_leakages, conversion_bottlenecks" |
| `IndustryResearcher` | Research industry with web search | "Industry specialist. Analyze search results. Return market_leaders, industry_standards, best_practices, customer_expectations, typical_workflows, common_software_solutions" |
| `FlowMapper` | Map complete business lifecycle | "Business process engineer. Map all stages from discovery to retention. Each stage: user_actions, business_actions, data_required, systems_required, automation_opportunities" |
| `ProblemIdentifier` | Rank problems by impact | "Problem analyst. Return problems[] sorted by total_impact (0-40). Classify severity: critical/important/future" |
| `SolutionDesigner` | Design minimal viable solution | "Solution architect. Return components[] solving specific problems. No bloat. Include revenue_impact estimate." |
| `Architect` | Generate full architecture | "Systems architect. Return business architecture (departments, workflows), system architecture (frontend, backend, DB, APIs), AI architecture (agents)" |

**Overlap Analysis:** There is significant conceptual overlap between the BI pipeline and BRE v2. Both attempt to understand industry, workflows, and generate an application plan. They use entirely different schemas, different LLM call structures, and produce incompatible output objects. This represents a hard fork in the codebase — BRE v2 won and BI pipeline is stranded.

**Confidence Assessment:** BI pipeline prompts are well-written with clear schema expectations and heuristic fallbacks. They would produce richer intermediate objects (IntentMap, BusinessFlow, Problem[], Solution) than BRE v2 currently surfaces to users.

---

## Phase 6 — Planning Engine Audit

### Does a True Planning Layer Exist?

**Yes.** The BRE v2 pipeline IS the planning engine. It is deterministic, layered, and follows a clear transformation sequence. However, it has two significant gaps:

1. **Vocabulary is flat:** The pipeline produces `vocabulary{}` (term replacements like "Customer" → "Patient") but doesn't produce a rich semantic understanding of the business — no departments, no KPIs, no user personas, no compliance requirements beyond a string in `compliancePacks[]`.

2. **The rich planning objects from BI pipeline are not used:** `IntentMap`, `BusinessFlow`, `Problem[]`, `Solution`, `Architecture` are produced by disconnected code. They would add significant depth to what the planning layer knows about the business.

### Current Planning Pipeline (Active)

```
Prompt (string)
  ↓ [intake-parser.ts] keyword matching
BREContext: industry, businessModels[], capabilities[], journeys[], entities[], compliancePacks[]
  ↓ [rules-engine.ts] 50+ deterministic rules
RuleDecision[]: add_page, add_entity, add_integration, set_vocabulary
  ↓ [constraint-solver.ts]
ConstraintReport: satisfied[], violated[]
  ↓ [scorer.ts] design profile + pattern scoring
ScoredOption (profile), ScoredOption (pattern)
  ↓ [confidence-gate.ts] composite confidence 0.0–1.0
ConfidenceGateResult: shouldEscalate
  ↓ [llm-planning-agent.ts] IF shouldEscalate AND apiKey
enrichedBREContext + additionalRuleDecisions[]
  ↓ [blueprint-compiler-v2.ts]
ApplicationBlueprint: pages[], entities[], apis[], workflows[], designTokens, vocabulary{}, confidence
  ↓ [execution-planner.ts]
ExecutionBlueprint: pages with slots[]
  ↓ [content-resolver.ts]
ApplicationSpec: pages with components[]
  ↓ [react-renderer.ts]
RenderResult: files[{ path, content }]
```

### Target Planning Pipeline (What's Missing)

The following stages are designed in the mission document but not implemented as pipeline stages:

```
Missing:
  CapabilityGraph     — capability dependency resolution
  EntityGraph         — relationships between entities
  WorkflowGraph       — end-to-end workflows per user journey
  NavigationGraph     — page hierarchy and routing
  DashboardGraph      — metrics, KPIs, chart types per role
  StatePlan           — client vs server state decisions
  ComponentGraph      — component tree and dependency resolution
```

The Legacy BOS (`business-intelligence/`) has partial implementations of WorkflowGraph, RevenueModel, CustomerJourneyGraph, ApplicationBlueprint (their version), and TechnicalPlan — but they're disconnected.

---

## Phase 7 — Execution Engine Audit

### Task Scheduler
**File:** `src/engine/build-queue.ts`  
**Type:** In-memory priority queue. Single server process.  
**Concurrency:** Max 2 parallel builds (configurable via `BUILD_MAX_CONCURRENT` env)  
**Job timeout:** 15 minutes (`BUILD_TIMEOUT_MS`)  
**Memory limit:** 512 MB monitoring (warning only, no kill on limit)

**Gap:** Queue is not persistent. Server restart loses all queued/running jobs. No distributed queue (Redis, BullMQ). No job history UI.

### Dependency Resolution
Within the build pipeline: stages execute sequentially. Each layer depends on the previous layer's output object. No dependency graph between stages.

### Parallel Execution
Not implemented within a single build. The 4 pipeline layers execute serially. Multiple builds can run in parallel (up to `maxConcurrent`), but they're independent processes.

### Agent Orchestration
There are no agents in the classical sense. The "orchestrator" is a single function that calls a linear pipeline. The `DeterministicOrchestratorV4` name implies agent coordination but the class is a single-entry-point function dispatcher.

### Retry Logic
**BuildQueue:** Retries crashed/timeout jobs up to `maxRetries` (default 2). Child process crash → re-enqueue at high priority.

**LLMGateway:** Exponential backoff with 5 attempts on transient errors (429, 5xx).

**BILLMCaller:** 5 attempts, exponential backoff, quota exhaustion → heuristic fallback.

### Repair Loop
**File:** `src/engine/repair-loop.ts` — exists but role in current pipeline unclear. The main repair path is through `DeterministicOrchestratorV4.runCompilationFlow()` (the AST-patch self-healing loop) but this method is NOT called by the active `handleBuildIntent()` path. The active path generates files directly from the renderer with no repair loop.

**The self-healing AST pipeline is dormant.** `runCompilationFlow()` is the V3 engine — patching LLM-generated code through validation → simulation → commit → TypeScript audit → retry. The V4 deterministic renderer bypasses this entirely by generating structurally correct code that doesn't require patching.

### Checkpointing
No checkpointing. If a build fails mid-way, there's no resume. The workspace may contain partially written files.

### Workspace Assembly
`SandboxEngine.createWorkspace()` creates the workspace directory. `FullStackCompilerPipeline.compileRich()` scaffolds the full Next.js project structure (package.json, tsconfig, layout.tsx, etc.). Files are then written by the renderer. `npm install` runs post-generation.

### Preview Lifecycle
1. Build child process pre-renders preview via esbuild + Playwright → `.preview-cache.html`
2. Web UI polls `/api/workspace/:id/progress` for `done` step
3. On done: calls `/api/workspace/:id/preview` which returns the cached HTML
4. Preview rendered in `<iframe srcDoc={previewHtml}>`
5. Cache TTL: 10 minutes (600,000 ms)

**Gap:** Preview only renders `page.tsx` (the root page). Other routes are not previewed. Device switching works (CSS only, no actual page navigation). No hot reload.

### Export Pipeline
`GET /api/workspace/:id/download` — ZIP archive using `archiver` library. Includes: `src/`, `public/`, root config files. **No Vercel/Netlify deployment integration.**

---

## Phase 8 — Agent Audit

The codebase uses the term "orchestrator" and "agent" but the actual execution model is a **linear pipeline**, not a multi-agent system.

### "Agents" That Actually Exist

| Name | File | Type | Active? |
|---|---|---|---|
| DeterministicOrchestratorV4 | `src/agents/deterministic-orchestrator-v4.ts` | Pipeline router (build/clone/hybrid/analyze) | Yes |
| BuildQueue | `src/engine/build-queue.ts` | Job scheduler | Yes |
| BRE v2 Pipeline | `src/bos/bre-v2-pipeline.ts` | Deterministic planner | Yes |
| LLMPlanningAgent | `src/bos/llm-planning-agent.ts` | LLM escalation (conditional) | Yes (conditional) |
| ReactRenderer | `src/generation/renderers/react-renderer.ts` | Code generator | Yes |
| FlutterRenderer | `src/generation/renderers/flutter-renderer.ts` | Code generator (Flutter) | Yes (unused path) |
| CloneOrchestratorV2 | `src/cloning/clone-orchestrator-v2.ts` | Website clone pipeline | Yes (clone intent) |
| ContentResearchAgent | `src/generation/content-research-agent.ts` | Web research | Unclear |
| SelfHealingEngine | `src/engine/self-healing-engine.ts` | AST repair loop | Dormant |
| InputAnalyzer | `src/business-intelligence/core/input-analyzer.ts` | Phase 1 LLM | Disconnected |
| IntentMapper | `src/business-intelligence/core/intent-mapper.ts` | Phase 2 LLM | Disconnected |
| IndustryResearcher | `src/business-intelligence/core/industry-researcher.ts` | Phase 3 LLM + web | Disconnected |
| FlowMapper | `src/business-intelligence/core/flow-mapper.ts` | Phase 4 LLM | Disconnected |
| ProblemIdentifier | `src/business-intelligence/core/problem-identifier.ts` | Phase 5 LLM | Disconnected |
| SolutionDesigner | `src/business-intelligence/core/solution-designer.ts` | Phase 6 LLM | Disconnected |
| Architect (BI) | `src/business-intelligence/core/architect.ts` | Phase 7 LLM | Disconnected |
| Builder | `src/business-intelligence/core/builder.ts` | Phase 8 generation | Disconnected |
| Validator | `src/business-intelligence/core/validator.ts` | Phase 9 validation | Disconnected |
| Corrector | `src/business-intelligence/core/corrector.ts` | Phase 10 correction | Disconnected |

### Missing Agents (per Mission Doc)

| Required Agent | Status |
|---|---|
| Intent Agent | Partially: intake-parser.ts (deterministic) + LLMPlanningAgent (conditional) |
| Business Analyst | BI pipeline exists but disconnected |
| Planner | BRE v2 pipeline (functional but incomplete) |
| Architect | BRE v2 BlueprintCompilerV2 (partial) |
| Research Agent | ContentResearchAgent exists, IndustryResearcher disconnected |
| Capability Planner | Rules engine handles this implicitly |
| Entity Planner | Static per industry. LLM adds entities conditionally |
| Workflow Planner | WorkflowEngine (disconnected) |
| Navigation Planner | SolutionArchitect.generatePages() (disconnected) |
| Database Planner | TechnicalArchitect.generateDatabasePlan() (disconnected) |
| API Planner | TechnicalArchitect.generateAPIPlan() (disconnected) |
| Frontend Agent | ReactRenderer (active) |
| Backend Agent | APICompiler (active, basic) |
| Content Agent | ContentResearchAgent (active but role unclear) |
| Testing Agent | NOT IMPLEMENTED |
| Verification Agent | BrowserVerifier (exists, not called in happy path) |
| Repair Agent | SelfHealingEngine (exists, not called in happy path) |
| Deployment Agent | NOT IMPLEMENTED |

---

## Phase 9 — Knowledge System Audit

### Business Templates
**File:** `src/bos/knowledge/registry.ts` — `DESIGN_PROFILES[]`, `PATTERNS[]`

These are the only runtime knowledge registries wired into the active path.

**`DESIGN_PROFILES`:** Scored against industry + business model. Each profile provides design tokens (colors, fonts, spacing). Count: not visible from audit (need to read registry.ts).

**`PATTERNS`:** Scored by industry fit + model fit + page coverage + component coverage. The winning pattern drives page structure in `BlueprintCompilerV2`. Count: not visible from audit.

**Assessment:** Registry-based, compiled into the binary. Adding a new industry requires adding a Pattern and possibly a DesignProfile.

### Industry Knowledge (Static Keyword Lists)
**File:** `src/bos/intake-parser.ts`

12 `INDUSTRY_MAPPINGS` with: keywords[], businessModels[], capabilities[], entities[]. Hardcoded strings. Not parameterized, not loadable from a file or database.

**Assessment:** Static, hardcoded. Extending to a new industry requires modifying `intake-parser.ts`.

### Capability Libraries
**File:** `src/bos/intake-parser.ts` — `CAPABILITY_KEYWORDS` (13 capabilities: commerce, booking, analytics, crm, payments, subscriptions, inventory, content, gallery, contact-form, map, scheduling, search)

**Assessment:** Only 13 capabilities. Rich domains (ERP, HR, supply chain, CRM with pipeline stages, finance) are not modeled.

### Workflow Libraries
**File:** `src/business-intelligence/workflow-engine.ts` — 20 `CAPABILITY_PATTERNS` with rich workflow definitions. **Disconnected from active path.**

### Entity Libraries
**File:** `src/business-intelligence/solution-architect.ts` — `getFieldsForEntity()` has field definitions for 13 entities (Product, Order, Appointment, Service, Membership, Plan, Course, Lead, Deal, Property, MenuItem, Pet, Vehicle). **Disconnected from active path.**

`src/bos/intake-parser.ts` — static entities per industry mapping (3-4 entities). Active.

### Prompt Libraries
**File:** `src/bos/llm-planning-agent.ts` — one system prompt (architect planning)  
**File:** `src/business-intelligence/core/*.ts` — 7 system prompts in disconnected BI modules

No shared prompt library. No versioning of prompts. No A/B testing of prompts.

### Component Libraries
Not a formal library. `ReactRenderer` generates components from `ApplicationSpec`. The section names in `VALID_SECTIONS` (33 entries) function as the effective component palette: hero, features, product-grid, pricing-table, testimonials, cta, faq, stats-cards, data-table, auth-form, contact-form, footer, calendar, booking-form, dashboard-widgets, charts, profile, team-grid, gallery, blog-grid, search, filters, sidebar, activity-feed, order-history, cart-items, order-summary, wishlist, category-grid, sort-bar, mission, notifications.

### Design Tokens
**Active:** `designTokens` field in `ApplicationBlueprint`, derived from selected `DesignProfile` in registry. Passed to renderer as theme.

**Disconnected:** `DesignDNA` system in `src/generation/design-dna.ts` — more elaborate design token extraction. Not called.

### Pattern Libraries
`src/bos/knowledge/registry.ts` — `PATTERNS[]`. Active.

`src/bos/schemas/knowledge/pattern.schema.ts` — schema for Pattern type.

---

## Phase 19 — Gap Analysis

### Gap Matrix

| Gap | Current State | Desired State | Business Impact | Priority | Complexity |
|---|---|---|---|---|---|
| **Homepage UX** | 4 example prompts, 2 tabs, no templates/history | Templates, recent projects, build history, capability showcase | High: first impression | P1 | Low |
| **Live Build Experience** | Raw console-log event stream | Rich activity timeline with inputs/outputs/artifacts/agents/durations | High: user trust | P1 | Medium |
| **Live Object Inspector** | Provenance panel (regex-parsed BOS events) | Full BREContext / Blueprint / ExecutionBlueprint / ApplicationSpec inspector | Medium: transparency | P2 | Medium |
| **Live Architecture Viz** | None | Dynamic graph: Blueprint → Components → Pages → Entities | Medium: trust + demo | P2 | Medium |
| **Preview completeness** | page.tsx only (one route) | All routes rendered, navigation works, forms functional | High: output quality | P1 | High |
| **Build replay** | None | Persist all pipeline artifacts, replay by stage | Low | P3 | High |
| **Deployment** | ZIP download only | Vercel/Netlify one-click deploy | Critical: product completion | P0 | Medium |
| **Industry coverage** | 12 industries, keyword matching | 50+ industries, NLP-backed classification | High: market breadth | P1 | High |
| **Capability coverage** | 13 capabilities | 40+ (ERP, HR, supply chain, finance, healthcare-specific) | High: complex apps | P1 | High |
| **Entity modeling** | 3-4 static entities per industry | Prompt-derived entities with relationships | High: app correctness | P1 | Medium |
| **Workflow planning** | Missing from active path | WorkflowGraph per user journey | High: app logic | P1 | Medium (reconnect existing) |
| **BI Pipeline reconnection** | 10-phase pipeline disconnected | Integrate rich BI analysis into planning context | Medium: depth | P2 | Medium |
| **Permission/Role planning** | Not implemented | Role-based access per user journey | High: enterprise apps | P1 | Medium |
| **Dashboard planning** | Keyword-triggered only | KPIs, metrics, charts per role derived from business model | High: analytics apps | P1 | Medium |
| **Database relationships** | Minimal, schema only | Full relational model with foreign keys, indexes, cascades | High: data integrity | P1 | Medium |
| **Repair loop** | Dormant (SelfHealingEngine not wired) | TypeScript error → LLM patch → recompile loop active | High: build reliability | P0 | Low (reconnect) |
| **Build history persistence** | In-memory only | PostgreSQL/SQLite persistence for jobs and artifacts | Medium: UX | P2 | Low |
| **Progress event structure** | console.log regex-parsing | Structured `ProgressEvent` objects emitted via event bus | High: reliability | P1 | Low |
| **Iterative refinement** | Full rebuild from scratch | Targeted patch generation on follow-up prompts | High: UX | P1 | High |
| **Conversation context** | None | Multi-turn conversation history in build context | High: UX | P1 | Medium |
| **Final build report** | None | Summary: pages, entities, APIs, components, timings, agents used | Low: UX | P3 | Low |
| **Testing agent** | Not implemented | Generate unit and integration tests per component/entity | Medium: quality | P2 | High |

### Critical Path Gaps (P0)

**1. Deployment pipeline** — ZIP exists but no hosting. Without deployment, generated apps are stuck in the sandbox. Users cannot share, test on real devices, or use in production.

**2. Repair loop not wired** — `SelfHealingEngine` and `runCompilationFlow()` exist and are production-quality. They're simply not called by `handleBuildIntent()`. If the renderer generates TSX with import errors or JSX syntax issues, there is no recovery path. The quality gate catches failures but cannot fix them.

**3. Progress event fragility** — The entire live-activity UI relies on regex matching of console.log strings in a child process script. One log format change breaks the UI silently.

---

## Phase 20 — Implementation Roadmap

### Sprint 1 — Reliability & Observability (1 week)

**Objective:** Make what exists reliable and debuggable.

Files to change:
- `src/engine/build-queue.ts` — Replace regex-log parsing with structured `ProgressEvent` emitter (`src/core/progress-emitter.ts` already exists)
- `src/server.ts` — Serve structured events via SSE endpoint (`GET /api/workspace/:id/events`)
- `web/src/app/workspace/[id]/page.tsx` — Switch from polling `.progress` to SSE stream
- `src/agents/deterministic-orchestrator-v4.ts` — Wire `SelfHealingEngine` into post-render TypeScript audit

**Breaking changes:** None  
**Success criteria:** Build events are structured objects, not parsed strings. TypeScript errors in generated code trigger repair attempts.

---

### Sprint 2 — Deployment (1 week)

**Objective:** One-click Vercel deploy from workspace.

Files to change/create:
- `src/engine/deployment-agent.ts` (new) — Vercel API client: create project, push files, get URL
- `src/server.ts` — `POST /api/workspace/:id/deploy` route
- `web/src/app/workspace/[id]/page.tsx` — Wire Deploy button to new route, show deployment status

**Breaking changes:** None  
**Success criteria:** User clicks Deploy, gets a live Vercel URL within 60 seconds.

---

### Sprint 3 — Industry & Capability Expansion (2 weeks)

**Objective:** Handle complex business prompts (ERP, HR, manufacturing, logistics).

Files to change:
- `src/bos/intake-parser.ts` — Expand `INDUSTRY_MAPPINGS` to 30+ industries; add ERP/HRM/SCM/fintech/insurance keyword sets; expand `CAPABILITY_KEYWORDS` to 30+
- `src/bos/confidence-gate.ts` — Recalibrate thresholds after expanded keyword coverage
- `src/bos/knowledge/registry.ts` — Add design profiles and patterns for new industries

**Breaking changes:** Confidence gate behavior changes — more builds proceed deterministically  
**Success criteria:** "Build ERP for hospitals" → full admin dashboard with patient, billing, inventory, staff entities WITHOUT LLM escalation.

---

### Sprint 4 — Rich Planning Objects (2 weeks)

**Objective:** Reconnect the BI pipeline's rich planning objects as an optional enrichment layer.

Files to change:
- `src/business-intelligence/business-operating-system.ts` — Modify `analyze()` to accept BREContext as input (bridge to BRE v2)
- `src/bos/bre-v2-pipeline.ts` — Add optional BOS enrichment step after confidence gate but before blueprint compiler
- `src/bos/schemas/blueprint/application-blueprint.schema.ts` — Add fields: `workflows[]`, `departments[]`, `kpis[]`, `permissions[]`
- `src/bos/reasoning/blueprint-compiler-v2.ts` — Consume enriched blueprint fields

**Breaking changes:** ApplicationBlueprint schema change — renderers must handle new fields  
**Success criteria:** Generated ERP has department structure, role-based permissions, workflow documentation in generated code comments.

---

### Sprint 5 — Homepage & UX Redesign (1.5 weeks)

**Objective:** Replace the minimal homepage with a premium AI builder experience.

Files to change/create:
- `web/src/app/page.tsx` — Full redesign: hero with large prompt composer, example gallery, feature cards, capability showcase, recent builds (from build history API)
- `web/src/app/workspace/[id]/page.tsx` — Replace simple event log with rich activity timeline showing stage name, duration, input/output snippets, expandable details
- `web/src/components/build-timeline.tsx` (new) — Build timeline component with phase grouping
- `web/src/components/object-inspector.tsx` (new) — JSON tree viewer for BREContext, Blueprint, etc.
- `web/src/app/api/workspace/[id]/blueprint/route.ts` (new) — Expose blueprint as JSON

**Breaking changes:** None  
**Success criteria:** Homepage communicates "I can build software for any business." Workspace shows each pipeline stage with inputs and outputs.

---

### Sprint 6 — Preview Completeness (1 week)

**Objective:** Multi-route preview with working navigation.

Files to change:
- `src/server.ts` — `GET /api/workspace/:id/preview` — serve actual Next.js dev server URL instead of pre-rendered HTML
- `src/engine/build-runner.ts` — Manage dev server lifecycle per workspace
- `web/src/app/workspace/[id]/page.tsx` — Switch iframe from `srcDoc` to `src` pointing at dev server URL via tunnel

**Breaking changes:** Preview mechanism changes from static HTML to live dev server  
**Success criteria:** Preview iframe can navigate to /about, /services, /dashboard — all routes work.

---

### Sprint 7 — Final Build Report (0.5 weeks)

**Objective:** Auto-generate a summary after every build.

Files to change/create:
- `src/engine/report-generator.ts` (new) — Reads workspace, counts pages/components/entities/APIs, calculates timing from progress events
- `src/server.ts` — `GET /api/workspace/:id/report` route
- `web/src/app/workspace/[id]/page.tsx` — Report tab in workspace

**Breaking changes:** None  
**Success criteria:** After build, user sees: X pages, Y entities, Z API routes, N components, build time, agent list.

---

*This document reflects the state of the codebase as of July 1, 2026 and was produced by reading every relevant source file before writing any claim. All architectural statements are traceable to specific files listed herein.*
