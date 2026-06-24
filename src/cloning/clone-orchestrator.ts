import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';
import { LLMGateway } from '../core/llm-gateway.js';
import { ASTPatch, LLMConfig } from '../types/index.js';

const ASSET_EXT = /\.(png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|mov|avi|css)$/i;
const PAGE_EXT = /\.(html?|php|aspx|jsp|cfm|shtml|pdf|zip|json|xml|txt)$/i;
const SKIP_PATHS = /^\/(cdn|assets|static|uploads|images|media|fonts|video|api|admin|cart|account|checkout)\b/i;
const SKIP_CRAWL = /^\/(es\/|search$|blogs\/[^/]+\/tagged\/|.*\.atom$)/i;

interface CrawledPage {
  url: string;
  pagePath: string;
  title: string;
  text: string;
  meta: Record<string, string>;
  images: string[];
  videos: string[];
  fonts: string[];
  cssUrls: string[];
  links: string[];
  navItems: Array<{ label: string; href: string }>;
  forms: Array<{ action: string; method: string; fields: string[] }>;
  sectionSummaries: string[];
  designTokens: {
    colors: string[];
    fonts: string[];
    fontSizes: string[];
    borderRadii: string[];
    shadows: string[];
    gradients: string[];
  };
  animations: string[];
  svgInlines: string[];
}

interface AssetEntry {
  originalUrl: string;
  localPath: string;
  localFileName: string;
  category: 'image' | 'video' | 'font' | 'svg' | 'css' | 'other';
  size: number;
  status: 'ok' | 'failed' | 'skipped';
}

export interface CloneResult {
  success: boolean;
  pages: number;
  patches: ASTPatch[];
  assets: number;
  duration: number;
  error?: string;
}

export class CloneOrchestrator {
  private workspaceRoot: string;
  private gateway: LLMGateway;
  private logFn: ((step: string, msg: string, data?: Record<string, unknown>) => void) | undefined;
  private phaseFn: ((step: string, msg: string, data?: Record<string, unknown>) => void) | undefined;

  constructor(
    workspaceRoot: string,
    llmConfig: LLMConfig,
    logFn: ((step: string, msg: string, data?: Record<string, unknown>) => void) | undefined,
    phaseFn: ((step: string, msg: string, data?: Record<string, unknown>) => void) | undefined,
  ) {
    this.workspaceRoot = workspaceRoot;
    this.gateway = new LLMGateway(llmConfig);
    this.logFn = logFn;
    this.phaseFn = phaseFn;
  }

  private log(msg: string) { console.log(`[clone] ${msg}`); this.logFn?.('clone', msg); }
  private phase(msg: string, data?: Record<string, unknown>) { this.phaseFn?.('phase', msg, data); }

