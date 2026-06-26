import { z } from 'zod';
import { VersionedObject, EvidenceRef, RuleRef } from '../common.js';

export const CapabilitySchema = VersionedObject.extend({
  kind: z.literal('Capability'),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['auth', 'data', 'ui', 'payment', 'notification', 'compliance', 'analytics', 'integration', 'content', 'commerce', 'booking', 'crm', 'kanban', 'subscription', 'membership']),
  skillPackRef: z.object({ id: z.string(), version: z.string() }).optional(),
  compatibleIndustries: z.array(z.string()).default([]),
  dependsOn: z.array(z.string()).default([]),
  generationRules: z.array(RuleRef).default([]),
});
export type Capability = z.infer<typeof CapabilitySchema>;
