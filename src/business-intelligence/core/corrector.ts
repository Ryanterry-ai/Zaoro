import { BILLMCaller } from './llm-caller.js';
import type {
  BusinessIntelligenceReport, IntentMap, IndustryKnowledgeBase,
  BusinessFlow, Problem, Solution, Architecture, ValidationResult
} from '../types/index.js';
import { IntentMapper } from './intent-mapper.js';
import { SolutionDesigner } from './solution-designer.js';
import { Architect } from './architect.js';

const MAX_CORRECTION_ITERATIONS = 3;

const CORRECTION_SYSTEM_PROMPT = `You are a solution improvement specialist.

Given a validation report with deficiencies, improve the solution to address each deficiency.
You MUST return ONLY valid JSON matching this exact schema. No markdown, no code fences:
{
  "improvements": [
    {
      "deficiency": "string - which deficiency this addresses",
      "action": "string - what to change",
      "component_updates": ["string - components to modify"],
      "new_components": ["string - new components to add if needed"]
    }
  ],
  "updated_solution_summary": "string - improved solution summary"
}

Be specific and address EVERY deficiency.`;

export class Corrector {
  private llm: BILLMCaller;
  private intentMapper: IntentMapper;
  private solutionDesigner: SolutionDesigner;
  private architect: Architect;

  constructor(llm: BILLMCaller) {
    this.llm = llm;
    this.intentMapper = new IntentMapper(llm);
    this.solutionDesigner = new SolutionDesigner(llm);
    this.architect = new Architect(llm);
  }

  async correct(
    report: BusinessIntelligenceReport,
    intent: IntentMap,
    knowledge: IndustryKnowledgeBase,
    flow: BusinessFlow,
    problems: Problem[],
    solution: Solution,
    architecture: Architecture,
    validation: ValidationResult
  ): Promise<{ solution: Solution; architecture: Architecture; iterations: number }> {
    console.log(`[phase-10] Starting self-correction (score: ${validation.score}%, target: 95%)`);

    let currentSolution = solution;
    let currentArchitecture = architecture;
    let iterations = 0;

    while (!validation.passed && iterations < MAX_CORRECTION_ITERATIONS) {
      iterations++;
      console.log(`[phase-10] Correction iteration ${iterations}/${MAX_CORRECTION_ITERATIONS}`);

      const userPrompt = `Current Solution: ${JSON.stringify(currentSolution, null, 2)}

Validation Deficiencies:
${validation.deficiencies.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Improve the solution to address EVERY deficiency. Be specific about what to add or change.`;

      try {
        const result = await this.llm.callStructured<{
          improvements: Array<{
            deficiency: string;
            action: string;
            component_updates: string[];
            new_components: string[];
          }>;
          updated_solution_summary: string;
        }>(CORRECTION_SYSTEM_PROMPT, userPrompt);

        console.log(`[phase-10] Applied ${result.improvements.length} improvements`);

        // Apply improvements to solution
        for (const improvement of result.improvements) {
          for (const compName of improvement.component_updates) {
            const existing = currentSolution.components.find(c => c.name === compName);
            if (existing) {
              existing.description += ` (improved: ${improvement.action})`;
            }
          }

          for (const newCompName of improvement.new_components) {
            const existingTypes = currentSolution.components.map(c => c.type);
            const suggestedType = existingTypes.includes('automation' as any) ? 'automation' : 'website';
            currentSolution.components.push({
              type: suggestedType as any,
              name: newCompName,
              description: improvement.action,
              solves_problems: [],
              revenue_impact: 10,
              priority: 5,
              features: []
            });
          }
        }

        currentSolution.summary = result.updated_solution_summary;

        // Regenerate architecture with improved solution
        currentArchitecture = await this.architect.generateArchitecture(currentSolution, report);

        // Revalidate
        const { Validator } = await import('./validator.js');
        const validator = new Validator();
        validation = validator.validate(report, problems, currentSolution, currentArchitecture);

        console.log(`[phase-10] New validation score: ${validation.score}%`);

      } catch (err: any) {
        console.error(`[phase-10] Correction failed: ${err.message}`);
        break;
      }
    }

    return { solution: currentSolution, architecture: currentArchitecture, iterations };
  }
}
