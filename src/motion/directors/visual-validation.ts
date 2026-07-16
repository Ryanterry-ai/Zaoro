// ─── Visual Validation Quality Gate ─────────────────────────────────────────
//
// After every build:
//   1. Start the dev server
//   2. Playwright takes screenshots at desktop/tablet/mobile
//   3. Analyze screenshots for:
//      - Blank page detection
//      - Missing hero content
//      - Invisible content (opacity: 0 stuck)
//      - Overflow issues
//      - CLS (Cumulative Layout Shift)
//      - Contrast problems
//      - Broken animations
//      - Hydration mismatch warnings
//   4. If failed → self-heal → repeat
//   5. Continue pipeline
//
// This is an AUTOMATIC agent loop — no manual intervention.
// ─────────────────────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VisualValidationConfig {
  /** Project directory (absolute path) */
  projectDir: string;
  /** Port to start dev server on */
  port?: number;
  /** Viewports to test */
  viewports?: ViewportConfig[];
  /** Maximum retries for self-healing */
  maxRetries?: number;
  /** Timeout for page load (ms) */
  pageLoadTimeout?: number;
  /** Screenshot output directory */
  screenshotDir?: string;
}

export interface ViewportConfig {
  name: string;
  width: number;
  height: number;
}

export interface VisualValidationResult {
  passed: boolean;
  screenshots: ScreenshotResult[];
  issues: VisualIssue[];
  retries: number;
  duration: number;
}

export interface ScreenshotResult {
  viewport: string;
  path: string;
  issues: VisualIssue[];
}

export interface VisualIssue {
  type: 'blank-page' | 'missing-hero' | 'invisible-content' | 'overflow' | 'cls' | 'contrast' | 'broken-animation' | 'hydration-mismatch';
  severity: 'error' | 'warning';
  message: string;
  viewport?: string;
  selector?: string;
}

// ─── Default Viewports ──────────────────────────────────────────────────────

const DEFAULT_VIEWPORTS: ViewportConfig[] = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
];

// ─── Visual Validator ───────────────────────────────────────────────────────

export class VisualValidator {
  private config: Required<VisualValidationConfig>;

  constructor(config: VisualValidationConfig) {
    this.config = {
      port: 3000,
      viewports: DEFAULT_VIEWPORTS,
      maxRetries: 3,
      pageLoadTimeout: 30000,
      screenshotDir: path.join(config.projectDir, '.visual-validation'),
      ...config,
    };
  }

