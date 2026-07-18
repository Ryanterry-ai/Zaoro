// ─── Autonomous Verification Loop (Phase 15 / self-improving engine) ─────────
//
// Runs AFTER code generation (and after self-healing) to enforce the
// "faithful, hyper-real, revenue-driving" bar. It inspects the generated
// output against the BusinessKnowledge intents and reports GAPS:
//
//   - business-content : are the business's entities / offers present?
//   - interaction      : are the requested interaction primitives realised?
//   - motion           : is the requested motion language present?
//   - conversion       : is the conversion path (checkout / lead / subscribe) present?
//   - assets           : are images / media referenced (not placeholder)?
//   - accessibility    : alt text, aria, semantic landmarks, labels?
//   - performance      : heavy deps / huge inline blobs / missing lazy?
//   - ssr              : 'use client' / window-at-module / dynamic import guards?
//   - fidelity         : does the output reflect the emotional arc / brand feel?
//
// Each gap carries a `repair` action the orchestrator can execute:
//   'regenerate'      → re-run the relevant engine with enriched context
//   'acquire-evidence'→ fetch real assets / copy from a knowledge source
//   'patch'           → targeted code fix
//
// The loop is deterministic and signal-driven: it reads BusinessKnowledge
// intents, NEVER an industry label.

import type { BusinessKnowledge, BusinessIntents } from '../business-intelligence/types.js';
import { analyzeContentFidelity } from './content-fidelity.js';
import { analyzeExperienceFidelity } from './experience-fidelity.js';

export type GapCategory =
  | 'business-content'
  | 'interaction'
  | 'motion'
  | 'conversion'
  | 'assets'
  | 'accessibility'
  | 'performance'
  | 'ssr'
  | 'fidelity'
  | 'content-fidelity'
  | 'experience-fidelity';

export type RepairAction = 'regenerate' | 'acquire-evidence' | 'patch' | 'none';

export interface VerificationGap {
  category: GapCategory;
  severity: 'error' | 'warning';
  detail: string;
  /** What to do about it */
  repair: RepairAction;
  /** Which engine/artifact to re-run (for 'regenerate') */
  target?: string;
}

export interface VerificationReport {
  /** True when zero error-severity gaps remain */
  passed: boolean;
  score: number; // 0..1 coverage of required signals
  gaps: VerificationGap[];
  /** Present-signal checklist, for transparency / tracing */
  signals: {
    businessContent: boolean;
    interaction: boolean;
    motion: boolean;
    conversion: boolean;
    assets: boolean;
    accessibility: boolean;
    performance: boolean;
    ssr: boolean;
    fidelity: boolean;
    contentFidelity: boolean;
    experienceFidelity: boolean;
  };
  /** Per-dimension confidence scores (0..1), for production-readiness gating. */
  dimensions?: {
    contentFidelity: number;
    experienceFidelity: number;
  };
}

export interface VerificationInput {
  /** Generated file contents keyed by path */
  files: Array<{ path: string; content: string }>;
  businessKnowledge: BusinessKnowledge;
  /** The user's original request — ground truth for content fidelity checks. */
  rawPrompt?: string;
}

// ─── Heuristic inspectors (all regex over generated source) ──────────────────

function allContent(files: Array<{ path: string; content: string }>): string {
  return files.map((f) => f.content).join('\n');
}

function hasInteractionPrimitive(files: { path: string; content: string }[], primitive: string): boolean {
  // A primitive is only "realised" when it is actually DEFINED somewhere — a
  // dangling import or JSX usage of a component whose file was never emitted is
  // a broken reference, not a realised interaction. Require a real definition:
  //   - a component/function/const declaration named after the primitive, OR
  //   - a dedicated file whose name is the primitive (default-exported component).
  const declRe = new RegExp(
    `(function|const|class)\\s+${primitive}\\b|export\\s+default\\s+function\\s+${primitive}\\b`,
  );
  const fileRe = new RegExp(`(^|/)${primitive}\\.(tsx|jsx)$`);
  return files.some((f) => declRe.test(f.content) || fileRe.test(f.path));
}

