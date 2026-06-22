import * as fs from 'fs';
import * as path from 'path';
import { LLMGateway } from '../core/llm-gateway.js';
import { ASTPatch, LLMConfig } from '../types/index.js';

interface ScrapedData {
  url: string;
  title: string;
  screenshot: string;
  layout: {
    viewport: { width: number; height: number };
    elements: LayoutNode[];
  };
  styles: {
    colors: string[];
    fonts: string[];
    fontSizes: string[];
    spacings: string[];
    borderRadii: string[];
    shadows: string[];
  };
  links: string[];
  images: Array<{ src: string; alt: string; width: number; height: number; format: string }>;
}

interface LayoutNode {
  tag: string;
  selector: string;
  bounds: { x: number; y: number; width: number; height: number };
  styles: Record<string, string>;
  text?: string;
  children?: LayoutNode[];
}

interface Section {
  name: string;
  yStart: number;
  yEnd: number;
  height: number;
  elements: LayoutNode[];
  text: string;
  images: string[];
}

export interface CloneResult {
  success: boolean;
  sections: Section[];
  patches: ASTPatch[];
  duration: number;
  error?: string;
}

export class CloneOrchestrator {
  private workspaceRoot: string;
  private gateway: LLMGateway;

  constructor(workspaceRoot: string, llmConfig: LLMConfig) {
    this.workspaceRoot = workspaceRoot;
    this.gateway = new LLMGateway(llmConfig);
  }

