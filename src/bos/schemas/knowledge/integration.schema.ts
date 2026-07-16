import { z } from 'zod';
import { VersionedObject, EvidenceRef } from '../common.js';

export const IntegrationProviderSchema = z.object({
  name: z.string(),
  type: z.enum(['database', 'auth', 'payment', 'email', 'analytics', 'cms', 'storage', 'maps', 'social', 'messaging', 'erp', 'crm']),
  config: z.record(z.string(), z.string()).default({}),
  required: z.boolean().default(false),
  rateLimits: z.object({
    requests: z.number().optional(),
    window: z.string().optional(),
  }).optional(),
  webhooks: z.array(z.object({
    event: z.string(),
    url: z.string(),
  })).default([]),
});
export type IntegrationProvider = z.infer<typeof IntegrationProviderSchema>;

export const IntegrationSchema = VersionedObject.extend({
  kind: z.literal('Integration'),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['database', 'auth', 'payment', 'email', 'analytics', 'cms', 'storage', 'maps', 'social', 'messaging', 'erp', 'crm']),
  providers: z.array(IntegrationProviderSchema).default([]),
  requiredCapabilities: z.array(z.string()).default([]),
  apis: z.array(z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    path: z.string(),
    description: z.string().optional(),
  })).default([]),
});
export type Integration = z.infer<typeof IntegrationSchema>;
