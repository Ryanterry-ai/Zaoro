#!/usr/bin/env node
/**
 * Benchmark CLI — Run the Benchmark Suite from the command line.
 *
 * Usage:
 *   npx tsx scripts/benchmark-cli.ts
 *   npx tsx scripts/benchmark-cli.ts --industry saas
 *   npx tsx scripts/benchmark-cli.ts --complexity complex --concurrency 3
 *   npx tsx scripts/benchmark-cli.ts --app app-1,app-2 --skip-build
 *   npx tsx scripts/benchmark-cli.ts --help
 */

import { BenchmarkSuite, createBenchmarkSuite } from '../src/orchestration/benchmark/benchmark-suite.js';
import type { Industry } from '../src/orchestration/types.js';

function parseArgs(): Record<string, unknown> {
  const args = process.argv.slice(2);
  const opts: Record<string, unknown> = {};
  let i = 0;

  const usage = `
Benchmark CLI — Automated evaluation harness for Build.Anything.

Usage:
  npx tsx scripts/benchmark-cli.ts [options]

Options:
  --industry <type>      Filter by industry (e.g., saas, ecommerce, healthcare, fintech)
  --complexity <level>   Filter by complexity (simple, moderate, complex, enterprise)
  --concurrency <n>      Max concurrent builds (default: 1)
  --app <ids>            Comma-separated app IDs to run
  --skip-build           Skip the actual build step (dry-run)
  --output <dir>         Output directory (default: .build-anything/benchmark)
  --help                 Show this help

Examples:
  npx tsx scripts/benchmark-cli.ts --industry saas
  npx tsx scripts/benchmark-cli.ts --complexity complex --concurrency 3
  npx tsx scripts/benchmark-cli.ts --app ecom-001,saas-001 --skip-build
`;

  while (i < args.length) {
    const arg = args[i]!;
    switch (arg) {
      case '--industry':
        opts.industry = args[++i];
        break;
      case '--complexity':
        opts.complexity = args[++i];
        break;
      case '--concurrency':
        opts.concurrency = parseInt(args[++i] ?? '1', 10);
        break;
      case '--app':
        opts.appIds = args[++i]?.split(',').map(s => s.trim()).filter(Boolean);
        break;
      case '--skip-build':
        opts.skipBuild = true;
        break;
      case '--output': {
        const val = args[++i];
        if (val) opts.output = val;
        break;
      }
      case '--help':
      case '-h':
        console.log(usage);
        process.exit(0);
      default:
        console.warn(`Unknown option: ${arg}`);
        console.log(usage);
        process.exit(1);
    }
    i++;
  }

  return opts;
}

async function main(): Promise<void> {
  const opts = parseArgs();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = (opts.output as string) ?? `.build-anything/benchmark-${timestamp}`;

  const suite = createBenchmarkSuite({ outputDir });

  console.log('═══════════════════════════════════════════');
  console.log('  Build.Anything — Benchmark CLI');
  console.log('═══════════════════════════════════════════');

  const industry = opts.industry as string | undefined;
  const complexity = opts.complexity as string | undefined;
  const appIds = opts.appIds as string[] | undefined;
  const concurrency = (opts.concurrency as number) ?? 1;
  const skipBuild = opts.skipBuild as boolean ?? false;

  if (industry) console.log(`  Industry filter:  ${industry}`);
  if (complexity) console.log(`  Complexity filter: ${complexity}`);
  if (appIds) console.log(`  App filter:        ${appIds.join(', ')}`);
  console.log(`  Concurrency:       ${concurrency}`);
  console.log(`  Skip build:        ${skipBuild}`);
  console.log(`  Output dir:        ${outputDir}`);
  console.log('───────────────────────────────────────────');

  const result = await suite.run({
    maxConcurrency: concurrency,
    skipBuild,
    filterIndustry: industry as Industry | undefined,
    filterComplexity: complexity,
    appIds,
  });

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  Results');
  console.log('═══════════════════════════════════════════');
  console.log(`  Total apps:        ${result.totalApps}`);
  console.log(`  Successful:        ${result.successful}`);
  console.log(`  Failed:            ${result.failed}`);
  console.log(`  Avg score:         ${result.avgScore}/100`);
  console.log(`  Avg duration:      ${(result.avgDurationMs / 1000).toFixed(1)}s`);
  console.log(`  Avg cost:          $${result.avgCostUsd}`);
  console.log(`  Duration:          ${(result.durationMs / 1000).toFixed(1)}s`);
  console.log(`  Output:            ${outputDir}`);
  console.log('───────────────────────────────────────────');

  if (result.weakestAreas.length > 0) {
    console.log('\nWeakest areas:');
    for (const area of result.weakestAreas) {
      console.log(`  - ${area}`);
    }
  }

  if (result.recommendations.length > 0) {
    console.log('\nRecommendations:');
    for (const rec of result.recommendations) {
      console.log(`  - ${rec}`);
    }
  }
}

main().catch(err => {
  console.error('Benchmark CLI failed:', err);
  process.exit(1);
});
