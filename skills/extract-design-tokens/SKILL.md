---
name: Extract Design Tokens
bucket: A
---

# Extract Design Tokens Skill

## Purpose
Extract computed styles, color palette, type scale, spacing, breakpoints, and component inventory from a site. Deterministic (Bucket A) — no LLM.

## Usage
```
node tools/token-extractor/index.js <crawl-graph.json> --output ./docs/research
```

## Output
`docs/research/design-tokens.json` with structure:
```json
{
  "rootUrl": "https://example.com",
  "extractedAt": "ISO date",
  "pagesAnalyzed": 10,
  "aggregated": {
    "colors": ["#1a1a2e", "rgb(255,255,255)", ...],
    "fonts": ["Inter", "Georgia", ...],
    "fontSizes": ["12px", "14px", "16px", ...],
    "spacings": ["4px", "8px", "16px", ...],
    "breakpoints": [640, 768, 1024, 1280],
    "componentTypes": ["header", "nav", "section", ...],
    "classNames": ["container", "btn-primary", ...]
  },
  "perPage": [...]
}
```

## Configuration
- `--output DIR`: Output directory
- `--browser ENGINE`: Browser engine (playwright/puppeteer)
