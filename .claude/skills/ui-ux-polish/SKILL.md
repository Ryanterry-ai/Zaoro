---
name: ui-ux-polish
description: "Iterative UI/UX polishing workflow for web applications. The exact prompt and methodology for achieving Stripe-level visual polish through multiple passes."
---

# UI/UX Polish — Iterative Enhancement Workflow

> **When to Use:** This is for when your site/app already works and looks decent and you want to improve it.
>
> **Key Insight:** Asking for agreement ("don't you agree?") motivates the model to polish things up better. Separately thinking through desktop vs mobile leads to much better outcomes.

---

## The Workflow

1. App already works and looks decent
2. Run the polish prompt
3. Agent makes incremental improvements
4. Repeat many times (10+ iterations)
5. Each pass adds small improvements that compound

## THE EXACT PROMPT — UI/UX Polish

```
I still think there are strong opportunities to enhance the UI/UX look and feel and to make everything work better and be more intuitive, user-friendly, visually appealing, polished, slick, and world class in terms of following UI/UX best practices like those used by Stripe, don't you agree? And I want you to carefully consider desktop UI/UX and mobile UI/UX separately while doing this and hyper-optimize for both separately to play to the specifics of each modality. I'm looking for true world-class visual appeal, polish, slickness, etc. that makes people gasp at how stunning and perfect it is in every way. Use ultrathink.
```

## Why This Prompt Works

### 1. Asks for Agreement
"don't you agree?" engages the model's reasoning about whether improvements are possible.

### 2. Separates Desktop and Mobile
Prevents compromises that work "okay" on both but great on neither.

### 3. Sets High Standards
References "world class", "Stripe", "makes people gasp" push toward higher quality.

### 4. Uses Ultrathink
Extended thinking allows thorough analysis and highest-impact changes.

## What the Model Typically Improves

### Visual Polish
- Spacing and padding consistency
- Typography hierarchy
- Color contrast and accessibility
- Shadow and depth effects
- Border radius consistency
- Hover/focus states

### Interaction Design
- Button feedback
- Loading states
- Transitions and animations
- Error state handling
- Empty state design

### Mobile Optimization
- Touch target sizes
- Responsive breakpoints
- Mobile-specific navigation
- Gesture support

### Desktop Optimization
- Keyboard navigation
- Hover states
- Multi-column layouts
- Sidebar navigation

## Integration with Build Engine

Use this skill as Stage 4 (post-generation, pre-quality-gate) as a refinement pass. After all components are generated and assembled, ui-ux-polish reviews the complete page set and applies polish (spacing, visual hierarchy, color consistency, accessibility).

## Tips

1. **Don't skip iterations** — Even when changes seem small, keep going
2. **Review changes** — Make sure the model isn't breaking things
3. **Test on real devices** — Desktop browser != mobile experience
4. **Consider accessibility** — WCAG compliance matters
5. **Keep performance in mind** — Pretty but slow is bad UX
