/**
 * =============================================================================
 * Build.same V3
 * Compiler Planning Layer - Context
 * =============================================================================
 * Compilation context for the blueprint compiler.
 * Provides configuration and state for the compilation process.
 */

import type { BusinessBlueprint } from '../business/business-types.js';
import type { ApplicationBlueprint } from '../application/application-types.js';
import type { BuildManifest } from '../manifest/manifest-types.js';

/* -------------------------------------------------------------------------- */
/*                           COMPILER CONTEXT                                  */
/* -------------------------------------------------------------------------- */

export interface CompilerContextConfig {
  readonly workspaceDir: string;
  readonly enableVerification: boolean;
  readonly enableSelfHealing: boolean;
  readonly maxRetries: number;
  readonly timeoutMs: number;
}

export interface CompilerContextState {
  businessBlueprint?: BusinessBlueprint;
  applicationBlueprint?: ApplicationBlueprint;
  buildManifest?: BuildManifest;
  compilationStartTime?: Date;
  compilationEndTime?: Date;
  errors: CompilerError[];
  warnings: CompilerWarning[];
  stats: CompilerStats;
}

export interface CompilerError {
  readonly code: string;
  readonly message: string;
  readonly location?: string;
  readonly severity: 'error' | 'warning';
  readonly stack?: string | undefined;
}

export interface CompilerWarning {
  readonly code: string;
  readonly message: string;
  readonly location?: string;
}

export interface CompilerStats {
  readonly totalPages: number;
  readonly totalComponents: number;
  readonly totalRoutes: number;
  readonly totalServices: number;
  readonly totalFiles: number;
  readonly compilationTimeMs: number;
  readonly verificationTimeMs: number;
  readonly selfHealingAttempts: number;
}

/**
 * CompilerContext maintains the state and configuration
 * for the blueprint compilation process.
 */
export class CompilerContext {
  private config: CompilerContextConfig;
  private state: CompilerContextState;

  constructor(config: Partial<CompilerContextConfig> = {}) {
    this.config = {
      workspaceDir: config.workspaceDir ?? './sandbox_workspaces',
      enableVerification: config.enableVerification ?? true,
      enableSelfHealing: config.enableSelfHealing ?? true,
      maxRetries: config.maxRetries ?? 3,
      timeoutMs: config.timeoutMs ?? 300000,
    };

    this.state = {
      errors: [],
      warnings: [],
      stats: {
        totalPages: 0,
        totalComponents: 0,
        totalRoutes: 0,
        totalServices: 0,
        totalFiles: 0,
        compilationTimeMs: 0,
        verificationTimeMs: 0,
        selfHealingAttempts: 0,
      },
    };
  }

  /* ---------------------------------------------------------------------- */
  /*                           CONFIG METHODS                                */
  /* ---------------------------------------------------------------------- */

  getConfig(): CompilerContextConfig {
    return this.config;
  }

  getWorkspaceDir(): string {
    return this.config.workspaceDir;
  }

  isVerificationEnabled(): boolean {
    return this.config.enableVerification;
  }

  isSelfHealingEnabled(): boolean {
    return this.config.enableSelfHealing;
  }

  getMaxRetries(): number {
    return this.config.maxRetries;
  }

  getTimeoutMs(): number {
    return this.config.timeoutMs;
  }

  /* ---------------------------------------------------------------------- */
  /*                           STATE METHODS                                 */
  /* ---------------------------------------------------------------------- */

  getState(): CompilerContextState {
    return this.state;
  }

  setBusinessBlueprint(blueprint: BusinessBlueprint): void {
    this.state.businessBlueprint = blueprint;
  }

  getBusinessBlueprint(): BusinessBlueprint | undefined {
    return this.state.businessBlueprint;
  }

  setApplicationBlueprint(blueprint: ApplicationBlueprint): void {
    this.state.applicationBlueprint = blueprint;
  }

  getApplicationBlueprint(): ApplicationBlueprint | undefined {
    return this.state.applicationBlueprint;
  }

  setBuildManifest(manifest: BuildManifest): void {
    this.state.buildManifest = manifest;
  }

  getBuildManifest(): BuildManifest | undefined {
    return this.state.buildManifest;
  }

  startCompilation(): void {
    this.state.compilationStartTime = new Date();
  }

  endCompilation(): void {
    this.state.compilationEndTime = new Date();
    if (this.state.compilationStartTime) {
      this.state.stats = {
        ...this.state.stats,
        compilationTimeMs: this.state.compilationEndTime.getTime() - this.state.compilationStartTime.getTime(),
      };
    }
  }

  /* ---------------------------------------------------------------------- */
  /*                           ERROR METHODS                                 */
  /* ---------------------------------------------------------------------- */

  addError(error: CompilerError): void {
    this.state.errors.push(error);
  }

  addWarning(warning: CompilerWarning): void {
    this.state.warnings.push(warning);
  }

  getErrors(): CompilerError[] {
    return this.state.errors;
  }

  getWarnings(): CompilerWarning[] {
    return this.state.warnings;
  }

  hasErrors(): boolean {
    return this.state.errors.length > 0;
  }

  hasWarnings(): boolean {
    return this.state.warnings.length > 0;
  }

  clearErrors(): void {
    this.state.errors = [];
  }

  clearWarnings(): void {
    this.state.warnings = [];
  }

  /* ---------------------------------------------------------------------- */
  /*                           STATS METHODS                                 */
  /* ---------------------------------------------------------------------- */

  getStats(): CompilerStats {
    return this.state.stats;
  }

  updateStats(stats: Partial<CompilerStats>): void {
    this.state.stats = {
      ...this.state.stats,
      ...stats,
    };
  }

  incrementSelfHealingAttempts(): void {
    this.state.stats = {
      ...this.state.stats,
      selfHealingAttempts: this.state.stats.selfHealingAttempts + 1,
    };
  }

  /* ---------------------------------------------------------------------- */
  /*                           RESULT METHODS                                */
  /* ---------------------------------------------------------------------- */

  getResult(): CompilerContextResult {
    return {
      success: this.state.errors.length === 0,
      businessBlueprint: this.state.businessBlueprint,
      applicationBlueprint: this.state.applicationBlueprint,
      buildManifest: this.state.buildManifest,
      errors: this.state.errors,
      warnings: this.state.warnings,
      stats: this.state.stats,
      compilationTimeMs: this.state.stats.compilationTimeMs,
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                           COMPILER RESULT                                   */
/* -------------------------------------------------------------------------- */

export interface CompilerContextResult {
  readonly success: boolean;
  readonly businessBlueprint: BusinessBlueprint | undefined;
  readonly applicationBlueprint: ApplicationBlueprint | undefined;
  readonly buildManifest: BuildManifest | undefined;
  readonly errors: CompilerError[];
  readonly warnings: CompilerWarning[];
  readonly stats: CompilerStats;
  readonly compilationTimeMs: number;
}
