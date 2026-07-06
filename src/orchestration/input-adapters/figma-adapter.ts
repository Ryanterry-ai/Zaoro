import crypto from 'node:crypto';
import { IntentType } from '../types.js';
import type { InputAdapter, AdapterResult } from './types.js';

const FIGMA_URL_PATTERN = /figma\.com\/(file|design|proto)\/([a-zA-Z0-9_-]+)/i;
const FIGMA_KEY_PATTERN = /^[a-zA-Z0-9_-]{20,}$/;

export class FigmaAdapter implements InputAdapter {
  readonly type = IntentType.Figma;

  canHandle(input: string): boolean {
    return FIGMA_URL_PATTERN.test(input.trim()) || FIGMA_KEY_PATTERN.test(input.trim());
  }

  async process(input: string, _options?: Record<string, unknown>): Promise<AdapterResult> {
    const trimmed = input.trim();
    const fileMatch = trimmed.match(FIGMA_URL_PATTERN);
    const fileKey = fileMatch?.[2] ?? trimmed;

    const projectName = fileMatch
      ? this.deriveNameFromUrl(trimmed)
      : `Figma Project (${fileKey.slice(0, 8)}...)`;

    const pages = this.inferPagesFromName(projectName);

    const id = `figma-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const manifest = {
      id,
      description: `Design project from Figma file: ${projectName}`,
      userInput: input,
      name: projectName,
      createdAt: new Date().toISOString(),
      version: 1,
    };

    return {
      manifest,
      adapterType: IntentType.Figma,
      confidence: 0.9,
      detectedName: projectName,
      entities: ['Page', 'Component', 'Style', 'Asset'],
      pages,
      integrations: ['design-tokens', 'component-library'],
      metadata: {
        fileKey,
        url: fileMatch ? trimmed : undefined,
        detectedPages: pages,
      },
    };
  }

  private deriveNameFromUrl(url: string): string {
    const path = new URL(url).pathname.split('/').filter(Boolean);
    const rawName = path[2] ?? 'Figma Project';
    return rawName
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  private inferPagesFromName(name: string): string[] {
    const lower = name.toLowerCase();
    const pages: string[] = ['/'];

    if (lower.includes('landing') || lower.includes('home') || lower.includes('marketing')) {
      pages.push('/features', '/pricing', '/about', '/contact');
    }
    if (lower.includes('dashboard') || lower.includes('admin')) {
      pages.push('/dashboard', '/settings', '/users', '/analytics');
    }
    if (lower.includes('ecommerce') || lower.includes('shop') || lower.includes('store')) {
      pages.push('/shop', '/product/:id', '/cart', '/checkout');
    }
    if (lower.includes('app') || lower.includes('mobile')) {
      pages.push('/login', '/signup', '/profile');
    }

    return [...new Set(pages)];
  }
}
