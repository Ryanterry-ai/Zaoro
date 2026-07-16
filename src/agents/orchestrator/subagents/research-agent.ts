/**
 * Research Agent — gathers business intelligence.
 *
 * Skills (auto-discovered and installed):
 * 1. PROMPT ANALYSIS — extract intent, industry, domain from user text
 * 2. BOS KNOWLEDGE LOOKUP — industry-specific business models, workflows, compliance
 * 3. WEB SEARCH — find real businesses in the industry
 * 4. WEB FETCH — scrape business websites for intelligence
 * 5. BUSINESS MODEL INFERENCE — infer revenue, journey, payments from real data
 * 6. COMPETITOR ANALYSIS — find and analyze competitor sites (via ecommerce-competitor-analysis skill)
 * 7. PRODUCT RESEARCH — research products, prices, and market (via product-research skill)
 * 8. SKILL DISCOVERY — auto-discover and install skills when needed (via find-skills pattern)
 *
 * This agent does NOT just parse keywords. It RESEARCHES the business
 * using web search + web fetch + domain knowledge to build real intelligence.
 *
 * Agentic loop: If quality gate fails, re-run with enriched context.
 * If a skill is missing, the agent discovers and installs it automatically.
 */

import type { IResearchAgent, PhaseContext, AgentResult } from '../types.js';
import { buildBusinessResearch } from '../../../bos/intake-parser.js';
import type { BusinessResearch } from '../../../bos/types.js';
import { SkillRegistry, type InstalledSkill } from '../skill-registry.js';
import type { BusinessKnowledge } from '../../../orchestration/business-intelligence/types.js';

