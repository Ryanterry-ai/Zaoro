/**
 * BlueprintMapper — converts ApplicationBlueprint (BRE v2 rich) → FullStackBlueprint (compiler).
 *
 * This is the adapter layer that lets the existing compiler consume the richer
 * BRE v2 output without rewriting the compiler upfront. Pure function, no side effects.
 */

import type { ApplicationBlueprint } from './schemas/blueprint/application-blueprint.schema.js';
import type { FullStackBlueprint, DataModel, DataField, APIRouteSpec, StateStoreSpec } from '../types/index.js';

const PALETTE_MAP: Record<string, FullStackBlueprint['colorScheme']> = {
  '#7C3AED': 'violet',
  '#3B82F6': 'sky',
  '#10B981': 'emerald',
  '#F59E0B': 'amber',
  '#EF4444': 'rose',
  '#6366F1': 'indigo',
  '#8B5CF6': 'violet',
  '#0EA5E9': 'sky',
  '#059669': 'emerald',
  '#D97706': 'amber',
  '#DC2626': 'rose',
};

function mapColorToPalette(primaryColor: string | undefined): FullStackBlueprint['colorScheme'] {
  if (!primaryColor) return 'indigo';
  const upper = primaryColor.toUpperCase();
  if (PALETTE_MAP[upper]) return PALETTE_MAP[upper];
  for (const [hex, palette] of Object.entries(PALETTE_MAP)) {
    if (hex.toUpperCase() === upper) return palette;
  }
  return 'indigo';
}

function mapEntityTypeToDataField(
  field: { name: string; type: string; required?: boolean; indexed?: boolean; unique?: boolean },
): DataField {
  const typeMap: Record<string, DataField['type']> = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    date: 'DateTime',
    datetime: 'DateTime',
    reference: 'relation',
    rich_text: 'string',
    image: 'string',
    file: 'string',
    json: 'string',
    enum: 'string',
  };
  return {
    name: field.name,
    type: typeMap[field.type] ?? 'string',
    isRequired: field.required ?? false,
    isId: field.name === 'id',
  };
}

function mapEntitiesToDataModels(blueprint: ApplicationBlueprint): DataModel[] {
  return blueprint.entities.map(entity => ({
    name: entity.name,
    fields: entity.fields.map(f => mapEntityTypeToDataField(f)),
  }));
}

function mapRoutesToApiRoutes(blueprint: ApplicationBlueprint): APIRouteSpec[] {
  const routes: APIRouteSpec[] = [];

  for (const api of blueprint.apis) {
    const endpointParts = api.path.split('/').filter(Boolean);
    const targetModel = endpointParts[endpointParts.length - 1] ?? '';
    routes.push({
      endpoint: api.path,
      method: api.method as APIRouteSpec['method'],
      targetModel,
      description: api.description ?? `${api.method} ${api.path}`,
    });
  }

  if (routes.length === 0) {
    for (const entity of blueprint.entities) {
      routes.push(
        { endpoint: `/api/${entity.slug}`, method: 'GET', targetModel: entity.name, description: `List ${entity.name}s` },
        { endpoint: `/api/${entity.slug}`, method: 'POST', targetModel: entity.name, description: `Create ${entity.name}` },
        { endpoint: `/api/${entity.slug}/:id`, method: 'GET', targetModel: entity.name, description: `Get ${entity.name}` },
        { endpoint: `/api/${entity.slug}/:id`, method: 'PUT', targetModel: entity.name, description: `Update ${entity.name}` },
        { endpoint: `/api/${entity.slug}/:id`, method: 'DELETE', targetModel: entity.name, description: `Delete ${entity.name}` },
      );
    }
  }

  return routes;
}

function mapWorkflowsToStateStores(blueprint: ApplicationBlueprint): StateStoreSpec[] {
  const stores: StateStoreSpec[] = [];

  if (blueprint.workflows.length > 0) {
    for (const workflow of blueprint.workflows) {
      const stateFields = workflow.entities.length > 0
        ? workflow.entities.map((e, i) => ({
            name: `${e.toLowerCase()}Data`,
            type: 'any',
            initialValue: i === 0 ? 'null' : 'null',
          }))
        : [{ name: 'loading', type: 'boolean', initialValue: 'false' }];

      stores.push({
        name: workflow.name.replace(/[^a-zA-Z0-9]/g, ''),
        properties: stateFields,
        actions: workflow.steps.map(step => ({
          name: step.name.replace(/[^a-zA-Z0-9]/g, ''),
          params: '',
          logic: `// ${step.action}`,
        })),
      });
    }
  }

  if (stores.length === 0) {
    for (const entity of blueprint.entities.slice(0, 3)) {
      stores.push({
        name: entity.name,
        properties: [
          { name: `selected${entity.name}`, type: `${entity.name} | null`, initialValue: 'null' },
          { name: `${entity.name.toLowerCase()}List`, type: `${entity.name}[]`, initialValue: '[]' },
          { name: 'loading', type: 'boolean', initialValue: 'false' },
        ],
        actions: [
          { name: `set${entity.name}`, params: `item: ${entity.name} | null`, logic: `set${entity.name}(item)` },
          { name: `fetch${entity.name}s`, params: '', logic: `// fetch ${entity.name.toLowerCase()}s from API` },
        ],
      });
    }
  }

  return stores;
}

function mapPages(blueprint: ApplicationBlueprint): FullStackBlueprint['pages'] {
  return blueprint.pages.map(page => ({
    path: page.path,
    title: page.name,
    layout: 'default',
    blocks: page.sections,
  }));
}

/**
 * Convert an ApplicationBlueprint (BRE v2 rich output) into a FullStackBlueprint
 * that the existing FullStackCompilerPipeline can consume.
 */
export function mapBlueprintToFullStack(blueprint: ApplicationBlueprint): FullStackBlueprint {
  const primaryColor = (blueprint.designTokens as Record<string, unknown>)?.colors
    && typeof blueprint.designTokens.colors === 'object'
    && blueprint.designTokens.colors !== null
      ? (blueprint.designTokens.colors as Record<string, string>).primary
      : undefined;

  return {
    appName: blueprint.name,
    colorScheme: mapColorToPalette(primaryColor),
    dataModels: mapEntitiesToDataModels(blueprint),
    apiRoutes: mapRoutesToApiRoutes(blueprint),
    stateStores: mapWorkflowsToStateStores(blueprint),
    pages: mapPages(blueprint),
  };
}
