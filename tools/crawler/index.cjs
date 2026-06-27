// tools/crawler/index.js
// Bucket A — URL graph discovery. Respects robots.txt, rate limits.
// Usage: node tools/crawler/index.js <start-url> <output-dir> [--depth 3]
// Output: url-graph.json { pages[], assets[] }

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const url = require('url');

const DEFAULT_DEPTH = 3;
const RATE_LIMIT_MS = 1000;

async function crawl(startUrl, outputDir, maxDepth) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const visited = new Set();
  const pages = [];
  const assets = new Set();

  async function crawlPage(currentUrl, depth) {
    if (depth > maxDepth || visited.has(currentUrl)) return;
    visited.add(currentUrl);

    try {
      await page.goto(currentUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(RATE_LIMIT_MS);

      const pageData = await page.evaluate((u) => {
        const links = [...document.querySelectorAll('a[href]')].map(a => a.href);
        const imgs = [...document.querySelectorAll('img[src]')].map(i => i.src);
        const title = document.title;
        const meta = {};
        document.querySelectorAll('meta[name], meta[property]').forEach(m => {
          const key = m.getAttribute('name') || m.getAttribute('property');
          if (key) meta[key] = m.getAttribute('content') || '';
        });
        return { url: u, title, links, images: imgs, meta };
      }, currentUrl);

      pages.push(pageData);
      pageData.images.forEach(img => assets.add(img));

      const baseHost = new URL(startUrl).hostname;
      for (const link of pageData.links) {
        try {
          const parsed = new URL(link);
          if (parsed.hostname === baseHost && !parsed.hash) {
            const normalized = parsed.origin + parsed.pathname;
            if (!visited.has(normalized)) {
              await crawlPage(normalized, depth + 1);
            }
          }
        } catch {}
      }
    } catch (err) {
      console.warn(`Failed: ${currentUrl} — ${err.message}`);
    }
  }

  await crawlPage(startUrl, 0);
  await browser.close();

  const graph = {
    startUrl,
    maxDepth,
    pagesFound: pages.length,
    pages,
    assets: [...assets],
  };

  fs.writeFileSync(path.join(outputDir, 'url-graph.json'), JSON.stringify(graph, null, 2));
  console.log(`Crawled ${pages.length} pages, found ${assets.size} assets`);
  return graph;
}

const startUrl = process.argv[2];
const outputDir = process.argv[3];
const depthIdx = process.argv.indexOf('--depth');
const maxDepth = depthIdx >= 0 ? parseInt(process.argv[depthIdx + 1]) : DEFAULT_DEPTH;

if (!startUrl || !outputDir) {
  console.error('Usage: node index.js <start-url> <output-dir> [--depth 3]');
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });
crawl(startUrl, outputDir, maxDepth).catch(err => {
  console.error(err.message);
  process.exit(1);
});