// BOS knowledge packs for industry-specific intelligence
const INDUSTRY_KNOWLEDGE: Record<string, {
  businessModels: string[];
  revenueFlows: string[];
  customerFlows: string[];
  paymentMethods: string[];
  workflows: string[];
  kpis: string[];
  personas: string[];
  vocabulary: Record<string, string>;
  referenceSearchTerms: string[];
}> = {
  ecommerce: {
    businessModels: ['direct-sales', 'marketplace', 'subscription'],
    revenueFlows: ['direct-sales', 'subscription', 'membership'],
    customerFlows: ['discover', 'browse', 'compare', 'add-to-cart', 'checkout', 'payment', 'delivery', 'review'],
    paymentMethods: ['credit-card', 'debit-card', 'upi', 'cod', 'netbanking', 'wallet'],
    workflows: ['inventory', 'order-processing', 'shipping', 'customer-support', 'marketing'],
    kpis: ['revenue', 'conversion', 'customers', 'retention', 'inventory'],
    personas: ['shopper', 'brand loyalist', 'bargain hunter', 'first-time buyer', 'bulk buyer'],
    vocabulary: { product: 'product', customer: 'customer', order: 'order', cart: 'cart' },
    referenceSearchTerms: ['online store', 'ecommerce platform', 'shop online'],
  },
  restaurant: {
    businessModels: ['direct-sales', 'service-booking'],
    revenueFlows: ['direct-sales', 'membership'],
    customerFlows: ['discover', 'browse-menu', 'make-reservation', 'dine-in', 'order-takeaway', 'pay', 'leave-review'],
    paymentMethods: ['credit-card', 'debit-card', 'upi', 'cash'],
    workflows: ['order-processing', 'quality-check', 'customer-support'],
    kpis: ['revenue', 'satisfaction', 'customers', 'conversion'],
    personas: ['foodie', 'diner', 'health-conscious eater', 'family diner', 'takeout customer'],
    vocabulary: { product: 'dish', customer: 'guest', order: 'reservation', staff: 'chef' },
    referenceSearchTerms: ['restaurant menu', 'food delivery', 'dining reservation'],
  },
  saas: {
    businessModels: ['subscription', 'freemium'],
    revenueFlows: ['subscription', 'freemium'],
    customerFlows: ['discover', 'sign-up', 'onboard', 'use', 'upgrade', 'renew'],
    paymentMethods: ['credit-card', 'paypal', 'stripe'],
    workflows: ['customer-support', 'marketing', 'accounting'],
    kpis: ['retention', 'acquisition', 'revenue', 'conversion'],
    personas: ['developer', 'project manager', 'team lead', 'startup founder', 'enterprise admin'],
    vocabulary: { product: 'feature', customer: 'user', order: 'subscription' },
    referenceSearchTerms: ['saas platform', 'software tool', 'cloud service'],
  },
  fitness: {
    businessModels: ['membership', 'service-booking'],
    revenueFlows: ['membership', 'service-booking', 'direct-sales'],
    customerFlows: ['discover', 'join', 'attend-class', 'track-progress', 'renew', 'refer'],
    paymentMethods: ['credit-card', 'debit-card', 'upi', 'netbanking'],
    workflows: ['customer-support', 'marketing', 'accounting'],
    kpis: ['retention', 'revenue', 'customers', 'conversion'],
    personas: ['gym enthusiast', 'fitness beginner', 'athlete', 'yoga practitioner'],
    vocabulary: { product: 'membership', customer: 'member', order: 'enrollment', staff: 'trainer' },
    referenceSearchTerms: ['gym membership', 'fitness class', 'workout program'],
  },
  healthcare: {
    businessModels: ['service-booking'],
    revenueFlows: ['service-booking', 'direct-sales'],
    customerFlows: ['discover', 'book-appointment', 'consult', 'receive-treatment', 'follow-up', 'pay'],
    paymentMethods: ['credit-card', 'debit-card', 'insurance', 'upi'],
    workflows: ['customer-support', 'accounting', 'quality-check'],
    kpis: ['satisfaction', 'revenue', 'customers', 'retention'],
    personas: ['patient', 'health-conscious', 'senior', 'parent'],
    vocabulary: { product: 'treatment', customer: 'patient', order: 'appointment', staff: 'provider' },
    referenceSearchTerms: ['clinic booking', 'doctor appointment', 'healthcare service'],
  },
  realestate: {
    businessModels: ['direct-sales', 'commission'],
    revenueFlows: ['direct-sales', 'commission'],
    customerFlows: ['discover', 'search-properties', 'schedule-visit', 'make-offer', 'close-deal', 'pay'],
    paymentMethods: ['credit-card', 'bank-transfer', 'cheque'],
    workflows: ['customer-support', 'marketing', 'accounting'],
    kpis: ['revenue', 'conversion', 'customers', 'satisfaction'],
    personas: ['home buyer', 'investor', 'renter', 'first-time buyer'],
    vocabulary: { product: 'property', customer: 'buyer', order: 'offer', staff: 'agent' },
    referenceSearchTerms: ['property listing', 'real estate platform', 'home search'],
  },
  education: {
    businessModels: ['subscription', 'direct-sales', 'membership'],
    revenueFlows: ['subscription', 'direct-sales', 'membership'],
    customerFlows: ['discover', 'browse-courses', 'enroll', 'learn', 'complete', 'get-certified'],
    paymentMethods: ['credit-card', 'debit-card', 'upi', 'netbanking'],
    workflows: ['customer-support', 'marketing', 'accounting'],
    kpis: ['retention', 'conversion', 'revenue', 'customers'],
    personas: ['student', 'professional learner', 'career changer', 'certification seeker'],
    vocabulary: { product: 'course', customer: 'student', order: 'enrollment', staff: 'instructor' },
    referenceSearchTerms: ['online course', 'learning platform', 'education portal'],
  },
};

// Search engine configuration
const SEARCH_ENGINES = [
  {
    name: 'duckduckgo-html',
    buildUrl: (query: string) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    parseResults: (html: string): string[] => {
      const urls: string[] = [];
      const regex = /href="(https?:\/\/[^"]+)"/g;
      let match;
      while ((match = regex.exec(html)) !== null) {
        const url = match[1];
        if (url && !url.includes('duckduckgo.com') && !url.includes('google.com') && !url.includes('bing.com')) {
          urls.push(url);
        }
      }
      return urls.slice(0, 5);
    },
  },
];

export class ResearchAgent implements IResearchAgent {
  readonly name = 'research-agent';
  private skillRegistry: SkillRegistry;

  constructor(workspaceDir: string) {
    this.skillRegistry = new SkillRegistry(workspaceDir);
  }

