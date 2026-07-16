import type { IntentDecomposition, ConfidentPrimitive, EntityEvidence } from './types.js';
import type { PrimitiveGraph } from '../graph/primitive-graph.js';

interface ExtractedEntity {
  name: string;
  confidence: number;
  type: 'brand' | 'industry' | 'concept' | 'style' | 'feature';
}

export class IntentDecomposer {
  constructor(
    private graph: PrimitiveGraph,
    private entityMap: Record<string, string[]>,
  ) {}

  decompose(prompt: string): IntentDecomposition {
    const entities = this.extractEntities(prompt);
    const primitives = this.mapToPrimitives(entities);
    const propagated = this.propagateConfidence(primitives);
    const overallConfidence = this.computeOverallConfidence(propagated);

    return {
      entities,
      primitives: propagated,
      overallConfidence,
      evidenceTrail: this.buildEvidenceTrail(entities),
    };
  }

  private extractEntities(prompt: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const seen = new Set<string>();

    for (const [entity] of Object.entries(this.entityMap)) {
      if (prompt.toLowerCase().includes(entity.toLowerCase())) {
        if (!seen.has(entity)) {
          seen.add(entity);
          entities.push({
            name: entity,
            confidence: this.computeEntityConfidence(entity, prompt),
            type: this.classifyEntity(entity),
          });
        }
      }
    }

    const words = prompt.split(/\s+/);
    for (const word of words) {
      const cleaned = word.replace(/[^a-zA-Z]/g, '');
      if (cleaned.length > 2 && cleaned[0] === cleaned[0].toUpperCase() && !seen.has(cleaned)) {
        seen.add(cleaned);
        entities.push({
          name: cleaned,
          confidence: 0.4,
          type: 'concept',
        });
      }
    }

    return entities;
  }

  private mapToPrimitives(entities: ExtractedEntity[]): ConfidentPrimitive[] {
    const primitiveMap = new Map<string, ConfidentPrimitive>();

    for (const entity of entities) {
      const primitiveIds = this.entityMap[entity.name] ?? [];
      for (const primitiveId of primitiveIds) {
        const existing = primitiveMap.get(primitiveId);
        if (existing) {
          existing.confidence = Math.max(existing.confidence, entity.confidence);
          existing.evidence.push({
            entity: entity.name,
            source: 'entity',
            confidence: entity.confidence,
          });
        } else {
          primitiveMap.set(primitiveId, {
            primitiveId,
            confidence: entity.confidence,
            evidence: [{
              entity: entity.name,
              source: 'entity',
              confidence: entity.confidence,
            }],
          });
        }
      }
    }

    return [...primitiveMap.values()];
  }

  private propagateConfidence(primitives: ConfidentPrimitive[]): ConfidentPrimitive[] {
    const result = new Map(primitives.map(p => [p.primitiveId, { ...p }]));

    for (const primitive of primitives) {
      const rels = this.graph.getRelationships(primitive.primitiveId);
      for (const rel of rels) {
        if (rel.type === 'implies' || rel.type === 'strengthens') {
          const target = result.get(rel.target);
          if (target) {
            target.confidence = Math.min(1, target.confidence + rel.weight * 0.1);
          } else {
            result.set(rel.target, {
              primitiveId: rel.target,
              confidence: primitive.confidence * rel.weight * 0.8,
              evidence: [{
                entity: primitive.primitiveId,
                source: 'composition',
                confidence: primitive.confidence * rel.weight,
              }],
            });
          }
        }
      }
    }

    return [...result.values()];
  }

  private computeOverallConfidence(primitives: ConfidentPrimitive[]): number {
    if (primitives.length === 0) return 0;
    const total = primitives.reduce((sum, p) => sum + p.confidence, 0);
    return total / primitives.length;
  }

  private buildEvidenceTrail(entities: ExtractedEntity[]): EntityEvidence[] {
    return entities.map(e => ({
      entity: e.name,
      source: 'entity' as const,
      confidence: e.confidence,
    }));
  }

  private computeEntityConfidence(entity: string, prompt: string): number {
    const known = this.entityMap[entity];
    if (known && prompt.toLowerCase().includes(entity.toLowerCase())) {
      return 0.85;
    }
    return 0.4;
  }

  private classifyEntity(entity: string): 'brand' | 'industry' | 'concept' | 'style' | 'feature' {
    const brands = ['Apple', 'Nike', 'Tesla', 'Netflix', 'Iron Man', 'Gundam', 'Transformers',
      'Batman', 'Spider-Man', 'Chanel', 'Louis Vuitton', 'Rolex', 'Gucci', 'Google', 'Microsoft',
      'Amazon', 'Spotify', 'Airbnb', 'Stripe'];
    if (brands.includes(entity)) return 'brand';
    const industries = ['Coffee', 'Gym', 'Restaurant', 'Hospital', 'School', 'Bank', 'Startup',
      'Agency', 'Ecommerce', 'SaaS', 'Real Estate', 'Luxury Watch', 'Perfume', 'Sports', 'Music'];
    if (industries.includes(entity)) return 'industry';
    const styles = ['minimalism', 'luxury', 'bold', 'retro', 'futuristic', 'organic', 'corporate', 'playful'];
    if (styles.includes(entity.toLowerCase())) return 'style';
    return 'concept';
  }
}
