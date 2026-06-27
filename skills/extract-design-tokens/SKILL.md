---
name: extract-design-tokens
description: Headless browser CSS extraction from crawled pages — wraps token-extractor tool
bucket: A
reason: Deterministic extraction via headless browser; no LLM
---

# Extract Design Tokens

## Role
Launch a headless browser against each crawled page, compute styles on the rendered DOM, and extract design tokens (colors, fonts, spacing, shadows, borders, breakpoints).

## Process
1. Read `crawl-map.json` for the page list.
2. For each page, load the HTML in a headless browser.
3. Run `tools/token-extractor` to compute styles on key elements (headings, body text, buttons, cards, nav, footer).
4. Aggregate tokens across all pages into a unified token set.
5. Write `tokens.json`.

## Input
- `crawl-map.json` — list of pages with local HTML paths.
- `scraped/` — raw HTML files from the crawler.

## Output
`tokens.json`:
```json
{
  "colors": {
    "primary": "#1a1a2e",
    "secondary": "#16213e",
    "accent": "#e94560",
    "background": "#ffffff",
    "surface": "#f8f9fa",
    "text": "#212529",
    "muted": "#6c757d",
    "all": ["#1a1a2e", "#16213e", "#e94560", "#ffffff", "#f8f9fa", "#212529", "#6c757d"]
  },
  "fonts": {
    "heading": { "family": "Inter", "weights": [400, 600, 700], "source": "google-fonts" },
    "body": { "family": "Inter", "weights": [400, 500], "source": "google-fonts" },
    "mono": { "family": "JetBrains Mono", "weights": [400], "source": "google-fonts" }
  },
  "spacing": {
    "unit": 4,
    "values": [4, 8, 12, 16, 24, 32, 48, 64, 96]
  },
  "radii": [0, 4, 8, 12, 16, 9999],
  "shadows": ["none", "0 1px 3px rgba(0,0,0,0.1)", "0 4px 6px rgba(0,0,0,0.1)"],
  "breakpoints": { "sm": 640, "md": 768, "lg": 1024, "xl": 1280 }
}
```

## Rules
1. Zero LLM calls. Pure browser automation.
2. Extract from the rendered DOM, not the stylesheet source. This captures computed values and media query breakpoints.
3. Deduplicate colors by hex value. Sort by frequency of use.
4. For fonts, check both CSS `font-family` declarations and `@font-face` rules.
5. If a font is not on Google Fonts, mark `source: "custom"` and log a warning.
6. The token extractor must handle SPA-rendered content (wait for network idle).
7. Store per-page token snapshots in `scraped/{path}/tokens.json` for debugging.