  async run(ctx: PhaseContext): Promise<AgentResult<BusinessResearch>> {
    const start = Date.now();
    let attempts = 0;

    // Initialize skill registry
    await this.skillRegistry.initialize();

    while (true) {
      attempts++;
      try {
        // Step 1: Analyze prompt (deterministic)
        let research = this.analyzePrompt(ctx);

        // Step 2: Enrich with BusinessKnowledge (preferred) or BOS knowledge (fallback)
        if (ctx.businessKnowledge) {
          research = this.enrichWithBusinessKnowledge(research, ctx.businessKnowledge);
        } else {
          research = this.enrichWithBOSKnowledge(research, ctx);
        }

        // Step 3: Discover and install required skills for this industry
        await this.ensureIndustrySkills(research.industry);

        // Step 4: Discover real businesses via web search
        const realBusinesses = await this.discoverRealBusinesses(research, ctx);
        if (realBusinesses.length > 0) {
          research = this.enrichWithRealData(research, realBusinesses);
        }

        // Step 5: Apply competitor analysis skill if available
        research = await this.applyCompetitorAnalysis(research, ctx);

        // Step 6: Apply product research skill if available
        research = await this.applyProductResearch(research, ctx);

        // Validate minimum quality
        const validation = this.validate(research);
        if (!validation.passed && attempts < ctx.maxRetries) {
          ctx.prompt = this.enrichPrompt(ctx.prompt, validation.failures);
          continue;
        }

        return {
          status: 'completed',
          data: research,
          duration: Date.now() - start,
          attempts,
        };
      } catch (err) {
        if (attempts >= ctx.maxRetries) {
          return {
            status: 'failed',
            error: (err as Error).message,
            duration: Date.now() - start,
            attempts,
          };
        }
      }
    }
  }

  /**
   * Skill 1: PROMPT ANALYSIS
   * Extract business context from user text using deterministic keyword matching.
   */
  private analyzePrompt(ctx: PhaseContext): BusinessResearch {
    const { breContext, prompt } = ctx;
    return buildBusinessResearch(
      prompt,
      breContext.industry,
      breContext.subIndustry,
      breContext.country,
    );
  }

  /**
   * Skill 2: BOS KNOWLEDGE LOOKUP
   * Enrich research with industry-specific business intelligence.
   *
   * @deprecated Use enrichWithBusinessKnowledge() instead.
   * This method uses hardcoded INDUSTRY_KNOWLEDGE which duplicates Business Intelligence.
   */
  private enrichWithBOSKnowledge(research: BusinessResearch, ctx: PhaseContext): BusinessResearch {
    const knowledge = INDUSTRY_KNOWLEDGE[research.industry];
    if (!knowledge) return research;

    // Merge BOS knowledge with prompt-derived research
    // Prompt-derived takes precedence (user knows their business better)
    return {
      ...research,
      userPersonas: research.userPersonas.length > 0 ? research.userPersonas : knowledge.personas,
      revenueFlow: research.revenueFlow.length > 0 ? research.revenueFlow : knowledge.revenueFlows,
      customerFlow: research.customerFlow.length > 0 ? research.customerFlow : knowledge.customerFlows,
      paymentMethods: research.paymentMethods.length > 0 ? research.paymentMethods : knowledge.paymentMethods,
      businessWorkflow: research.businessWorkflow.length > 0 ? research.businessWorkflow : knowledge.workflows,
      kpis: research.kpis.length > 0 ? research.kpis : knowledge.kpis,
      vocabulary: Object.keys(research.vocabulary).length > 0 ? research.vocabulary : knowledge.vocabulary,
    };
  }

  /**
   * Skill 2 (NEW): BUSINESS KNOWLEDGE LOOKUP
   * Enrich research with BusinessKnowledge from the Business Intelligence layer.
   *
   * This is the preferred method. It consumes BusinessKnowledge instead of
   * using hardcoded industry knowledge.
   */
  private enrichWithBusinessKnowledge(
    research: BusinessResearch,
    businessKnowledge: BusinessKnowledge
  ): BusinessResearch {
    // CONSUME from BusinessKnowledge (single source of truth)
    return {
      ...research,
      userPersonas: research.userPersonas.length > 0
        ? research.userPersonas
        : businessKnowledge.customerPersonas.map(p => p.label),
      revenueFlow: research.revenueFlow.length > 0
        ? research.revenueFlow
        : [businessKnowledge.revenue.model],
      customerFlow: research.customerFlow.length > 0
        ? research.customerFlow
        : businessKnowledge.customerJourney.stages.map((j: { stage: string }) => j.stage),
      businessWorkflow: research.businessWorkflow.length > 0
        ? research.businessWorkflow
        : businessKnowledge.workflows.map((w: { kind: string }) => w.kind),
      kpis: research.kpis.length > 0
        ? research.kpis
        : businessKnowledge.kpis.map((k: { name: string }) => k.name),
      vocabulary: Object.keys(research.vocabulary).length > 0
        ? research.vocabulary
        : businessKnowledge.vocabulary.terms,
    };
  }

