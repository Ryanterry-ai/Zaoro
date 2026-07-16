import type { RequirementBlueprint } from '../requirement-extraction/types.js';
import type { PromptFulfillmentScore, RequirementFulfillment } from '../prompt-fulfillment/types.js';
import type {
  HealingDecision,
  HealingPlan,
  HealingResult,
  LayerOwnerMapping,
} from './types.js';

const LAYER_STAGE_MAP: LayerOwnerMapping[] = [
  { layer: 'business-intelligence', stageIds: ['business-analysis'], requirements: ['industry', 'market', 'audience'] },
  { layer: 'knowledge-acquisition', stageIds: ['research'], requirements: ['competitor', 'trend', 'benchmark'] },
  { layer: 'content', stageIds: ['architecture'], requirements: ['content', 'copy', 'text', 'blog'] },
  { layer: 'experience', stageIds: ['frontend-design'], requirements: ['ui', 'ux', 'design', 'layout', 'visual'] },
  { layer: 'technology', stageIds: ['database-design', 'api-design'], requirements: ['database', 'api', 'auth', 'integration'] },
  { layer: 'rendering', stageIds: ['code-writer', 'build'], requirements: ['responsive', 'performance', 'accessibility', 'seo'] },
];

export class RequirementAwareSelfHealingEngine {
  buildPlan(
    requirements: RequirementBlueprint,
    fulfillmentScore: PromptFulfillmentScore,
  ): HealingPlan {
    const failedRequirements = fulfillmentScore.requirementFulfillments.filter(
      (f) => f.status === 'FAIL' || f.status === 'PARTIAL',
    );

    if (failedRequirements.length === 0) {
      return {
        decisions: [],
        stagesToReExecute: [],
        requirementsToAddress: [],
        summary: 'All requirements fulfilled — no healing needed',
      };
    }

    const decisions = failedRequirements.map((f) => this.decide(f));
    const stageSet = new Set<string>();
    for (const d of decisions) {
      if (d.action === 're-execute-layer' || d.action === 're-execute-downstream') {
        for (const s of d.targetStages) {
          stageSet.add(s);
        }
      }
    }

    const stagesToReExecute = Array.from(stageSet);
    const requirementsToAddress = failedRequirements.map((f) => f.requirementId);

    return {
      decisions,
      stagesToReExecute,
      requirementsToAddress,
      summary: this.buildPlanSummary(decisions, stagesToReExecute),
    };
  }

  private decide(fulfillment: RequirementFulfillment): HealingDecision {
    const mapping = this.findOwnerMapping(fulfillment);
    const owner = mapping?.layer || fulfillment.owner;
    const targetStages = mapping?.stageIds || [];

    if (fulfillment.priority === 'nice') {
      return {
        requirementId: fulfillment.requirementId,
        description: fulfillment.description,
        owner,
        action: 'skip',
        targetStages,
        reason: 'Nice-to-have requirement can be deferred',
      };
    }

    if (targetStages.length === 0) {
      return {
        requirementId: fulfillment.requirementId,
        description: fulfillment.description,
        owner,
        action: 'abort',
        targetStages,
        reason: `No stage mapping found for owner "${owner}" — cannot auto-heal`,
      };
    }

    if (fulfillment.status === 'PARTIAL') {
      return {
        requirementId: fulfillment.requirementId,
        description: fulfillment.description,
        owner,
        action: 're-execute-layer',
        targetStages,
        reason: `Partial fulfillment — re-executing layer "${owner}" may complete it`,
      };
    }

    return {
      requirementId: fulfillment.requirementId,
      description: fulfillment.description,
      owner,
      action: 're-execute-downstream',
      targetStages,
      reason: `Failed requirement in layer "${owner}" — re-executing layer + downstream`,
    };
  }

  private findOwnerMapping(
    fulfillment: RequirementFulfillment,
  ): LayerOwnerMapping | undefined {
    return LAYER_STAGE_MAP.find((m) =>
      m.requirements.some((r) =>
        fulfillment.description.toLowerCase().includes(r) ||
        fulfillment.category.toLowerCase().includes(r),
      ),
    );
  }

  private buildPlanSummary(
    decisions: HealingDecision[],
    stagesToReExecute: string[],
  ): string {
    const lines = [
      `## Requirement-Aware Self-Healing Plan`,
      ``,
      `**Failed/Partial Requirements:** ${decisions.length}`,
      `**Stages to Re-Execute:** ${stagesToReExecute.length > 0 ? stagesToReExecute.join(', ') : 'none'}`,
      ``,
    ];

    for (const d of decisions) {
      const icon = d.action === 'skip' ? '⏭' : d.action === 'abort' ? '🚫' : '🔧';
      lines.push(`${icon} **${d.requirementId}** → ${d.action} (${d.owner})`);
      lines.push(`  ${d.reason}`);
    }

    return lines.join('\n');
  }

  executePlan(plan: HealingPlan): HealingResult {
    if (plan.stagesToReExecute.length === 0) {
      return {
        plan,
        executed: false,
        stagesReExecuted: [],
        requirementsImproved: [],
        requirementsStillFailed: plan.requirementsToAddress,
        durationMs: 0,
      };
    }

    return {
      plan,
      executed: true,
      stagesReExecuted: plan.stagesToReExecute,
      requirementsImproved: [],
      requirementsStillFailed: plan.requirementsToAddress,
      durationMs: 0,
    };
  }
}
