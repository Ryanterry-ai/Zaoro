import { z } from 'zod';
import { VersionTag, ISODate, RuleRef, KnowledgeRef } from '../common.js';
import { Attribute, Relationship } from '../common.js';

export const PagePlanSchema = z.object({
  id: z.string(),
  path: z.string(),
  name: z.string(),
  type: z.enum(['home', 'listing', 'detail', 'auth', 'dashboard', 'static', 'api', 'page']),
  description: z.string().optional(),
  sections: z.array(z.string()).default([]),
  components: z.array(z.string()).default([]),
  dataRequirements: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
  isEntry: z.boolean().default(false),
});
export type PagePlan = z.infer<typeof PagePlanSchema>;

export const RoutePlanSchema = z.object({
  path: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET'),
  handler: z.string(),
  auth: z.boolean().default(false),
  rateLimit: z.number().optional(),
});
export type RoutePlan = z.infer<typeof RoutePlanSchema>;

export const LayoutPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  areas: z.array(z.string()),
  components: z.array(z.string()),
  responsive: z.record(z.string(), z.array(z.string())).default({}),
});
export type LayoutPlan = z.infer<typeof LayoutPlanSchema>;

export const NavPlanSchema = z.object({
  items: z.array(z.object({
    label: z.string(),
    href: z.string(),
    icon: z.string().optional(),
    children: z.array(z.object({
      label: z.string(),
      href: z.string(),
    })).optional(),
  })).default([]),
  style: z.enum(['horizontal', 'sidebar', 'hamburger', 'mega']).default('horizontal'),
  sticky: z.boolean().default(false),
  logo: z.boolean().default(true),
});
export type NavPlan = z.infer<typeof NavPlanSchema>;

export const PermissionPlanSchema = z.object({
  id: z.string(),
  role: z.string(),
  resource: z.string(),
  actions: z.array(z.enum(['create', 'read', 'update', 'delete', 'list', 'export', 'import'])),
  conditions: z.array(z.string()).default([]),
});
export type PermissionPlan = z.infer<typeof PermissionPlanSchema>;

export const EntityPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  fields: z.array(Attribute),
  relationships: z.array(Relationship),
  uiSections: z.array(z.string()).default([]),
  workflows: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
});
export type EntityPlan = z.infer<typeof EntityPlanSchema>;

export const DatabasePlanSchema = z.object({
  engine: z.enum(['postgresql', 'mysql', 'sqlite', 'mongodb', 'supabase', 'firebase']).default('postgresql'),
  tables: z.array(z.object({
    name: z.string(),
    columns: z.array(Attribute),
    indexes: z.array(z.object({
      columns: z.array(z.string()),
      unique: z.boolean().default(false),
    })).default([]),
    foreignKeys: z.array(z.object({
      column: z.string(),
      references: z.string(),
      onDelete: z.enum(['cascade', 'restrict', 'set null']).default('cascade'),
    })).default([]),
  })).default([]),
});
export type DatabasePlan = z.infer<typeof DatabasePlanSchema>;

export const ApiPlanSchema = z.object({
  path: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  description: z.string().optional(),
  auth: z.boolean().default(false),
  rateLimit: z.number().optional(),
  requestSchema: z.record(z.string(), z.unknown()).optional(),
  responseSchema: z.record(z.string(), z.unknown()).optional(),
});
export type ApiPlan = z.infer<typeof ApiPlanSchema>;

export const WorkflowPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  trigger: z.string(),
  steps: z.array(z.object({
    name: z.string(),
    action: z.string(),
    entity: z.string().optional(),
    service: z.string().optional(),
    condition: z.string().optional(),
  })),
  entities: z.array(z.string()).default([]),
  services: z.array(z.string()).default([]),
});
export type WorkflowPlan = z.infer<typeof WorkflowPlanSchema>;

