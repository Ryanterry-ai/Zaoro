// ─── Capability Registry Types (Phase R2 — Capability Canonicalization) ──
// ONE identity per capability. Every subsystem (ontology, experience, knowledge
// packs, components, evaluation, learning) references these canonical IDs
// instead of ad-hoc tags. See docs/phase-r2-capability-canonicalization.md.

export type CapabilityId = string; // dot-namespaced, e.g. "commerce.checkout"

export interface Capability {
  /** Canonical, dot-namespaced identity. The single truth. */
  id: CapabilityId;
  displayName: string;
  /** Raw tags from any of the legacy vocabularies that fold into `id`. */
  aliases: string[];
  /** Top-level namespace, e.g. "commerce". */
  domain: string;
  /** Broader capabilities (is-a). */
  parents: CapabilityId[];
  /** Narrower capabilities. */
  children: CapabilityId[];
  /** Capabilities that must also be present for this one to function. */
  dependencies: CapabilityId[];
  requiredEntities: string[];
  requiredWorkflows: string[];
  requiredComponents: string[];
  requiredEvaluators: string[];
  requiredExperience: string[];
  /** Renderer/stack features this capability needs (e.g. "r3f", "animation"). */
  rendererSupport: string[];
  /** Industries that imply this capability (used for industry → capability expansion). */
  industries: string[];
  /**
   * Primitive-pack `providesCapabilities` tags (dimension-prefixed, e.g.
   * "content:seo-heavy") that this canonical capability should activate when
   * composing knowledge. Lets the legacy pack graph consume canonical IDs.
   */
  primitivePackTags?: string[];
}

export interface ResolvedCapabilities {
  /** Raw requested inputs, each normalized to its canonical id (where possible). */
  requested: CapabilityId[];
  /** Deduplicated, normalized canonical ids (no dependency expansion). */
  canonical: CapabilityId[];
  /** `canonical` plus all transitive dependencies, in resolution order. */
  expanded: CapabilityId[];
  /** Inputs that could not be normalized to any known capability. */
  unknown: string[];
}

export interface CapabilityManifest {
  schema: 'capability-manifest@1';
  engineVersion: string;
  /** Canonical ids this application declares (expanded + dependency-resolved). */
  capabilities: CapabilityId[];
  /** Raw capabilities detected/requested before normalization. */
  requested: string[];
  /** Capability ids that could not be resolved. */
  unresolved: string[];
  /** Industry used to expand capabilities (if any). */
  industry?: string;
}

export const ENGINE_VERSION = '4.0.0';
