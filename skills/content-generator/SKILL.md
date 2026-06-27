---
name: content-generator
description: Generates real page copy from structured briefs — one LLM call per page
bucket: B
reason: Requires LLM for creative writing; scoped to one page per call
---

# Content Generator

## Role
Produce real, publication-ready copy for each page. Each page gets exactly one LLM call with a structured brief. The output is a JSON file in `content/` that components consume via their `dataBinding`.

## Process
1. Read `component-manifest.json` to get the section list for each page.
2. Read `visual-dna.json` for tone/register context.
3. For each page, construct a structured brief from the section specs.
4. Make **one** LLM call per page.
5. Validate the output against the content schema.
6. Write to `content/pages/{pageName}.json`.

## Structured Brief Format
```json
{
  "page": "home",
  "register": "PREMIUM",
  "sections": [
    {
      "id": "hero",
      "type": "Hero",
      "props": { "title": "string", "subtitle": "string" },
      "wordCount": { "title": "3-8 words", "subtitle": "10-20 words" }
    },
    {
      "id": "features",
      "type": "Features",
      "props": { "heading": "string", "items": "array" },
      "wordCount": { "heading": "3-8 words", "itemTitle": "3-6 words", "itemDescription": "15-30 words" }
    }
  ],
  "instructions": "Write conversion-focused copy for a SaaS landing page. Use active voice. No jargon."
}
```

## Input
- `component-manifest.json` — section structure per page.
- `visual-dna.json` — register for tone guidance.
- `content/brief.json` (optional) — user-provided copy instructions.

## Output
`content/pages/{pageName}.json`:
```json
{
  "hero": {
    "title": "Ship faster with Build Engine",
    "subtitle": "The dual-mode system that clones or generates production websites in minutes.",
    "cta": "Get Started"
  },
  "features": {
    "heading": "Built for speed",
    "items": [
      { "title": "Clone any site", "description": "Extract design, structure, and content from any URL." }
    ]
  }
}
```

## Rules
1. One LLM call per page. Never combine pages.
2. Copy must match the register. PREMIUM uses concise, elevated language. ENERGETIC uses punchy, action-oriented language.
3. All text must be real copy. No lorem ipsum, no placeholders, no "coming soon."
4. Word count constraints in the brief are hard limits.
5. CTA text must be 2-4 words.
6. Headlines must be 3-8 words. No exceptions.
7. If the brief conflicts with the register, the register wins.
8. Content must be inclusive and accessible. No idioms, no culturally specific references.
