import type { FileChange, RefinementAction } from './types.js';

export class DiffEngine {
  computeChanges(action: RefinementAction, currentFiles: Map<string, string>): FileChange[] {
    switch (action.type) {
      case 'update-component':
        return this.computeComponentChanges(action, currentFiles);
      case 'update-style':
        return this.computeStyleChanges(action, currentFiles);
      case 'update-content':
        return this.computeContentChanges(action, currentFiles);
      case 'add-page':
        return this.computeAddPage(action, currentFiles);
      case 'remove-page':
        return this.computeRemovePage(action, currentFiles);
      case 'add-feature':
        return this.computeAddFeature(action, currentFiles);
      case 'fix-bug':
        return this.computeFixBug(action, currentFiles);
      default:
        return [];
    }
  }

  findComponentFile(name: string, files: Map<string, string>): string | undefined {
    const nameLower = name.toLowerCase().replace(/\s+/g, '');

    for (const [path] of files) {
      const pathLower = path.toLowerCase();
      const basename = pathLower.split('/').pop()?.split('\\').pop()?.replace(/\.\w+$/, '') ?? '';
      if (basename === nameLower || basename.replace(/-/g, '') === nameLower) {
        return path;
      }
    }

    for (const [path] of files) {
      const pathLower = path.toLowerCase();
      if (pathLower.includes(nameLower)) {
        return path;
      }
    }

    return undefined;
  }

