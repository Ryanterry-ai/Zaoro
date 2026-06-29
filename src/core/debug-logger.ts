/**
 * Debug Logger — structured logging for the build pipeline.
 *
 * Logs every stage, timing, input/output, and errors.
 * Configurable via environment variables:
 *   DEBUG=true           — enable all debug logging
 *   DEBUG_STAGES=bre,exec,resolve,render — enable specific stages
 *   DEBUG_FILE=true      — also write logs to .debug-log.json
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Log Levels ──────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  ts: number;
  level: LogLevel;
  stage: string;
  message: string;
  data?: Record<string, unknown> | undefined;
  duration?: number | undefined;
}

// ─── Configuration ───────────────────────────────────────────────────────────

const DEBUG_ENABLED = process.env.DEBUG === 'true';
const DEBUG_STAGES = (process.env.DEBUG_STAGES ?? '').split(',').filter(Boolean);
const DEBUG_FILE = process.env.DEBUG_FILE === 'true';

const ALL_STAGES = ['bre', 'exec', 'resolve', 'render', 'pipeline', 'orchestrator', 'server'];

function isStageEnabled(stage: string): boolean {
  if (!DEBUG_ENABLED) return false;
  if (DEBUG_STAGES.length === 0) return true; // all stages
  return DEBUG_STAGES.includes(stage) || DEBUG_STAGES.includes('all');
}

// ─── Logger Class ────────────────────────────────────────────────────────────

class DebugLogger {
  private entries: LogEntry[] = [];
  private workspaceDir?: string;
  private enabled: boolean;

  constructor() {
    this.enabled = DEBUG_ENABLED;
  }

  /**
   * Set the workspace directory for file logging.
   */
  setWorkspace(dir: string): void {
    this.workspaceDir = dir;
  }

  /**
   * Log a debug message.
   */
  debug(stage: string, message: string, data?: Record<string, unknown>): void {
    this.log('debug', stage, message, data);
  }

  /**
   * Log an info message.
   */
  info(stage: string, message: string, data?: Record<string, unknown>): void {
    this.log('info', stage, message, data);
  }

  /**
   * Log a warning.
   */
  warn(stage: string, message: string, data?: Record<string, unknown>): void {
    this.log('warn', stage, message, data);
  }

  /**
   * Log an error.
   */
  error(stage: string, message: string, data?: Record<string, unknown>): void {
    this.log('error', stage, message, data);
  }

  /**
   * Start a timer for a stage operation.
   */
  startTimer(stage: string, operation: string): () => number {
    const start = Date.now();
    this.debug(stage, `Starting: ${operation}`);
    return () => {
      const duration = Date.now() - start;
      this.debug(stage, `Completed: ${operation}`, { duration });
      return duration;
    };
  }

  /**
   * Log a stage summary (inputs → outputs).
   */
  stageSummary(
    stage: string,
    operation: string,
    input: Record<string, unknown>,
    output: Record<string, unknown>,
    duration: number,
  ): void {
    this.info(stage, `${operation} — ${duration}ms`, {
      input: this.summarize(input),
      output: this.summarize(output),
      duration,
    });
  }

  /**
   * Get all log entries.
   */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  /**
   * Get logs as a formatted string.
   */
  getFormattedLogs(): string {
    return this.entries.map(e => {
      const ts = new Date(e.ts).toISOString();
      const level = e.level.toUpperCase().padEnd(5);
      const stage = e.stage.padEnd(12);
      const duration = e.duration ? ` (${e.duration}ms)` : '';
      const data = e.data ? ` ${JSON.stringify(e.data)}` : '';
      return `[${ts}] ${level} [${stage}] ${e.message}${duration}${data}`;
    }).join('\n');
  }

  /**
   * Write logs to file.
   */
  flush(): void {
    if (!DEBUG_FILE || !this.workspaceDir) return;

    const logFile = path.join(this.workspaceDir, '.debug-log.json');
    try {
      fs.writeFileSync(logFile, JSON.stringify(this.entries, null, 2), 'utf-8');
    } catch {
      // Silent fail for debug logs
    }
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.entries = [];
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  private log(level: LogLevel, stage: string, message: string, data?: Record<string, unknown>): void {
    if (!this.enabled) return;
    if (!isStageEnabled(stage)) return;

    const entry: LogEntry = {
      ts: Date.now(),
      level,
      stage,
      message,
      data: data ?? undefined,
    };

    this.entries.push(entry);

    // Console output
    const prefix = `[DEBUG:${stage}]`;
    const msg = `${prefix} ${message}`;
    if (data) {
      console.log(msg, JSON.stringify(data, null, 0));
    } else {
      console.log(msg);
    }
  }

  private summarize(obj: Record<string, unknown>): Record<string, unknown> {
    const summary: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        summary[key] = value.length > 100 ? value.slice(0, 100) + '...' : value;
      } else if (Array.isArray(value)) {
        summary[key] = `[${value.length} items]`;
      } else if (typeof value === 'object' && value !== null) {
        summary[key] = `{${Object.keys(value).length} keys}`;
      } else {
        summary[key] = value;
      }
    }
    return summary;
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

export const debugLog = new DebugLogger();

/**
 * Convenience function to get a stage-scoped logger.
 */
export function stageLogger(stage: string) {
  return {
    debug: (msg: string, data?: Record<string, unknown>) => debugLog.debug(stage, msg, data),
    info: (msg: string, data?: Record<string, unknown>) => debugLog.info(stage, msg, data),
    warn: (msg: string, data?: Record<string, unknown>) => debugLog.warn(stage, msg, data),
    error: (msg: string, data?: Record<string, unknown>) => debugLog.error(stage, msg, data),
    timer: (op: string) => debugLog.startTimer(stage, op),
    summary: (op: string, input: Record<string, unknown>, output: Record<string, unknown>, duration: number) =>
      debugLog.stageSummary(stage, op, input, output, duration),
  };
}
