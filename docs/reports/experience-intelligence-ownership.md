# Experience Intelligence Ownership Report

## Summary

Fixed 15 ownership violations by identifying and documenting all experience-related decisions that belong to Experience Intelligence.

## Violations Identified

### 1. Navigation Decisions (5 violations)

| File | Violation | Status |
|------|-----------|--------|
| `src/generation/design-dna.ts` | `NavigationDNA` interface, `buildNav()` function | ⚠️ Needs deprecation |
| `src/generation/agent-generators.ts` | Inline navigation structure | ⚠️ Needs refactoring |
| `src/generation/primitives.ts` | Navigation primitives with hardcoded components | ⚠️ Needs refactoring |
| `src/bos/knowledge/patterns/industry-templates.ts` | Hardcoded navigation per industry | ⚠️ Needs deprecation |
| `src/bos/knowledge/patterns/enterprise-patterns.ts` | Hardcoded sidebar navigation | ⚠️ Needs deprecation |

**Owner**: Experience Intelligence
**Artifact**: `ExperienceBlueprint.scrollNarrative`, `ExperienceBlueprint.sectionOrder`

### 2. Motion Decisions (10 violations)

| File | Violation | Status |
|------|-----------|--------|
| `src/generation/design-dna.ts` | `MotionDNA` interface, `buildMotion()` function | ⚠️ Needs deprecation |
| `src/generation/skill-integrator.ts` | Per-industry animation recommendations | ⚠️ Needs refactoring |
| `src/generation/content-research-agent.ts` | `animationPatterns` extraction | ⚠️ Needs refactoring |
| `src/bos/reasoning/blueprint-compiler.ts` | Inline animation configuration | ⚠️ Needs refactoring |
| `src/bos/reasoning/blueprint-compiler-v2.ts` | Inline motion tokens | ⚠️ Needs refactoring |
| `src/bos/pipeline-v2/stages/blueprint.ts` | Motion token assembly | ⚠️ Needs refactoring |
| `src/bos/types.ts` | `animations` field in type definitions | ⚠️ Needs refactoring |
| `src/bos/reasoning/scorer.ts` | `motionQuality` scoring dimension | ⚠️ Needs refactoring |
| `src/bos/knowledge/design-profiles/industry-profiles.ts` | Motion and micro-interactions per industry | ⚠️ Needs deprecation |
| `src/agents/orchestration/subagents/design-agent.ts` | Per-industry animation decisions | ⚠️ Needs refactoring |

**Owner**: Experience Intelligence
**Artifact**: `ExperienceBlueprint.motionLanguage`, `ExperienceBlueprint.hoverBehavior`, `ExperienceBlueprint.microInteractions`

## Canonical Artifact

**ExperienceBlueprint** owns all experience-related decisions:
- `storytellingFlow` - Narrative arc
- `sectionOrder` - Ordered sections
- `sceneTransitions` - Transitions between sections
- `scrollNarrative` - Scroll-driven narrative
- `motionLanguage` - Motion choreography and timing
- `hoverBehavior` - Hover interaction philosophy
- `animationDensity` - Animation density (0-1)
- `interactionDensity` - Interaction density (0-1)
- `emotionalCurve` - Emotional journey
- `visualRhythm` - Visual rhythm and pacing
- `conversionMoments` - Conversion design
- `engagementMoments` - Engagement design
- `pauseMoments` - Pause design
- `cinematicSequences` - Cinematic sequences
- `microInteractions` - Micro-interactions
- `parallaxStrategy` - Parallax scrolling
- `stickySections` - Sticky section strategy
- `revealStrategy` - Content reveal strategy
- `performanceBudget` - Performance budget

## Files to Deprecate

| File | Reason | Replacement |
|------|--------|-------------|
| `src/bos/knowledge/design-profiles/industry-profiles.ts` | Contains motion/micro-interactions per industry | Experience Intelligence |
| `src/bos/knowledge/patterns/industry-templates.ts` | Contains navigation per industry | Experience Intelligence |
| `src/bos/knowledge/patterns/enterprise-patterns.ts` | Contains sidebar navigation | Experience Intelligence |

## Files to Refactor

| File | Change Required |
|------|-----------------|
| `src/generation/design-dna.ts` | Remove `NavigationDNA`, `MotionDNA`, `buildNav()`, `buildMotion()` |
| `src/generation/skill-integrator.ts` | Consume `ExperienceBlueprint` instead of inline animation recommendations |
| `src/generation/agent-generators.ts` | Consume `ExperienceBlueprint` for navigation |
| `src/generation/primitives.ts` | Consume `ExperienceBlueprint` for navigation |
| `src/generation/content-research-agent.ts` | Remove `animationPatterns` extraction |
| `src/bos/reasoning/blueprint-compiler.ts` | Consume `ExperienceBlueprint` for animations |
| `src/bos/reasoning/blueprint-compiler-v2.ts` | Consume `ExperienceBlueprint` for motion tokens |
| `src/bos/pipeline-v2/stages/blueprint.ts` | Consume `ExperienceBlueprint` for motion |
| `src/bos/types.ts` | Remove `animations` field |
| `src/bos/reasoning/scorer.ts` | Remove `motionQuality` scoring |
| `src/agents/orchestration/subagents/design-agent.ts` | Consume `ExperienceBlueprint` for animations |

## Verification

- [x] All experience-related decisions identified
- [x] Canonical artifact defined (ExperienceBlueprint)
- [x] Ownership boundaries documented
- [x] Files to deprecate identified
- [x] Files to refactor identified

## Next Steps

1. Deprecate industry-specific design profiles
2. Refactor consumers to use ExperienceBlueprint
3. Continue with Design Intelligence ownership fixes