/**
 * Run the verification loop over generated output.
 * Returns a report; the orchestrator decides whether to repair+rerun.
 */
export function verifyBuild(input: VerificationInput): VerificationReport {
  const { files, businessKnowledge } = input;
  const content = allContent(files);
  // Source-only view (components/pages) — excludes framework config and data
  // files whose allowlists/boilerplate would cause false positives (e.g. a
  // next.config image remotePatterns entry for a placeholder host).
  const sourceContent = allContent(
    files.filter(
      (f) =>
        /\.(tsx|jsx)$/.test(f.path) &&
        !/\.(test|spec)\./.test(f.path) &&
        !/(^|\/)(next\.config|tailwind\.config|vite\.config|\.eslintrc)/.test(f.path),
    ),
  );
  const intents: BusinessIntents = businessKnowledge.intents;
  const gaps: VerificationGap[] = [];

  // ── 1. Business content ──
  const entityNouns = businessKnowledge.vocabulary.domainNouns;
  const entitiesPresent = entityNouns.length === 0
    ? true
    : entityNouns.some((n) => content.toLowerCase().includes(n.toLowerCase()));
  const hasRealCopy = content.length > 800 && !/lorem ipsum|placeholder text|TODO: add content/i.test(content);
  const businessContent = entitiesPresent && hasRealCopy;
  if (!entitiesPresent) {
    gaps.push({
      category: 'business-content',
      severity: 'error',
      detail: `Business entities not reflected in output: ${entityNouns.join(', ') || '(none detected)'}`,
      repair: 'regenerate',
      target: 'content-intelligence',
    });
  } else if (!hasRealCopy) {
    gaps.push({
      category: 'business-content',
      severity: 'warning',
      detail: 'Output looks thin / placeholder copy detected',
      repair: 'regenerate',
      target: 'content-intelligence',
    });
  }

  // ── 2. Interaction primitives ──
  const interactionMap: Record<string, string> = {
    configurator: 'Configurator',
    builder: 'BuilderCanvas',
    booking: 'BookingCalendar',
    calculator: 'Calculator',
    quiz: 'Quiz',
    dashboard: 'Dashboard',
    hud: 'HudOverlay',
    'scroll-narrative': 'ScrollNarrative',
  };
  const requestedInteractions = intents.interaction;
  let interactionOk = true;
  for (const i of requestedInteractions) {
    const primitive = interactionMap[i];
    if (primitive && !hasInteractionPrimitive(files, primitive)) {
      interactionOk = false;
      gaps.push({
        category: 'interaction',
        severity: 'error',
        detail: `Requested interaction "${i}" not realised (missing ${primitive})`,
        repair: 'regenerate',
        target: 'experience-intelligence',
      });
    }
  }

  // ── 3. Motion language ──
  const motionOk = intents.motion.every((m) => {
    if (m === 'scroll-driven') return /scroll|intersectionobserver|whilinview|useinview|onScroll/i.test(content);
    if (m === 'cinematic') return /(framer-motion|transition|keyframes|animate)/i.test(content);
    if (m === 'calm') return /(ease|transition|motion-reduce)/i.test(content);
    return true;
  });
  if (!motionOk) {
    gaps.push({
      category: 'motion',
      severity: 'warning',
      detail: `Requested motion language not detected: ${intents.motion.join(', ')}`,
      repair: 'regenerate',
      target: 'experience-intelligence',
    });
  }

  // ── 4. Conversion path ──
  const conversionOk = intents.conversion.every((c) => {
    if (c === 'checkout') return /(checkout|cart|add to cart|buy now)/i.test(content);
    if (c === 'lead-form') return /(contact|get in touch|lead|inquiry|form)/i.test(content);
    if (c === 'subscribe') return /(subscribe|sign up|newsletter|join)/i.test(content);
    if (c === 'book') return /(booking|reserve|appointment|schedule)/i.test(content);
    if (c === 'donate') return /(donate|donation|support)/i.test(content);
    return true;
  });
  if (!conversionOk) {
    gaps.push({
      category: 'conversion',
      severity: 'error',
      detail: `Conversion path missing for: ${intents.conversion.join(', ')}`,
      repair: 'regenerate',
      target: 'content-intelligence',
    });
  }

  // ── 5. Assets (real, not placeholder) ──
  const usesPlaceholderImg = /(placeholder\.(com|io)|via\.placeholder|dummyimage|example\.com\/(image|img))/i.test(sourceContent);
  const hasImgRef = /(src=|background-image|<img|\.png|\.jpg|\.webp|\.svg|next\/image)/i.test(sourceContent);
  const assets = hasImgRef && !usesPlaceholderImg;
  if (usesPlaceholderImg) {
    gaps.push({
      category: 'assets',
      severity: 'warning',
      detail: 'Placeholder image service detected — acquire real brand assets',
      repair: 'acquire-evidence',
      target: 'knowledge-acquisition',
    });
  } else if (!hasImgRef) {
    gaps.push({
      category: 'assets',
      severity: 'warning',
      detail: 'No image / media references found',
      repair: 'acquire-evidence',
      target: 'knowledge-acquisition',
    });
  }

  // ── 6. Accessibility ──
  const a11yOk = /(alt=|aria-|role=|label=|htmlfor|htmlFor)/i.test(content);
  const landmarks = /(<header|<nav|<main|<footer|<section)/i.test(content);
  const accessibility = a11yOk && landmarks;
  if (!accessibility) {
    gaps.push({
      category: 'accessibility',
      severity: 'warning',
      detail: 'Missing accessibility primitives (alt/aria/landmarks)',
      repair: 'patch',
      target: 'renderer',
    });
  }

  // ── 7. Performance ──
  // Heavy libs are fine when code-split (dynamic/lazy/Suspense) OR when confined
  // to a client component ('use client') — the bundler already splits client
  // components and they never load the heavy lib during SSR.
  const heavyDeps = /(three\.js|@react-three|gsap|d3\.js|chart\.js)/i.test(sourceContent);
  const splitOrClient = /(dynamic\(|lazy\(|Suspense|next\/dynamic|['"]use client['"])/i.test(sourceContent);
  const perfConcern = heavyDeps && !splitOrClient;
  const performance = !perfConcern;
  if (perfConcern) {
    gaps.push({
      category: 'performance',
      severity: 'warning',
      detail: 'Heavy dependency without lazy/dynamic import — SSR/bundle risk',
      repair: 'patch',
      target: 'renderer',
    });
  }

  // ── 8. SSR compatibility ──
  const preEffect = content.includes('useEffect') ? content.split('useEffect')[0]! : content;
  const ssrSafe = !/(window\s*\.|document\s*\.|localStorage|navigator\.)/i.test(preEffect);
  const ssr = ssrSafe || /('use client'|dynamic\([^)]*ssr:\s*false)/i.test(content);
  if (!ssr) {
    gaps.push({
      category: 'ssr',
      severity: 'warning',
      detail: 'Browser globals used at module scope — wrap in effect or guard SSR',
      repair: 'patch',
      target: 'renderer',
    });
  }

  // ── 9. Fidelity (emotional arc reflected) ──
  const emotional = intents.emotional;
  const fidelity = emotional.length === 0
    ? true
    : emotional.some((e) => {
        if (e === 'chaos-to-calm') return /(calm|silence|serene|quiet)/i.test(content);
        if (e === 'luxury') return /(luxury|premium|exclusive|elegant)/i.test(content);
        if (e === 'excitement') return /(exciting|thrill|unforgettable|epic)/i.test(content);
        if (e === 'trust') return /(trust|reliable|secure|safe)/i.test(content);
        if (e === 'serenity') return /(serenity|serene|peaceful|tranquil|calm|zen)/i.test(content);
        return true;
      });
  if (!fidelity) {
    gaps.push({
      category: 'fidelity',
      severity: 'warning',
      detail: `Emotional intent not reflected in copy/UI: ${emotional.join(', ')}`,
      repair: 'regenerate',
      target: 'content-intelligence',
    });
  }

  // ── 10. Content fidelity (no cross-domain leakage / placeholders) ──
  const cf = analyzeContentFidelity(files, businessKnowledge, input.rawPrompt ?? '');
  const contentFidelity = cf.issues.filter((i) => i.severity === 'error').length === 0;
  for (const issue of cf.issues) {
    gaps.push({
      category: 'content-fidelity',
      severity: issue.severity,
      detail: `${issue.kind}: ${issue.detail}`,
      repair: 'regenerate',
      target: 'content-intelligence',
    });
  }

  // ── 11. Experience fidelity (motion / visual / conversion / emotional arc) ──
  // The experience must FEEL and BEHAVE as requested, not merely read correctly.
  const xf = analyzeExperienceFidelity(files, businessKnowledge);
  const experienceFidelity = xf.issues.filter((i) => i.severity === 'error').length === 0;
  for (const issue of xf.issues) {
    gaps.push({
      category: 'experience-fidelity',
      severity: issue.severity,
      detail: `${issue.kind}: ${issue.detail}`,
      repair: 'regenerate',
      target: 'experience-intelligence',
    });
  }

  const signals = {
    businessContent,
    interaction: requestedInteractions.length === 0 ? true : interactionOk,
    motion: motionOk,
    conversion: conversionOk,
    assets,
    accessibility,
    performance,
    ssr,
    fidelity,
    contentFidelity,
    experienceFidelity,
  };

  const checks = Object.values(signals);
  const score = checks.filter(Boolean).length / checks.length;
  const passed = gaps.filter((g) => g.severity === 'error').length === 0;

  return {
    passed,
    score,
    gaps,
    signals,
    dimensions: { contentFidelity: cf.score, experienceFidelity: xf.score },
  };
}

/**
 * Iterate the verification loop until it passes or maxIterations reached.
 * `repair` is the caller-supplied function that executes a gap's repair action
 * (re-run engine / acquire evidence / patch) and returns the new files.
 * Deterministic: bounded by maxIterations.
 */
export async function runVerificationLoop(
  input: VerificationInput,
  repair: (gap: VerificationGap, current: VerificationInput) => Promise<VerificationInput>,
  maxIterations = 3,
): Promise<{ report: VerificationReport; iterations: number; finalInput: VerificationInput }> {
  let current = input;
  let report = verifyBuild(current);
  let iterations = 0;

  // Track which gaps we've already attempted to avoid infinite loops on a gap
  // whose repair is a no-op for the current output.
  const attempted = new Set<string>();
  // Key on the concrete gap identity, not just category:repair. A single
  // category (e.g. "interaction") can carry several distinct, independently
  // repairable gaps (missing BookingCalendar AND missing Calculator); keying on
  // category alone would fix one and permanently skip the rest. The detail
  // string uniquely identifies the specific missing primitive / target.
  const gapKey = (g: VerificationGap): string => `${g.category}:${g.repair}:${g.detail}`;

  // Phase 1: clear all ERROR-severity gaps (blocking) first.
  while (!report.passed && iterations < maxIterations) {
    const blocking = report.gaps.find((g) => g.severity === 'error');
    if (!blocking || blocking.repair === 'none' || attempted.has(gapKey(blocking))) break;
    attempted.add(gapKey(blocking));
    current = await repair(blocking, current);
    report = verifyBuild(current);
    iterations++;
  }

  // Phase 2: drive down remaining WARNING-severity gaps that have an actionable
  // repair, within the remaining iteration budget. "All gaps removed" bar.
  while (iterations < maxIterations) {
    const fixable = report.gaps.find(
      (g) => g.severity === 'warning' && g.repair !== 'none' && !attempted.has(gapKey(g)),
    );
    if (!fixable) break;
    attempted.add(gapKey(fixable));
    const next = await repair(fixable, current);
    const nextReport = verifyBuild(next);
    // Only accept the repair if it did not regress (fewer or equal gaps).
    if (nextReport.gaps.length <= report.gaps.length) {
      current = next;
      report = nextReport;
    }
    iterations++;
  }

  return { report, iterations, finalInput: current };
}
