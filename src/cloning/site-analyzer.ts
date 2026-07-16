// ─── Site Analyzer ────────────────────────────────────────────────
// Analyzes a website BEFORE crawling: tech stack, sitemap, nav, pages

import { JSDOM } from 'jsdom';
import {
  AnalyzeResult, TechStack, SitemapEntry, NavItem, AnalyzedPage,
  PageCategory, RobotsTxtInfo, CloneProgressEvent,
} from './clone-progress.js';

const PRODUCT_PATH_RE = /^\/(product|products|p|item|items|shop)\//i;
const COLLECTION_PATH_RE = /^\/(collection|collections|category|categories|c|shop|browse)\//i;
const BLOG_PATH_RE = /^\/(blog|posts?|articles?|news|journal|stories)\//i;
const AUTH_PATH_RE = /^\/(login|signin|signup|register|account|auth)\//i;
const CART_PATH_RE = /^\/(cart|checkout|basket|order)\//i;
const POLICY_PATH_RE = /^\/(privacy|terms|legal|policy|policies|refund|shipping|faq|help)\//i;
const STATIC_PATH_RE = /^\/(about|contact|careers|team|press|partners|investors)\//i;
const SEARCH_PATH_RE = /^\/(search|query|find)\//i;

export class SiteAnalyzer {
  private logFn: ((msg: string) => void) | undefined;

  constructor(logFn?: (msg: string) => void) {
    this.logFn = logFn;
  }

  private log(msg: string) {
    console.log(`[analyzer] ${msg}`);
    this.logFn?.(msg);
  }

  async analyze(url: string): Promise<AnalyzeResult> {
    const root = new URL(url);
    this.log(`Analyzing ${root.origin}`);

    // 1. Fetch robots.txt
    const robotsTxt = await this.fetchRobotsTxt(root);

    // 2. Fetch sitemap
    const sitemapPages = await this.fetchSitemap(root, robotsTxt);

    // 3. Fetch homepage for tech detection + navigation
    const homePage = await this.fetchPage(root.href);

    // 4. Detect tech stack
    const techStack = this.detectTechStack(homePage.html, homePage.headers);

    // 5. Extract navigation
    const navItems = this.extractNavigation(homePage.doc, root.origin);

    // 6. Map all pages from sitemap + nav + robots
    const pages = this.mapPages(sitemapPages, navItems, root.pathname);

    this.log(`Analysis complete: ${pages.length} pages, ${techStack.framework}, ${sitemapPages.length} sitemap entries`);

    return {
      url: root.href,
      techStack,
      sitemapPages,
      navItems,
      pages,
      totalEstimatedPages: pages.length + (robotsTxt?.disallowPaths.length || 0),
      robotsTxt,
    };
  }

  // ─── Robots.txt ──────────────────────────────────────────────

  private async fetchRobotsTxt(root: URL): Promise<RobotsTxtInfo | null> {
    try {
      const resp = await fetch(`${root.origin}/robots.txt`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SiteAnalyzer/1.0)' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) return null;
      const text = await resp.text();

      const sitemaps: string[] = [];
      const disallowPaths: string[] = [];
      let crawlDelay: number | null = null;

      for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('Sitemap:')) {
          sitemaps.push(trimmed.slice(8).trim());
        } else if (trimmed.startsWith('Disallow:')) {
          const path = trimmed.slice(9).trim();
          if (path) disallowPaths.push(path);
        } else if (trimmed.startsWith('Crawl-delay:')) {
          crawlDelay = parseFloat(trimmed.slice(12).trim()) || null;
        }
      }

