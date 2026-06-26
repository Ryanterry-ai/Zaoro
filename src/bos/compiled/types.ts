export interface CompiledNodeRecord {
  id: number;
  type: string;
  key: string;
  props: Record<string, unknown>;
  evidenceIds: number[];
  status: 'active' | 'deprecated' | 'superseded' | 'experimental';
  version: string;
}

export interface CompiledEdgeRecord {
  id: number;
  type: string;
  source: number;
  target: number;
  weight: number;
  props: Record<string, unknown>;
}

export interface DictionaryPack {
  strings: string[];
  typeMap: Record<string, number>;
  edgeTypeMap: Record<string, number>;
}

export interface CompiledGraphData {
  version: string;
  compiledAt: string;
  nodeCount: number;
  edgeCount: number;
  nodes: CompiledNodeRecord[];
  edges: CompiledEdgeRecord[];
  dictionaries: DictionaryPack;
}

export interface CompiledIndexesData {
  version: string;
  compiledAt: string;
  byRole: Record<string, number[]>;
  byEntity: Record<string, number[]>;
  byPattern: Record<string, number[]>;
  byCapability: Record<string, number[]>;
  byJourney: Record<string, number[]>;
  byIndustry: Record<string, number[]>;
  byBusinessModel: Record<string, number[]>;
  designTokens: Record<string, Record<string, unknown>>;
  bloomFilter?: {
    size: number;
    hashes: number[];
  };
}

export interface CompiledOutput {
  graph: CompiledGraphData;
  indexes: CompiledIndexesData;
}
