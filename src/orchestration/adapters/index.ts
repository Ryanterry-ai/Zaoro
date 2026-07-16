/**
 * Adapters - Bridge between Orchestration Types and BOS Schema Types
 *
 * These adapters convert between the formal orchestration types and the runtime
 * BOS schema types, allowing both systems to coexist during migration.
 */

import type {
  ApplicationBlueprint as OrchestrationApplicationBlueprint,
  Route as OrchestrationRoute,
  ComponentNode as OrchestrationComponentNode,
} from '../application-blueprint/types.js';

import type {
  ApplicationBlueprint as BosApplicationBlueprint,
  PagePlan as BosPagePlan,
  RoutePlan as BosRoutePlan,
} from '../../bos/schemas/blueprint/application-blueprint.schema.js';

import type {
  ExecutionBlueprint as OrchestrationExecutionBlueprint,
} from '../execution-blueprint/types.js';

import type {
  ExecutionBlueprint as BosExecutionBlueprint,
  PageExecutionPlan as BosPageExecutionPlan,
} from '../../bos/schemas/blueprint/execution-blueprint.schema.js';

import type {
  SolutionArchitecture as OrchestrationSolutionArchitecture,
} from '../technology-planner/types.js';

import type {
  SolutionArchitectureDecision as BosSolutionArchitectureDecision,
} from '../../bos/schemas/solution-architecture.schema.js';

// ============================================================================
// APPLICATION BLUEPRINT ADAPTERS
// ============================================================================

/**
 * Convert Orchestration ApplicationBlueprint to BOS ApplicationBlueprint
 */
export function toBosApplicationBlueprint(
  orchestration: OrchestrationApplicationBlueprint
): BosApplicationBlueprint {
  return {
    id: orchestration.id,
    version: orchestration.version,
    createdAt: orchestration.createdAt.toISOString(),
    name: orchestration.id,
    industry: 'general',
    navigation: { items: [], style: 'horizontal', sticky: false, logo: true },
    database: { engine: 'postgresql', tables: [] },
    designTokens: {},
    pages: orchestration.routes.value.map(routeToBosPagePlan),
    routes: orchestration.apiContracts.value.map(c => ({ path: c.path, method: c.method, handler: 'api', auth: c.requiresAuth })),
    apis: orchestration.apiContracts.value.map(contractToBosApi),
    components: orchestration.components.value.map(componentToBosComponent),
    workflows: [],
  } as any;
}

function routeToBosPagePlan(route: OrchestrationRoute): BosPagePlan {
  return {
    id: route.path,
    path: route.path,
    name: route.name,
    type: 'page',
    sections: [],
    components: [route.component],
    dataRequirements: [],
    permissions: [],
    seo: {
      title: route.metadata.title,
      description: route.metadata.description,
    },
    isEntry: false,
  };
}

function componentToBosComponent(node: OrchestrationComponentNode) {
  return {
    id: node.name,
    name: node.name,
    type: node.type,
    props: {},
    children: node.children?.map(c => c.name) ?? [],
  };
}

function contractToBosApi(contract: any) {
  return {
    path: contract.path,
    method: contract.method,
    auth: contract.requiresAuth ?? false,
    requestSchema: contract.request ?? undefined,
    responseSchema: contract.response ?? undefined,
    rateLimit: contract.rateLimit,
  };
}

/**
 * Convert BOS ApplicationBlueprint to Orchestration ApplicationBlueprint
 */
