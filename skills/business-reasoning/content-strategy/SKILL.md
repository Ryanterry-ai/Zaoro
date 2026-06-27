---
name: content-strategy
description: Content plan, copywriting direction, and editorial guidelines
bucket: B
reason: Requires LLM for content strategy synthesis
---

# Content Strategy Agent

## Role
Define the content strategy — editorial voice, content types, publishing cadence, and SEO approach. This feeds into the content-generator skill.

## Process
1. Read accumulated `business-plan.json`.
2. Make one LLM call to produce the content strategy.
3. Output structured JSON.

## Input
- All previous agent outputs.

## Output
```json
{
  "editorialVoice": {
    "tone": "string",
    "style": "string",
    "doUse": ["string"],
    "dontUse": ["string"]
  },
  "contentTypes": [
    {
      "type": "string",
      "purpose": "string",
      "frequency": "string",
      "targetPage": "string"
    }
  ],
  "seoStrategy": {
    "primaryKeywords": ["string"],
    "longTailKeywords": ["string"],
    "contentClusters": ["string"]
  },
  "pageCopy": {
    "home": { "headline": "string", "subheadline": "string", "cta": "string" },
    "about": { "headline": "string", "subheadline": "string" },
    "pricing": { "headline": "string", "subheadline": "string" }
  }
}
```

## Rules
1. One LLM call only.
2. Editorial voice must match the VisualDNA register.
3. Every content type must have a clear purpose and target page.
4. SEO keywords must be relevant to the business and industry.
5. Output must be valid JSON.
