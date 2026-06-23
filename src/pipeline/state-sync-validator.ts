/**
 * State Synchronization Validator — Upgrade 3
 * Ensures every user interaction connects to a real execution path.
 * Validates onClick → API, onSubmit → mutation, etc.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SyncViolation {
  file: string;
  line: number;
  type: 'disconnected-handler' | 'missing-api' | 'no-execution-path' | 'unconnected-mutation';
  severity: 'error' | 'warning';
  message: string;
  handler?: string;
  suggestion: string;
}

export interface SyncValidationResult {
  passed: boolean;
  violations: SyncViolation[];
  filesChecked: number;
  handlersChecked: number;
  connectedHandlers: number;
  disconnectedHandlers: number;
}

export class StateSyncValidator {
  /**
   * Validate that all event handlers connect to real execution paths.
   */
  validate(workspacePath: string): SyncValidationResult {
    const violations: SyncViolation[] = [];
    let filesChecked = 0;
    let handlersChecked = 0;
    let connectedHandlers = 0;
    let disconnectedHandlers = 0;

    const srcDir = path.join(workspacePath, 'src');
    if (!fs.existsSync(srcDir)) {
      return { passed: true, violations: [], filesChecked: 0, handlersChecked: 0, connectedHandlers: 0, disconnectedHandlers: 0 };
    }

    const checkDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== 'dist') {
            checkDir(fullPath);
          }
          continue;
        }

        if (!entry.name.endsWith('.tsx') && !entry.name.endsWith('.jsx')) continue;

        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        filesChecked++;

        // Find onClick handlers
        const onClickPattern = /onClick=\{[^}]*\}/g;
        let match;

        while ((match = onClickPattern.exec(content)) !== null) {
          handlersChecked++;
          const beforeMatch = content.substring(0, match.index);
          const lineNum = beforeMatch.split('\n').length;
          const handler = match[0];

          // Check if handler contains actual logic (function call, fetch, state update)
          const hasRealLogic = this.handlerHasRealLogic(handler, content);
          if (hasRealLogic) {
            connectedHandlers++;
          } else {
            disconnectedHandlers++;
            violations.push({
              file: path.relative(workspacePath, fullPath).replace(/\\/g, '/'),
              line: lineNum,
              type: 'disconnected-handler',
              severity: 'error',
              message: 'onClick handler has no execution path',
              handler,
              suggestion: 'Connect to server action, API call, or state update',
            });
          }
        }

        // Find onSubmit handlers
        const onSubmitPattern = /onSubmit=\{[^}]*\}/g;
        while ((match = onSubmitPattern.exec(content)) !== null) {
          handlersChecked++;
          const beforeMatch = content.substring(0, match.index);
          const lineNum = beforeMatch.split('\n').length;
          const handler = match[0];

          const hasRealLogic = this.handlerHasRealLogic(handler, content);
          if (hasRealLogic) {
            connectedHandlers++;
          } else {
            disconnectedHandlers++;
            violations.push({
              file: path.relative(workspacePath, fullPath).replace(/\\/g, '/'),
              line: lineNum,
              type: 'disconnected-handler',
              severity: 'error',
              message: 'onSubmit handler has no execution path',
              handler,
              suggestion: 'Connect to form action or API endpoint',
            });
          }
        }

        // Find empty button handlers
        const emptyButtonPattern = /<button[^>]*onClick=\{\(\)\s*=>\s*\{\s*\}\}[^>]*>/g;
        while ((match = emptyButtonPattern.exec(content)) !== null) {
          handlersChecked++;
          disconnectedHandlers++;
          const beforeMatch = content.substring(0, match.index);
          const lineNum = beforeMatch.split('\n').length;

          violations.push({
            file: path.relative(workspacePath, fullPath).replace(/\\/g, '/'),
            line: lineNum,
            type: 'no-execution-path',
            severity: 'error',
            message: 'Empty onClick handler — button does nothing',
            suggestion: 'Implement server action, state update, or navigation',
          });
        }
      }
    };

    checkDir(srcDir);

    return {
      passed: violations.filter(v => v.severity === 'error').length === 0,
      violations,
      filesChecked,
      handlersChecked,
      connectedHandlers,
      disconnectedHandlers,
    };
  }

  /**
   * Check if a handler contains real execution logic.
   */
  private handlerHasRealLogic(handler: string, fullContent: string): boolean {
    // Patterns that indicate real logic
    const realLogicPatterns = [
      /fetch\(/,
      /await\s+/,
      /create\w*\(/,
      /update\w*\(/,
      /delete\w*\(/,
      /set\w*\(/,
      /dispatch\(/,
      /navigate\(/,
      /router\./,
      /useRouter/,
      /useMutation/,
      /useQuery/,
      /mutate\(/,
      /submit/,
      /action=/,
      /serverAction/,
    ];

    return realLogicPatterns.some(p => p.test(handler));
  }

  /**
   * Generate a report for the validation result.
   */
  generateReport(result: SyncValidationResult): string {
    const lines: string[] = [];

    lines.push('=== State Synchronization Report ===');
    lines.push(`Files checked: ${result.filesChecked}`);
    lines.push(`Handlers found: ${result.handlersChecked}`);
    lines.push(`Connected: ${result.connectedHandlers}`);
    lines.push(`Disconnected: ${result.disconnectedHandlers}`);
    lines.push('');

    if (result.passed) {
      lines.push('✅ PASSED — All handlers connected to execution paths');
    } else {
      lines.push('❌ FAILED — Disconnected handlers detected');
      lines.push('');

      for (const v of result.violations) {
        lines.push(`  ${v.file}:${v.line} — ${v.message}`);
        if (v.handler) lines.push(`    Handler: ${v.handler}`);
        lines.push(`    Fix: ${v.suggestion}`);
      }
    }

    return lines.join('\n');
  }
}
