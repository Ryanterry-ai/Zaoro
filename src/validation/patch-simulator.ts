import * as fs from 'fs';
import * as path from 'path';
import * as recast from 'recast';
import * as babelParser from '@babel/parser';
import { ASTPatch, SimulationResult } from '../types/index.js';

export class PatchSimulator {
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

  public simulate(workspaceRoot: string, patches: ASTPatch[]): SimulationResult {
    const simulatedFiles = new Map<string, string>();
    const fileAstCache = new Map<string, any>();

    try {
      for (const patch of patches) {
        const relativePath = patch.targetFile;
        const fullPath = path.join(workspaceRoot, relativePath);

        let ast: any;
        if (fileAstCache.has(relativePath)) {
          ast = fileAstCache.get(relativePath);
        } else {
          const source = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf-8') : 'export {};\n';
          ast = recast.parse(source, this.parserOpts);
          fileAstCache.set(relativePath, ast);
        }

        const newAst = recast.parse(patch.codeBlock, this.parserOpts);

        if (patch.action === 'insert') {
          ast.program.body.push(...newAst.program.body);
        } else if (patch.action === 'update' && patch.targetExport) {
          const parsedNode = newAst.program.body[0];
          if (!parsedNode) {
            return { success: false, reason: "Simulation failed: Generated codeblock contains no statements." };
          }
          const replacementNode = (parsedNode.type === 'ExportDefaultDeclaration' || parsedNode.type === 'ExportNamedDeclaration')
            ? parsedNode.declaration
            : parsedNode;
          const updated = this.mutateNodeInMemory(ast, patch.targetExport, replacementNode);
          if (!updated) {
            return { success: false, reason: `Simulation mutation exception: Target export node '${patch.targetExport}' not found in VFS memory cache.` };
          }
        } else if (patch.action === 'delete' && patch.targetExport) {
          const removed = this.removeNodeFromMemory(ast, patch.targetExport);
          if (!removed) {
            return { success: false, reason: `Simulation mutation exception: Target export node '${patch.targetExport}' could not be deleted.` };
          }
        }
      }

      for (const [relativePath, ast] of fileAstCache.entries()) {
        const printedCode = recast.print(ast).code;

        const structuralValidation = this.validateStructuralIntegrity(printedCode);
        if (!structuralValidation.success) {
          return { success: false, reason: `Simulation structural regression on ${relativePath}: ${structuralValidation.reason}` };
        }

        simulatedFiles.set(relativePath, printedCode);
      }

      return {
        success: true,
        simulatedFiles
      };

    } catch (simulationErr: any) {
      return {
        success: false,
        reason: `Simulation engine execution failure: ${simulationErr.message}`
      };
    }
  }

  private validateStructuralIntegrity(source: string): { success: boolean; reason?: string } {
    try {
      const ast = recast.parse(source, this.parserOpts);

      let importError: string | undefined;
      recast.visit(ast, {
        visitImportDeclaration(nodePath: any) {
          const sourceValue = nodePath.node.source.value;
          if (!sourceValue || typeof sourceValue !== 'string' || sourceValue.trim() === '') {
            importError = `Malformed import detected with an empty or non-string module specifier.`;
            return false;
          }
          this.traverse(nodePath);
        }
      });

      if (importError) {
        return { success: false, reason: importError };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, reason: `Invalid syntax/TSX tree structure: ${err.message}` };
    }
  }

  private mutateNodeInMemory(ast: any, exportName: string, replacementNode: any): boolean {
    let replaced = false;
    recast.visit(ast, {
      visitExportNamedDeclaration(nodePath: any) {
        const declaration = nodePath.node.declaration;
        if (declaration) {
          if (declaration.id && declaration.id.name === exportName) {
            nodePath.get('declaration').replace(replacementNode);
            replaced = true;
            return false;
          }
          if (declaration.declarations) {
            for (let i = 0; i < declaration.declarations.length; i++) {
              if (declaration.declarations[i].id.name === exportName) {
                nodePath.get('declaration').get('declarations', i).replace(replacementNode);
                replaced = true;
                return false;
              }
            }
          }
        }
        this.traverse(nodePath);
      },
      visitExportDefaultDeclaration(nodePath: any) {
        if (exportName === 'default') {
          nodePath.get('declaration').replace(replacementNode);
          replaced = true;
          return false;
        }
        const decl = nodePath.node.declaration;
        if (decl && decl.id && decl.id.name === exportName) {
          nodePath.get('declaration').replace(replacementNode);
          replaced = true;
          return false;
        }
        this.traverse(nodePath);
      }
    });
    return replaced;
  }

  private removeNodeFromMemory(ast: any, exportName: string): boolean {
    let pruned = false;
    recast.visit(ast, {
      visitExportNamedDeclaration(nodePath: any) {
        const declaration = nodePath.node.declaration;
        if (declaration) {
          if (declaration.id && declaration.id.name === exportName) {
            nodePath.prune();
            pruned = true;
            return false;
          }
          if (declaration.declarations) {
            const match = declaration.declarations.some((decl: any) => decl.id.name === exportName);
            if (match) {
              nodePath.prune();
              pruned = true;
              return false;
            }
          }
        }
        this.traverse(nodePath);
      },
      visitExportDefaultDeclaration(nodePath: any) {
        if (exportName === 'default') {
          nodePath.prune();
          pruned = true;
          return false;
        }
        const decl = nodePath.node.declaration;
        if (decl && decl.id && decl.id.name === exportName) {
          nodePath.prune();
          pruned = true;
          return false;
        }
        this.traverse(nodePath);
      }
    });
    return pruned;
  }
}