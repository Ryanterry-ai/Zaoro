# Build Same Engine

Universal Build & Clone Engine — takes a URL or a business description and produces a production-quality, deployable codebase.

## Architecture

```
Prompt → BRE v2 → Execution Blueprint → Content Resolver → Application Spec → Renderer → Code
```

### Four Clean Layers

| Layer | Responsibility | Output |
|-------|---------------|--------|
| **BRE v2** | Business decisions (what the app needs) | Application Blueprint |
| **Execution Blueprint** | Structural mapping (which components go where) | Page → Component slots |
| **Content Resolver** | Fills business content (tiers, testimonials, features) | Application Spec |
| **Renderer** | Platform-specific code generation | React, Flutter, SwiftUI, HTML |

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
2. Execution Planner (Section → Component mapping)
3. Content Resolver (Business content from knowledge base)
4. React Renderer (TSX generation)
5. Quality Gate (lint + typecheck + build)
```

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

- HeroBanner, FeatureGrid, PricingTable, Testimonials, CTASection
- FAQSection, StatsCards, ChartsPanel, AuthForm, ContactForm
- DataTable, Footer, ProductGrid, and more

## Knowledge Base

Built-in design profiles, patterns, and industry templates:

- 4 design profiles (SaaS Modern, Healthcare Clean, E-Commerce Modern, Luxury Dark)
- 22 industry patterns (restaurant, gym, SaaS, e-commerce, etc.)
- 6 skill packs (auth, payment, analytics, compliance, notification, inventory)
- 3 business models (subscription, direct-sales, marketplace)
- 3 user journeys (visitor, customer, admin)
- 2 compliance packs (GDPR, PCI DSS)

## Quality Gates

Every build must pass: lint → typecheck → build → dependency check (zero external URLs).

## Tech Stack

- TypeScript (strict mode)
- Next.js App Router
- Prisma ORM
- Tailwind CSS
- Zod schemas
- Vitest for testing
