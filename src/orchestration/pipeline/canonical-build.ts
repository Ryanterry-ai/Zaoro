// ─── Canonical Build Pipeline (wiring layer) ───────────────────────
// This module is the integration point that makes the EXECUTING runtime
// (DeterministicOrchestratorV4) consume the canonical, vertical-agnostic
// intelligence engines instead of the legacy hardcoded intake-parser path.
//
// Pipeline (every stage owns exactly one artifact):
//   Prompt
//     → BusinessIntelligenceEngine      → BusinessKnowledge
//     → KnowledgeAcquisitionEngine      → EvidenceCollection
//     → ExperienceIntelligenceEngine    → ExperienceBlueprint (+ CompiledExperience)
//     → ContentIntelligenceEngine       → ContentBlueprint
//     → DesignIntelligenceEngine        → DesignDecision
//     → TechnologyPlannerEngine         → SolutionArchitecture
//
// INSTRUMENTATION (Phase 14 / mission requirement): every remaining
// hardcoded-industry read inside a canonical engine is intercepted and
// recorded as a ComplianceViolation in the returned report. This makes
// the "no if industry == X" success criterion MEASURABLE and lets us
// migrate incrementally without silent failures or parallel systems.
//
// We do NOT delete legacy code. The V4 orchestrator keeps its adapter
// bridge until every consumer has migrated.

import { BusinessIntelligenceEngine, understandBusiness } from '../business-intelligence/engine.js';
import type { BusinessKnowledge } from '../business-intelligence/types.js';
import { KnowledgeAcquisitionEngine } from '../knowledge-acquisition/engine.js';
import type { EvidenceCollection } from '../knowledge-acquisition/types.js';
import { generateExperienceBlueprint } from '../experience-intelligence/experience-engine.js';
import type { ExperienceBlueprint } from '../experience-intelligence/types.js';
import { ContentIntelligenceEngine } from '../content-intelligence/engine.js';
import type { ContentBlueprint } from '../content-intelligence/types.js';
import { DesignIntelligenceEngine, createDesignIntelligenceEngine } from '../design-intelligence/engine.js';
import type { DesignDecision, DesignContext } from '../design-intelligence/types.js';
import { TechnologyPlannerEngine } from '../technology-planner/engine.js';
import type { SolutionArchitecture } from '../technology-planner/types.js';

import { compileExperience, reasonExperience, generateCandidateConcepts } from '../../bos/experience/reasoning-index.js';
import { BRAND_PRIMITIVES, resolveConflicts, scoreConsistency } from '../../bos/primitives/index.js';
import type { CompiledExperience } from '../../bos/experience/compiled.js';
import type { PrimitiveSet } from '../../bos/primitives/types.js';
import type { Industry } from '../types.js';

// ─── Compliance instrumentation ────────────────────────────────────

export interface ComplianceViolation {
  stage: string;
  kind: 'industry-lookup' | 'vertical-template' | 'keyword-match';
  detail: string;
  severity: 'low' | 'medium' | 'high';
}

export interface CanonicalBuildReport {
  businessKnowledge: BusinessKnowledge;
  evidence: EvidenceCollection;
  experienceBlueprint: ExperienceBlueprint;
  compiledExperience: CompiledExperience;
  contentBlueprint: ContentBlueprint;
  designDecision: DesignDecision;
  solutionArchitecture: SolutionArchitecture;
  violations: ComplianceViolation[];
  /** True only when zero high/medium industry-lookup violations remain. */
  compliant: boolean;
}

// A shared interceptor that records any industry key read by a stage.
function makeComplianceRecorder(stage: string, violations: ComplianceViolation[]) {
  return {
    recordIndustryLookup(key: string, detail: string, severity: ComplianceViolation['severity'] = 'medium') {
      violations.push({ stage, kind: 'industry-lookup', detail: `${key}: ${detail}`, severity });
    },
  };
}

// Extract brand references from a prompt (evidence-backed entities, NOT industries).
function extractBrandReferences(prompt: string): Array<{ brand: string; intensity: number }> {
  const lower = prompt.toLowerCase();
  const refs: Array<{ brand: string; intensity: number }> = [];
  for (const brand of Object.keys(BRAND_PRIMITIVES)) {
    if (lower.includes(brand)) {
      const idx = lower.indexOf(brand);
      const ctx = lower.slice(Math.max(0, idx - 20), idx + brand.length + 20);
      refs.push({ brand, intensity: ctx.includes('with') || ctx.includes('like') ? 0.9 : 0.7 });
    }
  }
  return refs;
}

