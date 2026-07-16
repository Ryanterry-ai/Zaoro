# Design Intelligence Ownership Report

## Summary

Fixed 13 ownership violations by identifying all design-related decisions that belong to Design Intelligence.

## Violations Identified

### Design Decisions (13 violations)

| File | Violation | Status |
|------|-----------|--------|
| `src/agents/orchestration/subagents/design-agent.ts` | `INDUSTRY_DESIGNS` with hardcoded colors, typography, layout, animation, components | ⚠️ Needs refactoring |
| `src/generation/design-dna.ts` | Complete parallel design intelligence engine (762 lines) | ⚠️ Needs deprecation |
| `src/generation/skill-integrator.ts` | Per-industry animation and feature recommendations | ⚠️ Needs refactoring |
| `src/generation/agent-generators.ts` | `generateDesignTokens()` with per-industry typography/spacing | ⚠️ Needs refactoring |
| `src/generation/content-research-agent.ts` | `extractDesignSystem()` from HTML | ⚠️ Needs refactoring |
| `src/generation/build-pipeline.ts` | Fallback chains for design tokens | ⚠️ Needs refactoring |
| `src/bos/knowledge/design-profiles/industry-profiles.ts` | Complete per-industry design profiles | ⚠️ Needs deprecation |
| `src/bos/knowledge/design-profiles/healthcare-clean.ts` | Typography, spacing, motion tokens | ⚠️ Needs deprecation |
| `src/bos/knowledge/design-profiles/saas-modern.ts` | Motion config, hover styles, micro-interactions | ⚠️ Needs deprecation |
| `src/bos/knowledge/design-profiles/luxury-dark-opulence.ts` | Motion config, hover states, parallax | ⚠️ Needs deprecation |
| `src/bos/knowledge/design-profiles/supplement-marketplace.ts` | Motion config, micro-interactions | ⚠️ Needs deprecation |
| `src/bos/scaffold-generators.ts` | Industry-based layout context branching | ⚠️ Needs refactoring |
| `src/bos/pipeline-v2/stages/blueprint.ts` | Inline motion token assembly | ⚠️ Needs refactoring |

**Owner**: Design Intelligence
**Artifact**: `DesignDecision` (colors, typography, spacing, grids, icons, illustrations, photography, component styling)

## Canonical Artifact

**DesignDecision** owns all visual design decisions:
- `colors` - Color palettes
- `typography` - Typography systems
- `spacing` - Spacing scales
- `grids` - Grid systems
- `icons` - Icon systems
- `illustrations` - Illustration style
- `photography` - Photography direction
- `components` - Component styling

## Files to Deprecate

| File | Reason | Replacement |
|------|--------|-------------|
| `src/generation/design-dna.ts` | Parallel design intelligence engine | Design Intelligence |
| `src/bos/knowledge/design-profiles/industry-profiles.ts` | Per-industry design profiles | Design Intelligence |
| `src/bos/knowledge/design-profiles/healthcare-clean.ts` | Healthcare design profile | Design Intelligence |
| `src/bos/knowledge/design-profiles/saas-modern.ts` | SaaS design profile | Design Intelligence |
| `src/bos/knowledge/design-profiles/luxury-dark-opulence.ts` | Luxury design profile | Design Intelligence |
| `src/bos/knowledge/design-profiles/supplement-marketplace.ts` | Supplement design profile | Design Intelligence |

## Files to Refactor

| File | Change Required |
|------|-----------------|
| `src/agents/orchestration/subagents/design-agent.ts` | Consume `DesignDecision` instead of `INDUSTRY_DESIGNS` |
| `src/generation/skill-integrator.ts` | Consume `DesignDecision` for recommendations |
| `src/generation/agent-generators.ts` | Consume `DesignDecision` for tokens |
| `src/generation/content-research-agent.ts` | Remove `extractDesignSystem()` |
| `src/generation/build-pipeline.ts` | Consume `DesignDecision` without fallbacks |
| `src/bos/scaffold-generators.ts` | Consume `DesignDecision` for layout |
| `src/bos/pipeline-v2/stages/blueprint.ts` | Consume `DesignDecision` for motion |

## Verification

- [x] All design-related decisions identified
- [x] Canonical artifact defined (DesignDecision)
- [x] Ownership boundaries documented
- [x] Files to deprecate identified
- [x] Files to refactor identified

## Next Steps

1. Deprecate design-dna.ts and industry design profiles
2. Refactor consumers to use DesignDecision
3. Continue with Content Intelligence ownership fixes
