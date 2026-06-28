#!/usr/bin/env node
/**
 * Build Engine — Crawler (Bucket A)
 * Discovers a site's URL graph up to configurable depth.
 * Respects robots.txt and rate limits. Pure deterministic — no LLM.
 *
 * Usage: node index.js <root-url> [--depth 3] [--output ./docs/research]
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const path = require('path');
const fs = require('fs');

const DEFAULT_DEPTH = 3;
const DEFAULT_DELAY_MS = 500;
const USER_AGENT = 'BuildEngine-Crawler/1.0';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { depth: DEFAULT_DEPTH, output: './docs/research', delayMs: DEFAULT_DELAY_MS };
  let url = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--depth') opts.depth = parseInt(args[++i], 10) || DEFAULT_DEPTH;
    else if (args[i] === '--output') opts.output = args[++i];
    else if (args[i] === '--delay') opts.delayMs = parseInt(args[++i], 10) || DEFAULT_DELAY_MS;
    else if (!args[i].startsWith('-')) url = args[i];
  }
  if (!url) { console.error('Usage: node index.js <url> [--depth N] [--output dir]'); process.exit(1); }
  return { url, ...opts };
}

function fetchUrl(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': USER_AGENT }, timeout }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve({ status: res.statusCode, redirect: res.headers.location, body: '' });
      }
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function fetchRobotsTxt(baseUrl) {
  try {
    const parsed = new URL(baseUrl);
    const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
    const res = await fetchUrl(robotsUrl, 5000);
    if (res.status === 200) return res.body;
  } catch { /* no robots.txt */ }
  return '';
}

function parseRobotsTxt(content) {
  const disallowed = [];
  let inUserAgent = false;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith('user-agent:')) {
      const agent = trimmed.split(':')[1].trim();
      inUserAgent = agent === '*' || agent.toLowerCase().includes('buildengine');
    } else if (inUserAgent && trimmed.toLowerCase().startsWith('disallow:')) {
      const path = trimmed.split(':')[1].trim();
      if (path) disallowed.push(path);
    }
  }
  return disallowed;
}

function isDisallowed(urlPath, disallowedPaths) {
  return disallowedPaths.some(d => urlPath.startsWith(d));
}

function extractLinks(html, baseUrl) {
  const links = new Set();
  const baseParsed = new URL(baseUrl);
  const regex = /href=["']([^"'#]+)/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], baseUrl);
      if (resolved.origin === baseParsed.origin) {
        // Strip query params and fragments for dedup
        resolved.search = '';
        resolved.hash = '';
        links.add(resolved.href);
      }
    } catch { /* invalid URL */ }
  }
  return links;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function crawl(rootUrl, maxDepth, delayMs) {
  const parsed = new URL(rootUrl);
  const baseUrl = `${parsed.protocol}//${parsed.host}`;

  const robotsContent = await fetchRobotsTxt(baseUrl);
  const disallowed = parseRobotsTxt(robotsContent);

  const visited = new Set();
  const queue = [{ url: rootUrl, depth: 0 }];
  const results = [];

  while (queue.length > 0) {
    const { url, depth } = queue.shift();
    const normalizedUrl = new URL(url);
    normalizedUrl.search = '';
    normalizedUrl.hash = '';
    const key = normalizedUrl.href;

    if (visited.has(key) || depth > maxDepth) continue;
    if (isDisallowed(normalizedUrl.pathname, disallowed)) {
      results.push({ url: key, status: 'blocked-robots', depth, links: [] });
      continue;
    }

    visited.add(key);
    console.log(`[Crawl] depth=${depth} ${key}`);

    try {
      const res = await fetchUrl(key);
      const links = depth < maxDepth ? extractLinks(res.body, key) : new Set();
      const linkArray = [...links];

      results.push({
        url: key,
        status: res.status,
        depth,
        links: linkArray,
        contentType: res.headers?.['content-type'] || 'unknown',
        title: extractTitle(res.body),
      });

      for (const link of linkArray) {
        if (!visited.has(link)) {
          queue.push({ url: link, depth: depth + 1 });
        }
      }
    } catch (err) {
      results.push({ url: key, status: 'error', depth, error: err.message, links: [] });
    }

    if (delayMs > 0) await sleep(delayMs);
  }

  return results;
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '';
}

async function main() {
  const opts = parseArgs();
  console.log(`[Crawler] Starting crawl of ${opts.url} (depth: ${opts.depth})`);

  const results = await crawl(opts.url, opts.depth, opts.delayMs);

  // Deduplicate by URL
  const seen = new Set();
  const unique = results.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  const outputDir = path.resolve(opts.output);
  fs.mkdirSync(outputDir, { recursive: true });

  const outputFile = path.join(outputDir, 'crawl-graph.json');
  fs.writeFileSync(outputFile, JSON.stringify({
    rootUrl: opts.url,
    crawledAt: new Date().toISOString(),
    totalPages: unique.length,
    pages: unique,
  }, null, 2));

  console.log(`[Crawler] Done. ${unique.length} pages discovered. Output: ${outputFile}`);
  process.exit(0);
}

main().catch(err => { console.error('[Crawler] Fatal:', err.message); process.exit(1); });
