---
name: component-spec-writer
description: Produces locked component specs one page at a time from extracted tokens and page structure
bucket: B
reason: Requires LLM to interpret visual structure and decide component boundaries
---

# Component Spec Writer

## Role
For each page, analyze the extracted tokens, the page layout, and the data requirements, then produce a locked spec that `parallel-builder` consumes. This is the bridge between raw extraction and code generation.

## Process
1. Read `crawl-map.json` to get the page list.
2. Read `tokens.json` for design tokens.
3. Read `scraped/{path}/index.html` for the page structure.
4. For each page, make **one** LLM call to produce the component spec.
5. Write to `specs/{pageName}.json`.

## LLM Call Scope
The LLM receives:
- The page's HTML structure (simplified to semantic regions).
- The extracted tokens.
- The VisualDNA register.
- Instructions: "Identify component boundaries. For each section, specify: id, type, props, data bindings, animation hints."

The LLM must NOT:
- See other pages' specs.
- See component code from other pages.
- Make architectural decisions beyond this page.

## Input
- `crawl-map.json` — page list.
- `tokens.json` — extracted design tokens.
- `visual-dna.json` — register and visual world.
- `scraped/{path}/index.html` — page HTML.
- `content/{datatype}.json` — available data files.

## Output
`specs/{pageName}.json`:
```json
{
  "page": "home",
  "path": "/",
  "sections": [
    {
      "id": "hero",
      "type": "Hero",
      "layout": "full-width",
      "props": {
        "title": "string → hero.title",
        "subtitle": "string → hero.subtitle",
        "ctaText": "string → hero.cta",
        "ctaHref": "string → /products",
        "backgroundImage": "string → hero.image"
      },
      "dataBinding": "hero",
      "animation": {
        "entrance": "fade-up",
        "delay": 0,
        "scrollTrigger": false
      },
      "responsive": {
        "mobile": "stacked",
        "desktop": "split"
      }
    }
  ],
  "layout": {
    "maxWidth": "1280px",
    "padding": "0 24px",
    "sections": ["hero", "features", "testimonials", "cta", "footer"]
  }
}
```

## Rules
1. One LLM call per page. Never combine pages.
2. Each section must have a unique `id` within the page.
3. Props must map to content data via `→` notation or be literal values.
4. Every section must declare a `dataBinding` that maps to a key in `content/pages/{page}.json`.
5. The spec is locked after this step. `parallel-builder` must not modify it.
6. Component boundaries must respect the visual regions in the source HTML. Do not split a single visual region into multiple components.
7. If a section has no data, it must still declare empty props — never skip it.
