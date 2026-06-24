// ─── Visual Fix Loop ─────────────────────────────────────────────
// Takes visual diff results and layout comparisons, generates
// targeted CSS/JSX fixes to improve clone fidelity. Iterates
// until similarity threshold is met or max iterations reached.

import * as fs from 'fs';
import * as path from 'path';
import type { VisualDiffReport } from './visual-diff.js';
import type { LayoutComparison, DetectedSection } from './layout-detector.js';

export interface VisualFixConfig {
  maxIterations: number;
  similarityThreshold: number;    // 0-100, target similarity
  structuralThreshold: number;    // 0-100, target structural similarity
}

export interface VisualFixResult {
  iterations: number;
  initialSimilarity: number;
  finalSimilarity: number;
  initialStructural: number;
  finalStructural: number;
  fixesApplied: VisualFix[];
  success: boolean;
}

export interface VisualFix {
  type: 'css' | 'jsx' | 'layout';
  target: string;        // section or element
  description: string;
  before: string;
  after: string;
  impact: number;        // estimated similarity improvement
}

const DEFAULT_FIX_CONFIG: VisualFixConfig = {
  maxIterations: 3,
  similarityThreshold: 85,
  structuralThreshold: 90,
};

export class VisualFixLoop {
  private config: VisualFixConfig;
  private workspaceRoot: string;
  private logFn: ((step: string, msg: string, data?: Record<string, unknown>) => void) | undefined;

  constructor(
    workspaceRoot: string,
    config?: Partial<VisualFixConfig>,
    logFn?: (step: string, msg: string, data?: Record<string, unknown>) => void,
  ) {
    this.workspaceRoot = workspaceRoot;
    this.config = { ...DEFAULT_FIX_CONFIG, ...config };
    this.logFn = logFn;
  }

  private log(msg: string) {
    console.log(`[visual-fix] ${msg}`);
    this.logFn?.('visual-fix', msg);
  }

  // ─── Fix Generation ─────────────────────────────────────────────

  generateFixes(
    diffReport: VisualDiffReport,
    layoutComparison: LayoutComparison,
  ): VisualFix[] {
    const fixes: VisualFix[] = [];

    // Fix missing sections
    for (const missing of layoutComparison.missingInClone) {
      fixes.push({
        type: 'jsx',
        target: missing,
        description: `Add missing "${missing}" section`,
        before: '',
        after: `<section className="${missing}">\n  {/* TODO: Content for ${missing} */}\n</section>`,
        impact: 5,
      });
    }

    // Fix section order differences
    for (const diff of layoutComparison.orderDifferences) {
      fixes.push({
        type: 'layout',
        target: diff.section,
        description: `Reorder "${diff.section}" from position ${diff.cloneOrder} to ${diff.originalOrder}`,
        before: `// Section at position ${diff.cloneOrder}`,
        after: `// Section should be at position ${diff.originalOrder}`,
        impact: 3,
      });
    }

    // Fix visual differences per viewport
    for (const vpResult of diffReport.viewportResults) {
      if (vpResult.similarity < this.config.similarityThreshold) {
        // Generate CSS fixes for low similarity
        const cssFixes = this.generateCssFixes(vpResult.viewport, vpResult.similarity);
        fixes.push(...cssFixes);
      }
    }

    // Sort by impact (highest first)
    fixes.sort((a, b) => b.impact - a.impact);

    this.log(`Generated ${fixes.length} potential fixes`);
    return fixes;
  }

  private generateCssFixes(viewport: string, similarity: number): VisualFix[] {
    const fixes: VisualFix[] = [];

    // Color mismatch fix
    if (similarity < 80) {
      fixes.push({
        type: 'css',
        target: 'global',
        description: `Adjust global styles for ${viewport} (similarity: ${similarity.toFixed(1)}%)`,
        before: ':root {\n  /* Current theme colors */\n}',
        after: ':root {\n  /* Adjusted theme colors to match original */\n  --background: #ffffff;\n  --foreground: #171717;\n}',
        impact: 2,
      });
    }

    // Spacing fix
    if (similarity < 70) {
      fixes.push({
        type: 'css',
        target: 'sections',
        description: `Adjust section spacing for ${viewport}`,
        before: 'section {\n  padding: 2rem 0;\n}',
        after: 'section {\n  padding: 4rem 0;\n}',
        impact: 1,
      });
    }

    return fixes;
  }

