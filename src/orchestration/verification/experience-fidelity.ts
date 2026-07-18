// ─── Experience Fidelity Engine ──────────────────────────────────────────────
//
// Verifies that the GENERATED EXPERIENCE faithfully realises the requested
// feeling and behaviour — not just the words (that is Content Fidelity), but the
// VISUAL LANGUAGE, MOTION, CONVERSION prominence, and EMOTIONAL ARC.
//
// A build can have perfect on-domain copy yet still betray the brief: a luxury
// jewellery prompt asking for "immersive, cinematic, slow-reveal, exclusive"
// that ships a flat utilitarian grid with no motion and no clear conversion is
// experience-INFIDELITY even though every word says "jewellery".
//
// Design rules (AGENTS.md):
//   - No `if industry === X`. We never branch on the build's vertical.
//   - We reason ONLY over orthogonal experience signals already resolved into
//     BusinessKnowledge (intents.motion / .emotional / .experience / .conversion,
//     experienceGoals, designStrategy, vocabulary.tone). These are derived from
//     the prompt for ANY business; only the values differ.
//   - Deterministic, no LLM. Pure analysis. The loop consumes findings; the
//     repair-executor realises missing experience affordances from the same
//     signals.

import type { BusinessKnowledge } from '../business-intelligence/types.js';

export type ExperienceIssueKind =
  | 'motion-absent'
  | 'visual-language-mismatch'
  | 'conversion-not-prominent'
  | 'emotional-arc-missing'
  | 'interaction-density-mismatch';

export interface ExperienceIssue {
  kind: ExperienceIssueKind;
  severity: 'error' | 'warning';
  detail: string;
  /** The signal that was requested but not realised. */
  expected: string;
  file?: string;
}

export interface ExperienceFidelityReport {
  /** 0..1 — 1.0 = the experience fully realises the requested feel/behaviour. */
  score: number;
  issues: ExperienceIssue[];
  /** Per-dimension pass flags, for transparency / tracing. */
  dimensions: {
    motion: boolean;
    visual: boolean;
    conversion: boolean;
    emotional: boolean;
    density: boolean;
  };
}

// ─── Signal → evidence lexicons (DETECTION only, never generation) ────────────
//
// For each requested experience signal we describe the CODE-LEVEL evidence that
// proves it was realised. This is a mapping from an abstract intent to concrete
// implementation traces — not a vertical template. Any business that requests
// "cinematic motion" needs the same evidence regardless of what it sells.