  async clone(targetUrl: string): Promise<CloneResult> {
    const startTime = Date.now();
    let url = targetUrl.trim();
    if (!url.match(/^https?:\/\//i)) url = `https://${url}`;
    this.log(`Starting full clone of ${url}`);

    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

      // ── Phase 1: Crawl all pages ────────────────────────────────
      this.phase('Crawling website', { url });
      const crawled = await this.crawlSite(browser, url);
      if (crawled.length === 0) throw new Error('No pages discovered');
      this.phase('Crawling complete', {
        pagesFound: crawled.length,
        pages: crawled.map(p => ({ path: p.pagePath, title: p.title, images: p.images.length, videos: p.videos.length })),
      });

      // ── Phase 2: Discover + download ALL assets ─────────────────
      this.phase('Downloading assets');
      const assetsDir = path.join(this.workspaceRoot, 'public', 'assets');
      fs.mkdirSync(assetsDir, { recursive: true });
      const allAssets = await this.downloadAllAssets(browser, crawled, assetsDir);

      const byCat = { image: 0, video: 0, font: 0, svg: 0, css: 0, other: 0 };
      for (const a of allAssets) { if (a.status === 'ok') byCat[a.category]++; }
      this.phase('Assets downloaded', {
        total: allAssets.length,
        downloaded: allAssets.filter(a => a.status === 'ok').length,
        failed: allAssets.filter(a => a.status === 'failed').length,
        byCategory: byCat,
        assets: allAssets.filter(a => a.status === 'ok').map(a => ({ url: a.originalUrl, local: a.localPath, category: a.category, size: a.size })),
      });

      // ── Phase 3: Generate page components (template-batched) ────
      const assetMap = new Map<string, string>();
      for (const a of allAssets) { if (a.status === 'ok') assetMap.set(a.originalUrl, a.localPath); }

      // Filter non-content pages that don't need unique components
      const SKIP_GEN = /^\/(es\/|search$|blogs\/[^/]+\/tagged\/|.*\.atom$)/i;
      const generatable = crawled.filter(p => !SKIP_GEN.test(p.pagePath));
      const skipped = crawled.filter(p => SKIP_GEN.test(p.pagePath));
      if (skipped.length > 0) this.log(`Skipping ${skipped.length} non-content pages (locale/tag/atom/search)`);

      // Group pages by type for template reuse
      const groups = this.groupPagesByType(generatable);
      this.log(`Page groups: ${Object.entries(groups).map(([k, v]) => `${k}(${v.length})`).join(', ')}`);

      const patches: ASTPatch[] = [];
      const typeComponents = new Map<string, ASTPatch[]>();
      let totalLlmCalls = 0;
      const MAX_LLM_CALLS = 15;
      let llmAvailable = true;

      for (const [type, pages] of Object.entries(groups)) {
        if (totalLlmCalls >= MAX_LLM_CALLS) {
          this.log(`Hit LLM call cap (${MAX_LLM_CALLS}), using templates for remaining ${type} pages`);
          break;
        }
        this.phase('Generating components', { pagesTotal: generatable.length, pagesDone: patches.length, currentPage: pages[0]!.pagePath, groupType: type });

        if (llmAvailable) {
          try {
            const delay = Math.min(3000 + (totalLlmCalls * 1500), 30000);
            await new Promise(r => setTimeout(r, delay));

            if (pages.length === 1) {
              const pagePatches = await this.generatePage(pages[0]!, crawled, assetMap);
              typeComponents.set(type, pagePatches);
              patches.push(...pagePatches);
            } else {
              const templatePatches = await this.generatePage(pages[0]!, crawled, assetMap);
              typeComponents.set(type, templatePatches);
              patches.push(...templatePatches);

              for (let i = 1; i < pages.length; i++) {
                if (totalLlmCalls >= MAX_LLM_CALLS) break;
                const adapted = await this.adaptPageFromTemplate(pages[i]!, pages[0]!, templatePatches, crawled, assetMap);
                patches.push(...adapted);
              }
            }
            totalLlmCalls++;
            this.log(`Generated ${type} template (${pages.length} pages, ${totalLlmCalls} LLM calls so far)`);
          } catch (err: any) {
            if (err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
              this.log(`Gemini quota exhausted — falling back to no-LLM template generation for all remaining pages`);
              llmAvailable = false;
            } else {
              this.log(`LLM failed for ${type}: ${err.message}. Falling back to no-LLM templates.`);
              llmAvailable = false;
            }
          }
        }

        // No-LLM fallback: generate components from crawled data
        if (!llmAvailable) {
          for (const page of pages) {
            const routePath = page.pagePath === '/' ? '' : page.pagePath.replace(/^\//, '');
            const targetFile = page.pagePath === '/' ? 'src/app/page.tsx' : `src/app/${routePath}/page.tsx`;
            const filePath = path.join(this.workspaceRoot, targetFile);
            if (fs.existsSync(filePath)) continue;
            const code = this.generateTemplatePage(page, crawled, assetMap);
            patches.push({ action: 'insert', targetFile, codeBlock: code });
          }
          this.log(`Generated ${pages.length} ${type} pages from templates (no LLM)`);
        }
      }
      this.log(`Generated ${patches.length} patches in ${totalLlmCalls} LLM calls`);

      // ── Phase 4: Generate layout + global CSS ───────────────────
      this.phase('Generating layout');
      const delay4 = Math.min(3000 + (totalLlmCalls * 1500), 30000);
      await new Promise(r => setTimeout(r, delay4));
      try {
        const layoutPatches = await this.generateLayout(crawled, assetMap);
        patches.push(...layoutPatches);
      } catch (err: any) {
        this.log(`Layout LLM failed, writing fallback layout: ${err.message}`);
        const fallbackPatches = this.generateFallbackLayout(crawled, assetMap);
        patches.push(...fallbackPatches);
      }

      // ── Phase 4b: Generate zero-404 infrastructure ──────────────
      this.phase('Generating zero-404 infrastructure');
      const infraPatches = await this.generateZeroFourFourInfra(crawled);
      patches.push(...infraPatches);

      // ── Phase 5: Write all files ────────────────────────────────
      this.phase('Writing files', { totalPatches: patches.length });
      const written = this.applyPatches(patches);

      // ── Phase 5b: Self-contained post-process ───────────────────
      this.phase('Making self-contained');
      this.selfContainedPostProcess(assetMap, crawled);

      await browser.close();

      const duration = Date.now() - startTime;
      this.phase('Clone complete', {
        pages: crawled.length,
        assets: allAssets.filter(a => a.status === 'ok').length,
        files: written.length,
        duration,
      });
      this.log(`Done: ${crawled.length} pages, ${allAssets.filter(a => a.status === 'ok').length} assets, ${written.length} files in ${(duration / 1000).toFixed(1)}s`);

      return { success: true, pages: crawled.length, patches, assets: allAssets.filter(a => a.status === 'ok').length, duration };
    } catch (err: any) {
      this.log(`Clone failed: ${err.message}`);
      this.phase('Clone failed', { error: err.message });
      return { success: false, pages: 0, patches: [], assets: 0, duration: Date.now() - startTime, error: err.message };
    }
  }

  // ─── Phase 1: Crawl (using page.content + jsdom) ────────────────

  private async crawlSite(browser: any, rootUrl: string): Promise<CrawledPage[]> {
    const root = new URL(rootUrl);
    const origin = root.origin;
    const visited = new Set<string>();
    const queue = [root.pathname];
    const results: CrawledPage[] = [];
    const MAX_PAGES = 30;

    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    });

    const CRAWL_TIMEOUT_MS = 120_000; // 2 min total crawl timeout
    const PAGE_TIMEOUT_MS = 15_000; // 15s per page
    const crawlStart = Date.now();

    while (queue.length > 0 && results.length < MAX_PAGES) {
      if (Date.now() - crawlStart > CRAWL_TIMEOUT_MS) {
        this.log(`Crawl timeout after ${CRAWL_TIMEOUT_MS / 1000}s — stopping with ${results.length} pages`);
        break;
      }
      const pagePath = queue.shift()!;
      const normalized = pagePath === '' ? '/' : pagePath.split('?')[0]!.split('#')[0]!;
      if (visited.has(normalized)) continue;
      if (SKIP_PATHS.test(normalized)) continue;
      if (SKIP_CRAWL.test(normalized)) continue;
      if (ASSET_EXT.test(normalized)) continue;
      visited.add(normalized);

      const fullUrl = normalized === '/' ? origin : `${origin}${normalized}`;
      this.log(`Crawling: ${normalized}`);

      let page: any = null;
      try {
        page = await ctx.newPage();
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
        await page.waitForTimeout(1500);

        // Get rendered HTML and parse with jsdom (avoids __name serialization issue)
        const html = await page.content();
        const dom = new JSDOM(html, { url: fullUrl });
        const doc = dom.window.document;

        const title = doc.title || '';
        const meta: Record<string, string> = {};
        doc.querySelectorAll('meta[name], meta[property]').forEach((el: Element) => {
          const key = el.getAttribute('name') || el.getAttribute('property');
          const val = el.getAttribute('content');
          if (key && val) meta[key] = val;
        });

        const links: string[] = [];
        const linkSeen = new Set<string>();
        doc.querySelectorAll('a[href]').forEach((a: Element) => {
          const href = a.getAttribute('href');
          if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
          try {
            const parsed = new URL(href, origin);
            if (parsed.origin === origin) {
              const p = parsed.pathname.split('?')[0]!.split('#')[0]!;
              if (!linkSeen.has(p)) { linkSeen.add(p); links.push(p); }
            }
          } catch {}
        });

        const navItems: Array<{ label: string; href: string }> = [];
        const navSeen = new Set<string>();
        doc.querySelectorAll('nav a[href], header a[href], [role="navigation"] a[href]').forEach((a: Element) => {
          const href = a.getAttribute('href') || '';
          const text = (a.textContent || '').trim();
          if (text && text.length < 60 && !navSeen.has(text)) { navSeen.add(text); navItems.push({ label: text, href }); }
        });

        const forms: Array<{ action: string; method: string; fields: string[] }> = [];
        doc.querySelectorAll('form').forEach((f: Element) => {
          const fields: string[] = [];
          f.querySelectorAll('input, textarea, select').forEach((inp: Element) => { fields.push(`${inp.getAttribute('name') || inp.id || 'field'}:${inp.getAttribute('type') || inp.tagName.toLowerCase()}`); });
          forms.push({ action: f.getAttribute('action') || '', method: f.getAttribute('method') || 'get', fields });
        });

        // ── Images ──
        const images: string[] = [];
        const imgSeen = new Set<string>();
        const addImg = (src: string) => {
          if (!src) return;
          if (src.startsWith('data:')) return;
          let resolved: string;
          try { resolved = new URL(src, origin).href; } catch { return; }
          if (!imgSeen.has(resolved)) { imgSeen.add(resolved); images.push(resolved); }
        };

        doc.querySelectorAll('img').forEach((img: Element) => {
          addImg(img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '');
          const srcset = img.getAttribute('srcset');
          if (srcset) {
            srcset.split(',').forEach((s: string) => {
              const url = s.trim().split(' ')[0];
              if (url) addImg(url);
            });
          }
        });
        doc.querySelectorAll('picture source').forEach((s: Element) => {
          const srcset = s.getAttribute('srcset');
          if (srcset) srcset.split(',').forEach((entry: string) => { const url = entry.trim().split(' ')[0]; if (url) addImg(url); });
        });
        doc.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((el: Element) => {
          addImg(el.getAttribute('href') || '');
        });
        doc.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach((el: Element) => {
          addImg(el.getAttribute('content') || '');
        });

        // ── Videos ──
        const videos: string[] = [];
        const vidSeen = new Set<string>();
        doc.querySelectorAll('video').forEach((v: Element) => {
          const src = v.getAttribute('src') || '';
          if (src && !vidSeen.has(src)) { vidSeen.add(src); videos.push(src); }
          v.querySelectorAll('source').forEach((s: Element) => {
            const sSrc = s.getAttribute('src') || '';
            if (sSrc && !vidSeen.has(sSrc)) { vidSeen.add(sSrc); videos.push(sSrc); }
          });
          const poster = v.getAttribute('poster');
          if (poster) addImg(poster);
        });
        doc.querySelectorAll('iframe').forEach((f: Element) => {
          const src = f.getAttribute('src') || '';
          if ((src.includes('youtube') || src.includes('vimeo') || src.includes('dailymotion')) && !vidSeen.has(src)) { vidSeen.add(src); videos.push(src); }
        });

        // ── Fonts ──
        const fonts: string[] = [];
        const fontSeen = new Set<string>();
        doc.querySelectorAll('link[href*="font"], link[href*="googleapis.com/css2"], link[href*="fonts.googleapis"]').forEach((el: Element) => {
          const href = el.getAttribute('href');
          if (href && !fontSeen.has(href)) { fontSeen.add(href); fonts.push(href); }
        });

        // ── SVG inlines ──
        const svgInlines: string[] = [];
        doc.querySelectorAll('svg').forEach((svg: Element) => {
          const html = svg.outerHTML;
          if (html.length < 5000) svgInlines.push(html);
        });

        // ── CSS files ──
        const cssUrls: string[] = [];
        doc.querySelectorAll('link[rel="stylesheet"]').forEach((el: Element) => {
          const href = el.getAttribute('href');
          if (href) cssUrls.push(href);
        });

        // ── Text ──
        const text = (doc.body?.textContent || '').slice(0, 10000);

        // ── Section summaries ──
        const sectionSummaries: string[] = [];
        const bodyChildren = doc.body?.children;
        if (bodyChildren) {
          for (let i = 0; i < bodyChildren.length; i++) {
            const el = bodyChildren[i] as HTMLElement;
            if (!el || el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'NOSCRIPT') continue;
            const tag = el.tagName.toLowerCase();
            const id = el.id ? '#' + el.id : '';
            const cls = el.className ? '.' + String(el.className).split(' ').slice(0, 2).join('.') : '';
            const txt = (el.textContent || '').slice(0, 300).trim();
            const imgCount = el.querySelectorAll('img').length;
            const vidCount = el.querySelectorAll('video').length;
            sectionSummaries.push(tag + id + cls + ': "' + txt + '" imgs=' + imgCount + ' vids=' + vidCount);
          }
        }

        // ── Design tokens from computed styles via Playwright ──
        // We use a minimal evaluate here - just returning raw computed style values as strings
        const designTokens = await this.extractDesignTokens(page);
        const animations = await this.extractAnimations(page);

        results.push({
          url: fullUrl, pagePath: normalized, title, text, meta,
          images, videos, fonts, cssUrls, links,
          navItems, forms, sectionSummaries,
          designTokens, animations, svgInlines,
        });

        // Queue only page-like internal links
        for (const link of links) {
          if (visited.has(link) || queue.includes(link)) continue;
          if (ASSET_EXT.test(link) || PAGE_EXT.test(link)) continue;
          if (SKIP_PATHS.test(link)) continue;
          queue.push(link);
        }

        await page.close();
      } catch (err: any) {
        this.log(`Failed to crawl ${normalized}: ${err.message}`);
        if (page) { try { await page.close(); } catch {} }
      }
    }

    return results;
  }

