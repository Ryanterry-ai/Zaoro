---
name: deploy-target-selector
description: Lookup table that selects deployment tier from budget and platform requirements
bucket: A
reason: Pure deterministic lookup; no LLM
---

# Deploy Target Selector

## Role
Read the project requirements (budget, platform, feature complexity) and select the appropriate deployment tier from a fixed lookup table.

## Process
1. Read `project-config.json` for budget, platform preferences, and feature flags.
2. Look up the tier in the mapping table.
3. Write `deploy-target.json`.

## Tier Mapping

| Budget | Platform | Feature Complexity | Tier |
|---|---|---|---|
| <$50/mo | Static | Basic (5 pages, no auth) | `tier-static` |
| $50-200/mo | Static or VPS | Standard (10 pages, basic auth, forms) | `tier-standard` |
| $200-500/mo | VPS or Cloud | Full (20+ pages, auth, payments, real-time) | `tier-fullstack` |
| $500+/o | Cloud | Enterprise (SSO, multi-tenant, analytics) | `tier-fullstack` |

## Tier Definitions

### tier-static
- **Host**: Vercel, Netlify, Cloudflare Pages
- **Runtime**: None (static export)
- **Backend**: Serverless functions only
- **Database**: None or client-side (localStorage, IndexedDB)
- **Auth**: None or third-party (Auth0, Clerk)
- **Cost**: $0-20/mo

### tier-standard
- **Host**: Vercel, Railway, Render
- **Runtime**: Node.js serverless or lightweight VPS
- **Backend**: API routes or Express
- **Database**: SQLite or managed Postgres (Neon, Supabase free tier)
- **Auth**: NextAuth, Clerk, or Supabase Auth
- **Cost**: $50-150/mo

### tier-fullstack
- **Host**: AWS, GCP, Azure, or Vercel Pro
- **Runtime**: Containerized or serverless
- **Backend**: Full API with background jobs
- **Database**: Managed Postgres, Redis, S3
- **Auth**: Custom or enterprise SSO
- **Cost**: $200-500/mo

## Input
- `project-config.json` with:
  - `budget`: number (monthly USD)
  - `platform`: string (preferred host)
  - `features`: string[] (feature flags)

## Output
`deploy-target.json`:
```json
{
  "tier": "tier-standard",
  "host": "vercel",
  "database": "neon-postgres",
  "auth": "next-auth",
  "estimatedCost": "$80/mo",
  "templateDir": "templates/tier-standard"
}
```

## Rules
1. Zero LLM calls. Pure table lookup.
2. If budget is not specified, default to `tier-standard`.
3. If features include payments or real-time, minimum tier is `tier-standard`.
4. If features include SSO or multi-tenant, minimum tier is `tier-fullstack`.
5. The tier selection determines which project template is scaffolded downstream.