/** Motion intent → regexes that prove the motion language exists in code. */
const MOTION_EVIDENCE: Record<string, RegExp> = {
  'scroll-driven': /(useScroll|useInView|whileInView|IntersectionObserver|onScroll|scrollYProgress|ScrollTrigger)/i,
  cinematic: /(framer-motion|motion\.[a-z]|AnimatePresence|@keyframes|transition:|animate=)/i,
  calm: /(ease-in-out|duration-\d{3,}|transition-all|motion-reduce|ease:\s*['"])/i,
  energetic: /(spring|stagger|bounce|whileHover|whileTap|delay:\s*0?\.\d)/i,
  'slow-reveal': /(whileInView|opacity-0|translate-y|fade|reveal|useInView)/i,
};

/**
 * Emotional arc → copy/UI evidence lexicon. Presence of ANY term for a requested
 * emotion is enough; absence of ALL terms is an unmet arc.
 */
const EMOTION_EVIDENCE: Record<string, string[]> = {
  'chaos-to-calm': ['calm', 'silence', 'serene', 'quiet', 'stillness'],
  luxury: ['luxury', 'premium', 'exclusive', 'elegant', 'exquisite', 'timeless', 'refined', 'bespoke'],
  excitement: ['exciting', 'thrill', 'unforgettable', 'epic', 'electric', 'bold'],
  trust: ['trust', 'trusted', 'reliable', 'secure', 'certified', 'authentic', 'guarantee'],
  serenity: ['serenity', 'serene', 'peaceful', 'tranquil', 'calm', 'zen', 'gentle'],
  aspiration: ['aspire', 'dream', 'elevate', 'journey', 'crafted', 'heritage'],
  warmth: ['welcome', 'warm', 'friendly', 'care', 'together', 'community'],
};

/**
 * Visual-language direction → CSS/style evidence. The Design Strategy resolves a
 * `direction` (e.g. "editorial minimal", "immersive dark", "warm luxury"); we
 * check the styles carry the matching visual traits. Directions are matched by
 * keyword so new directions need no code change here.
 */
const VISUAL_TRAITS: Array<{ when: RegExp; evidence: RegExp; label: string }> = [
  { when: /minimal|editorial|clean|whitespace/i, evidence: /(space-y-\d{2}|py-2\d|gap-1\d|max-w-|leading-relaxed|tracking-)/i, label: 'generous whitespace / editorial spacing' },
  { when: /luxury|premium|elegant|refined/i, evidence: /(serif|font-serif|tracking-wide|uppercase|gold|champagne|ivory|#[a-f0-9]{6})/i, label: 'refined typography / premium palette' },
  { when: /immersive|cinematic|dark/i, evidence: /(bg-black|bg-neutral-9|bg-\[#0|from-black|backdrop-blur|full-screen|min-h-screen|h-screen)/i, label: 'immersive full-bleed / dark canvas' },
  { when: /bold|vibrant|energetic/i, evidence: /(text-\dxl|text-\d{2}xl|font-black|font-extrabold|gradient|saturate)/i, label: 'bold scale / vivid accents' },
  { when: /warm|organic|natural/i, evidence: /(amber|orange|rounded-2xl|rounded-3xl|#[a-f0-9]{6})/i, label: 'warm palette / soft radii' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function componentFiles(files: Array<{ path: string; content: string }>): Array<{ path: string; content: string }> {
  return files.filter(
    (f) =>
      /\.(tsx|jsx|css)$/.test(f.path) &&
      !/\.(test|spec)\./.test(f.path) &&
      !/(^|\/)(next\.config|tailwind\.config|vite\.config)/.test(f.path),
  );
}

/** Requested experience signals, de-duplicated, drawn from every signal source. */
function requestedMotion(bk: BusinessKnowledge): string[] {
  return [...new Set([...(bk.intents?.motion ?? []), ...(bk.experienceGoals?.motionLanguage ?? [])])];
}

function requestedEmotions(bk: BusinessKnowledge): string[] {
  return [...new Set([...(bk.intents?.emotional ?? []), ...(bk.experienceGoals?.arc ?? [])])];
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Analyse generated files for experience-fidelity issues against the business's
 * resolved experience signals. Deterministic; no vertical branching.
 */
export function analyzeExperienceFidelity(
  files: Array<{ path: string; content: string }>,
  bk: BusinessKnowledge,
): ExperienceFidelityReport {
  const issues: ExperienceIssue[] = [];
  const comps = componentFiles(files);
  const all = comps.map((f) => f.content).join('\n');
  const allLower = all.toLowerCase();

  // ── Dimension 1: Motion ──────────────────────────────────────────────────
  // Every requested motion language must have real code evidence. A brief that
  // asks for cinematic / scroll-driven motion but ships static markup is an
  // experience betrayal — treated as blocking.
  const motions = requestedMotion(bk);
  let motionOk = true;
  for (const m of motions) {
    const re = MOTION_EVIDENCE[m];
    if (!re) continue; // unknown motion token — nothing to assert
    if (!re.test(all)) {
      motionOk = false;
      issues.push({
        kind: 'motion-absent',
        severity: 'error',
        detail: `Requested "${m}" motion has no implementation evidence in the generated code`,
        expected: m,
      });
    }
  }

  // ── Dimension 2: Visual language ──────────────────────────────────────────
  // The resolved design direction must be visible in the styles. Mismatch is a
  // warning (copy can be right while polish lags) — surfaced so repair can push
  // the visual traits the direction demands.
  const direction = bk.designStrategy?.direction ?? '';
  const emphasis = (bk.designStrategy?.emphasis ?? []).join(' ');
  const visualIntent = `${direction} ${emphasis} ${(bk.vocabulary?.tone ?? []).join(' ')}`;
  let visualOk = true;
  const applicable = VISUAL_TRAITS.filter((t) => t.when.test(visualIntent));
  for (const trait of applicable) {
    if (!trait.evidence.test(all)) {
      visualOk = false;
      issues.push({
        kind: 'visual-language-mismatch',
        severity: 'warning',
        detail: `Design direction "${direction || visualIntent.trim()}" expects ${trait.label}, but the styles do not show it`,
        expected: trait.label,
      });
    }
  }
  // If a direction was resolved but NONE of its traits are applicable/known, we
  // do not penalise — absence of a rule is not a failure.
  if (applicable.length === 0) visualOk = true;

  // ── Dimension 3: Conversion prominence ────────────────────────────────────
  // A conversion path must not only EXIST (loop checks that) — its primary CTA
  // must be PROMINENT (a real button/link with action styling), otherwise the
  // revenue intent is not realised. We look for an actionable, styled CTA.
  const wantsConversion = (bk.intents?.conversion ?? []).length > 0;
  let conversionOk = true;
  if (wantsConversion) {
    // Actionable = a link/handler CTA, OR a form (a submit is a real action).
    const actionable =
      /(href=|onClick=|action=|to=|type=["']submit)/i.test(all) ||
      /<form\b/i.test(all);
    const ctaSurface = /(button|btn|cta|<a\b|<form\b|role=["']button)/i.test(all);
    const ctaVerb =
      /(shop|buy|add to cart|checkout|book|reserve|subscribe|get started|get in touch|contact|enquire|inquire|order|discover|explore|sign up|join|request)/i.test(allLower);
    const hasActionableCta = actionable && ctaSurface && ctaVerb;
    if (!hasActionableCta) {
      conversionOk = false;
      issues.push({
        kind: 'conversion-not-prominent',
        severity: 'error',
        detail: `Conversion intent (${bk.intents!.conversion.join(', ')}) present but no prominent, actionable CTA found`,
        expected: bk.intents!.conversion.join(', '),
      });
    }
  }

  // ── Dimension 4: Emotional arc ────────────────────────────────────────────
  // Each requested emotion must be evidenced somewhere in copy/UI. Missing ALL
  // evidence for a requested emotion is a blocking arc failure.
  const emotions = requestedEmotions(bk);
  let emotionalOk = true;
  for (const e of emotions) {
    const terms = EMOTION_EVIDENCE[e];
    if (!terms) continue; // unknown emotion token — nothing to assert
    const present = terms.some((t) => allLower.includes(t));
    if (!present) {
      emotionalOk = false;
      issues.push({
        kind: 'emotional-arc-missing',
        severity: 'error',
        detail: `Requested emotional arc "${e}" is not reflected anywhere in copy or UI`,
        expected: e,
      });
    }
  }

  // ── Dimension 5: Interaction density ──────────────────────────────────────
  // The requested interaction density (calm / moderate / energetic) should match
  // the amount of motion/interaction affordance in the output. A gross mismatch
  // (energetic requested, zero interactive/motion evidence) is a warning.
  const density = bk.experienceGoals?.interactionDensity ?? 'moderate';
  let densityOk = true;
  const interactiveEvidence = /(whileHover|onClick|useState|motion\.|transition|animate|hover:)/i.test(all);
  if (density === 'energetic' && !interactiveEvidence) {
    densityOk = false;
    issues.push({
      kind: 'interaction-density-mismatch',
      severity: 'warning',
      detail: 'Energetic interaction density requested but the UI shows little interactive/motion affordance',
      expected: 'energetic',
    });
  }

  // De-duplicate identical (kind+expected) issues.
  const uniq = new Map<string, ExperienceIssue>();
  for (const i of issues) {
    const key = `${i.kind}:${i.expected}`;
    if (!uniq.has(key)) uniq.set(key, i);
  }
  const finalIssues = [...uniq.values()];

  const errors = finalIssues.filter((i) => i.severity === 'error').length;
  const warnings = finalIssues.filter((i) => i.severity === 'warning').length;
  const score = Math.max(0, 1 - errors * 0.25 - warnings * 0.1);

  return {
    score,
    issues: finalIssues,
    dimensions: { motion: motionOk, visual: visualOk, conversion: conversionOk, emotional: emotionalOk, density: densityOk },
  };
}
