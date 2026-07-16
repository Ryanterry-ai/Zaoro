# Business Intelligence Engine — Architecture

## Overview

The **Business Intelligence Engine** is **Layer 1** of the `/build-anything` intelligence pipeline. It is the **single source of truth** for everything the system knows about a business. Every downstream layer — Knowledge Acquisition, Content Intelligence, Design Intelligence, Experience Intelligence, Technology Planner, Blueprint Generator, Renderer — reads from `BusinessKnowledge` and **never infers business logic**.

## Core Principle: Vertical-Agnostic Reasoning

The engine **does not match keywords to vertical templates** (e.g., "coffee → coffee template"). Instead it extracts **orthogonal primitive signals** from the prompt and composes a complete business understanding from them:

| Primitive Dimension | Examples |
|---------------------|----------|
| `product-nature` | beverage, food, physical-good, digital-good, service, content, software |
| `channel` | physical, online, mobile |
| `fulfillment` | dine-in, takeaway, delivery, appointment, instant-access |
| `monetization` | one-time, subscription, service-fee, wholesale, marketplace, advertising, donation, freemium |
| `audience` | b2c, b2b, internal |
| `goal` | sell-products, sell-services, generate-leads, share-content, build-community, manage-internally |
| `quality` | specialty, luxury, budget |
| `locale` | IN, US, EU, etc. |

These primitives are **vertical-agnostic**: "beverage" applies to coffee, juice bars, breweries, and soda brands alike. A café and a juice bar both yield `product-nature=beverage` + `channel=physical` + `fulfillment=dine-in/takeaway`. The engine then **composes** the business type ("Cafe", "Juice Bar") from the primitive combination — no coffee-specific or juice-specific code exists.

## Data Model: `BusinessKnowledge`

The output of `understandBusiness(prompt)` is a `BusinessKnowledge` object (defined in `src/orchestration/business-intelligence/types.ts`) containing:

### 1. Discovery (What the business is)
- `intent` — one-line summary
- `businessType` — composed label, e.g. "Specialty Coffee Cafe" (primitives + user's domain noun)
- `industry` — broad category from primitives (`food-and-beverage`, `retail`, `services`, `software`, `media`, `nonprofit`, `general`)
- `subIndustry` — shape slug (`cafe`, `roastery`, `clinic`, `saas`, …)
- `niche` — refinement (`wholesale`, `subscription`, `marketplace`, `enterprise`)
- `domain` — conceptual domain (`beverages`, `food`, `professional-services`, …)
- `signals[]` — raw primitive signals with provenance

### 2. People
- `customerPersonas[]` — derived from audience + goals
- `businessPersonas[]` — owner, admin, staff
- `userRoles[]` — public, authenticated, member, staff, admin

### 3. Flow
- `customerJourney.stages[]` — awareness → advocacy with workflows + emotional targets
- `workflows[]` — customer-facing + operational (browse, cart-checkout, booking, subscription, content-publishing, lead, auth, fulfilment, inventory, scheduling, moderation)

### 4. Money
- `revenue` — model, pricing, payment flow, currency (derived from monetization + locale)

### 5. Growth
- `acquisition[]` — SEO, social, marketplace, paid-ads, referral, email
- `retention` — subscription, community, email-nurture, loyalty

### 6. Guardrails
- `compliance[]` — FSSAI (food/bev + IN), GDPR (EU), PCI-DSS (payments), HIPAA (health signals), SOC2 (internal/B2B), accessibility (always)
- `kpis[]` — conversion, orders, bookings, engagement, active-members…

### 7. Data Model
- `entities[]` — User, Product/Service/Content/Booking, Order, Cart, Payment, Review, Category, Session (derived from workflows)
- `relationships[]` — User→Order, Order→Product, Category→Product, etc.

### 8. Surfaces
- `pages[]` — home, about, catalog/menu/services, cart/checkout or booking, contact, blog, login, pricing, dashboards
- `dashboards[]` — operations, bookings, growth, content

### 9. Ops
- `automations[]` — order-confirm, abandoned-cart, booking-reminder, review-request, content-publish, restock-alert
- `integrations[]` — payments, email, analytics, auth, crm, storage, search

### 9. Language + Strategy
- `vocabulary.terms` — generic→domain mapping (product→"menu item" for beverage, "service" for service, "article" for content)
- `vocabulary.domainNouns` — the user's own words from the prompt (never our templates)
- `contentStrategy` — pillars, formats, cadence, voice
- `designStrategy` — direction, density, emphasis
- `experienceGoals` — emotional arc, density, motion language, per-stage feelings

## Pipeline Integration

1. **`buildBREContext(prompt)`** (intake-parser) calls `understandBusiness(prompt)` and attaches `businessKnowledge` to the returned `BREContext`. Legacy fields (`industry`, `capabilities`, `journeys`, `entities`, …) are **preserved unchanged** for compatibility.

2. **`runBuildPipeline`** (build-pipeline) forwards `businessKnowledge` into:
   - `RenderContext` — renderer can read vocabulary, capabilities, pages, dashboards
   - `PipelineResult` — downstream consumers / lineage

3. **Downstream layers** (Design Intelligence, Experience Intelligence, Component Spec Writer, Renderer) progressively migrate to read from `BusinessKnowledge` instead of inferring from legacy `industry`/`capabilities` fields. The migration is incremental and non-breaking.

## Extensibility

Future knowledge sources plug into the same model via `KnowledgeSource`:
- OpenClaw Ultra Scraper (competitor sites, market data)
- Uploaded documents / screenshots / Figma
- APIs, databases, MCP tools
- Research agents

They all **feed the same `BusinessKnowledge` primitives** — no downstream layer knows the source.

## Files

| File | Role |
|------|------|
| `src/orchestration/business-intelligence/types.ts` | Canonical `BusinessKnowledge` + all sub-interfaces + `BREContextLike` |
| `src/orchestration/business-intelligence/dimensions.ts` | Primitive lexicons + `extractSignals` (normalized token matching) |
| `src/orchestration/business-intelligence/archetypes.ts` | Primitive-shape → label composition (`BASE_BY_PRODUCT_NATURE` fallback) |
| `src/orchestration/business-intelligence/engine.ts` | `BusinessIntelligenceEngine.understandBusiness()` — full derivation |
| `src/orchestration/business-intelligence/adapters.ts` | Legacy compatibility helpers (`toVocabulary`, `toCapabilities`, …) |
| `src/orchestration/business-intelligence/index.ts` | Public exports |
| `src/bos/reasoning/rules-engine.ts` | `BREContext.businessKnowledge?` added (optional) |
| `src/bos/intake-parser.ts` | `buildBREContext` attaches `businessKnowledge` |
| `src/generation/renderers/renderer.ts` | `RenderContext.businessKnowledge?` + `PipelineResult` |
| `src/generation/build-pipeline.ts` | `businessKnowledge` passed to renderer + surfaced in `PipelineResult` |
| `tests/business-intelligence.test.ts` | 9 vertical-agnostic tests |