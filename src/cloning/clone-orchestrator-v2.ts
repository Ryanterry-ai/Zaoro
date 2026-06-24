import * as fs from 'fs';
import * as path from 'path';
import { LLMGateway } from '../core/llm-gateway.js';
import { ASTPatch, LLMConfig } from '../types/index.js';
import {
  CloneState, ClonePhase, CloneError, CloneProgressEvent,
  AnalyzeResult, TechStack, SitemapEntry, NavItem, AnalyzedPage, PageCategory, RobotsTxtInfo,
  CrawlPageResult, AssetDownloadResult, AssetCategory, GeneratePageResult, ItemStatus,
  createCloneState,
} from './clone-progress.js';
import { SiteAnalyzer } from './site-analyzer.js';

const ASSET_EXT = /\.(png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|mov|avi|css|json)$/i;
const PAGE_EXT = /\.(html?|php|aspx|jsp|cfm|shtml|pdf|zip|xml|txt)$/i;
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
  category: AssetCategory;
  size: number;
  status: 'ok' | 'failed' | 'skipped';
}

export interface CloneResult {
  success: boolean;
  pages: number;
  patches: ASTPatch[];
  assets: number;
  filesWritten: string[];
  duration: number;
  state: CloneState;
  error?: string;
}

// ─── Progress emitter ──────────────────────────────────────────────
// Emits events to file + callback for real-time UI streaming

type ProgressCallback = (event: CloneProgressEvent) => void;

class ProgressEmitter {
  private stateFile: string;
  private events: CloneProgressEvent[] = [];
  private callback: ProgressCallback | undefined;

  constructor(workspaceRoot: string, callback?: ProgressCallback) {
    this.stateFile = path.join(workspaceRoot, '.clone-state.json');
    this.callback = callback;
  }

  emit(phase: ClonePhase, phaseStatus: 'active' | 'done' | 'failed', message: string, data?: Record<string, unknown>) {
    const event: CloneProgressEvent = data !== undefined
      ? { ts: Date.now(), phase, phaseStatus, message, data }
      : { ts: Date.now(), phase, phaseStatus, message };
    this.events.push(event);
    this.callback?.(event);
    this.flush();
  }

  private flush() {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify(this.events, null, 2), 'utf-8');
    } catch {}
  }

  getAll(): CloneProgressEvent[] { return this.events; }
}

// ─── CloneOrchestratorV2 ──────────────────────────────────────────

export class CloneOrchestrator {
  private workspaceRoot: string;
  private gateway: LLMGateway;
  private progress: ProgressEmitter;
  private state: CloneState;
  private logFn: ((step: string, msg: string, data?: Record<string, unknown>) => void) | undefined;
  private phaseFn: ((step: string, msg: string, data?: Record<string, unknown>) => void) | undefined;

  constructor(
    workspaceRoot: string,
    llmConfig: LLMConfig,
    logFn?: (step: string, msg: string, data?: Record<string, unknown>) => void,
    phaseFn?: (step: string, msg: string, data?: Record<string, unknown>) => void,
  ) {
    this.workspaceRoot = workspaceRoot;
    this.gateway = new LLMGateway(llmConfig);
    this.logFn = logFn;
    this.phaseFn = phaseFn;

    this.state = createCloneState('');
    this.progress = new ProgressEmitter(workspaceRoot, (event) => {
      // Also emit to legacy callbacks
      this.logFn?.(event.phase, event.message, event.data);
      this.phaseFn?.('phase', event.message, event.data);
    });
  }

  private log(msg: string) {
    console.log(`[clone-v2] ${msg}`);
  }

  // ─── Main entry ───────────────────────────────────────────────

