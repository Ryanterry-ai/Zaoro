import { z } from 'zod';
import { VersionedObject, EvidenceRef } from '../common.js';

export const WorkflowStepSchema = z.object({
  name: z.string(),
  action: z.string(),
  entity: z.string().optional(),
  service: z.string().optional(),
  input: z.string().optional(),
  output: z.string().optional(),
  condition: z.string().optional(),
});
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const WorkflowSchema = VersionedObject.extend({
  kind: z.literal('Workflow'),
  name: z.string().min(1),
  description: z.string().optional(),
  steps: z.array(WorkflowStepSchema).default([]),
  triggers: z.array(z.object({
    type: z.enum(['manual', 'scheduled', 'event', 'api']),
    event: z.string().optional(),
    schedule: z.string().optional(),
  })).default([]),
  outcomes: z.array(z.string()).default([]),
  entities: z.array(z.string()).default([]),
  services: z.array(z.string()).default([]),
  revenueImpact: z.string().optional(),
});
export type Workflow = z.infer<typeof WorkflowSchema>;
