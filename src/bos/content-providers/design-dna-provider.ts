/**
 * DesignDNAProvider — content from Application Classification and Design DNA.
 *
 * Provides: industry-specific design tokens, typography, color context.
 * Priority: 30 (above prompt).
 */

import type { ContentProvider, ContentBag, ProviderContext } from './interfaces.js';

export class DesignDNAProvider implements ContentProvider {
  readonly name = 'design-dna';
  readonly priority = 30;

  canProvide(ctx: ProviderContext): boolean {
    return !!(ctx.designDNA || ctx.appFamily);
  }

  provide(ctx: ProviderContext): ContentBag {
    const dna = ctx.designDNA;
    const family = ctx.appFamily;

    if (!dna && !family) return {};

    return {
      metadata: {
        designDNA: dna?.designStyle,
        appFamily: family?.family,
        appType: family?.appType,
        confidence: family?.confidence,
      },
    };
  }
}