  async clone(targetUrl: string, options?: { maxPages?: number }): Promise<CloneResult> {
    const startTime = Date.now();
    let url = targetUrl.trim();
    if (!url.match(/^https?:\/\//i)) url = `https://${url}`;
    this.state.url = url;

    this.log(`Starting full clone of ${url}`);

    try {
      // ═══════════════════════════════════════════════════════════
      // PHASE 0: ANALYZE (sitemap, robots, tech stack, pages)
      // ═══════════════════════════════════════════════════════════
      this.startPhase('analyze', 1);
      this.progress.emit('analyze', 'active', `Analyzing ${url} — detecting tech stack, sitemap, robots.txt...`);

      const analyzer = new SiteAnalyzer();
      const analyzeResult = await analyzer.analyze(url);
      this.state.analyze = analyzeResult;

      this.progress.emit('analyze', 'active', `Tech stack: ${analyzeResult.techStack.framework} + ${analyzeResult.techStack.cms || 'no CMS'}`, {
        techStack: analyzeResult.techStack,
        sitemapPages: analyzeResult.sitemapPages.length,
        navItems: analyzeResult.navItems.length,
        pages: analyzeResult.pages.length,
      });

      // Categorize discovered pages
      const pageCategories: Record<string, number> = {};
      for (const p of analyzeResult.pages) {
        pageCategories[p.category] = (pageCategories[p.category] || 0) + 1;
      }
      this.progress.emit('analyze', 'active', `Discovered ${analyzeResult.pages.length} pages across ${Object.keys(pageCategories).length} categories`, {
        pageCategories,
        totalEstimated: analyzeResult.totalEstimatedPages,
      });

      this.progress.emit('analyze', 'active', `Robots.txt: ${analyzeResult.robotsTxt ? `${analyzeResult.robotsTxt.sitemaps.length} sitemaps, ${analyzeResult.robotsTxt.disallowPaths.length} disallowed paths` : 'not found'}`);

      // Build category breakdown for the completion message
      const categoryBreakdown = Object.entries(pageCategories).map(([cat, count]) => `${count} ${cat}`).join(', ');
      this.progress.emit('analyze', 'done', `Analysis complete — ${analyzeResult.pages.length} pages found (${categoryBreakdown})`, {
        analyzeResult,
        exactPageCount: analyzeResult.pages.length,
        sitemapEntryCount: analyzeResult.sitemapPages.length,
        navItemCount: analyzeResult.navItems.length,
        pageCategories,
      });
      this.completePhase('analyze');

      // ═══════════════════════════════════════════════════════════
      // PHASE 1: CRAWL (per-page progress, parallel)
      // ═══════════════════════════════════════════════════════════
      this.startPhase('crawl', analyzeResult.pages.length);
      this.progress.emit('crawl', 'active', `Crawling ${analyzeResult.pages.length} pages with Playwright...`);

      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
      const crawlContext = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' });

      // Crawl pages with per-page progress
      const crawled: CrawledPage[] = [];
      const crawlResults: CrawlPageResult[] = [];
      const maxPages = (options?.maxPages && options.maxPages > 0) ? options.maxPages : analyzeResult.pages.length;
      const toCrawl = analyzeResult.pages.slice(0, maxPages);

      this.progress.emit('crawl', 'active', `Crawling ${toCrawl.length} of ${analyzeResult.pages.length} discovered pages...`);

      // No timeout — clone runs until all pages are crawled
      // Reuse browser contexts instead of create/destroy per page
      const BATCH_SIZE = 10;
      let crawledCount = 0;

      for (let i = 0; i < toCrawl.length; i += BATCH_SIZE) {
        const batch = toCrawl.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (ap) => {
            const pageStart = Date.now();
            const pageIdx = crawledCount + batch.indexOf(ap) + 1;
            this.progress.emit('crawl', 'active', `Crawling ${pageIdx}/${toCrawl.length}: ${ap.path}`, {
              pagePath: ap.path,
              category: ap.category,
              index: pageIdx - 1,
              total: toCrawl.length,
            });

            // Reuse page from shared context — don't create/destroy per page
            let page: any;
            try {
              page = await crawlContext.newPage();
              const targetUrl = new URL(ap.path, url).href;
              await page.goto(targetUrl, { timeout: 20000, waitUntil: 'domcontentloaded' });
              // Conditional wait: wait for network to settle, max 3s instead of flat 2s
              try {
                await page.waitForLoadState('networkidle', { timeout: 3000 });
              } catch {
                // networkidle not reached — page is heavy, proceed anyway
              }

              const crawledPage = await this.extractPageData(page, targetUrl);
              const result: CrawlPageResult = {
                path: ap.path,
                title: crawledPage.title,
                status: 'done',
                error: undefined,
                imagesFound: crawledPage.images.length,
                videosFound: crawledPage.videos.length,
                fontsFound: crawledPage.fonts.length,
                linksFound: crawledPage.links.length,
                duration: Date.now() - pageStart,
              };
              crawlResults.push(result);
              crawled.push(crawledPage);

              this.progress.emit('crawl', 'active', `Crawled ${ap.path} — ${crawledPage.images.length} images, ${crawledPage.videos.length} videos, ${crawledPage.links.length} links`, {
                pagePath: ap.path,
                category: ap.category,
                status: 'done',
                images: crawledPage.images.length,
                videos: crawledPage.videos.length,
                links: crawledPage.links.length,
                duration: result.duration,
                index: pageIdx - 1,
                total: toCrawl.length,
              });
            } catch (err: any) {
              const result: CrawlPageResult = {
                path: ap.path,
                title: '',
                status: 'failed',
                error: err.message || 'crawl failed',
                imagesFound: 0,
                videosFound: 0,
                fontsFound: 0,
                linksFound: 0,
                duration: Date.now() - pageStart,
              };
              crawlResults.push(result);
              this.state.errors.push({ phase: 'crawl', item: ap.path, reason: result.error || 'unknown', severity: 'warning', recoverable: true });

              this.progress.emit('crawl', 'active', `Failed to crawl ${ap.path}: ${result.error}`, {
                pagePath: ap.path,
                status: 'failed',
                error: result.error,
                index: pageIdx - 1,
                total: toCrawl.length,
              });
            } finally {
              try { await page?.close(); } catch {}
            }
          })
        );
        crawledCount += batch.length;
      }

      const crawledOk = crawlResults.filter(r => r.status === 'done').length;
      const crawledFailed = crawlResults.filter(r => r.status === 'failed').length;
      this.progress.emit('crawl', 'done', `Crawl complete — ${crawledOk} succeeded, ${crawledFailed} failed`, {
        crawlResults,
        crawledOk,
        crawledFailed,
      });
      this.state.crawlResults = crawlResults;
      this.completePhase('crawl');

      if (crawled.length === 0) throw new Error('No pages were successfully crawled');

      // ═══════════════════════════════════════════════════════════
      // PHASE 2: DOWNLOAD ASSETS (per-asset progress, parallel)
      // ═══════════════════════════════════════════════════════════
      this.startPhase('assets', 0); // will update total
      this.progress.emit('assets', 'active', `Discovering all media assets from ${crawled.length} crawled pages...`);

      const assetsDir = path.join(this.workspaceRoot, 'public', 'assets');
      fs.mkdirSync(assetsDir, { recursive: true });

      // Discover all unique asset URLs
      const urlSet = new Map<string, string>();
      for (const p of crawled) {
        for (const img of p.images) urlSet.set(img, 'image');
        for (const vid of p.videos) urlSet.set(vid, 'video');
        for (const font of p.fonts) urlSet.set(font, 'font');
      }

      const assetUrls: Array<[string, string]> = [...urlSet.entries()];
      this.progress.emit('assets', 'active', `Discovered ${assetUrls.length} unique assets — downloading in batches...`);
      this.updatePhaseTotal('assets', assetUrls.length);

      // Download with per-asset progress — using fetch() (no Playwright needed)
      const allAssets: AssetEntry[] = [];
      const assetResults: AssetDownloadResult[] = [];

      const ASSET_BATCH = 15;
      for (let i = 0; i < assetUrls.length; i += ASSET_BATCH) {
        const batch = assetUrls.slice(i, i + ASSET_BATCH);
        await Promise.all(batch.map(async ([assetUrl, hint], batchIdx) => {
          const category = this.categorizeAsset(assetUrl, hint);
          const globalIdx = i + batchIdx;
          this.progress.emit('assets', 'active', `Downloading ${globalIdx + 1}/${assetUrls.length}: ${this.truncateUrl(assetUrl)}`, {
            url: assetUrl,
            category,
            index: globalIdx,
            total: assetUrls.length,
          });

          try {
            const entry = await this.downloadSingleAsset(null, assetUrl, category, assetsDir);
            allAssets.push(entry);
            assetResults.push({
              url: entry.originalUrl,
              localPath: entry.localPath,
              category: entry.category,
              size: entry.size,
              status: entry.status === 'ok' ? 'done' : 'failed',
              error: entry.status === 'ok' ? undefined : 'download failed',
            });

            this.progress.emit('assets', 'active', entry.status === 'ok'
              ? `Downloaded ${this.truncateUrl(assetUrl)} (${this.formatSize(entry.size)})`
              : `Failed to download ${this.truncateUrl(assetUrl)}`,
            {
              url: entry.originalUrl,
              category: entry.category,
              size: entry.size,
              status: entry.status,
              index: globalIdx,
              total: assetUrls.length,
            });
          } catch (err: any) {
            allAssets.push({ originalUrl: assetUrl, localPath: '', localFileName: '', category: category, size: 0, status: 'failed' });
            assetResults.push({ url: assetUrl, localPath: '', category, size: 0, status: 'failed', error: err.message || 'unknown' });

            this.progress.emit('assets', 'active', `Error downloading ${this.truncateUrl(assetUrl)}: ${err.message}`, {
              url: assetUrl,
              status: 'failed',
              error: err.message,
              index: globalIdx,
              total: assetUrls.length,
            });
          }
        }));
      }

      await crawlContext.close().catch(() => {});
      await browser.close().catch(() => {});

      // Summary
      const assetsOk = allAssets.filter(a => a.status === 'ok').length;
      const assetsFailed = allAssets.filter(a => a.status === 'failed').length;
      const byCat: Record<string, number> = {};
      for (const a of allAssets) { if (a.status === 'ok') byCat[a.category] = (byCat[a.category] || 0) + 1; }

      this.progress.emit('assets', 'done', `Assets complete — ${assetsOk} downloaded, ${assetsFailed} failed`, {
        assetResults,
        assetsOk,
        assetsFailed,
        byCategory: byCat,
      });
      this.state.assetResults = assetResults;
      this.completePhase('assets');

      // ═══════════════════════════════════════════════════════════
      // PHASE 3: GENERATE PAGE COMPONENTS (per-page progress)
      // ═══════════════════════════════════════════════════════════
      this.startPhase('generate', crawled.length);
      this.progress.emit('generate', 'active', `Generating ${crawled.length} page components...`);

      const assetMap = new Map<string, string>();
      for (const a of allAssets) { if (a.status === 'ok') assetMap.set(a.originalUrl, a.localPath); }

      const SKIP_GEN = /^\/(es\/|search$|blogs\/[^/]+\/tagged\/|.*\.atom$)/i;
      const generatable = crawled.filter(p => !SKIP_GEN.test(p.pagePath));

      const groups = this.groupPagesByType(generatable);
      this.progress.emit('generate', 'active', `Page groups: ${Object.entries(groups).map(([k, v]) => `${k}(${v.length})`).join(', ')}`);

      const patches: ASTPatch[] = [];
      const generateResults: GeneratePageResult[] = [];
      const typeComponents = new Map<string, ASTPatch[]>();
      let totalLlmCalls = 0;
      let llmAvailable = true;
      let pagesGenerated = 0;
      let filesWrittenCount = 0;
      const writtenFiles: string[] = [];

      for (const [type, pages] of Object.entries(groups)) {

        if (llmAvailable) {
          try {
            const delay = Math.min(3000 + (totalLlmCalls * 1500), 30000);
            await new Promise(r => setTimeout(r, delay));

            if (pages.length === 1) {
              const pagePath = pages[0]!.pagePath;
              this.progress.emit('generate', 'active', `Generating ${pagePath} (LLM)...`, {
                pagePath, category: type, method: 'llm', index: pagesGenerated, total: generatable.length,
              });

              const pagePatches = await this.generatePage(pages[0]!, crawled, assetMap);
              typeComponents.set(type, pagePatches);
              patches.push(...pagePatches);

              // Write files immediately — progressive generation
              const writtenNow = this.applyPatches(pagePatches);
              writtenFiles.push(...writtenNow);
              filesWrittenCount += writtenNow.length;
              for (const wf of writtenNow) {
                this.progress.emit('generate', 'active', `Wrote: ${wf}`, {
                  pagePath, status: 'file-written', filePath: wf, index: pagesGenerated, total: generatable.length,
                });
              }

              pagesGenerated++;

              generateResults.push({
                path: pagePath,
                category: this.categorizePath(pagePath),
                status: 'done',
                error: undefined,
                filePath: `src/app/${pagePath === '/' ? 'page.tsx' : pagePath.replace(/^\//, '') + '/page.tsx'}`,
                componentCount: pagePatches.length,
              });

              this.progress.emit('generate', 'active', `Generated ${pagePath} — ${pagePatches.length} patches, ${writtenNow.length} files written`, {
                pagePath, status: 'done', patches: pagePatches.length, filesWritten: filesWrittenCount, index: pagesGenerated, total: generatable.length,
              });
            } else {
              // Generate template from first page, adapt for rest
              const firstPage = pages[0]!;
              this.progress.emit('generate', 'active', `Generating template for ${type} group (${pages.length} pages)...`, {
                groupType: type, pagesTotal: pages.length, method: 'template-batch', index: pagesGenerated, total: generatable.length,
              });

              const templatePatches = await this.generatePage(firstPage, crawled, assetMap);
              typeComponents.set(type, templatePatches);
              patches.push(...templatePatches);

              // Write template file immediately
              const writtenNow = this.applyPatches(templatePatches);
              writtenFiles.push(...writtenNow);
              filesWrittenCount += writtenNow.length;
              for (const wf of writtenNow) {
                this.progress.emit('generate', 'active', `Wrote: ${wf}`, {
                  pagePath: firstPage.pagePath, status: 'file-written', filePath: wf, index: pagesGenerated, total: generatable.length,
                });
              }

              pagesGenerated++;

              generateResults.push({
                path: firstPage.pagePath,
                category: this.categorizePath(firstPage.pagePath),
                status: 'done',
                error: undefined,
                filePath: `src/app/${firstPage.pagePath === '/' ? 'page.tsx' : firstPage.pagePath.replace(/^\//, '') + '/page.tsx'}`,
                componentCount: templatePatches.length,
              });

              this.progress.emit('generate', 'active', `Template generated for ${firstPage.pagePath} — adapting ${pages.length - 1} similar pages`, {
                pagePath: firstPage.pagePath, templateFor: type, adaptingCount: pages.length - 1,
              });

              // Adapt remaining pages from template (no LLM call) — write each immediately
              for (let pi = 1; pi < pages.length; pi++) {
                const adaptPage = pages[pi]!;
                const adapted = await this.adaptPageFromTemplate(adaptPage, firstPage, templatePatches, crawled, assetMap);
                if (adapted.length > 0) {
                  patches.push(...adapted);

                  // Write adapted file immediately
                  const adaptedWritten = this.applyPatches(adapted);
                  writtenFiles.push(...adaptedWritten);
                  filesWrittenCount += adaptedWritten.length;
                  for (const wf of adaptedWritten) {
                    this.progress.emit('generate', 'active', `Wrote: ${wf}`, {
                      pagePath: adaptPage.pagePath, status: 'file-written', filePath: wf, index: pagesGenerated, total: generatable.length,
                    });
                  }

                  pagesGenerated++;

                  generateResults.push({
                    path: adaptPage.pagePath,
                    category: this.categorizePath(adaptPage.pagePath),
                    status: 'done',
                    error: undefined,
                    filePath: `src/app/${adaptPage.pagePath === '/' ? 'page.tsx' : adaptPage.pagePath.replace(/^\//, '') + '/page.tsx'}`,
                    componentCount: adapted.length,
                  });

                  this.progress.emit('generate', 'active', `Adapted ${adaptPage.pagePath} from template — ${adaptedWritten.length} files written`, {
                    pagePath: adaptPage.pagePath, method: 'template-adapt', index: pagesGenerated, total: generatable.length, filesWritten: filesWrittenCount,
                  });
                } else {
                  generateResults.push({
                    path: adaptPage.pagePath,
                    category: this.categorizePath(adaptPage.pagePath),
                    status: 'skipped',
                    error: undefined,
                    filePath: '',
                    componentCount: 0,
                  });
                  pagesGenerated++;
                }
              }
            }
            totalLlmCalls++;
          } catch (err: any) {
            this.log(`LLM failed for group ${type}: ${err.message}, falling back to templates`);
            llmAvailable = false;

            // Notify user that we're building without LLM
            this.progress.emit('generate', 'active', `⚠️ LLM unavailable — building with template engine instead`, {
              status: 'llm-fallback', reason: err.message,
            });

            // Fallback: generate all pages in group with template — write each immediately
            for (const page of pages) {
              const templateCode = this.generateTemplatePage(page, crawled, assetMap);
              const pagePatch: ASTPatch = { action: 'insert', targetFile: page.pagePath === '/' ? 'src/app/page.tsx' : `src/app/${page.pagePath.replace(/^\//, '')}/page.tsx`, codeBlock: templateCode };
              patches.push(pagePatch);

              const writtenNow = this.applyPatches([pagePatch]);
              writtenFiles.push(...writtenNow);
              filesWrittenCount += writtenNow.length;
              for (const wf of writtenNow) {
                this.progress.emit('generate', 'active', `Wrote: ${wf}`, {
                  pagePath: page.pagePath, status: 'file-written', filePath: wf, index: pagesGenerated, total: generatable.length,
                });
              }

              pagesGenerated++;

              generateResults.push({
                path: page.pagePath,
                category: this.categorizePath(page.pagePath),
                status: 'done',
                error: undefined,
                filePath: `src/app/${page.pagePath === '/' ? 'page.tsx' : page.pagePath.replace(/^\//, '') + '/page.tsx'}`,
                componentCount: 1,
              });

              this.progress.emit('generate', 'active', `Template fallback for ${page.pagePath} — ${writtenNow.length} files written`, {
                pagePath: page.pagePath, method: 'template-fallback', index: pagesGenerated, total: generatable.length, filesWritten: filesWrittenCount,
              });
            }
          }
        } else {
          // No LLM — template fallback — write each immediately
          for (const page of pages) {
            const templateCode = this.generateTemplatePage(page, crawled, assetMap);
            const pagePatch: ASTPatch = { action: 'insert', targetFile: page.pagePath === '/' ? 'src/app/page.tsx' : `src/app/${page.pagePath.replace(/^\//, '')}/page.tsx`, codeBlock: templateCode };
            patches.push(pagePatch);

            const writtenNow = this.applyPatches([pagePatch]);
            writtenFiles.push(...writtenNow);
            filesWrittenCount += writtenNow.length;
            for (const wf of writtenNow) {
              this.progress.emit('generate', 'active', `Wrote: ${wf}`, {
                pagePath: page.pagePath, status: 'file-written', filePath: wf, index: pagesGenerated, total: generatable.length,
              });
            }

            pagesGenerated++;

            generateResults.push({
              path: page.pagePath,
              category: this.categorizePath(page.pagePath),
              status: 'done',
              error: undefined,
              filePath: `src/app/${page.pagePath === '/' ? 'page.tsx' : page.pagePath.replace(/^\//, '') + '/page.tsx'}`,
              componentCount: 1,
            });

            this.progress.emit('generate', 'active', `Template fallback for ${page.pagePath} — ${writtenNow.length} files written`, {
              pagePath: page.pagePath, method: 'template-fallback', index: pagesGenerated, total: generatable.length, filesWritten: filesWrittenCount,
            });
          }
        }
      }

      // Generate layout + zero-404 infrastructure — write immediately
      this.progress.emit('generate', 'active', `Generating layout, globals, and zero-404 infrastructure...`);

      let layoutPatches: ASTPatch[] = [];
      for (let layoutAttempt = 1; layoutAttempt <= 3; layoutAttempt++) {
        try {
          layoutPatches = await this.generateLayout(crawled, assetMap);
          break;
        } catch (layoutErr: any) {
          if (layoutAttempt < 3 && /503|UNAVAILABLE|overload|rate.?limit/i.test(layoutErr.message || '')) {
            this.progress.emit('generate', 'active', `LLM busy (attempt ${layoutAttempt}/3), waiting 10s before retry...`);
            await new Promise(r => setTimeout(r, 10000));
          } else {
            this.progress.emit('generate', 'active', `LLM unavailable — generating layout from templates`);
            layoutPatches = this.generateLayoutFallback(crawled, assetMap);
            break;
          }
        }
      }
      patches.push(...layoutPatches);
      const layoutWritten = this.applyPatches(layoutPatches);
      writtenFiles.push(...layoutWritten);
      filesWrittenCount += layoutWritten.length;
      for (const wf of layoutWritten) {
        this.progress.emit('generate', 'active', `Wrote: ${wf}`, { status: 'file-written', filePath: wf });
      }
      this.progress.emit('generate', 'active', `Layout + CSS generated — ${layoutPatches.length} files written`);

      const zeroPatches = await this.generateZeroFourFourInfra(crawled);
      patches.push(...zeroPatches);
      const zeroWritten = this.applyPatches(zeroPatches);
      writtenFiles.push(...zeroWritten);
      filesWrittenCount += zeroWritten.length;
      for (const wf of zeroWritten) {
        this.progress.emit('generate', 'active', `Wrote: ${wf}`, { status: 'file-written', filePath: wf });
      }
      this.progress.emit('generate', 'active', `Zero-404 infra — ${zeroPatches.length} files written (sitemap, robots, not-found, config)`);

      this.progress.emit('generate', 'done', `Code generation complete — ${filesWrittenCount} files written across ${generatable.length} pages`, {
        generateResults,
        totalPatches: patches.length,
        totalLlmCalls,
        filesWritten: filesWrittenCount,
      });
      this.state.generateResults = generateResults;
      this.completePhase('generate');

      // ═══════════════════════════════════════════════════════════
      // PHASE 4: SELF-CONTAIN (URL rewriting — files already written)
      // ═══════════════════════════════════════════════════════════
      this.startPhase('self-contain', 0);
      this.progress.emit('self-contain', 'active', `${filesWrittenCount} files already on disk — starting self-contain post-process...`);

      this.progress.emit('self-contain', 'active', `Scrubbing external URLs and rewriting to local paths...`);
      this.selfContainedPostProcess(assetMap, crawled);

      this.progress.emit('self-contain', 'active', `Downloading local fonts with @font-face declarations...`);

      // Verify no external dependencies remain
      this.progress.emit('self-contain', 'active', `Verifying zero external dependencies...`);
      const verification = this.verifySelfContained();
      this.progress.emit('self-contain', 'done', `Self-contained — ${verification.filesModified} files scrubbed, ${verification.externalUrlsRemaining} external URLs remaining`, {
        filesModified: verification.filesModified,
        externalUrlsRemaining: verification.externalUrlsRemaining,
        filesWritten: filesWrittenCount,
      });
      this.completePhase('self-contain');

      // ═══════════════════════════════════════════════════════════
      // PHASE 5: PREVIEW (ready)
      // ═══════════════════════════════════════════════════════════
      this.startPhase('preview', 1);
      this.progress.emit('preview', 'active', `Preview ready — ${filesWrittenCount} files available`);
      this.progress.emit('preview', 'done', `Clone complete! ${crawled.length} pages, ${assetsOk} assets, ${filesWrittenCount} files generated in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
      this.completePhase('preview');

      // ═══════════════════════════════════════════════════════════
      // PHASE 6: COMPLETE
      // ═══════════════════════════════════════════════════════════
      this.state.completedAt = Date.now();
      this.state.totalDuration = Date.now() - startTime;

      this.progress.emit('complete', 'done', `Clone finished in ${this.state.totalDuration}ms`, {
        pages: crawled.length,
        assets: assetsOk,
        files: writtenFiles.length,
        duration: this.state.totalDuration,
        writtenFiles,
        state: this.state,
      });

      return {
        success: true,
        pages: crawled.length,
        patches,
        assets: assetsOk,
        filesWritten: writtenFiles,
        duration: Date.now() - startTime,
        state: this.state,
      };
    } catch (err: any) {
      this.state.completedAt = Date.now();
      this.state.totalDuration = Date.now() - startTime;
      this.state.errors.push({ phase: 'crawl', item: 'orchestrator', reason: err.message || 'unknown', severity: 'error', recoverable: false });

      this.progress.emit('complete', 'failed', `Clone failed: ${err.message}`, { error: err.message });

      return {
        success: false,
        pages: 0,
        patches: [],
        assets: 0,
        filesWritten: [],
        duration: Date.now() - startTime,
        state: this.state,
        error: err.message,
      };
    }
  }

  // ─── Phase helpers ─────────────────────────────────────────────

  private startPhase(phase: ClonePhase, total: number) {
    this.state.phases[phase].status = 'active';
    this.state.phases[phase].startedAt = Date.now();
    this.state.phases[phase].itemsTotal = total;
  }

  private completePhase(phase: ClonePhase) {
    this.state.phases[phase].status = 'done';
    this.state.phases[phase].completedAt = Date.now();
  }

  private updatePhaseTotal(phase: ClonePhase, total: number) {
    this.state.phases[phase].itemsTotal = total;
  }

  // ─── Crawl helpers ─────────────────────────────────────────────

  private async extractPageData(page: any, url: string): Promise<CrawledPage> {
    const data = await page.evaluate(() => {
      const doc = document;
      const title = doc.title || '';

      // Meta tags
      const meta: Record<string, string> = {};
      doc.querySelectorAll('meta[name], meta[property]').forEach((el: any) => {
        const key = el.getAttribute('name') || el.getAttribute('property');
        const val = el.getAttribute('content');
        if (key && val) meta[key] = val;
      });

      // Images
      const images: string[] = [];
      doc.querySelectorAll('img[src]').forEach((el: any) => {
        const src = el.getAttribute('src');
        if (src && !src.startsWith('data:')) images.push(src);
      });

      // Videos
      const videos: string[] = [];
      doc.querySelectorAll('video[src], video source[src]').forEach((el: any) => {
        const src = el.getAttribute('src');
        if (src && !src.startsWith('data:')) videos.push(src);
      });

      // Fonts
      const fontLinks: string[] = [];
      doc.querySelectorAll('link[href*="fonts"], link[href*=".woff"], link[href*=".ttf"]').forEach((el: any) => {
        fontLinks.push(el.getAttribute('href'));
      });

      // CSS
      const cssUrls: string[] = [];
      doc.querySelectorAll('link[rel="stylesheet"]').forEach((el: any) => {
        cssUrls.push(el.getAttribute('href'));
      });

      // Links
      const links: string[] = [];
      doc.querySelectorAll('a[href]').forEach((el: any) => {
        links.push(el.getAttribute('href'));
      });

      // Navigation
      const navItems: Array<{ label: string; href: string }> = [];
      const navElements = doc.querySelectorAll('nav a[href], header a[href], [role="navigation"] a[href]');
      navElements.forEach((el: any) => {
        const label = el.textContent?.trim();
        const href = el.getAttribute('href');
        if (label && href) navItems.push({ label, href });
      });

      // Forms
      const forms: Array<{ action: string; method: string; fields: string[] }> = [];
      doc.querySelectorAll('form').forEach((form: any) => {
        const action = form.getAttribute('action') || '';
        const method = form.getAttribute('method') || 'GET';
        const fields: string[] = [];
        form.querySelectorAll('input, select, textarea').forEach((el: any) => {
          fields.push(el.getAttribute('name') || el.getAttribute('type') || 'unknown');
        });
        forms.push({ action, method, fields });
      });

      // Design tokens
      const computedStyle = getComputedStyle(doc.body);
      const colors = new Set<string>();
      const fonts = new Set<string>();
      const fontSizes = new Set<string>();
      const borderRadii = new Set<string>();
      const shadows = new Set<string>();
      const gradients = new Set<string>();

      doc.querySelectorAll('*').forEach((el: any) => {
        const cs = getComputedStyle(el);
        const bg = cs.backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)') colors.add(bg);
        const c = cs.color;
        if (c) colors.add(c);
        fonts.add(cs.fontFamily.split(',')[0]?.trim() || '');
        fontSizes.add(cs.fontSize);
        if (cs.borderRadius !== '0px') borderRadii.add(cs.borderRadius);
        if (cs.boxShadow !== 'none') shadows.add(cs.boxShadow);
        if (cs.backgroundImage.includes('gradient')) gradients.add(cs.backgroundImage);
      });

      // Animations
      const animations: string[] = [];
      const styleSheets = doc.styleSheets;
      try {
        for (let i = 0; i < styleSheets.length; i++) {
          try {
            const rules = styleSheets[i]?.cssRules;
            if (!rules) continue;
            for (let j = 0; j < rules.length; j++) {
              const rule = rules[j];
              if (rule instanceof CSSKeyframesRule) {
                animations.push(rule.name);
              }
            }
          } catch {}
        }
      } catch {}

      // SVG inlines
      const svgInlines: string[] = [];
      doc.querySelectorAll('svg').forEach((el: any) => {
        svgInlines.push(el.outerHTML.slice(0, 200));
      });

      // Text content
      const text = doc.body?.innerText || '';

      // Section summaries
      const sectionSummaries: string[] = [];
      doc.querySelectorAll('section, [class*="section"], main > div').forEach((el: any) => {
        const t = el.innerText?.trim();
        if (t && t.length > 20 && t.length < 500) sectionSummaries.push(t);
      });

      return {
        title,
        text: text.slice(0, 10000),
        meta,
        images,
        videos,
        fonts: fontLinks,
        cssUrls,
        links,
        navItems,
        forms,
        sectionSummaries: sectionSummaries.slice(0, 20),
        designTokens: {
          colors: [...colors].slice(0, 20),
          fonts: [...fonts].filter(f => f.length > 0).slice(0, 10),
          fontSizes: [...fontSizes].slice(0, 10),
          borderRadii: [...borderRadii].slice(0, 6),
          shadows: [...shadows].slice(0, 4),
          gradients: [...gradients].slice(0, 3),
        },
        animations: animations.slice(0, 5),
        svgInlines: svgInlines.slice(0, 5),
      };
    });

    const pagePath = new URL(url).pathname.replace(/\/$/, '') || '/';
    return {
      url,
      pagePath,
      ...data,
    };
  }

  // ─── Asset download ────────────────────────────────────────────

  private async downloadSingleAsset(_ctx: any, assetUrl: string, category: AssetCategory, assetsDir: string): Promise<AssetEntry> {
    // Use fetch() instead of Playwright page.goto() — 50x faster, zero browser memory
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      if (category === 'svg') {
        const resp = await fetch(assetUrl, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (resp.ok) {
          const text = await resp.text();
          const safeName = assetUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 120) + '.svg';
          fs.writeFileSync(path.join(assetsDir, safeName), text, 'utf-8');
          return { originalUrl: assetUrl, localPath: '/assets/' + safeName, localFileName: safeName, category, size: Buffer.byteLength(text), status: 'ok' };
        }
        return { originalUrl: assetUrl, localPath: '', localFileName: '', category, size: 0, status: 'failed' };
      }

      if (category === 'font' && assetUrl.includes('googleapis.com')) {
        const cssResp = await fetch(assetUrl, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (cssResp.ok) {
          const cssText = await cssResp.text();
          const fontUrls = [...cssText.matchAll(/url\(([^)]+)\)/g)].map(m => m[1]?.replace(/['"]/g, '')).filter((u): u is string => !!u && u.startsWith('http'));
          for (const fUrl of fontUrls) {
            try {
              const fResp = await fetch(fUrl, { signal: AbortSignal.timeout(10000) });
              if (fResp.ok) {
                const buf = Buffer.from(await fResp.arrayBuffer());
                const ext = fUrl.split('.').pop()?.split('?')[0] || 'woff2';
                const safeName = fUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 120) + '.' + ext;
                fs.writeFileSync(path.join(assetsDir, safeName), buf);
                return { originalUrl: fUrl, localPath: '/assets/' + safeName, localFileName: safeName, category: 'font', size: buf.length, status: 'ok' };
              }
            } catch {}
          }
        }
        return { originalUrl: assetUrl, localPath: '', localFileName: '', category, size: 0, status: 'failed' };
      }

      // Default: download via fetch()
      const ext = this.guessExt(assetUrl, category);
      const safeName = assetUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 120) + '.' + ext;
      const localPath = '/assets/' + safeName;
      const filePath = path.join(assetsDir, safeName);

      const resp = await fetch(assetUrl, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        // Skip files larger than 10MB (likely videos or huge images)
        if (buf.length > 10 * 1024 * 1024) {
          return { originalUrl: assetUrl, localPath: '', localFileName: '', category, size: buf.length, status: 'failed' };
        }
        fs.writeFileSync(filePath, buf);
        return { originalUrl: assetUrl, localPath, localFileName: safeName, category, size: buf.length, status: 'ok' };
      }
      return { originalUrl: assetUrl, localPath: '', localFileName: '', category, size: 0, status: 'failed' };
    } catch {
      return { originalUrl: assetUrl, localPath: '', localFileName: '', category, size: 0, status: 'failed' };
    } finally {
      clearTimeout(timeout);
    }
  }

  private categorizeAsset(url: string, hint: string): AssetCategory {
    if (hint) return hint as AssetCategory;
    if (/\.svg$/i.test(url)) return 'svg';
    if (/\.(mp4|webm|mov|avi)$/i.test(url) || url.includes('video')) return 'video';
    if (/\.(woff2?|ttf|otf|eot)$/i.test(url) || url.includes('font')) return 'font';
    if (/\.css$/i.test(url)) return 'css';
    if (/\.ico$/i.test(url)) return 'favicon';
    if (/logo/i.test(url)) return 'logo';
    if (/banner/i.test(url)) return 'banner';
    if (/\.(png|jpe?g|gif|webp|avif)$/i.test(url)) return 'image';
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

  // ─── Page generation ───────────────────────────────────────────

  private async generatePage(page: CrawledPage, allPages: CrawledPage[], assetMap: Map<string, string>): Promise<ASTPatch[]> {
    const routePath = page.pagePath === '/' ? '' : page.pagePath.replace(/^\//, '');
    const localImages = page.images.map(src => assetMap.get(src) || src);
    const localVideos = page.videos.map(src => assetMap.get(src) || src);

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

  // ─── Page grouping ─────────────────────────────────────────────

  private groupPagesByType(pages: CrawledPage[]): Record<string, CrawledPage[]> {
    const groups: Record<string, CrawledPage[]> = {};
    for (const page of pages) {
      let type: string;
      if (page.pagePath === '/') type = 'home';
      else if (/^\/collections\/[^/]+$/.test(page.pagePath)) type = 'collection';
      else if (/\/products\//.test(page.pagePath)) type = 'product';
      else if (/\/blogs\//.test(page.pagePath)) type = 'blog';
      else if (/\/policies\//.test(page.pagePath)) type = 'policy';
      else if (/\/pages\//.test(page.pagePath)) type = 'page';
      else type = 'other';
      if (!groups[type]) groups[type] = [];
      groups[type]!.push(page);
    }
    return groups;
  }

  private categorizePath(pagePath: string): PageCategory {
    if (pagePath === '/') return 'home';
    if (/\/products\//.test(pagePath)) return 'pdp';
    if (/^\/collections\//.test(pagePath)) return 'collection';
    if (/\/blogs\//.test(pagePath)) return 'blog';
    if (/\/policies\//.test(pagePath)) return 'policy';
    if (/\/pages\//.test(pagePath)) return 'static';
    return 'other';
  }

  // ─── Template adaptation ───────────────────────────────────────

  private async adaptPageFromTemplate(
    targetPage: CrawledPage, templatePage: CrawledPage, templatePatches: ASTPatch[],
    allPages: CrawledPage[], assetMap: Map<string, string>,
  ): Promise<ASTPatch[]> {
    const routePath = targetPage.pagePath === '/' ? '' : targetPage.pagePath.replace(/^\//, '');
    const targetFile = targetPage.pagePath === '/' ? 'src/app/page.tsx' : `src/app/${routePath}/page.tsx`;
    const filePath = path.join(this.workspaceRoot, targetFile);
    if (fs.existsSync(filePath)) return [];

    const mainPatch = templatePatches.find(p => p.targetFile.includes('page.tsx') && !p.targetFile.includes('layout'));
    if (!mainPatch) return [];

    let code = mainPatch.codeBlock;
    code = code.replace(new RegExp(this.escapeRegex(templatePage.title), 'g'), targetPage.title);
    const templateRoute = templatePage.pagePath === '/' ? '' : templatePage.pagePath.replace(/^\//, '');
    if (templateRoute !== routePath) code = code.replace(new RegExp(this.escapeRegex(templateRoute), 'g'), routePath);

    const templateImages = templatePage.images.slice(0, 10);
    const targetImages = targetPage.images.slice(0, 10);
    for (let i = 0; i < Math.min(templateImages.length, targetImages.length); i++) {
      const tImg = templateImages[i]; const tgtImg = targetImages[i];
      if (!tImg || !tgtImg) continue;
      const templateLocal = assetMap.get(tImg) || tImg;
      const targetLocal = assetMap.get(tgtImg) || tgtImg;
      if (templateLocal !== targetLocal) code = code.split(templateLocal).join(targetLocal);
    }

    return [{ action: 'insert', targetFile, codeBlock: code }];
  }

  private escapeRegex(str: string): string { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // ─── Template page (no LLM) ───────────────────────────────────

  private generateTemplatePage(page: CrawledPage, allPages: CrawledPage[], assetMap: Map<string, string>): string {
    const localImages = page.images.map(src => assetMap.get(src) || src).filter(src => src.startsWith('/'));
    const localVideos = page.videos.map(src => assetMap.get(src) || src).filter(src => src.startsWith('/'));
    const colors = page.designTokens.colors;
    const bgColor = colors[0] || '#09090b';
    const textColor = colors.find(c => c.includes('255') || c.includes('fff')) || '#fafafa';
    const navLinks = allPages.filter(p => p.pagePath !== '/' && !p.pagePath.startsWith('/es/')).map(p => {
      const label = p.title.split(/[|–—]/)[0]?.trim() || p.pagePath.split('/').pop() || p.pagePath;
      return `<Link href="${p.pagePath}" className="hover:text-white transition text-sm">${label}</Link>`;
    }).slice(0, 15);

    const heroImage = localImages[0] || '';
    const sectionImages = localImages.slice(1, 9);
    const sections = page.sectionSummaries.filter(s => s.length > 20).slice(0, 8).map((summary, i) => {
      const text = summary.replace(/^[^:]+:\s*"?/, '').replace(/"?\s*(imgs=\d+\s*vids=\d+)?$/, '').trim();
      const img = sectionImages[i] || '';
      if (img) return `<section className="py-16 px-6"><div className="max-w-7xl mx-auto flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-12 items-center"><div className="flex-1 space-y-4"><p className="text-zinc-300 leading-relaxed">${this.escapeHtml(text.slice(0, 500))}</p></div><div className="flex-1"><img src="${img}" alt="" className="w-full rounded-2xl object-cover" /></div></div></section>`;
      return `<section className="py-12 px-6"><div className="max-w-7xl mx-auto"><p className="text-zinc-300 leading-relaxed max-w-3xl">${this.escapeHtml(text.slice(0, 500))}</p></div></section>`;
    }).join('\n');

    return `'use client';\nimport Link from 'next/link';\n\nexport default function Home() {\n  return (\n    <div className="min-h-screen" style={{ backgroundColor: '${bgColor}', color: '${textColor}' }}>\n      <nav className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-zinc-800" style={{ backgroundColor: '${bgColor}cc' }}>\n        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">\n          <Link href="/" className="font-black text-lg tracking-tight">${this.escapeHtml(page.title.split(/[|–—]/)[0]?.trim() || 'Home')}</Link>\n          <div className="hidden md:flex items-center gap-6 text-zinc-400">${navLinks.join('\n            ')}</div>\n        </div>\n      </nav>\n      <main className="pt-16">\n        <section className="relative py-24 px-6 text-center"><div className="max-w-4xl mx-auto space-y-6"><h1 className="text-5xl md:text-7xl font-black tracking-tight">${this.escapeHtml(page.title.split(/[|–—]/)[0]?.trim() || page.title)}</h1>${heroImage ? `<img src="${heroImage}" alt="" className="mx-auto rounded-2xl max-h-96 object-cover" />` : ''}</div></section>\n${sections}\n${localVideos.length > 0 ? `<section className="py-16 px-6"><div className="max-w-4xl mx-auto"><video src="${localVideos[0]}" controls className="w-full rounded-2xl" /></div></section>` : ''}\n      </main>\n      <footer className="border-t border-zinc-800 py-8 mt-16"><div className="max-w-7xl mx-auto px-6 text-center text-sm text-zinc-500">&copy; ${new Date().getFullYear()} ${this.escapeHtml(page.title.split(/[|–—]/)[0]?.trim() || 'Site')}. All rights reserved.</div></footer>\n    </div>\n  );\n}`;
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // ─── Layout generation ─────────────────────────────────────────

  private async generateLayout(pages: CrawledPage[], assetMap: Map<string, string>): Promise<ASTPatch[]> {
    const home = pages.find(p => p.pagePath === '/') || pages[0]!;
    const allPageLinks = pages.map(p => {
      const label = p.navItems.length > 0 ? p.navItems[0]!.label : p.title || p.pagePath;
      const href = p.pagePath === '/' ? '/' : p.pagePath;
      return `${label} → ${href}`;
    }).slice(0, 50);

    const prompt = `Generate a Next.js App Router layout.tsx and globals.css for a full website clone.

WEBSITE: "${home.title}"
NAVIGATION (MUST include ALL links using <Link href="..."> from 'next/link'):
${allPageLinks.map(l => `- ${l}`).join('\n')}
COLORS: ${home.designTokens.colors.slice(0, 10).join(', ')}
FONTS: ${home.designTokens.fonts.slice(0, 5).join(', ')}

CRITICAL RULES:
1. MUST import Link from 'next/link': import Link from 'next/link';
2. Navigation MUST use <Link href="/path"> for ALL internal links.
3. Include ALL navigation links in a responsive nav bar.
4. Include a footer with all important links.
5. Google Fonts links for the listed fonts.

Generate:
1. src/app/layout.tsx — Root layout with nav, footer, Google Fonts
2. src/app/globals.css — Tailwind imports + CSS variables + keyframes

Self-contained output.`;

    const rawCode = await this.gateway.generateRawCode(prompt);
    const patches: ASTPatch[] = [];

    if (rawCode.includes('@tailwind') || rawCode.includes(':root') || rawCode.includes('.container')) {
      const cssMatch = rawCode.match(/@tailwind[\s\S]*/i) || rawCode.match(/:root[\s\S]*/i);
      if (cssMatch) {
        patches.push({ action: 'insert', targetFile: 'src/app/globals.css', codeBlock: cssMatch[0].trim() });
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

  // ─── Layout fallback (no LLM) ───────────────────────────────────

  private generateLayoutFallback(pages: CrawledPage[], assetMap: Map<string, string>): ASTPatch[] {
    const patches: ASTPatch[] = [];
    const home = pages.find(p => p.pagePath === '/') || pages[0]!;
    const title = home?.title || 'Website Clone';

    const navLinks = pages.map(p => {
      const label = p.navItems.length > 0 ? p.navItems[0]!.label : p.pagePath === '/' ? 'Home' : p.pagePath.split('/').filter(Boolean).pop() || p.pagePath;
      return { label, href: p.pagePath === '/' ? '/' : p.pagePath };
    }).filter((v, i, a) => a.findIndex(x => x.href === v.href) === i).slice(0, 20);

    const layout = `import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

const siteTitle = ${JSON.stringify(title)};

export const metadata: Metadata = {
  title: siteTitle,
  description: ${JSON.stringify(title + ' — cloned website')},
};

const nav = ${JSON.stringify(navLinks)};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#fff', color: '#111' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem 2rem', borderBottom: '1px solid #e5e7eb', background: '#fff', position: 'sticky', top: 0, zIndex: 50 }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: '1.25rem', textDecoration: 'none', color: '#111' }}>{siteTitle}</Link>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {nav.map((l) => (
              <Link key={l.href} href={l.href} style={{ textDecoration: 'none', color: '#555', fontSize: '0.9rem' }}>{l.label}</Link>
            ))}
          </div>
        </nav>
        <main>{children}</main>
        <footer style={{ borderTop: '1px solid #e5e7eb', padding: '2rem', textAlign: 'center', color: '#999', fontSize: '0.85rem' }}>
          &copy; {new Date().getFullYear()} {siteTitle}. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
`;
    patches.push({ action: 'insert', targetFile: 'src/app/layout.tsx', codeBlock: layout });

    const globals = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground: #111;
  --background: #fff;
  --primary: ${home?.designTokens.colors[0] || '#2563eb'};
  --secondary: ${home?.designTokens.colors[1] || '#64748b'};
}

* { box-sizing: border-box; }

body {
  color: var(--foreground);
  background: var(--background);
  margin: 0;
}

a { color: inherit; text-decoration: none; }

img { max-width: 100%; height: auto; }
`;
    patches.push({ action: 'insert', targetFile: 'src/app/globals.css', codeBlock: globals });

