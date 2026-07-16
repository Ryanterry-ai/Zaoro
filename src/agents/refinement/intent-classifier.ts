import type { ConversationMemory } from './conversation-memory.js';
import type { RefinementAction } from './types.js';

export type RefinementIntent =
  | { type: 'new-build'; prompt: string }
  | { type: 'modify'; action: RefinementAction; confidence: number }
  | { type: 'ambiguous'; suggestion: string };

const MODIFICATION_KEYWORDS = [
  'change',
  'update',
  'modify',
  'edit',
  'fix',
  'make it',
  'add a',
  'add the',
  'remove',
  'replace',
  'instead of',
  'can you',
  'adjust',
  'tweak',
  'alter',
  'revise',
  'switch',
  'swap',
  'turn',
  'move',
  'resize',
  'restyle',
  'reposition',
];

const NEW_BUILD_KEYWORDS = [
  'build',
  'create',
  'generate',
  'make me',
  'i want a new',
  'start fresh',
  'new project',
  'new app',
  'new website',
  'from scratch',
  'begin',
  'initialize',
];

const STYLE_PROPERTIES = new Set([
  'color',
  'background',
  'background-color',
  'font-size',
  'font-family',
  'padding',
  'margin',
  'border',
  'border-radius',
  'width',
  'height',
  'display',
  'flex',
  'grid',
  'gap',
  'opacity',
  'shadow',
  'box-shadow',
  'text-align',
  'line-height',
  'spacing',
  'shadow',
  'background-gradient',
  'gradient',
  'border',
  'align',
  'justify',
  'position',
]);

const STYLE_KEYWORDS = new Set([
  'color',
  'style',
  'font',
  'padding',
  'margin',
  'spacing',
  'border',
  'shadow',
  'background',
  'gradient',
  'rounded',
  'radius',
  'align',
  'justify',
  'position',
  'size',
  'width',
  'height',
  'opacity',
  'theme',
  'dark mode',
  'light mode',
]);

export class IntentClassifier {
  classify(prompt: string, memory: ConversationMemory): RefinementIntent {
    const lowerPrompt = prompt.toLowerCase().trim();
    const isFirstBuild = memory.isFirstBuild();

    const hasModKeywords = this.isModificationPrompt(lowerPrompt);
    const hasNewKeywords = this.isNewBuildPrompt(lowerPrompt);

    if (isFirstBuild && !hasModKeywords) {
      return { type: 'new-build', prompt };
    }

    if (hasNewKeywords && !hasModKeywords) {
      return { type: 'new-build', prompt };
    }

    if (hasModKeywords && !hasNewKeywords) {
      const action = this.buildAction(prompt, lowerPrompt, memory);
      if (action) {
        return { type: 'modify', action, confidence: 0.85 };
      }
    }

    if (hasModKeywords && hasNewKeywords) {
      const action = this.buildAction(prompt, lowerPrompt, memory);
      if (action) {
        return { type: 'modify', action, confidence: 0.6 };
      }
      return { type: 'new-build', prompt };
    }

    if (!isFirstBuild) {
      const action = this.buildAction(prompt, lowerPrompt, memory);
      if (action) {
        return { type: 'modify', action, confidence: 0.5 };
      }
    }

    return {
      type: 'ambiguous',
      suggestion:
        'Could you clarify whether you want to build something new or modify the existing app?',
    };
  }

  private isModificationPrompt(prompt: string): boolean {
    return MODIFICATION_KEYWORDS.some((kw) => prompt.includes(kw));
  }

  private isNewBuildPrompt(prompt: string): boolean {
    return NEW_BUILD_KEYWORDS.some((kw) => prompt.includes(kw));
  }

  private buildAction(
    prompt: string,
    lowerPrompt: string,
    memory: ConversationMemory
  ): RefinementAction | undefined {
    if (this.looksLikeStyleChange(lowerPrompt)) {
      const target = this.extractModificationTarget(prompt) ?? 'global';
      const styles = this.extractStyles(lowerPrompt);
      if (Object.keys(styles).length > 0) {
        return { type: 'update-style', target, styles };
      }
    }

    if (lowerPrompt.includes('remove')) {
      const target = this.extractModificationTarget(prompt);
      if (target) {
        const files = this.findAffectedFiles(target, memory);
        if (files.length > 0 && files[0]?.includes('/pages/')) {
          return { type: 'remove-page', pagePath: files[0] };
        }
      }
    }

    if (lowerPrompt.includes('add a page') || lowerPrompt.includes('add page') || lowerPrompt.includes('new page')) {
      const pageName = this.extractPageName(prompt);
      if (pageName) {
        return {
          type: 'add-page',
          page: {
            route: `/${pageName.toLowerCase().replace(/\s+/g, '-')}`,
            name: pageName,
            components: [],
          },
        };
      }
    }

    if (lowerPrompt.includes('fix')) {
      const target = this.extractModificationTarget(prompt);
      const files = target ? this.findAffectedFiles(target, memory) : [];
      return {
        type: 'fix-bug',
        description: prompt,
        affectedFiles: files,
      };
    }

    if (lowerPrompt.includes('add') || lowerPrompt.includes('new')) {
      const feature = this.extractFeatureName(prompt);
      if (feature) {
        return {
          type: 'add-feature',
          feature,
          config: {},
        };
      }
    }

    const target = this.extractModificationTarget(prompt);
    if (target) {
      const change = this.extractChange(prompt);
      const files = this.findAffectedFiles(target, memory);
      const firstFile = files[0];
      if (firstFile !== undefined) {
        return {
          type: 'update-component',
          componentPath: firstFile,
          changes: change ?? { rawPrompt: prompt },
        };
      }
      return {
        type: 'update-content',
        target,
        content: prompt,
      };
    }

    return undefined;
  }

