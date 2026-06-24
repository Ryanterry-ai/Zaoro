// ─── Visual Diff Engine ──────────────────────────────────────────
// Compares screenshots of original vs clone sites at pixel level.
// Produces diff images, similarity scores, and per-section breakdown.

import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import type { Browser, Page } from 'playwright';

export interface DiffConfig {
  viewports: Array<{ width: number; height: number; label: string }>;
  threshold: number;        // 0-1, pixel color distance threshold (0.1 = strict)
  outputDir: string;
}

export interface DiffResult {
  viewport: string;
  originalPath: string;
  clonePath: string;
  diffPath: string;
  totalPixels: number;
  diffPixels: number;
  similarity: number;       // 0-100 percentage
  diffPercentage: number;   // 0-100
}

export interface VisualDiffReport {
  workspaceRoot: string;
  originalUrl: string;
  cloneUrl: string;
  overallSimilarity: number;
  viewportResults: DiffResult[];
  sectionComparison: SectionComparison[];
  timestamp: number;
}

export interface SectionComparison {
  section: string;          // e.g. "hero", "features", "pricing", "footer"
  originalPresent: boolean;
  clonePresent: boolean;
  originalOrder: number;
  cloneOrder: number;
  orderMatch: boolean;
  textSimilarity: number;   // 0-100
  visualSimilarity: number; // 0-100
  issues: string[];
}

const DEFAULT_DIFF_CONFIG: DiffConfig = {
  viewports: [
    { width: 1440, height: 900, label: 'desktop' },
    { width: 375, height: 812, label: 'mobile' },
  ],
  threshold: 0.1,
  outputDir: 'visual-diff',
};

export class VisualDiffEngine {
  private browser: Browser | null = null;
  private config: DiffConfig;
  private workspaceRoot: string;
  private logFn: ((step: string, msg: string, data?: Record<string, unknown>) => void) | undefined;

  constructor(
    workspaceRoot: string,
    config?: Partial<DiffConfig>,
    logFn?: (step: string, msg: string, data?: Record<string, unknown>) => void,
  ) {
    this.workspaceRoot = workspaceRoot;
    this.config = { ...DEFAULT_DIFF_CONFIG, ...config };
    this.config.outputDir = path.join(workspaceRoot, this.config.outputDir);
    this.logFn = logFn;
  }

  private log(msg: string) {
    console.log(`[visual-diff] ${msg}`);
    this.logFn?.('visual-diff', msg);
  }

