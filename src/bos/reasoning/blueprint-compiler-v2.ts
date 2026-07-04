import type { BREContext, RuleDecision } from './rules-engine.js';
import type { ConstraintReport } from './constraint-solver.js';
import type { ScoredOption } from './scorer.js';
import { DESIGN_PROFILES } from '../knowledge/registry.js';
import type { Pattern } from '../schemas/knowledge/pattern.schema.js';
import type { BusinessIntelligenceProfile } from '../schemas/knowledge/business-intelligence.schema.js';
import type {
  ApplicationBlueprint,
  PagePlan,
  RoutePlan,
  LayoutPlan,
  NavPlan,
  PermissionPlan,
  EntityPlan,
  DatabasePlan,
  ApiPlan,
  WorkflowPlan,
  WidgetPlan,
  ChartPlan,
  FormPlan,
  TablePlan,
  IntegrationPlan,
  TokenSet,
} from '../schemas/blueprint/application-blueprint.schema.js';
import type { Attribute, Relationship } from '../schemas/common.js';

export interface BlueprintCompilerInput {
  context: BREContext;
  decisions: RuleDecision[];
  constraintReport: ConstraintReport;
  selectedDesignProfile?: ScoredOption | undefined;
  selectedPattern?: ScoredOption | undefined;
  fullSelectedPattern?: Pattern | undefined;  // Full Pattern object for page-merging
  vocabulary: Record<string, string>;
  knowledgeRefs: Array<{ id: string; version: string }>;
  revenueIntelligence?: BusinessIntelligenceProfile;
}

