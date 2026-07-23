# Build Engine — Agent Instructions

## What this is
A dual-mode system: clone an existing website (extractive) or generate a new one from a business description (generative). Both modes converge on the same build-orchestrator, quality gates, and deploy pipeline.

## Hard rules (non-negotiable)
1. Default every task to a deterministic tool (see tools/). Only call an LLM for tasks listed in skills/*/SKILL.md as "LLM-required," and even then, scope the call to one decision or one artifact.
2. Never generate boilerplate (configs, package.json, CI, Dockerfiles) with an LLM — copy from templates/ and parameterize with a script.
3. Never let a single LLM call span more than one page/component during the build phase. If a task description says "build the homepage," it is malformed — it must say "build the Hero section using spec X and tokens Y."
4. No generated code may reference the source URL, hot-link a source asset, or call back to any non-client-owned service at runtime.
5. Every project must pass tools/quality-gate (lint + typecheck + build) before being marked complete. A model's claim of success is not sufficient evidence.
6. All content (copy, prices, images) must be stored in structured data — JSON/MDX/DB rows — never hardcoded inline in component code. This is what makes "customize later" possible without redeploying.
7. This system must run correctly under any LLM provider. Any model-specific behavior belongs in a single adapter file, never scattered through skill instructions.

## Pipeline selection (deterministic — see orchestrator/SKILL.md)
- Input has a URL, no business description → clone pipeline
- Input has a business description, no URL → generative pipeline
- Input has both → hybrid: clone pipeline for design/structure inspiration only, generative pipeline for actual business logic and all content (never copy a competitor's real text/prices verbatim)

## Build.Anything — Agent Instructions

### Trigger
When the user runs `/build-anything "prompt"` or
`npx tsx src/app/build-anything-cli.ts "prompt"`:

### Your Role
You are the LLM in this pipeline. The engine runs deterministically
and produces a spec. You read the spec and write the code.
No API calls. No fetches. You write files directly.

### Steps
1. Run: `npx tsx src/app/build-anything-cli.ts "<user prompt>"`
2. Read `.build-anything/projects/<slug>/agent-task.md`
3. Execute the ## ⚡ Action Required section — write every TSX file listed
4. Files land in `.build-anything/projects/<slug>/src/components/`
5. Pipeline polls for them automatically — no manual trigger needed

### Environment
- `IS_AGENT_MODE` auto-detects to `true` when no API key is set
- `BUILD_OFFLINE=1` skips all LLM calls in the deterministic stages
- You are the only LLM in this loop

## After editing this file
Run `bash scripts/sync-agent-rules.sh` to propagate to all platform-specific instruction files (CLAUDE.md, GEMINI.md, etc.) — this file is the only one a human edits directly.
