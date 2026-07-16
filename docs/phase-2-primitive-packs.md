# Phase 2: Primitive Pack Composer + Capability Graph

**Status:** Complete (typecheck clean, 15 new tests passing)

## What changed

### New files
| File | Purpose |
|------|---------|
| `src/bos/knowledge/primitive-packs/types.ts` | `PrimitivePack`, `ComposedKnowledgePack`, `CompositionContext` |
| `src/bos/knowledge/primitive-packs/industry.ts` | 13 Industry primitive packs (saas, ecommerce, healthcare, hospital, restaurant, realestate, luxury, education, logistics, manufacturing, enterprise-erp, hrm, crm) |
| `src/bos/knowledge/primitive-packs/registry-wrappers.ts` | Business Model, Experience, Compliance packs wrapping existing registry objects |
| `src/bos/knowledge/primitive-packs/design.ts` | Design packs from DESIGN_PROFILES with industry mapping |
| `src/bos/knowledge/primitive-packs/locale.ts` | 4 Locale packs (India, US, EU, Global) |
| `src/bos/knowledge/primitive-packs/technology.ts` | 4 Technology packs (react-web, nextjs, supabase, flutter-mobile) |
| `src/bos/knowledge/primitive-packs/content.ts` | 4 Content packs (standard, premium-brand, seo-heavy, clinical) |
| `src/bos/knowledge/primitive-packs/capability-graph.ts` | Indexes capabilities → primitive packs |
| `src/bos/knowledge/primitive-packs/composer.ts` | `composeKnowledgePack(ctx)`, `composeForCapabilities()`, `buildCapabilityGraph()` |
| `src/bos/knowledge/primitive-packs/resolver.ts` | Backward-compatible resolver: prefers monolithic pack, falls back to composed |
| `src/bos/knowledge/primitive-packs/index.ts` | Re-exports |
| `tests/primitive-pack-composer.test.ts` | 15 tests for composer + capability graph |

### Modified files
| File | Change |
|------|--------|
| `src/agents/deterministic-orchestrator-v4.ts` | Added `composeKnowledgePack` import + Phase 16d block: writes `knowledge-pack.json` artifact to `.build-artifacts/` (additive, no generation change) |

## Architecture

```
CompositionContext → [Industry] → [BM] → [Experience] → [Compliance]
                                  → [Design] → [Locale] → [Tech] → [Content]
                                            ↓
                                   ComposedKnowledgePack
```

**Dimension selection order** (later may override earlier vocabulary):
1. Industry → one pack from 13 industry primitives
2. Business Model → 0-N packs from registry wrappers
3. Experience → 0-N packs from registry wrappers
4. Compliance → 0-N packs from registry wrappers
5. Design → one pack from DESIGN_PROFILES mapping
6. Locale → one pack (India/US/EU/Global)
7. Technology → one pack (react-web/nextjs/supabase/flutter-mobile)
8. Content → one pack (standard/premium-brand/seo-heavy/clinical)

**Merge strategy:** Union of entities/roles/kpis/workflows/integrations/compliance (deduplicated). Vocabulary merged with later dimensions overriding on conflict. Copy and design merged via Object.assign.

## Backward compatibility

- **No existing code path changes.** The composer is an additive adapter.
- `resolveKnowledgePack(ctx, monolithic?)` prefers an existing monolithic `KnowledgePack` if one matches the build context; otherwise falls back to composed.
- Phase 16d writes `knowledge-pack.json` as an inspection artifact — it does not feed into the generator.
- All existing monolithic packs in `taxonomy/packs/` remain the source of truth for generation.

## Bugs fixed during development

- **Content fallback short-circuit:** The `standard` content pack's `appliesTo` always returned `true`, preventing `clinical` from ever being selected for healthcare. Fixed by removing the `return seed.id === 'standard'` branch (standard is now the fallback in `getContentPrimitivePack`).
- **TypeScript import paths:** `primitive-packs/` files used `../../taxonomy/types.js` (2 levels up) — corrected to `../../../taxonomy/types.js` (3 levels up).
- **Null narrowing:** `ctx.industry` possibly undefined in design.ts callbacks; added explicit null guard.

## How to use

```ts
import { composeKnowledgePack, CompositionContext } from '../bos/knowledge/primitive-packs/index.js';

const ctx: CompositionContext = {
  industry: 'restaurant',
  businessModels: ['direct-sales'],
  journeys: ['dine-in'],
  country: 'us',
  capabilities: [],
};

const pack = composeKnowledgePack(ctx);
// pack.entities: ['Restaurant', 'MenuItem', 'Order', ...]
// pack.vocabulary: { restaurant: 'Restaurant', ... }
// pack.copy.heroHeading: 'Build something people love'
```

## Rollback

Remove the `src/bos/knowledge/primitive-packs/` directory and the Phase 16d block in `deterministic-orchestrator-v4.ts`. No other files depend on this module at runtime.
