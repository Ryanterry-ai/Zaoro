/**
 * OpenClaw Bridge — deep, stealth web scraping for the research phase.
 *
 * The default web fetch is a plain `fetch()` that bot-protection blocks and
 * that only surfaces og:image/logo/favicon. When we need REAL competitor
 * imagery/video/layout (like a website-cloning AI), we route through the
 * OpenClaw Ultra Scraping skill (`scripts/scrape.py fetch <url> --format html`),
 * which bypasses Cloudflare/Turnstile and renders dynamic pages.
 *
 * This bridge is best-effort: if Python or the skill is unavailable it returns
 * `null` and the caller falls back to native fetch. No hard dependency.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/** Locate the OpenClaw scrape.py, searching the standard skill locations. */
export function findOpenClawScript(): string | null {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const candidates = [
    path.join(home, '.claude', 'skills', 'openclaw-ultra-scraping-main', 'openclaw-ultra-scraping-main', 'scripts', 'scrape.py'),
    path.join(home, '.claude', 'skills', 'openclaw-ultra-scraping-main', 'scripts', 'scrape.py'),
    path.join(process.cwd(), '.claude', 'skills', 'openclaw-ultra-scraping-main', 'openclaw-ultra-scraping-main', 'scripts', 'scrape.py'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

/** Resolve a Python interpreter that exists on this machine. */
function findPython(): string | null {
  const cmds = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  for (const cmd of cmds) {
    try {
      execFileSync(cmd, ['--version'], { stdio: 'ignore', timeout: 8000 });
      return cmd;
    } catch {
      // try next
    }
  }
  return null;
}

export interface OpenClawResult {
  /** Raw HTML of the (optionally dynamically-rendered) page. */
  html: string;
  /** How the page was fetched. */
  via: 'openclaw';
}

/**
 * Fetch a URL's HTML via OpenClaw Ultra Scraping. Returns null when the skill
 * or Python is unavailable (caller falls back to native fetch).
 *
 * @param url          Target URL.
 * @param timeoutMs    Hard timeout for the subprocess.
 * @param dynamic      Render JS / solve Cloudflare (slower but needed for SPAs).
 */
export function openClawFetchHtml(
  url: string,
  timeoutMs = 45_000,
  dynamic = true,
): OpenClawResult | null {
  const script = findOpenClawScript();
  if (!script) return null;
  const python = findPython();
  if (!python) return null;

  const args = [script, 'fetch', url, '--format', 'html', '--stealth'];
  if (dynamic) {
    args.push('--dynamic', '--solve-cloudflare', '--headless');
  }

  try {
    const out = execFileSync(python, args, {
      timeout: timeoutMs,
      maxBuffer: 64 * 1024 * 1024,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const html = (out || '').trim();
    if (!html || html.length < 40) return null;
    return { html, via: 'openclaw' };
  } catch {
    // Subprocess failed / timed out / dependency missing — degrade gracefully.
    return null;
  }
}

/** Whether OpenClaw is usable in this environment (skill + python present). */
export function isOpenClawAvailable(): boolean {
  return findOpenClawScript() !== null && findPython() !== null;
}
