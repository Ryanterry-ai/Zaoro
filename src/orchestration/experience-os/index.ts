// ─── Experience OS v2 — Main Entry Point ────────────────────────────────────
//
// The top-level orchestrator for Experience OS v2.
// Ties together: Strategy Engine → Scene Library → Graph → Blueprint → Knowledge Base
//
// Flow:
//   1. Strategy Engine generates ExperienceStrategy from business context
//   2. Scene Library selects and parameterizes scenes based on strategy
//   3. Experience Graph builds adaptive flow from scenes
//   4. Knowledge Base provides proven patterns and captures new ones
//   5. ExperienceBlueprint v2 is the canonical output
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ExperienceStrategy,
  ExperienceGraph,
  ExperienceBlueprintV2,
  SelectedScene,
  PageExperience,
  GlobalExperienceSettings,
  KnowledgeReference,
  ExperienceValidation,
  ExperienceStyle,
  NarrativeRole,
  SceneDefinition,
} from './types.js';
import type { MotionCapability } from '../../motion/capabilities/types.js';
import type { Industry } from '../types.js';
import { ProvenanceAware, Provenance } from '../experience-intelligence/types.js';
import { ExperienceStrategyEngine, createExperienceStrategyEngine } from './strategy-engine.js';
import { ExperienceGraphBuilder, createExperienceGraphBuilder } from './experience-graph.js';
import { ExperienceKnowledgeBase, createExperienceKnowledgeBase } from './knowledge-base.js';
import { buildSceneSequence, getScene, getAllScenes } from './scene-library/index.js';
import { selectCapabilitiesForStrategy } from './capability-selection.js';

// ─── Experience OS v2 ───────────────────────────────────────────────────────

export interface ExperienceOSInput {
  industry: Industry;
  subIndustry?: string;
  pageType: string;
  pages: Array<{ path: string; title: string; sections: string[] }>;
  personality?: string;
  businessGoal?: string;
  targetAudience?: string;
}

/**
 * @deprecated (Phase R1, 2026-07-15) — NOT a production execution path.
 * Only the dead PipelineOrchestrator wired this in. The canonical production
 * runtime is `DeterministicOrchestratorV4` (src/agents/deterministic-orchestrator-v4.ts).
 * Preserved for potential target-architecture capabilities (emotion, choreography,
 * compiled experience). DO NOT DELETE until migrated or formally abandoned.
 *
 * Experience OS v2 — the top-level orchestrator.
 * Replaces the linear pipeline with strategic, adaptive experience design.
 */
export class ExperienceOS {
  private strategyEngine: ExperienceStrategyEngine;
  private graphBuilder: ExperienceGraphBuilder;
  private knowledgeBase: ExperienceKnowledgeBase;

  constructor() {
    this.strategyEngine = createExperienceStrategyEngine();
    this.graphBuilder = createExperienceGraphBuilder();
    this.knowledgeBase = createExperienceKnowledgeBase();
  }

  private lastBlueprint?: ExperienceBlueprintV2;

