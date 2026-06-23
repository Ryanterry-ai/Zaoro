import * as cheerio from 'cheerio';
import { WebSearcher } from './web-searcher.js';

export interface DesignTokens {
  colors: string[];
  fonts: string[];
  font_sizes: string[];
  spacings: string[];
  border_radius: string[];
  shadows: string[];
  layout_patterns: string[];
  navigation_style: string;
  hero_style: string;
  overall_theme: string;
}

export interface PageAnalysis {
  url: string;
  title: string;
  design_tokens: DesignTokens;
  sections: Array<{ type: string; content: string; position: number }>;
  navigation: Array<{ text: string; href: string }>;
  images: Array<{ alt: string; src: string; role: string }>;
  cta_buttons: Array<{ text: string; style: string; position: string }>;
  forms: Array<{ action: string; fields: string[] }>;
  technologies: string[];
  structured_data?: Array<Record<string, unknown>>;
  social_links?: Record<string, string[]>;
  pricing_signals?: { has_pricing: boolean; price_mentions: string[] };
  meta_tags?: Record<string, string>;
}

/**
 * VisualAnalyzer: Extracts design tokens and page structure from websites.
 * Uses Playwright for full browser rendering and cheerio for HTML parsing.
 */
export class VisualAnalyzer {
  private searcher: WebSearcher;

  constructor() {
    this.searcher = new WebSearcher();
  }

  async analyzePage(url: string): Promise<PageAnalysis> {
    console.log(`[visual-analyzer] Analyzing: ${url}`);

    let html = '';
    let title = '';
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(url, { waitUntil: 'load', timeout: 20000 });
      await page.waitForTimeout(3000);
      html = await page.content();
      title = await page.title();
      await browser.close();
    } catch (err: any) {
      console.warn(`[visual-analyzer] Playwright failed: ${err.message}, using fetch`);
      const content = await this.searcher.fetchPage(url);
      html = content.text;
      title = content.title;
    }

    const $ = cheerio.load(html);
    const designTokens = this.extractDesignTokens(html);
    const sections = this.extractSections(html);
    const navigation = this.extractNavigationCheerio($);
    const images = this.extractImagesCheerio($);
    const ctaButtons = this.extractCTAsCheerio($);
    const forms = this.extractFormsCheerio($);
    const technologies = this.detectTechnologies(html);
    const structuredData = this.extractStructuredDataCheerio($);
    const socialLinks = this.extractSocialLinksCheerio($);
    const pricingSignals = this.extractPricingSignalsCheerio($);
    const metaTags = this.extractMetaTagsCheerio($);

