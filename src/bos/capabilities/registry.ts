// ─── Capability Registry (Phase R2) ──────────────────────────────────
// The single source of truth for capability identity. Normalizes any legacy
// tag to a canonical id, expands dependencies, and emits a Capability Manifest
// that evaluation / components / experience / renderer / learning / benchmarking
// / self-healing all reason from.

import type { Capability, CapabilityId, CapabilityManifest, ResolvedCapabilities } from './types.js';
import { ENGINE_VERSION } from './types.js';
import { CANONICAL_CAPABILITIES } from './registry-data.js';

function norm(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-');
}

export class CapabilityRegistry {
  private byId = new Map<CapabilityId, Capability>();
  private aliasIndex = new Map<string, CapabilityId>();

  constructor(capabilities: Capability[] = CANONICAL_CAPABILITIES) {
    for (const c of capabilities) {
      c.parents = c.parents ?? [];
      c.children = c.children ?? [];
      this.byId.set(c.id, c);
    }
    // Alias index (canonical id itself is also resolvable).
    for (const c of capabilities) {
      this.aliasIndex.set(c.id.toLowerCase(), c.id);
      this.aliasIndex.set(norm(c.id), c.id);
      for (const a of c.aliases) {
        this.aliasIndex.set(a.toLowerCase(), c.id);
        this.aliasIndex.set(norm(a), c.id);
      }
    }
    // Derive parents/children from dependency edges.
    for (const c of capabilities) {
      for (const dep of c.dependencies) {
        const parent = this.byId.get(dep);
        if (parent && !parent.children.includes(c.id)) parent.children.push(c.id);
        const child = this.byId.get(c.id);
        if (child && !child.parents.includes(dep)) child.parents.push(dep);
      }
    }
  }

  /** All canonical capabilities. */
  all(): Capability[] {
    return Array.from(this.byId.values());
  }

  /** Get a capability by canonical id. */
  get(id: CapabilityId): Capability | undefined {
    return this.byId.get(id);
  }

  /** All raw tags/aliases that resolve to a canonical id. */
  knownAliases(): string[] {
    return Array.from(this.aliasIndex.keys());
  }

  /** Normalize a raw tag to its canonical id, or null if unknown. */
  normalize(raw: string): CapabilityId | null {
    if (!raw) return null;
    return this.aliasIndex.get(norm(raw)) ?? this.aliasIndex.get(raw.toLowerCase()) ?? null;
  }

  /**
   * Resolve raw capability inputs into canonical ids with full dependency
   * expansion. If `industry` is provided, capabilities declared for that
   * industry are also included (industry → ontology → capabilities flow).
   */
  resolve(inputs: string[], opts?: { industry?: string }): ResolvedCapabilities {
    const requested: CapabilityId[] = [];
    const unknown: string[] = [];
    const canonicalSet = new Set<CapabilityId>();

    for (const input of inputs) {
      const id = this.normalize(input);
      if (id) {
        if (!canonicalSet.has(id)) requested.push(id);
        canonicalSet.add(id);
      } else {
        unknown.push(input);
      }
    }

    // Industry → capability expansion.
    if (opts?.industry) {
      const ind = opts.industry.toLowerCase();
      for (const c of this.byId.values()) {
        if (c.industries.some(i => i.toLowerCase() === ind)) canonicalSet.add(c.id);
      }
    }

    // Dependency expansion (transitive, stable order).
    const expanded: CapabilityId[] = [];
    const seen = new Set<CapabilityId>();
    const visit = (id: CapabilityId) => {
      if (seen.has(id)) return;
      seen.add(id);
      const cap = this.byId.get(id);
      if (cap) {
        for (const dep of cap.dependencies) visit(dep);
      }
      if (!expanded.includes(id)) expanded.push(id);
    };
    for (const id of canonicalSet) visit(id);

    const canonical = Array.from(canonicalSet).sort();
    return { requested, canonical, expanded, unknown };
  }

  /** Map resolved canonical ids to the primitive-pack tags they activate. */
  primitivePackTagsFor(ids: CapabilityId[]): string[] {
    const tags = new Set<string>();
    for (const id of ids) {
      const cap = this.byId.get(id);
      if (cap?.primitivePackTags) for (const t of cap.primitivePackTags) tags.add(t);
    }
    return Array.from(tags);
  }

  /**
   * Fraction of required (expanded) capabilities present in `fulfilled`.
   * Used by the production acceptance gate's `capabilityCoverage` check.
   */
  coverageScore(requiredExpanded: CapabilityId[], fulfilled: CapabilityId[]): number {
    if (requiredExpanded.length === 0) return 1;
    const fulfilledSet = new Set(fulfilled.map(f => this.normalize(f) ?? f));
    const covered = requiredExpanded.filter(id => fulfilledSet.has(id)).length;
    return covered / requiredExpanded.length;
  }

  /** Build the Capability Manifest for a generated application. */
  buildManifest(inputs: string[], opts?: { industry?: string }): CapabilityManifest {
    const resolved = this.resolve(inputs, opts);
    return {
      schema: 'capability-manifest@1',
      engineVersion: ENGINE_VERSION,
      capabilities: resolved.expanded,
      requested: inputs,
      unresolved: resolved.unknown,
      industry: opts?.industry,
    };
  }
}

/** The single runtime instance. Everything imports this. */
export const capabilityRegistry = new CapabilityRegistry();

/** Convenience: resolve raw inputs to canonical + expanded ids. */
export function resolveCapabilities(inputs: string[], opts?: { industry?: string }): ResolvedCapabilities {
  return capabilityRegistry.resolve(inputs, opts);
}

/**
 * Scale (Phase R2 / Step 4): given an industry + seed capability inputs, expand
 * to the full working capability set the build must cover. This is the "scaling
 * mechanism" — it is driven entirely by the canonical registry (dependency
 * expansion) plus cross-cutting defaults, so a build scales correctly without
 * hand-maintained industry lists. Returns the expanded set split into domain
 * capabilities and cross-cutting (framework-agnostic) capabilities.
 */
export function scaleCapabilities(
  industry: string,
  seeds: string[],
): { expanded: CapabilityId[]; domain: CapabilityId[]; crossCutting: CapabilityId[] } {
  const resolved = capabilityRegistry.resolve(seeds, { industry });
  const crossCutting = resolved.expanded.filter(id => !id.includes('.'));
  const domain = resolved.expanded.filter(id => id.includes('.'));
  return { expanded: resolved.expanded, domain, crossCutting };
}
