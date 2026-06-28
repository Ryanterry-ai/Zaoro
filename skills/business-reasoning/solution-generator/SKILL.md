---
name: solution-generator
description: Recommend solutions via BRE v2 ConstraintSolver/Scorer. No independent LLM call — deterministic output from business-problems + customer-journey + workflow-research + revenue-model.
bucket: A
reason: Pure BRE v2 ConstraintSolver/Scorer output; no LLM required
---

# Solution Generator Agent

## Role

Bridge understanding and building. Chooses which systems to build, right-sizes to business scale/stage, and sequences the build order. Deterministic BRE v2 ConstraintSolver/Scorer output — no independent LLM call.

## Process (BRE v2 ConstraintSolver)

1. Load constraints from business-research (scale, stage, business_model, stated_constraints).
2. Load problems from business-problems (severity-ranked).
3. Load journey gaps from customer-journey (stages marked broken).
4. Load workflow gaps from workflow-research (broken steps).
5. Load revenue gaps from revenue-model (tracking gaps, untapped opportunities).
6. Solve: which systems from the system menu (Website, Mobile App, Admin Panel, CRM, ERP, etc.) address the most constraints at the lowest complexity.
7. Score each solution by: problem-coverage, revenue-impact, implementation-complexity, time-to-value.
8. Phase solutions: MVP (must-have) → Phase 2 (should-have) → Phase 3 (nice-to-have).

## Output

```json
{
  "recommended_solutions": [
    {
      "system": "",
      "complexity": "S | M | L | XL",
      "phase": "MVP | Phase 2 | Phase 3",
      "problems_addressed": [""],
      "revenue_impact": "",
      "build_order": 0
    }
  ],
  "total_phases": 0,
  "estimated_total_complexity": ""
}
```

## Handoff

Feeds `website-architect`, `mobile-app-architect`, `dashboard-generator`, `database-generator`.
