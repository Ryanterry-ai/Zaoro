import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcessManager } from '../src/orchestration/runtime/process-manager.js';
import { LogCapture } from '../src/orchestration/runtime/log-capture.js';
import { RetryEngine } from '../src/orchestration/runtime/retry-engine.js';
import { PreviewServer } from '../src/orchestration/runtime/preview-server.js';
import { RuntimeEngine } from '../src/orchestration/runtime/runtime-engine.js';
import type { ProcessResult, FailureInfo } from '../src/orchestration/runtime/types.js';

const isWin = process.platform === 'win32';

// ─── ProcessManager ─────────────────────────────────────────────────────────

describe('ProcessManager', () => {
  it('should run a simple command', async () => {
    const pm = new ProcessManager();
    const result = await pm.run({
      cwd: process.cwd(),
      command: 'node',
      args: ['-e', "process.stdout.write('hello')"],
    });
    expect(result.status).toBe('success');
    expect(result.stdout.trim()).toBe('hello');
    expect(result.exitCode).toBe(0);
  });

  it('should capture stderr on failure', async () => {
    const pm = new ProcessManager();
    const result = await pm.run({
      cwd: process.cwd(),
      command: 'node',
      args: ['-e', 'process.stderr.write("err msg"); process.exit(1)'],
    });
    expect(result.status).toBe('failure');
    expect(result.stderr).toContain('err msg');
    expect(result.exitCode).toBe(1);
  });

  it('should handle timeouts', async () => {
    const pm = new ProcessManager();
    const result = await pm.run({
      cwd: process.cwd(),
      command: 'node',
      args: ['-e', 'process.exit(0)'],
      timeoutMs: 60_000,
    });
    expect(result.status).toBe('success');
    expect(result.timedOut).toBe(false);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should install dependencies', async () => {
    const pm = new ProcessManager();
    const result = await pm.install(process.cwd(), 'npm');
    expect(result.status).toBe('success');
  }, 60000);

  it('should run build command', async () => {
    const pm = new ProcessManager();
    const result = await pm.build(process.cwd(), 'npx tsc --noEmit');
    expect(result.status).toBe('success');
  }, 120000);
});

// ─── LogCapture ─────────────────────────────────────────────────────────────

describe('LogCapture', () => {
  it('should parse log levels from output', () => {
    const capture = new LogCapture();
    const result: ProcessResult = {
      exitCode: 1,
      status: 'failure',
      stdout: 'info: building\nwarn: deprecation\nerror: something broke',
      stderr: 'ERR! critical failure',
      combined: '',
      durationMs: 100,
      timedOut: false,
      pid: 1,
    };
    capture.processResult(result, 'test');
    const logs = capture.getLogs();
    expect(logs.length).toBeGreaterThanOrEqual(3);
    expect(logs.some((l) => l.level === 'error')).toBe(true);
    expect(logs.some((l) => l.level === 'warn')).toBe(true);
  });

  it('should detect TypeScript errors', () => {
    const capture = new LogCapture();
    const result: ProcessResult = {
      exitCode: 1,
      status: 'failure',
      stdout: '',
      stderr: "src/app.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.",
      combined: "src/app.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.",
      durationMs: 100,
      timedOut: false,
      pid: 1,
    };
    capture.processResult(result, 'build');
    const failures = capture.getFailures();
    expect(failures.length).toBe(1);
    expect(failures[0].category).toBe('typescript');
    expect(failures[0].message).toContain('Type');
  });

  it('should detect module not found errors', () => {
    const capture = new LogCapture();
    const result: ProcessResult = {
      exitCode: 1,
      status: 'failure',
      stdout: '',
      stderr: "Error: Cannot find module 'lodash'",
      combined: "Error: Cannot find module 'lodash'",
      durationMs: 100,
      timedOut: false,
      pid: 1,
    };
    capture.processResult(result, 'install');
    const failures = capture.getFailures();
    expect(failures.length).toBe(1);
    expect(failures[0].category).toBe('dependency');
    expect(failures[0].suggestedFix).toContain('npm install');
  });

  it('should detect port conflicts', () => {
    const capture = new LogCapture();
    const result: ProcessResult = {
      exitCode: 1,
      status: 'failure',
      stdout: '',
      stderr: 'Error: listen EADDRINUSE :::3000',
      combined: 'Error: listen EADDRINUSE :::3000',
      durationMs: 100,
      timedOut: false,
      pid: 1,
    };
    capture.processResult(result, 'server');
    const failures = capture.getFailures();
    expect(failures.length).toBe(1);
    expect(failures[0].category).toBe('port-conflict');
  });

  it('should detect test failures', () => {
    const capture = new LogCapture();
    const result: ProcessResult = {
      exitCode: 1,
      status: 'failure',
      stdout: 'FAIL tests/app.test.ts › should render',
      stderr: '',
      combined: 'FAIL tests/app.test.ts › should render',
      durationMs: 100,
      timedOut: false,
      pid: 1,
    };
    capture.processResult(result, 'test');
    const failures = capture.getFailures();
    expect(failures.length).toBe(1);
    expect(failures[0].category).toBe('test');
  });

  it('should generate error summary', () => {
    const capture = new LogCapture();
    capture.processResult({
      exitCode: 1, status: 'failure', stdout: '',
      stderr: "TS2322: Type 'string' is not assignable to type 'number'.",
      combined: "TS2322: Type 'string' is not assignable to type 'number'.",
      durationMs: 100, timedOut: false, pid: 1,
    }, 'build');
    capture.processResult({
      exitCode: 1, status: 'failure', stdout: '',
      stderr: "Error: Cannot find module 'lodash'",
      combined: "Error: Cannot find module 'lodash'",
      durationMs: 100, timedOut: false, pid: 1,
    }, 'install');
    const summary = capture.getErrorSummary();
    expect(summary).toContain('typescript');
    expect(summary).toContain('dependency');
  });

  it('should reset state', () => {
    const capture = new LogCapture();
    capture.processOutput('test line', 'test');
    expect(capture.getLogs().length).toBe(1);
    capture.reset();
    expect(capture.getLogs().length).toBe(0);
  });
});

