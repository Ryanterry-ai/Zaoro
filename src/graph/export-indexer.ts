import * as recast from 'recast';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as babelParser from '@babel/parser';
import { DependencyNode } from './ast-dependency-graph.js';
import { normalizePath } from './module-resolver.js';

export class ExportIndexer {
  private cacheStore = new Map<string, { hash: string; node: DependencyNode }>();

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

  public indexFile(filePath: string, relativePath: string): DependencyNode {
    const canonicalPath = normalizePath(relativePath);
    if (!fs.existsSync(filePath)) {
      return { file: canonicalPath, exports: [], imports: [], signatures: {} };
    }

    const code = fs.readFileSync(filePath, 'utf-8');
    const contentHash = crypto.createHash('sha256').update(code).digest('hex');

    const cached = this.cacheStore.get(canonicalPath);
    if (cached && cached.hash === contentHash) {
      return cached.node;
    }

    const ast = recast.parse(code, this.parserOpts);
    const exports: string[] = [];
    const imports: string[] = [];
    const signatures: Record<string, string> = {};

    const registerSignature = (name: string, astNode: any) => {
      signatures[name] = this.getStructuralHash(astNode);
    };

    recast.visit(ast, {
      visitExportNamedDeclaration(nodePath: any) {
        const decl = nodePath.node.declaration;
        if (decl) {
          if (decl.id?.name) {
            const name = decl.id.name;
            exports.push(name);
            registerSignature(name, decl);
          } else if (decl.declarations) {
            for (const d of decl.declarations) {
              if (d.id?.name) {
                const name = d.id.name;
                exports.push(name);
                registerSignature(name, d);
              }
            }
          }
        }
        
        const specifiers = nodePath.node.specifiers;
        if (specifiers) {
          for (const spec of specifiers) {
            const exportedName = spec.exported?.name;
            if (exportedName) {
              exports.push(exportedName);
              registerSignature(exportedName, spec);
            }
          }
        }
        this.traverse(nodePath);
      },
      visitExportDefaultDeclaration(nodePath: any) {
        const decl = nodePath.node.declaration;
        exports.push('default');
        registerSignature('default', decl || nodePath.node);
        this.traverse(nodePath);
      },
      visitExportAllDeclaration(nodePath: any) {
        const sourceValue = nodePath.node.source?.value;
        if (sourceValue) {
          imports.push(sourceValue);
        }
        this.traverse(nodePath);
      },
      visitImportDeclaration(nodePath: any) {
        const sourceValue = nodePath.node.source?.value;
        if (sourceValue) {
          imports.push(sourceValue);
        }
        this.traverse(nodePath);
      }
    });

    const node: DependencyNode = {
      file: canonicalPath,
      exports,
      imports,
      signatures
    };

    this.cacheStore.set(canonicalPath, { hash: contentHash, node });
    return node;
  }

  public evictFile(relativePath: string): void {
    this.cacheStore.delete(normalizePath(relativePath));
  }

  public clearCache(): void {
    this.cacheStore.clear();
  }

  private getStructuralHash(node: any): string {
    const cleanNode = (n: any): any => {
      if (!n || typeof n !== 'object') return n;
      if (Array.isArray(n)) return n.map(cleanNode);
      const copy: any = {};
      for (const key in n) {
        if (['loc', 'start', 'end', 'extra', 'comments', 'raw', 'rawValue'].includes(key) || key.toLowerCase().includes('comment')) {
          continue;
        }
        copy[key] = cleanNode(n[key]);
      }
      return copy;
    };
    const cleaned = cleanNode(node);
    return crypto.createHash('sha256').update(JSON.stringify(cleaned)).digest('hex');
  }
}