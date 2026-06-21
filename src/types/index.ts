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