---
name: customer-journey
description: Map customer journey from structured facts via BRE v2 rules. No LLM call — deterministic output parameterized by business-research + industry model.
bucket: A
reason: Pure BRE v2 rule output; no LLM required
---

# Customer Journey Agent

## Role

Map the end-to-end customer journey for this business type. Deterministic BRE v2 rule output — no LLM call.

## Process (BRE v2 Rules)

1. Load the industry model's standard customer journey stages from `knowledge-base/industries/{slug}.json`.
2. Adapt stages based on business_type (product/service/hybrid/marketplace/saas).
3. For each stage: customer action, business touchpoint, data created, drop-off risk, owning role.
4. Flag stages that are broken based on business-problems output.

## Output

```json
{
  "journey_stages": [
    {
      "stage": "",
      "customer_action": "",
      "business_touchpoint": "",
      "data_created": "",
      "drop_off_risk": "low | medium | high",
      "currently_broken": false,
      "owning_role": ""
    }
  ],
  "segments": [""]
}
```

## Handoff

Feeds `website-architect`, `mobile-app-architect`, `database-generator`, `automation`.
