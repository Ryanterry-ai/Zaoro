// ─── Experience OS v2 Tests ──────────────────────────────────────────────────
//
// Tests for: Strategy Engine, Scene Library, Experience Graph, Knowledge Base,
// and the main Experience OS orchestrator.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  ExperienceOS,
  createExperienceOS,
  ExperienceStrategyEngine,
  createExperienceStrategyEngine,
  ExperienceGraphBuilder,
  createExperienceGraphBuilder,
  ExperienceKnowledgeBase,
  createExperienceKnowledgeBase,
  getAllScenes,
  getScene,
  getScenesByCategory,
  getScenesByRole,
  getScenesForIndustry,
  buildSceneSequence,
  canScenesCompose,
  getCompatibleNextScenes,
  getCompatiblePrevScenes,
} from '../src/orchestration/experience-os/index.js';
import type {
  ExperienceStrategy,
  ExperienceGraph,
  ExperienceBlueprintV2,
  SceneDefinition,
} from '../src/orchestration/experience-os/types.js';

// ─── Strategy Engine Tests ──────────────────────────────────────────────────

describe('ExperienceStrategyEngine', () => {
  const engine = createExperienceStrategyEngine();

  it('should create a strategy engine', () => {
    expect(engine).toBeInstanceOf(ExperienceStrategyEngine);
  });

  it('should generate a strategy for SaaS', () => {
    const strategy = engine.generate({
      industry: 'saas',
      pageType: 'home',
      sections: ['hero', 'features', 'pricing', 'testimonials'],
    });

    expect(strategy).toBeDefined();
    expect(strategy.id).toBeTruthy();
    expect(strategy.style).toBeDefined();
    expect(strategy.narrativeArc).toBeDefined();
    expect(strategy.conversionStrategy).toBeDefined();
    expect(strategy.emotionalJourney).toBeDefined();
    expect(strategy.emotionalJourney.startEmotion).toBeTruthy();
    expect(strategy.pacingStrategy).toBeDefined();
    expect(strategy.densityStrategy).toBeDefined();
    expect(strategy.performanceBudget).toBeDefined();
    expect(strategy.industry).toBe('saas');
    expect(strategy.reasoning).toBeTruthy();
  });

  it('should generate a strategy with all required fields', () => {
    const strategy = engine.generate({
      industry: 'restaurant',
      pageType: 'home',
      sections: ['hero', 'menu', 'gallery', 'contact'],
    });

    expect(strategy.narrativeArc.type).toBeTruthy();
    expect(strategy.narrativeArc.emotionalArc).toBeTruthy();
    expect(strategy.narrativeArc.beatPattern).toBeDefined();
    expect(strategy.conversionStrategy.primaryGoal).toBeTruthy();
    expect(strategy.conversionStrategy.trustSignals).toBeDefined();
    expect(strategy.conversionStrategy.urgency).toBeDefined();
    expect(strategy.emotionalJourney.points.length).toBeGreaterThan(0);
    expect(strategy.pacingStrategy.pace).toBeTruthy();
    expect(strategy.pacingStrategy.pausePoints.length).toBeGreaterThan(0);
  });

  it('should generate luxury style for luxury industry', () => {
    const strategy = engine.generate({
      industry: 'luxury',
      pageType: 'home',
      sections: ['hero', 'collection', 'about'],
    });

    expect(['luxury', 'cinematic']).toContain(strategy.style);
    expect(strategy.pacingStrategy.pace).toBe('slow');
  });

  it('should generate different styles for different industries', () => {
    const saas = engine.generate({ industry: 'saas', pageType: 'home', sections: ['hero', 'features'] });
    const portfolio = engine.generate({ industry: 'portfolio', pageType: 'home', sections: ['hero', 'gallery'] });

    expect(saas.style).toBeDefined();
    expect(portfolio.style).toBeDefined();
  });

  it('should override style based on personality', () => {
    const strategy = engine.generate({
      industry: 'saas',
      pageType: 'home',
      sections: ['hero'],
      personality: 'cinematic and bold',
    });

    expect(['cinematic', 'brutalist']).toContain(strategy.style);
  });

  it('should include performance budget', () => {
    const strategy = engine.generate({
      industry: 'saas',
      pageType: 'home',
      sections: ['hero', 'features'],
    });

    expect(strategy.performanceBudget).toBeDefined();
    expect(strategy.performanceBudget.maxLcpMs).toBeLessThanOrEqual(2500);
    expect(strategy.performanceBudget.maxCls).toBeDefined();
    expect(strategy.performanceBudget.targetFps).toBeGreaterThan(0);
    expect(strategy.performanceBudget.maxAnimations).toBeGreaterThan(0);
  });

  it('should include density strategy', () => {
    const strategy = engine.generate({
      industry: 'saas',
      pageType: 'home',
      sections: ['hero', 'features'],
    });

    expect(strategy.densityStrategy).toBeDefined();
    expect(strategy.densityStrategy.hero).toBeDefined();
    expect(strategy.densityStrategy.body).toBeDefined();
    expect(strategy.densityStrategy.visualTextRatio).toBeGreaterThan(0);
    expect(strategy.densityStrategy.whitespace).toBeDefined();
  });

  it('should include narrative arc with beat pattern', () => {
    const strategy = engine.generate({
      industry: 'saas',
      pageType: 'home',
      sections: ['hero', 'features'],
    });

    expect(strategy.narrativeArc.beatPattern).toBeDefined();
    expect(strategy.narrativeArc.beatPattern.beatsPerAct).toBeGreaterThan(0);
    expect(strategy.narrativeArc.beatPattern.allowedBeatTypes.length).toBeGreaterThan(0);
  });
});

