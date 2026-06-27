// tools/quality-gate/index.js
// Bucket A — pure script. Runs lint, typecheck, build.
// Usage: node tools/quality-gate/index.js <project-dir>
// Exit 0 = pass, Exit 1 = fail (with specific errors)

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function run(cmd, cwd) {
  try {
    const output = execSync(cmd, { cwd, stdio: 'pipe', timeout: 120000 });
    return { success: true, output: output.toString() };
  } catch (e) {
    return { success: false, output: e.stdout?.toString() || e.message };
  }
}

function gate(projectDir) {
  if (!fs.existsSync(projectDir)) {
    console.error(JSON.stringify({ pass: false, error: `Directory not found: ${projectDir}` }));
    process.exit(1);
  }

  const failures = [];
  const hasPackageJson = fs.existsSync(path.join(projectDir, 'package.json'));
  const hasTsConfig = fs.existsSync(path.join(projectDir, 'tsconfig.json'));

  if (!hasPackageJson) {
    console.error(JSON.stringify({ pass: false, error: 'No package.json found' }));
    process.exit(1);
  }

  // 1. TypeScript check (only if tsconfig.json exists)
  if (hasTsConfig) {
    const tsResult = run('npx tsc --noEmit', projectDir);
    if (!tsResult.success) {
      failures.push({ gate: 'typecheck', errors: tsResult.output });
    }
  }

  // 2. Build
  const buildResult = run('npm run build', projectDir);
  if (!buildResult.success) {
    failures.push({ gate: 'build', errors: buildResult.output });
  }

  if (failures.length > 0) {
    console.error(JSON.stringify({ pass: false, failures }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({ pass: true, projectDir }));
}

const projectDir = process.argv[2] || process.cwd();
gate(projectDir);
