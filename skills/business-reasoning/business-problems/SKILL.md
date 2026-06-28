---
name: business-problems
description: Derive business problems from structured facts via BRE v2 rules engine. No LLM call — pure deterministic rule output parameterized by business-research facts + industry-intelligence lookup.
bucket: A
reason: Pure BRE v2 rule output; no LLM required
---

# Business Problems Agent

## Role

Identify concrete operational problems by diffing the business against the canonical industry model from knowledge-base. This is a deterministic BRE v2 rule output — no LLM call.

## Process (BRE v2 Rules)

1. Look up the industry model from `knowledge-base/industries/{slug}.json` (via industry-intelligence cache).
2. Compare the business's stated facts (from business-research) against the industry model's standard departments, processes, and roles.
3. For each department/process in the industry model:
   - If the business has no mention of it → flag as "potentially missing"
   - If the business mentions it but with manual/unsupported tooling → flag as "manual/error-prone"
   - If the business has it automated → mark as "covered"
4. Categorize problems: Operational, Sales, Marketing, Inventory, HR, Finance, Customer, Technology, Compliance.
5. Rank by severity: revenue-blocking > customer-experience-damaging > efficiency-draining > nice-to-have.

## Output

```json
{
  "problems": [
    {
      "category": "",
      "department": "",
      "description": "",
      "severity": "revenue-blocking | customer-experience-damaging | efficiency-draining | nice-to-have",
      "evidence": "why this was flagged (which rule triggered)"
    }
  ],
  "missing_capabilities": [""],
  "covered_well": [""]
}
```

## Handoff

Feeds `solution-generator` (BRE v2 ConstraintSolver), `customer-journey`, `workflow-research`.
