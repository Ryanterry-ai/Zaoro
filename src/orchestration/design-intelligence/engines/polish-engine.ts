// ─── Polish Engine ──────────────────────────────────────────────────────────
//
// Wraps UI Polish capabilities. Handles:
//   - Visual consistency checks
//   - Spacing audit (margins, paddings)
//   - Typography consistency
//   - Color harmony verification
//   - Responsive breakpoint coverage
//   - Micro-detail refinements
// ─────────────────────────────────────────────────────────────────────────────

import type { DesignSubEngine, DesignContext, DesignRecommendation, DesignDecision, ColorTokens, TypographyTokens, LayoutTokens, MotionTokens, ComponentConfig, ComponentMap } from '../types.js';

// ─── Industry Polish Profiles ───────────────────────────────────────────────

const INDUSTRY_POLISH: Record<string, {
  tone: string;
  spacingTightness: 'loose' | 'normal' | 'tight';
  cornerStyle: 'sharp' | 'soft' | 'rounded';
  shadowIntensity: 'none' | 'subtle' | 'medium' | 'strong';
  hoverBehavior: 'lift' | 'glow' | 'scale' | 'none';
  focusRing: 'outline' | 'ring' | 'glow';
}> = {
  'ecommerce': { tone: 'clean-and-professional', spacingTightness: 'normal', cornerStyle: 'rounded', shadowIntensity: 'subtle', hoverBehavior: 'lift', focusRing: 'ring' },
  'saas': { tone: 'minimal-and-functional', spacingTightness: 'normal', cornerStyle: 'soft', shadowIntensity: 'subtle', hoverBehavior: 'scale', focusRing: 'outline' },
  'fintech': { tone: 'authoritative-and-trustworthy', spacingTightness: 'normal', cornerStyle: 'soft', shadowIntensity: 'subtle', hoverBehavior: 'lift', focusRing: 'ring' },
  'healthcare': { tone: 'calm-and-approachable', spacingTightness: 'loose', cornerStyle: 'rounded', shadowIntensity: 'none', hoverBehavior: 'glow', focusRing: 'glow' },
  'education': { tone: 'inviting-and-playful', spacingTightness: 'normal', cornerStyle: 'rounded', shadowIntensity: 'subtle', hoverBehavior: 'scale', focusRing: 'ring' },
  'restaurant': { tone: 'warm-and-appetizing', spacingTightness: 'tight', cornerStyle: 'rounded', shadowIntensity: 'medium', hoverBehavior: 'scale', focusRing: 'outline' },
  'fitness': { tone: 'bold-and-energetic', spacingTightness: 'tight', cornerStyle: 'sharp', shadowIntensity: 'strong', hoverBehavior: 'lift', focusRing: 'glow' },
  'real-estate': { tone: 'professional-and-trustworthy', spacingTightness: 'normal', cornerStyle: 'soft', shadowIntensity: 'subtle', hoverBehavior: 'lift', focusRing: 'ring' },
  'media': { tone: 'editorial-and-polished', spacingTightness: 'normal', cornerStyle: 'sharp', shadowIntensity: 'none', hoverBehavior: 'lift', focusRing: 'outline' },
  'portfolio': { tone: 'creative-and-refined', spacingTightness: 'loose', cornerStyle: 'sharp', shadowIntensity: 'none', hoverBehavior: 'scale', focusRing: 'glow' },
  'marketplace': { tone: 'vibrant-and-trustworthy', spacingTightness: 'normal', cornerStyle: 'rounded', shadowIntensity: 'subtle', hoverBehavior: 'lift', focusRing: 'ring' },
  'nonprofit': { tone: 'compassionate-and-warm', spacingTightness: 'loose', cornerStyle: 'rounded', shadowIntensity: 'none', hoverBehavior: 'glow', focusRing: 'glow' },
};

// ─── Default Component Map ──────────────────────────────────────────────────