  async clone(targetUrl: string): Promise<CloneResult> {
    const startTime = Date.now();

    // Normalize URL — prepend https:// if no protocol
    let url = targetUrl.trim();
    if (!url.match(/^https?:\/\//i)) {
      url = `https://${url}`;
    }
    console.log(`[clone] Starting clone of ${url}`);

    try {
      // Phase 1: Scrape the target site
      console.log(`[clone] Phase 1: Scraping target site...`);
      const scraped = await this.scrapeTarget(url);
      console.log(`[clone] Scraped: "${scraped.title}" — ${scraped.layout.elements.length} top-level elements, ${scraped.styles.colors.length} colors, ${scraped.images.length} images`);

      // Phase 2: Extract sections from layout
      console.log(`[clone] Phase 2: Extracting sections...`);
      const sections = this.extractSections(scraped);
      console.log(`[clone] Found ${sections.length} sections`);

      // Phase 3: Generate code via LLM
      console.log(`[clone] Phase 3: Generating components via LLM...`);
      const patches = await this.generateComponents(scraped, sections);
      console.log(`[clone] Generated ${patches.length} patches`);

      // Phase 4: Write patches to workspace
      console.log(`[clone] Phase 4: Applying patches...`);
      this.applyPatches(patches);

      const duration = Date.now() - startTime;
      console.log(`[clone] Clone complete in ${duration}ms`);

      return { success: true, sections, patches, duration };
    } catch (err: any) {
      console.error(`[clone] Clone failed: ${err.message}`);
      return { success: false, sections: [], patches: [], duration: Date.now() - startTime, error: err.message };
    }
  }

  private async scrapeTarget(url: string): Promise<ScrapedData> {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(2000);

      const title = await page.title();
      const screenshotBuf = await page.screenshot({ fullPage: true, type: 'png' });
      const screenshot = screenshotBuf.toString('base64');

      const layoutRaw = await page.evaluate(`
        (() => {
          const viewport = { width: window.innerWidth, height: window.innerHeight };
          const elements = [];
          const walk = (el, depth) => {
            if (depth > 5) return null;
            const rect = el.getBoundingClientRect();
            const computed = window.getComputedStyle(el);
            if (rect.width === 0 || rect.height === 0) return null;
            let selector = el.tagName.toLowerCase();
            if (el.id) selector = '#' + el.id;
            else if (el.className && typeof el.className === 'string' && el.className.trim()) {
              selector = el.tagName.toLowerCase() + '.' + el.className.trim().split(/\\s+/).slice(0,2).join('.');
            }
            const node = {
              tag: el.tagName.toLowerCase(),
              selector,
              bounds: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
              styles: {
                display: computed.display, position: computed.position,
                backgroundColor: computed.backgroundColor, color: computed.color,
                fontSize: computed.fontSize, fontFamily: computed.fontFamily,
                padding: computed.padding, margin: computed.margin,
                borderRadius: computed.borderRadius, gap: computed.gap
              },
              text: undefined
            };
            if (el.childNodes.length === 1 && el.childNodes[0] && el.childNodes[0].nodeType === 3) {
              const t = el.childNodes[0].textContent;
              if (t) node.text = t.trim() || undefined;
            }
            const children = [];
            for (let i = 0; i < el.children.length; i++) {
              const c = walk(el.children[i], depth + 1);
              if (c) children.push(c);
            }
            if (children.length > 0) node.children = children;
            return node;
          };
          const body = document.body;
          for (let i = 0; i < body.children.length; i++) {
            const n = walk(body.children[i], 0);
            if (n) elements.push(n);
          }
          return JSON.stringify({ viewport, elements });
        })()
      `);

      const stylesRaw = await page.evaluate(`
        (() => {
          const colors = [], fonts = [], fontSizes = [], spacings = [], borderRadii = [], shadows = [];
          const cSet = {}, fSet = {}, sSet = {}, spSet = {}, rSet = {}, shSet = {};
          const all = document.querySelectorAll('*');
          for (let i = 0; i < all.length && i < 500; i++) {
            const el = all[i];
            if (!el) continue;
            const cs = window.getComputedStyle(el);
            if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && !cSet[cs.backgroundColor]) { cSet[cs.backgroundColor] = true; colors.push(cs.backgroundColor); }
            if (cs.color && !cSet[cs.color]) { cSet[cs.color] = true; colors.push(cs.color); }
            if (cs.fontFamily && !fSet[cs.fontFamily]) { fSet[cs.fontFamily] = true; fonts.push(cs.fontFamily); }
            if (cs.fontSize && !sSet[cs.fontSize]) { sSet[cs.fontSize] = true; fontSizes.push(cs.fontSize); }
            if (cs.padding && cs.padding !== '0px' && !spSet[cs.padding]) { spSet[cs.padding] = true; spacings.push(cs.padding); }
            if (cs.margin && cs.margin !== '0px' && !spSet[cs.margin]) { spSet[cs.margin] = true; spacings.push(cs.margin); }
            if (cs.borderRadius && cs.borderRadius !== '0px' && !rSet[cs.borderRadius]) { rSet[cs.borderRadius] = true; borderRadii.push(cs.borderRadius); }
            if (cs.boxShadow && cs.boxShadow !== 'none' && !shSet[cs.boxShadow]) { shSet[cs.boxShadow] = true; shadows.push(cs.boxShadow); }
          }
          return JSON.stringify({
            colors: colors.slice(0, 20), fonts: fonts.slice(0, 10),
            fontSizes: fontSizes.slice(0, 10), spacings: spacings.slice(0, 10),
            borderRadii: borderRadii.slice(0, 5), shadows: shadows.slice(0, 5)
          });
        })()
      `);

      const linksRaw = await page.evaluate(`
        (() => {
          const links = [], seen = {};
          const anchors = document.querySelectorAll('a[href]');
          for (let i = 0; i < anchors.length; i++) {
            const href = anchors[i].href;
            if (href && href.startsWith('http') && !seen[href]) { seen[href] = true; links.push(href); }
            if (links.length >= 50) break;
          }
          return JSON.stringify(links);
        })()
      `);

      const imagesRaw = await page.evaluate(`
        (() => {
          const images = [];
          const imgs = document.querySelectorAll('img');
          for (let i = 0; i < imgs.length && i < 30; i++) {
            const img = imgs[i];
            if (img.src && img.src.startsWith('http')) {
              images.push({
                src: img.src, alt: img.alt || '',
                width: img.naturalWidth || img.width, height: img.naturalHeight || img.height,
                format: img.src.split('.').pop().split('?')[0] || 'unknown'
              });
            }
          }
          return JSON.stringify(images);
        })()
      `);

      return {
        url,
        title,
        screenshot,
        layout: JSON.parse(layoutRaw as string),
        styles: JSON.parse(stylesRaw as string),
        links: JSON.parse(linksRaw as string),
        images: JSON.parse(imagesRaw as string),
      };
    } finally {
      await browser.close();
    }
  }

