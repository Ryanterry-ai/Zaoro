import { BILLMCaller } from './llm-caller.js';
import type { BusinessIntelligenceReport } from '../types/index.js';

const SYSTEM_PROMPT = `You are a senior business intelligence analyst with 20+ years of experience across every industry.

Your task: Analyze a business description and extract structured intelligence.

You MUST return ONLY valid JSON matching this exact schema. No markdown, no code fences, no explanations:
{
  "business_domain": "string - e.g., E-commerce, SaaS, Healthcare, Education, Real Estate",
  "industry": "string - e.g., Retail, Technology, Medical, Construction, Finance",
  "business_model": "string - e.g., Subscription, Marketplace, Service, D2C, Franchise",
  "customer_type": "string - e.g., B2B, B2C, B2B2C, Enterprise, SMB",
  "primary_problem": "string - the core business challenge in 1-2 sentences",
  "desired_outcome": "string - what the business wants to achieve in 1-2 sentences",
  "revenue_model": "string - e.g., Recurring, Transactional, Advertising, Licensing, Commission"
}`;

export class InputAnalyzer {
  private llm: BILLMCaller;

  constructor(llm: BILLMCaller) {
    this.llm = llm;
  }

  async analyzePrompt(prompt: string): Promise<BusinessIntelligenceReport> {
    console.log('[phase-1] Analyzing input...');
    const detectedLanguage = this.detectLanguage(prompt);

    const userPrompt = `Business Description: "${prompt}"

Extract the structured business intelligence from this description. Be precise and specific.
If information is ambiguous, make reasonable inferences based on the context.`;

    let result: Omit<BusinessIntelligenceReport, 'raw_prompt' | 'detected_language'>;
    try {
      result = await this.llm.callStructured<Omit<BusinessIntelligenceReport, 'raw_prompt' | 'detected_language'>>(
        SYSTEM_PROMPT,
        userPrompt
      );
    } catch (err: any) {
      if (err.message === 'QUOTA_EXHAUSTED') {
        console.log('[phase-1] Using heuristic fallback (LLM quota exhausted)');
        result = this.heuristicAnalyze(prompt);
      } else throw err;
    }

    const report: BusinessIntelligenceReport = {
      ...result,
      raw_prompt: prompt,
      detected_language: detectedLanguage
    };

    console.log(`[phase-1] Domain: ${report.business_domain}, Industry: ${report.industry}, Model: ${report.business_model}`);
    return report;
  }

  private detectLanguage(prompt: string): string {
    const scripts: Array<{ pattern: RegExp; lang: string }> = [
      { pattern: /[\u0900-\u097F]/, lang: 'hi' },
      { pattern: /[\u3040-\u309F\u30A0-\u30FF]/, lang: 'ja' },
      { pattern: /[\u4E00-\u9FFF]/, lang: 'zh' },
      { pattern: /[\uAC00-\uD7AF]/, lang: 'ko' },
      { pattern: /[\u0400-\u04FF]/, lang: 'ru' },
      { pattern: /[\u0600-\u06FF]/, lang: 'ar' },
      { pattern: /[\u0E00-\u0E7F]/, lang: 'th' },
    ];
    for (const { pattern, lang } of scripts) {
      if (pattern.test(prompt)) return lang;
    }
    return 'en';
  }

  private heuristicAnalyze(prompt: string): Omit<BusinessIntelligenceReport, 'raw_prompt' | 'detected_language'> {
    const lower = prompt.toLowerCase();
    const detect = (keywords: string[]) => keywords.some(k => lower.includes(k));

    let domain = 'General Business';
    if (detect(['clinic', 'hospital', 'doctor', 'dental', 'medical', 'health', 'pharmacy'])) domain = 'Healthcare';
    else if (detect(['shop', 'store', 'ecommerce', 'sell', 'product', 'jewelry', 'fashion'])) domain = 'E-commerce';
    else if (detect(['saas', 'software', 'app', 'platform', 'dashboard'])) domain = 'SaaS';
    else if (detect(['restaurant', 'cafe', 'food', 'delivery'])) domain = 'Food & Beverage';
    else if (detect(['school', 'education', 'course', 'learn', 'tutor'])) domain = 'Education';
    else if (detect(['real estate', 'property', 'rent', 'apartment'])) domain = 'Real Estate';
    else if (detect(['gym', 'fitness', 'yoga', 'training'])) domain = 'Fitness';
    else if (detect(['law', 'legal', 'lawyer', 'attorney'])) domain = 'Legal';
    else if (detect(['finance', 'bank', 'invest', 'insurance'])) domain = 'Finance';

    let industry = domain;
    let businessModel = 'Service';
    if (detect(['subscription', 'monthly', 'plan'])) businessModel = 'Subscription';
    else if (detect(['marketplace', 'platform', 'connect'])) businessModel = 'Marketplace';
    else if (detect(['sell', 'shop', 'store', 'ecommerce'])) businessModel = 'D2C';

    const sentences = prompt.split(/[.!?]+/).filter(s => s.trim().length > 5);
    const primaryProblem = sentences.length > 0 ? sentences[0]!.trim() : 'Needs modernization';

    return {
      business_domain: domain,
      industry,
      business_model: businessModel,
      customer_type: lower.includes('b2b') ? 'B2B' : 'B2C',
      primary_problem: primaryProblem,
      desired_outcome: 'Modernize operations and grow revenue',
      revenue_model: businessModel === 'Subscription' ? 'Recurring' : 'Transactional'
    };
  }
}
