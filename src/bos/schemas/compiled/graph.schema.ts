import { z } from 'zod';
import { VersionTag, ObjectStatus, ISODate } from '../common.js';

export const CompiledNodeSchema = z.object({
  id: z.number(),
  type: z.string(),
  key: z.string(),
  props: z.record(z.string(), z.unknown()).default({}),
  evidenceIds: z.array(z.number()).default([]),
  status: ObjectStatus.default('active'),
  version: VersionTag,
});
export type CompiledNode = z.infer<typeof CompiledNodeSchema>;

export const CompiledEdgeSchema = z.object({
  id: z.number(),
  type: z.string(),
  source: z.number(),
  target: z.number(),
  weight: z.number().min(0).max(1).default(1),
  props: z.record(z.string(), z.unknown()).default({}),
});
export type CompiledEdge = z.infer<typeof CompiledEdgeSchema>;

export const DictionaryPackSchema = z.object({
  strings: z.array(z.string()),
  typeMap: z.record(z.string(), z.number()),
  edgeTypeMap: z.record(z.string(), z.number()),
});
export type DictionaryPack = z.infer<typeof DictionaryPackSchema>;

export const CompiledGraphSchema = z.object({
  version: VersionTag,
  compiledAt: ISODate,
  nodeCount: z.number(),
  edgeCount: z.number(),
  nodes: z.array(CompiledNodeSchema),
  edges: z.array(CompiledEdgeSchema),
  dictionaries: DictionaryPackSchema,
});
export type CompiledGraph = z.infer<typeof CompiledGraphSchema>;

export const CompiledIndexesSchema = z.object({
  version: VersionTag,
  compiledAt: ISODate,
  byRole: z.record(z.string(), z.array(z.number())).default({}),
  byEntity: z.record(z.string(), z.array(z.number())).default({}),
  byPattern: z.record(z.string(), z.array(z.number())).default({}),
  byCapability: z.record(z.string(), z.array(z.number())).default({}),
  byJourney: z.record(z.string(), z.array(z.number())).default({}),
  byIndustry: z.record(z.string(), z.array(z.number())).default({}),
  byBusinessModel: z.record(z.string(), z.array(z.number())).default({}),
  designTokens: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
  bloomFilter: z.object({
    size: z.number(),
    hashes: z.array(z.number()),
  }).optional(),
});
export type CompiledIndexes = z.infer<typeof CompiledIndexesSchema>;
