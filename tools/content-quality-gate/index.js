import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const GENERIC_PATTERNS = [
  // Generic resolver output: single title prop, no body content
  /export interface \w+Props {\s*title\?: string;\s*}/,
];

const TRIVIAL_COMPONENT_PATTERNS = [
  // Component that ONLY renders a title in a section (no items, fields, columns, stats, tiers, actions)
  // Matches: section > div > h2{title} </div> </section> with nothing else
  /return \(\s*<section[^>]*>\s*<div[^>]*>\s*<h2[^>]*>[^<]*<\/h2>\s*<\/div>\s*<\/section>\s*\);/,
];

function analyzeComponent(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const componentName = path.basename(filePath, '.tsx');

  const issues = [];

  // Check for generic resolver patterns
  const isGeneric = GENERIC_PATTERNS.some(p => p.test(content));
  if (isGeneric) {
    issues.push('generic-resolver-output');
  }

  // Check for trivial content (only title, no body)
  const hasTrivialBody = TRIVIAL_COMPONENT_PATTERNS.some(p => p.test(content));
  if (hasTrivialBody) {
    issues.push('trivial-body');
  }

  // Check for missing business content
  const hasItems = content.includes('items?.map') || content.includes('items={');
  const hasFields = content.includes('fields?.map') || content.includes('fields={');
  const hasColumns = content.includes('columns?.map') || content.includes('columns={');
  const hasStats = content.includes('stats?.map') || content.includes('stats={');
  const hasTiers = content.includes('tiers?.map') || content.includes('tiers={');
  const hasActions = content.includes('actions?.map') || content.includes('actions={');

  const hasAnyContent = hasItems || hasFields || hasColumns || hasStats || hasTiers || hasActions;

  if (!hasAnyContent && !isGeneric) {
    issues.push('no-dynamic-content');
  }

  // Count props (more props = more real content)
  const propCount = (content.match(/\?:/g) || []).length;

  // A component is "trivial" if it only has a title and no dynamic content
  const isTrivial = !hasAnyContent && propCount <= 1;

  return {
    name: componentName,
    path: filePath,
    issues,
    isGeneric,
    isTrivial,
    propCount,
    score: isGeneric ? 0 : (isTrivial ? 25 : (hasAnyContent ? 100 : 50)),
  };
}

function gate(projectDir) {
  if (!fs.existsSync(projectDir)) {
    console.error(JSON.stringify({ pass: false, error: `Directory not found: ${projectDir}` }));
    process.exit(0);
  }

  const componentsDir = path.join(projectDir, 'src', 'components');
  if (!fs.existsSync(componentsDir)) {
    console.log(JSON.stringify({ pass: true, reason: 'No components directory found', components: 0 }));
    process.exit(0);
  }

  // Find all component files
  const componentFiles = fs.readdirSync(componentsDir)
    .filter(f => f.endsWith('.tsx') || f.endsWith('.jsx'))
    .map(f => path.join(componentsDir, f));

  if (componentFiles.length === 0) {
    console.log(JSON.stringify({ pass: true, reason: 'No component files found', components: 0 }));
    process.exit(0);
  }

  // Analyze each component
  const analyses = componentFiles.map(analyzeComponent);
  const genericCount = analyses.filter(a => a.isGeneric).length;
  const trivialCount = analyses.filter(a => a.isTrivial).length;
  const totalIssues = analyses.filter(a => a.issues.length > 0).length;

  const genericRatio = genericCount / analyses.length;
  const trivialRatio = trivialCount / analyses.length;

  // Parse threshold from args
  const thresholdIdx = process.argv.indexOf('--threshold');
  const threshold = thresholdIdx !== -1 ? parseFloat(process.argv[thresholdIdx + 1]) : 0.3;

  const pass = genericRatio <= threshold;

  const result = {
    pass,
    components: analyses.length,
    generic: genericCount,
    trivial: trivialCount,
    genericRatio: Math.round(genericRatio * 100) / 100,
    trivialRatio: Math.round(trivialRatio * 100) / 100,
    threshold,
    details: analyses.filter(a => a.issues.length > 0).map(a => ({
      name: a.name,
      issues: a.issues,
      score: a.score,
    })),
  };

  console.error(`\n[content-quality-gate] ${genericCount}/${analyses.length} components (${Math.round(genericRatio * 100)}%) are generic (threshold: ${Math.round(threshold * 100)}%)`);
  console.error(`Generic components: ${analyses.filter(a => a.isGeneric).map(a => a.name).join(', ')}`);
  console.error(`Trivial components: ${analyses.filter(a => a.isTrivial).map(a => a.name).join(', ')}`);

  console.log(JSON.stringify(result));
  process.exit(pass ? 0 : 1);
}

const projectDir = process.argv[2] || process.cwd();
gate(projectDir);
