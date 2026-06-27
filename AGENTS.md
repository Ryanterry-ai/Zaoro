# Build Engine — Agent Instructions

## What this is
A dual-mode system: clone an existing website (extractive) or generate a
new one from a business description (generative). Both modes converge on
the same build-orchestrator, quality gates, and deploy pipeline.

## Hard rules (non-negotiable)
1. Default every task to a deterministic tool (see tools/). Only call an
   LLM for tasks listed in skills/*/SKILL.md as "LLM-required," and even
   then, scope the call to one decision or one artifact.
2. Never generate boilerplate (configs, package.json, CI, Dockerfiles)
   with an LLM — copy from templates/ and parameterize with a script.
3. Never let a single LLM call span more than one page/component during
   the build phase. If a task description says "build the homepage," it
   is malformed — it must say "build the Hero section using spec X and
   tokens Y."
4. No generated code may reference the source URL, hot-link a source
   asset, or call back to any non-client-owned service at runtime.
5. Every project must pass tools/quality-gate (lint + typecheck + build)
   before being marked complete. A model's claim of success is not
   sufficient evidence.
6. All content (copy, prices, images) must be stored in structured
   data — JSON/MDX/DB rows — never hardcoded inline in component code.
   This is what makes "customize later" possible without redeploying.
7. This system must run correctly under any LLM provider. Any
   model-specific behavior belongs in a single adapter file, never
   scattered through skill instructions.

## Pipeline selection (deterministic — see orchestrator/SKILL.md)
- Input has a URL, no business description → clone pipeline
- Input has a business description, no URL → generative pipeline
- Input has both → hybrid: clone pipeline for design/structure
  inspiration only, generative pipeline for actual business logic and
  all content (never copy a competitor's real text/prices verbatim)

## The LLM is the last-mile renderer
The intelligence lives in:
- BOS reasoning engine (rules, constraints, scoring)
- Knowledge graph (industry patterns, capabilities, vocabulary)
- Deterministic generators (code, schema, config)
- Quality gates (lint, typecheck, build, dependency check)

The LLM only touches:
- Code generation from LOCKED specs (one component per call)
- Content writing from structured briefs (one page per call)
- Visual world definition (one call, MoodboardDirector)
- Structured data extraction (one call per data type)

## After editing this file
Run `bash scripts/sync-agent-rules.sh` to propagate to all
platform-specific instruction files (CLAUDE.md, GEMINI.md, etc.) — this
file is the only one a human edits directly.
