# Target Architecture Comparison
## build-same-engine vs Same.new vs Emergent vs Bolt.new vs Lovable

**Version:** 1.0
**Date:** 2026-06-22

---

## 1. Competitive Landscape Overview

| Feature | build-same-engine | Same.new | Emergent | Bolt.new | Lovable |
|---------|-------------------|----------|----------|----------|---------|
| **Approach** | AST patching + JIT synthesis | LLM → code generation | LLM → code generation | LLM → code generation | LLM → code generation |
| **Output** | Multi-file AST patches | Full file rewrites | Full file rewrites | Full file rewrites | Full file rewrites |
| **Self-Healing** | 5-attempt compile loop | None visible | None visible | Basic retry | Basic retry |
| **Dependency Awareness** | Full dependency graph | None | None | None | None |
| **Regression Prevention** | Export signature tracking | None | None | None | None |
| **Per-Page Isolation** | Independent builds | N/A (single page) | N/A (single page) | N/A (single page) | N/A (single page) |
| **LLM Providers** | OpenAI, Anthropic, Gemini | Proprietary | Proprietary | Multiple | Multiple |
| **Fallback** | Deterministic JIT synthesis | None | None | None | None |
| **DB Generation** | Prisma schema + client | None | None | Basic | Basic |
| **API Generation** | REST CRUD routes | None | None | None | None |
| **Telemetry** | Sentry + PostHog + Supabase | Unknown | Unknown | Unknown | Unknown |
| **Web UI** | 3-panel builder | Prompt-only | Prompt-only | 3-panel builder | 3-panel builder |

---

## 2. Architecture Pattern Comparison

### 2.1 Same.new / Emergent Pattern
```
User Prompt → LLM → Full File Rewrite → Apply → Done
```
- **Pros**: Simple, fast iteration
- **Cons**: No regression prevention, no dependency awareness, full file churn, hallucination risk

### 2.2 Bolt.new / Lovable Pattern
```
User Prompt → LLM → Code Generation → Sandboxed Preview → Done
```
- **Pros**: Sandboxed execution, live preview
- **Cons**: Still full file rewrites, no AST-level intelligence

### 2.3 build-same-engine Pattern
```
User Prompt → Blueprint → Per-Page Loop → LLM → AST Patches → Validate → Simulate → Apply → Audit → Self-Heal
```
- **Pros**: Minimal diffs, regression prevention, dependency awareness, self-healing
- **Cons**: More complex, requires TypeScript compilation

---

## 3. Capability Matrix

### 3.1 Code Generation Intelligence

| Capability | build-same-engine | Competitors |
|------------|-------------------|-------------|
| AST-level patching | ✅ Recast + Babel | ❌ Full file rewrites |
| Export-level targeting | ✅ Export signature tracking | ❌ File-level only |
| Import path resolution | ✅ Module resolver with alias support | ❌ Manual or none |
| Dependency graph | ✅ Directed graph with DFS | ❌ None |
| Blast radius analysis | ✅ Impact analyzer | ❌ None |
| Patch ranking | ✅ Weighted risk scoring | ❌ None |
| Regression prediction | ✅ Export signature break detection | ❌ None |

### 3.2 Self-Healing & Reliability

| Capability | build-same-engine | Competitors |
|------------|-------------------|-------------|
| Compile loop | ✅ 5-attempt self-healing | ⚠️ Basic retry (1-2 attempts) |
| Snapshot/rollback | ✅ Filesystem snapshots | ❌ None |
| Pre-flight validation | ✅ 6-stage validator | ❌ None |
| In-memory simulation | ✅ VFS mutation testing | ❌ None |
| TypeScript audit | ✅ Compiler diagnostics | ❌ None |
| Per-page isolation | ✅ Independent retry budgets | ❌ None |

### 3.3 Full-Stack Generation

| Capability | build-same-engine | Competitors |
|------------|-------------------|-------------|
| Prisma schema | ✅ Auto-generated from DataModel | ⚠️ Basic or manual |
| Database client | ✅ Global singleton pattern | ⚠️ Basic or manual |
| REST API routes | ✅ GET + POST per model | ❌ None |
| State stores | ✅ Zustand compilation | ⚠️ Basic |
| Multi-page apps | ✅ Per-page isolation | ⚠️ Sequential or single |

