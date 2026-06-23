import { WebSearcher } from '../business-intelligence/core/web-searcher.js';
import { AgentReachBridge } from '../business-intelligence/core/agent-reach-bridge.js';
import type { CrawlResult } from '../business-intelligence/core/agent-reach-bridge.js';

export interface WebResearchData {
  competitors: Array<{
    name: string;
    url: string;
    description: string;
    pricing: string[];
    services: string[];
    testimonials: string[];
    ctas: string[];
  }>;
  industryPhrases: string[];
  popularServices: string[];
  pricingRange: string;
 典型Testimonials: string[];
  ctaExamples: string[];
}

/**
 * WebResearcher: Searches real competitor websites to extract
 * business-specific content for domain synthesis.
 */
export class WebResearcher {
  private searcher: WebSearcher;
  private reach: AgentReachBridge;

  constructor() {
    this.searcher = new WebSearcher();
    this.reach = new AgentReachBridge();
  }

  /**
   * Research real competitors in the business domain and extract content.
   */
  async researchDomain(industry: string, businessType: string, location?: string): Promise<WebResearchData> {
    console.log(`[web-researcher] Researching: ${industry} ${businessType}`);

    const searchQuery = `${industry} ${businessType} ${location || ''} website pricing services`.trim();
    const results = await this.searcher.search(searchQuery, 8);
    console.log(`[web-researcher] Found ${results.length} search results`);

    const competitors: WebResearchData['competitors'] = [];
    const allServices: string[] = [];
    const allPricing: string[] = [];
    const allTestimonials: string[] = [];
    const allCtas: string[] = [];

    // Crawl top 3 competitor websites
    for (const result of results.slice(0, 3)) {
      try {
        console.log(`[web-researcher] Crawling: ${result.url}`);
        const crawlData = await this.reach.crawlWebsite(result.url, 5);

        const services = this.extractServices(crawlData);
        const pricing = this.extractPricing(crawlData);
        const testimonials = this.extractTestimonials(crawlData);
        const ctas = this.extractCtas(crawlData);

        competitors.push({
          name: result.title?.split('|')[0]?.split('-')[0]?.trim() ?? 'Competitor',
          url: result.url,
          description: result.snippet,
          pricing,
          services,
          testimonials,
          ctas,
        });

        allServices.push(...services);
        allPricing.push(...pricing);
        allTestimonials.push(...testimonials);
        allCtas.push(...ctas);
      } catch (err: any) {
        console.warn(`[web-researcher] Failed to crawl ${result.url}: ${err.message}`);
      }
    }

    const researchData: WebResearchData = {
      competitors,
      industryPhrases: this.extractIndustryPhrases(competitors),
      popularServices: this.deduplicateAndRank(allServices).slice(0, 10),
      pricingRange: this.estimatePricingRange(allPricing),
     典型Testimonials: this.deduplicateAndRank(allTestimonials).slice(0, 5),
      ctaExamples: this.deduplicateAndRank(allCtas).slice(0, 5),
    };

    console.log(`[web-researcher] Extracted: ${competitors.length} competitors, ${researchData.popularServices.length} services, ${researchData.ctaExamples.length} CTAs`);
    return researchData;
  }

  private extractServices(crawlData: CrawlResult): string[] {
    const services: string[] = [];

    // Extract from page content
    for (const page of crawlData.pages) {
      // Look for service-related headings
      const headings = page.text.match(/^[A-Z][A-Za-z\s&]+$/gm) || [];
      for (const h of headings) {
        if (h.length > 3 && h.length < 50 && !/^(HOME|ABOUT|CONTACT|MENU|LOGIN|SIGN)/.test(h)) {
          services.push(h.trim());
        }
      }

      // Look for list items that might be services
      const listItems = page.text.match(/^[•\-\*]\s*(.+)$/gm) || [];
      for (const item of listItems) {
        const text = item.replace(/^[•\-\*]\s*/, '').trim();
        if (text.length > 5 && text.length < 80) {
          services.push(text);
        }
      }
    }

    return [...new Set(services)];
  }

  private extractPricing(crawlData: CrawlResult): string[] {
    const pricing: string[] = [];

    // Use pricing info from crawl
    if (crawlData.pricing_info.plans.length > 0) {
      for (const plan of crawlData.pricing_info.plans) {
        pricing.push(`${plan.name}: ${plan.price}`);
      }
    }

    // Extract price patterns from text
    for (const page of crawlData.pages) {
      const priceMatches = page.text.match(/\$[\d,]+(\.\d{2})?/g) || [];
      pricing.push(...priceMatches);
    }

    return [...new Set(pricing)];
  }

  private extractTestimonials(crawlData: CrawlResult): string[] {
    const testimonials: string[] = [];

    for (const page of crawlData.pages) {
      // Look for quote patterns
      const quotes = page.text.match(/"([^"]{20,200})"/g) || [];
      testimonials.push(...quotes.map(q => q.replace(/"/g, '')));

      // Look for review patterns
      const reviews = page.text.match(/(?:review|testimonial|said|wrote)[:\s]+["']?([^"']{20,200})["']?/gi) || [];
      testimonials.push(...reviews.map(r => r.replace(/(?:review|testimonial|said|wrote)[:\s]+["']?/i, '')));
    }

    return [...new Set(testimonials)];
  }

  private extractCtas(crawlData: CrawlResult): string[] {
    const ctas: string[] = [];

    for (const page of crawlData.pages) {
      // Look for button text patterns
      const buttonMatches = page.text.match(/(?:get started|sign up|book now|contact us|learn more|try free|join|subscribe|download|schedule|request|call now)/gi) || [];
      ctas.push(...buttonMatches);
    }

    return [...new Set(ctas.map(c => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()))];
  }

  private extractIndustryPhrases(competitors: WebResearchData['competitors']): string[] {
    const phrases: string[] = [];

    for (const comp of competitors) {
      // Extract key phrases from description
      const words = comp.description.split(/\s+/);
      for (let i = 0; i < words.length - 1; i++) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        if (bigram.length > 5 && bigram.length < 40) {
          phrases.push(bigram);
        }
      }
    }

    return this.deduplicateAndRank(phrases).slice(0, 15);
  }

  private deduplicateAndRank(items: string[]): string[] {
    const counts = new Map<string, number>();
    for (const item of items) {
      const normalized = item.toLowerCase().trim();
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([item]) => item);
  }

  private estimatePricingRange(pricing: string[]): string {
    if (pricing.length === 0) return '';

    const numbers = pricing
      .map(p => {
        const match = p.match(/\$?([\d,]+)/);
        return match?.[1] ? parseInt(match[1].replace(/,/g, '')) : 0;
      })
      .filter(n => n > 0);

    if (numbers.length === 0) return '';

    const min = Math.min(...numbers);
    const max = Math.max(...numbers);

    if (min === max) return `$${min}`;
    return `$${min} - $${max}`;
  }
}