export const WidgetPlanSchema = z.object({
  id: z.string(),
  type: z.enum(['stat', 'chart', 'table', 'list', 'map', 'form', 'feed', 'calendar', 'progress']),
  title: z.string(),
  dataEntity: z.string().optional(),
  size: z.enum(['sm', 'md', 'lg', 'full']).default('md'),
  refreshInterval: z.string().optional(),
});
export type WidgetPlan = z.infer<typeof WidgetPlanSchema>;

export const ChartPlanSchema = z.object({
  id: z.string(),
  type: z.enum(['bar', 'line', 'pie', 'area', 'scatter', 'radar', 'doughnut']),
  title: z.string(),
  dataEntity: z.string().optional(),
  xAxis: z.string().optional(),
  yAxis: z.string().optional(),
  series: z.array(z.string()).default([]),
});
export type ChartPlan = z.infer<typeof ChartPlanSchema>;

export const FormPlanSchema = z.object({
  id: z.string(),
  entity: z.string(),
  fields: z.array(Attribute),
  submitAction: z.string(),
  validation: z.array(z.object({
    field: z.string(),
    rule: z.string(),
    message: z.string().optional(),
  })).default([]),
});
export type FormPlan = z.infer<typeof FormPlanSchema>;

export const TablePlanSchema = z.object({
  id: z.string(),
  entity: z.string(),
  columns: z.array(z.object({
    field: z.string(),
    header: z.string(),
    sortable: z.boolean().default(true),
    filterable: z.boolean().default(false),
    width: z.string().optional(),
  })).default([]),
  pagination: z.boolean().default(true),
  pageSize: z.number().default(20),
  sortable: z.boolean().default(true),
  filterable: z.boolean().default(false),
});
export type TablePlan = z.infer<typeof TablePlanSchema>;

export const IntegrationPlanSchema = z.object({
  id: z.string(),
  type: z.enum(['database', 'auth', 'payment', 'email', 'analytics', 'cms', 'storage', 'maps', 'social', 'messaging', 'erp', 'crm']),
  name: z.string(),
  provider: z.string().optional(),
  config: z.record(z.string(), z.string()).default({}),
  required: z.boolean().default(false),
});
export type IntegrationPlan = z.infer<typeof IntegrationPlanSchema>;

export const TokenSetSchema = z.record(z.string(), z.record(z.string(), z.string()));
export type TokenSet = z.infer<typeof TokenSetSchema>;

export const ApplicationBlueprintSchema = z.object({
  id: z.string(),
  version: VersionTag,
  createdAt: ISODate,
  name: z.string(),
  description: z.string().optional(),

  industry: z.string(),
  businessModels: z.array(z.string()).default([]),
  country: z.string().optional(),
  compliancePacks: z.array(z.string()).default([]),
  journeys: z.array(z.string()).default([]),

  pages: z.array(PagePlanSchema).default([]),
  routes: z.array(RoutePlanSchema).default([]),
  layouts: z.array(LayoutPlanSchema).default([]),
  navigation: NavPlanSchema,
  permissions: z.array(PermissionPlanSchema).default([]),

  entities: z.array(EntityPlanSchema).default([]),
  relationships: z.array(Relationship).default([]),
  database: DatabasePlanSchema,

  apis: z.array(ApiPlanSchema).default([]),
  workflows: z.array(WorkflowPlanSchema).default([]),
  dashboardWidgets: z.array(WidgetPlanSchema).default([]),
  charts: z.array(ChartPlanSchema).default([]),
  forms: z.array(FormPlanSchema).default([]),
  tables: z.array(TablePlanSchema).default([]),

  integrations: z.array(IntegrationPlanSchema).default([]),
  designTokens: TokenSetSchema,
  generationRules: z.array(RuleRef).default([]),

  provenance: z.object({
    knowledge: z.array(KnowledgeRef).default([]),
    compilers: z.array(z.string()).default([]),
  }).optional(),

  vocabulary: z.record(z.string(), z.string()).default({}),
  confidence: z.number().min(0).max(1).default(0.5),
  warnings: z.array(z.string()).default([]),
});
export type ApplicationBlueprint = z.infer<typeof ApplicationBlueprintSchema>;
