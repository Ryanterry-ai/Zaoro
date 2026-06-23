import * as fs from 'fs';
import * as path from 'path';

export interface CodeQualityReport {
  workspace_path: string;
  total_files: number;
  total_lines: number;
  languages: Record<string, number>;
  issues: CodeIssue[];
  metrics: {
    avg_file_length: number;
    largest_file: { path: string; lines: number } | null;
    component_count: number;
    api_route_count: number;
    page_count: number;
    has_tests: boolean;
    has_linting: boolean;
    has_type_checking: boolean;
    dependencies: string[];
  };
  score: number;
  suggestions: string[];
}

export interface CodeIssue {
  file: string;
  line: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  category: string;
}

/**
 * WorkspaceManager: Analyzes generated code quality and workspace structure.
 */
export class WorkspaceManager {

  analyzeWorkspace(workspacePath: string): CodeQualityReport {
    console.log(`[workspace-manager] Analyzing: ${workspacePath}`);

    const files = this.collectFiles(workspacePath);
    const languages = this.countLanguages(files);
    const issues: CodeIssue[] = [];
    const suggestions: string[] = [];

    let totalLines = 0;
    let largestFile: { path: string; lines: number } | null = null;
    const componentCount = files.filter(f => /components?.\//i.test(f.relative)).length;
    const apiRouteCount = files.filter(f => /api\/.*route\.tsx?$/i.test(f.relative)).length;
    const pageCount = files.filter(f => /app\/.*page\.tsx?$/i.test(f.relative)).length;
    const hasTests = files.some(f => /\.(test|spec)\.(tsx?|jsx?)$/i.test(f.relative));
    const hasLinting = files.some(f => /eslint|prettier/i.test(f.name));
    const hasTypeChecking = files.some(f => f.name === 'tsconfig.json');
    const dependencies = this.extractDependencies(workspacePath);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file.absolute, 'utf-8');
        const lines = content.split('\n');
        totalLines += lines.length;

        if (!largestFile || lines.length > largestFile.lines) {
          largestFile = { path: file.relative, lines: lines.length };
        }

        // Check for issues
        this.analyzeFile(file.relative, lines, issues);
      } catch {
        // Skip binary files
      }
    }

    // Check for missing essentials
    if (!hasTests) suggestions.push('Add unit tests (*.test.tsx) for critical components');
    if (!hasLinting) suggestions.push('Add ESLint/Prettier configuration');
    if (!hasTypeChecking) suggestions.push('Add tsconfig.json for TypeScript');
    if (componentCount === 0) suggestions.push('No component files found - consider adding reusable components');
    if (apiRouteCount === 0) suggestions.push('No API routes found - consider adding backend endpoints');
    if (dependencies.length === 0) suggestions.push('No dependencies found in package.json');

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const score = Math.max(0, 100 - (errorCount * 10) - (warningCount * 3) - (suggestions.length * 5));

    const report: CodeQualityReport = {
      workspace_path: workspacePath,
      total_files: files.length,
      total_lines: totalLines,
      languages,
      issues,
      metrics: {
        avg_file_length: files.length > 0 ? Math.round(totalLines / files.length) : 0,
        largest_file: largestFile,
        component_count: componentCount,
        api_route_count: apiRouteCount,
        page_count: pageCount,
        has_tests: hasTests,
        has_linting: hasLinting,
        has_type_checking: hasTypeChecking,
        dependencies
      },
      score,
      suggestions
    };

    console.log(`[workspace-manager] ${files.length} files, ${totalLines} lines, score: ${score}/100`);
    return report;
  }

  private collectFiles(dir: string, baseDir?: string): Array<{ absolute: string; relative: string; name: string }> {
    const files: Array<{ absolute: string; relative: string; name: string }> = [];
    const base = baseDir || dir;
    const skip = ['node_modules', '.next', '.git', 'dist', 'build', '.vercel'];

    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (skip.includes(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...this.collectFiles(fullPath, base));
        } else if (/\.(tsx?|jsx?|css|json|md|html|liquid)$/i.test(entry.name)) {
          files.push({
            absolute: fullPath,
            relative: path.relative(base, fullPath).replace(/\\/g, '/'),
            name: entry.name
          });
        }
      }
    } catch { /* skip inaccessible dirs */ }
    return files;
  }

  private countLanguages(files: Array<{ name: string }>): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const file of files) {
      const ext = path.extname(file.name).toLowerCase();
      const lang: Record<string, string> = { '.ts': 'TypeScript', '.tsx': 'TypeScript React', '.js': 'JavaScript', '.jsx': 'JavaScript React', '.css': 'CSS', '.json': 'JSON', '.md': 'Markdown', '.html': 'HTML', '.liquid': 'Liquid' };
      const language = lang[ext] || ext;
      counts[language] = (counts[language] || 0) + 1;
    }
    return counts;
  }

  private analyzeFile(relativePath: string, lines: string[], issues: CodeIssue[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const lineNum = i + 1;

      // Console.log in production code
      if (/console\.(log|debug|info)\(/.test(line) && !relativePath.includes('test')) {
        issues.push({ file: relativePath, line: lineNum, severity: 'warning', message: 'console.log in production code', category: 'cleanup' });
      }

      // TODO/FIXME/HACK comments
      if (/\/\/\s*(TODO|FIXME|HACK|XXX)/.test(line)) {
        issues.push({ file: relativePath, line: lineNum, severity: 'info', message: 'Unresolved TODO/FIXME', category: 'todo' });
      }

      // Any type usage
      if (/:\s*any\b/.test(line) && !relativePath.includes('.d.ts')) {
        issues.push({ file: relativePath, line: lineNum, severity: 'warning', message: 'Usage of "any" type', category: 'types' });
      }

      // Empty catch blocks
      if (/catch\s*\(\w*\)\s*\{\s*\}/.test(line)) {
        issues.push({ file: relativePath, line: lineNum, severity: 'warning', message: 'Empty catch block', category: 'error-handling' });
      }

      // Very long lines (> 200 chars)
      if (line.length > 200) {
        issues.push({ file: relativePath, line: lineNum, severity: 'info', message: `Line too long (${line.length} chars)`, category: 'style' });
      }
    }
  }

  private extractDependencies(workspacePath: string): string[] {
    try {
      const pkgPath = path.join(workspacePath, 'package.json');
      if (!fs.existsSync(pkgPath)) return [];
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      return Object.keys(pkg.dependencies || {});
    } catch {
      return [];
    }
  }
}
