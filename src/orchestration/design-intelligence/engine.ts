// ─── Design Intelligence Engine ─────────────────────────────────────────────
//
// Top-level facade. The orchestrator calls this single entry point.
// Internally runs all 6 sub-engines, merges their tokens, and
// returns a unified DesignDecision with aggregated recommendations.
//
// Sub-engines:
//   1. UX Engine          → navigation, layout, hero, conversion, mobile, IA
//   2. Visual Engine      → color palette, typography, hierarchy, contrast
//   3. Design System Engine → CSS custom props, spacing, shadows, z-index
//   4. Component Engine   → component selection and variants
//   5. Motion Engine      → animations, transitions, scroll effects
//   6. Polish Engine      → consistency, spacing audit, micro-interactions
// ─────────────────────────────────────────────────────────────────────────────

import { createUXEngine, UXEngine } from './engines/ux-engine.js';
import { createVisualEngine, VisualEngine } from './engines/visual-engine.js';
import { createDesignSystemEngine, DesignSystemEngine } from './engines/design-system-engine.js';
import { createComponentEngine, ComponentEngine } from './engines/component-engine.js';
import { createMotionEngine, MotionEngine } from './engines/motion-engine.js';
import { createPolishEngine, PolishEngine } from './engines/polish-engine.js';

import type {
  DesignContext,
  DesignDecision,
  DesignRecommendation,
  DesignSubEngine,
  ColorTokens,
  TypographyTokens,
  LayoutTokens,
  MotionTokens,
  ComponentMap,
  ComponentConfig,
  ComponentSuggestion,
  AnimationSuggestion,
} from './types.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DesignIntelligenceConfig {
  /** Enable specific sub-engines (all enabled by default) */
  enabledEngines?: string[];
  /** Merge strategy: 'first-wins' replaces, 'last-wins' overrides */
  mergeStrategy?: 'first-wins' | 'last-wins';
}

// ─── Engine Registry ────────────────────────────────────────────────────────

function createAllEngines(): DesignSubEngine[] {
  return [
    createUXEngine(),
    createVisualEngine(),
    createDesignSystemEngine(),
    createComponentEngine(),
    createMotionEngine(),
    createPolishEngine(),
  ];
}

// ─── Token Merging ──────────────────────────────────────────────────────────

function mergeColorTokens(recs: DesignRecommendation[]): ColorTokens {
  const colorRec = recs.find(r => r.domain === 'visual' && r.title === 'Color Palette');
  const tokens = colorRec?.tokens as ColorTokens | undefined;
  if (tokens) return tokens;
  return {
    primary: '#6366F1', primaryLight: '#818CF8', primaryDark: '#4F46E5',
    secondary: '#06B6D4', secondaryLight: '#22D3EE', secondaryDark: '#0891B2',
    accent: '#8B5CF6', background: '#FAFAFA', surface: '#F4F4F5',
    surfaceElevated: '#FFFFFF', text: '#18181B', textSecondary: '#52525B',
    textMuted: '#A1A1AA', border: '#E4E4E7', borderLight: '#F4F4F5',
    success: '#22C55E', warning: '#EAB308', error: '#EF4444', info: '#3B82F6',
  };
}

function mergeTypographyTokens(recs: DesignRecommendation[]): TypographyTokens {
  const typoRec = recs.find(r => r.domain === 'visual' && r.title === 'Typography System');
  const tokens = typoRec?.tokens as TypographyTokens | undefined;
  if (tokens) return tokens;
  return {
    fontFamily: { heading: 'Inter, sans-serif', body: 'Inter, sans-serif', mono: 'JetBrains Mono, monospace' },
    fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem' },
    fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
    letterSpacing: { tight: '-0.025em', normal: '0em', wide: '0.025em' },
  };
}

function mergeLayoutTokens(recs: DesignRecommendation[]): LayoutTokens {
  const layoutRec = recs.find(r => r.domain === 'design-system' && r.title === 'Layout System');
  const tokens = layoutRec?.tokens as LayoutTokens | undefined;
  if (tokens) return tokens;
  return {
    spacing: { 0: '0px', 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 8: '32px', 10: '40px', 12: '48px', 16: '64px', 20: '80px', 24: '96px' },
    borderRadius: { none: '0px', sm: '4px', md: '8px', lg: '12px', xl: '16px', '2xl': '24px', full: '9999px' },
    containerMaxWidth: '1280px', gridColumns: 12, gridGap: '24px',
    breakpoints: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
  };
}

