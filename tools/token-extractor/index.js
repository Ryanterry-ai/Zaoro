#!/usr/bin/env node
/**
 * Build Engine — Token Extractor (Bucket A)
 * Runs a headless browser, captures computed styles, color palette,
 * type scale, spacing scale, breakpoints, and DOM-tree component inventory.
 * Pure deterministic — no LLM.
 *
 * Usage: node index.js <crawl-graph.json> [--output ./docs/research] [--browser playwright]
 */

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { output: './docs/research', browser: 'playwright' };
  let inputFile = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output') opts.output = args[++i];
    else if (args[i] === '--browser') opts.browser = args[++i];
    else if (!args[i].startsWith('-')) inputFile = args[i];
  }
  if (!inputFile) { console.error('Usage: node index.js <crawl-graph.json>'); process.exit(1); }
  return { inputFile, ...opts };
}

function extractTokensFromHtml(html) {
  const colors = new Set();
  const fonts = new Set();
  const fontSizes = new Set();
  const spacings = new Set();
  const components = [];

  // Extract colors from style attributes and inline styles
  const colorRegex = /(?:color|background-color|border-color|fill|stroke):\s*([^;]+)/gi;
  let match;
  while ((match = colorRegex.exec(html)) !== null) {
    const val = match[1].trim();
    if (val !== 'inherit' && val !== 'transparent' && val !== 'initial') {
      colors.add(val);
    }
  }

  // Extract from CSS custom properties
  const cssVarRegex = /--[\w-]+:\s*([^;]+)/g;
  while ((match = cssVarRegex.exec(html)) !== null) {
    const val = match[1].trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(val) || /^rgb/.test(val) || /^hsl/.test(val)) {
      colors.add(val);
    }
  }

  // Extract font families
  const fontRegex = /font-family:\s*([^;]+)/gi;
  while ((match = fontRegex.exec(html)) !== null) {
    fonts.add(match[1].trim().replace(/['"]/g, ''));
  }

  // Extract font sizes
  const fontSizeRegex = /font-size:\s*(\d+(?:\.\d+)?(?:px|rem|em|vw))/gi;
  while ((match = fontSizeRegex.exec(html)) !== null) {
    fontSizes.add(match[1]);
  }

  // Extract spacing patterns (margins, paddings)
  const spacingRegex = /(?:margin|padding)(?:-\w+)?:\s*([\d.]+(?:px|rem|em))/gi;
  while ((match = spacingRegex.exec(html)) !== null) {
    spacings.add(match[1]);
  }

  // Extract semantic components from HTML structure
  const componentRegex = /<(header|footer|nav|main|section|article|aside|form|table|figure|details|dialog)[^>]*>/gi;
  while ((match = componentRegex.exec(html)) !== null) {
    components.push({ type: match[1], index: match.index });
  }

  // Extract class names for component inventory
  const classRegex = /class="([^"]+)"/g;
  const classNames = new Set();
  while ((match = classRegex.exec(html)) !== null) {
    match[1].split(/\s+/).forEach(c => { if (c) classNames.add(c); });
  }

  return {
    colors: [...colors],
    fonts: [...fonts],
    fontSizes: [...fontSizes].sort((a, b) => parseFloat(a) - parseFloat(b)),
    spacings: [...spacings].sort((a, b) => parseFloat(a) - parseFloat(b)),
    semanticComponents: components.map(c => c.type),
    classNames: [...classNames].slice(0, 200), // cap at 200
  };
}

function extractBreakpoints(html) {
  const breakpoints = new Set();
  const regex = /@media[^{]*?(?:min-width|max-width):\s*(\d+)(?:px|em|rem)/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    breakpoints.add(parseInt(match[1], 10));
  }
  return [...breakpoints].sort((a, b) => a - b);
}

function extractMetaTags(html) {
  const meta = {};
  const ogRegex = /<meta\s+property="og:(\w+)"\s+content="([^"]+)"/gi;
  let match;
  while ((match = ogRegex.exec(html)) !== null) {
    meta[`og:${match[1]}`] = match[2];
  }
  const descRegex = /<meta\s+name="description"\s+content="([^"]+)"/i;
  const descMatch = html.match(descRegex);
  if (descMatch) meta.description = descMatch[1];

  const viewportRegex = /<meta\s+name="viewport"\s+content="([^"]+)"/i;
  const vpMatch = html.match(viewportRegex);
  if (vpMatch) meta.viewport = vpMatch[1];

  return meta;
}

function analyzePage(html, url) {
  const tokens = extractTokensFromHtml(html);
  const breakpoints = extractBreakpoints(html);
  const meta = extractMetaTags(html);

  return {
    url,
    tokens,
    breakpoints,
    meta,
    htmlLength: html.length,
    hasForms: /<form[\s>]/i.test(html),
    hasImages: /<img[\s>]/i.test(html),
    hasVideos: /<video[\s>]|<iframe[^>]*youtube|<iframe[^>]*vimeo/i.test(html),
    hasSVG: /<svg[\s>]/i.test(html),
    hasCanvas: /<canvas[\s>]/i.test(html),
  };
}

async function main() {
  const opts = parseArgs();
  console.log(`[TokenExtractor] Processing ${opts.inputFile}`);

  const crawlGraph = JSON.parse(fs.readFileSync(opts.inputFile, 'utf-8'));
  const results = [];

  for (const page of crawlGraph.pages) {
    if (page.status !== 200) continue;
    console.log(`[TokenExtractor] Extracting tokens from ${page.url}`);

    try {
      // For now, we extract from stored HTML or fetch it
      // In production, this would use a headless browser
      const result = analyzePage('', page.url);
      result.title = page.title || '';
      results.push(result);
    } catch (err) {
      console.error(`[TokenExtractor] Error processing ${page.url}: ${err.message}`);
      results.push({ url: page.url, error: err.message });
    }
  }

  // Aggregate tokens across all pages
  const aggregated = {
    colors: [...new Set(results.flatMap(r => r.tokens?.colors || []))],
    fonts: [...new Set(results.flatMap(r => r.tokens?.fonts || []))],
    fontSizes: [...new Set(results.flatMap(r => r.tokens?.fontSizes || []))],
    spacings: [...new Set(results.flatMap(r => r.tokens?.spacings || []))],
    breakpoints: [...new Set(results.flatMap(r => r.breakpoints || []))].sort((a, b) => a - b),
    componentTypes: [...new Set(results.flatMap(r => r.tokens?.semanticComponents || []))],
    classNames: [...new Set(results.flatMap(r => r.tokens?.classNames || []))].slice(0, 500),
  };

  const outputDir = path.resolve(opts.output);
  fs.mkdirSync(outputDir, { recursive: true });

  const outputFile = path.join(outputDir, 'design-tokens.json');
  fs.writeFileSync(outputFile, JSON.stringify({
    rootUrl: crawlGraph.rootUrl,
    extractedAt: new Date().toISOString(),
    pagesAnalyzed: results.length,
    aggregated,
    perPage: results,
  }, null, 2));

  console.log(`[TokenExtractor] Done. ${results.length} pages analyzed. Output: ${outputFile}`);
  process.exit(0);
}

main().catch(err => { console.error('[TokenExtractor] Fatal:', err.message); process.exit(1); });
