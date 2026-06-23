import * as cheerio from 'cheerio';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebContent {
  url: string;
  title: string;
  text: string;
  links: Array<{ text: string; href: string }>;
  images: Array<{ alt: string; src: string }>;
}

/**
 * Real web search using DuckDuckGo HTML (no API key needed).
 * Falls back to Playwright-based scraping if needed.
 */
export class WebSearcher {
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  async search(query: string, numResults = 5): Promise<SearchResult[]> {
    console.log(`[web-search] Searching: "${query}"`);
    try {
      return await this.searchDuckDuckGo(query, numResults);
    } catch (err: any) {
      console.warn(`[web-search] DuckDuckGo failed: ${err.message}, trying Playwright...`);
      return this.searchPlaywright(query, numResults);
    }
  }

  async fetchPage(url: string): Promise<WebContent> {
    console.log(`[web-search] Fetching: ${url}`);
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(15000)
      });
      const html = await response.text();
      return this.parseHTML(url, html);
    } catch (err: any) {
      console.warn(`[web-search] Fetch failed: ${err.message}`);
      return { url, title: '', text: '', links: [], images: [] };
    }
  }

  async fetchMultiple(urls: string[]): Promise<WebContent[]> {
    const results = await Promise.allSettled(urls.map(u => this.fetchPage(u)));
    return results.map(r => r.status === 'fulfilled' ? r.value : { url: '', title: '', text: '', links: [], images: [] });
  }

  private async searchDuckDuckGo(query: string, numResults: number): Promise<SearchResult[]> {
    const params = new URLSearchParams({ q: query, kl: 'us-en' });
    const response = await fetch(`https://html.duckduckgo.com/html/?${params}`, {
      headers: { 'User-Agent': this.userAgent },
      signal: AbortSignal.timeout(15000)
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    $('.result').each((_, el) => {
      if (results.length >= numResults) return false;
      const title = $(el).find('.result__title').text().trim();
      const href = $(el).find('.result__url').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      if (title && href) {
        const url = href.startsWith('http') ? href : `https://${href}`;
        results.push({ title, url, snippet });
      }
    });

    console.log(`[web-search] Found ${results.length} results`);
    return results;
  }

  private async searchPlaywright(query: string, numResults: number): Promise<SearchResult[]> {
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();

      await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        waitUntil: 'domcontentloaded', timeout: 15000
      });

      const results = await page.evaluate((max: number) => {
        const items: Array<{ title: string; url: string; snippet: string }> = [];
        document.querySelectorAll('.result').forEach(el => {
          if (items.length >= max) return;
          const title = el.querySelector('.result__title')?.textContent?.trim() || '';
          const href = el.querySelector('.result__url')?.textContent?.trim() || '';
          const snippet = el.querySelector('.result__snippet')?.textContent?.trim() || '';
          if (title && href) {
            items.push({ title, url: href.startsWith('http') ? href : `https://${href}`, snippet });
          }
        });
        return items;
      }, numResults);

      await browser.close();
      console.log(`[web-search] Playwright found ${results.length} results`);
      return results;
    } catch {
      return [];
    }
  }

  private parseHTML(url: string, html: string): WebContent {
    const $ = cheerio.load(html);
    $('script, style, nav, footer, header').remove();
    const title = $('title').text().trim() || $('h1').first().text().trim();
    const text = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 10000);
    const links: Array<{ text: string; href: string }> = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      if (text && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        links.push({ text, href: href.startsWith('http') ? href : new URL(href, url).href });
      }
    });
    const images: Array<{ alt: string; src: string }> = [];
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src') || '';
      const alt = $(el).attr('alt') || '';
      if (src) images.push({ alt, src: src.startsWith('http') ? src : new URL(src, url).href });
    });
    return { url, title, text, links: links.slice(0, 50), images: images.slice(0, 20) };
  }
}
