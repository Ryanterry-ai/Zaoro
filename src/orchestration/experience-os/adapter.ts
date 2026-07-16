// ─── Experience OS v2 — Pipeline Integration ────────────────────────────────
//
// Adapter that allows Experience OS v2 to be plugged into the existing
// deterministic pipeline as the experience-intelligence layer.
//
// The adapter converts between:
//   - BusinessKnowledge (from business-intelligence layer)
//   - ExperienceBlueprint v2 (from Experience OS)
//   - Legacy ExperienceBlueprint (from experience-intelligence layer)
//
// This enables a gradual migration from the old 14-step pipeline to the
// new Experience OS v2 strategic approach.
// ─────────────────────────────────────────────────────────────────────────────

import type { BusinessKnowledge } from '../business-intelligence/types.js';
import type { ExperienceBlueprint } from '../experience-intelligence/types.js';
import type {
  ExperienceBlueprintV2,
  ExperienceStrategy,
  ExperienceGraph,
  SelectedScene,
  GlobalExperienceSettings,
} from './types.js';
import { ExperienceOS, createExperienceOS } from './index.js';
import type { Industry } from '../types.js';

// ─── Adapter ────────────────────────────────────────────────────────────────

/**
 * Adapter that runs Experience OS v2 to produce a blueprint
 * compatible with the legacy pipeline's experience-intelligence interface.
 */
export class ExperienceOSAdapter {
  private os: ExperienceOS;

  constructor(os?: ExperienceOS) {
    this.os = os ?? createExperienceOS();
  }

  /**
   * Process a business knowledge to produce an experience blueprint.
   * This matches the signature of the legacy experience-intelligence engine.
   */
  async process(bk: BusinessKnowledge): Promise<ExperienceBlueprint> {
    const industry: Industry = (bk.discovery?.industry ?? 'saas') as Industry;
    const v2 = this.os.generate({
      industry,
      subIndustry: bk.discovery?.subIndustry,
      pageType: 'home',
      pages: this.extractPages(bk),
      personality: bk.businessPersonas?.[0]?.label,
      businessGoal: bk.revenue?.model,
      targetAudience: bk.customerPersonas?.[0]?.label,
    });

    return this.toLegacyBlueprint(v2, bk);
  }

  /**
   * Extract pages from business knowledge.
   */
  private extractPages(bk: BusinessKnowledge): Array<{ path: string; title: string; sections: string[] }> {
    const pages = bk.pages ?? [];
    if (pages.length === 0) {
      return [
        { path: '/', title: 'Home', sections: ['hero', 'features', 'testimonials', 'cta'] },
        { path: '/about', title: 'About', sections: ['story', 'team'] },
        { path: '/contact', title: 'Contact', sections: ['form'] },
      ];
    }

    return pages.map(page => ({
      path: page.path ?? '/',
      title: page.purpose ?? 'Page',
      sections: ['hero', 'content'],
    }));
  }

  /**
   * Convert ExperienceBlueprintV2 to legacy ExperienceBlueprint format.
   */
  private toLegacyBlueprint(v2: ExperienceBlueprintV2, bk: BusinessKnowledge): ExperienceBlueprint {
    const strategy = v2.strategy.value;
    const scenes = v2.scenes.value;
    const graph = v2.graph.value;
    const industry: Industry = (bk.discovery?.industry ?? 'saas') as Industry;

    // Strategy-driven, deterministic motion capability set (M3: propagated downstream).
    const motionCapabilities = this.os.selectCapabilities().map(c => c.id);

    return {
      id: v2.id,
      version: '2.0.0',
      industry,
      narrative: {
        story: this.buildStory(strategy),
        persona: bk.businessPersonas?.[0]?.label ?? 'default',
        arcType: strategy.narrativeArc.type,
        emotionalBeats: strategy.emotionalJourney.points.map(p => p.emotion),
      } as any,
      experience: {
        style: strategy.style,
        pacing: strategy.pacingStrategy.pace,
        density: strategy.densityStrategy.body,
        animationLevel: v2.globalSettings.value.animationLevel,
        scrollBehavior: v2.globalSettings.value.scrollBehavior,
      } as any,
      scenes: scenes.map(s => ({
        id: s.sceneId,
        name: s.sceneId,
        order: s.order,
        params: s.params,
        content: this.buildSceneContent(s, bk),
      })) as any,
      sections: scenes.map(s => ({
        id: `section-${s.order}`,
        sceneId: s.sceneId,
        order: s.order,
        content: s.params,
      })) as any,
      conversionStrategy: {
        primaryGoal: strategy.conversionStrategy.primaryGoal,
        touchpointCount: strategy.conversionStrategy.touchpointCount,
        trustSignals: strategy.conversionStrategy.trustSignals,
      } as any,
      metadata: {
        generatedAt: v2.createdAt,
        strategyId: strategy.id,
        graphId: graph.id,
        validationScore: v2.validation.score,
        sourceLayer: 'experience-os-v2',
        motionCapabilities,
      } as any,
    } as unknown as ExperienceBlueprint;
  }

  /**
   * Build the narrative story from strategy.
   */
  private buildStory(strategy: ExperienceStrategy): string {
    return `${strategy.style} experience for ${strategy.industry} with a ${strategy.narrativeArc.type} narrative arc, ${strategy.pacingStrategy.pace} pacing, and ${strategy.conversionStrategy.primaryGoal} as the primary conversion goal.`;
  }

  /**
   * Build content for a scene from business knowledge.
   */
  private buildSceneContent(scene: SelectedScene, bk: BusinessKnowledge): string {
    const params = scene.params;
    if (params.title) return String(params.title);
    if (params.subtitle) return String(params.subtitle);
    return `${scene.sceneId} for ${bk.discovery?.businessType ?? 'business'}`;
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

export function createExperienceOSAdapter(): ExperienceOSAdapter {
  return new ExperienceOSAdapter();
}
