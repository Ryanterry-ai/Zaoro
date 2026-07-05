# 5. Workspace Manager

## Responsibilities

Manages the lifecycle of workspace directories as they are mounted into runtime environments. Eliminates file copying overhead by using bind mounts.

```
WorkspaceManager
  ├── mount(projectPath) ──> mountPoint
  ├── sync(source, target) ──> void
  ├── cleanup(workspaceId) ──> void
  ├── snapshot(workspaceId) ──> Snapshot
  └── list(workspaceId) ──> FileEntry[]
```

## Interface

```typescript
interface WorkspaceManager {
  /** Mount a project directory for runtime access */
  mount(spec: MountSpec): Promise<MountResult>;

  /** Sync files from host to runtime */
  sync(runtimeId: string, syncSpec: SyncSpec): Promise<void>;

  /** Unmount and cleanup workspace artifacts */
  unmount(workspaceId: string): Promise<void>;

  /** List files in the workspace */
  listFiles(workspaceId: string, pattern?: string): Promise<FileEntry[]>;

  /** Create a workspace snapshot */
  snapshot(workspaceId: string): Promise<WorkspaceSnapshot>;

  /** Restore workspace from snapshot */
  restore(snapshotId: string): Promise<string>;

  /** Get workspace disk usage */
  diskUsage(workspaceId: string): Promise<DiskUsage>;
}

interface MountSpec {
  workspaceId: string;
  /** Absolute path on host */
  hostPath: string;
  /** Target path inside runtime */
  runtimePath: string;
  /** Mount as read-only? */
  readOnly?: boolean;
  /** Sync mode: 'bind' (default) or 'copy' */
  mode?: 'bind' | 'copy';
}

interface MountResult {
  workspaceId: string;
  hostPath: string;
  runtimePath: string;
  mode: 'bind' | 'copy';
  mountedAt: number;
}

interface SyncSpec {
  runtimeId: string;
  /** Files/dirs to sync from host to runtime */
  paths: string[];
  /** Exclude patterns */
  exclude?: string[];
  /** Delete files in runtime not present on host */
  deleteExtraneous?: boolean;
}

interface FileEntry {
  path: string;
  size: number;
  modifiedAt: number;
  type: 'file' | 'dir' | 'symlink';
}

interface WorkspaceSnapshot {
  id: string;
  workspaceId: string;
  createdAt: number;
  fileCount: number;
  totalSizeBytes: number;
  /** Path to snapshot archive */
  archivePath: string;
}

interface DiskUsage {
  totalBytes: number;
  fileCount: number;
  largestFiles: FileEntry[];
}
```

## Mount Strategy

| Mode | Performance | Isolation | Use Case |
|------|------------|-----------|----------|
| `bind` | Fastest | Low | Local dev, single-tenant |
| `copy` | Slower | High | Multi-tenant, Firecracker |
| `snapshot` | Medium | High | K8s with volume snapshots |

## Cleanup Policy

- Remove `.next/` build cache on unmount (unless cached)
- Remove `node_modules/` on unmount (unless cached)
- Remove temp files (`*.log`, `.turbo/`, `.cache/`)
- Compress workspace for snapshot if requested
- Delete workspace directory after 24h idle

## Sync Optimization

Only changed files are synced using mtime comparison:

```typescript
interface SyncOptimization {
  /** Skip files unchanged since last sync */
  incrementalSync: boolean;
  /** Track file hashes for change detection */
  fileHashCache: Map<string, string>;
  /** Batch small files into single transfer */
  batchSmallFiles: boolean;
  smallFileThreshold: number; // 10KB
}
```
