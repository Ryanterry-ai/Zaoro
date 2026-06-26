import * as fs from 'fs';
import * as path from 'path';

export type EventType =
  | 'info' | 'success' | 'warning' | 'error'
  | 'started' | 'completed' | 'skipped'
  | 'waiting' | 'retrying' | 'cached'
  | 'generated' | 'validated' | 'downloaded'
  | 'compiling' | 'testing' | 'verifying'
  | 'llm_request' | 'llm_response' | 'llm_fallback'
  | 'research' | 'crawling' | 'extracting'
  | 'file_written' | 'patch_applied';

export interface ProgressEvent {
  step: string;
  type: EventType;
  message: string;
  ts: number;
  duration?: number | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface LLMDetail {
  model: string;
  provider: string;
  tokensIn?: number;
  tokensOut?: number;
  duration?: number;
  retryCount?: number;
  fallbackUsed?: boolean;
  fallbackProvider?: string;
  cacheHit?: boolean;
  attempt?: number;
  maxAttempts?: number;
  httpStatus?: number;
}

/**
 * ProgressEmitter: Central event bus for build progress.
 * Writes events to .progress file for the engine HTTP server to read.
 * All subsystems emit through this class — no raw log() calls.
 */
export class ProgressEmitter {
  private filePath: string;
  private events: ProgressEvent[] = [];
  private initialized = false;

  constructor(workspaceDir: string) {
    this.filePath = path.join(workspaceDir, '.progress');
    // Initialize with empty array
    try {
      if (!fs.existsSync(workspaceDir)) {
        fs.mkdirSync(workspaceDir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, '[]', 'utf-8');
      this.initialized = true;
    } catch {}
  }

  /**
   * Emit a progress event.
   */
  emit(step: string, type: EventType, message: string, metadata?: Record<string, unknown>): void {
    const event: ProgressEvent = {
      step,
      type,
      message,
      ts: Date.now(),
      metadata,
    };
    this.events.push(event);
    this.flush();
  }

  /**
   * Emit an LLM-specific event with full transparency data.
   */
  emitLLM(step: string, type: 'llm_request' | 'llm_response' | 'llm_fallback', detail: LLMDetail): void {
    const messages: Record<string, string> = {
      llm_request: `Calling ${detail.provider}/${detail.model} (attempt ${detail.attempt || 1}/${detail.maxAttempts || 5})`,
      llm_response: `${detail.provider}/${detail.model} responded in ${(detail.duration || 0)}ms — ${detail.tokensIn || '?'} tokens in, ${detail.tokensOut || '?'} tokens out`,
      llm_fallback: `Falling back from ${detail.provider} to ${detail.fallbackProvider || 'next provider'}${detail.httpStatus ? ` (HTTP ${detail.httpStatus})` : ''}`,
    };

    this.emit(step, type, messages[type] || 'LLM event', {
      llm: {
        model: detail.model,
        provider: detail.provider,
        tokensIn: detail.tokensIn,
        tokensOut: detail.tokensOut,
        duration: detail.duration,
        retryCount: detail.retryCount,
        fallbackUsed: detail.fallbackUsed,
        cacheHit: detail.cacheHit,
        attempt: detail.attempt,
        maxAttempts: detail.maxAttempts,
        httpStatus: detail.httpStatus,
      },
    });
  }

  /**
   * Emit a file write event.
   */
  emitFile(step: string, filePath: string, action: 'generated' | 'updated' | 'patched'): void {
    this.emit(step, 'file_written', `${action}: ${filePath}`, { filePath, action });
  }

  /**
   * Emit a phase start with timing.
   */
  phaseStart(step: string, message: string): number {
    this.emit(step, 'started', message);
    return Date.now();
  }

  /**
   * Emit a phase end with duration.
   */
  phaseEnd(step: string, message: string, startTime: number): void {
    const duration = Date.now() - startTime;
    this.emit(step, 'completed', `${message} (${duration}ms)`, { duration });
  }

  /**
   * Flush events to disk.
   */
  private flush(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.events), 'utf-8');
    } catch {}
  }

  /**
   * Get all events.
   */
  getEvents(): ProgressEvent[] {
    return this.events;
  }
}
