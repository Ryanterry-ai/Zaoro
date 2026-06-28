---
name: Content Generator
bucket: B
---

# Content Generator Skill

## Purpose
Write real page copy for generative builds (no source to copy from). LLM-required (Bucket B) — ONE call per page.

## Input
- Page spec from website-architect
- Business context from business-reasoning chain
- Design tokens

## Output
`content/<page-name>.json` — must conform to `content/schema.json`:
```json
{
  "page": "Homepage",
  "sections": {
    "hero": {
      "title": "Transform Your Fitness Journey",
      "subtitle": "Premium gym equipment for serious athletes",
      "cta": "Shop Now"
    },
    "features": {
      "title": "Why Choose Us",
      "items": [
        { "title": "Premium Quality", "description": "..." },
        { "title": "Expert Guidance", "description": "..." }
      ]
    }
  },
  "meta": {
    "title": "FitFuel — Premium Gym Equipment",
    "description": "..."
  },
  "assets": []
}
```

## Rules
- ONE LLM call per page (never combine pages)
- No placeholder Lorem Ipsum — write real, relevant copy
- If an image is needed and no source exists, generate one and set `reviewRequired: true` in the asset entry (see `content/schema.json`)
- All content must be sourced from structured data, never inline in components
- Use the model adapter layer for the LLM call