export function toOrchestrationApplicationBlueprint(
  bos: BosApplicationBlueprint,
  businessKnowledgeId: string = 'unknown',
  experienceBlueprintId: string = 'unknown',
  contentBlueprintId: string = 'unknown',
  solutionArchitectureId: string = 'unknown'
): OrchestrationApplicationBlueprint {
  return {
    id: bos.name,
    createdAt: new Date(),
    version: bos.version,
    businessKnowledgeId,
    experienceBlueprintId,
    contentBlueprintId,
    solutionArchitectureId,
    routes: {
      value: bos.pages.map(pageToOrchestrationRoute),
      provenance: { layer: 'application-blueprint' as const, source: 'adapter', confidence: 1, evidence: ['Adapter conversion'], timestamp: new Date(), reasoning: 'Converted from BOS schema' },
    },
    components: {
      value: bos.pages.flatMap(p => p.components).map((name, i) => ({ name, type: 'ui' as const, props: [], children: [], hooks: [], dependencies: [] })),
      provenance: { layer: 'application-blueprint' as const, source: 'adapter', confidence: 1, evidence: ['Adapter conversion'], timestamp: new Date(), reasoning: 'Converted from BOS schema' },
    },
    stateManagement: {
      value: { approach: 'context' as const, stores: [], slices: [] },
      provenance: { layer: 'application-blueprint' as const, source: 'adapter', confidence: 1, evidence: ['Adapter conversion'], timestamp: new Date(), reasoning: 'Converted from BOS schema' },
    },
    dataFlow: {
      value: [],
      provenance: { layer: 'application-blueprint' as const, source: 'adapter', confidence: 1, evidence: ['Adapter conversion'], timestamp: new Date(), reasoning: 'Converted from BOS schema' },
    },
    apiContracts: {
      value: bos.apis.map(apiToOrchestrationContract),
      provenance: { layer: 'application-blueprint' as const, source: 'adapter', confidence: 1, evidence: ['Adapter conversion'], timestamp: new Date(), reasoning: 'Converted from BOS schema' },
    },
    databaseSchema: {
      value: { tables: [], relationships: [] },
      provenance: { layer: 'application-blueprint' as const, source: 'adapter', confidence: 1, evidence: ['Adapter conversion'], timestamp: new Date(), reasoning: 'Converted from BOS schema' },
    },
    fileStructure: {
      value: [],
      provenance: { layer: 'application-blueprint' as const, source: 'adapter', confidence: 1, evidence: ['Adapter conversion'], timestamp: new Date(), reasoning: 'Converted from BOS schema' },
    },
  };
}

function pageToOrchestrationRoute(page: BosPagePlan): OrchestrationRoute {
  return {
    path: page.path,
    name: page.name,
    component: page.components[0] ?? 'Unknown',
    metadata: {
      title: page.seo?.title ?? page.name,
      description: page.seo?.description ?? '',
      requiresAuth: false,
    },
  };
}

function compToOrchestrationComponent(comp: any): OrchestrationComponentNode {
  return {
    name: comp.name,
    type: comp.type as any,
    props: [],
    children: comp.children?.map((c: string) => ({
      name: c,
      type: 'ui' as const,
      props: [],
      children: [],
      hooks: [],
      dependencies: [],
    })) ?? [],
    hooks: [],
    dependencies: [],
  };
}

function apiToOrchestrationContract(api: any) {
  return {
    path: api.path,
    method: api.method,
    request: api.requestSchema ?? {},
    response: api.responseSchema ?? {},
    requiresAuth: api.auth ?? false,
    rateLimit: api.rateLimit,
  };
}

// ============================================================================
// EXECUTION BLUEPRINT ADAPTERS
// ============================================================================

/**
 * Convert Orchestration ExecutionBlueprint to BOS ExecutionBlueprint
 */
export function toBosExecutionBlueprint(
  orchestration: OrchestrationExecutionBlueprint
): BosExecutionBlueprint {
  return {
    id: orchestration.id,
    createdAt: orchestration.createdAt.toISOString(),
    appId: orchestration.applicationBlueprintId,
    appName: (orchestration.renderer?.value?.options?.appName as string) ?? 'unknown',
    industry: 'general',
    themeId: 'default',
    pages: [],
    metadata: {},
  };
}

/**
 * Convert BOS ExecutionBlueprint to Orchestration ExecutionBlueprint
 */
