/**
 * Learning Mechanism
 * ===================
 *
 * Tracks usage, stores successful classifications, and builds a learned
 * knowledge cache. Enables the system to improve over time without code changes.
 *
 * Features:
 * - Usage tracking (which packs are used, how often)
 * - Classification history (successful prompt → classification mappings)
 * - Confidence analytics (which industries have low confidence → need new packs)
 * - Pack performance scoring (based on downstream success)
 */

import type { TaxonomyPath, BusinessClassification, KnowledgePack } from './types.js';

// ─── Usage Tracking ─────────────────────────────────────────────────────────

export interface PackUsageRecord {
  /** Taxonomy path of the pack used */
  taxonomyPath: TaxonomyPath;
  /** Timestamp of usage */
  timestamp: number;
  /** Confidence score at time of use */
  confidence: number;
  /** Whether the pack was synthesized (no built-in match) */
  synthesized: boolean;
  /** How the pack was matched */
  matchMethod: string;
  /** Original prompt (hashed for privacy) */
  promptHash: string;
}

export interface UsageStats {
  /** Total number of resolutions */
  totalResolutions: number;
  /** Resolutions by taxonomy path */
  byPath: Record<TaxonomyPath, number>;
  /** Resolutions by match method */
  byMethod: Record<string, number>;
  /** Average confidence across all resolutions */
  averageConfidence: number;
  /** Percentage of resolutions that used synthesized packs */
  synthesizedRate: number;
  /** Most commonly used paths */
  topPaths: Array<{ path: TaxonomyPath; count: number }>;
  /** Paths with low confidence (candidates for new packs) */
  lowConfidencePaths: Array<{ path: TaxonomyPath; avgConfidence: number; count: number }>;
}

// ─── Classification History ─────────────────────────────────────────────────

export interface ClassificationRecord {
  /** Original prompt */
  prompt: string;
  /** The classification that was applied */
  classification: BusinessClassification;
  /** The pack that was used (if any) */
  packId: TaxonomyPath | null;
  /** Confidence score */
  confidence: number;
  /** Timestamp */
  timestamp: number;
  /** Whether the build succeeded */
  buildSuccess?: boolean;
}

// ─── Learning Store ─────────────────────────────────────────────────────────

/**
 * In-memory learning store.
 * In production, this would persist to disk or database.
 */
class LearningStore {
  private usageRecords: PackUsageRecord[] = [];
  private classificationHistory: ClassificationRecord[] = [];
  private maxRecords = 10000;

  /**
   * Record a pack usage event.
   */
  recordUsage(record: PackUsageRecord): void {
    this.usageRecords.push(record);
    if (this.usageRecords.length > this.maxRecords) {
      this.usageRecords = this.usageRecords.slice(-this.maxRecords);
    }
  }

  /**
   * Record a classification with outcome.
   */
  recordClassification(record: ClassificationRecord): void {
    this.classificationHistory.push(record);
    if (this.classificationHistory.length > this.maxRecords) {
      this.classificationHistory = this.classificationHistory.slice(-this.maxRecords);
    }
  }

  /**
   * Update build success for a classification.
   */
  updateBuildSuccess(promptHash: string, success: boolean): void {
    const record = this.classificationHistory.find(
      r => hashPrompt(r.prompt) === promptHash
    );
    if (record) {
      record.buildSuccess = success;
    }
  }