  private async extractDesignTokens(page: any): Promise<CrawledPage['designTokens']> {
    try {
      // Use a minimal evaluate that only returns primitive string arrays
      const tokens = await page.evaluate(`(() => {
        var colorSet = {}, fontSet = {}, sizeSet = {}, radiusSet = {}, shadowSet = {}, gradientSet = {};
        var allEls = document.querySelectorAll('*');
        var limit = Math.min(allEls.length, 500);
        for (var i = 0; i < limit; i++) {
          try {
            var cs = window.getComputedStyle(allEls[i]);
            if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') colorSet[cs.backgroundColor] = 1;
            if (cs.color) colorSet[cs.color] = 1;
            if (cs.borderColor && cs.borderColor !== 'rgb(0, 0, 0)') colorSet[cs.borderColor] = 1;
            var ff = cs.fontFamily; if (ff) { var f = ff.split(',')[0]; if (f) fontSet[f.replace(/"/g, '').trim()] = 1; }
            if (cs.fontSize) sizeSet[cs.fontSize] = 1;
            if (cs.borderRadius && cs.borderRadius !== '0px') radiusSet[cs.borderRadius] = 1;
            if (cs.boxShadow && cs.boxShadow !== 'none') shadowSet[cs.boxShadow] = 1;
            if (cs.backgroundImage && cs.backgroundImage.indexOf('gradient') !== -1) gradientSet[cs.backgroundImage] = 1;
          } catch(e) {}
        }
        return {
          colors: Object.keys(colorSet).slice(0, 30),
          fonts: Object.keys(fontSet).slice(0, 15),
          fontSizes: Object.keys(sizeSet).slice(0, 15),
          borderRadii: Object.keys(radiusSet).slice(0, 10),
          shadows: Object.keys(shadowSet).slice(0, 10),
          gradients: Object.keys(gradientSet).slice(0, 8)
        };
      })()`);
      return tokens || { colors: [], fonts: [], fontSizes: [], borderRadii: [], shadows: [], gradients: [] };
    } catch {
      return { colors: [], fonts: [], fontSizes: [], borderRadii: [], shadows: [], gradients: [] };
    }
  }

