// ─── Primitive Pack Composer (Phase 2) ─────────────────────────────
// Given a build context (industry, business model, journeys, locale, ...),
// selects exactly one primitive pack per relevant dimension and merges them
// into a single ComposedKnowledgePack. This replaces the monolithic
// per-industry KnowledgePack with composable Lego bricks.

import type { KnowledgePackCopy, KnowledgePackDesign } from '../../../taxonomy/types.js';
import {
  CompositionContext,
  ComposedKnowledgePack,
  PrimitivePack,
  PrimitivePackDimension,
  primitivePackId,
} from './types.js';
import { INDUSTRY_PRIMITIVE_PACKS, getIndustryPrimitivePack } from './industry.js';
import {
  BUSINESS_MODEL_PRIMITIVE_PACKS,
  EXPERIENCE_PRIMITIVE_PACKS,
  COMPLIANCE_PRIMITIVE_PACKS,
} from './registry-wrappers.js';
import { DESIGN_PRIMITIVE_PACKS, getDesignPrimitivePackForIndustry } from './design.js';
import { LOCALE_PRIMITIVE_PACKS, getLocalePrimitivePack } from './locale.js';
import { TECHNOLOGY_PRIMITIVE_PACKS, getDefaultTechnologyPrimitivePack } from './technology.js';
import { CONTENT_PRIMITIVE_PACKS, getContentPrimitivePack } from './content.js';
import { CapabilityGraph } from './capability-graph.js';
import { capabilityRegistry } from '../../capabilities/index.js';

const ALL_PRIMITIVES: PrimitivePack[] = [
  ...INDUSTRY_PRIMITIVE_PACKS,
  ...BUSINESS_MODEL_PRIMITIVE_PACKS,
  ...EXPERIENCE_PRIMITIVE_PACKS,
  ...COMPLIANCE_PRIMITIVE_PACKS,
  ...DESIGN_PRIMITIVE_PACKS,
  ...LOCALE_PRIMITIVE_PACKS,
  ...TECHNOLOGY_PRIMITIVE_PACKS,
  ...CONTENT_PRIMITIVE_PACKS,
];

const DEFAULT_COPY: KnowledgePackCopy = {
  heroHeading: 'Build something people love',
  heroSubheading: 'A clear, fast, and reliable experience for your customers.',
  heroPrimaryButton: 'Get Started',
  heroImageKeywords: ['business', 'team'],
  featuresHeading: 'What you get',
  featuresSubheading: 'Everything you need to operate with confidence.',
  features: [],
  testimonialsHeading: 'What our customers say',
  testimonialsSubheading: 'Trusted by teams like yours.',
  testimonials: [],
  ctaHeading: 'Ready to begin?',
  ctaPrimaryButton: 'Get Started',
};

const DEFAULT_DESIGN: KnowledgePackDesign = {
  personality: 'balanced',
  colorHint: 'blue',
  radiusScale: 'medium',
  density: 'balanced',
  mood: ['professional'],
  typography: { headingFont: 'Inter', bodyFont: 'Inter', headingWeight: '600', bodyWeight: '400' },
};

function dedupe<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function selectByDimension(dimension: PrimitivePackDimension, ctx: CompositionContext): PrimitivePack[] {
  switch (dimension) {
    case 'industry': {
      const p = ctx.industry ? getIndustryPrimitivePack(ctx.industry) : undefined;
      return p ? [p] : [];
    }
    case 'business-model':
      return BUSINESS_MODEL_PRIMITIVE_PACKS.filter(p => p.appliesTo?.(ctx));
    case 'experience':
      return EXPERIENCE_PRIMITIVE_PACKS.filter(p => p.appliesTo?.(ctx));
    case 'compliance':
      return COMPLIANCE_PRIMITIVE_PACKS.filter(p => p.appliesTo?.(ctx));
    case 'design':
      return ctx.industry ? [getDesignPrimitivePackForIndustry(ctx.industry)!] : [];
    case 'locale':
      return [getLocalePrimitivePack(ctx.locale, ctx.country)];
    case 'technology':
      return TECHNOLOGY_PRIMITIVE_PACKS.filter(p => p.appliesTo?.(ctx)).slice(0, 1);
    case 'content':
      return [getContentPrimitivePack(ctx)];
    default:
      return [];
  }
}

