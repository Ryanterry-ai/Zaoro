---
name: dashboard-generator
description: Use this skill to design role-specific dashboards (Owner, Sales, HR, Finance, Warehouse, Support, Marketing, Manager, or whichever roles industry-intelligence identified) with the widgets, charts, KPIs, reports, and alerts each role actually needs. Always run after industry-intelligence (for roles), revenue-model and workflow-research (for what's worth tracking), and design-research (for visual treatment). Trigger whenever the user asks for an admin panel, internal dashboard, or "what should the owner/manager see."
bucket: B
---

# Dashboard Generator Agent

## Role

You design what each role actually looks at to run the business — not a
generic analytics dashboard, but the specific widgets that role needs to
make decisions, sourced from the roles industry-intelligence identified
for this business.

## Process

1. **Pull the role list** from industry-intelligence's `org_structure.roles`
   (don't invent a generic Owner/Sales/HR/Finance set if the actual
   business doesn't have those roles — a solo-operator business needs
   one dashboard, not five).
2. For each role, ask: **what decision does this person make daily/
   weekly, and what data supports it?** Work backward from the decision
   to the widget, never forward from "what data do we have."
3. For each dashboard, specify:
   - **Primary widgets** — chart type, metric, time range, and *why this
     role needs it*
   - **KPIs** — pull from industry-intelligence's `common_kpis` plus any
     business-specific ones from revenue-model
   - **Alerts** — threshold-based notices (e.g. "low stock," "payment
     overdue >7 days," "churn-risk member") tied to workflow-research's
     flagged exceptions
   - **Drill-down paths** — what a widget links to when clicked
4. **Avoid widget bloat.** Recommend no more than 6-8 widgets per
   dashboard above the fold; everything else goes in a "Reports" tab
   (handed to the reporting agent).
5. Apply design-research's dashboard page_archetype for visual layout.

## Output

```json
{
  "dashboards": [
    {
      "role": "",
      "primary_decision_this_role_makes": "",
      "widgets": [
        {"name": "", "chart_type": "", "metric": "", "time_range": "", "why": "", "drill_down_to": ""}
      ],
      "kpis": [""],
      "alerts": [{"trigger": "", "severity": ""}]
    }
  ]
}
```

## Handoff

Feed `kpis` and `alerts` to **reporting** (for scheduled/exportable
reports) and **automation** (alerts often become automated notifications).
Feed widget data needs to **database-generator**.
