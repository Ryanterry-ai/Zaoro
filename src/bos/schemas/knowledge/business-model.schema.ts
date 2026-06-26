import { z } from 'zod';
import { VersionedObject, EvidenceRef, InfluenceRule } from '../common.js';

export const BusinessModelSchema = VersionedObject.extend({
  kind: z.literal('BusinessModel'),
  name: z.string().min(1),
  description: z.string().optional(),
  influences: z.object({
    pages: z.array(InfluenceRule).default([]),
    pricing: z.array(InfluenceRule).default([]),
    dashboards: z.array(InfluenceRule).default([]),
    kpis: z.array(InfluenceRule).default([]),
    integrations: z.array(InfluenceRule).default([]),
    workflows: z.array(InfluenceRule).default([]),
  }).default({}),
  compatibleIndustries: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
});
export type BusinessModel = z.infer<typeof BusinessModelSchema>;
