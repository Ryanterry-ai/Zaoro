import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { WorktreeManager } from '../src/generation/worktree-manager.js';

const TEST_DIR = path.join(process.cwd(), '.test-worktree-manager');

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('WorktreeManager', () => {
  it('constructs with defaults', () => {
    const mgr = new WorktreeManager();
    const cfg = mgr.getConfig();
    expect(cfg.maxWorktrees).toBe(4);
    expect(cfg.repoPath).toBeTruthy();
  });

  it('constructs with overrides', () => {
    const mgr = new WorktreeManager({
      maxWorktrees: 2,
      worktreeBase: TEST_DIR,
    });
    const cfg = mgr.getConfig();
    expect(cfg.maxWorktrees).toBe(2);
    expect(cfg.worktreeBase).toBe(TEST_DIR);
  });

  it('init creates the base directory', () => {
    const mgr = new WorktreeManager({ worktreeBase: path.join(TEST_DIR, 'wts') });
    mgr.init();
    expect(fs.existsSync(path.join(TEST_DIR, 'wts'))).toBe(true);
  });

  it('checkPrerequisites returns ok=true in the project git repo', () => {
    // The project root is a git repo, so prerequisites should pass
    const mgr = new WorktreeManager({
      repoPath: process.cwd(),
      worktreeBase: path.join(TEST_DIR, 'wts'),
    });
    const result = mgr.checkPrerequisites();
    expect(result.ok).toBe(true);
  });

  it('markReady and markFailed work', () => {
    const mgr = new WorktreeManager({ worktreeBase: path.join(TEST_DIR, 'wts') });
    mgr.init();
    // Manually register a worktree
    (mgr as any).worktrees.set('test-wt', {
      name: 'test-wt',
      path: '/tmp/test',
      branch: 'wt/test',
      assignedSpecs: [],
      ready: false,
    });
    expect(mgr.markReady('test-wt')).toBe(true);
    expect(mgr.listWorktrees()[0].ready).toBe(true);
    expect(mgr.markFailed('test-wt', 'build error')).toBe(true);
    expect(mgr.listWorktrees()[0].error).toBe('build error');
  });

  it('getWorktree returns undefined for unknown', () => {
    const mgr = new WorktreeManager();
    expect(mgr.getWorktree('nonexistent')).toBeUndefined();
  });

  it('isAllComplete returns false when empty', () => {
    const mgr = new WorktreeManager();
    expect(mgr.isAllComplete()).toBe(false);
  });

  it('distributeSpecs divides specs among groups', () => {
    const mgr = new WorktreeManager({ maxWorktrees: 3 });
    const specs = ['a.spec.json', 'b.spec.json', 'c.spec.json', 'd.spec.json', 'e.spec.json'];
    const groups = mgr.distributeSpecs(specs);
    expect(groups.size).toBeGreaterThanOrEqual(1);
    let total = 0;
    for (const [, groupSpecs] of groups) {
      total += groupSpecs.length;
    }
    expect(total).toBe(specs.length);
  });

  it('distributeSpecs with custom group size', () => {
    const mgr = new WorktreeManager();
    const specs = ['a.spec.json', 'b.spec.json', 'c.spec.json', 'd.spec.json'];
    const groups = mgr.distributeSpecs(specs, 2);
    expect(groups.size).toBe(2);
    for (const [, groupSpecs] of groups) {
      expect(groupSpecs.length).toBeLessThanOrEqual(2);
    }
  });
});
