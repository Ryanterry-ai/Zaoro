---
name: industry-intelligence
description: Look up or seed the industry knowledge base. Cache-first: check knowledge-base/industries/{slug}.json before calling adapter. One KNOWLEDGE_BASE_SEED call only when industry is new; subsequent builds for same industry read the cached JSON (Bucket A lookup).
bucket: B
reason: One LLM call per NEW industry only; cached lookups are Bucket A
feeds_into: business-problems, compliance, integrations, reporting, dashboard-generator
consumes: business-research (industry, sub_industry fields)
---

# Industry Intelligence Agent

## Role

The encyclopedia. Produces the canonical structural model for an industry: org structure, departments, processes, roles, regulations, common software, KPIs, integrations, and canonical workflows.

## Process (Cache-First)

1. **Check cache**: Read `knowledge-base/industries/{industry-slug}.json`.
   - Slug = `industry.toLowerCase().replace(/[^a-z0-9]+/g, '-')`.
   - If file exists and is valid JSON → return it immediately (Bucket A lookup, zero LLM cost).
2. **Seed cache** (only if file is missing): Make ONE adapter call with taskType `structured-extraction`:
   - Input: `{industry, sub_industry}` from business-research.
   - Output: Full industry model (see schema below).
   - Write result to `knowledge-base/industries/{slug}.json`.
3. **All subsequent builds** for this industry read the cached file — no LLM call.

## LLM Call Specification (only on cache miss)

Exactly **one** call with taskType `structured-extraction` via the adapter.

### Input to LLM
```json
{
  "industry": "",
  "sub_industry": ""
}
```

### Output from LLM (JSON) — written to cache
```json
{
  "industry": "",
  "sub_industry": "",
  "departments": [
    {
      "name": "",
      "typical_roles": [""],
      "key_processes": [""],
      "common_software": [""],
      "kpis": [""]
    }
  ],
  "regulations": [""],
  "common_integrations": [""],
  "canonical_workflows": [
    {
      "name": "",
      "steps": [""],
      "cross_department": false
    }
  ],
  "typical_tech_stack": [""],
  "seasonality_notes": "",
  "competitive_dynamics": ""
}
```

## Rules
- The cache file is the source of truth once written.
- Never re-seed an existing cache file — if it exists, use it.
- If the adapter call fails, fall back to a minimal stub (empty departments, note "cache seed failed") so the pipeline doesn't block.
