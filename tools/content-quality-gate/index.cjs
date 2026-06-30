#!/usr/bin/env node
// tools/content-quality-gate/index.cjs
// Content quality gate — detects generic-placeholder-dense builds.
// Usage: node tools/content-quality-gate/index.cjs <project-dir> [--threshold 0.3]
// Exit 0 = pass, Exit 1 = fail (too many generic components)

const fs = require('fs');
const path = require('path');

const GENERIC_PATTERNS = [
  // Generic resolver output: single title prop, no body content
  /export interface \w+Props \{\s*title\?: string;\s*\}/,
  // Single h2 with title only
  /<h2 className="text-2xl font-bold">\{title\}<\/h2>/,
  // No items, no fields, no columns, no stats, no tiers
  /return \(\s*<section className="py-16">\s*<div className="max-w-7xl mx-auto px-6">\s*<h2/,
];

const TRIVIAL_COMPONENT_PATTERNS = [
  // Component that only renders a title in a section
  /<section className="py-16">[\s\S]*?<h2[^>]*>\{title\}<\/h2>[\s\S]*?<\/section>/,
  // No interactive elements (buttons, forms, tables, grids)
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

  return {
    name: componentName,
    path: filePath,
    issues,
    isGeneric,
    propCount,
    score: isGeneric ? 0 : (hasAnyContent ? 100 : 50),
  };
}

function gate(projectDir) {
  if (!fs.existsSync(projectDir)) {
    console.error(JSON.stringify({ pass: false, error: `Directory not found: ${projectDir}` }));
    process.exit(1);
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
  const trivialCount = analyses.filter(a => a.issues.includes('trivial-body')).length;
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

  if (pass) {
    console.log(JSON.stringify(result));
  } else {
    console.error(JSON.stringify(result, null, 2));
    console.error(`\n[content-quality-gate] FAILED: ${genericCount}/${analyses.length} components (${Math.round(genericRatio * 100)}%) are generic placeholders (threshold: ${Math.round(threshold * 100)}%)`);
    console.error(`Generic components: ${analyses.filter(a => a.isGeneric).map(a => a.name).join(', ')}`);
    process.exit(1);
  }
}

const projectDir = process.argv[2] || process.cwd();
gate(projectDir);
