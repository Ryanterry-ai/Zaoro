# Business Intelligence Engine — Migration Plan

## Goal

Migrate all downstream layers to consume `BusinessKnowledge` (the single source of truth) while **preserving full backward compatibility** — no breaking changes to existing BRE, SAP, Design Intelligence, Content Resolver, or Renderer.

## Phase 0: Foundation (Complete)

- ✅ `BusinessKnowledge` model defined (`types.ts`)
- ✅ Primitive signal extraction (`dimensions.ts`) — normalized token matching, vertical-agnostic
- ✅ Shape composition + base fallback (`archetypes.ts`)
- ✅ Full `BusinessKnowledge` derivation (`engine.ts`)
- ✅ Compatibility adapters (`adapters.ts`)
- ✅ Wired into `BREContext` (optional `businessKnowledge`)
- ✅ Wired into `RenderContext` + `PipelineResult`
- ✅ 9 passing tests proving vertical-agnostic reasoning

## Phase 1: Read-Path Migration (Downstream Layers Opt-In)

Each layer adds a **guarded read** of `BusinessKnowledge` and falls back to legacy fields.

| Layer | Current Legacy Read | New Read (Guarded) | Status |
|-------|---------------------|-------------------|--------|
| Design Intelligence | `ctx.industry`, `ctx.capabilities` | `bk?.designStrategy`, `bk?.vocabulary`, `bk?.discovery.businessType` | Next |
| Experience Intelligence | `ctx.industry`, `ctx.designDecision` | `bk?.experienceGoals`, `bk?.discovery` | Next |
| Content Resolver | `ctx.industry`, `ctx.entities` | `bk?.contentStrategy`, `bk?.entities`, `bk?.vocabulary` | Planned |
| Component Spec Writer | `ctx.industry`, `ctx.capabilities` | `bk?.workflows`, `bk?.pages`, `bk?.entities` | Planned |
| Renderer (React) | `ctx.theme`, `ctx.designDecision`, `ctx.experienceBlueprint` | `bk?.vocabulary`, `bk?.pages`, `bk?.designStrategy` | Planned |
| SAP / Blueprint Generator | `ctx.industry`, `ctx.entities` | `bk?.entities`, `bk?.relationships`, `bk?.revenue` | Planned |

**Pattern:**
```ts
const bk = ctx.businessKnowledge;
const industry = bk?.discovery.industry ?? ctx.industry; // fallback
const vocab = bk?.vocabulary.terms ?? {};
```

No layer **requires** `BusinessKnowledge`; all work without it.

## Phase 2: Write-Path Enrichment

Once reads are stable, upstream producers enrich `BusinessKnowledge` from real sources:

| Source | Integration Point | Primitives Fed |
|--------|-------------------|----------------|
| OpenClaw Ultra Scraper | Knowledge Acquisition Engine | `vocabulary.domainNouns`, `entities.realProducts`, `realTestimonials`, `layoutPatterns`, `referenceUrls` |
| User uploads (docs, screenshots) | same | extracted primitives |
| Figma / design tokens | same | `designStrategy`, `vocabulary.terms` |
| APIs / databases | same | `entities.realProducts`, `revenue.pricing`, `integrations` |
| Research agents | same | `acquisition.channels`, `compliance`, `kpis` |

Each source appends to `BusinessKnowledge.sources[]` with provenance. No downstream layer knows the origin.

## Phase 3: Legacy Field Deprecation (Soft)

Once ≥80% of reads use `BusinessKnowledge`:
- Add deprecation warnings to legacy fields (`industry`, `capabilities`, `journeys`, `entities` in `BREContext`)
- Provide automated migration codemods
- After 2 minor releases, remove legacy fields from `BREContext` (major version)

## Phase 4: Full Authority

`BusinessKnowledge` becomes the **only** business authority. Legacy fields removed. Pipeline contracts updated.

## Compatibility Guarantees

| Guarantee | Mechanism |
|-----------|-----------|
| No breaking changes | All new fields are optional; legacy fields untouched |
| Tests pass | Existing `pipeline-smoke`, `experience-intelligence-e2e`, `bre-v2` suites unchanged |
| TypeScript compiles | New types are additive; no `any` widening |
| Zero runtime cost when unused | `businessKnowledge` is `undefined` unless `understandBusiness` runs (always in intake) |

## Rollout Checklist

- [x] Types + engine + adapters + wiring + tests
- [ ] Design Intelligence reads `bk?.designStrategy` + `bk?.vocabulary`
- [ ] Experience Intelligence reads `bk?.experienceGoals`
- [ ] Content Resolver reads `bk?.contentStrategy` + `bk?.entities`
- [ ] Component Spec Writer reads `bk?.workflows` + `bk?.pages`
- [ ] Renderer reads `bk?.vocabulary` + `bk?.pages` + `bk?.designStrategy`
- [ ] SAP reads `bk?.entities` + `bk?.revenue`
- [ ] OpenClaw Ultra Scraper feeds `bk.sources`
- [ ] Deprecation warnings + codemods
- [ ] Legacy field removal (major version)

## Rollback

If any migration causes regressions:
1. Guarded reads automatically fall back to legacy fields
2. `businessKnowledge` can be disabled by not calling `understandBusiness` in `buildBREContext` (one-line toggle)
3. No data model changes to legacy types