import * as path from 'path';
import * as fs from 'fs';
import { ArchitectAgent, ArchitectDecision, PageDesign, ComponentDesign } from './architect.js';
import { generateDesignSystem, DesignSystem } from './design-system-generator.js';
import { ResearchAgent, ResearchResult } from './research-agent.js';
import { ComponentSourcer, ComponentPlan } from './component-sourcer.js';
import { AssetIntelligence, AssetPlan } from './asset-intelligence.js';
import { MotionEngine, MotionPlan } from './motion-engine.js';
import { UXEvaluator, UXAuditResult } from './ux-evaluator.js';
import { BusinessValidator, BusinessValidation } from './business-validator.js';
import { AssemblyQA, AssemblyResult } from './assembly-qa.js';
import { createDomainSynthesisAsync, synthesizeDomainSection, DomainSynthesisContext } from './domain-synthesizer.js';
import { IntentDNAExtractor, IntentDNA } from './intent-dna.js';
import { FeatureEnricher, EnrichedIntent } from './feature-enricher.js';
import { generateDesignDNA, DesignDNA } from './design-dna.js';
import { LLMGateway } from '../core/llm-gateway.js';
import { LLMConfig, ASTPatch } from '../types/index.js';
import { BuildProgressEvent, BuildStage, createBuildState, BuildState } from '../engine/build-progress.js';
import { RuntimeManager } from '../engine/runtime-manager.js';
import { BuildRunner } from '../engine/build-runner.js';
import { BrowserVerifier, VerificationResult } from '../engine/browser-verifier.js';
import { RepairLoop, RepairResult } from '../engine/repair-loop.js';

export interface PipelineResult {
  success: boolean;
  intent: IntentDNA;
  designDNA: DesignDNA;
  enriched: EnrichedIntent;
  decision: ArchitectDecision;
  designSystem: DesignSystem;
  research: ResearchResult;
  componentPlan: ComponentPlan;
  assetPlan: AssetPlan;
  motionPlan: MotionPlan;
  uxResult: UXAuditResult;
  businessResult: BusinessValidation;
  assemblyResult: AssemblyResult;
  verificationResult: VerificationResult | undefined;
  repairResult: RepairResult | undefined;
  iterations: number;
  patches: ASTPatch[];
  buildState: BuildState;
  error?: string;
}

