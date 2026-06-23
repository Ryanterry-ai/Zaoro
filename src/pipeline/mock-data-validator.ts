/**
 * Mock Data Validator — Upgrade 2
 * Detects and blocks hardcoded mock data patterns in generated code.
 * Ensures generated apps use real data flows, not static arrays.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface MockDataViolation {
  file: string;
  line: number;
  pattern: string;
  severity: 'error' | 'warning';
  message: string;
  suggestion: string;
}

export interface ValidationResult {
  passed: boolean;
  violations: MockDataViolation[];
  filesChecked: number;
  patternsDetected: string[];
}

// Patterns that indicate hardcoded mock data
const MOCK_PATTERNS = [
  { regex: /const\s+\w+\s*=\s*\[[\s\S]*?\]/g, name: 'hardcoded-array', severity: 'error' as const, message: 'Hardcoded array detected. Use API calls or database queries instead.' },
  { regex: /const\s+\w+\s*=\s*\{[\s\S]*?\}/g, name: 'hardcoded-object', severity: 'warning' as const, message: 'Hardcoded object detected. Use server actions or API routes.' },
  { regex: /id:\s*\d+,\s*name:\s*['"][^'"]+['"]/g, name: 'mock-record', severity: 'error' as const, message: 'Mock record pattern (id + name). Use database records.' },
  { regex: /price:\s*\d+(\.\d+)?/g, name: 'hardcoded-price', severity: 'warning' as const, message: 'Hardcoded price. Use database values.' },
  { regex: /description:\s*['"][^'"]{20,}['"]/g, name: 'hardcoded-description', severity: 'warning' as const, message: 'Hardcoded description. Use CMS or database content.' },
  { regex: /products\s*=\s*\[/g, name: 'mock-products', severity: 'error' as const, message: 'Hardcoded products array. Use Prisma query.' },
  { regex: /users\s*=\s*\[/g, name: 'mock-users', severity: 'error' as const, message: 'Hardcoded users array. Use authentication system.' },
  { regex: /orders\s*=\s*\[/g, name: 'mock-orders', severity: 'error' as const, message: 'Hardcoded orders array. Use database queries.' },
  { regex: /services\s*=\s*\[/g, name: 'mock-services', severity: 'error' as const, message: 'Hardcoded services array. Use API or database.' },
  { regex: /items\s*=\s*\[/g, name: 'mock-items', severity: 'error' as const, message: 'Hardcoded items array. Use data fetching.' },
  { regex: /const\s+\w+\s*=\s*\[[\s\S]*?{[\s\S]*?}[\s\S]*?\]/g, name: 'array-of-objects', severity: 'error' as const, message: 'Array of objects. Should come from API or database.' },
];

// Allowed patterns (test fixtures, constants, etc.)
const ALLOWED_PATTERNS = [
  /test|mock|fixture|sample|dummy/i,
  /\.test\./,
  /\.spec\./,
  /__tests__/,
  /test-fixtures/,
  /seed/,
];

// File patterns to skip
const SKIP_FILES = [
  /node_modules/,
  /\.next/,
  /dist/,
  /build/,
  /domain-data\.ts$/, // Our domain data is used for fallback synthesis, not in generated code
  /image-resolver\.ts$/,
  /self-evaluator\.ts$/,
  /constants\.ts$/,
  /config\.ts$/,
];

export class MockDataValidator {
  /**
   * Validate a workspace for mock data patterns.
   */
  validate(workspacePath: string): ValidationResult {
    const violations: MockDataViolation[] = [];
    const patternsDetected: Set<string> = new Set();
    let filesChecked = 0;

    const checkDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!SKIP_FILES.some(p => p.test(entry.name))) {
            checkDir(fullPath);
          }
          continue;
        }

        if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx') && !entry.name.endsWith('.js') && !entry.name.endsWith('.jsx')) {
          continue;
        }

        // Skip non-src files
        if (!fullPath.includes('src/')) continue;

        // Check skip patterns
        if (SKIP_FILES.some(p => p.test(fullPath))) continue;

        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        filesChecked++;

        for (const pattern of MOCK_PATTERNS) {
          let match;
          pattern.regex.lastIndex = 0;

          while ((match = pattern.regex.exec(content)) !== null) {
            // Find line number
            const beforeMatch = content.substring(0, match.index);
            const lineNum = beforeMatch.split('\n').length;

            // Check if in allowed context
            const line = lines[lineNum - 1] || '';
            if (ALLOWED_PATTERNS.some(p => p.test(line)) || ALLOWED_PATTERNS.some(p => p.test(fullPath))) {
              continue;
            }

            // Skip if it's a type definition or import
            if (line.trim().startsWith('import ') || line.trim().startsWith('export type ') || line.trim().startsWith('interface ')) {
              continue;
            }

            const relativePath = path.relative(workspacePath, fullPath).replace(/\\/g, '/');

            violations.push({
              file: relativePath,
              line: lineNum,
              pattern: pattern.name,
              severity: pattern.severity,
              message: pattern.message,
              suggestion: `Replace with API call: const data = await fetch('/api/endpoint').then(r => r.json())`,
            });

            patternsDetected.add(pattern.name);
          }
        }
      }
    };

    checkDir(workspacePath);

    return {
      passed: violations.filter(v => v.severity === 'error').length === 0,
      violations,
      filesChecked,
      patternsDetected: Array.from(patternsDetected),
    };
  }

  /**
   * Generate a report for the validation result.
   */
  generateReport(result: ValidationResult): string {
    const lines: string[] = [];

    lines.push('=== Mock Data Validation Report ===');
    lines.push(`Files checked: ${result.filesChecked}`);
    lines.push(`Violations: ${result.violations.length} (${result.violations.filter(v => v.severity === 'error').length} errors)`);
    lines.push(`Patterns detected: ${result.patternsDetected.join(', ') || 'none'}`);
    lines.push('');

    if (result.passed) {
      lines.push('✅ PASSED — No hardcoded mock data detected');
    } else {
      lines.push('❌ FAILED — Hardcoded mock data detected');
      lines.push('');

      for (const v of result.violations.filter(v => v.severity === 'error')) {
        lines.push(`  ${v.file}:${v.line} — ${v.message}`);
        lines.push(`    Fix: ${v.suggestion}`);
      }
    }

    if (result.violations.some(v => v.severity === 'warning')) {
      lines.push('');
      lines.push('Warnings:');
      for (const v of result.violations.filter(v => v.severity === 'warning')) {
        lines.push(`  ${v.file}:${v.line} — ${v.message}`);
      }
    }

    return lines.join('\n');
  }
}
