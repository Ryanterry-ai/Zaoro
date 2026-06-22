import * as fs from 'fs';
import * as path from 'path';
import { LLMGateway } from '../core/llm-gateway.js';
import { ASTPatch, LLMConfig } from '../types/index.js';

// ─── Types ─────────────────────────────────────────────────────────

interface PageData {
  url: string;
  pagePath: string;
  title: string;
  screenshot: string;
  html: string;
  text: string;
  layout: { viewport: { width: number; height: number }; elements: LayoutNode[] };
  styles: DesignTokens;
  images: AssetInfo[];
  videos: AssetInfo[];
  audios: AssetInfo[];
  links: LinkInfo[];
  navItems: NavItem[];
  forms: FormInfo[];
  technologies: string[];
  meta: Record<string, string>;
}

interface LayoutNode {
  tag: string;
  selector: string;
  bounds: { x: number; y: number; width: number; height: number };
  styles: Record<string, string>;
  attrs: Record<string, string>;
  text?: string;
  innerHTML?: string;
  children?: LayoutNode[];
}

interface DesignTokens {
  colors: string[];
  fonts: string[];
  fontSizes: string[];
  spacings: string[];
  borderRadii: string[];
  shadows: string[];
  gradients: string[];
}

interface AssetInfo {
  src: string;
  alt: string;
  width: number;
  height: number;
  format: string;
  type: 'image' | 'video' | 'audio';
}

interface LinkInfo {
  href: string;
  text: string;
  isInternal: boolean;
  isNav: boolean;
  isFooter: boolean;
}

interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

interface FormInfo {
  action: string;
  method: string;
  fields: Array<{ name: string; type: string; placeholder: string; required: boolean }>;
}

interface SiteAnalysis {
  rootUrl: string;
  title: string;
  description: string;
  technologies: string[];
  pages: PageData[];
  navigation: NavItem[];
  allImages: AssetInfo[];
  allVideos: AssetInfo[];
  designTokens: DesignTokens;
  blockedPages: Array<{ url: string; reason: string }>;
  totalLinks: number;
  internalLinks: number;
  externalLinks: number;
}

// ─── Rich Progress Types ───────────────────────────────────────────

export type PhaseStatus = 'pending' | 'in_progress' | 'complete' | 'error';

export interface CloneProgress {
  phases: PhaseData[];
  startedAt: number;
  currentPhase: string;
}

export interface PhaseData {
  id: string;
  name: string;
  status: PhaseStatus;
  startedAt: number;
  completedAt?: number;
  data?: Record<string, unknown> | undefined;
  error?: string;
}

export interface AnalysisPhaseData {
  url: string;
  title: string;
  description: string;
  technologies: string[];
  pagesFound: Array<{ url: string; path: string; title: string; sections: number }>;
  navigation: NavItem[];
  images: Array<{ src: string; alt: string; format: string; type: string }>;
  videos: Array<{ src: string; format: string; type: string }>;
  blockedPages: Array<{ url: string; reason: string }>;
  designTokens: DesignTokens;
  links: { total: number; internal: number; external: number };
  forms: FormInfo[];
  meta: Record<string, string>;
}

export interface AssetsPhaseData {
  totalDiscovered: number;
  downloaded: number;
  failed: number;
  assets: Array<{ url: string; localPath: string; size: number; status: 'ok' | 'failed' }>;
  videosEmbedded: number;
}

export interface GeneratePhaseData {
  pagesTotal: number;
  pagesDone: number;
  currentPage: string;
  currentStatus: string;
  pages: Array<{ path: string; componentName: string; status: 'pending' | 'generating' | 'done' | 'error'; patches: number }>;
}

export interface LayoutPhaseData {
  components: string[];
  hasNav: boolean;
  hasFooter: boolean;
  patches: number;
}

export interface ApplyPhaseData {
  totalPatches: number;
  appliedPatches: number;
  filesWritten: string[];
}

export interface CloneResult {
  success: boolean;
  pages: number;
  patches: ASTPatch[];
  assets: number;
  duration: number;
  analysis?: SiteAnalysis;
  error?: string;
}

// ─── Orchestrator ──────────────────────────────────────────────────

export class CloneOrchestrator {
  private workspaceRoot: string;
  private gateway: LLMGateway;
  private logFn: ((step: string, msg: string, data?: Record<string, unknown> | undefined) => void) | undefined;
  private progress: CloneProgress;

  constructor(workspaceRoot: string, llmConfig: LLMConfig, logFn?: (step: string, msg: string, data?: Record<string, unknown> | undefined) => void) {
    this.workspaceRoot = workspaceRoot;
    this.gateway = new LLMGateway(llmConfig);
    this.logFn = logFn;
    this.progress = { phases: [], startedAt: Date.now(), currentPhase: '' };
  }

  private log(step: string, msg: string, data?: Record<string, unknown>) {
    console.log(`[clone] ${msg}`);
    this.logFn?.(step, msg, data);
  }

