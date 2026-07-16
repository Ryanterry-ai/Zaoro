import type { StageDefinition, StageResult, StageContext, AgentRole } from '../types.js';
import { ArtifactType } from '../types.js';
import { RequirementAwareSelfHealingEngine } from './engine.js';
import type { HealingPlan, HealingResult } from './types.js';

export const RequirementAwareSelfHealingStage: StageDefinition = {
  meta: {
    id: 'requirement-aware-self-healing',
    name: 'Requirement-Aware Self-Healing',
    description: 'Identify failing requirements, determine owning layer, plan targeted re-execution',
    agentRole: 'quality-assurance' as AgentRole,
    dependencies: ['prompt-fulfillment'],
    inputs: ['requirements.blueprint', 'promptFulfillment'],
    outputs: ['healingPlan', 'healingResult'],
    estimatedDurationSec: 10,
    skippable: false,
    maxRetries: 1,
    parallelizable: false,
  },

  async execute(ctx: StageContext): Promise<StageResult> {
    const start = Date.now();

    const requirements = ctx.getArtifact('requirements.blueprint') as
      | import('../requirement-extraction/types.js').RequirementBlueprint
      | undefined;
    const fulfillment = ctx.getArtifact('promptFulfillment') as
      | import('../prompt-fulfillment/types.js').PromptFulfillmentScore
      | undefined;

    if (!requirements || !fulfillment) {
      return {
        success: true,
        artifacts: {},
        warnings: ['Missing requirements or fulfillment score — skipping healing'],
        durationMs: Date.now() - start,
        llmCalls: 0,
        tokensUsed: 0,
      };
    }

    const engine = new RequirementAwareSelfHealingEngine();
    const plan: HealingPlan = engine.buildPlan(requirements, fulfillment);

    ctx.setArtifact('healingPlan', plan, ArtifactType.Json);

    let result: HealingResult | undefined;
    if (plan.stagesToReExecute.length > 0) {
      result = engine.executePlan(plan);
      ctx.setArtifact('healingResult', result, ArtifactType.Json);
    }

    return {
      success: true,
      artifacts: {
        healingPlan: plan,
        ...(result ? { healingResult: result } : {}),
      },
      markdown: plan.summary,
      warnings:
        plan.stagesToReExecute.length > 0
          ? [`Healing requires re-execution of: ${plan.stagesToReExecute.join(', ')}`]
          : [],
      durationMs: Date.now() - start,
      llmCalls: 0,
      tokensUsed: 0,
    };
  },

  validate(result: StageResult) {
    const plan = result.artifacts.healingPlan as HealingPlan | undefined;
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!plan) {
      errors.push('healingPlan artifact missing');
    } else {
      if (!Array.isArray(plan.decisions)) {
        errors.push('healingPlan.decisions must be an array');
      }
      if (!Array.isArray(plan.stagesToReExecute)) {
        errors.push('healingPlan.stagesToReExecute must be an array');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },
};
