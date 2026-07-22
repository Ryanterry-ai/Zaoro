/**
 * RequirementsProvider — turns the deep-read "5 questions" into REAL copy.
 *
 * The engine's biggest content gap was falling back to generic boilerplate
 * ("We provide innovative solutions tailored to your needs…"). This provider
 * reads the answers the engine already extracted from the prompt + documents +
 * screenshots (BusinessKnowledge: discovery, RequirementsUnderstanding,
 * personas, revenue, intents) and composes SPECIFIC hero / about / cta / feature
 * copy from them.
 *
 * The 5 questions → sources:
 *   1. What do you sell?      → discovery.businessType / intent / vocabulary
 *   2. Who is it for?         → customerPersonas / positioning
 *   3. What problem is solved?→ requirementsUnderstanding.summary / positioning
 *   4. How does it earn?      → revenue / intents.conversion
 *   5. How should it feel?    → intents.emotional / content / positioning
 *
 * Priority 45: above scraped/prompt/DNA, below the Agent (LLM) provider so an
 * agent's explicit copy still wins, but generic domain-data never overrides
 * the user's own stated intent.
 */

import type { ContentProvider, ProviderContext, ContentBag } from './interfaces.js';
import type { BusinessKnowledge } from '../../orchestration/business-intelligence/types.js';
import type { ItemSpec } from '../schemas/blueprint/execution-blueprint.schema.js';

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Turn a raw prompt/summary into customer-facing prose. Strips the
 * "build me a … website that …" instruction framing so About/hero copy reads
 * like a brand statement, not a work order.
 */
function humanizeSummary(raw: string): string {
  let s = raw.trim();
  // Drop leading build-instruction verbs and the "website/site/app" framing.
  s = s.replace(
    /^(please\s+)?(build|make|create|design|develop|generate|give me|i want|i need)\s+(me\s+)?(a|an|the)?\s*/i,
    '',
  );
  s = s.replace(
    /^(futuristic|modern|beautiful|premium|stunning|sleek)?\s*(website|site|web ?app|app|landing page|page)\s+(that|where|which|to)\s+/i,
    '',
  );
  s = s.trim();
  if (!s) return raw.trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Best available business name. */
function businessName(bk: BusinessKnowledge, fallback: string): string {
  const bt = bk.discovery?.businessType?.trim();
  if (bt && bt.length > 1) {
    // Filter out generic platform/system/tool terms that the discovery engine
    // incorrectly emits instead of the actual business name (e.g. "studio
    // Course Platform" for a yoga studio). These don't describe the business.
    const lower = bt.toLowerCase();
    const genericPatterns = /\b(platform|system|tool|software|app|website|site|solution|service|course platform|studio course|retail store|online store|online shop|specialty|specialty\s+\w+\s+retail)\b/i;
    if (!genericPatterns.test(lower)) return titleCase(bt);
    // If businessType is generic, try to extract a short brand-like token
    // (e.g. "Specialty Aura Retail Store" → "Aura")
    const brandMatch = bt.match(/\b([A-Z][a-z]{2,15})\b/);
    if (brandMatch && brandMatch[1].length > 2) return brandMatch[1];
  }
  return fallback;
}

/** What the business sells, phrased naturally. */
function whatPhrase(bk: BusinessKnowledge): string {
  const intent = bk.discovery?.intent?.trim();
  if (intent && intent.length > 8) return intent.replace(/\.$/, '');
  const type = bk.discovery?.businessType?.trim();
  if (type) return type;
  return bk.discovery?.domain ?? 'what matters';
}

/** Who it is for, from personas / positioning. */
function whoPhrase(bk: BusinessKnowledge): string | undefined {
  const persona = bk.customerPersonas?.[0]?.label?.trim();
  if (persona) return persona;
  const pos = bk.requirementsUnderstanding?.positioning ?? [];
  const audience = pos.find((p) => /audience|for |people|customer|buyer/i.test(p));
  return audience;
}

/** The emotional feel, from intents. */
function feelPhrase(bk: BusinessKnowledge): string | undefined {
  const emo = bk.intents?.emotional ?? [];
  const content = bk.intents?.content ?? [];
  const words = [...emo, ...content].filter(Boolean);
  return words.length ? words.join(', ') : undefined;
}

export class RequirementsProvider implements ContentProvider {
  readonly name = 'requirements';
  readonly priority = 45;

  canProvide(ctx: ProviderContext): boolean {
    const bk = ctx.businessKnowledge;
    return !!(bk && (bk.discovery || bk.requirementsUnderstanding || bk.intents));
  }

  provide(ctx: ProviderContext): ContentBag {
    const bk = ctx.businessKnowledge!;
    const name = ctx.appName || businessName(bk, ctx.blueprint.name ?? 'Us');
    const what = whatPhrase(bk);
    const who = whoPhrase(bk);
    const feel = feelPhrase(bk);
    const req = bk.requirementsUnderstanding;

    const bag: ContentBag = {};

    // ── Hero ────────────────────────────────────────────────────────────────
    // Title = the intent line if it reads like a headline, else the brand name.
    const humanSummary = req?.summary ? humanizeSummary(req.summary) : '';
    const heroTitle =
      humanSummary && humanSummary.length < 70 && !ctx.appName
        ? humanSummary.replace(/\.$/, '')
        : name;
    const subtitleParts: string[] = [];
    if (what) subtitleParts.push(titleCase(what.charAt(0)) + what.slice(1));
    if (who) subtitleParts.push(`Made for ${who.toLowerCase()}`);
    if (feel) subtitleParts.push(`Designed to feel ${feel}`);
    const heroSubtitle = subtitleParts.join('. ') + (subtitleParts.length ? '.' : '');
    if (heroSubtitle.trim()) {
      bag.hero = { title: heroTitle, ...(heroSubtitle.trim() ? { subtitle: heroSubtitle } : {}) };
    }

    // ── About ─────────────────────────────────────────────────────────────
    // Built from the deep-read summary + positioning — never boilerplate.
    const aboutBits: string[] = [];
    if (req?.summary) aboutBits.push(humanizeSummary(req.summary));
    const posLines = (req?.positioning ?? []).slice(0, 3);
    if (posLines.length) aboutBits.push(posLines.join('. ') + '.');
    if (aboutBits.length) {
      bag.about = { title: `About ${name}`, description: aboutBits.join(' ') };
    }

    // ── Features ───────────────────────────────────────────────────────────
    // Use explicitly named features/sections from the user's own material.
    const namedFeatures = (req?.features ?? []).slice(0, 6);
    if (namedFeatures.length >= 2) {
      const items: ItemSpec[] = namedFeatures.map((f) => ({
        title: titleCase(f.split(/[.:]/)[0].slice(0, 48)),
        description: f.length > 50 ? f : `${f} — built to your requirement.`,
      })) as ItemSpec[];
      bag.features = { title: `What you get`, items };
    }

    // ── CTA ────────────────────────────────────────────────────────────────
    // Anchored on the real value + feel, not "Get started today".
    if (what || feel) {
      const ctaTitle = feel
        ? `Experience ${name} — ${feel}`
        : `Start with ${name}`;
      const ctaSub = who
        ? `Built for ${who.toLowerCase()}. ${what ? titleCase(what.charAt(0)) + what.slice(1) + '.' : ''}`.trim()
        : (what ? titleCase(what.charAt(0)) + what.slice(1) + '.' : '');
      bag.cta = { title: ctaTitle, ...(ctaSub ? { subtitle: ctaSub } : {}) };
    }

    return bag;
  }
}
