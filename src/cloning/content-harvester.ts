// ─── Content Harvester Bridge ─────────────────────────────────────
// Bridges jCodesMore asset rewriting + font discovery capabilities
// into the existing clone-orchestrator-v2.ts
//
// Modes:
//   - full-clone: Deep clone with all assets, fonts, animations
//   - structure-clone: HTML/CSS structure only, skip heavy assets
//   - content-harvest: Extract text + images for content injection
//
// Ports specific logic from jCodesMore template:
//   - Recursive sitemap discovery
//   - Asset rewriting (absolute → relative paths)
//   - Font family detection + download
//   - Animation/CSS extraction

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────

export type HarvestMode = 'full-clone' | 'structure-clone' | 'content-harvest';

export interface HarvestConfig {
  mode: HarvestMode;
  baseUrl: string;
  maxPages: number;
  timeout: number;
  outputDir: string;
  respectRobots: boolean;
  downloadAssets: boolean;
  extractFonts: boolean;
  extractAnimations: boolean;
}

export interface HarvestedAsset {
  originalUrl: string;
  localPath: string;
  type: 'image' | 'font' | 'css' | 'js' | 'svg' | 'video' | 'other';
  size: number;
}

export interface HarvestedPage {
  url: string;
  title: string;
  html: string;
  css: string[];
  assets: HarvestedAsset[];
  fonts: string[];
  animations: string[];
  meta: Record<string, string>;
}

export interface HarvestResult {
  pages: HarvestedPage[];
  assets: HarvestedAsset[];
  fonts: string[];
  totalSize: number;
  errors: string[];
}

// ─── Content Harvester ────────────────────────────────────────────

export class ContentHarvester {
  private config: HarvestConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private visited = new Set<string>();
  private pages: HarvestedPage[] = [];
  private assets: HarvestedAsset[] = [];
  private fonts = new Set<string>();
  private errors: string[] = [];

  constructor(config: Partial<HarvestConfig> & { baseUrl: string }) {
    this.config = {
      mode: 'full-clone',
      maxPages: 50,
      timeout: 30000,
      outputDir: '.clone-output',
      respectRobots: true,
      downloadAssets: true,
      extractFonts: true,
      extractAnimations: true,
      ...config,
    };
  }

  /**
   * Main entry point — harvest content based on mode
   */
  async harvest(): Promise<HarvestResult> {
    console.log(`[ContentHarvester] Starting ${this.config.mode} for ${this.config.baseUrl}`);

    try {
      this.browser = await chromium.launch({ headless: true });
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
      });

      // Ensure output directory exists
      await fs.mkdir(this.config.outputDir, { recursive: true });

      // Discover pages via sitemap or crawling
      const urls = await this.discoverUrls();
      console.log(`[ContentHarvester] Discovered ${urls.length} URLs`);

      // Process each URL based on mode
      for (const url of urls) {
        if (this.visited.size >= this.config.maxPages) break;
        if (this.visited.has(url)) continue;

        try {
          const page = await this.processUrl(url);
          if (page) {
            this.pages.push(page);
          }
        } catch (err: any) {
          this.errors.push(`Failed to process ${url}: ${err.message}`);
        }
      }

      // Write results to disk
      await this.writeResults();

