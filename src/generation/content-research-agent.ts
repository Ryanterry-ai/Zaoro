import { WebSearcher } from '../business-intelligence/core/web-searcher.js';
import { AgentReachBridge } from '../business-intelligence/core/agent-reach-bridge.js';
import type { CrawlResult } from '../business-intelligence/core/agent-reach-bridge.js';

export interface ContentResearchResult {
  businessName: string;
  businessType: string;
  industry: string;
  competitors: Array<{
    name: string;
    url: string;
    headline: string;
    tagline: string;
    services: string[];
    pricing: string[];
    testimonials: string[];
    features: string[];
    ctaButtons: string[];
    colors: string[];
  }>;
  realContent: {
    headlines: string[];
    taglines: string[];
    serviceNames: string[];
    productNames: string[];
    pricingData: string[];
    testimonialQuotes: string[];
    featureDescriptions: string[];
    ctaTexts: string[];
    aboutTexts: string[];
    faqPairs: Array<{ q: string; a: string }>;
    teamRoles: string[];
    industryKeywords: string[];
  };
  rawSnippets: string[];
}

/**
 * ContentResearchAgent: Browses the web to find REAL business data
 * before generation. Extracts actual headlines, pricing, testimonials,
 * features, and CTAs from real competitor websites.
 *
 * This data is injected into the LLM prompt so it generates with
 * real content instead of generic placeholder text.
 */
export class ContentResearchAgent {
  private searcher: WebSearcher;
  private reach: AgentReachBridge;

  constructor() {
    this.searcher = new WebSearcher();
    this.reach = new AgentReachBridge();
  }

  /**
   * Research a business from the user's prompt.
   * Extracts real content from competitor websites for LLM injection.
   */
  async research(prompt: string): Promise<ContentResearchResult> {
    const { businessName, businessType, industry, searchQuery } = this.parsePrompt(prompt);
    console.log(`[content-research] Researching: "${businessName}" (${businessType}) in ${industry}`);
    console.log(`[content-research] Search query: "${searchQuery}"`);

    const result: ContentResearchResult = {
      businessName,
      businessType,
      industry,
      competitors: [],
      realContent: {
        headlines: [],
        taglines: [],
        serviceNames: [],
        productNames: [],
        pricingData: [],
        testimonialQuotes: [],
        featureDescriptions: [],
        ctaTexts: [],
        aboutTexts: [],
        faqPairs: [],
        teamRoles: [],
        industryKeywords: [],
      },
      rawSnippets: [],
    };

    try {
      // Search for real competitors
      const searchResults = await this.searcher.search(searchQuery, 10);
      console.log(`[content-research] Found ${searchResults.length} search results`);

      // Crawl top 5 competitor websites
      for (const sr of searchResults.slice(0, 5)) {
        try {
          console.log(`[content-research] Crawling: ${sr.url}`);
          const crawl = await this.reach.crawlWebsite(sr.url, 3);
          const competitor = this.extractCompetitorData(sr, crawl);
          result.competitors.push(competitor);

          // Merge into aggregate real content
          this.mergeIntoRealContent(result.realContent, competitor, crawl);

          result.rawSnippets.push(sr.snippet);
        } catch (err: any) {
          console.warn(`[content-research] Failed to crawl ${sr.url}: ${err.message}`);
          // Still use the search snippet
          result.rawSnippets.push(sr.snippet);
          if (sr.snippet) {
            result.realContent.headlines.push(sr.title || sr.snippet?.split('.')[0] || 'Business');
          }
        }
      }

      // Extract industry keywords from all snippets
      result.realContent.industryKeywords = this.extractIndustryKeywords(
        result.rawSnippets,
        businessType,
        industry
      );

      console.log(`[content-research] Results: ${result.competitors.length} competitors crawled`);
      console.log(`[content-research] Real content: ${result.realContent.headlines.length} headlines, ${result.realContent.pricingData.length} pricing, ${result.realContent.testimonialQuotes.length} testimonials`);

    } catch (err: any) {
      console.warn(`[content-research] Research failed: ${err.message} — returning empty research`);
    }

    return result;
  }

