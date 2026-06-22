# Functional Requirements Document (FRD)
## build-same-engine — Module-Level Functional Specification

**Version:** 1.0
**Date:** 2026-06-22

---

## End-to-End Technical Flow

```
User Prompt
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Web UI Layer                                                    │
│  web/src/app/page.tsx → POST /api/create → workspace/{id}      │
│  web/src/app/workspace/[id]/page.tsx → polls progress          │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ API Layer                                                       │
│  api/create/route.ts → save prompt to .prompts/{id}.json       │
│  api/workspace/[id]/build/route.ts → execSync engine script    │
│  api/workspace/[id]/progress/route.ts → poll progress file     │
│  api/workspace/[id]/files/route.ts → list workspace files      │
│  api/workspace/[id]/file/route.ts → read single file           │
│  api/workspace/[id]/preview/route.ts → SSR + cache             │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Orchestrator Layer                                               │
│  src/agents/deterministic-orchestrator-v4.ts                    │
│    processGenerationIntent() → routes by intent type            │
│    handleBuildIntent() → per-page isolation loop                │
│    runCompilationFlow() → self-healing compile loop             │
└─────────────────────────────────────────────────────────────────┘
    │
    ├──────────────────────────────────────────────────────────────┐
    │ Generation Layer                                             │
    │  src/generation/architect.ts → FullStackArchitect.design()   │
    │  src/generation/compiler-pipeline.ts → scaffold files        │
    │  src/generation/business-classifier.ts → classify prompts    │
    │  src/generation/primitives.ts → 31 atomic UI components      │
    │  src/generation/website-analyzer.ts → analyze HTML           │
    │  src/generation/clone-plan-generator.ts → clone strategy     │
    │  src/generation/project-blueprint.ts → blueprint templates   │
    │  src/generation/capabilities.ts → capability registry        │
    ├──────────────────────────────────────────────────────────────┤
    │ LLM Gateway Layer                                            │
    │  src/core/llm-gateway.ts → multi-provider + JIT fallback     │
    │    callOpenAI() / callAnthropic() / callGemini()             │
    │    synthesizeFallback() → deterministic code generation      │
    ├──────────────────────────────────────────────────────────────┤
    │ Intelligence Layer                                           │
    │  src/graph/ast-dependency-graph.ts → file dependency graph   │
    │  src/graph/export-indexer.ts → export signature indexing     │
    │  src/graph/module-resolver.ts → import path resolution       │
    │  src/intelligence/impact-analyzer.ts → blast radius          │
    │  src/intelligence/patch-ranker.ts → risk scoring             │
    │  src/intelligence/regression-predictor.ts → contract breaks  │
    ├──────────────────────────────────────────────────────────────┤
    │ Validation Layer                                              │
    │  src/validation/ast-patch-validator.ts → 6-stage validation  │
    │  src/validation/patch-simulator.ts → in-memory VFS mutation  │
    ├──────────────────────────────────────────────────────────────┤
    │ Core Layer                                                    │
    │  src/core/ast-patcher.ts → recast-based AST mutation         │
    │  src/core/patch-transaction.ts → batch commit/rollback       │
    │  src/core/snapshot.ts → filesystem point-in-time restore     │
    │  src/core/db-compiler.ts → Prisma schema generation          │
    │  src/core/api-compiler.ts → CRUD route generation            │
    │  src/core/telemetry.ts → Sentry + PostHog + Supabase         │
    │  src/compiler/auditor.ts → TypeScript compiler diagnostics   │
    │  src/compiler/compressor.ts → error message compression      │
    │  src/sandbox/engine.ts → workspace lifecycle management      │
    └──────────────────────────────────────────────────────────────┘
```

---

## Module 1: Type System (`src/types/index.ts`)

### 1.1 Purpose
Central type definitions shared across the entire engine. Defines every interface and type alias used in inter-module communication.

### 1.2 Types Defined

| Type | Kind | Fields |
|---|---|---|
| `PatchAction` | Union | `'insert' \| 'update' \| 'delete'` |
| `ASTPatch` | Interface | `targetFile`, `targetExport?`, `action`, `codeBlock` |
| `CompilationError` | Interface | `file`, `line`, `code`, `message` |
| `CompressedError` | Interface | `file`, `line`, `code`, `message` (compressed) |
| `WorkspaceConfig` | Interface | `workspaceId`, `rootPath` |
| `LLMProvider` | Union | `'openai' \| 'anthropic' \| 'gemini'` |
| `LLMConfig` | Interface | `provider`, `apiKey`, `model?` |
| `LLMContext` | Interface | `prompt`, `errors`, `attempt`, `changedFiles` |
| `ValidationResult` | Interface | `valid`, `reason?`, `safeToApply[]`, `rejected[]` |
| `SimulationResult` | Interface | `success`, `reason?`, `simulatedFiles?` |
| `DataField` | Interface | `name`, `type`, `isRequired`, `isId?` |
| `DataModel` | Interface | `name`, `fields[]` |
| `APIRouteSpec` | Interface | `endpoint`, `method`, `targetModel`, `description` |
| `StateStoreSpec` | Interface | `name`, `properties[]`, `actions[]` |
| `FullStackBlueprint` | Interface | `appName`, `colorScheme`, `dataModels[]`, `apiRoutes[]`, `stateStores[]`, `pages[]` |
| `GenerationIntent` | Interface | `type`, `prompt?`, `targetUrl?`, `domain?`, `businessType?`, `strategy?` |
| `GenerationResult` | Interface | `success`, `intent`, `workspaceId?`, `blueprint?`, `pageResults?`, `error?`, `duration` |

### 1.3 Dependencies
None (leaf module — foundation for all other modules).

