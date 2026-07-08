---
name: impeccable
description: "Design guidance for AI coding agents. 23 commands, live browser iteration, and 45 deterministic detector rules for AI-generated frontend design. Use for design audits, polish, critique, and anti-pattern detection."
---

# Impeccable — Design Language for AI Agents

> Design guidance that makes your AI harness better at design.
> Full docs: [impeccable.style](https://impeccable.style)

## Quick Start

```bash
npx impeccable install
```

Then run `/impeccable init` inside your AI coding tool.

## Why Impeccable?

Every model trained on the same SaaS templates. Skip the guidance and you get the same handful of tells: Inter for everything, purple-to-blue gradients, cards nested in cards, gray text on colored backgrounds.

Impeccable adds:
- **One setup flow.** `/impeccable init` writes `PRODUCT.md` and `DESIGN.md`
- **23 commands.** A shared design vocabulary: `polish`, `audit`, `critique`, `distill`, `animate`, `bolder`, `quieter`, and more
- **45 deterministic detector rules** plus LLM-only critique checks

## 23 Commands

All commands are accessed through `/impeccable`:

| Command | What it does |
|---------|-------------|
| `/impeccable init` | One-time setup: gather design context, write PRODUCT.md and DESIGN.md |
| `/impeccable document` | Generate root DESIGN.md from existing project code |
| `/impeccable extract` | Pull reusable components and tokens into the design system |
| `/impeccable shape` | Plan UX/UI before writing code |
| `/impeccable critique` | UX design review: hierarchy, clarity, emotional resonance |
| `/impeccable audit` | Run technical quality checks (a11y, performance, responsive) |
| `/impeccable polish` | Final pass, design system alignment, and shipping readiness |
| `/impeccable bolder` | Amplify boring designs |
| `/impeccable quieter` | Tone down overly bold designs |
| `/impeccable distill` | Strip to essence |
| `/impeccable harden` | Error handling, i18n, text overflow, edge cases |
| `/impeccable onboard` | First-run flows, empty states, activation paths |
| `/impeccable animate` | Add purposeful motion |
| `/impeccable colorize` | Introduce strategic color |
| `/impeccable typeset` | Fix font choices, hierarchy, sizing |
| `/impeccable layout` | Fix layout, spacing, visual rhythm |
| `/impeccable delight` | Add moments of joy |
| `/impeccable overdrive` | Add technically extraordinary effects |
| `/impeccable clarify` | Improve unclear UX copy |
| `/impeccable adapt` | Adapt for different devices |
| `/impeccable optimize` | Performance improvements |
| `/impeccable live` | Visual variant mode: iterate on elements in the browser |
| `/impeccable craft` | Full shape-then-build flow with visual iteration |

## Anti-Patterns to Avoid

- Don't use overused fonts (Arial, Inter, system defaults)
- Don't use gray text on colored backgrounds
- Don't use pure black/gray (always tint)
- Don't wrap everything in cards or nest cards inside cards
- Don't use bounce/elastic easing (feels dated)

## CLI — Deterministic Detection

```bash
npx impeccable detect src/                   # scan a directory
npx impeccable detect index.html             # scan an HTML file
npx impeccable detect https://example.com    # scan a URL
npx impeccable detect --json .               # CI-friendly JSON output
```

The detector catches 45 deterministic issues across AI slop (side-tab borders, purple gradients, bounce easing, dark glows) and general design quality.

## Integration with Build Engine

Use impeccable as Stage 5 (quality gate) as a code review pass. After the next build passes, impeccable reviews the generated code for quality, patterns, and standards.

## Installation Options

1. **CLI installer (Recommended):** `npx impeccable install`
2. **Git Submodule:** `git submodule add https://github.com/pbakaus/impeccable .impeccable`
3. **Plugin install:** `/plugin marketplace add pbakaus/impeccable`
4. **Download from website:** [impeccable.style](https://impeccable.style)
