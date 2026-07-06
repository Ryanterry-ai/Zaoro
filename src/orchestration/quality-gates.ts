// ─── Quality Gates ────────────────────────────────────────────────────────────
//
// Validates artifact quality between stages. Downstream stages consume
// only verified outputs rather than raw LLM responses.
//
// Gates can be:
//   - Automatic: schema validation, required fields, type checks
//   - Human-in-the-loop: approval required before proceeding
//   - Blocking: pipeline stops until gate passes
//   - Non-blocking: warnings only, pipeline continues
//
// Each gate runs after a specific stage and validates specific artifacts.
// ──────────────────────────────────────────────────────────────────────────────

import type {
  QualityGate,
  QualityGateRule,
  GateResult,
  HumanApproval,
  ArtifactMeta,
} from './types.js';
import { ArtifactStore } from './artifact-store.js';

// ─── Built-in Validators ──────────────────────────────────────────────────────

type Validator = (content: unknown, artifactKey: string) => { valid: boolean; message: string };

const VALIDATORS: Record<string, Validator> = {
  'required-fields': (content, key) => {
    if (content === undefined || content === null) {
      return { valid: false, message: `Artifact "${key}" is missing or null` };
    }
    return { valid: true, message: `Artifact "${key}" exists` };
  },

  'non-empty-object': (content, key) => {
    if (typeof content !== 'object' || content === null || Array.isArray(content)) {
      return { valid: false, message: `Artifact "${key}" must be a non-null object` };
    }
    if (Object.keys(content).length === 0) {
      return { valid: false, message: `Artifact "${key}" is an empty object` };
    }
    return { valid: true, message: `Artifact "${key}" has content` };
  },

  'non-empty-array': (content, key) => {
    if (!Array.isArray(content)) {
      return { valid: false, message: `Artifact "${key}" must be an array` };
    }
    if (content.length === 0) {
      return { valid: false, message: `Artifact "${key}" is an empty array` };
    }
    return { valid: true, message: `Artifact "${key}" has ${content.length} items` };
  },

  'has-id-field': (content, key) => {
    if (typeof content !== 'object' || content === null) {
      return { valid: false, message: `Artifact "${key}" must be an object` };
    }
    const obj = content as Record<string, unknown>;
    if (!obj.id && !obj.name && !obj.title) {
      return { valid: false, message: `Artifact "${key}" must have an id, name, or title field` };
    }
    return { valid: true, message: `Artifact "${key}" has identifier` };
  },

  'schema-valid': (content, key) => {
    // Basic JSON schema validation
    if (content === undefined || content === null) {
      return { valid: false, message: `Artifact "${key}" is null or undefined` };
    }
    if (typeof content === 'string' && content.length === 0) {
      return { valid: false, message: `Artifact "${key}" is an empty string` };
    }
    return { valid: true, message: `Artifact "${key}" is valid` };
  },

  'no-placeholders': (content, key) => {
    const str = typeof content === 'string' ? content : JSON.stringify(content);
    const placeholders = ['TODO', 'FIXME', 'PLACEHOLDER', 'XXX', 'LOREM', 'IPSUM'];
    const found = placeholders.filter(p => str.toUpperCase().includes(p));
    if (found.length > 0) {
      return { valid: false, message: `Artifact "${key}" contains placeholder content: ${found.join(', ')}` };
    }
    return { valid: true, message: `Artifact "${key}" has no placeholders` };
  },

  'has-description': (content, key) => {
    if (typeof content !== 'object' || content === null) {
      return { valid: true, message: 'N/A' };
    }
    const obj = content as Record<string, unknown>;
    if (!obj.description && !obj.summary && !obj.overview) {
      return { valid: false, message: `Artifact "${key}" should have a description, summary, or overview field` };
    }
    return { valid: true, message: `Artifact "${key}" has description` };
  },
};

// ─── Default Quality Gates ────────────────────────────────────────────────────

export const DEFAULT_QUALITY_GATES: QualityGate[] = [
  {
    id: 'gate-after-intake',
    name: 'Manifest Validation',
    afterStage: 'project-intake',
    rules: [
      { id: 'manifest-exists', description: 'Manifest artifact exists', artifactKeys: ['manifest'], validator: 'required-fields', severity: 'error' },
      { id: 'manifest-has-name', description: 'Manifest has a name', artifactKeys: ['manifest'], validator: 'has-id-field', severity: 'error' },
      { id: 'manifest-valid', description: 'Manifest is a valid object', artifactKeys: ['manifest'], validator: 'non-empty-object', severity: 'error' },
    ],
    blocking: true,
    requiresApproval: false,
  },
  {
    id: 'gate-after-research',
    name: 'Research Quality',
    afterStage: 'research',
    rules: [
      { id: 'research-exists', description: 'Domain research exists', artifactKeys: ['research.domain'], validator: 'non-empty-object', severity: 'error' },
      { id: 'competitive-exists', description: 'Competitive analysis exists', artifactKeys: ['research.competitive'], validator: 'non-empty-object', severity: 'warning' },
    ],
    blocking: true,
    requiresApproval: false,
  },
  {
    id: 'gate-after-requirements',
    name: 'Requirements Completeness',
    afterStage: 'business-analysis',
    rules: [
      { id: 'req-has-features', description: 'Features list is not empty', artifactKeys: ['features'], validator: 'non-empty-array', severity: 'error' },
      { id: 'req-has-stories', description: 'User stories exist', artifactKeys: ['requirements'], validator: 'non-empty-object', severity: 'warning' },
      { id: 'req-no-placeholders', description: 'No placeholder content', artifactKeys: ['requirements'], validator: 'no-placeholders', severity: 'warning' },
    ],
    blocking: true,
    requiresApproval: false,
  },
  {
    id: 'gate-after-architecture',
    name: 'Architecture Validation',
    afterStage: 'architecture',
    rules: [
      { id: 'arch-exists', description: 'Architecture document exists', artifactKeys: ['architecture.system'], validator: 'non-empty-object', severity: 'error' },
      { id: 'tech-stack-exists', description: 'Tech stack is defined', artifactKeys: ['architecture.tech-stack'], validator: 'non-empty-object', severity: 'error' },
      { id: 'arch-has-description', description: 'Architecture has description', artifactKeys: ['architecture.system'], validator: 'has-description', severity: 'warning' },
    ],
    blocking: true,
    requiresApproval: true,
  },
  {
    id: 'gate-after-api',
    name: 'API Design Validation',
    afterStage: 'api-design',
    rules: [
      { id: 'api-has-endpoints', description: 'Endpoints list is not empty', artifactKeys: ['api.endpoints'], validator: 'non-empty-array', severity: 'error' },
      { id: 'api-has-auth', description: 'Auth design exists', artifactKeys: ['api.auth'], validator: 'non-empty-object', severity: 'warning' },
    ],
    blocking: true,
    requiresApproval: false,
  },
  {
    id: 'gate-after-frontend',
    name: 'Frontend Design Validation',
    afterStage: 'frontend-design',
    rules: [
      { id: 'fe-has-pages', description: 'Pages list is not empty', artifactKeys: ['frontend.pages'], validator: 'non-empty-array', severity: 'error' },
      { id: 'fe-has-tokens', description: 'Design tokens exist', artifactKeys: ['frontend.design-tokens'], validator: 'non-empty-object', severity: 'warning' },
    ],
    blocking: true,
    requiresApproval: false,
  },
];

