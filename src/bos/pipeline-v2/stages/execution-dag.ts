import type { ApplicationBlueprint, PagePlan } from '../../schemas/blueprint/application-blueprint.schema.js';
import type { ExecutionBlueprint, PageExecutionPlan, ComponentSlot } from '../../schemas/blueprint/execution-blueprint.schema.js';
import { mapSectionToSlot } from '../../section-mapper.js';

export function runExecutionDAGStage(blueprint: ApplicationBlueprint): ExecutionBlueprint {
  const pages: PageExecutionPlan[] = blueprint.pages.map(page => {
    const slots: ComponentSlot[] = [];

    for (const section of page.sections) {
      const slot = mapSectionToSlot(section, page, blueprint);
      if (slot) {
        slots.push(slot);
      }
    }

    return {
      pageId: page.id ?? `page-${page.path.replace(/\//g, '-').replace(/^-/, '')}`,
      path: page.path,
      name: page.name,
      type: page.type,
      layout: page.type === 'dashboard' ? 'dashboard' : 'default',
      slots: slots.sort((a, b) => a.order - b.order),
      seo: page.seo,
    };
  });

  return {
    id: `exec-${blueprint.id}`,
    createdAt: new Date().toISOString(),
    appId: blueprint.id,
    appName: blueprint.name,
    industry: blueprint.industry,
    themeId: resolveThemeId(blueprint),
    pages,
    metadata: {
      entityCount: String(blueprint.entities.length),
      apiCount: String(blueprint.apis.length),
      workflowCount: String(blueprint.workflows.length),
    },
  };
}

function resolveThemeId(blueprint: ApplicationBlueprint): string {
  const tokens = blueprint.designTokens as Record<string, unknown>;
  const colors = (tokens?.colors ?? {}) as Record<string, string>;
  const primary = colors.primary ?? '#6366F1';

  const themeMap: Record<string, string> = {
    '#7C3AED': 'saas-modern',
    '#6366F1': 'saas-modern',
    '#3B82F6': 'saas-modern',
    '#059669': 'healthcare-clean',
    '#10B981': 'healthcare-clean',
    '#F59E0B': 'ecommerce-modern',
    '#DC2626': 'luxury-dark',
    '#8B5CF6': 'luxury-dark',
  };

  return themeMap[primary.toUpperCase()] ?? 'saas-modern';
}
