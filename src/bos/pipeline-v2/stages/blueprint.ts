import type { StageInput, StageOutput } from '../stages.js';
import type {
  ApplicationBlueprint,
  PagePlan,
  EntityPlan,
  WorkflowPlan,
  ApiPlan,
  NavPlan,
} from '../../schemas/blueprint/application-blueprint.schema.js';
import { DESIGN_PROFILES } from '../../knowledge/registry.js';

export function runBlueprintStage(input: StageInput, stageOutput: StageOutput): ApplicationBlueprint {
  const capGraph = stageOutput.capabilityGraph!;
  const entityGraph = stageOutput.entityGraph!;
  const workflowGraph = stageOutput.workflowGraph!;
  const navGraph = stageOutput.navigationGraph!;
  const dbGraph = stageOutput.databaseGraph!;
  const apiGraph = stageOutput.apiGraph!;
  const constraintReport = input.constraintReport;

  // Build PagePlans
  const pages: PagePlan[] = navGraph.pages.map(p => ({
    id: `page-${p.path.replace(/\//g, '-').replace(/^-/, '') || 'home'}`,
    path: p.path,
    name: p.name,
    type: p.type,
    sections: p.sections,
    components: [],
    dataRequirements: p.entities,
    permissions: [],
    isEntry: p.path === '/',
    seo: { title: p.name, description: `${p.name} page for ${input.context.appName ?? input.context.industry} application` },
  }));

  // Build EntityPlans
  const entities: EntityPlan[] = entityGraph.entities.map(e => ({
    id: `entity-${e.slug}`,
    name: e.name,
    slug: e.slug,
    fields: e.fields.map(f => ({
      name: f.name,
      type: f.type,
      required: f.required,
      indexed: f.indexed,
      unique: f.unique,
    })),
    relationships: entityGraph.relationships
      .filter(r => r.source === e.name)
      .map(r => ({
        target: r.target,
        type: r.type,
        foreignKey: r.foreignKey,
      })),
    uiSections: [],
    workflows: e.workflows,
    permissions: [],
  }));

  // Build relationships list
  const relationships = entityGraph.relationships.map(r => ({
    target: r.target,
    type: r.type as 'has_many' | 'belongs_to' | 'has_one' | 'many_to_many',
    foreignKey: r.foreignKey,
  }));

  // Build WorkflowPlans
  const workflows: WorkflowPlan[] = workflowGraph.workflows.map(w => ({
    id: `workflow-${w.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: w.name,
    trigger: w.trigger,
    steps: w.steps.map(s => ({
      name: s.name,
      action: s.action,
      entity: s.entity,
      condition: s.condition,
    })),
    entities: w.entities,
    services: [],
  }));

  // Build integrations from capability graph
  const integrations = capGraph.requiredIntegrations.map((name: string) => ({
    id: `integration-${name.toLowerCase().replace(/\s+/g, '-')}`,
    type: 'erp' as const,
    name,
    required: false,
    config: {} as Record<string, string>,
  }));

  // Build navigation
  const navigation: NavPlan = {
    items: navGraph.navItems.map(n => ({
      label: n.label,
      href: n.href,
      icon: n.icon,
      children: n.children?.map(c => ({ label: c.label, href: c.href })),
    })),
    style: 'horizontal',
    sticky: true,
    logo: true,
  };

  // Build database
  const database = {
    engine: dbGraph.engine as 'postgresql',
    tables: dbGraph.tables.map(t => ({
      name: t.name,
      columns: t.columns as ApplicationBlueprint['database']['tables'][0]['columns'],
      indexes: t.indexes.map(i => ({ columns: i.columns, unique: i.unique })),
      foreignKeys: t.foreignKeys.map(fk => ({
        column: fk.column,
        references: fk.references,
        onDelete: fk.onDelete as 'cascade' | 'restrict' | 'set null',
      })),
    })),
  };

  // Build APIs
  const apis: ApiPlan[] = apiGraph.endpoints.map(e => ({
    path: e.path,
    method: e.method,
    description: e.description,
    auth: e.auth,
  }));

  // Build layouts
  const layouts = navGraph.layouts.map(l => ({
    id: l.id,
    name: l.id === 'default' ? 'Default Layout' : 'Dashboard Layout',
    areas: l.areas,
    components: l.components,
    responsive: {} as Record<string, string[]>,
  }));

  // Routes
  const routes = pages.map(p => ({
    path: p.path,
    method: 'GET' as const,
    handler: `page:${p.id}`,
    auth: p.type === 'auth',
  }));

  // Design tokens
  const designTokens = compileDesignTokens(input);

  // Permissions
  const permissions = compilePermissions(input.decisions);

  // Dashboard widgets
  const dashboardWidgets = compileDashboardWidgets(pages, entities);

  // Charts
  const charts = compileCharts(pages);

  // Forms
  const forms = entities.map(e => ({
    id: `form-${e.slug}`,
    entity: e.name,
    fields: e.fields.filter(f => f.name !== 'id' && f.name !== 'createdAt' && f.name !== 'updatedAt'),
    submitAction: `/api/${e.slug}`,
    validation: [] as Array<{ field: string; rule: string; message?: string }>,
  }));

  // Tables
  const tables = entities.map(e => ({
    id: `table-${e.slug}`,
    entity: e.name,
    columns: e.fields.map(f => ({
      field: f.name,
      header: f.name.charAt(0).toUpperCase() + f.name.slice(1).replace(/_/g, ' '),
      sortable: true,
      filterable: f.indexed,
      width: undefined as string | undefined,
    })),
    pagination: true,
    pageSize: 20,
    sortable: true,
    filterable: true,
  }));

  // Warnings
  const warnings: string[] = [];
  for (const violation of constraintReport.violations) {
    warnings.push(...violation.violations);
    warnings.push(...violation.suggestions.map(s => `Suggestion: ${s}`));
  }

  const id = `blueprint-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    version: '2.1.0',
    createdAt: new Date().toISOString(),
    name: input.context.appName ?? `${input.context.industry} Application`,
    description: input.context.description,
    industry: input.context.industry,
    businessModels: input.context.businessModels,
    country: input.context.country,
    compliancePacks: input.context.compliancePacks,
    journeys: input.context.journeys,
    pages,
    routes,
    layouts,
    navigation,
    permissions,
    entities,
    relationships,
    database,
    apis,
    workflows,
    dashboardWidgets,
    charts,
    forms,
    tables,
    integrations,
    designTokens,
    generationRules: input.decisions.map(d => ({ id: d.ruleId, params: {} })),
    provenance: {
      knowledge: input.knowledgeRefs,
      compilers: ['normalized-pipeline-v2'],
    },
    vocabulary: input.vocabulary,
    confidence: computeConfidence(input, stageOutput),
    warnings,
  };
}

function compileDesignTokens(input: StageInput): Record<string, Record<string, string>> {
  const fallback = {
    colors: { primary: '#7C3AED', secondary: '#3B82F6', background: '#09090B', foreground: '#FAFAFA' },
    typography: { heading: 'Inter', body: 'Inter' },
    spacing: { sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
  };

  if (!input.selectedDesignProfile) {
    return fallback as unknown as Record<string, Record<string, string>>;
  }

  const fullProfile = DESIGN_PROFILES.find(p => p.id === input.selectedDesignProfile!.id);
  if (!fullProfile) {
    return fallback as unknown as Record<string, Record<string, string>>;
  }

  return {
    profileId: fullProfile.id,
    profileName: fullProfile.name,
    colors: fullProfile.colorPsychology as unknown as Record<string, string>,
    typography: {
      heading: fullProfile.typography.displayFamily,
      body: fullProfile.typography.bodyFamily,
      ...(fullProfile.typography.monoFamily ? { mono: fullProfile.typography.monoFamily } : {}),
    },
    spacing: fullProfile.spacing as Record<string, string>,
    motion: {
      durationFast: fullProfile.motion.duration.fast,
      durationNormal: fullProfile.motion.duration.normal,
      durationSlow: fullProfile.motion.duration.slow,
      easingDefault: fullProfile.motion.easing.default,
    },
  } as unknown as Record<string, Record<string, string>>;
}

function compilePermissions(decisions: import('../../reasoning/rules-engine.js').RuleDecision[]) {
  const perms: Array<{
    id: string;
    role: string;
    resource: string;
    actions: Array<'create' | 'read' | 'update' | 'delete' | 'list' | 'export' | 'import'>;
    conditions: string[];
  }> = [];

  for (const d of decisions) {
    if (d.action.type === 'add_permission') {
      perms.push({
        id: `perm-${d.action.role}-${d.action.resource}`,
        role: d.action.role,
        resource: d.action.resource,
        actions: d.action.actions as Array<'create' | 'read' | 'update' | 'delete' | 'list' | 'export' | 'import'>,
        conditions: [],
      });
    }
  }

  return perms;
}

function compileDashboardWidgets(
  pages: PagePlan[],
  entities: EntityPlan[],
): ApplicationBlueprint['dashboardWidgets'] {
  const hasDashboard = pages.some(p => p.type === 'dashboard');
  if (!hasDashboard) return [];

  const widgets: ApplicationBlueprint['dashboardWidgets'] = [
    { id: 'widget-stats', type: 'stat', title: 'Overview', size: 'full' },
    { id: 'widget-chart', type: 'chart', title: 'Trends', size: 'lg' },
    { id: 'widget-activity', type: 'feed', title: 'Recent Activity', size: 'md' },
  ];

  for (const entity of entities.slice(0, 3)) {
    widgets.push({
      id: `widget-${entity.slug}-table`,
      type: 'table',
      title: `Recent ${entity.name}s`,
      dataEntity: entity.name,
      size: 'full',
    });
  }

  return widgets;
}

function compileCharts(pages: PagePlan[]): ApplicationBlueprint['charts'] {
  const hasDashboard = pages.some(p => p.type === 'dashboard');
  if (!hasDashboard) return [];

  return [
    { id: 'chart-overview', type: 'line', title: 'Overview Trend', dataEntity: 'Analytics', series: [] },
    { id: 'chart-distribution', type: 'pie', title: 'Distribution', dataEntity: 'Analytics', series: [] },
  ];
}

function computeConfidence(input: StageInput, _stageOutput: StageOutput): number {
  let confidence = 0.5;
  const decisions = input.decisions;
  if (decisions.length > 5) confidence += 0.1;
  if (decisions.length > 10) confidence += 0.1;
  if (input.constraintReport.violated === 0) confidence += 0.1;
  if (input.constraintReport.violated > 0) confidence -= 0.1;
  if (input.selectedDesignProfile) {
    confidence += (input.selectedDesignProfile.score / 100) * 0.2;
  }
  return Math.max(0, Math.min(1, confidence));
}
