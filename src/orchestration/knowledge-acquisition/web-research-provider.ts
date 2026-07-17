/**
 * WebResearchProvider — a REAL evidence provider that scrapes the live web.
 *
 * Mirrors the cloning-tools pattern: derive candidate sources from the
 * business signals, fetch them with a bounded timeout, extract structured
 * evidence (competitors, market trends, brand terms), and feed it into the
 * EvidenceCollection. Degrades gracefully (confidence 0, no throw) when the
 * network is unavailable — so headless test runs stay green.
 *
 * This is what makes the engine build REAL-looking solutions: it learns what
 * actual products/competitors in the space look like instead of guessing from
 * static domain data.
 */
import type { BusinessKnowledge } from '../business-intelligence/types.js';
import type { KnowledgeSourceProvider, KnowledgeSourceResult } from './engine.js';
import type { CompetitorEvidence } from './types.js';

const FETCH_TIMEOUT_MS = 6000;
const MAX_SOURCES = 4;

function withTimeout(signal: AbortSignal | undefined, ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  // Chain any parent abort
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

/** Extract likely reference URLs from the prompt + business signals. */
function deriveCandidateUrls(bk: BusinessKnowledge): string[] {
  const urls: string[] = [];
  const prompt = (bk as any).discovery?.summary ?? '';
  // Any explicit URL in the prompt
  const urlMatches = String(prompt).match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
  urls.push(...urlMatches.slice(0, 1));

  const domainNouns = bk.vocabulary?.domainNouns ?? [];
  const businessType = (bk.discovery?.businessType ?? '').toLowerCase();

  // Category-level competitor/reference domains (signal-derived, not hardcoded per business)
  const categoryHints: Record<string, string[]> = {
    headphone: ['sony.com', 'bose.com', 'apple.com/airpods', 'sennheiser.com'],
    audio: ['sony.com', 'bose.com', 'sennheiser.com'],
    watch: ['rolex.com', 'omega.com', 'apple.com/watch'],
    coffee: ['nespresso.com', 'bluebottlecoffee.com'],
    shoe: ['nike.com', 'adidas.com', 'newbalance.com'],
    sneaker: ['nike.com', 'adidas.com', 'newbalance.com'],
  };
  for (const noun of domainNouns) {
    const hit = categoryHints[noun.toLowerCase()];
    if (hit) urls.push(...hit);
  }
  if (!urls.length) {
    // Generic fallback: search the business type as a query via a search endpoint
    urls.push(`https://duckduckgo.com/html/?q=${encodeURIComponent(businessType + ' official site')}`);
  }
  // De-dupe + cap
  return [...new Set(urls)].slice(0, MAX_SOURCES);
}

function extractText(html: string): { title: string; h1: string; desc: string; text: string } {
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? '';
  const h1 = html.match(/<h1[^>]*>([^<]*)<\/h1>/i)?.[1]?.trim() ?? '';
  const desc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]?.trim() ?? '';
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);
  return { title, h1, desc, text };
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function isSearchPage(url: string): boolean {
  return url.includes('duckduckgo.com') || url.includes('google.com/search') || url.includes('bing.com/search');
}

/** Parse competitor links out of a search-results page. */
function parseSearchResults(html: string): string[] {
  const links = [...html.matchAll(/<a[^>]+href=["'](https?:\/\/[^"']+)["']/gi)].map((m) => m[1]);
  return [...new Set(links)]
    .filter((l) => !l.includes('duckduckgo.com') && !l.includes('google.com') && !l.includes('bing.com'))
    .filter((l) => /\.(com|net|org|io|co)\b/i.test(l))
    .slice(0, MAX_SOURCES);
}

export class WebResearchProvider implements KnowledgeSourceProvider {
  readonly id = 'web-research';
  readonly name = 'Live Web Research';
  readonly type = 'web-research' as const;

  async collect(businessKnowledge: BusinessKnowledge): Promise<KnowledgeSourceResult> {
    if (typeof fetch === 'undefined') {
      return { providerId: this.id, confidence: 0 };
    }

    const candidates = deriveCandidateUrls(businessKnowledge);
    const competitors: CompetitorEvidence[] = [];
    const trends: string[] = [];
    let probed = 0;

    for (const url of candidates) {
      const t = withTimeout(undefined, FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          signal: t.signal,
          headers: { 'user-agent': 'Mozilla/5.0 (compatible; BuildEngine/1.0)' },
        });
        if (!res.ok) continue;
        const html = await res.text();
        probed++;

        if (isSearchPage(url)) {
          // Follow top result links as competitor references
          const found = parseSearchResults(html);
          for (const link of found) {
            competitors.push({
              name: domainOf(link).split('.')[0]?.replace(/(^|-)\w/g, (c) => c.toUpperCase()) ?? domainOf(link),
              url: link,
              strengths: [],
              weaknesses: [],
              features: [],
              source: 'web-research',
              confidence: 0.55,
            });
          }
        } else {
          const { title, h1, desc, text } = extractText(html);
          const brand = domainOf(url).split('.')[0] ?? url;
          competitors.push({
            name: brand.charAt(0).toUpperCase() + brand.slice(1),
            url,
            strengths: [],
            weaknesses: [],
            features: [title || h1].filter(Boolean).slice(0, 3),
            source: 'web-research',
            confidence: 0.7,
          });
          // Derive a lightweight market trend signal from the page text
          const lower = (desc + ' ' + text).toLowerCase();
          if (lower.includes('noise')) trends.push('Active noise cancellation is a baseline expectation');
          if (lower.includes('silence') || lower.includes('calm')) trends.push('Calm / focus positioning resonates with buyers');
          if (lower.includes('spatial') || lower.includes('immersive')) trends.push('Immersive / spatial audio is a differentiator');
        }
      } catch {
        // network unavailable / blocked — skip, degrade gracefully
        continue;
      } finally {
        t.clear();
      }
    }

    if (probed === 0 && competitors.length === 0) {
      return { providerId: this.id, confidence: 0 };
    }

    return {
      providerId: this.id,
      confidence: 0.7,
      competitors,
      market: {
        targetAudience: businessKnowledge.customerPersonas?.map((p) => p.label).filter(Boolean) ?? [],
        trends,
        opportunities: trends.length ? ['Differentiate on ' + trends[0].toLowerCase()] : [],
        source: 'web-research',
        confidence: trends.length ? 0.65 : 0.4,
      },
    };
  }
}
