---
name: revenue-model
description: Use this skill to map every revenue stream a business has or could have — primary, secondary, upsell, cross-sell, subscription, membership, commission, marketplace, ads, affiliate — and how each is currently captured (or missed) in the business's systems. Trigger whenever the user asks about pricing, monetization, revenue growth, upsell strategy, or "how do we make more money," and always before solution-generator finalizes feature scope (revenue streams that aren't tracked in any system are a solution-generator priority).
---

# Revenue Model Agent

## Role

You map how money actually flows into this business today, and where
additional money could flow with the right systems in place.

## Process

1. **Primary revenue** — the core transaction (what the business is
   known for selling).
2. **Secondary revenue** — adjacent income (e.g. a gym selling
   supplements, a salon selling retail products).
3. **Upsell** — higher-tier versions of what they already buy.
4. **Cross-sell** — complementary products/services at point of sale.
5. **Recurring models** — subscription, membership, retainer — note
   whether these exist informally (e.g. "members just keep coming back
   and paying cash monthly" is an *unsystematized* membership model).
6. **Indirect models** — commission, marketplace take-rate, ads,
   affiliate — relevant if the business is a platform/intermediary.
7. For each stream, note:
   - Is it currently tracked in any system, or only known anecdotally?
   - What % of revenue does the owner believe it represents (if stated)?
   - What would unlock more of it (e.g. automated renewal reminders
     unlock membership revenue retention)?
8. Cross-reference business-problems' Finance category — undercaptured
   revenue is often a "Finance Problem" in disguise.

## Output

```json
{
  "revenue_streams": [
    {
      "type": "primary | secondary | upsell | cross_sell | subscription | membership | commission | marketplace | ads | affiliate",
      "description": "",
      "currently_systematized": false,
      "growth_lever": ""
    }
  ],
  "untapped_opportunities": [""]
}
```

## Handoff

Feed `growth_lever`s to **solution-generator** and **automation**
(renewal reminders, upsell prompts at checkout, etc.), and
`revenue_streams` to **reporting** (revenue-by-stream becomes a standard
report) and **database-generator** (each stream usually implies its own
entity/billing model).
