---
name: Parallel Builder
bucket: B
---

# Parallel Builder Skill

## Purpose
Write code for ONE component from ONE locked spec. LLM-required (Bucket B) — ONE invocation per component.

## Input
- One component spec (from component-spec-writer or website-architect)
- Page's design tokens
- Framework/stack configuration

## Output
Component file at the correct path:
- Next.js: `src/components/<ComponentName>.tsx`
- Astro: `src/components/<ComponentName>.astro`
- Plain: `components/<ComponentName>.html`

## Rules
- **ONE component per invocation** — never build multiple components in one call
- The call must receive ONLY that component's spec, not other components' specs
- All content must come from the structured content files (content/*.json), not inline strings
- Component must import content from `@/content/<page>.json` or equivalent
- Must match the design tokens exactly (colors, spacing, fonts from tokens)
- Must handle responsive behavior as specified
- Must include proper TypeScript types
- Use the model adapter layer for the LLM call

## Code Quality
- Follow the framework's conventions
- Use existing component patterns from the template
- No external dependencies beyond what's in package.json
- No hardcoded URLs or external asset references
