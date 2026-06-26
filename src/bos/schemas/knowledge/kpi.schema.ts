import { z } from 'zod';
import { VersionedObject, EvidenceRef } from '../common.js';

export const KPISchema = VersionedObject.extend({
  kind: z.literal('KPI'),
  name: z.string().min(1),
  description: z.string().optional(),
  formula: z.string(),
  level: z.enum(['business', 'product', 'ops']),
  unit: z.string().optional(),
  target: z.number().optional(),
  entities: z.array(z.string()).default([]),
});
export type KPI = z.infer<typeof KPISchema>;