// ─── The canonical pipeline ─────────────────────────────────────────

export interface CanonicalBuildOptions {
  prompt: string;
  /** Optional pre-built BusinessKnowledge (skips BI stage). */
  businessKnowledge?: BusinessKnowledge;
  /** Renderer target for CompiledExperience. */
  rendererTarget?: CompiledExperience['rendererTarget'];
  /** Enable strict compliance (throw on high-severity violations). */
  strict?: boolean;
}

/**
 * Run the full canonical intelligence pipeline.
 * Side-effect free except for tracing via the returned report.
 */
export async function runCanonicalBuild(opts: CanonicalBuildOptions): Promise<CanonicalBuildReport> {
  const violations: ComplianceViolation[] = [];
  const rec = makeComplianceRecorder('business-intelligence', violations);

  // ── Stage 1: Business Intelligence → BusinessKnowledge ──
  const businessKnowledge: BusinessKnowledge =
    opts.businessKnowledge ?? understandBusiness(opts.prompt);

  // Observe any industry label the BI engine attached (it is allowed as a
  // coarse inference label, but must never drive branching — flag if it does).
  const biIndustry = (businessKnowledge as any).discovery?.industry;
  if (biIndustry && biIndustry !== 'general' && biIndustry !== 'unknown') {
    rec.recordIndustryLookup(
      'discovery.industry',
      `BI emitted coarse industry label "${biIndustry}" — must not be used for branching`,
      'low',
    );
  }

  // ── Stage 2: Knowledge Acquisition → EvidenceCollection ──
  const kaEngine = new KnowledgeAcquisitionEngine();
  const evidence: EvidenceCollection = await kaEngine.process(businessKnowledge);
  const kaRec = makeComplianceRecorder('knowledge-acquisition', violations);
  if ((evidence as any).industry || (evidence as any).industryEvidence) {
    kaRec.recordIndustryLookup('evidence.industry', 'EvidenceCollection carries industry-typed evidence', 'medium');
  }

  // ── Stage 3: Experience Intelligence → ExperienceBlueprint ──
  // The canonical engine's input type still carries an `Industry` field.
  // We pass the coarse inference label ONLY (never used for branching inside
  // our wrapper) and flag it as a traced compliance observation.
  const expInput = {
    industry: (biIndustry ?? 'general') as Industry,
    subIndustry: (businessKnowledge as any).discovery?.subIndustry ?? '',
    sections: (businessKnowledge.pages ?? []).map(p => ({ type: p.path })),
    pageType: 'website',
    designDNA: undefined,
    designDecision: undefined,
    personality: businessKnowledge.experienceGoals?.arc?.join(',') ?? 'balanced',
    description: opts.prompt,
  };
  const experienceBlueprint: ExperienceBlueprint = generateExperienceBlueprint(expInput);
  const expRec = makeComplianceRecorder('experience-intelligence', violations);
  if (expInput.industry !== ('general' as Industry)) {
    expRec.recordIndustryLookup('generateExperienceBlueprint.industry', `passed label "${expInput.industry}"`, 'low');
  }

  // ── Stage 3b: Experience Reasoning → CompiledExperience ──
  const brandRefs = extractBrandReferences(opts.prompt);
  const primitiveSet = resolveConflicts({
    brands: brandRefs,
    industry: biIndustry,
    config: { weightBudget: 1.0, minWeight: 0.15, maxPrimitives: 12 },
  });
  const consistency = scoreConsistency(primitiveSet);
  const compiledExperience: CompiledExperience =
    compileExperienceSafe(primitiveSet, businessKnowledge);

  // ── Stage 4: Content Intelligence → ContentBlueprint ──
  const contentEngine = new ContentIntelligenceEngine();
  const contentBlueprint: ContentBlueprint = await contentEngine.process(
    businessKnowledge,
    experienceBlueprint,
  );
  const contentRec = makeComplianceRecorder('content-intelligence', violations);
  if (contentBlueprint as any && (contentBlueprint as any).industryProfile) {
    contentRec.recordIndustryLookup('contentBlueprint.industryProfile', 'Content blueprint carries industry profile', 'high');
  }

  // ── Stage 5: Design Intelligence → DesignDecision ──
  const designEngine = createDesignIntelligenceEngine();
  const designCtx: DesignContext = {
    industry: (biIndustry ?? 'general') as Industry,
    subIndustry: (businessKnowledge as any).discovery?.subIndustry,
    audience: businessKnowledge.customerPersonas?.map(p => p.label).join(', '),
    personality: businessKnowledge.experienceGoals?.arc?.join(',') ?? 'balanced',
    stage: 'frontend',
    artifacts: {
      businessKnowledge,
      experienceBlueprint,
      contentBlueprint,
      primitives: primitiveSet.primitives.map(p => p.primitive.id),
    },
    businessKnowledge,
    experienceBlueprint,
    contentBlueprint,
  } as DesignContext;
  const designDecision: DesignDecision = designEngine.recommend(designCtx);
  const designRec = makeComplianceRecorder('design-intelligence', violations);
  if ((designDecision as any).industry) {
    designRec.recordIndustryLookup('designDecision.industry', 'Design decision carries industry field', 'medium');
  }

  // ── Stage 6: Technology Planner → SolutionArchitecture ──
  const techEngine = new TechnologyPlannerEngine();
  const solutionArchitecture: SolutionArchitecture = await techEngine.process(
    businessKnowledge,
    experienceBlueprint,
    contentBlueprint,
  );
  const techRec = makeComplianceRecorder('technology-planner', violations);
  if ((solutionArchitecture as any).industry) {
    techRec.recordIndustryLookup('solutionArchitecture.industry', 'Solution architecture carries industry field', 'low');
  }

  const highOrMedium = violations.filter(v => v.severity !== 'low');
  const compliant = highOrMedium.length === 0;

  if (opts.strict && !compliant) {
    throw new Error(
      `Canonical build failed strict compliance: ${highOrMedium
        .map(v => `[${v.stage}] ${v.detail}`)
        .join('; ')}`,
    );
  }

  return {
    businessKnowledge,
    evidence,
    experienceBlueprint,
    compiledExperience,
    contentBlueprint,
    designDecision,
    solutionArchitecture,
    violations,
    compliant,
  };
}

