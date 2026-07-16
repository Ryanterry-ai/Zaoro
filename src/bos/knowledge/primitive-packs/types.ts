// ─── Primitive Pack System (Phase 2) ───────────────────────────────
// Knowledge becomes composable. Instead of one monolithic per-industry
// KnowledgePack, a build composes only the primitive packs it needs across
// eight orthogonal dimensions:
//
//   Industry · Business Model · Experience · Compliance ·
//   Design · Locale · Technology · Content
//
// A burger chain becomes:
//   Industry(restaurant) + BusinessModel(subscription? no → direct-sales)
//   + Experience(dine-in/delivery) + Compliance(food-safety)
//   + Locale(us) + Technology(react-web) + Content(standard)
//
// A hospital becomes:
//   Industry(healthcare) + Experience(patient/admin)
//   + Compliance(hipaa) + Locale(us) + Technology(react-web) + Content(clinical)
//
// The Capability Graph (capability-graph.ts) answers "what knowledge is
// actually needed?" and the Composer assembles only that.

import type { KnowledgePackCopy, KnowledgePackDesign } from '../../../taxonomy/types.js';
import type { BusinessClassification } from '../../../taxonomy/types.js';

export type PrimitivePackDimension =
  | 'industry'
  | 'business-model'
  | 'experience'
  | 'compliance'
  | 'design'
  | 'locale'
  | 'technology'
  | 'content';

export const PRIMITIVE_PACK_DIMENSIONS: PrimitivePackDimension[] = [
  'industry',
  'business-model',
  'experience',
  'compliance',
  'design',
  'locale',
  'technology',
  'content',
];

/** Context used to select and compose primitive packs for a build. */
export interface CompositionContext {
  industry?: string;
  subIndustry?: string;
  businessModel?: string;
  businessModels?: string[];
  journeys?: string[];
  locale?: string;
  country?: string;
  capabilities?: string[];
  taxonomyPath?: string;
  classification?: BusinessClassification;
}

/**
 * A single primitive pack along one dimension. Multiple primitives combine
 * into a ComposedKnowledgePack.
 */
export interface PrimitivePack {
  id: string; // e.g. "industry:healthcare", "bm:subscription"
  dimension: PrimitivePackDimension;
  name: string;
  description?: string;
  keywords: string[];
  /** Capabilities this primitive satisfies (feeds the Capability Graph). */
  providesCapabilities?: string[];
  /** Optional selector: should this primitive apply to the given context? */
  appliesTo?: (ctx: CompositionContext) => boolean;
  // ── Knowledge contributions (dimension-specific, additive) ──
  vocabulary?: Record<string, string>;
  entities?: string[];
  roles?: string[];
  kpis?: string[];
  workflows?: string[];
  integrations?: string[];
  compliance?: string[];
  copy?: Partial<KnowledgePackCopy>;
  design?: Partial<KnowledgePackDesign>;
  /** Reference to the underlying registry object, if any. */
  source?: unknown;
}

/** Result of composing primitive packs for a build. */
export interface ComposedKnowledgePack {
  id: string; // "composed:<signature>"
  name: string;
  /** Primitive pack ids that were composed. */
  composedFrom: string[];
  dimensions: PrimitivePackDimension[];
  vocabulary: Record<string, string>;
  entities: string[];
  roles: string[];
  kpis: string[];
  workflows: string[];
  integrations: string[];
  compliance: string[];
  copy: KnowledgePackCopy;
  design: KnowledgePackDesign;
  /** The primitive packs that contributed (for traceability). */
  primitives: PrimitivePack[];
}

export function primitivePackId(dimension: PrimitivePackDimension, key: string): string {
  return `${dimension}:${key.toLowerCase()}`;
}
