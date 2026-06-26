// ─── Content Scraper Agent ────────────────────────────────────────────
// Scrapes real content from reference sites defined in BOS entries
// Uses Playwright for headless browser automation
// Implements 7-day caching to avoid repeated scraping

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { BOSEntry, ScrapedContent, ReferenceSource } from '../bos/types.js';
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