### 1.4 Public Interfaces
All types are exported as named exports. No functions or classes.

### 1.5 Failure Modes
N/A — pure type definitions, no runtime behavior.

### 1.6 Missing Enhancements
- No `DeploymentConfig` type for deployment automation
- No `AuthConfig` type for authentication scaffolding
- No `TestConfig` type for test generation
- `DataField.type` is limited to 5 types; missing `float`, `enum`, `array`, `json`

---

## Module 2: LLM Gateway (`src/core/llm-gateway.ts`)

### 2.1 Purpose
Multi-provider LLM abstraction that generates `ASTPatch[]` from natural language prompts. Supports OpenAI, Anthropic, and Gemini with retry-with-backoff and JIT synthesis fallback.

### 2.2 Inputs
| Parameter | Type | Description |
|---|---|---|
| `config` | `LLMConfig` | Provider, API key, optional model override |
| `context` | `LLMContext` | Prompt, compressed errors, attempt number, changed files |

### 2.3 Outputs
`ASTPatch[]` — array of code patches targeting specific files and exports.

### 2.4 Internal Workflow
1. Calls `ArchitectAgent.designArchitecture(prompt)` to get structured architecture decision
2. Builds system prompt with atomic primitives catalog, architecture context, and patch rules
3. Dispatches to provider-specific method (`callOpenAI`, `callAnthropic`, `callGemini`)
4. Parses JSON response into `ASTPatch[]`
5. On API failure or missing key: falls back to `synthesizeFallback()` (JIT synthesis)
6. JIT synthesis generates deterministic code for each page section (hero, products, testimonials, etc.)

### 2.5 Dependencies
- `ArchitectAgent` from `generation/architect.ts`
- `ASTPatch`, `LLMContext`, `LLMConfig` from `types/index.ts`
- Native `fetch` for HTTP calls (no SDK dependencies)

### 2.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `constructor` | `(config: LLMConfig)` | Initialize provider |
| `generatePatches` | `(context: LLMContext) => Promise<ASTPatch[]>` | Main entry point |

### 2.7 Failure Modes
| Failure | Handling |
|---|---|
| Empty API key | Falls back to JIT synthesis (`NO_API_KEY` log) |
| HTTP 429 (rate limit) | Retries with exponential backoff (1s, 2s, 4s) |
| HTTP 500/502/503/504 | Retries up to 3 times |
| JSON parse failure | Returns empty array (triggers JIT fallback) |
| All retries exhausted | Falls back to JIT synthesis (`LLM_FAIL` log) |
| Network timeout | Retries with backoff |

### 2.8 Testability
- `scripts/verify-generation-layer.ts` Check 1: JIT synthesis with empty API key
- Unit testable with mock fetch responses

### 2.9 Scalability Concerns
- Synchronous HTTP calls per provider — no parallel multi-provider fallback
- JIT synthesis is CPU-bound — no streaming for large responses
- No token counting or cost estimation
- No response caching for repeated prompts

### 2.10 Missing Enhancements
- No parallel provider fallback (try OpenAI, then Anthropic simultaneously)
- No streaming response support
- No token counting or cost tracking
- No response caching
- No fine-tuned model support
- No function calling / tool use
- No structured output validation (JSON schema)

---

## Module 3: Telemetry (`src/core/telemetry.ts`)

### 3.1 Purpose
Triple-layer observability integrating Sentry (error tracking), PostHog (product analytics), and Supabase (build run persistence). All layers gracefully degrade.

### 3.2 Inputs
- Environment variables: `SENTRY_DSN`, `POSTHOG_API_KEY`, `POSTHOG_HOST`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### 3.3 Outputs
- Sentry: error events with workspace context
- PostHog: build_started, build_step, page_compiled, build_completed, build_error, auto_healing events
- Supabase: build_runs table inserts

### 3.4 Internal Workflow
1. `init()` lazily initializes each provider on first use
2. Each `report*` method checks provider availability before dispatching
3. PostHog captures are wrapped in try-catch (non-blocking)
4. Supabase inserts are fire-and-forget promises

### 3.5 Dependencies
- `@sentry/node`, `posthog-node`, `@supabase/supabase-js`, `dotenv/config`

### 3.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `init` | `() => void` | Initialize all providers |
| `reportBuildStart` | `(workspaceId, prompt) => void` | PostHog event |
| `reportBuildStep` | `(workspaceId, step, detail?) => void` | PostHog event |
| `reportPageComplete` | `(workspaceId, event: PageEvent) => void` | PostHog event |
| `reportBuildComplete` | `(event: BuildEvent) => void` | PostHog + Supabase |
| `reportError` | `(event: ErrorEvent) => void` | Sentry + PostHog |
| `reportHealing` | `(workspaceId, attempt, errorCount) => void` | PostHog event |
| `shutdown` | `() => Promise<void>` | Flush all providers |

### 3.7 Failure Modes
| Failure | Handling |
|---|---|
| Missing env vars | Logs warning, returns null (graceful degradation) |
| PostHog 401 (invalid key) | Logged as warning, does not block pipeline |
| Supabase WebSocket unavailable (Node 20) | Caught in try-catch, falls back to null |
| Sentry flush timeout | Waits 3s, then closes |

### 3.8 Testability
- `scripts/verify-telemetry.ts`: 21-check contract verification with env vars cleared

### 3.9 Scalability Concerns
- In-memory provider singletons — no connection pooling
- Supabase inserts are async but not batched
- No sampling or rate limiting on events

### 3.10 Missing Enhancements
- No event batching for Supabase
- No sampling rate configuration
- No custom event schema validation
- No trace/span support for distributed tracing
- No cost attribution per workspace

