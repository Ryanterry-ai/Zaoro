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

    const designTokens = this.extractDesignTokens(html);
    const sections = this.extractSections(html);
    const navigation = this.extractNavigation(html);
    const images = this.extractImages(html);
    const ctaButtons = this.extractCTAs(html);
    const forms = this.extractForms(html);
    const technologies = this.detectTechnologies(html);

    return {
      url,
      title,
      design_tokens: designTokens,
      sections,
      navigation,
      images,
      cta_buttons: ctaButtons,
      forms,
      technologies
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
}