  private async ensureBrowser(): Promise<Browser> {
    if (!this.browser) {
      const pw = await import('playwright');
      this.browser = await pw.chromium.launch({ headless: true });
    }
    return this.browser;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // ─── Screenshot Capture ─────────────────────────────────────────

  private async captureScreenshot(
    page: Page,
    url: string,
    viewport: { width: number; height: number; label: string },
    prefix: string,
  ): Promise<string> {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const filePath = path.join(this.config.outputDir, `${prefix}_${viewport.label}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  }

  // ─── Pixel Diff ─────────────────────────────────────────────────

  private computeDiff(
    originalPath: string,
    clonePath: string,
    diffPath: string,
    viewportLabel: string,
  ): DiffResult {
    const original = PNG.sync.read(fs.readFileSync(originalPath));
    const clone = PNG.sync.read(fs.readFileSync(clonePath));

    // Ensure same dimensions — resize clone to match original
    const width = original.width;
    const height = original.height;

    // Resize clone to match original dimensions
    const resizedClone = this.resizePNG(clone, width, height);

    const diff = new PNG({ width, height });

    const diffPixels = pixelmatch(
      original.data,
      resizedClone.data,
      diff.data,
      width,
      height,
      { threshold: this.config.threshold },
    );

    fs.writeFileSync(diffPath, PNG.sync.write(diff));

    const totalPixels = width * height;
    const similarity = ((totalPixels - diffPixels) / totalPixels) * 100;

    return {
      viewport: viewportLabel,
      originalPath,
      clonePath,
      diffPath,
      totalPixels,
      diffPixels,
      similarity: Math.round(similarity * 100) / 100,
      diffPercentage: Math.round((diffPixels / totalPixels) * 10000) / 100,
    };
  }

  private resizePNG(source: PNG, targetWidth: number, targetHeight: number): PNG {
    const resized = new PNG({ width: targetWidth, height: targetHeight });

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const srcX = Math.floor((x / targetWidth) * source.width);
        const srcY = Math.floor((y / targetHeight) * source.height);
        const srcIdx = (srcY * source.width + srcX) << 2;
        const dstIdx = (y * targetWidth + x) << 2;

        resized.data[dstIdx] = source.data[srcIdx] ?? 0;
        resized.data[dstIdx + 1] = source.data[srcIdx + 1] ?? 0;
        resized.data[dstIdx + 2] = source.data[srcIdx + 2] ?? 0;
        resized.data[dstIdx + 3] = source.data[srcIdx + 3] ?? 0;
      }
    }

    return resized;
  }

  // ─── Section Comparison ─────────────────────────────────────────

  private async extractSections(page: Page): Promise<Map<string, { order: number; text: string; rect: DOMRect }>> {
    return page.evaluate(() => {
      const sections = new Map<string, { order: number; text: string; rect: DOMRect }>();

      const sectionSelectors: Record<string, string[]> = {
        header: ['header', 'nav', '[role="navigation"]'],
        hero: ['[class*="hero"]', '[class*="banner"]', 'section:first-of-type', 'main > div:first-child'],
        features: ['[class*="feature"]', '[class*="services"]', '[id*="feature"]'],
        pricing: ['[class*="pricing"]', '[id*="pricing"]', '[class*="plan"]'],
        testimonials: ['[class*="testimonial"]', '[class*="review"]', '[class*="feedback"]'],
        stats: ['[class*="stat"]', '[class*="metric"]', '[class*="counter"]'],
        cta: ['[class*="cta"]', '[class*="call-to-action"]', 'button[class*="primary"]'],
        footer: ['footer', '[role="contentinfo"]'],
      };

      let order = 0;
      for (const [name, selectors] of Object.entries(sectionSelectors)) {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            const text = (el.textContent || '').substring(0, 200).trim();
            sections.set(name, { order, text, rect: el.getBoundingClientRect() });
            order++;
            break;
          }
        }
      }

      return sections;
    });
  }

  private compareSections(
    originalSections: Map<string, { order: number; text: string }>,
    cloneSections: Map<string, { order: number; text: string }>,
  ): SectionComparison[] {
    const results: SectionComparison[] = [];
    const allSections = new Set([...originalSections.keys(), ...cloneSections.keys()]);

    for (const section of allSections) {
      const orig = originalSections.get(section);
      const clone = cloneSections.get(section);

      const issues: string[] = [];

      if (!orig) {
        issues.push(`Section "${section}" missing from original`);
      }
      if (!clone) {
        issues.push(`Section "${section}" missing from clone`);
      }

      // Text similarity (simple character overlap)
      let textSimilarity = 0;
      if (orig && clone) {
        const origWords = new Set(orig.text.toLowerCase().split(/\s+/));
        const cloneWords = new Set(clone.text.toLowerCase().split(/\s+/));
        const intersection = new Set([...origWords].filter(w => cloneWords.has(w)));
        const union = new Set([...origWords, ...cloneWords]);
        textSimilarity = union.size > 0 ? (intersection.size / union.size) * 100 : 100;
      }

      // Order comparison
      const orderMatch = orig && clone ? orig.order === clone.order : false;
      if (!orderMatch && orig && clone) {
        issues.push(`Section order differs: original=${orig.order}, clone=${clone.order}`);
      }

      results.push({
        section,
        originalPresent: !!orig,
        clonePresent: !!clone,
        originalOrder: orig?.order ?? -1,
        cloneOrder: clone?.order ?? -1,
        orderMatch,
        textSimilarity: Math.round(textSimilarity * 100) / 100,
        visualSimilarity: 0, // Will be set by pixel diff per section
        issues,
      });
    }

    return results;
  }

  // ─── Main Diff Pipeline ─────────────────────────────────────────

  async diff(originalUrl: string, cloneUrl: string): Promise<VisualDiffReport> {
    this.log(`Starting visual diff: ${originalUrl} vs ${cloneUrl}`);

    // Create output directory
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    const browser = await this.ensureBrowser();
    const context = await browser.newContext();

    const viewportResults: DiffResult[] = [];
    let originalSections = new Map<string, { order: number; text: string; rect: DOMRect }>();
    let cloneSections = new Map<string, { order: number; text: string; rect: DOMRect }>();

    // Compare at each viewport
    for (const vp of this.config.viewports) {
      this.log(`Comparing at ${vp.label} (${vp.width}x${vp.height})`);

      // Screenshot original
      const origPage = await context.newPage();
      const origPath = await this.captureScreenshot(origPage, originalUrl, vp, 'original');
      originalSections = await this.extractSections(origPage);
      await origPage.close();

      // Screenshot clone
      const clonePage = await context.newPage();
      const clonePath = await this.captureScreenshot(clonePage, cloneUrl, vp, 'clone');
      cloneSections = await this.extractSections(clonePage);
      await clonePage.close();

      // Compute pixel diff
      const diffPath = path.join(this.config.outputDir, `diff_${vp.label}.png`);
      const result = this.computeDiff(origPath, clonePath, diffPath, vp.label);
      viewportResults.push(result);

      this.log(`${vp.label}: ${result.similarity.toFixed(1)}% similar (${result.diffPixels} diff pixels)`);
    }

    // Compare sections
    const sectionComparison = this.compareSections(originalSections, cloneSections);

    // Overall similarity
    const overallSimilarity = viewportResults.length > 0
      ? viewportResults.reduce((sum, r) => sum + r.similarity, 0) / viewportResults.length
      : 100;

    await context.close();

    const report: VisualDiffReport = {
      workspaceRoot: this.workspaceRoot,
      originalUrl,
      cloneUrl,
      overallSimilarity: Math.round(overallSimilarity * 100) / 100,
      viewportResults,
      sectionComparison,
      timestamp: Date.now(),
    };

    // Write report
    const reportPath = path.join(this.config.outputDir, 'diff-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    this.log(`Diff report written: ${reportPath}`);
    this.log(`Overall similarity: ${report.overallSimilarity.toFixed(1)}%`);

    return report;
  }
}
