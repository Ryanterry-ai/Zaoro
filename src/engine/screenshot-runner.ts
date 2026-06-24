// ─── Screenshot Runner ───────────────────────────────────────────
// Captures screenshots of generated sites at multiple viewports,
// scroll positions, and states. Produces a screenshot manifest.

import * as fs from 'fs';
import * as path from 'path';
import { RuntimeManager, ScreenshotResult } from './runtime-manager.js';

export interface ScreenshotConfig {
  viewports: Array<{ width: number; height: number; label: string }>;
  scrollPositions: number[];
  waitForNetwork: boolean;
  waitForTimeout: number;
  outputDir: string;
}

export interface ScreenshotManifest {
  workspaceRoot: string;
  url: string;
  screenshots: ScreenshotResult[];
  totalSize: number;
  timestamp: number;
}

const DEFAULT_SCREENSHOT_CONFIG: ScreenshotConfig = {
  viewports: [
    { width: 1440, height: 900, label: 'desktop' },
    { width: 768, height: 1024, label: 'tablet' },
    { width: 375, height: 812, label: 'mobile' },
  ],
  scrollPositions: [0, 0.25, 0.5, 0.75, 1.0],
  waitForNetwork: true,
  waitForTimeout: 2000,
  outputDir: 'screenshots',
};

export class ScreenshotRunner {
  private runtime: RuntimeManager;
  private config: ScreenshotConfig;
  private workspaceRoot: string;
  private logFn: ((step: string, msg: string, data?: Record<string, unknown>) => void) | undefined;

  constructor(
    workspaceRoot: string,
    runtime: RuntimeManager,
    config?: Partial<ScreenshotConfig>,
    logFn?: (step: string, msg: string, data?: Record<string, unknown>) => void,
  ) {
    this.workspaceRoot = workspaceRoot;
    this.runtime = runtime;
    this.config = { ...DEFAULT_SCREENSHOT_CONFIG, ...config };
    this.config.outputDir = path.join(workspaceRoot, this.config.outputDir);
    this.logFn = logFn;
  }

  private log(msg: string) {
    console.log(`[screenshot-runner] ${msg}`);
    this.logFn?.('screenshot-runner', msg);
  }

  async capture(url: string): Promise<ScreenshotManifest> {
    this.log(`Capturing screenshots for ${url}`);

    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    const screenshots: ScreenshotResult[] = [];

    const page = await this.runtime.navigate(url);

    // Wait for page to be ready
    if (this.config.waitForNetwork) {
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    }
    await page.waitForTimeout(this.config.waitForTimeout);

    // Capture at each viewport
    for (const vp of this.config.viewports) {
      this.log(`Capturing at ${vp.label} (${vp.width}x${vp.height})`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(500);

      // Full page screenshot
      const fullResult = await this.runtime.takeScreenshot(page, `${vp.label}_full`, this.config.outputDir);
      screenshots.push(fullResult);

      // Viewport-only screenshot
      const vpResult = await this.runtime.takeScreenshot(page, `${vp.label}_viewport`, this.config.outputDir);
      screenshots.push(vpResult);

      // Scroll position screenshots
      for (const scrollPct of this.config.scrollPositions) {
        await page.evaluate((pct: number) => {
          window.scrollTo(0, document.body.scrollHeight * pct);
        }, scrollPct);
        await page.waitForTimeout(300);

        const scrollResult = await this.runtime.takeScreenshot(
          page,
          `${vp.label}_scroll_${Math.round(scrollPct * 100)}`,
          this.config.outputDir,
        );
        screenshots.push(scrollResult);
      }

      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
    }

    // Calculate total size
    let totalSize = 0;
    for (const ss of screenshots) {
      try {
        const stat = fs.statSync(ss.path);
        totalSize += stat.size;
      } catch {}
    }

    const manifest: ScreenshotManifest = {
      workspaceRoot: this.workspaceRoot,
      url,
      screenshots,
      totalSize,
      timestamp: Date.now(),
    };

    // Write manifest
    const manifestPath = path.join(this.config.outputDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    this.log(`Captured ${screenshots.length} screenshots (${(totalSize / 1024).toFixed(1)} KB) — manifest written`);
    return manifest;
  }
}
