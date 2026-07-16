/**
 * Content Agent — web scraping + content enrichment.
 *
 * Scope: ONE thing only — gather real content from the web.
 * Output: ScrapedContent (hero headlines, products, prices, testimonials, team)
 * Runs IN PARALLEL with Blueprint Agent (after Research).
 *
 * Skills (auto-discovered and installed):
 * 1. WEB SCRAPING — extract content from business websites
 * 2. CONTENT EXTRACTION — extract specific data (prices, testimonials, team)
 * 3. ANTI-BOT BYPASS — bypass Cloudflare and other protections
 * 4. SKILL DISCOVERY — auto-discover and install skills when needed
 *
 * This agent uses the BusinessResearch from Phase 1 to know WHAT to scrape.
 * It does NOT search by application name — it searches by industry + domain.
 *
 * Agentic loop: If scraped data is empty or low quality, the lead agent
 * can re-run with different reference URLs or enriched business research.
 */

import type { IContentAgent, PhaseContext, AgentResult } from '../types.js';
import { ContentScraper } from '../../../generation/content-scraper.js';
import type { ScrapedContent, BusinessResearch } from '../../../bos/types.js';
import { SkillRegistry } from '../skill-registry.js';

export class ContentAgent implements IContentAgent {
  readonly name = 'content-agent';
  private skillRegistry: SkillRegistry;

  constructor(workspaceDir: string) {
    this.skillRegistry = new SkillRegistry(workspaceDir);
  }

  async run(ctx: PhaseContext): Promise<AgentResult<ScrapedContent>> {
    const start = Date.now();
    let attempts = 0;

    // Initialize skill registry
    await this.skillRegistry.initialize();

    // Ensure we have web scraping skills
    await this.ensureScrapingSkills();

    while (true) {
      attempts++;
      try {
        const scraped = await this.scrapeContent(ctx);

        // Validate scraped data quality
        const validation = this.validate(scraped);
        if (!validation.passed && attempts < ctx.maxRetries) {
          // Retry with different approach
          ctx.retryCount = attempts;
          continue;
        }

        return {
          status: 'completed',
          data: scraped,
          duration: Date.now() - start,
          attempts,
        };
      } catch (err) {
        if (attempts >= ctx.maxRetries) {
          // Return empty content — not fatal, pipeline can continue with domain data
          return {
            status: 'completed',
            data: this.createEmptyContent(),
            duration: Date.now() - start,
            attempts,
          };
        }
      }
    }
  }

  /**
   * Ensure we have the right scraping skills.
   * Auto-discovers and installs skills if not already present.
   */
  private async ensureScrapingSkills(): Promise<void> {
    const taskCategories = ['web-scraping', 'content-extraction'];

    for (const category of taskCategories) {
      const skill = await this.skillRegistry.ensureSkillForTask(category);
      if (skill) {
        console.log(`[Content Agent] Skill ready: ${skill.name} for ${category}`);
      }
    }
  }

  /**
   * Scrape content using BusinessResearch intelligence.
   * Uses industry + description keywords — NOT the application name.
   */
  private async scrapeContent(ctx: PhaseContext): Promise<ScrapedContent> {
    const { businessResearch, breContext, config } = ctx;
    const scraper = new ContentScraper(config.workspaceDir);

    // Build search query from business research — NOT the app name
    const searchQuery = this.buildSearchQuery(businessResearch, breContext);

    // Try to scrape from search results
    const scraped = await scraper.scrapePromptData(
      searchQuery, // Use search query as business name (scraper uses it for search)
      breContext.industry,
      breContext.country,
      breContext.description,
    );

    // If we have reference URLs from research, try those too
    if (businessResearch?.referenceUrls && businessResearch.referenceUrls.length > 0) {
      for (const url of businessResearch.referenceUrls.slice(0, 3)) {
        try {
          // Use scrapePromptData with the URL as the search query
          const fromUrl = await scraper.scrapePromptData(
            url,
            breContext.industry,
            breContext.country,
            breContext.description,
          );
          if (fromUrl && (fromUrl.heroHeadline || fromUrl.prices.length > 0)) {
            // Merge with existing scraped data
            return this.mergeScrapedContent(scraped, fromUrl);
          }
        } catch {
          // Continue to next URL
        }
      }
    }

    return scraped ?? this.createEmptyContent();
  }

  /**
   * Build search query from BusinessResearch.
   * Uses industry + sub-industry + country — NOT the application name.
   */
  private buildSearchQuery(research: BusinessResearch | undefined, breContext: PhaseContext['breContext']): string {
    if (research) {
      const parts = [
        research.industry.replace(/-/g, ' '),
        research.subIndustry?.replace(/-/g, ' ') || '',
        breContext.country || '',
      ].filter(Boolean);
      return parts.join(' ');
    }
    // Fallback: use industry + country
    return [breContext.industry, breContext.country].filter(Boolean).join(' ');
  }

  /**
   * Merge two scraped content objects.
   */
  private mergeScrapedContent(a: ScrapedContent | null, b: ScrapedContent): ScrapedContent {
    if (!a) return b;
    return {
      heroHeadline: a.heroHeadline || b.heroHeadline,
      aboutText: a.aboutText || b.aboutText,
      contactAddress: a.contactAddress || b.contactAddress,
      productSpecs: [...a.productSpecs, ...b.productSpecs].slice(0, 20),
      prices: [...a.prices, ...b.prices].slice(0, 15),
      teamMembers: [...a.teamMembers, ...b.teamMembers].slice(0, 10),
      testimonials: [...a.testimonials, ...b.testimonials].slice(0, 10),
      sourceUrl: a.sourceUrl || b.sourceUrl,
      scrapedAt: Date.now(),
    };
  }

  /**
   * Validate scraped data quality.
   */
  private validate(scraped: ScrapedContent): { passed: boolean; failures: Array<{ gate: string; message: string; severity: 'error' | 'warning' }> } {
    const failures: Array<{ gate: string; message: string; severity: 'error' | 'warning' }> = [];

    // Must have some content
    const hasContent = scraped.heroHeadline || scraped.aboutText || scraped.prices.length > 0 || scraped.testimonials.length > 0;
    if (!hasContent) {
      failures.push({
        gate: 'content.scraped',
        message: 'No meaningful content scraped',
        severity: 'warning', // Warning, not error — pipeline can continue with domain data
      });
    }

    // Should have at least one product/price
    if (scraped.prices.length === 0) {
      failures.push({
        gate: 'content.prices',
        message: 'No prices found in scraped data',
        severity: 'warning',
      });
    }

    return {
      passed: failures.filter(f => f.severity === 'error').length === 0,
      failures,
    };
  }

  /**
   * Create empty scraped content as fallback.
   */
  private createEmptyContent(): ScrapedContent {
    return {
      heroHeadline: '',
      aboutText: '',
      contactAddress: '',
      productSpecs: [],
      prices: [],
      teamMembers: [],
      testimonials: [],
      sourceUrl: '',
      scrapedAt: Date.now(),
    };
  }
}
