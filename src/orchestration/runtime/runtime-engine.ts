// ─── Runtime Engine ─────────────────────────────────────────────────────────
//
// Top-level facade for the Runtime Layer. Orchestrates the full lifecycle:
//   1. Install dependencies
//   2. Build the project
//   3. Run tests
//   4. Capture logs and detect failures
//   5. Retry with fixes on failure
//   6. Start preview server
//   7. Capture screenshots
//   8. Run visual regression
//   9. Feed results back to orchestrator
//
// This is the missing bridge between the planning system and
// a true autonomous application builder.
// ─────────────────────────────────────────────────────────────────────────────

import { ProcessManager, createProcessManager } from './process-manager.js';
import { LogCapture, createLogCapture } from './log-capture.js';
import { RetryEngine, createRetryEngine } from './retry-engine.js';
import { PreviewServer, createPreviewServer } from './preview-server.js';
import { VisualRegression, createVisualRegression } from './visual-regression.js';
import type {
  RuntimeConfig,
  RuntimeRunResult,
  ProcessResult,
  LogEntry,
  FailureInfo,
  RuntimeRetryContext,
  ScreenshotResult,
  VisualDiffResult,
  FixSuggestion,
} from './types.js';

// ─── Default Config ─────────────────────────────────────────────────────────

const DEFAULTS = {
  projectRoot: process.cwd(),
  packageManager: 'npm' as const,
  devPort: 3000,
  buildCommand: 'npm run build',
  testCommand: 'npm test',
  installCommand: 'npm install',
  maxRetries: 3,
  screenshotViewport: { width: 1280, height: 800 },
  diffThreshold: 0.1,
  timeoutMs: 300_000,
  captureScreenshots: true,
  visualRegression: false,
};

// ─── Runtime Engine ─────────────────────────────────────────────────────────

export class RuntimeEngine {
  private projectRoot: string;
  private packageManager: string;
  private devPort: number;
  private buildCommand: string;
  private testCommand: string;
  private maxRetries: number;
  private screenshotViewport: { width: number; height: number };
  private captureScreenshots: boolean;
  private processManager: ProcessManager;
  private logCapture: LogCapture;
  private retryEngine: RetryEngine;
  private previewServer: PreviewServer;
  private visualRegression: VisualRegression;

  constructor(config?: Partial<RuntimeConfig>) {
    this.projectRoot = config?.projectRoot ?? DEFAULTS.projectRoot;
    this.packageManager = config?.packageManager ?? DEFAULTS.packageManager;
    this.devPort = config?.devPort ?? DEFAULTS.devPort;
    this.buildCommand = config?.buildCommand ?? DEFAULTS.buildCommand;
    this.testCommand = config?.testCommand ?? DEFAULTS.testCommand;
    this.maxRetries = config?.maxRetries ?? DEFAULTS.maxRetries;
    this.screenshotViewport = config?.screenshotViewport ?? DEFAULTS.screenshotViewport;
    this.captureScreenshots = config?.captureScreenshots ?? DEFAULTS.captureScreenshots;

    this.processManager = createProcessManager();
    this.logCapture = createLogCapture();
    this.retryEngine = createRetryEngine(this.processManager, this.logCapture, {
      maxAttempts: this.maxRetries,
    });
    this.previewServer = createPreviewServer(this.processManager);
    this.visualRegression = createVisualRegression();
  }

  /** Access sub-components for advanced use */
  getProcessManager(): ProcessManager { return this.processManager; }
  getLogCapture(): LogCapture { return this.logCapture; }
  getRetryEngine(): RetryEngine { return this.retryEngine; }
  getPreviewServer(): PreviewServer { return this.previewServer; }
  getVisualRegression(): VisualRegression { return this.visualRegression; }

