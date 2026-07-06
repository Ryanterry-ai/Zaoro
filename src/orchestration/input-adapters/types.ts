import type { ProjectManifest, IntentType, Industry } from '../types.js';
import { IntentType as IntentEnum } from '../types.js';

export interface AdapterResult {
  manifest: ProjectManifest;
  adapterType: IntentType;
  confidence: number;
  detectedIndustry?: Industry | undefined;
  detectedName?: string | undefined;
  entities: string[];
  pages: string[];
  integrations: string[];
  metadata: Record<string, unknown>;
}

export interface InputAdapter {
  readonly type: IntentType;
  canHandle(input: string): boolean;
  process(input: string, options?: Record<string, unknown>): Promise<AdapterResult>;
}

export { IntentEnum };
