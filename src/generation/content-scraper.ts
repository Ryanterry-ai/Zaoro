// ─── Content Scraper Agent ────────────────────────────────────────────
// Scrapes real content from reference sites or auto-searches Google
// Uses Playwright for headless browser automation
// Implements 7-day caching to avoid repeated scraping

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { BOSEntry, ScrapedContent, ReferenceSource, BusinessResearch } from '../bos/types.js';
import type { BusinessIntelligenceProfile } from '../bos/schemas/knowledge/business-intelligence.schema.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const CACHE_DIR = '.cache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Content Scraper Agent
 * Harvests real business data from reference sites
 */
export class ContentScraper {
  private workspaceRoot: string;
  
  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }
  
  /**
   * Main entry point: scrape real content from a BOS entry's reference URLs
   * Implements caching to avoid repeated scraping
   */
  async scrapeRealContent(bosEntry: BOSEntry): Promise<ScrapedContent | null> {
    if (!bosEntry.references?.urls || bosEntry.references.urls.length === 0) {
      console.log(`[ContentScraper] No reference URLs for ${bosEntry.id}, skipping`);
      return null;
    }
    
    // Check cache first
    const cached = await this.loadFromCache(bosEntry.id);
    if (cached) {
      console.log(`[ContentScraper] Using cached content for ${bosEntry.id}`);
      return cached;
    }
    
    console.log(`[ContentScraper] Starting scrape for ${bosEntry.id}...`);
    console.log(`[ContentScraper] Target URLs: ${bosEntry.references.urls.join(', ')}`);
    
    let browser: Browser | null = null;
    
    try {
      browser = await chromium.launch({ 
        headless: true,
        args: ['--disable-blink-features=AutomationControlled']
      });
      
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      // Try each URL until we get content
      for (const url of bosEntry.references.urls) {
        try {
          console.log(`[ContentScraper] Trying ${url}...`);
          const content = await this.scrapeUrl(context, url, bosEntry.references);
          
          if (this.hasValidContent(content)) {
            console.log(`[ContentScraper] Successfully scraped content from ${url}`);
            await this.saveToCache(bosEntry.id, content);
            return content;
          }
          
          console.log(`[ContentScraper] Insufficient content from ${url}, trying next...`);
        } catch (err: any) {
          console.warn(`[ContentScraper] Failed to scrape ${url}:`, err.message);
        }
      }
      
      console.log(`[ContentScraper] All URLs failed, returning empty content`);
      return this.createEmptyContent(bosEntry.references.urls[0] || '');
      
    } catch (error: any) {
      console.error(`[ContentScraper] Browser error:`, error.message);
      return this.createEmptyContent(bosEntry.references.urls[0] || '');
    } finally {
      await browser?.close();
    }
  }
  
  /**
   * Scrape a single URL and extract structured content
   */
  private async scrapeUrl(
    context: BrowserContext, 
    url: string, 
    selectors: ReferenceSource
  ): Promise<ScrapedContent> {
    const page = await context.newPage();
    
    try {
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      // Wait for dynamic content to load
      await page.waitForTimeout(2000);
      
      const content: ScrapedContent = {
        heroHeadline: '',
        aboutText: '',
        contactAddress: '',
        productSpecs: [],
        prices: [],
        teamMembers: [],
        testimonials: [],
        sourceUrl: url,
        scrapedAt: Date.now()
      };
      
      // Extract hero headline
      if (selectors.selectors.heroHeadline) {
        content.heroHeadline = await this.extractText(
          page, 
          selectors.selectors.heroHeadline
        );
      }
      
      // Extract about text
      if (selectors.selectors.aboutText) {
        content.aboutText = await this.extractText(
          page, 
          selectors.selectors.aboutText
        );
      }
      
      // Extract contact address
      if (selectors.selectors.contactInfo) {
        content.contactAddress = await this.extractText(
          page, 
          selectors.selectors.contactInfo
        );
      }
      
      // Extract product specs/pricing
      if (selectors.selectors.pricing || selectors.selectors.productGrid) {
        const selector = selectors.selectors.pricing || selectors.selectors.productGrid || '';
        const items = await this.extractList(page, selector);
        content.productSpecs = items;
      }
      
      // Extract testimonials
      if (selectors.selectors.testimonials) {
        const testimonials = await this.extractTestimonials(
          page, 
          selectors.selectors.testimonials
        );
        content.testimonials = testimonials;
      }
      
      // Extract team members
      if (selectors.selectors.teamBios) {
        const team = await this.extractTeam(page, selectors.selectors.teamBios);
        content.teamMembers = team;
      }
      
      // Extract section HTML for structural cloning
      content.sectionHtml = await this.extractSections(page, selectors.selectors);
      
      return content;
      
    } finally {
      await page.close();
    }
  }
  
  /**
   * Extract text content from a CSS selector
   */
  private async extractText(page: Page, selector: string): Promise<string> {
    try {
      const elements = await page.locator(selector).all();
      if (elements.length === 0) return '';
      
      // Get first matching element's text
      const firstElement = elements[0];
      if (!firstElement) return '';
      const text = await firstElement.textContent();
      return text?.trim() || '';
    } catch {
      return '';
    }
  }
  
  /**
   * Extract list of text items from a CSS selector
   */
  private async extractList(page: Page, selector: string): Promise<string[]> {
    try {
      const elements = await page.locator(selector).all();
      const items: string[] = [];
      
      for (const el of elements.slice(0, 10)) { // Limit to 10 items
        const text = await el.textContent();
        if (text?.trim()) {
          items.push(text.trim());
        }
      }
      
      return items;
    } catch {
      return [];
    }
  }
  
  /**
   * Extract testimonials from a section
   */
  private async extractTestimonials(
    page: Page, 
    selector: string
  ): Promise<ScrapedContent['testimonials']> {
    try {
      const elements = await page.locator(selector).all();
      const testimonials: ScrapedContent['testimonials'] = [];
      
      for (const el of elements.slice(0, 5)) { // Limit to 5
        const text = await el.textContent();
        if (text?.trim()) {
          const testimonial: { text: string; author: string; role?: string } = {
            text: text.trim(),
            author: 'Customer', // Default, can be overridden
          };
          testimonials.push(testimonial);
        }
      }
      
      return testimonials;
    } catch {
      return [];
    }
  }
  
  /**
   * Extract team member information
   */
  private async extractTeam(
    page: Page, 
    selector: string
  ): Promise<ScrapedContent['teamMembers']> {
    try {
      const elements = await page.locator(selector).all();
      const team: ScrapedContent['teamMembers'] = [];
      
      for (const el of elements.slice(0, 10)) {
        const text = await el.textContent();
        if (text?.trim()) {
          // Try to parse name and role from text
          const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
          const member: { name: string; role: string; bio?: string } = {
            name: lines[0] || 'Team Member',
            role: lines[1] || 'Staff',
          };
          const bioText = lines.slice(2).join(' ');
          if (bioText) {
            member.bio = bioText;
          }
          team.push(member);
        }
      }
      
      return team;
    } catch {
      return [];
    }
  }
  
  /**
   * Extract section HTML for structural cloning
   */
  private async extractSections(
    page: Page, 
    selectors: Record<string, string>
  ): Promise<Record<string, string>> {
    const sections: Record<string, string> = {};
    
    for (const [key, selector] of Object.entries(selectors)) {
      try {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          const html = await element.innerHTML();
          sections[key] = html;
        }
      } catch {
        // Skip failed extractions
      }
    }
    
    return sections;
  }
  
  /**
   * Check if scraped content has valid data
   */
  private hasValidContent(content: ScrapedContent): boolean {
    return !!(
      content.heroHeadline ||
      content.aboutText ||
      content.contactAddress ||
      content.productSpecs.length > 0 ||
      content.testimonials.length > 0
    );
  }
  
  /**
   * Create empty content structure
   */
  private createEmptyContent(sourceUrl: string): ScrapedContent {
    return {
      heroHeadline: '',
      aboutText: '',
      contactAddress: '',
      productSpecs: [],
      prices: [],
      teamMembers: [],
      testimonials: [],
      sourceUrl,
      scrapedAt: Date.now()
    };
  }
  
  /**
   * Load content from cache if valid
   */
  private async loadFromCache(bosId: string): Promise<ScrapedContent | null> {
    try {
      const cachePath = path.join(this.workspaceRoot, CACHE_DIR, `${bosId}.json`);
      const data = await fs.readFile(cachePath, 'utf-8');
      const cached: ScrapedContent = JSON.parse(data);
      
      // Check if cache is still valid
      if (Date.now() - cached.scrapedAt < CACHE_TTL_MS) {
        return cached;
      }
      
      console.log(`[ContentScraper] Cache expired for ${bosId}`);
      return null;
    } catch {
      return null;
    }
  }
  
  /**
   * Save content to cache
   */
  private async saveToCache(bosId: string, content: ScrapedContent): Promise<void> {
    try {
      const cacheDir = path.join(this.workspaceRoot, CACHE_DIR);
      await fs.mkdir(cacheDir, { recursive: true });
      
      const cachePath = path.join(cacheDir, `${bosId}.json`);
      await fs.writeFile(cachePath, JSON.stringify(content, null, 2));
      
      console.log(`[ContentScraper] Cached content for ${bosId}`);
    } catch (err: any) {
      console.warn(`[ContentScraper] Failed to cache:`, err.message);
    }
  }

  /**
   * Search Google and scrape business data from a prompt.
   * Auto-discovers the business website without requiring BOS entry URLs.
   */
  async scrapePromptData(businessName: string, industry: string, country?: string, description?: string): Promise<ScrapedContent | null> {
    // Build search query from INDUSTRY + COUNTRY + DESCRIPTION — NOT the app name.
    // The app name is generated/fictional; we need REAL businesses in the domain.
    const industryLabel = industry.replace(/-/g, ' ');
    const descKeywords = description?.replace(/[^a-zA-Z0-9\s]/g, '').trim() || '';
    const stopWords = new Set([
      'the', 'a', 'an', 'for', 'and', 'or', 'build', 'create', 'make', 'my', 'our', 'your',
      'want', 'need', 'looking', 'site', 'website', 'app', 'application', 'platform', 'system',
      'store', 'shop', 'business', 'company', 'brand', 'customer', 'customers', 'client', 'clients',
      'people', 'users', 'user', 'audience', 'market', 'industry', 'type', 'kind', 'best', 'top',
      'new', 'online', 'local', 'small', 'large', 'great', 'good', 'better', 'perfect',
      'indian', 'india', 'american', 'us', 'usa', 'uk', 'british', 'dubai', 'uae',
      'australian', 'canadian', 'german', 'french', 'japanese', 'chinese',
    ]);
    const descWords = descKeywords.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));
    const queryParts = [industryLabel];
    if (descWords.length > 0) queryParts.push(descWords.slice(0, 2).join(' '));
    if (country) queryParts.push(country);
    const query = queryParts.join(' ');
    const cacheKey = `prompt-${query.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

    const cached = await this.loadFromCache(cacheKey);
    if (cached) return cached;

    let browser: Browser | null = null;
    let browserContext: BrowserContext | null = null;
    try {
      // Try DuckDuckGo HTML (no JS required, no bot detection)
      let targetUrl = '';
      try {
        const ddgResp = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(5000),
        });
        const ddgHtml = await ddgResp.text();
        const urlMatches = ddgHtml.match(/href="https?:\/\/[^"]+"/g) || [];
        for (const match of urlMatches) {
          const url = match.slice(6, -1);
          if (!url.includes('duckduckgo.com') && !url.includes('google.com') && !url.includes('youtube.com') && !url.includes('facebook.com') && !url.includes('instagram.com') && !url.includes('twitter.com') && !url.includes('wikipedia.org')) {
            targetUrl = url;
            break;
          }
        }
      } catch {
        // DDG failed
      }

      // Fallback: Playwright with Bing
      if (!targetUrl) {
        browser = await chromium.launch({ headless: true });
        browserContext = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
        const page = await browserContext.newPage();
        try {
          await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 5000 });
          await page.waitForTimeout(500);
          const links = await page.locator('li.b_algo a[href^="http"]').all();
          for (const link of links) {
            const href = await link.getAttribute('href');
            if (href && !href.includes('bing.com') && !href.includes('microsoft.com') && !href.includes('youtube.com') && !href.includes('facebook.com')) {
              targetUrl = href;
              break;
            }
          }
        } catch {
          // Bing also failed
        }
      }

      if (!targetUrl) {
        console.log(`[ContentScraper] No website found for query: "${query}"`);
        return this.createEmptyContent('');
      }

      console.log(`[ContentScraper] Found website for "${query}": ${targetUrl}`);

      // Ensure we have a browser context for scraping
      if (!browserContext) {
        browser = await chromium.launch({ headless: true });
        browserContext = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
      }

      // Scrape the found website
      const content = await this.scrapeUrlGeneric(browserContext, targetUrl, businessName, industry);

      if (this.hasValidContent(content)) {
        await this.saveToCache(cacheKey, content);
      }

      return content;
    } catch (err: any) {
      console.warn(`[ContentScraper] Search failed:`, err.message);
      return this.createEmptyContent('');
    } finally {
      await browser?.close();
    }
  }

  /**
   * Scrape a URL generically — auto-detect headings, paragraphs, prices, etc.
   */
  private async scrapeUrlGeneric(context: BrowserContext, url: string, businessName: string, industry: string): Promise<ScrapedContent> {
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 });
      await page.waitForTimeout(500);

      const content: ScrapedContent = {
        heroHeadline: '',
        aboutText: '',
        contactAddress: '',
        productSpecs: [],
        prices: [],
        teamMembers: [],
        testimonials: [],
        sourceUrl: url,
        scrapedAt: Date.now(),
      };

      // Hero headline — try h1 or first prominent heading
      const h1 = await page.locator('h1').first().textContent().catch(() => '');
      if (h1?.trim()) content.heroHeadline = h1.trim();

      // About text — try meta description, then first substantial paragraph
      const metaDesc = await page.locator('meta[name="description"]').getAttribute('content').catch(() => '');
      if (metaDesc?.trim()) content.aboutText = metaDesc.trim();
      else {
        const paragraphs = await page.locator('p').all();
        for (const p of paragraphs.slice(0, 5)) {
          const text = await p.textContent().catch(() => '');
          if (text && text.trim().length > 50) {
            content.aboutText = text.trim();
            break;
          }
        }
      }

      // Contact address — look for address patterns in footer or contact sections
      const addressSelectors = ['[itemprop="address"]', '.address', '#address', '.contact-address', 'address', '[class*="address"]', '[class*="contact"]'];
      for (const sel of addressSelectors) {
        const el = await page.locator(sel).first().textContent().catch(() => '');
        if (el?.trim()) { content.contactAddress = el.trim(); break; }
      }

      // Prices — look for price patterns: $X.XX, ₹X, €X
      const bodyText = await page.locator('body').textContent().catch(() => '') || '';
      const priceRegex = /[\$\€\₹\£]\s*\d+(?:\.\d{2})?/g;
      const priceMatches = bodyText.match(priceRegex) || [];
      const seen = new Set<string>();
      for (const pm of priceMatches.slice(0, 10)) {
        if (!seen.has(pm)) {
          seen.add(pm);
          content.prices.push({ name: `Item ${content.prices.length + 1}`, price: pm });
        }
      }

      // Testimonials — look for quote patterns
      const quoteElements = await page.locator('blockquote, [class*="testimonial"], [class*="review"], .quote, q').all();
      for (const q of quoteElements.slice(0, 5)) {
        const text = await q.textContent().catch(() => '');
        if (text?.trim()) {
          content.testimonials.push({ text: text.trim(), author: businessName + ' Customer' });
        }
      }

      // Team members — look for bio/team sections
      const teamSelectors = ['[class*="team"] img', '[class*="member"]', '[class*="bio"]', '[class*="profile"]'];
      for (const sel of teamSelectors) {
        const els = await page.locator(sel).all();
        for (const el of els.slice(0, 6)) {
          const alt = await el.getAttribute('alt').catch(() => '');
          const text = await el.textContent().catch(() => '');
          if (alt?.trim()) {
            content.teamMembers.push({ name: alt.trim(), role: industry === 'restaurant' ? 'Chef' : 'Team Member' });
          } else if (text?.trim() && text.trim().length < 100) {
            const parts = text.trim().split('\n').map(s => s.trim()).filter(Boolean);
            content.teamMembers.push({ name: parts[0] || 'Staff', role: parts[1] || 'Team Member' });
          }
        }
        if (content.teamMembers.length > 0) break;
      }

      // Product specs — look for product/card patterns
      const productSelectors = ['.product', '.card', '.item', '[class*="product"]', '[class*="service"]', 'li'];
      for (const sel of productSelectors) {
        const els = await page.locator(sel).all();
        for (const el of els.slice(0, 8)) {
          const text = await el.textContent().catch(() => '');
          if (text?.trim() && text.trim().length > 10 && text.trim().length < 200) {
            content.productSpecs.push(text.trim());
          }
        }
        if (content.productSpecs.length >= 3) break;
      }

      return content;
    } finally {
      await page.close();
    }
  }

  /**
   * Convert ScrapedContent + BusinessResearch → partial BusinessIntelligenceProfile.
   * Uses BusinessResearch for business model intelligence (revenue flow, customer journey, KPIs).
   * Uses ScrapedContent for actual scraped data (headlines, prices, testimonials).
   */
  scrapedToBusinessProfile(
    scraped: ScrapedContent | null,
    industry: string,
    businessName: string,
    research?: BusinessResearch,
  ): Partial<BusinessIntelligenceProfile> {
    if (!scraped || !scraped.heroHeadline && !scraped.aboutText && scraped.prices.length === 0) {
      return {};
    }

    // Build revenue cycle from BusinessResearch.revenueFlow (NOT hardcoded)
    const revenueSteps = (research?.revenueFlow || ['direct-sales']).map((flow, i, arr) => ({
      name: flow.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      action: `Process ${flow.replace(/-/g, ' ')}`,
      conversionRate: i === arr.length - 1 ? 0.5 : 0.3,
      avgTimeToNext: i === arr.length - 1 ? 'immediate' : '1-3 days',
      revenueImpact: i === arr.length - 1 ? 'critical' as const : 'high' as const,
    }));

    // Build conversion funnel from BusinessResearch.customerFlow (NOT hardcoded)
    const funnelStages = research?.customerFlow || ['discover', 'evaluate', 'purchase', 'receive'];

    // Build KPIs from BusinessResearch.kpis (NOT hardcoded)
    const kpiEntries = (research?.kpis || ['revenue', 'customers']).map(kpi => ({
      name: kpi.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      label: kpi.slice(0, 8).toUpperCase(),
      formula: `Track ${kpi.replace(/-/g, ' ')}`,
      unit: kpi === 'revenue' ? 'currency' as const : 'count' as const,
      category: ['revenue', 'conversion'].includes(kpi) ? 'revenue' as const : 'growth' as const,
    }));

    // Build revenue models from BusinessResearch.revenueFlow (NOT hardcoded)
    const revenueModels = (research?.revenueFlow || ['direct-sales']).map((flow, i, arr) => ({
      name: flow.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: `${flow.replace(/-/g, ' ')} revenue stream`,
      percentage: Math.round(100 / arr.length),
    }));

    // Use BusinessResearch.vocabulary (NOT hardcoded per-industry)
    const vocabulary = research?.vocabulary || {};

    return {
      id: `scraped.${industry}.${businessName.toLowerCase().replace(/\s+/g, '-')}`,
      version: '1.0',
      name: businessName,
      description: scraped.aboutText || scraped.heroHeadline || `${businessName} — ${industry}`,
      revenueCycle: {
        name: `${businessName} Revenue Cycle`,
        description: `Revenue cycle for ${businessName}`,
        steps: revenueSteps,
        avgCycleLength: '7-14 days',
        avgRevenuePerCustomer: scraped.prices[0]?.price || 'Varies',
      },
      conversionFunnel: {
        name: `${businessName} Conversion Funnel`,
        stages: funnelStages,
        overallConversionRate: '2-5%',
        biggestDropOff: funnelStages.length > 2 ? `${funnelStages[1]} → ${funnelStages[2]}` : 'N/A',
      },
      churnSignals: [
        { name: 'Customer inactivity', detection: 'No engagement for 30+ days', window: '30 days', severity: 'medium' },
      ],
      retentionAutomations: [
        { name: 'Re-engagement email', trigger: '7 days inactive', action: 'Send personalized offer', expectedImpact: '15-20% reactivation' },
      ],
      kpis: kpiEntries,
      dashboardWidgets: kpiEntries.slice(0, 3).map(kpi => ({
        name: `${kpi.name} Overview`,
        type: 'chart' as const,
        description: `${kpi.name} trend`,
        kpis: [kpi.name],
        priority: 'primary' as const,
      })),
      leadCaptureMechanisms: [
        { name: 'Contact Form', headline: 'Get in Touch', fields: ['name', 'email', 'message'], nextStep: 'Email response within 24h', conversionRate: '5-10%' },
      ],
      morningCheck: {
        primaryMetrics: kpiEntries.slice(0, 2).map(k => k.name),
        secondaryMetrics: kpiEntries.slice(2, 4).map(k => k.name),
        alertConditions: ['Revenue drop >20%', 'Customer count decline'],
      },
      revenueModels,
      vocabulary,
    };
  }
}

/**
 * Merge scraped content with base domain data
 * Used to inject real scraped data into the template system
 */
export function mergeScrapedContent<T extends Record<string, any>>(
  base: T, 
  scraped: ScrapedContent | null
): T {
  if (!scraped) return base;
  
  const merged = { ...base } as Record<string, any>;
  
  // Merge hero content
  if (scraped.heroHeadline && merged.hero) {
    merged.hero = { ...merged.hero, headline: scraped.heroHeadline };
  }
  
  // Merge about/story content
  if (scraped.aboutText && merged.story) {
    merged.story = { ...merged.story, text: scraped.aboutText };
  }
  
  // Merge contact info
  if (scraped.contactAddress && merged.contact) {
    merged.contact = { ...merged.contact, address: scraped.contactAddress };
  }
  
  // Merge testimonials
  if (scraped.testimonials.length > 0 && merged.testimonials) {
    merged.testimonials = scraped.testimonials.map(t => ({
      text: t.text,
      name: t.author,
      role: t.role || ''
    }));
  }
  
  // Merge team members
  if (scraped.teamMembers.length > 0 && merged.team) {
    merged.team = scraped.teamMembers;
  }
  
  // Merge products/specs
  if (scraped.productSpecs.length > 0 && merged.items) {
    // Add scraped specs as additional items
    const newItems = scraped.productSpecs.map((spec, i) => ({
      id: `scraped-${i}`,
      name: spec.split('\n')[0] || `Item ${i + 1}`,
      description: spec,
      price: ''
    }));
    merged.items = [...(merged.items || []), ...newItems];
  }
  
  return merged as T;
}
