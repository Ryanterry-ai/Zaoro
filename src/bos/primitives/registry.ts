// ─── Primitive Registry ─────────────────────────────────────────────
// The canonical knowledge base of known primitives and their brand
// associations.  This is what makes "Apple → Minimalism" work without
// the LLM.
//
// The registry is seeded with known brands and their associated
// primitives.  New primitives are added via the Evolution system
// (candidate store → validation → promotion).

import type { Primitive, PrimitiveDomain, PrimitiveRelationship } from './types.js';

// ─── Seeded Brand Primitives ────────────────────────────────────────
// Key: brand name (lowercased).  Value: array of primitive ids.

export const BRAND_PRIMITIVES: Record<string, string[]> = {
  apple:    ['minimalism', 'precision', 'whitespace', 'hierarchy', 'typography', 'neutral-palette', 'confidence', 'calm'],
  nike:     ['energy', 'aggression', 'speed', 'bold-typography', 'contrast', 'movement', 'empowerment', 'athletic'],
  tesla:    ['engineering', 'future', 'dark', 'minimalism', 'precision', 'innovation', 'sustainability', 'glass'],
  rolex:    ['luxury', 'craftsmanship', 'precision', 'timelessness', 'heritage', 'gold', 'exclusivity', 'perfection'],
  ikea:     ['simplicity', 'functional', 'warm-palette', 'accessibility', 'affordability', 'modularity', 'nordic'],
  cyberpunk:['neon', 'dark', 'glitch', 'futuristic', 'industrial', 'high-contrast', 'digital', 'dystopian'],
  nothing:  ['transparency', 'glyph', 'industrial', 'minimalism', 'led-animation', 'monochrome', 'raw'],
  ferrari:  ['speed', 'passion', 'red', 'luxury', 'engineering', 'heritage', 'exclusivity', 'aerodynamic'],
  google:  ['simplicity', 'colorful', 'playful', 'accessible', 'clean', 'functional', 'friendly'],
  amazon:  ['efficiency', 'trust', 'speed', 'practicality', 'convenience', 'reliability', 'scale'],
  spotify: ['vibrant', 'personalization', 'energy', 'dark', 'gradient', 'discovery', 'social'],
  airbnb:  ['warmth', 'authenticity', 'community', 'photography', 'trust', 'belonging', 'local'],
};

// ─── Canonical Primitives ───────────────────────────────────────────
// Each primitive is a node in the graph.  Relationships form edges.

