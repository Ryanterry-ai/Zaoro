import * as fs from 'fs';
import * as path from 'path';

export class WorkspaceSnapshot {
  private snapshotStore: Map<string, Map<string, string>> = new Map();

  public takeSnapshot(workspacePath: string, version: number): void {
    const key = `${workspacePath}@${version}`;
    const fileMap = new Map<string, string>();
    this.scanDirectory(workspacePath, workspacePath, fileMap);
    this.snapshotStore.set(key, fileMap);
  }

  public restore(workspacePath: string, version: number): void {
    const key = `${workspacePath}@${version}`;
    const fileMap = this.snapshotStore.get(key);

    if (!fileMap) {
      throw new Error(`Snapshot error: Snapshot state key '${key}' does not exist.`);
    }

    // 1. Surgical untracked file deletion (reverts newly created files in this attempt)
    const currentFiles = new Map<string, string>();
    this.scanDirectory(workspacePath, workspacePath, currentFiles);

    for (const relativePath of currentFiles.keys()) {
      if (!fileMap.has(relativePath)) {
        const fullPath = path.join(workspacePath, relativePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    }

    // 2. Surgical overwrite (reverts modified files back to original snapshot state)
    for (const [relativePath, content] of fileMap.entries()) {
      const fullPath = path.join(workspacePath, relativePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf-8');
    }

    // 3. Post-Order Empty Directory Purge (Cleans directories made vacant by step 1)
    this.cleanupEmptyDirectories(workspacePath, workspacePath);
  }

  public clearSnapshots(workspacePath: string): void {
    for (const key of this.snapshotStore.keys()) {
      if (key.startsWith(`${workspacePath}@`)) {
        this.snapshotStore.delete(key);
      }
    }
  }

  private scanDirectory(root: string, targetDir: string, fileMap: Map<string, string>): void {
    if (!fs.existsSync(targetDir)) return;
    const entries = fs.readdirSync(targetDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(targetDir, entry.name);
      const relativePath = path.relative(root, fullPath);

      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.')) {
        continue;
      }

      if (entry.isDirectory()) {
        this.scanDirectory(root, fullPath, fileMap);
      } else if (entry.isFile()) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        fileMap.set(relativePath, content);
      }
    }
  }

  private cleanupEmptyDirectories(rootDir: string, currentDir: string): void {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subPath = path.join(currentDir, entry.name);
        
        if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.')) {
          continue;
        }
        
        this.cleanupEmptyDirectories(rootDir, subPath);
      }
    }

    const remainingEntries = fs.readdirSync(currentDir);
    if (remainingEntries.length === 0 && currentDir !== rootDir) {
      try {
        fs.rmdirSync(currentDir);
      } catch {
        // Suppress errors from locked directories
      }
    }
  }
}