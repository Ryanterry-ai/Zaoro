// ─── Validation Pipeline ───────────────────────────────────────────────────

import { ArtifactType } from './types.js';
import type { Artifact, StageResult, ValidationResult } from './types.js';

export interface ValidationTierConfig { id: string; name: string; description: string; required: boolean; }
export interface TierResult { tierId: string; tierName: string; passed: boolean; errors: string[]; warnings: string[]; durationMs: number; }
export interface ValidationReport { stageId: string; overallPassed: boolean; tiers: TierResult[]; totalErrors: number; totalWarnings: number; durationMs: number; }
export interface CrossStageRule { id: string; description: string; sourceStage: string; targetStage: string; validator: (src: Artifact, tgt: Artifact) => ValidationResult; }
export interface QualityGateRule { id: string; description: string; artifactKeys: string[]; validator: (arts: Artifact[]) => ValidationResult; severity: 'error' | 'warning'; }

/** Convert StageResult.artifacts Record to array of Artifact-like objects */
function artifactsToArray(artifacts: Record<string, unknown>): Artifact[] {
  return Object.entries(artifacts).map(([key, content]) => ({
    key,
    content,
    type: ArtifactType.Json,
    producedBy: '',
    createdAt: new Date().toISOString(),
    version: 1,
    hash: '',
  }));
}

function validateSchema(artifact: Artifact): ValidationResult {
  const errors: string[] = []; const warnings: string[] = [];
  if (!artifact.key) errors.push('Artifact key is required');
  if (!artifact.content) { errors.push('Artifact content is empty'); return { valid: false, errors, warnings }; }
  if (typeof artifact.content === 'string' && artifact.content.length === 0) errors.push('Artifact content is empty');
  if (!artifact.producedBy) warnings.push('Missing producedBy');
  return { valid: errors.length === 0, errors, warnings };
}

function validateSemantic(artifact: Artifact): ValidationResult {
  const errors: string[] = []; const warnings: string[] = [];
  if (!artifact.content) return { valid: false, errors: ['No content'], warnings };
  const s = typeof artifact.content === 'string' ? artifact.content : JSON.stringify(artifact.content);
  if (s.length < 10) warnings.push('Very short content');
  for (const ph of ['TODO', 'FIXME', 'TBD', 'PLACEHOLDER', 'XXX']) { if (s.toUpperCase().includes(ph)) warnings.push(`Placeholder: ${ph}`); }
  return { valid: errors.length === 0, errors, warnings };
}

const DEFAULT_CROSS_STAGE_RULES: CrossStageRule[] = [{
  id: 'api-references-db', description: 'API should reference DB entities', sourceStage: 'database-design', targetStage: 'api-design',
  validator: (src, tgt) => ({ valid: true, errors: [], warnings: (src.content && tgt.content) ? [] : ['Empty artifacts'] }),
}];

const DEFAULT_QUALITY_RULES: QualityGateRule[] = [{
  id: 'no-placeholder', description: 'No placeholder content', artifactKeys: ['architecture.system', 'database.schema', 'api.endpoints'],
  validator: (arts) => {
    const errors: string[] = []; const warnings: string[] = [];
    for (const a of arts) { const c = typeof a.content === 'string' ? a.content : JSON.stringify(a.content); if (c.includes('TODO') || c.includes('PLACEHOLDER')) errors.push(`${a.key} has placeholder`); }
    return { valid: errors.length === 0, errors, warnings };
  }, severity: 'error',
}];

const DEFAULT_TIERS: ValidationTierConfig[] = [
  { id: 'schema', name: 'Schema Validation', description: 'Structure', required: true },
  { id: 'semantic', name: 'Semantic Validation', description: 'Quality', required: true },
  { id: 'cross-stage', name: 'Cross-Stage', description: 'Consistency', required: false },
  { id: 'quality-gate', name: 'Quality Gate', description: 'Rules', required: false },
];

export class ValidationPipeline {
  private tiers: ValidationTierConfig[];
  private crossStageRules: CrossStageRule[];
  private qualityRules: QualityGateRule[];

  constructor(opts?: { tiers?: ValidationTierConfig[]; crossStageRules?: CrossStageRule[]; qualityRules?: QualityGateRule[] }) {
    this.tiers = opts?.tiers ?? DEFAULT_TIERS;
    this.crossStageRules = opts?.crossStageRules ?? DEFAULT_CROSS_STAGE_RULES;
    this.qualityRules = opts?.qualityRules ?? DEFAULT_QUALITY_RULES;
  }

