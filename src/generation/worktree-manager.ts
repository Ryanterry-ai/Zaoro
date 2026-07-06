import * as fs from 'fs';
import * as path from 'path';
import { simpleGit } from 'simple-git';
import type { SimpleGit } from 'simple-git';

export interface WorktreeSpec {
  name: string;
  path: string;
  branch: string;
  assignedSpecs: string[];
  ready: boolean;
  error?: string;
}

export interface WorktreeManagerConfig {
  repoPath: string;
  worktreeBase: string;
  maxWorktrees: number;
}

const DEFAULT_CONFIG: WorktreeManagerConfig = {
  repoPath: process.cwd(),
  worktreeBase: path.join(process.cwd(), '.worktrees'),
  maxWorktrees: 4,
};

export class WorktreeManager {
  private config: WorktreeManagerConfig;
  private worktrees: Map<string, WorktreeSpec> = new Map();
  private initialized = false;
  private git: SimpleGit;

  constructor(config?: Partial<WorktreeManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.git = simpleGit(this.config.repoPath);
  }

  getConfig(): WorktreeManagerConfig {
    return { ...this.config };
  }

  init(): void {
    fs.mkdirSync(this.config.worktreeBase, { recursive: true });
    this.initialized = true;
  }

  checkPrerequisites(): { ok: boolean; error?: string } {
    const gitFile = path.join(this.config.repoPath, '.git');
    if (!fs.existsSync(gitFile)) {
      return { ok: false, error: 'Not a git repository' };
    }
    return { ok: true };
  }

  async createWorktree(name: string, assignedSpecs: string[]): Promise<WorktreeSpec> {
    if (!this.initialized) {
      throw new Error('WorktreeManager not initialized. Call init() first.');
    }

    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const branch = `wt/${safeName}/${Date.now()}`;
    const worktreePath = path.join(this.config.worktreeBase, safeName);

    if (fs.existsSync(worktreePath)) {
      fs.rmSync(worktreePath, { recursive: true, force: true });
    }

    // Create branch from HEAD and check it out into a new directory.
    // This NEVER touches the main repo's HEAD — safe to run in production.
    await this.git.raw(['worktree', 'add', '-b', branch, worktreePath, 'HEAD']);

    const spec: WorktreeSpec = {
      name: safeName,
      path: worktreePath,
      branch,
      assignedSpecs,
      ready: false,
    };
    this.worktrees.set(safeName, spec);
    return spec;
  }

  assignSpec(worktreeName: string, specFilename: string): boolean {
    const wt = this.worktrees.get(worktreeName);
    if (!wt) return false;
    wt.assignedSpecs.push(specFilename);
    return true;
  }

  markReady(worktreeName: string): boolean {
    const wt = this.worktrees.get(worktreeName);
    if (!wt) return false;
    wt.ready = true;
    return true;
  }

  markFailed(worktreeName: string, error: string): boolean {
    const wt = this.worktrees.get(worktreeName);
    if (!wt) return false;
    wt.error = error;
    wt.ready = false;
    return true;
  }

  getWorktree(name: string): WorktreeSpec | undefined {
    return this.worktrees.get(name);
  }

  listWorktrees(): WorktreeSpec[] {
    return Array.from(this.worktrees.values());
  }

  getReadyWorktrees(): WorktreeSpec[] {
    return this.listWorktrees().filter(w => w.ready && !w.error);
  }

  isAllComplete(): boolean {
    if (this.worktrees.size === 0) return false;
    return this.listWorktrees().every(w => w.ready || w.error);
  }

  async removeWorktree(name: string): Promise<boolean> {
    const wt = this.worktrees.get(name);
    if (!wt) return false;

    try {
      await this.git.raw(['worktree', 'remove', '--force', wt.path]);
    } catch {
      if (fs.existsSync(wt.path)) {
        fs.rmSync(wt.path, { recursive: true, force: true });
      }
    }

    try {
      await this.git.raw(['branch', '-D', wt.branch]);
    } catch { /* branch cleanup is best-effort */ }

    this.worktrees.delete(name);
    return true;
  }

  async removeAll(): Promise<void> {
    for (const name of [...this.worktrees.keys()]) {
      await this.removeWorktree(name);
    }
  }

  distributeSpecs(specFilenames: string[], groupSize?: number): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    const size = groupSize ?? Math.max(1, Math.floor(specFilenames.length / this.config.maxWorktrees));
    let groupIndex = 0;
    for (let i = 0; i < specFilenames.length; i += size) {
      const groupName = `build-group-${groupIndex}`;
      const chunk = specFilenames.slice(i, i + size);
      groups.set(groupName, chunk);
      groupIndex++;
    }
    return groups;
  }
}
