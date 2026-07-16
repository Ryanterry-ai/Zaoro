import { randomBytes } from 'crypto';
import type { BuildSnapshot, ConversationEntry, ConversationEntryInput } from './types.js';

function generateId(): string {
  return randomBytes(8).toString('hex');
}

export class ConversationMemory {
  private entries: ConversationEntry[] = [];
  private snapshots: BuildSnapshot[] = [];
  private currentSnapshotId: string | undefined = undefined;

  addEntry(entry: ConversationEntryInput): ConversationEntry {
    const full: ConversationEntry = {
      id: generateId(),
      timestamp: Date.now(),
      role: entry.role,
      content: entry.content,
    };
    if (entry.action !== undefined) {
      full.action = entry.action;
    }
    if (entry.affectedFiles !== undefined) {
      full.affectedFiles = entry.affectedFiles;
    }
    this.entries.push(full);
    return full;
  }

  saveSnapshot(files: Map<string, string>, metadata: BuildSnapshot['metadata']): BuildSnapshot {
    const snapshot: BuildSnapshot = {
      id: generateId(),
      timestamp: Date.now(),
      files: new Map(files),
      metadata,
    };
    this.snapshots.push(snapshot);
    this.currentSnapshotId = snapshot.id;
    return snapshot;
  }

  getCurrentFiles(): Map<string, string> {
    if (this.snapshots.length === 0) {
      return new Map();
    }
    const current = this.snapshots.find((s) => s.id === this.currentSnapshotId);
    if (!current) {
      const last = this.snapshots[this.snapshots.length - 1];
      return last !== undefined ? last.files : new Map();
    }
    return current.files;
  }

  getHistory(limit?: number): ConversationEntry[] {
    if (limit === undefined) {
      return [...this.entries];
    }
    return this.entries.slice(-limit);
  }

  getOriginalPrompt(): string | undefined {
    for (const entry of this.entries) {
      if (entry.role === 'user') {
        return entry.content;
      }
    }
    return undefined;
  }

  isFirstBuild(): boolean {
    return this.snapshots.length === 0;
  }

  getRecentlyModifiedFiles(lastN: number = 5): string[] {
    const files: string[] = [];
    const recentEntries = this.entries.slice(-lastN);
    for (const entry of recentEntries) {
      if (entry.affectedFiles) {
        for (const f of entry.affectedFiles) {
          if (!files.includes(f)) {
            files.push(f);
          }
        }
      }
    }
    return files;
  }

  getCurrentSnapshotId(): string | undefined {
    return this.currentSnapshotId;
  }

  getSnapshotCount(): number {
    return this.snapshots.length;
  }
}
