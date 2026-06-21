import { ASTDependencyGraph } from '../graph/ast-dependency-graph.js';
import { ASTPatch } from '../types/index.js';
import { normalizePath } from '../graph/module-resolver.js';
import * as recast from 'recast';
import * as crypto from 'crypto';
import * as babelParser from '@babel/parser';

export interface RegressionReport {
  isSafe: boolean;
  reason?: string;
}

export class RegressionPredictor {
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

  constructor(private graph: ASTDependencyGraph) {}

  public predict(patches: ASTPatch[]): RegressionReport {
    for (const patch of patches) {
      const canonicalPath = normalizePath(patch.targetFile);
      const dependents = this.graph.getDependents(canonicalPath);
      const fileNode = this.graph.getNode(canonicalPath);

      if (patch.action === 'insert') {
        try {
          const patchAst = recast.parse(patch.codeBlock, this.parserOpts);
          const insertExports = this.extractExportNames(patchAst);
          
          if (fileNode) {
            for (const exp of insertExports) {
              if (fileNode.exports.includes(exp)) {
                return {
                  isSafe: false,
                  reason: `Regression Blocked: Export redeclaration collision. Insert operation introduces export '${exp}' in '${patch.targetFile}' which is already defined.`
                };
              }
            }
          }
        } catch {
          // Handled downstream
        }
      }

      if (dependents.length === 0) {
        continue;
      }

      if (!fileNode) continue;

      if (patch.action === 'delete' && patch.targetExport) {
        return {
          isSafe: false,
          reason: `Regression Blocked: Breaking delete operation. Export '${patch.targetExport}' in '${patch.targetFile}' is actively consumed by: ${dependents.join(', ')}`
        };
      }

      if (patch.action === 'update' && patch.targetExport) {
        try {
          const patchAst = recast.parse(patch.codeBlock, this.parserOpts);
          const patchExports = this.extractExportSignatures(patchAst);

          const targetExists = Object.keys(patchExports).includes(patch.targetExport);
          if (!targetExists) {
            return {
              isSafe: false,
              reason: `Regression Blocked: API signature break. Patch updates export interface of '${patch.targetFile}' but omits required export '${patch.targetExport}' consumed downstream.`
            };
          }

          const originalSignature = fileNode.signatures[patch.targetExport];
          const updatedSignature = patchExports[patch.targetExport];

          if (originalSignature && originalSignature !== updatedSignature) {
            return {
              isSafe: false,
              reason: `Regression Risk: Structural signature mismatch on export '${patch.targetExport}' in '${patch.targetFile}'. Contract change breaks dependents: ${dependents.join(', ')}`
            };
          }

        } catch {
          // Handled downstream
        }
      }
    }

    return { isSafe: true };
  }

  private extractExportNames(ast: any): string[] {
    const exports: string[] = [];
    recast.visit(ast, {
      visitExportNamedDeclaration(nodePath: any) {
        const decl = nodePath.node.declaration;
        if (decl) {
          if (decl.id?.name) exports.push(decl.id.name);
          else if (decl.declarations) {
            for (const d of decl.declarations) {
              if (d.id?.name) exports.push(d.id.name);
            }
          }
        }
        this.traverse(nodePath);
      },
      visitExportDefaultDeclaration() {
        exports.push('default');
        return false;
      }
    });
    return exports;
  }

  private extractExportSignatures(ast: any): Record<string, string> {
    const signatures: Record<string, string> = {};
    const registerSignature = (name: string, astNode: any) => {
      signatures[name] = this.getStructuralHash(astNode);
    };

    recast.visit(ast, {
      visitExportNamedDeclaration(nodePath: any) {
        const decl = nodePath.node.declaration;
        if (decl) {
          if (decl.id?.name) registerSignature(decl.id.name, decl);
          else if (decl.declarations) {
            for (const d of decl.declarations) {
              if (d.id?.name) registerSignature(d.id.name, d);
            }
          }
        }
        
        const specifiers = nodePath.node.specifiers;
        if (specifiers) {
          for (const spec of specifiers) {
            const exportedName = spec.exported?.name;
            if (exportedName) {
              registerSignature(exportedName, spec);
            }
          }
        }
        this.traverse(nodePath);
      },
      visitExportDefaultDeclaration(nodePath: any) {
        const decl = nodePath.node.declaration;
        registerSignature('default', decl || nodePath.node);
        this.traverse(nodePath);
      }
    });
    return signatures;
  }

  private getStructuralHash(node: any): string {
    const cleanNode = (n: any): any => {
      if (!n || typeof n !== 'object') return n;
      if (Array.isArray(n)) return n.map(cleanNode);
      const copy: any = {};
      for (const key in n) {
        if (['loc', 'start', 'end', 'extra', 'comments', 'raw', 'rawValue'].includes(key) || key.toLowerCase().includes('comment')) continue;
        copy[key] = cleanNode(n[key]);
      }
      return copy;
    };
    const cleaned = cleanNode(node);
    return crypto.createHash('sha256').update(JSON.stringify(cleaned)).digest('hex');
  }
}