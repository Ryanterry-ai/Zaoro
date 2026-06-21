import { ASTPatch } from '../types/index.js';

export class PatchTransactionManager {
  private stagedPatches: ASTPatch[] = [];

  public begin(): void {
    this.stagedPatches = [];
  }

  public stage(patch: ASTPatch): void {
    this.stagedPatches.push(patch);
  }

  public commit(applyCallback: (patch: ASTPatch) => void): void {
    try {
      for (const patch of this.stagedPatches) {
        applyCallback(patch);
      }
    } finally {
      this.stagedPatches = [];
    }
  }

  public rollback(): void {
    this.stagedPatches = [];
  }
}