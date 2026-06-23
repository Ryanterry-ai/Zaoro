import { BILLMCaller } from './llm-caller.js';
import { WebSearcher } from './web-searcher.js';
import type { BusinessIntelligenceReport, IndustryKnowledgeBase } from '../types/index.js';

const SYSTEM_PROMPT = `You are an industry research specialist with deep knowledge across all major sectors.

You will receive search results from the web about a specific industry. Extract structured intelligence from these real-world sources.

You MUST return ONLY valid JSON matching this exact schema. No markdown, no code fences:
{
  "market_leaders": ["string - top companies in this space, citing sources where available"],
  "industry_standards": ["string - standard practices and benchmarks"],
  "best_practices": ["string - proven approaches for success"],
  "customer_expectations": ["string - what customers demand in this industry"],
  "typical_workflows": ["string - standard business processes"],
  "common_software_solutions": ["string - actual tools/platforms used in the industry"],
  "conversion_funnels": ["string - standard conversion paths"],
  "revenue_models": ["string - how businesses in this space make money"]
}

Include at least 5 items per category. Be specific, cite real companies and tools, and base your analysis on the provided search data.`;

export class IndustryResearcher {
  private llm: BILLMCaller;
  private searcher: WebSearcher;

  constructor(llm: BILLMCaller) {
    this.llm = llm;
    this.searcher = new WebSearcher();
  }

  async researchIndustry(report: BusinessIntelligenceReport): Promise<IndustryKnowledgeBase> {
    console.log('[phase-3] Researching industry (with web search)...');

    // Step 1: Web search for industry intelligence
    let searchContext = '';
    try {
      const queries = [
        `${report.industry} ${report.business_model} best practices 2025`,
        `${report.industry} software solutions market leaders`,
        `${report.industry} customer journey workflow`,
      ];
      const allResults = await Promise.all(queries.map(q => this.searcher.search(q, 3)));
      const flatResults = allResults.flat();

      // Fetch top 2 pages for deeper content
      const topUrls = flatResults.slice(0, 2).map(r => r.url);
      const pages = await this.searcher.fetchMultiple(topUrls);

      searchContext = `\n\nWeb Research Results:\n${flatResults.map(r => `- ${r.title}: ${r.snippet} (${r.url})`).join('\n')}`;
      if (pages.some(p => p.text.length > 100)) {
        searchContext += `\n\nDetailed Page Content:\n${pages.filter(p => p.text.length > 100).map(p => `--- ${p.title} (${p.url}) ---\n${p.text.substring(0, 2000)}`).join('\n\n')}`;
      }
      console.log(`[phase-3] Web search: ${flatResults.length} results, ${pages.filter(p => p.text.length > 100).length} pages fetched`);
    } catch (err: any) {
      console.warn(`[phase-3] Web search failed: ${err.message}, proceeding without live data`);
    }

    // Step 2: LLM analysis with search context
    const userPrompt = `Business: ${report.business_domain} | Industry: ${report.industry}
Business Model: ${report.business_model} | Revenue: ${report.revenue_model}
${searchContext}

Analyze the above research data and extract a structured industry knowledge base.
If search data is available, base your analysis on real companies and tools found in the results.
Include at least 5 items per category.`;

    let result: IndustryKnowledgeBase;
    try {
      result = await this.llm.callStructured<IndustryKnowledgeBase>(SYSTEM_PROMPT, userPrompt);
    } catch (err: any) {
      if (err.message === 'QUOTA_EXHAUSTED') {
        console.log('[phase-3] Using heuristic fallback (LLM quota exhausted)');
        result = this.heuristicKnowledge(report);
      } else throw err;
    }

    console.log(`[phase-3] ${result.market_leaders.length} leaders, ${result.best_practices.length} best practices, ${result.common_software_solutions.length} software solutions`);
    return result;
  }

