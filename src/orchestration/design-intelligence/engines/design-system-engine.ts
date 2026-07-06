// ─── Design System Engine ───────────────────────────────────────────────────
//
// Wraps Impeccable capabilities. Handles:
//   - CSS custom properties generation
//   - Design token architecture
//   - Theme configuration
//   - Responsive breakpoint system
//   - Shadow and elevation system
//   - Border radius system
// ─────────────────────────────────────────────────────────────────────────────

import type { DesignSubEngine, DesignContext, DesignRecommendation, LayoutTokens, ColorTokens, TypographyTokens } from '../types.js';

// ─── Layout Defaults ────────────────────────────────────────────────────────

const DEFAULT_LAYOUT: LayoutTokens = {
  spacing: { 0: '0px', 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 8: '32px', 10: '40px', 12: '48px', 16: '64px', 20: '80px', 24: '96px' },
  borderRadius: { none: '0px', sm: '4px', md: '8px', lg: '12px', xl: '16px', '2xl': '24px', full: '9999px' },
  containerMaxWidth: '1280px',
  gridColumns: 12,
  gridGap: '24px',
  breakpoints: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
};

const INDUSTRY_LAYOUT_OVERRIDES: Record<string, Partial<LayoutTokens>> = {
  'ecommerce': { containerMaxWidth: '1400px', gridGap: '16px' },
  'portfolio': { containerMaxWidth: '1200px', gridGap: '32px' },
  'restaurant': { containerMaxWidth: '1200px', gridGap: '16px' },
  'fitness': { containerMaxWidth: '1400px', gridGap: '16px' },
  'media': { containerMaxWidth: '1400px', gridGap: '24px' },
};

// ─── Shadow System ──────────────────────────────────────────────────────────

const SHADOW_TOKENS = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
};

// ─── Design System Engine ───────────────────────────────────────────────────

export class DesignSystemEngine implements DesignSubEngine {
  readonly name = 'Design System Engine';
  readonly domain = 'design-system' as const;

  recommend(ctx: DesignContext): DesignRecommendation[] {
    const recs: DesignRecommendation[] = [];

    // Layout tokens
    const layoutOverride = INDUSTRY_LAYOUT_OVERRIDES[ctx.industry] ?? {};
    const layout = { ...DEFAULT_LAYOUT, ...layoutOverride };
    recs.push({
      domain: 'design-system',
      title: 'Layout System',
      description: `Grid system: ${layout.gridColumns} columns, ${layout.gridGap} gap, ${layout.containerMaxWidth} max width`,
      confidence: 0.9,
      priority: 'must',
      tokens: layout,
    });

    // Shadow/elevation system
    recs.push({
      domain: 'design-system',
      title: 'Elevation System',
      description: 'Material-inspired shadow tokens for depth hierarchy',
      confidence: 0.85,
      priority: 'should',
      tokens: SHADOW_TOKENS,
    });

    // Border radius
    recs.push({
      domain: 'design-system',
      title: 'Border Radius',
      description: 'Consistent radius scale from sharp to fully round',
      confidence: 0.9,
      priority: 'must',
      tokens: layout.borderRadius,
    });

    // CSS custom properties
    recs.push({
      domain: 'design-system',
      title: 'CSS Custom Properties',
      description: 'Generate :root CSS variables for all design tokens',
      confidence: 1.0,
      priority: 'must',
      css: this.generateCSSCustomProperties(ctx),
    });

    // Responsive system
    recs.push({
      domain: 'design-system',
      title: 'Responsive Breakpoints',
      description: `Mobile-first with breakpoints: ${Object.keys(layout.breakpoints).join(', ')}`,
      confidence: 0.9,
      priority: 'must',
      tokens: layout.breakpoints,
    });

    // Z-index scale
    recs.push({
      domain: 'design-system',
      title: 'Z-Index Scale',
      description: 'Predictable z-index layering',
      confidence: 0.8,
      priority: 'should',
      tokens: { dropdown: 1000, sticky: 1100, modal: 1300, popover: 1400, toast: 1500, tooltip: 1600 },
    });

    return recs;
  }

  private generateCSSCustomProperties(ctx: DesignContext): Record<string, string> {
    const props: Record<string, string> = {};
    props['--font-heading'] = 'Inter, sans-serif';
    props['--font-body'] = 'Inter, sans-serif';
    props['--font-mono'] = 'JetBrains Mono, monospace';
    props['--spacing-unit'] = '4px';
    props['--container-max'] = '1280px';
    props['--radius-sm'] = '4px';
    props['--radius-md'] = '8px';
    props['--radius-lg'] = '12px';
    props['--radius-xl'] = '16px';
    return props;
  }
}

export function createDesignSystemEngine(): DesignSystemEngine {
  return new DesignSystemEngine();
}
