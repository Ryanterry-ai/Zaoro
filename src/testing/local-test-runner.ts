import * as fs from 'fs';
import * as path from 'path';
import { ClaudeEnricher } from './claude-enricher.js';
import { ClaudeEvaluator } from './claude-evaluator.js';
import { buildBREContext } from '../bos/intake-parser.js';
import { runBuildPipeline } from '../generation/build-pipeline.js';
import { SandboxEngine } from '../sandbox/engine.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
const WORKSPACE_BASE = path.join(process.cwd(), 'sandbox_workspaces');

const TEST_PROMPTS = [
  'a neighborhood Italian restaurant with online reservations, 2 locations in Austin TX',
  'B2B supplement wholesaler with bulk ordering and dealer portal for India market',
  'SaaS CRM for sales teams with pipeline management and email automation',
  'luxury spa and wellness center with online booking in Manhattan',
  'online education platform for coding bootcamp with course catalog and student dashboard',
];

interface TestResult {
  prompt: string;
  workspaceId: string;
  workspaceDir: string;
  duration: number;
  filesGenerated: number;
  pagesGenerated: number;
  evaluationScore: number;
  passed: boolean;
  error?: string;
}

async function runTests(prompts: string[]): Promise<void> {
  if (!ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set. Run: $env:ANTHROPIC_API_KEY = "sk-ant-..."');
    process.exit(1);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('  build.same — Local LLM Test Harness');
  console.log(`  Running ${prompts.length} test prompt(s)`);
  console.log(`${'='.repeat(60)}\n`);

  const enricher = new ClaudeEnricher(ANTHROPIC_API_KEY);
  const evaluator = new ClaudeEvaluator(ANTHROPIC_API_KEY);
  const sandbox = new SandboxEngine();

  const results: TestResult[] = [];

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i]!;
    const workspaceId = `ws-test-${Date.now()}-${i}`;
    const workspaceDir = path.join(WORKSPACE_BASE, workspaceId);

    console.log(`\n${'-'.repeat(60)}`);
    console.log(`  Test ${i + 1}/${prompts.length}`);
    console.log(`  Prompt: "${prompt}"`);
    console.log(`${'-'.repeat(60)}`);

    const start = Date.now();

    try {
      const enriched = await enricher.enrich(prompt);
      console.log(`\n[test] Enriched: "${enriched.businessName}" — ${enriched.heroHeadline}`);
      console.log(`[test]   Color: ${enriched.primaryColor}, ${enriched.products.length} products, ${enriched.services.length} services`);

      fs.mkdirSync(workspaceDir, { recursive: true });
      fs.writeFileSync(
        path.join(workspaceDir, '.enriched-context.json'),
        JSON.stringify(enriched, null, 2),
        'utf-8',
      );

      console.log('\n[test] Running deterministic pipeline...');
      const tPipeline = Date.now();

      const breContext = await buildBREContext(prompt);
      breContext.appName = enriched.businessName;

      const pipelineResult = await runBuildPipeline(breContext, {
        platform: 'react',
        outputDir: path.join(workspaceDir, 'src'),
        workspaceDir,
      }, undefined, (breContext as any).__industryScore);

      const { renderResult, applicationSpec } = pipelineResult;

      console.log(`[test] Pipeline complete in ${Date.now() - tPipeline}ms`);
      console.log(`[test]   Files: ${renderResult.files.length}, Pages: ${applicationSpec.pages.length}`);

      for (const file of renderResult.files) {
        const safePath = file.path.replace(/:/g, '_');
        const isRoot = safePath.startsWith('../') || safePath.startsWith('prisma/');
        const relPath = isRoot ? safePath.replace(/^\.\.\//, '') : safePath;
        const fullPath = path.join(workspaceDir, isRoot ? '' : 'src', relPath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, file.content, 'utf-8');
      }

      console.log(`[test] ${renderResult.files.length} files written to ${workspaceDir}`);

      console.log('\n[test] Running Claude evaluation...');
      const report = await evaluator.evaluate(workspaceDir, prompt, workspaceId);

      const duration = Date.now() - start;

      console.log('\n[test] Per-page scores:');
      for (const score of report.scores) {
        const bar = '|'.repeat(Math.round(score.overall / 10)) + ' '.repeat(10 - Math.round(score.overall / 10));
        console.log(`  ${bar} ${score.overall}/100  ${score.file}`);
        if (score.issues.length > 0) {
          console.log(`         Issues: ${score.issues.slice(0, 2).join('; ')}`);
        }
      }

      console.log(`\n[test] ${report.verdict}`);
      console.log(`[test] Duration: ${(duration / 1000).toFixed(1)}s | Files: ${report.totalFiles} | Pages evaluated: ${report.pagesEvaluated}`);

      results.push({
        prompt,
        workspaceId,
        workspaceDir,
        duration,
        filesGenerated: report.totalFiles,
        pagesGenerated: applicationSpec.pages.length,
        evaluationScore: report.averageScore,
        passed: report.passed,
      });

      fs.writeFileSync(
        path.join(workspaceDir, '.evaluation-report.json'),
        JSON.stringify(report, null, 2),
        'utf-8',
      );

    } catch (err: unknown) {
      const duration = Date.now() - start;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n[test] FAILED: ${message}`);
      results.push({
        prompt,
        workspaceId,
        workspaceDir,
        duration,
        filesGenerated: 0,
        pagesGenerated: 0,
        evaluationScore: 0,
        passed: false,
        error: message,
      });
    }
  }

  printSummary(results);
}

function printSummary(results: TestResult[]): void {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const avgScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.evaluationScore, 0) / results.length)
    : 0;
  const avgFiles = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.filesGenerated, 0) / results.length)
    : 0;

  console.log(`\n${'='.repeat(60)}`);
  console.log('  SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`  Tests:      ${results.length} total  |  ${passed} passed  |  ${failed} failed`);
  console.log(`  Avg Score:  ${avgScore}/100`);
  console.log(`  Avg Files:  ${avgFiles} per build`);
  console.log('');

  for (const r of results) {
    const icon = r.passed ? 'PASS' : r.error ? 'FAIL' : 'FAIL';
    const score = r.error ? 'ERROR' : `${r.evaluationScore}/100`;
    const files = r.error ? '' : ` | ${r.filesGenerated} files | ${r.pagesGenerated} pages`;
    console.log(`  ${icon} [${score}]${files}`);
    console.log(`     "${r.prompt.slice(0, 55)}${r.prompt.length > 55 ? '...' : ''}"`);
    if (r.error) console.log(`     Error: ${r.error.slice(0, 100)}`);
    console.log(`     Dir: ${r.workspaceDir}`);
    console.log('');
  }

  console.log(`${'='.repeat(60)}`);
  console.log('  To preview a workspace, run the engine and visit:');
  console.log('  http://localhost:3001/api/workspace/{id}/preview');
  console.log(`${'='.repeat(60)}\n`);
}

const cliPrompt = process.argv[2];
const promptsToRun = cliPrompt ? [cliPrompt] : TEST_PROMPTS;

runTests(promptsToRun).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
