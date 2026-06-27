---
name: crawl-site
description: URL graph discovery for the clone pipeline — wraps the crawler tool
bucket: A
reason: Deterministic crawling; wraps tools/crawler with no LLM
---

# Crawl Site

## Role
Discover the full URL graph of a target website. Map internal links, identify page types, and output a structured crawl map that downstream skills consume.

## Process
1. Receive the target URL from the orchestrator.
2. Invoke `tools/crawler` with the URL and depth limit.
3. Classify each discovered URL by page type (home, product, category, about, contact, blog, etc.).
4. Deduplicate URLs (ignore query params, fragments, trailing slashes).
5. Write `crawl-map.json`.

## Input
- `targetUrl`: the root URL to crawl.
- `depth`: maximum link depth (default: 3).
- `maxPages`: maximum pages to discover (default: 50).
- `excludePatterns`: URL patterns to skip (e.g., `/admin/*`, `*.pdf`).

## Output
`crawl-map.json`:
```json
{
  "rootUrl": "https://example.com",
  "crawledAt": "2025-01-01T00:00:00Z",
  "pages": [
    {
      "url": "https://example.com",
      "path": "/",
      "type": "home",
      "title": "Example Company",
      "depth": 0,
      "linksTo": ["/products", "/about", "/contact"]
    },
    {
      "url": "https://example.com/products",
      "path": "/products",
      "type": "product-listing",
      "title": "Products",
      "depth": 1,
      "linksTo": ["/products/widget-a", "/products/widget-b"]
    }
  ],
  "pageTypes": {
    "home": 1,
    "product-listing": 1,
    "product-detail": 2,
    "about": 1,
    "contact": 1
  }
}
```

## Rules
1. Zero LLM calls. URL classification is deterministic (keyword matching on path/title).
2. Never crawl pages behind authentication, paywalls, or robots.txt disallows.
3. Respect crawl delay. Minimum 100ms between requests.
4. Store raw HTML in `scraped/{path}/index.html` for downstream extraction.
5. If the crawler fails on a page, log it and continue. Do not halt the entire crawl.
6. The crawl map is the source of truth for which pages get built. If a page is not in the map, it does not exist.
