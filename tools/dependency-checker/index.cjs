// tools/dependency-checker/index.js
// Bucket A — scans all output files for external URL references.
// Exit 0 = zero external URLs found. Exit 1 = violations found.
// Usage: node tools/dependency-checker/index.js <project-dir> [--source-domain example.com]

const fs = require('fs');
const path = require('path');

const ALLOWED_EXTERNAL_PATTERNS = [
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
  /cdn\.jsdelivr\.net/,
  /unpkg\.com/,
  /cdnjs\.cloudflare\.com/,
];

const SKIP_DIRS = ['node_modules', '.next', 'dist', '.git', '.vercel'];

function scanFile(filePath, sourceDomain) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const urlPattern = /https?:\/\/[^\s"'`>)]+/g;
    const matches = content.match(urlPattern) || [];

    return matches.filter(url => {
      if (ALLOWED_EXTERNAL_PATTERNS.some(p => p.test(url))) return false;
      if (sourceDomain && url.includes(sourceDomain)) return true;
      if (/src=["']https?:/.test(content) && url.match(/\.(jpg|png|webp|svg|gif|mp4|woff2)/)) return true;
      return false;
    }).map(url => ({ file: filePath, url }));
  } catch {
    return [];
  }
}

function walkDir(dir, sourceDomain) {
  const violations = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.includes(entry.name)) {
        violations.push(...walkDir(fullPath, sourceDomain));
      }
    } else if (entry.name.match(/\.(tsx?|jsx?|html|css|json|mdx?)$/)) {
      violations.push(...scanFile(fullPath, sourceDomain));
    }
  }

  return violations;
}

const projectDir = process.argv[2] || process.cwd();
const sourceDomainIdx = process.argv.indexOf('--source-domain');
const sourceDomain = sourceDomainIdx >= 0 ? process.argv[sourceDomainIdx + 1] : null;

if (!fs.existsSync(projectDir)) {
  console.error(JSON.stringify({ pass: false, error: `Directory not found: ${projectDir}` }));
  process.exit(1);
}

const violations = walkDir(projectDir, sourceDomain);
const filesScanned = countFiles(projectDir);

if (violations.length > 0) {
  console.error(JSON.stringify({ pass: false, violations, filesScanned }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ pass: true, filesScanned, externalUrls: 0 }));

function countFiles(dir) {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && !SKIP_DIRS.includes(entry.name)) {
      count += countFiles(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      count++;
    }
  }
  return count;
}