export function toOrchestrationExecutionBlueprint(
  bos: BosExecutionBlueprint
): OrchestrationExecutionBlueprint {
  const adapterProvenance = { layer: 'execution-blueprint' as const, source: 'adapter', confidence: 1, evidence: ['Adapter conversion'], timestamp: new Date(), reasoning: 'Converted from BOS schema' };
  return {
    id: bos.id,
    createdAt: new Date(bos.createdAt),
    version: '1.0.0',
    applicationBlueprintId: bos.appId,
    renderer: { value: { type: 'nextjs', version: '14', options: {}, outputDir: '.', srcDir: '.' }, provenance: adapterProvenance },
    buildConfig: { value: { packageManager: 'npm', buildCommand: 'next build', devCommand: 'next dev', outputDir: '.next', envVars: {}, hooks: [] }, provenance: adapterProvenance },
    fileGenerationRules: { value: [], provenance: adapterProvenance },
    componentGenerationRules: { value: [], provenance: adapterProvenance },
    contentGenerationRules: { value: [], provenance: adapterProvenance },
    qualityGates: { value: [], provenance: adapterProvenance },
  };
}

// ============================================================================
// SOLUTION ARCHITECTURE ADAPTERS
// ============================================================================

/**
 * Convert Orchestration SolutionArchitecture to BOS SolutionArchitectureDecision
 */
export function toBosSolutionArchitecture(
  orchestration: OrchestrationSolutionArchitecture
): BosSolutionArchitectureDecision {
  return {
    architectureType: orchestration.frontendFramework.value.name ?? 'jamstack',
    hosting: {
      provider: orchestration.hosting.value.provider ?? 'vercel',
      region: orchestration.hosting.value.region ?? 'us-east-1',
      tier: orchestration.hosting.value.tier ?? 'free',
    },
    services: orchestration.integrations.value.map(i => ({
      name: i.name,
      type: i.type,
      purpose: i.purpose,
    })),
    estimatedCost: {
      monthly: 0,
      breakdown: [],
    },
    confidence: orchestration.platform.provenance.confidence ?? 1,
    reasoning: [],
  };
}

/**
 * Convert BOS SolutionArchitectureDecision to Orchestration SolutionArchitecture
 */
export function toOrchestrationSolutionArchitecture(
  bos: BosSolutionArchitectureDecision
): OrchestrationSolutionArchitecture {
  const adapterProvenance = { layer: 'technology-planner' as const, source: 'adapter', confidence: bos.confidence ?? 1, evidence: ['Adapter conversion'], timestamp: new Date(), reasoning: 'Converted from BOS schema' };
  return {
    id: `sa-${Date.now()}`,
    createdAt: new Date(),
    version: '1.0.0',
    businessKnowledgeId: 'unknown',
    experienceBlueprintId: 'unknown',
    contentBlueprintId: 'unknown',
    platform: { value: 'web', provenance: adapterProvenance },
    frontendFramework: { value: { name: bos.architectureType ?? 'nextjs', version: '14', rationale: 'Adapter default', alternatives: [] }, provenance: adapterProvenance },
    database: { value: { type: 'postgresql', rationale: 'Adapter default' }, provenance: adapterProvenance },
    hosting: { value: { provider: (bos.hosting?.provider ?? 'vercel') as any, region: bos.hosting?.region ?? 'us-east-1', tier: (bos.hosting?.tier ?? 'free') as any, rationale: 'Adapter default' }, provenance: adapterProvenance },
    deployment: { value: { type: 'continuous', previewEnvironments: true, rollbackStrategy: 'automatic' }, provenance: adapterProvenance },
    authentication: { value: { type: 'jwt', rationale: 'Adapter default' }, provenance: adapterProvenance },
    authorization: { value: { type: 'jwt', rationale: 'Adapter default' }, provenance: adapterProvenance },
    integrations: { value: bos.services?.map(s => ({ name: s.name, type: 'api' as const, purpose: s.purpose, required: true })) ?? [], provenance: adapterProvenance },
    performance: { value: { targetLcp: 2500, targetFid: 100, targetCls: 0.1, bundleSizeBudget: 200000, imageOptimization: true, cdn: true, caching: { type: 'hybrid' } }, provenance: adapterProvenance },
    scalability: { value: { expectedUsers: '1000+', expectedTraffic: 'moderate', scalingStrategy: 'auto', concurrency: 100 }, provenance: adapterProvenance },
  };
}
