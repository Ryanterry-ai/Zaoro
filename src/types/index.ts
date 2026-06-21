export type PatchAction = 'insert' | 'update' | 'delete';

export interface ASTPatch {
  targetFile: string;
  targetExport?: string;
  action: PatchAction;
  codeBlock: string;
}

export interface CompilationError {
  file: string;
  line: number;
  code: string;
  message: string;
}

export interface CompressedError {
  file: string;
  line: number;
  code: string;
  message: string;
}

export interface WorkspaceConfig {
  workspaceId: string;
  rootPath: string;
}

export type LLMProvider = 'openai' | 'anthropic' | 'gemini';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
}

export interface LLMContext {
  prompt: string;
  errors: CompressedError[];
  attempt: number;
  changedFiles: string[];
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  safeToApply: ASTPatch[];
  rejected: ASTPatch[];
}

export interface SimulationResult {
  success: boolean;
  reason?: string;
  simulatedFiles?: Map<string, string>;
}

export interface DataField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'DateTime' | 'relation';
  isRequired: boolean;
  isId?: boolean;
}

export interface DataModel {
  name: string;
  fields: DataField[];
}

export interface APIRouteSpec {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  targetModel: string;
  description: string;
}

export interface StateStoreSpec {
  name: string;
  properties: Array<{ name: string; type: string; initialValue: string }>;
  actions: Array<{ name: string; params: string; logic: string }>;
}

export interface FullStackBlueprint {
  appName: string;
  colorScheme: 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky';
  dataModels: DataModel[];
  apiRoutes: APIRouteSpec[];
  stateStores: StateStoreSpec[];
  pages: Array<{ path: string; title: string; layout: string; blocks: string[] }>;
}

export type GenerationIntentType =
  | 'build-app'
  | 'build-website'
  | 'clone-website'
  | 'analyze-domain'
  | 'extract-components'
  | 'extract-design-system';

export interface GenerationIntent {
  type: GenerationIntentType;
  prompt?: string;
  targetUrl?: string;
  domain?: string;
  businessType?: string;
  strategy?: 'full-clone' | 'structure-clone' | 'style-clone';
}

export interface GenerationResult {
  success: boolean;
  intent: GenerationIntent;
  workspaceId?: string;
  blueprint?: unknown;
  clonePlan?: unknown;
  analysis?: unknown;
  error?: string;
  duration: number;
}
