---
name: skill-integrator
description: Maps page sections to specific component libraries and produces the ComponentManifest
bucket: A
reason: Deterministic mapping from section types to library components; no LLM
---

# Skill Integrator

## Role
Read the VisualDNA and Blueprint (page specs), then deterministically map each section to a concrete component from the available libraries (shadcn/ui, Magic UI, Aceternity, 21st.dev). Output the ComponentManifest that `parallel-builder` consumes.

## Process
1. Read `visual-dna.json` to get the register and component library preference.
2. Read each page spec from `specs/` to get the section list.
3. For each section, look up the section type in the mapping table below.
4. Assign the concrete component, its import path, and required props.
5. Write `component-manifest.json`.

## Section → Component Mapping

| Section Type | shadcn | Magic UI | Aceternity | 21st.dev |
|---|---|---|---|---|
| Hero | `HeroSection` | `HeroParallax` | `HeroParallax` | `HeroBlock` |
| Features | `CardGrid` | `AnimatedBeam` | `Features` | `FeatureBento` |
| Pricing | `PricingTable` | `PricingCard` | — | `PricingComparison` |
| Testimonials | `Carousel` | `Marquee` | `ParallaxScroll` | `TestimonialGrid` |
| CTA | `Button` | `ShimmerButton` | `TextReveal` | `CTABlock` |
| Footer | `Footer` | — | — | `FooterBlock` |
| Navbar | `Navigation` | `FloatingNav` | `Navbar` | `StickyNav` |
| Contact Form | `Form` | — | — | `ContactForm` |
| Gallery | `AspectRatio` | `Globe` | `PinContainer` | `GalleryGrid` |
| Stats | `Card` | `NumberTicker` | `CountUp` | `StatsBar` |
| FAQ | `Accordion` | — | — | `FAQAccordion` |

## Input
- `visual-dna.json` — register, component library preference.
- `specs/*.json` — page specifications with section lists.
- Available component libraries installed in the project.

## Output
`component-manifest.json`:

```json
{
  "pages": {
    "home": {
      "sections": [
        {
          "id": "hero",
          "type": "Hero",
          "component": "HeroParallax",
          "library": "magicui",
          "importPath": "@/components/magicui/hero-parallax",
          "props": { "title": "string", "subtitle": "string" },
          "dataBinding": "heroContent"
        }
      ]
    }
  },
  "globalState": {
    "theme": "ThemeContext",
    "cart": "CartContext"
  }
}
```

## Rules
1. No LLM calls. Every mapping is a lookup.
2. If a section type has no mapping in the preferred library, fall back to shadcn/ui.
3. If shadcn/ui has no mapping, use a plain HTML/div with Tailwind classes.
4. Each section must declare its `dataBinding` — the key in the content JSON it reads from.
5. The `globalState` block lists shared contexts that `state-weaver` will generate.
6. Never assign a component from a library that is not installed. Check `package.json` first.
