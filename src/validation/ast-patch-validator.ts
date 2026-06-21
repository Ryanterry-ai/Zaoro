import * as fs from 'fs';
import * as path from 'path';
import * as recast from 'recast';
import * as babelParser from '@babel/parser';
import { ASTPatch, ValidationResult } from '../types/index.js';

export class ASTPatchValidator {
  private parserOpts = {
    parser: {
      parse(source: string) {
        return babelParser.parse(source, {
          sourceType: 'module',
          plugins: ['typescript', 'jsx'],
          tokens: true
        });
      }
    }
  };

  public validate(workspaceRoot: string, patches: ASTPatch[]): ValidationResult {
    const safeToApply: ASTPatch[] = [];
    const rejected: ASTPatch[] = [];
    let isBatchValid = true;
    let failureReason: string | undefined;

    for (const patch of patches) {
      if (!patch.targetFile || typeof patch.targetFile !== 'string') {
        isBatchValid = false;
        failureReason = `Invalid schema: 'targetFile' must be a valid non-empty string.`;
        rejected.push(patch);
        continue;
      }

      if (patch.targetFile.includes('..') || path.isAbsolute(patch.targetFile)) {
        isBatchValid = false;
        failureReason = `Security rejection: Path traversal or absolute paths are forbidden: ${patch.targetFile}`;
        rejected.push(patch);
        continue;
      }

      if (!['insert', 'update', 'delete'].includes(patch.action)) {
        isBatchValid = false;
        failureReason = `Invalid schema: Action must be 'insert', 'update', or 'delete'. Received: ${patch.action}`;
        rejected.push(patch);
        continue;
      }

      if (patch.action !== 'delete') {
        try {
          recast.parse(patch.codeBlock, this.parserOpts);
        } catch (parseError: any) {
          isBatchValid = false;
          failureReason = `Pre-flight parse simulation failed for ${patch.targetFile}: ${parseError.message}`;
          rejected.push(patch);
          continue;
        }
      }

      const fullPath = path.join(workspaceRoot, patch.targetFile);
      if (patch.action === 'update' || patch.action === 'delete') {
        if (!fs.existsSync(fullPath)) {
          isBatchValid = false;
          failureReason = `Target resolution mismatch: Cannot perform ${patch.action} on non-existent file: ${patch.targetFile}`;
          rejected.push(patch);
          continue;
        }

        if (!patch.targetExport) {
          isBatchValid = false;
          failureReason = `Missing identifier: Action ${patch.action} requires a targetExport identifier.`;
          rejected.push(patch);
          continue;
        }

        const source = fs.readFileSync(fullPath, 'utf-8');
        try {
          const ast = recast.parse(source, this.parserOpts);
          const exportExists = this.verifyExportExists(ast, patch.targetExport);
          if (!exportExists) {
            isBatchValid = false;
            failureReason = `Structural target mismatch: Target export identifier '${patch.targetExport}' not resolved in ${patch.targetFile}.`;
            rejected.push(patch);
            continue;
          }
        } catch (sourceParseError: any) {
          isBatchValid = false;
          failureReason = `Source parsing failed for validation of ${patch.targetFile}: ${sourceParseError.message}`;
          rejected.push(patch);
          continue;
        }
      }

      safeToApply.push(patch);
    }

    return {
      valid: isBatchValid,
      ...(failureReason !== undefined && { reason: failureReason }),
      safeToApply,
      rejected
    };
  }

  private verifyExportExists(ast: any, exportName: string): boolean {
    let resolved = false;

    recast.visit(ast, {
      visitExportNamedDeclaration(nodePath: any) {
        const declaration = nodePath.node.declaration;
        if (declaration) {
          if (declaration.id && declaration.id.name === exportName) {
            resolved = true;
            return false;
          }
          if (declaration.declarations) {
            const match = declaration.declarations.some((decl: any) => decl.id.name === exportName);
            if (match) {
              resolved = true;
              return false;
            }
          }
        }
        this.traverse(nodePath);
      },
      visitExportDefaultDeclaration(nodePath: any) {
        if (exportName === 'default') {
          resolved = true;
          return false;
        }
        const decl = nodePath.node.declaration;
        if (decl && decl.id && decl.id.name === exportName) {
          resolved = true;
          return false;
        }
        this.traverse(nodePath);
      }
    });

    return resolved;
  }
}