  private parsePrompt(prompt: string): {
    businessName: string;
    businessType: string;
    industry: string;
    searchQuery: string;
  } {
    const lower = prompt.toLowerCase();

    // Extract business name — usually after "Build a", "Create a", "Make a", "for my"
    const nameMatch = prompt.match(/(?:build|create|make|design)\s+(?:a\s+)?(?:website\s+(?:for|of|about)\s+)?(?:the\s+)?([A-Z][A-Za-z0-9\s&.'-]+?)(?:\s+website|\s+app|\s+platform|\s+store|\s+shop|\s+site|\s+online|\s+for|\s+that|\s+with|\s*$)/i);
    let businessName = nameMatch?.[1]?.trim() || '';

    // Fallback: just grab capitalized words
    if (!businessName || businessName.length < 2) {
      const caps = prompt.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g);
      if (caps && caps.length > 0) {
        // Filter out common verbs/adjectives
        const filtered = caps.filter(w => !['Build', 'Create', 'Make', 'Design', 'Website', 'For', 'That', 'With', 'The', 'And'].includes(w));
        businessName = filtered[0] || caps[0];
      }
    }

    // Detect business type from keywords
    let businessType = 'business';
    let industry = 'general';

    const typePatterns: Array<[RegExp, string, string]> = [
      [/(?:luxury|premium|high-end|watch|watches|timepiece|jewelry|horology)/, 'luxury-brand', 'luxury'],
      [/(?:restaurant|cafe|coffee|food|dining|bakery|pizza|burger|sushi)/, 'restaurant', 'food-beverage'],
      [/(?:fitness|gym|yoga|wellness|health|workout|personal trainer)/, 'fitness-studio', 'fitness'],
      [/(?:ecommerce|e-commerce|store|shop|marketplace|online store|retail)/, 'ecommerce-store', 'commerce'],
      [/(?:saas|software|app|platform|dashboard|tool)/, 'saas-product', 'technology'],
      [/(?:agency|consulting|marketing|creative|design studio)/, 'agency', 'professional-services'],
      [/(?:real estate|property|realtor|listing|home|apartment)/, 'real-estate', 'real-estate'],
      [/(?:healthcare|clinic|doctor|medical|dental|hospital)/, 'healthcare-clinic', 'healthcare'],
      [/(?:education|school|university|course|learning|training|academy)/, 'education-platform', 'education'],
      [/(?:travel|hotel|resort|tour|vacation|booking)/, 'travel-service', 'travel'],
      [/(?:law|legal|attorney|lawyer|firm)/, 'law-firm', 'legal'],
      [/(?:portfolio|personal|blog|resume)/, 'portfolio', 'content'],
      [/(?:nonprofit|charity|ngo|foundation)/, 'nonprofit', 'nonprofit'],
      [/(?:event|wedding|party|conference)/, 'event-service', 'events'],
      [/(?:photo|video|media|studio|production)/, 'creative-studio', 'media'],
      [/(?:auto|car|automotive|vehicle)/, 'automotive', 'automotive'],
      [/(?:pet|animal|veterinary)/, 'pet-service', 'pets'],
    ];

    for (const [pattern, type, ind] of typePatterns) {
      if (pattern.test(lower)) {
        businessType = type;
        industry = ind;
        break;
      }
    }

    // Build search query
    const searchQuery = businessName
      ? `${businessName} ${businessType.replace(/-/g, ' ')} website`
      : `${businessType.replace(/-/g, ' ')} website examples pricing services`;

    return { businessName, businessType, industry, searchQuery };
  }

  private extractCompetitorData(
    sr: { title: string; url: string; snippet: string },
    crawl: CrawlResult
  ): ContentResearchResult['competitors'][0] {
    const allText = crawl.pages.map(p => p.text).join('\n');

    // Extract headline from first page's title or h1
    const headline = crawl.pages[0]?.title || sr.title || sr.snippet?.split('.')[0] || 'Business';

    // Extract tagline — often in meta description or subtitle
    const tagline = crawl.description || sr.snippet || '';

    // Extract services from headings and list items
    const services = this.extractListFromText(allText, /(?:services?|solutions?|offerings?)/i, 15);

    // Extract pricing
    const pricing = [...new Set(allText.match(/\$[\d,]+(?:\.\d{2})?(?:\/mo|\/year|\/mo\.)?/g) || [])].slice(0, 10);

    // Extract testimonials/quotes
    const testimonials = [
      ...allText.match(/"([^"]{20,200})"/g) || [],
      ...allText.match(/(?:review|testimonial|said|wrote|feedback)[:\s]+["']?([^"']{20,200})["']?/gi) || [],
    ].map(t => t.replace(/^["']|["']$/g, '').replace(/(?:review|testimonial|said|wrote|feedback)[:\s]+["']?/i, '')).slice(0, 5);

    // Extract features
    const features = this.extractListFromText(allText, /(?:features?|capabilities|what we|why choose)/i, 10);

    // Extract CTA texts
    const ctaButtons = [
      ...allText.match(/(?:get started|sign up|book now|contact us|learn more|try free|join now|subscribe|download|schedule a call|request a demo|start free trial|buy now|add to cart|shop now)/gi) || [],
    ].map(c => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase());
    const uniqueCtas = [...new Set(ctaButtons)].slice(0, 8);

    // Extract colors from CSS classes or inline styles
    const colors = this.extractColors(allText);

    return {
      name: sr.title?.split(/[|–-]/)[0]?.trim() || 'Competitor',
      url: sr.url,
      headline,
      tagline,
      services,
      pricing,
      testimonials,
      features,
      ctaButtons: uniqueCtas,
      colors,
    };
  }

  private extractListFromText(text: string, sectionPattern: RegExp, maxItems: number): string[] {
    const items: string[] = [];

    // Find section
    const sectionMatch = text.match(new RegExp(`${sectionPattern.source}[\\s\\S]{0,500}`, 'i'));
    if (sectionMatch) {
      const section = sectionMatch[0];
      // Extract bullet/list items
      const listItems = section.match(/[•\-\*]\s*(.{5,80})/g) || [];
      for (const item of listItems) {
        const cleaned = item.replace(/^[•\-\*]\s*/, '').trim();
        if (cleaned.length > 5 && cleaned.length < 80) {
          items.push(cleaned);
        }
      }
    }

    // Also extract from headings throughout text
    const headings = text.match(/^[A-Z][A-Za-z\s&']{3,50}$/gm) || [];
    for (const h of headings) {
      if (!/^(HOME|ABOUT|CONTACT|MENU|LOGIN|SIGN|FAQ|PRIVACY|TERMS)/.test(h.trim())) {
        items.push(h.trim());
      }
    }

    return [...new Set(items)].slice(0, maxItems);
  }

  private extractColors(text: string): string[] {
    const colors: string[] = [];
    // hex colors
    const hex = text.match(/#[0-9a-fA-F]{6}/g) || [];
    colors.push(...hex);
    // named color classes
    const colorClasses = text.match(/(?:from|to|bg|text|border)-(red|blue|green|purple|amber|emerald|violet|indigo|cyan|orange|pink|rose|teal|sky|lime|fuchsia|slate|zinc|gray|stone|neutral)-\d+/g) || [];
    colors.push(...colorClasses.map(c => c.replace(/^(?:from|to|bg|text|border)-/, '')));
    return [...new Set(colors)].slice(0, 5);
  }

  private mergeIntoRealContent(
    realContent: ContentResearchResult['realContent'],
    competitor: ContentResearchResult['competitors'][0],
    crawl: CrawlResult
  ): void {
    // Headlines
    if (competitor.headline) realContent.headlines.push(competitor.headline);
    if (competitor.tagline) realContent.taglines.push(competitor.tagline);

    // Services
    realContent.serviceNames.push(...competitor.services);

    // Pricing
    realContent.pricingData.push(...competitor.pricing);

    // Testimonials
    realContent.testimonialQuotes.push(...competitor.testimonials);

    // Features
    realContent.featureDescriptions.push(...competitor.features);

    // CTAs
    realContent.ctaTexts.push(...competitor.ctaButtons);

    // About text — first page's first 500 chars
    const aboutText = crawl.pages[0]?.text?.substring(0, 500);
    if (aboutText) realContent.aboutTexts.push(aboutText);

    // FAQ pairs
    for (const page of crawl.pages) {
      const qaPairs = page.text.match(/([A-Z][^?]{10,80})\?\s*\n?\s*([A-Z][^.\n]{20,200})/g) || [];
      for (const qa of qaPairs.slice(0, 5)) {
        const parts = qa.split('?');
        if (parts.length >= 2 && parts[0]) {
          realContent.faqPairs.push({
            q: (parts[0] || '').trim() + '?',
            a: parts.slice(1).join('?').trim(),
          });
        }
      }
    }
  }

  private extractIndustryKeywords(
    snippets: string[],
    businessType: string,
    industry: string
  ): string[] {
    const words = new Map<string, number>();

    for (const snippet of snippets) {
      const tokens = snippet.toLowerCase().split(/\s+/);
      for (const token of tokens) {
        const clean = token.replace(/[^a-z0-9-]/g, '');
        if (clean.length > 3 && !['the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'are', 'was', 'were', 'been', 'being', 'will', 'would', 'could', 'should', 'their', 'there', 'they', 'website', 'online', 'more', 'about', 'best', 'top', 'your', 'our'].includes(clean)) {
          words.set(clean, (words.get(clean) || 0) + 1);
        }
      }
    }

    return [...words.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * Format research result as a prompt section for the LLM system prompt.
   */
  static formatForPrompt(research: ContentResearchResult): string {
    if (research.competitors.length === 0 && research.rawSnippets.length === 0) {
      return '';
    }

    const sections: string[] = [];

    sections.push(`## Real Business Research: ${research.businessName || research.businessType}`);
    sections.push(`Industry: ${research.industry} | Type: ${research.businessType}`);
    sections.push('');

    // Competitor insights
    if (research.competitors.length > 0) {
      sections.push('### Competitor Websites Analyzed');
      for (const comp of research.competitors.slice(0, 3)) {
        sections.push(`- **${comp.name}** (${comp.url})`);
        if (comp.headline) sections.push(`  Headline: "${comp.headline}"`);
        if (comp.tagline) sections.push(`  Tagline: "${comp.tagline}"`);
        if (comp.services.length > 0) sections.push(`  Services: ${comp.services.slice(0, 5).join(', ')}`);
        if (comp.pricing.length > 0) sections.push(`  Pricing: ${comp.pricing.slice(0, 5).join(', ')}`);
        if (comp.features.length > 0) sections.push(`  Features: ${comp.features.slice(0, 5).join(', ')}`);
        if (comp.ctaButtons.length > 0) sections.push(`  CTAs: ${comp.ctaButtons.slice(0, 3).join(', ')}`);
      }
      sections.push('');
    }

    // Real content to use
    const rc = research.realContent;
    if (rc.headlines.length > 0) {
      sections.push('### Real Headlines (use these as inspiration, do NOT copy verbatim)');
      for (const h of [...new Set(rc.headlines)].slice(0, 8)) {
        sections.push(`- "${h}"`);
      }
      sections.push('');
    }

    if (rc.taglines.length > 0) {
      sections.push('### Real Taglines');
      for (const t of [...new Set(rc.taglines)].slice(0, 5)) {
        sections.push(`- "${t}"`);
      }
      sections.push('');
    }

    if (rc.serviceNames.length > 0) {
      sections.push('### Real Service/Product Names');
      for (const s of [...new Set(rc.serviceNames)].slice(0, 10)) {
        sections.push(`- ${s}`);
      }
      sections.push('');
    }

    if (rc.pricingData.length > 0) {
      sections.push('### Real Pricing Data');
      for (const p of [...new Set(rc.pricingData)].slice(0, 8)) {
        sections.push(`- ${p}`);
      }
      sections.push('');
    }

    if (rc.testimonialQuotes.length > 0) {
      sections.push('### Real Testimonial Quotes');
      for (const q of [...new Set(rc.testimonialQuotes)].slice(0, 5)) {
        sections.push(`- "${q}"`);
      }
      sections.push('');
    }

    if (rc.featureDescriptions.length > 0) {
      sections.push('### Real Feature Descriptions');
      for (const f of [...new Set(rc.featureDescriptions)].slice(0, 8)) {
        sections.push(`- ${f}`);
      }
      sections.push('');
    }

    if (rc.ctaTexts.length > 0) {
      sections.push('### Real CTA Button Texts');
      sections.push([...new Set(rc.ctaTexts)].slice(0, 6).join(' | '));
      sections.push('');
    }

    if (rc.faqPairs.length > 0) {
      sections.push('### Real FAQ Content');
      for (const faq of rc.faqPairs.slice(0, 5)) {
        sections.push(`Q: ${faq.q}`);
        sections.push(`A: ${faq.a}`);
        sections.push('');
      }
    }

    if (rc.industryKeywords.length > 0) {
      sections.push('### Industry Keywords');
      sections.push(rc.industryKeywords.join(', '));
      sections.push('');
    }

    sections.push('**IMPORTANT**: Use this real research as INSPIRATION. Generate original content that is similar in style and quality but do NOT copy text verbatim. Adapt the content to match the user\'s specific business.');

    return sections.join('\n');
  }
}