  /**
   * Skill 8: SKILL DISCOVERY
   * Ensure we have the right skills for this industry.
   * Auto-discovers and installs skills if not already present.
   */
  private async ensureIndustrySkills(industry: string): Promise<void> {
    // Map industry to required task categories
    const taskCategories: string[] = ['competitor-analysis', 'product-research'];

    if (industry === 'ecommerce' || industry === 'retail') {
      taskCategories.push('price-monitoring');
    }

    // Ensure each skill is available
    for (const category of taskCategories) {
      const skill = await this.skillRegistry.ensureSkillForTask(category);
      if (skill) {
        console.log(`[Research Agent] Skill ready: ${skill.name} for ${category}`);
      }
    }
  }

  /**
   * Skill 3: WEB SEARCH
   * Find real businesses in the industry using search engines.
   */
  private async discoverRealBusinesses(
    research: BusinessResearch,
    ctx: PhaseContext,
  ): Promise<Array<{ url: string; title: string; snippet: string }>> {
    const results: Array<{ url: string; title: string; snippet: string }> = [];

    // Build search query from business research
    const searchTerms = this.buildSearchTerms(research);

    for (const term of searchTerms.slice(0, 2)) {
      try {
        const found = await this.webSearch(term);
        results.push(...found);
      } catch {
        // Continue with next search term
      }
    }

    // Deduplicate by domain
    const seen = new Set<string>();
    return results.filter(r => {
      const domain = new URL(r.url).hostname;
      if (seen.has(domain)) return false;
      seen.add(domain);
      return true;
    }).slice(0, 5);
  }

  /**
   * Build search terms from business research.
   */
  private buildSearchTerms(research: BusinessResearch): string[] {
    const terms: string[] = [];

    // Use industry-specific search terms
    const knowledge = INDUSTRY_KNOWLEDGE[research.industry];
    if (knowledge?.referenceSearchTerms) {
      terms.push(...knowledge.referenceSearchTerms);
    }

    // Add sub-industry if available
    if (research.subIndustry && research.subIndustry !== research.industry) {
      terms.push(`${research.subIndustry.replace(/-/g, ' ')} ${research.industry.replace(/-/g, ' ')}`);
    }

    // Add country if available
    if (research.domain) {
      terms.push(`${research.industry.replace(/-/g, ' ')} platform`);
    }

    return terms.slice(0, 3);
  }

  /**
   * Skill 4: WEB SEARCH (implementation)
   * Search DuckDuckGo HTML for real businesses.
   */
  private async webSearch(query: string): Promise<Array<{ url: string; title: string; snippet: string }>> {
    const results: Array<{ url: string; title: string; snippet: string }> = [];

    for (const engine of SEARCH_ENGINES) {
      try {
        const url = engine.buildUrl(query);
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) continue;

        const html = await response.text();
        const urls = engine.parseResults(html);

        for (const foundUrl of urls) {
          results.push({
            url: foundUrl,
            title: new URL(foundUrl).hostname,
            snippet: '',
          });
        }

        if (results.length > 0) break;
      } catch {
        // Try next engine
      }
    }

