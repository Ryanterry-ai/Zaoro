import type { StageDefinition, StageResult, StageContext, AgentRole } from '../types.js';
import { ArtifactType } from '../types.js';
import { PromptFulfillmentEngine } from './engine.js';
import type { PromptFulfillmentScore } from './types.js';

export const PromptFulfillmentStage: StageDefinition = {
  meta: {
    id: 'prompt-fulfillment',
    name: 'Prompt Fulfillment',
    description: 'Score rendered output against extracted requirements',
    agentRole: 'quality-assurance' as AgentRole,
    dependencies: ['experience', 'visual-validation'],
    inputs: ['requirements.blueprint', 'renderedContent', 'blueprint'],
    outputs: ['promptFulfillment'],
    estimatedDurationSec: 15,
    skippable: false,
    maxRetries: 2,
    parallelizable: false,
  },

  async execute(ctx: StageContext): Promise<StageResult> {
    const start = Date.now();

    const requirements = ctx.getArtifact('requirements.blueprint') as
      | import('../requirement-extraction/types.js').RequirementBlueprint
      | undefined;
    const renderedContent = (ctx.getArtifact('renderedContent') || {}) as Record<string, unknown>;
    const blueprint = ctx.getArtifact('blueprint') as Record<string, unknown> | undefined;

    if (!requirements) {
      return {
        success: false,
        artifacts: {},
        warnings: ['No requirements found — cannot score fulfillment'],
        error: 'Missing requirements artifact',
        durationMs: Date.now() - start,
        llmCalls: 0,
        tokensUsed: 0,
      };
    }

    const engine = new PromptFulfillmentEngine();
    const score: PromptFulfillmentScore = engine.score(requirements, renderedContent, blueprint);

    ctx.setArtifact('promptFulfillment', score, ArtifactType.Json);

    return {
      success: score.overallStatus !== 'FAIL',
      artifacts: { promptFulfillment: score },
      markdown: score.summary,
      warnings:
        score.overallStatus === 'PARTIAL'
          ? [`Fulfillment is PARTIAL (${Math.round(score.overallScore * 100)}%)`]
          : [],
      durationMs: Date.now() - start,
      llmCalls: 0,
      tokensUsed: 0,
    };
  },

  validate(result: StageResult) {
    const score = result.artifacts.promptFulfillment as PromptFulfillmentScore | undefined;
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!score) {
      errors.push('promptFulfillment artifact missing');
    } else {
      if (typeof score.overallScore !== 'number' || score.overallScore < 0 || score.overallScore > 1) {
        errors.push('overallScore must be a number between 0 and 1');
      }
      if (!['PASS', 'FAIL', 'PARTIAL'].includes(score.overallStatus)) {
        errors.push('overallStatus must be PASS, FAIL, or PARTIAL');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },
};