const PRIMITIVE_NODES: Array<Omit<Primitive, 'relationships' | 'lastObserved' | 'observationCount'>> = [
  // Design primitives
  { id: 'minimalism', name: 'Minimalism', domain: 'design', description: 'Reduction to essentials, whitespace-dominant', weight: 0, confidence: 1, status: 'canonical', industries: ['luxury', 'technology', 'fashion'] },
  { id: 'precision', name: 'Precision', domain: 'design', description: 'Exact alignment, grid-perfect, mathematical', weight: 0, confidence: 1, status: 'canonical', industries: ['technology', 'luxury', 'manufacturing'] },
  { id: 'whitespace', name: 'Whitespace', domain: 'design', description: 'Generous negative space, breathing room', weight: 0, confidence: 1, status: 'canonical', industries: ['luxury', 'technology', 'fashion'] },
  { id: 'hierarchy', name: 'Visual Hierarchy', domain: 'design', description: 'Clear focal points, guided eye movement', weight: 0, confidence: 1, status: 'canonical', industries: ['all'] },
  { id: 'typography', name: 'Typography', domain: 'design', description: 'Type as a primary design element', weight: 0, confidence: 1, status: 'canonical', industries: ['all'] },
  { id: 'neutral-palette', name: 'Neutral Palette', domain: 'design', description: 'Grays, whites, blacks with minimal accent', weight: 0, confidence: 1, status: 'canonical', industries: ['technology', 'luxury'] },
  { id: 'bold-typography', name: 'Bold Typography', domain: 'design', description: 'Oversized, impactful type', weight: 0, confidence: 1, status: 'canonical', industries: ['fashion', 'sports', 'entertainment'] },
  { id: 'contrast', name: 'High Contrast', domain: 'design', description: 'Dramatic light/dark or color opposition', weight: 0, confidence: 1, status: 'canonical', industries: ['sports', 'entertainment', 'technology'] },
  { id: 'warm-palette', name: 'Warm Palette', domain: 'design', description: 'Earth tones, natural warmth', weight: 0, confidence: 1, status: 'canonical', industries: ['food', 'hospitality', 'home'] },
  { id: 'glass', name: 'Glassmorphism', domain: 'design', description: 'Frosted glass, translucent layers', weight: 0, confidence: 1, status: 'canonical', industries: ['technology', 'beauty'] },

  // Emotional primitives
  { id: 'confidence', name: 'Confidence', domain: 'psychology', description: 'Assured, unshakeable presence', weight: 0, confidence: 1, status: 'canonical', industries: ['luxury', 'technology', 'finance'] },
  { id: 'calm', name: 'Calm', domain: 'psychology', description: 'Peaceful, unhurried, serene', weight: 0, confidence: 1, status: 'canonical', industries: ['healthcare', 'wellness', 'luxury'] },
  { id: 'energy', name: 'Energy', domain: 'psychology', description: 'High-octane, invigorating, alive', weight: 0, confidence: 1, status: 'canonical', industries: ['sports', 'entertainment', 'youth'] },
  { id: 'empowerment', name: 'Empowerment', domain: 'psychology', description: 'Strength, capability, taking control', weight: 0, confidence: 1, status: 'canonical', industries: ['sports', 'fitness', 'education'] },
  { id: 'trust', name: 'Trust', domain: 'psychology', description: 'Reliability, safety, dependability', weight: 0, confidence: 1, status: 'canonical', industries: ['finance', 'healthcare', 'enterprise'] },
  { id: 'desire', name: 'Desire', domain: 'psychology', description: 'Aspiration, wanting, aspiration', weight: 0, confidence: 1, status: 'canonical', industries: ['luxury', 'fashion', 'automotive'] },
  { id: 'curiosity', name: 'Curiosity', domain: 'psychology', description: 'Discovery, exploration, wonder', weight: 0, confidence: 1, status: 'canonical', industries: ['technology', 'education', 'travel'] },
  { id: 'exclusivity', name: 'Exclusivity', domain: 'psychology', description: 'Scarcity, premium access, elite', weight: 0, confidence: 1, status: 'canonical', industries: ['luxury', 'fashion', 'art'] },

  // Motion primitives
  { id: 'speed', name: 'Speed', domain: 'motion', description: 'Fast, dynamic, urgent', weight: 0, confidence: 1, status: 'canonical', industries: ['sports', 'automotive', 'technology'] },
  { id: 'movement', name: 'Movement', domain: 'motion', description: 'Constant kinetic energy, nothing static', weight: 0, confidence: 1, status: 'canonical', industries: ['sports', 'entertainment', 'youth'] },
  { id: 'heritage', name: 'Heritage', domain: 'motion', description: 'Slow, deliberate, timeless pace', weight: 0, confidence: 1, status: 'canonical', industries: ['luxury', 'automotive', 'craft'] },

  // Business primitives
  { id: 'craftsmanship', name: 'Craftsmanship', domain: 'business', description: 'Handmade quality, artisanal detail', weight: 0, confidence: 1, status: 'canonical', industries: ['luxury', 'food', 'automotive'] },
  { id: 'innovation', name: 'Innovation', domain: 'business', description: 'Cutting-edge, forward-thinking', weight: 0, confidence: 1, status: 'canonical', industries: ['technology', 'automotive', 'energy'] },
  { id: 'efficiency', name: 'Efficiency', domain: 'business', description: 'Streamlined, optimized, frictionless', weight: 0, confidence: 1, status: 'canonical', industries: ['enterprise', 'logistics', 'commerce'] },
  { id: 'sustainability', name: 'Sustainability', domain: 'business', description: 'Eco-conscious, responsible, future-safe', weight: 0, confidence: 1, status: 'canonical', industries: ['energy', 'fashion', 'food'] },

  // Tech primitives
  { id: 'dark', name: 'Dark Theme', domain: 'technology', description: 'Dark backgrounds, light text', weight: 0, confidence: 1, status: 'canonical', industries: ['technology', 'gaming', 'entertainment'] },
  { id: 'future', name: 'Futuristic', domain: 'technology', description: 'Forward-looking, sci-fi influenced', weight: 0, confidence: 1, status: 'canonical', industries: ['technology', 'automotive', 'energy'] },
  { id: 'neon', name: 'Neon Aesthetic', domain: 'technology', description: 'Vibrant glowing accents on dark', weight: 0, confidence: 1, status: 'canonical', industries: ['gaming', 'nightlife', 'entertainment'] },

  // Commerce primitives
  { id: 'urgency', name: 'Urgency', domain: 'conversion', description: 'Time pressure, scarcity signals', weight: 0, confidence: 1, status: 'canonical', industries: ['commerce', 'travel', 'events'] },
  { id: 'social-proof', name: 'Social Proof', domain: 'conversion', description: 'Reviews, ratings, testimonials', weight: 0, confidence: 1, status: 'canonical', industries: ['commerce', 'saas', 'food'] },
];

// ─── Relationship Graph ─────────────────────────────────────────────
// Each relationship is an edge in the primitive graph.