---

## Module 4: DB Compiler (`src/core/db-compiler.ts`)

### 4.1 Purpose
Generates Prisma schema files and database client singletons from `DataModel[]` definitions.

### 4.2 Inputs
- `models: DataModel[]` — array of data model definitions with fields and types
- `workspacePath: string` — target workspace root

### 4.3 Outputs
- `prisma/schema.prisma` — complete Prisma schema with PostgreSQL datasource
- `src/lib/db.ts` — PrismaClient singleton with global cache pattern

### 4.4 Internal Workflow
1. `compileSchema()`: Iterates models, maps field types to Prisma types (string→String, number→Int, boolean→Boolean, DateTime→DateTime), adds `@id @default(uuid())` for ID fields
2. `scaffoldPrismaClient()`: Creates prisma directory, writes schema, creates src/lib directory, writes db.ts with global singleton pattern

### 4.5 Dependencies
- `fs`, `path` (Node.js)
- `DataModel` from `types/index.ts`

### 4.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `compileSchema` | `(models: DataModel[]) => string` | Returns Prisma schema string |
| `scaffoldPrismaClient` | `(workspacePath, models) => void` | Writes schema + client to disk |

### 4.7 Failure Modes
- Missing workspace directory: `mkdirSync` with `recursive: true` handles this
- Invalid model names: No validation — could produce invalid Prisma syntax

### 4.8 Testability
- `scripts/verify-fullstack-db.ts` Sections 1-3: Schema generation + client scaffolding

### 4.9 Scalability Concerns
- Synchronous file writes — no parallel model processing
- No schema diffing or migration generation

### 4.10 Missing Enhancements
- No SQLite/MySQL/PostgreSQL provider selection
- No migration generation
- No seed file generation
- No relation support (foreign keys only)
- No enum support
- No index generation

---

## Module 5: API Compiler (`src/core/api-compiler.ts`)

### 5.1 Purpose
Generates Next.js App Router API route handlers with CRUD operations for each data model.

### 5.2 Inputs
- `workspacePath: string` — target workspace root
- `models: DataModel[]` — data model definitions

### 5.3 Outputs
- `src/app/api/{model}/route.ts` per model — GET (findMany) + POST (create) handlers

### 5.4 Internal Workflow
1. For each model: creates api directory, generates route.ts with:
   - `GET` handler: `prisma.{model}.findMany()`
   - `POST` handler: `prisma.{model}.create({ data: body })`
   - Error handling with `try/catch` returning 500 status

### 5.5 Dependencies
- `fs`, `path` (Node.js)
- `DataModel` from `types/index.ts`

### 5.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `compileAPIRoutes` | `(workspacePath, models) => void` | Writes route.ts files |

### 5.7 Failure Modes
- Model name conflicts: No deduplication
- Missing Prisma client: Routes import `db.ts` which may not exist

### 5.8 Testability
- `scripts/verify-fullstack-db.ts` Section 4: Route file verification

### 5.9 Scalability Concerns
- No pagination, filtering, or sorting
- No input validation
- No authentication/authorization
- No rate limiting

### 5.10 Missing Enhancements
- No PUT, DELETE, PATCH handlers
- No input validation (Zod schemas)
- No authentication middleware
- No pagination support
- No filtering/sorting
- No OpenAPI/Swagger generation
- No error response standardization

---

## Module 6: Snapshot (`src/core/snapshot.ts`)

### 6.1 Purpose
Filesystem point-in-time snapshots with surgical rollback for the self-healing compilation loop.

### 6.2 Inputs
- `workspacePath: string` — target directory
- `version: number` — snapshot version identifier

### 6.3 Outputs
- In-memory `Map<relativePath, content>` per version
- Filesystem state restored to snapshot point

### 6.4 Internal Workflow
1. `takeSnapshot()`: Recursively scans directory (skipping node_modules, .next, dotfiles), stores all file contents
2. `restore()`: Three-phase surgical restore:
   - Phase 1: Delete files that exist now but not in snapshot (untracked files)
   - Phase 2: Overwrite all snapshot files to original content
   - Phase 3: Post-order purge of empty directories
3. `clearSnapshots()`: Removes all snapshots for a workspace

### 6.5 Dependencies
- `fs`, `path` (Node.js)

### 6.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `takeSnapshot` | `(workspacePath, version) => void` | Save filesystem state |
| `restore` | `(workspacePath, version) => void` | Restore to snapshot |
| `clearSnapshots` | `(workspacePath) => void` | Remove all snapshots |

### 6.7 Failure Modes
- Large workspaces: Memory usage scales with file count × average file size
- Concurrent access: No locking — race conditions possible
- Missing snapshot version: Throws error

### 6.8 Testability
- `src/test-harness.ts`: Tests rollback with untracked file purge

### 6.9 Scalability Concerns
- In-memory storage — no disk persistence
- No incremental snapshots (full copy each time)
- No compression

### 6.10 Missing Enhancements
- No incremental/delta snapshots
- No disk persistence
- No compression
- No concurrent access protection
- No snapshot expiry/cleanup

---

## Module 7: AST Patcher (`src/core/ast-patcher.ts`)

### 7.1 Purpose
Applies AST-level patches to TypeScript/JSX files using recast and babel parser. Supports insert, update, and delete operations on export declarations.

### 7.2 Inputs
- `workspaceRoot: string`
- `patch: ASTPatch` — target file, target export, action, code block

### 7.3 Outputs
- Modified file on disk

### 7.4 Internal Workflow
1. Read target file (create with `export {}` stub if missing)
2. Parse both source and patch ASTs with babel (TypeScript + JSX plugins)
3. Execute action:
   - **Insert**: Append program.body nodes to target
   - **Update**: Visit ExportNamedDeclaration/ExportDefaultDeclaration, replace matching node
   - **Delete**: Prune matching export node
