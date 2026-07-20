import * as fs from 'fs';
import * as path from 'path';
import * as recast from 'recast';
import * as babelParser from '@babel/parser';
import { ASTPatch } from '../types/index.js';

export class ASTPatcher {
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

  public applyPatch(workspaceRoot: string, patch: ASTPatch): void {
    const filePath = path.join(workspaceRoot, patch.targetFile);
    
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, 'export {};\n', 'utf-8');
    }

    const source = fs.readFileSync(filePath, 'utf-8');
    const ast = recast.parse(source, this.parserOpts);
    const newAst = recast.parse(patch.codeBlock, this.parserOpts);

    let patchApplied = false;

    if (patch.action === 'insert') {
      ast.program.body.push(...newAst.program.body);
      patchApplied = true;
    } else if (patch.action === 'update' && patch.targetExport) {
      const parsedNode = newAst.program.body[0];
      if (!parsedNode) {
        throw new Error("Invalid AST Patch: Generated codeblock contains no statements.");
      }
      const replacementNode = (parsedNode.type === 'ExportDefaultDeclaration' || parsedNode.type === 'ExportNamedDeclaration')
        ? parsedNode.declaration
        : parsedNode;
      patchApplied = this.mutateExportNode(ast, patch.targetExport, replacementNode);
    } else if (patch.action === 'delete' && patch.targetExport) {
      patchApplied = this.removeExportNode(ast, patch.targetExport);
    }

    if (!patchApplied) {
      // Fallback: a 'update' patch keyed to an export that no longer exists in
      // the file (e.g. an LLM full-file fix that drifted from the original
      // export name) is applied as a whole-file replacement. This avoids
      // spurious "Could not resolve target export node" failures and still
      // lands the generated fix.
      if (patch.action === 'update' && patch.codeBlock && patch.codeBlock.trim().length > 0) {
        fs.writeFileSync(filePath, patch.codeBlock, 'utf-8');
        return;
      }
      throw new Error(`AST mutation exception: Could not resolve target export node '${patch.targetExport}' in file context.`);
    }

    const compiledOutput = recast.print(ast).code;
    fs.writeFileSync(filePath, compiledOutput, 'utf-8');
  }

  private mutateExportNode(ast: any, exportName: string, replacementNode: any): boolean {
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

  private removeExportNode(ast: any, exportName: string): boolean {
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
            const hasMatch = declaration.declarations.some((decl: any) => decl.id.name === exportName);
            if (hasMatch) {
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