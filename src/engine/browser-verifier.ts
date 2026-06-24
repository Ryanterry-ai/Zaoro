// ─── Browser Verifier ────────────────────────────────────────────
// E2E verification of generated sites using Playwright.
// Checks console errors, missing assets, broken links, JS errors,
// accessibility, and basic content presence.

import { RuntimeManager, PageResult } from './runtime-manager.js';

export interface VerificationConfig {
  checkConsoleErrors: boolean;
  checkBrokenAssets: boolean;
  checkBrokenLinks: boolean;
  checkAccessibility: boolean;
  checkContentPresence: boolean;
  checkPerformance: boolean;
  maxBrokenLinks: number;
  maxConsoleErrors: number;
  maxJsErrors: number;
  requiredTexts: string[];
}

export interface VerificationResult {
  passed: boolean;
  score: number;
  checks: VerificationCheck[];
  pageResults: PageResult[];
  summary: VerificationSummary;
}

export interface VerificationCheck {
  name: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
  details: string[];
}

export interface VerificationSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  totalPages: number;
  consoleErrors: number;
  brokenAssets: number;
  brokenLinks: number;
  jsErrors: number;
}

const DEFAULT_VERIFICATION_CONFIG: VerificationConfig = {
  checkConsoleErrors: true,
  checkBrokenAssets: true,
  checkBrokenLinks: true,
  checkAccessibility: true,
  checkContentPresence: true,
  checkPerformance: true,
  maxBrokenLinks: 0,
  maxConsoleErrors: 0,
  maxJsErrors: 0,
  requiredTexts: [],
};

export class BrowserVerifier {
  private runtime: RuntimeManager;
  private config: VerificationConfig;
  private logFn: ((step: string, msg: string, data?: Record<string, unknown>) => void) | undefined;

  constructor(
    runtime: RuntimeManager,
    config?: Partial<VerificationConfig>,
    logFn?: (step: string, msg: string, data?: Record<string, unknown>) => void,
  ) {
    this.runtime = runtime;
    this.config = { ...DEFAULT_VERIFICATION_CONFIG, ...config };
    this.logFn = logFn;
  }

  private log(msg: string) {
    console.log(`[browser-verifier] ${msg}`);
    this.logFn?.('browser-verifier', msg);
  }

