import * as path from 'path';
import { ArchitectAgent, ArchitectDecision } from './architect.js';
import { generateDesignSystem, DesignSystem } from './design-system-generator.js';
import { ResearchAgent, ResearchResult } from './research-agent.js';
import { ComponentSourcer, ComponentPlan } from './component-sourcer.js';
import { AssetIntelligence, AssetPlan } from './asset-intelligence.js';
import { MotionEngine, MotionPlan } from './motion-engine.js';
import { UXEvaluator, UXAuditResult } from './ux-evaluator.js';
import { BusinessValidator, BusinessValidation } from './business-validator.js';
import { AssemblyQA, AssemblyResult } from './assembly-qa.js';
import { createDomainSynthesisAsync, synthesizeDomainSection, DomainSynthesisContext } from './domain-synthesizer.js';
import { LLMGateway } from '../core/llm-gateway.js';
import { LLMConfig, ASTPatch } from '../types/index.js';

export interface PipelineResult {
  success: boolean;
  decision: ArchitectDecision;
  designSystem: DesignSystem;
  research: ResearchResult;
  componentPlan: ComponentPlan;
  assetPlan: AssetPlan;
  motionPlan: MotionPlan;
  uxResult: UXAuditResult;
  businessResult: BusinessValidation;
  assemblyResult: AssemblyResult;
  iterations: number;
  patches: ASTPatch[];
  error?: string;
}

interface PipelineContext {
  decision: ArchitectDecision;
  designSystem: DesignSystem;
  research: ResearchResult;
  componentPlan: ComponentPlan;
  assetPlan: AssetPlan;
  motionPlan: MotionPlan;
  domain: DomainSynthesisContext | undefined;
  generatedSections: Map<string, string>;
  uxResult: UXAuditResult | undefined;
  businessResult: BusinessValidation | undefined;
  assemblyResult: AssemblyResult | undefined;
}

const MAX_ITERATIONS = 3;
const UX_THRESHOLD = 90;
const BUSINESS_THRESHOLD = 90;
const BUILD_THRESHOLD = 100;

// ─── Pipeline Orchestrator ────────────────────────────────────────

export class PipelineOrchestrator {
  private workspaceRoot: string;
  private llmConfig: LLMConfig;
  private logFn: ((step: string, msg: string, data?: Record<string, unknown>) => void) | undefined;
  private phaseFn: ((step: string, msg: string, data?: Record<string, unknown>) => void) | undefined;

  constructor(
    workspaceRoot: string,
    llmConfig: LLMConfig,
    logFn?: (step: string, msg: string, data?: Record<string, unknown>) => void,
    phaseFn?: (step: string, msg: string, data?: Record<string, unknown>) => void,
  ) {
    this.workspaceRoot = workspaceRoot;
    this.llmConfig = llmConfig;
    this.logFn = logFn;
    this.phaseFn = phaseFn;
  }

  private log(msg: string) {
    console.log(`[pipeline] ${msg}`);
    this.logFn?.('pipeline', msg);
  }

  private phase(msg: string, data?: Record<string, unknown>) {
    this.phaseFn?.('phase', msg, data);
  }