const PRIMITIVE_EDGES: Array<{ source: string } & PrimitiveRelationship> = [
  // Minimalism chain
  { source: 'minimalism', targetId: 'whitespace', strength: 0.95, type: 'implies' },
  { source: 'minimalism', targetId: 'hierarchy', strength: 0.90, type: 'requires' },
  { source: 'minimalism', targetId: 'calm', strength: 0.80, type: 'implies' },
  { source: 'whitespace', targetId: 'calm', strength: 0.85, type: 'enhances' },
  { source: 'hierarchy', targetId: 'confidence', strength: 0.75, type: 'enhances' },
  { source: 'calm', targetId: 'confidence', strength: 0.70, type: 'implies' },

  // Energy chain
  { source: 'energy', targetId: 'speed', strength: 0.90, type: 'implies' },
  { source: 'energy', targetId: 'movement', strength: 0.88, type: 'implies' },
  { source: 'energy', targetId: 'bold-typography', strength: 0.70, type: 'enhances' },
  { source: 'speed', targetId: 'contrast', strength: 0.65, type: 'enhances' },
  { source: 'movement', targetId: 'contrast', strength: 0.60, type: 'enhances' },

  // Luxury chain
  { source: 'luxury', targetId: 'craftsmanship', strength: 0.92, type: 'implies' },
  { source: 'craftsmanship', targetId: 'precision', strength: 0.88, type: 'requires' },
  { source: 'craftsmanship', targetId: 'heritage', strength: 0.75, type: 'enhances' },
  { source: 'precision', targetId: 'confidence', strength: 0.80, type: 'enhances' },
  { source: 'exclusivity', targetId: 'desire', strength: 0.85, type: 'enhances' },

  // Tech chain
  { source: 'innovation', targetId: 'future', strength: 0.90, type: 'implies' },
  { source: 'future', targetId: 'dark', strength: 0.60, type: 'enhances' },
  { source: 'dark', targetId: 'neon', strength: 0.70, type: 'enhances' },
  { source: 'dark', targetId: 'glass', strength: 0.55, type: 'enhances' },

  // Trust chain
  { source: 'trust', targetId: 'social-proof', strength: 0.85, type: 'implies' },
  { source: 'trust', targetId: 'efficiency', strength: 0.65, type: 'enhances' },
  { source: 'social-proof', targetId: 'confidence', strength: 0.70, type: 'enhances' },

  // Conversion chain
  { source: 'urgency', targetId: 'energy', strength: 0.60, type: 'enhances' },
  { source: 'urgency', targetId: 'movement', strength: 0.55, type: 'enhances' },

  // Conflicts
  { source: 'minimalism', targetId: 'neon', strength: 0.80, type: 'conflicts' },
  { source: 'calm', targetId: 'urgency', strength: 0.85, type: 'conflicts' },
  { source: 'heritage', targetId: 'future', strength: 0.70, type: 'conflicts' },
  { source: 'exclusivity', targetId: 'accessibility', strength: 0.60, type: 'conflicts' },
];

// ─── Registry ───────────────────────────────────────────────────────

class PrimitiveRegistry {
  private nodes = new Map<string, Primitive>();

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Build nodes
    for (const def of PRIMITIVE_NODES) {
      const node: Primitive = {
        ...def,
        relationships: [],
        lastObserved: Date.now(),
        observationCount: 1,
      };
      this.nodes.set(node.id, node);
    }

    // Build edges
    for (const edge of PRIMITIVE_EDGES) {
      const source = this.nodes.get(edge.source);
      if (source) {
        source.relationships.push({
          targetId: edge.targetId,
          strength: edge.strength,
          type: edge.type,
          chain: edge.chain,
        });
      }
    }
  }

  /** Get a primitive by id. */
  get(id: string): Primitive | undefined {
    return this.nodes.get(id);
  }

  /** Get all primitives. */
  all(): Primitive[] {
    return [...this.nodes.values()];
  }

  /** Get primitives for a brand. */
  forBrand(brand: string): Primitive[] {
    const ids = BRAND_PRIMITIVES[brand.toLowerCase()] ?? [];
    return ids.map(id => this.nodes.get(id)).filter(Boolean) as Primitive[];
  }

  /** Get all relationships from a primitive. */
  relationships(id: string): PrimitiveRelationship[] {
    return this.nodes.get(id)?.relationships ?? [];
  }

  /** Check if two primitives conflict. */
  conflicts(a: string, b: string): boolean {
    const nodeA = this.nodes.get(a);
    if (!nodeA) return false;
    return nodeA.relationships.some(
      r => r.targetId === b && r.type === 'conflicts'
    );
  }

  /** Get multi-hop chains from a primitive. */
  chains(id: string, maxDepth: number = 4): Array<{ path: string[]; strength: number }> {
    const results: Array<{ path: string[]; strength: number }> = [];
    const visited = new Set<string>();

    const dfs = (current: string, path: string[], totalStrength: number) => {
      if (path.length > maxDepth || visited.has(current)) return;
      visited.add(current);

      const rels = this.relationships(current);
      for (const rel of rels) {
        if (rel.type === 'conflicts') continue;
        const newPath = [...path, rel.targetId];
        const newStrength = totalStrength * rel.strength;
        results.push({ path: newPath, strength: newStrength });
        dfs(rel.targetId, newPath, newStrength);
      }

      visited.delete(current);
    };

    dfs(id, [id], 1);
    return results;
  }

  /** Register a new primitive (from evolution). */
  register(primitive: Primitive): void {
    this.nodes.set(primitive.id, primitive);
  }

  /** Observe a primitive (increments count, updates timestamp). */
  observe(id: string): void {
    const node = this.nodes.get(id);
    if (node) {
      node.observationCount++;
      node.lastObserved = Date.now();
    }
  }
}

// Singleton
export const primitiveRegistry = new PrimitiveRegistry();