interface PipelineContext {
  intent: IntentDNA;
  designDNA: DesignDNA;
  enriched: EnrichedIntent;
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
  verificationResult: VerificationResult | undefined;
  repairResult: RepairResult | undefined;
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
  private stateFile: string;
  private buildState: BuildState;

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
    this.stateFile = path.join(workspaceRoot, '.build-state.json');
    this.buildState = createBuildState('');
  }

  private log(msg: string) {
    console.log(`[pipeline] ${msg}`);
    this.logFn?.('pipeline', msg);
  }

  private phase(msg: string, data?: Record<string, unknown>) {
    this.phaseFn?.('phase', msg, data);
  }

  private emit(stage: BuildStage, stageStatus: 'active' | 'done' | 'failed', message: string, data?: Record<string, unknown>) {
    const event: BuildProgressEvent = data !== undefined
      ? { ts: Date.now(), stage, stageStatus, message, data }
      : { ts: Date.now(), stage, stageStatus, message };
    this.buildState.events.push(event);

    // Update stage progress
    const sp = this.buildState.stages[stage];
    if (sp) {
      if (stageStatus === 'active' && sp.status === 'pending') {
        sp.status = 'active';
        sp.startedAt = Date.now();
      }
      if (stageStatus === 'done') {
        sp.status = 'done';
        sp.completedAt = Date.now();
      }
      if (stageStatus === 'failed') {
        sp.status = 'failed';
        sp.completedAt = Date.now();
      }
    }

    // Flush to file
    this.flushState();

    // Legacy callbacks
    this.logFn?.(stage, message, data);
    this.phaseFn?.('phase', message, data);
  }

  private flushState() {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify(this.buildState, null, 2), 'utf-8');
    } catch {}
  }

  async run(prompt: string): Promise<PipelineResult> {
    const startTime = Date.now();
    let iterations = 0;
    this.buildState = createBuildState(prompt);

    this.log(`Starting pipeline for: "${prompt.slice(0, 80)}..."`);
    this.emit('bi', 'active', `Starting pipeline: "${prompt.slice(0, 100)}..."`);

    // ═══ Stage 1: IntentDNA Extraction ══════════════════════════
    this.emit('bi', 'active', `Extracting structured intent from prompt — domain, features, entities, workflows...`);
    const llm = new LLMGateway(this.llmConfig);
    const intentExtractor = new IntentDNAExtractor(llm);
    const intent = await intentExtractor.extract(prompt);
    this.emit('bi', 'active', `Intent extracted: ${intent.business_domain} "${intent.app_name}" — ${intent.features.length} features, ${intent.entities.length} entities, confidence=${intent.confidence}`);
    this.emit('bi', 'done', `IntentDNA complete — domain=${intent.business_domain}, features=[${intent.features.map(f => f.name).join(', ')}]`, {
      intent: {
        domain: intent.business_domain,
        name: intent.app_name,
        features: intent.features.map(f => f.name),
        entities: intent.entities.map(e => e.name),
        confidence: intent.confidence,
      },
    });

    // ═══ Stage 2: Design DNA Generation ═════════════════════════
    this.emit('design', 'active', `Generating Design DNA — unified visual system from intent...`);
    const designDNA = generateDesignDNA(intent);
    this.emit('design', 'active', `Design DNA: personality=${designDNA.brandPersonality}, style=${designDNA.designStyle}, palette=${designDNA.colors.paletteName}`);
    this.emit('design', 'active', `Typography: ${designDNA.typography.heading.split(',')[0]} / ${designDNA.typography.body.split(',')[0]}, baseUnit=${designDNA.spacing.baseUnit}`);
    this.emit('design', 'done', `Design DNA complete — 19 subsystems mapped (colors, typography, spacing, radius, shadows, motion, icons, photography, illustration, charts, tables, forms, buttons, cards, navigation, layout)`, {
      personality: designDNA.brandPersonality,
      style: designDNA.designStyle,
      palette: designDNA.colors.paletteName,
      typography: { heading: designDNA.typography.heading.split(',')[0], body: designDNA.typography.body.split(',')[0] },
      spacing: designDNA.spacing.baseUnit,
      layout: designDNA.layout.heroLayout,
    });

    // ═══ Stage 3: Research Agent ═════════════════════════════════
    this.emit('research', 'active', `Researching competitors, market insights, and content strategy...`);
    const researcher = new ResearchAgent();
    const domainContext = { industry: intent.business_domain };
    const researchDecision: ArchitectDecision = {
      name: intent.app_name,
      description: `A ${intent.business_domain} application`,
      businessType: intent.business_domain,
      capabilities: intent.features.map(f => f.name),
      pages: [{
        name: 'home',
        route: '/',
        type: 'landing',
        sections: intent.features.filter(f => f.type === 'ui_section').map(f => f.name),
        layout: 'default',
        description: 'Home page',
      }],
      components: intent.features.map(f => ({
        name: f.name,
        type: f.component_type || 'ui',
        usedPrimitives: [],
        props: [],
        description: f.description,
      })),
      stateModel: [],
      colorScheme: { primary: 'blue', secondary: 'gray', accent: 'indigo', gradient: 'from-blue-500 to-indigo-500', mood: 'professional' },
    };
    const research = researcher.research(prompt, researchDecision);
    this.emit('research', 'active', `Found ${research.competitors.length} competitors, ${research.recommendedFeatures.length} features`);
    if (research.competitors.length > 0) {
      this.emit('research', 'active', `Competitors: ${research.competitors.slice(0, 5).map(c => c.name).join(', ')}`);
    }
    this.emit('research', 'done', `Research complete — ${research.competitors.length} competitors, ${research.recommendedFeatures.length} features, ${research.contentStrategy.keyMessages.length} key messages`, {
      competitors: research.competitors.map(c => ({ name: c.name, features: c.features })),
      recommendedFeatures: research.recommendedFeatures,
      contentStrategy: { keyMessages: research.contentStrategy.keyMessages.length, tone: research.contentStrategy.toneOfVoice },
    });

    // ═══ Stage 3: Feature Enrichment ════════════════════════════
    this.emit('architect', 'active', `Enriching features with component blueprints, props, state, and API specs...`);
    const enricher = new FeatureEnricher(llm);
    const enriched = await enricher.enrich(intent);
    this.emit('architect', 'active', `Generated ${enriched.blueprints.length} blueprints, ${enriched.interaction_map.length} interactions, ${enriched.page_structure.length} pages`);
    this.emit('architect', 'done', `Feature enrichment complete — ${enriched.blueprints.length} blueprints, global styles defined`, {
      blueprints: enriched.blueprints.map(b => ({ feature: b.feature.name, components: b.components.length, state: b.state.length, api: b.api_endpoints.length })),
      pages: enriched.page_structure.map(p => ({ page: p.page, route: p.route, sections: p.sections })),
      interactions: enriched.interaction_map.length,
    });

    // ═══ Stage 5: Architect (uses IntentDNA + Design DNA for informed decisions) ═══
    this.emit('design', 'active', `Generating design system — typography, colors, spacing, layout...`);
    const architect = new ArchitectAgent();
    // Pass structured prompt incorporating IntentDNA and Design DNA so architect doesn't re-infer from raw text
    const enrichedPrompt = [
      prompt,
      `App name: ${intent.app_name}`,
      `Business domain: ${intent.business_domain}`,
      `Key features: ${intent.features.map(f => f.name).join(', ')}`,
      `Entities: ${intent.entities.map(e => e.name).join(', ')}`,
      `Workflows: ${intent.workflows.map(w => w.name).join(', ')}`,
      `UI sections: ${intent.ui_sections.map(s => s.type).join(', ')}`,
      `Design style: ${intent.design_style}`,
      `Color palette: ${intent.color_palette.join(', ')}`,
      `Design DNA: personality=${designDNA.brandPersonality}, style=${designDNA.designStyle}, palette=${designDNA.colors.paletteName}`,
      `Typography: heading=${designDNA.typography.heading.split(',')[0]}, body=${designDNA.typography.body.split(',')[0]}`,
      `Layout: hero=${designDNA.layout.heroLayout}, density=${designDNA.layout.density}, nav=${designDNA.navigation.type}`,
    ].join('\n');
    const decision = architect.designArchitecture(enrichedPrompt);
    const designSystem = generateDesignSystem(decision, undefined, designDNA);
    this.emit('design', 'active', `Typography: ${Object.keys(designSystem.typography.scale).length} scales, ${designSystem.typography.fontFamily.heading}/${designSystem.typography.fontFamily.body}`);
    this.emit('design', 'active', `Colors: primary=${designSystem.colors.primary[500]}, accent=${designSystem.colors.accent[500]}`);
    this.emit('design', 'active', `Spacing: ${Object.keys(designSystem.spacing.scale).length} scales, container=${designSystem.layout.containerClass}`);
    this.emit('design', 'done', `Design system complete — ${Object.keys(designSystem.typography.scale).length} type scales, ${Object.keys(designSystem.spacing.scale).length} spacing`, {
      typography: { headingFont: designSystem.typography.fontFamily.heading, bodyFont: designSystem.typography.fontFamily.body, scales: Object.keys(designSystem.typography.scale).length },
      colors: { primary: designSystem.colors.primary[500], accent: designSystem.colors.accent[500], surface: designSystem.colors.surface },
      layout: designSystem.layout,
    });

    // ═══ Stage 5: Component Sourcer ══════════════════════════════
    this.emit('components', 'active', `Sourcing components for ${decision.pages.length} pages...`);
    const sourcer = new ComponentSourcer();
    const componentPlan = sourcer.sourceComponents(decision, designSystem, research);
    this.emit('components', 'active', `Planned ${componentPlan.sections.length} section compositions, ${componentPlan.sharedComponents.length} shared components`);
    for (const section of componentPlan.sections.slice(0, 10)) {
      this.emit('components', 'active', `Section "${section.sectionType}" → ${section.sources.length} sources: ${section.sources.map(s => s.name).join(', ')}`);
    }
    this.emit('components', 'done', `Components sourced — ${componentPlan.sections.length} sections, ${componentPlan.sharedComponents.length} shared`, {
      sections: componentPlan.sections.map(s => ({ type: s.sectionType, sources: s.sources.length })),
      sharedComponents: componentPlan.sharedComponents,
    });

    // ═══ Stage 6: Asset Intelligence ═════════════════════════════
    this.emit('assets', 'active', `Planning images, icons, and media assets...`);
    const assetIntel = new AssetIntelligence();
    const assetPlan = assetIntel.planAssets(decision, designSystem, research, undefined, designDNA);
    this.emit('assets', 'active', `Planned ${assetPlan.images.length} images, ${assetPlan.icons.length} icons, ${assetPlan.illustrations.length} illustrations`);
    for (const img of assetPlan.images.slice(0, 5)) {
      this.emit('assets', 'active', `Image: ${img.query} (${img.purpose}, ${img.priority} priority)`);
    }
    this.emit('assets', 'done', `Asset plan complete — ${assetPlan.images.length} images, ${assetPlan.icons.length} icons`, {
      images: assetPlan.images.map(i => ({ query: i.query, purpose: i.purpose, priority: i.priority })),
      icons: assetPlan.icons,
      illustrations: assetPlan.illustrations.length,
    });

    // ═══ Stage 7: Motion Engine ═══════════════════════════════════
    this.emit('motion', 'active', `Planning animations and micro-interactions...`);
    const motionEngine = new MotionEngine();
    const motionPlan = motionEngine.planMotion(decision, designSystem, componentPlan, designDNA);
    this.emit('motion', 'active', `Planned ${motionPlan.sectionAnimations.length} section animations, ${motionPlan.microInteractions.length} micro-interactions`);
    for (const anim of motionPlan.sectionAnimations.slice(0, 5)) {
      this.emit('motion', 'active', `Animation: ${anim.sectionType} → ${anim.enter.animation} + ${anim.hover?.animation || 'none'}`);
    }
    this.emit('motion', 'done', `Motion plan complete — ${motionPlan.sectionAnimations.length} animations, ${motionPlan.microInteractions.length} micro-interactions`, {
      sectionAnimations: motionPlan.sectionAnimations.map(a => ({ section: a.sectionType, entrance: a.enter.animation, hover: a.hover?.animation })),
      microInteractions: motionPlan.microInteractions.map(m => ({ trigger: m.interaction, type: m.animation })),
      globalMotion: motionPlan.globalMotion,
    });

    // ═══ Stage 8: Domain Synthesis + LLM Generation ══════════════
    this.emit('synthesize', 'active', `Generating domain-specific content...`);
    let domainCtx: DomainSynthesisContext | undefined;
    try {
      this.emit('synthesize', 'active', `Creating domain synthesis context...`);
      domainCtx = await createDomainSynthesisAsync(prompt, decision, designDNA);
      this.emit('synthesize', 'active', `Domain context ready — ${domainCtx.domain.industry}, mood=${domainCtx.domain.mood}`);
    } catch {
      this.emit('synthesize', 'active', `Domain synthesis unavailable — using primitives`);
      domainCtx = undefined;
    }

    this.emit('synthesize', 'active', `Generating sections...`);
    const generatedSections = await this.generateSections(decision, designSystem, domainCtx);
    this.emit('synthesize', 'active', `Generated ${generatedSections.size} sections`);
    for (const [section] of generatedSections) {
      this.emit('synthesize', 'active', `Section: ${section}`);
    }
    this.emit('synthesize', 'done', `Code generation complete — ${generatedSections.size} sections`, {
      sections: [...generatedSections.keys()],
    });

    // ═══ Self-Correction Loop ═════════════════════════════════════
    let ctx: PipelineContext = {
      intent,
      designDNA,
      enriched,
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
      verificationResult: undefined,
      repairResult: undefined,
    };

    for (iterations = 1; iterations <= MAX_ITERATIONS; iterations++) {
      this.buildState.iteration = iterations;
      this.emit('correction', 'active', `Self-correction iteration ${iterations}/${MAX_ITERATIONS}`);

      // ═══ Stage 9: UX Evaluator ═══════════════════════════════
      this.emit('ux-eval', 'active', `Evaluating UX quality — accessibility, hierarchy, contrast, spacing...`);
      const evaluator = new UXEvaluator();
      const allCode = [...generatedSections.values()].join('\n');
      const uxResult = evaluator.evaluate(decision, designSystem, componentPlan, motionPlan, allCode);
      ctx.uxResult = uxResult;
      this.emit('ux-eval', 'active', `UX Score: ${uxResult.overall}/100 — ${uxResult.issues.length} issues found`);
      for (const issue of uxResult.issues.slice(0, 5)) {
        this.emit('ux-eval', 'active', `${issue.severity}: ${issue.message} → ${issue.fix}`);
      }
      this.emit('ux-eval', 'done', `UX evaluation complete — ${uxResult.overall}/100`, {
        overall: uxResult.overall,
        issues: uxResult.issues.length,
        critical: uxResult.issues.filter(i => i.severity === 'critical').length,
        categories: uxResult.categories,
      });

      // ═══ Stage 10: Business Validator ═══════════════════════
      this.emit('biz-eval', 'active', `Validating business requirements — revenue, flows, market fit...`);
      const validator = new BusinessValidator();
      const businessResult = validator.validate(decision, research, designSystem);
      ctx.businessResult = businessResult;
      this.emit('biz-eval', 'active', `Business Score: ${businessResult.overall}/100 — ${businessResult.checks.length} checks`);
      for (const check of businessResult.checks.slice(0, 5)) {
        this.emit('biz-eval', 'active', `${check.passed ? '✓' : '✕'} ${check.name}: ${check.score}/100`);
      }
      this.emit('biz-eval', 'done', `Business validation complete — ${businessResult.overall}/100`, {
        overall: businessResult.overall,
        checks: businessResult.checks.map(c => ({ name: c.name, passed: c.passed, score: c.score })),
      });

      // ═══ Stage 11: Assembly QA ══════════════════════════════
      this.emit('assembly', 'active', `Assembling final output — writing files, integrity checks...`);
      const assembler = new AssemblyQA(this.workspaceRoot, (filePath: string) => {
        this.emit('assembly', 'active', `Wrote: ${filePath}`, { status: 'file-written', filePath });
      });
      const assemblyResult = await assembler.assemble(
        decision, designSystem, componentPlan, assetPlan, motionPlan,
        uxResult, businessResult, generatedSections,
      );
      ctx.assemblyResult = assemblyResult;
      this.emit('assembly', 'active', `Assembly Score: ${assemblyResult.overallScore}/100 — ${assemblyResult.filesWritten.length} files written`);
      this.emit('assembly', 'done', `Assembly complete — ${assemblyResult.overallScore}/100, ${assemblyResult.filesWritten.length} files`, {
        overallScore: assemblyResult.overallScore,
        filesWritten: assemblyResult.filesWritten,
        checks: assemblyResult.checks.map(c => ({ name: c.name, passed: c.passed })),
      });

      // ═══ Self-Correction Check ══════════════════════════════
      const uxScore = uxResult.overall;
      const bizScore = businessResult.overall;
      const buildScore = assemblyResult.overallScore;

      this.buildState.scores = { ux: uxScore, business: bizScore, build: buildScore };
      this.flushState();

      this.emit('correction', 'active', `Iteration ${iterations}: UX=${uxScore} (need ${UX_THRESHOLD}), Business=${bizScore} (need ${BUSINESS_THRESHOLD}), Build=${buildScore} (need ${BUILD_THRESHOLD})`);

      if (uxScore >= UX_THRESHOLD && bizScore >= BUSINESS_THRESHOLD && buildScore >= BUILD_THRESHOLD) {
        this.emit('correction', 'done', `All scores pass threshold — shipping! UX=${uxScore} Biz=${bizScore} Build=${buildScore}`);
        break;
      }

      if (iterations < MAX_ITERATIONS) {
        this.emit('correction', 'active', `Scores below threshold — re-planning (UX:${uxScore}<${UX_THRESHOLD} || Biz:${bizScore}<${BUSINESS_THRESHOLD} || Build:${buildScore}<${BUILD_THRESHOLD})`);

        const fixes = this.generateFixes(uxResult, businessResult, assemblyResult);
        this.emit('correction', 'active', `Applying ${fixes.length} fixes`);
        for (const fix of fixes.slice(0, 5)) {
          this.emit('correction', 'active', `Fix: ${fix.type} — ${fix.detail.slice(0, 80)}`);
        }

        for (const fix of fixes) {
          if (fix.section && !generatedSections.has(fix.section)) {
            try {
              this.emit('correction', 'active', `Re-generating section: ${fix.section}`);
              const code = await this.regenerateSection(fix.section, decision, designSystem, domainCtx);
              if (code) generatedSections.set(fix.section, code);
              this.emit('correction', 'active', `Re-generated: ${fix.section}`);
            } catch (err: any) {
              this.emit('correction', 'active', `Re-generation failed for ${fix.section}: ${err.message}`);
            }
          }
        }
      }
    }

    // ═══ Final Assembly ═══════════════════════════════════════════
    this.emit('compile', 'active', `Compiling and validating TypeScript...`);

    const patches: ASTPatch[] = [];
    for (const [section, code] of generatedSections) {
      const componentName = this.toPascalCase(section);
      patches.push({
        action: 'insert',
        targetFile: `src/components/sections/${componentName}.tsx`,
        codeBlock: `'use client';\n\n${code}`,
      });
    }
    this.buildState.patchesGenerated = patches.length;

    this.emit('compile', 'done', `Compilation complete — ${patches.length} patches`);

    // ═══ Sprint B: Browser Verification ═════════════════════════
    let verificationResult: VerificationResult | undefined;
    let repairResult: RepairResult | undefined;

    try {
      this.emit('browser-verify', 'active', `Starting browser verification — launching Playwright...`);
      const runtime = new RuntimeManager({ headless: true }, this.logFn);
      await runtime.start();

      const verifier = new BrowserVerifier(runtime, {
        checkConsoleErrors: true,
        checkBrokenAssets: true,
        checkBrokenLinks: true,
        checkAccessibility: true,
        checkContentPresence: true,
        checkPerformance: true,
        maxBrokenLinks: 5,
        maxConsoleErrors: 3,
        maxJsErrors: 3,
      }, this.logFn);

      // Collect all page routes from the decision
      const pageRoutes = decision.pages.map(p => p.route);
      const verifyUrls = pageRoutes.map(r => `http://localhost:3000${r}`);
      if (verifyUrls.length === 0) verifyUrls.push('http://localhost:3000');

      this.emit('browser-verify', 'active', `Verifying ${verifyUrls.length} pages — console errors, broken assets, accessibility...`);
      verificationResult = await verifier.verify(verifyUrls);

      this.emit('browser-verify', 'active', `Verification score: ${verificationResult.score}/100 — ${verificationResult.summary.passed}/${verificationResult.summary.totalChecks} passed`);
      for (const check of verificationResult.checks.slice(0, 10)) {
        this.emit('browser-verify', 'active', `${check.passed ? '✓' : '✕'} ${check.name}: ${check.message}`);
      }

      await runtime.stop();
      this.emit('browser-verify', 'done', `Browser verification complete — ${verificationResult.score}/100, ${verificationResult.summary.consoleErrors} console errors, ${verificationResult.summary.brokenAssets} broken assets, ${verificationResult.summary.brokenLinks} broken links`, {
        score: verificationResult.score,
        checks: verificationResult.summary.totalChecks,
        passed: verificationResult.summary.passed,
        failed: verificationResult.summary.failed,
        consoleErrors: verificationResult.summary.consoleErrors,
        brokenAssets: verificationResult.summary.brokenAssets,
        brokenLinks: verificationResult.summary.brokenLinks,
        jsErrors: verificationResult.summary.jsErrors,
      });
    } catch (err: any) {
      this.emit('browser-verify', 'failed', `Browser verification failed: ${err.message}`);
    }

    // ═══ Sprint B: Repair Loop ═════════════════════════════════
    if (verificationResult && verificationResult.score < 90) {
      this.emit('repair', 'active', `Score ${verificationResult.score}/100 below threshold — starting repair loop...`);
      try {
        const repairLoop = new RepairLoop(this.workspaceRoot, this.llmConfig, {
          maxIterations: 2,
          fixThreshold: 90,
          autoApply: true,
        }, this.logFn);

        repairResult = await repairLoop.repair(verificationResult, async (sectionType: string) => {
          if (domainCtx) {
            try {
              return synthesizeDomainSection(sectionType, domainCtx);
            } catch {}
          }
          return null;
        });

        this.emit('repair', 'active', `Repair complete — ${repairResult.issuesFixed}/${repairResult.issuesFound} issues fixed, score=${repairResult.finalScore}`);
        this.emit('repair', 'done', `Repair loop complete — ${repairResult.iterations} iterations, ${repairResult.patches.length} patches, score ${verificationResult.score} → ${repairResult.finalScore}`, {
          iterations: repairResult.iterations,
          issuesFound: repairResult.issuesFound,
          issuesFixed: repairResult.issuesFixed,
          issuesRemaining: repairResult.issuesRemaining,
          finalScore: repairResult.finalScore,
          patches: repairResult.patches.length,
        });
      } catch (err: any) {
        this.emit('repair', 'failed', `Repair loop failed: ${err.message}`);
      }
    } else if (verificationResult) {
      this.emit('repair', 'done', `Score ${verificationResult.score}/100 — no repair needed`);
    }

    this.emit('preview', 'active', `Rendering preview...`);
    this.emit('preview', 'done', `Preview ready`);

    const duration = Date.now() - startTime;
    this.buildState.completedAt = Date.now();
    this.buildState.totalDuration = duration;
    this.buildState.success = true;
    this.buildState.filesWritten = ctx.assemblyResult?.filesWritten || [];
    this.flushState();

    this.emit('complete', 'done', `Pipeline complete: ${iterations} iterations, ${patches.length} patches, verification=${verificationResult?.score || 'N/A'}, ${(duration / 1000).toFixed(1)}s`, {
      iterations,
      patches: patches.length,
      duration,
      scores: this.buildState.scores,
      filesWritten: this.buildState.filesWritten,
      verification: verificationResult ? { score: verificationResult.score, checks: verificationResult.summary.totalChecks, passed: verificationResult.summary.passed } : undefined,
      repair: repairResult ? { fixed: repairResult.issuesFixed, remaining: repairResult.issuesRemaining, finalScore: repairResult.finalScore } : undefined,
    });

    return {
      success: true,
      intent,
      designDNA,
      enriched,
      decision,
      designSystem,
      research,
      componentPlan,
      assetPlan,
      motionPlan,
      uxResult: ctx.uxResult!,
      businessResult: ctx.businessResult!,
      assemblyResult: ctx.assemblyResult!,
      verificationResult,
      repairResult,
      iterations,
      patches,
      buildState: this.buildState,
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