function getDefaultComponentMap(industry: string, cornerStyle: string, shadowIntensity: string): ComponentMap {
  const radius = cornerStyle === 'sharp' ? '0px' : cornerStyle === 'soft' ? '8px' : '12px';
  const shadow = shadowIntensity === 'none' ? 'none' : shadowIntensity === 'subtle' ? '0 1px 3px rgba(0,0,0,0.1)' : shadowIntensity === 'medium' ? '0 4px 12px rgba(0,0,0,0.1)' : '0 8px 24px rgba(0,0,0,0.15)';

  const button: ComponentConfig = {
    variant: 'primary',
    size: 'md',
    style: { borderRadius: radius, fontWeight: '600', padding: '10px 20px' },
    variants: {
      primary: { background: 'var(--color-primary)', color: '#fff' },
      secondary: { background: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)' },
      ghost: { background: 'transparent', color: 'var(--color-primary)' },
    },
  };

  const card: ComponentConfig = {
    variant: 'default',
    size: 'md',
    style: { borderRadius: radius, boxShadow: shadow, padding: '24px' },
  };

  const input: ComponentConfig = {
    variant: 'outline',
    size: 'md',
    style: { borderRadius: radius, border: '1px solid var(--color-border)', padding: '10px 14px' },
  };

  const modal: ComponentConfig = {
    variant: 'centered',
    size: 'md',
    style: { borderRadius: radius, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', padding: '32px' },
  };

  const navigation: ComponentConfig = {
    variant: 'top',
    size: 'lg',
    style: { height: '64px', padding: '0 24px' },
  };

  return { button, card, input, modal, navigation };
}

// ─── Polish Engine ──────────────────────────────────────────────────────────

export class PolishEngine implements DesignSubEngine {
  readonly name = 'Polish Engine';
  readonly domain = 'polish' as const;

  recommend(ctx: DesignContext): DesignRecommendation[] {
    const polish = INDUSTRY_POLISH[ctx.industry] ?? INDUSTRY_POLISH['saas']!;
    const recs: DesignRecommendation[] = [];

    // Visual consistency rules
    recs.push({
      domain: 'polish',
      title: 'Visual Consistency',
      description: `Apply ${polish.tone} tone across all elements`,
      confidence: 0.9,
      priority: 'must',
      tokens: {
        cornerStyle: polish.cornerStyle,
        shadowIntensity: polish.shadowIntensity,
        hoverBehavior: polish.hoverBehavior,
      },
    });

    // Spacing audit
    recs.push({
      domain: 'polish',
      title: 'Spacing Audit',
      description: `Use ${polish.spacingTightness} spacing rhythm for ${ctx.industry}`,
      confidence: 0.85,
      priority: 'must',
      tokens: {
        spacingTightness: polish.spacingTightness,
        guidelines: this.getSpacingGuidelines(polish.spacingTightness),
      },
    });

    // Typography consistency
    recs.push({
      domain: 'polish',
      title: 'Typography Consistency',
      description: 'Enforce consistent type scale and line heights',
      confidence: 0.85,
      priority: 'should',
      tokens: {
        headingWeight: '700',
        bodyWeight: '400',
        lineHeight: 1.6,
        maxLineWidth: '65ch',
      },
    });

    // Color harmony
    recs.push({
      domain: 'polish',
      title: 'Color Harmony',
      description: 'Verify WCAG contrast ratios and color consistency',
      confidence: 0.9,
      priority: 'must',
      tokens: {
        minContrastRatio: 4.5,
        largeTextContrastRatio: 3,
        maxColors: 5,
      },
    });

    // Micro-interactions
    recs.push({
      domain: 'polish',
      title: 'Micro-Interactions',
      description: `Configure ${polish.hoverBehavior} hover behavior and ${polish.focusRing} focus ring`,
      confidence: 0.8,
      priority: 'should',
      tokens: {
        hoverBehavior: polish.hoverBehavior,
        focusRing: polish.focusRing,
        transitionDuration: '200ms',
      },
    });

    // Component map
    recs.push({
      domain: 'polish',
      title: 'Component Map',
      description: 'Standardized component styling across the application',
      confidence: 0.85,
      priority: 'must',
      tokens: getDefaultComponentMap(ctx.industry, polish.cornerStyle, polish.shadowIntensity) as unknown as Record<string, unknown>,
    });

    return recs;
  }

  refine(decision: DesignDecision): DesignDecision {
    const componentMap = { ...decision.componentMap };

    // Ensure button has consistent border radius from layout
    if (componentMap.button) {
      componentMap.button = {
        ...componentMap.button,
        style: {
          ...componentMap.button.style,
          borderRadius: decision.layoutTokens.borderRadius.md ?? '8px',
        },
      };
    }

    // Ensure card has consistent shadow
    if (componentMap.card) {
      componentMap.card = {
        ...componentMap.card,
        style: {
          ...componentMap.card.style,
          borderRadius: decision.layoutTokens.borderRadius.lg ?? '12px',
        },
      };
    }

    return { ...decision, componentMap };
  }

  private getSpacingGuidelines(tightness: string): string {
    switch (tightness) {
      case 'loose': return 'Generous whitespace; section gaps ≥ 96px; component gaps ≥ 32px';
      case 'tight': return 'Compact layout; section gaps ≤ 48px; component gaps ≤ 16px';
      default: return 'Balanced whitespace; section gaps 64-96px; component gaps 24px';
    }
  }
}

export function createPolishEngine(): PolishEngine {
  return new PolishEngine();
}
