// ─── Layout Detector ─────────────────────────────────────────────
// Extracts section structure from pages and compares layout
// between original and clone to verify structural fidelity.

import type { Page } from 'playwright';

export interface DetectedSection {
  type: string;           // hero, features, pricing, testimonials, stats, cta, footer, header, nav, other
  selector: string;       // CSS selector used to find it
  order: number;          // position in page (0-indexed)
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    bottom: number;
  };
  textPreview: string;    // first 150 chars of text content
  childCount: number;     // number of direct children
  hasImages: boolean;
  hasButtons: boolean;
  hasLinks: boolean;
  bgColor: string;        // computed background color
  sectionId: string;      // id attribute if present
  sectionClass: string;   // class attribute (abbreviated)
}

export interface LayoutComparison {
  originalSections: DetectedSection[];
  cloneSections: DetectedSection[];
  sectionOrderMatch: boolean;
  missingInClone: string[];       // sections present in original but missing in clone
  extraInClone: string[];         // sections in clone but not in original
  orderDifferences: Array<{
    section: string;
    originalOrder: number;
    cloneOrder: number;
  }>;
  structuralSimilarity: number;   // 0-100
  issues: string[];
}

// Section detection rules — ordered by priority
const SECTION_RULES: Array<{ type: string; selectors: string[] }> = [
  {
    type: 'header',
    selectors: ['header', '[role="banner"]', '.header', '#header'],
  },
  {
    type: 'nav',
    selectors: ['nav', '[role="navigation"]', '.navbar', '#nav'],
  },
  {
    type: 'hero',
    selectors: [
      '[class*="hero"]', '[class*="Hero"]',
      '[class*="banner"]', '[class*="Banner"]',
      'main > section:first-child',
      'main > div:first-child > div:first-child',
      'section:first-of-type',
    ],
  },
  {
    type: 'features',
    selectors: [
      '[class*="feature"]', '[class*="Feature"]',
      '[class*="services"]', '[class*="Services"]',
      '[id*="feature"]', '[id*="services"]',
    ],
  },
  {
    type: 'stats',
    selectors: [
      '[class*="stat"]', '[class*="Stat"]',
      '[class*="metric"]', '[class*="Metric"]',
      '[class*="counter"]', '[class*="Counter"]',
      '[class*="number"]',
    ],
  },
  {
    type: 'pricing',
    selectors: [
      '[class*="pricing"]', '[class*="Pricing"]',
      '[id*="pricing"]',
      '[class*="plan"]', '[class*="Plan"]',
    ],
  },
  {
    type: 'testimonials',
    selectors: [
      '[class*="testimonial"]', '[class*="Testimonial"]',
      '[class*="review"]', '[class*="Review"]',
      '[class*="feedback"]', '[class*="Feedback"]',
      '[class*="quote"]',
    ],
  },
  {
    type: 'cta',
    selectors: [
      '[class*="cta"]', '[class*="Cta"]', '[class*="CTA"]',
      '[class*="call-to-action"]',
      '[class*="cta-section"]',
    ],
  },
  {
    type: 'footer',
    selectors: ['footer', '[role="contentinfo"]', '.footer', '#footer'],
  },
];

export class LayoutDetector {
  private logFn: ((step: string, msg: string, data?: Record<string, unknown>) => void) | undefined;

  constructor(
    logFn?: (step: string, msg: string, data?: Record<string, unknown>) => void,
  ) {
    this.logFn = logFn;
  }

  private log(msg: string) {
    console.log(`[layout-detector] ${msg}`);
    this.logFn?.('layout-detector', msg);
  }