// ─── Quality Gate Runner ──────────────────────────────────────────────────────

export class QualityGateRunner {
  private gates: QualityGate[];
  private artifactStore: ArtifactStore;
  private approvalHandler?: ((approval: HumanApproval) => Promise<HumanApproval>) | undefined;

  constructor(
    gates: QualityGate[],
    artifactStore: ArtifactStore,
    approvalHandler?: (approval: HumanApproval) => Promise<HumanApproval>,
  ) {
    this.gates = gates;
    this.artifactStore = artifactStore;
    this.approvalHandler = approvalHandler;
  }

  /**
   * Run all quality gates that apply after a given stage.
   */
  async runGates(afterStageId: string): Promise<GateResult[]> {
    const applicableGates = this.gates.filter(g => g.afterStage === afterStageId);
    const results: GateResult[] = [];

    for (const gate of applicableGates) {
      const result = await this.runGate(gate);
      results.push(result);

      // If blocking gate fails, stop
      if (gate.blocking && !result.passed) {
        break;
      }
    }

    return results;
  }

  /**
   * Run a single quality gate.
   */
  async runGate(gate: QualityGate): Promise<GateResult> {
    const ruleResults: GateResult['ruleResults'] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const rule of gate.rules) {
      const result = this.runRule(rule);
      ruleResults.push(result);

      if (!result.passed) {
        if (rule.severity === 'error') {
          errors.push(result.message);
        } else {
          warnings.push(result.message);
        }
      }
    }

    const passed = errors.length === 0;
    let approvalPending = false;

    // Request human approval if required and gate passed
    if (gate.requiresApproval && passed && this.approvalHandler) {
      const approval: HumanApproval = {
        id: `approval-${gate.id}-${Date.now()}`,
        stageId: gate.afterStage,
        description: `Quality gate "${gate.name}" passed. Review artifacts before proceeding.`,
        artifactKeys: gate.rules.flatMap(r => r.artifactKeys),
        status: 'pending',
      };

      const decided = await this.approvalHandler(approval);
      if (decided.status === 'rejected') {
        errors.push(`Human rejected: ${decided.feedback ?? 'No feedback provided'}`);
        approvalPending = false;
      } else {
        approvalPending = false;
      }
    }

    return {
      gateId: gate.id,
      passed: errors.length === 0,
      ruleResults,
      warnings,
      errors,
      approvalPending,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Run a single validation rule.
   */
  private runRule(rule: QualityGateRule): GateResult['ruleResults'][number] {
    const validator = VALIDATORS[rule.validator];
    if (!validator) {
      return {
        ruleId: rule.id,
        passed: false,
        message: `Unknown validator: ${rule.validator}`,
      };
    }

    // Check all artifact keys for this rule
    for (const key of rule.artifactKeys) {
      const content = this.artifactStore.read(key);
      const result = validator(content, key);
      if (!result.valid) {
        return {
          ruleId: rule.id,
          passed: false,
          message: result.message,
        };
      }
    }

    return {
      ruleId: rule.id,
      passed: true,
      message: `All ${rule.artifactKeys.length} artifact(s) passed "${rule.description}"`,
    };
  }

  /**
   * Format gate results as a readable report.
   */
  formatResults(results: GateResult[]): string {
    const lines: string[] = ['## Quality Gate Results\n'];

    for (const result of results) {
      const icon = result.passed ? '✓' : '✗';
      lines.push(`### ${icon} ${result.gateId}\n`);

      for (const rule of result.ruleResults) {
        const ruleIcon = rule.passed ? '✓' : '✗';
        lines.push(`  ${ruleIcon} ${rule.message}`);
      }

      if (result.warnings.length > 0) {
        lines.push('\n  Warnings:');
        for (const w of result.warnings) {
          lines.push(`    ⚠ ${w}`);
        }
      }

      if (result.errors.length > 0) {
        lines.push('\n  Errors:');
        for (const e of result.errors) {
          lines.push(`    ✗ ${e}`);
        }
      }

      lines.push('');
    }

    return lines.join('\n');
  }
}
