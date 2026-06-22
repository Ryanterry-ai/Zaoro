import { MCPTool, MCPToolResult, PlaywrightScreenshot, LayoutMap, DesignTokens } from '../types.js';

export class PlaywrightTool implements MCPTool {
  name = 'playwright_scrape';
  description = 'Scrape a website URL using Playwright to extract layout, styles, images, and design tokens. Returns structured data for cloning.';
  inputSchema = {
    type: 'object' as const,
    properties: {
      url: { type: 'string', description: 'The URL to scrape' },
      waitFor: { type: 'number', description: 'Wait time in ms for page load (default 3000)', default: 3000 },
      fullPage: { type: 'boolean', description: 'Capture full page screenshot (default true)', default: true },
    },
    required: ['url'],
  };

  async handler(input: Record<string, unknown>): Promise<MCPToolResult> {
    const url = input.url as string;
    const waitFor = (input.waitFor as number) || 3000;
    const fullPage = input.fullPage !== false;

    try {
      const result = await this.scrapeWithPlaywright(url, waitFor, fullPage);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Playwright scrape failed: ${err.message}` }],
        isError: true,
      };
    }
  }

  private async scrapeWithPlaywright(url: string, waitFor: number, fullPage: boolean): Promise<PlaywrightScreenshot> {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(waitFor);

      const title = await page.title();
      const screenshotBuf = await page.screenshot({ fullPage, type: 'png' });
      const screenshot = screenshotBuf.toString('base64');

      const layout = await this.extractLayout(page);
      const styles = await this.extractDesignTokens(page);
      const links = await this.extractLinks(page);
      const images = await this.extractImages(page);

      return { url, title, screenshot, layout, styles, links, images };
    } finally {
      await browser.close();
    }
  }

  private async extractLayout(page: any): Promise<LayoutMap> {
    const script = `
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
            selector: selector,
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
    `;
    const raw = await page.evaluate(script);
    return JSON.parse(raw);
  }

  private async extractDesignTokens(page: any): Promise<DesignTokens> {
    const script = `
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
    `;
    const raw = await page.evaluate(script);
    return JSON.parse(raw);
  }

  private async extractLinks(page: any): Promise<string[]> {
    const script = `
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
    `;
    const raw = await page.evaluate(script);
    return JSON.parse(raw);
  }

  private async extractImages(page: any): Promise<Array<{ src: string; alt: string; width: number; height: number; format: string }>> {
    const script = `
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
    `;
    const raw = await page.evaluate(script);
    return JSON.parse(raw);
  }
}
