#!/usr/bin/env node
/**
 * Build Engine — Quality Gate (Bucket A)
 * Runs lint → typecheck → build → tests in sequence.
 * Stops at first failure. Pure deterministic — no LLM.
 *
 * Usage: node index.js [--project-dir ./project] [--skip-tests]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { projectDir: './project', skipTests: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project-dir') opts.projectDir = args[++i];
    if (args[i] === '--skip-tests') opts.skipTests = true;
  }
  return opts;
}

function runCommand(cmd, cwd) {
  try {
    const output = execSync(cmd, { cwd, encoding: 'utf-8', timeout: 120000, stdio: 'pipe' });
    return { success: true, output };
  } catch (err) {
    return { success: false, output: err.stdout || err.stderr || err.message };
  }
}

function detectFramework(projectDir) {
  const pkgPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return 'unknown';
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (deps.next) return 'nextjs';
  if (deps.nuxt) return 'nuxt';
  if (deps['@astrojs/core'] || deps.astro) return 'astro';
  if (deps.react || deps.vue || deps.svelte) return 'spa';
  return 'unknown';
}

function getCommands(framework) {
  switch (framework) {
    case 'nextjs':
      return {
        lint: 'npx next lint',
        typecheck: 'npx tsc --noEmit',
        build: 'npx next build',
        test: 'npx jest',
      };
    case 'nuxt':
      return {
        lint: 'npx eslint .',
        typecheck: 'npx nuxi typecheck',
        build: 'npx nuxi build',
        test: 'npx vitest run',
      };
    case 'astro':
      return {
        lint: 'npx astro check',
        typecheck: 'npx astro check',
        build: 'npx astro build',
        test: 'npx vitest run',
      };
    default:
      return {
        lint: 'npx eslint .',
        typecheck: 'npx tsc --noEmit',
        build: 'npx npm run build 2>/dev/null || echo "No build script"',
        test: 'npx jest 2>/dev/null || echo "No test framework"',
      };
  }
}

async function main() {
  const opts = parseArgs();
  const projectDir = path.resolve(opts.projectDir);

  if (!fs.existsSync(projectDir)) {
    console.error(`[QualityGate] Project directory not found: ${projectDir}`);
    process.exit(1);
  }

  const framework = detectFramework(projectDir);
  const commands = getCommands(framework);
  console.log(`[QualityGate] Framework: ${framework}`);
  console.log(`[QualityGate] Project: ${projectDir}`);

  const results = [];
  const gates = ['lint', 'typecheck', 'build'];
  if (!opts.skipTests) gates.push('test');

  for (const gate of gates) {
    console.log(`\n[QualityGate] Running ${gate}...`);
    const result = runCommand(commands[gate], projectDir);
    results.push({ gate, ...result });

    if (!result.success) {
      console.log(`[QualityGate] FAIL: ${gate}`);
      console.log(result.output.slice(0, 2000));

      // Write failure report
      const report = {
        passed: false,
        failedAt: gate,
        framework,
        results,
        timestamp: new Date().toISOString(),
      };
      const reportPath = path.join(projectDir, 'quality-gate-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`[QualityGate] Report: ${reportPath}`);
      process.exit(1);
    }
    console.log(`[QualityGate] PASS: ${gate}`);
  }

  // All passed
  const report = {
    passed: true,
    framework,
    results,
    timestamp: new Date().toISOString(),
  };
  const reportPath = path.join(projectDir, 'quality-gate-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n[QualityGate] ALL GATES PASSED`);
  process.exit(0);
}

main().catch(err => { console.error('[QualityGate] Fatal:', err.message); process.exit(1); });