4. Write back via `recast.print()` (preserves formatting)

### 7.5 Dependencies
- `recast`, `@babel/parser`
- `fs`, `path` (Node.js)
- `ASTPatch` from `types/index.ts`

### 7.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `applyPatch` | `(workspaceRoot, patch: ASTPatch) => void` | Apply single patch |

### 7.7 Failure Modes
- Invalid syntax in codeBlock: Parse error thrown
- Target export not found (update/delete): Node not replaced (silent)
- File not found (update/delete): Creates stub file

### 7.8 Testability
- `src/test-harness.ts`: Tests insert, update, and crash recovery
- Unit testable with mock filesystem

### 7.9 Scalability Concerns
- Synchronous file I/O
- No parallel patch application
- Full AST re-parse per patch (no incremental)

### 7.10 Missing Enhancements
- No import statement management
- No JSX attribute manipulation
- No conditional patch application
- No patch diffing or conflict resolution

---

## Module 8: Patch Transaction Manager (`src/core/patch-transaction.ts`)

### 8.1 Purpose
Batches AST patches and applies them atomically with commit/rollback semantics.

### 8.2 Inputs
- Patches staged via `stage(patch)` method

### 8.3 Outputs
- All patches applied via callback, or none (rollback)

### 8.4 Internal Workflow
1. `begin()`: Reset staged patches array
2. `stage(patch)`: Add to staging area
3. `commit(callback)`: Iterate staged patches, call callback for each, clear in `finally` block
4. `rollback()`: Discard all staged patches

### 8.5 Dependencies
- `ASTPatch` from `types/index.ts`

### 8.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `begin` | `() => void` | Start transaction |
| `stage` | `(patch: ASTPatch) => void` | Add patch to batch |
| `commit` | `(applyCallback: (patch) => void) => void` | Apply all or rollback |
| `rollback` | `() => void` | Discard staged patches |

### 8.7 Failure Modes
- Callback throws: `finally` block clears staged patches (safe)
- Stage after commit: New transaction not started (stale state)

### 8.8 Testability
- Used by `runCompilationFlow()` — tested indirectly via test harness

### 8.9 Scalability Concerns
- Synchronous — no parallel application
- No partial commit support

### 8.10 Missing Enhancements
- No nested transactions
- No partial commit (apply some, skip others)
- No patch dependency ordering

---

## Module 9: Dependency Graph (`src/graph/ast-dependency-graph.ts`)

### 9.1 Purpose
Directed graph modeling file-level import/export dependencies. Supports queries for dependents and dependencies.

### 9.2 Inputs
- `DependencyNode` objects (file, exports, imports, signatures)
- `DependencyEdge` objects (from, to, type)

### 9.3 Outputs
- Dependency queries (dependents of file, dependencies of file)

### 9.4 Internal Workflow
1. Nodes stored in `Map<string, DependencyNode>` by normalized path
2. Edges stored in flat array with deduplication on insert
3. `getDependents()` and `getDependencies()` scan edge array

### 9.5 Dependencies
- `normalizePath` from `module-resolver.ts`

### 9.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `addFile` | `(node: DependencyNode) => void` | Register file |
| `addEdge` | `(edge: DependencyEdge) => void` | Add dependency edge |
| `getDependents` | `(file: string) => string[]` | Files that import from this file |
| `getDependencies` | `(file: string) => string[]` | Files this file imports |
| `getNode` | `(file: string) => DependencyNode \| undefined` | Get node by path |
| `getAllNodes` | `() => DependencyNode[]` | All nodes |
| `getAllEdges` | `() => DependencyEdge[]` | All edges |
| `clear` | `() => void` | Reset graph |

### 9.7 Failure Modes
- No null/undefined input validation
- O(E) per query (linear scan)
- No circular dependency detection

### 9.8 Testability
- Unit testable with mock graph data

### 9.9 Scalability Concerns
- Linear scan for all queries — no index structures
- Edge deduplication is O(n) per insertion

### 9.10 Missing Enhancements
- No adjacency list/index for O(1) queries
- No circular dependency detection
- No topological sort
- No graph visualization export

---

## Module 10: Export Indexer (`src/graph/export-indexer.ts`)

### 10.1 Purpose
Parses TS/TSX files to extract export/import declarations and structural hashes. Content-hash caching enables incremental re-indexing.

### 10.2 Inputs
- `filePath: string` (absolute)
- `relativePath: string` (cache key)

### 10.3 Outputs
- `DependencyNode` with exports, imports, and structural hashes per export

### 10.4 Internal Workflow
1. Compute content hash of file
2. If cached node exists with matching hash, return cached (skip parse)
3. Parse with recast + babel (TypeScript + JSX + tokens)
4. Visit export/import declarations, extract names
5. Compute structural hash per export (strip location metadata, JSON serialize, SHA-256)
6. Cache result

### 10.5 Dependencies
- `recast`, `@babel/parser`, `crypto`, `fs`
- `DependencyNode` from `ast-dependency-graph.ts`

### 10.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `indexFile` | `(filePath, relativePath) => DependencyNode` | Parse and index |
| `evictFile` | `(relativePath) => void` | Remove from cache |
| `clearCache` | `() => void` | Clear all cache |

### 10.7 Failure Modes
- File not found: Returns empty node (graceful)
- Parse error: Unhandled throw (no try/catch around `recast.parse`)
- Cache invalidation: Any content change triggers full re-parse

### 10.8 Testability
- Unit testable with mock files

