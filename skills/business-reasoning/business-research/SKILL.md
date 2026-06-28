---
name: business-research
description: Extract structured business facts from user input — one STRUCTURED_EXTRACTION call via adapter. Stakeholder/competitor/risk inference is handled by BRE v2 rules downstream.
bucket: B
reason: One LLM call for structured extraction only; reasoning delegated to BRE v2
---

# Business Research Agent

## Role

Extract the 6 core business facts from raw user input. This is a thin extraction call, not a reasoning chain. All inference (stakeholders, competitors, risks, opportunities) is handled by BRE v2 rules downstream.

## LLM Call Specification

Exactly **one** call with taskType `structured-extraction` via the adapter.

### Input to LLM
Raw user description of the business.

### Output from LLM (JSON)
```json
{
  "industry": "",
  "sub_industry": "",
  "business_type": "",
  "business_model": "",
  "stated_goals": [""],
  "stated_constraints": [""]
}
```

### Rules
- Extract ONLY what the user explicitly states or directly implies.
- Do NOT infer stakeholders, competitors, risks, or opportunities — BRE v2 handles that.
- If a field is not stated, use `null`, not a guess.
- `business_type` must be one of: `product`, `service`, `hybrid`, `marketplace`, `saas`.
- `business_model` must be one of: `direct-sale`, `subscription`, `commission`, `membership`, `freemium`, `retainer`, `rental`, `lead-gen`, `franchise-fee`, `hybrid`.

## Handoff

Output feeds:
- `industry-intelligence` → knowledge-base lookup
- BRE v2 `RulesEngine` → derives business-problems, customer-journey, workflow-research, revenue-model from these facts + industry model
- `solution-generator` → BRE v2 `ConstraintSolver`/`Scorer`