  private async extractAnimations(page: any): Promise<string[]> {
    try {
      const anims = await page.evaluate(`(() => {
        var animations = [];
        var animSeen = {};
        document.querySelectorAll('style').forEach(function(s) {
          var text = s.textContent || '';
          var matches = text.matchAll(/@keyframes\\s+([^\\s{]+)/g);
          for (var m of matches) { var name = m[1]; if (name && !animSeen[name]) { animSeen[name] = 1; animations.push(name); } }
        });
        var allEls = document.querySelectorAll('*');
        for (var i = 0; i < allEls.length && i < 500; i++) {
          try {
            var cs = window.getComputedStyle(allEls[i]);
            var t = cs.transition;
            if (t && t !== 'all 0s ease 0s' && t !== 'none' && !animSeen[t]) { animSeen[t] = 1; animations.push('transition: ' + t); }
            var a = cs.animation;
            if (a && a !== 'none' && !animSeen[a]) { animSeen[a] = 1; animations.push('animation: ' + a); }
          } catch(e) {}
        }
        return animations.slice(0, 30);
      })()`);
      return anims || [];
    } catch {
      return [];
    }
  }

  // ─── Phase 2: Download ALL assets ────────────────────────────────

  private async downloadAllAssets(browser: any, pages: CrawledPage[], assetsDir: string): Promise<AssetEntry[]> {
    const urlSet = new Map<string, string>();
    for (const p of pages) {
      for (const img of p.images) urlSet.set(img, 'image');
      for (const vid of p.videos) urlSet.set(vid, 'video');
      for (const font of p.fonts) urlSet.set(font, 'font');
    }

    const results: AssetEntry[] = [];
    const urls = [...urlSet.entries()];
    const ctx = await browser.newContext();

    for (let i = 0; i < urls.length; i += 8) {
      const batch = urls.slice(i, i + 8);
      await Promise.all(batch.map(async ([url, hint]) => {
        const category = this.categorizeAsset(url, hint);
        if (category === 'svg') {
          try {
            const page = await ctx.newPage();
            const resp = await page.goto(url, { timeout: 10000 });
            if (resp && resp.ok()) {
              const text = await resp.text();
              const safeName = url.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 120) + '.svg';
              const filePath = path.join(assetsDir, safeName);
              fs.writeFileSync(filePath, text, 'utf-8');
              results.push({ originalUrl: url, localPath: '/assets/' + safeName, localFileName: safeName, category, size: Buffer.byteLength(text), status: 'ok' });
            } else {
              results.push({ originalUrl: url, localPath: '', localFileName: '', category, size: 0, status: 'failed' });
            }
            await page.close();
          } catch {
            results.push({ originalUrl: url, localPath: '', localFileName: '', category, size: 0, status: 'failed' });
          }
          return;
        }

        if (category === 'font' && url.includes('googleapis.com')) {
          try {
            const page = await ctx.newPage();
            const resp = await page.goto(url, { timeout: 10000 });
            if (resp && resp.ok()) {
              const cssText = await resp.text();
              const fontUrls = [...cssText.matchAll(/url\(([^)]+)\)/g)].map(m => m[1].replace(/['"]/g, ''));
              for (const fUrl of fontUrls) {
                if (!fUrl.startsWith('http')) continue;
                const fResp = await page.goto(fUrl, { timeout: 10000 });
                if (fResp && fResp.ok()) {
                  const buf = await fResp.body();
                  const ext = fUrl.split('.').pop()?.split('?')[0] || 'woff2';
                  const safeName = fUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 120) + '.' + ext;
                  fs.writeFileSync(path.join(assetsDir, safeName), buf);
                  results.push({ originalUrl: fUrl, localPath: '/assets/' + safeName, localFileName: safeName, category: 'font', size: buf.length, status: 'ok' });
                }
              }
            }
            await page.close();
          } catch {}
          return;
        }

        try {
          const ext = this.guessExt(url, category);
          const safeName = url.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 120) + '.' + ext;
          const localPath = '/assets/' + safeName;
          const filePath = path.join(assetsDir, safeName);
          const page = await ctx.newPage();
          const resp = await page.goto(url, { timeout: 15000 });
          if (resp && resp.ok()) {
            const buf = await resp.body();
            fs.writeFileSync(filePath, buf);
            results.push({ originalUrl: url, localPath, localFileName: safeName, category, size: buf.length, status: 'ok' });
          } else {
            results.push({ originalUrl: url, localPath: '', localFileName: '', category, size: 0, status: 'failed' });
          }
          await page.close();
        } catch {
          results.push({ originalUrl: url, localPath: '', localFileName: '', category, size: 0, status: 'failed' });
        }
      }));
    }