  /**
   * Generate a complete ExperienceBlueprint v2 from business context.
   */
  generate(input: ExperienceOSInput): ExperienceBlueprintV2 {
    // Step 1: Strategy Engine generates strategic decisions
    const strategy = this.strategyEngine.generate({
      industry: input.industry,
      subIndustry: input.subIndustry,
      pageType: input.pageType,
      sections: input.pages.flatMap(p => p.sections),
      personality: input.personality,
      businessGoal: input.businessGoal,
      targetAudience: input.targetAudience,
    });

    // Step 2: Query Knowledge Base for proven patterns
    const knowledgeRefs = this.knowledgeBase.getRecommendations({
      industry: input.industry,
      style: strategy.style,
      pageType: input.pageType,
      sections: input.pages.flatMap(p => p.sections),
    });

    // Step 3: Select scenes from library based on strategy + knowledge
    const selectedScenes = this.selectScenes(input, strategy, knowledgeRefs);

    // Step 4: Build Experience Graph
    const graph = this.buildGraph(strategy, selectedScenes);

    // Step 5: Build page experiences
    const pageExperiences = this.buildPageExperiences(input, selectedScenes);

    // Step 6: Build global settings
    const globalSettings = this.buildGlobalSettings(strategy);

    // Step 7: Validate
    const validation = this.validate({
      strategy,
      graph,
      scenes: selectedScenes,
      pageExperiences,
      globalSettings,
      knowledgeRefs,
    });

    // Step 8: Capture patterns for future use
    // (Done after successful build in production)

    const now = new Date().toISOString();
    const blueprintId = `exp-blueprint-${Date.now()}`;

    const blueprint: ExperienceBlueprintV2 = {
      id: blueprintId,
      createdAt: now,
      version: '2.0.0',
      strategy: wrap(strategy, 'experience-strategy-engine', 0.9),
      graph: wrap(graph, 'experience-graph-builder', 0.85),
      scenes: wrap(selectedScenes, 'scene-library', 0.9),
      pageExperiences: wrap(pageExperiences, 'experience-os', 0.85),
      globalSettings: wrap(globalSettings, 'experience-os', 0.95),
      knowledgeRefs: wrap(knowledgeRefs, 'knowledge-base', 0.8),
      validation,
    };

    this.lastBlueprint = blueprint;
    return blueprint;
  }

  /**
   * Capture patterns from a completed build into the knowledge base.
   */
  capturePatterns(blueprint: ExperienceBlueprintV2): void {
    this.knowledgeBase.captureFromBlueprint(blueprint);
  }

  /**
   * Get knowledge base stats.
   */
  getKnowledgeStats() {
    return this.knowledgeBase.getStats();
  }

  /**
   * Select motion capabilities for the last generated blueprint's strategy.
   */
  selectCapabilities(): MotionCapability[] {
    const blueprint = this.lastBlueprint;
    if (!blueprint) return [];
    return selectCapabilitiesForStrategy(blueprint.strategy.value);
  }

  // ─── Internal Methods ──────────────────────────────────────────────────

  private selectScenes(
    input: ExperienceOSInput,
    strategy: ExperienceStrategy,
    knowledgeRefs: KnowledgeReference[]
  ): SelectedScene[] {
    // Use knowledge base recommendations if available
    const recommendedSequence = knowledgeRefs
      .filter(r => r.appliedTo === 'scene-composition')
      .flatMap(r => {
        const pattern = this.knowledgeBase.query({ industry: input.industry, limit: 1 })[0];
        return pattern?.pattern.sceneSequence ?? [];
      });

    // Build scene sequence from required roles
    const requiredRoles = this.getRequiredRoles(input.pageType, strategy);
    const sceneSequence = buildSceneSequence({
      industry: input.industry,
      requiredRoles,
      maxScenes: 12,
    });

    // Merge recommended and generated sequences
    // If recommendations exist, use the recommended sequence (proven patterns)
    // Otherwise use the generated sequence
    const finalSequence = recommendedSequence.length > 0
      ? [...recommendedSequence.map(id => getScene(id)).filter((s): s is SceneDefinition => s !== undefined)]
      : sceneSequence;

    // Convert to SelectedScene
    return finalSequence.map((scene, order) => ({
      sceneId: scene.id,
      params: this.buildSceneParams(scene, input, strategy),
      nodeId: `node-${order}`,
      order,
      overrides: {},
    }));
  }

  private getRequiredRoles(
    pageType: string,
    strategy: ExperienceStrategy
  ): NarrativeRole[] {
    const base: NarrativeRole[] = [
      'hook', 'benefits', 'proof', 'social-proof', 'cta', 'reflection',
    ];

    if (strategy.conversionStrategy.touchpointCount > 3) {
      base.push('trust', 'reflection');
    }

    if (pageType === 'about') {
      return ['hook', 'trust', 'benefits', 'social-proof', 'cta', 'reflection'];
    }

    return base;
  }

