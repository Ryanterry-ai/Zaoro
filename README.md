CODE:

# build.same (V4) — Deterministic AST State Synchronization Engine

`build.same` is a production-grade, AST-first software engineering engine designed to translate natural language prompts into type-safe, compile-verified Next.js (App Router) applications. 

By replacing fragile string-based parsing and full-file rewrites with an **Incremental AST Patch System + Server-Side Sandbox Compiler Loop**, the system guarantees codebase integrity, state preservation, and zero-regression compilation.

---

## 1. Directory Structure

```text
build-same-engine/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── types/
    │   └── index.ts
    ├── core/
    │   ├── ast-patcher.ts
    │   ├── patch-transaction.ts
    │   └── snapshot.ts
    ├── graph/
    │   ├── ast-dependency-graph.ts
    │   ├── export-indexer.ts
    │   └── module-resolver.ts
    ├── intelligence/
    │   ├── impact-analyzer.ts
    │   ├── patch-ranker.ts
    │   └── regression-predictor.ts
    ├── compiler/
    │   ├── auditor.ts
    │   └── compressor.ts
    ├── sandbox/
    │   └── engine.ts
    ├── validation/
    │   ├── ast-patch-validator.ts
    │   └── patch-simulator.ts
    └── agents/
        └── deterministic-orchestrator-v4.ts
2. Core Architectural Flow
The execution cycle inside build.same operates as a strict, four-stage deterministic gate:

[ Natural Language Prompt / API Directives ]
                     │
                     ▼
       ┌───────────────────────────┐
       │ DeterministicOrchestrator │ ── (1) Parse import paths & build graph
       └─────────────┬─────────────┘
                     │
                     ▼
       ┌───────────────────────────┐
       │   RegressionPredictor     │ ── (2) Block API breaking contract changes
       └─────────────┬─────────────┘
                     │
                     ▼
       ┌───────────────────────────┐
       │    ASTPatchValidator      │ ── (3) Verify codeblock syntax & export targets
       └─────────────┬─────────────┘
                     │
                     ▼
       ┌───────────────────────────┐
       │      PatchSimulator       │ ── (4) Dry-run in-memory AST mutations
       └─────────────┬─────────────┘
                     │
                     ▼
       ┌───────────────────────────┐
       │    TypeScriptAuditor      │ ── (5) Programmatic type-audit checking (TSC)
       └─────────────┬─────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
   [Build Passes]          [Build Fails]
         │                       │
         │                       ▼
         │         ┌───────────────────────────┐
         │         │     WorkspaceSnapshot     │ ── (6) Rollback filesystem & delete
         │         │                           │        untracked code / empty folders
         │         └───────────┬───────────────┘
         │                     │
         │                     ▼
         │         ┌───────────────────────────┐
         │         │      ErrorCompressor      │ ── (7) Trim TS error logs by 70%
         │         │                           │        and feed back to prompt loop
         │         └───────────┬───────────────┘
         │                     │
         │                     └─────────────────► [Next Healing Attempt]
         ▼
   [Ready to Deploy] ──► Git Push (Vercel)
3. Four Stacked Intelligence Layers
Structural Layer: Uses ASTPatchValidator and PatchSimulator to analyze AST mutations in memory using recast and babel/parser before any change touches the disk.
Graph Layer: Employs ASTDependencyGraph, ExportIndexer, and ModuleResolver to parse files, resolve relative/alias imports, and index export-signatures in POSIX-canonical path format.
Intelligence Layer: Runs an ImpactAnalyzer to calculate transitive dependent blast-radii (cycle-safe DFS), a PatchRanker to sort edits from safest to riskiest, and a RegressionPredictor to enforce API contracts using stable structural hashes.
Execution Layer: The DeterministicOrchestratorV4 coordinates snapshot state backups, schedules safe NPM installations, runs the self-healing compilation loop, and stops hanging developer server threads.
4. Production Hardening Features
Zero File Pollution: snapshot.restore() surgically deletes newly created files and cleans up vacant directory nodes left by failed generations using a post-order traversal model. It never touches node_modules, .next, or hidden folder hierarchies.
Strict Compiler Compliance: Programmatic visitors, checkers, and modules compile with zero warnings under TypeScript strict: true and noImplicitAny: true.
stable Hashing: Export signature hashes are computed using AST structures that are recursively stripped of layout locations, JSDocs, and formatting code noise to prevent false-positive regression blocks.
Deterministic Self-Correction: If a code update fails any validation gate, the filesystem is restored, and compressed structural errors are sent back to the LLM. The transaction commits only when the TypeScript Compiler API returns 0 errors.
5. Development and Build Instructions
Prerequisites
Make sure you have Node.js (v20+ or v22+) installed on your Linux, macOS, or Windows machine.

Local Installation
# Clone the repository and navigate to root directory
cd build-same-engine

# Sync package dependencies
npm install
Build Verification
Ensure strict type check compliance and emit compiled JS production builds:

# Run strict TypeScript pre-emit verification
npx tsc --noEmit

# Compile production-ready build targets
npm run build
6. Integration and LLM Connection Guide
To plug this engine into a production LLM loop (Claude 3.5/3.7 Sonnet, Gemini 2.0 Pro, or GPT-4o/5):

Bind your API gateway wrapper to a client callback function with the type:
type LLMGateway = (context: LLMContext) => Promise<ASTPatch[]>;
Feed the orchestrator your workspace requirements:
import { DeterministicOrchestratorV4 } from './src/agents/deterministic-orchestrator-v4.js';

const orchestrator = new DeterministicOrchestratorV4('./sandbox_workspaces');

await orchestrator.runCompilationFlow(
  'demo-workspace',
  'Build a clean SaaS payment dashboard styled with violet theme, metrics cards, and a Stripe payment gateway form.',
  myLLMClientGateway
);