  // ─── Fix Application ────────────────────────────────────────────

  async applyFixes(fixes: VisualFix[]): Promise<number> {
    let appliedCount = 0;

    for (const fix of fixes) {
      try {
        if (fix.type === 'css') {
          appliedCount += await this.applyCssFix(fix);
        } else if (fix.type === 'jsx') {
          appliedCount += await this.applyJsxFix(fix);
        }
      } catch (err) {
        this.log(`Failed to apply fix: ${fix.description}`);
      }
    }

    this.log(`Applied ${appliedCount}/${fixes.length} fixes`);
    return appliedCount;
  }

  private async applyCssFix(fix: VisualFix): Promise<number> {
    const cssPath = path.join(this.workspaceRoot, 'src', 'app', 'globals.css');
    if (!fs.existsSync(cssPath)) return 0;

    let css = fs.readFileSync(cssPath, 'utf-8');

    if (css.includes(fix.before)) {
      css = css.replace(fix.before, fix.after);
      fs.writeFileSync(cssPath, css, 'utf-8');
      this.log(`Applied CSS fix: ${fix.description}`);
      return 1;
    }

    return 0;
  }

  private async applyJsxFix(fix: VisualFix): Promise<number> {
    const pagePath = path.join(this.workspaceRoot, 'src', 'app', 'page.tsx');
    if (!fs.existsSync(pagePath)) return 0;

    let jsx = fs.readFileSync(pagePath, 'utf-8');

    // For missing sections, append before closing </main> or last section
    if (fix.type === 'jsx' && fix.before === '') {
      const insertBefore = jsx.includes('</main>') ? '</main>' : '</div>\n    </div>';
      if (jsx.includes(insertBefore)) {
        jsx = jsx.replace(insertBefore, `      ${fix.after}\n      ${insertBefore}`);
        fs.writeFileSync(pagePath, jsx, 'utf-8');
        this.log(`Applied JSX fix: ${fix.description}`);
        return 1;
      }
    }

    return 0;
  }

  // ─── Main Fix Loop ──────────────────────────────────────────────

  async runFixLoop(
    diffReport: VisualDiffReport,
    layoutComparison: LayoutComparison,
    rebuildCallback: () => Promise<void>,
    reDiffCallback: () => Promise<VisualDiffReport>,
  ): Promise<VisualFixResult> {
    const initialSimilarity = diffReport.overallSimilarity;
    const initialStructural = layoutComparison.structuralSimilarity;

    this.log(`Starting fix loop: similarity=${initialSimilarity.toFixed(1)}%, structural=${initialStructural.toFixed(1)}%`);

    let currentSimilarity = initialSimilarity;
    let currentStructural = initialStructural;
    let allFixes: VisualFix[] = [];

    for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
      this.log(`Iteration ${iteration + 1}/${this.config.maxIterations}`);

      // Check if thresholds already met
      if (currentSimilarity >= this.config.similarityThreshold &&
          currentStructural >= this.config.structuralThreshold) {
        this.log('Thresholds met — stopping fix loop');
        break;
      }

      // Generate fixes
      const fixes = this.generateFixes(diffReport, layoutComparison);
      if (fixes.length === 0) {
        this.log('No fixes generated — stopping');
        break;
      }

      allFixes.push(...fixes);

      // Apply fixes
      await this.applyFixes(fixes);

      // Rebuild and re-diff
      await rebuildCallback();
      const newDiff = await reDiffCallback();

      currentSimilarity = newDiff.overallSimilarity;
      this.log(`After iteration ${iteration + 1}: similarity=${currentSimilarity.toFixed(1)}%`);
    }

    return {
      iterations: allFixes.length > 0 ? Math.min(this.config.maxIterations, allFixes.length) : 0,
      initialSimilarity,
      finalSimilarity: currentSimilarity,
      initialStructural,
      finalStructural: currentStructural,
      fixesApplied: allFixes,
      success: currentSimilarity >= this.config.similarityThreshold &&
               currentStructural >= this.config.structuralThreshold,
    };
  }
}
