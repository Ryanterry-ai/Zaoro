---
name: Localize Assets
bucket: A
---

# Localize Assets Skill

## Purpose
Download and localize all external assets (images, fonts, videos) into the project. Deterministic (Bucket A) — no LLM.

## Usage
```
node tools/asset-downloader/index.cjs <crawl-graph.json> [design-tokens.json] --output ./projects/<name>/public
```

## Output
- `public/images/`, `public/fonts/`, `public/videos/` directories with downloaded files
- `public/asset-manifest.json` mapping original URLs to local paths, with `reviewRequired` flag per asset

### asset-manifest.json schema
```json
{
  "sourceUrl": "https://example.com",
  "generatedAt": "2026-06-28T12:00:00.000Z",
  "assets": [
    {
      "originalUrl": "https://example.com/logo.png",
      "localPath": "/assets/logo.png",
      "fileName": "logo.png",
      "type": "image",
      "reviewRequired": false
    }
  ]
}
```

- `reviewRequired: false` — source asset downloaded directly from client site (safe to deploy)
- `reviewRequired: true` — AI-generated image, no source available, or license unclear (requires client approval before publishing)

## Rules
- Downloads all referenced images, fonts, and videos
- Resolves redirects (up to 5 hops)
- Creates asset-manifest.json for reference mapping
- Skips data: URIs
- Deduplicates by URL

## Verification
After download, run the dependency-checker to confirm zero external URLs remain.
