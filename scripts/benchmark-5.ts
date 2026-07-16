import * as fs from 'fs';
import * as path from 'path';
import { buildBREContext } from '../src/bos/intake-parser.js';
import { runBuildPipeline } from '../src/generation/build-pipeline.js';

const WORKSPACE_BASE = path.join(process.cwd(), 'sandbox_workspaces');

const TEST_PROMPTS = [
  'a neighborhood Italian restaurant with online reservations, 2 locations in Austin TX',
  'B2B supplement wholesaler with bulk ordering and dealer portal for India',
  'SaaS CRM for sales teams with pipeline management',
  'luxury spa and wellness center with online booking in Manhattan',
  'online coding bootcamp with course catalog and student dashboard',
];

interface ExpectedContent {
  mustContain: string[];
  mustNotContain: string[];
}

const EXPECTED: ExpectedContent[] = [
  // 1. Italian restaurant
  {
    mustContain: ['Reserve Your Table', 'View Our Menu', 'Farm-to-Table', 'Austin', 'Menu', 'Reservation'],
    mustNotContain: ['Get Started', 'No credit card required', 'Capabilities', 'Trusted by thousands', 'Learn More', 'subscription'],
  },
  // 2. B2B supplements
  {
    mustContain: ['Bulk', 'Dealer', 'India', 'Product'],
    mustNotContain: ['TasteHub', 'NutriMart', 'Gym CRM', 'workouts', 'membership'],
  },
  // 3. SaaS CRM
  {
    mustContain: ['pipeline', 'Sales', 'Dashboard', 'Analytics'],
    mustNotContain: ['Reserve Your Table', 'Farm-to-Table', 'menu item', 'reservation'],
  },
  // 4. Luxury spa
  {
    mustContain: ['Manhattan', 'Spa', 'Wellness', 'Book'],
    mustNotContain: ['Get Started', 'No credit card required', 'Capabilities', 'workout'],
  },
  // 5. Coding bootcamp
  {
    mustContain: ['Course', 'Student', 'Dashboard', 'Learn'],
    mustNotContain: ['reservation', 'supplement', 'workout', 'membership'],
  },
];

function checkContent(fileContents: string[], expected: ExpectedContent): { pass: boolean; violations: string[] } {
  const violations: string[] = [];
  const allContent = fileContents.join('\n');

  for (const term of expected.mustContain) {
    if (!allContent.includes(term)) {
      violations.push(`MISSING: "${term}"`);
    }
  }
  for (const term of expected.mustNotContain) {
    if (allContent.includes(term)) {
      violations.push(`FORBIDDEN: "${term}" found`);
    }
  }
  return { pass: violations.length === 0, violations };
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  5-PROMPT BENCHMARK SUITE');
  console.log('='.repeat(60));

  const results: Array<{ prompt: string; pass: boolean; violations: string[]; files: number }> = [];

  for (let i = 0; i < TEST_PROMPTS.length; i++) {
    const prompt = TEST_PROMPTS[i]!;
    const expected = EXPECTED[i]!;

    console.log(`\n--- Test ${i + 1}/5: "${prompt}" ---`);

    try {
      const breContext = await buildBREContext(prompt);
      console.log(`  Industry: ${breContext.industry}, Name: ${breContext.appName}`);

      const pipelineResult = await runBuildPipeline(breContext, {
        platform: 'react',
        outputDir: path.join(WORKSPACE_BASE, `ws-benchmark-${i}`),
      });

      const files = pipelineResult.renderResult.files;
      console.log(`  Generated ${files.length} files`);

      const fileContents = files.map(f => f.content);
      const check = checkContent(fileContents, expected);

      results.push({
        prompt,
        pass: check.pass,
        violations: check.violations,
        files: files.length,
      });

      console.log(`  Result: ${check.pass ? 'PASS' : 'FAIL'}`);
      if (!check.pass) {
        check.violations.forEach(v => console.log(`    ${v}`));
      }
    } catch (err) {
      console.error(`  ERROR: ${err}`);
      results.push({
        prompt,
        pass: false,
        violations: [`Error: ${err}`],
        files: 0,
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  BENCHMARK RESULTS');
  console.log('='.repeat(60));

  for (const r of results) {
    const status = r.pass ? 'PASS' : 'FAIL';
    console.log(`  [${status}] ${r.files} files, ${r.violations.length} violations`);
    if (r.violations.length > 0) {
      r.violations.forEach(v => console.log(`         ${v}`));
    }
  }

  const passed = results.filter(r => r.pass).length;
  console.log(`\n  Total: ${passed}/${results.length} passed`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