  private buildSceneParams(
    scene: { id: string; parameters: Array<{ name: string; defaultValue: unknown; required: boolean }> },
    input: ExperienceOSInput,
    strategy: ExperienceStrategy
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    for (const param of scene.parameters) {
      if (param.name === 'title') params.title = this.generateTitle(scene.id, input);
      else if (param.name === 'subtitle') params.subtitle = this.generateSubtitle(scene.id, input);
      else if (param.name === 'ctaText') params.ctaText = this.getCTAText(strategy.conversionStrategy.primaryGoal);
      else params[param.name] = param.defaultValue;
    }

    return params;
  }

  private generateTitle(sceneId: string, input: ExperienceOSInput): string {
    const titles: Record<string, string> = {
      'hero-centered': `Welcome to ${input.industry.charAt(0).toUpperCase() + input.industry.slice(1)}`,
      'hero-split': `Discover ${input.subIndustry ?? input.industry}`,
      'hero-fullscreen': `Experience ${input.industry}`,
      'feature-grid': 'Features',
      'testimonial-carousel': 'What People Say',
      'cta-banner': 'Ready to Get Started?',
      'pricing-table': 'Pricing',
      'faq-accordion': 'Frequently Asked Questions',
      'process-steps': 'How It Works',
      'stats-row': 'By the Numbers',
      'social-proof-bar': 'Trusted by Leading Companies',
      'content-narrative': 'Our Story',
      'team-grid': 'Our Team',
      'gallery-grid': 'Gallery',
      'comparison-table': 'Compare Plans',
      'contact-form': 'Contact Us',
      'footer': '',
    };
    return titles[sceneId] ?? '';
  }

  private generateSubtitle(sceneId: string, input: ExperienceOSInput): string {
    if (sceneId.startsWith('hero')) {
      return `Premium ${input.industry} experiences crafted for you.`;
    }
    return '';
  }

  private getCTAText(goal: string): string {
    const ctaTexts: Record<string, string> = {
      purchase: 'Shop Now',
      signup: 'Sign Up Free',
      contact: 'Contact Us',
      download: 'Download',
      booking: 'Book Now',
      inquiry: 'Learn More',
      subscription: 'Subscribe',
      demo: 'Request Demo',
      trial: 'Start Free Trial',
    };
    return ctaTexts[goal] ?? 'Get Started';
  }

  private buildGraph(
    strategy: ExperienceStrategy,
    scenes: SelectedScene[]
  ): ExperienceGraph {
    const sceneDefs = scenes
      .map(s => getScene(s.sceneId))
      .filter((s): s is NonNullable<typeof s> => s !== undefined);

    const params: Record<string, Record<string, unknown>> = {};
    for (const s of scenes) {
      params[s.sceneId] = s.params;
    }

    // Use adaptive graph if strategy supports branching
    if (strategy.conversionStrategy.touchpointCount > 3) {
      return this.graphBuilder.buildAdaptive({ strategy, scenes: sceneDefs, params });
    }

    return this.graphBuilder.buildLinear({ strategy, scenes: sceneDefs, params });
  }

  private buildPageExperiences(
    input: ExperienceOSInput,
    scenes: SelectedScene[]
  ): PageExperience[] {
    return input.pages.map(page => ({
      pagePath: page.path,
      title: page.title,
      sceneIds: scenes.filter(s =>
        page.sections.some(section =>
          s.sceneId.toLowerCase().includes(section.toLowerCase()) ||
          section.toLowerCase().includes(s.sceneId.split('-')[0])
        )
      ).map(s => s.sceneId),
    }));
  }