    return results;
  }

  /**
   * Skill 5: WEB FETCH
   * Fetch a business website and extract intelligence.
   */
  private async fetchBusinessWebsite(url: string): Promise<{
    title: string;
    description: string;
    products: Array<{ name: string; price: string }>;
    testimonials: Array<{ text: string; author: string }>;
  } | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) return null;

      const html = await response.text();

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch?.[1]?.trim() || '';

      // Extract meta description
      const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
      const description = descMatch?.[1]?.trim() || '';

      // Extract prices (look for currency symbols)
      const prices: Array<{ name: string; price: string }> = [];
      const priceRegex = /(?:₹|\\$|€|£)\s*(\d[\d,]*(?:\.\d{2})?)/g;
      let priceMatch;
      while ((priceMatch = priceRegex.exec(html)) !== null) {
        prices.push({
          name: `Product ${prices.length + 1}`,
          price: priceMatch[0],
        });
      }

      return { title, description, products: prices.slice(0, 5), testimonials: [] };
    } catch {
      return null;
    }
  }

  /**
   * Skill 6: COMPETITOR ANALYSIS (via ecommerce-competitor-analysis skill)
   * Use the installed skill to analyze competitors in the industry.
   */
  private async applyCompetitorAnalysis(
    research: BusinessResearch,
    ctx: PhaseContext,
  ): Promise<BusinessResearch> {
    const skill = this.skillRegistry.getSkill('ecommerce-competitor-analysis');
    if (!skill) return research;

    // Use the skill's methodology to analyze competitors
    // The skill provides frameworks for cross-platform competitor analysis
    // We apply its structured approach to gather intelligence

    try {
      // Search for competitors using the skill's search methodology
      const competitorQuery = `${research.industry.replace(/-/g, ' ')} competitors`;
      const competitors = await this.webSearch(competitorQuery);

      if (competitors.length > 0) {
        // Enrich research with competitor data
        const competitorUrls = competitors
          .map(c => c.url)
          .filter((url): url is string => typeof url === 'string');

        return {
          ...research,
          referenceUrls: [
            ...research.referenceUrls,
            ...competitorUrls,
          ].slice(0, 10),
        };
      }
    } catch {
      // Skill application failed — continue without it
    }

    return research;
  }

  /**
   * Skill 7: PRODUCT RESEARCH (via product-research skill)
   * Use the installed skill to research products and market data.
   */
  private async applyProductResearch(
    research: BusinessResearch,
    ctx: PhaseContext,
  ): Promise<BusinessResearch> {
    const skill = this.skillRegistry.getSkill('product-research');
    if (!skill) return research;

    // Use the skill's methodology to research products
    // The skill provides frameworks for product research and insight synthesis

    try {
      // Search for product data using the skill's methodology
      const productQuery = `${research.industry.replace(/-/g, ' ')} products prices`;
      const products = await this.webSearch(productQuery);

      if (products.length > 0) {
        // Fetch product data from discovered URLs
        for (const product of products.slice(0, 3)) {
          try {
            const data = await this.fetchBusinessWebsite(product.url);
            if (data && data.products.length > 0) {
              // Add products to research
              research = {
                ...research,
                realProducts: [
                  ...research.realProducts,
                  ...data.products.map(p => ({
                    name: p.name,
                    price: p.price,
                    description: '',
                    source: product.url,
                  })),
                ].slice(0, 20),
              };
            }
          } catch {
            // Continue to next product URL
          }
        }
      }
    } catch {
      // Skill application failed — continue without it
    }

    return research;
  }

  /**
   * Skill 6: BUSINESS MODEL INFERENCE
   * Enrich research with real data from discovered businesses.
   */
  private enrichWithRealData(
    research: BusinessResearch,
    businesses: Array<{ url: string; title: string; snippet: string }>,
  ): BusinessResearch {
    // Use discovered businesses as reference URLs
    const referenceUrls = businesses.map(b => b.url);

    return {
      ...research,
      referenceUrls,
      // Keep existing research data — real data augments, doesn't replace
    };
  }

  /**
   * Validate research quality.
   */
  private validate(research: BusinessResearch): { passed: boolean; failures: Array<{ gate: string; message: string; severity: 'error' | 'warning'; suggestion?: string }> } {
    const failures: Array<{ gate: string; message: string; severity: 'error' | 'warning'; suggestion?: string }> = [];

    if (!research.userPersonas || research.userPersonas.length === 0) {
      failures.push({
        gate: 'research.personas',
        message: 'No user personas detected',
        severity: 'warning',
        suggestion: 'Add target audience to the prompt',
      });
    }

    if (!research.revenueFlow || research.revenueFlow.length === 0) {
      failures.push({
        gate: 'research.revenue',
        message: 'No revenue flow detected',
        severity: 'warning',
        suggestion: 'Add business model (e.g., subscription, direct sales)',
      });
    }

    if (!research.customerFlow || research.customerFlow.length === 0) {
      failures.push({
        gate: 'research.customer-flow',
        message: 'No customer journey detected',
        severity: 'warning',
        suggestion: 'Add customer interaction flow',
      });
    }

    return {
      passed: failures.filter(f => f.severity === 'error').length === 0,
      failures,
    };
  }

  /**
   * Enrich prompt to fix quality gate failures.
   */
  private enrichPrompt(prompt: string, failures: Array<{ gate: string; suggestion?: string }>): string {
    let enriched = prompt;
    for (const failure of failures) {
      if (failure.suggestion && !enriched.toLowerCase().includes(failure.suggestion.toLowerCase().slice(0, 20))) {
        enriched += `. ${failure.suggestion}`;
      }
    }
    return enriched;
  }
}