function mergeMotionTokens(recs: DesignRecommendation[]): MotionTokens {
  const motionRec = recs.find(r => r.domain === 'motion' && r.title === 'Motion Tokens');
  const tokens = motionRec?.tokens as MotionTokens | undefined;
  if (tokens) return tokens;
  return {
    duration: { fast: '150ms', normal: '250ms', slow: '400ms', slower: '600ms' },
    easing: { default: 'cubic-bezier(0.4, 0, 0.2, 1)', in: 'cubic-bezier(0.4, 0, 1, 1)', out: 'cubic-bezier(0, 0, 0.2, 1)', bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    reducedMotion: true,
  };
}

function mergeComponentMap(recs: DesignRecommendation[]): ComponentMap {
  const polishRec = recs.find(r => r.domain === 'polish' && r.title === 'Component Map');
  const tokens = polishRec?.tokens as ComponentMap | undefined;
  if (tokens) return tokens;

  // Fallback: build minimal component map
  const button: ComponentConfig = { variant: 'primary', size: 'md', style: { borderRadius: '8px', fontWeight: '600' } };
  const card: ComponentConfig = { variant: 'default', size: 'md', style: { borderRadius: '12px', padding: '24px' } };
  const input: ComponentConfig = { variant: 'outline', size: 'md', style: { borderRadius: '8px', border: '1px solid var(--color-border)' } };
  const modal: ComponentConfig = { variant: 'centered', size: 'md', style: { borderRadius: '12px', padding: '32px' } };
  const navigation: ComponentConfig = { variant: 'top', size: 'lg', style: { height: '64px' } };
  return { button, card, input, modal, navigation };
}

function mergeComponentsFromRecs(recs: DesignRecommendation[]): ComponentSuggestion[] {
  const all: ComponentSuggestion[] = [];
  for (const rec of recs) {
    if (rec.components) {
      all.push(...rec.components);
    }
  }
  return all;
}

function mergeAnimationsFromRecs(recs: DesignRecommendation[]): AnimationSuggestion[] {
  const all: AnimationSuggestion[] = [];
  for (const rec of recs) {
    if (rec.animations) {
      all.push(...rec.animations);
    }
  }
  return all;
}

function mergeCSSProperties(recs: DesignRecommendation[]): Record<string, string> {
  const props: Record<string, string> = {};
  for (const rec of recs) {
    if (rec.css) {
      Object.assign(props, rec.css);
    }
  }
  return props;
}

// ─── Design Intelligence Engine ─────────────────────────────────────────────

export class DesignIntelligenceEngine {
  private engines: DesignSubEngine[];
  private config: DesignIntelligenceConfig;

  constructor(config?: DesignIntelligenceConfig) {
    this.config = config ?? {};
    const all = createAllEngines();
    if (this.config.enabledEngines) {
      this.engines = all.filter(e => this.config.enabledEngines!.includes(e.domain));
    } else {
      this.engines = all;
    }
  }

  /** Get list of active sub-engines */
  getEngines(): { name: string; domain: string }[] {
    return this.engines.map(e => ({ name: e.name, domain: e.domain }));
  }

  /** Run all sub-engines and produce a unified DesignDecision */
  recommend(ctx: DesignContext): DesignDecision {
    // Collect all recommendations
    const allRecs: DesignRecommendation[] = [];
    for (const engine of this.engines) {
      allRecs.push(...engine.recommend(ctx));
    }

    // Build the base decision
    const colorTokens = mergeColorTokens(allRecs);
    const typographyTokens = mergeTypographyTokens(allRecs);
    const layoutTokens = mergeLayoutTokens(allRecs);
    const motionTokens = mergeMotionTokens(allRecs);
    const componentMap = mergeComponentMap(allRecs);

    let decision: DesignDecision = {
      id: `design-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      context: ctx,
      recommendations: allRecs,
      colorTokens,
      typographyTokens,
      layoutTokens,
      motionTokens,
      componentMap,
      cssCustomProperties: mergeCSSProperties(allRecs),
    };

    // Run refine pass on engines that support it
    for (const engine of this.engines) {
      if (engine.refine) {
        decision = engine.refine(decision);
      }
    }

    return decision;
  }

  /** Get just the components list (useful for stage prompts) */
  getComponents(ctx: DesignContext): ComponentSuggestion[] {
    const recs: DesignRecommendation[] = [];
    for (const engine of this.engines) {
      recs.push(...engine.recommend(ctx));
    }
    return mergeComponentsFromRecs(recs);
  }

  /** Get just the animations list (useful for stage prompts) */
  getAnimations(ctx: DesignContext): AnimationSuggestion[] {
    const recs: DesignRecommendation[] = [];
    for (const engine of this.engines) {
      recs.push(...engine.recommend(ctx));
    }
    return mergeAnimationsFromRecs(recs);
  }

  /** Generate a human-readable summary for the orchestrator */
  summarize(decision: DesignDecision): string {
    const lines: string[] = [];
    lines.push(`# Design Decision: ${decision.context.industry}`);
    lines.push(`Personality: ${decision.context.personality ?? 'auto'}`);
    lines.push(`Recommendations: ${decision.recommendations.length}`);
    lines.push(`Components: ${Object.keys(decision.componentMap).length} mapped`);
    lines.push('');
    lines.push('## Token Summary');
    lines.push(`- Primary color: ${decision.colorTokens.primary}`);
    lines.push(`- Heading font: ${decision.typographyTokens.fontFamily.heading}`);
    lines.push(`- Body font: ${decision.typographyTokens.fontFamily.body}`);
    lines.push(`- Grid: ${decision.layoutTokens.gridColumns} cols, ${decision.layoutTokens.gridGap} gap`);
    lines.push(`- Max width: ${decision.layoutTokens.containerMaxWidth}`);
    lines.push(`- Motion: ${decision.motionTokens.duration.normal} default`);
    return lines.join('\n');
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

export function createDesignIntelligenceEngine(config?: DesignIntelligenceConfig): DesignIntelligenceEngine {
  return new DesignIntelligenceEngine(config);
}
