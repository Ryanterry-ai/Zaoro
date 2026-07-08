import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// ─── Generic-content detection ────────────────────────────────────────────────
// These patterns catch the templated/placeholder copy that the deterministic
// content-resolver pools currently emit (e.g. "This platform transformed how I
// run my business. Highly recommended!"). The gate BLOCKS builds that contain
// them so the pipeline is forced to produce real, business-specific content.

// Hard markers: any single occurrence fails the build outright.
const HARD_MARKERS = [
  /lorem\s*ipsum/i,
  /\bTODO\b|\bFIXME\b|\bXXX\b/i,
  /your\s+business\s+depends\s+on\s+us/i,
  /\bjohn\s+doe\b|\bjane\s+doe\b|\balex\s+m\.?\b/i,
  /\bacme\b/i,
  /placeholder\s+(content|text|copy|company|business)/i,
  /example\s+company|example\s+corp/i,
  /premium\s+option/i,
  /lightning\s+fast/i,
  /\$\s?99\b|£\s?99\b|€\s?99\b/,
  /add\s+your\s+(business|company|name|description|here)/i,
  /your\s+(business|company|brand|store)\b/i,
];

// Soft phrases: substring matches (case-insensitive). These are lower priority
// since scraped content now takes precedence over templated fallbacks.
// Only flag these if there are NO dynamic content patterns (.map() calls).
const SOFT_PHRASES = [
  /clean,\s*fast,\s*and\s*reliable/i,
  /highly\s+recommended!/i,
  /seamless\s+experience/i,
  /world-class\s+support/i,
  /trusted\s+by\s+(thousands|hundreds|businesses|teams|customers)/i,
  /our\s+team\s+is\s+here\s+to\s+help/i,
];

// Trivial-body signature: a section that renders ONLY a title and nothing else.
const TRIVIAL_BODY = /return\s*\(\s*<section[^>]*>\s*<div[^>]*>\s*<h2[^>]*>[^<]*<\/h2>\s*<\/div>\s*<\/section>\s*\);/;

function countMatches(content, patterns) {
  let n = 0;
  for (const p of patterns) {
    if (p.test(content)) n++;
  }
  return n;
}

function walk(dir, out = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.') || e.name === '.next') continue;
      walk(full, out);
    } else if (e.name.endsWith('.tsx') || e.name.endsWith('.jsx') || e.name.endsWith('.ts') || e.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const name = path.basename(filePath);
  const issues = [];

  const hardHits = countMatches(content, HARD_MARKERS);
  const softHits = countMatches(content, SOFT_PHRASES);

  if (hardHits > 0) issues.push(`hard-placeholder(${hardHits})`);
  if (softHits > 0) issues.push(`generic-phrase(${softHits})`);

  const isTrivial = TRIVIAL_BODY.test(content);
  if (isTrivial) issues.push('trivial-body');

  const hasAnyContent =
    content.includes('items?.map') || content.includes('items={') ||
    content.includes('fields?.map') || content.includes('fields={') ||
    content.includes('columns?.map') || content.includes('columns={') ||
    content.includes('stats?.map') || content.includes('stats={') ||
    content.includes('tiers?.map') || content.includes('tiers={') ||
    content.includes('actions?.map') || content.includes('actions={');
  if (!hasAnyContent && !hardHits && !softHits && !isTrivial) {
    issues.push('no-dynamic-content');
  }

  const isGeneric = hardHits > 0;
  const score = isGeneric ? 0 : (isTrivial ? 25 : (hasAnyContent ? (softHits > 0 ? 75 : 100) : 50));

  return { name, path: filePath, issues, isGeneric, isTrivial, hardHits, softHits, score };
}

function gate(projectDir) {
  if (!fs.existsSync(projectDir)) {
    // A missing project directory is a hard failure — there is nothing to validate.
    console.error(JSON.stringify({ pass: false, error: `Directory not found: ${projectDir}` }));
    process.exit(1);
  }

  const componentsDir = path.join(projectDir, 'src', 'components');
  const appDir = path.join(projectDir, 'src', 'app');

  const componentFiles = fs.existsSync(componentsDir) ? walk(componentsDir) : [];
  const appFiles = fs.existsSync(appDir) ? walk(appDir) : [];
  const allFiles = [...componentFiles, ...appFiles];

  // No generated UI at all -> the build produced nothing usable.
  if (allFiles.length === 0) {
    console.error(JSON.stringify({ pass: false, reason: 'No generated UI files found (src/components or src/app).', components: 0, appFiles: 0 }));
    process.exit(1);
  }

  const pageFiles = allFiles.filter(f => path.basename(f) === 'page.tsx' || path.basename(f) === 'page.jsx');
  if (pageFiles.length === 0) {
    console.error(JSON.stringify({ pass: false, reason: 'No page.tsx found — the app has no renderable route.', components: componentFiles.length, appFiles: appFiles.length }));
    process.exit(1);
  }

  const analyses = allFiles.map(analyzeFile);
  const genericCount = analyses.filter(a => a.isGeneric).length;
  const trivialCount = analyses.filter(a => a.isTrivial).length;
  const totalHard = analyses.reduce((s, a) => s + a.hardHits, 0);
  const totalIssues = analyses.filter(a => a.issues.length > 0).length;

  const genericRatio = genericCount / analyses.length;
  const trivialRatio = trivialCount / analyses.length;

  const thresholdIdx = process.argv.indexOf('--threshold');
  const threshold = thresholdIdx !== -1 ? parseFloat(process.argv[thresholdIdx + 1]) : 0.3;

  // Block if: any hard placeholder anywhere, OR generic ratio exceeds threshold,
  // OR more than half the files are trivial skeletons.
  const pass = totalHard === 0 && genericRatio <= threshold && trivialRatio <= 0.5;

  const result = {
    pass,
    files: analyses.length,
    components: componentFiles.length,
    pages: pageFiles.length,
    generic: genericCount,
    trivial: trivialCount,
    hardMarkers: totalHard,
    genericRatio: Math.round(genericRatio * 100) / 100,
    trivialRatio: Math.round(trivialRatio * 100) / 100,
    threshold,
    details: analyses.filter(a => a.issues.length > 0).map(a => ({ name: a.name, issues: a.issues, score: a.score })),
  };

  console.error(`\n[content-quality-gate] ${genericCount}/${analyses.length} files (${Math.round(genericRatio * 100)}%) are generic; ${totalHard} hard placeholder markers (threshold: ${Math.round(threshold * 100)}%)`);
  if (genericCount > 0) console.error(`Generic files: ${analyses.filter(a => a.isGeneric).map(a => a.name).join(', ')}`);
  if (trivialCount > 0) console.error(`Trivial files: ${analyses.filter(a => a.isTrivial).map(a => a.name).join(', ')}`);

  console.log(JSON.stringify(result));
  process.exit(pass ? 0 : 1);
}

const projectDir = process.argv[2] || process.cwd();
gate(projectDir);
