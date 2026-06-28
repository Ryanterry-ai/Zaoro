---
name: orchestrator
description: Entry point that routes clone vs generative vs hybrid pipeline and sequences all steps
bucket: A
reason: Deterministic routing logic; no LLM calls
---

# Orchestrator Skill

## Purpose
Entry point that routes user input to the correct pipeline.

## Implementation
Canonical implementation: `src/agents/deterministic-orchestrator-v4.ts`

## Pipeline Selection (DETERMINISTIC — no LLM)

```
INPUT_ANALYSIS:
  has_url = input contains a URL (regex: https?://\S+)
  has_business = input contains a business description (non-URL text, >50 chars)

  if has_url AND NOT has_business:
    → CLONE PIPELINE (Section 5 of AGENTS.md)
  if has_business AND NOT has_url:
    → GENERATIVE PIPELINE (Section 6 of AGENTS.md)
  if has_url AND has_business:
    → HYBRID: clone pipeline for design tokens/structure ONLY
              generative pipeline for all business logic and content
              (never copy competitor text/prices verbatim)
```

## Clone Pipeline Steps
1. `tools/crawler` → discover page graph
2. `tools/asset-downloader` → download images, fonts, videos
3. `tools/token-extractor` → extract design tokens from DOM
4. `skills/component-spec-writer` → one LLM call per page (component breakdown)
5. `skills/parallel-builder` → one LLM call per component (code generation)
6. `tools/screenshot-diff` → pixel diff against source
7. `tools/dependency-checker` → verify zero external URLs
8. `tools/quality-gate` → lint + typecheck + build

## Generative Pipeline Steps
1. `skills/business-reasoning/orchestration` → run the 19-agent chain
2. `skills/deploy-target-selector` → pick tier (DETERMINISTIC)
3. `skills/content-generator` → one LLM call per page (copy writing)
4. `skills/parallel-builder` → one LLM call per component (code generation)
5. `tools/dependency-checker` → verify zero external URLs + copy-bleed detection
6. `tools/quality-gate` → lint + typecheck + build

## Hybrid Pipeline Steps (URL + description)
1. Clone phase: `tools/crawler` + `tools/token-extractor` → design tokens/structure only
2. Generative phase: all business logic and content (never copy competitor text)
3. `tools/dependency-checker --source-text` → n-gram overlap detection (copy-bleed)
4. `tools/quality-gate` → lint + typecheck + build

## Output
Both pipelines produce:
- A complete project in `projects/<project-name>/`
- `DEPLOY.md` with platform-specific deploy instructions
- `content/` directory with all editable content as JSON
- `docs/research/` with recon output (clone) or reasoning output (generative)
