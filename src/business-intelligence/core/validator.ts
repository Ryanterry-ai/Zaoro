import type { Solution, Architecture, BusinessIntelligenceReport, Problem, ValidationResult } from '../types/index.js';

const VALIDATION_CHECKS = [
  'Does this solution solve the identified problem?',
  'Does it improve revenue generation?',
  'Does it improve customer experience?',
  'Does it reduce operational workload?',
  'Does it follow industry best practices?',
  'Is anything missing?',
  'Is anything unnecessary?'
];

export class Validator {
  validate(
    report: BusinessIntelligenceReport,
    problems: Problem[],
    solution: Solution,
    architecture: Architecture
  ): ValidationResult {
    console.log('[phase-9] Running validation...');

    const checks = VALIDATION_CHECKS.map(question => {
      const result = this.runCheck(question, report, problems, solution, architecture);
      return { question, ...result };
    });

    const passedChecks = checks.filter(c => c.passed).length;
    const score = Math.round((passedChecks / checks.length) * 100);
    const deficiencies = checks.filter(c => !c.passed).map(c => c.details);

    const validation: ValidationResult = {
      score,
      checks,
      deficiencies,
      passed: score >= 95
    };

    console.log(`[phase-9] Validation score: ${score}% (${passedChecks}/${checks.length} checks passed)`);
    if (deficiencies.length > 0) {
      console.log(`[phase-9] Deficiencies: ${deficiencies.join('; ')}`);
    }

    return validation;
  }

  private runCheck(
    question: string,
    report: BusinessIntelligenceReport,
    problems: Problem[],
    solution: Solution,
    architecture: Architecture
  ): { passed: boolean; details: string } {
    switch (question) {
      case 'Does this solution solve the identified problem?': {
        const criticalProblems = problems.filter(p => p.severity === 'critical');
        const solvedCritical = criticalProblems.filter(p =>
          solution.components.some(c => c.solves_problems.includes(p.id))
        );
        if (criticalProblems.length === 0) return { passed: true, details: 'No critical problems identified' };
        if (solvedCritical.length === criticalProblems.length) {
          return { passed: true, details: `All ${criticalProblems.length} critical problems addressed` };
        }
        const unsolved = criticalProblems.filter(p => !solvedCritical.includes(p));
        return { passed: false, details: `Unsolved critical problems: ${unsolved.map(p => p.title).join(', ')}` };
      }

      case 'Does it improve revenue generation?': {
        if (solution.total_revenue_impact > 0) {
          return { passed: true, details: `Revenue impact: ${solution.total_revenue_impact}% improvement` };
        }
        return { passed: false, details: 'No revenue improvement identified' };
      }

      case 'Does it improve customer experience?': {
        const hasCX = solution.components.some(c =>
          ['website', 'customer_portal', 'mobile_app', 'saas'].includes(c.type)
        );
        if (hasCX) return { passed: true, details: 'Customer-facing components included' };
        return { passed: false, details: 'No customer experience improvements' };
      }

      case 'Does it reduce operational workload?': {
        const hasAutomation = solution.components.some(c =>
          ['automation', 'workflow', 'ai_agent', 'internal_tool'].includes(c.type)
        ) || architecture.ai.automation_systems.length > 0;
        if (hasAutomation) return { passed: true, details: 'Automation components included' };
        return { passed: false, details: 'No operational improvements' };
      }

      case 'Does it follow industry best practices?': {
        if (architecture.system.frontend.length > 0 && architecture.system.backend.length > 0 && architecture.system.database.length > 0) {
          return { passed: true, details: 'Complete system architecture defined' };
        }
        return { passed: false, details: 'Incomplete system architecture' };
      }

      case 'Is anything missing?': {
        const missing: string[] = [];
        if (!architecture.system.apis || architecture.system.apis.length === 0) missing.push('API layer');
        if (!architecture.system.database || architecture.system.database.length === 0) missing.push('Data layer');
        if (solution.components.length === 0) missing.push('Solution components');
        if (missing.length === 0) return { passed: true, details: 'Core components present' };
        return { passed: false, details: `Missing: ${missing.join(', ')}` };
      }

      case 'Is anything unnecessary?': {
        const unnecessary = solution.components.filter(c => c.solves_problems.length === 0);
        if (unnecessary.length === 0) return { passed: true, details: 'All components serve a purpose' };
        return { passed: false, details: `Unnecessary components: ${unnecessary.map(c => c.name).join(', ')}` };
      }

      default:
        return { passed: true, details: 'Check not implemented' };
    }
  }
}
