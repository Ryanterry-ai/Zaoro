/**
 * Fix Patterns: Known error signatures and their successful fixes.
 * Used to reduce unnecessary LLM calls by matching errors to known solutions.
 */

export interface FixPattern {
  id: string;
  errorSignature: string;
  errorCategory: ErrorCategory;
  fixDescription: string;
  fixCode: string;
  successCount: number;
  lastUsedAt: string;
  confidence: number;
}

export type ErrorCategory =
  | 'typescript-error'
  | 'module-resolution'
  | 'missing-export'
  | 'dependency-issue'
  | 'syntax-error'
  | 'type-mismatch'
  | 'runtime-error'
  | 'build-error';

export interface ErrorSignature {
  message: string;
  file?: string;
  line?: number;
  category: ErrorCategory;
}

// Pre-built fix patterns for common errors
const BUILTIN_PATTERNS: Omit<FixPattern, 'successCount' | 'lastUsedAt'>[] = [
  // TypeScript: Cannot find module
  {
    id: 'ts-module-not-found',
    errorSignature: "Cannot find module",
    errorCategory: 'module-resolution',
    fixDescription: 'Add missing dependency to package.json and run npm install',
    fixCode: 'npm install <package-name>',
    confidence: 0.9,
  },
  // TypeScript: Property does not exist
  {
    id: 'ts-property-not-exist',
    errorSignature: "Property .* does not exist on type",
    errorCategory: 'typescript-error',
    fixDescription: 'Add missing property to interface or type definition',
    fixCode: '',
    confidence: 0.7,
  },
  // TypeScript: Type mismatch
  {
    id: 'ts-type-mismatch',
    errorSignature: "Type .* is not assignable to type",
    errorCategory: 'type-mismatch',
    fixDescription: 'Fix type annotations or add type assertions',
    fixCode: '',
    confidence: 0.6,
  },
  // Missing export
  {
    id: 'missing-export',
    errorSignature: "has no exported member",
    errorCategory: 'missing-export',
    fixDescription: 'Add export to source file or fix import path',
    fixCode: '',
    confidence: 0.8,
  },
  // Module resolution with .js extension
  {
    id: 'module-resolution-js',
    errorSignature: "relative import .* needs explicit file extension",
    errorCategory: 'module-resolution',
    fixDescription: 'Add .js extension to relative imports for NodeNext ESM',
    fixCode: "import ... from './file.js'",
    confidence: 0.95,
  },
  // Syntax error
  {
    id: 'syntax-error',
    errorSignature: "Unexpected token",
    errorCategory: 'syntax-error',
    fixDescription: 'Fix syntax error in source file',
    fixCode: '',
    confidence: 0.5,
  },
  // exactOptionalPropertyTypes
  {
    id: 'exact-optional-property',
    errorSignature: "exactOptionalPropertyTypes",
    errorCategory: 'typescript-error',
    fixDescription: 'Add explicit undefined type to optional property or use ?? operator',
    fixCode: "property?: Type | undefined",
    confidence: 0.85,
  },
  // ESM import error
  {
    id: 'esm-import-error',
    errorSignature: "ERR_MODULE_NOT_FOUND",
    errorCategory: 'module-resolution',
    fixDescription: 'Ensure file exists and import path includes .js extension',
    fixCode: '',
    confidence: 0.9,
  },
  // Prisma client not found
  {
    id: 'prisma-client-missing',
    errorSignature: "Cannot find module '@prisma/client'",
    errorCategory: 'dependency-issue',
    fixDescription: 'Run npx prisma generate to generate Prisma client',
    fixCode: 'npx prisma generate',
    confidence: 0.95,
  },
  // React import error
  {
    id: 'react-import-error',
    errorSignature: "React.*is not defined",
    errorCategory: 'runtime-error',
    fixDescription: 'Ensure React is imported in JSX files',
    fixCode: "import React from 'react'",
    confidence: 0.9,
  },
];

export class FixPatterns {
  private patterns: Map<string, FixPattern> = new Map();

  constructor() {
    // Load built-in patterns
    for (const pattern of BUILTIN_PATTERNS) {
      this.patterns.set(pattern.id, {
        ...pattern,
        successCount: 0,
        lastUsedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Find matching fix pattern for an error message.
   */
  match(errorMessage: string): FixPattern | null {
    for (const pattern of this.patterns.values()) {
      const regex = new RegExp(pattern.errorSignature, 'i');
      if (regex.test(errorMessage)) {
        return pattern;
      }
    }
    return null;
  }

  /**
   * Find all matching fix patterns (sorted by confidence).
   */
  matchAll(errorMessage: string): FixPattern[] {
    const matches: FixPattern[] = [];
    for (const pattern of this.patterns.values()) {
      const regex = new RegExp(pattern.errorSignature, 'i');
      if (regex.test(errorMessage)) {
        matches.push(pattern);
      }
    }
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Record successful fix usage.
   */
  recordSuccess(patternId: string): void {
    const pattern = this.patterns.get(patternId);
    if (pattern) {
      pattern.successCount++;
      pattern.lastUsedAt = new Date().toISOString();
      // Increase confidence slightly on success
      pattern.confidence = Math.min(1.0, pattern.confidence + 0.02);
    }
  }

  /**
   * Record failed fix usage (decrease confidence).
   */
  recordFailure(patternId: string): void {
    const pattern = this.patterns.get(patternId);
    if (pattern) {
      pattern.confidence = Math.max(0.1, pattern.confidence - 0.1);
    }
  }

  /**
   * Add a custom fix pattern.
   */
  addPattern(pattern: Omit<FixPattern, 'successCount' | 'lastUsedAt'>): void {
    this.patterns.set(pattern.id, {
      ...pattern,
      successCount: 0,
      lastUsedAt: new Date().toISOString(),
    });
  }

  /**
   * Get all patterns.
   */
  getAll(): FixPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get pattern by ID.
   */
  get(patternId: string): FixPattern | undefined {
    return this.patterns.get(patternId);
  }

  /**
   * Serialize patterns for storage.
   */
  serialize(): FixPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Load patterns from serialized data.
   */
  load(patterns: FixPattern[]): void {
    this.patterns.clear();
    for (const pattern of patterns) {
      this.patterns.set(pattern.id, pattern);
    }
  }
}