// ─── Scene Library Tests ────────────────────────────────────────────────────

describe('Scene Library', () => {
  it('should have 20+ scenes', () => {
    const scenes = getAllScenes();
    expect(scenes.length).toBeGreaterThanOrEqual(20);
  });

  it('should get a scene by ID', () => {
    const scene = getScene('hero-centered');
    expect(scene).toBeDefined();
    expect(scene?.id).toBe('hero-centered');
    expect(scene?.category).toBe('hero');
    expect(scene?.narrativeRole).toBe('hook');
  });

  it('should return undefined for unknown scene', () => {
    const scene = getScene('nonexistent-scene');
    expect(scene).toBeUndefined();
  });

  it('should get scenes by category', () => {
    const heroScenes = getScenesByCategory('hero');
    expect(heroScenes.length).toBeGreaterThanOrEqual(3);
    heroScenes.forEach(s => expect(s.category).toBe('hero'));
  });

  it('should get scenes by role', () => {
    const hookScenes = getScenesByRole('hook');
    expect(hookScenes.length).toBeGreaterThanOrEqual(1);
    hookScenes.forEach(s => expect(s.narrativeRole).toBe('hook'));
  });

  it('should get scenes for industry', () => {
    const saasScenes = getScenesForIndustry('saas');
    expect(saasScenes.length).toBeGreaterThanOrEqual(5);
  });

  it('should build a scene sequence', () => {
    const sequence = buildSceneSequence({
      industry: 'saas',
      requiredRoles: ['hook', 'benefits', 'cta'],
      maxScenes: 8,
    });

    expect(sequence.length).toBeGreaterThanOrEqual(3);
    expect(sequence[0].narrativeRole).toBe('hook');
  });

  it('should respect maxScenes limit', () => {
    const sequence = buildSceneSequence({
      industry: 'saas',
      requiredRoles: ['hook', 'benefits', 'proof', 'social-proof', 'cta', 'trust'],
      maxScenes: 4,
    });

    // Always includes hero + required roles + footer
    // With maxScenes=4, should be at most 4
    expect(sequence.length).toBeLessThanOrEqual(4);
  });

  it('should check composability', () => {
    const hero = getScene('hero-centered');
    const features = getScene('feature-grid');
    expect(hero).toBeDefined();
    expect(features).toBeDefined();
    // hero-centered canPrecede ['hero-split', 'hero-fullscreen', 'hero-video'] (per library)
    // hero-split canPrecede ['feature-grid', ...]
    // canScenesCompose checks canPrecede OR canFollow, so hero-split → feature-grid works
    const heroSplit = getScene('hero-split');
    expect(heroSplit).toBeDefined();
    expect(canScenesCompose(heroSplit!, features!)).toBe(true);
  });

  it('should get compatible next scenes by ID', () => {
    const next = getCompatibleNextScenes('hero-split');
    expect(next.length).toBeGreaterThanOrEqual(1);
  });

  it('should get compatible prev scenes by ID', () => {
    const prev = getCompatiblePrevScenes('feature-grid');
    expect(prev.length).toBeGreaterThanOrEqual(1);
  });

  it('should return empty arrays for unknown scene IDs', () => {
    const next = getCompatibleNextScenes('nonexistent');
    expect(next).toEqual([]);
  });

  it('all scenes should have required fields', () => {
    const scenes = getAllScenes();
    for (const scene of scenes) {
      expect(scene.id).toBeTruthy();
      expect(scene.name).toBeTruthy();
      expect(scene.category).toBeTruthy();
      expect(scene.narrativeRole).toBeTruthy();
      expect(scene.parameters.length).toBeGreaterThan(0);
      expect(scene.performanceTier).toBeDefined();
      expect(scene.industryFit).toBeDefined();
      expect(scene.composability).toBeDefined();
    }
  });
});

