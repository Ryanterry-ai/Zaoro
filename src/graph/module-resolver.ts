import * as fs from 'fs';
import * as path from 'path';

export function normalizePath(targetPath: string): string {
  return targetPath.replace(/\\/g, '/');
}

export class ModuleResolver {
  public static resolve(fromFile: string, importPath: string, rootPath: string): string | null {
    const cleanRoot = path.resolve(rootPath);
    let absoluteTarget: string | null = null;

    if (importPath.startsWith('.')) {
      const baseDir = path.dirname(path.resolve(cleanRoot, fromFile));
      absoluteTarget = path.resolve(baseDir, importPath);
    } else if (importPath.startsWith('@/')) {
      const suffix = importPath.slice(2);
      absoluteTarget = path.join(cleanRoot, 'src', suffix);
    } else {
      return null; 
    }

    const resolved = this.checkExtensions(absoluteTarget);
    if (resolved) {
      const relative = path.relative(cleanRoot, resolved);
      return normalizePath(relative);
    }

    return null;
  }

  private static checkExtensions(basePath: string): string | null {
    const extensions = ['.tsx', '.ts', '.jsx', '.js'];
    for (const ext of extensions) {
      const target = basePath + ext;
      if (fs.existsSync(target) && fs.statSync(target).isFile()) {
        return target;
      }
    }
    for (const ext of extensions) {
      const target = path.join(basePath, 'index' + ext);
      if (fs.existsSync(target) && fs.statSync(target).isFile()) {
        return target;
      }
    }
    return null;
  }
}