  async verify(urls: string[]): Promise<VerificationResult> {
    this.log(`Verifying ${urls.length} pages...`);

    const checks: VerificationCheck[] = [];
    const pageResults: PageResult[] = [];

    let totalConsoleErrors = 0;
    let totalBrokenAssets = 0;
    let totalBrokenLinks = 0;
    let totalJsErrors = 0;

    for (const url of urls) {
      this.log(`Checking: ${url}`);
      const page = await this.runtime.navigate(url);
      const result = await this.runtime.capturePage(url, page);
      pageResults.push(result);

      totalConsoleErrors += result.consoleLogs.filter(l => l.type === 'error').length;
      totalBrokenAssets += result.brokenAssets.length;
      totalJsErrors += result.errors.length;

      // Check console errors
      if (this.config.checkConsoleErrors) {
        const consoleErrors = result.consoleLogs.filter(l => l.type === 'error');
        checks.push({
          name: `console-errors-${url}`,
          passed: consoleErrors.length <= this.config.maxConsoleErrors,
          severity: 'error',
          message: `${consoleErrors.length} console errors on ${url}`,
          details: consoleErrors.slice(0, 5).map(e => e.text),
        });
      }

      // Check JS errors
      if (this.config.checkPerformance) {
        checks.push({
          name: `js-errors-${url}`,
          passed: result.errors.length <= this.config.maxJsErrors,
          severity: 'error',
          message: `${result.errors.length} JavaScript errors on ${url}`,
          details: result.errors.slice(0, 5),
        });
      }

      // Check broken assets
      if (this.config.checkBrokenAssets) {
        checks.push({
          name: `broken-assets-${url}`,
          passed: result.brokenAssets.length === 0,
          severity: 'warning',
          message: `${result.brokenAssets.length} broken assets on ${url}`,
          details: result.brokenAssets.slice(0, 10),
        });
      }

      // Check broken links
      if (this.config.checkBrokenLinks) {
        const brokenLinks = await this.checkBrokenLinks(page, result.links);
        totalBrokenLinks += brokenLinks.length;
        checks.push({
          name: `broken-links-${url}`,
          passed: brokenLinks.length <= this.config.maxBrokenLinks,
          severity: 'warning',
          message: `${brokenLinks.length} broken links on ${url}`,
          details: brokenLinks.slice(0, 10),
        });
      }

      // Check content presence
      if (this.config.checkContentPresence && this.config.requiredTexts.length > 0) {
        const html = result.html.toLowerCase();
        const missing = this.config.requiredTexts.filter(t => !html.includes(t.toLowerCase()));
        checks.push({
          name: `content-${url}`,
          passed: missing.length === 0,
          severity: 'warning',
          message: missing.length > 0 ? `Missing content: ${missing.join(', ')}` : 'All required content present',
          details: missing,
        });
      }

      // Check accessibility basics
      if (this.config.checkAccessibility) {
        const a11yIssues = await this.checkAccessibility(page);
        checks.push({
          name: `accessibility-${url}`,
          passed: a11yIssues.length === 0,
          severity: 'warning',
          message: `${a11yIssues.length} accessibility issues on ${url}`,
          details: a11yIssues.slice(0, 10),
        });
      }

      // Close page after verification
      try { await page.close(); } catch {}
    }

    // Summary
    const passed = checks.filter(c => c.passed).length;
    const failed = checks.filter(c => !c.passed && c.severity === 'error').length;
    const warnings = checks.filter(c => !c.passed && c.severity === 'warning').length;

    const summary: VerificationSummary = {
      totalChecks: checks.length,
      passed,
      failed,
      warnings,
      totalPages: urls.length,
      consoleErrors: totalConsoleErrors,
      brokenAssets: totalBrokenAssets,
      brokenLinks: totalBrokenLinks,
      jsErrors: totalJsErrors,
    };

    // Score: 100 - (errors * 10) - (warnings * 3)
    const score = Math.max(0, 100 - (failed * 10) - (warnings * 3));

    this.log(`Verification complete: ${score}/100 — ${passed}/${checks.length} passed, ${failed} errors, ${warnings} warnings`);

    return {
      passed: failed === 0,
      score,
      checks,
      pageResults,
      summary,
    };
  }

  private async checkBrokenLinks(page: any, links: string[]): Promise<string[]> {
    const broken: string[] = [];
    const checked = new Set<string>();

    for (const link of links.slice(0, 50)) {
      if (checked.has(link)) continue;
      checked.add(link);

      // Skip external links and anchors
      if (!link.startsWith('http') || link.includes('localhost')) continue;

      try {
        const response = await page.request.head(link, { timeout: 5000 });
        if (!response.ok()) {
          broken.push(link);
        }
      } catch {
        broken.push(link);
      }
    }

    return broken;
  }

  private async checkAccessibility(page: any): Promise<string[]> {
    const issues: string[] = [];

    // Check for images without alt text
    const imagesWithoutAlt = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img:not([alt])')).length;
    });
    if (imagesWithoutAlt > 0) {
      issues.push(`${imagesWithoutAlt} images without alt text`);
    }

    // Check for buttons without accessible names
    const buttonsWithoutLabel = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])')).filter(
        (b) => !b.textContent?.trim()
      ).length;
    });
    if (buttonsWithoutLabel > 0) {
      issues.push(`${buttonsWithoutLabel} buttons without accessible names`);
    }

    // Check for missing lang attribute
    const hasLang = await page.evaluate(() => document.documentElement.hasAttribute('lang'));
    if (!hasLang) {
      issues.push('Missing lang attribute on <html>');
    }

    // Check for heading hierarchy
    const headingIssues = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      if (headings.length === 0) return 'No headings found';
      const h1Count = headings.filter(h => h.tagName === 'H1').length;
      if (h1Count === 0) return 'No H1 heading found';
      if (h1Count > 1) return `${h1Count} H1 headings (should be 1)`;
      return null;
    });
    if (headingIssues) {
      issues.push(headingIssues);
    }

    // Check color contrast (basic)
    const lowContrast = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let count = 0;
      for (const el of Array.from(elements).slice(0, 100)) {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const bg = style.backgroundColor;
        if (color === bg && color !== 'rgba(0, 0, 0, 0)') count++;
      }
      return count;
    });
    if (lowContrast > 0) {
      issues.push(`${lowContrast} elements with same text/background color`);
    }

    return issues;
  }
}
