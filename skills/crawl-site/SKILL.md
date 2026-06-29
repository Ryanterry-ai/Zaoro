---
name: Crawl Site
bucket: A
---

# Crawl Site Skill

## Purpose
Discover a website's page graph. Deterministic (Bucket A) — no LLM.

## Usage
```
node tools/crawler/index.cjs <url> --depth 3 --output ./docs/research
```

## Output
`docs/research/crawl-graph.json` with structure:
```json
{
  "rootUrl": "https://example.com",
  "crawledAt": "ISO date",
  "totalPages": 42,
  "pages": [
    {
      "url": "https://example.com/about",
      "status": 200,
      "depth": 1,
      "links": ["..."],
      "title": "About Us",
      "contentType": "text/html"
    }
  ]
}
```

## Configuration
- `--depth N`: Max crawl depth (default: 3)
- `--delay MS`: Delay between requests (default: 500ms)
- `--output DIR`: Output directory

## Rules
- Respects robots.txt disallow rules
- Rate limits with configurable delay
- Deduplicates URLs (strips query params and fragments)
- Only follows same-origin links