    return patches;
  }

  // ─── Zero-404 infrastructure ───────────────────────────────────

  private async generateZeroFourFourInfra(pages: CrawledPage[]): Promise<ASTPatch[]> {
    const patches: ASTPatch[] = [];
    const home = pages.find(p => p.pagePath === '/') || pages[0]!;
    const origin = new URL(home.url).origin;

    const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  output: 'standalone',
  images: { unoptimized: true, remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/:path+', destination: '/:path+', permanent: true, has: [{ type: 'trailingSlash', value: 'true' }] },
    ];
  },
};
export default nextConfig;
`;
    patches.push({ action: 'insert', targetFile: 'next.config.ts', codeBlock: nextConfig });

    patches.push({ action: 'insert', targetFile: 'src/app/not-found.tsx', codeBlock: `import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '6rem', fontWeight: 800, color: '#111', margin: 0 }}>404</h1>
      <p style={{ fontSize: '1.2rem', color: '#666', marginTop: '1rem' }}>Page not found</p>
      <Link href="/" style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', background: '#111', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>Go Home</Link>
    </div>
  );
}
` });

    const sitemapEntries = pages.map(p => {
      const loc = p.pagePath === '/' ? '' : p.pagePath;
      return `  { url: 'https://clone-result.vercel.app${loc}', lastModified: new Date(), changeFrequency: 'weekly', priority: ${p.pagePath === '/' ? '1.0' : '0.8'} }`;
    }).join(',\n');
    patches.push({ action: 'insert', targetFile: 'src/app/sitemap.ts', codeBlock: `import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
