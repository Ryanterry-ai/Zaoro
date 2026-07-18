// ─── Content Fidelity Engine ─────────────────────────────────────────────────
//
// Verifies that the GENERATED COPY faithfully reflects the requested business —
// and, critically, that NO cross-domain content has leaked in (e.g. sports-
// nutrition boilerplate on a jewellery site).
//
// Design rules (AGENTS.md):
//   - No `if industry === X`. We never branch on the build's vertical.
//   - We reason over the prompt's OWN signals (domain nouns from the prompt) and
//     a vertical-MARKER lexicon used only to DETECT leakage — never to generate.
//   - A marker set belonging to vertical V is "leaked" when the copy contains V's
//     markers but the prompt is demonstrably NOT about V.
//   - Deterministic, no LLM.
//
// This is a pure analysis module. The verification loop consumes its findings
// and the repair-executor regenerates offending copy from prompt signals.

import type { BusinessKnowledge } from '../business-intelligence/types.js';

export type FidelityIssueKind =
  | 'cross-domain-leakage'
  | 'placeholder-content'
  | 'boilerplate-testimonial'
  | 'invented-claim'
  | 'off-domain-copy';

export interface FidelityIssue {
  kind: FidelityIssueKind;
  severity: 'error' | 'warning';
  detail: string;
  /** The offending snippet (trimmed) for tracing. */
  evidence: string;
  /** File where it was found, if isolable. */
  file?: string;
}

export interface ContentFidelityReport {
  /** 0..1 — 1.0 = fully faithful, no leakage. */
  score: number;
  issues: FidelityIssue[];
}

// ─── Vertical marker lexicon (DETECTION only, never generation) ───────────────
// Each entry: a vertical id -> the telltale terms that only make sense for that
// vertical. Presence of these terms in copy for a DIFFERENT vertical is leakage.
// Adding a vertical here strengthens leak detection for ALL builds; it never
// makes the engine "generate" that vertical.
interface VerticalMarkers {
  id: string;
  /** Words/phrases strongly bound to this vertical. */
  markers: string[];
  /** Prompt tokens that would legitimise these markers (the build IS this). */
  belongsWhenPromptHas: string[];
}

const VERTICAL_MARKERS: VerticalMarkers[] = [
  {
    id: 'sports-nutrition',
    markers: [
      'athlete', 'athletes', 'whey', 'protein', 'creatine', 'pre-workout', 'preworkout',
      'nutrition', 'supplement', 'supplements', 'bodybuilder', 'gym trainer', 'muscleblaze',
      'fssai', 'cutting phase', 'stack for my', 'level up your nutrition', 'fuel your ambition',
    ],
    belongsWhenPromptHas: ['supplement', 'protein', 'nutrition', 'fitness', 'gym', 'athlete', 'workout'],
  },
  {
    id: 'restaurant',
    markers: ['menu item', 'reservations', 'dine-in', 'chef', 'entrée', 'entree', 'our kitchen', 'book a table'],
    belongsWhenPromptHas: ['restaurant', 'cafe', 'coffee', 'food', 'dining', 'kitchen', 'menu', 'bakery', 'bar'],
  },
  {
    id: 'saas',
    markers: ['no credit card required', 'start your free trial', 'per seat', 'per user', 'api access', 'dashboard analytics', 'roi', 'onboard your team'],
    belongsWhenPromptHas: ['saas', 'software', 'platform', 'dashboard', 'api', 'subscription', 'app'],
  },
  {
    id: 'real-estate',
    markers: ['square footage', 'listings', 'mls', 'open house', 'sq ft', 'mortgage', 'property tour'],
    belongsWhenPromptHas: ['real estate', 'property', 'realtor', 'home', 'apartment', 'listing'],
  },
  {
    id: 'fitness-gym',
    markers: ['membership plans', 'personal trainer', 'class schedule', 'workout plan', 'reps', 'your strongest self'],
    belongsWhenPromptHas: ['gym', 'fitness', 'workout', 'training', 'yoga', 'class'],
  },
];

// Placeholder / mock person names that ship in hardcoded schemas.
const PLACEHOLDER_NAMES = [
  'alex rivera', 'jordan lee', 'sam patel', 'casey morgan', 'taylor kim',
  'john doe', 'jane doe', 'arjun s.', 'priya k.', 'vikram r.',
];