### 10.9 Scalability Concerns
- Full re-parse on any content change (no incremental parsing)
- In-memory cache — no persistence across restarts

### 10.10 Missing Enhancements
- No incremental parsing
- No disk cache persistence
- No parallel file indexing
- No error recovery for malformed files

---

## Module 11: Module Resolver (`src/graph/module-resolver.ts`)

### 11.1 Purpose
Resolves import specifiers to absolute file paths. Handles relative, alias, and extension probing.

### 11.2 Inputs
- `fromFile: string`, `importPath: string`, `rootPath: string`

### 11.3 Outputs
- Normalized relative path string, or null if unresolvable

### 11.4 Internal Workflow
1. Classify path: relative (`./`), alias (`@/`), or bare specifier
2. Resolve relative to importing file's directory
3. Probe extensions: `.tsx`, `.ts`, `.jsx`, `.js`, then `index.*` variants
4. Return normalized forward-slash path

### 11.5 Dependencies
- `fs`, `path` (Node.js)

### 11.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `normalizePath` | `(targetPath) => string` | Backslash to forward slash |
| `ModuleResolver.resolve` | `(fromFile, importPath, rootPath) => string \| null` | Resolve import |

### 11.7 Failure Modes
- Bare specifiers (npm packages): Always returns null
- Symlinks: Not resolved
- tsconfig paths (beyond `@/`): Not supported

### 11.8 Testability
- Unit testable with mock filesystem

### 11.9 Scalability Concerns
- Synchronous filesystem checks per resolution

### 11.10 Missing Enhancements
- No node_modules resolution
- No tsconfig path alias support (beyond `@/`)
- No package.json exports field resolution

---

## Module 12: Impact Analyzer (`src/intelligence/impact-analyzer.ts`)

### 12.1 Purpose
Computes blast radius of patching a file: direct dependents, transitive dependents, and max dependency depth. Assigns risk level.

### 12.2 Inputs
- `ASTPatch` (specifically `patch.targetFile`)

### 12.3 Outputs
- `PatchImpact`: riskLevel, affectedFiles[], transitiveDepth, dependentCount, reason

### 12.4 Internal Workflow
1. Get direct dependents from graph
2. DFS for transitive dependents (with cycle detection)
3. Compute max depth via recursive DFS
4. Classify risk: HIGH (>5 transitive or depth>3), MEDIUM (has dependents), LOW (isolated)

### 12.5 Dependencies
- `ASTDependencyGraph`, `ASTPatch`, `normalizePath`

### 12.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `analyze` | `(patch: ASTPatch) => PatchImpact` | Compute impact |

### 12.7 Failure Modes
- Deep recursion: Stack overflow on very deep chains
- Hardcoded thresholds: Not configurable
- No edge type consideration

### 12.8 Testability
- Unit testable with mock graph

### 12.9 Scalability Concerns
- DFS per patch — O(P × (V + E))

### 12.10 Missing Enhancements
- No configurable thresholds
- No edge type weighting
- No iterative DFS fallback

---

## Module 13: Patch Ranker (`src/intelligence/patch-ranker.ts`)

### 13.1 Purpose
Risks-scores patches so low-risk changes are applied first.

### 13.2 Inputs
- `ASTPatch[]`

### 13.3 Outputs
- Sorted `ASTPatch[]` (ascending risk)

### 13.4 Internal Workflow
- Score = (affectedFiles × 15) + (dependents × 25) + (depth × 10) - (isolation bonus: 50)
- Sort ascending by score

### 13.5 Dependencies
- `ImpactAnalyzer`, `ASTPatch`

### 13.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `rank` | `(patches: ASTPatch[]) => ASTPatch[]` | Risk-sorted patches |

### 13.7 Failure Modes
- No normalization or upper bound on scores
- No stable sort guarantee for equal scores

### 13.8 Testability
- Unit testable with mock patches

### 13.9 Scalability Concerns
- Calls `ImpactAnalyzer.analyze()` per patch — no parallel computation

### 13.10 Missing Enhancements
- No configurable weights
- No patch action type consideration
- No batch-aware ranking

---

## Module 14: Regression Predictor (`src/intelligence/regression-predictor.ts`)

### 14.1 Purpose
Predicts whether patches will cause breaking changes by comparing export signatures before/after.

### 14.2 Inputs
- `ASTPatch[]`

### 14.3 Outputs
- `RegressionReport`: isSafe, reason?

### 14.4 Internal Workflow
For each patch:
1. **Insert collision**: Check if export name already exists in file
2. **Delete of consumed export**: Block if dependents import it
3. **Update signature break**: Compare structural hash before/after
4. **Missing targetExport**: Block if update omits required export

### 14.5 Dependencies
- `ASTDependencyGraph`, `ASTPatch`, `recast`, `crypto`, `@babel/parser`

### 14.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `predict` | `(patches: ASTPatch[]) => RegressionReport` | Check safety |

