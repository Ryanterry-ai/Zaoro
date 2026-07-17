/**
 * Requirements Understanding — deeply understands whatever the user gives us:
 * a free-text prompt, attached requirement documents (.txt/.md/.html), or
 * screenshots / brand images. Produces a structured `RequirementsUnderstanding`
 * that AUGMENTS (never replaces) the signal-extraction layer.
 *
 * Fidelity principle borrowed from the cloner: real content, real assets — but
 * here applied to the user's OWN material. The engine must not guess what the
 * user already told it.
 *
 * LLM model in THIS environment: the desktop agent itself (Claude / Codex /
 * OpenCode / …) — there is no hosted API key. So the deep pass is
 * AGENT-DRIVEN, not an API call:
 *  - Deterministically extract every signal we can from prompt + docs (cheerio
 *    text extraction) and register screenshots/images as visual references the
 *    agent can open.
 *  - Emit a `requirements-brief.json` artifact (machine-readable) so the desktop
 *    agent — which IS the LLM — can read it, look at the screenshots, and enrich
 *    `agentNotes` / `summary` with its own understanding. The engine consumes
 *    both the deterministic findings AND any agent-provided notes.
 *
 * This honors AGENTS.md hard rule #1 (no silent hosted-LLM call; the agent is
 * the LLM and acts deliberately on the brief).
 */
import * as fs from 'fs';
import * as path from 'path';
import { load } from 'cheerio';

export interface RequirementsUnderstanding {
  /** One-paragraph plain-language summary of what the user wants. */
  summary: string;
  /** Explicit features / pages / sections the user named. */
  features: string[];
  /** Hard constraints the user stated (budget, tech, must-have, must-not). */
  constraints: string[];
  /** Audience / positioning signals extracted from the material. */
  positioning: string[];
  /** Visual references (attached images / reference sites / og art) to honor. */
  visualReferences: { kind: string; source: string; url: string }[];
  /** Open questions the agent/engine should resolve during the build. */
  openQuestions: string[];
  /** Free-form notes the desktop agent (the LLM) adds after reading the brief. */
  agentNotes?: string;
  /** Which inputs were actually consumed (for provenance). */
  sources: string[];
  /** Whether an agent has enriched this understanding. */
  agentEnriched: boolean;
}

const KEYWORD_INTENTS: Record<string, string> = {
  noise: 'immersive-scroll / noise-cancellation positioning',
  calm: 'calm / focus emotional arc',
  silence: 'calm / focus emotional arc',
  luxury: 'luxury / premium quality signal',
  premium: 'luxury / premium quality signal',
  minimal: 'minimalist content posture',
  bold: 'bold content posture',
  storytelling: 'storytelling content posture',
  booking: 'booking interaction',
  cart: 'checkout / ecommerce conversion',
  checkout: 'checkout / ecommerce conversion',
  login: 'auth interaction',
  dashboard: 'dashboard interaction',
  configurator: 'configurator interaction',
  quiz: 'quiz interaction',
};

function mineSignals(text: string): { positioning: string[]; features: string[]; constraints: string[] } {
  const lower = text.toLowerCase();
  const positioning = new Set<string>();
  const features = new Set<string>();
  const constraints = new Set<string>();
  for (const [kw, label] of Object.entries(KEYWORD_INTENTS)) {
    if (lower.includes(kw)) positioning.add(label);
  }
  // crude feature/constraint detection: bullet / leading-verb lines
  for (const line of text.split(/\n+/)) {
    const t = line.replace(/^[\s*#\-0-9.]+/, '').trim();
    if (/^(feature|page|section|must have|include|need|show|add)/i.test(t) && t.length > 3 && t.length < 120) {
      features.add(t);
    }
    if (/^(must not|don'?t|cannot|no |avoid|constraint|limit|budget|max|required)/i.test(t) && t.length > 3 && t.length < 140) {
      constraints.add(t);
    }
  }
  return { positioning: [...positioning], features: [...features], constraints: [...constraints] };
}

function extractTextFromFile(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, 'utf-8');
  if (ext === '.html' || ext === '.htm') {
    const $ = load(raw);
    $('script, style, noscript').remove();
    return ($('body').text() || raw).replace(/\s+/g, ' ').trim().slice(0, 6000);
  }
  // .txt / .md / .markdown — strip markdown image/link syntax lightly
  return raw.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').slice(0, 6000);
}

export interface UnderstandRequirementsInput {
  prompt: string;
  referenceUrls?: string[];
  images?: string[];
  documents?: string[];
}

/**
 * Build a structured understanding of the user's requirements from ALL inputs.
 * Deterministic extraction always runs (offline-safe). Screenshots/images are
 * registered as visual references the desktop agent can open and reason about.
 * Never throws — degrades to whatever was extractable.
 */
export function understandRequirements(input: UnderstandRequirementsInput): RequirementsUnderstanding {
  const sources: string[] = ['prompt'];
  const docTexts: { name: string; text: string }[] = [];
  const visualReferences: { kind: string; source: string; url: string }[] = [];

  for (const url of input.referenceUrls ?? []) {
    visualReferences.push({ kind: 'reference-site', source: 'user-attachment', url });
    sources.push(url);
  }
  for (const img of input.images ?? []) {
    visualReferences.push({ kind: 'attached-image', source: 'user-attachment', url: img });
    sources.push(img);
  }
  for (const doc of input.documents ?? []) {
    sources.push(doc);
    try {
      docTexts.push({ name: doc, text: extractTextFromFile(doc) });
    } catch {
      // unreadable — recorded in sources only
    }
  }

  const allText = [input.prompt, ...docTexts.map((d) => d.text)].join('\n');
  const mined = mineSignals(allText);

  // Open questions: gaps the agent/engine should close (e.g. image supplied but
  // no positioning text, or prompt vague).
  const openQuestions: string[] = [];
  if ((input.images?.length ?? 0) > 0 && mined.positioning.length === 0) {
    openQuestions.push('Attached image(s) present — agent should open them to infer visual direction (mood, palette, layout).');
  }
  if (allText.replace(/\s+/g, '').length < 40) {
    openQuestions.push('Prompt is very short — confirm scope, audience, and must-have sections with the user.');
  }

  return {
    summary: allText.slice(0, 280).replace(/\s+/g, ' ').trim() || input.prompt.slice(0, 280),
    features: dedupe(mined.features),
    constraints: dedupe(mined.constraints),
    positioning: dedupe(mined.positioning),
    visualReferences,
    openQuestions,
    sources: dedupe(sources),
    agentEnriched: false,
  };
}

/** Serialize the understanding as a machine-readable brief for the agent. */
export function toRequirementsBriefJSON(u: RequirementsUnderstanding): string {
  return JSON.stringify(u, null, 2);
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim()).filter(Boolean))];
}
