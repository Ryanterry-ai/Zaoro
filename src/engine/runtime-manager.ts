// ─── Runtime Manager ─────────────────────────────────────────────
// Playwright-based runtime for managing browser instances,
// page contexts, screenshots, console logs, and performance metrics.

import type { Browser, BrowserContext, Page, ConsoleMessage } from 'playwright';

export interface RuntimeConfig {
  headless: boolean;
  viewport: { width: number; height: number };
  timeout: number;
  userAgent: string;
}

export interface PageResult {
  url: string;
  title: string;
  html: string;
  consoleLogs: ConsoleLog[];
  errors: string[];
  screenshots: ScreenshotResult[];
  performance: PerformanceMetrics;
  links: string[];
  images: string[];
  brokenAssets: string[];
}

export interface ConsoleLog {
  type: string;
  text: string;
  url: string;
  timestamp: number;
}

export interface ScreenshotResult {
  name: string;
  path: string;
  width: number;
  height: number;
  timestamp: number;
}

export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  resourceCount: number;
  totalResourceSize: number;
  jsErrors: number;
}

export interface RuntimeState {
  browser: Browser | null;
  context: BrowserContext | null;
  pages: Map<string, Page>;
  isRunning: boolean;
}

const DEFAULT_CONFIG: RuntimeConfig = {
  headless: true,
  viewport: { width: 1440, height: 900 },
  timeout: 30000,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

export class RuntimeManager {
  private state: RuntimeState;
  private config: RuntimeConfig;
  private logFn: ((step: string, msg: string, data?: Record<string, unknown>) => void) | undefined;

  constructor(
    config?: Partial<RuntimeConfig>,
    logFn?: (step: string, msg: string, data?: Record<string, unknown>) => void,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logFn = logFn;
    this.state = {
      browser: null,
      context: null,
      pages: new Map(),
      isRunning: false,
    };
  }

  private log(msg: string) {
    console.log(`[runtime] ${msg}`);
    this.logFn?.('runtime', msg);
  }

  async start(): Promise<void> {
    if (this.state.isRunning) return;

    this.log('Starting Playwright browser...');
    const { chromium } = await import('playwright');
    this.state.browser = await chromium.launch({
      headless: this.config.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    this.state.context = await this.state.browser.newContext({
      viewport: this.config.viewport,
      userAgent: this.config.userAgent,
    });
    this.state.isRunning = true;
    this.log(`Browser started — viewport ${this.config.viewport.width}x${this.config.viewport.height}`);
  }

  async stop(): Promise<void> {
    if (!this.state.isRunning) return;

    this.log('Stopping browser...');
    for (const [, page] of this.state.pages) {
      try { await page.close(); } catch {}
    }
    this.state.pages.clear();

    try { await this.state.context?.close(); } catch {}
    try { await this.state.browser?.close(); } catch {}

    this.state.browser = null;
    this.state.context = null;
    this.state.isRunning = false;
    this.log('Browser stopped');
  }

  async navigate(url: string): Promise<Page> {
    if (!this.state.context) throw new Error('Runtime not started — call start() first');

    this.log(`Navigating to ${url}`);
    const page = await this.state.context.newPage();
    this.state.pages.set(url, page);
    return page;
  }

  async capturePage(url: string, page: Page): Promise<PageResult> {
    const consoleLogs: ConsoleLog[] = [];
    const errors: string[] = [];
    const startTime = Date.now();

    // Collect console logs
    page.on('console', (msg: ConsoleMessage) => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        url: url,
        timestamp: Date.now(),
      });
    });

    // Collect page errors
    page.on('pageerror', (err: Error) => {
      errors.push(err.message);
    });

    try {
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      });

      const loadTime = Date.now() - startTime;

      // Wait for content
      await page.waitForTimeout(2000);

      // Get title
      const title = await page.title();

      // Get HTML
      const html = await page.content();

      // Collect all links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]')).map(a => (a as HTMLAnchorElement).href);
      });

      // Collect all images and check for broken ones
      const images = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img[src]')).map(img => (img as HTMLImageElement).src);
      });

      // Check for broken assets
      const brokenAssets = await page.evaluate(() => {
        const broken: string[] = [];
        document.querySelectorAll('img[src]').forEach(img => {
          const el = img as HTMLImageElement;
          if (!el.complete || el.naturalWidth === 0) {
            broken.push(el.src);
          }
        });
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
          const el = link as HTMLLinkElement;
          if (!el.sheet || el.sheet.cssRules.length === 0) {
            broken.push(el.href);
          }
        });
        return broken;
      });

      // Performance metrics
      const perfData = await page.evaluate(() => {
        const perf = globalThis.performance;
        const entries = perf.getEntriesByType('resource') as PerformanceResourceTiming[];
        return {
          loadTime: perf.now(),
          domContentLoaded: 0,
          firstPaint: 0,
          resourceCount: entries.length,
          totalResourceSize: entries.reduce((sum: number, e: PerformanceResourceTiming) => sum + (e.transferSize || 0), 0),
          jsErrors: 0,
        };
      });
      perfData.jsErrors = errors.length;

      return {
        url,
        title,
        html,
        consoleLogs,
        errors,
        screenshots: [],
        performance: perfData,
        links,
        images,
        brokenAssets,
      };
    } catch (err: any) {
      errors.push(err.message);
      return {
        url,
        title: '',
        html: '',
        consoleLogs,
        errors,
        screenshots: [],
        performance: { loadTime: 0, domContentLoaded: 0, firstPaint: 0, resourceCount: 0, totalResourceSize: 0, jsErrors: errors.length },
        links: [],
        images: [],
        brokenAssets: [],
      };
    }
  }

  async takeScreenshot(page: Page, name: string, outputDir: string): Promise<ScreenshotResult> {
    const fs = await import('fs');
    const path = await import('path');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `${name.replace(/[^a-zA-Z0-9-]/g, '_')}.png`;
    const filepath = path.join(outputDir, filename);

    await page.screenshot({
      path: filepath,
      fullPage: true,
    });

    const size = this.config.viewport;
    this.log(`Screenshot saved: ${filename}`);

    return {
      name,
      path: filepath,
      width: size.width,
      height: size.height,
      timestamp: Date.now(),
    };
  }

  async takeViewportScreenshots(page: Page, name: string, outputDir: string): Promise<ScreenshotResult[]> {
    const results: ScreenshotResult[] = [];
    const viewports = [
      { width: 1440, height: 900, label: 'desktop' },
      { width: 768, height: 1024, label: 'tablet' },
      { width: 375, height: 812, label: 'mobile' },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(500);
      const result = await this.takeScreenshot(page, `${name}_${vp.label}`, outputDir);
      results.push(result);
    }

    return results;
  }

  getState(): RuntimeState {
    return this.state;
  }

  getConfig(): RuntimeConfig {
    return this.config;
  }
}
