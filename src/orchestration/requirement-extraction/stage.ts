// ─── Requirement Extraction Stage ────────────────────────────────────────────
//
// Production stage that extracts requirements from the user prompt.
// Runs after project-intake (Business Intelligence) and before research.
// Output: requirements.blueprint — consumed by Prompt Fulfillment + Self-Healing.
// ─────────────────────────────────────────────────────────────────────────────

import type { StageDefinition, StageResult, StageContext, ValidationResult, AgentRole } from '../types.js';
import { extractRequirements } from './engine.js';
import type { RequirementBlueprint } from './types.js';

const META = {
  id: 'requirement-extraction',
  name: 'Requirement Extraction',
  description: 'Decompose user prompt into canonical RequirementBlueprint with categorized, owner-tagged requirements.',
  agentRole: 'quality-assurance' as AgentRole,
  dependencies: ['project-intake'],
  inputs: ['manifest'],
  outputs: ['requirements.blueprint'],
  estimatedDurationSec: 2,
  skippable: false,
  maxRetries: 1,
  parallelizable: false,
};

export class RequirementExtractionStage implements StageDefinition {
  meta = META;

  async execute(ctx: StageContext): Promise<StageResult> {
    const manifest = ctx.getArtifact<Record<string, unknown>>('manifest');
    const prompt = (manifest?.userInput as string) ?? (manifest?.description as string) ?? '';

    if (!prompt) {
      return {
        success: false,
        artifacts: {},
        warnings: [],
        error: 'No prompt found in manifest',
        durationMs: 0,
        llmCalls: 0,
        tokensUsed: 0,
      };
    }

    const blueprint = extractRequirements(prompt);

    ctx.setArtifact('requirements.blueprint', blueprint);

    ctx.log.info(
      `Extracted ${blueprint.totalRequirements} requirements ` +
      `(${blueprint.extraction.explicitCount} explicit, ${blueprint.extraction.implicitCount} implicit) ` +
      `for domain: ${blueprint.businessDomain.primary}`,
    );

    return {
      success: true,
      artifacts: { 'requirements.blueprint': blueprint },
      warnings: [],
      durationMs: blueprint.extraction.durationMs,
      llmCalls: 0,
      tokensUsed: 0,
    };
  }

  validate(result: StageResult): ValidationResult {
    const bp = result.artifacts['requirements.blueprint'] as RequirementBlueprint | undefined;
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!bp) {
      errors.push('requirements.blueprint not produced');
    } else {
      if (bp.totalRequirements === 0) {
        warnings.push('No requirements extracted — prompt may be too vague');
      }
      if (!bp.businessDomain.primary || bp.businessDomain.primary === 'general') {
        warnings.push('Business domain not confidently detected');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
