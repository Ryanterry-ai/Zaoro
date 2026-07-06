// ─── E2E Tester ────────────────────────────────────────────────────
// Full E2E verification of generated sites: start dev server,
// run Playwright checks (console errors, broken assets, blank screens,
// hydration, accessibility), capture screenshots, report results.

import * as fs from 'fs';
import * as path from 'path';
import { BuildRunner, DevServerResult } from '../engine/build-runner.js';
import { BrowserVerifier, VerificationResult } from '../engine/browser-verifier.js';
import { ScreenshotRunner, ScreenshotManifest } from '../engine/screenshot-runner.js';
import { RuntimeManager } from '../engine/runtime-manager.js';

export interface E2EConfig {
  port: number;
  devStartupTimeoutMs: number;
  screenshotViewports: Array<{ width: number; height: number; label: string }>;
  headless: boolean;
  maxRetries: number;
}

export interface E2EResult {
  passed: boolean;
  score: number;
  devServer: DevServerResult;
  verification: VerificationResult | null;
  screenshots: ScreenshotManifest | null;
  totalDuration: number;
  errors: string[];
}

const DEFAULT_E2E_CONFIG: E2EConfig = {
  port: 4567,
  devStartupTimeoutMs: 30000,
  screenshotViewports: [
    { width: 1440, height: 900, label: 'desktop' },
    { width: 375, height: 812, label: 'mobile' },
  ],
  headless: true,
  maxRetries: 2,
};

export class E2ETester {
  private config: E2EConfig;
  private workspaceRoot: string;
  private buildRunner: BuildRunner;
  private runtime: RuntimeManager | null = null;

  constructor(
    workspaceRoot: string,
    config?: Partial<E2EConfig>,
  ) {
    this.workspaceRoot = workspaceRoot;
    this.config = { ...DEFAULT_E2E_CONFIG, ...config };
    this.buildRunner = new BuildRunner(workspaceRoot, {
      devCommand: 'npx next dev',
      port: this.config.port,
      devStartupTimeoutMs: this.config.devStartupTimeoutMs,
    });
  }

  async run(urls: string[]): Promise<E2EResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let verification: VerificationResult | null = null;
    let screenshots: ScreenshotManifest | null = null;

    const devServer = await this.buildRunner.startDevServer();
    if (!devServer.running) {
      errors.push('Dev server failed to start');
      return {
        passed: false,
        score: 0,
        devServer,
        verification: null,
        screenshots: null,
        totalDuration: Date.now() - startTime,
        errors,
      };
    }

    try {
      const runtime = new RuntimeManager({
        headless: this.config.headless,
        viewport: { width: 1440, height: 900 },
        timeout: 15000,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });
      this.runtime = runtime;
      await runtime.start();

      const verifier = new BrowserVerifier(runtime);
      verification = await verifier.verify(urls);

      if (verification.passed) {
        const screenshotRunner = new ScreenshotRunner(
          this.workspaceRoot,
          runtime,
          {
            viewports: this.config.screenshotViewports,
            waitForTimeout: 2000,
          },
        );
        screenshots = await screenshotRunner.capture(urls[0] ?? devServer.url);
      }
    } catch (e: unknown) {
      const msg = (e as Error).message;
      errors.push(`E2E test error: ${msg}`);
    } finally {
      if (this.runtime) {
        try { await this.runtime.stop(); } catch {}
        this.runtime = null;
      }
      await this.buildRunner.stopDevServer();
    }

    const score = verification ? verification.score : 0;
    return {
      passed: verification ? verification.passed : false,
      score,
      devServer,
      verification,
      screenshots,
      totalDuration: Date.now() - startTime,
      errors,
    };
  }
}
