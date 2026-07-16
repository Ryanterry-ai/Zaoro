import { z } from 'zod';

// ─── Layer 1: Execution Blueprint (which components) ────────────────────────

/**
 * ComponentSlot — maps a section name to a component type.
 * NO business logic. NO prop resolution. Pure mapping.
 */
export const ComponentSlotSchema = z.object({
  slot: z.string(),
  component: z.string(),
  order: z.number().default(0),
});
export type ComponentSlot = z.infer<typeof ComponentSlotSchema>;

/**
 * PageExecutionPlan — which components go on a page.
 * Pure structural mapping from BRE v2 output.
 */
export const PageExecutionPlanSchema = z.object({
  pageId: z.string(),
  path: z.string(),
  name: z.string(),
  type: z.string(),
  layout: z.string().default('default'),
  slots: z.array(ComponentSlotSchema).default([]),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
});
export type PageExecutionPlan = z.infer<typeof PageExecutionPlanSchema>;

/**
 * ExecutionBlueprint — complete structural plan.
 * "Page / needs: HeroBanner, FeatureGrid, PricingTable, Testimonials, CTA"
 */
export const ExecutionBlueprintSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  appId: z.string(),
  appName: z.string(),
  industry: z.string(),
  themeId: z.string(),
  pages: z.array(PageExecutionPlanSchema).default([]),
  metadata: z.record(z.string(), z.string()).default({}),
});
export type ExecutionBlueprint = z.infer<typeof ExecutionBlueprintSchema>;

// ─── Layer 2: Component Specs (declarative, platform-agnostic) ───────────────

/**
 * ContentValue — a resolved content value.
 * Platform-agnostic. Renderers interpret based on target.
 */
export const ContentValueSchema = z.object({
  value: z.string(),
  type: z.enum(['text', 'html', 'markdown', 'url', 'image', 'number', 'boolean', 'date']).default('text'),
});
export type ContentValue = z.infer<typeof ContentValueSchema>;

/**
 * ActionSpec — a call-to-action or interaction.
 */
export const ActionSpecSchema = z.object({
  label: z.string(),
  action: z.string(),
  style: z.enum(['primary', 'secondary', 'ghost', 'link']).default('primary'),
});
export type ActionSpec = z.infer<typeof ActionSpecSchema>;

/**
 * ItemSpec — a generic list item (feature, testimonial, FAQ, etc.)
 */
export const ItemSpecSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
}).passthrough();
export type ItemSpec = z.infer<typeof ItemSpecSchema> & Record<string, unknown>;

/**
 * ColumnSpec — a table column definition.
 */
export const ColumnSpecSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['text', 'number', 'date', 'boolean', 'status', 'action']).default('text'),
  sortable: z.boolean().default(true),
  filterable: z.boolean().default(false),
});
export type ColumnSpec = z.infer<typeof ColumnSpecSchema>;

/**
 * TierSpec — a pricing tier.
 */
export const TierSpecSchema = z.object({
  name: z.string(),
  price: z.string(),
  period: z.string().default(''),
  features: z.array(z.string()).default([]),
  highlighted: z.boolean().default(false),
  action: ActionSpecSchema.optional(),
});
export type TierSpec = z.infer<typeof TierSpecSchema>;

/**
 * StatSpec — a dashboard statistic.
 */
export const StatSpecSchema = z.object({
  label: z.string(),
  value: z.string(),
  change: z.string().optional(),
  trend: z.enum(['up', 'down', 'neutral']).default('neutral'),
});
export type StatSpec = z.infer<typeof StatSpecSchema>;

/**
 * FormFieldSpec — a form field definition.
 */
export const FormFieldSpecSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(['text', 'email', 'password', 'number', 'date', 'select', 'textarea', 'checkbox', 'radio']).default('text'),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
});
export type FormFieldSpec = z.infer<typeof FormFieldSpecSchema>;

/**
 * ComponentSpec — declarative description of a component.
 * Platform-agnostic. Contains WHAT to render, not HOW.
 *
 * All fields are optional — renderers provide sensible defaults.
 */
export const ComponentSpecSchema = z.object({
  type: z.string(),
  content: z.record(z.string(), ContentValueSchema).optional(),
  items: z.array(ItemSpecSchema).optional(),
  tiers: z.array(TierSpecSchema).optional(),
  stats: z.array(StatSpecSchema).optional(),
  columns: z.array(ColumnSpecSchema).optional(),
  fields: z.array(FormFieldSpecSchema).optional(),
  actions: z.array(ActionSpecSchema).optional(),
  charts: z.array(z.object({
    id: z.string(),
    type: z.enum(['bar', 'line', 'pie', 'area', 'scatter', 'radar', 'doughnut']),
    title: z.string(),
    series: z.array(z.any()).optional(),
    dataEntity: z.string().optional(),
    xAxis: z.string().optional(),
    yAxis: z.string().optional(),
  })).optional(),
  layout: z.object({
    alignment: z.enum(['left', 'center', 'right']).optional(),
    columns: z.number().optional(),
    maxWidth: z.string().optional(),
    padding: z.string().optional(),
  }).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});
export type ComponentSpec = z.infer<typeof ComponentSpecSchema>;

/**
 * PageSpec — all component specs for a single page.
 */
export const PageSpecSchema = z.object({
  pageId: z.string(),
  path: z.string(),
  name: z.string(),
  type: z.string(),
  layout: z.string().default('default'),
  components: z.array(ComponentSpecSchema).default([]),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
});
export type PageSpec = z.infer<typeof PageSpecSchema>;

/**
 * ApplicationSpec — complete declarative specification.
 * "Page / has: HeroBanner(title='Bella Vista', subtitle='...'), FeatureGrid(features=[...]), ..."
 * Platform-agnostic. Renderers translate this into target code.
 */
export const ApplicationSpecSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  appId: z.string(),
  appName: z.string(),
  industry: z.string(),
  themeId: z.string(),
  pages: z.array(PageSpecSchema).default([]),
  metadata: z.record(z.string(), z.string()).default({}),
});
export type ApplicationSpec = z.infer<typeof ApplicationSpecSchema>;
