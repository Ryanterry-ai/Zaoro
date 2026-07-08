import path from 'path';
import fs from 'fs';

// ─── Hard markers ────────────────────────────────────────────────────────────
// Any single occurrence fails the build outright.
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

// ─── Soft phrases ────────────────────────────────────────────────────────────
// Filler / boilerplate that reduces content quality. Each hit deducts from score.
const SOFT_PHRASES = [
  /clean,\s*fast,\s*and\s*reliable/i,
  /highly\s+recommended!/i,
  /seamless\s+experience/i,
  /world-class\s+support/i,
  /trusted\s+by\s+(thousands|hundreds|businesses|teams|customers)/i,
  /our\s+team\s+is\s+here\s+to\s+help/i,
  /we\s+are\s+passionate\s+about/i,
  /dedicated\s+to\s+excellence/i,
  /committed\s+to\s+(your|our|the)\s+(success|quality|vision)/i,
  /state-of-the-art/i,
  /cutting-edge\s+(technology|solutions|platform)/i,
  /transform\s+your\s+(business|workflow|operations|life)/i,
  /elevate\s+your\s+(experience|business|brand)/i,
  /unparalleled\s+(service|quality|support)/i,
  /best-in-class/i,
  /game.?changer/i,
  /one-stop.?shop/i,
  /we\s+strive\s+to/i,
  /our\s+mission\s+is\s+to/i,
  /passionately\s+(committed|dedicated)/i,
];

// ─── Industry keyword banks ──────────────────────────────────────────────────
// Each industry maps to keywords that SHOULD appear in generated content.
// At least 2 of these must appear for domain accuracy to pass.
const INDUSTRY_KEYWORDS = {
  restaurant: ['food', 'menu', 'dining', 'kitchen', 'chef', 'restaurant', 'cuisine', 'meal', 'dish', 'ingredient', 'fresh', 'served', 'taste', 'flavor', 'order'],
  fitness: ['gym', 'workout', 'training', 'fitness', 'exercise', 'member', 'class', 'coach', 'muscle', 'strength', 'cardio', 'wellness', 'health', 'personal training'],
  saas: ['dashboard', 'subscription', 'plan', 'pricing', 'feature', 'integrat', 'API', 'workflow', 'automat', 'analytics', 'user', 'team', 'enterprise', 'platform'],
  ecommerce: ['product', 'shop', 'cart', 'checkout', 'order', 'shipping', 'price', 'brand', 'collection', 'inventory', 'customer', 'purchase', 'delivery', 'store'],
  healthcare: ['patient', 'clinic', 'appointment', 'doctor', 'health', 'medical', 'care', 'treatment', 'diagnosis', 'provider', 'practice', 'insurance', 'wellness'],
  education: ['course', 'learn', 'student', 'instructor', 'curriculum', 'class', 'education', 'training', 'skill', 'certification', 'enrollment', 'lecture', 'module'],
  realestate: ['property', 'listing', 'agent', 'buyer', 'seller', 'home', 'house', 'apartment', 'mortgage', 'market', 'neighborhood', 'square feet', 'bedroom'],
  nonprofit: ['donation', 'donor', 'volunteer', 'impact', 'community', 'mission', 'charity', 'nonprofit', 'grant', 'fundrais', 'cause', 'outreach'],
  agency: ['client', 'project', 'campaign', 'brand', 'creative', 'strategy', 'design', 'marketing', 'content', 'social media', 'digital', 'portfolio'],
  'enterprise-software': ['enterprise', 'deployment', 'compliance', 'security', 'integration', 'workflow', 'automat', 'analytics', 'admin', 'audit', 'license'],
  automotive: ['vehicle', 'car', 'service', 'repair', 'maintenance', 'warranty', 'inventory', 'test drive', 'financing', 'trade-in', 'oil change', 'tire'],
  'beauty-salon': ['hair', 'salon', 'stylist', 'beauty', 'treatment', 'facial', 'nail', 'makeup', 'spa', 'skincare', 'appointment', 'cosmetic'],
  'dental-clinic': ['dental', 'teeth', 'dentist', 'oral', 'gum', 'crown', 'implant', 'whitening', 'braces', 'checkup', 'cleaning', 'x-ray'],
  event: ['event', 'venue', 'booking', 'catering', 'wedding', 'conference', 'party', 'celebration', 'guest', 'RSVP', 'seating', 'decor'],
  portfolio: ['project', 'work', 'client', 'creative', 'design', 'portfolio', 'case study', 'testimonial', 'gallery', 'showcase', 'experience', 'skill'],
};