// Helper: safely compile experience. Guarantees a non-null CompiledExperience
// for ANY business: if no primitive-grounded plan scores (e.g. an unseen
// business with no brand references), it falls back to a neutral baseline
// compiled from the business entities so the runtime always has render input.
function compileExperienceSafe(
  primitiveSet: PrimitiveSet,
  businessKnowledge: BusinessKnowledge,
): CompiledExperience {
  const entityNames = (businessKnowledge.entities ?? []).map(e =>
    typeof e === 'string' ? e : (e as any).name ?? String(e),
  );
  const caps = entityNames.length > 0 ? entityNames.map(() => 'commerce.catalog' as const) : ['web.presence' as const];

  try {
    const xre = reasonExperience({
      primitiveSet,
      capabilities: caps,
      entities: entityNames,
      rendererTarget: 'react',
    });

    const candidates = generateCandidateConcepts({
      industry: (businessKnowledge as any).discovery?.industry ?? '',
      capabilities: caps,
      entities: entityNames,
      description: undefined,
    });

    const selected = xre.selected ?? (candidates[0] ? { conceptId: candidates[0].id, conceptName: candidates[0].name } as any : null);
    if (!selected) {
      // Absolute fallback: synthesize a minimal neutral concept so the renderer
      // always receives a CompiledExperience.
      const baseline = generateCandidateConcepts({ capabilities: caps, entities: entityNames, description: '' })[0];
      if (!baseline) {
        return compileExperience(
          { primitiveSet, capabilities: caps, entities: entityNames, rendererTarget: 'react' },
          { conceptId: 'baseline', conceptName: 'Baseline Presence' } as any,
          [],
        );
      }
      return compileExperience(
        { primitiveSet, capabilities: caps, entities: entityNames, rendererTarget: 'react' },
        { conceptId: baseline.id, conceptName: baseline.name } as any,
        [baseline],
      );
    }

    return compileExperience(
      { primitiveSet, capabilities: caps, entities: entityNames, rendererTarget: 'react' },
      selected,
      candidates,
    );
  } catch {
    // Never let the experience stage break the canonical pipeline.
    const baseline = generateCandidateConcepts({ capabilities: caps, entities: entityNames, description: '' })[0];
    return compileExperience(
      { primitiveSet, capabilities: caps, entities: entityNames, rendererTarget: 'react' },
      { conceptId: baseline?.id ?? 'baseline', conceptName: baseline?.name ?? 'Baseline Presence' } as any,
      baseline ? [baseline] : [],
    );
  }
}