  /**
   * Run the full build lifecycle with retry and preview.
   */
  async run(options?: {
    skipInstall?: boolean;
    skipBuild?: boolean;
    skipTest?: boolean;
    skipPreview?: boolean;
    skipScreenshot?: boolean;
    env?: Record<string, string>;
  }): Promise<RuntimeRunResult> {
    const startTime = Date.now();
    const logs: LogEntry[] = [];
    const allFailures: FailureInfo[] = [];
    const allRetries: RuntimeRetryContext[] = [];
    const allFixes: FixSuggestion[] = [];
    let installResult: ProcessResult | undefined;
    let buildResult: ProcessResult | undefined;
    let testResult: ProcessResult | undefined;
    let previewUrl: string | undefined;
    const screenshots: ScreenshotResult[] = [];
    const visualDiffs: VisualDiffResult[] = [];

    const buildParts = this.buildCommand.split(/\s+/);
    const testParts = this.testCommand.split(/\s+/);
    const buildCmd = buildParts[0] ?? 'npm';
    const buildArgs = buildParts.slice(1);
    const testCmd = testParts[0] ?? 'npm';
    const testArgs = testParts.slice(1);

    // ── Step 1: Install ────────────────────────────────────────────────
    if (!options?.skipInstall) {
      this.logCapture.reset();
      const installCtx = await this.retryEngine.executeWithRetry(
        {
          cwd: this.projectRoot,
          command: this.packageManager,
          args: ['install'],
          env: options?.env,
          label: 'install',
          timeoutMs: 300_000,
        },
        this.projectRoot,
      );
      installResult = installCtx.result;
      logs.push(...this.logCapture.getLogs());
      allFailures.push(...this.logCapture.getFailures());
      allRetries.push(...installCtx.retries);
      allFixes.push(...installCtx.appliedFixes);

      if (installResult.status !== 'success') {
        return this.buildRunResult({
          success: false,
          install: installResult,
          build: undefined,
          test: undefined,
          logs,
          failures: allFailures,
          retries: allRetries,
          previewUrl: undefined,
          screenshots,
          visualDiffs,
          durationMs: Date.now() - startTime,
        });
      }
    }

    // ── Step 2: Build ──────────────────────────────────────────────────
    if (!options?.skipBuild) {
      this.logCapture.reset();
      const buildCtx = await this.retryEngine.executeWithRetry(
        {
          cwd: this.projectRoot,
          command: buildCmd,
          args: buildArgs,
          env: options?.env,
          label: 'build',
          timeoutMs: 300_000,
        },
        this.projectRoot,
      );
      buildResult = buildCtx.result;
      logs.push(...this.logCapture.getLogs());
      allFailures.push(...this.logCapture.getFailures());
      allRetries.push(...buildCtx.retries);
      allFixes.push(...buildCtx.appliedFixes);

      if (buildResult.status !== 'success') {
        return this.buildRunResult({
          success: false,
          install: installResult,
          build: buildResult,
          test: undefined,
          logs,
          failures: allFailures,
          retries: allRetries,
          previewUrl: undefined,
          screenshots,
          visualDiffs,
          durationMs: Date.now() - startTime,
        });
      }
    }

    // ── Step 3: Test ───────────────────────────────────────────────────
    if (!options?.skipTest) {
      this.logCapture.reset();
      const testCtx = await this.retryEngine.executeWithRetry(
        {
          cwd: this.projectRoot,
          command: testCmd,
          args: testArgs,
          env: { ...options?.env, CI: 'true' },
          label: 'test',
          timeoutMs: 180_000,
        },
        this.projectRoot,
      );
      testResult = testCtx.result;
      logs.push(...this.logCapture.getLogs());
      allFailures.push(...this.logCapture.getFailures());
      allRetries.push(...testCtx.retries);
      allFixes.push(...testCtx.appliedFixes);
    }

    // ── Step 4: Preview Server ─────────────────────────────────────────
    if (!options?.skipPreview) {
      try {
        const preview = await this.previewServer.startDev(
          this.projectRoot,
          undefined,
          this.devPort,
          options?.env,
        );
        previewUrl = preview.url;

        // ── Step 5: Screenshots ────────────────────────────────────────
        if (!options?.skipScreenshot && this.captureScreenshots) {
          try {
            const screenshot = await this.visualRegression.screenshot(preview.url, {
              width: this.screenshotViewport.width,
              height: this.screenshotViewport.height,
              waitForNetworkIdle: true,
              waitAfterLoad: 2000,
            });
            screenshots.push(screenshot);
          } catch (err) {
            logs.push({
              timestamp: Date.now(),
              level: 'warn',
              message: `Screenshot capture failed: ${err}`,
              source: 'runtime',
              raw: String(err),
            });
          }
        }

        await new Promise((r) => setTimeout(r, 1000));
        await this.previewServer.kill(preview.port);
      } catch (err) {
        logs.push({
          timestamp: Date.now(),
          level: 'error',
          message: `Preview server failed: ${err}`,
          source: 'runtime',
          raw: String(err),
        });
      }
    }

    const success = allFailures.length === 0 ||
      (buildResult?.status === 'success' && allFailures.every((f) => f.category === 'test'));

    return this.buildRunResult({
      success,
      install: installResult,
      build: buildResult,
      test: testResult,
      logs,
      failures: allFailures,
      retries: allRetries,
      previewUrl,
      screenshots,
      visualDiffs,
      durationMs: Date.now() - startTime,
    });
  }

