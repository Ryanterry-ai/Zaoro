import { z } from 'zod';

/**
 * SolutionArchitectureDecision — the BOS-side representation of a technology
 * decision. This is the canonical type consumed/produced by the adapters in
 * orchestration/adapters/index.ts (toBosSolutionArchitecture /
 * toOrchestrationSolutionArchitecture). It mirrors the orchestration-layer
 * SolutionArchitecture (owned by technology-planner) without duplicating it.
 */
export const HostingConfigSchema = z.object({
  provider: z.string(),
  region: z.string(),
  tier: z.string(),
});

export const SolutionServiceSchema = z.object({
  name: z.string(),
  type: z.string(),
  purpose: z.string(),
});

export const CostEstimateSchema = z.object({
  monthly: z.number(),
  breakdown: z.array(z.unknown()),
});

export const SolutionArchitectureDecisionSchema = z.object({
  architectureType: z.string(),
  hosting: HostingConfigSchema,
  services: z.array(SolutionServiceSchema),
  estimatedCost: CostEstimateSchema,
  confidence: z.number(),
  reasoning: z.array(z.string()),
});

export type HostingConfig = z.infer<typeof HostingConfigSchema>;
export type SolutionService = z.infer<typeof SolutionServiceSchema>;
export type CostEstimate = z.infer<typeof CostEstimateSchema>;
export type SolutionArchitectureDecision = z.infer<
  typeof SolutionArchitectureDecisionSchema
>;
