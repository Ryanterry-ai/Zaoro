import { BILLMCaller } from './llm-caller.js';
import type { BusinessFlow, BusinessIntelligenceReport, Problem } from '../types/index.js';

const SYSTEM_PROMPT = `You are a business problem analyst who identifies and ranks problems by impact.

Analyze the business flow and identify ALL problems affecting the business.
You MUST return ONLY valid JSON matching this exact schema. No markdown, no code fences:
{
  "problems": [
    {
      "id": "string - unique ID like P1, P2",
      "title": "string - concise problem title",
      "description": "string - detailed description",
      "severity": "critical | important | future",
      "impact_scores": {
        "revenue": 0-10,
        "customer": 0-10,
        "operational": 0-10,
        "technical": 0-10
      },
      "total_impact": 0-40,
      "affected_stages": ["string - which flow stages affected"],
      "root_cause": "string - underlying cause"
    }
  ]
}

Classify severity:
- CRITICAL: Preventing growth, causing immediate revenue loss
- IMPORTANT: Reducing efficiency, causing friction
- FUTURE: Will become problems at scale

Rank by total_impact (sum of all 4 scores). Be brutally honest.`;

export class ProblemIdentifier {
  private llm: BILLMCaller;

  constructor(llm: BILLMCaller) {
    this.llm = llm;
  }

  async identifyProblems(
    flow: BusinessFlow,
    report: BusinessIntelligenceReport
  ): Promise<Problem[]> {
    console.log('[phase-5] Identifying problems...');

    const userPrompt = `Business: ${report.business_domain} | ${report.industry}
Primary Problem: ${report.primary_problem}

Business Flow (${flow.stages.length} stages):
${flow.stages.map(s => `- ${s.name}: Failures: ${s.failure_points.join('; ')}`).join('\n')}

Identify ALL problems. Include failure points, bottlenecks, and inefficiencies from the flow.
Be brutally honest about severity and impact.`;

    let raw: { problems: Problem[] };
    try {
      raw = await this.llm.callStructured<{ problems: Problem[] }>(SYSTEM_PROMPT, userPrompt);
    } catch (err: any) {
      if (err.message === 'QUOTA_EXHAUSTED') {
        console.log('[phase-5] Using heuristic fallback (LLM quota exhausted)');
        raw = { problems: this.heuristicProblems(report) };
      } else throw err;
    }

    const problems = raw.problems
      .sort((a, b) => b.total_impact - a.total_impact);

    const critical = problems.filter(p => p.severity === 'critical').length;
    const important = problems.filter(p => p.severity === 'important').length;
    console.log(`[phase-5] ${problems.length} problems: ${critical} critical, ${important} important`);
    return problems;
  }

  private heuristicProblems(report: BusinessIntelligenceReport): Problem[] {
    const domain = report.business_domain.toLowerCase();
    const problems: Problem[] = [
      { id: 'P1', title: 'No digital presence', description: 'Business lacks a professional website or online booking system', severity: 'critical', impact_scores: { revenue: 8, customer: 9, operational: 7, technical: 5 }, total_impact: 29, affected_stages: ['Discovery', 'Lead Qualification'], root_cause: 'No web development investment' },
      { id: 'P2', title: 'Manual scheduling', description: 'Appointments handled via phone/WhatsApp, causing double-bookings and no-shows', severity: 'critical', impact_scores: { revenue: 7, customer: 6, operational: 9, technical: 3 }, total_impact: 25, affected_stages: ['Lead Qualification', 'Sales Process'], root_cause: 'No booking system' },
      { id: 'P3', title: 'No customer database', description: 'Paper records make it impossible to track customer history or run marketing campaigns', severity: 'critical', impact_scores: { revenue: 6, customer: 5, operational: 8, technical: 4 }, total_impact: 23, affected_stages: ['Retention', 'Upsell/Cross-Sell'], root_cause: 'No CRM system' },
      { id: 'P4', title: 'No automated follow-ups', description: 'No system to remind patients of upcoming appointments or request reviews', severity: 'important', impact_scores: { revenue: 5, customer: 6, operational: 7, technical: 2 }, total_impact: 20, affected_stages: ['Retention', 'Customer Success'], root_cause: 'No email/SMS automation' },
      { id: 'P5', title: 'No online reviews strategy', description: 'Missing opportunity to build social proof and attract new patients', severity: 'important', impact_scores: { revenue: 6, customer: 5, operational: 3, technical: 2 }, total_impact: 16, affected_stages: ['Discovery', 'Customer Success'], root_cause: 'No review management system' },
      { id: 'P6', title: 'No revenue optimization', description: 'No upselling, membership plans, or package pricing', severity: 'future', impact_scores: { revenue: 7, customer: 3, operational: 4, technical: 2 }, total_impact: 16, affected_stages: ['Payment Collection', 'Upsell/Cross-Sell'], root_cause: 'No pricing strategy' },
    ];
    return problems;
  }
}
