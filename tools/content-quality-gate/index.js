import path from 'path';
import fs from 'fs';

// ─── 1. Domain Accuracy ─────────────────────────────────────────────────────
// Check that industry-specific keywords appear in generated file content.

const INDUSTRY_KEYWORDS = {
  restaurant: ['menu', 'reservation', 'dining', 'chef', 'cuisine', 'table', 'food', 'order', 'dish', 'beverage', 'kitchen'],
  dental: ['appointment', 'patient', 'teeth', 'smile', 'dental', 'clinic', 'hygienist', 'treatment', 'oral', 'tooth'],
  fitness: ['member', 'class', 'trainer', 'workout', 'schedule', 'gym', 'fitness', 'exercise', 'training', 'membership'],
  ecommerce: ['product', 'cart', 'checkout', 'order', 'shipping', 'inventory', 'price', 'store', 'shop', 'catalog'],
  saas: ['user', 'plan', 'feature', 'dashboard', 'integration', 'api', 'subscription', 'billing', 'workspace', 'tier'],
  realestate: ['property', 'listing', 'agent', 'mortgage', 'buyer', 'seller', 'home', 'house', 'apartment', 'market'],
  healthcare: ['patient', 'doctor', 'appointment', 'clinic', 'health', 'medical', 'treatment', 'care', 'diagnosis', 'prescription'],
  education: ['course', 'student', 'lesson', 'instructor', 'learn', 'module', 'quiz', 'certificate', 'curriculum', 'enroll'],
  nonprofit: ['donate', 'volunteer', 'impact', 'mission', 'community', 'grant', 'fund', 'cause', 'beneficiary', 'outreach'],
  agency: ['client', 'project', 'campaign', 'deliverable', 'proposal', 'retainer', 'strategy', 'creative', 'brief', 'timeline'],
};

function checkDomainAccuracy(content, industry) {
  const keywords = INDUSTRY_KEYWORDS[industry] ?? [];
  if (keywords.length === 0) return { matches: 0, required: 0, passed: true, matched: [] };
  const lc = content.toLowerCase();
  const matched = keywords.filter(kw => lc.includes(kw));
  const required = Math.min(2, keywords.length);
  return { matches: matched.length, required, passed: matched.length >= required, matched };
}

// ─── 2. Cross-File Uniqueness ───────────────────────────────────────────────
// Detect sentences repeated across 3+ files — signals copy-paste filler.