  async detectSections(page: Page): Promise<DetectedSection[]> {
    this.log('Detecting page sections...');

    const rawSections = await page.evaluate((rules: Array<{ type: string; selectors: string[] }>) => {
      const found: Array<{
        type: string;
        selector: string;
        order: number;
        rect: { x: number; y: number; width: number; height: number; top: number; bottom: number };
        textPreview: string;
        childCount: number;
        hasImages: boolean;
        hasButtons: boolean;
        hasLinks: boolean;
        bgColor: string;
        sectionId: string;
        sectionClass: string;
      }> = [];

      const seen = new Set<string>();
      let order = 0;

      for (const rule of rules) {
        for (const sel of rule.selectors) {
          const els = document.querySelectorAll(sel);
          for (const el of els) {
            const key = `${rule.type}-${(el as HTMLElement).offsetTop}`;
            if (seen.has(key)) continue;
            seen.add(key);

            const rect = el.getBoundingClientRect();
            const computed = window.getComputedStyle(el);

            // Skip tiny elements (likely not real sections)
            if (rect.width < 100 || rect.height < 50) continue;

            found.push({
              type: rule.type,
              selector: sel,
              order,
              rect: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                top: Math.round(rect.top + window.scrollY),
                bottom: Math.round(rect.bottom + window.scrollY),
              },
              textPreview: (el.textContent || '').substring(0, 150).trim(),
              childCount: el.children.length,
              hasImages: el.querySelectorAll('img').length > 0,
              hasButtons: el.querySelectorAll('button, [role="button"], a[class*="btn"]').length > 0,
              hasLinks: el.querySelectorAll('a').length > 0,
              bgColor: computed.backgroundColor,
              sectionId: el.id || '',
              sectionClass: el.className ? String(el.className).substring(0, 100) : '',
            });
            order++;
          }
        }
      }

      // Sort by vertical position
      found.sort((a, b) => a.rect.top - b.rect.top);

      // Re-assign order after sort
      found.forEach((s, i) => { s.order = i; });

      return found;
    }, SECTION_RULES);

    this.log(`Detected ${rawSections.length} sections`);
    return rawSections;
  }

  compare(original: DetectedSection[], clone: DetectedSection[]): LayoutComparison {
    this.log(`Comparing layouts: ${original.length} original vs ${clone.length} clone sections`);

    const issues: string[] = [];

    // Find section types in each
    const origTypes = new Map(original.map(s => [s.type, s.order]));
    const cloneTypes = new Map(clone.map(s => [s.type, s.order]));

    // Missing sections
    const missingInClone: string[] = [];
    for (const [type, order] of origTypes) {
      if (!cloneTypes.has(type)) {
        missingInClone.push(type);
        issues.push(`Section "${type}" (order: ${order}) missing from clone`);
      }
    }

    // Extra sections
    const extraInClone: string[] = [];
    for (const [type, order] of cloneTypes) {
      if (!origTypes.has(type)) {
        extraInClone.push(type);
        issues.push(`Extra section "${type}" (order: ${order}) in clone`);
      }
    }

    // Order differences
    const orderDifferences: Array<{ section: string; originalOrder: number; cloneOrder: number }> = [];
    for (const [type, origOrder] of origTypes) {
      const cloneOrder = cloneTypes.get(type);
      if (cloneOrder !== undefined && cloneOrder !== origOrder) {
        orderDifferences.push({ section: type, originalOrder: origOrder, cloneOrder });
        issues.push(`Section "${type}" order mismatch: original=${origOrder}, clone=${cloneOrder}`);
      }
    }

    const sectionOrderMatch = orderDifferences.length === 0 && missingInClone.length === 0;

    // Calculate structural similarity
    const allTypes = new Set([...origTypes.keys(), ...cloneTypes.keys()]);
    let matchScore = 0;
    for (const type of allTypes) {
      if (origTypes.has(type) && cloneTypes.has(type)) {
        matchScore += 1;
        // Penalize order differences
        const origOrder = origTypes.get(type)!;
        const cloneOrder = cloneTypes.get(type)!;
        if (origOrder !== cloneOrder) {
          matchScore -= 0.3;
        }
      }
    }
    const structuralSimilarity = allTypes.size > 0
      ? Math.max(0, (matchScore / allTypes.size) * 100)
      : 100;

    this.log(`Structural similarity: ${structuralSimilarity.toFixed(1)}%`);
    if (issues.length > 0) {
      this.log(`Issues found: ${issues.join('; ')}`);
    }

    return {
      originalSections: original,
      cloneSections: clone,
      sectionOrderMatch,
      missingInClone,
      extraInClone,
      orderDifferences,
      structuralSimilarity: Math.round(structuralSimilarity * 100) / 100,
      issues,
    };
  }
}
