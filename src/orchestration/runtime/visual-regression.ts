// ─── Visual Regression ──────────────────────────────────────────────────────
//
// Playwright-based screenshot capture and pixel-level comparison.
// Supports multi-viewport, masking, and performance metrics.
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'node:fs';
import path from 'node:path';
import type {
  ScreenshotOptions,
  ScreenshotResult,
  VisualDiffResult,
  PageMetrics,
} from './types.js';

// ─── Screenshot Engine ──────────────────────────────────────────────────────

let playwright: typeof import('playwright') | undefined;

async function getPlaywright(): Promise<typeof import('playwright')> {
  if (!playwright) {
    playwright = await import('playwright');
  }
  return playwright;
}

export class VisualRegression {
  private outputDir: string;

  constructor(outputDir: string = '.build-anything/screenshots') {
    this.outputDir = outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Capture a screenshot of a URL.
   */
  async screenshot(
    url: string,
    options?: ScreenshotOptions,
  ): Promise<ScreenshotResult> {
    const pw = await getPlaywright();
    const browser = await pw.chromium.launch({ headless: true });
    const width = options?.width ?? 1280;
    const height = options?.height ?? 800;

    try {
      const context = await browser.newContext({
        viewport: { width, height },
      });
      const page = await context.newPage();

      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      const startTime = Date.now();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      if (options?.waitAfterLoad) {
        await page.waitForTimeout(options.waitAfterLoad);
      }

      if (options?.waitForSelectors) {
        for (const sel of options.waitForSelectors) {
          await page.waitForSelector(sel, { timeout: 5000 }).catch(() => {});
        }
      }

      // Mask dynamic content
      if (options?.maskSelectors) {
        for (const sel of options.maskSelectors) {
          await page.evaluate((s) => {
            const els = document.querySelectorAll(s);
            els.forEach((el) => {
              (el as HTMLElement).style.backgroundColor = '#ccc';
              (el as HTMLElement).style.color = 'transparent';
            });
          }, sel);
        }
      }

      // Capture performance metrics
      const metrics = await this.captureMetrics(page);

      // Generate filename
      const timestamp = Date.now();
      const safeUrl = url.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50);
      const filename = `${safeUrl}_${width}x${height}_${timestamp}.png`;
      const filePath = path.join(this.outputDir, filename);

      await page.screenshot({
        path: filePath,
        fullPage: options?.fullPage ?? false,
      });

      const title = await page.title();

      return {
        filePath,
        viewport: { width, height },
        title,
        url,
        consoleErrors,
        metrics,
      };
    } finally {
      await browser.close();
    }
  }

  /**
   * Capture screenshots at multiple viewports.
   */
  async multiViewport(
    url: string,
    viewports: Array<{ width: number; height: number; label?: string }>,
    options?: ScreenshotOptions,
  ): Promise<ScreenshotResult[]> {
    const results: ScreenshotResult[] = [];
    for (const vp of viewports) {
      const result = await this.screenshot(url, {
        ...options,
        width: vp.width,
        height: vp.height,
      });
      results.push(result);
    }
    return results;
  }

