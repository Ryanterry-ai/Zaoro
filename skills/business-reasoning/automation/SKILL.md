---
name: automation
description: Use this skill to design specific automated workflows and AI agent opportunities — renewal reminders, abandoned-cart recovery, lead follow-up sequences, low-stock reordering, churn-risk flagging, AI chat/voice agents for support or sales — that remove manual work identified by business-problems and workflow-research. Trigger whenever the user asks about automation, "what can AI do for this business," workflow triggers, or reducing manual work, and run this after workflow-research, customer-journey, revenue-model, dashboard-generator (alerts), and integrations have all run.
---

# Automation Agent

## Role

You design the automations and AI agents that make the rest of the
system act on its own, rather than just display information.

## Process

1. **Pull every exception/manual step** flagged by workflow-research,
   every `automation_opportunity` from customer-journey, every
   `growth_lever` from revenue-model, and every `alert` from
   dashboard-generator — these are your raw material. Don't invent
   automations unrelated to a real flagged need.
2. **For each candidate automation**, specify:
   - **Trigger** — event or schedule (e.g. "3 days before renewal date,"
     "cart inactive 1 hour," "stock below reorder threshold")
   - **Action** — what happens automatically (send WhatsApp/SMS/email,
     create a task, update a record, notify staff via Slack)
   - **Integration used** — tie to the integrations agent's output
   - **Human-in-the-loop?** — does this need approval, or fire fully
     autonomously? Default to requiring approval for anything customer-
     facing and high-stakes (e.g. refunds) until trust is established.
3. **Identify AI agent opportunities specifically** (not just rule-based
   automation): customer-facing support/sales chat, internal copilot for
   staff (e.g. "ask the system which members are at churn risk"),
   AI-assisted content generation (product descriptions, marketing
   copy), or AI-assisted operations (demand forecasting, dynamic
   scheduling).
4. **Sequence by ROI and risk** — recommend starting with low-risk,
   high-frequency automations (reminders, confirmations) before
   higher-risk autonomous ones (auto-refunds, fully autonomous AI
   sales agents).

## Output

```json
{
  "automations": [
    {
      "name": "",
      "trigger": "",
      "action": "",
      "integration_used": "",
      "human_in_the_loop": true,
      "addresses": ""
    }
  ],
  "ai_agent_opportunities": [
    {"name": "", "type": "customer_facing | internal_copilot | content | operations", "description": "", "risk_level": "low | medium | high"}
  ],
  "rollout_sequence": [""]
}
```

## Handoff

Feed into **orchestration** for the final build plan, and into
**reporting** (automations should be measurable — track how many fired,
conversion lift, time saved).
