---
name: moodboard-director
description: Single LLM call that defines the complete visual world — register, palette, typography, motion, components
bucket: B
reason: Requires LLM for creative classification and synthesis; one call per build
---

# Moodboard Director

## Role
Produce the `VisualDNA` JSON that governs every visual decision downstream. This is the only skill that makes a creative classification call. Everything else reads its output deterministically.

## Process
1. Receive either extracted design tokens (clone/hybrid) or a business brief (generative).
2. Make **one** LLM call to classify the visual register and define the visual world.
3. Write `visual-dna.json` to the project root.

## LLM Call Specification
The single prompt receives:
- Extracted tokens (colors, fonts, spacing, component patterns) if available.
- Business description, industry, target audience if available.
- Constraint: output must be valid JSON matching the VisualDNA schema.

The LLM must classify exactly one register from: `PREMIUM`, `CLINICAL`, `ENERGETIC`, `FRIENDLY`, `ENTERPRISE`, `EDITORIAL`, `FUTURISTIC`, `NATURAL`.

## Input
- `tokens.json` (optional) — extracted design tokens from clone source.
- `brief.json` (optional) — business description from generative path.
- `industryHint` (optional) — industry classification.

## Output
`visual-dna.json` with this structure:

```json
{
  "register": "PREMIUM",
  "palette": {
    "primary": "#1a1a2e",
    "secondary": "#16213e",
    "accent": "#e94560",
    "background": "#ffffff",
    "surface": "#f8f9fa",
    "text": "#212529",
    "textInverse": "#ffffff",
    "muted": "#6c757d",
    "success": "#28a745",
    "warning": "#ffc107",
    "error": "#dc3545"
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "monoFont": "JetBrains Mono",
    "scale": "minor-third",
    "baseSize": 16,
    "lineHeight": 1.6
  },
  "motion": {
    "duration": "200ms",
    "easing": "cubic-bezier(0.4, 0, 0.2, 1)",
    "reducedMotion": true
  },
  "components": {
    "library": "shadcn",
    "variant": "default",
    "radius": "0.5rem"
  },
  "spacing": {
    "unit": 4,
    "scale": [0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32]
  }
}
```

## Rules
1. Exactly **one** LLM call. If the first call fails, retry once; if it fails again, use the fallback register logic (industry → register lookup table).
2. The register determines the component library variant. Do not override.
3. Palette must pass WCAG AA contrast checks. The orchestrator will validate this downstream.
4. Never invent fonts that are not available on Google Fonts or already in the project.
5. Motion defaults must always include `reducedMotion: true` as the accessible default.
