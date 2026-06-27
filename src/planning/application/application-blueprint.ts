/**
 * =============================================================================
 * Build.same V3
 * Application Planning Layer - Blueprint Builder
 * =============================================================================
 * Constructs the Application Blueprint from the Business Blueprint.
 * Translates business capabilities into software architecture.
 */

import type {
  BusinessBlueprint,
  BusinessCapabilityId,
  BusinessEntityId,
} from '../business/business-types.js';

import type {
  ApplicationBlueprint,
  ApplicationBlueprintMetadata,
  ApplicationPage,
  ApplicationComponent,
  ApplicationRoute,
  ApplicationService,
  ApplicationApi,
  ApplicationState,
  ApplicationEvent,
  ApplicationModule,
  ApplicationPageType,
  ApplicationLayoutType,
  ApplicationComponentType,
  ApplicationServiceType,
  ApplicationApiType,
  ApplicationStateType,
  ApplicationPageId,
  ApplicationComponentId,
  ApplicationRouteId,
  ApplicationServiceId,
  ApplicationApiId,
  ApplicationStateId,
  ApplicationEventId,
  ApplicationModuleId,
} from './application-types.js';

/* -------------------------------------------------------------------------- */
/*                           BLUEPRINT BUILDER                                */
/* -------------------------------------------------------------------------- */

export interface ApplicationBlueprintBuilderConfig {
  readonly name: string;
  readonly description: string;
  readonly businessBlueprint: BusinessBlueprint;
}

/**
 * ApplicationBlueprintBuilder constructs the Application Blueprint
 * from the Business Blueprint.
 */
export class ApplicationBlueprintBuilder {
  private config: ApplicationBlueprintBuilderConfig;
  private pages: ApplicationPage[] = [];
  private components: ApplicationComponent[] = [];
  private routes: ApplicationRoute[] = [];
  private services: ApplicationService[] = [];
  private apis: ApplicationApi[] = [];
  private state: ApplicationState[] = [];
  private events: ApplicationEvent[] = [];
  private modules: ApplicationModule[] = [];

  constructor(config: ApplicationBlueprintBuilderConfig) {
    this.config = config;
  }

  /**
   * Build the final immutable Application Blueprint.
   */
  build(): ApplicationBlueprint {
    const now = new Date().toISOString();

    const metadata: ApplicationBlueprintMetadata = {
      id: `app-bp-${Date.now()}` as any,
      name: this.config.name,
      description: this.config.description,
      version: {
        version: '1.0.0',
        createdAt: now,
        updatedAt: now,
      },
      businessBlueprintId: this.config.businessBlueprint.metadata.id,
      createdAt: now,
      updatedAt: now,
    };

    return {
      metadata,
      pages: this.pages,
      components: this.components,
      routes: this.routes,
      services: this.services,
      apis: this.apis,
      state: this.state,
      events: this.events,
      modules: this.modules,
    };
  }

  /**
   * Add page to the blueprint.
   */
  addPage(page: ApplicationPage): this {
    this.pages.push(page);
    return this;
  }

  /**
   * Add component to the blueprint.
   */
  addComponent(component: ApplicationComponent): this {
    this.components.push(component);
    return this;
  }

  /**
   * Add route to the blueprint.
   */
  addRoute(route: ApplicationRoute): this {
    this.routes.push(route);
    return this;
  }

  /**
   * Add service to the blueprint.
   */
  addService(service: ApplicationService): this {
    this.services.push(service);
    return this;
  }

  /**
   * Add API to the blueprint.
   */
  addApi(api: ApplicationApi): this {
    this.apis.push(api);
    return this;
  }

  /**
   * Add state to the blueprint.
   */
  addState(state: ApplicationState): this {
    this.state.push(state);
    return this;
  }

  /**
   * Add event to the blueprint.
   */
  addEvent(event: ApplicationEvent): this {
    this.events.push(event);
    return this;
  }

  /**
   * Add module to the blueprint.
   */
  addModule(module: ApplicationModule): this {
    this.modules.push(module);
    return this;
  }

