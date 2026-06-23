import { BILLMCaller } from './llm-caller.js';
import type { BusinessIntelligenceReport, IntentMap } from '../types/index.js';

const SYSTEM_PROMPT = `You are a strategic business consultant specializing in opportunity analysis and bottleneck identification.

Analyze the business intelligence report and produce a comprehensive intent map.
You MUST return ONLY valid JSON matching this exact schema. No markdown, no code fences:
{
  "explicit_requests": ["string - what the user directly asked for"],
  "actual_needs": ["string - what the business truly needs to succeed"],
  "hidden_opportunities": ["string - revenue or growth opportunities not explicitly mentioned"],
  "operational_bottlenecks": ["string - processes that slow down the business"],
  "revenue_leakages": ["string - ways the business is losing or missing revenue"],
  "conversion_bottlenecks": ["string - points where potential customers drop off"],
  "acquisition_challenges": ["string - difficulties in getting new customers"],
  "retention_challenges": ["string - difficulties in keeping existing customers"]
}

Think deeply about:
- What is the user REALLY asking for vs what they said?
- Where is money being left on the table?
- What manual processes could be automated?
- What are competitors doing that this business isn't?
- What would 10x growth look like for this business?`;

export class IntentMapper {
  private llm: BILLMCaller;

  constructor(llm: BILLMCaller) {
    this.llm = llm;
  }

  async mapIntent(report: BusinessIntelligenceReport): Promise<IntentMap> {
    console.log('[phase-2] Mapping intent...');

    const userPrompt = `Business Intelligence Report:
${JSON.stringify(report, null, 2)}

Analyze this business and identify what they truly need, hidden opportunities, and all bottlenecks.
Think like a $1000/hour consultant who has seen hundreds of similar businesses.`;

    let result: IntentMap;
    try {
      result = await this.llm.callStructured<IntentMap>(SYSTEM_PROMPT, userPrompt);
    } catch (err: any) {
      if (err.message === 'QUOTA_EXHAUSTED') {
        console.log('[phase-2] Using heuristic fallback (LLM quota exhausted)');
        result = this.heuristicIntent(report);
      } else throw err;
    }

    console.log(`[phase-2] Found ${result.hidden_opportunities.length} opportunities, ${result.revenue_leakages.length} revenue leakages`);
    return result;
  }

  private heuristicIntent(report: BusinessIntelligenceReport): IntentMap {
    return {
      explicit_requests: [report.desired_outcome],
      actual_needs: ['Digital presence', 'Customer management system', 'Automated scheduling'],
      hidden_opportunities: ['Online booking', 'Email marketing', 'Customer loyalty program', 'Review management'],
      operational_bottlenecks: ['Manual appointment scheduling', 'Paper record management', 'No-shows'],
      revenue_leakages: ['Missed follow-ups', 'No upselling', 'No review pipeline', 'Competitor comparison shopping'],
      conversion_bottlenecks: ['No online presence', 'No instant booking', 'No social proof'],
      acquisition_challenges: ['Local SEO', 'Google Ads competition', 'Word-of-mouth dependency'],
      retention_challenges: ['No automated follow-ups', 'No loyalty program', 'No patient portal']
    };
  }
}
