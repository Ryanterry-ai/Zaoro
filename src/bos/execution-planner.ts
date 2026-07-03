/**
 * ExecutionPlanner — maps ApplicationBlueprint to ExecutionBlueprint.
 *
 * This is pure structural mapping. NO business logic, NO prop resolution.
 * It answers: "Which components go on each page?"
 *
 * The ContentResolver then fills in the actual content.
 */

import type { ApplicationBlueprint, PagePlan } from './schemas/blueprint/application-blueprint.schema.js';
import type {
  ExecutionBlueprint,
  PageExecutionPlan,
  ComponentSlot,
} from './schemas/blueprint/execution-blueprint.schema.js';
import { mapSectionToSlot } from './section-mapper.js';
import { stageLogger } from '../core/debug-logger.js';

const log = stageLogger('exec');

/**
 * Build an ExecutionBlueprint from an ApplicationBlueprint.
 *
 * Flow:
 *   ApplicationBlueprint → ExecutionBlueprint → (ContentResolver) → ApplicationSpec → (Renderer) → Code
 */
export function buildExecutionBlueprint(blueprint: ApplicationBlueprint): ExecutionBlueprint {
  if (!blueprint) {
    log.warn('buildExecutionBlueprint: blueprint is undefined or null');
    throw new Error('buildExecutionBlueprint: blueprint is undefined or null');
  }
  if (!blueprint.pages || !Array.isArray(blueprint.pages)) {
    log.warn('buildExecutionBlueprint: blueprint.pages is undefined or not an array');
    throw new Error('buildExecutionBlueprint: blueprint.pages is undefined or not an array');
  }

  log.info('Building execution blueprint', {
    pages: blueprint.pages.length,
    entities: blueprint.entities?.length ?? 0,
  });

  const t = Date.now();
  const pages = blueprint.pages.map(page =>
    buildPageExecutionPlan(page, blueprint),
  );

  const totalSlots = pages.reduce((sum, p) => sum + p.slots.length, 0);
  log.info('Execution blueprint built', {
    pages: pages.length,
    totalSlots,
    duration: Date.now() - t,
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

/**
 * Build a PageExecutionPlan from a PagePlan.
 * Pure mapping: section name → component type.
 */
function buildPageExecutionPlan(
  page: PagePlan,
  blueprint: ApplicationBlueprint,
): PageExecutionPlan {
  const slots: ComponentSlot[] = [];

  for (const section of page.sections) {
    const slot = mapSectionToSlot(section, page, blueprint);
    if (slot) {
      slots.push(slot);
    }
  }

  return {
    pageId: page.id,
    path: page.path,
    name: page.name,
    type: page.type,
    layout: page.type === 'dashboard' ? 'dashboard' : 'default',
    slots: slots.sort((a, b) => a.order - b.order),
    seo: page.seo,
  };
}

/**
 * Resolve theme ID from blueprint design tokens.
 */
function resolveThemeId(blueprint: ApplicationBlueprint): string {
  const tokens = blueprint.designTokens as Record<string, unknown>;
  const colors = (tokens?.colors ?? {}) as Record<string, string>;
  const primary = colors.primary ?? '#6366F1';

  // Map primary color to theme
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
