# Build Same Engine

Universal Build & Clone Engine — takes a URL or a business description and produces a production-quality, deployable codebase.

## Architecture

```
Prompt → BRE v2 → Execution Blueprint → Content Resolver → Application Spec → Renderer → Code
                          ↑                     ↑
                    [Web Scraping]      [Skill Integrator]
```

### Layers

| Layer | Responsibility | Output |
|-------|---------------|--------|
| **BRE v2** | Business decisions (what the app needs) | Application Blueprint |
| **Web Scraping** | Auto-searches Google for business data, scrapes website | `BusinessIntelligenceProfile` (revenue models, descriptions) |
| **Content Resolver** | Fills business content from scraped data + knowledge base | Application Spec |
| **Skill Integrator** | UI UX Pro Max skill data — 161 color palettes, 57 font pairings, layout/anim/UX guidelines | `DesignRecommendation` overrides |
| **Execution Blueprint** | Structural mapping (which components go where) | Page → Component slots |
| **Renderer** | Platform-specific code generation with Framer Motion + 21st.dev component imports | React, Flutter, SwiftUI, HTML |

**Key principle**: Business decisions are separated from rendering. The same Application Blueprint can be rendered into any target platform.

## Quick Start

```bash
# Start engine
npx tsx src/server.ts

# Run a build
curl -X POST http://localhost:3001/api/create \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Build a SaaS subscription platform called CloudDash"}'

curl -X POST http://localhost:3001/api/workspace/<id>/build
```

## Modes

- **Clone mode**: Provide a URL → crawls, extracts design tokens, downloads assets, generates components.
- **Generative mode**: Provide a business description → reasons through industry, problems, solutions, UX, and generates a site.
- **Hybrid mode**: Clone for design inspiration, generate for actual content.

## Pipeline Stages

```
1. BRE v2 (Rules → Constraints → Scoring → Blueprint)
2. Web Scraping (Google search → website scrape → BusinessIntelligenceProfile)
3. Execution Planner (Section → Component mapping)
4. Content Resolver (Scraped data + knowledge base → real business content)
5. Skill Integration (UI UX Pro Max → color palettes, fonts, layout, UX guidelines)
6. React Renderer (TSX generation with Framer Motion + 21st.dev imports)
7. Pass 3 Code Generation (ApplicationGraph → entities, tables, API code)
8. Quality Gate (lint + typecheck + build)
```

## 21st.dev Integration

Components with known 21st.dev equivalents (CTA, testimonials, footer) are rendered as import wrappers:

```tsx
import { CtaSection } from '@21st-dev/cta-section';
// instead of generating 300+ lines of inline TSX
```

The `ComponentSourceRec` system in `RenderContext` maps component types to external packages. Add more entries in `skill-integrator.ts:TWENTY_FIRST_SECTIONS` to extend.

## Framer Motion

All generated components use scroll-reveal animations via `<motion.*>` wrappers:
- `initial={{ opacity: 0, y: 24 }}` / `whileInView={{ opacity: 1, y: 0 }}`
- Staggered children via `staggerChildren: 0.1`
- `viewport={{ once: true }}` for one-shot reveals

## Images

Images are served from **Unsplash** (30 real photo IDs, hash-seeded per keyword) — no picsum.photos placeholders.

## Web Scraping

The pipeline auto-scrapes the web for business intelligence before building:
- Google search for `{business name} {industry}`
- Generic website scrape for description, features, revenue models
- 7-day cache to avoid redundant scrapes
- Scraped data feeds `revenueIntelligence` → `ContentResolver` → pricing tiers, about sections

## Debug Logging

Enable detailed logging for any pipeline stage:

```bash
# Via environment
DEBUG=true DEBUG_STAGES=bre,exec,resolve,render npx tsx src/server.ts

# Via API
curl -X POST http://localhost:3001/api/debug/enable \
  -H "Content-Type: application/json" \
  -d '{"stages": ["bre", "exec", "resolve", "render"]}'

# View logs
curl http://localhost:3001/api/debug/logs
curl http://localhost:3001/api/debug/logs?format=text
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/create` | POST | Create workspace with prompt |
| `/api/workspace/:id/build` | POST | Start build |
| `/api/workspace/:id/progress` | GET | Build progress |
| `/api/workspace/:id/files` | GET | Generated files |
| `/api/workspace/:id/preview` | GET | Live preview |
| `/api/workspace/:id/download` | GET | Download ZIP |
| `/api/debug/logs` | GET | Debug logs |
| `/api/debug/enable` | POST | Enable debug logging |
| `/api/debug/disable` | POST | Disable debug logging |

## Components

The renderer generates these component types:

- **Inline**: HeroBanner, FeatureGrid, PricingTable, FAQSection, StatsCards, AuthForm, ContactForm, DataTable, ProductGrid
- **21st.dev import**: CTA, Testimonials, Footer (configurable in `skill-integrator.ts`)

## Execution Runtime

Workspace execution runtime for sandboxed build jobs:
- State machine (queued → running → success/failure)
- Local process provider with timeout + resource limits
- Workspace manager (create, write, cleanup)
- Port manager (find free ports, release)
- Preview lifecycle (build → proxy → health check)
- Event emitter for SSE progress streaming

## Knowledge Base

Built-in design profiles, patterns, and industry templates:

- 4 design profiles (SaaS Modern, Healthcare Clean, E-Commerce Modern, Luxury Dark)
- 22 industry patterns (restaurant, gym, SaaS, e-commerce, etc.)
- 6 skill packs (auth, payment, analytics, compliance, notification, inventory)
- 3 business models (subscription, direct-sales, marketplace)
- 3 user journeys (visitor, customer, admin)
- 2 compliance packs (GDPR, PCI DSS)
- Skill Integrator: 161 color palettes, 57 font pairings, UX guidelines from UI UX Pro Max

## Quality Gates

Every build must pass: lint → typecheck → build → dependency check (zero external URLs).

## Tech Stack

- TypeScript (strict mode)
- Next.js App Router
- Prisma ORM
- Tailwind CSS
- Zod schemas
- Vitest for testing (329+ tests)
