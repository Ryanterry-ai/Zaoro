import { z } from 'zod';
import { VersionedObject, EvidenceRef, RuleRef } from '../common.js';
import { PageSpecSchema } from './pattern.schema.js';
import { Attribute, Relationship } from '../common.js';

export const CrudSpecSchema = z.object({
  entity: z.string(),
  operations: z.array(z.enum(['create', 'read', 'update', 'delete', 'list', 'search', 'export'])).default(['create', 'read', 'update', 'delete', 'list']),
  fields: z.array(Attribute).optional(),
  relationships: z.array(Relationship).optional(),
  validation: z.array(z.object({
    field: z.string(),
    rule: z.string(),
    message: z.string().optional(),
  })).default([]),
});
export type CrudSpec = z.infer<typeof CrudSpecSchema>;

export const ApiSpecSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  path: z.string(),
  description: z.string().optional(),
  requestBody: z.record(z.string(), z.string()).optional(),
  responseShape: z.record(z.string(), z.string()).optional(),
  auth: z.boolean().default(false),
});
export type ApiSpec = z.infer<typeof ApiSpecSchema>;

export const FormSpecSchema = z.object({
  entity: z.string(),
  fields: z.array(Attribute),
  submitAction: z.string(),
  validation: z.array(z.object({
    field: z.string(),
    rule: z.string(),
    message: z.string().optional(),
  })).default([]),
});
export type FormSpec = z.infer<typeof FormSpecSchema>;

export const WidgetSpecSchema = z.object({
  type: z.enum(['stat', 'chart', 'table', 'list', 'map', 'form', 'feed', 'calendar', 'progress']),
  title: z.string(),
  dataEntity: z.string().optional(),
  refreshInterval: z.string().optional(),
  size: z.enum(['sm', 'md', 'lg', 'full']).default('md'),
});
export type WidgetSpec = z.infer<typeof WidgetSpecSchema>;

export const ReportSpecSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  entities: z.array(z.string()),
  metrics: z.array(z.string()),
  groupBy: z.array(z.string()).default([]),
  filters: z.array(z.string()).default([]),
});
export type ReportSpec = z.infer<typeof ReportSpecSchema>;

export const DatabaseSpecSchema = z.object({
  engine: z.enum(['postgresql', 'mysql', 'sqlite', 'mongodb', 'supabase', 'firebase']).default('postgresql'),
  tables: z.array(z.object({
    name: z.string(),
    columns: z.array(Attribute),
    indexes: z.array(z.object({
      columns: z.array(z.string()),
      unique: z.boolean().default(false),
    })).default([]),
  })).default([]),
});
export type DatabaseSpec = z.infer<typeof DatabaseSpecSchema>;

export const TestSpecSchema = z.object({
  name: z.string(),
  type: z.enum(['unit', 'integration', 'e2e', 'snapshot']),
  entity: z.string().optional(),
  description: z.string().optional(),
});
export type TestSpec = z.infer<typeof TestSpecSchema>;

export const SkillPackSchema = VersionedObject.extend({
  kind: z.literal('SkillPack'),
  capability: z.string(),
  description: z.string().optional(),
  assets: z.object({
    pages: z.array(PageSpecSchema).default([]),
    crud: z.array(CrudSpecSchema).default([]),
    apis: z.array(ApiSpecSchema).default([]),
    forms: z.array(FormSpecSchema).default([]),
    validation: z.array(z.object({
      field: z.string(),
      rule: z.string(),
      message: z.string().optional(),
    })).default([]),
    dashboard: z.array(WidgetSpecSchema).default([]),
    reports: z.array(ReportSpecSchema).default([]),
    components: z.array(z.string()).default([]),
    database: DatabaseSpecSchema.optional(),
    tests: z.array(TestSpecSchema).default([]),
    verification: z.array(z.object({
      check: z.string(),
      description: z.string().optional(),
    })).default([]),
    generationRules: z.array(RuleRef).default([]),
  }).optional(),
});
export type SkillPack = z.infer<typeof SkillPackSchema>;