### 14.7 Failure Modes
- First-failure-fast: Stops at first unsafe patch (doesn't report all)
- Parse failures silently swallowed
- Overly conservative delete blocking

### 14.8 Testability
- Unit testable with mock graph and patches

### 14.9 Scalability Concerns
- AST parse per patch — O(P × N)

### 14.10 Missing Enhancements
- No batch-aware analysis
- No type-only change detection
- Duplicated code with ExportIndexer

---

## Module 15: AST Patch Validator (`src/validation/ast-patch-validator.ts`)

### 15.1 Purpose
6-stage pre-flight validation of patches before filesystem application.

### 15.2 Inputs
- `workspaceRoot: string`, `patches: ASTPatch[]`

### 15.3 Outputs
- `ValidationResult`: valid, reason?, safeToApply[], rejected[]

### 15.4 Internal Workflow
| Stage | Check |
|---|---|
| 1 | Schema: targetFile is non-empty string |
| 2 | Security: No path traversal (`..`) or absolute paths |
| 3 | Action: Must be insert/update/delete |
| 4 | Parse: codeBlock must parse (skip for delete) |
| 5 | Target: File must exist on disk (for update/delete) |
| 6 | Export: targetExport must resolve in file AST |

### 15.5 Dependencies
- `recast`, `@babel/parser`, `fs`, `path`
- `ASTPatch`, `ValidationResult` from types

### 15.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `validate` | `(workspaceRoot, patches) => ValidationResult` | Validate all patches |

### 15.7 Failure Modes
- Batch-level invalidation: Single bad patch invalidates entire batch
- No partial pass behavior

### 15.8 Testability
- Unit testable with mock workspace

### 15.9 Scalability Concerns
- Synchronous AST parse per patch

### 15.10 Missing Enhancements
- No batch-level partial pass
- No codeBlock content validation beyond syntax

---

## Module 16: Patch Simulator (`src/validation/patch-simulator.ts`)

### 16.1 Purpose
In-memory dry-run simulation of AST mutations without touching disk.

### 16.2 Inputs
- `workspaceRoot: string`, `patches: ASTPatch[]`

### 16.3 Outputs
- `SimulationResult`: success, reason?, simulatedFiles?

### 16.4 Internal Workflow
1. Maintain per-file AST cache
2. For each patch: read file from disk (or stub), parse, apply mutation in memory
3. After all patches: print each AST back to source, re-parse, validate import integrity
4. Return simulated files on success

### 16.5 Dependencies
- `recast`, `@babel/parser`, `fs`, `path`

### 16.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `simulate` | `(workspaceRoot, patches) => SimulationResult` | Dry-run mutations |

### 16.7 Failure Modes
- Export not found in VFS: Immediate failure
- Structural regression on output: Caught by re-parse validation

### 16.8 Testability
- Unit testable with mock filesystem

### 16.9 Scalability Concerns
- Full AST parse per patch per file
- No incremental simulation

### 16.10 Missing Enhancements
- No incremental simulation
- No semantic analysis (only structural)

---

## Module 17: TypeScript Auditor (`src/compiler/auditor.ts`)

### 17.1 Purpose
Runs the TypeScript compiler API to detect all type/syntax errors.

### 17.2 Inputs
- `workspacePath: string` (must contain tsconfig.json)

### 17.3 Outputs
- `CompilationError[]` with file, line, code, message

### 17.4 Internal Workflow
1. Find tsconfig.json via `ts.findConfigFile()`
2. Parse config via `ts.readConfigFile()` + `ts.parseJsonConfigFileContent()`
3. Create program with `ts.createProgram()`
4. Collect diagnostics via `ts.getPreEmitDiagnostics()`
5. Map to `CompilationError[]` with relative paths

### 17.5 Dependencies
- `typescript` (full compiler API)

### 17.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `audit` | `(workspacePath) => CompilationError[]` | Run diagnostics |

### 17.7 Failure Modes
- Missing tsconfig: Throws error
- Malformed tsconfig: Returns single TS_CONFIG_ERR diagnostic

### 17.8 Testability
- Tested by all verify scripts that run compilation flow

### 17.9 Scalability Concerns
- Full TypeScript compilation per audit — expensive
- No incremental type checking

### 17.10 Missing Enhancements
- No incremental type checking
- No parallel compilation
- No custom diagnostic filtering

---

## Module 18: Error Compressor (`src/compiler/compressor.ts`)

### 18.1 Purpose
Normalizes TypeScript error messages for LLM context efficiency.

### 18.2 Inputs
- `CompilationError[]`

### 18.3 Outputs
- `CompressedError[]` with truncated messages (max 120 chars)

### 18.4 Internal Workflow
Regex pipeline: strip quotes → collapse type mismatch → collapse property missing → truncate

### 18.5 Dependencies
- `CompilationError`, `CompressedError` from types

### 18.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `compress` | `(errors) => CompressedError[]` | Compress messages |

### 18.7 Failure Modes
- Lossy compression — detailed type info discarded

### 18.8 Testability
- Unit testable with known error patterns

### 18.9 Scalability Concerns
- None (trivial transform)

### 18.10 Missing Enhancements
- No configurable compression level
- No semantic-aware compression

---

## Module 19: Sandbox Engine (`src/sandbox/engine.ts`)

### 19.1 Purpose
Workspace lifecycle management: create, scaffold, npm install, dev server management.

### 19.2 Inputs
- `workspaceBase: string`, `id: string`

### 19.3 Outputs
- `WorkspaceConfig` with workspaceId and rootPath

### 19.4 Internal Workflow
1. `createWorkspace()`: Create directory, scaffold if new
2. `scaffoldWorkspace()`: Write package.json, tsconfig.json, layout.tsx, page.tsx
3. `runPackageInstall()`: `npm install --silent --legacy-peer-deps`
4. `launchDevInstance()`: `npm run dev`, watch for "ready"/"started"
5. `stopDevInstance()`: SIGTERM to process

### 19.5 Dependencies
- `fs`, `path`, `child_process`

### 19.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `createWorkspace` | `(base, id) => WorkspaceConfig` | Create workspace |
| `runPackageInstall` | `(config) => Promise<string>` | Install deps |
| `launchDevInstance` | `(config) => Promise<void>` | Start dev server |
| `stopDevInstance` | `(id) => void` | Stop dev server |

### 19.7 Failure Modes
- npm install failure: Rejects with error
- Dev server never ready: Promise never resolves
- Race condition on concurrent launch

### 19.8 Testability
- Tested by all verify scripts and test harness

### 19.9 Scalability Concerns
- Sequential npm install (no parallel workspaces)
- No workspace cleanup/expiration

### 19.10 Missing Enhancements
- No workspace expiration/cleanup
- No parallel workspace creation
- No Docker-based sandboxing
- No resource limits (CPU, memory, disk)

---

## Module 20: Orchestrator (`src/agents/deterministic-orchestrator-v4.ts`)

### 20.1 Purpose
Master orchestrator coordinating all subsystems into the complete build pipeline.

### 20.2 Inputs
- `workspaceId: string`
- `intent: GenerationIntent`
- `llmConfig?: LLMConfig`

### 20.3 Outputs
- `GenerationResult` with success, blueprint, pageResults, duration

### 20.4 Internal Workflow
1. Route by intent type to handler
2. `handleBuildIntent()`:
   - Design blueprint via FullStackArchitect
   - Scaffold files via FullStackCompilerPipeline
   - Compile DB + API routes
   - Per-page isolation loop (3 retries each)
3. `runCompilationFlow()`:
   - Build dependency graph
   - Snapshot → LLM call → Rank → Validate → Simulate → Apply → Audit
   - Loop until zero errors or max retries

### 20.5 Dependencies
All other modules (11 subsystems instantiated in constructor).

### 20.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `processGenerationIntent` | `(id, intent, config?) => Promise<GenerationResult>` | Main entry |
| `runCompilationFlow` | `(id, prompt, gateway, retries, skip, base) => Promise<WorkspaceConfig>` | Compile loop |
| `stopDevInstance` | `(id) => void` | Stop dev server |

### 20.7 Failure Modes
- All retries exhausted: Throws error
- Partial page failure: Returns success=false with pageResults
- LLM returns wrong-file patches: Filtered by targetFilePath

### 20.8 Testability
- `src/test-harness.ts`: 3-attempt mock flow
- `scripts/verify-generation-layer.ts`: End-to-end orchestration
- `scripts/verify-multi-file.ts`: Multi-page isolation

### 20.9 Scalability Concerns
- Sequential page processing (no parallel pages)
- Full dependency graph rebuild per page attempt
- Synchronous orchestration

### 20.10 Missing Enhancements
- No parallel page generation
- No incremental dependency graph updates
- No workspace persistence across restarts
- No concurrent workspace support

---

## Module 21: Generation — Business Classifier (`src/generation/business-classifier.ts`)

### 21.1 Purpose
Rule-based classifier determining business type from text, domain, URL, and routes.

### 21.2 Inputs
- `classify(input)`: title, description, domain, url, content, routes, technologies
- `classifyFromPrompt(prompt)`: shorthand

### 21.3 Outputs
- `ClassificationResult`: type, confidence, matchedKeywords, matchedPatterns, scores

### 21.4 Internal Workflow
11 weighted rules (ecommerce, saas, local-business, agency, portfolio, blog, marketplace, healthcare, fitness, restaurant, education). Score = keyword matches × weight + domain matches × weight×2 + route matches × weight×1.5.

### 21.5 Dependencies
None (standalone)

### 21.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `classify` | `(input) => ClassificationResult` | Full classification |
| `classifyFromPrompt` | `(prompt) => ClassificationResult` | Prompt shorthand |
| `getSupportedTypes` | `() => BusinessType[]` | All types |

### 21.7 Failure Modes
- Unknown business types: Returns 'unknown' with low confidence
- No content: Low scores across all types

### 21.8 Testability
- Unit testable with known inputs

### 21.9 Scalability Concerns
- None (fast rule evaluation)

### 21.10 Missing Enhancements
- No ML-based classification
- No confidence calibration
- No multi-label support (app can be ecommerce + blog)

---

## Module 22: Generation — Architect Agent (`src/generation/architect.ts`)

### 22.1 Purpose
Two architect classes: `ArchitectAgent` (prompt-based design) and `FullStackArchitect` (static blueprint generation).

### 22.2 Inputs
- `ArchitectAgent.designArchitecture(prompt)` → `ArchitectDecision`
- `FullStackArchitect.design(prompt)` → `FullStackBlueprint`

### 22.3 Outputs
- `ArchitectDecision`: businessType, subDomains[], pages[], components[], stateModel, colorScheme
- `FullStackBlueprint`: appName, colorScheme, dataModels[], apiRoutes[], stateStores[], pages[]

### 22.4 Internal Workflow
**ArchitectAgent:**
1. Classify business type
2. Extract app name (regex)
3. Detect sub-domains (13 keyword categories)
4. Design pages based on sub-domains
5. Design components from page sections
6. Design state model
7. Infer color scheme

**FullStackArchitect:**
1. Scan prompt for domain keywords → determine appName + colorScheme
2. Build DataModel[] based on detected needs
3. Build APIRouteSpec[] (GET+POST per model)
4. Build StateStoreSpec[] (CartStore, BookingStore)
5. Build pages array

### 22.5 Dependencies
- `BusinessClassifier`, `ATOMIC_PRIMITIVES`, `buildPrimitivesCatalog`

### 22.6 Public Interfaces

| Class | Method | Signature |
|---|---|---|
| `ArchitectAgent` | `designArchitecture` | `(prompt) => ArchitectDecision` |
| `ArchitectAgent` | `buildArchitecturePrompt` | `(decision) => string` |
| `FullStackArchitect` | `design` | `(prompt) => FullStackBlueprint` |

### 22.7 Failure Modes
- No name in prompt: Falls back to 'Your Brand'
- Unknown domain: Uses default color scheme
- Keyword ambiguity: May misclassify business type

### 22.8 Testability
- `scripts/verify-generation-layer.ts` Checks 2-3

### 22.9 Scalability Concerns
- Keyword scanning is O(n×m) — fine for current scale

### 22.10 Missing Enhancements
- No LLM-assisted architecture design (purely rule-based)
- No user feedback loop for design preferences
- No A/B testing of design alternatives

---

## Module 23: Generation — Compiler Pipeline (`src/generation/compiler-pipeline.ts`)

### 23.1 Purpose
Scaffolds initial file structure from FullStackBlueprint.

### 23.2 Inputs
- `workspace: WorkspaceConfig`, `blueprint: FullStackBlueprint`

### 23.3 Outputs
- Scaffolded files: pages, prisma schema, state stores

### 23.4 Internal Workflow
1. Create src/app, src/components, src/lib directories
2. `compileFrontendPages()`: Generate page.tsx per route with dark theme stub
3. `compilePrismaSchema()`: Generate schema.prisma (SQLite datasource)
4. `compileStateStores()`: Generate store.tsx with React Context + Provider + hooks

### 23.5 Dependencies
- `fs`, `path`, `FullStackBlueprint`, `WorkspaceConfig`

### 23.6 Public Interfaces

| Method | Signature | Description |
|---|---|---|
| `compile` | `(workspace, blueprint) => void` | Scaffold all files |

### 23.7 Failure Modes
- Existing files: Overwrites without warning
- Invalid blueprint: May generate invalid code

### 23.8 Testability
- Tested by verify scripts checking file existence

### 23.9 Scalability Concerns
- Synchronous file writes
- No incremental scaffolding

### 23.10 Missing Enhancements
- No template engine (Handlebars/EJS)
- No incremental scaffolding (only full scaffold)
- `compileDatabaseClient` and `compileAPIRoutes` deferred

---

## Module 24: Web UI — Landing Page (`web/src/app/page.tsx`)

### 24.1 Purpose
Client-side prompt input interface with example suggestions.

### 24.2 Inputs
- User text input in textarea

### 24.3 Outputs
- POST /api/create → navigation to /workspace/{id}

### 24.4 Internal Workflow
1. User types prompt (Enter to submit, Shift+Enter for newline)
2. POST /api/create with prompt
3. Navigate to /workspace/{id}

### 24.5 Dependencies
- React (useState), Next.js (useRouter)

### 24.6 Public Interfaces
Client component — no public API.

### 24.7 Failure Modes
- Empty prompt: Button disabled
- API error: Alert displayed

### 24.8 Testability
- Manual browser testing

### 24.9 Scalability Concerns
- None (client-side only)

### 24.10 Missing Enhancements
- No prompt templates library
- No voice input
- No image upload for cloning

---

## Module 25: Web UI — Workspace Builder (`web/src/app/workspace/[id]/page.tsx`)

### 25.1 Purpose
3-panel workspace builder with chat, code editor, and live preview.

### 25.2 Inputs
- URL parameter: workspace ID
- User follow-up messages

### 25.3 Outputs
- Real-time build progress
- File tree with code viewer
- Live preview iframe

### 25.4 Internal Workflow
1. On mount: trigger build via POST /api/workspace/{id}/build
2. Poll progress every 1s via GET /api/workspace/{id}/progress
3. On "done": load files and preview
4. Follow-up: trigger new build with followUp parameter

### 25.5 Dependencies
- React (useState, useEffect, useRef, useCallback), Next.js (useParams)

### 25.6 Public Interfaces
Client component — no public API.

### 25.7 Failure Modes
- Build timeout: No explicit timeout handling
- Network error: Polling continues indefinitely

### 25.8 Testability
- Manual browser testing

### 25.9 Scalability Concerns
- Single workspace per tab
- No workspace persistence across refresh

### 25.10 Missing Enhancements
- No syntax highlighting in code editor
- No hot reload in preview
- No collaborative editing
- No workspace history/versions

---

## Module 26: Web API Routes

### 26.1 Create API (`/api/create`)
- **POST**: Save prompt to `.prompts/{id}.json`, return workspace ID
- **Dependencies**: fs, path

### 26.2 Build API (`/api/workspace/[id]/build`)
- **POST**: Execute engine via `execSync(npx tsx .build-temp-{id}.mts)`, 120s timeout
- **Dependencies**: fs, path, child_process

### 26.3 Progress API (`/api/workspace/[id]/progress`)
- **GET**: Read `.progress` file, map phase labels, derive status
- **Dependencies**: fs, path

### 26.4 Files API (`/api/workspace/[id]/files`)
- **GET**: Recursive directory scan, exclude node_modules/.next/dotfiles
- **Dependencies**: fs, path

### 26.5 File API (`/api/workspace/[id]/file`)
- **GET**: Read single file with path traversal protection
- **Dependencies**: fs, path

### 26.6 Preview API (`/api/workspace/[id]/preview`)
- **GET**: SSR via ReactDOMServer.renderToStaticMarkup, 30s TTL cache
- **Dependencies**: child_process, fs, path

---

## Module 27: Verification Scripts

### 27.1 verify-generation-layer.ts (4 checks)
1. JIT synthesis generates patches
2. ArchitectAgent cross-domain decomposition
3. FullStackArchitect blueprint generation
4. End-to-end orchestration pipeline

### 27.2 verify-multi-file.ts (36 checks)
- Part A: 3 business prompts × 9 checks each = 27 checks
- Part B: Per-page isolation test = 9 checks

### 27.3 verify-fullstack-db.ts (36 checks)
- Schema generation, file write, client scaffolding, API routes, package.json injection, syntax checks

### 27.4 verify-telemetry.ts (21 checks)
- Method existence, graceful degradation, type shapes
