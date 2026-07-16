import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import type { FileChange } from './types.js';

export interface ApplyResult {
  success: boolean;
  filesModified: number;
  filesCreated: number;
  filesDeleted: number;
  errors: string[];
}

export class PatchApplier {
  applyChanges(changes: FileChange[], workspaceDir: string): ApplyResult {
    const result: ApplyResult = {
      success: true,
      filesModified: 0,
      filesCreated: 0,
      filesDeleted: 0,
      errors: [],
    };

    for (const change of changes) {
      const ok = this.applySingleChange(change, workspaceDir);
      if (!ok) {
        result.errors.push(`Failed to apply change to ${change.path}`);
        result.success = false;
        continue;
      }

      switch (change.action) {
        case 'create':
          result.filesCreated++;
          break;
        case 'update':
          result.filesModified++;
          break;
        case 'delete':
          result.filesDeleted++;
          break;
      }
    }

    return result;
  }

  private applySingleChange(change: FileChange, workspaceDir: string): boolean {
    const fullPath = join(workspaceDir, change.path);

    try {
      switch (change.action) {
        case 'create':
          return this.createFile(fullPath, change.after ?? '');

        case 'update':
          return this.updateFile(fullPath, change);

        case 'delete':
          return this.deleteFile(fullPath);

        default:
          return false;
      }
    } catch (e) {
      return false;
    }
  }

  updateSection(filePath: string, startMarker: string, endMarker: string, newContent: string): boolean {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const startIdx = content.indexOf(startMarker);
      const endIdx = content.indexOf(endMarker, startIdx + startMarker.length);

      if (startIdx === -1 || endIdx === -1) {
        return false;
      }

      const before = content.slice(0, startIdx + startMarker.length);
      const after = content.slice(endIdx);
      const updated = before + '\n' + newContent + '\n' + after;

      writeFileSync(filePath, updated, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  addImport(filePath: string, importStatement: string): boolean {
    try {
      const content = readFileSync(filePath, 'utf-8');

      if (content.includes(importStatement)) {
        return true;
      }

      const importRegex = /^(import\s+.+from\s+['"].+['"];?\s*\n?)/m;
      const lastImportMatch = content.match(importRegex);

      let updated: string;
      if (lastImportMatch && lastImportMatch.index !== undefined) {
        const insertPos = lastImportMatch.index + lastImportMatch[0].length;
        updated = content.slice(0, insertPos) + importStatement + '\n' + content.slice(insertPos);
      } else {
        const firstNonComment = content.search(/^[^/]/m);
        if (firstNonComment === -1) {
          updated = importStatement + '\n' + content;
        } else {
          updated = content.slice(0, firstNonComment) + importStatement + '\n' + content.slice(firstNonComment);
        }
      }

      writeFileSync(filePath, updated, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  addComponentToPage(pagePath: string, componentName: string): boolean {
    try {
      const content = readFileSync(pagePath, 'utf-8');

      const importLine = `import { ${componentName} } from '../components/${componentName}';`;
      if (!content.includes(importLine)) {
        this.addImport(pagePath, importLine);
      }

      const updated = readFileSync(pagePath, 'utf-8');

      const tagPattern = /(<\/?(?:main|div|section|article|aside)[^>]*>)/g;
      const matches = [...updated.matchAll(tagPattern)];

      if (matches.length < 2) {
        return false;
      }

      const lastOpenTag = matches.filter((m) => !m[0].startsWith('</')).pop();
      if (!lastOpenTag || lastOpenTag.index === undefined) {
        return false;
      }

      const insertPos = lastOpenTag.index + lastOpenTag[0].length;
      const nextLine = updated.slice(insertPos, insertPos + 100).match(/\n(\s*)/);
      const indent = nextLine ? nextLine[1] + '  ' : '      ';

      const componentInsert = `\n${indent}<${componentName} />`;
      const newContent = updated.slice(0, insertPos) + componentInsert + updated.slice(insertPos);

      writeFileSync(pagePath, newContent, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  updateStyle(filePath: string, selector: string, property: string, value: string): boolean {
    try {
      const content = readFileSync(filePath, 'utf-8');
      let updated = content;

      if (filePath.endsWith('.css') || filePath.endsWith('.scss')) {
        const selectorPattern = new RegExp(
          `(${this.escapeRegex(selector)}\\s*\\{[^}]*)(\\})`,
          'gs'
        );

        if (selectorPattern.test(updated)) {
          updated = updated.replace(selectorPattern, (_, body: string, close: string) => {
            if (body.includes(property)) {
              const propPattern = new RegExp(`(${this.escapeRegex(property)}\\s*:\\s*)([^;]+)`, 'g');
              return body.replace(propPattern, `$1${value}`) + close;
            }
            const trimmedBody = body.trimEnd();
            return trimmedBody + `\n  ${property}: ${value};\n` + close;
          });
        } else {
          updated = updated + `\n\n${selector} {\n  ${property}: ${value};\n}\n`;
        }
      } else {
        const styleAttrPattern = /(style\s*=\s*\{\s*\{)([^}]*)(\}\})/g;

        if (styleAttrPattern.test(updated)) {
          updated = updated.replace(styleAttrPattern, (_, open: string, existing: string, close: string) => {
            const trimmed = existing.trim();
            if (trimmed.includes(property)) {
              const propPattern = new RegExp(`(${this.escapeRegex(property)}\\s*:\\s*)([^,}]+)`, 'g');
              return `${open}${trimmed.replace(propPattern, `$1${value}`)}${close}`;
            }
            const separator = trimmed.endsWith(',') || trimmed === '' ? '' : ', ';
            return `${open}${trimmed}${separator}${property}: '${value}'${close}`;
          });
        }
      }

      if (updated !== content) {
        writeFileSync(filePath, updated, 'utf-8');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  updateText(filePath: string, oldText: string, newText: string): boolean {
    try {
      const content = readFileSync(filePath, 'utf-8');
      if (!content.includes(oldText)) {
        return false;
      }
      const updated = content.replace(oldText, newText);
      writeFileSync(filePath, updated, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  private createFile(fullPath: string, content: string): boolean {
    try {
      const dir = dirname(fullPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(fullPath, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  private updateFile(fullPath: string, change: FileChange): boolean {
    try {
      if (!existsSync(fullPath)) {
        return this.createFile(fullPath, change.after ?? '');
      }

      if (change.after !== undefined) {
        writeFileSync(fullPath, change.after, 'utf-8');
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  private deleteFile(fullPath: string): boolean {
    try {
      if (existsSync(fullPath)) {
        unlinkSync(fullPath);
        return true;
      }
      return true;
    } catch {
      return false;
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
