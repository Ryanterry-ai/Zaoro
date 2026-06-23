/**
 * Failure Store: Persists error signatures and their successful fixes
 * to a local JSON file for cross-build learning.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { FixPattern, ErrorCategory } from './fix-patterns.js';

export interface StoredFailure {
  id: string;
  errorSignature: string;
  errorMessage: string;
  errorCategory: ErrorCategory;
  file?: string | undefined;
  line?: number | undefined;
  fixApplied: string;
  fixSuccess: boolean;
  timestamp: string;
  buildId?: string | undefined;
}

export interface FailureStoreData {
  failures: StoredFailure[];
  patterns: FixPattern[];
  stats: {
    totalFailures: number;
    totalFixes: number;
    successRate: number;
  };
}

export class FailureStore {
  private storePath: string;
  private data: FailureStoreData;

  constructor(workspacePath: string) {
    this.storePath = path.join(workspacePath, '.healing-memory.json');
    this.data = this.load();
  }

  /**
   * Record a failure and its fix attempt.
   */
  recordFailure(failure: Omit<StoredFailure, 'id' | 'timestamp'>): string {
    const id = `fail_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const entry: StoredFailure = {
      ...failure,
      id,
      timestamp: new Date().toISOString(),
    };

    this.data.failures.push(entry);
    this.data.stats.totalFailures++;
    if (failure.fixApplied) {
      this.data.stats.totalFixes++;
    }
    this.data.stats.successRate = this.data.stats.totalFixes / Math.max(1, this.data.stats.totalFailures);

    this.persist();
    return id;
  }

  /**
   * Find matching failures by error signature.
   */
  findMatchingFailures(errorMessage: string, limit = 5): StoredFailure[] {
    const normalized = this.normalizeError(errorMessage);
    return this.data.failures
      .filter(f => this.normalizeError(f.errorMessage).includes(normalized) ||
                   normalized.includes(this.normalizeError(f.errorMessage)))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Find successful fixes for a given error.
   */
  findSuccessfulFixes(errorMessage: string): StoredFailure[] {
    return this.data.failures
      .filter(f => f.fixSuccess && this.matchesError(f.errorMessage, errorMessage))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Check if a known fix exists for this error.
   */
  hasKnownFix(errorMessage: string): boolean {
    return this.findSuccessfulFixes(errorMessage).length > 0;
  }

  /**
   * Get the most common successful fix for an error.
   */
  getBestFix(errorMessage: string): string | null {
    const fixes = this.findSuccessfulFixes(errorMessage);
    if (fixes.length === 0) return null;

    // Count fix occurrences
    const fixCounts = new Map<string, number>();
    for (const fix of fixes) {
      fixCounts.set(fix.fixApplied, (fixCounts.get(fix.fixApplied) ?? 0) + 1);
    }

    // Return most common fix
    let bestFix = '';
    let bestCount = 0;
    for (const [fix, count] of fixCounts) {
      if (count > bestCount) {
        bestFix = fix;
        bestCount = count;
      }
    }

    return bestFix;
  }

  /**
   * Get failure statistics.
   */
  getStats(): FailureStoreData['stats'] {
    return { ...this.data.stats };
  }

  /**
   * Get all stored failures.
   */
  getAll(): StoredFailure[] {
    return [...this.data.failures];
  }

  /**
   * Get stored patterns.
   */
  getPatterns(): FixPattern[] {
    return [...this.data.patterns];
  }

  /**
   * Update patterns (from FixPatterns class).
   */
  setPatterns(patterns: FixPattern[]): void {
    this.data.patterns = patterns;
    this.persist();
  }

  /**
   * Clear old entries (older than specified days).
   */
  prune(maxAgeDays = 30): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxAgeDays);
    const cutoffTime = cutoff.getTime();

    const beforeCount = this.data.failures.length;
    this.data.failures = this.data.failures.filter(f =>
      new Date(f.timestamp).getTime() > cutoffTime
    );

    const pruned = beforeCount - this.data.failures.length;
    if (pruned > 0) {
      this.persist();
    }

    return pruned;
  }

  private normalizeError(error: string): string {
    return error
      .replace(/\s+/g, ' ')
      .replace(/['"]/g, '')
      .replace(/\d+/g, 'N')
      .toLowerCase()
      .trim();
  }

  private matchesError(stored: string, incoming: string): boolean {
    const a = this.normalizeError(stored);
    const b = this.normalizeError(incoming);
    return a === b || a.includes(b) || b.includes(a);
  }

  private load(): FailureStoreData {
    try {
      if (fs.existsSync(this.storePath)) {
        const raw = fs.readFileSync(this.storePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {
      // Ignore parse errors
    }

    return {
      failures: [],
      patterns: [],
      stats: {
        totalFailures: 0,
        totalFixes: 0,
        successRate: 0,
      },
    };
  }

  private persist(): void {
    try {
      fs.writeFileSync(this.storePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn(`[failure-store] Failed to persist: ${err.message}`);
    }
  }
}
