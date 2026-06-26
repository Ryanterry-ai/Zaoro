import { z } from 'zod';

export const VersionTag = z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be semver (e.g. 1.0.0)');
export type VersionTag = z.infer<typeof VersionTag>;

export const SemverRange = z.string().regex(/^[\d\.\*\-\+\s]+$/, 'Invalid semver range');
export type SemverRange = z.infer<typeof SemverRange>;

export const ULID = z.string().length(26, 'ULID must be 26 characters');
export type ULID = z.infer<typeof ULID>;

export const Locale = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid locale (e.g. en, en-US)');
export type Locale = z.infer<typeof Locale>;

export const License = z.string().min(1);
export type License = z.infer<typeof License>;

export const ISODate = z.string().datetime({ offset: true });
export type ISODate = z.infer<typeof ISODate>;

export const EvidenceRef = z.object({
  id: z.string(),
  version: z.string().optional(),
});
export type EvidenceRef = z.infer<typeof EvidenceRef>;

export const KnowledgeRef = z.object({
  id: z.string(),
  version: z.string(),
});
export type KnowledgeRef = z.infer<typeof KnowledgeRef>;

export const EvidenceSource = z.object({
  type: z.enum(['web', 'doc', 'api', 'standard', 'competitor', 'design', 'agent']),
  url: z.string().url().optional(),
  title: z.string().optional(),
  author: z.string().optional(),
  accessedAt: ISODate,
  reliability: z.enum(['high', 'medium', 'low']),
});
export type EvidenceSource = z.infer<typeof EvidenceSource>;

export const ObjectStatus = z.enum(['active', 'deprecated', 'superseded', 'experimental']);
export type ObjectStatus = z.infer<typeof ObjectStatus>;

export const VersionedObject = z.object({
  id: z.string(),
  version: VersionTag,
  status: ObjectStatus.default('active'),
  createdAt: ISODate,
  updatedAt: ISODate,
  evidenceRefs: z.array(EvidenceRef).default([]),
});
export type VersionedObject = z.infer<typeof VersionedObject>;

export const RuleRef = z.object({
  id: z.string(),
  version: z.string().optional(),
  params: z.record(z.unknown()).optional(),
});
export type RuleRef = z.infer<typeof RuleRef>;

export const InfluenceRule = z.object({
  condition: z.string(),
  action: z.string(),
  priority: z.number().default(0),
  params: z.record(z.unknown()).optional(),
});
export type InfluenceRule = z.infer<typeof InfluenceRule>;

export const Relationship = z.object({
  target: z.string(),
  type: z.enum(['has_many', 'belongs_to', 'has_one', 'many_to_many']),
  foreignKey: z.string().optional(),
  cascade: z.enum(['delete', 'restrict', 'set_null', 'cascade']).optional(),
});
export type Relationship = z.infer<typeof Relationship>;

export const Attribute = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'date', 'enum', 'reference', 'rich_text', 'image', 'file', 'json']),
  required: z.boolean().default(false),
  indexed: z.boolean().default(false),
  unique: z.boolean().default(false),
  description: z.string().optional(),
  defaultValue: z.unknown().optional(),
  enumValues: z.array(z.string()).optional(),
  referenceTarget: z.string().optional(),
});
export type Attribute = z.infer<typeof Attribute>;