  validate(stageId: string, result: StageResult, priorArtifacts: Map<string, Artifact>): ValidationReport {
    const t0 = Date.now(); const tierResults: TierResult[] = [];
    const artifactList = artifactsToArray(result.artifacts);
    for (const tier of this.tiers) {
      const t1 = Date.now(); let tr: TierResult;
      switch (tier.id) {
        case 'schema': tr = this.runSchema(artifactList); break;
        case 'semantic': tr = this.runSemantic(artifactList); break;
        case 'cross-stage': tr = this.runCrossStage(stageId, artifactList, priorArtifacts); break;
        case 'quality-gate': tr = this.runQualityGate(priorArtifacts); break;
        default: tr = { tierId: tier.id, tierName: tier.name, passed: true, errors: [], warnings: [], durationMs: 0 };
      }
      tr.durationMs = Date.now() - t1; tierResults.push(tr);
      if (tier.required && !tr.passed) break;
    }
    const totalErrors = tierResults.reduce((s, t) => s + t.errors.length, 0);
    const totalWarnings = tierResults.reduce((s, t) => s + t.warnings.length, 0);
    return { stageId, overallPassed: totalErrors === 0, tiers: tierResults, totalErrors, totalWarnings, durationMs: Date.now() - t0 };
  }

  private runSchema(artifacts: Artifact[]): TierResult {
    const errors: string[] = []; const warnings: string[] = [];
    for (const a of artifacts) { const v = validateSchema(a); errors.push(...v.errors.map(e => `[${a.key}] ${e}`)); warnings.push(...v.warnings.map(w => `[${a.key}] ${w}`)); }
    return { tierId: 'schema', tierName: 'Schema', passed: errors.length === 0, errors, warnings, durationMs: 0 };
  }

  private runSemantic(artifacts: Artifact[]): TierResult {
    const errors: string[] = []; const warnings: string[] = [];
    for (const a of artifacts) { const v = validateSemantic(a); errors.push(...v.errors.map(e => `[${a.key}] ${e}`)); warnings.push(...v.warnings.map(w => `[${a.key}] ${w}`)); }
    return { tierId: 'semantic', tierName: 'Semantic', passed: errors.length === 0, errors, warnings, durationMs: 0 };
  }

  private runCrossStage(stageId: string, artifacts: Artifact[], prior: Map<string, Artifact>): TierResult {
    const errors: string[] = []; const warnings: string[] = [];
    for (const rule of this.crossStageRules.filter(r => r.targetStage === stageId)) {
      const src = prior.get(rule.sourceStage); if (!src) continue;
      for (const tgt of artifacts) { const v = rule.validator(src, tgt); errors.push(...v.errors.map(e => `[${rule.id}] ${e}`)); warnings.push(...v.warnings.map(w => `[${rule.id}] ${w}`)); }
    }
    return { tierId: 'cross-stage', tierName: 'Cross-Stage', passed: errors.length === 0, errors, warnings, durationMs: 0 };
  }

  private runQualityGate(allArtifacts: Map<string, Artifact>): TierResult {
    const errors: string[] = []; const warnings: string[] = [];
    for (const rule of this.qualityRules) {
      const relevant = rule.artifactKeys.map(k => allArtifacts.get(k)).filter((a): a is Artifact => a !== undefined);
      if (relevant.length === 0) continue;
      const v = rule.validator(relevant);
      if (rule.severity === 'error') errors.push(...v.errors.map(e => `[${rule.id}] ${e}`));
      warnings.push(...v.warnings.map(w => `[${rule.id}] ${w}`));
    }
    return { tierId: 'quality-gate', tierName: 'Quality Gate', passed: errors.length === 0, errors, warnings, durationMs: 0 };
  }

  addCrossStageRule(rule: CrossStageRule): void { this.crossStageRules.push(rule); }
  addQualityRule(rule: QualityGateRule): void { this.qualityRules.push(rule); }
  getRules() { return { crossStage: [...this.crossStageRules], quality: [...this.qualityRules] }; }
}

export function createValidationPipeline(opts?: ConstructorParameters<typeof ValidationPipeline>[0]): ValidationPipeline {
  return new ValidationPipeline(opts);
}
