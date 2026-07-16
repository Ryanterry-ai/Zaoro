// ─── Requirement Extraction Engine ───────────────────────────────────────────
//
// Deterministic, no-LLM extraction of requirements from a user prompt.
// Maps keywords → categories → owners. Every requirement is either
// explicit (directly stated) or implicit (inferred from business domain).
// ─────────────────────────────────────────────────────────────────────────────

import type {
  RequirementBlueprint,
  Requirement,
  RequirementCategory,
  RequirementOwner,
  RequirementSource,
} from './types.js';

// ─── Keyword → Category + Owner Mapping ──────────────────────────────────────

type KWEntry = { cat: RequirementCategory; owner: RequirementOwner; pri: Requirement['priority'] };

const KW: Record<string, KWEntry> = {
  // Experience
  'hero':            { cat: 'experience', owner: 'experience-intelligence', pri: 'must' },
  'cinematic':       { cat: 'experience', owner: 'experience-intelligence', pri: 'must' },
  'scroll':          { cat: 'experience', owner: 'experience-intelligence', pri: 'should' },
  'story':           { cat: 'experience', owner: 'experience-intelligence', pri: 'should' },
  'sound':           { cat: 'experience', owner: 'experience-intelligence', pri: 'should' },
  'animation':       { cat: 'experience', owner: 'experience-intelligence', pri: 'should' },
  'transition':      { cat: 'experience', owner: 'experience-intelligence', pri: 'should' },
  'parallax':        { cat: 'experience', owner: 'experience-intelligence', pri: 'nice' },
  'hover':           { cat: 'experience', owner: 'experience-intelligence', pri: 'nice' },
  'interactive':     { cat: 'experience', owner: 'experience-intelligence', pri: 'should' },
  'realtime':        { cat: 'experience', owner: 'experience-intelligence', pri: 'should' },
  'live':            { cat: 'experience', owner: 'experience-intelligence', pri: 'should' },
  'reveal':          { cat: 'experience', owner: 'experience-intelligence', pri: 'nice' },
  'motion':          { cat: 'experience', owner: 'experience-intelligence', pri: 'should' },
  '3d':              { cat: 'experience', owner: 'experience-intelligence', pri: 'nice' },
  'video':           { cat: 'experience', owner: 'experience-intelligence', pri: 'should' },
  'carousel':        { cat: 'experience', owner: 'experience-intelligence', pri: 'nice' },
  'modal':           { cat: 'experience', owner: 'experience-intelligence', pri: 'nice' },
  'drag':            { cat: 'experience', owner: 'experience-intelligence', pri: 'nice' },
  'swipe':           { cat: 'experience', owner: 'experience-intelligence', pri: 'nice' },
  'gesture':         { cat: 'experience', owner: 'experience-intelligence', pri: 'nice' },
  // Functional
  'builder':         { cat: 'functional', owner: 'application-blueprint', pri: 'must' },
  'configurator':    { cat: 'functional', owner: 'application-blueprint', pri: 'must' },
  'pricing':         { cat: 'functional', owner: 'application-blueprint', pri: 'must' },
  'cart':            { cat: 'functional', owner: 'application-blueprint', pri: 'must' },
  'checkout':        { cat: 'functional', owner: 'application-blueprint', pri: 'must' },
  'payment':         { cat: 'functional', owner: 'application-blueprint', pri: 'must' },
  'search':          { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'filter':          { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'dashboard':       { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'report':          { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'analytics':       { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'notification':    { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'auth':            { cat: 'functional', owner: 'application-blueprint', pri: 'must' },
  'login':           { cat: 'functional', owner: 'application-blueprint', pri: 'must' },
  'signup':          { cat: 'functional', owner: 'application-blueprint', pri: 'must' },
  'profile':         { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'calendar':        { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'booking':         { cat: 'functional', owner: 'application-blueprint', pri: 'must' },
  'reservation':     { cat: 'functional', owner: 'application-blueprint', pri: 'must' },
  'appointment':     { cat: 'functional', owner: 'application-blueprint', pri: 'must' },
  'inventory':       { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'order':           { cat: 'functional', owner: 'application-blueprint', pri: 'must' },
  'tracking':        { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'loyalty':         { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'review':          { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'menu':            { cat: 'functional', owner: 'application-blueprint', pri: 'must' },
  'nutrition':       { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'location':        { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'map':             { cat: 'functional', owner: 'application-blueprint', pri: 'nice' },
  'chat':            { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'blog':            { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'cms':             { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'api':             { cat: 'functional', owner: 'technology-planner', pri: 'must' },
  'integration':     { cat: 'functional', owner: 'technology-planner', pri: 'should' },
  'crm':             { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'pos':             { cat: 'functional', owner: 'application-blueprint', pri: 'must' },
  'invoice':         { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'billing':         { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'subscription':    { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  'coupon':          { cat: 'functional', owner: 'application-blueprint', pri: 'nice' },
  'offer':           { cat: 'functional', owner: 'application-blueprint', pri: 'should' },
  // Quality
  'responsive':      { cat: 'quality', owner: 'design-intelligence', pri: 'must' },
  'fast':            { cat: 'quality', owner: 'technology-planner', pri: 'must' },
  'accessible':      { cat: 'quality', owner: 'design-intelligence', pri: 'must' },
  'seo':             { cat: 'quality', owner: 'content-intelligence', pri: 'must' },
  'secure':          { cat: 'quality', owner: 'technology-planner', pri: 'must' },
  'mobile':          { cat: 'quality', owner: 'design-intelligence', pri: 'must' },
  'premium':         { cat: 'quality', owner: 'design-intelligence', pri: 'should' },
  'modern':          { cat: 'quality', owner: 'design-intelligence', pri: 'should' },
  'clean':           { cat: 'quality', owner: 'design-intelligence', pri: 'should' },
  'minimal':         { cat: 'quality', owner: 'design-intelligence', pri: 'should' },
  'elegant':         { cat: 'quality', owner: 'design-intelligence', pri: 'should' },
  'performance':     { cat: 'quality', owner: 'technology-planner', pri: 'must' },
  'pwa':             { cat: 'quality', owner: 'technology-planner', pri: 'nice' },
  'ssr':             { cat: 'quality', owner: 'technology-planner', pri: 'should' },
  'testing':         { cat: 'quality', owner: 'validation', pri: 'should' },
  'ci/cd':           { cat: 'quality', owner: 'technology-planner', pri: 'should' },
  'scale':           { cat: 'quality', owner: 'technology-planner', pri: 'should' },
};

// ─── Domain Detection ────────────────────────────────────────────────────────

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  restaurant:     ['restaurant', 'cafe', 'coffee', 'burger', 'pizza', 'food', 'dining', 'bistro', 'eatery', 'bakery', 'bar', 'grill'],
  ecommerce:      ['store', 'shop', 'ecommerce', 'e-commerce', 'marketplace', 'cart', 'checkout', 'product'],
  healthcare:     ['hospital', 'clinic', 'dental', 'doctor', 'patient', 'medical', 'pharmacy', 'health'],
  education:      ['school', 'university', 'college', 'course', 'student', 'learning', 'education', 'academy'],
  fitness:        ['gym', 'fitness', 'studio', 'workout', 'trainer', 'exercise', 'yoga'],
  'real-estate':   ['real estate', 'property', 'properties', 'house', 'apartment', 'realty'],
  legal:          ['law', 'lawyer', 'attorney', 'legal', 'firm', 'litigation'],
  finance:        ['insurance', 'banking', 'fintech', 'investment', 'accounting', 'finance'],
  technology:     ['saas', 'erp', 'crm', 'startup', 'ai', 'software', 'platform', 'dashboard'],
  logistics:      ['logistics', 'shipping', 'fleet', 'delivery', 'warehouse', 'tracking'],
  automotive:     ['car', 'auto', 'dealership', 'ev', 'vehicle', 'motor'],
  fashion:        ['fashion', 'clothing', 'apparel', 'cosmetics', 'beauty', 'style'],
  travel:         ['travel', 'hotel', 'booking', 'trip', 'tourism', 'vacation', 'event'],
  manufacturing:  ['manufacturing', 'factory', 'production', 'industrial'],
  nonprofit:      ['ngo', 'nonprofit', 'charity', 'donation', 'volunteer'],
  government:     ['government', 'portal', 'municipal', 'public service'],
  interior:       ['interior', 'furniture', 'architecture', 'design studio'],
  media:          ['media', 'news', 'blog', 'content', 'publishing'],
};

// ─── Multi-word Phrases (checked before single keywords) ─────────────────────

const PHRASE_OWNERS: Array<{ phrase: string; cat: RequirementCategory; owner: RequirementOwner; pri: Requirement['priority'] }> = [
  { phrase: 'cinematic scroll', cat: 'experience', owner: 'experience-intelligence', pri: 'must' },
  { phrase: 'stop scroll', cat: 'experience', owner: 'experience-intelligence', pri: 'must' },
  { phrase: 'sound reveal', cat: 'experience', owner: 'experience-intelligence', pri: 'must' },
  { phrase: 'live pricing', cat: 'functional', owner: 'application-blueprint', pri: 'must' },
  { phrase: 'burger builder', cat: 'functional', owner: 'application-blueprint', pri: 'must' },
  { phrase: 'real-time', cat: 'experience', owner: 'experience-intelligence', pri: 'should' },
  { phrase: 'realtime', cat: 'experience', owner: 'experience-intelligence', pri: 'should' },
  { phrase: 'real time', cat: 'experience', owner: 'experience-intelligence', pri: 'should' },
  { phrase: 'ci/cd', cat: 'quality', owner: 'technology-planner', pri: 'should' },
  { phrase: 'dark mode', cat: 'quality', owner: 'design-intelligence', pri: 'nice' },
];

// ─── Extraction Engine ───────────────────────────────────────────────────────

let reqCounter = 0;

function makeReq(
  category: RequirementCategory,
  description: string,
  owner: RequirementOwner,
  priority: Requirement['priority'],
  source: RequirementSource,
  keywords: string[],
  confidence: number,
): Requirement {
  reqCounter++;
  return {
    id: `req-${reqCounter}`,
    category,
    description,
    owner,
    confidence,
    source,
    keywords,
    artifactKeys: mapOwnerToArtifacts(owner),
    priority,
  };
}

function mapOwnerToArtifacts(owner: RequirementOwner): string[] {
  const map: Record<RequirementOwner, string[]> = {
    'business-intelligence':   ['business-knowledge', 'discovery'],
    'knowledge-acquisition':   ['evidence', 'evidence-collection'],
    'content-intelligence':    ['content-blueprint', 'content'],
    'experience-intelligence': ['experience-blueprint', 'experience'],
    'design-intelligence':     ['design-blueprint', 'design', 'frontend'],
    'technology-planner':      ['architecture', 'technology', 'tech-stack'],
    'application-blueprint':   ['application-blueprint', 'app-blueprint', 'pages', 'components'],
    'execution-blueprint':     ['execution-blueprint', 'exec-blueprint'],
    'renderer':                ['rendered-files', 'generated-files'],
    'preview':                 ['preview', 'screenshot'],
    'validation':              ['validation', 'qa'],
    'review':                  ['review', 'review-board'],
  };
  return map[owner] ?? [];
}

function detectDomains(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const domains: string[] = [];
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      domains.push(domain);
    }
  }
  return domains;
}

/**
 * Extract all requirements from a prompt.
 * Deterministic — no LLM calls.
 */
export function extractRequirements(prompt: string): RequirementBlueprint {
  const start = Date.now();
  reqCounter = 0;
  const lower = prompt.toLowerCase();
  const requirements: Requirement[] = [];
  const seen = new Set<string>();

  // 1. Multi-word phrase matching (highest specificity)
  for (const p of PHRASE_OWNERS) {
    if (lower.includes(p.phrase) && !seen.has(p.phrase)) {
      seen.add(p.phrase);
      requirements.push(makeReq(p.cat, p.phrase, p.owner, p.pri, 'explicit', [p.phrase], 0.95));
    }
  }

  // 2. Single keyword matching
  const words = lower.replace(/[^a-z0-9/\s-]/g, ' ').split(/\s+/).filter(Boolean);
  for (const w of words) {
    if (seen.has(w)) continue;
    const entry = KW[w];
    if (entry) {
      seen.add(w);
      requirements.push(makeReq(entry.cat, w, entry.owner, entry.pri, 'explicit', [w], 0.9));
    }
  }

  // 3. Domain detection → implicit requirements
  const domains = detectDomains(prompt);
  const primaryDomain = domains[0] ?? 'general';
  const secondaryDomains = domains.slice(1);

  // Add implicit quality requirements (always present)
  if (!seen.has('responsive')) {
    requirements.push(makeReq('quality', 'responsive', 'design-intelligence', 'must', 'implicit', ['responsive'], 0.8));
  }
  if (!seen.has('fast')) {
    requirements.push(makeReq('quality', 'fast performance', 'technology-planner', 'must', 'implicit', ['fast'], 0.8));
  }
  if (!seen.has('accessible')) {
    requirements.push(makeReq('quality', 'accessible', 'design-intelligence', 'must', 'implicit', ['accessible'], 0.8));
  }

  // Group by category
  const grouped = {
    businessDomain: requirements.filter(r => r.category === 'business-domain'),
    experience: requirements.filter(r => r.category === 'experience'),
    functional: requirements.filter(r => r.category === 'functional'),
    quality: requirements.filter(r => r.category === 'quality'),
  };

  const durationMs = Date.now() - start;

  return {
    id: `req-blueprint-${Date.now()}`,
    prompt,
    businessDomain: {
      primary: primaryDomain,
      secondary: secondaryDomains,
      confidence: domains.length > 0 ? 0.9 : 0.3,
    },
    requirements: grouped,
    allRequirements: requirements,
    totalRequirements: requirements.length,
    extraction: {
      confidence: requirements.length > 0
        ? requirements.reduce((s, r) => s + r.confidence, 0) / requirements.length
        : 0,
      explicitCount: requirements.filter(r => r.source === 'explicit').length,
      implicitCount: requirements.filter(r => r.source === 'implicit').length,
      durationMs,
    },
  };
}
