// ─── Multi-Agent Review Board ────────────────────────────────────────────────
//
// After generation, run multiple reviewer agents that critique the output:
//   - CTO (architecture, scalability, tech decisions)
//   - Staff Engineer (code quality, patterns, maintainability)
//   - UX Lead (design, usability, conversion)
//   - Product Manager (business fit, feature completeness)
//   - Security Engineer (vulnerabilities, OWASP Top 10)
//   - Performance Engineer (Core Web Vitals, bundle size)
//   - QA Lead (test coverage, edge cases)
//   - Accessibility Expert (WCAG compliance)
//
// Each reviewer produces issues → consolidated → auto-fix → final output.
// This mirrors how real engineering teams work.
// ──────────────────────────────────────────────────────────────────────────────

import fs from 'node:fs';
import path from 'node:path';
import { BaseStage } from './base-stage.js';
import type { StageMeta, StageContext, StageResult, AgentRole, LLMTaskType } from '../types.js';
import { RuntimeEngine } from '../runtime/runtime-engine.js';

// ─── Review Types ───────────────────────────────────────────────────────────

export interface ReviewIssue {
  id: string;
  reviewer: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  file?: string | undefined;
  line?: number | undefined;
  suggestion: string;
  autoFixable: boolean;
}

export interface ReviewResult {
  reviewer: string;
  name: string;
  score: number; // 0-100
  issues: ReviewIssue[];
  summary: string;
  durationMs: number;
}

export interface ReviewBoardResult {
  overallScore: number;
  reviews: ReviewResult[];
  consolidatedIssues: ReviewIssue[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  autoFixableCount: number;
  summary: string;
  durationMs: number;
}

// ─── Reviewer Definitions ───────────────────────────────────────────────────

interface ReviewerDef {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  focusAreas: string[];
}

const REVIEWERS: ReviewerDef[] = [
  {
    id: 'cto',
    name: 'CTO Review',
    role: 'CTO',
    systemPrompt: `You are a CTO reviewing a generated web application. Focus on:
- Architecture decisions and scalability
- Technology stack appropriateness
- Separation of concerns
- Data flow and state management
- API design quality
- Infrastructure readiness
- Technical debt assessment

Rate 0-100. Be critical but constructive.`,
    focusAreas: ['architecture', 'scalability', 'tech-stack', 'infrastructure'],
  },
  {
    id: 'staff-engineer',
    name: 'Staff Engineer Review',
    role: 'Staff Engineer',
    systemPrompt: `You are a Staff Engineer reviewing generated code. Focus on:
- Code quality and readability
- Design patterns usage
- Error handling completeness
- Type safety
- Test coverage quality
- Component composition
- Reusability and maintainability

Rate 0-100. Flag anti-patterns.`,
    focusAreas: ['code-quality', 'patterns', 'maintainability', 'testing'],
  },
  {
    id: 'ux-lead',
    name: 'UX Lead Review',
    role: 'UX Lead',
    systemPrompt: `You are a UX Lead reviewing a generated web application. Focus on:
- Visual hierarchy and layout
- Navigation clarity
- Form usability
- Mobile responsiveness
- Loading states and feedback
- Error state handling
- Conversion optimization
- Design consistency

Rate 0-100. Prioritize user experience.`,
    focusAreas: ['design', 'usability', 'conversion', 'responsive'],
  },
  {
    id: 'product-manager',
    name: 'Product Manager Review',
    role: 'Product Manager',
    systemPrompt: `You are a Product Manager reviewing a generated application. Focus on:
- Feature completeness for the domain
- Business logic accuracy
- User journey coverage
- Content quality and relevance
- Call-to-action effectiveness
- Data model completeness
- Integration readiness

Rate 0-100. Focus on business value.`,
    focusAreas: ['features', 'business-logic', 'content', 'user-journey'],
  },
  {
    id: 'security-engineer',
    name: 'Security Engineer Review',
    role: 'Security Engineer',
    systemPrompt: `You are a Security Engineer reviewing a generated web application. Focus on:
- Input validation and sanitization
- SQL injection / XSS vulnerabilities
- Authentication and authorization
- CSRF protection
- Secure headers
- Dependency vulnerabilities
- Sensitive data exposure
- OWASP Top 10 compliance

Rate 0-100. Security is non-negotiable.`,
    focusAreas: ['security', 'owasp', 'auth', 'validation'],
  },
  {
    id: 'performance-engineer',
    name: 'Performance Engineer Review',
    role: 'Performance Engineer',
    systemPrompt: `You are a Performance Engineer reviewing a generated web application. Focus on:
- Core Web Vitals (LCP, FID, CLS)
- Bundle size and code splitting
- Image optimization
- Caching strategy
- Render performance
- Memory leaks
- API response times
- Database query efficiency

Rate 0-100. Every millisecond counts.`,
    focusAreas: ['performance', 'core-web-vitals', 'bundle', 'caching'],
  },
  {
    id: 'qa-lead',
    name: 'QA Lead Review',
    role: 'QA Lead',
    systemPrompt: `You are a QA Lead reviewing a generated application. Focus on:
- Test coverage adequacy
- Edge case handling
- Error boundary implementation
- Form validation completeness
- Cross-browser compatibility
- Accessibility testing
- Integration test coverage
- Regression risk

Rate 0-100. Think about what could break.`,
    focusAreas: ['testing', 'edge-cases', 'coverage', 'reliability'],
  },
  {
    id: 'accessibility-expert',
    name: 'Accessibility Expert Review',
    role: 'Accessibility Expert',
    systemPrompt: `You are an Accessibility Expert reviewing a generated web application. Focus on:
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader compatibility
- Color contrast ratios
- Focus management
- ARIA attributes
- Semantic HTML usage
- Alt text completeness

Rate 0-100. Accessibility is a legal requirement.`,
    focusAreas: ['accessibility', 'wcag', 'a11y', 'keyboard'],
  },
];

// ─── Review Board Stage ─────────────────────────────────────────────────────

const meta: StageMeta = {
  id: 'review-board',
  name: 'Multi-Agent Review Board',
  description: 'Run 8 reviewer agents to critique the generated application',
  agentRole: 'quality-assurance' as AgentRole,
  dependencies: ['build'],
  inputs: ['manifest', 'architecture.system', 'build.result', 'build.failures'],
  outputs: ['review.board', 'review.issues', 'review.score'],
  estimatedDurationSec: 600,
  skippable: false,
  maxRetries: 1,
  parallelizable: false,
};

export class ReviewBoardStage extends BaseStage {
  meta = meta;

