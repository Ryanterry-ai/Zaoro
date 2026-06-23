import { BILLMCaller } from './llm-caller.js';
import type { Solution, BusinessIntelligenceReport, Architecture } from '../types/index.js';

const SYSTEM_PROMPT = `You are a systems architect who designs business, system, and AI architectures.

Generate a comprehensive architecture for the proposed solution.
You MUST return ONLY valid JSON matching this exact schema. No markdown, no code fences:
{
  "business": {
    "departments": [
      { "name": "string", "responsibilities": ["string"], "stakeholders": ["string"] }
    ],
    "workflows": [
      { "name": "string", "steps": ["string"], "automation_level": 0-100 }
    ]
  },
  "system": {
    "frontend": ["string - frontend tech/components"],
    "backend": ["string - backend services"],
    "database": ["string - database schema/tables"],
    "apis": ["string - API endpoints"],
    "integrations": ["string - third-party integrations"],
    "infrastructure": ["string - deployment/infra needs"]
  },
  "ai": {
    "agents": [
      { "name": "string", "purpose": "string", "capabilities": ["string"] }
    ],
    "reasoning_systems": ["string"],
    "evaluation_systems": ["string"],
    "automation_systems": ["string"]
  }
}

Design for the specific solution components. Be specific and actionable.`;

export class Architect {
  private llm: BILLMCaller;

  constructor(llm: BILLMCaller) {
    this.llm = llm;
  }

  async generateArchitecture(
    solution: Solution,
    report: BusinessIntelligenceReport
  ): Promise<Architecture> {
    console.log('[phase-7] Generating architecture...');

    const userPrompt = `Business: ${report.business_domain} | ${report.industry}
Solution: ${solution.summary}

Components to build:
${solution.components.map(c => `- ${c.type}: ${c.name} - ${c.description} | Features: ${c.features.join(', ')}`).join('\n')}

Implementation order: ${solution.implementation_order.join(' → ')}

Design the complete architecture. Every element must be traceable to a solution component.`;

    let result: Architecture;
    try {
      result = await this.llm.callStructured<Architecture>(SYSTEM_PROMPT, userPrompt);
    } catch (err: any) {
      if (err.message === 'QUOTA_EXHAUSTED') {
        console.log('[phase-7] Using heuristic fallback (LLM quota exhausted)');
        result = this.heuristicArchitecture(report);
      } else throw err;
    }

    console.log(`[phase-7] Business: ${result.business.departments.length} depts, ${result.business.workflows.length} workflows`);
    console.log(`[phase-7] System: ${result.system.frontend.length} FE, ${result.system.backend.length} BE, ${result.system.apis.length} APIs`);
    console.log(`[phase-7] AI: ${result.ai.agents.length} agents`);
    return result;
  }

  private heuristicArchitecture(report: BusinessIntelligenceReport): Architecture {
    return {
      business: {
        departments: [
          { name: 'Operations', responsibilities: ['Appointment management', 'Service delivery', 'Quality assurance'], stakeholders: ['Staff', 'Management'] },
          { name: 'Marketing', responsibilities: ['Patient acquisition', 'Online presence', 'Brand management'], stakeholders: ['Marketing team'] },
          { name: 'Finance', responsibilities: ['Billing', 'Insurance claims', 'Revenue tracking'], stakeholders: ['Finance team'] },
        ],
        workflows: [
          { name: 'Patient Intake', steps: ['Online booking', 'Confirmation email', 'Reminder SMS', 'Check-in', 'Service', 'Follow-up'], automation_level: 70 },
          { name: 'Marketing Pipeline', steps: ['Lead capture', 'Nurture sequence', 'Conversion', 'Onboarding', 'Retention'], automation_level: 50 },
        ]
      },
      system: {
        frontend: ['Next.js 14 with App Router', 'Tailwind CSS', 'shadcn/ui components', 'Responsive design'],
        backend: ['Next.js API Routes', 'Prisma ORM', 'NextAuth.js authentication'],
        database: ['PostgreSQL (users, appointments, patients, services, payments, reviews, messages)'],
        apis: ['GET /api/appointments', 'POST /api/appointments', 'GET /api/patients', 'POST /api/patients', 'GET /api/services', 'POST /api/payments', 'GET /api/reviews', 'POST /api/reviews'],
        integrations: ['Stripe (payments)', 'Twilio (SMS)', 'SendGrid (email)', 'Google Calendar sync'],
        infrastructure: ['Vercel (hosting)', 'PostgreSQL (Supabase)', 'Cloudflare CDN']
      },
      ai: {
        agents: [
          { name: 'Booking Assistant', purpose: 'Handle appointment scheduling and reminders', capabilities: ['Natural language scheduling', 'Conflict detection', 'Automated reminders'] },
          { name: 'Patient Engagement', purpose: 'Automate follow-ups and review requests', capabilities: ['Email sequences', 'Review solicitation', 'Retention campaigns'] },
        ],
        reasoning_systems: ['Appointment optimization', 'Revenue forecasting'],
        evaluation_systems: ['Patient satisfaction scoring', 'No-show prediction'],
        automation_systems: ['Email automation', 'SMS reminders', 'Review collection']
      }
    };
  }
}