// ─── Industry anti-keywords ──────────────────────────────────────────────────
// If the industry is known, these words suggest WRONG content was generated.
const INDUSTRY_ANTI_KEYWORDS = {
  restaurant: /\b(sprint|velocity|backlog|refactor|deploy|kubernetes|CI\/CD|microservice)\b/i,
  fitness: /\b(invoice|ledger|depreciation|amortization|quarterly report)\b/i,
  saas: /\b(recipe|ingredient|oven|grill|plating)\b/i,
  healthcare: /\b(inventory|warehouse|logistics|supply chain)\b/i,
  realestate: /\b(sprint|backlog|velocity|retrospective)\b/i,
};

// ─── Trivial-body signature ──────────────────────────────────────────────────
const TRIVIAL_BODY = /return\s*\(\s*<section[^>]*>\s*<div[^>]*>\s*<h2[^>]*>[^<]*<\/h2>\s*<\/div>\s*<\/section>\s*\);/;

// ─── Helper functions ────────────────────────────────────────────────────────

function countMatches(content, patterns) {
  let n = 0;
  for (const p of patterns) {
    if (p.test(content)) n++;
  }
  return n;
}

function walk(dir, out = []) {
  let entries;
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

/**
 * Extract readable text strings from JSX/TSX content.
 * Pulls text from: string literals in JSX, template literals, text props.
 */
function extractTextStrings(content) {
  const texts = [];
  // Match string literals inside JSX: <p>Some text</p>, <h1>Text</h1>
  const jsxTextRe = />([A-Z][^<]{10,})</g;
  // Match text: { value: "Some text", type: 'text' } patterns
  const textPropRe = /value:\s*["'`]([^"'`]{10,})["'`]/g;
  // Match string assignments: title: "Something"
  const titleRe = /(?:title|description|subtitle|label|tagline|heading):\s*["'`]([^"'`]{8,})["'`]/g;

  let m;
  while ((m = jsxTextRe.exec(content)) !== null) texts.push(m[1].trim());
  while ((m = textPropRe.exec(content)) !== null) texts.push(m[1].trim());
  while ((m = titleRe.exec(content)) !== null) texts.push(m[1].trim());

  return texts;
}

/**
 * Split text into sentences for uniqueness analysis.
 */
function extractSentences(texts) {
  const sentences = [];
  for (const t of texts) {
    const parts = t.split(/[.!?]+/).filter(s => s.trim().length > 15);
    for (const p of parts) {
      sentences.push(p.trim().toLowerCase());
    }
  }
  return sentences;
}

/**
 * Compute content completeness score for a file.
 * Checks: has descriptions beyond titles, has body paragraphs, has multiple content sections.
 */
function completenessScore(content) {
  let score = 100;

  // Check for body text (p tags with meaningful content)
  const bodyParagraphs = content.match(/<p[^>]*>[^<]{30,}<\/p>/g) || [];
  if (bodyParagraphs.length === 0) score -= 15;

  // Check for descriptions (text content > 20 chars in non-heading elements)
  const descriptions = content.match(/description[^}]*["'`]([^"'`]{20,})["'`]/g) || [];
  if (descriptions.length === 0) score -= 10;

  // Check for alt text on images (accessibility + content signal)
  const altTexts = content.match(/alt=["'`]([^"'`]{5,})["'`]/g) || [];
  if (content.includes('<img') && altTexts.length === 0) score -= 5;

  // Penalize files where all text content is very short (< 20 chars per item)
  const allTexts = extractTextStrings(content);
  if (allTexts.length > 0) {
    const avgLen = allTexts.reduce((s, t) => s + t.length, 0) / allTexts.length;
    if (avgLen < 20) score -= 20;
  }

  return Math.max(0, score);
}

// ─── Per-file analysis ───────────────────────────────────────────────────────

function analyzeFile(filePath, industry) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const name = path.basename(filePath);
  const issues = [];

  const hardHits = countMatches(content, HARD_MARKERS);
  const softHits = countMatches(content, SOFT_PHRASES);

  if (hardHits > 0) issues.push(`hard-placeholder(${hardHits})`);
  if (softHits > 0) issues.push(`generic-phrase(${softHits})`);

  const isTrivial = TRIVIAL_BODY.test(content);
  if (isTrivial) issues.push('trivial-body');

  // Dynamic content check
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

  // Domain accuracy: check if industry keywords appear
  let domainHits = 0;
  let antiHits = 0;
  if (industry && INDUSTRY_KEYWORDS[industry]) {
    const keywords = INDUSTRY_KEYWORDS[industry];
    const lowerContent = content.toLowerCase();
    domainHits = keywords.filter(kw => lowerContent.includes(kw.toLowerCase())).length;
    const antiRe = INDUSTRY_ANTI_KEYWORDS[industry];
    if (antiRe && antiRe.test(content)) antiHits = 1;
  }
  if (industry && INDUSTRY_KEYWORDS[industry] && domainHits < 2) {
    issues.push(`domain-weak(${domainHits}/2 keywords)`);
  }
  if (antiHits > 0) {
    issues.push('domain-wrong-industry');
  }

  // Completeness
  const compScore = completenessScore(content);
  if (compScore < 60) {
    issues.push(`incomplete(score=${compScore})`);
  }

  // Intra-file sentence repetition
  const texts = extractTextStrings(content);
  const sentences = extractSentences(texts);
  const sentenceCounts = {};
  for (const s of sentences) {
    sentenceCounts[s] = (sentenceCounts[s] || 0) + 1;
  }
  const repeatedSentences = Object.entries(sentenceCounts).filter(([, c]) => c >= 3);
  if (repeatedSentences.length > 0) {
    issues.push(`repeated-sentences(${repeatedSentences.length})`);
  }

  const isGeneric = hardHits > 0;
  // Score: 0 = hard fail, then deduct for issues
  let score = 100;
  if (isGeneric) score = 0;
  else {
    score -= softHits * 5;
    if (isTrivial) score -= 40;
    if (!hasAnyContent) score -= 30;
    if (domainHits < 2 && industry) score -= 15;
    if (antiHits > 0) score -= 25;
    if (compScore < 60) score -= 20;
    if (repeatedSentences.length > 0) score -= repeatedSentences.length * 5;
    score = Math.max(0, score);
  }

  return {
    name, path: filePath, issues, isGeneric, isTrivial,
    hardHits, softHits, domainHits, antiHits, compScore,
    repeatedSentences: repeatedSentences.length,
    score,
  };
}

// ─── Cross-file uniqueness analysis ──────────────────────────────────────────

function crossFileUniqueness(analyses) {
  // Collect all sentences with their source files
  const sentenceToFile = new Map(); // sentence -> Set<filename>
  for (const a of analyses) {
    const content = fs.readFileSync(a.path, 'utf-8');
    const texts = extractTextStrings(content);
    const sentences = extractSentences(texts);
    const unique = new Set(sentences);
    for (const s of unique) {
      if (!sentenceToFile.has(s)) sentenceToFile.set(s, new Set());
      sentenceToFile.get(s).add(a.name);
    }
  }

  // Find sentences repeated across 3+ files
  const duplicates = [];
  for (const [sentence, files] of sentenceToFile) {
    if (files.size >= 3) {
      duplicates.push({ sentence: sentence.slice(0, 80), files: [...files] });
    }
  }

  return duplicates;
}

// ─── Main gate ───────────────────────────────────────────────────────────────

function gate(projectDir) {
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
    console.error(JSON.stringify({ pass: false, reason: 'No generated UI files found (src/components or src/app).', components: 0, appFiles: 0 }));
    process.exit(1);
  }

  const pageFiles = allFiles.filter(f => /page\.(tsx|jsx)$/.test(path.basename(f)));
  if (pageFiles.length === 0) {
    console.error(JSON.stringify({ pass: false, reason: 'No page.tsx found — the app has no renderable route.', components: componentFiles.length, appFiles: appFiles.length }));
    process.exit(1);
  }

  // Parse CLI args
  const thresholdIdx = process.argv.indexOf('--threshold');
  const threshold = thresholdIdx !== -1 ? parseFloat(process.argv[thresholdIdx + 1]) : 0.3;

  const industryIdx = process.argv.indexOf('--industry');
  const industry = industryIdx !== -1 ? process.argv[industryIdx + 1] : null;

  // Analyze each file
  const analyses = allFiles.map(f => analyzeFile(f, industry));
  const genericCount = analyses.filter(a => a.isGeneric).length;
  const trivialCount = analyses.filter(a => a.isTrivial).length;
  const totalHard = analyses.reduce((s, a) => s + a.hardHits, 0);
  const totalSoft = analyses.reduce((s, a) => s + a.softHits, 0);

  const genericRatio = genericCount / analyses.length;
  const trivialRatio = trivialCount / analyses.length;

  // Cross-file uniqueness
  const duplicateSentences = crossFileUniqueness(analyses);
  const duplicateRatio = duplicateSentences.length / Math.max(1, analyses.length);

  // Domain accuracy summary
  const domainWeakCount = analyses.filter(a => a.issues.some(i => i.startsWith('domain-weak'))).length;
  const domainWrongCount = analyses.filter(a => a.issues.includes('domain-wrong-industry')).length;

  // Completeness summary
  const incompleteCount = analyses.filter(a => a.issues.some(i => i.startsWith('incomplete'))).length;

  // Final verdict
  // Block if: hard placeholders, generic ratio too high, too many trivial files,
  // too many duplicate sentences across files, or domain accuracy too low.
  const pass =
    totalHard === 0 &&
    genericRatio <= threshold &&
    trivialRatio <= 0.5 &&
    duplicateRatio <= 0.3 &&
    (domainWrongCount === 0 || !industry);

  const avgScore = analyses.reduce((s, a) => s + a.score, 0) / analyses.length;

  const result = {
    pass,
    files: analyses.length,
    components: componentFiles.length,
    pages: pageFiles.length,
    generic: genericCount,
    trivial: trivialCount,
    hardMarkers: totalHard,
    softMarkers: totalSoft,
    genericRatio: Math.round(genericRatio * 100) / 100,
    trivialRatio: Math.round(trivialRatio * 100) / 100,
    threshold,
    // New fields
    industry: industry || null,
    domainWeak: domainWeakCount,
    domainWrong: domainWrongCount,
    incomplete: incompleteCount,
    duplicateSentences: duplicateSentences.length,
    duplicateRatio: Math.round(duplicateRatio * 100) / 100,
    avgScore: Math.round(avgScore),
    details: analyses.filter(a => a.issues.length > 0).map(a => ({
      name: a.name, issues: a.issues, score: a.score,
    })),
    crossFileDuplicates: duplicateSentences.slice(0, 10),
  };

  // Logging
  console.error(`\n[content-quality-gate] ${genericCount}/${analyses.length} files (${Math.round(genericRatio * 100)}%) generic | ${totalHard} hard markers | avg score: ${result.avgScore}`);
  if (industry) {
    console.error(`  Industry: ${industry} | domain-weak: ${domainWeakCount} | domain-wrong: ${domainWrongCount}`);
  }
  if (duplicateSentences.length > 0) {
    console.error(`  Cross-file duplicates: ${duplicateSentences.length} sentences in 3+ files`);
  }
  if (incompleteCount > 0) {
    console.error(`  Incomplete files: ${incompleteCount}`);
  }
  if (genericCount > 0) console.error(`  Generic files: ${analyses.filter(a => a.isGeneric).map(a => a.name).join(', ')}`);
  if (trivialCount > 0) console.error(`  Trivial files: ${analyses.filter(a => a.isTrivial).map(a => a.name).join(', ')}`);

  console.log(JSON.stringify(result));
  process.exit(pass ? 0 : 1);
}

const projectDir = process.argv[2] || process.cwd();
gate(projectDir);
