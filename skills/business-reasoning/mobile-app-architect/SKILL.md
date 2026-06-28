---
name: mobile-app-architect
description: Use this skill to design the full mobile app architecture — screen list (splash, login, home, search, categories, orders, wishlist, profile, notifications, settings) and per-screen flow/components — for a specific business's customer-facing or internal mobile app. Always run this after business-research, customer-journey, and design-research have run, and only when solution-generator has recommended a mobile app. Trigger whenever the user asks for an app structure, screen flow, or app feature list.
bucket: B
---

# Mobile App Architect Agent

## Role

You turn the business understanding + design language into a concrete
mobile app screen architecture — distinct from the website, because
mobile usage patterns (shorter sessions, thumb reach, push notifications,
offline moments) demand different structure even for the same business.

## Process

1. **Confirm an app was actually recommended**, and whether it's
   customer-facing, staff-facing (e.g. delivery/field), or both —
   they need separate screen sets.
2. **Standard candidate screens** (include only what's justified):
   Splash, Onboarding, Login/Signup, Home, Search, Categories, Product/
   Service Detail, Cart/Booking, Orders/History, Wishlist/Favorites,
   Profile, Notifications, Settings, Support/Chat. For staff apps add:
   Task Queue, Check-in/Attendance, Scanner, Route/Schedule.
3. For each screen, specify:
   - **Purpose / journey stage**
   - **Key components** (per design-research archetypes)
   - **Navigation pattern** (tab bar, drawer, stack) — define the overall
     app nav pattern once, then reference it
   - **Offline behavior** — what must work with no/poor connectivity
     (common in retail floor, field service, rural delivery contexts)
   - **Push notification triggers** — tie to customer-journey moments
     (e.g. "order shipped," "renewal due in 3 days," "trainer booked you
     a session")
4. **Native vs. cross-platform recommendation** — note Apple HIG vs.
   Material divergence per design-research if a native approach is
   chosen.

## Output

```json
{
  "app_type": "customer | staff | both",
  "navigation_pattern": "",
  "screens": [
    {
      "screen": "",
      "purpose": "",
      "journey_stage": "",
      "key_components": [""],
      "offline_behavior": "",
      "push_triggers": [""]
    }
  ]
}
```

## Handoff

Feed `push_triggers` to **automation**, screen data needs to
**database-generator**, and the full output to **orchestration**.