export class BlueprintCompilerV2 {
  compile(input: BlueprintCompilerInput): ApplicationBlueprint {
    const { context, decisions, constraintReport, selectedDesignProfile, selectedPattern, fullSelectedPattern, vocabulary, knowledgeRefs, revenueIntelligence } = input;

    // Merge pattern pages into decisions before compiling pages.
    // This fixes the dead-code bug identified in Phase 3: selectedPattern was
    // scored and passed in but the full Pattern object was never looked up,
    // meaning pattern pages never reached the final blueprint.
    const mergedDecisions = this.mergePatternDecisions(decisions, fullSelectedPattern);

    // Re-extract vocabulary from merged decisions so pattern vocabulary
    // (added by mergePatternDecisions above) is included.
    const effectiveVocabulary: Record<string, string> = { ...vocabulary };
    for (const decision of mergedDecisions) {
      if (decision.action.type === 'set_vocabulary') {
        effectiveVocabulary[decision.action.original] = decision.action.replacement;
      }
    }

    const pages = this.compilePages(mergedDecisions);
    const entities = this.compileEntities(mergedDecisions);
    const workflows = this.compileWorkflows(mergedDecisions);
    const integrations = this.compileIntegrations(mergedDecisions);
    const permissions = this.compilePermissions(mergedDecisions);
    const navigation = this.compileNavigation(mergedDecisions, context);
    const database = this.compileDatabase(entities);
    const routes = this.compileRoutes(pages, integrations);
    const layouts = this.compileLayouts(pages);
    const apis = this.compileAPIs(entities, integrations);
    const dashboardWidgets = this.compileDashboardWidgets(mergedDecisions, entities, revenueIntelligence);
    const charts = this.compileCharts(mergedDecisions, entities, revenueIntelligence);
    const forms = this.compileForms(entities);
    const tables = this.compileTables(entities);
    const designTokens = this.compileDesignTokens(selectedDesignProfile);
    const relationships = this.compileRelationships(entities);
    const warnings = this.compileWarnings(constraintReport);

    const id = `blueprint-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return {
      id,
      version: '2.0.0',
      createdAt: new Date().toISOString(),
      name: context.appName ?? `${context.industry} Application`,
      description: context.description,
      industry: context.industry,
      businessModels: context.businessModels,
      country: context.country,
      compliancePacks: context.compliancePacks,
      journeys: context.journeys,
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
      generationRules: mergedDecisions.map(d => ({ id: d.ruleId, params: {} })),
      provenance: {
        knowledge: knowledgeRefs,
        compilers: ['blueprint-compiler-v2'],
      },
      vocabulary: effectiveVocabulary,
      confidence: this.computeConfidence(mergedDecisions, constraintReport, selectedDesignProfile),
      warnings,
    };
  }

  /**
   * Merge a Pattern's pages AND enterprise fields into the existing decisions.
   * Only adds items that don't already exist in the decision set — the
   * deterministic rule decisions always take precedence.
   *
   * Enterprise fields (roles, KPIs, vocabulary, businessRules, departments)
   * are converted into corresponding RuleDecision actions so they flow through
   * the existing compilation pipeline (compilePermissions, compileWorkflows, etc).
   */
  private mergePatternDecisions(
    decisions: RuleDecision[],
    pattern: Pattern | undefined,
  ): RuleDecision[] {
    if (!pattern) return decisions;

    const enriched: RuleDecision[] = [...decisions];

    // ── Pages ──
    const existingPaths = new Set(
      decisions
        .filter(d => d.action.type === 'add_page')
        .map(d => d.action.type === 'add_page' ? d.action.path : '')
    );
    for (const page of (pattern.pages ?? [])) {
      if (!existingPaths.has(page.path)) {
        enriched.push({
          ruleId: `pattern.${pattern.id}.page`,
          ruleName: `Pattern: ${pattern.name}`,
          action: {
            type: 'add_page' as const,
            path: page.path,
            name: page.name,
            sections: page.sections ?? [],
          },
          confidence: 0.75,
          trace: `Contributed by pattern: ${pattern.name}`,
        });
      }
    }

    // ── Roles → Permissions ──
    const existingRoles = new Set(
      decisions
        .filter(d => d.action.type === 'add_permission')
        .map(d => d.action.type === 'add_permission' ? d.action.role : '')
    );
    for (const role of (pattern.roles ?? [])) {
      if (!existingRoles.has(role)) {
        enriched.push({
          ruleId: `pattern.${pattern.id}.role`,
          ruleName: `Pattern: ${pattern.name}`,
          action: {
            type: 'add_permission' as const,
            role,
            resource: pattern.pages[0]?.name ?? 'app',
            actions: ['create', 'read', 'update', 'delete'],
          },
          confidence: 0.7,
          trace: `Enterprise role from pattern: ${pattern.name}`,
        });
      }
    }

    // ── KPIs ──
    const existingKpis = new Set(
      decisions
        .filter(d => d.action.type === 'add_kpi')
        .map(d => d.action.type === 'add_kpi' ? d.action.name : '')
    );
    for (const kpi of (pattern.kpis ?? [])) {
      if (!existingKpis.has(kpi)) {
        enriched.push({
          ruleId: `pattern.${pattern.id}.kpi`,
          ruleName: `Pattern: ${pattern.name}`,
          action: {
            type: 'add_kpi' as const,
            name: kpi,
            formula: 'manual',
          },
          confidence: 0.7,
          trace: `Enterprise KPI from pattern: ${pattern.name}`,
        });
      }
    }

    // ── Vocabulary ──
    const existingVocabOriginals = new Set(
      decisions
        .filter(d => d.action.type === 'set_vocabulary')
        .map(d => d.action.type === 'set_vocabulary' ? d.action.original : '')
    );
    for (const [original, replacement] of Object.entries(pattern.vocabulary ?? {})) {
      if (!existingVocabOriginals.has(original)) {
        enriched.push({
          ruleId: `pattern.${pattern.id}.vocab`,
          ruleName: `Pattern: ${pattern.name}`,
          action: {
            type: 'set_vocabulary' as const,
            original,
            replacement,
          },
          confidence: 0.8,
          trace: `Enterprise vocabulary from pattern: ${pattern.name}`,
        });
      }
    }

    // ── Business Rules → Workflows ──
    const existingWorkflowNames = new Set(
      decisions
        .filter(d => d.action.type === 'add_workflow')
        .map(d => d.action.type === 'add_workflow' ? d.action.name : '')
    );
    for (const workflow of (pattern.workflows ?? [])) {
      if (!existingWorkflowNames.has(workflow)) {
        const steps = workflow.split('→').map(s => s.trim());
        enriched.push({
          ruleId: `pattern.${pattern.id}.workflow`,
          ruleName: `Pattern: ${pattern.name}`,
          action: {
            type: 'add_workflow' as const,
            name: steps[0] ?? workflow,
            steps,
            entities: [],
            trigger: 'manual',
          },
          confidence: 0.75,
          trace: `Enterprise workflow from pattern: ${pattern.name}`,
        });
      }
    }

    return enriched;
  }

  private compilePages(decisions: RuleDecision[]): PagePlan[] {
    const pageMap = new Map<string, PagePlan>();

    for (const decision of decisions) {
      if (decision.action.type === 'add_page') {
        const existing = pageMap.get(decision.action.path);
        if (existing) {
          existing.sections = [...new Set([...existing.sections, ...decision.action.sections])];
        } else {
          pageMap.set(decision.action.path, {
            id: `page-${decision.action.path.replace(/\//g, '-').replace(/^-/, '')}`,
            path: decision.action.path,
            name: decision.action.name,
            type: this.inferPageType(decision.action.path),
            sections: decision.action.sections,
            components: [],
            dataRequirements: [],
            permissions: [],
            isEntry: decision.action.path === '/',
            seo: { title: decision.action.name },
          });
        }
      }

      if (decision.action.type === 'add_pattern') {
        // Pattern pages would be merged separately via the pattern registry
      }
    }

    return Array.from(pageMap.values());
  }

  private compileEntities(decisions: RuleDecision[]): EntityPlan[] {
    const entityMap = new Map<string, EntityPlan>();

    for (const decision of decisions) {
      if (decision.action.type === 'add_entity') {
        const existing = entityMap.get(decision.action.name);
        if (existing) {
          for (const field of decision.action.fields) {
            if (!existing.fields.some(f => f.name === field)) {
              existing.fields.push({
                name: field,
                type: 'string',
                required: false,
                indexed: false,
                unique: false,
              });
            }
          }
        } else {
          entityMap.set(decision.action.name, {
            id: `entity-${decision.action.name.toLowerCase()}`,
            name: decision.action.name,
            slug: decision.action.name.toLowerCase(),
            fields: decision.action.fields.map(f => ({
              name: f,
              type: 'string' as const,
              required: f === 'id' || f === 'createdAt',
              indexed: f === 'id' || f === 'email',
              unique: f === 'id' || f === 'email' || f === 'sku',
            })),
            relationships: [],
            uiSections: [],
            workflows: [],
            permissions: [],
          });
        }
      }
    }

    if (!entityMap.has('User')) {
      entityMap.set('User', {
        id: 'entity-user',
        name: 'User',
        slug: 'user',
        fields: [
          { name: 'id', type: 'string', required: true, indexed: true, unique: true },
          { name: 'email', type: 'string', required: true, indexed: true, unique: true },
          { name: 'name', type: 'string', required: true, indexed: false, unique: false },
          { name: 'createdAt', type: 'date', required: true, indexed: false, unique: false },
        ],
        relationships: [],
        uiSections: [],
        workflows: [],
        permissions: [],
      });
    }

    return Array.from(entityMap.values());
  }

  private compileWorkflows(decisions: RuleDecision[]): WorkflowPlan[] {
    const workflows: WorkflowPlan[] = [];

    for (const decision of decisions) {
      if (decision.action.type === 'add_workflow') {
        workflows.push({
          id: `workflow-${decision.action.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: decision.action.name,
          trigger: 'manual',
          steps: decision.action.steps.map(s => ({
            name: s,
            action: 'transform',
          })),
          entities: [],
          services: [],
        });
      }
    }

    return workflows;
  }

  private compileIntegrations(decisions: RuleDecision[]): IntegrationPlan[] {
    const integrations: IntegrationPlan[] = [];

    for (const decision of decisions) {
      if (decision.action.type === 'add_integration') {
        integrations.push({
          id: `integration-${decision.action.name.toLowerCase().replace(/\s+/g, '-')}`,
          type: decision.action.type as IntegrationPlan['type'],
          name: decision.action.name,
          config: {},
          required: decision.action.required,
        });
      }
    }

    return integrations;
  }

  private compilePermissions(decisions: RuleDecision[]): PermissionPlan[] {
    const permissions: PermissionPlan[] = [];

    for (const decision of decisions) {
      if (decision.action.type === 'add_permission') {
        permissions.push({
          id: `perm-${decision.action.role}-${decision.action.resource}`,
          role: decision.action.role,
          resource: decision.action.resource,
          actions: decision.action.actions as PermissionPlan['actions'][number][],
          conditions: [],
        });
      }
    }

    return permissions;
  }

  private compileNavigation(decisions: RuleDecision[], _context: BREContext): NavPlan {
    const items: NavPlan['items'] = [];
    const pages = decisions.filter(d => d.action.type === 'add_page');

    for (const page of pages) {
      if (page.action.type === 'add_page' && !page.action.path.includes(':')) {
        items.push({
          label: page.action.name,
          href: page.action.path,
        });
      }
    }

    return {
      items,
      style: 'horizontal',
      sticky: true,
      logo: true,
    };
  }

  private compileDatabase(entities: EntityPlan[]): DatabasePlan {
    return {
      engine: 'postgresql',
      tables: entities.map(entity => ({
        name: `${entity.slug}s`,
        columns: entity.fields,
        indexes: entity.fields
          .filter(f => f.indexed || f.unique)
          .map(f => ({ columns: [f.name], unique: f.unique })),
        foreignKeys: entity.relationships
          .filter(r => r.foreignKey)
          .map(r => ({
            column: r.foreignKey!,
            references: `${r.target}s(id)`,
            onDelete: 'cascade' as const,
          })),
      })),
    };
  }

  private compileRoutes(pages: PagePlan[], integrations: IntegrationPlan[]): RoutePlan[] {
    const routes: RoutePlan[] = pages.map(page => ({
      path: page.path,
      method: 'GET' as const,
      handler: `page:${page.id}`,
      auth: false,
    }));

    for (const entity of new Set(pages.flatMap(p => p.dataRequirements))) {
      routes.push(
        { path: `/api/${entity}`, method: 'GET', handler: `api:list:${entity}`, auth: false },
        { path: `/api/${entity}/:id`, method: 'GET', handler: `api:get:${entity}`, auth: false },
        { path: `/api/${entity}`, method: 'POST', handler: `api:create:${entity}`, auth: true },
        { path: `/api/${entity}/:id`, method: 'PUT', handler: `api:update:${entity}`, auth: true },
        { path: `/api/${entity}/:id`, method: 'DELETE', handler: `api:delete:${entity}`, auth: true },
      );
    }

    return routes;
  }

  private compileLayouts(pages: PagePlan[]): LayoutPlan[] {
    return [
      {
        id: 'layout-default',
        name: 'Default Layout',
        areas: ['header', 'main', 'footer'],
        components: ['Header', 'Footer'],
        responsive: {},
      },
      {
        id: 'layout-dashboard',
        name: 'Dashboard Layout',
        areas: ['sidebar', 'header', 'main'],
        components: ['Sidebar', 'Header'],
        responsive: { mobile: ['header', 'main'] },
      },
    ];
  }

  private compileAPIs(entities: EntityPlan[], _integrations: IntegrationPlan[]): ApiPlan[] {
    const apis: ApiPlan[] = [];

    for (const entity of entities) {
      apis.push(
        { path: `/api/${entity.slug}`, method: 'GET', description: `List ${entity.name}s`, auth: false },
        { path: `/api/${entity.slug}/:id`, method: 'GET', description: `Get ${entity.name}`, auth: false },
        { path: `/api/${entity.slug}`, method: 'POST', description: `Create ${entity.name}`, auth: true },
        { path: `/api/${entity.slug}/:id`, method: 'PUT', description: `Update ${entity.name}`, auth: true },
        { path: `/api/${entity.slug}/:id`, method: 'DELETE', description: `Delete ${entity.name}`, auth: true },
      );
    }

    return apis;
  }

  private compileDashboardWidgets(decisions: RuleDecision[], entities: EntityPlan[], revenueIntelligence?: BusinessIntelligenceProfile): WidgetPlan[] {
    const widgets: WidgetPlan[] = [];

    const hasDashboard = decisions.some(d => d.action.type === 'add_page' && d.action.path === '/dashboard');
    if (hasDashboard) {
      // Use BI profile dashboard widgets if available
      if (revenueIntelligence?.dashboardWidgets?.length) {
        for (const biWidget of revenueIntelligence.dashboardWidgets.slice(0, 6)) {
          widgets.push({
            id: `widget-${biWidget.name.toLowerCase().replace(/\s+/g, '-')}`,
            type: biWidget.type === 'stat-card' ? 'stat' : biWidget.type === 'chart' ? 'chart' : biWidget.type === 'table' ? 'table' : biWidget.type === 'list' ? 'feed' : biWidget.type === 'gauge' ? 'stat' : 'feed',
            title: biWidget.name,
            dataEntity: biWidget.kpis[0] ?? entities[0]?.name,
            size: biWidget.priority === 'primary' ? 'lg' : biWidget.priority === 'secondary' ? 'md' : 'sm',
          });
        }
      } else {
        // Fallback to generic widgets
        widgets.push(
          { id: 'widget-stats', type: 'stat', title: 'Overview', size: 'full' },
          { id: 'widget-chart', type: 'chart', title: 'Trends', size: 'lg' },
          { id: 'widget-activity', type: 'feed', title: 'Recent Activity', size: 'md' },
        );

        for (const entity of entities.slice(0, 3)) {
          widgets.push({
            id: `widget-${entity.slug}-table`,
            type: 'table',
            title: `Recent ${entity.name}s`,
            dataEntity: entity.name,
            size: 'full',
          });
        }
      }
    }

    return widgets;
  }

  private compileCharts(decisions: RuleDecision[], _entities: EntityPlan[], revenueIntelligence?: BusinessIntelligenceProfile): ChartPlan[] {
    const charts: ChartPlan[] = [];

    const hasDashboard = decisions.some(d => d.action.type === 'add_page' && d.action.path === '/dashboard');
    if (hasDashboard) {
      // Use BI profile dashboard widgets if available
      if (revenueIntelligence?.dashboardWidgets?.length) {
        const biCharts = revenueIntelligence.dashboardWidgets
          .filter(w => w.type === 'chart' || w.type === 'gauge')
          .slice(0, 4);
        for (const biChart of biCharts) {
          charts.push({
            id: `chart-${biChart.name.toLowerCase().replace(/\s+/g, '-')}`,
            type: biChart.type === 'gauge' ? 'bar' : biChart.type as 'bar' | 'line' | 'pie',
            title: biChart.name,
            dataEntity: biChart.kpis[0] ?? 'Analytics',
            series: [],
          });
        }
      } else {
        // Fallback to generic charts
        charts.push(
          { id: 'chart-overview', type: 'line', title: 'Overview Trend', dataEntity: 'Analytics', series: [] },
          { id: 'chart-distribution', type: 'pie', title: 'Distribution', dataEntity: 'Analytics', series: [] },
        );
      }
    }

    return charts;
  }

  private compileForms(entities: EntityPlan[]): FormPlan[] {
    return entities.map(entity => ({
      id: `form-${entity.slug}`,
      entity: entity.name,
      fields: entity.fields.filter(f => f.name !== 'id' && f.name !== 'createdAt' && f.name !== 'updatedAt'),
      submitAction: `/api/${entity.slug}`,
      validation: [],
    }));
  }

  private compileTables(entities: EntityPlan[]): TablePlan[] {
    return entities.map(entity => ({
      id: `table-${entity.slug}`,
      entity: entity.name,
      columns: entity.fields.map(f => ({
        field: f.name,
        header: f.name.charAt(0).toUpperCase() + f.name.slice(1).replace(/_/g, ' '),
        sortable: true,
        filterable: f.indexed,
      })),
      pagination: true,
      pageSize: 20,
      sortable: true,
      filterable: true,
    }));
  }

  private compileDesignTokens(selectedProfile?: ScoredOption): TokenSet {
    const fallback = {
      colors: { primary: '#7C3AED', secondary: '#3B82F6', background: '#09090B', foreground: '#FAFAFA' },
      typography: { heading: 'Inter', body: 'Inter' },
      spacing: { sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
    };

    if (!selectedProfile) {
      return fallback as unknown as TokenSet;
    }

    const fullProfile = DESIGN_PROFILES.find(p => p.id === selectedProfile.id);
    if (!fullProfile) {
      // Profile was scored but isn't in the registry by this id — fall back
      // rather than silently shipping an empty token set.
      return fallback as unknown as TokenSet;
    }

    return {
      profileId: fullProfile.id,
      profileName: fullProfile.name,
      colors: {
        primary: fullProfile.colorPsychology.primary,
        secondary: fullProfile.colorPsychology.secondary,
        accent: fullProfile.colorPsychology.accent,
        background: fullProfile.colorPsychology.background,
        foreground: fullProfile.colorPsychology.foreground,
        muted: fullProfile.colorPsychology.muted,
        destructive: fullProfile.colorPsychology.destructive,
        success: fullProfile.colorPsychology.success,
        warning: fullProfile.colorPsychology.warning,
        info: fullProfile.colorPsychology.info,
      },
      typography: {
        heading: fullProfile.typography.displayFamily,
        body: fullProfile.typography.bodyFamily,
        ...(fullProfile.typography.monoFamily ? { mono: fullProfile.typography.monoFamily } : {}),
      },
      spacing: fullProfile.spacing,
      motion: {
        durationFast: fullProfile.motion.duration.fast,
        durationNormal: fullProfile.motion.duration.normal,
        durationSlow: fullProfile.motion.duration.slow,
        easingDefault: fullProfile.motion.easing.default,
      },
    } as unknown as TokenSet;
  }

  private compileRelationships(entities: EntityPlan[]): Relationship[] {
    const relationships: Relationship[] = [];
    for (const entity of entities) {
      for (const rel of entity.relationships) {
        relationships.push({
          target: rel.target,
          type: rel.type,
          foreignKey: rel.foreignKey,
        });
      }
    }
    return relationships;
  }

  private compileWarnings(constraintReport: ConstraintReport): string[] {
    const warnings: string[] = [];
    for (const violation of constraintReport.violations) {
      warnings.push(...violation.violations);
      warnings.push(...violation.suggestions.map(s => `Suggestion: ${s}`));
    }
    return warnings;
  }

  private inferPageType(path: string): PagePlan['type'] {
    if (path === '/') return 'home';
    if (path.includes('login') || path.includes('register') || path.includes('auth')) return 'auth';
    if (path.includes('dashboard') || path.includes('admin')) return 'dashboard';
    if (path.includes('api')) return 'api';
    if (path.includes(':id') || path.includes(':slug')) return 'detail';
    return 'page';
  }

  private computeConfidence(
    decisions: RuleDecision[],
    constraintReport: ConstraintReport,
    selectedDesignProfile?: ScoredOption,
  ): number {
    let confidence = 0.5;

    if (decisions.length > 5) confidence += 0.1;
    if (decisions.length > 10) confidence += 0.1;

    if (constraintReport.violated === 0) confidence += 0.1;
    if (constraintReport.violated > 0) confidence -= 0.1;

    if (selectedDesignProfile) {
      confidence += (selectedDesignProfile.score / 100) * 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}
