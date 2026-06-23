import { BILLMCaller } from './llm-caller.js';
import type { Problem, BusinessIntelligenceReport, Solution, SolutionComponent } from '../types/index.js';

const SYSTEM_PROMPT = `You are a solution architect who designs optimal business solutions.

Design a solution that directly solves the identified problems and increases revenue.
You MUST return ONLY valid JSON matching this exact schema. No markdown, no code fences:
{
  "components": [
    {
      "type": "website | saas | crm | erp | marketplace | mobile_app | ai_agent | automation | workflow | internal_tool | customer_portal",
      "name": "string - component name",
      "description": "string - what it does",
      "solves_problems": ["string - problem IDs this solves"],
      "revenue_impact": 0-100,
      "priority": 1-10,
      "features": ["string - specific features"]
    }
  ],
  "summary": "string - overall solution summary in 2-3 sentences",
  "total_revenue_impact": 0-100,
  "implementation_order": ["string - component names in build order"]
}

Rules:
- Only include components that DIRECTLY solve a problem or increase revenue
- No unnecessary features or "nice to haves"
- Each component must map to at least one problem
- Implementation order = highest priority first
- Revenue impact = estimated % improvement in revenue`;

export class SolutionDesigner {
  private llm: BILLMCaller;

  constructor(llm: BILLMCaller) {
    this.llm = llm;
  }

  async designSolution(
    problems: Problem[],
    report: BusinessIntelligenceReport
  ): Promise<Solution> {
    console.log('[phase-6] Designing solution...');

    const userPrompt = `Business: ${report.business_domain} | ${report.industry}
Revenue Model: ${report.revenue_model}
Desired Outcome: ${report.desired_outcome}

Problems to solve (ranked by impact):
${problems.map(p => `[${p.id}] ${p.title} (${p.severity}, impact: ${p.total_impact}) - ${p.root_cause}`).join('\n')}

Design the MINIMUM viable solution that solves these problems. No bloat.`;

    let result: Solution;
    try {
      result = await this.llm.callStructured<Solution>(SYSTEM_PROMPT, userPrompt);
    } catch (err: any) {
      if (err.message === 'QUOTA_EXHAUSTED') {
        console.log('[phase-6] Using heuristic fallback (LLM quota exhausted)');
        result = this.heuristicSolution(report);
      } else throw err;
    }

    console.log(`[phase-6] ${result.components.length} components, revenue impact: ${result.total_revenue_impact}%`);
    console.log(`[phase-6] Build order: ${result.implementation_order.join(' → ')}`);
    return result;
  }

  private heuristicSolution(report: BusinessIntelligenceReport): Solution {
    const domain = report.business_domain.toLowerCase();
    const components: SolutionComponent[] = [
      {
        type: 'website',
        name: 'Professional Website',
        description: 'Modern, mobile-responsive website with online booking, service showcase, and contact forms',
        solves_problems: ['P1'],
        revenue_impact: 30,
        priority: 1,
        features: ['Hero section', 'Services page', 'Online booking form', 'About page', 'Contact page', 'Testimonials', 'Gallery']
      },
      {
        type: 'customer_portal',
        name: 'Patient Portal',
        description: 'Self-service portal for patients to manage appointments, view history, and communicate',
        solves_problems: ['P2', 'P3'],
        revenue_impact: 20,
        priority: 2,
        features: ['Appointment scheduling', 'Patient profile', 'Visit history', 'Secure messaging', 'Document upload']
      },
      {
        type: 'automation',
        name: 'Marketing Automation',
        description: 'Automated email/SMS campaigns for appointment reminders, follow-ups, and review requests',
        solves_problems: ['P4', 'P5'],
        revenue_impact: 15,
        priority: 3,
        features: ['Appointment reminders', 'Follow-up sequences', 'Review request emails', 'Birthday greetings', 'Newsletter']
      },
      {
        type: 'crm',
        name: 'CRM System',
        description: 'Customer relationship management for tracking leads, patients, and revenue',
        solves_problems: ['P3', 'P6'],
        revenue_impact: 10,
        priority: 4,
        features: ['Contact management', 'Lead tracking', 'Revenue dashboard', 'Reporting']
      },
    ];
    return {
      components,
      summary: 'A comprehensive digital solution: professional website with online booking, patient self-service portal, automated marketing, and CRM to modernize operations and grow patient base.',
      total_revenue_impact: 55,
      implementation_order: ['Professional Website', 'Patient Portal', 'Marketing Automation', 'CRM System']
    };
  }
}
