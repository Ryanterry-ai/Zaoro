// ─── Evidence Collectors ──────────────────────────────────────────
// Specialized collectors for different evidence types.
// Each collector gathers evidence from a specific source type.

import {
  EvidenceItem, EvidenceSource, EvidenceCollector,
  EvidenceStore, createEvidenceItem, EVIDENCE_TTL,
} from './types.js';

// ─── Web Scraper Evidence Collector ───────────────────────────────

export class ScrapeEvidenceCollector implements EvidenceCollector {
  type = 'scrape' as const;

  async collect(url: string): Promise<EvidenceItem[]> {
    const items: EvidenceItem[] = [];

    try {
      // Dynamic import to avoid bundling Playwright when not needed
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Extract structured evidence
      const evidence = await page.evaluate(() => {
        const data: Record<string, unknown> = {};

        // Title and meta
        data.title = document.title;
        data.description = document.querySelector('meta[name="description"]')?.getAttribute('content');

        // Hero content
        const hero = document.querySelector('h1');
        data.heroText = hero?.textContent?.trim();

        // Navigation items
        const navItems = Array.from(document.querySelectorAll('nav a, header a'))
          .map(a => (a as HTMLAnchorElement).textContent?.trim())
          .filter(Boolean);
        data.navigation = navItems;

        // Key sections
        const sections = Array.from(document.querySelectorAll('section, [role="region"]'))
          .map(s => ({
            id: s.id,
            heading: s.querySelector('h2, h3')?.textContent?.trim(),
            text: s.textContent?.slice(0, 500)?.trim(),
          }));
        data.sections = sections;

        // Features/capabilities mentioned
        const featureKeywords = ['feature', 'capability', 'benefit', 'what we do', 'services'];
        const featureSections = Array.from(document.querySelectorAll('section, div'))
          .filter(el => {
            const text = el.textContent?.toLowerCase() || '';
            return featureKeywords.some(kw => text.includes(kw));
          })
          .map(el => el.textContent?.slice(0, 1000)?.trim());
        data.features = featureSections;

        // Pricing if present
        const pricingKeywords = ['price', 'pricing', 'plan', 'cost', 'tier'];
        const pricingEl = Array.from(document.querySelectorAll('*'))
          .find(el => {
            const text = el.textContent?.toLowerCase() || '';
            return pricingKeywords.some(kw => text.includes(kw)) && el.children.length > 0;
          });
        data.hasPricing = !!pricingEl;

        // Contact info
        const emailMatch = document.body.textContent?.match(/[\w.-]+@[\w.-]+\.\w+/);
        data.email = emailMatch?.[0];

        const phoneMatch = document.body.textContent?.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/);
        data.phone = phoneMatch?.[0];

        // Social links
        const socialLinks = Array.from(document.querySelectorAll('a[href*="twitter.com"], a[href*="linkedin.com"], a[href*="facebook.com"], a[href*="instagram.com"]'))
          .map(a => (a as HTMLAnchorElement).href);
        data.socialLinks = socialLinks;

        return data;
      });

      const source: EvidenceSource = {
        type: 'scrape',
        url,
        title: evidence.title as string,
        accessedAt: Date.now(),
        reliability: 'medium',
      };

      items.push(createEvidenceItem(
        'scrape',
        source,
        evidence,
        0.7,
        EVIDENCE_TTL.scrape,
        ['website', 'structure', 'content']
      ));

      await browser.close();
    } catch (err: any) {
      console.warn(`[ScrapeEvidence] Failed to collect from ${url}:`, err.message);
    }

    return items;
  }

  async validate(item: EvidenceItem): Promise<EvidenceItem> {
    const errors: string[] = [];
    const content = item.content;

    // Validate required fields
    if (!content.title) errors.push('Missing title');
    if (!content.heroText && !content.navigation) errors.push('No meaningful content extracted');

    // Update status
    item.status = errors.length === 0 ? 'validated' : 'rejected';
    item.validationErrors = errors.length > 0 ? errors : undefined;

    return item;
  }
}