/** Merge a list of primitive packs into a single ComposedKnowledgePack. */
export function composeKnowledgePack(ctx: CompositionContext): ComposedKnowledgePack {
  // Selection order matters: later dimensions may override earlier vocabulary.
  const dimensions: PrimitivePackDimension[] = [
    'industry',
    'business-model',
    'experience',
    'compliance',
    'design',
    'locale',
    'technology',
    'content',
  ];

  const selected: PrimitivePack[] = [];
  const seen = new Set<string>();
  for (const dim of dimensions) {
    for (const p of selectByDimension(dim, ctx)) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        selected.push(p);
      }
    }
  }

  const vocabulary: Record<string, string> = {};
  for (const p of selected) {
    for (const [k, v] of Object.entries(p.vocabulary ?? {})) {
      vocabulary[k] = v; // later dimensions override
    }
  }

  const copy: KnowledgePackCopy = { ...DEFAULT_COPY };
  const design: KnowledgePackDesign = { ...DEFAULT_DESIGN };
  for (const p of selected) {
    if (p.copy) Object.assign(copy, p.copy);
    if (p.design) Object.assign(design, p.design);
  }

  const composed: ComposedKnowledgePack = {
    id: `composed:${signature(ctx)}`,
    name: selected.map(p => p.name).join(' + '),
    composedFrom: selected.map(p => p.id),
    dimensions: Array.from(new Set(selected.map(p => p.dimension))),
    vocabulary,
    entities: dedupe(selected.flatMap(p => p.entities ?? [])),
    roles: dedupe(selected.flatMap(p => p.roles ?? [])),
    kpis: dedupe(selected.flatMap(p => p.kpis ?? [])),
    workflows: dedupe(selected.flatMap(p => p.workflows ?? [])),
    integrations: dedupe(selected.flatMap(p => p.integrations ?? [])),
    compliance: dedupe(selected.flatMap(p => p.compliance ?? [])),
    copy,
    design,
    primitives: selected,
  };
  return composed;
}

function signature(ctx: CompositionContext): string {
  const parts = [
    ctx.industry ?? 'unknown',
    (ctx.businessModels ?? [ctx.businessModel]).filter(Boolean).join('+'),
    (ctx.journeys ?? []).join('+'),
    ctx.locale ?? ctx.country ?? 'global',
    (ctx.capabilities ?? []).join('+'),
  ];
  return parts.filter(Boolean).join('/').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/** Build the Capability Graph over all primitive packs. */
export function buildCapabilityGraph(): CapabilityGraph {
  return new CapabilityGraph(ALL_PRIMITIVES);
}

/** Compose the minimal pack set that satisfies the given capabilities. */
export function composeForCapabilities(capabilities: string[], ctx: CompositionContext): ComposedKnowledgePack {
  const graph = buildCapabilityGraph();
  // Phase R2: route every requested capability through the canonical registry.
  // This normalizes legacy tags (checkout/payments/cart) to one identity and
  // expands dependencies, then bridges to the primitive-pack tags the legacy
  // graph indexes on.
  const resolved = capabilityRegistry.resolve([...(ctx.capabilities ?? []), ...capabilities], {
    industry: ctx.industry,
  });
  const packTags = capabilityRegistry.primitivePackTagsFor(resolved.expanded);
  const caps = [...capabilities, ...packTags, ...resolved.canonical];
  const matched = graph.getPrimitivePacksForCapabilities(caps);
  // Merge matched capability packs with dimension-based selection for context.
  const enrichedCtx: CompositionContext = {
    ...ctx,
    capabilities: resolved.canonical,
  };
  const base = composeKnowledgePack(enrichedCtx);
  const extra = matched.filter(p => !base.composedFrom.includes(p.id));
  if (extra.length === 0) return base;

  const merged: ComposedKnowledgePack = {
    ...base,
    composedFrom: [...base.composedFrom, ...extra.map(p => p.id)],
    dimensions: Array.from(new Set([...base.dimensions, ...extra.map(p => p.dimension)])),
    vocabulary: { ...mergeVocab(extra), ...base.vocabulary },
    entities: dedupe([...base.entities, ...extra.flatMap(p => p.entities ?? [])]),
    roles: dedupe([...base.roles, ...extra.flatMap(p => p.roles ?? [])]),
    kpis: dedupe([...base.kpis, ...extra.flatMap(p => p.kpis ?? [])]),
    workflows: dedupe([...base.workflows, ...extra.flatMap(p => p.workflows ?? [])]),
    integrations: dedupe([...base.integrations, ...extra.flatMap(p => p.integrations ?? [])]),
    compliance: dedupe([...base.compliance, ...extra.flatMap(p => p.compliance ?? [])]),
    primitives: [...base.primitives, ...extra],
  };
  return merged;
}

function mergeVocab(packs: PrimitivePack[]): Record<string, string> {
  const v: Record<string, string> = {};
  for (const p of packs) Object.assign(v, p.vocabulary ?? {});
  return v;
}

export { ALL_PRIMITIVES };
