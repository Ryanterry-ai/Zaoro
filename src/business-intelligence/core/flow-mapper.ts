import { BILLMCaller } from './llm-caller.js';
import type { BusinessIntelligenceReport, IndustryKnowledgeBase, BusinessFlow, BusinessFlowStage } from '../types/index.js';

const SYSTEM_PROMPT = `You are a business process engineer who maps complete business lifecycles.

Map the ENTIRE business flow from customer discovery to revenue collection and retention.
You MUST return ONLY valid JSON matching this exact schema. No markdown, no code fences:
{
  "stages": [
    {
      "name": "string - stage name",
      "user_actions": ["string - what the customer does"],
      "business_actions": ["string - what the business does"],
      "data_required": ["string - data needed at this stage"],
      "systems_required": ["string - software/systems needed"],
      "automation_opportunities": ["string - what can be automated"],
      "revenue_opportunities": ["string - ways to increase revenue here"],
      "failure_points": ["string - what can go wrong"]
    }
  ]
}

Include stages: Discovery, Lead Generation, Lead Qualification, Sales Process, Payment Collection, Order Fulfillment, Customer Success, Retention, Upsell/Cross-Sell, Invoice & Revenue Collection.
Be specific to THIS business type.`;

export class FlowMapper {
  private llm: BILLMCaller;

  constructor(llm: BILLMCaller) {
    this.llm = llm;
  }

  async mapBusinessFlow(
    report: BusinessIntelligenceReport,
    knowledge: IndustryKnowledgeBase
  ): Promise<BusinessFlow> {
    console.log('[phase-4] Mapping business flow...');

    const userPrompt = `Business: ${report.business_domain} | Industry: ${report.industry}
Business Model: ${report.business_model} | Customer: ${report.customer_type}

Industry Knowledge:
- Market Leaders: ${knowledge.market_leaders.join(', ')}
- Typical Workflows: ${knowledge.typical_workflows.join(', ')}
- Best Practices: ${knowledge.best_practices.join(', ')}
- Common Software: ${knowledge.common_software_solutions.join(', ')}

Map the complete business lifecycle for this specific business. Every stage must be actionable.`;

    let raw: { stages: BusinessFlowStage[] };
    try {
      raw = await this.llm.callStructured<{ stages: BusinessFlowStage[] }>(SYSTEM_PROMPT, userPrompt);
    } catch (err: any) {
      if (err.message === 'QUOTA_EXHAUSTED') {
        console.log('[phase-4] Using heuristic fallback (LLM quota exhausted)');
        raw = { stages: this.heuristicFlow(report) };
      } else throw err;
    }

    const flow: BusinessFlow = {
      stages: raw.stages,
      total_automation_opportunities: raw.stages.reduce((sum, s) => sum + s.automation_opportunities.length, 0),
      total_revenue_opportunities: raw.stages.reduce((sum, s) => sum + s.revenue_opportunities.length, 0),
      total_failure_points: raw.stages.reduce((sum, s) => sum + s.failure_points.length, 0)
    };

    console.log(`[phase-4] ${flow.stages.length} stages, ${flow.total_automation_opportunities} automations, ${flow.total_failure_points} failure points`);
    return flow;
  }

  private heuristicFlow(report: BusinessIntelligenceReport): BusinessFlowStage[] {
    return [
      { name: 'Discovery', user_actions: ['Search online', 'Visit website'], business_actions: ['SEO optimization', 'Content marketing'], data_required: ['Website analytics'], systems_required: ['Website', 'Analytics'], automation_opportunities: ['Chatbot for FAQs', 'Automated lead capture'], revenue_opportunities: ['Lead magnets', 'Retargeting ads'], failure_points: ['Poor mobile experience', 'Slow page load'] },
      { name: 'Lead Qualification', user_actions: ['Fill contact form', 'Call'], business_actions: ['Respond to inquiry', 'Schedule consultation'], data_required: ['Contact info', 'Needs assessment'], systems_required: ['CRM', 'Phone system'], automation_opportunities: ['Auto-response emails', 'Lead scoring'], revenue_opportunities: ['Upsell consultation', 'Package pricing'], failure_points: ['Slow response time', 'No follow-up'] },
      { name: 'Sales Process', user_actions: ['Attend consultation', 'Review proposal'], business_actions: ['Present treatment/service plan', 'Quote pricing'], data_required: ['Service catalog', 'Pricing'], systems_required: ['Booking system', 'Payment processor'], automation_opportunities: ['Automated proposals', 'Dynamic pricing'], revenue_opportunities: ['Package deals', 'Premium services'], failure_points: ['Price objection', 'No urgency'] },
      { name: 'Payment Collection', user_actions: ['Make payment'], business_actions: ['Process payment', 'Send receipt'], data_required: ['Payment info', 'Invoice'], systems_required: ['Payment gateway', 'Billing system'], automation_opportunities: ['Auto-invoicing', 'Payment reminders'], revenue_opportunities: ['Payment plans', 'Membership pricing'], failure_points: ['Payment failures', 'No payment options'] },
      { name: 'Service Delivery', user_actions: ['Receive service', 'Provide feedback'], business_actions: ['Deliver service', 'Document completion'], data_required: ['Service records', 'Notes'], systems_required: ['Scheduling', 'Documentation system'], automation_opportunities: ['Automated scheduling', 'Digital forms'], revenue_opportunities: ['Add-on services', 'Premium experience'], failure_points: ['Scheduling conflicts', 'Quality issues'] },
      { name: 'Retention', user_actions: ['Return for service', 'Refer others'], business_actions: ['Follow up', 'Loyalty program'], data_required: ['Visit history', 'Preferences'], systems_required: ['CRM', 'Email marketing'], automation_opportunities: ['Automated follow-ups', 'Birthday emails'], revenue_opportunities: ['Loyalty discounts', 'Referral rewards'], failure_points: ['No follow-up', 'No referral program'] },
    ];
  }
}
