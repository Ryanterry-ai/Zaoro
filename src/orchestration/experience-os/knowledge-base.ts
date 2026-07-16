// ─── Experience Knowledge Base ───────────────────────────────────────────────
//
// Captures successful experience patterns from every build.
// The system continuously improves instead of regenerating from scratch.
//
// Flow:
//   Build completes → Extract patterns → Store in knowledge base
//   New project starts → Query knowledge base → Apply proven patterns
//
// This turns the platform from a code generator into a learning system.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ExperiencePattern,
  PatternCategory,
  PatternDefinition,
  PatternMetrics,
  ExperienceStrategy,
  ExperienceGraph,
  ExperienceBlueprintV2,
  KnowledgeReference,
  ExperienceStyle,
} from './types.js';

// ─── Knowledge Base ─────────────────────────────────────────────────────────

export interface KnowledgeBaseConfig {
  /** Maximum patterns to store */
  maxPatterns: number;
  /** Minimum confidence to auto-apply */
  minConfidence: number;
  /** Minimum sample size to consider a pattern proven */
  minSampleSize: number;
}

const DEFAULT_CONFIG: KnowledgeBaseConfig = {
  maxPatterns: 1000,
  minConfidence: 0.7,
  minSampleSize: 3,
};

/**
 * Experience Knowledge Base — captures and retrieves experience patterns.
 */
export class ExperienceKnowledgeBase {
  private patterns: Map<string, ExperiencePattern> = new Map();
  private config: KnowledgeBaseConfig;

  constructor(config?: Partial<KnowledgeBaseConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.seedDefaultPatterns();
  }

  // ─── Query ──────────────────────────────────────────────────────────────

  /**
   * Find patterns matching criteria.
   */
  query(opts: {
    category?: PatternCategory;
    industry?: string;
    style?: ExperienceStyle;
    minConfidence?: number;
    limit?: number;
  }): ExperiencePattern[] {
    const { category, industry, style, minConfidence = 0, limit = 10 } = opts;

    let results = Array.from(this.patterns.values());

    if (category) {
      results = results.filter(p => p.category === category);
    }
    if (industry) {
      results = results.filter(p =>
        p.industries.length === 0 || p.industries.includes(industry)
      );
    }
    if (style) {
      results = results.filter(p =>
        p.pattern.data?.style === style || !p.pattern.data?.style
      );
    }

    // Sort by effectiveness * usage
    results.sort((a, b) => {
      const scoreA = this.patternScore(a);
      const scoreB = this.patternScore(b);
      return scoreB - scoreA;
    });

    return results
      .filter(p => this.patternScore(p) >= minConfidence)
      .slice(0, limit);
  }

  /**
   * Get recommended patterns for a new project.
   */
  getRecommendations(input: {
    industry: string;
    style: ExperienceStyle;
    pageType: string;
    sections: string[];
  }): KnowledgeReference[] {
    const patterns = this.query({
      industry: input.industry,
      limit: 20,
    });

    return patterns.map(p => ({
      patternId: p.id,
      patternName: p.name,
      relevanceScore: this.relevanceScore(p, input),
      appliedTo: p.category,
    })).filter(r => r.relevanceScore >= this.config.minConfidence);
  }

  // ─── Store ──────────────────────────────────────────────────────────────