  /**
   * Get usage statistics.
   */
  getUsageStats(): UsageStats {
    const total = this.usageRecords.length;
    if (total === 0) {
      return {
        totalResolutions: 0,
        byPath: {},
        byMethod: {},
        averageConfidence: 0,
        synthesizedRate: 0,
        topPaths: [],
        lowConfidencePaths: [],
      };
    }

    // Count by path
    const byPath: Record<TaxonomyPath, number> = {};
    for (const record of this.usageRecords) {
      byPath[record.taxonomyPath] = (byPath[record.taxonomyPath] || 0) + 1;
    }

    // Count by method
    const byMethod: Record<string, number> = {};
    for (const record of this.usageRecords) {
      byMethod[record.matchMethod] = (byMethod[record.matchMethod] || 0) + 1;
    }

    // Average confidence
    const totalConfidence = this.usageRecords.reduce((sum, r) => sum + r.confidence, 0);
    const averageConfidence = totalConfidence / total;

    // Synthesized rate
    const synthesizedCount = this.usageRecords.filter(r => r.synthesized).length;
    const synthesizedRate = synthesizedCount / total;

    // Top paths
    const topPaths = Object.entries(byPath)
      .map(([path, count]) => ({ path: path as TaxonomyPath, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Low confidence paths (need new packs)
    const pathConfidences: Record<TaxonomyPath, { total: number; count: number }> = {};
    for (const record of this.usageRecords) {
      if (!pathConfidences[record.taxonomyPath]) {
        pathConfidences[record.taxonomyPath] = { total: 0, count: 0 };
      }
      pathConfidences[record.taxonomyPath].total += record.confidence;
      pathConfidences[record.taxonomyPath].count += 1;
    }

    const lowConfidencePaths = Object.entries(pathConfidences)
      .map(([path, data]) => ({
        path: path as TaxonomyPath,
        avgConfidence: data.total / data.count,
        count: data.count,
      }))
      .filter(p => p.avgConfidence < 0.6 && p.count >= 3)
      .sort((a, b) => a.avgConfidence - b.avgConfidence)
      .slice(0, 10);

    return {
      totalResolutions: total,
      byPath,
      byMethod,
      averageConfidence,
      synthesizedRate,
      topPaths,
      lowConfidencePaths,
    };
  }

  /**
   * Get recent classifications for a path.
   */
  getRecentClassifications(path: TaxonomyPath, limit = 10): ClassificationRecord[] {
    return this.classificationHistory
      .filter(r => r.classification.vertical.path === path)
      .slice(-limit);
  }

  /**
   * Get build success rate for a path.
   */
  getBuildSuccessRate(path: TaxonomyPath): number {
    const records = this.classificationHistory.filter(
      r => r.classification.vertical.path === path && r.buildSuccess !== undefined
    );
    if (records.length === 0) return 0;
    const successes = records.filter(r => r.buildSuccess).length;
    return successes / records.length;
  }

  /**
   * Export learning data for persistence.
   */
  exportData(): {
    usageRecords: PackUsageRecord[];
    classificationHistory: ClassificationRecord[];
  } {
    return {
      usageRecords: [...this.usageRecords],
      classificationHistory: [...this.classificationHistory],
    };
  }

  /**
   * Import learning data from persistence.
   */
  importData(data: {
    usageRecords: PackUsageRecord[];
    classificationHistory: ClassificationRecord[];
  }): void {
    this.usageRecords = data.usageRecords.slice(-this.maxRecords);
    this.classificationHistory = data.classificationHistory.slice(-this.maxRecords);
  }

  /**
   * Clear all learning data.
   */
  clear(): void {
    this.usageRecords = [];
    this.classificationHistory = [];
  }
}

// ─── Singleton Store ────────────────────────────────────────────────────────

const store = new LearningStore();

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Record a resolution event.
 * Called by the resolver after each successful classification.
 */
export function recordResolution(params: {
  taxonomyPath: TaxonomyPath;
  confidence: number;
  synthesized: boolean;
  matchMethod: string;
  prompt: string;
  classification: BusinessClassification;
  packId: TaxonomyPath | null;
}): void {
  store.recordUsage({
    taxonomyPath: params.taxonomyPath,
    timestamp: Date.now(),
    confidence: params.confidence,
    synthesized: params.synthesized,
    matchMethod: params.matchMethod,
    promptHash: hashPrompt(params.prompt),
  });

  store.recordClassification({
    prompt: params.prompt,
    classification: params.classification,
    packId: params.packId,
    confidence: params.confidence,
    timestamp: Date.now(),
  });
}

/**
 * Record build outcome for a classification.
 */
export function recordBuildOutcome(prompt: string, success: boolean): void {
  store.updateBuildSuccess(hashPrompt(prompt), success);
}

/**
 * Get usage statistics.
 */
export function getUsageStats(): UsageStats {
  return store.getUsageStats();
}

/**
 * Get recommendations for which new packs to create.
 * Based on low confidence paths and high synthesized rates.
 */
export function getPackRecommendations(): Array<{
  path: TaxonomyPath;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  usageCount: number;
}> {
  const stats = store.getUsageStats();
  const recommendations: Array<{
    path: TaxonomyPath;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    usageCount: number;
  }> = [];

  // Low confidence paths need better packs
  for (const item of stats.lowConfidencePaths) {
    recommendations.push({
      path: item.path,
      reason: `Low average confidence (${(item.avgConfidence * 100).toFixed(0)}%) across ${item.count} uses. A dedicated knowledge pack would improve quality.`,
      priority: item.avgConfidence < 0.4 ? 'high' : 'medium',
      usageCount: item.count,
    });
  }

  // Highly used paths without built-in packs
  const synthesizedPaths = Object.entries(stats.byPath)
    .filter(([path]) => {
      const recentRecords = store.getRecentClassifications(path as TaxonomyPath, 5);
      return recentRecords.some(r => !r.packId);
    })
    .sort((a, b) => b[1] - a[1]);

  for (const [path, count] of synthesizedPaths.slice(0, 5)) {
    if (!recommendations.find(r => r.path === path)) {
      recommendations.push({
        path: path as TaxonomyPath,
        reason: `Used ${count} times with synthesized packs. A dedicated pack would improve quality and performance.`,
        priority: count > 10 ? 'high' : 'medium',
        usageCount: count,
      });
    }
  }

  return recommendations.sort((a, b) => {
    if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (a.priority !== 'high' && b.priority === 'high') return 1;
    return b.usageCount - a.usageCount;
  });
}

/**
 * Check if a classification has been used successfully before.
 */
export function hasSuccessfulClassification(prompt: string): boolean {
  const hash = hashPrompt(prompt);
  return store.getUsageStats().totalResolutions > 0 &&
    store.getRecentClassifications(hash as TaxonomyPath, 1).some(r => r.buildSuccess);
}

/**
 * Export learning data for persistence.
 */
export function exportLearningData() {
  return store.exportData();
}

/**
 * Import learning data from persistence.
 */
export function importLearningData(data: ReturnType<typeof store.exportData>): void {
  store.importData(data);
}

/**
 * Clear all learning data.
 */
export function clearLearningData(): void {
  store.clear();
}

/**
 * Get the learning store (for advanced usage).
 */
export function getLearningStore(): typeof store {
  return store;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function hashPrompt(prompt: string): string {
  // Simple hash for prompt privacy — not cryptographic
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `prompt_${Math.abs(hash).toString(36)}`;
}