    return {
      url,
      title,
      design_tokens: designTokens,
      sections,
      navigation,
      images,
      cta_buttons: ctaButtons,
      forms,
      technologies,
      structured_data: structuredData,
      social_links: socialLinks,
      pricing_signals: pricingSignals,
      meta_tags: metaTags
    };
  }

  async analyzeMultiple(urls: string[]): Promise<PageAnalysis[]> {
    const results = await Promise.allSettled(urls.map(u => this.analyzePage(u)));
    return results.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean) as PageAnalysis[];
  }

  private extractDesignTokens(html: string): DesignTokens {
    const cssVarPattern = /--[\w-]+:\s*([^;]+)/g;
    const colorPattern = /#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+/g;
    const fontPattern = /font-family:\s*([^;]+)/g;
    const sizePattern = /font-size:\s*(\d+(?:\.\d+)?(?:px|rem|em))/g;
    const radiusPattern = /border-radius:\s*(\d+(?:\.\d+)?(?:px|rem|%))/g;
    const shadowPattern = /box-shadow:\s*([^;]+)/g;

    const colors = new Set<string>();
    const fonts = new Set<string>();
    const fontSizes = new Set<string>();
    const radiuses = new Set<string>();
    const shadows = new Set<string>();

    let match;
    while ((match = colorPattern.exec(html)) !== null) colors.add(match[0]!);
    while ((match = fontPattern.exec(html)) !== null) fonts.add(match[1]?.trim() ?? '');
    while ((match = sizePattern.exec(html)) !== null) fontSizes.add(match[1] ?? '');
    while ((match = radiusPattern.exec(html)) !== null) radiuses.add(match[1] ?? '');
    while ((match = shadowPattern.exec(html)) !== null) shadows.add(match[1]?.trim() ?? '');

    const bodyBg = html.match(/background(?:-color)?:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/)?.[1] || '';
    const textColor = html.match(/color:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/)?.[1] || '';
    const theme = this.inferTheme(bodyBg, textColor);

    return {
      colors: [...colors].slice(0, 15),
      fonts: [...fonts].slice(0, 5),
      font_sizes: [...fontSizes].slice(0, 8),
      spacings: [],
      border_radius: [...radiuses].slice(0, 5),
      shadows: [...shadows].slice(0, 3),
      layout_patterns: [],
      navigation_style: this.detectNavStyle(html),
      hero_style: this.detectHeroStyle(html),
      overall_theme: theme
    };
  }

  private extractSections(html: string): Array<{ type: string; content: string; position: number }> {
    const sections: Array<{ type: string; content: string; position: number }> = [];
    const sectionPatterns = [
      { type: 'hero', pattern: /hero|banner|jumbotron/i },
      { type: 'features', pattern: /features|benefits|capabilities/i },
      { type: 'pricing', pattern: /pricing|plans|packages/i },
      { type: 'testimonials', pattern: /testimonials?|reviews?|imonials/i },
      { type: 'cta', pattern: /call.to.action|cta|get.started/i },
      { type: 'footer', pattern: /footer/i },
      { type: 'nav', pattern: /navbar|navigation|header/i },
    ];

    for (const { type, pattern } of sectionPatterns) {
      if (pattern.test(html)) {
        sections.push({ type, content: '', position: sections.length });
      }
    }
    return sections;
  }

  private extractNavigation(html: string): Array<{ text: string; href: string }> {
    const nav: Array<{ text: string; href: string }> = [];
    const navMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i);
    if (navMatch) {
      const linkPattern = /<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
      let match;
      while ((match = linkPattern.exec(navMatch[1]!)) !== null) {
        const text = match[2]?.trim() ?? '';
        if (text) nav.push({ text, href: match[1] ?? '' });
      }
    }
    return nav.slice(0, 15);
  }

  private extractImages(html: string): Array<{ alt: string; src: string; role: string }> {
    const images: Array<{ alt: string; src: string; role: string }> = [];
    const imgPattern = /<img[^>]*src="([^"]*)"[^>]*(?:alt="([^"]*)")?[^>]*>/gi;
    let match;
    while ((match = imgPattern.exec(html)) !== null) {
      const src = match[1] ?? '';
      const alt = match[2] ?? '';
      const role = /logo|brand|icon/i.test(alt + src) ? 'logo' :
                   /hero|banner|background/i.test(alt + src) ? 'hero' : 'content';
      images.push({ alt, src, role });
    }
    return images.slice(0, 10);
  }

  private extractCTAs(html: string): Array<{ text: string; style: string; position: string }> {
    const ctas: Array<{ text: string; style: string; position: string }> = [];
    const btnPattern = /<button[^>]*>([^<]*)<\/button>|<a[^>]*class="[^"]*(?:btn|button|cta)[^"]*"[^>]*>([^<]*)<\/a>/gi;
    let match;
    while ((match = btnPattern.exec(html)) !== null) {
      const text = (match[1] ?? match[2] ?? '').trim();
      if (text && text.length < 50) {
        const style = /primary|hero|main/i.test(match[0]) ? 'primary' : 'secondary';
        ctas.push({ text, style, position: 'unknown' });
      }
    }
    return ctas.slice(0, 5);
  }

  private extractForms(html: string): Array<{ action: string; fields: string[] }> {
    const forms: Array<{ action: string; fields: string[] }> = [];
    const formPattern = /<form[^>]*action="([^"]*)"[^>]*>([\s\S]*?)<\/form>/gi;
    let match;
    while ((match = formPattern.exec(html)) !== null) {
      const action = match[1] ?? '';
      const fields: string[] = [];
      const inputPattern = /<input[^>]*(?:name|placeholder)="([^"]*)"/gi;
      let inputMatch;
      while ((inputMatch = inputPattern.exec(match[2] ?? '')) !== null) {
        fields.push(inputMatch[1] ?? '');
      }
      forms.push({ action, fields });
    }
    return forms;
  }

  private detectTechnologies(html: string): string[] {
    const techs: string[] = [];
    const checks: Array<[string, RegExp]> = [
      ['React', /react|__next/i], ['Next.js', /_next|nextjs/i], ['Vue', /vue/i],
      ['Tailwind', /tailwind/i], ['Bootstrap', /bootstrap/i],
      ['Shopify', /shopify/i], ['WordPress', /wp-content|wordpress/i],
      ['Google Analytics', /gtag|google-analytics/i], ['Hotjar', /hotjar/i],
      ['Vercel', /vercel|_vercel/i],
    ];
    for (const [name, pattern] of checks) {
      if (pattern.test(html)) techs.push(name);
    }
    return techs;
  }

  private inferTheme(bg: string, text: string): string {
    if (!bg) return 'unknown';
    const isLight = bg.includes('fff') || bg.includes('FFF') || bg.includes('255, 255, 255');
    return isLight ? 'light' : 'dark';
  }

  private detectNavStyle(html: string): string {
    if (/fixed.*nav|sticky.*nav|nav.*fixed|nav.*sticky/i.test(html)) return 'fixed';
    if (/transparent.*nav|nav.*transparent/i.test(html)) return 'transparent';
    return 'static';
  }

  private detectHeroStyle(html: string): string {
    if (/split.*hero|hero.*split|two.*column.*hero/i.test(html)) return 'split';
    if (/centered.*hero|hero.*center|full.*hero/i.test(html)) return 'centered';
    if (/video.*hero|hero.*video/i.test(html)) return 'video';
    return 'standard';
  }

  // ─── Cheerio-Based Extraction Methods ──────────────────

  private extractNavigationCheerio($: cheerio.CheerioAPI): Array<{ text: string; href: string }> {
    const nav: Array<{ text: string; href: string }> = [];
    $('nav a[href], header a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      if (text && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        nav.push({ text, href });
      }
    });
    return nav.slice(0, 20);
  }

  private extractImagesCheerio($: cheerio.CheerioAPI): Array<{ alt: string; src: string; role: string }> {
    const images: Array<{ alt: string; src: string; role: string }> = [];
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src') || '';
      const alt = $(el).attr('alt') || '';
      const role = /logo|brand|icon/i.test(alt + src) ? 'logo' :
                   /hero|banner|background|cover/i.test(alt + src) ? 'hero' :
                   /product|item/i.test(alt + src) ? 'product' : 'content';
      images.push({ alt, src, role });
    });
    return images.slice(0, 15);
  }

  private extractCTAsCheerio($: cheerio.CheerioAPI): Array<{ text: string; style: string; position: string }> {
    const ctas: Array<{ text: string; style: string; position: string }> = [];
    $('button, a[class*="btn"], a[class*="button"], a[class*="cta"], a[class*="Button"]').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length < 50 && text.length > 1) {
        const className = $(el).attr('class') || '';
        const style = /primary|hero|main|filled/i.test(className) ? 'primary' : 'secondary';
        const isHero = $(el).closest('[class*="hero"], [class*="Hero"]').length > 0;
        ctas.push({ text, style, position: isHero ? 'hero' : 'unknown' });
      }
    });
    return ctas.slice(0, 8);
  }

  private extractFormsCheerio($: cheerio.CheerioAPI): Array<{ action: string; fields: string[] }> {
    const forms: Array<{ action: string; fields: string[] }> = [];
    $('form').each((_, el) => {
      const action = $(el).attr('action') || '';
      const fields: string[] = [];
      $(el).find('input, select, textarea').each((_, input) => {
        const name = $(input).attr('name') || $(input).attr('placeholder') || $(input).attr('aria-label') || '';
        if (name) fields.push(name);
      });
      forms.push({ action, fields });
    });
    return forms;
  }

  private extractStructuredDataCheerio($: cheerio.CheerioAPI): Array<Record<string, unknown>> {
    const data: Array<Record<string, unknown>> = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).html() || '{}');
        if (parsed['@graph']) {
          for (const item of (parsed['@graph'] as Array<Record<string, unknown>>)) {
            data.push(item);
          }
        } else if (parsed['@type']) {
          data.push(parsed);
        }
      } catch {
        // Skip malformed JSON-LD
      }
    });
    return data;
  }

  private extractSocialLinksCheerio($: cheerio.CheerioAPI): Record<string, string[]> {
    const social: Record<string, string[]> = {};
    const patterns: Array<[string, RegExp]> = [
      ['linkedin', /linkedin\.com/i],
      ['twitter', /twitter\.com|x\.com/i],
      ['facebook', /facebook\.com|fb\.com/i],
      ['instagram', /instagram\.com/i],
      ['youtube', /youtube\.com/i],
      ['github', /github\.com/i],
    ];

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      for (const [platform, pattern] of patterns) {
        if (pattern.test(href)) {
          if (!social[platform]) social[platform] = [];
          if (!social[platform]!.includes(href)) social[platform]!.push(href);
          break;
        }
      }
    });

    return social;
  }

  private extractPricingSignalsCheerio($: cheerio.CheerioAPI): { has_pricing: boolean; price_mentions: string[] } {
    const text = $('body').text();
    const priceMentions = text.match(/\$[\d,]+(?:\.\d{2})?(?:\s*\/\s*(?:mo|month|yr|year))?/gi) || [];
    const hasPricingLink = $('a[href*="pricing"], a[href*="plans"]').length > 0;
    const hasPricingSection = /pricing|plans|packages/i.test(text);

    return {
      has_pricing: hasPricingLink || hasPricingSection,
      price_mentions: [...new Set(priceMentions)].slice(0, 10)
    };
  }

  private extractMetaTagsCheerio($: cheerio.CheerioAPI): Record<string, string> {
    const meta: Record<string, string> = {};
    $('meta[name], meta[property]').each((_, el) => {
      const key = $(el).attr('name') || $(el).attr('property') || '';
      const content = $(el).attr('content') || '';
      if (key && content) meta[key] = content;
    });
    return meta;
  }
}