  /**
   * Capture a pattern from a completed build.
   */
  capture(opts: {
    name: string;
    category: PatternCategory;
    industries: string[];
    pattern: PatternDefinition;
    metrics?: Partial<PatternMetrics>;
  }): ExperiencePattern {
    const id = `pattern-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const experiencePattern: ExperiencePattern = {
      id,
      name: opts.name,
      category: opts.category,
      industries: opts.industries,
      pattern: opts.pattern,
      metrics: {
        sampleSize: 1,
        ...opts.metrics,
      },
      usageCount: 0,
      lastUsedAt: now,
      createdAt: now,
    };

    this.patterns.set(id, experiencePattern);
    this.trimToCapacity();
    return experiencePattern;
  }

  /**
   * Capture patterns from a completed ExperienceBlueprint.
   */
  captureFromBlueprint(blueprint: ExperienceBlueprintV2): ExperiencePattern[] {
    const captured: ExperiencePattern[] = [];

    // Capture the narrative structure pattern
    const strategy = blueprint.strategy.value;
    captured.push(this.capture({
      name: `${strategy.industry}-${strategy.style}-narrative`,
      category: 'narrative-structure',
      industries: [strategy.industry],
      pattern: {
        narrativeArc: strategy.narrativeArc.type,
        sceneSequence: blueprint.scenes.value.map(s => s.sceneId),
        data: { style: strategy.style, emotionalArc: strategy.narrativeArc.emotionalArc },
      },
    }));

    // Capture the conversion flow pattern
    captured.push(this.capture({
      name: `${strategy.industry}-${strategy.conversionStrategy.primaryGoal}-conversion`,
      category: 'conversion-flow',
      industries: [strategy.industry],
      pattern: {
        conversionStrategy: strategy.conversionStrategy.primaryGoal,
        data: {
          trustSignals: strategy.conversionStrategy.trustSignals,
          urgency: strategy.conversionStrategy.urgency,
          frictionReduction: strategy.conversionStrategy.frictionReduction,
        },
      },
    }));

    // Capture the scene composition pattern
    const sceneSequence = blueprint.scenes.value.map(s => s.sceneId);
    captured.push(this.capture({
      name: `${strategy.industry}-composition`,
      category: 'scene-composition',
      industries: [strategy.industry],
      pattern: {
        sceneSequence,
        data: { pageType: blueprint.pageExperiences.value[0]?.title ?? 'unknown' },
      },
    }));

    // Capture the pacing strategy
    captured.push(this.capture({
      name: `${strategy.industry}-${strategy.pacingStrategy.pace}-pacing`,
      category: 'pacing-strategy',
      industries: [strategy.industry],
      pattern: {
        data: {
          pace: strategy.pacingStrategy.pace,
          beatIntervalMs: strategy.pacingStrategy.beatIntervalMs,
          useScrollSnap: strategy.pacingStrategy.useScrollSnap,
        },
      },
    }));

    return captured;
  }

  /**
   * Update metrics for a pattern after observing user behavior.
   */
  updateMetrics(patternId: string, metrics: Partial<PatternMetrics>): void {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return;

    pattern.metrics = {
      ...pattern.metrics,
      ...metrics,
      sampleSize: pattern.metrics.sampleSize + 1,
    };
    pattern.usageCount++;
    pattern.lastUsedAt = new Date().toISOString();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private patternScore(pattern: ExperiencePattern): number {
    const effectiveness = (
      (pattern.metrics.conversionLift ?? 0) * 0.3 +
      (pattern.metrics.engagementScore ?? 0.5) * 0.3 +
      (1 - (pattern.metrics.bounceRateImpact ?? 0)) * 0.2 +
      Math.min(pattern.metrics.sampleSize / 10, 1) * 0.2
    );
    return effectiveness;
  }

  private relevanceScore(
    pattern: ExperiencePattern,
    input: { industry: string; style: ExperienceStyle; pageType: string; sections: string[] }
  ): number {
    let score = 0;

    // Industry match
    if (pattern.industries.includes(input.industry)) score += 0.4;
    else if (pattern.industries.length === 0) score += 0.2; // Universal pattern
    else score += 0.1; // Different industry

    // Style match
    if (pattern.pattern.data?.style === input.style) score += 0.3;
    else score += 0.1;

    // Effectiveness
    score += this.patternScore(pattern) * 0.3;

    return Math.min(score, 1);
  }

  private trimToCapacity(): void {
    if (this.patterns.size <= this.config.maxPatterns) return;

    const sorted = Array.from(this.patterns.values())
      .sort((a, b) => this.patternScore(a) - this.patternScore(b));

    const toRemove = sorted.slice(0, this.patterns.size - this.config.maxPatterns);
    for (const p of toRemove) {
      this.patterns.delete(p.id);
    }
  }

  /**
   * Seed the knowledge base with default patterns from proven experience design.
   */
  private seedDefaultPatterns(): void {
    // Hero-centered pattern (proven across SaaS, ecommerce)
    this.capture({
      name: 'centered-hero-with-social-proof',
      category: 'scene-composition',
      industries: ['saas', 'ecommerce', 'education'],
      pattern: {
        sceneSequence: ['hero-centered', 'social-proof-bar', 'feature-grid', 'testimonial-carousel', 'cta-banner', 'footer'],
        data: { style: 'premium', provenance: 'seed' },
      },
      metrics: { sampleSize: 50, conversionLift: 0.15, engagementScore: 0.7 },
    });

    // Split hero pattern (proven for real estate, luxury)
    this.capture({
      name: 'split-hero-with-narrative',
      category: 'scene-composition',
      industries: ['real-estate', 'luxury', 'fitness'],
      pattern: {
        sceneSequence: ['hero-split', 'content-narrative', 'stats-row', 'gallery-grid', 'testimonial-carousel', 'cta-banner', 'footer'],
        data: { style: 'luxury', provenance: 'seed' },
      },
      metrics: { sampleSize: 30, conversionLift: 0.12, engagementScore: 0.75 },
    });

    // SaaS conversion flow
    this.capture({
      name: 'saas-trust-building-flow',
      category: 'conversion-flow',
      industries: ['saas', 'fintech'],
      pattern: {
        conversionStrategy: 'trial',
        data: { trustSignals: ['partner-logos', 'security-badges', 'case-studies'], urgency: 'none' },
      },
      metrics: { sampleSize: 40, conversionLift: 0.2, engagementScore: 0.65 },
    });

    // Restaurant storytelling flow
    this.capture({
      name: 'restaurant-storytelling-flow',
      category: 'narrative-structure',
      industries: ['restaurant'],
      pattern: {
        narrativeArc: 'emotional',
        sceneSequence: ['hero-video', 'content-narrative', 'gallery-grid', 'team-grid', 'testimonial-carousel', 'contact-form', 'footer'],
        data: { style: 'editorial', emotionalArc: 'wave' },
      },
      metrics: { sampleSize: 25, conversionLift: 0.1, engagementScore: 0.8 },
    });

    // Healthcare trust pattern
    this.capture({
      name: 'healthcare-trust-pattern',
      category: 'trust-signal',
      industries: ['healthcare'],
      pattern: {
        data: { trustSignals: ['certifications', 'security-badges', 'expert-endorsement', 'testimonials'] },
      },
      metrics: { sampleSize: 35, conversionLift: 0.18, engagementScore: 0.6 },
    });

    // Fast-paced engagement pattern
    this.capture({
      name: 'fast-engagement-pattern',
      category: 'pacing-strategy',
      industries: ['fitness', 'ecommerce'],
      pattern: {
        data: { pace: 'fast', beatIntervalMs: 800, useScrollSnap: false },
      },
      metrics: { sampleSize: 20, engagementScore: 0.7 },
    });
  }

  // ─── Stats ──────────────────────────────────────────────────────────────

  /**
   * Get knowledge base statistics.
   */
  getStats(): {
    totalPatterns: number;
    byCategory: Record<PatternCategory, number>;
    byIndustry: Record<string, number>;
    avgEffectiveness: number;
  } {
    const patterns = Array.from(this.patterns.values());

    const byCategory: Record<string, number> = {};
    const byIndustry: Record<string, number> = {};

    for (const p of patterns) {
      byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
      for (const ind of p.industries) {
        byIndustry[ind] = (byIndustry[ind] ?? 0) + 1;
      }
    }

    const avgEffectiveness = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + this.patternScore(p), 0) / patterns.length
      : 0;

    return {
      totalPatterns: patterns.length,
      byCategory: byCategory as Record<PatternCategory, number>,
      byIndustry,
      avgEffectiveness,
    };
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

export function createExperienceKnowledgeBase(
  config?: Partial<KnowledgeBaseConfig>
): ExperienceKnowledgeBase {
  return new ExperienceKnowledgeBase(config);
}