${sitemapEntries},
  ];
}
` });

    patches.push({ action: 'insert', targetFile: 'src/app/robots.ts', codeBlock: `import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/' }], sitemap: 'https://clone-result.vercel.app/sitemap.xml' };
}
` });

    return patches;
  }

  // ─── File writing ──────────────────────────────────────────────

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

  // ─── Self-contained post-process ───────────────────────────────

  private selfContainedPostProcess(assetMap: Map<string, string>, pages: CrawledPage[]): void {
    const reverseMap = new Map<string, string>();
    for (const [original, local] of assetMap.entries()) reverseMap.set(original, local);

    const pageUrlToPath = new Map<string, string>();
    for (const p of pages) {
      pageUrlToPath.set(p.url, p.pagePath === '/' ? '/' : p.pagePath);
      const noTrailing = p.pagePath.replace(/\/$/, '');
      if (noTrailing) pageUrlToPath.set(`${new URL(p.url).origin}${noTrailing}`, noTrailing);
    }

    const srcDir = path.join(this.workspaceRoot, 'src');
    if (!fs.existsSync(srcDir)) return;
    const files = this.walkDir(srcDir, '.tsx');
    let filesModified = 0;

    for (const filePath of files) {
      let content = fs.readFileSync(filePath, 'utf-8');
      let modified = false;

      for (const [original, local] of reverseMap.entries()) {
        if (content.includes(original)) { content = content.split(original).join(local); modified = true; }
        try {
          const encoded = encodeURI(original);
          if (content.includes(encoded)) { content = content.split(encoded).join(local); modified = true; }
        } catch {}
      }

      for (const [originalUrl, localPath] of pageUrlToPath.entries()) {
        if (content.includes(`"${originalUrl}"`) || content.includes(`'${originalUrl}'`)) {
          content = content.split(`"${originalUrl}"`).join(`"${localPath}"`);
          content = content.split(`'${originalUrl}'`).join(`'${localPath}'`);
          modified = true;
        }
      }

      content = content.replace(/src="(https?:\/\/[^"]+\.(png|jpe?g|gif|webp|avif|svg|ico))"/gi, (match: string, url: string) => reverseMap.get(url) ? `src="${reverseMap.get(url)}"` : match);
      content = content.replace(/src="(https?:\/\/[^"]+\.(mp4|webm|mov|avi))"/gi, (match: string, url: string) => reverseMap.get(url) ? `src="${reverseMap.get(url)}"` : match);
      content = content.replace(/href="(https?:\/\/[^"]+\.(woff2?|ttf|otf|eot))"/gi, (match: string, url: string) => reverseMap.get(url) ? `href="${reverseMap.get(url)}"` : match);
      content = content.replace(/href="(https?:\/\/fonts\.googleapis\.com[^"]*)"/gi, '');

      if (modified) { fs.writeFileSync(filePath, content, 'utf-8'); filesModified++; }
    }

    this.writeLocalFonts(pages);
  }

  private writeLocalFonts(pages: CrawledPage[]): void {
    const assetsDir = path.join(this.workspaceRoot, 'public', 'assets');
    if (!fs.existsSync(assetsDir)) return;
    const fontFiles = fs.readdirSync(assetsDir).filter(f => /\.(woff2?|ttf|otf|eot)$/i.test(f));
    if (fontFiles.length === 0) return;

    const fontFaces = fontFiles.map(file => {
      const ext = file.split('.').pop();
      const format = ext === 'woff2' ? 'woff2' : ext === 'woff' ? 'woff' : ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : 'embedded-opentype';
      const family = file.replace(/[-_]/g, ' ').replace(/\.\w+$/, '').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return `@font-face { font-family: '${family}'; src: url('/assets/${file}') format('${format}'); font-display: swap; }`;
    }).join('\n\n');

    if (fontFaces) {
      const cssPath = path.join(this.workspaceRoot, 'src', 'app', 'globals.css');
      let css = '';
      if (fs.existsSync(cssPath)) css = fs.readFileSync(cssPath, 'utf-8');
      if (!css.includes('@font-face')) { css = fontFaces + '\n\n' + css; fs.writeFileSync(cssPath, css, 'utf-8'); }
    }
  }

  // ─── Verification ──────────────────────────────────────────────

  private verifySelfContained(): { filesModified: number; externalUrlsRemaining: number } {
    const srcDir = path.join(this.workspaceRoot, 'src');
    if (!fs.existsSync(srcDir)) return { filesModified: 0, externalUrlsRemaining: 0 };
    const files = this.walkDir(srcDir, '.tsx');
    let externalUrlsRemaining = 0;
    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const externalMatches = content.match(/src="https?:\/\//g) || [];
      externalUrlsRemaining += externalMatches.length;
    }
    return { filesModified: files.length, externalUrlsRemaining };
  }

  private walkDir(dir: string, ext: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) results.push(...this.walkDir(full, ext));
      else if (entry.name.endsWith(ext)) results.push(full);
    }
    return results;
  }

  // ─── Utilities ─────────────────────────────────────────────────

  private truncateUrl(url: string): string {
    try {
      const u = new URL(url);
      return u.pathname.length > 60 ? u.pathname.slice(0, 57) + '...' : u.pathname;
    } catch { return url.slice(0, 60); }
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}