  private heuristicKnowledge(report: BusinessIntelligenceReport): IndustryKnowledgeBase {
    const domain = report.business_domain.toLowerCase();
    if (domain.includes('health') || domain.includes('dental') || domain.includes('medical')) {
      return {
        market_leaders: ['Zocdoc', 'Patients Know Best', 'DrChrono', 'Henry Schein One', 'MyChart'],
        industry_standards: ['HIPAA compliance', 'EHR/EMR integration', 'Insurance verification', 'Digital intake forms', 'Clinical documentation'],
        best_practices: ['Online appointment booking', 'Automated reminders', 'Patient portal', 'Review management', 'Telehealth integration'],
        customer_expectations: ['Same-day booking', 'Digital check-in', 'Insurance transparency', 'Secure messaging', 'Online bill pay'],
        typical_workflows: ['Online booking → Confirmation → Reminder → Check-in → Visit → Diagnosis → Treatment → Follow-up → Review request'],
        common_software_solutions: ['Dentrix', 'Eaglesoft', 'Open Dental', 'Jane App', 'Calendly', 'Kareo', 'athenahealth'],
        conversion_funnels: ['Website → Book Appointment → Consultation → Treatment Plan → Treatment → Follow-up → Referral'],
        revenue_models: ['Fee-for-service', 'Insurance billing', 'Membership plans', 'Cosmetic upsell', 'Telehealth visits']
      };
    }
    if (domain.includes('ecommerce') || domain.includes('shop') || domain.includes('store')) {
      return {
        market_leaders: ['Shopify', 'WooCommerce', 'BigCommerce', 'Squarespace Commerce', 'Magento'],
        industry_standards: ['PCI compliance', 'SSL certificates', 'Mobile-first design', 'Fast checkout', 'GDPR/CCPA'],
        best_practices: ['Abandoned cart recovery', 'Product recommendations', 'Social proof', 'Urgency tactics', 'A/B testing'],
        customer_expectations: ['Free shipping', 'Easy returns', 'Multiple payment options', 'Fast delivery', 'Live chat support'],
        typical_workflows: ['Traffic → Browse → Add to Cart → Checkout → Payment → Fulfillment → Delivery → Review → Repeat'],
        common_software_solutions: ['Shopify', 'Stripe', 'Klaviyo', 'ShipStation', 'Google Analytics', 'Hotjar', 'Yotpo'],
        conversion_funnels: ['Ad Click → Landing Page → Product View → Add to Cart → Checkout → Purchase → Repeat Purchase'],
        revenue_models: ['Direct sales', 'Subscription boxes', 'Affiliate', 'Dropshipping', 'Marketplace commissions']
      };
    }
    if (domain.includes('saas') || domain.includes('software') || domain.includes('platform')) {
      return {
        market_leaders: ['Salesforce', 'HubSpot', 'Notion', 'Linear', 'Vercel'],
        industry_standards: ['SOC 2 compliance', 'GDPR', '99.9% uptime SLA', 'Role-based access', 'API-first design'],
        best_practices: ['Freemium model', 'Product-led growth', 'In-app onboarding', 'Usage-based pricing', 'Community building'],
        customer_expectations: ['Free trial', 'Intuitive UI', 'Fast onboarding', 'Responsive support', 'Regular updates'],
        typical_workflows: ['Sign up → Onboarding → Activation → Retention → Expansion → Advocacy'],
        common_software_solutions: ['Stripe (billing)', 'Intercom (support)', 'Amplitude (analytics', 'LaunchDarkly (feature flags', 'Datadog (monitoring)'],
        conversion_funnels: ['Landing Page → Signup → Activation → Conversion → Expansion → Referral'],
        revenue_models: ['Subscription (MRR/ARR)', 'Usage-based', 'Freemium + Premium', 'Enterprise licensing', 'Marketplace commissions']
      };
    }
    return {
      market_leaders: ['Industry leaders'],
      industry_standards: ['Standard practices', 'Regulatory compliance', 'Quality benchmarks'],
      best_practices: ['Online presence', 'Customer management', 'Automation', 'Data-driven decisions'],
      customer_expectations: ['Easy communication', 'Fast service', 'Transparent pricing', 'Mobile access'],
      typical_workflows: ['Lead capture → Qualification → Service delivery → Payment → Follow-up → Retention'],
      common_software_solutions: ['CRM', 'Website builder', 'Scheduling tool', 'Accounting software', 'Email marketing'],
      conversion_funnels: ['Awareness → Interest → Consideration → Purchase → Retention → Advocacy'],
      revenue_models: ['Service fees', 'Subscription', 'Product sales', 'Commission', 'Advertising']
    };
  }
}