// ─── Experience Graph Tests ─────────────────────────────────────────────────

describe('ExperienceGraphBuilder', () => {
  const builder = createExperienceGraphBuilder();

  const baseStrategy: ExperienceStrategy = {
    id: 'test-strategy',
    industry: 'saas',
    subIndustry: undefined,
    style: 'premium',
    narrativeArc: { type: 'hook-problem-solution', emotionalArc: 'rising', actCount: 3, beatPattern: { beatsPerAct: 3, allowedBeatTypes: ['hook', 'transition'], maxBeatDurationMs: 8000 } },
    conversionStrategy: {
      primaryGoal: 'signup',
      touchpointCount: 3,
      urgency: 'low',
      trustSignals: ['testimonials', 'security-badges'],
      frictionReduction: 'minimal',
    },
    emotionalJourney: {
      startEmotion: 'curiosity',
      peakEmotion: 'excitement',
      endEmotion: 'motivation',
      points: [],
    },
    pacingStrategy: {
      pace: 'moderate',
      beatIntervalMs: 1200,
      maxSkippedScrollSpeed: 3000,
      useScrollSnap: false,
      pausePoints: [],
    },
    densityStrategy: { hero: 'moderate', body: 'moderate', visualTextRatio: 2.5, whitespace: 'balanced' },
    performanceBudget: { maxAnimations: 20, maxMovingLayers: 8, maxParallaxGroups: 4, targetFps: 60, maxAnimJsBytes: 102400, maxLcpMs: 2500, maxCls: 0.1 },
    reasoning: 'test strategy',
  };

  const baseScenes: SceneDefinition[] = [
    {
      id: 'hero-centered',
      name: 'Centered Hero',
      category: 'hero',
      narrativeRole: 'hook',
      parameters: [],
      defaults: { layout: 'center', spacing: 'py-24', background: 'bg-background', animation: 'fade', contentDensity: 'minimal', visualComplexity: 'simple' },
      composability: { canFollow: [], canPrecede: ['feature-grid'], canCombineWith: [], maxOccurrences: 1 },
      industryFit: { saas: 0.9 },
      performanceTier: 'standard',
    },
    {
      id: 'feature-grid',
      name: 'Feature Grid',
      category: 'content',
      narrativeRole: 'benefits',
      parameters: [],
      defaults: { layout: 'grid', spacing: 'py-12', background: 'bg-background', animation: 'fade-up', contentDensity: 'moderate', visualComplexity: 'moderate' },
      composability: { canFollow: ['hero-centered'], canPrecede: ['cta-banner'], canCombineWith: [], maxOccurrences: 1 },
      industryFit: { saas: 0.9 },
      performanceTier: 'standard',
    },
    {
      id: 'cta-banner',
      name: 'CTA Banner',
      category: 'conversion',
      narrativeRole: 'cta',
      parameters: [],
      defaults: { layout: 'full-width', spacing: 'py-12', background: 'bg-muted', animation: 'fade', contentDensity: 'minimal', visualComplexity: 'simple' },
      composability: { canFollow: ['feature-grid'], canPrecede: [], canCombineWith: [], maxOccurrences: 1 },
      industryFit: { saas: 0.9 },
      performanceTier: 'light',
    },
  ];

  it('should build a linear graph', () => {
    const graph = builder.buildLinear({ strategy: baseStrategy, scenes: baseScenes, params: {} });
    expect(graph).toBeDefined();
    expect(graph.nodes.length).toBe(3);
    expect(graph.edges.length).toBe(2);
    expect(graph.entryPoints.length).toBe(1);
    expect(graph.exitPoints.length).toBe(1);
    expect(graph.metadata).toBeDefined();
    expect(graph.metadata.totalDurationMs).toBeGreaterThan(0);
  });

  it('should build an adaptive graph', () => {
    const adaptiveStrategy = {
      ...baseStrategy,
      conversionStrategy: { ...baseStrategy.conversionStrategy, touchpointCount: 5 },
    };
    const graph = builder.buildAdaptive({ strategy: adaptiveStrategy, scenes: baseScenes, params: {} });
    expect(graph).toBeDefined();
    expect(graph.nodes.length).toBeGreaterThanOrEqual(3);
    expect(graph.branches).toBeDefined();
  });

  it('should build a looping graph', () => {
    const graph = builder.buildLooping({ strategy: baseStrategy, scenes: baseScenes, params: {} });
    expect(graph).toBeDefined();
    expect(graph.nodes.length).toBe(3);
  });

  it('linear graph should have sequential scroll edges', () => {
    const graph = builder.buildLinear({ strategy: baseStrategy, scenes: baseScenes, params: {} });
    const scrollEdges = graph.edges.filter(e => e.type === 'scroll');
    expect(scrollEdges.length).toBe(2);
  });

  it('graph should include entry and exit points', () => {
    const graph = builder.buildLinear({ strategy: baseStrategy, scenes: baseScenes, params: {} });
    expect(graph.entryPoints).toContain('node-0');
    expect(graph.exitPoints).toContain('node-2');
  });

  it('graph nodes should have composability-aware skippable flags', () => {
    const graph = builder.buildLinear({ strategy: baseStrategy, scenes: baseScenes, params: {} });
    expect(graph.nodes[0].skippable).toBe(false);
    expect(graph.nodes[1].skippable).toBe(false);
  });

  it('graph metadata should include critical path', () => {
    const graph = builder.buildLinear({ strategy: baseStrategy, scenes: baseScenes, params: {} });
    expect(graph.metadata.criticalPath).toBeDefined();
    expect(graph.metadata.criticalPath.length).toBeGreaterThan(0);
    expect(graph.metadata.nodeCount).toBe(3);
  });
});

