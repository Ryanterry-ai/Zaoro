import { BILLMCaller } from './llm-caller.js';
import type { BusinessIntelligenceReport, IndustryKnowledgeBase } from '../types/index.js';

const SYSTEM_PROMPT = `You are an industry research specialist with deep knowledge across all major sectors.

Research the industry and build a comprehensive knowledge base.
You MUST return ONLY valid JSON matching this exact schema. No markdown, no code fences:
{
  "market_leaders": ["string - top companies in this space"],
  "industry_standards": ["string - standard practices and benchmarks"],
  "best_practices": ["string - proven approaches for success"],
  "customer_expectations": ["string - what customers demand in this industry"],
  "typical_workflows": ["string - standard business processes"],
  "common_software_solutions": ["string - typical tools/platforms used"],
  "conversion_funnels": ["string - standard conversion paths"],
  "revenue_models": ["string - how businesses in this space make money"]
}

Include at least 5 items per category. Be specific and actionable.`;

export class IndustryResearcher {
  private llm: BILLMCaller;

  constructor(llm: BILLMCaller) {
    this.llm = llm;
  }

  async researchIndustry(report: BusinessIntelligenceReport): Promise<IndustryKnowledgeBase> {
    console.log('[phase-3] Researching industry...');

    const userPrompt = `Business: ${report.business_domain} | Industry: ${report.industry}
Business Model: ${report.business_model} | Revenue: ${report.revenue_model}

Research this specific industry and provide actionable intelligence.
Include real market leaders, actual software solutions, and proven workflows.`;

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
        market_leaders: ['Zocdoc', 'Patients Know Best', 'DrChrono', 'Henry Schein One'],
        industry_standards: ['HIPAA compliance', 'EHR/EMR integration', 'Insurance verification', 'Digital intake forms'],
        best_practices: ['Online appointment booking', 'Automated reminders', 'Patient portal', 'Review management'],
        customer_expectations: ['Same-day booking', 'Digital check-in', 'Insurance transparency', 'Secure messaging'],
        typical_workflows: ['Online booking → Confirmation → Reminder → Visit → Follow-up → Review request'],
        common_software_solutions: ['Dentrix', 'Eaglesoft', 'Open Dental', 'Jane App', 'Calendly'],
        conversion_funnels: ['Website → Book Appointment → Consultation → Treatment Plan → Treatment → Follow-up'],
        revenue_models: ['Fee-for-service', 'Insurance billing', 'Membership plans', 'Cosmetic upsell']
      };
    }
    if (domain.includes('ecommerce') || domain.includes('shop') || domain.includes('store')) {
      return {
        market_leaders: ['Shopify', 'WooCommerce', 'BigCommerce', 'Squarespace Commerce'],
        industry_standards: ['PCI compliance', 'SSL certificates', 'Mobile-first design', 'Fast checkout'],
        best_practices: ['Abandoned cart recovery', 'Product recommendations', 'Social proof', 'Urgency tactics'],
        customer_expectations: ['Free shipping', 'Easy returns', 'Multiple payment options', 'Fast delivery'],
        typical_workflows: ['Browse → Add to Cart → Checkout → Payment → Fulfillment → Delivery → Review'],
        common_software_solutions: ['Shopify', 'Stripe', 'Klaviyo', 'ShipStation', 'Google Analytics'],
        conversion_funnels: ['Traffic → Product View → Add to Cart → Checkout → Purchase → Repeat'],
        revenue_models: ['Direct sales', 'Subscription boxes', 'Affiliate', 'Dropshipping']
      };
    }
    return {
      market_leaders: ['Industry leaders'],
      industry_standards: ['Standard practices'],
      best_practices: ['Online presence', 'Customer management', 'Automation'],
      customer_expectations: ['Easy communication', 'Fast service', 'Transparent pricing'],
      typical_workflows: ['Lead capture → Qualification → Service → Follow-up'],
      common_software_solutions: ['CRM', 'Website builder', 'Scheduling tool', 'Accounting software'],
      conversion_funnels: ['Awareness → Interest → Consideration → Purchase → Loyalty'],
      revenue_models: ['Service fees', 'Subscription', 'Product sales']
    };
  }
}
