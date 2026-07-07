---
name: build-anything
description: Orchestrate the full Build.Anything pipeline — design, plan, and generate any software project from a single prompt. Delegates to the existing orchestrator, never duplicates logic.
---

# /build-anything

## Invocation

When the user types `/build-anything "<prompt>"`, this skill takes control immediately.

Do NOT fall back to Claude's default reasoning. Execute the pipeline below.

## Execution Flow

```
User prompt
  │
  ▼
Banner + Execution ID
  │
  ▼
Parse input (prompt | URL | hybrid)
  │
  ▼
Intent Router          ← src/orchestration/intent-router.ts
  │
  ▼
Project Intake         ← src/orchestration/stages/project-intake.ts
  │
  ▼
Decision Engine        ← src/orchestration/decision-engine.ts
  │
  ▼
Planner                ← src/orchestration/planner.ts
  │
  ▼
BOS Detection          ← src/orchestration/bos-loader.ts
  │
  ▼
Knowledge Graph        ← src/bos/knowledge/seeds/index.ts
  │
  ▼
Research               ← src/orchestration/stages/research.ts
  │
  ▼
Business Analysis      ← src/orchestration/stages/business-analysis.ts
  │
  ▼
Architecture           ← src/orchestration/stages/architecture.ts
  │
  ▼
Database Design        ← src/orchestration/stages/database-design.ts
  │
  ▼
API Design             ← src/orchestration/stages/api-design.ts
  │
  ▼
Design Intelligence    ← src/orchestration/design-intelligence/engine.ts
  │
  ▼
Frontend Design        ← src/orchestration/stages/frontend-design.ts
  │
  ▼
Validation             ← src/orchestration/validation-pipeline.ts
  │
  ▼
Review Board           ← src/orchestration/stages/review-board.ts
  │
  ▼
Self-Healing           ← src/engine/self-healing-engine.ts
  │
  ▼
Runtime                ← src/orchestration/runtime/runtime-engine.ts
  │
  ▼
Execution Report       ← src/orchestration/execution-report.ts
```

Every stage above delegates to the existing source file listed. No stage logic lives in this skill.

## Banner

Immediately after invocation display:

```
══════════════════════════════════════
  Build.Anything v2
  Execution ID: <uuid>
  Mode: <prompt|website|hybrid>
  Pipeline: Build.Anything
  Status: Starting
══════════════════════════════════════
```

## Stage Progress

For every stage display:

```
[1/18] Intent Router        ← parsing input
[2/18] Project Intake       ← building manifest
[3/18] Decision Engine      ← selecting strategy
[4/18] Planner              ← ordering stages
[5/18] BOS Detection        ← detecting industry
[6/18] Knowledge Graph      ← enriching domain
[7/18] Research             ← analyzing requirements
[8/18] Business Analysis    ← mapping entities
[9/18] Architecture         ← designing system
[10/18] Database Design     ← modeling schema
[11/18] API Design          ← defining endpoints
[12/18] Design Intelligence ← selecting design
[13/18] Frontend Design     ← composing UI
[14/18] Validation          ← validating artifacts
[15/18] Review Board        ← reviewing output
[16/18] Self-Healing        ← fixing issues
[17/18] Runtime             ← building project
[18/18] Execution Report    ← generating report
```

Use the existing EventBus (`src/orchestration/event-bus.ts`) for structured progress. Subscribe to events and print human-readable status.

## LLM Integration (Claude Desktop)

The orchestrator calls an `LLMAdapterInterface` for each stage that needs LLM work. In Claude Desktop, **you are the LLM provider**.

Create an inline adapter:

```typescript
import type { LLMAdapterInterface, LLMCallParams, LLMCallResult } from './src/orchestration/types.js';

const adapter: LLMAdapterInterface = {
  call: async (params: LLMCallParams): Promise<LLMCallResult> => {
    // Read params.prompt, params.systemPrompt, params.taskType
    // Use your own reasoning to produce the response
    // Return structured LLMCallResult with content, usage, provider="claude", model="claude-sonnet-4"
    const startTime = Date.now();
    const content = /* your response based on params */ "";
    return {
      content,
      parsed: params.responseSchema ? JSON.parse(content) : undefined,
      usage: { input: 0, output: 0, total: 0 },
      provider: 'claude',
      model: 'claude-sonnet-4-20250514',
      durationMs: Date.now() - startTime,
    };
  },
  getTotalUsage: () => ({ calls: 0, totalTokens: 0, byProvider: {} }),
};
```

