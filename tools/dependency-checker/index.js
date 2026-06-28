#!/usr/bin/env node
/**
 * Build Engine — Dependency Checker (Bucket A)
 * Scans output for any external URLs, hot-linked assets, or
 * references to non-client-owned services. Pure deterministic — no LLM.
 *
 * Usage: node index.js [--project-dir ./project] [--allowed-domains example.com]
 */

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { projectDir: './project', allowedDomains: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project-dir') opts.projectDir = args[++i];
    if (args[i] === '--allowed-domains') {
      opts.allowedDomains = args[++i].split(',').map(d => d.trim());
    }
  }
  return opts;
}

const SKIP_DIRS = ['node_modules', '.next', '.git', 'dist', 'build', '.vercel', '.netlify'];
const SKIP_FILES = ['.DS_Store', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const violations = [];

  // Check for external URLs (http/https)
  const urlRegex = /(?:(?:https?:\/\/)[^\s"'<>)}\]]+)/gi;
  let match;
  while ((match = urlRegex.exec(content)) !== null) {
    const url = match[0];
    const parsed = new URL(url);
    const domain = parsed.hostname;

    // Skip allowed domains
    if (opts.allowedDomains.some(d => domain.includes(d))) continue;
    // Skip localhost
    if (domain === 'localhost' || domain.startsWith('127.')) continue;
    // Skip data URIs
    if (url.startsWith('data:')) continue;

    violations.push({
      type: 'external-url',
      url,
      domain,
      line: content.slice(0, match.index).split('\n').length,
    });
  }

  // Check for import statements referencing external packages (non-node_modules)
  // This is a basic check — real implementation would parse AST
  const importRegex = /from\s+["']([^"']+)["']/g;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('http://') || importPath.startsWith('https://')) {
      violations.push({
        type: 'external-import',
        url: importPath,
        line: content.slice(0, match.index).split('\n').length,
      });
    }
  }

  return violations;
}

function scanDirectory(dir, projectDir) {
  const allViolations = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(projectDir, fullPath);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.includes(entry.name)) continue;
      allViolations.push(...scanDirectory(fullPath, projectDir));
    } else if (entry.isFile()) {
      if (SKIP_FILES.includes(entry.name)) continue;
      // Skip binary files
      const ext = path.extname(entry.name).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.eot', '.mp4', '.webm', '.zip'].includes(ext)) continue;

      try {
        const violations = scanFile(fullPath);
        for (const v of violations) {
          v.file = relPath;
        }
        allViolations.push(...violations);
      } catch { /* skip unreadable files */ }
    }
  }

  return allViolations;
}

const opts = parseArgs();
const projectDir = path.resolve(opts.projectDir);

if (!fs.existsSync(projectDir)) {
  console.error(`[DependencyChecker] Project directory not found: ${projectDir}`);
  process.exit(1);
}

console.log(`[DependencyChecker] Scanning ${projectDir} for external dependencies...`);
const violations = scanDirectory(projectDir, projectDir);

const report = {
  passed: violations.length === 0,
  totalViolations: violations.length,
  byType: {
    'external-url': violations.filter(v => v.type === 'external-url').length,
    'external-import': violations.filter(v => v.type === 'external-import').length,
  },
  violations: violations.slice(0, 100), // cap at 100
  scannedAt: new Date().toISOString(),
};

const reportPath = path.join(projectDir, 'dependency-check-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

if (violations.length > 0) {
  console.log(`[DependencyChecker] FAIL: ${violations.length} external dependencies found`);
  for (const v of violations.slice(0, 10)) {
    console.log(`  - ${v.type}: ${v.url || ''} in ${v.file}:${v.line}`);
  }
  console.log(`[DependencyChecker] Full report: ${reportPath}`);
  process.exit(1);
} else {
  console.log(`[DependencyChecker] PASS: Zero external dependencies`);
  process.exit(0);
}
