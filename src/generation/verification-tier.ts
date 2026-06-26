import type { ApplicationBlueprint } from '../bos/schemas/blueprint/application-blueprint.schema.js';
import type { GeneratedFile } from './deterministic-generator.js';

export interface VerificationCheck {
  id: string;
  name: string;
  category: 'static' | 'accessibility' | 'performance' | 'links' | 'security';
  run: (context: VerificationContext) => VerificationResult;
}

export interface VerificationContext {
  blueprint: ApplicationBlueprint;
  files: GeneratedFile[];
  outputDir: string;
}

export interface VerificationResult {
  passed: boolean;
  score: number;
  issues: VerificationIssue[];
  metadata: Record<string, unknown>;
}

export interface VerificationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
  rule?: string;
}

export interface VerificationReport {
  overall: number;
  passed: boolean;
  categories: Record<string, { score: number; passed: boolean; issues: VerificationIssue[] }>;
  totalIssues: number;
  errors: number;
  warnings: number;
}

export class VerificationTier {
  private checks: VerificationCheck[] = [];

  register(check: VerificationCheck): void {
    this.checks.push(check);
  }

  verify(context: VerificationContext): VerificationReport {
    const categoryResults: Record<string, { score: number; passed: boolean; issues: VerificationIssue[] }> = {};

    for (const check of this.checks) {
      const result = check.run(context);
      const existing = categoryResults[check.category] ?? { score: 100, passed: true, issues: [] };

      if (!result.passed) {
        existing.passed = false;
      }
      existing.score = Math.min(existing.score, result.score);
      existing.issues.push(...result.issues);

      categoryResults[check.category] = existing;
    }

    const allIssues = Object.values(categoryResults).flatMap(c => c.issues);
    const errors = allIssues.filter(i => i.severity === 'error').length;
    const warnings = allIssues.filter(i => i.severity === 'warning').length;

    const scores = Object.values(categoryResults).map(c => c.score);
    const overall = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 100;

    return {
      overall,
      passed: errors === 0,
      categories: categoryResults,
      totalIssues: allIssues.length,
      errors,
      warnings,
    };
  }

  getChecks(): VerificationCheck[] {
    return [...this.checks];
  }
}

export function createDefaultChecks(): VerificationCheck[] {
  return [
    {
      id: 'static.no-console-log',
      name: 'No console.log in production',
      category: 'static',
      run: (ctx) => {
        const issues: VerificationIssue[] = [];
        for (const file of ctx.files) {
          if (file.content.includes('console.log')) {
            issues.push({
              severity: 'warning',
              message: 'console.log found in production code',
              file: file.path,
              rule: 'no-console-log',
            });
          }
        }
        return { passed: issues.filter(i => i.severity === 'error').length === 0, score: issues.length === 0 ? 100 : 80, issues, metadata: {} };
      },
    },
    {
      id: 'static.no-any-type',
      name: 'No explicit any type',
      category: 'static',
      run: (ctx) => {
        const issues: VerificationIssue[] = [];
        for (const file of ctx.files) {
          if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) {
            const anyMatches = file.content.match(/:\s*any\b/g);
            if (anyMatches && anyMatches.length > 0) {
              issues.push({
                severity: 'warning',
                message: `Found ${anyMatches.length} explicit 'any' type(s)`,
                file: file.path,
                rule: 'no-any-type',
              });
            }
          }
        }
        return { passed: true, score: issues.length === 0 ? 100 : Math.max(50, 100 - issues.length * 10), issues, metadata: {} };
      },
    },
    {
      id: 'a11y.images-have-alt',
      name: 'Images have alt text',
      category: 'accessibility',
      run: (ctx) => {
        const issues: VerificationIssue[] = [];
        for (const file of ctx.files) {
          if (file.type === 'page' || file.type === 'component') {
            const imgWithoutAlt = file.content.match(/<img[^>]*(?!alt=)[^>]*>/g);
            if (imgWithoutAlt) {
              issues.push({
                severity: 'error',
                message: `${imgWithoutAlt.length} image(s) missing alt attribute`,
                file: file.path,
                rule: 'images-have-alt',
              });
            }
          }
        }
        return { passed: issues.filter(i => i.severity === 'error').length === 0, score: issues.length === 0 ? 100 : 70, issues, metadata: {} };
      },
    },
    {
      id: 'a11y.buttons-have-labels',
      name: 'Interactive elements have accessible labels',
      category: 'accessibility',
      run: (ctx) => {
        const issues: VerificationIssue[] = [];
        for (const file of ctx.files) {
          if (file.type === 'page' || file.type === 'component') {
            const buttonWithoutLabel = file.content.match(/<button[^>]*>(?!\s*<)[^<]*<\/button>/g);
            if (buttonWithoutLabel) {
              for (const btn of buttonWithoutLabel) {
                if (!btn.includes('aria-label') && !btn.includes('aria-labelledby')) {
                  issues.push({
                    severity: 'warning',
                    message: 'Button may need aria-label',
                    file: file.path,
                    rule: 'buttons-have-labels',
                  });
                }
              }
            }
          }
        }
        return { passed: issues.filter(i => i.severity === 'error').length === 0, score: issues.length === 0 ? 100 : 85, issues, metadata: {} };
      },
    },
    {
      id: 'perf.bundle-size',
      name: 'Reasonable bundle size estimate',
      category: 'performance',
      run: (ctx) => {
        const issues: VerificationIssue[] = [];
        const totalPages = ctx.files.filter(f => f.type === 'page').length;
        const totalComponents = ctx.files.filter(f => f.type === 'component').length;

        if (totalPages > 30) {
          issues.push({
            severity: 'warning',
            message: `High page count (${totalPages}). Consider code splitting.`,
            rule: 'bundle-size',
          });
        }

        const score = Math.max(50, 100 - (totalPages > 20 ? (totalPages - 20) * 2 : 0));
        return { passed: true, score, issues, metadata: { totalPages, totalComponents } };
      },
    },
    {
      id: 'perf.no-heavy-imports',
      name: 'No heavy unnecessary imports',
      category: 'performance',
      run: (ctx) => {
        const issues: VerificationIssue[] = [];
        const heavyModules = ['moment', 'lodash', 'axios'];
        for (const file of ctx.files) {
          for (const mod of heavyModules) {
            if (file.content.includes(`from '${mod}'`) || file.content.includes(`from "${mod}"`)) {
              issues.push({
                severity: 'info',
                message: `Consider lighter alternative to '${mod}'`,
                file: file.path,
                rule: 'no-heavy-imports',
              });
            }
          }
        }
        return { passed: true, score: issues.length === 0 ? 100 : 90, issues, metadata: {} };
      },
    },
    {
      id: 'security.no-secrets',
      name: 'No hardcoded secrets',
      category: 'security',
      run: (ctx) => {
        const issues: VerificationIssue[] = [];
        const secretPatterns = [/sk_live_/, /sk_test_/, /api_key\s*[:=]\s*['"][^'"]+['"]/i, /password\s*[:=]\s*['"][^'"]+['"]/i];
        for (const file of ctx.files) {
          for (const pattern of secretPatterns) {
            if (pattern.test(file.content)) {
              issues.push({
                severity: 'error',
                message: 'Potential hardcoded secret detected',
                file: file.path,
                rule: 'no-secrets',
              });
            }
          }
        }
        return { passed: issues.filter(i => i.severity === 'error').length === 0, score: issues.length === 0 ? 100 : 0, issues, metadata: {} };
      },
    },
  ];
}
