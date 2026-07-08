---
name: ui-ux-pro-max
description: UI/UX design intelligence for web and mobile. Includes 67 UI styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10+ stacks. Use when building professional UI/UX, generating design systems, or applying industry-specific design rules.
---

# UI UX Pro Max — Design Intelligence

## Overview

This skill provides design intelligence for building professional UI/UX across multiple platforms and frameworks. For the full installation with Python search scripts and CSV databases, install via CLI:

```bash
npm install -g ui-ux-pro-max-cli
uipro init --ai claude
```

## Core Capabilities

### 67 UI Styles
Glassmorphism, Claymorphism, Minimalism, Brutalism, Neumorphism, Bento Grid, Dark Mode, AI-Native UI, and more.

### 161 Color Palettes
Industry-specific palettes aligned with 161 product types.

### 57 Font Pairings
Curated typography combinations with Google Fonts imports.

### 161 Industry Reasoning Rules
Each rule includes:
- **Recommended Pattern** - Landing page structure
- **Style Priority** - Best matching UI styles
- **Color Mood** - Industry-appropriate palettes
- **Typography Mood** - Font personality matching
- **Key Effects** - Animations and interactions
- **Anti-Patterns** - What NOT to do

### Supported Stacks
React, Next.js, Vue, Nuxt.js, Angular, Svelte, Astro, SwiftUI, Jetpack Compose, Flutter, React Native, HTML+Tailwind, shadcn/ui, and more.

## Design System Generation

When building a project, generate a design system by analyzing:
1. Product type → UI category rules
2. Style priorities → BM25 ranking
3. Anti-patterns for industry filtering
4. Decision rules (JSON conditions)

### Output Format
```
PATTERN: Hero-Centric + Social Proof
STYLE: Soft UI Evolution
COLORS: Primary/Secondary/CTA/Background/Text
TYPOGRAPHY: Heading/Body font pairing
KEY EFFECTS: Shadows + Transitions + Hover states
AVOID: Anti-patterns for this industry
PRE-DELIVERY CHECKLIST: Accessibility + Responsive + Performance
```

## Integration with Build Engine

Use this skill in the Design Intelligence stage:
1. After BRE v2 selects pattern and design profile
2. Before ReactRenderer generates code
3. Feed design tokens into `resolveDesignSystem()` in ReactRenderer
4. Apply anti-patterns as validation rules in quality gate

## Key Anti-Patterns by Industry

- **Fintech/Banking**: No bright neon colors, no AI purple/pink gradients
- **Healthcare**: No dark mode by default, use calming colors
- **E-commerce**: No cluttered layouts, maintain clear visual hierarchy
- **SaaS**: No generic blue gradients, differentiate from competitors

## UX Guidelines (99 Rules)

Key guidelines:
- cursor-pointer on all clickable elements
- Hover states with smooth transitions (150-300ms)
- Light mode: text contrast 4.5:1 minimum
- Focus states visible for keyboard nav
- prefers-reduced-motion respected
- Responsive: 375px, 768px, 1024px, 1440px

## Resources

- [GitHub Repo](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- [Website](https://uupm.cc)
- Install: `npm install -g ui-ux-pro-max-cli && uipro init --ai claude`