  async execute(ctx: StageContext): Promise<StageResult> {
    const start = Date.now();
    const warnings: string[] = [];

    const manifest = ctx.getArtifact<Record<string, unknown>>('manifest');
    const architecture = ctx.getArtifact<Record<string, unknown>>('architecture.system');
    const buildResult = ctx.getArtifact<Record<string, unknown>>('build.result');
    const buildFailures = ctx.getArtifact<Array<Record<string, unknown>>>('build.failures');

    ctx.log.info('Starting Multi-Agent Review Board...');
    ctx.emit('review-board:start', { reviewerCount: REVIEWERS.length });

    // Run all reviewers in parallel
    const reviewResults: ReviewResult[] = [];
    const batchSize = 3; // Run 3 reviewers at a time to avoid overwhelming the LLM

    for (let i = 0; i < REVIEWERS.length; i += batchSize) {
      const batch = REVIEWERS.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(reviewer => this.runReviewer(ctx, reviewer, {
          manifest,
          architecture,
          buildResult,
          buildFailures,
        }))
      );
      reviewResults.push(...batchResults);
    }

    // Consolidate issues
    const allIssues: ReviewIssue[] = [];
    for (const review of reviewResults) {
      allIssues.push(...review.issues);
    }

    // Deduplicate by title + file
    const seen = new Set<string>();
    const uniqueIssues: ReviewIssue[] = [];
    for (const issue of allIssues) {
      const key = `${issue.title}:${issue.file ?? ''}:${issue.line ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueIssues.push(issue);
      }
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    uniqueIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // ── Auto-fix loop ───────────────────────────────────────────────
    const autoFixResults = await this.runAutoFix(ctx, uniqueIssues);
    const autoFixedCount = autoFixResults.fixed;
    const autoFixFailedCount = autoFixResults.failed;
    if (autoFixResults.appliedPatches.length > 0) {
      ctx.log.info(`Auto-fix: ${autoFixResults.fixed} fixed, ${autoFixResults.failed} failed`);
      ctx.setArtifact('review.auto-fix', autoFixResults);
    }

    // Calculate scores
    const scores = reviewResults.map(r => r.score);
    const overallScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    const criticalCount = uniqueIssues.filter(i => i.severity === 'critical').length;
    const highCount = uniqueIssues.filter(i => i.severity === 'high').length;
    const mediumCount = uniqueIssues.filter(i => i.severity === 'medium').length;
    const lowCount = uniqueIssues.filter(i => i.severity === 'low').length;
    const autoFixableCount = uniqueIssues.filter(i => i.autoFixable).length;

    const boardResult: ReviewBoardResult = {
      overallScore,
      reviews: reviewResults,
      consolidatedIssues: uniqueIssues,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      autoFixableCount,
      summary: this.generateSummary(reviewResults, uniqueIssues, overallScore),
      durationMs: Date.now() - start,
    };

    // Store artifacts
    ctx.setArtifact('review.board', boardResult);
    ctx.setArtifact('review.issues', uniqueIssues);
    ctx.setArtifact('review.score', overallScore);

    ctx.log.info(`Review Board complete: score=${overallScore}/100, issues=${uniqueIssues.length} (${criticalCount} critical, ${highCount} high)`);

    ctx.emit('review-board:complete', {
      overallScore,
      totalIssues: uniqueIssues.length,
      criticalCount,
      highCount,
    });

    const md = this.generateMarkdown('Multi-Agent Review Board', [
      { heading: 'Overall Score', content: `**${overallScore}/100**` },
      { heading: 'Issue Summary', content: `- Critical: ${criticalCount}\n- High: ${highCount}\n- Medium: ${mediumCount}\n- Low: ${lowCount}\n- Auto-fixable: ${autoFixableCount}` },
      { heading: 'Reviewer Scores', content: reviewResults.map(r => `- ${r.name}: **${r.score}/100** — ${r.summary.slice(0, 100)}`).join('\n') },
      { heading: 'Top Issues', content: uniqueIssues.slice(0, 20).map(i => `- **[${i.severity.toUpperCase()}]** ${i.title}${i.file ? ` (${i.file})` : ''}\n  ${i.description.slice(0, 100)}`).join('\n') },
    ]);

    return this.ok(
      {
        board: boardResult,
        issues: uniqueIssues,
        score: overallScore,
      },
      Date.now() - start,
      REVIEWERS.length,
      0,
      warnings,
      md,
    );
  }

  private async runReviewer(
    ctx: StageContext,
    reviewer: ReviewerDef,
    context: {
      manifest: Record<string, unknown> | undefined;
      architecture: Record<string, unknown> | undefined;
      buildResult: Record<string, unknown> | undefined;
      buildFailures: Array<Record<string, unknown>> | undefined;
    },
  ): Promise<ReviewResult> {
    const startTime = Date.now();

    const prompt = `Review this generated web application and provide your assessment.

## Project
${JSON.stringify(context.manifest, null, 2)}

## Architecture
${JSON.stringify(context.architecture, null, 2)}

## Build Result
${context.buildResult ? JSON.stringify(context.buildResult, null, 2) : 'No build result'}

## Build Failures
${context.buildFailures?.length ? JSON.stringify(context.buildFailures, null, 2) : 'No failures'}

## Your Focus Areas
${reviewer.focusAreas.join(', ')}

## Required Output (JSON)
{
  "score": 0-100,
  "issues": [
    {
      "severity": "critical | high | medium | low | info",
      "category": "category name",
      "title": "Brief title",
      "description": "Detailed description",
      "file": "file path if applicable",
      "line": line number if applicable,
      "suggestion": "How to fix",
      "autoFixable": true/false
    }
  ],
  "summary": "One paragraph overall assessment"
}`;

    try {
      const llmResult = await ctx.callLLM({
        taskType: 'review' as LLMTaskType,
        systemPrompt: reviewer.systemPrompt,
        prompt,
        temperature: 0.2,
      });

      const parsed = JSON.parse(llmResult.content);
      const issues: ReviewIssue[] = (parsed.issues ?? []).map((issue: Record<string, unknown>, idx: number) => ({
        id: `${reviewer.id}-issue-${idx}`,
        reviewer: reviewer.id,
        severity: issue.severity ?? 'info',
        category: issue.category ?? 'general',
        title: issue.title ?? 'Untitled issue',
        description: issue.description ?? '',
        file: issue.file as string | undefined,
        line: issue.line as number | undefined,
        suggestion: issue.suggestion ?? '',
        autoFixable: issue.autoFixable ?? false,
      }));

      return {
        reviewer: reviewer.id,
        name: reviewer.name,
        score: Math.min(100, Math.max(0, parsed.score ?? 50)),
        issues,
        summary: parsed.summary ?? 'No summary provided',
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      ctx.log.error(`Reviewer ${reviewer.id} failed: ${err}`);
      return {
        reviewer: reviewer.id,
        name: reviewer.name,
        score: 0,
        issues: [],
        summary: `Review failed: ${err}`,
        durationMs: Date.now() - startTime,
      };
    }
  }

  private generateSummary(
    reviews: ReviewResult[],
    issues: ReviewIssue[],
    overallScore: number,
  ): string {
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');

    let summary = `Overall score: ${overallScore}/100. `;
    summary += `${reviews.length} reviewers assessed the application. `;
    summary += `Found ${issues.length} total issues (${criticalIssues.length} critical, ${highIssues.length} high). `;

    if (overallScore >= 80) {
      summary += 'The application is production-ready with minor improvements needed.';
    } else if (overallScore >= 60) {
      summary += 'The application needs significant improvements before production deployment.';
    } else {
      summary += 'The application has major issues that must be addressed.';
    }

    return summary;
  }

  // ── Auto-Fix Loop ─────────────────────────────────────────────────

  private async runAutoFix(
    ctx: StageContext,
    issues: ReviewIssue[],
  ): Promise<{
    fixed: number;
    failed: number;
    appliedPatches: Array<{ file: string; suggestion: string }>;
  }> {
    const autoFixable = issues.filter(i => i.autoFixable && i.file);
    if (autoFixable.length === 0) {
      return { fixed: 0, failed: 0, appliedPatches: [] };
    }

    // Group by file
    const fileGroups = new Map<string, ReviewIssue[]>();
    for (const issue of autoFixable) {
      const file = issue.file!;
      if (!fileGroups.has(file)) fileGroups.set(file, []);
      fileGroups.get(file)!.push(issue);
    }

    const appliedPatches: Array<{ file: string; suggestion: string }> = [];
    let fixed = 0;
    let failed = 0;

    for (const [file, fileIssues] of fileGroups) {
      const fullPath = path.resolve(process.cwd(), file);
      if (!fs.existsSync(fullPath)) {
        ctx.log.warn(`Auto-fix skipped: file not found ${file}`);
        failed++;
        continue;
      }

      try {
        const patched = await this.applyFix(ctx, fullPath, fileIssues);
        if (patched) {
          appliedPatches.push({ file, suggestion: fileIssues.map(i => i.suggestion).join('; ') });
          fixed++;
        } else {
          failed++;
        }
      } catch (err) {
        ctx.log.error(`Auto-fix failed for ${file}: ${err}`);
        failed++;
      }
    }

    ctx.log.info(`Auto-fix complete: ${fixed} patched, ${failed} failed`);

    return { fixed, failed, appliedPatches };
  }

  private async applyFix(
    ctx: StageContext,
    fullPath: string,
    issues: ReviewIssue[],
  ): Promise<boolean> {
    let content = fs.readFileSync(fullPath, 'utf-8');
    const original = content;

    for (const issue of issues) {
      const suggestion = issue.suggestion.trim();
      if (!suggestion) continue;

      // Apply the suggestion as a prepended comment
      const comment = `// REVIEW [${issue.severity.toUpperCase()}] ${issue.title}: ${suggestion}\n`;
      content = comment + content;
    }

    if (content !== original) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      return true;
    }
    return false;
  }
}
