---
name: Component Spec Writer
bucket: B
---

# Component Spec Writer Skill

## Purpose
Decide component boundaries and write structured specs per component. LLM-required (Bucket B) — ONE call per page.

## Input
- Page's design tokens (from token-extractor)
- Page's DOM inventory (from token-extractor)
- Page URL and title

## Output
`docs/research/component-specs/<page-name>.json`:
```json
{
  "page": "Homepage",
  "url": "/",
  "components": [
    {
      "name": "Hero",
      "type": "section",
      "props": [
        { "name": "title", "type": "string", "required": true },
        { "name": "subtitle", "type": "string", "required": false },
        { "name": "ctaText", "type": "string", "required": true },
        { "name": "ctaLink", "type": "string", "required": true },
        { "name": "backgroundImage", "type": "string", "required": false }
      ],
      "contentSlots": ["title", "subtitle", "cta"],
      "responsive": {
        "mobile": "stacked layout",
        "desktop": "two-column with image"
      }
    }
  ]
}
```

## Rules
- ONE LLM call per page (never combine pages)
- Input must include only that page's tokens and DOM inventory
- Output must be valid JSON matching the schema above
- Each component must have clear, non-overlapping responsibilities
- Use the model adapter layer for the LLM call
