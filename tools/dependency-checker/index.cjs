// tools/dependency-checker/index.js
// Bucket A — scans all output files for external URL references AND text overlap.
// Exit 0 = zero violations found. Exit 1 = violations found.
// Usage: node tools/dependency-checker/index.js <project-dir> [--source-domain example.com] [--source-text source-text.txt] [--overlap-threshold 0.3]

const fs = require('fs');
const path = require('path');

const ALLOWED_EXTERNAL_PATTERNS = [
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
  /cdn\.jsdelivr\.net/,
  /unpkg\.com/,
  /cdnjs\.cloudflare\.com/,
  // Keyless, stable stock media CDNs — real raster images / sample video,
  // not source-domain references. Safe at runtime, no API key required.
  /picsum\.photos/,
  /storage\.googleapis\.com\/gtv-videos-bucket/,
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

// ─── N-gram overlap detection (copy-bleed enforcement) ────────────

function getNGrams(text, n) {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(' ');
  const ngrams = new Set();
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.add(words.slice(i, i + n).join(' '));
  }
  return ngrams;
}

function computeOverlap(textA, textB, n) {
  const ngramsA = getNGrams(textA, n);
  const ngramsB = getNGrams(textB, n);
  if (ngramsA.size === 0 || ngramsB.size === 0) return 0;
  let intersection = 0;
  for (const ng of ngramsA) {
    if (ngramsB.has(ng)) intersection++;
  }
  return intersection / Math.min(ngramsA.size, ngramsB.size);
}

function extractTextFromCode(code) {
  // Extract string literals and JSX text content from code
  const strings = [];
  // String literals
  for (const m of code.matchAll(/["'`]([^"'`]{10,})["'`]/g)) {
    strings.push(m[1]);
  }
  // JSX text content (between > and <)
  for (const m of code.matchAll(/>([^<]{10,})</g)) {
    strings.push(m[1]);
  }
  return strings.join(' ');
}

function checkCopyBleed(projectDir, sourceTextPath, threshold) {
  if (!sourceTextPath || !fs.existsSync(sourceTextPath)) return [];

  const sourceText = fs.readFileSync(sourceTextPath, 'utf-8');
  const violations = [];
  const SKIP_DIRS = ['node_modules', '.next', 'dist', '.git', '.vercel'];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.includes(entry.name)) walk(fullPath);
      } else if (entry.name.match(/\.(tsx?|jsx?)$/)) {
        try {
          const code = fs.readFileSync(fullPath, 'utf-8');
          const codeText = extractTextFromCode(code);
          if (codeText.length < 30) continue;

          // Check 3-gram and 5-gram overlap
          const overlap3 = computeOverlap(sourceText, codeText, 3);
          const overlap5 = computeOverlap(sourceText, codeText, 5);

          if (overlap3 > threshold || overlap5 > threshold * 0.8) {
            violations.push({
              file: fullPath,
              overlap3gram: Math.round(overlap3 * 100) + '%',
              overlap5gram: Math.round(overlap5 * 100) + '%',
              severity: overlap5 > threshold ? 'critical' : 'warning',
              message: `Text overlap with source detected (${Math.round(overlap3 * 100)}% 3-gram). Possible copy-bleed.`,
            });
          }
        } catch {}
      }
    }
  }

  walk(projectDir);
  return violations;
}

const projectDir = process.argv[2] || process.cwd();
const sourceDomainIdx = process.argv.indexOf('--source-domain');
const sourceDomain = sourceDomainIdx >= 0 ? process.argv[sourceDomainIdx + 1] : null;
const sourceTextIdx = process.argv.indexOf('--source-text');
const sourceTextPath = sourceTextIdx >= 0 ? process.argv[sourceTextIdx + 1] : null;
const thresholdIdx = process.argv.indexOf('--overlap-threshold');
const overlapThreshold = thresholdIdx >= 0 ? parseFloat(process.argv[thresholdIdx + 1]) || 0.3 : 0.3;

if (!fs.existsSync(projectDir)) {
  console.error(JSON.stringify({ pass: false, error: `Directory not found: ${projectDir}` }));
  process.exit(1);
}

const violations = walkDir(projectDir, sourceDomain);
const copyBleedViolations = checkCopyBleed(projectDir, sourceTextPath, overlapThreshold);
const allViolations = [...violations, ...copyBleedViolations];
const filesScanned = countFiles(projectDir);

if (allViolations.length > 0) {
  console.error(JSON.stringify({ pass: false, violations: allViolations, filesScanned }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ pass: true, filesScanned, externalUrls: 0, copyBleedChecked: !!sourceTextPath }));

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
