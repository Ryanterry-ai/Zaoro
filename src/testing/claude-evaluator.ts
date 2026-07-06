import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

export interface PageScore {
  file: string;
  specificity: number;
  designQuality: number;
  functional: number;
  hasPlaceholders: boolean;
  issues: string[];
  overall: number;
}

export interface EvaluationReport {
  prompt: string;
  workspaceId: string;
  totalFiles: number;
  pagesEvaluated: number;
  averageScore: number;
  passed: boolean;
  scores: PageScore[];
  topIssues: string[];
  verdict: string;
}

export class ClaudeEvaluator {
  private client: Anthropic;
  private readonly PASS_THRESHOLD = 70;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async evaluate(
    workspaceDir: string,
    prompt: string,
    workspaceId: string,
  ): Promise<EvaluationReport> {
    console.log('[evaluator] Scanning generated files...');

    const srcDir = path.join(workspaceDir, 'src');
    const pageFiles = this.findFiles(srcDir, /page\.tsx$/);
    const componentFiles = this.findFiles(path.join(srcDir, 'components'), /\.tsx$/);

    const allFiles = this.findFiles(workspaceDir, /\.(tsx|ts|json|css|mjs)$/);
    const totalFiles = allFiles.length;

    console.log(`[evaluator] Found ${pageFiles.length} pages, ${componentFiles.length} components (${totalFiles} total files)`);

    const filesToEval = [...pageFiles, ...componentFiles.slice(0, 2)].slice(0, 4);
    const scores: PageScore[] = [];

    for (const file of filesToEval) {
      const relPath = path.relative(workspaceDir, file);
      const content = fs.readFileSync(file, 'utf-8');
      if (content.trim().length < 50) continue;

      console.log(`[evaluator] Evaluating ${relPath}...`);
      const score = await this.evaluatePage(relPath, content, prompt);
      scores.push(score);
    }

    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((s, p) => s + p.overall, 0) / scores.length)
      : 0;

    const allIssues = scores.flatMap(s => s.issues);
    const issueCounts = new Map<string, number>();
    for (const issue of allIssues) {
      issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1);
    }
    const topIssues = [...issueCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue]) => issue);

    const passed = averageScore >= this.PASS_THRESHOLD;

    return {
      prompt,
      workspaceId,
      totalFiles,
      pagesEvaluated: scores.length,
      averageScore,
      passed,
      scores,
      topIssues,
      verdict: passed
        ? `PASS (${averageScore}/100) — Generated site meets quality threshold`
        : `FAIL (${averageScore}/100) — Below ${this.PASS_THRESHOLD} threshold`,
    };
  }

  private async evaluatePage(
    filePath: string,
    content: string,
    prompt: string,
  ): Promise<PageScore> {
    const hasPlaceholders = /lorem ipsum|TODO:|FIXME:|placeholder text|Sample Text|dummy/i.test(content);
    const localIssues: string[] = [];
    if (hasPlaceholders) localIssues.push('Contains placeholder text');
    if (!content.includes('className=')) localIssues.push('No Tailwind classes found');
    if (!content.includes('export default')) localIssues.push('Missing default export');

    const truncated = content.slice(0, 3000);

    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [
          {
            role: 'user',
            content: `Evaluate this generated React/TSX file for a website about: "${prompt}"

File: ${filePath}
\`\`\`tsx
${truncated}
\`\`\`

Score each dimension 0-100 and list specific issues. Return ONLY JSON:
{
  "specificity": 0-100,
  "designQuality": 0-100,
  "functional": 0-100,
  "issues": ["issue 1", "issue 2"]
}

Scoring guide:
- specificity: 90+ = all content is specific to this business (real names, real prices, real descriptions). 0 = generic placeholders like "Product 1", "lorem ipsum"
- designQuality: 90+ = dark theme (zinc-950), gradients, hover effects, responsive grid. 0 = no Tailwind or just basic classes
- functional: 90+ = forms have onSubmit, buttons have onClick, state with useState. 0 = static HTML with no interactivity
- issues: list up to 3 specific problems (e.g. "No price shown on product cards", "Missing onClick on CTA button")`,
          },
        ],
      });

      const text = message.content[0]?.type === 'text' ? message.content[0].text : '';
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(cleaned) as {
        specificity: number;
        designQuality: number;
        functional: number;
        issues: string[];
      };

      const allIssues = [...localIssues, ...(result.issues ?? [])];
      const overall = Math.round((result.specificity + result.designQuality + result.functional) / 3);

      return {
        file: filePath,
        specificity: result.specificity,
        designQuality: result.designQuality,
        functional: result.functional,
        hasPlaceholders,
        issues: allIssues,
        overall,
      };
    } catch {
      const designScore = content.includes('zinc-950') ? 70 : content.includes('className') ? 50 : 20;
      const funcScore = content.includes('useState') ? 70 : content.includes('onClick') ? 50 : 30;
      const specScore = hasPlaceholders ? 20 : 60;
      return {
        file: filePath,
        specificity: specScore,
        designQuality: designScore,
        functional: funcScore,
        hasPlaceholders,
        issues: [...localIssues, 'Claude evaluation unavailable — local scoring used'],
        overall: Math.round((specScore + designScore + funcScore) / 3),
      };
    }
  }

  private findFiles(dir: string, pattern: RegExp): string[] {
    if (!fs.existsSync(dir)) return [];
    const results: string[] = [];
    const walk = (d: string) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory() && !['node_modules', '.next', '.git'].includes(entry.name)) {
          walk(full);
        } else if (entry.isFile() && pattern.test(entry.name)) {
          results.push(full);
        }
      }
    };
    walk(dir);
    return results;
  }
}
