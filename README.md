# Build Engine

Universal Build & Clone Engine — takes a URL or a business description and produces a production-quality, deployable codebase.

## Modes

- **Clone mode**: Provide a URL → crawls, extracts design tokens, downloads assets, generates components, diffs screenshots, produces deployable output.
- **Generative mode**: Provide a business description → reasons through industry, problems, solutions, UX, and generates a site from structured templates.

## Quick start

```bash
# Clone mode
node tools/crawler/index.js https://example.com --output ./project

# Generative mode
node skills/_adapter/index.js --task structured-extraction --input "A 3-location gym chain in Texas"
```

## Architecture

```
skills/          — SKILL.md files (agent instructions)
skills/_adapter/ — LLM provider adapter (the only model-specific code)
tools/           — Deterministic scripts (Bucket A — no LLM)
templates/       — Pre-scaffolded app tiers (copy + parameterize, never LLM-generated)
docs/            — Per-project recon output and design references
scripts/         — Build utilities
```

## Tier selection

| Tier | Stack | Use case |
|------|-------|----------|
| static | Astro / plain HTML+CSS+JS | Budget sites, landing pages |
| standard | Next.js standalone | Most projects |
| fullstack | Next.js + Prisma + DB | Projects needing auth/database |

## Quality gates

Every build must pass: lint → typecheck → build → dependency check (zero external URLs).