  /**
   * Generate standard pages from business capabilities.
   */
  generatePagesFromCapabilities(): this {
    const businessBlueprint = this.config.businessBlueprint;

    // Generate landing page
    this.addPage({
      id: `page-landing` as any,
      name: 'Landing Page',
      description: 'Main landing page showcasing business capabilities',
      pageType: 'landing' as ApplicationPageType,
      route: '/',
      layout: 'full-width' as ApplicationLayoutType,
      components: [],
      businessCapabilities: businessBlueprint.capabilities.map(c => c.id),
      businessEntities: [],
      requiresAuth: false,
      metadata: {
        name: 'Landing Page',
        description: 'Main landing page',
        tags: ['landing', 'marketing'],
      },
    });

    // Generate pages for each capability
    for (const capability of businessBlueprint.capabilities) {
      const pageId = `page-${capability.id}` as any;
      const componentName = this.toPascalCase(capability.id);

      this.addPage({
        id: pageId,
        name: `${componentName} Page`,
        description: `Page for ${capability.metadata.name}`,
        pageType: 'detail' as ApplicationPageType,
        route: `/${capability.id}`,
        layout: 'contained' as ApplicationLayoutType,
        components: [`component-${capability.id}` as any],
        businessCapabilities: [capability.id],
        businessEntities: capability.entityIds,
        requiresAuth: false,
        metadata: {
          name: `${componentName} Page`,
          description: capability.metadata.description,
          tags: [capability.id],
        },
      });

      // Generate component for the page
      this.addComponent({
        id: `component-${capability.id}` as any,
        name: componentName,
        description: capability.metadata.description,
        componentType: 'section' as ApplicationComponentType,
        props: [],
        children: [],
        businessCapabilities: [capability.id],
        metadata: {
          name: componentName,
          description: capability.metadata.description,
          tags: [capability.id],
        },
      });
    }

    return this;
  }

  /**
   * Generate routes from pages.
   */
  generateRoutesFromPages(): this {
    for (const page of this.pages) {
      this.addRoute({
        id: `route-${page.id}` as any,
        path: page.route,
        pageId: page.id,
        requiresAuth: page.requiresAuth,
        roles: [],
      });
    }

    return this;
  }

  /**
   * Generate standard services.
   */
  generateStandardServices(): this {
    // Data fetching service
    this.addService({
      id: 'service-data-fetching' as any,
      name: 'Data Fetching Service',
      description: 'Handles data fetching from APIs',
      serviceType: 'data-fetching' as ApplicationServiceType,
      endpoints: [],
      businessProcesses: [],
      metadata: {
        name: 'Data Fetching Service',
        description: 'Handles data fetching',
        tags: ['data', 'api'],
      },
    });

    // State management service
    this.addService({
      id: 'service-state-management' as any,
      name: 'State Management Service',
      description: 'Manages application state',
      serviceType: 'state-management' as ApplicationServiceType,
      endpoints: [],
      businessProcesses: [],
      metadata: {
        name: 'State Management Service',
        description: 'Manages application state',
        tags: ['state', 'management'],
      },
    });

    return this;
  }

  /**
   * Generate standard state.
   */
  generateStandardState(): this {
    // Global app state
    this.addState({
      id: 'state-app' as any,
      name: 'App State',
      description: 'Global application state',
      stateType: 'global' as ApplicationStateType,
      initialState: {
        isLoading: false,
        error: null,
        user: null,
      },
      actions: [
        {
          name: 'setLoading',
          description: 'Set loading state',
          payload: { isLoading: 'boolean' },
        },
        {
          name: 'setError',
          description: 'Set error state',
          payload: { error: 'string | null' },
        },
      ],
      metadata: {
        name: 'App State',
        description: 'Global application state',
        tags: ['global', 'state'],
      },
    });

    return this;
  }

  /**
   * Generate modules from pages.
   */
  generateModules(): this {
    // Create a module for all pages
    this.addModule({
      id: 'module-main' as any,
      name: 'Main Module',
      description: 'Main application module',
      pages: this.pages.map(p => p.id),
      components: this.components.map(c => c.id),
      services: this.services.map(s => s.id),
      state: this.state.map(s => s.id),
      metadata: {
        name: 'Main Module',
        description: 'Main application module',
        tags: ['main', 'module'],
      },
    });

    return this;
  }

  /* ---------------------------------------------------------------------- */
  /*                           HELPER METHODS                                */
  /* ---------------------------------------------------------------------- */

  private toPascalCase(str: string): string {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}
