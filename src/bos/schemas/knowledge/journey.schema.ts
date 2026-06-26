import { z } from 'zod';
import { VersionedObject, EvidenceRef, InfluenceRule } from '../common.js';

export const JourneyStageSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  touchpoints: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  painPoints: z.array(z.string()).default([]),
});
export type JourneyStage = z.infer<typeof JourneyStageSchema>;

export const JourneyInfluenceRulesSchema = z.object({
  navigation: z.array(InfluenceRule).default([]),
  pages: z.array(InfluenceRule).default([]),
  permissions: z.array(InfluenceRule).default([]),
  onboarding: z.array(InfluenceRule).default([]),
  dashboard: z.array(InfluenceRule).default([]),
  automation: z.array(InfluenceRule).default([]),
});
export type JourneyInfluenceRules = z.infer<typeof JourneyInfluenceRulesSchema>;

export const JourneySchema = VersionedObject.extend({
  kind: z.literal('Journey'),
  name: z.string().min(1),
  description: z.string().optional(),
  stages: z.array(JourneyStageSchema).default([]),
  influences: JourneyInfluenceRulesSchema.default({}),
  roles: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
});
export type Journey = z.infer<typeof JourneySchema>;
