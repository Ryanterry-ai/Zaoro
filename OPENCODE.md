# Build Engine — opencode Instructions

This file is the entry point for opencode when working on this project. It merges project context with agent skills to deliver the build-same-engine system.

## What this is

A dual-mode system: clone an existing website (extractive) or generate a new one from a business description (generative). Both modes converge on the same build-orchestrator, quality gates, and deploy pipeline.

## Architecture

```
src/
  server.ts              — HTTP + SSE server (port 3001)
  engine/                — Build pipeline orchestrator, progress tracking, queue
  generation/            — Architect, assembly-qa, design-dna, asset-intelligence
  cloning/               — Clone orchestrator v2
  intelligence/          — Business intelligence, capability graph, BOS registry
  planning/              — Application blueprint, business process modeling
  mcp/                   — MCP server + tools
  core/                  — Persistence, debug logging
web/
  src/app/               — Next.js App Router (page.tsx, workspace/[id]/page.tsx)
  src/components/        — PipelineTimeline, shared UI
  src/lib/               — React hooks (use-build-events)
```

## Hard rules (non-negotiable, inherited from AGENTS.md)

1. Default every task to a deterministic tool (see tools/). Only call an LLM for tasks listed in skills as "LLM-required."
2. Never generate boilerplate with an LLM — copy from templates/ and parameterize.
3. Never let a single LLM call span more than one page/component during build.
4. No generated code may reference the source URL or hot-link a non-client-owned asset.
5. Every project must pass quality-gate (lint + typecheck + build) before completion.
6. All content must be stored in structured data — never hardcoded inline.
7. This system must run under any LLM provider; model-specific behavior belongs in one adapter file.

## Skills used by this project

| Skill | Purpose |
|---|---|
| `find-skills` | Discover new skills for emerging tasks |
| `auto-skill-orchestrator` | Coordinate long-running builds, resume across sessions |
| `design-taste-frontend` | Premium frontend design (anti-slop) |
| `high-end-visual-design` | Awwwards-tier UI/UX + motion choreography |
| `react-expert` | React/Next.js component construction |
| `nextjs-developer` | Next.js App Router, server components |

## Phase map (22-stage pipeline)

The build pipeline runs these stages in order. The UI visualizes them via `PipelineTimeline` component:

`memory → bi → bos → research → architect → design-dna → design → components → assets → motion → synthesize → ux-eval → biz-eval → assembly → correction → compile → browser-verify → repair → quality-gate → content-gate → preview → complete`

## Commands

```bash
# Start engine server
npm run server

# Start web UI
cd web; npm run dev

# Verify a build
npm run verify-build

# Quality gate
npm run lint && npm run typecheck && npm run build
```
