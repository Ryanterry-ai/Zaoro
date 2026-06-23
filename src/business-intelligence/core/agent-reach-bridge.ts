import * as cheerio from 'cheerio';
import { WebSearcher } from './web-searcher.js';
import type { WebContent } from './web-searcher.js';
import { BILLMCaller } from './llm-caller.js';

export interface StructuredData {
  jsonLd: Array<Record<string, unknown>>;
  schemaOrg: Record<string, string>;
  microdata: Array<Record<string, string>>;
}

export interface SocialLinks {
  linkedin: string[];
  twitter: string[];
  facebook: string[];
  instagram: string[];
  youtube: string[];
  tiktok: string[];
  github: string[];
  other: Array<{ platform: string; url: string }>;
}

export interface PricingInfo {
  has_pricing_page: boolean;
  pricing_url: string;
  plans: Array<{ name: string; price: string; features: string[] }>;
  currency: string;
  billing_model: string;
}

export interface ContactInfo {
  emails: string[];
  phones: string[];
  addresses: string[];
  social_links: SocialLinks;
  contact_form_url: string;
}

export interface APIEndpoint {
  url: string;
  method: string;
  description: string;
  type: 'rest' | 'graphql' | 'websocket' | 'unknown';
}

export interface CrawlResult {
  url: string;
  title: string;
  description: string;
  pages: WebContent[];
  structured_data: StructuredData;
  social_links: SocialLinks;
  pricing_info: PricingInfo;
  contact_info: ContactInfo;
  api_endpoints: APIEndpoint[];
  technologies: string[];
  total_pages_crawled: number;
}

/**
 * AgentReachBridge: Real web crawling, structured data extraction,
 * social discovery, pricing extraction, and API endpoint discovery.
 * Uses cheerio for HTML parsing and Playwright for full rendering.
 */
export class AgentReachBridge {
  private searcher: WebSearcher;
  private llm: BILLMCaller | null;
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  constructor(llm?: BILLMCaller) {
    this.searcher = new WebSearcher();
    this.llm = llm || null;
  }

  // ─── Multi-Page Crawling ───────────────────────────────

  async crawlWebsite(startUrl: string, maxPages = 20): Promise<CrawlResult> {
    console.log(`[agent-reach] Crawling: ${startUrl} (max ${maxPages} pages)`);

    const visited = new Set<string>();
    const toVisit = [startUrl];
    const pages: WebContent[] = [];
    const baseUrl = new URL(startUrl).origin;

    while (toVisit.length > 0 && pages.length < maxPages) {
      const url = toVisit.shift()!;
      const normalized = this.normalizeUrl(url, baseUrl);
      if (visited.has(normalized)) continue;
      visited.add(normalized);

      try {
        const page = await this.searcher.fetchPage(url);
        pages.push(page);

        // Discover internal links
        for (const link of page.links) {
          const linkNormalized = this.normalizeUrl(link.href, baseUrl);
          if (!visited.has(linkNormalized) && link.href.startsWith(baseUrl)) {
            toVisit.push(link.href);
          }
        }
      } catch {
        // Skip failed pages
      }
    }

    console.log(`[agent-reach] Crawled ${pages.length} pages`);

    // Extract all data from the collected pages
    const allHtml = pages.map(p => p.text).join('\n');
    const homeHtml = pages[0]?.text || '';

    const structuredData = this.extractStructuredData(homeHtml);
    const socialLinks = this.extractSocialLinks(allHtml, startUrl);
    const pricingInfo = this.extractPricingInfo(pages, startUrl);
    const contactInfo = this.extractContactInfo(allHtml, socialLinks);
    const apiEndpoints = this.discoverAPIEndpoints(pages);
    const technologies = this.detectTechnologies(homeHtml);

    return {
      url: startUrl,
      title: pages[0]?.title || '',
      description: pages[0]?.text.substring(0, 300) || '',
      pages,
      structured_data: structuredData,
      social_links: socialLinks,
      pricing_info: pricingInfo,
      contact_info: contactInfo,
      api_endpoints: apiEndpoints,
      technologies,
      total_pages_crawled: pages.length
    };
  }

  // ─── Structured Data Extraction (Schema.org, JSON-LD) ──

