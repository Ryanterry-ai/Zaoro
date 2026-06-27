---
name: localize-assets
description: Downloads and localizes all images, icons, and media from the source site — wraps asset-downloader
bucket: A
reason: Deterministic download and rename; no LLM
---

# Localize Assets

## Role
Download every image, icon, font, and media asset referenced by the crawled pages. Rename them to stable, project-relative paths. Update all HTML/CSS references to point to the local copies.

## Process
1. Read `crawl-map.json` and all `scraped/*/index.html` files.
2. Extract all `src`, `href`, `srcset`, `background-image` references.
3. Filter to media assets (images, fonts, SVGs, videos). Skip scripts and third-party trackers.
4. Download each asset to `assets/` with a deterministic name: `{type}/{hash}.{ext}`.
5. Generate `asset-manifest.json` mapping original URLs to local paths.
6. Rewrite references in scraped HTML to use local paths.

## Input
- `crawl-map.json` — page list.
- `scraped/` — raw HTML files.
- `tokens.json` — for font file references.

## Output
- `assets/images/` — downloaded images.
- `assets/fonts/` — downloaded font files.
- `assets/icons/` — SVG icons.
- `assets/media/` — videos, audio.
- `asset-manifest.json`:
```json
{
  "assets": [
    {
      "originalUrl": "https://example.com/images/hero.jpg",
      "localPath": "assets/images/a1b2c3d4.jpg",
      "type": "image",
      "width": 1920,
      "height": 1080,
      "size": 245000,
      "format": "jpeg"
    }
  ],
  "fonts": [
    {
      "originalUrl": "https://fonts.gstatic.com/inter.woff2",
      "localPath": "assets/fonts/inter-400.woff2",
      "family": "Inter",
      "weight": 400
    }
  ],
  "totalSize": 1500000,
  "totalCount": 42
}
```

## Rules
1. Zero LLM calls. Pure download and rename.
2. Never download from CDNs that require authentication or paywalls.
3. Skip any asset larger than 10MB. Log a warning.
4. Skip tracking pixels, analytics scripts, and third-party ad resources.
5. Convert SVGs to project-owned copies. Strip any `<script>` tags from SVGs.
6. Font files must be subset if possible. Prefer woff2 over ttf/otf.
7. Every downloaded asset must be validated (correct magic bytes for its extension).
8. The asset manifest is the source of truth. Components reference `localPath`, never `originalUrl`.