Pass this adapter to the orchestrator via `setLLMAdapter(adapter)`.

## Pipeline Execution

### Path A: Design-only (blueprint)

Use the `Orchestrator` class when the user asks for design/planning only:

```typescript
import { Orchestrator } from './src/orchestration/orchestrator.js';
import { ExecutionReportGenerator } from './src/orchestration/execution-report.js';

const orch = new Orchestrator({
  workingDirectory: '.build-anything',
  enableCheckpoints: true,
  enableLLM: true,
});
orch.setLLMAdapter(adapter);
orch.on('stage:start', (e) => console.log(`[${e.stageId}] Starting...`));
orch.on('stage:complete', (e) => console.log(`[${e.stageId}] Done (${e.data?.durationMs}ms)`));
const result = await orch.run(prompt);
const report = await new ExecutionReportGenerator().generate(result);
```

### Path B: Code generation (build)

Use the `DeterministicOrchestratorV4` when the user asks to build/generate code:

```typescript
import { DeterministicOrchestratorV4 } from './src/agents/deterministic-orchestrator-v4.js';
import type { GenerationIntent } from './src/types/index.js';

const orch = new DeterministicOrchestratorV4('./sandbox_workspaces');
const intent: GenerationIntent = { type: 'build-app', prompt };
const result = await orch.processGenerationIntent(executionId, intent);
```

The orchestrator handles BRE v2 → pipeline v2 → execution blueprint → application graph → content resolution → renderer → self-healing, all deterministically.

### Path C: Full pipeline (design → build)

For a complete end-to-end run, run both:

1. `Orchestrator.run()` for design artifacts
2. `DeterministicOrchestratorV4.processGenerationIntent()` for code generation

The design artifacts from step 1 inform the build in step 2.

## Input Detection

Use the intent router to detect input type:

```typescript
const intentType = input.startsWith('http') ? 'website'
  : input.match(/figma\.com/i) ? 'figma'
  : 'prompt';
```

For prompts (the common case), pass the text directly to the orchestrator. For URLs, the website adapter handles scraping.

## Artifact Metadata

Every artifact produced must include:

- `generator`: "Build.Anything"
- `version`: "2.0"
- `executionId`: the generated execution ID
- `stage`: the stage name
- `timestamp`: ISO timestamp

Use the ArtifactStore to write artifacts with this metadata:

```typescript
orch.getArtifactStore().store(
  'architecture.system',
  { generator: 'Build.Anything', version: '2.0', executionId, stage: 'architecture', timestamp: new Date().toISOString(), /* ... content */ },
  'json',
  'architecture'
);
```

## Error Handling

| Failure | Action |
|---------|--------|
| Stage execution error | Retry up to `maxRetries` (default 3) via `RetryEngine` |
| Validation failure | Invoke `SelfHealingEngine` for auto-fixable issues; skip non-blocking gates |
| LLM adapter failure | Retry with exponential backoff; fallback to deterministic defaults |
| Checkpoint available | Resume from last checkpoint via `Planner.loadCheckpoint()` |
| Irrecoverable | Record error in execution report, return partial results |

Do NOT restart the entire pipeline. Use checkpoint/resume from `src/orchestration/planner.ts`.

## Output

Return to the user:

1. **Summary**: What was built, key metrics (files, pages, entities, APIs, duration)
2. **Generated artifacts**: List of pages and key files produced
3. **Execution report**: Full report from `ExecutionReportGenerator`
4. **Next steps**: Suggested customizations or follow-up commands

If errors occurred, include them transparently with recovery suggestions.

## Anti-patterns (never do these)

- Do NOT generate boilerplate code inline — use the renderer
- Do NOT bypass the orchestrator with ad-hoc reasoning
- Do NOT hardcode prompts for individual stages — stage prompts come from BOS packs
- Do NOT skip stages unless the planner explicitly allows it
- Do NOT modify orchestrator, stage, or pipeline code from this skill
- Do NOT call an external LLM API — in Claude Desktop, you ARE the LLM

## Verification

After any `/build-anything` run, verify:

- [ ] Banner was displayed
- [ ] All 18 stages executed (or were properly skipped by planner)
- [ ] Stage progress was displayed
- [ ] Execution report was generated
- [ ] Artifacts carry Build.Anything metadata
- [ ] Errors were handled (retry/checkpoint/self-heal)
- [ ] Existing tests still pass (`npm test`)
