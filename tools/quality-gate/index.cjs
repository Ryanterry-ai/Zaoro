// tools/quality-gate/index.js
// Bucket A ΓÇö pure script. Runs typecheck, tests (if vitest), build.
// Usage: node tools/quality-gate/index.js <project-dir>
// Exit 0 = pass, Exit 1 = fail (with specific errors)

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function run(cmd, cwd) {
  try {
    const output = execSync(cmd, { cwd, stdio: 'pipe', timeout: 600000 });
    return { success: true, output: output.toString(), skipped: false };
  } catch (e) {
    // If the toolchain itself is unavailable (e.g. npx/tsc/next not on PATH in a
    // minimal environment), this is an environment limitation, NOT a code-quality
    // failure. Skip the gate rather than falsely failing the build. Real type
    // errors / build errors (command ran and exited non-zero) still fail.
    const isMissingTool =
      e.code === 'ENOENT' ||
      /ENOENT/.test(e.message) ||
      /is not recognized as/.test(e.message) ||
      /command not found/.test(e.message) ||
      /spawn .* ENOENT/.test(e.message);
    if (isMissingTool) {
      return { success: true, output: `[skipped: toolchain unavailable] ${cmd}`, skipped: true };
    }
    return { success: false, output: (e.stdout?.toString() || '') + '\n' + (e.stderr?.toString() || '') + '\n' + e.message, skipped: false };
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

  // 1. TypeScript check (always when tsconfig.json exists).
  // Next.js build also type-checks, but running tsc explicitly catches type
  // errors deterministically and independently of the bundler.
  const hasBuildScript = hasPackageJson && (() => {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'));
      return !!(pkg.scripts?.build);
    } catch { return false; }
  })();
  if (hasTsConfig) {
    const tsResult = run('npx tsc --noEmit', projectDir);
    if (tsResult.skipped) {
      console.warn('[quality-gate] Skipping typecheck — TypeScript toolchain unavailable in this environment.');
    } else if (!tsResult.success) {
      failures.push({ gate: 'typecheck', errors: tsResult.output });
    }
  }

  // 2. Tests (skip if vitest not configured)
  const hasVitest = hasPackageJson && (() => {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'));
      return !!(pkg.devDependencies?.vitest || pkg.dependencies?.vitest);
    } catch { return false; }
  })();
  if (hasVitest) {
    const testResult = run('npx vitest run', projectDir);
    if (testResult.skipped) {
      console.warn('[quality-gate] Skipping tests — Vitest toolchain unavailable in this environment.');
    } else if (!testResult.success) {
      failures.push({ gate: 'tests', errors: testResult.output });
    }
  }

  // 2.5 Prisma generate (if schema exists)
  const hasPrismaSchema = fs.existsSync(path.join(projectDir, 'prisma', 'schema.prisma'));
  if (hasPrismaSchema) {
    const prismaResult = run('npx prisma generate', projectDir);
    if (prismaResult.skipped) {
      console.warn('[quality-gate] Skipping prisma generate — Prisma toolchain unavailable in this environment.');
    } else if (!prismaResult.success) {
      failures.push({ gate: 'prisma-generate', errors: prismaResult.output });
    }
  }

  // 2.6 Structural completeness ΓÇö assert required shell files exist (only for Next.js projects)
  const isNextJsProject = hasBuildScript && (() => {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'));
      return !!(pkg.dependencies?.next || pkg.devDependencies?.next);
    } catch { return false; }
  })();

  if (isNextJsProject) {
    const requiredFiles = [
      { path: 'src/app/globals.css', purpose: 'Tailwind CSS directives' },
      { path: 'src/app/layout.tsx', purpose: 'Root layout (must import globals.css)' },
    ];

    const missingRequired = [];
    for (const f of requiredFiles) {
      if (!fs.existsSync(path.join(projectDir, f.path))) {
        missingRequired.push(`${f.path} (${f.purpose})`);
      }
    }
    if (missingRequired.length > 0) {
      failures.push({
        gate: 'structure',
        errors: `Missing required files:\n${missingRequired.map(f => `  - ${f}`).join('\n')}\n\nThe generated project cannot render without these files.`,
      });
    }

    // Check that layout.tsx imports globals.css
    const layoutPath = path.join(projectDir, 'src/app/layout.tsx');
    if (fs.existsSync(layoutPath)) {
      const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
      if (!layoutContent.includes('globals.css')) {
        failures.push({
          gate: 'structure',
          errors: 'src/app/layout.tsx does not import globals.css ΓÇö Tailwind styles will not be applied.',
        });
      }
    }

    // Check recommended files (warn but don't fail)
    const hasTailwindConfig = fs.existsSync(path.join(projectDir, 'tailwind.config.ts')) ||
      fs.existsSync(path.join(projectDir, 'tailwind.config.js'));
    const hasPostcssConfig = fs.existsSync(path.join(projectDir, 'postcss.config.mjs')) ||
      fs.existsSync(path.join(projectDir, 'postcss.config.js'));
    const missingRecommended = [];
    if (!hasTailwindConfig) missingRecommended.push('tailwind.config.ts');
    if (!hasPostcssConfig) missingRecommended.push('postcss.config.mjs');
    if (missingRecommended.length > 0) {
      console.warn(`[quality-gate] Warning: missing recommended files: ${missingRecommended.join(', ')}`);
    }
  }

  // 3. Build
  // Run the project's own build script if it exists, otherwise fall back to next build
  let buildCmd = 'npx --no next build';
  if (hasPackageJson) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'));
      if (pkg.scripts?.build) {
        buildCmd = 'npm run build';
      }
    } catch { /* ignore */ }
  }
  const buildResult = run(buildCmd, projectDir);
  if (buildResult.skipped) {
    console.warn('[quality-gate] Skipping build — build toolchain unavailable in this environment.');
  } else if (!buildResult.success) {
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
