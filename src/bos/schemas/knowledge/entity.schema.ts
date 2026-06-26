import { z } from 'zod';
import { VersionedObject, EvidenceRef, Attribute, Relationship } from '../common.js';

export const EntitySchema = VersionedObject.extend({
  kind: z.literal('Entity'),
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  attributes: z.array(Attribute).default([]),
  relationships: z.array(Relationship).default([]),
  semantics: z.array(z.string()).default([]),
  uiSections: z.array(z.string()).default([]),
  workflows: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
});
export type Entity = z.infer<typeof EntitySchema>;

export const EntityQuerySchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  kind: z.literal('Entity').optional(),
  limit: z.number().default(100),
});
export type EntityQuery = z.infer<typeof EntityQuerySchema>;