function extractSentences(content) {
  // Grab text from string literals and JSX text content
  const strings = content.match(/['"`]([A-Z][^'"`]{20,})['"`]/g) ?? [];
  const jsx = content.match(/>([A-Z][^<]{20,})</g) ?? [];
  const all = [...strings, ...jsx].map(s => s.replace(/^[>'"`]|['"`<]$/g, '').trim());
  return all.filter(s => s.length > 30);
}

function checkCrossFileUniqueness(files) {
  const sentenceCount = new Map();
  for (const { content } of files) {
    const sentences = extractSentences(content);
    for (const s of sentences) {
      sentenceCount.set(s, (sentenceCount.get(s) ?? 0) + 1);
    }
  }
  const repeated = [...sentenceCount.entries()].filter(([, c]) => c >= 3).map(([s]) => s);
  const ratio = sentenceCount.size > 0 ? repeated.length / sentenceCount.size : 0;
  return { repeated: repeated.length, ratio: Math.round(ratio * 100) / 100, passed: ratio < 0.3, examples: repeated.slice(0, 5) };
}

// ─── 3. Completeness ────────────────────────────────────────────────────────
// Penalise components that have no substantive content (no descriptions, no alt text).

function checkCompleteness(content) {
  const hasBody = content.includes('<p ') || content.includes('<p>') || content.includes('description');
  const hasDescriptions = /description['"]\s*:\s*['"][^'"]{20,}/.test(content);
  const hasAltText = /alt=['"][^'"]{5,}/.test(content);
  const hasDynamicItems = /items\??\.(map|length)|\.map\(/.test(content);
  const score = (hasBody ? 34 : 0) + (hasDescriptions ? 33 : 0) + (hasAltText ? 33 : 0);
  return { score, hasBody, hasDescriptions, hasAltText, hasDynamicItems, passed: score >= 33 };
}

// ─── 4. Non-Generic Language ────────────────────────────────────────────────
// Penalise filler phrases that add no real information.

const FILLER_PATTERNS = [
  /state[- ]of[- ]the[- ]art/i,
  /game[- ]changer/i,
  /we\s+are\s+passionate\s+about/i,
  /cutting[- ]edge/i,
  /best[- ]in[- ]class/i,
  /world[- ]class/i,
  /\bleverage\b/i,
  /\bsynergy\b/i,
  /\bseamlessly\b/i,
  /robust\s+solution/i,
  /\bempower\b/i,
  /\butilize\b/i,
  /optimize\s+your/i,
  /take\s+your\s+.*\s+to\s+the\s+next\s+level/i,
  /unlock\s+the\s+power/i,
  /transform\s+your\s+business/i,
  /innovative\s+solution/i,
  /\bdrive\s+results\b/i,
  /comprehensive\s+suite/i,
  /tailored\s+solutions/i,
  /end[- ]to[- ]end\s+solution/i,
  /elevate\s+your/i,
  /revolutionize/i,
  /unparalleled/i,
  /mission[- ]critical/i,
];

function checkNonGenericLanguage(content) {
  const hits = FILLER_PATTERNS.filter(p => p.test(content));
  const score = Math.max(0, 100 - hits.length * 10);
  return { fillerCount: hits.length, score, passed: hits.length < 5, matched: hits.map(p => p.source) };
}

// ─── File Walker ────────────────────────────────────────────────────────────

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
    } else if (/\.(tsx|jsx|ts|js)$/.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

// ─── Main Gate ──────────────────────────────────────────────────────────────

function gate(projectDir, industry) {
  if (!fs.existsSync(projectDir)) {
    console.error(JSON.stringify({ pass: false, error: `Directory not found: ${projectDir}` }));
    process.exit(1);
  }

  const componentsDir = path.join(projectDir, 'src', 'components');
  const appDir = path.join(projectDir, 'src', 'app');

  const componentFiles = fs.existsSync(componentsDir) ? walk(componentsDir) : [];
  const appFiles = fs.existsSync(appDir) ? walk(appDir) : [];
  const allFiles = [...componentFiles, ...appFiles];

  if (allFiles.length === 0) {
    console.error(JSON.stringify({ pass: false, reason: 'No generated UI files found.', components: 0, appFiles: 0 }));
    process.exit(1);
  }

  const fileData = allFiles.map(fp => ({ path: fp, content: fs.readFileSync(fp, 'utf-8') }));

  // Run all checks
  const domainResults = fileData.map(f => ({
    name: path.basename(f.path),
    ...checkDomainAccuracy(f.content, industry),
  }));

  const uniqueness = checkCrossFileUniqueness(fileData);

  const completenessResults = fileData.map(f => ({
    name: path.basename(f.path),
    ...checkCompleteness(f.content),
  }));

  const genericResults = fileData.map(f => ({
    name: path.basename(f.path),
    ...checkNonGenericLanguage(f.content),
  }));

  // Aggregate
  const domainPass = domainResults.filter(d => d.passed).length;
  const completenessPass = completenessResults.filter(c => c.passed).length;
  const genericPass = genericResults.filter(g => g.passed).length;
  const totalFiles = fileData.length;
  const totalFillerHits = genericResults.reduce((s, g) => s + g.fillerCount, 0);

  const allDomainPass = domainPass >= Math.ceil(totalFiles * 0.3);
  const allUniquenessPass = uniqueness.passed;
  const allCompletenessPass = completenessPass >= Math.ceil(totalFiles * 0.3);
  // Non-generic: fail if total filler hits >= 5 across all files, OR if more than half files have filler
  const allGenericPass = totalFillerHits < 5 && genericPass >= Math.ceil(totalFiles * 0.5);

  const pass = allDomainPass && allUniquenessPass && allCompletenessPass && allGenericPass;

  const result = {
    pass,
    industry,
    files: totalFiles,
    domainAccuracy: {
      passed: allDomainPass,
      filesWithKeywords: domainPass,
      totalFiles,
    },
    crossFileUniqueness: {
      passed: allUniquenessPass,
      repeatedSentences: uniqueness.repeated,
      ratio: uniqueness.ratio,
      examples: uniqueness.examples,
    },
    completeness: {
      passed: allCompletenessPass,
      filesWithContent: completenessPass,
      totalFiles,
    },
    nonGenericLanguage: {
      passed: allGenericPass,
      filesWithCleanLanguage: genericPass,
      totalFiles,
      totalFillerHits: genericResults.reduce((s, g) => s + g.fillerCount, 0),
    },
    details: {
      domain: domainResults.filter(d => !d.passed).map(d => ({ name: d.name, matched: d.matched })),
      completeness: completenessResults.filter(c => !c.passed).map(c => ({ name: c.name, score: c.score })),
      generic: genericResults.filter(g => !g.passed).map(g => ({ name: g.name, fillerCount: g.fillerCount })),
    },
  };

  console.error(`\n[content-quality-gate] Industry: ${industry}`);
  console.error(`  Domain accuracy:    ${domainPass}/${totalFiles} files have industry keywords (need >=${Math.ceil(totalFiles * 0.3)})`);
  console.error(`  Cross-file unique:  ${uniqueness.repeated} repeated sentences (${Math.round(uniqueness.ratio * 100)}% ratio, need <30%)`);
  console.error(`  Completeness:       ${completenessPass}/${totalFiles} files have substantive content (need >=${Math.ceil(totalFiles * 0.3)})`);
  console.error(`  Non-generic:        ${genericPass}/${totalFiles} files clean of filler (need >=${Math.ceil(totalFiles * 0.5)})`);

  console.log(JSON.stringify(result));
  process.exit(pass ? 0 : 1);
}

// Parse args
const projectDir = process.argv[2] || process.cwd();
const industryIdx = process.argv.indexOf('--industry');
const industry = industryIdx !== -1 ? process.argv[industryIdx + 1] : 'general';

gate(projectDir, industry);
