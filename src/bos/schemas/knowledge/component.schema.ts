import { z } from 'zod';
import { VersionedObject, EvidenceRef, RuleRef, Attribute, Relationship } from '../common.js';

export const ComponentStyleSchema = z.object({
  variant: z.string(),
  className: z.string(),
  description: z.string().optional(),
});
export type ComponentStyle = z.infer<typeof ComponentStyleSchema>;

export const ComponentSchema = VersionedObject.extend({
  kind: z.literal('Component'),
  name: z.string().min(1),
  roles: z.array(z.string()).default([]),
  description: z.string().optional(),
  compatibleIndustries: z.array(z.string()).default([]),
  dependsOn: z.array(z.string()).default([]),
  entities: z.array(z.string()).default([]),
  kpis: z.array(z.string()).default([]),
  pages: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
  layouts: z.array(z.string()).default([]),
  styles: z.array(ComponentStyleSchema).default([]),
  props: z.record(z.string(), z.string()).default({}),
  generationRules: z.array(RuleRef).default([]),
});
export type Component = z.infer<typeof ComponentSchema>;
