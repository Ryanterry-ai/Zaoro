export type {
  PrimitiveCategory,
  PrimitiveRelationshipType,
  ConfidentPrimitive,
  EntityEvidence,
  IntentDecomposition,
} from './types.js';
export { IntentDecomposer } from './intent-decomposer.js';
export { buildPrimitiveGraph, SEED_PRIMITIVES, SEED_RELATIONSHIPS, ENTITY_TO_PRIMITIVES } from './primitive-seeds.js';
