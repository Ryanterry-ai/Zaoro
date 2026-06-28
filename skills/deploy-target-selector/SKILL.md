---
name: Deploy Target Selector
bucket: A
---

# Deploy Target Selector Skill

## Purpose
Select the correct deployment tier from budget/platform preference. Deterministic (Bucket A) — NO LLM.

## Lookup Table

| Budget Tier | Platform Preference | Selected Template |
|-------------|--------------------|--------------------|
| low (<$50/mo) | any | tier-static |
| medium ($50-200/mo) | static host | tier-static |
| medium ($50-200/mo) | Vercel/Netlify | tier-standard |
| medium ($50-200/mo) | self-hosted | tier-standard |
| high (>$200/mo) | any | tier-fullstack |
| unknown | unknown | tier-standard |

## Input
```json
{
  "budgetTier": "low|medium|high|unknown",
  "platformPreference": "vercel|netlify|railway|self-hosted|static|any",
  "needsDatabase": false,
  "needsAuth": false
}
```

## Output
```json
{
  "selectedTier": "static|standard|fullstack",
  "templateDir": "templates/tier-static",
  "reason": "Budget tier low → static"
}
```

## Override Rules
- If needsDatabase=true → minimum tier-standard
- If needsAuth=true → minimum tier-standard
- If needsDatabase=true AND needsAuth=true → tier-fullstack
- If budget is "high" and needsDatabase → tier-fullstack