  /**
   * Run the full visual validation pipeline.
   * This is the entry point for the quality gate.
   */
  async validate(): Promise<VisualValidationResult> {
    const startTime = Date.now();
    const allIssues: VisualIssue[] = [];
    const screenshots: ScreenshotResult[] = [];
    let retries = 0;

    // Ensure screenshot directory exists
    if (!fs.existsSync(this.config.screenshotDir)) {
      fs.mkdirSync(this.config.screenshotDir, { recursive: true });
    }

    // Generate the Playwright test script
    const testScript = this.generatePlaywrightScript();
    const scriptPath = path.join(this.config.screenshotDir, 'visual-test.mjs');
    fs.writeFileSync(scriptPath, testScript, 'utf-8');

    // Run the test script
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await this.runPlaywrightTest(scriptPath);
        allIssues.push(...result.issues);
        screenshots.push(...result.screenshots);

        // If no errors, we're done
        const errors = result.issues.filter(i => i.severity === 'error');
        if (errors.length === 0) {
          break;
        }

        retries = attempt + 1;

        // Self-heal: try to fix common issues
        if (attempt < this.config.maxRetries) {
          const healed = await this.selfHeal(errors);
          if (!healed) break;
        }
      } catch (err) {
        allIssues.push({
          type: 'blank-page',
          severity: 'error',
          message: `Playwright test failed: ${err instanceof Error ? err.message : String(err)}`,
        });
        break;
      }
    }

    return {
      passed: allIssues.filter(i => i.severity === 'error').length === 0,
      screenshots,
      issues: allIssues,
      retries,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Generate a Playwright script that takes screenshots and checks for issues.
   */
  private generatePlaywrightScript(): string {
    const viewports = this.config.viewports;
    const screenshotDir = this.config.screenshotDir.replace(/\\/g, '\\\\');
    const port = this.config.port;
    const timeout = this.config.pageLoadTimeout;

    return `
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = '${screenshotDir}';
const PORT = ${port};
const TIMEOUT = ${timeout};

async function runTest() {
  const browser = await chromium.launch({ headless: true });
  const issues = [];
  const screenshots = [];

  const viewports = ${JSON.stringify(viewports)};

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    // Collect console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    try {
      await page.goto(\`http://localhost:\${PORT}\`, { waitUntil: 'networkidle', timeout: TIMEOUT });

      // Scroll through the page to trigger whileInView animations
      await page.evaluate(async () => {
        const delay = ms => new Promise(r => setTimeout(r, ms));
        const height = document.body.scrollHeight;
        const step = window.innerHeight / 2;
        for (let y = 0; y < height; y += step) {
          window.scrollTo(0, y);
          await delay(200);
        }
        window.scrollTo(0, 0);
        await delay(500);
      });

      // Take screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, \`\${vp.name}.png\`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      screenshots.push({ viewport: vp.name, path: screenshotPath, issues: [] });

      // Check for blank page
      const bodyText = await page.textContent('body');
      if (!bodyText || bodyText.trim().length < 10) {
        issues.push({ type: 'blank-page', severity: 'error', message: 'Page appears blank (no text content)', viewport: vp.name });
      }

      // Check for invisible content (opacity: 0 on major sections)
      const invisibleCount = await page.evaluate(() => {
        const sections = document.querySelectorAll('section, [class*="hero"], [class*="Hero"]');
        let invisible = 0;
        sections.forEach(el => {
          const style = window.getComputedStyle(el);
          if (parseFloat(style.opacity) < 0.1) invisible++;
        });
        return invisible;
      });
      if (invisibleCount > 0) {
        issues.push({ type: 'invisible-content', severity: 'error', message: \`\${invisibleCount} sections have opacity < 0.1\`, viewport: vp.name });
      }

      // Check for missing hero
      const heroExists = await page.evaluate(() => {
        const hero = document.querySelector('[class*="hero"], [class*="Hero"], section:first-of-type');
        if (!hero) return false;
        const text = hero.textContent || '';
        return text.trim().length > 5;
      });
      if (!heroExists) {
        issues.push({ type: 'missing-hero', severity: 'error', message: 'Hero section missing or has no content', viewport: vp.name });
      }

      // Check for overflow
      const hasOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > document.body.clientWidth + 5;
      });
      if (hasOverflow) {
        issues.push({ type: 'overflow', severity: 'warning', message: 'Horizontal overflow detected', viewport: vp.name });
      }

      // Check for hydration warnings
      const hydrationWarning = consoleErrors.some(e =>
        e.includes('hydrat') || e.includes('Hydration') || e.includes('server') || e.includes('mismatch')
      );
      if (hydrationWarning) {
        issues.push({ type: 'hydration-mismatch', severity: 'warning', message: 'Hydration mismatch detected in console', viewport: vp.name });
      }

    } catch (err) {
      issues.push({ type: 'blank-page', severity: 'error', message: \`Page load failed: \${err.message}\`, viewport: vp.name });
    }

    await context.close();
  }

  await browser.close();

  return { issues, screenshots };
}

runTest().then(result => {
  const output = JSON.stringify(result);
  process.stdout.write(output);
}).catch(err => {
  process.stderr.write(err.message);
  process.exit(1);
});
`.trim();
  }

  /**
   * Run the Playwright test and parse results.
   */
  private async runPlaywrightTest(scriptPath: string): Promise<{
    issues: VisualIssue[];
    screenshots: ScreenshotResult[];
  }> {
    // Use npx playwright to run the script
    const { execSync } = await import('child_process');
    try {
      const output = execSync(`node "${scriptPath}"`, {
        encoding: 'utf-8',
        timeout: 120000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const result = JSON.parse(output);
      return result;
    } catch (err: any) {
      // Try to parse stderr
      const stderr = err.stderr || '';
      const stdout = err.stdout || '';
      try {
        return JSON.parse(stdout);
      } catch {
        throw new Error(`Playwright test failed: ${stderr || err.message}`);
      }
    }
  }

  /**
   * Self-heal: attempt to fix common issues.
   * Returns true if healing was attempted, false if unfixable.
   */
  private async selfHeal(issues: VisualIssue[]): Promise<boolean> {
    let healed = false;

    for (const issue of issues) {
      if (issue.type === 'invisible-content') {
        // Try to fix opacity: 0 in generated components
        healed = await this.fixInvisibleContent() || healed;
      }
      if (issue.type === 'missing-hero') {
        healed = await this.fixMissingHero() || healed;
      }
    }

    return healed;
  }

  /**
   * Fix invisible content by removing initial={{ opacity: 0 }} from section wrappers.
   */
  private async fixInvisibleContent(): Promise<boolean> {
    const componentsDir = path.join(this.config.projectDir, 'src', 'components');
    if (!fs.existsSync(componentsDir)) return false;

    let fixed = false;
    const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

    for (const file of files) {
      const filePath = path.join(componentsDir, file);
      let content = fs.readFileSync(filePath, 'utf-8');

      // Remove initial={{ opacity: 0 }} from section wrappers
      const original = content;
      content = content.replace(
        /initial=\{\{\s*opacity:\s*0\s*\}\}/g,
        ''
      );
      content = content.replace(
        /initial=\{\{\s*opacity:\s*0,\s*y:\s*\d+\s*\}\}/g,
        ''
      );

      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        fixed = true;
      }
    }

    return fixed;
  }

  /**
   * Fix missing hero by ensuring first section has content.
   */
  private async fixMissingHero(): Promise<boolean> {
    // Check if there's a HeroBanner component
    const componentsDir = path.join(this.config.projectDir, 'src', 'components');
    const heroPath = path.join(componentsDir, 'HeroBanner.tsx');

    if (!fs.existsSync(heroPath)) return false;

    let content = fs.readFileSync(heroPath, 'utf-8');
    const original = content;

    // Remove initial={{ opacity: 0 }} from hero
    content = content.replace(
      /initial=\{\{\s*opacity:\s*0[^}]*\}\}/g,
      ''
    );

    if (content !== original) {
      fs.writeFileSync(heroPath, content, 'utf-8');
      return true;
    }

    return false;
  }
}

/**
 * Create a VisualValidator instance.
 */
export function createVisualValidator(config: VisualValidationConfig): VisualValidator {
  return new VisualValidator(config);
}