  private startPhase(id: string, name: string, data?: Record<string, unknown> | undefined): PhaseData {
    const phase: PhaseData = { id, name, status: 'in_progress', startedAt: Date.now(), data: data ?? undefined };
    this.progress.phases.push(phase);
    this.progress.currentPhase = id;
    this.log('clone', `${name} — starting`, data);
    return phase;
  }

  private completePhase(id: string, data?: Record<string, unknown> | undefined) {
    const phase = this.progress.phases.find(p => p.id === id);
    if (phase) {
      phase.status = 'complete';
      phase.completedAt = Date.now();
      if (data) phase.data = { ...(phase.data || {}), ...data };
    }
    this.log('clone', `${phase?.name || id} — complete`, data);
  }

  private errorPhase(id: string, error: string) {
    const phase = this.progress.phases.find(p => p.id === id);
    if (phase) {
      phase.status = 'error';
      phase.completedAt = Date.now();
      phase.error = error;
    }
    this.log('error', `${phase?.name || id} — failed: ${error}`);
  }

  async clone(targetUrl: string): Promise<CloneResult> {
    const startTime = Date.now();

    let url = targetUrl.trim();
    if (!url.match(/^https?:\/\//i)) url = `https://${url}`;

    this.log('clone', `Starting deep clone of ${url}`);

    try {
      // ── Phase 1: Analyze ────────────────────────────────────────
      const analysisPhase = this.startPhase('analysis', 'Site Analysis', { url });

      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      const analysis = await this.analyzeSite(context, url, browser);

      const analysisData: AnalysisPhaseData = {
        url: analysis.rootUrl,
        title: analysis.title,
        description: analysis.description,
        technologies: analysis.technologies,
        pagesFound: analysis.pages.map(p => ({
          url: p.url,
          path: p.pagePath,
          title: p.title,
          sections: this.groupIntoSections(p.layout.elements).length,
        })),
        navigation: analysis.navigation,
        images: analysis.allImages.map(i => ({ src: i.src, alt: i.alt, format: i.format, type: i.type })),
        videos: analysis.allVideos.map(v => ({ src: v.src, format: v.format, type: v.type })),
        blockedPages: analysis.blockedPages,
        designTokens: analysis.designTokens,
        links: { total: analysis.totalLinks, internal: analysis.internalLinks, external: analysis.externalLinks },
        forms: analysis.pages.flatMap(p => p.forms),
        meta: analysis.pages[0]?.meta || {},
      };
      this.completePhase('analysis', analysisData as unknown as Record<string, unknown>);

      // ── Phase 2: Download Assets ────────────────────────────────
      const assetsPhase = this.startPhase('assets', 'Download Assets', {
        imagesCount: analysis.allImages.length,
        videosCount: analysis.allVideos.length,
      });

      const assetsDir = path.join(this.workspaceRoot, 'public', 'assets');
      fs.mkdirSync(assetsDir, { recursive: true });
      const assetsResult = await this.downloadAssets(context, analysis, assetsDir);
      this.completePhase('assets', assetsResult as unknown as Record<string, unknown>);

      await browser.close();

      // ── Phase 3: Generate Page Components ────────────────────────
      const generatePhase = this.startPhase('generate', 'Generate Components', {
        pagesTotal: analysis.pages.length,
      });

      const genData: GeneratePhaseData = {
        pagesTotal: analysis.pages.length,
        pagesDone: 0,
        currentPage: '',
        currentStatus: '',
        pages: analysis.pages.map(p => ({
          path: p.pagePath,
          componentName: this.pathToComponentName(p.pagePath),
          status: 'pending' as const,
          patches: 0,
        })),
      };

      const patches: ASTPatch[] = [];
      for (let i = 0; i < analysis.pages.length; i++) {
        const pageData = analysis.pages[i]!;
        if (!pageData) continue;
        const componentName = this.pathToComponentName(pageData.pagePath);
        genData.currentPage = pageData.pagePath;
        genData.currentStatus = `Generating ${componentName}...`;
        genData.pages[i]!.status = 'generating';

        // Update progress in real-time
        const phase = this.progress.phases.find(p => p.id === 'generate');
        if (phase) phase.data = { ...genData as unknown as Record<string, unknown> };

        this.log('clone', `Generating ${componentName} (${i + 1}/${analysis.pages.length})`);

        try {
          const pagePatches = await this.generatePage(pageData, analysis);
          patches.push(...pagePatches);
          genData.pages[i]!.status = 'done';
          genData.pages[i]!.patches = pagePatches.length;
          genData.pagesDone = i + 1;
        } catch (err: any) {
          genData.pages[i]!.status = 'error';
          genData.pages[i]!.patches = 0;
          this.log('error', `Failed to generate ${componentName}: ${err.message}`);
        }
      }
      this.completePhase('generate', genData as unknown as Record<string, unknown>);

      // ── Phase 4: Generate Layout + Nav ──────────────────────────
      const layoutPhase = this.startPhase('layout', 'Generate Layout & Navigation');

      const layoutPatches = await this.generateLayout(analysis);
      patches.push(...layoutPatches);

      const layoutData: LayoutPhaseData = {
        components: layoutPatches.map(p => p.targetFile),
        hasNav: layoutPatches.some(p => p.targetFile.includes('layout')),
        hasFooter: layoutPatches.some(p => p.targetFile.includes('layout')),
        patches: layoutPatches.length,
      };
      this.completePhase('layout', layoutData as unknown as Record<string, unknown>);

      // ── Phase 5: Write Files ────────────────────────────────────
      const applyPhase = this.startPhase('apply', 'Write Files', { totalPatches: patches.length });

      const filesWritten = this.applyPatches(patches);
      const applyData: ApplyPhaseData = {
        totalPatches: patches.length,
        appliedPatches: filesWritten.length,
        filesWritten,
      };
      this.completePhase('apply', applyData as unknown as Record<string, unknown>);

      const duration = Date.now() - startTime;
      this.log('done', `Clone complete: ${analysis.pages.length} pages, ${assetsResult.downloaded} assets, ${patches.length} files in ${(duration / 1000).toFixed(1)}s`);

      return {
        success: true,
        pages: analysis.pages.length,
        patches,
        assets: assetsResult.downloaded,
        duration,
        analysis,
      };
    } catch (err: any) {
      console.error(`[clone] Clone failed: ${err.message}`);
      this.log('error', `Clone failed: ${err.message}`);
      return { success: false, pages: 0, patches: [], assets: 0, duration: Date.now() - startTime, error: err.message };
    }
  }

  // ─── Phase 1: Site Analysis ──────────────────────────────────────

  private async analyzeSite(context: any, rootUrl: string, browser: any): Promise<SiteAnalysis> {
    const rootParsed = new URL(rootUrl);
    const rootOrigin = rootParsed.origin;
    const page = await context.newPage();

    await page.goto(rootUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Extract technologies
    const technologies = await this.detectTechnologies(page);

    // Extract meta
    const meta = await page.evaluate(() => {
      const m: Record<string, string> = {};
      document.querySelectorAll('meta[name], meta[property]').forEach((el: any) => {
        const key = el.getAttribute('name') || el.getAttribute('property');
        const val = el.getAttribute('content');
        if (key && val) m[key] = val;
      });
      return m;
    });

    // Extract navigation structure
    const navItems = await this.extractNavigation(page);

    // Extract ALL links
    const allLinks = await this.extractAllLinks(page, rootOrigin);

    // Extract all images with full details
    const allImages = await this.extractAllImages(page);

    // Extract all videos
    const allVideos = await this.extractAllVideos(page);

    // Extract forms
    const forms = await this.extractForms(page);

    // Get design tokens
    const designTokens = await this.extractDesignTokens(page);

    // Get homepage data
    const homePage = await this.scrapePage(page, rootUrl, rootParsed.pathname);

    // Discover internal pages from nav links
    const internalPaths = new Set<string>();
    for (const link of allLinks) {
      if (link.isInternal) {
        try {
          const parsed = new URL(link.href, rootOrigin);
          if (parsed.origin === rootOrigin) {
            internalPaths.add(parsed.pathname);
          }
        } catch {}
      }
    }

    // Also add paths from nav items
    for (const nav of navItems) {
      try {
        const parsed = new URL(nav.href, rootOrigin);
        if (parsed.origin === rootOrigin) internalPaths.add(parsed.pathname);
      } catch {}
    }

    // Scrape each discovered page (max 15 pages)
    const pages: PageData[] = [homePage];
    const blockedPages: Array<{ url: string; reason: string }> = [];
    const pathsToScrape = [...internalPaths].filter(p => p !== '/' && p !== rootParsed.pathname).slice(0, 14);

    for (const p of pathsToScrape) {
      const fullUrl = `${rootOrigin}${p}`;
      try {
        this.log('clone', `Scraping page: ${p}`);
        const newPage = await context.newPage();
        await newPage.goto(fullUrl, { waitUntil: 'networkidle', timeout: 15000 });
        await newPage.waitForTimeout(1000);
        const pageData = await this.scrapePage(newPage, fullUrl, p);
        pages.push(pageData);
        await newPage.close();
      } catch (err: any) {
        blockedPages.push({ url: fullUrl, reason: err.message || 'Failed to load' });
      }
    }

    // Extract full text from homepage
    const homeText = await page.evaluate(() => document.body?.innerText?.slice(0, 5000) || '');

    await page.close();

    return {
      rootUrl,
      title: homePage.title,
      description: meta['description'] || '',
      technologies,
      pages,
      navigation: navItems,
      allImages,
      allVideos,
      designTokens,
      blockedPages,
      totalLinks: allLinks.length,
      internalLinks: allLinks.filter(l => l.isInternal).length,
      externalLinks: allLinks.filter(l => !l.isInternal).length,
    };
  }

  private async detectTechnologies(page: any): Promise<string[]> {
    return page.evaluate(() => {
      const techs: string[] = [];
      const html = document.documentElement.outerHTML.toLowerCase();

      // Frameworks
      if (html.includes('__next') || html.includes('_next')) techs.push('Next.js');
      if (html.includes('__nuxt') || html.includes('_nuxt')) techs.push('Nuxt.js');
      if (html.includes('ng-') || html.includes('angular')) techs.push('Angular');
      if (html.includes('data-reactroot') || html.includes('react')) techs.push('React');
      if (html.includes('data-v-') || html.includes('vue')) techs.push('Vue.js');
      if (html.includes('ember')) techs.push('Ember.js');
      if (html.includes('svelte')) techs.push('Svelte');

      // CSS frameworks
      if (html.includes('tailwind') || html.includes('tw-') || document.querySelector('[class*="tw-"]')) techs.push('Tailwind CSS');
      if (html.includes('bootstrap') || document.querySelector('.container-fluid, .btn-primary')) techs.push('Bootstrap');
      if (html.includes('bulma')) techs.push('Bulma');
      if (html.includes('materialize')) techs.push('Materialize');
      if (html.includes('chakra')) techs.push('Chakra UI');
      if (html.includes('antd') || html.includes('ant-design')) techs.push('Ant Design');
      if (html.includes('shadcn') || html.includes('radix')) techs.push('shadcn/ui');

      // Analytics & tools
      if (html.includes('google-analytics') || html.includes('gtag') || html.includes('GA_MEASUREMENT_ID')) techs.push('Google Analytics');
      if (html.includes('gtm.js') || html.includes('googletagmanager')) techs.push('Google Tag Manager');
      if (html.includes('hotjar')) techs.push('Hotjar');
      if (html.includes('segment.com') || html.includes('analytics.js')) techs.push('Segment');
      if (html.includes('mixpanel')) techs.push('Mixpanel');
      if (html.includes('intercom')) techs.push('Intercom');
      if (html.includes('crisp')) techs.push('Crisp');
      if (html.includes('hubspot')) techs.push('HubSpot');

      // CMS
      if (html.includes('shopify') || html.includes('Shopify.theme')) techs.push('Shopify');
      if (html.includes('wordpress') || html.includes('wp-content')) techs.push('WordPress');
      if (html.includes('webflow')) techs.push('Webflow');
      if (html.includes('squarespace')) techs.push('Squarespace');
      if (html.includes('wix.com')) techs.push('Wix');
      if (html.includes('contentful')) techs.push('Contentful');
      if (html.includes('sanity.io')) techs.push('Sanity');
      if (html.includes('strapi')) techs.push('Strapi');

      // Hosting
      if (html.includes('vercel') || document.querySelector('#__next')) techs.push('Vercel');
      if (html.includes('netlify') || html.includes('netlify.com')) techs.push('Netlify');
      if (html.includes('cloudflare')) techs.push('Cloudflare');
      if (html.includes('amazonaws.com')) techs.push('AWS');

      // Payment
      if (html.includes('stripe')) techs.push('Stripe');
      if (html.includes('paypal')) techs.push('PayPal');

      return techs;
    });
  }

  private async extractNavigation(page: any): Promise<NavItem[]> {
    return page.evaluate(() => {
      const navs: NavItem[] = [];
      const navElements = document.querySelectorAll('nav, [role="navigation"], header nav, header ul, .navbar, .nav, .menu');
      const seen = new Set<string>();

      navElements.forEach((nav: any) => {
        const links = nav.querySelectorAll('a[href]');
        links.forEach((a: any) => {
          const href = a.getAttribute('href') || '';
          const text = (a.textContent || '').trim();
          if (text && !seen.has(text) && text.length < 50) {
            seen.add(text);
            navs.push({ label: text, href });
          }
        });
      });

      // Also check header area if no nav found
      if (navs.length === 0) {
        const header = document.querySelector('header');
        if (header) {
          header.querySelectorAll('a[href]').forEach((a: any) => {
            const href = a.getAttribute('href') || '';
            const text = (a.textContent || '').trim();
            if (text && !seen.has(text) && text.length < 50) {
              seen.add(text);
              navs.push({ label: text, href });
            }
          });
        }
      }

      return navs;
    });
  }

  private async extractAllLinks(page: any, rootOrigin: string): Promise<LinkInfo[]> {
    return page.evaluate((rootOrigin: string) => {
      const links: LinkInfo[] = [];
      const seen = new Set<string>();
      const anchors = document.querySelectorAll('a[href]');

      // Determine which links are in nav/footer
      const navLinks = new Set<string>();
      const footerLinks = new Set<string>();
      document.querySelectorAll('nav a[href], header a[href]').forEach((a: any) => navLinks.add(a.getAttribute('href')));
      document.querySelectorAll('footer a[href]').forEach((a: any) => footerLinks.add(a.getAttribute('href')));

      anchors.forEach((a: any) => {
        const href = a.getAttribute('href') || '';
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
        try {
          const fullUrl = new URL(href, rootOrigin).href;
          if (!seen.has(fullUrl)) {
            seen.add(fullUrl);
            const isInternal = fullUrl.startsWith(rootOrigin);
            links.push({
              href: fullUrl,
              text: (a.textContent || '').trim().slice(0, 100),
              isInternal,
              isNav: navLinks.has(href),
              isFooter: footerLinks.has(href),
            });
          }
        } catch {}
      });

      return links;
    }, rootOrigin);
  }

  private async extractAllImages(page: any): Promise<AssetInfo[]> {
    return page.evaluate(() => {
      const images: AssetInfo[] = [];
      const seen = new Set<string>();

      // <img> tags
      document.querySelectorAll('img').forEach((img: any) => {
        const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
        if (src && src.startsWith('http') && !seen.has(src)) {
          seen.add(src);
          images.push({
            src, alt: img.alt || '', width: img.naturalWidth || img.width || 0,
            height: img.naturalHeight || img.height || 0,
            format: src.split('.').pop()?.split('?')[0] || 'unknown', type: 'image',
          });
        }
      });

      // <picture> / <source>
      document.querySelectorAll('picture source, source[type^="image"]').forEach((s: any) => {
        const src = s.srcset?.split(',')[0]?.trim()?.split(' ')[0];
        if (src && src.startsWith('http') && !seen.has(src)) {
          seen.add(src);
          images.push({ src, alt: '', width: 0, height: 0, format: src.split('.').pop()?.split('?')[0] || 'unknown', type: 'image' });
        }
      });

      // CSS background images (first 10)
      let bgCount = 0;
      document.querySelectorAll('[style*="background"]').forEach((el: any) => {
        if (bgCount >= 10) return;
        const match = el.style.backgroundImage?.match(/url\(["']?([^"')]+)["']?\)/);
        if (match?.[1] && match[1].startsWith('http') && !seen.has(match[1])) {
          seen.add(match[1]);
          images.push({ src: match[1], alt: '', width: 0, height: 0, format: match[1].split('.').pop()?.split('?')[0] || 'unknown', type: 'image' });
          bgCount++;
        }
      });

      // OG / favicon images
      document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"], meta[property="og:image"]').forEach((el: any) => {
        const href = el.href || el.content;
        if (href && href.startsWith('http') && !seen.has(href)) {
          seen.add(href);
          images.push({ src: href, alt: 'favicon', width: 0, height: 0, format: href.split('.').pop()?.split('?')[0] || 'unknown', type: 'image' });
        }
      });

      // SVG logos
      document.querySelectorAll('svg').forEach((svg: any, i: number) => {
        const parent = svg.closest('a, header, nav');
        if (parent && i < 3) {
          const svgStr = svg.outerHTML.slice(0, 500);
          if (!seen.has('svg-' + i)) {
            seen.add('svg-' + i);
            images.push({ src: `data:image/svg+xml,${encodeURIComponent(svgStr)}`, alt: 'logo', width: svg.clientWidth || 0, height: svg.clientHeight || 0, format: 'svg', type: 'image' });
          }
        }
      });

      return images;
    });
  }

  private async extractAllVideos(page: any): Promise<AssetInfo[]> {
    return page.evaluate(() => {
      const videos: AssetInfo[] = [];
      const seen = new Set<string>();

      document.querySelectorAll('video').forEach((v: any) => {
        const src = v.src || v.querySelector('source')?.src;
        if (src && src.startsWith('http') && !seen.has(src)) {
          seen.add(src);
          videos.push({ src, alt: '', width: v.videoWidth || 0, height: v.videoHeight || 0, format: src.split('.').pop()?.split('?')[0] || 'mp4', type: 'video' });
        }
      });

      // YouTube / Vimeo embeds
      document.querySelectorAll('iframe').forEach((f: any) => {
        const src = f.src || '';
        if (src.includes('youtube') || src.includes('youtu.be') || src.includes('vimeo')) {
          if (!seen.has(src)) {
            seen.add(src);
            videos.push({ src, alt: 'embedded video', width: f.width || 560, height: f.height || 315, format: 'embed', type: 'video' });
          }
        }
      });

      return videos;
    });
  }

  private async extractForms(page: any): Promise<FormInfo[]> {
    return page.evaluate(() => {
      const forms: FormInfo[] = [];
      document.querySelectorAll('form').forEach((f: any) => {
        const fields: FormInfo['fields'] = [];
        f.querySelectorAll('input, textarea, select').forEach((inp: any) => {
          fields.push({
            name: inp.name || inp.id || '',
            type: inp.type || inp.tagName.toLowerCase(),
            placeholder: inp.placeholder || '',
            required: inp.required || false,
          });
        });
        forms.push({ action: f.action || '', method: f.method || 'get', fields });
      });
      return forms;
    });
  }

  private async extractDesignTokens(page: any): Promise<DesignTokens> {
    return page.evaluate(() => {
      const colors = new Set<string>(), fonts = new Set<string>(), fontSizes = new Set<string>();
      const spacings = new Set<string>(), borderRadii = new Set<string>(), shadows = new Set<string>(), gradients = new Set<string>();

      const all = document.querySelectorAll('*');
      for (let i = 0; i < all.length && i < 800; i++) {
        const el = all[i];
        if (!el) continue;
        const cs = window.getComputedStyle(el);
        if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') colors.add(cs.backgroundColor);
        if (cs.color) colors.add(cs.color);
        if (cs.borderColor && cs.borderColor !== 'rgb(0, 0, 0)') colors.add(cs.borderColor);
        if (cs.fontFamily) fonts.add(cs.fontFamily);
        if (cs.fontSize) fontSizes.add(cs.fontSize);
        if (cs.padding && cs.padding !== '0px') spacings.add(cs.padding);
        if (cs.margin && cs.margin !== '0px') spacings.add(cs.margin);
        if (cs.borderRadius && cs.borderRadius !== '0px') borderRadii.add(cs.borderRadius);
        if (cs.boxShadow && cs.boxShadow !== 'none') shadows.add(cs.boxShadow);
        if (cs.backgroundImage && cs.backgroundImage.includes('gradient')) gradients.add(cs.backgroundImage);
      }

      return {
        colors: [...colors].slice(0, 25),
        fonts: [...fonts].slice(0, 10),
        fontSizes: [...fontSizes].slice(0, 12),
        spacings: [...spacings].slice(0, 10),
        borderRadii: [...borderRadii].slice(0, 8),
        shadows: [...shadows].slice(0, 8),
        gradients: [...gradients].slice(0, 5),
      };
    });
  }

  private async scrapePage(page: any, url: string, pagePath: string): Promise<PageData> {
    const title = await page.title();

    const screenshotBuf = await page.screenshot({ fullPage: true, type: 'png' }).catch(() => null);
    const screenshot = screenshotBuf?.toString('base64') || '';

    const html = await page.content();
    const text = await page.evaluate(() => document.body?.innerText?.slice(0, 8000) || '');

    const layout = JSON.parse(await page.evaluate(`
      (() => {
        const viewport = { width: window.innerWidth, height: window.innerHeight };
        const elements = [];
        const walk = (el, depth) => {
          if (depth > 6) return null;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return null;
          const computed = window.getComputedStyle(el);
          let selector = el.tagName.toLowerCase();
          if (el.id) selector = '#' + el.id;
          else if (el.className && typeof el.className === 'string' && el.className.trim()) {
            selector = el.tagName.toLowerCase() + '.' + el.className.trim().split(/\\s+/).slice(0,2).join('.');
          }
          const attrs = {};
          for (const a of ['src','href','alt','class','id','data-src','loading']) {
            const v = el.getAttribute(a);
            if (v) attrs[a] = v;
          }
          const node = {
            tag: el.tagName.toLowerCase(), selector,
            bounds: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
            styles: {
              display: computed.display, position: computed.position,
              backgroundColor: computed.backgroundColor, color: computed.color,
              fontSize: computed.fontSize, fontFamily: computed.fontFamily,
              padding: computed.padding, margin: computed.margin,
              borderRadius: computed.borderRadius, gap: computed.gap,
              fontWeight: computed.fontWeight, lineHeight: computed.lineHeight,
              textAlign: computed.textAlign, maxWidth: computed.maxWidth,
              width: computed.width, height: computed.height,
            },
            attrs,
          };
          let txt = '';
          for (const c of el.childNodes) {
            if (c.nodeType === 3 && c.textContent) txt += c.textContent.trim() + ' ';
          }
          if (txt.trim()) node.text = txt.trim();
          if (el.innerHTML && el.innerHTML.length < 2000 && el.children.length < 5) {
            node.innerHTML = el.innerHTML;
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
    `));

    const styles = await this.extractDesignTokens(page);
    const images = await this.extractAllImages(page);
    const videos = await this.extractAllVideos(page);
    const links = await page.evaluate((rootOrigin: string) => {
      const links: Array<{ href: string; text: string; isInternal: boolean }> = [];
      const seen = new Set<string>();
      document.querySelectorAll('a[href]').forEach((a: any) => {
        const href = a.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          try {
            const full = new URL(href, rootOrigin).href;
            if (!seen.has(full)) { seen.add(full); links.push({ href: full, text: (a.textContent||'').trim().slice(0,100), isInternal: full.startsWith(rootOrigin) }); }
          } catch {}
        }
      });
      return links;
    }, new URL(url).origin);

    const navItems = await this.extractNavigation(page);
    const forms = await this.extractForms(page);

    const meta: Record<string, string> = {};
    await page.evaluate(() => {
      const m: Record<string, string> = {};
      document.querySelectorAll('meta[name], meta[property]').forEach((el: any) => {
        const key = el.getAttribute('name') || el.getAttribute('property');
        const val = el.getAttribute('content');
        if (key && val) m[key] = val;
      });
      return m;
    }).then((m: Record<string, string>) => Object.assign(meta, m));

    return {
      url, pagePath, title, screenshot, html, text, layout, styles, images, videos,
      audios: [], links, navItems, forms, technologies: [], meta,
    };
  }

