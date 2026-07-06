// ─── Log Capture ────────────────────────────────────────────────────────────
//
// Structured log capture from process output. Parses stderr/stdout,
// detects error patterns, classifies failures, and suggests fixes.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  LogEntry,
  LogLevel,
  FailureInfo,
  FailureCategory,
  ProcessResult,
} from './types.js';

// ─── Error Patterns ─────────────────────────────────────────────────────────

interface ErrorPattern {
  category: FailureCategory;
  pattern: RegExp;
  extractMessage?: (match: RegExpMatchArray, line: string) => string | undefined;
  extractFile?: (match: RegExpMatchArray, line: string) => string | undefined;
  extractLine?: (match: RegExpMatchArray, line: string) => number | undefined;
  suggestedFix?: (message: string, file: string | undefined) => string | undefined;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // TypeScript errors
  {
    category: 'typescript',
    pattern: /TS(\d+):\s+(.+)/,
    extractMessage: (m) => m[2],
    extractFile: (m, line) => {
      const fileMatch = line.match(/^([^(]+\.(?:ts|tsx|js|jsx))\(/m);
      return fileMatch?.[1];
    },
    extractLine: (m, line) => {
      const lineMatch = line.match(/\((\d+),\d+\)/);
      return lineMatch?.[1] ? parseInt(lineMatch[1], 10) : undefined;
    },
    suggestedFix: (msg) => {
      if (msg.includes('Cannot find module')) return 'Install the missing module or add a type declaration';
      if (msg.includes('Type .* is not assignable')) return 'Fix the type mismatch or add a type assertion';
      if (msg.includes('Property .* does not exist')) return 'Check the object type or add the property';
      return undefined;
    },
  },
  // ESLint errors
  {
    category: 'eslint',
    pattern: /(?:error|warning)\s+(.+?)\s+(.+?):(\d+):(\d+)/,
    extractMessage: (m) => m[1],
    extractFile: (m) => m[2],
    extractLine: (m) => m[3] ? parseInt(m[3], 10) : undefined,
    suggestedFix: (msg) => {
      if (msg.includes('no-unused-vars')) return 'Remove unused variable or prefix with _';
      if (msg.includes('no-undef')) return 'Import the variable or add a declaration';
      if (msg.includes('react/')) return 'Fix the React component issue';
      return undefined;
    },
  },
  // Module not found
  {
    category: 'dependency',
    pattern: /Cannot find module '(.+?)'/,
    extractMessage: (m) => `Missing module: ${m[1]}`,
    suggestedFix: (m) => `Run: npm install ${m[1]}`,
  },
  // Port in use
  {
    category: 'port-conflict',
    pattern: /EADDRINUSE.*?:(\d+)/,
    extractMessage: (m) => `Port ${m[1]} is already in use`,
    suggestedFix: () => 'Kill the process using that port or use a different port',
  },
  // Out of memory
  {
    category: 'memory',
    pattern: /JavaScript heap out of memory|FATAL ERROR.*?heap|ENOMEM/,
    extractMessage: () => 'Process ran out of memory',
    suggestedFix: () => 'Increase Node.js memory limit with NODE_OPTIONS=--max-old-space-size=4096',
  },
  // Build errors (Next.js, Vite, etc.)
  {
    category: 'build',
    pattern: /Build error|Failed to compile|Error: Build failed/,
    extractMessage: (m) => m[0],
  },
  // Syntax errors
  {
    category: 'build',
    pattern: /SyntaxError: (.+)/,
    extractMessage: (m) => `Syntax error: ${m[1]}`,
  },
  // Test failures
  {
    category: 'test',
    pattern: /FAIL\s+(.+?)\s+›\s+(.+)/,
    extractFile: (m) => m[1],
    extractMessage: (m) => `Test failed: ${m[2]}`,
  },
  {
    category: 'test',
    pattern: /✗\s+(.+)/,
    extractMessage: (m) => `Test failed: ${m[1]}`,
  },
  // General errors
  {
    category: 'runtime',
    pattern: /Error:\s+(.+)/,
    extractMessage: (m) => m[1],
  },
];

// ─── Log Parser ─────────────────────────────────────────────────────────────

const LOG_LEVEL_PATTERNS: [RegExp, LogLevel][] = [
  [/^(ERR!|error|ERROR|Error)/, 'error'],
  [/^(WARN|warn|WARNING|Warning)/, 'warn'],
  [/^(debug|DEBUG|Debug)/, 'debug'],
];

export class LogCapture {
  private logs: LogEntry[] = [];
  private failures: FailureInfo[] = [];

  /** Reset captured data */
  reset(): void {
    this.logs = [];
    this.failures = [];
  }

  /** Get all captured logs */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /** Get all detected failures */
  getFailures(): FailureInfo[] {
    return [...this.failures];
  }

  /** Process a ProcessResult and extract logs + failures */
  processResult(result: ProcessResult, source: string = 'process'): void {
    // Parse stdout
    const stdoutLines = result.stdout.split('\n').filter((l) => l.trim());
    for (const line of stdoutLines) {
      this.logs.push(this.parseLine(line, source));
    }

    // Parse stderr
    const stderrLines = result.stderr.split('\n').filter((l) => l.trim());
    for (const line of stderrLines) {
      this.logs.push(this.parseLine(line, 'stderr'));
    }

    // Detect failures from stderr
    if (result.status !== 'success') {
      const failure = this.classifyFailure(result);
      if (failure) {
        this.failures.push(failure);
      }
    }
  }

  /** Process raw text output */
  processOutput(output: string, source: string): void {
    const lines = output.split('\n').filter((l) => l.trim());
    for (const line of lines) {
      this.logs.push(this.parseLine(line, source));
    }
  }

  /** Parse a single log line */
  private parseLine(line: string, source: string): LogEntry {
    let level: LogLevel = 'info';
    for (const [pattern, lvl] of LOG_LEVEL_PATTERNS) {
      if (pattern.test(line)) {
        level = lvl;
        break;
      }
    }

    return {
      timestamp: Date.now(),
      level,
      message: line,
      source,
      raw: line,
    };
  }

  /** Classify a process failure */
  private classifyFailure(result: ProcessResult): FailureInfo | null {
    const output = result.combined;
    if (!output.trim()) return null;

    // Try each error pattern
    for (const pattern of ERROR_PATTERNS) {
      const match = output.match(pattern.pattern);
      if (match) {
        const message = pattern.extractMessage
          ? pattern.extractMessage(match, output)
          : match[0];
        const file = pattern.extractFile
          ? pattern.extractFile(match, output)
          : undefined;
        const line = pattern.extractLine
          ? pattern.extractLine(match, output)
          : undefined;
        const suggestedFix = pattern.suggestedFix
          ? pattern.suggestedFix(message ?? match[0], file)
          : undefined;

        return {
          id: `failure-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          category: pattern.category,
          message: message ?? match[0],
          files: file ? [file] : [],
          lines: line ? [line] : [],
          rawOutput: output.slice(0, 2000),
          details: { exitCode: result.exitCode, timedOut: result.timedOut },
          suggestedFix,
          retryable: this.isRetryable(pattern.category, result),
          timestamp: Date.now(),
        };
      }
    }

    // Unclassified failure
    return {
      id: `failure-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category: 'unknown',
      message: output.split('\n').slice(0, 3).join(' ').slice(0, 200),
      files: [],
      lines: [],
      rawOutput: output.slice(0, 2000),
      details: { exitCode: result.exitCode, timedOut: result.timedOut },
      suggestedFix: undefined,
      retryable: !result.timedOut,
      timestamp: Date.now(),
    };
  }

  /** Determine if a failure is retryable */
  private isRetryable(category: FailureCategory, result: ProcessResult): boolean {
    if (result.timedOut) return true;
    switch (category) {
      case 'typescript':
      case 'eslint':
      case 'build':
      case 'dependency':
        return true;
      case 'memory':
      case 'port-conflict':
        return true;
      case 'runtime':
      case 'test':
        return true;
      case 'timeout':
        return true;
      default:
        return false;
    }
  }

  /** Get failures grouped by category */
  getFailuresByCategory(): Record<FailureCategory, FailureInfo[]> {
    const grouped: Record<string, FailureInfo[]> = {};
    for (const f of this.failures) {
      const arr = grouped[f.category];
      if (arr) {
        arr.push(f);
      } else {
        grouped[f.category] = [f];
      }
    }
    return grouped as Record<FailureCategory, FailureInfo[]>;
  }

  /** Get error summary for orchestrator feedback */
  getErrorSummary(): string {
    const byCategory = this.getFailuresByCategory();
    const lines: string[] = [];
    for (const [cat, failures] of Object.entries(byCategory)) {
      lines.push(`${cat}: ${failures.length} failure(s)`);
      for (const f of failures.slice(0, 3)) {
        lines.push(`  - ${f.message.slice(0, 120)}`);
        if (f.suggestedFix) {
          lines.push(`    Fix: ${f.suggestedFix}`);
        }
      }
    }
    return lines.join('\n');
  }
}

export function createLogCapture(): LogCapture {
  return new LogCapture();
}
