import { WebSearcher } from './web-searcher.js';
import type { SearchResult, WebContent } from './web-searcher.js';
import { BILLMCaller } from './llm-caller.js';

/**
 * AgentSkillsBridge: Unified interface for agent capabilities.
 * 
 * Wraps web search, content extraction, and analysis capabilities
 * that enhance the BI pipeline and build system.
 */
export class AgentSkillsBridge {
  private searcher: WebSearcher;
  private llm: BILLMCaller | null;

  constructor(llm?: BILLMCaller) {
    this.searcher = new WebSearcher();
    this.llm = llm || null;
  }

  // ─── Web Search ───────────────────────────────────────────

  async webSearch(query: string, numResults = 5): Promise<SearchResult[]> {
    console.log(`[agent-skills] Web search: "${query}"`);
    return this.searcher.search(query, numResults);
  }

  async fetchWebpage(url: string): Promise<WebContent> {
    return this.searcher.fetchPage(url);
  }

  async fetchMultiplePages(urls: string[]): Promise<WebContent[]> {
    return this.searcher.fetchMultiple(urls);
  }

  // ─── Competitive Analysis ─────────────────────────────────

  async analyzeCompetitors(industry: string, businessModel: string): Promise<{
    competitors: Array<{ name: string; description: string; strengths: string[]; weaknesses: string[] }>;
    market_gaps: string[];
    opportunities: string[];
  }> {
    const results = await this.webSearch(`${industry} ${businessModel} top companies competitors 2025`, 8);
    const pages = await this.fetchMultiplePages(results.slice(0, 3).map(r => r.url));
    const content = pages.filter(p => p.text.length > 200).map(p => `${p.title}:\n${p.text.substring(0, 3000)}`).join('\n\n');

    if (!this.llm || !content) {
      return {
        competitors: results.slice(0, 5).map(r => ({ name: r.title, description: r.snippet, strengths: [], weaknesses: [] })),
        market_gaps: [],
        opportunities: []
      };
    }

    try {
      return await this.llm.callStructured(`Analyze competitors in ${industry}. Return JSON:
{ "competitors": [{ "name": "string", "description": "string", "strengths": ["string"], "weaknesses": ["string"] }],
  "market_gaps": ["string"], "opportunities": ["string"] }`,
        `Industry: ${industry}\nBusiness Model: ${businessModel}\n\nResearch Data:\n${content}`);
    } catch {
      return {
        competitors: results.slice(0, 5).map(r => ({ name: r.title, description: r.snippet, strengths: [], weaknesses: [] })),
        market_gaps: [],
        opportunities: []
      };
    }
  }

  // ─── Technology Detection ─────────────────────────────────

  async detectTechnologies(url: string): Promise<{
    technologies: string[];
    frameworks: string[];
    cms: string;
    analytics: string[];
    hosting: string;
  }> {
    const page = await this.fetchWebpage(url);
    const html = page.text.toLowerCase();

    const techMap: Record<string, string[]> = {
      'React': ['react', '_next', '__next'],
      'Vue': ['vue', 'v-cloak', 'vue-router'],
      'Angular': ['ng-', 'angular'],
      'Next.js': ['_next', 'next.js', 'nextjs'],
      'Shopify': ['shopify', 'cdn.shopify.com'],
      'WordPress': ['wp-content', 'wordpress'],
      'Wix': ['wix.com', 'wixstatic'],
      'Squarespace': ['squarespace', 'sqsp'],
      'Tailwind': ['tailwind', 'tw-'],
      'Bootstrap': ['bootstrap'],
      'Google Analytics': ['google-analytics', 'gtag', 'ga.js', 'analytics.js'],
      'Segment': ['segment.com', 'analytics.js'],
      'Hotjar': ['hotjar'],
      'Vercel': ['vercel', '_vercel'],
      'Netlify': ['netlify'],
      'AWS': ['amazonaws.com'],
      'Cloudflare': ['cloudflare', 'cf-'],
    };

    const detected: string[] = [];
    const frameworks: string[] = [];
    const analytics: string[] = [];

    for (const [name, keywords] of Object.entries(techMap)) {
      if (keywords.some(k => html.includes(k))) {
        if (['Google Analytics', 'Segment', 'Hotjar'].includes(name)) analytics.push(name);
        else if (['React', 'Vue', 'Angular', 'Next.js'].includes(name)) frameworks.push(name);
        else detected.push(name);
      }
    }

    const cms = detected.find(t => ['Shopify', 'WordPress', 'Wix', 'Squarespace'].includes(t)) || 'Unknown';
    const hosting = detected.find(t => ['Vercel', 'Netlify', 'AWS', 'Cloudflare'].includes(t)) || 'Unknown';

    return { technologies: detected, frameworks, cms, analytics, hosting };
  }

  // ─── Content Extraction ───────────────────────────────────

  async extractKeyContent(url: string): Promise<{
    title: string;
    description: string;
    headings: string[];
    key_phrases: string[];
    cta_buttons: string[];
    navigation_items: string[];
  }> {
    const page = await this.fetchWebpage(url);
    const headings = page.text.match(/^[A-Z][A-Z\s]{5,}$/gm) || [];
    const ctaButtons = page.links.filter(l =>
      /sign up|get started|try|buy|contact|book|learn more|download/i.test(l.text)
    ).map(l => l.text);
    const navItems = page.links.slice(0, 10).map(l => l.text);

    return {
      title: page.title,
      description: page.text.substring(0, 200),
      headings: headings.slice(0, 10),
      key_phrases: [],
      cta_buttons: ctaButtons.slice(0, 5),
      navigation_items: navItems
    };
  }

  // ─── Market Research ──────────────────────────────────────

  async researchMarketSize(industry: string): Promise<{
    estimated_size: string;
    growth_rate: string;
    key_segments: string[];
    sources: string[];
  }> {
    const results = await this.webSearch(`${industry} market size 2025 revenue growth`, 5);
    return {
      estimated_size: results[0]?.snippet || 'Research needed',
      growth_rate: 'Research needed',
      key_segments: results.slice(0, 3).map(r => r.title),
      sources: results.map(r => r.url)
    };
  }
}
