import type { BREContext, RuleDecision } from './rules-engine.js';

export interface Constraint {
  id: string;
  name: string;
  type: 'required' | 'forbidden' | 'mutually_exclusive' | 'implies';
  description: string;
  check: (ctx: BREContext, decisions: RuleDecision[]) => ConstraintResult;
}

export interface ConstraintResult {
  satisfied: boolean;
  violations: string[];
  suggestions: string[];
}

export interface ConstraintReport {
  totalConstraints: number;
  satisfied: number;
  violated: number;
  violations: Array<{
    constraintId: string;
    constraintName: string;
    violations: string[];
    suggestions: string[];
  }>;
}

export class ConstraintSolver {
  private constraints: Constraint[] = [];

  register(constraint: Constraint): void {
    this.constraints.push(constraint);
  }

  evaluate(ctx: BREContext, decisions: RuleDecision[]): ConstraintReport {
    const violations: ConstraintReport['violations'] = [];
    let satisfied = 0;

    for (const constraint of this.constraints) {
      const result = constraint.check(ctx, decisions);
      if (result.satisfied) {
        satisfied++;
      } else {
        violations.push({
          constraintId: constraint.id,
          constraintName: constraint.name,
          violations: result.violations,
          suggestions: result.suggestions,
        });
      }
    }

    return {
      totalConstraints: this.constraints.length,
      satisfied,
      violated: violations.length,
      violations,
    };
  }

  getConstraints(): Constraint[] {
    return [...this.constraints];
  }
}

export function createDefaultConstraints(): Constraint[] {
  return [
    {
      id: 'constraint.ecommerce.needs_payment',
      name: 'E-commerce must have payment integration',
      type: 'required',
      description: 'Any e-commerce app must have a payment gateway',
      check: (ctx, decisions) => {
        const isEcommerce = ctx.industry.toLowerCase().includes('commerce') || ctx.businessModels.includes('direct-sales');
        if (!isEcommerce) return { satisfied: true, violations: [], suggestions: [] };

        const hasPayment = decisions.some(d => d.action.type === 'add_integration');
        return {
          satisfied: hasPayment,
          violations: hasPayment ? [] : ['E-commerce app requires a payment integration'],
          suggestions: ['Add Stripe or PayPal integration'],
        };
      },
    },
    {
      id: 'constraint.subscription.needs_pricing',
      name: 'Subscription must have pricing page',
      type: 'required',
      description: 'Subscription business model requires a pricing page',
      check: (ctx, decisions) => {
        const isSubscription = ctx.businessModels.includes('subscription') || ctx.businessModels.includes('Subscription');
        if (!isSubscription) return { satisfied: true, violations: [], suggestions: [] };

        const hasPricing = decisions.some(d => d.action.type === 'add_page' && d.action.path === '/pricing');
        return {
          satisfied: hasPricing,
          violations: hasPricing ? [] : ['Subscription model requires a pricing page'],
          suggestions: ['Add /pricing page with tier comparison'],
        };
      },
    },
    {
      id: 'constraint.healthcare.needs_compliance',
      name: 'Healthcare must have compliance',
      type: 'required',
      description: 'Healthcare industry requires HIPAA or similar compliance',
      check: (ctx, decisions) => {
        const isHealthcare = ctx.industry.toLowerCase().includes('healthcare') || ctx.industry.toLowerCase().includes('medical');
        if (!isHealthcare) return { satisfied: true, violations: [], suggestions: [] };

        const hasCompliance = decisions.some(d => d.action.type === 'add_compliance');
        return {
          satisfied: hasCompliance,
          violations: hasCompliance ? [] : ['Healthcare apps require compliance packs (HIPAA, etc.)'],
          suggestions: ['Add HIPAA compliance pack'],
        };
      },
    },
    {
      id: 'constraint.mutually_exclusive.design_styles',
      name: 'Cannot apply conflicting design styles',
      type: 'mutually_exclusive',
      description: 'Only one design profile should be active',
      check: (_ctx, decisions) => {
        const profiles = decisions.filter(d => d.action.type === 'add_design_profile');
        const profileNames = profiles.map(p => {
          if (p.action.type === 'add_design_profile') return p.action.profileId;
          return 'unknown';
        });
        return {
          satisfied: profiles.length <= 1,
          violations: profiles.length > 1 ? [`Multiple design profiles selected: ${profileNames.join(', ')}`] : [],
          suggestions: profiles.length > 1 ? ['Select only the most appropriate design profile'] : [],
        };
      },
    },
    {
      id: 'constraint.performance.page_count',
      name: 'Reasonable page count',
      type: 'required',
      description: 'Apps should have between 3 and 50 pages',
      check: (_ctx, decisions) => {
        const pages = decisions.filter(d => d.action.type === 'add_page');
        const uniquePaths = new Set(pages.map(d => {
          if (d.action.type === 'add_page') return d.action.path;
          return '';
        }));
        const count = uniquePaths.size;
        return {
          satisfied: count >= 3 && count <= 50,
          violations: count < 3 ? [`Too few pages (${count})`] : count > 50 ? [`Too many pages (${count})`] : [],
          suggestions: count < 3 ? ['Add more pages for a complete experience'] : count > 50 ? ['Consider consolidating pages'] : [],
        };
      },
    },
  ];
}