  /**
   * Install only.
   */
  async install(env?: Record<string, string>): Promise<ProcessResult> {
    this.logCapture.reset();
    const ctx = await this.retryEngine.executeWithRetry(
      {
        cwd: this.projectRoot,
        command: this.packageManager,
        args: ['install'],
        env,
        label: 'install',
        timeoutMs: 300_000,
      },
      this.projectRoot,
    );
    return ctx.result;
  }

  /**
   * Build only.
   */
  async build(env?: Record<string, string>): Promise<ProcessResult> {
    this.logCapture.reset();
    const parts = this.buildCommand.split(/\s+/);
    const ctx = await this.retryEngine.executeWithRetry(
      {
        cwd: this.projectRoot,
        command: parts[0] ?? 'npm',
        args: parts.slice(1),
        env,
        label: 'build',
        timeoutMs: 300_000,
      },
      this.projectRoot,
    );
    return ctx.result;
  }

  /**
   * Test only.
   */
  async test(env?: Record<string, string>): Promise<ProcessResult> {
    this.logCapture.reset();
    const parts = this.testCommand.split(/\s+/);
    const ctx = await this.retryEngine.executeWithRetry(
      {
        cwd: this.projectRoot,
        command: parts[0] ?? 'npm',
        args: parts.slice(1),
        env: { ...env, CI: 'true' },
        label: 'test',
        timeoutMs: 180_000,
      },
      this.projectRoot,
    );
    return ctx.result;
  }

  /**
   * Start preview server and capture screenshot.
   */
  async previewAndCapture(
    env?: Record<string, string>,
  ): Promise<{ url: string; screenshot: ScreenshotResult | null }> {
    const preview = await this.previewServer.startDev(
      this.projectRoot,
      undefined,
      this.devPort,
      env,
    );

    let screenshot: ScreenshotResult | null = null;
    try {
      screenshot = await this.visualRegression.screenshot(preview.url, {
        width: this.screenshotViewport.width,
        height: this.screenshotViewport.height,
        waitForNetworkIdle: true,
        waitAfterLoad: 2000,
      });
    } catch { /* noop */ }

    return { url: preview.url, screenshot };
  }

  /**
   * Generate a human-readable report.
   */
  report(result: RuntimeRunResult): string {
    const lines: string[] = [];
    lines.push('# Runtime Report');
    lines.push(`Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
    lines.push(`Success: ${result.success}`);
    lines.push('');

    if (result.install) {
      lines.push(`## Install: ${result.install.status} (${(result.install.durationMs / 1000).toFixed(1)}s)`);
    }
    if (result.build) {
      lines.push(`## Build: ${result.build.status} (${(result.build.durationMs / 1000).toFixed(1)}s)`);
    }
    if (result.test) {
      lines.push(`## Test: ${result.test.status} (${(result.test.durationMs / 1000).toFixed(1)}s)`);
    }

    if (result.failures.length > 0) {
      lines.push('');
      lines.push(`## Failures (${result.failures.length})`);
      for (const f of result.failures) {
        lines.push(`- [${f.category}] ${f.message.slice(0, 120)}`);
        if (f.suggestedFix) lines.push(`  Fix: ${f.suggestedFix}`);
      }
    }

    if (result.retries.length > 0) {
      lines.push('');
      lines.push(`## Retries (${result.retries.length})`);
      for (const r of result.retries) {
        lines.push(`- Attempt ${r.attempt}/${r.maxAttempts}: ${r.failure.message.slice(0, 80)}`);
      }
    }

    if (result.previewUrl) {
      lines.push('');
      lines.push(`## Preview: ${result.previewUrl}`);
    }

    if (result.screenshots.length > 0) {
      lines.push('');
      lines.push(`## Screenshots (${result.screenshots.length})`);
      for (const s of result.screenshots) {
        lines.push(`- ${s.filePath} (${s.viewport.width}x${s.viewport.height})`);
      }
    }

    return lines.join('\n');
  }

  private buildRunResult(partial: RuntimeRunResult): RuntimeRunResult {
    return partial;
  }
}

export function createRuntimeEngine(config?: Partial<RuntimeConfig>): RuntimeEngine {
  return new RuntimeEngine(config);
}
