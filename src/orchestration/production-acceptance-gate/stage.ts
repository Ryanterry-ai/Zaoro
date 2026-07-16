import type { StageDefinition, StageResult, StageContext, AgentRole } from '../types.js';
import { ArtifactType } from '../types.js';
import { ProductionAcceptanceGateEngine } from './engine.js';
import type { AcceptanceGateResult } from './types.js';

export const ProductionAcceptanceGateStage: StageDefinition = {
  meta: {
    id: 'production-acceptance-gate',
    name: 'Production Acceptance Gate',
    description: 'Final gate: architecture + fulfillment + visual + experience + accessibility + performance + review',
    agentRole: 'quality-assurance' as AgentRole,
    dependencies: ['requirement-aware-self-healing', 'review-board'],
    inputs: [
      'architectureScore', 'promptFulfillment', 'capabilityCoverage',
      'visualValidation', 'experienceScore', 'accessibilityScore',
      'performanceScore', 'reviewScore',
    ],
    outputs: ['acceptanceGate'],
    estimatedDurationSec: 10,
    skippable: false,
    maxRetries: 1,
    parallelizable: false,
  },

  async execute(ctx: StageContext): Promise<StageResult> {
    const start = Date.now();

    const allArtifacts: Record<string, unknown> = {};
    for (const key of this.meta.inputs) {
      const val = ctx.getArtifact(key);
      if (val !== undefined) {
        allArtifacts[key] = val;
      }
    }

    const engine = new ProductionAcceptanceGateEngine();
    const result: AcceptanceGateResult = engine.evaluate(allArtifacts);

    ctx.setArtifact('acceptanceGate', result, ArtifactType.Json);

    return {
      success: result.overallPassed,
      artifacts: { acceptanceGate: result },
      markdown: result.summary,
      warnings: result.overallPassed
        ? []
        : [`Production acceptance gate FAILED — ${result.checks.filter((c) => c.status === 'FAIL').length} blocking issues`],
      durationMs: Date.now() - start,
      llmCalls: 0,
      tokensUsed: 0,
    };
  },

  validate(result: StageResult) {
    const gate = result.artifacts.acceptanceGate as AcceptanceGateResult | undefined;
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!gate) {
      errors.push('acceptanceGate artifact missing');
    } else {
      if (typeof gate.overallPassed !== 'boolean') {
        errors.push('acceptanceGate.overallPassed must be a boolean');
      }
      if (!Array.isArray(gate.checks) || gate.checks.length === 0) {
        errors.push('acceptanceGate.checks must be a non-empty array');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },
};
