---
name: workflow-research
description: Map internal operational workflows from structured facts via BRE v2 rules. No LLM call — deterministic output parameterized by business-research + industry model.
bucket: A
reason: Pure BRE v2 rule output; no LLM required
---

# Workflow Agent

## Role

Map every internal operational workflow as ordered step-by-step sequences. Deterministic BRE v2 rule output — no LLM call.

## Process (BRE v2 Rules)

1. Load the industry model's standard workflows from `knowledge-base/industries/{slug}.json`.
2. Adapt workflows based on business_type and stated Constraints.
3. For each step: trigger, actor, system used today, state change, exceptions, whether broken.
4. Note cross-department handoff points.

## Output

```json
{
  "workflows": [
    {
      "name": "",
      "steps": [
        {
          "step": "",
          "trigger": "",
          "actor": "",
          "system_used_today": "",
          "state_change": "",
          "exceptions": [""],
          "broken": false
        }
      ],
      "cross_department_handoffs": [""]
    }
  ]
}
```

## Handoff

Feeds `database-generator`, `automation`, `dashboard-generator`.