  async run(prompt: string): Promise<PipelineResult> {
    const startTime = Date.now();
    let iterations = 0;

    this.log(`Starting pipeline for: "${prompt.slice(0, 80)}..."`);

    // ═══ Stage 1: Business Intelligence ═══════════════════════════
    this.phase('Business Intelligence', { stage: 1 });
    const architect = new ArchitectAgent();
    const decision = architect.designArchitecture(prompt);
    this.log(`BI: ${decision.name} — ${decision.businessType}, ${decision.pages.length} pages`);

    // ═══ Stage 2: Research Agent ═════════════════════════════════
    this.phase('Research Agent', { stage: 2 });
    const researcher = new ResearchAgent();
    const domain = decision.pages[0] ? { industry: decision.businessType } : undefined;
    const research = researcher.research(prompt, decision);
    this.log(`Research: ${research.competitors.length} competitors, ${research.recommendedFeatures.length} features`);

    // ═══ Stage 3: Architect ═══════════════════════════════════════
    this.phase('Architect', { stage: 3 });
    this.log(`Architect: ${decision.pages.length} pages, ${decision.components.length} components`);

    // ═══ Stage 4: Design System ══════════════════════════════════
    this.phase('Design System', { stage: 4 });
    const designSystem = generateDesignSystem(decision);
    this.log(`Design: ${Object.keys(designSystem.typography.scale).length} type scales, ${Object.keys(designSystem.spacing.scale).length} spacing`);

    // ═══ Stage 5: Component Sourcer ══════════════════════════════
    this.phase('Component Sourcer', { stage: 5 });
    const sourcer = new ComponentSourcer();
    const componentPlan = sourcer.sourceComponents(decision, designSystem, research);
    this.log(`Components: ${componentPlan.sections.length} sections, ${componentPlan.sharedComponents.length} shared`);

    // ═══ Stage 6: Asset Intelligence ═════════════════════════════
    this.phase('Asset Intelligence', { stage: 6 });
    const assetIntel = new AssetIntelligence();
    const assetPlan = assetIntel.planAssets(decision, designSystem, research);
    this.log(`Assets: ${assetPlan.images.length} images, ${assetPlan.icons.length} icons`);

    // ═══ Stage 7: Motion Engine ═══════════════════════════════════
    this.phase('Motion Engine', { stage: 7 });
    const motionEngine = new MotionEngine();
    const motionPlan = motionEngine.planMotion(decision, designSystem, componentPlan);
    this.log(`Motion: ${motionPlan.sectionAnimations.length} section animations, ${motionPlan.microInteractions.length} micro-interactions`);

    // ═══ Stage 8: Domain Synthesis + LLM Generation ══════════════
    this.phase('Synthesizer + LLM', { stage: 8 });
    let domainCtx: DomainSynthesisContext | undefined;
    try {
      domainCtx = await createDomainSynthesisAsync(prompt, decision);
    } catch {
      domainCtx = undefined;
    }

    const generatedSections = await this.generateSections(decision, designSystem, domainCtx);
    this.log(`Generated ${generatedSections.size} sections`);

    // ═══ Self-Correction Loop ═════════════════════════════════════
    let ctx: PipelineContext = {
      decision,
      designSystem,
      research,
      componentPlan,
      assetPlan,
      motionPlan,
      domain: domainCtx,
      generatedSections,
      uxResult: undefined,
      businessResult: undefined,
      assemblyResult: undefined,
    };

    for (iterations = 1; iterations <= MAX_ITERATIONS; iterations++) {
      this.phase(`Self-Correction Iteration ${iterations}`, { iteration: iterations, stage: 'eval' });

      // ═══ Stage 9: UX Evaluator ═══════════════════════════════
      this.phase('UX Evaluator', { stage: 9 });
      const evaluator = new UXEvaluator();
      const allCode = [...generatedSections.values()].join('\n');
      const uxResult = evaluator.evaluate(decision, designSystem, componentPlan, motionPlan, allCode);
      ctx.uxResult = uxResult;
      this.log(`UX Score: ${uxResult.overall}/100`);

      // ═══ Stage 10: Business Validator ═════════════════════════
      this.phase('Business Validator', { stage: 10 });
      const validator = new BusinessValidator();
      const businessResult = validator.validate(decision, research, designSystem);
      ctx.businessResult = businessResult;
      this.log(`Business Score: ${businessResult.overall}/100`);

      // ═══ Stage 11: Assembly QA ════════════════════════════════
      this.phase('Assembly QA', { stage: 11 });
      const assembler = new AssemblyQA(this.workspaceRoot);
      const assemblyResult = await assembler.assemble(
        decision, designSystem, componentPlan, assetPlan, motionPlan,
        uxResult, businessResult, generatedSections,
      );
      ctx.assemblyResult = assemblyResult;
      this.log(`Assembly Score: ${assemblyResult.overallScore}/100, ${assemblyResult.filesWritten.length} files`);

      // ═══ Self-Correction Check ════════════════════════════════
      const uxScore = uxResult.overall;
      const bizScore = businessResult.overall;
      const buildScore = assemblyResult.overallScore;

      this.log(`Iteration ${iterations}: UX=${uxScore} Business=${bizScore} Build=${buildScore}`);

      if (uxScore >= UX_THRESHOLD && bizScore >= BUSINESS_THRESHOLD && buildScore >= BUILD_THRESHOLD) {
        this.log(`All scores pass threshold — shipping`);
        break;
      }

      if (iterations < MAX_ITERATIONS) {
        this.log(`Scores below threshold — re-planning (UX:${uxScore}<${UX_THRESHOLD} || Biz:${bizScore}<${BUSINESS_THRESHOLD} || Build:${buildScore}<${BUILD_THRESHOLD})`);

        // Re-plan based on evaluation feedback
        const fixes = this.generateFixes(uxResult, businessResult, assemblyResult);
        this.log(`Applying ${fixes.length} fixes`);

        // Re-generate affected sections
        for (const fix of fixes) {
          if (fix.section && !generatedSections.has(fix.section)) {
            try {
              const code = await this.regenerateSection(fix.section, decision, designSystem, domainCtx);
              if (code) generatedSections.set(fix.section, code);
            } catch (err: any) {
              this.log(`Re-generation failed for ${fix.section}: ${err.message}`);
            }
          }
        }
      }
    }

    // ═══ Final Assembly ═══════════════════════════════════════════
    this.phase('Final Assembly', { stage: 'final' });

    // Build patches from generated sections
    const patches: ASTPatch[] = [];
    for (const [section, code] of generatedSections) {
      const componentName = this.toPascalCase(section);
      patches.push({
        action: 'insert',
        targetFile: `src/components/sections/${componentName}.tsx`,
        codeBlock: `'use client';\n\n${code}`,
      });
    }

    const duration = Date.now() - startTime;
    this.log(`Pipeline complete: ${iterations} iterations, ${patches.length} patches, ${(duration / 1000).toFixed(1)}s`);

    return {
      success: true,
      decision,
      designSystem,
      research,
      componentPlan,
      assetPlan,
      motionPlan,
      uxResult: ctx.uxResult!,
      businessResult: ctx.businessResult!,
      assemblyResult: ctx.assemblyResult!,
      iterations,
      patches,
    };
  }