  extractStructuredData(html: string): StructuredData {
    const $ = cheerio.load(html);
    const jsonLd: Array<Record<string, unknown>> = [];
    const schemaOrg: Record<string, string> = {};
    const microdata: Array<Record<string, string>> = [];

    // Extract JSON-LD
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || '{}');
        if (data['@graph']) {
          for (const item of (data['@graph'] as Array<Record<string, unknown>>)) {
            jsonLd.push(item);
          }
        } else if (data['@type']) {
          jsonLd.push(data);
        }
      } catch {
        // Skip malformed JSON-LD
      }
    });

    // Extract Schema.org microdata
    $('[itemscope]').each((_, el) => {
      const type = $(el).attr('itemtype') || '';
      const item: Record<string, string> = { '@type': type };
      $(el).find('[itemprop]').each((_, prop) => {
        const name = $(prop).attr('itemprop') || '';
        const content = $(prop).attr('content') || $(prop).text().trim();
        if (name) item[name] = content;
      });
      if (Object.keys(item).length > 1) microdata.push(item);
    });

    // Extract Open Graph
    $('meta[property^="og:"]').each((_, el) => {
      const prop = $(el).attr('property')?.replace('og:', '') || '';
      const content = $(el).attr('content') || '';
      if (prop && content) schemaOrg[`og:${prop}`] = content;
    });

    // Extract Twitter Cards
    $('meta[name^="twitter:"]').each((_, el) => {
      const name = $(el).attr('name')?.replace('twitter:', '') || '';
      const content = $(el).attr('content') || '';
      if (name && content) schemaOrg[`twitter:${name}`] = content;
    });

    return { jsonLd, schemaOrg, microdata };
  }

  // ─── Social Media Link Discovery ───────────────────────

  extractSocialLinks(html: string, baseUrl: string): SocialLinks {
    const $ = cheerio.load(html);
    const socialLinks: SocialLinks = {
      linkedin: [], twitter: [], facebook: [],
      instagram: [], youtube: [], tiktok: [], github: [], other: []
    };

    const socialPatterns: Array<[string, RegExp]> = [
      ['linkedin', /linkedin\.com\/(company|in|profile)/i],
      ['twitter', /twitter\.com\/|x\.com\//i],
      ['facebook', /facebook\.com\/|fb\.com\//i],
      ['instagram', /instagram\.com\//i],
      ['youtube', /youtube\.com\/|youtu\.be\//i],
      ['tiktok', /tiktok\.com\/@/i],
      ['github', /github\.com\//i],
    ];

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      for (const [platform, pattern] of socialPatterns) {
        if (pattern.test(href)) {
          const arr = socialLinks[platform as keyof SocialLinks] as string[];
          if (Array.isArray(arr) && !arr.includes(href)) {
            arr.push(href);
          }
          break;
        }
      }
    });

    // Also check meta tags for social links
    $('meta[property="og:see_also"], link[rel="me"]').each((_, el) => {
      const href = $(el).attr('content') || $(el).attr('href') || '';
      if (href) {
        for (const [platform, pattern] of socialPatterns) {
          if (pattern.test(href)) {
            const arr = socialLinks[platform as keyof SocialLinks] as string[];
            if (Array.isArray(arr) && !arr.includes(href)) {
              arr.push(href);
            }
            break;
          }
        }
      }
    });

    return socialLinks;
  }

  // ─── Pricing Information Extraction ────────────────────

  extractPricingInfo(pages: WebContent[], baseUrl: string): PricingInfo {
    const pricingPage = pages.find(p =>
      /pricing|plans|packages/i.test(p.title + p.url)
    );

    const result: PricingInfo = {
      has_pricing_page: !!pricingPage,
      pricing_url: pricingPage?.url || '',
      plans: [],
      currency: 'USD',
      billing_model: 'unknown'
    };

    if (!pricingPage) return result;

    const text = pricingPage.text;

    // Extract price patterns ($XX/mo, $XX/year, etc.)
    const pricePatterns = text.match(/\$[\d,]+(?:\.\d{2})?(?:\s*\/\s*(?:mo|month|yr|year|annual))?/gi) || [];
    const uniquePrices = [...new Set(pricePatterns)].slice(0, 10);

    // Extract plan names near prices
    const planNames = text.match(/(free|basic|starter|pro|professional|enterprise|business|premium|standard|plus|growth|scale)/gi) || [];
    const uniquePlans = [...new Set(planNames.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))].slice(0, 6);

    // Determine billing model
    if (/annual|yearly|per year/i.test(text)) result.billing_model = 'annual';
    else if (/monthly|per month|\/mo/i.test(text)) result.billing_model = 'monthly';
    else if (/one[- ]?time|lifetime/i.test(text)) result.billing_model = 'one-time';
    else if (/free/i.test(text)) result.billing_model = 'freemium';

    // Determine currency
    if (/€|EUR/i.test(text)) result.currency = 'EUR';
    else if (/£|GBP/i.test(text)) result.currency = 'GBP';

    // Build plan objects
    for (const plan of uniquePlans) {
      const planSection = text.substring(
        text.indexOf(plan.toLowerCase()) - 50,
        text.indexOf(plan.toLowerCase()) + 200
      );
      const price = planSection.match(/\$[\d,]+(?:\.\d{2})?/)?.[0] || 'Custom';
      result.plans.push({ name: plan, price, features: [] });
    }

    // Fallback: if no plans found but prices exist
    if (result.plans.length === 0 && uniquePrices.length > 0) {
      result.plans = uniquePrices.map((price, i) => ({
        name: `Plan ${i + 1}`,
        price,
        features: []
      }));
    }

    return result;
  }

  // ─── Contact Information Extraction ────────────────────

  extractContactInfo(html: string, socialLinks: SocialLinks): ContactInfo {
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phonePattern = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;

    const emails = [...new Set((html.match(emailPattern) || []).filter(e => !e.includes('example.com') && !e.includes('sentry')))];
    const phones = [...new Set(html.match(phonePattern) || [])].slice(0, 3);

    // Extract addresses (simple heuristic)
    const addressPattern = /\d{1,5}\s[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Place|Pl)[^,<]*/gi;
    const addresses = [...new Set(html.match(addressPattern) || [])].slice(0, 3);

    // Find contact form
    const contactFormMatch = html.match(/<form[^>]*(?:contact|inquiry|message)[^>]*action="([^"]*)"/i);

    return {
      emails,
      phones,
      addresses,
      social_links: socialLinks,
      contact_form_url: contactFormMatch?.[1] || ''
    };
  }

  // ─── API Endpoint Discovery ────────────────────────────

  discoverAPIEndpoints(pages: WebContent[]): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];
    const seen = new Set<string>();

    for (const page of pages) {
      const text = page.text;
      const html = text;

      // REST API patterns
      const restPatterns = html.match(/(?:fetch|axios|\.get|\.post|\.put|\.delete|\.patch)\s*\(\s*['"`]([^'"`]+)['"`]/g) || [];
      for (const match of restPatterns) {
        const url = match.match(/['"`]([^'"`]+)['"`]/)?.[1];
        if (url && !seen.has(url) && url.startsWith('/api')) {
          seen.add(url);
          const method = match.includes('.post') ? 'POST' : match.includes('.put') ? 'PUT' :
                        match.includes('.delete') ? 'DELETE' : match.includes('.patch') ? 'PATCH' : 'GET';
          endpoints.push({ url, method, description: '', type: 'rest' });
        }
      }

      // GraphQL patterns
      if (/graphql|gql`|useQuery|useMutation/i.test(html)) {
        const graphqlMatch = html.match(/(?:endpoint|url|uri)['":\s]+['"`]([^'"`]*graphql[^'"`]*)['"]/i);
        if (graphqlMatch?.[1] && !seen.has(graphqlMatch[1])) {
          seen.add(graphqlMatch[1]);
          endpoints.push({ url: graphqlMatch[1], method: 'POST', description: 'GraphQL endpoint', type: 'graphql' });
        }
      }

      // API documentation links
      const apiLinks = page.links.filter(l =>
        /api|docs|developer|swagger|openapi/i.test(l.href + l.text)
      );
      for (const link of apiLinks.slice(0, 5)) {
        if (!seen.has(link.href)) {
          seen.add(link.href);
          endpoints.push({ url: link.href, method: 'GET', description: link.text, type: 'unknown' });
        }
      }
    }

    return endpoints.slice(0, 20);
  }

  // ─── Technology Detection ──────────────────────────────

  detectTechnologies(html: string): string[] {
    const techs: string[] = [];
    const checks: Array<[string, RegExp]> = [
      ['React', /react|__next/i], ['Next.js', /_next|nextjs/i], ['Vue', /vue/i],
      ['Angular', /ng-|angular/i], ['Svelte', /svelte/i],
      ['Tailwind CSS', /tailwind/i], ['Bootstrap', /bootstrap/i],
      ['Shopify', /shopify/i], ['WordPress', /wp-content|wordpress/i],
      ['Webflow', /webflow/i], ['Wix', /wix\.com/i],
      ['Google Analytics', /gtag|google-analytics/i], ['Segment', /segment\.com/i],
      ['Hotjar', /hotjar/i], ['Stripe', /stripe/i],
      ['Vercel', /vercel|_vercel/i], ['Netlify', /netlify/i],
      ['AWS', /amazonaws\.com/i], ['Cloudflare', /cloudflare/i],
    ];
    for (const [name, pattern] of checks) {
      if (pattern.test(html)) techs.push(name);
    }
    return techs;
  }

  // ─── Competitor Research via Search ────────────────────

  async researchCompetitors(industry: string, businessModel: string): Promise<Array<{
    name: string; url: string; description: string; technologies: string[];
  }>> {
    const query = `${industry} ${businessModel} top companies`;
    const results = await this.searcher.search(query, 5);
    const competitors: Array<{ name: string; url: string; description: string; technologies: string[] }> = [];

    for (const result of results.slice(0, 3)) {
      try {
        const page = await this.searcher.fetchPage(result.url);
        const technologies = this.detectTechnologies(page.text);
        competitors.push({
          name: result.title,
          url: result.url,
          description: result.snippet,
          technologies
        });
      } catch {
        competitors.push({
          name: result.title,
          url: result.url,
          description: result.snippet,
          technologies: []
        });
      }
    }

    return competitors;
  }

  // ─── Helpers ───────────────────────────────────────────

  private normalizeUrl(url: string, baseUrl: string): string {
    try {
      const parsed = new URL(url, baseUrl);
      return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '');
    } catch {
      return url;
    }
  }
}
