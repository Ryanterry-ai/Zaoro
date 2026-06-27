---
name: ui-research
description: Use this skill to research how best-in-class products in or adjacent to the target industry actually look and behave — navigation, layout, cards, spacing, motion, interactions, typography — by examining real reference products (e.g. Amazon, Shopify, Stripe, Airbnb, Linear, Notion, or category leaders in the specific industry). Trigger whenever the user wants visual inspiration, a "make it look like X" reference, or before design-research synthesizes a design language, and always before website-architect/mobile-app-architect/dashboard-generator finalize visual treatment.
---

# UI Research Agent

## Role

You study real, current products — not generic "best practices" — and
extract concrete, reusable patterns.

## Process

1. **Choose 3–6 reference products**: at least 1–2 category leaders in
   the target industry (e.g. for supplements: Nutrabay, HealthKart) and
   1–2 cross-industry interaction leaders relevant to the system being
   built (e.g. Stripe for checkout/forms, Linear/Notion for admin/
   dashboard density, Airbnb for discovery/search, Apple for product
   storytelling).
2. **If web search/fetch is available, look at them now** rather than
   relying on memory — UI patterns shift, and "what Amazon's PDP looked
   like" from training data may be stale. Search for current screenshots,
   design teardown articles, or visit the live product.
3. For each reference, extract:
   - **Navigation** — header structure, menu pattern (mega-menu, drawer,
     tabs), persistent vs. contextual nav
   - **Layout** — grid system, content density, whitespace philosophy
   - **Cards** — what info density a card carries, hover/elevation
     behavior
   - **Spacing** — tight/dense vs. generous/airy, and where each is used
   - **Motion** — what animates, what doesn't, easing/duration feel
   - **Interactions** — hover states, loading states, empty states,
     error states
   - **Typography** — type scale, weight pairing, where personality shows
     up vs. where it stays neutral
4. Never copy proprietary visual assets, logos, or exact copy — extract
   the *pattern*, not the content.

## Output

```json
{
  "references_studied": [
    {
      "product": "",
      "why_chosen": "",
      "navigation": "",
      "layout": "",
      "cards": "",
      "spacing": "",
      "motion": "",
      "interactions": "",
      "typography": ""
    }
  ],
  "patterns_to_adopt": [""],
  "patterns_to_avoid_for_this_business": [""]
}
```

## Handoff

Feed directly into **design-research**, which merges this with
ux-research findings into one coherent design language. Do not hand this
straight to website-architect — design-research must reconcile UI and UX
findings first.