  // ─── Phase 2: Asset Download ─────────────────────────────────────

  private async downloadAssets(context: any, analysis: SiteAnalysis, assetsDir: string): Promise<AssetsPhaseData> {
    const result: AssetsPhaseData = {
      totalDiscovered: analysis.allImages.length + analysis.allVideos.length,
      downloaded: 0,
      failed: 0,
      assets: [],
      videosEmbedded: analysis.allVideos.length,
    };

    const allAssets = [...analysis.allImages.filter(a => a.src.startsWith('http') && a.type === 'image')];
    const seen = new Set<string>();

    for (const asset of allAssets.slice(0, 50)) {
      if (seen.has(asset.src)) continue;
      seen.add(asset.src);

      try {
        const page = await context.newPage();
        const response = await page.goto(asset.src, { timeout: 10000 });
        if (response && response.ok()) {
          const buffer = await response.body();
          const ext = asset.format || 'png';
          const safeName = asset.src.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80);
          const fileName = `${safeName}.${ext}`;
          const filePath = path.join(assetsDir, fileName);
          fs.writeFileSync(filePath, buffer);
          result.downloaded++;
          result.assets.push({ url: asset.src, localPath: `/assets/${fileName}`, size: buffer.length, status: 'ok' });
        }
        await page.close();
      } catch {
        result.failed++;
        result.assets.push({ url: asset.src, localPath: '', size: 0, status: 'failed' });
      }
    }

