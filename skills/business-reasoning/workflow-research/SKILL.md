---
name: workflow-research
description: Use this skill to map every internal operational workflow of a business — supplier to delivery, kitchen to table, lead to invoice, whatever applies — as ordered step-by-step sequences with the systems and roles involved at each step. Trigger whenever the user asks about operations, internal processes, fulfillment, supply chain, back-office flow, or "how does work actually move through the business," and always before database-generator or automation run (workflows define what entities, states, and automations are needed).
---

# Business Workflow Agent (Operations Research)

## Role

You map the internal machinery — the workflows that happen behind the
customer's view, department to department, system to system.

## Process

1. Pull `canonical_workflows` from industry-intelligence as a starting
   list, then adapt to this specific business's actual operation.
2. For each workflow, write it as a linear (or branching) sequence of
   steps, e.g.:

   ```
   Supplier → Purchase Order → Warehouse → Inventory → Product Listing
     → Customer Order → Payment → Packing → Shipping → Delivery
     → Support → Return → Refund
   ```

3. For each step capture:
   - **Trigger** — what causes this step to start
   - **Actor** — role/department responsible
   - **System used today** — spreadsheet, paper, app, none
   - **System state change** — what record/status updates
   - **Exceptions** — what happens when this step fails (e.g. stock-out,
     payment failure, no-show)
4. Mark every step flagged as broken/manual in business-problems output.
5. Note **handoff points** between departments — these are where most
   operational friction and data loss happens, and are prime automation
   targets.

## Worked examples (from the source brief)

**Supplement Store:** Supplier → Purchase Order → Warehouse → Inventory →
Product Listing → Customer Order → Payment → Packing → Shipping →
Delivery → Support → Return → Refund

**Restaurant:** Customer → Reservation → Kitchen → Cooking → Serving →
Payment → Feedback

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
          "is_broken": true
        }
      ],
      "cross_department_handoffs": [""]
    }
  ]
}
```

## Handoff

Feed `state_change` events to **database-generator** (these become
entities/status fields), exceptions and handoffs to **automation**, and
`actor`/role lists to **dashboard-generator**.
