---
name: revenue-model
description: Map revenue streams from structured facts via BRE v2 rules. No LLM call — deterministic output parameterized by business-research + industry model.
bucket: A
reason: Pure BRE v2 rule output; no LLM required
---

# Revenue Model Agent

## Role

Map every revenue stream and whether it's tracked. Deterministic BRE v2 rule output — no LLM call.

## Process (BRE v2 Rules)

1. Load the industry model's standard revenue streams from `knowledge-base/industries/{slug}.json`.
2. Match against business_model from business-research.
3. For each stream: type, whether currently tracked, growth lever, untapped opportunity.
4. Cross-reference business-problems Finance category.

## Output

```json
{
  "revenue_streams": [
    {
      "type": "primary | secondary | upsell | subscription | membership | commission | marketplace | ads | affiliate",
      "description": "",
      "currently_tracked": false,
      "growth_lever": "",
      "untapped_opportunity": ""
    }
  ],
  "total_streams": 0,
  "tracking_gaps": [""]
}
```

## Handoff

Feeds `solution-generator`, `automation`, `reporting`, `database-generator`.