    return result;
  }

  // ─── Phase 3: Generate All Pages ─────────────────────────────────

  private async generateAllPages(analysis: SiteAnalysis, downloadedAssets: number): Promise<ASTPatch[]> {
    const patches: ASTPatch[] = [];

    for (const pageData of analysis.pages) {
      const pagePatches = await this.generatePage(pageData, analysis);
      patches.push(...pagePatches);
    }

    return patches;
  }

  private async generatePage(pageData: PageData, analysis: SiteAnalysis): Promise<ASTPatch[]> {
    const routePath = pageData.pagePath === '/' ? '' : pageData.pagePath.replace(/^\//, '');
    const componentName = this.pathToComponentName(pageData.pagePath);

    // Summarize the page sections
    const sections = this.groupIntoSections(pageData.layout.elements);
    const sectionSummary = sections.map((s, i) => {
      const texts = s.elements.filter(e => e.text).map(e => e.text).join(' | ');
      const imgs = s.elements.flatMap(e => this.collectImages(e));
      return `Section ${i + 1} "${s.name}" (${s.height}px tall):\n  Text: "${texts.slice(0, 300)}"\n  Images: ${imgs.length}\n  Tags: ${[...new Set(s.elements.map(e => e.tag))].join(', ')}`;
    }).join('\n\n');

    // Collect all images for this page
    const pageImages = pageData.images.filter(i => i.src.startsWith('http'));

    const prompt = `You are cloning the page "${pageData.title}" from ${pageData.url}.

PAGE TEXT CONTENT (verbatim from the live site):
${pageData.text.slice(0, 3000)}

PAGE SECTIONS (top to bottom):
${sectionSummary}

DESIGN TOKENS:
- Colors: ${pageData.styles.colors.slice(0, 10).join(', ')}
- Fonts: ${pageData.styles.fonts.slice(0, 5).join(', ')}
- Font sizes: ${pageData.styles.fontSizes.slice(0, 8).join(', ')}
- Border radii: ${pageData.styles.borderRadii.slice(0, 5).join(', ')}
- Gradients: ${pageData.styles.gradients.slice(0, 3).join('; ')}

NAVIGATION ITEMS:
${pageData.navItems.map(n => `- ${n.label} → ${n.href}`).join('\n')}

IMAGES ON THIS PAGE:
${pageImages.slice(0, 10).map(i => `- ${i.alt || 'image'}: ${i.src}`).join('\n')}

FORMS:
${pageData.forms.map(f => `Form → ${f.action} (${f.fields.map(ff => ff.name + ':' + ff.type).join(', ')})`).join('\n')}

Generate a Next.js App Router page component that faithfully reproduces this exact page.
Use the EXACT text content from the page (copy verbatim, don't make up content).
Use the EXACT colors, fonts, and design tokens extracted from the live site.
Use <Image> from next/image for all images with the src as absolute URL.
The page should be a complete, standalone React component.
Export default the component.
${pageData.pagePath === '/' ? 'This is the homepage.' : `This is the "${routePath}" page.`}`;

    const patches = await this.gateway.generatePatches({
      prompt,
      attempt: 0,
      changedFiles: [],
      errors: [],
    });

    // Fix file paths to use the correct route
    for (const patch of patches) {
      if (pageData.pagePath === '/') {
        patch.targetFile = 'src/app/page.tsx';
      } else {
        patch.targetFile = `src/app/${routePath}/page.tsx`;
      }
    }

    return patches;
  }

  private groupIntoSections(elements: LayoutNode[]): Array<{ name: string; elements: LayoutNode[]; height: number }> {
    if (elements.length === 0) return [];

    const sorted = [...elements].sort((a, b) => a.bounds.y - b.bounds.y);
    const sections: Array<{ name: string; elements: LayoutNode[]; height: number }> = [];
    let current: { name: string; elements: LayoutNode[]; height: number } | null = null;

    for (const el of sorted) {
      const yStart = el.bounds.y;
      const yEnd = yStart + el.bounds.height;

      if (!current || yStart - (current.elements[current.elements.length - 1]?.bounds.y || 0) + (current.elements[current.elements.length - 1]?.bounds.height || 0) > 80) {
        if (current) sections.push(current);
        current = { name: this.guessSectionName(el), elements: [el], height: el.bounds.height };
      } else {
        current.elements.push(el);
        current.height = Math.max(current.height, yEnd - (current.elements[0]?.bounds.y ?? 0));
      }
    }
    if (current) sections.push(current);

    return sections;
  }

  private collectImages(node: LayoutNode): string[] {
    const imgs: string[] = [];
    if (node.attrs['src'] && (node.tag === 'img' || node.tag === 'video')) imgs.push(node.attrs['src']);
    if (node.children) {
      for (const c of node.children) imgs.push(...this.collectImages(c));
    }
    return imgs;
  }

  private guessSectionName(el: LayoutNode): string {
    const text = (el.text || '').toLowerCase();
    const tag = el.tag;
    if (tag === 'nav' || text.includes('menu')) return 'Navigation';
    if (text.includes('hero') || text.includes('welcome') || text.includes('get started')) return 'Hero';
    if (text.includes('feature') || text.includes('what we')) return 'Features';
    if (text.includes('pricing') || text.includes('plan')) return 'Pricing';
    if (text.includes('testimon') || text.includes('review')) return 'Testimonials';
    if (text.includes('faq') || text.includes('question')) return 'FAQ';
    if (text.includes('contact') || text.includes('get in touch')) return 'Contact';
    if (tag === 'footer' || text.includes('footer') || text.includes('copyright')) return 'Footer';
    return 'Section';
  }

  private pathToComponentName(pagePath: string): string {
    if (pagePath === '/') return 'Home';
    return pagePath.replace(/^\//, '').split('/').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  }

  // ─── Phase 4: Generate Layout ────────────────────────────────────

  private async generateLayout(analysis: SiteAnalysis): Promise<ASTPatch[]> {
    const navSummary = analysis.navigation.map(n => `- ${n.label} → ${n.href}`).join('\n');
    const footerLinks = analysis.pages.flatMap(p => p.links.filter(l => l.isFooter)).slice(0, 15);
    const footerSummary = footerLinks.map(l => `- ${l.text} → ${l.href}`).join('\n');

    const prompt = `Generate a Next.js App Router layout.tsx for the website "${analysis.title}".

NAVIGATION:
${navSummary}

FOOTER LINKS:
${footerSummary || 'No footer links detected'}

DESIGN TOKENS:
- Colors: ${analysis.designTokens.colors.slice(0, 8).join(', ')}
- Fonts: ${analysis.designTokens.fonts.slice(0, 3).join(', ')}
- Background: ${analysis.designTokens.colors[0] || '#ffffff'}

TECHNOLOGIES: ${analysis.technologies.join(', ')}

Generate:
1. src/app/layout.tsx — Root layout with <html>, <body>, nav header, and footer
2. src/app/globals.css — Tailwind imports + custom CSS variables for the extracted colors

The nav should have links for all navigation items. The footer should include footer links.
Use the exact fonts and colors from the extracted design tokens.`;

    const patches = await this.gateway.generatePatches({
      prompt,
      attempt: 0,
      changedFiles: [],
      errors: [],
    });

    // Ensure correct paths
    for (const patch of patches) {
      if (patch.targetFile.includes('layout')) patch.targetFile = 'src/app/layout.tsx';
      if (patch.targetFile.includes('globals') || patch.targetFile.includes('css')) patch.targetFile = 'src/app/globals.css';
    }

    return patches;
  }

  // ─── Phase 5: Apply Patches ──────────────────────────────────────

  private applyPatches(patches: ASTPatch[]): string[] {
    const filesWritten: string[] = [];
    for (const patch of patches) {
      const filePath = path.join(this.workspaceRoot, patch.targetFile);
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });

      if (patch.action === 'insert' || patch.action === 'update') {
        fs.writeFileSync(filePath, patch.codeBlock, 'utf-8');
        filesWritten.push(patch.targetFile);
      } else if (patch.action === 'delete' && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        filesWritten.push(`(deleted) ${patch.targetFile}`);
      }
    }
    return filesWritten;
  }
}
