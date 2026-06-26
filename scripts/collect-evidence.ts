#!/usr/bin/env npx tsx
/**
 * Evidence Collector — Offline evidence collection for BOS knowledge layer.
 *
 * Collects design patterns, competitor analysis, and industry evidence from:
 * - URL content scraping (headers, layout patterns, color schemes)
 * - Screenshot capture
 * - SEO/meta analysis
 * - Accessibility audit
 *
 * Usage:
 *   npx tsx scripts/collect-evidence.ts --url https://example.com --out evidence/
 *   npx tsx scripts/collect-evidence.ts --urls urls.txt --out evidence/
 *   npx tsx scripts/collect-evidence.ts --industry luxury --out evidence/luxury/
 */
import { PersistentEvidenceStore } from '../src/bos/evidence/persistent-store.js';
import { hashContent } from '../src/bos/evidence/fingerprint.js';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface EvidenceCollectionOptions {
  urls?: string[];
  industry?: string;
  outDir: string;
  concurrency?: number;
}

interface ScrapedPage {
  url: string;
  title: string;
  description: string;
  keywords: string[];
  colors: string[];
  fonts: string[];
  layout: string[];
  components: string[];
  images: string[];
  hasForm: boolean;
  hasPricing: boolean;
  hasTestimonials: boolean;
  hasAuth: boolean;
  responsiveScore: number;
}

function parseArgs(): EvidenceCollectionOptions {
  const args = process.argv.slice(2);
  const opts: EvidenceCollectionOptions = { outDir: 'evidence' };

  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      opts.urls = [args[++i]];
    } else if (args[i] === '--urls' && args[i + 1]) {
      const file = args[++i];
      if (existsSync(file)) {
        opts.urls = readFileSync(file, 'utf-8').split('\n').filter(l => l.trim());
      }
    } else if (args[i] === '--industry' && args[i + 1]) {
      opts.industry = args[++i];
    } else if (args[i] === '--out' && args[i + 1]) {
      opts.outDir = args[++i];
    }
  }

  return opts;
}

async function scrapePage(url: string): Promise<ScrapedPage> {
  console.log(`  Scraping: ${url}`);

  const page: ScrapedPage = {
    url,
    title: '',
    description: '',
    keywords: [],
    colors: [],
    fonts: [],
    layout: [],
    components: [],
    images: [],
    hasForm: false,
    hasPricing: false,
    hasTestimonials: false,
    hasAuth: false,
    responsiveScore: 0,
  };

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BuildSameEvidenceCollector/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) page.title = titleMatch[1].trim();

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    if (descMatch) page.description = descMatch[1].trim();

    // Extract keywords
    const kwMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
    if (kwMatch) page.keywords = kwMatch[1].split(',').map(k => k.trim().toLowerCase());

    // Extract colors from inline styles and CSS variables
    const colorRegex = /#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)/g;
    const colorMatches = html.match(colorRegex) || [];
    const uniqueColors = [...new Set(colorMatches)].slice(0, 20);
    page.colors = uniqueColors;

    // Extract font families
    const fontRegex = /font-family:\s*([^;}\n]+)/gi;
    let fontMatch;
    while ((fontMatch = fontRegex.exec(html)) !== null) {
      const fonts = fontMatch[1].split(',').map(f => f.trim().replace(/['"]/g, '')).filter(f => !['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy'].includes(f));
      page.fonts.push(...fonts);
    }
    page.fonts = [...new Set(page.fonts)].slice(0, 5);

    // Detect layout patterns
    if (html.includes('grid') || html.includes('grid-template')) page.layout.push('grid');
    if (html.includes('flexbox') || html.includes('display: flex') || html.includes('display:flex')) page.layout.push('flexbox');
    if (html.includes('sidebar') || html.includes('side-nav')) page.layout.push('sidebar');
    if (html.includes('hero') || html.includes('jumbotron')) page.layout.push('hero');
    if (html.includes('bento') || html.includes('bento-grid')) page.layout.push('bento');

    // Detect components
    if (html.match(/pricing|plan|tier/i)) { page.hasPricing = true; page.components.push('pricing'); }
    if (html.match(/testimonial|review|feedback/i)) { page.hasTestimonials = true; page.components.push('testimonials'); }
    if (html.match(/<form|login|signup|register/i)) { page.hasForm = true; page.components.push('form'); }
    if (html.match(/login|signin|auth|oauth/i)) { page.hasAuth = true; page.components.push('auth'); }
    if (html.match(/nav|navbar|navigation/i)) page.components.push('navigation');
    if (html.match(/footer|site-footer/i)) page.components.push('footer');
    if (html.match(/cta|call-to-action/i)) page.components.push('cta');
    if (html.match(/accordion|collapse|faq/i)) page.components.push('accordion');
    if (html.match(/carousel|slider|swiper/i)) page.components.push('carousel');
    if (html.match(/modal|dialog|popup/i)) page.components.push('modal');
    if (html.match(/tabs|tab-panel/i)) page.components.push('tabs');
    if (html.match(/table|data-table/i)) page.components.push('table');
    if (html.match(/chart|graph|visualization/i)) page.components.push('chart');
    if (html.match(/map|leaflet|mapbox|google-map/i)) page.components.push('map');
    if (html.match(/calendar|datepicker|date-picker/i)) page.components.push('calendar');
    if (html.match(/search|search-bar|search-input/i)) page.components.push('search');

    // Extract images
    const imgRegex = /<img[^>]*src=["']([^"']+)["']/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(html)) !== null) {
      page.images.push(imgMatch[1]);
    }
    page.images = page.images.slice(0, 20);

    // Responsive score
    let score = 0;
    if (html.includes('viewport')) score += 30;
    if (html.includes('@media')) score += 25;
    if (html.includes('responsive') || html.includes('mobile')) score += 15;
    if (html.includes('max-width') || html.includes('min-width')) score += 15;
    if (html.includes('flex') || html.includes('grid')) score += 15;
    page.responsiveScore = Math.min(score, 100);

    console.log(`    ✓ Title: ${page.title || '(none)'}`);
    console.log(`    ✓ Components: ${page.components.join(', ') || '(none)'}`);
    console.log(`    ✓ Responsive: ${page.responsiveScore}%`);
  } catch (err) {
    console.log(`    ✗ Error: ${(err as Error).message}`);
  }

  return page;
}