  // ─── Section generation ─────────────────────────────────────────

  private async generateSections(
    decision: ArchitectDecision,
    ds: DesignSystem,
    domain?: DomainSynthesisContext,
  ): Promise<Map<string, string>> {
    const sections = new Map<string, string>();
    const seen = new Set<string>();

    for (const page of decision.pages) {
      for (const sectionType of page.sections) {
        if (seen.has(sectionType)) continue;
        seen.add(sectionType);

        // Try domain synthesis first (uses LLM + domain data)
        if (domain) {
          try {
            const code = synthesizeDomainSection(sectionType, domain);
            if (code && !code.includes('Content for') && !code.includes('section')) {
              sections.set(sectionType, this.wrapWithMotion(code, sectionType, ds));
              continue;
            }
          } catch {}
        }

        // Fallback: generate from primitives
        const code = this.generateFromPrimitives(sectionType, decision, ds);
        sections.set(sectionType, code);
      }
    }

    return sections;
  }

  private wrapWithMotion(code: string, sectionType: string, ds: DesignSystem): string {
    // Wrap section with motion classes
    if (code.includes('<section')) {
      return code.replace(
        /<section className="/,
        `<section className="animate-fade-in `,
      );
    }
    return code;
  }

  private generateFromPrimitives(sectionType: string, decision: ArchitectDecision, ds: DesignSystem): string {
    const primary = ds.colors.primary;
    const title = this.toTitleCase(sectionType);

    // Generate a minimal section from primitives
    return `<section className="${ds.layout.sectionClass}">
  <div className="${ds.layout.containerClass}">
    <h2 className="text-2xl font-black mb-8">${title}</h2>
    <div className="${ds.layout.gridClass}">
      <div className="bg-${ds.colors.surface.card} border border-${ds.colors.border.default} ${ds.borders.radius.lg} ${ds.spacing.cardPadding}">
        <p className="text-${ds.colors.text.body}">Content for ${title}</p>
      </div>
    </div>
  </div>
</section>`;
  }

  // ─── Self-correction fixes ──────────────────────────────────────

  private generateFixes(
    uxResult: UXAuditResult,
    businessResult: BusinessValidation,
    assemblyResult: AssemblyResult,
  ): Array<{ section?: string; type: string; detail: string }> {
    const fixes: Array<{ section?: string; type: string; detail: string }> = [];

    // UX fixes
    for (const issue of uxResult.issues) {
      if (issue.severity === 'critical') {
        fixes.push({ type: 'ux-critical', detail: issue.message });
      }
      if (issue.category === 'accessibility' && issue.severity === 'warning') {
        fixes.push({ type: 'accessibility', detail: issue.fix });
      }
    }

    // Business fixes
    for (const check of businessResult.checks) {
      if (!check.passed && check.score < 50) {
        fixes.push({ type: 'business', detail: check.recommendation });
      }
    }

    // Assembly fixes
    for (const check of assemblyResult.checks) {
      if (!check.passed) {
        fixes.push({ type: 'assembly', detail: check.detail });
      }
    }

    return fixes;
  }

  private async regenerateSection(
    sectionType: string,
    decision: ArchitectDecision,
    ds: DesignSystem,
    domain?: DomainSynthesisContext,
  ): Promise<string | null> {
    // Re-synthesize with domain data
    if (domain) {
      try {
        return synthesizeDomainSection(sectionType, domain);
      } catch {}
    }
    return null;
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private toPascalCase(str: string): string {
    return str.split(/[-/]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  }

  private toTitleCase(str: string): string {
    return str.split(/[-/]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
}
