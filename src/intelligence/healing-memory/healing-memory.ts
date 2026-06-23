/**
 * Healing Memory: Coordinates fix patterns and failure store to provide
 * intelligent error resolution without unnecessary LLM calls.
 */

import { FixPatterns, type FixPattern, type ErrorCategory } from './fix-patterns.js';
import { FailureStore, type StoredFailure } from './failure-store.js';

export interface HealingResult {
  knownFix: boolean;
  fixPattern: FixPattern | null;
  historicalFixes: StoredFailure[];
  recommendedFix: string | null;
  confidence: number;
  shouldCallLLM: boolean;
}

export interface HealingMemoryOptions {
  workspacePath: string;
  confidenceThreshold?: number;
}

export class HealingMemory {
  private fixPatterns: FixPatterns;
  private failureStore: FailureStore;
  private confidenceThreshold: number;

  constructor(options: HealingMemoryOptions) {
    this.fixPatterns = new FixPatterns();
    this.failureStore = new FailureStore(options.workspacePath);
    this.confidenceThreshold = options.confidenceThreshold ?? 0.7;

    // Load stored patterns into fix patterns
    const storedPatterns = this.failureStore.getPatterns();
    if (storedPatterns.length > 0) {
      this.fixPatterns.load(storedPatterns);
    }
  }

  /**
   * Analyze an error and determine if we have a known fix.
   * Returns healing recommendation without calling LLM if possible.
   */
  analyze(error: {
    message: string;
    file?: string;
    line?: number;
    category?: ErrorCategory;
  }): HealingResult {
    console.log(`[healing-memory] Analyzing error: ${error.message.slice(0, 100)}`);

    // Step 1: Check fix patterns for known solutions
    const fixPattern = this.fixPatterns.match(error.message);

    // Step 2: Check historical successful fixes
    const historicalFixes = this.failureStore.findSuccessfulFixes(error.message);

    // Step 3: Determine best recommended fix
    let recommendedFix: string | null = null;
    let confidence = 0;

    if (fixPattern && fixPattern.confidence >= this.confidenceThreshold) {
      recommendedFix = fixPattern.fixCode || fixPattern.fixDescription;
      confidence = fixPattern.confidence;
    }

    if (historicalFixes.length > 0) {
      const bestHistorical = this.failureStore.getBestFix(error.message);
      if (bestHistorical && (!recommendedFix || historicalFixes.length > 3)) {
        recommendedFix = bestHistorical;
        confidence = Math.min(1.0, 0.5 + (historicalFixes.length * 0.1));
      }
    }

    const knownFix = recommendedFix !== null && confidence >= this.confidenceThreshold;
    const shouldCallLLM = !knownFix;

    console.log(`[healing-memory] Known fix: ${knownFix}, Confidence: ${confidence.toFixed(2)}, Should call LLM: ${shouldCallLLM}`);

    return {
      knownFix,
      fixPattern,
      historicalFixes,
      recommendedFix,
      confidence,
      shouldCallLLM,
    };
  }

  /**
   * Record that a fix was attempted and whether it succeeded.
   */
  recordFixResult(
    error: { message: string; file?: string; line?: number; category?: ErrorCategory },
    fixApplied: string,
    success: boolean,
    buildId?: string,
  ): void {
    // Record in failure store
    this.failureStore.recordFailure({
      errorSignature: error.message.slice(0, 200),
      errorMessage: error.message,
      errorCategory: error.category ?? 'runtime-error',
      file: error.file,
      line: error.line,
      fixApplied,
      fixSuccess: success,
      buildId,
    });

    // Update fix pattern confidence
    if (this.fixPatterns) {
      const pattern = this.fixPatterns.match(error.message);
      if (pattern) {
        if (success) {
          this.fixPatterns.recordSuccess(pattern.id);
        } else {
          this.fixPatterns.recordFailure(pattern.id);
        }
      }
    }

    // Persist updated patterns
    this.failureStore.setPatterns(this.fixPatterns.serialize());
  }

  /**
   * Check if an error has a known fix before calling LLM.
   */
  hasKnownFix(errorMessage: string): boolean {
    return this.failureStore.hasKnownFix(errorMessage);
  }

  /**
   * Get memory statistics.
   */
  getStats(): {
    totalFailures: number;
    totalFixes: number;
    successRate: number;
    knownPatterns: number;
  } {
    return {
      ...this.failureStore.getStats(),
      knownPatterns: this.fixPatterns.getAll().length,
    };
  }

  /**
   * Get all fix patterns.
   */
  getPatterns(): FixPattern[] {
    return this.fixPatterns.getAll();
  }

  /**
   * Prune old entries.
   */
  prune(maxAgeDays = 30): number {
    return this.failureStore.prune(maxAgeDays);
  }
}