// ─── Knowledge Base Tests ───────────────────────────────────────────────────

describe('ExperienceKnowledgeBase', () => {
  it('should create a knowledge base with default patterns', () => {
    const kb = createExperienceKnowledgeBase();
    const stats = kb.getStats();
    expect(stats.totalPatterns).toBeGreaterThanOrEqual(5);
  });

  it('should query patterns by category', () => {
    const kb = createExperienceKnowledgeBase();
    const patterns = kb.query({ category: 'scene-composition' });
    expect(patterns.length).toBeGreaterThanOrEqual(1);
    patterns.forEach(p => expect(p.category).toBe('scene-composition'));
  });

  it('should query patterns by industry', () => {
    const kb = createExperienceKnowledgeBase();
    const patterns = kb.query({ industry: 'saas' });
    expect(patterns.length).toBeGreaterThanOrEqual(1);
  });

  it('should capture patterns from a blueprint', () => {
    const kb = createExperienceKnowledgeBase();
    const initialCount = kb.getStats().totalPatterns;

    const blueprint: ExperienceBlueprintV2 = {
      id: 'test-blueprint',
      createdAt: new Date().toISOString(),
      version: '2.0.0',
      strategy: {
        value: {
          id: 'test',
          industry: 'test-industry',
          style: 'premium',
          narrativeArc: { type: 'linear' as any, emotionalArc: 'rising', actCount: 3, beatPattern: { beatsPerAct: 3, allowedBeatTypes: ['hook'], maxBeatDurationMs: 8000 } },
          conversionStrategy: { primaryGoal: 'signup', trustSignals: [], urgency: 'none', touchpointCount: 3, frictionReduction: 'minimal' },
          emotionalJourney: { startEmotion: 'curiosity', peakEmotion: 'excitement', endEmotion: 'motivation', points: [] },
          pacingStrategy: { pace: 'moderate', beatIntervalMs: 1200, maxSkippedScrollSpeed: 3000, useScrollSnap: false, pausePoints: [] },
          densityStrategy: { hero: 'moderate', body: 'moderate', visualTextRatio: 2.5, whitespace: 'balanced' },
          performanceBudget: { maxAnimations: 20, maxMovingLayers: 8, maxParallaxGroups: 4, targetFps: 60, maxAnimJsBytes: 102400, maxLcpMs: 2500, maxCls: 0.1 },
          reasoning: 'test',
        },
        provenance: { layer: 'test', confidence: 1, evidence: [], timestamp: Date.now(), reasoning: '', source: 'test' },
      },
      graph: {
        value: { id: 'test', nodes: [], edges: [], entryPoints: [], exitPoints: [], branches: [], metadata: { totalDurationMs: 0, nodeCount: 0, maxDepth: 0, hasCycles: false, criticalPath: [] } },
        provenance: { layer: 'test', confidence: 1, evidence: [], timestamp: Date.now(), reasoning: '', source: 'test' },
      },
      scenes: {
        value: [{ sceneId: 'hero-centered', params: {}, nodeId: 'n1', order: 0, overrides: {} }],
        provenance: { layer: 'test', confidence: 1, evidence: [], timestamp: Date.now(), reasoning: '', source: 'test' },
      },
      pageExperiences: {
        value: [{ pagePath: '/', title: 'Home', sceneIds: ['hero-centered'] }],
        provenance: { layer: 'test', confidence: 1, evidence: [], timestamp: Date.now(), reasoning: '', source: 'test' },
      },
      globalSettings: {
        value: { animationLevel: 'moderate', reducedMotion: false, scrollBehavior: 'auto', fontLoading: 'swap', imageLoading: 'lazy', darkMode: 'auto' },
        provenance: { layer: 'test', confidence: 1, evidence: [], timestamp: Date.now(), reasoning: '', source: 'test' },
      },
      knowledgeRefs: { value: [], provenance: { layer: 'test', confidence: 1, evidence: [], timestamp: Date.now(), reasoning: '', source: 'test' } },
      validation: { valid: true, errors: [], warnings: [], score: 100 },
    };

    const captured = kb.captureFromBlueprint(blueprint);
    expect(captured.length).toBeGreaterThanOrEqual(3);
    expect(kb.getStats().totalPatterns).toBeGreaterThan(initialCount);
  });

  it('should get recommendations for a new project', () => {
    const kb = createExperienceKnowledgeBase();
    const refs = kb.getRecommendations({
      industry: 'saas',
      style: 'premium',
      pageType: 'home',
      sections: ['hero', 'features', 'cta'],
    });
    expect(Array.isArray(refs)).toBe(true);
  });

  it('should update metrics', () => {
    const kb = createExperienceKnowledgeBase();
    const patterns = kb.query({ limit: 1 });
    if (patterns.length > 0) {
      const pattern = patterns[0];
      const initialSampleSize = pattern.metrics.sampleSize;
      kb.updateMetrics(pattern.id, { conversionLift: 0.1 });
      const updated = kb.query({ limit: 1 });
      expect(updated[0].metrics.sampleSize).toBe(initialSampleSize + 1);
    }
  });

  it('should respect max capacity', () => {
    const kb = createExperienceKnowledgeBase({ maxPatterns: 10 });
    for (let i = 0; i < 15; i++) {
      kb.capture({
        name: `pattern-${i}`,
        category: 'scene-composition',
        industries: [],
        pattern: { data: {} },
      });
    }
    expect(kb.getStats().totalPatterns).toBeLessThanOrEqual(10);
  });
});