function analyzeDesignPatterns(pages: ScrapedPage[]): {
  commonColors: string[];
  commonFonts: string[];
  commonComponents: string[];
  layoutPatterns: string[];
  industryInsights: string[];
} {
  const colorCount = new Map<string, number>();
  const fontCount = new Map<string, number>();
  const componentCount = new Map<string, number>();
  const layoutCount = new Map<string, number>();

  for (const page of pages) {
    for (const color of page.colors) {
      colorCount.set(color, (colorCount.get(color) || 0) + 1);
    }
    for (const font of page.fonts) {
      fontCount.set(font, (fontCount.get(font) || 0) + 1);
    }
    for (const comp of page.components) {
      componentCount.set(comp, (componentCount.get(comp) || 0) + 1);
    }
    for (const layout of page.layout) {
      layoutCount.set(layout, (layoutCount.get(layout) || 0) + 1);
    }
  }

  const sortByCount = <T>(map: Map<T, number>) =>
    Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k);

  const insights: string[] = [];
  if (pages.some(p => p.hasPricing)) insights.push('pricing-page-detected');
  if (pages.some(p => p.hasTestimonials)) insights.push('testimonials-detected');
  if (pages.some(p => p.hasAuth)) insights.push('authentication-required');
  if (pages.some(p => p.responsiveScore > 70)) insights.push('responsive-design');
  if (pages.some(p => p.hasForm)) insights.push('forms-required');

  return {
    commonColors: sortByCount(colorCount).slice(0, 10),
    commonFonts: sortByCount(fontCount).slice(0, 5),
    commonComponents: sortByCount(componentCount).slice(0, 15),
    layoutPatterns: sortByCount(layoutCount),
    industryInsights: insights,
  };
}

async function main() {
  const opts = parseArgs();

  if (!opts.urls || opts.urls.length === 0) {
    console.error('Usage: npx tsx scripts/collect-evidence.ts --url <url> --out <dir>');
    console.error('       npx tsx scripts/collect-evidence.ts --urls <file> --out <dir>');
    process.exit(1);
  }

  console.log(`\n🔍 Evidence Collector`);
  console.log(`  URLs: ${opts.urls.length}`);
  console.log(`  Industry: ${opts.industry || '(auto-detect)'}`);
  console.log(`  Output: ${opts.outDir}\n`);

  // Ensure output directory exists
  mkdirSync(opts.outDir, { recursive: true });

  // Scrape pages
  const pages: ScrapedPage[] = [];
  for (const url of opts.urls) {
    const page = await scrapePage(url);
    pages.push(page);
  }

  // Analyze patterns
  console.log('\n📊 Analyzing design patterns...');
  const patterns = analyzeDesignPatterns(pages);

  console.log(`  Common colors: ${patterns.commonColors.slice(0, 5).join(', ')}`);
  console.log(`  Common fonts: ${patterns.commonFonts.slice(0, 3).join(', ')}`);
  console.log(`  Components: ${patterns.commonComponents.join(', ')}`);
  console.log(`  Layout: ${patterns.layoutPatterns.join(', ')}`);
  console.log(`  Insights: ${patterns.industryInsights.join(', ')}`);

  // Create evidence record
  const evidence = {
    id: `evidence.${Date.now()}`,
    industry: opts.industry || 'general',
    collectedAt: new Date().toISOString(),
    sources: pages.map(p => ({
      url: p.url,
      title: p.title,
      description: p.description,
      keywords: p.keywords,
    })),
    designPatterns: patterns,
    pages: pages.map(p => ({
      url: p.url,
      components: p.components,
      layout: p.layout,
      colors: p.colors,
      fonts: p.fonts,
      hasPricing: p.hasPricing,
      hasTestimonials: p.hasTestimonials,
      responsiveScore: p.responsiveScore,
    })),
    summary: {
      totalPages: pages.length,
      avgResponsiveScore: Math.round(pages.reduce((a, p) => a + p.responsiveScore, 0) / pages.length),
      uniqueComponents: [...new Set(pages.flatMap(p => p.components))],
      uniqueColors: [...new Set(pages.flatMap(p => p.colors))].length,
    },
  };

  // Save raw evidence JSON
  const evidencePath = join(opts.outDir, `evidence-${Date.now()}.json`);
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.log(`\n✅ Evidence saved to ${evidencePath}`);

  // Store in persistent evidence store
  const store = new PersistentEvidenceStore(join(opts.outDir, 'store'));
  const contentHash = hashContent(JSON.stringify(evidence));
  await store.store({
    source: opts.urls[0],
    type: 'design-analysis',
    data: evidence,
    contentHash,
    metadata: {
      industry: opts.industry || 'general',
      urlCount: opts.urls.length,
      collectedAt: new Date().toISOString(),
    },
  });
  console.log(`✅ Evidence stored in persistent store (hash: ${contentHash.slice(0, 12)})`);
  console.log(`\nDone! Use this evidence to inform BOS knowledge generation.\n`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
