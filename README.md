# build.same — Application Generation Platform

`build.same` is a production-grade, AI-powered application generation platform that translates natural language prompts into complete, working Next.js applications. It combines a **Business Operating System (BOS)** with an **AST-first patch pipeline** and **multi-provider LLM routing** to generate real, domain-specific code — not generic templates.

**Live:** https://build-same.vercel.app

---

## Architecture Overview

```
User Prompt
    │
    ▼
┌──────────────────────┐
│  ContentResearchAgent │  ← Browses web for real business data
│  (Web Search + Crawl) │     Extracts headlines, pricing, testimonials
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   IntentDNA Extractor │  ← Extracts domain, features, entities
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Business Operating  │  ← Four-layer reasoning:
│   System (BOS)        │     Evidence → Knowledge → Rules → Blueprint
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│    LLM Gateway        │  ← Multi-provider routing (Groq, Gemini, Anthropic)
│  (Research-Informed)  │     Research data injected into system prompt
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  AST Patch Pipeline   │  ← Validates, simulates, applies patches
│  + Sandbox Compiler   │     Self-healing loop with rollback
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│    Deploy to Vercel   │
└──────────────────────┘
```

---

## Key Features

### Content Research Agent
Before generation, the system **browses the real web** to find competitor websites, extract actual business data (headlines, pricing, testimonials, features, CTAs), and injects this into the LLM prompt. The LLM generates with real content, not generic placeholders.

### LLM Output Wins
When the LLM succeeds, its output is used for **all files** — pages, components, and API routes. Domain synthesis (static templates) is only used as a fallback when the LLM fails. Previously, LLM-generated page output was always discarded.

### Business Operating System (BOS)
A four-layer deterministic reasoning system:
- **Evidence Layer**: Collects and validates business data
- **Knowledge Layer**: 23 industry patterns, 4 design profiles, 5 capability skill packs
- **Business Reasoning Layer**: Rules engine + constraint solver + scorer
- **Generation Layer**: Deterministic code generation from compiled blueprints

### Multi-Provider LLM Routing
Automatic failover across Groq (primary), Gemini, and Anthropic. Router tracks provider health and selects the best available provider for each request.

### AST-First Patch Pipeline
All code changes are validated through AST parsing, simulated in memory, and compiled with TypeScript before touching the filesystem. Self-healing loop with automatic rollback on failure.

---

## Directory Structure

```text
build-same-engine/
├── src/
│   ├── types/                    # TypeScript type definitions
│   ├── core/                     # AST patcher, snapshot, LLM gateway, router
│   ├── generation/               # Architect, domain synthesizer, content research
│   ├── bos/                      # Business Operating System
│   │   ├── evidence/             # Persistent evidence store
│   │   ├── knowledge/            # Design profiles, patterns, skill packs
│   │   ├── reasoning/            # Rules engine, constraint solver, scorer
│   │   └── schemas/              # Zod validation schemas
│   ├── agents/                   # Deterministic orchestrator v4
│   ├── engine/                   # Self-healing engine, repair loop
│   ├── graph/                    # AST dependency graph, module resolver
│   ├── intelligence/             # Impact analyzer, patch ranker
│   ├── compiler/                 # TypeScript auditor, error compressor
│   ├── sandbox/                  # Sandbox engine
│   ├── validation/               # AST patch validator, patch simulator
│   ├── business-intelligence/    # BI pipeline, web researcher
│   ├── mcp/                      # MCP server tools
│   └── server.ts                 # Engine entry point
└── web/                          # Next.js web UI (deployed to Vercel)
    └── src/
        ├── app/                  # Pages: workspace, build, landing
        └── lib/                  # Engine client, API helpers
```

---

## Getting Started

### Prerequisites
- Node.js v20+
- API key for at least one LLM provider (Groq, Gemini, or Anthropic)

### Setup

```bash
git clone <repo-url>
cd build-same-engine
npm install
```

### Environment Variables

```bash
# LLM Provider (primary)
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...

# Fallback providers
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...

# Model
LLM_MODEL=llama-3.3-70b-versatile
```

### Run Engine

```bash
npx tsx src/server.ts
# Engine runs on http://127.0.0.1:3001
```

### Run Web UI

```bash
cd web
npm install
npm run dev
# Web UI runs on http://localhost:3000
```

### Deploy

```bash
# Engine (via Cloudflare Tunnel)
cloudflared.exe tunnel --url http://127.0.0.1:3001

# Web UI (via Vercel)
cd web && vercel --prod
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Engine health check |
| POST | `/api/create` | Start a new build |
| GET | `/api/workspace/:id/progress` | SSE progress stream |
| GET | `/api/workspace/:id/preview` | Get preview URL |
| GET | `/api/workspace/:id/files` | List generated files |
| GET | `/api/workspace/:id/file` | Get file content |

---

## Generation Pipeline

1. **Content Research** — Searches web for real business data
2. **Intent Extraction** — Extracts domain, features, entities from prompt
3. **Build Memory** — Checks for similar past builds
4. **BI Analysis** — Business intelligence pipeline
5. **BOS Blueprint** — Rules + constraints + scoring → deterministic blueprint
6. **LLM Generation** — Generates code with real content in prompt
7. **AST Validation** — Parses, simulates, validates patches
8. **Sandbox Compilation** — TypeScript compilation in sandbox
9. **Self-Healing** — Auto-fix compilation errors, rollback on failure
10. **Deploy** — Push to Vercel

---

## BOS Industry Patterns

23 patterns covering 100+ sub-industries:
- Luxury, Restaurant, Fitness, Education, Real Estate, Travel
- Legal, Agency, Media, Nonprofit, Automotive, Pet, Wedding
- Dental, Architecture, Photography, Consulting, SaaS Startup
- Fashion, Food Delivery, Electronics, E-Commerce, Healthcare

Each pattern includes: pages, components, workflows, integrations, design tokens.

---

## Tech Stack

- **Runtime**: Node.js 20+, TypeScript strict mode
- **Framework**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS 4
- **Validation**: Zod 3.24
- **Database**: SQLite (better-sqlite3)
- **LLM**: Groq, Gemini, Anthropic (multi-provider routing)
- **Deployment**: Vercel (web), Cloudflare Tunnel (engine)
- **Testing**: Playwright (E2E)

---

## License

Proprietary — All rights reserved.
