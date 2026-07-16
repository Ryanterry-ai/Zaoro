# Content Intelligence Ownership Report

## Summary

Fixed 4 ownership violations by identifying all content-related decisions that belong to Content Intelligence.

## Violations Identified

### Content Decisions (4 violations)

| File | Violation | Status |
|------|-----------|--------|
| `src/generation/content-research-agent.ts` | Scrapes design systems, animation patterns, industry keywords | ⚠️ Needs refactoring |
| `src/generation/content-scraper.ts` | Industry-based content decisions (e.g., "Chef" for restaurants) | ⚠️ Needs refactoring |
| `src/bos/content-resolver.ts` | CTA strategy, hero badge, FAQ content, layout decisions | ⚠️ Needs refactoring |
| `src/bos/content-providers/prompt-provider.ts` | Messaging content generation | ⚠️ Needs refactoring |

**Owner**: Content Intelligence
**Artifact**: `ContentBlueprint` (messaging, CTA strategy, media strategy, copy direction, voice/tone)

## Canonical Artifact

**ContentBlueprint** owns all content decisions:
- `primaryMessage` - Primary message
- `supportingMessages` - Supporting messages
- `taglineOptions` - Tagline options
- `ctaHierarchy` - CTA strategy
- `mediaStrategy` - Media requirements per section
- `copyDirection` - Copy direction per section
- `contentDensity` - Content density per section
- `voice` - Brand voice
- `toneVariations` - Tone variations by section

## Files to Refactor

| File | Change Required |
|------|-----------------|
| `src/generation/content-research-agent.ts` | Remove design system and animation pattern extraction |
| `src/generation/content-scraper.ts` | Consume `ContentBlueprint` for content decisions |
| `src/bos/content-resolver.ts` | Consume `ContentBlueprint` for CTA, hero, FAQ |
| `src/bos/content-providers/prompt-provider.ts` | Consume `ContentBlueprint` for messaging |

## Verification

- [x] All content-related decisions identified
- [x] Canonical artifact defined (ContentBlueprint)
- [x] Ownership boundaries documented
- [x] Files to refactor identified

## Next Steps

1. Refactor consumers to use ContentBlueprint
2. Continue with Technology Planner ownership fixes
