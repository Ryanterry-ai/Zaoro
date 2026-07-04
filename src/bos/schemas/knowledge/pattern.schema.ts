import { z } from 'zod';
import { VersionedObject, EvidenceRef, RuleRef } from '../common.js';
import { ComponentStyleSchema } from './component.schema.js';

export const NavSpecSchema = z.object({
  items: z.array(z.object({
    label: z.string(),
    href: z.string(),
    children: z.array(z.object({
      label: z.string(),
      href: z.string(),
    })).optional(),
  })).default([]),
  style: z.enum(['horizontal', 'sidebar', 'hamburger', 'mega']).default('horizontal'),
  sticky: z.boolean().default(false),
  logo: z.boolean().default(true),
});
export type NavSpec = z.infer<typeof NavSpecSchema>;

export const PageSpecSchema = z.object({
  path: z.string(),
  name: z.string(),
  type: z.enum(['home', 'listing', 'detail', 'auth', 'dashboard', 'static', 'api', 'page']),
  sections: z.array(z.string()).default([]),
  description: z.string().optional(),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
});
export type PageSpec = z.infer<typeof PageSpecSchema>;

export const IntegrationSpecSchema = z.object({
  type: z.enum(['database', 'auth', 'payment', 'email', 'analytics', 'cms', 'storage', 'maps', 'social', 'messaging', 'erp', 'crm', 'booking', 'video']),
  name: z.string(),
  provider: z.string().optional(),
  config: z.record(z.string()).default({}),
  required: z.boolean().default(false),
});
export type IntegrationSpec = z.infer<typeof IntegrationSpecSchema>;

export const DesignConstraintsSchema = z.object({
  profileRef: z.string().optional(),
  palette: z.record(z.string()).optional(),
  typography: z.record(z.string()).optional(),
  motion: z.record(z.string()).optional(),
  restrictions: z.array(z.string()).default([]),
});
export type DesignConstraints = z.infer<typeof DesignConstraintsSchema>;

export const PatternSchema = VersionedObject.extend({
  kind: z.literal('Pattern'),
  name: z.string().min(1),
  description: z.string().optional(),
  navigation: NavSpecSchema,
  pages: z.array(PageSpecSchema).default([]),
  components: z.array(z.string()).default([]),
  relationships: z.array(z.object({
    target: z.string(),
    type: z.string(),
  })).default([]),
  workflows: z.array(z.string()).default([]),
  integrations: z.array(IntegrationSpecSchema).default([]),
  design: DesignConstraintsSchema,
  generationRules: z.array(RuleRef).default([]),
  compatibleIndustries: z.array(z.string()).default([]),
  compatibleBusinessModels: z.array(z.string()).default([]),
  // Enterprise / domain-specific extensions — optional so existing patterns compile unchanged
  roles: z.array(z.string()).optional(),
  departments: z.array(z.string()).optional(),
  kpis: z.array(z.string()).optional(),
  vocabulary: z.record(z.string()).optional(),
  businessRules: z.array(z.string()).optional(),
  // Revenue intelligence: how this pattern makes money
  revenueModel: z.array(z.object({
    name: z.string(),
    description: z.string(),
    percentage: z.number(),
  })).optional(),
});
export type Pattern = z.infer<typeof PatternSchema>;
