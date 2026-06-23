/**
 * Technical Architect: Generates TechnicalPlan from ApplicationBlueprint.
 * Decides database schema, APIs, auth, storage, and deployment.
 */

import type { ApplicationBlueprint, EntityBlueprint, IntegrationBlueprint } from './solution-architect.js';

export interface DatabasePlan {
  models: Array<{
    name: string;
    fields: Array<{ name: string; type: string; required: boolean; isId: boolean; defaultValue?: string | undefined }>;
    relations: Array<{ name: string; type: string; model: string; fields: string[]; references: string[] }>;
  }>;
  indexes: Array<{ model: string; fields: string[]; unique: boolean }>;
}

export interface APIPlan {
  routes: Array<{
    path: string;
    method: string;
    description: string;
    auth: boolean;
    requestBody?: string;
    queryParams?: string[];
  }>;
}

export interface AuthPlan {
  provider: string;
  methods: string[];
  roles: string[];
  sessionStrategy: string;
}

export interface StoragePlan {
  provider: string;
  buckets: Array<{ name: string; purpose: string; access: string }>;
}

export interface StatePlan {
  clientState: string;
  serverState: string;
  cacheStrategy: string;
}

export interface AnalyticsPlan {
  provider: string;
  events: string[];
  dashboards: string[];
}

export interface DeploymentPlan {
  platform: string;
  buildCommand: string;
  startCommand: string;
  environment: string[];
}

export interface TechnicalPlan {
  database: DatabasePlan;
  apis: APIPlan;
  auth: AuthPlan;
  storage: StoragePlan;
  state: StatePlan;
  analytics: AnalyticsPlan;
  deployment: DeploymentPlan;
}

// ─── Technical Architect ─────────────────────────────────────────

export class TechnicalArchitect {
  /**
   * Generate TechnicalPlan from ApplicationBlueprint.
   */
  generatePlan(blueprint: ApplicationBlueprint): TechnicalPlan {
    return {
      database: this.generateDatabasePlan(blueprint.entities),
      apis: this.generateAPIPlan(blueprint),
      auth: this.generateAuthPlan(blueprint.permissions),
      storage: this.generateStoragePlan(blueprint.integrations),
      state: this.generateStatePlan(blueprint),
      analytics: this.generateAnalyticsPlan(blueprint),
      deployment: this.generateDeploymentPlan(),
    };
  }

  private generateDatabasePlan(entities: EntityBlueprint[]): DatabasePlan {
    const models = entities.map(entity => ({
      name: entity.name,
      fields: entity.fields.map(field => ({
        name: field.name,
        type: this.mapFieldType(field.type),
        required: field.required,
        isId: field.name === 'id',
        defaultValue: field.name === 'id' ? 'cuid()' : field.name === 'createdAt' ? 'now()' : undefined,
      })),
      relations: entity.relationships.map(rel => ({
        name: rel.entity.toLowerCase() + (rel.type === 'one-to-many' ? 's' : ''),
        type: rel.type,
        model: rel.entity,
        fields: [`${rel.entity.toLowerCase()}Id`],
        references: ['id'],
      })),
    }));

    const indexes = entities.map(entity => ({
      model: entity.name,
      fields: ['id'],
      unique: true,
    }));

    return { models, indexes };
  }

  private mapFieldType(type: string): string {
    switch (type) {
      case 'string': return 'String';
      case 'integer': return 'Int';
      case 'decimal': return 'Float';
      case 'boolean': return 'Boolean';
      case 'datetime': return 'DateTime';
      case 'json': return 'Json';
      default: return 'String';
    }
  }

  private generateAPIPlan(blueprint: ApplicationBlueprint): APIPlan {
    const routes: APIPlan['routes'] = [];

    // CRUD routes for each entity
    for (const entity of blueprint.entities) {
      const basePath = `/api/${entity.name.toLowerCase()}s`;
      routes.push(
        { path: basePath, method: 'GET', description: `List ${entity.name}s`, auth: false },
        { path: basePath, method: 'POST', description: `Create ${entity.name}`, auth: true },
        { path: `${basePath}/[id]`, method: 'GET', description: `Get ${entity.name} by ID`, auth: false },
        { path: `${basePath}/[id]`, method: 'PUT', description: `Update ${entity.name}`, auth: true },
        { path: `${basePath}/[id]`, method: 'DELETE', description: `Delete ${entity.name}`, auth: true },
      );
    }

    // Auth routes
    routes.push(
      { path: '/api/auth/login', method: 'POST', description: 'User login', auth: false },
      { path: '/api/auth/register', method: 'POST', description: 'User registration', auth: false },
      { path: '/api/auth/logout', method: 'POST', description: 'User logout', auth: true },
    );

    // Special routes based on features
    if (blueprint.features.find(f => f.id === 'checkout')) {
      routes.push(
        { path: '/api/checkout', method: 'POST', description: 'Process checkout', auth: true },
        { path: '/api/webhooks/stripe', method: 'POST', description: 'Stripe webhook', auth: false },
      );
    }

    if (blueprint.features.find(f => f.id === 'calendar')) {
      routes.push(
        { path: '/api/appointments/available', method: 'GET', description: 'Get available slots', auth: false },
        { path: '/api/appointments/book', method: 'POST', description: 'Book appointment', auth: true },
      );
    }

    return { routes };
  }

  private generateAuthPlan(permissions: ApplicationBlueprint['permissions']): AuthPlan {
    return {
      provider: 'NextAuth.js',
      methods: ['credentials', 'google', 'github'],
      roles: permissions.map(p => p.role),
      sessionStrategy: 'jwt',
    };
  }

  private generateStoragePlan(integrations: IntegrationBlueprint[]): StoragePlan {
    const storageIntegration = integrations.find(i => i.type === 'storage');

    return {
      provider: storageIntegration?.provider || 'Cloudinary',
      buckets: [
        { name: 'uploads', purpose: 'User uploaded files', access: 'private' },
        { name: 'public', purpose: 'Public assets', access: 'public' },
      ],
    };
  }

  private generateStatePlan(blueprint: ApplicationBlueprint): StatePlan {
    return {
      clientState: 'React useState/useContext',
      serverState: 'Server Components + Server Actions',
      cacheStrategy: 'ISR with revalidation',
    };
  }

  private generateAnalyticsPlan(blueprint: ApplicationBlueprint): AnalyticsPlan {
    return {
      provider: 'PostHog',
      events: [
        'page_view',
        'user_signup',
        'user_login',
        'purchase',
        'feature_usage',
        'error',
      ],
      dashboards: blueprint.dashboards.map(d => d.name),
    };
  }

  private generateDeploymentPlan(): DeploymentPlan {
    return {
      platform: 'Vercel',
      buildCommand: 'npm run build',
      startCommand: 'npm start',
      environment: [
        'DATABASE_URL',
        'NEXTAUTH_SECRET',
        'NEXTAUTH_URL',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'RESEND_API_KEY',
        'POSTHOG_API_KEY',
      ],
    };
  }
}