  /**
   * Capture performance metrics from a page.
   */
  private async captureMetrics(page: import('playwright').Page): Promise<PageMetrics> {
    const perf = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const paint = performance.getEntriesByType('paint');
      const fcp = paint.find((p) => p.name === 'first-contentful-paint');

      let lcp = 0;
      try {
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        const lastEntry = lcpEntries[lcpEntries.length - 1];
        lcp = lastEntry ? lastEntry.startTime : 0;
      } catch { /* LCP may not be available */ }

      return {
        domContentLoaded: nav?.domContentLoadedEventEnd ?? 0,
        load: nav?.loadEventEnd ?? 0,
        fcp: fcp?.startTime ?? 0,
        lcp: lcp || undefined,
        domNodes: document.querySelectorAll('*').length,
        jsHeapSize: (performance as any).memory?.usedJSHeapSize ?? 0,
      };
    });

    return {
      domContentLoaded: perf.domContentLoaded,
      load: perf.load,
      fcp: perf.fcp || undefined,
      lcp: perf.lcp || undefined,
      domNodes: perf.domNodes,
      jsHeapSize: perf.jsHeapSize,
    };
  }

  /**
   * Compare two screenshots using pixelmatch.
   */
  async compare(
    baselinePath: string,
    currentPath: string,
    threshold: number = 0.1,
  ): Promise<VisualDiffResult> {
    const { PNG } = await import('pngjs');
    const { default: pixelmatch } = await import('pixelmatch');

    const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
    const current = PNG.sync.read(fs.readFileSync(currentPath));

    // Resize to match if different
    const width = Math.max(baseline.width, current.width);
    const height = Math.max(baseline.height, current.height);

    const baselineResized = await this.resizePNG(baseline, width, height);
    const currentResized = await this.resizePNG(current, width, height);

    const diff = new PNG({ width, height });
    const diffPixels = pixelmatch(
      baselineResized.data,
      currentResized.data,
      diff.data,
      width,
      height,
      { threshold },
    );

    const totalPixels = width * height;
    const mismatchPercentage = (diffPixels / totalPixels) * 100;

    // Save diff image
    const diffPath = baselinePath.replace(/\.png$/, '_diff.png');
    fs.writeFileSync(diffPath, PNG.sync.write(diff));

    return {
      match: diffPixels === 0,
      mismatchPercentage: Math.round(mismatchPercentage * 100) / 100,
      diffImagePath: diffPath,
      baselinePath,
      currentPath,
      diffPixels,
      totalPixels,
    };
  }

  /**
   * Resize a PNG to target dimensions (center-crop or pad).
   */
  private async resizePNG(
    png: import('pngjs').PNG,
    targetWidth: number,
    targetHeight: number,
  ): Promise<import('pngjs').PNG> {
    if (png.width === targetWidth && png.height === targetHeight) {
      return png;
    }

    const { PNG } = await import('pngjs');
    const resized = new PNG({ width: targetWidth, height: targetHeight });
    // Fill with white
    resized.data.fill(255);

    const copyWidth = Math.min(png.width, targetWidth);
    const copyHeight = Math.min(png.height, targetHeight);

    for (let y = 0; y < copyHeight; y++) {
      for (let x = 0; x < copyWidth; x++) {
        const srcIdx = (y * png.width + x) << 2;
        const dstIdx = (y * targetWidth + x) << 2;
        resized.data[dstIdx] = png.data[srcIdx] ?? 0;
        resized.data[dstIdx + 1] = png.data[srcIdx + 1] ?? 0;
        resized.data[dstIdx + 2] = png.data[srcIdx + 2] ?? 0;
        resized.data[dstIdx + 3] = png.data[srcIdx + 3] ?? 0;
      }
    }

    return resized;
  }

  /**
   * Full regression run: screenshot baseline, compare with current.
   */
  async regression(
    url: string,
    baselineDir: string,
    options?: ScreenshotOptions,
  ): Promise<{
    screenshot: ScreenshotResult;
    diff: VisualDiffResult | null;
    isNewBaseline: boolean;
  }> {
    const screenshot = await this.screenshot(url, options);

    // Check for existing baseline
    const baselineName = `baseline_${screenshot.viewport.width}x${screenshot.viewport.height}.png`;
    const baselinePath = path.join(baselineDir, baselineName);

    if (fs.existsSync(baselinePath)) {
      const diff = await this.compare(baselinePath, screenshot.filePath);
      return { screenshot, diff, isNewBaseline: false };
    }

    // No baseline exists — save current as baseline
    if (!fs.existsSync(baselineDir)) {
      fs.mkdirSync(baselineDir, { recursive: true });
    }
    fs.copyFileSync(screenshot.filePath, baselinePath);

    return {
      screenshot,
      diff: null,
      isNewBaseline: true,
    };
  }

  // ── Baseline Lifecycle Management ────────────────────────────────

  /**
   * Get the status of all baselines in a directory.
   */
  getBaselineStatus(baselineDir: string): {
    total: number;
    existing: string[];
    missing: string[];
    stale: string[];
  } {
    const existing: string[] = [];
    const stale: string[] = [];
    const now = Date.now();
    const staleAfterMs = 7 * 24 * 60 * 60 * 1000;

    if (fs.existsSync(baselineDir)) {
      for (const file of fs.readdirSync(baselineDir)) {
        if (file.endsWith('.png') && !file.endsWith('_diff.png')) {
          const filePath = path.join(baselineDir, file);
          existing.push(file);
          const stat = fs.statSync(filePath);
          if (now - stat.mtimeMs > staleAfterMs) {
            stale.push(file);
          }
        }
      }
    }

    return { total: existing.length, existing, missing: [], stale };
  }

  /**
   * Capture baselines for all specified viewports if they don't already exist.
   */
  async captureMissingBaselines(
    url: string,
    baselineDir: string,
    viewports: Array<{ width: number; height: number }>,
  ): Promise<string[]> {
    const captured: string[] = [];

    for (const vp of viewports) {
      const baselineName = `baseline_${vp.width}x${vp.height}.png`;
      const baselinePath = path.join(baselineDir, baselineName);

      if (!fs.existsSync(baselinePath)) {
        const screenshot = await this.screenshot(url, {
          width: vp.width,
          height: vp.height,
          waitForNetworkIdle: true,
          waitAfterLoad: 2000,
        });

        if (!fs.existsSync(baselineDir)) {
          fs.mkdirSync(baselineDir, { recursive: true });
        }
        fs.copyFileSync(screenshot.filePath, baselinePath);
        captured.push(baselineName);
      }
    }

    return captured;
  }

  /**
   * Update baselines — promote current screenshots to be the new baselines.
   */
  async updateBaselines(
    baselineDir: string,
    keepBackup: boolean = false,
  ): Promise<{ updated: number; backups: number }> {
    let updated = 0;
    let backups = 0;

    if (!fs.existsSync(baselineDir)) return { updated, backups };

    for (const file of fs.readdirSync(baselineDir)) {
      if (file.endsWith('.png') && !file.endsWith('_diff.png') && !file.endsWith('.bak.png')) {
        if (keepBackup) {
          const backupPath = path.join(baselineDir, file.replace('.png', '.bak.png'));
          if (!fs.existsSync(backupPath)) {
            fs.copyFileSync(path.join(baselineDir, file), backupPath);
            backups++;
          }
        }
        updated++;
      }
    }

    return { updated, backups };
  }

  /**
   * Run the full baseline lifecycle: capture missing, compare, update.
   */
  async runBaselineLifecycle(
    url: string,
    baselineDir: string,
    options?: {
      viewports?: Array<{ width: number; height: number }>;
      updateThreshold?: number;
      autoUpdate?: boolean;
      screenshotOptions?: ScreenshotOptions;
    },
  ): Promise<{
    status: { total: number; existing: string[]; missing: string[]; stale: string[] };
    captured: string[];
    results: Array<{
      viewport: string;
      diff: VisualDiffResult | null;
      match: boolean;
    }>;
    updated: number;
  }> {
    const viewports = options?.viewports ?? [
      { width: 1280, height: 800 },
      { width: 768, height: 1024 },
      { width: 375, height: 667 },
    ];

    const status = this.getBaselineStatus(baselineDir);
    status.missing = viewports
      .map(vp => `baseline_${vp.width}x${vp.height}.png`)
      .filter(name => !fs.existsSync(path.join(baselineDir, name)));

    const captured = await this.captureMissingBaselines(url, baselineDir, viewports);

    const results: Array<{
      viewport: string;
      diff: VisualDiffResult | null;
      match: boolean;
    }> = [];

    for (const vp of viewports) {
      const baselineName = `baseline_${vp.width}x${vp.height}.png`;
      const baselinePath = path.join(baselineDir, baselineName);

      if (fs.existsSync(baselinePath)) {
        const screenshot = await this.screenshot(url, {
          ...(options?.screenshotOptions ?? {}),
          width: vp.width,
          height: vp.height,
          waitForNetworkIdle: true,
          waitAfterLoad: 2000,
        });

        const diff = await this.compare(
          baselinePath,
          screenshot.filePath,
          options?.updateThreshold ?? 0.1,
        );

        results.push({
          viewport: baselineName,
          diff,
          match: diff.match,
        });
      }
    }

    let updated = 0;
    if (options?.autoUpdate) {
      const result = await this.updateBaselines(baselineDir, false);
      updated = result.updated;
    }

    return { status, captured, results, updated };
  }
}

export function createVisualRegression(outputDir?: string): VisualRegression {
  return new VisualRegression(outputDir);
}
