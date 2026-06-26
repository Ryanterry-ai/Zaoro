import { z } from 'zod';
import { VersionedObject, EvidenceRef, RuleRef } from '../common.js';

export const TypographySpecSchema = z.object({
  displayFamily: z.string(),
  bodyFamily: z.string(),
  monoFamily: z.string().optional(),
  scale: z.record(z.object({
    size: z.string(),
    lineHeight: z.string(),
    weight: z.string(),
    tracking: z.string().optional(),
  })),
});
export type TypographySpec = z.infer<typeof TypographySpecSchema>;

export const ColorPsychologySchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  background: z.string(),
  foreground: z.string(),
  muted: z.string(),
  destructive: z.string(),
  success: z.string(),
  warning: z.string(),
  info: z.string(),
  psychology: z.record(z.string()).default({}),
  gradients: z.record(z.string()).default({}),
});
export type ColorPsychology = z.infer<typeof ColorPsychologySchema>;

export const SpacingScaleSchema = z.record(z.string());
export type SpacingScale = z.infer<typeof SpacingScaleSchema>;

export const GridSystemSchema = z.object({
  columns: z.number().default(12),
  gutter: z.string().default('1rem'),
  margin: z.string().default('1.5rem'),
  breakpoints: z.record(z.string()).default({}),
});
export type GridSystem = z.infer<typeof GridSystemSchema>;

export const MotionGuidelinesSchema = z.object({
  duration: z.object({
    fast: z.string().default('150ms'),
    normal: z.string().default('300ms'),
    slow: z.string().default('500ms'),
  }),
  easing: z.object({
    default: z.string().default('cubic-bezier(0.4, 0, 0.2, 1)'),
    enter: z.string().default('cubic-bezier(0, 0, 0.2, 1)'),
    exit: z.string().default('cubic-bezier(0.4, 0, 1, 1)'),
    spring: z.string().default('cubic-bezier(0.34, 1.56, 0.64, 1)'),
  }),
  reducedMotion: z.enum(['disable', 'simplify', 'remove']).default('simplify'),
});
export type MotionGuidelines = z.infer<typeof MotionGuidelinesSchema>;

export const A11yGuidelinesSchema = z.object({
  contrastRatio: z.number().default(4.5),
  focusVisible: z.boolean().default(true),
  keyboardNav: z.boolean().default(true),
  ariaLabels: z.boolean().default(true),
  reducedMotion: z.boolean().default(true),
  screenReader: z.boolean().default(true),
});
export type A11yGuidelines = z.infer<typeof A11yGuidelinesSchema>;

export const IconographySpecSchema = z.object({
  library: z.string().default('lucide'),
  style: z.enum(['outline', 'filled', 'duotone', 'sharp']).default('outline'),
  size: z.record(z.string()).default({}),
});
export type IconographySpec = z.infer<typeof IconographySpecSchema>;

export const IllustrationSpecSchema = z.object({
  style: z.enum(['flat', '3d', 'hand-drawn', 'isometric', 'abstract', 'none']).default('none'),
  library: z.string().optional(),
});
export type IllustrationSpec = z.infer<typeof IllustrationSpecSchema>;

export const PhotographySpecSchema = z.object({
  style: z.enum(['editorial', 'lifestyle', 'product', 'candid', 'studio', 'none']).default('none'),
  mood: z.array(z.string()).default([]),
  aspectRatio: z.string().default('16/9'),
});
export type PhotographySpec = z.infer<typeof PhotographySpecSchema>;

export const ComponentStyleCatalogSchema = z.object({
  button: z.record(z.string()).default({}),
  card: z.record(z.string()).default({}),
  input: z.record(z.string()).default({}),
  badge: z.record(z.string()).default({}),
  avatar: z.record(z.string()).default({}),
  dialog: z.record(z.string()).default({}),
  table: z.record(z.string()).default({}),
  form: z.record(z.string()).default({}),
  chart: z.record(z.string()).default({}),
});
export type ComponentStyleCatalog = z.infer<typeof ComponentStyleCatalogSchema>;

export const MicroInteractionSpecSchema = z.object({
  trigger: z.string(),
  animation: z.string(),
  duration: z.string().optional(),
  easing: z.string().optional(),
});
export type MicroInteractionSpec = z.infer<typeof MicroInteractionSpecSchema>;

export const DesignProfileSchema = VersionedObject.extend({
  kind: z.literal('DesignProfile'),
  name: z.string().min(1),
  description: z.string().optional(),
  typography: TypographySpecSchema,
  colorPsychology: ColorPsychologySchema,
  spacing: SpacingScaleSchema,
  grid: GridSystemSchema,
  motion: MotionGuidelinesSchema,
  accessibility: A11yGuidelinesSchema,
  iconography: IconographySpecSchema,
  illustration: IllustrationSpecSchema,
  photography: PhotographySpecSchema,
  componentsStyling: ComponentStyleCatalogSchema,
  brandPersonality: z.array(z.string()).default([]),
  microInteractions: z.array(MicroInteractionSpecSchema).default([]),
  inheritsFrom: z.string().optional(),
});
export type DesignProfile = z.infer<typeof DesignProfileSchema>;
