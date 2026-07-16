import { ConversationMemory } from './conversation-memory.js';
import { IntentClassifier } from './intent-classifier.js';
import { DiffEngine } from './diff-engine.js';
import { PatchApplier } from './patch-applier.js';
import type {
  BuildSnapshot,
  ConversationEntry,
  FileChange,
  RefinementAction,
  RefinementResult,
} from './types.js';
import type { RefinementIntent } from './intent-classifier.js';

export class RefinementEngine {
  private memory: ConversationMemory;
  private classifier: IntentClassifier;
  private diffEngine: DiffEngine;
  private patchApplier: PatchApplier;
  private workspaceDir: string;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
    this.memory = new ConversationMemory();
    this.classifier = new IntentClassifier();
    this.diffEngine = new DiffEngine();
    this.patchApplier = new PatchApplier();
  }

  async process(
    prompt: string,
    currentFiles: Map<string, string>
  ): Promise<{
    intent: RefinementIntent;
    result: RefinementResult | undefined;
    needsFullBuild: boolean;
  }> {
    this.memory.addEntry({
      role: 'user',
      content: prompt,
    });

    const intent = this.classifier.classify(prompt, this.memory);

    if (intent.type === 'new-build') {
      return {
        intent,
        result: undefined,
        needsFullBuild: true,
      };
    }

    if (intent.type === 'ambiguous') {
      return {
        intent,
        result: undefined,
        needsFullBuild: false,
      };
    }

    const files = currentFiles.size > 0 ? currentFiles : this.memory.getCurrentFiles();
    const changes = this.diffEngine.computeChanges(intent.action, files);

    if (changes.length === 0) {
      const result: RefinementResult = {
        success: false,
        action: intent.action,
        changes: [],
        summary: 'No applicable changes found for the requested modification.',
        snapshotId: this.memory.getCurrentSnapshotId() ?? '',
      };

      this.memory.addEntry({
        role: 'assistant',
        content: result.summary,
        action: intent.action,
      });

      return {
        intent,
        result,
        needsFullBuild: false,
      };
    }

    const applyResult = this.patchApplier.applyChanges(changes, this.workspaceDir);

    const updatedFiles = new Map(files);
    for (const change of changes) {
      if (change.action === 'delete') {
        updatedFiles.delete(change.path);
      } else if (change.after !== undefined) {
        updatedFiles.set(change.path, change.after);
      }
    }

    const summary = this.buildSummary(intent.action, changes, applyResult);

    const result: RefinementResult = {
      success: applyResult.success,
      action: intent.action,
      changes,
      summary,
      snapshotId: this.memory.getCurrentSnapshotId() ?? '',
    };

    this.memory.addEntry({
      role: 'assistant',
      content: summary,
      action: intent.action,
      affectedFiles: changes.map((c) => c.path),
    });

    return {
      intent,
      result,
      needsFullBuild: false,
    };
  }

  saveSnapshot(files: Map<string, string>, metadata: BuildSnapshot['metadata']): void {
    this.memory.saveSnapshot(files, metadata);
  }

  getHistory(): ConversationEntry[] {
    return this.memory.getHistory();
  }

  getCurrentFiles(): Map<string, string> {
    return this.memory.getCurrentFiles();
  }

  getRecentlyModifiedFiles(lastN?: number): string[] {
    return this.memory.getRecentlyModifiedFiles(lastN);
  }

  private buildSummary(
    action: RefinementAction,
    changes: FileChange[],
    applyResult: { success: boolean; filesModified: number; filesCreated: number; filesDeleted: number; errors: string[] }
  ): string {
    const parts: string[] = [];

    const actionDescription = this.describeAction(action);
    parts.push(`${actionDescription}.`);

    const fileSummary: string[] = [];
    if (applyResult.filesCreated > 0) {
      fileSummary.push(`${applyResult.filesCreated} file(s) created`);
    }
    if (applyResult.filesModified > 0) {
      fileSummary.push(`${applyResult.filesModified} file(s) modified`);
    }
    if (applyResult.filesDeleted > 0) {
      fileSummary.push(`${applyResult.filesDeleted} file(s) deleted`);
    }

    if (fileSummary.length > 0) {
      parts.push(fileSummary.join(', ') + '.');
    }

    if (changes.length > 0) {
      parts.push(`Affected files: ${changes.map((c) => c.path).join(', ')}.`);
    }

    if (!applyResult.success) {
      parts.push(`Some changes failed: ${applyResult.errors.join('; ')}.`);
    }

    return parts.join(' ');
  }

  private describeAction(action: RefinementAction): string {
    switch (action.type) {
      case 'update-component':
        return `Updated component ${action.componentPath}`;
      case 'add-page':
        return `Added page "${action.page.name}" at route ${action.page.route}`;
      case 'remove-page':
        return `Removed page at ${action.pagePath}`;
      case 'update-style':
        return `Updated styles for ${action.target}`;
      case 'update-content':
        return `Updated content for ${action.target}`;
      case 'add-feature':
        return `Added feature "${action.feature}"`;
      case 'fix-bug':
        return `Applied bug fix: ${action.description.slice(0, 60)}`;
      default:
        return 'Applied modification';
    }
  }
}

export { ConversationMemory } from './conversation-memory.js';
export { IntentClassifier } from './intent-classifier.js';
export { DiffEngine } from './diff-engine.js';
export { PatchApplier } from './patch-applier.js';
export type { RefinementIntent } from './intent-classifier.js';
export type {
  RefinementAction,
  ConversationEntry,
  ConversationEntryInput,
  BuildSnapshot,
  RefinementResult,
  FileChange,
  PageSpec,
} from './types.js';