  findPageFile(route: string, files: Map<string, string>): string | undefined {
    const routeLower = route.toLowerCase().replace(/^\//, '');

    for (const [path] of files) {
      const pathLower = path.toLowerCase();
      if (pathLower.includes(routeLower)) {
        return path;
      }
    }

    const possibleNames = ['index', 'page', 'home'];
    for (const [path] of files) {
      const pathLower = path.toLowerCase();
      for (const name of possibleNames) {
        if (pathLower.includes(`/${routeLower}/${name}`) || pathLower.includes(`${routeLower}\\${name}`)) {
          return path;
        }
      }
    }

    return undefined;
  }

  generateDiff(before: string, after: string): string {
    if (before === after) {
      return '';
    }

    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    const diff: string[] = [];

    const maxLen = Math.max(beforeLines.length, afterLines.length);
    let i = 0;

    while (i < maxLen) {
      const beforeLine = beforeLines[i];
      const afterLine = afterLines[i];

      if (beforeLine === afterLine) {
        diff.push(`  ${beforeLine ?? ''}`);
        i++;
        continue;
      }

      let removeEnd = i;
      while (removeEnd < beforeLines.length && beforeLines[removeEnd] !== (afterLines[i] ?? '') && !afterLines.includes(beforeLines[removeEnd] ?? '')) {
        removeEnd++;
      }

      let addEnd = i;
      while (addEnd < afterLines.length && afterLines[addEnd] !== (beforeLines[i] ?? '') && !beforeLines.includes(afterLines[addEnd] ?? '')) {
        addEnd++;
      }

      if (removeEnd > i) {
        for (let r = i; r < removeEnd; r++) {
          diff.push(`- ${beforeLines[r]}`);
        }
      }
      if (addEnd > i) {
        for (let a = i; a < addEnd; a++) {
          diff.push(`+ ${afterLines[a]}`);
        }
      }

      i = Math.max(removeEnd, addEnd, i + 1);
    }

    return diff.join('\n');
  }

  applyChange(content: string, change: RefinementAction): string {
    switch (change.type) {
      case 'update-component':
        return this.applyComponentChange(content, change);
      case 'update-style':
        return this.applyStyleChange(content, change);
      case 'update-content':
        return this.applyContentChange(content, change);
      default:
        return content;
    }
  }

  private computeComponentChanges(
    action: Extract<RefinementAction, { type: 'update-component' }>,
    files: Map<string, string>
  ): FileChange[] {
    const filePath = this.findComponentFile(action.componentPath, files) ?? action.componentPath;
    const before = files.get(filePath);

    if (!before) {
      return [
        {
          path: filePath,
          action: 'create',
          after: this.generateComponentStub(action),
        },
      ];
    }

    const after = this.applyComponentChange(before, action);
    if (after === before) {
      return [];
    }

    return [
      {
        path: filePath,
        action: 'update',
        before,
        after,
        diff: this.generateDiff(before, after),
      },
    ];
  }

  private computeStyleChanges(
    action: Extract<RefinementAction, { type: 'update-style' }>,
    files: Map<string, string>
  ): FileChange[] {
    const changes: FileChange[] = [];
    const target = action.target.toLowerCase();

    for (const [path, content] of files) {
      const pathLower = path.toLowerCase();
      if (pathLower.includes(target) || this_matchesStyleTarget(path, target)) {
        const after = this.applyStyleChangeToContent(content, action.styles);
        if (after !== content) {
          changes.push({
            path,
            action: 'update',
            before: content,
            after,
            diff: this.generateDiff(content, after),
          });
        }
      }
    }

    if (changes.length === 0) {
      for (const [path, content] of files) {
        if (path.endsWith('.css') || path.endsWith('.scss') || path.endsWith('.module.css')) {
          const after = this.applyStyleChangeToContent(content, action.styles);
          if (after !== content) {
            changes.push({
              path,
              action: 'update',
              before: content,
              after,
              diff: this.generateDiff(content, after),
            });
          }
        }
      }
    }

    return changes;
  }

  private computeContentChanges(
    action: Extract<RefinementAction, { type: 'update-content' }>,
    files: Map<string, string>
  ): FileChange[] {
    const changes: FileChange[] = [];
    const target = action.target.toLowerCase();

    for (const [path, content] of files) {
      const pathLower = path.toLowerCase();
      const basename = pathLower.split('/').pop()?.split('\\').pop()?.replace(/\.\w+$/, '') ?? '';

      if (pathLower.includes(target) || basename.includes(target)) {
        const after = this.replaceTextInContent(content, action.content);
        if (after !== content) {
          changes.push({
            path,
            action: 'update',
            before: content,
            after,
            diff: this.generateDiff(content, after),
          });
        }
      }
    }

    return changes;
  }

  private computeAddPage(
    action: Extract<RefinementAction, { type: 'add-page' }>,
    _files: Map<string, string>
  ): FileChange[] {
    const page = action.page;
    const route = page.route.replace(/^\//, '').replace(/\//g, '-');
    const componentName = this.toPascalCase(route) + 'Page';
    const filePath = `src/pages/${route}/${componentName}.tsx`;

    const componentImports = page.components
      .map((c) => `import { ${this.toPascalCase(c)} } from '../../components/${this.toPascalCase(c)}';`)
      .join('\n');

    const componentTags = page.components
      .map((c) => `      <${this.toPascalCase(c)} />`)
      .join('\n');

    const content = `import React from 'react';
${componentImports ? componentImports + '\n' : ''}
interface ${componentName}Props {
  className?: string;
}

export const ${componentName}: React.FC<${componentName}Props> = ({ className }) => {
  return (
    <main className={className}>
      <h1>${page.name}</h1>
${componentTags || '      {/* Content goes here */}'}
    </main>
  );
};

export default ${componentName};
`;

    return [
      {
        path: filePath,
        action: 'create',
        after: content,
      },
    ];
  }

  private computeRemovePage(
    action: Extract<RefinementAction, { type: 'remove-page' }>,
    files: Map<string, string>
  ): FileChange[] {
    const pagePath = this.findPageFile(action.pagePath, files) ?? action.pagePath;
    const content = files.get(pagePath);

    if (!content) {
      return [];
    }

    return [
      {
        path: pagePath,
        action: 'delete',
        before: content,
      },
    ];
  }

  private computeAddFeature(
    action: Extract<RefinementAction, { type: 'add-feature' }>,
    files: Map<string, string>
  ): FileChange[] {
    const changes: FileChange[] = [];
    const featureName = this.toPascalCase(action.feature);

    const hookPath = `src/hooks/use${featureName}.ts`;
    const hookContent = `import { useState, useCallback } from 'react';

interface Use${featureName}Options {
  ${Object.entries(action.config)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? 'string' : typeof v === 'number' ? 'number' : 'unknown'};`)
    .join('\n  ')}
}

interface Use${featureName}Return {
  isLoading: boolean;
  error: string | null;
  execute: () => Promise<void>;
}

export function use${featureName}(options?: Partial<Use${featureName}Options>): Use${featureName}Return {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Implement ${featureName} logic
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, execute };
}
`;
    changes.push({
      path: hookPath,
      action: 'create',
      after: hookContent,
    });

    const componentPath = `src/components/${featureName}.tsx`;
    const componentContent = `import React from 'react';

