import { describe, it, expect } from 'vitest';
import { DesignIntelligenceEngine, createDesignIntelligenceEngine } from '../src/orchestration/design-intelligence/engine.js';
import { createUXEngine } from '../src/orchestration/design-intelligence/engines/ux-engine.js';
import { createVisualEngine } from '../src/orchestration/design-intelligence/engines/visual-engine.js';
import { createDesignSystemEngine } from '../src/orchestration/design-intelligence/engines/design-system-engine.js';
import { createComponentEngine } from '../src/orchestration/design-intelligence/engines/component-engine.js';
import { createMotionEngine } from '../src/orchestration/design-intelligence/engines/motion-engine.js';
import { createPolishEngine } from '../src/orchestration/design-intelligence/engines/polish-engine.js';
import type { DesignContext, DesignDecision } from '../src/orchestration/design-intelligence/types.js';

const INDUSTRIES = [
  'ecommerce', 'saas', 'fintech', 'healthcare', 'education',
  'restaurant', 'fitness', 'real-estate', 'media', 'portfolio',
  'marketplace', 'nonprofit',
] as const;

function makeCtx(industry: string): DesignContext {
  return {
    industry: industry as DesignContext['industry'],
    stage: 'frontend',
    artifacts: {},
  };
}

// ─── Sub-Engine Smoke Tests ─────────────────────────────────────────────────

describe('Design Sub-Engines', () => {
  it('UXEngine should return recommendations for every industry', () => {
    const engine = createUXEngine();
    for (const ind of INDUSTRIES) {
      const recs = engine.recommend(makeCtx(ind));
      expect(recs.length).toBeGreaterThanOrEqual(5);
      expect(recs.every(r => r.domain === 'ux')).toBe(true);
    }
  });

  it('VisualEngine should return color and typography recommendations', () => {
    const engine = createVisualEngine();
    for (const ind of INDUSTRIES) {
      const recs = engine.recommend(makeCtx(ind));
      const titles = recs.map(r => r.title);
      expect(titles).toContain('Color Palette');
      expect(titles).toContain('Typography System');
    }
  });

  it('DesignSystemEngine should return layout, shadow, and CSS recommendations', () => {
    const engine = createDesignSystemEngine();
    for (const ind of INDUSTRIES) {
      const recs = engine.recommend(makeCtx(ind));
      const titles = recs.map(r => r.title);
      expect(titles).toContain('Layout System');
      expect(titles).toContain('Elevation System');
      expect(titles).toContain('CSS Custom Properties');
    }
  });

  it('ComponentEngine should return base and industry components', () => {
    const engine = createComponentEngine();
    for (const ind of INDUSTRIES) {
      const recs = engine.recommend(makeCtx(ind));
      const titles = recs.map(r => r.title);
      expect(titles).toContain('Core Components');
      expect(titles).toContain('Base Components');
      expect(recs.some(r => r.components && r.components.length > 0)).toBe(true);
    }
  });

  it('MotionEngine should return motion tokens and animation suggestions', () => {
    const engine = createMotionEngine();
    for (const ind of INDUSTRIES) {
      const recs = engine.recommend(makeCtx(ind));
      const titles = recs.map(r => r.title);
      expect(titles).toContain('Motion Tokens');
      expect(titles).toContain('Reduced Motion');
    }
  });

  it('PolishEngine should return visual consistency and component map', () => {
    const engine = createPolishEngine();
    for (const ind of INDUSTRIES) {
      const recs = engine.recommend(makeCtx(ind));
      const titles = recs.map(r => r.title);
      expect(titles).toContain('Visual Consistency');
      expect(titles).toContain('Component Map');
    }
  });
});

// ─── Facade Tests ───────────────────────────────────────────────────────────

