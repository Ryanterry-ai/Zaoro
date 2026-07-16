import type { RequirementFulfillment } from '../prompt-fulfillment/types.js';

export type HealingAction = 're-execute-layer' | 're-execute-downstream' | 'skip' | 'abort';

export interface LayerOwnerMapping {
  layer: string;
  stageIds: string[];
  requirements: string[];
}

export interface HealingDecision {
  requirementId: string;
  description: string;
  owner: string;
  action: HealingAction;
  targetStages: string[];
  reason: string;
}

export interface HealingPlan {
  decisions: HealingDecision[];
  stagesToReExecute: string[];
  requirementsToAddress: string[];
  summary: string;
}

export interface HealingResult {
  plan: HealingPlan;
  executed: boolean;
  stagesReExecuted: string[];
  requirementsImproved: string[];
  requirementsStillFailed: string[];
  durationMs: number;
}