  private looksLikeStyleChange(prompt: string): boolean {
    for (const keyword of STYLE_KEYWORDS) {
      if (prompt.includes(keyword)) {
        return true;
      }
    }
    for (const prop of STYLE_PROPERTIES) {
      if (prompt.includes(prop)) {
        return true;
      }
    }
    return false;
  }

  private extractModificationTarget(prompt: string): string | undefined {
    const patterns = [
      /(?:the|in|on|for|at)\s+(?:hero|header|footer|nav|navbar|sidebar|modal|button|card|section|page|banner|form|input|table|list|grid|layout)\b/i,
      /(?:hero|header|footer|nav|navbar|sidebar|modal|button|card|section|page|banner|form|input|table|list|grid|layout)\b/i,
    ];

    for (const pattern of patterns) {
      const match = prompt.match(pattern);
      if (match) {
        return match[0].toLowerCase().replace(/^(the|in|on|for|at)\s+/, '');
      }
    }

    return undefined;
  }

  private extractStyles(prompt: string): Record<string, string> {
    const styles: Record<string, string> = {};

    const colorMatch = prompt.match(/(?:color|text color)\s+(?:to|should be|into)\s+(\S+)/i);
    if (colorMatch && colorMatch[1] !== undefined) {
      styles['color'] = colorMatch[1];
    }

    const bgMatch = prompt.match(/(?:background|bg)\s+(?:to|should be|into)\s+(\S+)/i);
    if (bgMatch && bgMatch[1] !== undefined) {
      styles['background-color'] = bgMatch[1];
    }

    const sizeMatch = prompt.match(/(?:font size|size)\s+(?:to|should be|into)\s+(\S+)/i);
    if (sizeMatch && sizeMatch[1] !== undefined) {
      styles['font-size'] = sizeMatch[1];
    }

    const paddingMatch = prompt.match(/(?:padding|space)\s+(?:to|should be|into)\s+(\S+)/i);
    if (paddingMatch && paddingMatch[1] !== undefined) {
      styles['padding'] = paddingMatch[1];
    }

    const borderRadiusMatch = prompt.match(/(?:rounded|border radius|radius)\s+(?:to|should be|into)\s+(\S+)/i);
    if (borderRadiusMatch && borderRadiusMatch[1] !== undefined) {
      styles['border-radius'] = borderRadiusMatch[1];
    }

    const shadowMatch = prompt.match(/(?:shadow)\s+(?:to|should be|into)\s+(\S+)/i);
    if (shadowMatch && shadowMatch[1] !== undefined) {
      styles['box-shadow'] = shadowMatch[1];
    }

    const gradientMatch = prompt.match(/(?:gradient)\s+(?:to|should be|into)\s+(.+?)(?:\.|$)/i);
    if (gradientMatch && gradientMatch[1] !== undefined) {
      styles['background'] = gradientMatch[1].trim();
    }

    return styles;
  }

  private extractChange(prompt: string): Record<string, unknown> | undefined {
    const lowerPrompt = prompt.toLowerCase();

    const colorMatch = prompt.match(/(?:color|text color)\s+(?:to|should be|into)\s+(\S+)/i);
    if (colorMatch && colorMatch[1] !== undefined) {
      return { style: { color: colorMatch[1] } };
    }

    const textMatch = prompt.match(/(?:text|content|label)\s+(?:to|should be|into)\s+["']?(.+?)["']?\s*$/i);
    if (textMatch && textMatch[1] !== undefined) {
      return { text: textMatch[1].trim() };
    }

    const sizeMatch = prompt.match(/(?:font size|size)\s+(?:to|should be|into)\s+(\S+)/i);
    if (sizeMatch && sizeMatch[1] !== undefined) {
      return { style: { 'font-size': sizeMatch[1] } };
    }

    if (lowerPrompt.includes('remove')) {
      return { action: 'remove' };
    }

    if (lowerPrompt.includes('hide')) {
      return { visible: false };
    }

    if (lowerPrompt.includes('show') || lowerPrompt.includes('display')) {
      return { visible: true };
    }

    return undefined;
  }

  private extractPageName(prompt: string): string | undefined {
    const match = prompt.match(/(?:add|create|new)\s+(?:a\s+)?(?:page|route)\s+(?:called|named|for)\s+["']?(.+?)["']?\s*$/i);
    if (match && match[1] !== undefined) {
      return match[1].trim();
    }
    const fallback = prompt.match(/(?:add|create|new)\s+(?:a\s+)?(?:page|route)\s+(\S+)/i);
    if (fallback && fallback[1] !== undefined) {
      return fallback[1].trim();
    }
    return undefined;
  }

  private extractFeatureName(prompt: string): string | undefined {
    const match = prompt.match(/(?:add|implement|integrate)\s+(?:a\s+|an?\s+)?(.+?)(?:\s+feature|\s+functionality|\s+support|\s+to|\s+for|\s*$)/i);
    if (match && match[1] !== undefined) {
      return match[1].trim();
    }
    return undefined;
  }

  private findAffectedFiles(target: string, memory: ConversationMemory): string[] {
    const files = memory.getCurrentFiles();
    const matched: string[] = [];
    const targetLower = target.toLowerCase();

    for (const [path] of files) {
      const pathLower = path.toLowerCase();
      if (pathLower.includes(targetLower)) {
        matched.push(path);
      }
    }

    if (matched.length === 0) {
      for (const [path] of files) {
        const pathLower = path.toLowerCase();
        const basename = pathLower.split('/').pop()?.split('\\').pop() ?? '';
        if (basename.includes(targetLower) || targetLower.includes(basename.replace(/\.\w+$/, ''))) {
          matched.push(path);
        }
      }
    }

    return matched;
  }
}
