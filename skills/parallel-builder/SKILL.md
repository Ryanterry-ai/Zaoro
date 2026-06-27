---
name: parallel-builder
description: Generates ONE component per invocation from a locked spec — never sees other components' code
bucket: B
reason: Requires LLM for code generation; isolated to enforce single-component focus
---

# Parallel Builder

## Role
Take a single locked component spec, the design tokens, the data binding, and the animation spec, then generate one complete React component file. Each invocation is fully isolated — it never sees code from other components.

## Process
1. Receive a single section spec from the ComponentManifest.
2. Receive the VisualDNA tokens and the data file for this section.
3. Receive the animation spec (if any) for this section.
4. Generate the component file using the assigned library.
5. Write to `src/components/{library}/{ComponentName}.tsx`.
6. Write the co-located CSS module or Tailwind classes.

## Input (per invocation)
```json
{
  "section": {
    "id": "hero",
    "type": "Hero",
    "component": "HeroParallax",
    "library": "magicui",
    "importPath": "@/components/magicui/hero-parallax",
    "props": { "title": "string", "subtitle": "string" },
    "dataBinding": "heroContent"
  },
  "tokens": { "/* VisualDNA */" },
  "data": { "/* content/hero.json */" },
  "animation": {
    "entrance": "fade-up",
    "stagger": 100,
    "scrollTrigger": true
  }
}
```

## Output
- `src/components/magicui/hero-parallax.tsx` — complete, working component.
- `src/components/magicui/hero-parallax.module.css` — co-located styles (if not pure Tailwind).

## Component Generation Rules
1. **One component per call.** The prompt must not reference any other component's code or imports.
2. Use only the library specified in `section.library`. Do not import from other libraries.
3. All text content comes from the `data` parameter, never hardcoded.
4. All colors, fonts, spacing come from `tokens`, never hardcoded.
5. Component must be a named export matching `section.component`.
6. Component must accept props matching `section.props` exactly.
7. Use TypeScript with explicit prop types. No `any`.
8. Animation must use the library's built-in animation primitives, not raw CSS animations.
9. Component must be self-contained. No side effects beyond what the library requires.
10. Component must render without errors in isolation.

## Error Handling
- If the spec is invalid, log the error and skip. Do not generate a partial component.
- If the library import fails, fall back to a plain div with Tailwind classes matching the spec.
- Never generate placeholder or "coming soon" components.