  private extractSections(scraped: ScrapedData): Section[] {
    const elements = scraped.layout.elements;
    if (elements.length === 0) return [];

    // Group elements into sections based on vertical proximity
    const sorted = [...elements].sort((a, b) => a.bounds.y - b.bounds.y);
    const sections: Section[] = [];
    let currentSection: Section | null = null;

    for (const el of sorted) {
      const yStart = el.bounds.y;
      const yEnd = yStart + el.bounds.height;

      if (!currentSection || yStart - currentSection.yEnd > 100) {
        // New section (gap > 100px)
        if (currentSection) sections.push(currentSection);
        currentSection = {
          name: this.guessSectionName(el),
          yStart,
          yEnd,
          height: el.bounds.height,
          elements: [el],
          text: el.text || '',
          images: [],
        };
      } else {
        // Extend current section
        currentSection.yEnd = Math.max(currentSection.yEnd, yEnd);
        currentSection.height = currentSection.yEnd - currentSection.yStart;
        currentSection.elements.push(el);
        if (el.text) currentSection.text += ' ' + el.text;
      }
    }
    if (currentSection) sections.push(currentSection);

    // Assign images to sections based on Y position
    for (const img of scraped.images) {
      // Find which section this image belongs to (approximate)
      for (const section of sections) {
        section.images.push(img.src);
        break;
      }
    }

    return sections;
  }

  private guessSectionName(el: LayoutNode): string {
    const text = (el.text || '').toLowerCase();
    const tag = el.tag;

    if (tag === 'nav' || text.includes('menu') || text.includes('navigation')) return 'Navigation';
    if (text.includes('hero') || text.includes('welcome') || text.includes('get started')) return 'Hero';
    if (text.includes('feature') || text.includes('what we')) return 'Features';
    if (text.includes('pricing') || text.includes('plan')) return 'Pricing';
    if (text.includes('testimon') || text.includes('review')) return 'Testimonials';
    if (text.includes('faq') || text.includes('question')) return 'FAQ';
    if (text.includes('contact') || text.includes('get in touch')) return 'Contact';
    if (text.includes('footer') || text.includes('copyright')) return 'Footer';
    if (tag === 'footer') return 'Footer';

    return `Section`;
  }

  private async generateComponents(scraped: ScrapedData, sections: Section[]): Promise<ASTPatch[]> {
    const sectionDescriptions = sections.map((s, i) =>
      `Section ${i + 1} "${s.name}" (y: ${s.yStart}-${s.yEnd}, height: ${s.height}px):\n  Text: "${s.text.slice(0, 200)}"\n  Elements: ${s.elements.length}\n  Images: ${s.images.length}`
    ).join('\n\n');

    const prompt = `Clone the website "${scraped.title}" from ${scraped.url}.

Design tokens extracted from the live site:
- Colors: ${scraped.styles.colors.slice(0, 8).join(', ')}
- Fonts: ${scraped.styles.fonts.slice(0, 3).join(', ')}
- Font sizes: ${scraped.styles.fontSizes.slice(0, 5).join(', ')}
- Border radii: ${scraped.styles.borderRadii.slice(0, 3).join(', ')}

Page sections (top to bottom):
${sectionDescriptions}

Images available:
${scraped.images.slice(0, 5).map(img => `- ${img.src} (${img.alt || 'no alt'})`).join('\n')}

Generate a complete Next.js App Router page that clones this website's design and layout.
Use the extracted colors, fonts, and design tokens. Match the section order and content.
Include realistic content based on the text extracted from each section.`;

    const patches = await this.gateway.generatePatches({
      prompt,
      attempt: 0,
      changedFiles: [],
      errors: [],
    });

    return patches;
  }

  private applyPatches(patches: ASTPatch[]): void {
    for (const patch of patches) {
      const filePath = path.join(this.workspaceRoot, patch.targetFile);
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });

      if (patch.action === 'insert' || patch.action === 'update') {
        // For update, check if file exists and merge
        if (patch.action === 'update' && fs.existsSync(filePath)) {
          // Write the new content (LLM generates complete component)
          fs.writeFileSync(filePath, patch.codeBlock, 'utf-8');
        } else {
          fs.writeFileSync(filePath, patch.codeBlock, 'utf-8');
        }
      } else if (patch.action === 'delete') {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
  }
}
