/**
 * BOSKnowledgeProvider — content from BOS knowledge packs.
 *
 * Provides: entities, workflows, compliance, terminology, industry context.
 * Priority: 10 (base — lowest, gets overridden by everything else).
 */

import type { ContentProvider, ContentBag, ProviderContext } from './interfaces.js';

export class BOSKnowledgeProvider implements ContentProvider {
  readonly name = 'bos-knowledge';
  readonly priority = 10;

  canProvide(ctx: ProviderContext): boolean {
    return ctx.blueprint.entities.length > 0 || ctx.blueprint.workflows.length > 0;
  }

  provide(ctx: ProviderContext): ContentBag {
    const { blueprint, vocabulary } = ctx;

    return {
      hero: {
        items: blueprint.workflows.slice(0, 3).map(w => ({
          title: w.name,
          description: w.description ?? `${w.name} workflow`,
          icon: 'zap' as const,
        })),
      },
      features: {
        items: [
          ...blueprint.entities.slice(0, 3).map(e => ({
            title: e.name,
            description: e.fields.slice(0, 3).map((f: { name: string }) => f.name).join(', '),
            icon: 'database' as const,
          })),
          ...blueprint.workflows.slice(0, 3).map(w => ({
            title: w.name,
            description: w.steps.slice(0, 2).map((s: { action: string }) => s.action).join(' → '),
            icon: 'zap' as const,
          })),
        ],
      },
      about: {
        items: [
          {
            title: 'Our Domain',
            description: blueprint.entities.map(e => e.name).join(', '),
            icon: 'layers' as const,
          },
          {
            title: 'Our Process',
            description: blueprint.workflows.map(w => w.name).join(' → '),
            icon: 'workflow' as const,
          },
        ],
      },
      team: {
        items: [
          { title: 'Operations', description: 'Managing core business workflows', icon: 'settings' as const },
          { title: 'Technology', description: 'Building and maintaining systems', icon: 'code' as const },
          { title: 'Customer Success', description: 'Ensuring client satisfaction', icon: 'heart' as const },
        ],
      },
      mission: {
        items: [
          { title: 'Domain Focus', description: `Specialized in ${blueprint.industry}`, icon: 'target' as const },
          { title: 'Compliance', description: 'Industry standards and regulations', icon: 'shield' as const },
        ],
      },
      vocabulary,
    };
  }
}
