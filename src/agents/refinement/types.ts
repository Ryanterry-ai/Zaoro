export type RefinementAction =
  | { type: 'update-component'; componentPath: string; changes: Record<string, unknown> }
  | { type: 'add-page'; page: PageSpec }
  | { type: 'remove-page'; pagePath: string }
  | { type: 'update-style'; target: string; styles: Record<string, string> }
  | { type: 'update-content'; target: string; content: string }
  | { type: 'add-feature'; feature: string; config: Record<string, unknown> }
  | { type: 'fix-bug'; description: string; affectedFiles: string[] };

export interface PageSpec {
  route: string;
  name: string;
  components: string[];
  metadata?: Record<string, string>;
}

export interface ConversationEntry {
  id: string;
  timestamp: number;
  role: 'user' | 'assistant';
  content: string;
  action?: RefinementAction;
  affectedFiles?: string[];
}

export interface ConversationEntryInput {
  role: 'user' | 'assistant';
  content: string;
  action?: RefinementAction;
  affectedFiles?: string[];
}

export interface BuildSnapshot {
  id: string;
  timestamp: number;
  files: Map<string, string>;
  metadata: {
    appName: string;
    industry: string;
    platform: string;
    prompt: string;
  };
}

export interface RefinementResult {
  success: boolean;
  action: RefinementAction;
  changes: FileChange[];
  summary: string;
  snapshotId: string;
}

export interface FileChange {
  path: string;
  action: 'create' | 'update' | 'delete';
  before?: string;
  after?: string;
  diff?: string;
}