const PLACEHOLDER_TEXT = [
  'lorem ipsum', 'todo: add', 'your text here', 'sample text', 'placeholder text',
  'transformed how we work', 'incredible results from day one', 'measurable improvement from day one',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Only inspect user-facing copy files (components/pages), not config/data. */
function copyFiles(files: Array<{ path: string; content: string }>): Array<{ path: string; content: string }> {
  return files.filter(
    (f) =>
      /\.(tsx|jsx)$/.test(f.path) &&
      !/\.(test|spec)\./.test(f.path) &&
      // Icon libraries contain hundreds of svg names (chef-hat, dumbbell…) that
      // are NOT copy — never scan them for vocabulary leakage.
      !/(^|\/)(Icon|Icons|icons)\.(tsx|jsx)$/.test(f.path),
  );
}

// Copy-bearing prop names whose STRING VALUES are user-visible text.
const COPY_PROP = '(?:title|subtitle|heading|subheading|label|quote|text|description|tagline|badge|caption|name|bio|role|author)';

/**
 * Extract only USER-VISIBLE copy from a component file: JSX text nodes plus the
 * string values of known copy props. Excludes attribute NAMES (placeholder=,
 * type=), import paths, prop-type declarations, and identifiers — the sources of
 * false positives. The result is what a visitor would actually read.
 */
function visibleCopy(content: string): string {
  const parts: string[] = [];

  // 1. Values of copy props:  title="..."  subtitle={"..."}  quote:'...'
  const propAttr = new RegExp(`\\b${COPY_PROP}\\s*=\\s*(?:\\{\\s*)?["'\\\`]([^"'\\\`]{2,})["'\\\`]`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = propAttr.exec(content))) parts.push(m[1]!);

  // 2. Copy props inside object literals:  { title: "...", quote: "..." }
  const propObj = new RegExp(`\\b${COPY_PROP}\\s*:\\s*["'\\\`]([^"'\\\`]{2,})["'\\\`]`, 'gi');
  while ((m = propObj.exec(content))) parts.push(m[1]!);

  // 3. JSX text nodes:  >Some visible text<
  const jsxText = />\s*([^<>{}\n][^<>{}]*?)\s*</g;
  while ((m = jsxText.exec(content))) {
    const t = m[1]!.trim();
    if (t && !/^[\s.,;:!?/\\|+*=&-]+$/.test(t)) parts.push(t);
  }

  return parts.join('\n');
}

function promptSignals(bk: BusinessKnowledge, rawPrompt: string): string {
  const nouns = bk.vocabulary?.domainNouns ?? [];
  const terms = Object.values(bk.vocabulary?.terms ?? {});
  return `${rawPrompt} ${nouns.join(' ')} ${terms.join(' ')} ${bk.discovery?.businessType ?? ''}`.toLowerCase();
}

function contains(haystack: string, needle: string): boolean {
  return new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(haystack);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Analyse generated files for content-fidelity issues against the business.
 * `rawPrompt` is the user's original request — the ground truth for "what this
 * business is about".
 */
export function analyzeContentFidelity(
  files: Array<{ path: string; content: string }>,
  bk: BusinessKnowledge,
  rawPrompt: string,
): ContentFidelityReport {
  const issues: FidelityIssue[] = [];
  const signals = promptSignals(bk, rawPrompt);
  const comps = copyFiles(files);

  for (const f of comps) {
    const lower = visibleCopy(f.content).toLowerCase();

    // 1. Cross-domain leakage: markers from a vertical the prompt is NOT about.
    for (const v of VERTICAL_MARKERS) {
      const promptBelongs = v.belongsWhenPromptHas.some((t) => signals.includes(t));
      if (promptBelongs) continue; // legitimate — the build really is this vertical
      const hit = v.markers.find((m) => contains(lower, m));
      if (hit) {
        issues.push({
          kind: 'cross-domain-leakage',
          severity: 'error',
          detail: `"${hit}" is ${v.id} vocabulary but the requested business is not ${v.id}`,
          evidence: hit,
          file: f.path,
        });
      }
    }

    // 2. Placeholder person names.
    for (const name of PLACEHOLDER_NAMES) {
      if (contains(lower, name)) {
        issues.push({
          kind: 'placeholder-content',
          severity: 'error',
          detail: `Placeholder/mock name "${name}" present in shipped copy`,
          evidence: name,
          file: f.path,
        });
      }
    }

    // 3. Placeholder / boilerplate text.
    for (const t of PLACEHOLDER_TEXT) {
      if (lower.includes(t)) {
        issues.push({
          kind: 'boilerplate-testimonial',
          severity: 'error',
          detail: `Boilerplate/placeholder copy "${t}" present`,
          evidence: t,
          file: f.path,
        });
      }
    }
  }

  // 4. On-domain presence: at least one of the prompt's real domain nouns must
  //    appear somewhere in the copy (otherwise the copy is generic / off-domain).
  const nouns = (bk.vocabulary?.domainNouns ?? []).filter((n) => n.length >= 4);
  if (nouns.length) {
    const allCopy = comps.map((f) => visibleCopy(f.content).toLowerCase()).join('\n');
    const present = nouns.some((n) => allCopy.includes(n.toLowerCase()));
    if (!present) {
      issues.push({
        kind: 'off-domain-copy',
        severity: 'error',
        detail: `None of the business's own domain terms (${nouns.slice(0, 6).join(', ')}) appear in the copy`,
        evidence: nouns.slice(0, 6).join(', '),
      });
    }
  }

  // De-duplicate identical (kind+evidence) issues across files to keep it clean.
  const uniq = new Map<string, FidelityIssue>();
  for (const i of issues) {
    const key = `${i.kind}:${i.evidence}:${i.file ?? ''}`;
    if (!uniq.has(key)) uniq.set(key, i);
  }
  const finalIssues = [...uniq.values()];

  // Score: start at 1, subtract per error/warning, floor at 0.
  const errors = finalIssues.filter((i) => i.severity === 'error').length;
  const warnings = finalIssues.filter((i) => i.severity === 'warning').length;
  const score = Math.max(0, 1 - errors * 0.25 - warnings * 0.1);

  return { score, issues: finalIssues };
}