      this.log(`robots.txt: ${sitemaps.length} sitemaps, ${disallowPaths.length} disallow rules`);
      return { sitemaps, disallowPaths, crawlDelay };
    } catch {
      return null;
    }
  }

  // ─── Sitemap ─────────────────────────────────────────────────

  private async fetchSitemap(root: URL, robotsTxt: RobotsTxtInfo | null): Promise<SitemapEntry[]> {
    const sitemapUrls = robotsTxt?.sitemaps || [`${root.origin}/sitemap.xml`, `${root.origin}/sitemap_index.xml`];
    const entries: SitemapEntry[] = [];
    const seen = new Set<string>();

    for (const sitemapUrl of sitemapUrls) {
      try {
        const resp = await fetch(sitemapUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SiteAnalyzer/1.0)' },
          signal: AbortSignal.timeout(15_000),
        });
        if (!resp.ok) continue;
        const xml = await resp.text();

        // Check if it's a sitemap index (contains nested sitemaps)
        if (xml.includes('<sitemapindex')) {
          const nestedUrls = this.extractSitemapIndexUrls(xml);
          for (const nestedUrl of nestedUrls) {
            if (!seen.has(nestedUrl)) {
              seen.add(nestedUrl);
              sitemapUrls.push(nestedUrl);
            }
          }
          continue;
        }

        const parsed = this.parseSitemapXml(xml, root.origin);
        for (const entry of parsed) {
          if (!seen.has(entry.loc)) {
            seen.add(entry.loc);
            entries.push(entry);
          }
        }
      } catch (err: any) {
        this.log(`Failed to fetch sitemap ${sitemapUrl}: ${err.message}`);
      }
    }

    this.log(`Sitemap: ${entries.length} URLs found`);
    return entries;
  }

  private extractSitemapIndexUrls(xml: string): string[] {
    const urls: string[] = [];
    const regex = /<loc>(.*?)<\/loc>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      if (match[1]) urls.push(match[1]);
    }
    return urls;
  }

  private parseSitemapXml(xml: string, origin: string): SitemapEntry[] {
    const entries: SitemapEntry[] = [];
    // Strip CDATA sections: <![CDATA[content]]> → content
    // @ts-ignore — regex s flag works at runtime (ES2018+)
    const cleanXml = xml.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');
    const urlBlocks = cleanXml.split('<url>').slice(1);

    for (const block of urlBlocks) {
      const loc = block.match(/<loc>(.*?)<\/loc>/)?.[1];
      if (!loc) continue;

      // Normalize to path only
      try {
        const u = new URL(loc);
        const path = u.pathname;
        entries.push({
          loc: path,
          lastModified: block.match(/<lastmod>(.*?)<\/lastmod>/)?.[1] || '',
          changeFreq: block.match(/<changefreq>(.*?)<\/changefreq>/)?.[1] || 'monthly',
          priority: block.match(/<priority>(.*?)<\/priority>/)?.[1] || '0.5',
        });
      } catch {
        entries.push({
          loc: loc,
          lastModified: block.match(/<lastmod>(.*?)<\/lastmod>/)?.[1] || '',
          changeFreq: block.match(/<changefreq>(.*?)<\/changefreq>/)?.[1] || 'monthly',
          priority: block.match(/<priority>(.*?)<\/priority>/)?.[1] || '0.5',
        });
      }
    }

    return entries;
  }

  // ─── Page Fetching ───────────────────────────────────────────

  private async fetchPage(url: string): Promise<{ html: string; doc: Document; headers: Record<string, string> }> {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
    });

    const html = await resp.text();
    const headers: Record<string, string> = {};
    resp.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

    const dom = new JSDOM(html, { url });
    return { html, doc: dom.window.document, headers };
  }

  // ─── Tech Stack Detection ────────────────────────────────────

  private detectTechStack(html: string, headers: Record<string, string>): TechStack {
    const signals: string[] = [];
    let framework = 'unknown';
    let cms = 'none';
    let hosting = 'unknown';
    let cssFramework = 'none';
    let ecommerce = 'none';
    const analytics: string[] = [];
    const fonts: string[] = [];

    // Framework detection
    if (html.includes('__NEXT_DATA__') || headers['x-powered-by'] === 'Next.js') {
      framework = 'Next.js';
      signals.push('Next.js detected (X-Powered-By or __NEXT_DATA__)');
    } else if (html.includes('__VUE__') || html.includes('data-v-')) {
      framework = 'Vue.js';
      signals.push('Vue.js detected');
    } else if (html.includes('__REACT') || html.includes('_reactRoot')) {
      framework = 'React';
      signals.push('React detected');
    } else if (html.includes('__NUXT__')) {
      framework = 'Nuxt.js';
      signals.push('Nuxt.js detected');
    } else if (html.includes('gatsby')) {
      framework = 'Gatsby';
      signals.push('Gatsby detected');
    } else if (html.includes('svelte')) {
      framework = 'Svelte';
      signals.push('Svelte detected');
    } else if (html.includes('angular') || html.includes('ng-version')) {
      framework = 'Angular';
      signals.push('Angular detected');
    }

    // CMS detection
    if (html.includes('wp-content') || html.includes('wordpress')) {
      cms = 'WordPress';
      signals.push('WordPress detected');
    } else if (html.includes('Shopify') || headers['x-shopify']) {
      cms = 'Shopify';
      signals.push('Shopify detected');
    } else if (html.includes('squarespace')) {
      cms = 'Squarespace';
      signals.push('Squarespace detected');
    } else if (html.includes('wix.com') || html.includes('Wix')) {
      cms = 'Wix';
      signals.push('Wix detected');
    } else if (html.includes('webflow')) {
      cms = 'Webflow';
      signals.push('Webflow detected');
    } else if (html.includes('contentful')) {
      cms = 'Contentful';
      signals.push('Contentful detected');
    } else if (html.includes('strapi')) {
      cms = 'Strapi';
      signals.push('Strapi detected');
    }

    // Ecommerce detection
    if (html.includes('woocommerce') || html.includes('wc-')) {
      ecommerce = 'WooCommerce';
      signals.push('WooCommerce detected');
    } else if (html.includes('shopify') && framework !== 'unknown') {
      ecommerce = 'Shopify Hydrogen';
      signals.push('Shopify Hydrogen detected');
    } else if (html.includes('bigcommerce')) {
      ecommerce = 'BigCommerce';
      signals.push('BigCommerce detected');
    } else if (html.includes('magento')) {
      ecommerce = 'Magento';
      signals.push('Magento detected');
    }

    // CSS framework
    if (html.includes('tailwindcss') || html.includes('tailwind')) {
      cssFramework = 'Tailwind CSS';
    } else if (html.includes('bootstrap')) {
      cssFramework = 'Bootstrap';
    } else if (html.includes('bulma')) {
      cssFramework = 'Bulma';
    } else if (html.includes('material-ui') || html.includes('mui')) {
      cssFramework = 'Material UI';
    }

    // Analytics
    if (html.includes('google-analytics') || html.includes('gtag') || html.includes('GA_MEASUREMENT_ID')) {
      analytics.push('Google Analytics');
    }
    if (html.includes('gtm.js') || html.includes('googletagmanager')) {
      analytics.push('Google Tag Manager');
    }
    if (html.includes('facebook.net') || html.includes('fbq(')) {
      analytics.push('Facebook Pixel');
    }
    if (html.includes('hotjar')) {
      analytics.push('Hotjar');
    }
    if (html.includes('segment.com') || html.includes('analytics.js')) {
      analytics.push('Segment');
    }

    // Fonts
    const googleFonts = html.match(/fonts\.googleapis\.com\/css2\?family=([^"&]+)/);
    if (googleFonts?.[1]) {
      fonts.push(...googleFonts[1].split('|').map(f => f.split(':')[0] || ''));
    }
    if (html.includes('typekit') || html.includes('use.typekit.net')) {
      fonts.push('Adobe Typekit');
    }

    // Hosting
    if (headers['server']?.includes('cloudflare')) hosting = 'Cloudflare';
    else if (headers['server']?.includes('nginx')) hosting = 'Nginx';
    else if (headers['server']?.includes('apache')) hosting = 'Apache';
    else if (headers['x-vercel']) hosting = 'Vercel';
    else if (headers['x-amz-cf-id']) hosting = 'AWS CloudFront';
    else if (headers['x-shopify']) hosting = 'Shopify CDN';

    return { framework, cms, hosting, analytics, fonts, cssFramework, ecommerce, signals };
  }

  // ─── Navigation Extraction ───────────────────────────────────

  private extractNavigation(doc: Document, origin: string): NavItem[] {
    const navItems: NavItem[] = [];
    const seen = new Set<string>();

    // Try multiple selectors for navigation
    const navSelectors = [
      'nav a[href]',
      'header a[href]',
      '[role="navigation"] a[href]',
      '.navbar a[href]',
      '.nav a[href]',
      '.menu a[href]',
      '.header a[href]',
      '#header a[href]',
      '#nav a[href]',
    ];

    for (const selector of navSelectors) {
      try {
        doc.querySelectorAll(selector).forEach((a: Element) => {
          const href = a.getAttribute('href') || '';
          const text = (a.textContent || '').trim();

          if (!text || text.length < 2 || text.length > 60) return;
          if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

          let path: string;
          try {
            const u = new URL(href, origin);
            path = u.pathname;
          } catch {
            path = href;
          }

          // Normalize
          const normalized = path.split('?')[0]!.split('#')[0]!;
          if (seen.has(normalized)) return;
          seen.add(normalized);

          navItems.push({ label: text, href: normalized, depth: 0, children: [] });
        });
      } catch {}
    }

    // Also extract footer links
    try {
      doc.querySelectorAll('footer a[href], [class*="footer"] a[href]').forEach((a: Element) => {
        const href = a.getAttribute('href') || '';
        const text = (a.textContent || '').trim();
        if (!text || text.length < 2 || text.length > 60) return;
        if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;

        let path: string;
        try {
          const u = new URL(href, origin);
          path = u.pathname;
        } catch {
          path = href;
        }

        const normalized = path.split('?')[0]!.split('#')[0]!;
        if (seen.has(normalized)) return;
        seen.add(normalized);

        navItems.push({ label: text, href: normalized, depth: 1, children: [] });
      });
    } catch {}

    this.log(`Navigation: ${navItems.length} unique links found`);
    return navItems;
  }

  // ─── Page Mapping ────────────────────────────────────────────

  private mapPages(sitemapEntries: SitemapEntry[], navItems: NavItem[], rootPath: string): AnalyzedPage[] {
    const pages: AnalyzedPage[] = [];
    const seen = new Set<string>();

    // Add homepage
    pages.push({
      path: '/',
      title: 'Home',
      category: 'home',
      importance: 'critical',
      estimatedAssets: 20,
      detectedFrom: 'user',
    });
    seen.add('/');

    // Add sitemap pages
    for (const entry of sitemapEntries) {
      const path = entry.loc.split('?')[0]!.split('#')[0]!;
      if (seen.has(path)) continue;
      if (path === rootPath) continue; // skip root if duplicate
      seen.add(path);

      const category = this.categorizePage(path);
      const importance = this.estimateImportance(path, entry.priority, entry.changeFreq);

      pages.push({
        path,
        title: path.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || path,
        category,
        importance,
        estimatedAssets: category === 'pdp' ? 15 : category === 'collection' ? 10 : 5,
        detectedFrom: 'sitemap',
      });
    }

    // Add navigation pages
    for (const nav of navItems) {
      const path = nav.href.split('?')[0]!.split('#')[0]!;
      if (seen.has(path)) continue;
      seen.add(path);

      const category = this.categorizePage(path);

      pages.push({
        path,
        title: nav.label,
        category,
        importance: nav.depth === 0 ? 'high' : 'medium',
        estimatedAssets: 5,
        detectedFrom: 'navigation',
      });
    }

    // Sort by importance
    const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    pages.sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance]);

    this.log(`Pages mapped: ${pages.length} total (${pages.filter(p => p.category === 'pdp').length} PDPs, ${pages.filter(p => p.category === 'collection').length} collections, ${pages.filter(p => p.category === 'blog').length} blogs)`);
    return pages;
  }

  private categorizePage(path: string): PageCategory {
    if (path === '/' || path === '') return 'home';
    if (PRODUCT_PATH_RE.test(path)) return 'pdp';
    if (COLLECTION_PATH_RE.test(path)) return 'collection';
    if (BLOG_PATH_RE.test(path)) return 'blog';
    if (AUTH_PATH_RE.test(path)) return 'auth';
    if (CART_PATH_RE.test(path)) return 'cart';
    if (POLICY_PATH_RE.test(path)) return 'policy';
    if (STATIC_PATH_RE.test(path)) return 'static';
    if (SEARCH_PATH_RE.test(path)) return 'search';

    // Heuristic: product pages often have IDs or slugs after /p/ or /product/
    if (/\/\d+/.test(path) || /\/[a-z0-9]{8,}/.test(path)) return 'pdp';

    return 'other';
  }

  private estimateImportance(path: string, priority: string, changeFreq: string): AnalyzedPage['importance'] {
    const p = parseFloat(priority) || 0.5;
    if (path === '/') return 'critical';
    if (p >= 0.8 || changeFreq === 'daily') return 'high';
    if (p >= 0.5 || changeFreq === 'weekly') return 'medium';
    return 'low';
  }
}
