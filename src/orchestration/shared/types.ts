/**
 * Shared Types - Used across multiple layers
 *
 * This file contains types that are shared across multiple intelligence layers.
 * Each type is defined once and imported everywhere else.
 */

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validation result - shared across all layers.
 */
export interface ValidationResult {
  /** Is valid */
  valid: boolean;

  /** Validation issues */
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  /** Issue severity */
  severity: 'error' | 'warning' | 'info';

  /** Issue message */
  message: string;

  /** Field path */
  field?: string;

  /** Suggested fix */
  fix?: string;
}