### 3.4 LLM Integration

| Capability | build-same-engine | Competitors |
|------------|-------------------|-------------|
| Multi-provider | ✅ OpenAI, Anthropic, Gemini | ⚠️ 1-2 providers |
| Retry with backoff | ✅ Exponential (1s/2s/4s) | ⚠️ Basic retry |
| Graceful fallback | ✅ Deterministic JIT synthesis | ❌ None |
| Structured output | ✅ JSON schema validation | ⚠️ Parsing |
| System prompt engineering | ✅ AST-aware instructions | ⚠️ Generic |

### 3.5 Production Readiness

| Capability | build-same-engine | Competitors |
|------------|-------------------|-------------|
| Error tracking | ✅ Sentry integration | ⚠️ Basic logging |
| Analytics | ✅ PostHog events | ⚠️ Basic or none |
| Event persistence | ✅ Supabase | ❌ None |
| CI/CD | ✅ GitHub Actions matrix | ⚠️ Basic |
| Non-blocking telemetry | ✅ try-catch degradation | ❌ Unknown |

---

## 4. Unique Advantages of build-same-engine

### 4.1 AST Patching (vs Full File Rewrites)
- **Minimal Diffs**: Only changed exports are modified, not entire files
- **Regression Prevention**: Export signature tracking catches breaking changes before they're applied
- **Dependency Awareness**: Changes propagate through the dependency graph correctly
- **Deterministic Fallback**: When LLM fails, JIT synthesis produces working code from atomic primitives

### 4.2 Per-Page Isolation (vs Monolithic Builds)
- **Independent Retry**: Each page gets 3 retries, not sharing budget with other pages
- **Isolated Snapshots**: Page A failure doesn't affect Page B's filesystem state
- **Honest Results**: `pageResults[]` shows exactly which pages succeeded/failed
- **Narrowed Prompts**: LLM context is filtered to the specific page being built

### 4.3 Self-Healing Pipeline (vs Basic Retry)
- **5-Stage Validation**: Schema → Security → Action → Parse → Target → Export
- **In-Memory Simulation**: Patches are tested before filesystem mutation
- **TypeScript Audit**: Compilation errors are caught and fed back to LLM
- **Regression Prediction**: Export signature breaks are detected pre-apply

---

## 5. Competitive Gaps (Where Competitors Win)

### 5.1 Deployment
- **Same.new / Emergent / Bolt.new**: One-click deploy to Vercel/Netlify
- **build-same-engine**: No deployment pipeline yet

### 5.2 Authentication
- **Competitors**: Built-in auth (GitHub, email, Google)
- **build-same-engine**: No authentication yet

### 5.3 Database Persistence
- **Competitors**: Workspace persistence, user accounts
- **build-same-engine**: Filesystem-only, no persistence

### 5.4 Payments
- **Competitors**: Stripe integration, usage-based billing
- **build-same-engine**: No payment system

### 5.5 Visual QA
- **Competitors**: Screenshot comparison, visual regression
- **build-same-engine**: No visual testing

---

## 6. Target Architecture Roadmap

### Phase 2: Deployment & Auth (Weeks 3-4)
- Vercel deployment integration
- NextAuth.js authentication
- Supabase database for workspace persistence
- Complete CRUD API (PUT/DELETE/PATCH)

### Phase 3: Commercialization (Weeks 5-6)
- Stripe payment integration
- GitHub sync (push to user repos)
- Web clone engine (Playwright crawler)
- Visual QA agent (screenshot comparison)

### Phase 4: Scale (Weeks 7-8)
- Parallel page generation
- Incremental dependency graph updates
- Docker sandboxing for isolated builds
- Workspace expiration/cleanup

---

## 7. Strategic Position

**build-same-engine** occupies a unique position in the market:

1. **Only AST-based code generator** — All competitors use full file rewrites
2. **Only self-healing pipeline** — 5-stage validation with regression prevention
3. **Only per-page isolation** — Independent retry budgets and snapshot scopes
4. **Only deterministic fallback** — JIT synthesis from atomic primitives when LLM fails

**Target User**: Developer teams who need reliable, multi-file application generation with production-grade error handling — not just demo-quality single-page apps.

**Differentiator**: "We don't just generate code — we generate *reliable* code with regression prevention and self-healing."