    await ctx.close();
    return results;
  }

  private categorizeAsset(url: string, hint: string): AssetEntry['category'] {
    if (hint) return hint as AssetEntry['category'];
    if (/\.svg$/i.test(url)) return 'svg';
    if (/\.(mp4|webm|mov|avi)$/i.test(url) || url.includes('video')) return 'video';
    if (/\.(woff2?|ttf|otf|eot)$/i.test(url) || url.includes('font')) return 'font';
    if (/\.css$/i.test(url)) return 'css';
    if (/\.(png|jpe?g|gif|webp|avif|ico)$/i.test(url)) return 'image';
    return 'other';
  }

  private guessExt(url: string, category: string): string {
    try {
      const pathname = new URL(url).pathname;
      const ext = pathname.split('.').pop()?.split('?')[0]?.toLowerCase();
      if (ext && ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'avif', 'mp4', 'webm', 'woff', 'woff2', 'ttf', 'otf', 'eot', 'mov'].includes(ext)) return ext;
    } catch {}
    switch (category) {
      case 'video': return 'mp4';
      case 'font': return 'woff2';
      case 'svg': return 'svg';
      default: return 'png';
    }
  }

  // ─── Phase 3: Generate page components ───────────────────────────

  private async generatePage(page: CrawledPage, allPages: CrawledPage[], assetMap: Map<string, string>): Promise<ASTPatch[]> {
    const routePath = page.pagePath === '/' ? '' : page.pagePath.replace(/^\//, '');
    const localImages = page.images.map(src => assetMap.get(src) || src);
    const localVideos = page.videos.map(src => assetMap.get(src) || src);

    // Build a map of all internal links that have corresponding pages
    const pagePaths = new Set(allPages.map(p => p.pagePath));
    const navLinks = page.navItems.map(n => {
      try {
        const parsed = new URL(n.href, page.url);
        const p = parsed.pathname.split('?')[0]!.split('#')[0]!;
        const hasPage = pagePaths.has(p) || pagePaths.has(p + '/') || pagePaths.has(p.replace(/\/$/, ''));
        return { label: n.label, href: hasPage ? (p === '/' ? '/' : p) : n.href, isInternal: hasPage };
      } catch {
        return { label: n.label, href: n.href, isInternal: false };
      }
    });

    const prompt = `You are a pixel-perfect website cloning engine. Reproduce this page EXACTLY.

PAGE: "${page.title}" — ${page.url}
ROUTE: /${routePath || ''}

VERBATIM TEXT (copy exactly):
${page.text.slice(0, 5000)}

SECTIONS (top to bottom):
${page.sectionSummaries.join('\n')}

NAVIGATION (use <Link href="..."> from 'next/link' for internal links):
${navLinks.map(n => n.isInternal ? `- [INTERNAL] ${n.label} → ${n.href}` : `- [EXTERNAL] ${n.label} → ${n.href}`).join('\n')}

ALL AVAILABLE PAGES (for internal linking):
${allPages.map(p => `- ${p.pagePath === '/' ? '/' : p.pagePath}`).join('\n')}

IMAGES (use local /assets/ paths via assetMap):
${localImages.slice(0, 30).map((src) => `- ${src}`).join('\n')}

VIDEOS:
${localVideos.map(src => `- ${src}`).join('\n')}

DESIGN TOKENS (use exact values):
- Colors: ${page.designTokens.colors.slice(0, 15).join(', ')}
- Fonts: ${page.designTokens.fonts.slice(0, 8).join(', ')}
- Font sizes: ${page.designTokens.fontSizes.slice(0, 10).join(', ')}
- Border radii: ${page.designTokens.borderRadii.slice(0, 6).join(', ')}
- Shadows: ${page.designTokens.shadows.slice(0, 4).join('; ')}
- Gradients: ${page.designTokens.gradients.slice(0, 3).join('; ')}

ANIMATIONS: ${page.animations.slice(0, 5).join('; ')}

FORMS:
${page.forms.map(f => `${f.method.toUpperCase()} ${f.action} — ${f.fields.join(', ')}`).join('\n')}

META: ${Object.entries(page.meta).slice(0, 8).map(([k, v]) => `${k}: ${v}`).join('\n')}

SVGs on page: ${page.svgInlines.length} inline SVGs

CRITICAL RULES — ZERO 404 GUARANTEE:
1. Use EXACT text. Never invent content.
2. Use EXACT colors, fonts, sizes from tokens.
3. Use <img src="/assets/..."> for ALL images. NEVER use external URLs for images.
4. Use <video src="/assets/..."> for ALL videos. NEVER use external URLs for videos.
5. Include ALL sections in order.
6. Use Tailwind classes matching extracted tokens.
7. Export default the component.
8. Responsive — must work on mobile.
9. MUST import Link from 'next/link': import Link from 'next/link';
10. For ALL internal navigation links, use <Link href="/path"> — NEVER use <a href="..."> for internal pages.
11. For external links, use <a href="..." target="_blank" rel="noopener noreferrer">.
12. Every nav item marked [INTERNAL] MUST use <Link href="..."> with the exact href shown.
${page.pagePath === '/' ? 'This is the HOMEPAGE.' : `This is the "${routePath}" page.`}

Generate a complete Next.js App Router page component.`;

    const code = await this.gateway.generateRawCode(prompt);
    return [{ action: 'insert', targetFile: page.pagePath === '/' ? 'src/app/page.tsx' : `src/app/${routePath}/page.tsx`, codeBlock: code }];
  }

  // ─── Page grouping by type ────────────────────────────────────────

  private groupPagesByType(pages: CrawledPage[]): Record<string, CrawledPage[]> {
    const groups: Record<string, CrawledPage[]> = {};
    for (const page of pages) {
      let type: string;
      if (page.pagePath === '/') {
        type = 'home';
      } else if (/^\/collections\/[^/]+$/.test(page.pagePath)) {
        type = 'collection';
      } else if (/\/products\//.test(page.pagePath)) {
        type = 'product';
      } else if (/\/blogs\//.test(page.pagePath)) {
        type = 'blog';
      } else if (/\/policies\//.test(page.pagePath)) {
        type = 'policy';
      } else if (/\/pages\//.test(page.pagePath)) {
        type = 'page';
      } else {
        type = 'other';
      }
      if (!groups[type]) groups[type] = [];
      groups[type]!.push(page);
    }
    return groups;
  }

  // ─── Template adaptation (no extra LLM call) ──────────────────────
  // Adapts a template's patches for a different page by replacing page-specific data

  private async adaptPageFromTemplate(
    targetPage: CrawledPage,
    templatePage: CrawledPage,
    templatePatches: ASTPatch[],
    allPages: CrawledPage[],
    assetMap: Map<string, string>,
  ): Promise<ASTPatch[]> {
    const routePath = targetPage.pagePath === '/' ? '' : targetPage.pagePath.replace(/^\//, '');
    const targetFile = targetPage.pagePath === '/' ? 'src/app/page.tsx' : `src/app/${routePath}/page.tsx`;

    // Check if the target file already exists (skip if so)
    const filePath = path.join(this.workspaceRoot, targetFile);
    if (fs.existsSync(filePath)) return [];

    // Find the main page patch from template
    const mainPatch = templatePatches.find(p =>
      p.targetFile.includes('page.tsx') && !p.targetFile.includes('layout')
    );
    if (!mainPatch) return [];

    // Adapt the code: replace template page's text/images with target page's data
    let code = mainPatch.codeBlock;

    // Replace title references
    code = code.replace(new RegExp(this.escapeRegex(templatePage.title), 'g'), targetPage.title);

    // Replace route references
    const templateRoute = templatePage.pagePath === '/' ? '' : templatePage.pagePath.replace(/^\//, '');
    if (templateRoute !== routePath) {
      code = code.replace(new RegExp(this.escapeRegex(templateRoute), 'g'), routePath);
    }

    // Replace image references — swap template page images with target page images
    const templateImages = templatePage.images.slice(0, 10);
    const targetImages = targetPage.images.slice(0, 10);
    for (let i = 0; i < Math.min(templateImages.length, targetImages.length); i++) {
      const tImg = templateImages[i];
      const tgtImg = targetImages[i];
      if (!tImg || !tgtImg) continue;
      const templateLocal = assetMap.get(tImg) || tImg;
      const targetLocal = assetMap.get(tgtImg) || tgtImg;
      if (templateLocal !== targetLocal) {
        code = code.split(templateLocal).join(targetLocal);
      }
    }

    // Replace text content — swap template page text with target page text
    const templateTextSnippet = templatePage.text.slice(0, 200);
    const targetTextSnippet = targetPage.text.slice(0, 200);
    if (templateTextSnippet && targetTextSnippet && templateTextSnippet !== targetTextSnippet) {
      // Only replace if the text is significantly different
      const templateFirst50 = templateTextSnippet.slice(0, 50);
      const targetFirst50 = targetTextSnippet.slice(0, 50);
      if (templateFirst50 !== targetFirst50) {
        code = code.replace(new RegExp(this.escapeRegex(templateFirst50), 'g'), targetFirst50);
      }
    }

    // Replace metadata
    if (targetPage.meta['og:title']) {
      code = code.replace(/og:title[^"]*"[^"]*"/, `og:title" content="${targetPage.meta['og:title']}"`);
    }

    return [{ action: 'insert', targetFile, codeBlock: code }];
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ─── Phase 4: Generate layout ────────────────────────────────────

  private async generateLayout(pages: CrawledPage[], assetMap: Map<string, string>): Promise<ASTPatch[]> {
    const home = pages.find(p => p.pagePath === '/') || pages[0]!;
    // Include ALL pages in the navigation
    const allPageLinks = pages.map(p => {
      const label = p.navItems.length > 0 ? p.navItems[0]!.label : p.title || p.pagePath;
      const href = p.pagePath === '/' ? '/' : p.pagePath;
      return `${label} → ${href}`;
    }).slice(0, 50);

    const prompt = `Generate a Next.js App Router layout.tsx and globals.css for a full website clone.

WEBSITE: "${home.title}"
NAVIGATION (MUST include ALL of these links using <Link href="..."> from 'next/link'):
${allPageLinks.map(l => `- ${l}`).join('\n')}
COLORS: ${home.designTokens.colors.slice(0, 10).join(', ')}
FONTS: ${home.designTokens.fonts.slice(0, 5).join(', ')}
BACKGROUND: ${home.designTokens.colors[0] || '#ffffff'}
ANIMATIONS: ${home.animations.slice(0, 5).join('; ')}

CRITICAL RULES:
1. MUST import Link from 'next/link': import Link from 'next/link';
2. Navigation MUST use <Link href="/path"> for ALL internal links — NEVER use <a href="..."> for internal pages.
3. Include ALL navigation links shown above in a responsive nav bar.
4. Include a footer with all important links.
5. Google Fonts links for the fonts listed above.
6. Use 'use client' only if needed (e.g., for interactive nav toggle).

Generate:
1. src/app/layout.tsx — Root layout with <html>, <body>, responsive nav header with hamburger menu, footer, Google Fonts links
2. src/app/globals.css — Tailwind imports + CSS variables + keyframe animations

Use exact fonts and colors. Self-contained output.`;

    const rawCode = await this.gateway.generateRawCode(prompt);

    // The LLM returns a single file — we need to split it into layout.tsx and globals.css
    // Look for CSS content markers
    const patches: ASTPatch[] = [];

    if (rawCode.includes('@tailwind') || rawCode.includes(':root') || rawCode.includes('.container')) {
      // Has CSS — split into layout + globals
      const cssMatch = rawCode.match(/@tailwind[\s\S]*/i) || rawCode.match(/:root[\s\S]*/i);
      if (cssMatch) {
        patches.push({ action: 'insert', targetFile: 'src/app/globals.css', codeBlock: cssMatch[0].trim() });
        // Layout is everything before CSS
        const layoutCode = rawCode.slice(0, rawCode.indexOf(cssMatch[0])).trim();
        if (layoutCode) patches.push({ action: 'insert', targetFile: 'src/app/layout.tsx', codeBlock: layoutCode });
      } else {
        patches.push({ action: 'insert', targetFile: 'src/app/layout.tsx', codeBlock: rawCode });
      }
    } else {
      patches.push({ action: 'insert', targetFile: 'src/app/layout.tsx', codeBlock: rawCode });
    }

    return patches;
  }

  // ─── No-LLM template page generator ─────────────────────────────
  // Generates a functional page component from crawled data without any LLM call

  private generateTemplatePage(page: CrawledPage, allPages: CrawledPage[], assetMap: Map<string, string>): string {
    const localImages = page.images.map(src => assetMap.get(src) || src).filter(src => src.startsWith('/'));
    const localVideos = page.videos.map(src => assetMap.get(src) || src).filter(src => src.startsWith('/'));
    const colors = page.designTokens.colors;
    const bgColor = colors[0] || '#09090b';
    const textColor = colors.find(c => c.includes('255') || c.includes('fff')) || '#fafafa';
    const accentColor = colors[1] || '#22c55e';

    const navLinks = allPages
      .filter(p => p.pagePath !== '/' && !p.pagePath.startsWith('/es/'))
      .map(p => {
        const label = p.title.split(/[|–—]/)[0]?.trim() || p.pagePath.split('/').pop() || p.pagePath;
        return `<Link href="${p.pagePath}" className="hover:text-white transition text-sm">${label}</Link>`;
      })
      .slice(0, 15);

    const heroImage = localImages[0] || '';
    const sectionImages = localImages.slice(1, 9);

    // Build sections from crawled section summaries
    const sections = page.sectionSummaries
      .filter(s => s.length > 20)
      .slice(0, 8)
      .map((summary, i) => {
        const text = summary.replace(/^[^:]+:\s*"?/, '').replace(/"?\s*(imgs=\d+\s*vids=\d+)?$/, '').trim();
        const img = sectionImages[i] || '';
        const isEven = i % 2 === 0;
        if (img) {
          return `
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} gap-12 items-center">
          <div className="flex-1 space-y-4">
            <p className="text-zinc-300 leading-relaxed">${this.escapeHtml(text.slice(0, 500))}</p>
          </div>
          <div className="flex-1">
            <img src="${img}" alt="" className="w-full rounded-2xl object-cover" />
          </div>
        </div>
      </section>`;
        }
        return `
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-zinc-300 leading-relaxed max-w-3xl">${this.escapeHtml(text.slice(0, 500))}</p>
        </div>
      </section>`;
      })
      .join('\n');

    return `'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '${bgColor}', color: '${textColor}' }}>
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-zinc-800" style={{ backgroundColor: '${bgColor}cc' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-black text-lg tracking-tight">${this.escapeHtml(page.title.split(/[|–—]/)[0]?.trim() || 'Home')}</Link>
          <div className="hidden md:flex items-center gap-6 text-zinc-400">
            ${navLinks.join('\n            ')}
          </div>
        </div>
      </nav>

      <main className="pt-16">
        <section className="relative py-24 px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight">${this.escapeHtml(page.title.split(/[|–—]/)[0]?.trim() || page.title)}</h1>
            ${heroImage ? `<img src="${heroImage}" alt="" className="mx-auto rounded-2xl max-h-96 object-cover" />` : ''}
          </div>
        </section>

${sections}

${localVideos.length > 0 ? `
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <video src="${localVideos[0]}" controls className="w-full rounded-2xl" />
          </div>
        </section>` : ''}
      </main>

      <footer className="border-t border-zinc-800 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-zinc-500">
          &copy; ${new Date().getFullYear()} ${this.escapeHtml(page.title.split(/[|–—]/)[0]?.trim() || 'Site')}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
`;
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // ─── Fallback layout (no LLM) ───────────────────────────────────

  private generateFallbackLayout(pages: CrawledPage[], assetMap: Map<string, string>): ASTPatch[] {
    const home = pages.find(p => p.pagePath === '/') || pages[0]!;
    const colors = home.designTokens.colors;
    const bgColor = colors[0] || '#09090b';
    const textColor = colors.find(c => c.includes('255') || c.includes('fff')) || '#fafafa';
    const accentColor = colors[1] || '#22c55e';

    const navLinks = pages
      .filter(p => p.pagePath !== '/' && !p.pagePath.includes('/es/'))
      .map(p => {
        const label = p.title.split(/[|–—]/)[0]?.trim() || p.pagePath.split('/').pop() || p.pagePath;
        return `<Link href="${p.pagePath}" className="hover:text-white transition">${label}</Link>`;
      })
      .slice(0, 20);

    const layout = `import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: '${home.title.replace(/'/g, "\\'")}',
  description: '${(home.meta['description'] || '').replace(/'/g, "\\'")}',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased" style={{ backgroundColor: '${bgColor}', color: '${textColor}' }}>
        <nav className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-zinc-800 bg-zinc-950/80">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="font-black text-lg tracking-tight">${home.title.split(/[|–—]/)[0]?.trim() || 'Home'}</Link>
            <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
              ${navLinks.join('\n              ')}
            </div>
          </div>
        </nav>
        <main className="pt-16">{children}</main>
        <footer className="border-t border-zinc-800 py-8 mt-16">
          <div className="max-w-7xl mx-auto px-6 text-center text-sm text-zinc-500">
            &copy; ${new Date().getFullYear()} ${(home.title.split(/[|–—]/)[0]?.trim() || 'Site').replace(/'/g, "\\'")}. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
`;

    const globals = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: ${bgColor};
  --text: ${textColor};
  --accent: ${accentColor};
}
body { background-color: var(--bg); color: var(--text); }
`;

    return [
      { action: 'insert', targetFile: 'src/app/layout.tsx', codeBlock: layout },
      { action: 'insert', targetFile: 'src/app/globals.css', codeBlock: globals },
    ];
  }

  // ─── Phase 4b: Zero-404 infrastructure ──────────────────────────

  private async generateZeroFourFourInfra(pages: CrawledPage[]): Promise<ASTPatch[]> {
    const patches: ASTPatch[] = [];
    const home = pages.find(p => p.pagePath === '/') || pages[0]!;
    const origin = new URL(home.url).origin;

    // 1. next.config.ts — redirects for trailing slashes, locale prefixes, common patterns
    const allRoutes = pages.map(p => p.pagePath === '/' ? '' : p.pagePath.replace(/^\//, ''));
    const redirects = allRoutes
      .filter(r => r.length > 0 && !r.startsWith('es/'))
      .map(r => ({
        source: `/${r}`,
        has: [{ type: 'host', value: origin.replace(/^https?:\/\//, '') }],
        destination: `/${r}`,
        permanent: false,
      }));

    const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  output: 'standalone',
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async redirects() {
    return [
      // Redirect /index.html to /
      { source: '/index.html', destination: '/', permanent: true },
      // Redirect trailing slashes
      { source: '/:path+', destination: '/:path+', permanent: true,
        has: [{ type: 'trailingSlash', value: 'true' }],
      },
    ];
  },
  async rewrites() {
    return [
      // Map /assets/* to public/assets/*
      { source: '/assets/:path*', destination: '/assets/:path*' },
    ];
  },
};

export default nextConfig;
`;
    patches.push({ action: 'insert', targetFile: 'next.config.ts', codeBlock: nextConfig });

    // 2. not-found.tsx — catch-all 404 page that redirects to home
    const notFound = `import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '6rem', fontWeight: 800, color: '#111', margin: 0 }}>404</h1>
      <p style={{ fontSize: '1.2rem', color: '#666', marginTop: '1rem' }}>Page not found</p>
      <Link href="/" style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', background: '#111', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
        Go Home
      </Link>
    </div>
  );
}
`;
    patches.push({ action: 'insert', targetFile: 'src/app/not-found.tsx', codeBlock: notFound });

    // 3. sitemap.ts — dynamic sitemap from all crawled pages
    const sitemapEntries = pages.map(p => {
      const loc = p.pagePath === '/' ? '' : p.pagePath;
      const lastmod = new Date().toISOString();
      return `  {
    url: 'https://clone-result.vercel.app${loc}',
    lastModified: new Date('${lastmod}'),
    changeFrequency: 'weekly',
    priority: ${p.pagePath === '/' ? '1.0' : '0.8'},
  }`;
    }).join(',\n');

    const sitemap = `import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
${sitemapEntries},
  ];
}
`;
    patches.push({ action: 'insert', targetFile: 'src/app/sitemap.ts', codeBlock: sitemap });

    // 4. robots.ts — allow all crawlers
    const robots = `import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
    ],
    sitemap: 'https://clone-result.vercel.app/sitemap.xml',
  };
}
`;
    patches.push({ action: 'insert', targetFile: 'src/app/robots.ts', codeBlock: robots });

    return patches;
  }

  // ─── Phase 5: Write files ────────────────────────────────────────

  private applyPatches(patches: ASTPatch[]): string[] {
    const written: string[] = [];
    for (const patch of patches) {
      const filePath = path.join(this.workspaceRoot, patch.targetFile);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      if (patch.action === 'insert' || patch.action === 'update') {
        fs.writeFileSync(filePath, patch.codeBlock, 'utf-8');
        written.push(patch.targetFile);
      }
    }
    return written;
  }

  // ─── Phase 5b: Self-contained post-process ──────────────────────
  // Scrubs ALL external URLs from generated code — no source dependencies

  private selfContainedPostProcess(assetMap: Map<string, string>, pages: CrawledPage[]): void {
    // Build reverse map: original URL → local path
    const reverseMap = new Map<string, string>();
    for (const [original, local] of assetMap.entries()) {
      reverseMap.set(original, local);
    }

    // Collect ALL page URLs for link rewriting
    const pageUrlToPath = new Map<string, string>();
    for (const p of pages) {
      pageUrlToPath.set(p.url, p.pagePath === '/' ? '/' : p.pagePath);
      // Also map without trailing slash variations
      const noTrailing = p.pagePath.replace(/\/$/, '');
      if (noTrailing) pageUrlToPath.set(`${new URL(p.url).origin}${noTrailing}`, noTrailing);
    }

    // Scan all generated .tsx files and rewrite external URLs
    const srcDir = path.join(this.workspaceRoot, 'src');
    if (!fs.existsSync(srcDir)) return;

    const files = this.walkDir(srcDir, '.tsx');
    let filesModified = 0;

    for (const filePath of files) {
      let content = fs.readFileSync(filePath, 'utf-8');
      let modified = false;

      // 1. Rewrite external image URLs → local /assets/ paths
      for (const [original, local] of reverseMap.entries()) {
        if (content.includes(original)) {
          content = content.split(original).join(local);
          modified = true;
        }
        // Also handle URL-encoded variants
        try {
          const encoded = encodeURI(original);
          if (content.includes(encoded)) {
            content = content.split(encoded).join(local);
            modified = true;
          }
        } catch {}
      }

      // 2. Rewrite external page URLs → local Next.js routes
      for (const [originalUrl, localPath] of pageUrlToPath.entries()) {
        if (content.includes(`"${originalUrl}"`) || content.includes(`'${originalUrl}'`)) {
          content = content.split(`"${originalUrl}"`).join(`"${localPath}"`);
          content = content.split(`'${originalUrl}'`).join(`'${localPath}'`);
          modified = true;
        }
      }

      // 3. Scrub any remaining external URLs in img src, video src, href attributes
      // Replace external image/video URLs with placeholder (will be caught by asset map)
      content = content.replace(/src="(https?:\/\/[^"]+\.(png|jpe?g|gif|webp|avif|svg|ico))"/gi, (match: string, url: string) => {
        const local = reverseMap.get(url);
        return local ? `src="${local}"` : match;
      });
      content = content.replace(/src='(https?:\/\/[^']+\.(png|jpe?g|gif|webp|avif|svg|ico))'/gi, (match: string, url: string) => {
        const local = reverseMap.get(url);
        return local ? `src='${local}'` : match;
      });

      // Replace external video URLs
      content = content.replace(/src="(https?:\/\/[^"]+\.(mp4|webm|mov|avi))"/gi, (match: string, url: string) => {
        const local = reverseMap.get(url);
        return local ? `src="${local}"` : match;
      });

      // Replace external font URLs in href
      content = content.replace(/href="(https?:\/\/[^"]+\.(woff2?|ttf|otf|eot))"/gi, (match: string, url: string) => {
        const local = reverseMap.get(url);
        return local ? `href="${local}"` : match;
      });

      // Replace Google Fonts CSS links with local references
      content = content.replace(/href="(https?:\/\/fonts\.googleapis\.com[^"]*)"/gi, '');

      // 4. Replace any remaining external href with # (no 404)
      content = content.replace(/href="(https?:\/\/[^"]*needsupps\.site[^"]*)"/gi, (match: string, url: string) => {
        try {
          const parsed = new URL(url);
          const localPath = pageUrlToPath.get(url) || pageUrlToPath.get(parsed.pathname) || '#';
          return `href="${localPath}"`;
        } catch {
          return 'href="#"';
        }
      });

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf-8');
        filesModified++;
      }
    }

    // 5. Write Google Fonts locally — extract font-face declarations
    this.writeLocalFonts(pages, assetMap);

    this.log(`Self-contained post-process: ${filesModified} files scrubbed of external URLs`);
  }

  private writeLocalFonts(pages: CrawledPage[], assetMap: Map<string, string>): void {
    // Collect all font URLs from pages
    const fontUrls = new Set<string>();
    for (const p of pages) {
      for (const f of p.fonts) fontUrls.add(f);
    }

    // Find downloaded font files
    const assetsDir = path.join(this.workspaceRoot, 'public', 'assets');
    if (!fs.existsSync(assetsDir)) return;

    const fontFiles = fs.readdirSync(assetsDir).filter(f => /\.(woff2?|ttf|otf|eot)$/i.test(f));
    if (fontFiles.length === 0) return;

    // Generate @font-face declarations for globals.css
    const fontFaces = fontFiles.map(file => {
      const ext = file.split('.').pop();
      const format = ext === 'woff2' ? 'woff2' : ext === 'woff' ? 'woff' : ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : 'embedded-opentype';
      const family = file.replace(/[-_]/g, ' ').replace(/\.\w+$/, '').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return `@font-face {
  font-family: '${family}';
  src: url('/assets/${file}') format('${format}');
  font-display: swap;
}`;
    }).join('\n\n');

    if (fontFaces) {
      const cssPath = path.join(this.workspaceRoot, 'src', 'app', 'globals.css');
      let css = '';
      if (fs.existsSync(cssPath)) css = fs.readFileSync(cssPath, 'utf-8');

      // Append font-face declarations if not already present
      if (!css.includes('@font-face')) {
        css = fontFaces + '\n\n' + css;
        fs.writeFileSync(cssPath, css, 'utf-8');
        this.log(`Wrote ${fontFiles.length} local font-face declarations`);
      }
    }
  }

  private walkDir(dir: string, ext: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.walkDir(full, ext));
      } else if (entry.name.endsWith(ext)) {
        results.push(full);
      }
    }
    return results;
  }
}
