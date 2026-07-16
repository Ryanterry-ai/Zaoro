// ─── Capability Graph (Phase 2) ────────────────────────────────────
// Answers "what knowledge is actually needed?" Given a set of required
// capabilities, it returns the minimal primitive packs that satisfy them.
// This is the knowledge-composition Reasoning Engine the redesign calls for:
// it composes only the primitives required for the current build, instead of
// loading a monolithic per-industry pack.

import { PrimitivePack } from './types.js';

export class CapabilityGraph {
  private capIndex = new Map<string, PrimitivePack[]>();

  constructor(packs: PrimitivePack[]) {
    for (const pack of packs) {
      for (const cap of pack.providesCapabilities ?? []) {
        const list = this.capIndex.get(cap) ?? [];
        list.push(pack);
        this.capIndex.set(cap, list);
      }
    }
  }

  /** All primitive packs that provide any of the given capabilities. */
  getPrimitivePacksForCapabilities(capabilities: string[]): PrimitivePack[] {
    const out = new Map<string, PrimitivePack>();
    for (const cap of capabilities) {
      for (const pack of this.capIndex.get(cap) ?? []) {
        out.set(pack.id, pack);
      }
    }
    return Array.from(out.values());
  }

  /** Capabilities known to the graph. */
  knownCapabilities(): string[] {
    return Array.from(this.capIndex.keys());
  }

  /** Which capabilities a pack satisfies (for inspection). */
  capabilitiesOf(packId: string): string[] {
    for (const [cap, packs] of this.capIndex) {
      if (packs.some(p => p.id === packId)) return this.capabilitiesOfPack(packId, cap);
    }
    return [];
  }

  private capabilitiesOfPack(packId: string, _sample: string): string[] {
    const result: string[] = [];
    for (const [cap, packs] of this.capIndex) {
      if (packs.some(p => p.id === packId)) result.push(cap);
    }
    return result;
  }
}