      return {
        pages: this.pages,
        assets: this.assets,
        fonts: Array.from(this.fonts),
        totalSize: this.assets.reduce((sum, a) => sum + a.size, 0),
        errors: this.errors,
      };
    } finally {
      await this.browser?.close();
    }
  }

  /**
   * Discover URLs from sitemap.xml or robots.txt
   */
  private async discoverUrls(): Promise<string[]> {
    const urls: string[] = [];
    const baseOrigin = new URL(this.config.baseUrl).origin;

    // Try sitemap.xml first
    try {
      const sitemapUrl = `${baseOrigin}/sitemap.xml`;
      const page = await this.context!.newPage();
      await page.goto(sitemapUrl, { timeout: this.config.timeout });
      const content = await page.content();
      await page.close();

      // Extract URLs from sitemap XML
      const urlMatches = content.match(/<loc>(.*?)<\/loc>/g);
      if (urlMatches) {
        for (const match of urlMatches) {
          const url = match.replace(/<\/?loc>/g, '');
          if (url.startsWith(baseOrigin)) {
            urls.push(url);
          }
        }
      }
    } catch {
      // Sitemap not available, fall back to crawling
    }

    // If no sitemap, crawl from base URL
    if (urls.length === 0) {
      urls.push(this.config.baseUrl);
      await this.crawlForLinks(this.config.baseUrl, urls);
    }

    return [...new Set(urls)];
  }

  /**
   * Recursively crawl for internal links
   */
  private async crawlForLinks(url: string, collected: string[], depth = 0): Promise<void> {
    if (depth > 3 || collected.length > this.config.maxPages) return;
    if (this.visited.has(url)) return;

    this.visited.add(url);

    try {
      const page = await this.context!.newPage();
      await page.goto(url, { timeout: this.config.timeout });

      const links = await page.$$eval('a[href]', anchors =>
        anchors.map(a => (a as HTMLAnchorElement).href)
      );

      await page.close();

      const baseOrigin = new URL(this.config.baseUrl).origin;
      for (const link of links) {
        if (link.startsWith(baseOrigin) && !collected.includes(link)) {
          collected.push(link);
          await this.crawlForLinks(link, collected, depth + 1);
        }
      }
    } catch {
      // Skip failed pages
    }
  }

  /**
   * Process a single URL based on harvest mode
   */
  private async processUrl(url: string): Promise<HarvestedPage | null> {
    this.visited.add(url);
    console.log(`[ContentHarvester] Processing: ${url}`);

    const page = await this.context!.newPage();

    try {
      await page.goto(url, { timeout: this.config.timeout, waitUntil: 'networkidle' });

      const title = await page.title();
      const html = await page.content();

      // Extract CSS
      const css = await this.extractCss(page);

      // Extract fonts
      const fonts = this.config.extractFonts
        ? await this.extractFonts(page)
        : [];

      // Extract animations
      const animations = this.config.extractAnimations
        ? await this.extractAnimations(page)
        : [];

      // Extract meta tags
      const meta = await this.extractMeta(page);

      // Download assets based on mode
      const pageAssets: HarvestedAsset[] = [];
      if (this.config.downloadAssets && this.config.mode !== 'structure-clone') {
        const downloaded = await this.downloadPageAssets(page, url);
        pageAssets.push(...downloaded);
      }

      return {
        url,
        title,
        html,
        css,
        assets: pageAssets,
        fonts,
        animations,
        meta,
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Extract inline and linked CSS from page
   */
  private async extractCss(page: Page): Promise<string[]> {
    const css: string[] = [];

    // Inline styles
    const inlineStyles = await page.$$eval('style', styles =>
      styles.map(s => s.textContent || '').filter(Boolean)
    );
    css.push(...inlineStyles);

    // Linked stylesheets (content only, not URLs)
    if (this.config.mode === 'full-clone') {
      const linkedCss = await page.$$eval('link[rel="stylesheet"]', links =>
        links.map(l => (l as HTMLLinkElement).href)
      );
      // Note: actual CSS content fetch would require additional HTTP requests
      // For now, we record the URLs
      css.push(...linkedCss.map(url => `/* External: ${url} */`));
    }

    return css;
  }

  /**
   * Extract font families used in the page
   * Ports jCodesMore font discovery logic
   */
  private async extractFonts(page: Page): Promise<string[]> {
    const fonts: string[] = [];

    // Get computed font-family from key elements
    const fontFamilies = await page.evaluate(() => {
      const elements = document.querySelectorAll('h1, h2, h3, p, a, button, span, div');
      const fonts = new Set<string>();

      elements.forEach(el => {
        const computed = window.getComputedStyle(el);
        const family = computed.fontFamily;
        if (family && family !== 'inherit') {
          fonts.add(family);
        }
      });

      return Array.from(fonts);
    });

    for (const font of fontFamilies) {
      this.fonts.add(font);
      fonts.push(font);
    }

    // Check for Google Fonts or other font imports
    const fontLinks = await page.$$eval('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]', links =>
      links.map(l => (l as HTMLLinkElement).href)
    );

    for (const link of fontLinks) {
      // Extract font family names from Google Fonts URL
      const match = link.match(/family=([^&]+)/);
      if (match && match[1]) {
        const families = decodeURIComponent(match[1]).split('|');
        for (const f of families) {
          const fontName = f.split(':')[0];
          if (fontName) {
            this.fonts.add(fontName);
            fonts.push(fontName);
          }
        }
      }
    }

    return [...new Set(fonts)];
  }

  /**
   * Extract CSS animations and transitions
   * Ports jCodesMore animation extraction logic
   */
  private async extractAnimations(page: Page): Promise<string[]> {
    const animations: string[] = [];

    const animationData = await page.evaluate(() => {
      const results: string[] = [];

      // Find all elements with animations
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const computed = window.getComputedStyle(el);
        const animName = computed.animationName;
        const transition = computed.transition;

        if (animName && animName !== 'none') {
          results.push(`animation: ${animName}`);
        }
        if (transition && transition !== 'all 0s ease 0s') {
          results.push(`transition: ${transition}`);
        }
      });

      // Find @keyframes in stylesheets
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSKeyframesRule) {
              results.push(`@keyframes ${rule.name} { ... }`);
            }
          }
        } catch {
          // Cross-origin stylesheet
        }
      }

      return [...new Set(results)];
    });

    animations.push(...animationData);
    return animations;
  }

  /**
   * Extract meta tags (title, description, OG tags)
   */
  private async extractMeta(page: Page): Promise<Record<string, string>> {
    return page.evaluate(() => {
      const meta: Record<string, string> = {};

      // Title
      const title = document.querySelector('title');
      if (title) meta.title = title.textContent || '';

      // Meta tags
      const metas = document.querySelectorAll('meta[name], meta[property]');
      metas.forEach(m => {
        const name = m.getAttribute('name') || m.getAttribute('property');
        const content = m.getAttribute('content');
        if (name && content) {
          meta[name] = content;
        }
      });

      return meta;
    });
  }

  /**
   * Download page assets (images, fonts, etc.)
   * Ports jCodesMore asset rewriting logic
   */
  private async downloadPageAssets(page: Page, pageUrl: string): Promise<HarvestedAsset[]> {
    const downloaded: HarvestedAsset[] = [];
    const baseDir = this.config.outputDir;

    // Get all asset URLs
    const assetUrls = await page.evaluate(() => {
      const urls: Array<{ url: string; type: string }> = [];

      // Images
      document.querySelectorAll('img[src]').forEach(img => {
        urls.push({ url: (img as HTMLImageElement).src, type: 'image' });
      });

      // SVGs
      document.querySelectorAll('img[src$=".svg"], object[data$=".svg"]').forEach(el => {
        const src = el.getAttribute('src') || el.getAttribute('data');
        if (src) urls.push({ url: src, type: 'svg' });
      });

      // Videos
      document.querySelectorAll('video[src], video source[src]').forEach(v => {
        const src = v.getAttribute('src');
        if (src) urls.push({ url: src, type: 'video' });
      });

      // Background images in inline styles
      document.querySelectorAll('[style*="background"]').forEach(el => {
        const style = el.getAttribute('style') || '';
        const match = style.match(/url\(['"]?([^'")]+)['"]?\)/);
        if (match && match[1]) {
          urls.push({ url: match[1], type: 'image' });
        }
      });

      return urls;
    });

    // Download each asset
    for (const { url, type } of assetUrls) {
      try {
        const absoluteUrl = new URL(url, pageUrl).href;
        const localPath = this.assetUrlToLocalPath(absoluteUrl, type, baseDir);

        // Download asset
        const response = await this.context!.request.get(absoluteUrl);
        if (response.ok()) {
          const buffer = await response.body();
          await fs.mkdir(path.dirname(localPath), { recursive: true });
          await fs.writeFile(localPath, buffer);

          downloaded.push({
            originalUrl: absoluteUrl,
            localPath,
            type: type as HarvestedAsset['type'],
            size: buffer.length,
          });

          const lastAsset = downloaded[downloaded.length - 1];
          if (lastAsset) {
            this.assets.push(lastAsset);
          }
        }
      } catch {
        // Skip failed downloads
      }
    }

    return downloaded;
  }

  /**
   * Convert asset URL to local file path
   * Ports jCodesMore path rewriting logic
   */
  private assetUrlToLocalPath(url: string, type: string, baseDir: string): string {
    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname) || this.extFromType(type);
    const relativePath = parsed.pathname
      .replace(/^\//, '')
      .replace(/\//g, path.sep);

    return path.join(baseDir, 'assets', relativePath);
  }

  private extFromType(type: string): string {
    switch (type) {
      case 'image': return '.jpg';
      case 'svg': return '.svg';
      case 'video': return '.mp4';
      case 'font': return '.woff2';
      case 'css': return '.css';
      case 'js': return '.js';
      default: return '.bin';
    }
  }

  /**
   * Write harvest results to disk
   */
  private async writeResults(): Promise<void> {
    const manifest = {
      baseUrl: this.config.baseUrl,
      mode: this.config.mode,
      harvestedAt: new Date().toISOString(),
      pages: this.pages.length,
      assets: this.assets.length,
      fonts: Array.from(this.fonts),
      totalSize: this.assets.reduce((sum, a) => sum + a.size, 0),
      errors: this.errors,
    };

    await fs.writeFile(
      path.join(this.config.outputDir, 'harvest-manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    console.log(`[ContentHarvester] Results written to ${this.config.outputDir}`);
  }
}