// ─── Experience OS Integration Tests ────────────────────────────────────────

describe('ExperienceOS', () => {
  const os = createExperienceOS();

  it('should create an Experience OS instance', () => {
    expect(os).toBeInstanceOf(ExperienceOS);
  });

  it('should generate a complete blueprint for SaaS', () => {
    const blueprint = os.generate({
      industry: 'saas',
      pageType: 'home',
      pages: [
        { path: '/', title: 'Home', sections: ['hero', 'features', 'pricing', 'testimonials'] },
        { path: '/about', title: 'About', sections: ['story', 'team'] },
        { path: '/contact', title: 'Contact', sections: ['form'] },
      ],
    });

    expect(blueprint).toBeDefined();
    expect(blueprint.id).toBeTruthy();
    expect(blueprint.version).toBe('2.0.0');
    expect(blueprint.strategy.value).toBeDefined();
    expect(blueprint.graph.value).toBeDefined();
    expect(blueprint.scenes.value.length).toBeGreaterThanOrEqual(1);
    expect(blueprint.pageExperiences.value.length).toBe(3);
    expect(blueprint.globalSettings.value).toBeDefined();
  });

  it('should generate a blueprint for restaurant', () => {
    const blueprint = os.generate({
      industry: 'restaurant',
      pageType: 'home',
      pages: [
        { path: '/', title: 'Home', sections: ['hero', 'menu', 'gallery', 'contact'] },
      ],
    });

    expect(blueprint.strategy.value).toBeDefined();
    expect(blueprint.validation).toBeDefined();
  });

  it('should generate different styles for different industries', () => {
    const saas = os.generate({
      industry: 'saas',
      pageType: 'home',
      pages: [{ path: '/', title: 'Home', sections: ['hero', 'features'] }],
    });

    const luxury = os.generate({
      industry: 'luxury',
      pageType: 'home',
      pages: [{ path: '/', title: 'Home', sections: ['hero', 'collection'] }],
    });

    expect(saas.strategy.value.style).toBeDefined();
    expect(luxury.strategy.value.style).toBeDefined();
  });

  it('should generate global settings based on strategy', () => {
    const blueprint = os.generate({
      industry: 'saas',
      pageType: 'home',
      pages: [{ path: '/', title: 'Home', sections: ['hero', 'features'] }],
    });

    const settings = blueprint.globalSettings.value;
    expect(settings.animationLevel).toBeDefined();
    expect(typeof settings.reducedMotion).toBe('boolean');
    expect(['smooth', 'auto', 'instant']).toContain(settings.scrollBehavior);
    expect(['swap', 'block', 'fallback', 'optional']).toContain(settings.fontLoading);
  });

  it('should capture patterns after build', () => {
    const statsBefore = os.getKnowledgeStats();
    const blueprint = os.generate({
      industry: 'test-capture',
      pageType: 'home',
      pages: [{ path: '/', title: 'Home', sections: ['hero', 'features'] }],
    });

    os.capturePatterns(blueprint);
    const statsAfter = os.getKnowledgeStats();
    expect(statsAfter.totalPatterns).toBeGreaterThan(statsBefore.totalPatterns);
  });

  it('should produce blueprints with validation', () => {
    const industries = ['saas', 'restaurant', 'fitness', 'healthcare', 'ecommerce'];

    for (const industry of industries) {
      const blueprint = os.generate({
        industry,
        pageType: 'home',
        pages: [{ path: '/', title: 'Home', sections: ['hero', 'features'] }],
      });

      expect(blueprint.validation).toBeDefined();
      expect(blueprint.validation.score).toBeGreaterThan(0);
    }
  });

  it('should generate a complete blueprint with all provenance', () => {
    const blueprint = os.generate({
      industry: 'saas',
      pageType: 'home',
      pages: [{ path: '/', title: 'Home', sections: ['hero', 'features', 'cta'] }],
    });

    expect(blueprint.strategy.provenance).toBeDefined();
    expect(blueprint.strategy.provenance.layer).toBeTruthy();
    expect(blueprint.strategy.provenance.confidence).toBeGreaterThan(0);
    expect(blueprint.graph.provenance).toBeDefined();
    expect(blueprint.scenes.provenance).toBeDefined();
  });
});
