import { z } from 'zod';
import { VersionedObject, EvidenceRef, ULID, ISODate } from '../common.js';

export const EvidenceItemSchema = VersionedObject.extend({
  kind: z.literal('Evidence'),
  evidenceKind: z.enum(['web', 'doc', 'api', 'standard', 'competitor', 'design', 'agent']),
  uri: z.string().url().optional(),
  retrievedAt: ISODate,
  hash: z.string().min(1),
  license: z.string().optional(),
  locale: z.string().optional(),
  contentPtr: z.object({
    store: z.enum(['blob', 's3', 'ipfs', 'local']),
    key: z.string(),
  }),
  annotations: z.array(z.object({
    by: z.enum(['human', 'agent']),
    note: z.string(),
    at: ISODate,
    tags: z.array(z.string()).optional(),
  })).default([]),
  qualityScore: z.number().min(0).max(1).optional(),
  supersedes: z.string().optional(),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const EvidenceQuerySchema = z.object({
  kind: z.enum(['web', 'doc', 'api', 'standard', 'competitor', 'design', 'agent']).optional(),
  hash: z.string().optional(),
  minQuality: z.number().min(0).max(1).optional(),
  locale: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().default(100),
  offset: z.number().default(0),
});
export type EvidenceQuery = z.infer<typeof EvidenceQuerySchema>;