  private buildGlobalSettings(strategy: ExperienceStrategy): GlobalExperienceSettings {
    const animationLevels: Record<string, GlobalExperienceSettings['animationLevel']> = {
      cinematic: 'expressive',
      luxury: 'moderate',
      minimal: 'subtle',
      editorial: 'moderate',
      premium: 'moderate',
      enterprise: 'subtle',
      playful: 'expressive',
      storytelling: 'moderate',
      futuristic: 'expressive',
      organic: 'subtle',
      brutalist: 'expressive',
    };

    return {
      animationLevel: animationLevels[strategy.style] ?? 'moderate',
      reducedMotion: false,
      scrollBehavior: strategy.pacingStrategy.useScrollSnap ? 'smooth' : 'auto',
      fontLoading: 'swap',
      imageLoading: 'lazy',
      darkMode: strategy.style === 'luxury' || strategy.style === 'cinematic' ? 'dark' : 'auto',
    };
  }

  private validate(data: {
    strategy: ExperienceStrategy;
    graph: ExperienceGraph;
    scenes: SelectedScene[];
    pageExperiences: PageExperience[];
    globalSettings: GlobalExperienceSettings;
    knowledgeRefs: KnowledgeReference[];
  }): ExperienceValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate strategy
    if (!data.strategy.style) errors.push('Missing experience style');
    if (!data.strategy.narrativeArc) errors.push('Missing narrative arc');
    if (!data.strategy.conversionStrategy) errors.push('Missing conversion strategy');

    // Validate graph
    if (data.graph.nodes.length < 3) warnings.push('Graph has fewer than 3 nodes');
    if (data.graph.entryPoints.length === 0) errors.push('No entry points in graph');
    if (data.graph.exitPoints.length === 0) errors.push('No exit points in graph');

    // Validate scenes
    if (data.scenes.length < 3) warnings.push('Fewer than 3 scenes selected');
    if (!data.scenes.some(s => s.sceneId.startsWith('hero'))) warnings.push('No hero scene selected');

    // Validate pages
    if (data.pageExperiences.length === 0) warnings.push('No page experiences defined');

    // Calculate score
    let score = 100;
    score -= errors.length * 20;
    score -= warnings.length * 5;
    score = Math.max(0, Math.min(100, score));

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score,
    };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function wrap<T>(value: T, layer: string, confidence: number): ProvenanceAware<T> {
  return {
    value,
    provenance: {
      layer: layer as Provenance['layer'],
      confidence,
      evidence: [],
      timestamp: new Date(),
      reasoning: `Generated by ${layer}`,
      source: 'experience-os-v2',
    },
  };
}

// ─── Strategy → Capability Selection ────────────────────────────────────────
// (Defined in ./capability-selection.ts; re-exported here for a single public surface.)

export {
  deriveLevelFromStyle,
  strategyToSelectionInput,
  selectCapabilitiesForStrategy,
} from './capability-selection.js';

// ─── Factory ────────────────────────────────────────────────────────────────

export function createExperienceOS(): ExperienceOS {
  return new ExperienceOS();
}

// ─── Re-exports ─────────────────────────────────────────────────────────────

export type {
  ExperienceStrategy,
  ExperienceGraph,
  ExperienceBlueprintV2,
  SelectedScene,
  PageExperience,
  GlobalExperienceSettings,
  KnowledgeReference,
  ExperienceValidation,
  ExperienceStyle,
} from './types.js';

export { ExperienceStrategyEngine, createExperienceStrategyEngine } from './strategy-engine.js';
export { ExperienceGraphBuilder, createExperienceGraphBuilder } from './experience-graph.js';
export { ExperienceKnowledgeBase, createExperienceKnowledgeBase } from './knowledge-base.js';
export {
  getAllScenes,
  getScene,
  getScenesByCategory,
  getScenesByRole,
  getScenesForIndustry,
  buildSceneSequence,
  canScenesCompose,
  getCompatibleNextScenes,
  getCompatiblePrevScenes,
} from './scene-library/index.js';

// Adapter (integrates with legacy pipeline)
export { ExperienceOSAdapter, createExperienceOSAdapter } from './adapter.js';