interface ${featureName}Props {
  className?: string;
}

export const ${featureName}: React.FC<${featureName}Props> = ({ className }) => {
  return (
    <section className={className}>
      <h2>${featureName}</h2>
      {/* Feature content */}
    </section>
  );
};

export default ${featureName};
`;
    changes.push({
      path: componentPath,
      action: 'create',
      after: componentContent,
    });

    return changes;
  }

  private computeFixBug(
    action: Extract<RefinementAction, { type: 'fix-bug' }>,
    files: Map<string, string>
  ): FileChange[] {
    const changes: FileChange[] = [];

    for (const affectedPath of action.affectedFiles) {
      const content = files.get(affectedPath);
      if (content) {
        changes.push({
          path: affectedPath,
          action: 'update',
          before: content,
          after: content,
          diff: `// Bug fix needed: ${action.description}\n// Review required for: ${affectedPath}`,
        });
      }
    }

    return changes;
  }

  private applyComponentChange(content: string, action: Extract<RefinementAction, { type: 'update-component' }>): string {
    let result = content;

    for (const [key, value] of Object.entries(action.changes)) {
      if (key === 'text' && typeof value === 'string') {
        result = this.replaceTextContent(result, value);
      } else if (key === 'style' && typeof value === 'object' && value !== null) {
        result = this.inlineStyleChange(result, value as Record<string, string>);
      } else if (key === 'visible' && typeof value === 'boolean') {
        if (!value) {
          result = this.wrapWithCondition(result, 'false');
        }
      } else if (key === 'action' && value === 'remove') {
        return '';
      } else if (typeof value === 'string') {
        result = this.replaceAttributeValue(result, key, value);
      }
    }

    return result;
  }

  private applyStyleChange(content: string, action: Extract<RefinementAction, { type: 'update-style' }>): string {
    return this.applyStyleChangeToContent(content, action.styles);
  }

  private applyContentChange(content: string, action: Extract<RefinementAction, { type: 'update-content' }>): string {
    return this.replaceTextInContent(content, action.content);
  }

  private applyStyleChangeToContent(content: string, styles: Record<string, string>): string {
    let result = content;

    for (const [property, value] of Object.entries(styles)) {
      const cssProperty = this.toKebabCase(property);

      const inlinePattern = new RegExp(
        `(${this.escapeRegex(cssProperty)}\\s*:\\s*)([^;]+)`,
        'gi'
      );
      if (inlinePattern.test(result)) {
        result = result.replace(inlinePattern, `$1${value}`);
        continue;
      }

      if (result.includes('className') || result.includes('class=')) {
        const className = this.extractMainClassName(result);
        if (className) {
          result = this.appendInlineStyle(result, `${cssProperty}: ${value}`);
        }
      }
    }

    return result;
  }

  private replaceTextContent(content: string, newText: string): string {
    const textPatterns = [
      /(<h[1-6][^>]*>)([^<]+)(<\/h[1-6]>)/g,
      /(<p[^>]*>)([^<]+)(<\/p>)/g,
      /(<span[^>]*>)([^<]+)(<\/span>)/g,
      /(<a[^>]*>)([^<]+)(<\/a>)/g,
      /(<button[^>]*>)([^<]+)(<\/button>)/g,
      /(title:\s*['"])([^'"]+)(['"])/g,
      /(label:\s*['"])([^'"]+)(['"])/g,
      /(text:\s*['"])([^'"]+)(['"])/g,
      /(heading:\s*['"])([^'"]+)(['"])/g,
      /(description:\s*['"])([^'"]+)(['"])/g,
    ];

    let result = content;
    let replaced = false;

    for (const pattern of textPatterns) {
      if (pattern.test(result)) {
        result = result.replace(pattern, `$1${newText}$3`);
        replaced = true;
        break;
      }
    }

    if (!replaced) {
      const anyTagPattern = /(<\w+[^>]*>)([^<]+)(<\/\w+>)/;
      if (anyTagPattern.test(result)) {
        result = result.replace(anyTagPattern, `$1${newText}$3`);
      }
    }

    return result;
  }

  private inlineStyleChange(content: string, styles: Record<string, string>): string {
    let result = content;

    for (const [property, value] of Object.entries(styles)) {
      const cssProperty = this.toKebabCase(property);
      result = this.appendInlineStyle(result, `${cssProperty}: ${value}`);
    }

    return result;
  }

  private appendInlineStyle(content: string, styleDeclaration: string): string {
    const styleAttrPattern = /(style\s*=\s*\{\s*\{)([^}]*)(\}\})/g;

    if (styleAttrPattern.test(content)) {
      return content.replace(styleAttrPattern, (_, open: string, existing: string, close: string) => {
        const trimmed = existing.trim();
        const separator = trimmed.endsWith(';') || trimmed === '' ? '' : ', ';
        return `${open}${trimmed}${separator}${styleDeclaration}${close}`;
      });
    }

    const classNamePattern = /(className\s*=\s*["'{])([^"'}]+)(["'}])/;
    if (classNamePattern.test(content)) {
      return content.replace(classNamePattern, (_, pre: string, cls: string, post: string) => {
        const propPart = styleDeclaration.split(':')[0];
        const kebabProp = this.toKebabCase((propPart ?? '').trim());
        return `${pre}${cls} ${kebabProp}${post}`;
      });
    }

    return content;
  }

  private wrapWithCondition(content: string, condition: string): string {
    const returnMatch = content.match(/return\s*\(/);
    if (returnMatch) {
      const idx = returnMatch.index!;
      const indent = content.slice(0, idx).match(/(\s*)$/)?.[1] ?? '  ';
      return content.slice(0, idx) + `return (\n${indent}  {${condition} && (\n` + content.slice(idx + 8) + `\n${indent}  )}\n${indent})`;
    }
    return content;
  }

  private replaceAttributeValue(content: string, attr: string, value: string): string {
    const pattern = new RegExp(`(${this.escapeRegex(attr)}\\s*=\\s*["'])([^"']*)(["'])`, 'gi');
    if (pattern.test(content)) {
      return content.replace(pattern, `$1${value}$3`);
    }
    return content;
  }

  private replaceTextInContent(content: string, newText: string): string {
    return this.replaceTextContent(content, newText);
  }

  private extractMainClassName(content: string): string | undefined {
    const match = content.match(/className\s*=\s*["']([^"']+)["']/);
    return match ? match[1] : undefined;
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private generateComponentStub(action: Extract<RefinementAction, { type: 'update-component' }>): string {
    const name = this.toPascalCase(action.componentPath.split('/').pop() ?? 'Component');
    return `import React from 'react';

interface ${name}Props {
  className?: string;
}

export const ${name}: React.FC<${name}Props> = ({ className }) => {
  return (
    <div className={className}>
      <p>${name}</p>
    </div>
  );
};

export default ${name};
`;
  }
}

function this_matchesStyleTarget(path: string, target: string): boolean {
  const pathLower = path.toLowerCase();
  const basename = pathLower.split('/').pop()?.split('\\').pop()?.replace(/\.\w+$/, '') ?? '';
  return basename.includes(target) || target.includes(basename);
}
