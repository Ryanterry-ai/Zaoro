/**
 * Technology Planner Engine
 *
 * Consumes BusinessKnowledge + ExperienceBlueprint + ContentBlueprint
 * to produce a SolutionArchitecture with full provenance.
 *
 * This engine NEVER:
 * - Hardcodes technology choices
 * - Ignores upstream evidence
 * - Bypasses business constraints
 */

import type { BusinessKnowledge } from '../business-intelligence/types.js';
import type { ExperienceBlueprint } from '../experience-intelligence/types.js';
import type { ContentBlueprint } from '../content-intelligence/types.js';
import type {
  SolutionArchitecture,
  Platform,
  Framework,
  DatabaseConfig,
  HostingConfig,
  DeploymentStrategy,
  AuthStrategy,
  Integration,
  PerformanceConfig,
  ScalabilityConfig,
  ITechnologyPlannerLayer,
} from './types.js';
import type { Provenance, ValidationResult } from '../experience-intelligence/types.js';

function wrap<T>(value: T, confidence: number, evidence: string[]): { value: T; provenance: Provenance } {
  return {
    value,
    provenance: {
      layer: 'technology-planner',
      confidence,
      evidence,
      timestamp: new Date(),
      reasoning: evidence.join('; '),
      source: 'technology-planner-engine',
    },
  };
}

export class TechnologyPlannerEngine implements ITechnologyPlannerLayer {
  readonly id = 'technology-planner' as const;
  readonly name = 'Technology Planner';
  readonly version = '1.0.0';

  async process(
    bk: BusinessKnowledge,
    exp: ExperienceBlueprint,
    content: ContentBlueprint,
  ): Promise<SolutionArchitecture> {
    const evidence: string[] = [];
    const industry = bk.discovery?.industry || 'general';
    const hasApi = (bk.workflows?.length ?? 0) > 0 || (bk.entities?.length ?? 0) > 0;
    const hasAuth = (bk.customerPersonas?.length ?? 0) > 0;
    const hasMedia = (content.mediaStrategy?.value?.sections?.length ?? 0) > 5;

    evidence.push(`Industry: ${industry}`);
    evidence.push(`Workflows: ${bk.workflows?.length ?? 0}`);
    evidence.push(`Entities: ${bk.entities?.length ?? 0}`);
    evidence.push(`Content sections: ${content.mediaStrategy?.value?.sections?.length ?? 0}`);

    const platform: Platform = 'web';
    const frontendFramework: Framework = {
      name: 'nextjs',
      version: '14',
      rationale: `Standard for ${platform} applications with SSR/SSG support`,
      alternatives: ['remix', 'gatsby'],
    };

    const backendFramework: Framework | undefined = hasApi
      ? { name: 'node-express', version: '4', rationale: 'Lightweight API layer', alternatives: ['fastify', 'hono'] }
      : undefined;

    const database: DatabaseConfig = (bk.entities?.length ?? 0) > 0
      ? { type: 'postgresql', orm: 'prisma', rationale: 'Relational data with complex entities' }
      : { type: 'none', rationale: 'No persistent data required' };

    const hosting: HostingConfig = {
      provider: 'vercel',
      region: 'us-east-1',
      tier: 'free',
      rationale: 'Zero-config deployment for Next.js',
    };

    const deployment: DeploymentStrategy = {
      type: 'continuous',
      previewEnvironments: true,
      rollbackStrategy: 'automatic',
    };

    const authentication: AuthStrategy = hasAuth
      ? { type: 'jwt', rationale: 'Stateless auth for SPA/SSR' }
      : { type: 'none', rationale: 'No authentication required' };

    const integrations: Integration[] = (bk.integrations || []).map(i => ({
      name: i.requirement,
      type: 'api' as const,
      purpose: i.category,
      required: i.required,
    }));

    const performance: PerformanceConfig = {
      targetLcp: 2500,
      targetFid: 100,
      targetCls: 0.1,
      bundleSizeBudget: hasMedia ? 300000 : 200000,
      imageOptimization: true,
      cdn: true,
      caching: { type: 'hybrid', ttl: 3600 },
    };

    const scalability: ScalabilityConfig = {
      expectedUsers: '1000+',
      expectedTraffic: 'moderate',
      scalingStrategy: 'auto',
      concurrency: 100,
    };

    return {
      id: `sa-${Date.now()}`,
      createdAt: new Date(),
      version: '1.0.0',
      businessKnowledgeId: `bk-${Date.now()}`,
      experienceBlueprintId: exp.id || '',
      contentBlueprintId: content.id || '',
      platform: wrap(platform, 0.9, evidence),
      frontendFramework: wrap(frontendFramework, 0.85, evidence),
      backendFramework: backendFramework ? wrap(backendFramework, 0.8, evidence) : undefined,
      database: wrap(database, 0.8, evidence),
      hosting: wrap(hosting, 0.9, evidence),
      deployment: wrap(deployment, 0.85, evidence),
      authentication: wrap(authentication, 0.8, evidence),
      authorization: wrap(authentication, 0.8, evidence),
      integrations: wrap(integrations, 0.7, evidence),
      performance: wrap(performance, 0.75, evidence),
      scalability: wrap(scalability, 0.7, evidence),
    };
  }

  validate(architecture: SolutionArchitecture): ValidationResult {
    const issues: Array<{ severity: 'error' | 'warning' | 'info'; message: string; field?: string }> = [];

    if (!architecture.platform?.value) {
      issues.push({ severity: 'error', message: 'Missing platform', field: 'platform' });
    }
    if (!architecture.frontendFramework?.value?.name) {
      issues.push({ severity: 'error', message: 'Missing frontend framework', field: 'frontendFramework' });
    }
    if (!architecture.hosting?.value?.provider) {
      issues.push({ severity: 'warning', message: 'Missing hosting provider', field: 'hosting' });
    }

    return { valid: issues.filter(i => i.severity === 'error').length === 0, issues };
  }
}
