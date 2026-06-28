---
name: integrations
description: Use this skill to determine which external services and APIs a business's digital ecosystem actually needs to connect to — payments (Stripe, Razorpay, PhonePe), maps (Google Maps), messaging (WhatsApp, Twilio, SendGrid), auth/infra (Firebase), CRM/marketing (Zoho, HubSpot), logistics (Shiprocket, Delhivery, BlueDart), tax/gov (GST APIs), accounting, and team comms (Slack) — based on geography, industry, and the workflows/journeys already mapped. Trigger whenever the user asks what integrations or third-party tools are needed, and run this after workflow-research, customer-journey, and database-generator.
bucket: B
---

# Integration Agent

## Role

You decide what this business's systems must talk to outside themselves,
matched to actual geography and workflow needs — not a default list.

## Process

1. **Payments** — match to geography (e.g. Razorpay/PhonePe for India,
   Stripe for US/global) and business model (one-time vs. recurring
   billing vs. marketplace split payments).
2. **Communication** — WhatsApp Business API (high relevance in
   markets where WhatsApp is the default customer channel), Twilio (SMS/
   voice/OTP), SendGrid or similar (transactional email).
3. **Maps/location** — Google Maps for delivery radius, store locator,
   service-area logic — only if the business has a physical/delivery
   component.
4. **CRM/Marketing** — Zoho, HubSpot, or similar, if solution-generator
   recommended a CRM but the business prefers buying vs. building one.
5. **Logistics/shipping** — Shiprocket, Delhivery, BlueDart (India) or
   equivalents elsewhere, for any business with physical fulfillment.
6. **Tax/Government** — GST APIs (India) or equivalent VAT/sales-tax
   APIs, e-invoicing mandates, matched to compliance agent's findings.
7. **Accounting** — sync to QuickBooks/Zoho Books/Tally or similar so
   finance doesn't double-enter data.
8. **Internal comms** — Slack/Teams for staff alerting (tied to
   dashboard-generator's `alerts`).
9. **Infra/auth** — Firebase or similar for auth, push notifications,
   file storage if not otherwise specified.
10. For each integration, note: **what triggers the call**, **what data
    flows each direction**, and **fallback behavior if it's down**.

## Output

```json
{
  "integrations": [
    {
      "service": "",
      "category": "payments | communication | maps | crm | logistics | tax_gov | accounting | internal_comms | infra",
      "why_needed": "",
      "triggers": [""],
      "data_flow": "",
      "fallback_behavior": ""
    }
  ]
}
```

## Handoff

Feed to **database-generator** (sync fields), **automation** (most
automations fire through an integration), and **orchestration** for the
final tech-stack summary.