describe('DesignIntelligenceEngine', () => {
  it('should create via factory function', () => {
    const engine = createDesignIntelligenceEngine();
    expect(engine).toBeInstanceOf(DesignIntelligenceEngine);
  });

  it('should list 6 active sub-engines', () => {
    const engine = createDesignIntelligenceEngine();
    const engines = engine.getEngines();
    expect(engines).toHaveLength(6);
    const domains = engines.map(e => e.domain);
    expect(domains).toContain('ux');
    expect(domains).toContain('visual');
    expect(domains).toContain('design-system');
    expect(domains).toContain('component');
    expect(domains).toContain('motion');
    expect(domains).toContain('polish');
  });

  it('should filter engines via enabledEngines config', () => {
    const engine = createDesignIntelligenceEngine({ enabledEngines: ['ux', 'visual'] });
    const engines = engine.getEngines();
    expect(engines).toHaveLength(2);
    expect(engines.map(e => e.domain)).toEqual(['ux', 'visual']);
  });

  it('should produce a DesignDecision for every industry', () => {
    const engine = createDesignIntelligenceEngine();
    for (const ind of INDUSTRIES) {
      const decision = engine.recommend(makeCtx(ind));
      expect(decision.id).toContain('design-');
      expect(decision.timestamp).toBeGreaterThan(0);
      expect(decision.context.industry).toBe(ind);
      expect(decision.recommendations.length).toBeGreaterThanOrEqual(15);
      expect(decision.colorTokens).toBeDefined();
      expect(decision.typographyTokens).toBeDefined();
      expect(decision.layoutTokens).toBeDefined();
      expect(decision.motionTokens).toBeDefined();
      expect(decision.componentMap).toBeDefined();
      expect(Object.keys(decision.componentMap).length).toBeGreaterThanOrEqual(5);
    }
  });

  it('should produce unique IDs per call', () => {
    const engine = createDesignIntelligenceEngine();
    const d1 = engine.recommend(makeCtx('saas'));
    const d2 = engine.recommend(makeCtx('saas'));
    expect(d1.id).not.toBe(d2.id);
  });

  it('should include recommendations from all active domains', () => {
    const engine = createDesignIntelligenceEngine();
    const decision = engine.recommend(makeCtx('ecommerce'));
    const domains = new Set(decision.recommendations.map(r => r.domain));
    expect(domains.has('ux')).toBe(true);
    expect(domains.has('visual')).toBe(true);
    expect(domains.has('design-system')).toBe(true);
    expect(domains.has('component')).toBe(true);
    expect(domains.has('motion')).toBe(true);
    expect(domains.has('polish')).toBe(true);
  });

  it('should generate valid color tokens with required fields', () => {
    const engine = createDesignIntelligenceEngine();
    const decision = engine.recommend(makeCtx('saas'));
    expect(typeof decision.colorTokens.primary).toBe('string');
    expect(typeof decision.colorTokens.secondary).toBe('string');
    expect(typeof decision.colorTokens.background).toBe('string');
    expect(typeof decision.colorTokens.text).toBe('string');
    expect(typeof decision.colorTokens.success).toBe('string');
    expect(typeof decision.colorTokens.error).toBe('string');
  });

  it('should generate valid typography tokens', () => {
    const engine = createDesignIntelligenceEngine();
    const decision = engine.recommend(makeCtx('saas'));
    expect(decision.typographyTokens.fontFamily.heading).toBeTruthy();
    expect(decision.typographyTokens.fontFamily.body).toBeTruthy();
    expect(decision.typographyTokens.fontFamily.mono).toBeTruthy();
    expect(typeof decision.typographyTokens.fontSize.base).toBe('string');
    expect(typeof decision.typographyTokens.fontWeight.bold).toBe('number');
  });

  it('should generate valid layout tokens', () => {
    const engine = createDesignIntelligenceEngine();
    const decision = engine.recommend(makeCtx('saas'));
    expect(decision.layoutTokens.gridColumns).toBe(12);
    expect(decision.layoutTokens.containerMaxWidth).toBeTruthy();
    expect(decision.layoutTokens.breakpoints.sm).toBeTruthy();
    expect(decision.layoutTokens.breakpoints.lg).toBeTruthy();
  });

  it('should generate valid motion tokens', () => {
    const engine = createDesignIntelligenceEngine();
    const decision = engine.recommend(makeCtx('saas'));
    expect(decision.motionTokens.duration.normal).toBeTruthy();
    expect(decision.motionTokens.easing.default).toBeTruthy();
    expect(typeof decision.motionTokens.reducedMotion).toBe('boolean');
  });

  it('should generate CSS custom properties', () => {
    const engine = createDesignIntelligenceEngine();
    const decision = engine.recommend(makeCtx('saas'));
    expect(typeof decision.cssCustomProperties).toBe('object');
    // Should have at least font and spacing variables
    const keys = Object.keys(decision.cssCustomProperties);
    expect(keys.some(k => k.includes('font') || k.includes('spacing'))).toBe(true);
  });

  it('should respect user preferences override', () => {
    const engine = createDesignIntelligenceEngine();
    const decision = engine.recommend({
      ...makeCtx('saas'),
      preferences: { animationLevel: 'none' },
    });
    expect(decision.motionTokens.reducedMotion).toBe(true);
  });

  it('should support refine pass via polish engine', () => {
    const engine = createDesignIntelligenceEngine();
    const decision = engine.recommend(makeCtx('fitness'));
    // After refine, button should have borderRadius from layout
    expect(decision.componentMap.button.style.borderRadius).toBe(decision.layoutTokens.borderRadius.md);
  });

  it('should produce a readable summary', () => {
    const engine = createDesignIntelligenceEngine();
    const decision = engine.recommend(makeCtx('restaurant'));
    const summary = engine.summarize(decision);
    expect(summary).toContain('restaurant');
    expect(summary).toContain('Primary color');
    expect(summary).toContain('Heading font');
    expect(summary).toContain('Grid');
  });

  it('should collect components from all sub-engines', () => {
    const engine = createDesignIntelligenceEngine();
    const components = engine.getComponents(makeCtx('ecommerce'));
    expect(components.length).toBeGreaterThanOrEqual(10);
    expect(components.some(c => c.source === '21st.dev')).toBe(true);
  });

  it('should collect animations from all sub-engines', () => {
    const engine = createDesignIntelligenceEngine();
    const animations = engine.getAnimations(makeCtx('fitness'));
    expect(animations.length).toBeGreaterThanOrEqual(2);
    expect(animations.some(a => a.type === 'entrance')).toBe(true);
  });

  it('should handle unknown industry gracefully with defaults', () => {
    const engine = createDesignIntelligenceEngine();
    const decision = engine.recommend(makeCtx('nonprofit'));
    expect(decision.colorTokens.primary).toBeTruthy();
    expect(decision.typographyTokens.fontFamily.heading).toBeTruthy();
  });
});
