/**
 * Blueprint Agent — deterministic business reasoning engine.
 *
 * Scope: ONE thing only — produce the application blueprint.
 * Output: BREv2Result (blueprint, decisions, constraints, confidence, pattern)
 * Runs IN PARALLEL with Content Agent (after Research).
 * Deterministic — zero LLM calls in normal path.
 *
 * Agentic loop: If confidence is low, the lead agent can re-run with
 * enriched business research to improve pattern selection.
 */

import type { IBlueprintAgent, PhaseContext, AgentResult } from '../types.js';
import { runBREV2Pipeline } from '../../../bos/bre-v2-pipeline.js';
import type { BREv2Result } from '../../../bos/bre-v2-pipeline.js';

export class BlueprintAgent implements IBlueprintAgent {
  readonly name = 'blueprint-agent';

  async run(ctx: PhaseContext): Promise<AgentResult<BREv2Result>> {
    const start = Date.now();
    let attempts = 0;

    while (true) {
      attempts++;
      try {
        // Attach business research to BRE context before running pipeline
        const enrichedContext = {
          ...ctx.breContext,
          ...(ctx.businessResearch ? { businessResearch: ctx.businessResearch } : {}),
        };

        const result = await runBREV2Pipeline(enrichedContext);

        // Validate blueprint quality
        const validation = this.validate(result);
        if (!validation.passed && attempts < ctx.maxRetries) {
          // Retry with adjusted context
          ctx.retryCount = attempts;
          continue;
        }

        return {
          status: 'completed',
          data: result,
          duration: Date.now() - start,
          attempts,
        };
      } catch (err) {
        if (attempts >= ctx.maxRetries) {
          return {
            status: 'failed',
            error: (err as Error).message,
            duration: Date.now() - start,
            attempts,
          };
        }
      }
    }
  }

  /**
   * Validate blueprint quality.
   */
  private validate(result: BREv2Result): { passed: boolean; failures: Array<{ gate: string; message: string; severity: 'error' | 'warning' }> } {
    const failures: Array<{ gate: string; message: string; severity: 'error' | 'warning' }> = [];

    // Must have a blueprint
    if (!result.blueprint) {
      failures.push({
        gate: 'blueprint.exists',
        message: 'No blueprint produced',
        severity: 'error',
      });
    }

    // Must have pages
    if (result.blueprint?.pages && result.blueprint.pages.length === 0) {
      failures.push({
        gate: 'blueprint.pages',
        message: 'Blueprint has zero pages',
        severity: 'error',
      });
    }

    // Confidence should be reasonable
    if (result.confidence < 0.3) {
      failures.push({
        gate: 'blueprint.confidence',
        message: `Low confidence: ${result.confidence}`,
        severity: 'warning',
      });
    }

    return {
      passed: failures.filter(f => f.severity === 'error').length === 0,
      failures,
    };
  }
}
