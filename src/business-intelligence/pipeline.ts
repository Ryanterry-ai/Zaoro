import type { LLMProvider } from '../types/index.js';
import { BILLMCaller } from './core/llm-caller.js';
import { InputAnalyzer } from './core/input-analyzer.js';
import { IntentMapper } from './core/intent-mapper.js';
import { IndustryResearcher } from './core/industry-researcher.js';
import { FlowMapper } from './core/flow-mapper.js';
import { ProblemIdentifier } from './core/problem-identifier.js';
import { SolutionDesigner } from './core/solution-designer.js';
import { Architect } from './core/architect.js';
import { Builder } from './core/builder.js';
import { Validator } from './core/validator.js';
import { Corrector } from './core/corrector.js';
import { AgentSkillsBridge } from './core/agent-skills-bridge.js';
import type { BIPipelineResult } from './types/index.js';

export class BusinessIntelligencePipeline {
  private llm: BILLMCaller;
  private bridge: AgentSkillsBridge;
  private inputAnalyzer: InputAnalyzer;
  private intentMapper: IntentMapper;
  private industryResearcher: IndustryResearcher;
  private flowMapper: FlowMapper;
  private problemIdentifier: ProblemIdentifier;
  private solutionDesigner: SolutionDesigner;
  private architect: Architect;
  private builder: Builder;
  private validator: Validator;
  private corrector: Corrector;

  constructor(provider: LLMProvider, apiKey: string, model?: string) {
    this.llm = new BILLMCaller(provider, apiKey, model);
    this.bridge = new AgentSkillsBridge(this.llm);
    this.inputAnalyzer = new InputAnalyzer(this.llm);
    this.intentMapper = new IntentMapper(this.llm);
    this.industryResearcher = new IndustryResearcher(this.llm);
    this.flowMapper = new FlowMapper(this.llm);
    this.problemIdentifier = new ProblemIdentifier(this.llm);
    this.solutionDesigner = new SolutionDesigner(this.llm);
    this.architect = new Architect(this.llm);
    this.builder = new Builder();
    this.validator = new Validator();
    this.corrector = new Corrector(this.llm);
  }

  async run(prompt: string, onProgress?: (phase: string, detail: string) => void): Promise<BIPipelineResult> {
    const startTime = Date.now();
    console.log('='.repeat(60));
    console.log('BUSINESS INTELLIGENCE PIPELINE');
    console.log('='.repeat(60));

    const report = (await phase('Phase 1: Input Understanding', () => this.inputAnalyzer.analyzePrompt(prompt)));

    // Phase 1.5: Competitive research via AgentSkillsBridge (parallel with intent)
    let competitors: Awaited<ReturnType<AgentSkillsBridge['analyzeCompetitors']>> | null = null;
    try {
      competitors = await this.bridge.analyzeCompetitors(report.industry, report.business_model);
      console.log(`[pipeline] Competitor research: ${competitors.competitors.length} competitors, ${competitors.opportunities.length} opportunities`);
    } catch (err: any) {
      console.warn(`[pipeline] Competitor research failed: ${err.message}`);
    }

    const intent = (await phase('Phase 2: Intent Analysis', () => this.intentMapper.mapIntent(report)));
    const knowledge = (await phase('Phase 3: Industry Research', () => this.industryResearcher.researchIndustry(report)));
    const flow = (await phase('Phase 4: Business Flow Mapping', () => this.flowMapper.mapBusinessFlow(report, knowledge)));
    const problems = (await phase('Phase 5: Problem Discovery', () => this.problemIdentifier.identifyProblems(flow, report)));
    const solution = (await phase('Phase 6: Solution Design', () => this.solutionDesigner.designSolution(problems, report)));
    const architecture = (await phase('Phase 7: Architecture Generation', () => this.architect.generateArchitecture(solution, report)));
    const manifest = (await phase('Phase 8: Autonomous Build', async () => {
      const m = this.builder.generateManifest(solution, architecture, report);
      return m;
    }));
    let validation = (await phase('Phase 9: Validation Engine', async () => {
      const v = this.validator.validate(report, problems, solution, architecture);
      return v;
    }));

    let correctionIterations = 0;
    if (!validation.passed) {
      const corrected = await phase('Phase 10: Self-Correction Loop', async () => {
        const c = await this.corrector.correct(report, intent, knowledge, flow, problems, solution, architecture, validation);
        return c;
      });
      correctionIterations = corrected.iterations;
      validation = this.validator.validate(report, problems, corrected.solution, corrected.architecture);
    }

    const totalDuration = Date.now() - startTime;

    console.log('='.repeat(60));
    console.log(`PIPELINE COMPLETE in ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`Validation: ${validation.score}% (${validation.passed ? 'PASSED' : 'NEEDS WORK'})`);
    console.log(`Corrections: ${correctionIterations} iterations`);
    console.log('='.repeat(60));

    return {
      report,
      intent,
      knowledge,
      flow,
      problems,
      solution,
      architecture,
      validation,
      correction_iterations: correctionIterations,
      total_duration_ms: totalDuration
    };

    async function phase<T>(name: string, fn: () => Promise<T>): Promise<T> {
      console.log(`\n--- ${name} ---`);
      onProgress?.(name, 'started');
      await new Promise(r => setTimeout(r, 4000));
      const result = await fn();
      onProgress?.(name, 'completed');
      return result;
    }
  }
}