// ─── Research Evidence Collector ──────────────────────────────────

export class ResearchEvidenceCollector implements EvidenceCollector {
  type = 'research' as const;

  async collect(url: string): Promise<EvidenceItem[]> {
    // Research evidence is typically added manually
    // This collector fetches and parses research articles
    const items: EvidenceItem[] = [];

    try {
      const response = await fetch(url);
      const text = await response.text();

      // Basic extraction of research content
      const content: Record<string, unknown> = {
        rawText: text.slice(0, 10000),
        wordCount: text.split(/\s+/).length,
        extractedAt: Date.now(),
      };

      const source: EvidenceSource = {
        type: 'research',
        url,
        accessedAt: Date.now(),
        reliability: 'high',
      };

      items.push(createEvidenceItem(
        'research',
        source,
        content,
        0.8,
        EVIDENCE_TTL.research,
        ['research', 'article']
      ));
    } catch (err: any) {
      console.warn(`[ResearchEvidence] Failed to collect from ${url}:`, err.message);
    }

    return items;
  }

  async validate(item: EvidenceItem): Promise<EvidenceItem> {
    const errors: string[] = [];
    const content = item.content;

    if (!content.rawText) errors.push('No content extracted');
    if ((content.wordCount as number) < 100) errors.push('Content too short');

    item.status = errors.length === 0 ? 'validated' : 'rejected';
    item.validationErrors = errors.length > 0 ? errors : undefined;

    return item;
  }
}

// ─── Citation Evidence Collector ──────────────────────────────────

export class CitationEvidenceCollector implements EvidenceCollector {
  type = 'citation' as const;

  async collect(url: string): Promise<EvidenceItem[]> {
    const items: EvidenceItem[] = [];

    try {
      const response = await fetch(url);
      const data = await response.json();

      const source: EvidenceSource = {
        type: 'citation',
        url,
        title: data.title,
        author: data.author,
        accessedAt: Date.now(),
        reliability: 'high',
      };

      items.push(createEvidenceItem(
        'citation',
        source,
        data,
        0.9,
        EVIDENCE_TTL.citation,
        ['citation', 'academic']
      ));
    } catch (err: any) {
      console.warn(`[CitationEvidence] Failed to collect from ${url}:`, err.message);
    }

    return items;
  }

  async validate(item: EvidenceItem): Promise<EvidenceItem> {
    const errors: string[] = [];
    const content = item.content;

    if (!content.title) errors.push('Missing title');

    item.status = errors.length === 0 ? 'validated' : 'rejected';
    item.validationErrors = errors.length > 0 ? errors : undefined;

    return item;
  }
}

// ─── Evidence Collector Manager ───────────────────────────────────

export class EvidenceCollectorManager {
  private collectors = new Map<string, EvidenceCollector>();
  private store: EvidenceStore;

  constructor(store: EvidenceStore) {
    this.store = store;
    this.collectors.set('scrape', new ScrapeEvidenceCollector());
    this.collectors.set('research', new ResearchEvidenceCollector());
    this.collectors.set('citation', new CitationEvidenceCollector());
  }

  /**
   * Collect evidence from a URL using the appropriate collector
   */
  async collect(type: string, url: string): Promise<EvidenceItem[]> {
    const collector = this.collectors.get(type);
    if (!collector) {
      throw new Error(`No collector for type: ${type}`);
    }

    const items = await collector.collect(url);

    // Validate and store
    for (const item of items) {
      const validated = await collector.validate(item);
      this.store.add(validated);
    }

    return items;
  }

  /**
   * Batch collect from multiple URLs
   */
  async collectBatch(
    requests: Array<{ type: string; url: string }>
  ): Promise<EvidenceItem[]> {
    const allItems: EvidenceItem[] = [];

    for (const { type, url } of requests) {
      const items = await this.collect(type, url);
      allItems.push(...items);
    }

    return allItems;
  }
}