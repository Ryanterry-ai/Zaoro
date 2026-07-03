/**
 * IR Persistence — save/load Intermediate Representation for workspace reuse.
 *
 * Enables follow-up builds to reuse the previous BRE result instead of
 * re-running the full deterministic pipeline from scratch.
 *
 * Persists: BREContext, BREv2Result (blueprint + decisions + constraints),
 * ApplicationBlueprint, ExecutionBlueprint, ApplicationSpec, and RenderResult.
 */

import * as fs from 'fs';
import * as path from 'path';

const IR_VERSION = 1;

export interface PersistedIR {
  version: number;
  createdAt: string;
  prompt: string;
  breContext: Record<string, unknown>;
  breResult: {
    blueprint: unknown;
    decisions: unknown[];
    constraintReport: unknown;
    selectedDesignProfile: unknown;
    selectedPattern: unknown;
    confidence: number;
  };
  applicationBlueprint: unknown;
  executionBlueprint: unknown;
  applicationSpec: unknown;
  renderResult: {
    files: Array<{ path: string; type: string }>;
    warnings: string[];
  };
}

/**
 * Save the full IR to a workspace directory.
 * Writes `.ir.json` alongside other build artifacts.
 */
export function saveIR(
  workspacePath: string,
  data: Omit<PersistedIR, 'version' | 'createdAt'>
): string {
  const ir: PersistedIR = {
    version: IR_VERSION,
    createdAt: new Date().toISOString(),
    ...data,
  };
  const irPath = path.join(workspacePath, '.ir.json');
  fs.writeFileSync(irPath, JSON.stringify(ir, null, 2), 'utf-8');
  return irPath;
}

/**
 * Load a previously saved IR from a workspace.
 * Returns null if no IR exists or version is incompatible.
 */
export function loadIR(workspacePath: string): PersistedIR | null {
  const irPath = path.join(workspacePath, '.ir.json');
  if (!fs.existsSync(irPath)) return null;

  try {
    const raw = fs.readFileSync(irPath, 'utf-8');
    const ir: PersistedIR = JSON.parse(raw);
    if (ir.version !== IR_VERSION) {
      console.warn(`[ir-persistence] IR version mismatch: expected ${IR_VERSION}, got ${ir.version}. Ignoring.`);
      return null;
    }
    return ir;
  } catch (e) {
    console.warn('[ir-persistence] Failed to load IR:', (e as Error).message);
    return null;
  }
}

/**
 * Check if a workspace has a valid saved IR.
 */
export function hasIR(workspacePath: string): boolean {
  return loadIR(workspacePath) !== null;
}

/**
 * Delete a saved IR from a workspace.
 */
export function deleteIR(workspacePath: string): boolean {
  const irPath = path.join(workspacePath, '.ir.json');
  if (fs.existsSync(irPath)) {
    fs.unlinkSync(irPath);
    return true;
  }
  return false;
}