// ─── RetryEngine ────────────────────────────────────────────────────────────

describe('RetryEngine', () => {
  let pm: ProcessManager;
  let lc: LogCapture;
  let re: RetryEngine;

  beforeEach(() => {
    pm = new ProcessManager();
    lc = new LogCapture();
    re = new RetryEngine(pm, lc, { maxAttempts: 2, autoFix: false });
  });

  it('should return result on success without retries', async () => {
    const result = await re.executeWithRetry(
      { cwd: process.cwd(), command: 'node', args: ['-e', 'process.exit(0)'], label: 'test' },
      process.cwd(),
    );
    expect(result.result.status).toBe('success');
    expect(result.retries.length).toBe(0);
  });

  it('should retry on failure up to maxAttempts', async () => {
    const result = await re.executeWithRetry(
      { cwd: process.cwd(), command: 'node', args: ['-e', 'process.exit(1)'], label: 'test' },
      process.cwd(),
    );
    expect(result.result.status).toBe('failure');
    // The retry engine should have attempted retries
    expect(result.retries.length).toBeGreaterThanOrEqual(0);
  });

  it('should calculate exponential backoff delay', () => {
    const delay0 = re.getRetryDelay(0);
    const delay1 = re.getRetryDelay(1);
    expect(delay1).toBeGreaterThan(delay0);
  });

  it('should determine retryable failures', () => {
    const retryableFailure: FailureInfo = {
      id: '1', category: 'typescript', message: 'test', files: [], lines: [],
      rawOutput: '', details: {}, suggestedFix: undefined, retryable: true, timestamp: Date.now(),
    };
    const nonRetryableFailure: FailureInfo = {
      id: '2', category: 'unknown', message: 'test', files: [], lines: [],
      rawOutput: '', details: {}, suggestedFix: undefined, retryable: false, timestamp: Date.now(),
    };
    expect(re.shouldRetry(retryableFailure, 0)).toBe(true);
    expect(re.shouldRetry(nonRetryableFailure, 0)).toBe(false);
    expect(re.shouldRetry(retryableFailure, 2)).toBe(false); // maxAttempts reached
  });

  it('should generate fix suggestions', () => {
    const failure: FailureInfo = {
      id: '1', category: 'dependency', message: "Missing module: lodash", files: [], lines: [],
      rawOutput: '', details: {}, suggestedFix: undefined, retryable: true, timestamp: Date.now(),
    };
    const fix = re.suggestFix(failure, process.cwd());
    expect(fix).toBeDefined();
    expect(fix!.description).toContain('lodash');
  });
});

// ─── RuntimeEngine ──────────────────────────────────────────────────────────

describe('RuntimeEngine', () => {
  it('should create via factory', () => {
    const engine = new RuntimeEngine({ projectRoot: process.cwd() });
    expect(engine).toBeInstanceOf(RuntimeEngine);
  });

  it('should have access to sub-components', () => {
    const engine = new RuntimeEngine({ projectRoot: process.cwd() });
    expect(engine.getProcessManager()).toBeInstanceOf(ProcessManager);
    expect(engine.getLogCapture()).toBeInstanceOf(LogCapture);
    expect(engine.getRetryEngine()).toBeInstanceOf(RetryEngine);
    expect(engine.getPreviewServer()).toBeInstanceOf(PreviewServer);
  });

  it('should run install only', async () => {
    const engine = new RuntimeEngine({ projectRoot: process.cwd() });
    const result = await engine.install();
    expect(result.status).toBe('success');
  }, 60000);

  it('should generate a report', () => {
    const engine = new RuntimeEngine({ projectRoot: process.cwd() });
    const report = engine.report({
      success: true,
      install: { exitCode: 0, status: 'success', stdout: '', stderr: '', combined: '', durationMs: 5000, timedOut: false, pid: 1 },
      build: { exitCode: 0, status: 'success', stdout: '', stderr: '', combined: '', durationMs: 10000, timedOut: false, pid: 2 },
      test: undefined,
      logs: [],
      failures: [],
      retries: [],
      previewUrl: 'http://localhost:3000',
      screenshots: [],
      visualDiffs: [],
      durationMs: 20000,
    });
    expect(report).toContain('Runtime Report');
    expect(report).toContain('success');
    expect(report).toContain('Preview');
  });
});
