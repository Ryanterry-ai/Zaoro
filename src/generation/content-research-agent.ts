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
  // NEW: Scraped data models for typed data generation
  dataModels: Array<{
    name: string;
    typeName: string;
    fields: Array<{ name: string; type: string; required: boolean }>;
    sampleData: Record<string, any>[];
  }>;
  // NEW: Component structures for reference
  componentStructures: Array<{
    name: string;
    type: string;
    props: string[];
    hasState: boolean;
    hasAnimation: boolean;
    complexity: 'simple' | 'medium' | 'complex';
  }>;
  // NEW: Animation patterns for reference
  animationPatterns: Array<{
    type: 'framer-motion' | 'css' | 'gsap';
    trigger: 'mount' | 'hover' | 'click' | 'scroll' | 'stagger' | 'loop';
    code: string;
    description: string;
  }>;
  // NEW: Design system extracted from reference
  designSystem: {
    colors: Record<string, string>;
    typography: { fonts: string[]; fontSizes: string[] };
    spacing: string[];
    borderRadius: string[];
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
      dataModels: [],
      componentStructures: [],
      animationPatterns: [],
      designSystem: {
        colors: {},
        typography: { fonts: [], fontSizes: [] },
        spacing: [],
        borderRadius: [],
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

      // NEW: Extract data models, component structures, and animation patterns
      const allText = result.rawSnippets.join('\n');
      const allHtml = result.rawSnippets.join('\n'); // In real implementation, this would be the crawled HTML
      result.dataModels = this.extractDataModels(allText, allHtml);
      result.componentStructures = this.extractComponentStructures(allHtml, allText);
      result.animationPatterns = this.extractAnimationPatterns(allHtml);
      result.designSystem = this.extractDesignSystem(allHtml, allText);

      console.log(`[content-research] Results: ${result.competitors.length} competitors crawled`);
      console.log(`[content-research] Real content: ${result.realContent.headlines.length} headlines, ${result.realContent.pricingData.length} pricing, ${result.realContent.testimonialQuotes.length} testimonials`);
      console.log(`[content-research] NEW: ${result.dataModels.length} data models, ${result.componentStructures.length} components, ${result.animationPatterns.length} animations`);

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

    // NEW: Data Models for typed data generation
    if (research.dataModels.length > 0) {
      sections.push('### Data Models (generate typed data.ts with these interfaces)');
      for (const model of research.dataModels.slice(0, 5)) {
        sections.push(`**${model.typeName}**:`);
        for (const field of model.fields) {
          sections.push(`  - ${field.name}: ${field.type}${field.required ? ' (required)' : ' (optional)'}`);
        }
      }
      sections.push('');
    }

    // NEW: Component Structures for reference
    if (research.componentStructures.length > 0) {
      sections.push('### Component Structures (reference for generation)');
      for (const comp of research.componentStructures.slice(0, 8)) {
        sections.push(`- **${comp.name}** (${comp.type}): ${comp.props.length > 0 ? 'Props: ' + comp.props.join(', ') : 'No props'}${comp.hasState ? ' [has state]' : ''}${comp.hasAnimation ? ' [has animation]' : ''}`);
      }
      sections.push('');
    }

    // NEW: Animation Patterns for reference
    if (research.animationPatterns.length > 0) {
      sections.push('### Animation Patterns (use Framer Motion for React)');
      for (const anim of research.animationPatterns.slice(0, 8)) {
        sections.push(`- ${anim.type} ${anim.trigger}: ${anim.description}`);
      }
      sections.push('');
    }

    // NEW: Design System extracted from reference
    if (Object.keys(research.designSystem.colors).length > 0) {
      sections.push('### Design System (from reference)');
      sections.push(`Colors: ${Object.keys(research.designSystem.colors).slice(0, 10).join(', ')}`);
      if (research.designSystem.typography.fonts.length > 0) {
        sections.push(`Fonts: ${research.designSystem.typography.fonts.join(', ')}`);
      }
      sections.push('');
    }

    sections.push('**IMPORTANT**: Use this real research as INSPIRATION. Generate original content that is similar in style and quality but do NOT copy text verbatim. Adapt the content to match the user\'s specific business.');

    return sections.join('\n');
  }

  // ─── NEW: Data Model Extraction ──────────────────────────────────

  /**
   * Extract typed data models from crawled content.
   * Looks for TypeScript interfaces, type definitions, and inferred structures.
   */
  extractDataModels(text: string, html: string): ContentResearchResult['dataModels'] {
    const models: ContentResearchResult['dataModels'] = [];

    // Extract TypeScript interfaces from HTML
    const interfacePattern = /(?:interface|type)\s+(\w+)\s*(?:=\s*)?\{([^}]+)\}/g;
    let match;
    while ((match = interfacePattern.exec(html)) !== null) {
      const name = match[1];
      const body = match[2];
      if (name && body && !['Props', 'State', 'Context', 'Ref'].includes(name)) {
        const fields = this.parseInterfaceFields(body);
        models.push({ name, typeName: name, fields, sampleData: [] });
      }
    }

    // Infer data models from content patterns
    if (text.match(/product|item|collection|catalog/i)) {
      models.push({
        name: 'Product',
        typeName: 'Product',
        fields: [
          { name: 'id', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'description', type: 'string', required: true },
          { name: 'price', type: 'number', required: true },
          { name: 'image', type: 'string', required: true },
          { name: 'category', type: 'string', required: false },
          { name: 'features', type: 'string[]', required: false },
        ],
        sampleData: [],
      });
    }

    if (text.match(/testimonial|review|feedback/i)) {
      models.push({
        name: 'Testimonial',
        typeName: 'Testimonial',
        fields: [
          { name: 'id', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'role', type: 'string', required: true },
          { name: 'quote', type: 'string', required: true },
          { name: 'rating', type: 'number', required: false },
          { name: 'avatar', type: 'string', required: false },
        ],
        sampleData: [],
      });
    }

    if (text.match(/team|member|ambassador|expert/i)) {
      models.push({
        name: 'TeamMember',
        typeName: 'TeamMember',
        fields: [
          { name: 'id', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'role', type: 'string', required: true },
          { name: 'bio', type: 'string', required: false },
          { name: 'image', type: 'string', required: true },
        ],
        sampleData: [],
      });
    }

    if (text.match(/pricing|plan|tier|subscription/i)) {
      models.push({
        name: 'PricingTier',
        typeName: 'PricingTier',
        fields: [
          { name: 'id', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'price', type: 'string', required: true },
          { name: 'interval', type: 'string', required: true },
          { name: 'features', type: 'string[]', required: true },
          { name: 'highlighted', type: 'boolean', required: false },
        ],
        sampleData: [],
      });
    }

    return models;
  }

  private parseInterfaceFields(body: string): Array<{ name: string; type: string; required: boolean }> {
    const fields: Array<{ name: string; type: string; required: boolean }> = [];
    const lines = body.split('\n');
    for (const line of lines) {
      const fieldMatch = line.match(/^\s*(\w+)\s*(\?)?\s*:\s*([^;]+)/);
      if (fieldMatch?.[1]) {
        const fieldType = fieldMatch[3]?.trim();
        fields.push({
          name: fieldMatch[1],
          type: fieldType ? String(fieldType) : 'string',
          required: !fieldMatch[2],
        });
      }
    }
    return fields;
  }

  // ─── NEW: Component Structure Extraction ─────────────────────────

  extractComponentStructures(html: string, text: string): ContentResearchResult['componentStructures'] {
    const components: ContentResearchResult['componentStructures'] = [];

    const sectionPatterns = [
      { pattern: /<(?:section|div)[^>]*id=["']hero["'][^>]*>/gi, type: 'hero' },
      { pattern: /<(?:section|div)[^>]*id=["']collections?["'][^>]*>/gi, type: 'collections' },
      { pattern: /<(?:section|div)[^>]*id=["']customizer["'][^>]*>/gi, type: 'customizer' },
      { pattern: /<(?:section|div)[^>]*id=["']story["'][^>]*>/gi, type: 'story' },
      { pattern: /<(?:section|div)[^>]*id=["']craftsmanship["'][^>]*>/gi, type: 'craftsmanship' },
      { pattern: /<(?:section|div)[^>]*id=["']dealers?["'][^>]*>/gi, type: 'dealers' },
      { pattern: /<(?:section|div)[^>]*id=["']testimonials?["'][^>]*>/gi, type: 'testimonials' },
      { pattern: /<(?:section|div)[^>]*id=["']contact["'][^>]*>/gi, type: 'contact' },
    ];

    for (const { pattern, type } of sectionPatterns) {
      if (html.match(pattern)) {
        components.push({
          name: type.charAt(0).toUpperCase() + type.slice(1),
          type,
          props: this.inferComponentProps(type),
          hasState: html.includes('useState'),
          hasAnimation: html.includes('motion.'),
          complexity: (type === 'customizer' || type === 'dealers') ? 'complex' : 'medium',
        });
      }
    }

    return components;
  }

  private inferComponentProps(type: string): string[] {
    const propsMap: Record<string, string[]> = {
      hero: ['onExplore', 'onCustomize'],
      collections: ['onSelectWatchForInquiry', 'onNavigateToCustomizer'],
      customizer: ['onReserveCustomBuild'],
      dealers: ['onBookAtBoutique'],
      contact: ['prefilledWatch', 'prefilledBoutique'],
    };
    return propsMap[type] || [];
  }

  // ─── NEW: Animation Pattern Extraction ───────────────────────────

  extractAnimationPatterns(html: string): ContentResearchResult['animationPatterns'] {
    const patterns: ContentResearchResult['animationPatterns'] = [];

    // Extract Framer Motion patterns
    const motionMatches = html.match(/motion\.\w+\([^)]*\)/gi) || [];
    for (const motion of motionMatches.slice(0, 10)) {
      const componentMatch = motion.match(/motion\.(\w+)/i);
      patterns.push({
        type: 'framer-motion',
        trigger: motion.includes('whileHover') ? 'hover' : motion.includes('whileInView') ? 'scroll' : 'mount',
        code: motion.substring(0, 200),
        description: `Framer Motion ${componentMatch?.[1] || 'animation'}`,
      });
    }

    // Extract CSS animations
    const cssAnimations = html.match(/animation:\s*[^;]+/gi) || [];
    for (const anim of cssAnimations.slice(0, 5)) {
      patterns.push({
        type: 'css',
        trigger: 'mount',
        code: anim,
        description: 'CSS animation',
      });
    }

    return patterns;
  }

  // ─── NEW: Design System Extraction ───────────────────────────────

  extractDesignSystem(html: string, text: string): ContentResearchResult['designSystem'] {
    const colors: Record<string, string> = {};

    // Extract hex colors
    const hexColors = html.match(/#[0-9a-fA-F]{6}/g) || [];
    for (const hex of hexColors.slice(0, 20)) {
      colors[hex] = hex;
    }

    // Extract Tailwind color classes
    const colorClasses = html.match(/(?:bg|text|border|from|to|via)-(red|blue|green|purple|amber|emerald|violet|indigo|cyan|orange|pink|rose|teal|sky|slate|zinc|gray|stone|gold)-\d+/g) || [];
    for (const cls of colorClasses.slice(0, 20)) {
      colors[cls] = cls;
    }

    // Extract fonts
    const fonts: string[] = [];
    const fontFamilies = html.match(/font-(?:family|sans|serif|mono)[^"]*["']([^"']+)["']/gi) || [];
    for (const ff of fontFamilies) {
      const match = ff.match(/["']([^"']+)["']/);
      if (match?.[1]) fonts.push(match[1]);
    }

    // Extract font sizes
    const fontSizes: string[] = [];
    const fontSizeClasses = html.match(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl)/gi) || [];
    fontSizes.push(...fontSizeClasses);

    // Extract spacing
    const spacing: string[] = [];
    const spacingClasses = html.match(/(?:p|m|px|py|gap|space)-(0|1|2|3|4|5|6|8|10|12|16|20|24)/gi) || [];
    spacing.push(...spacingClasses);

    // Extract border radius
    const borderRadius: string[] = [];
    const radiusClasses = html.match(/rounded-(sm|md|lg|xl|2xl|full)/gi) || [];
    borderRadius.push(...radiusClasses);

    return {
      colors,
      typography: { fonts: [...new Set(fonts)], fontSizes: [...new Set(fontSizes)] },
      spacing: [...new Set(spacing)],
      borderRadius: [...new Set(borderRadius)],
    };
  }
}
