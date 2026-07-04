/**
 * Compiler Pass Architecture
 *
 * Defines the explicit compiler passes that transform the build pipeline.
 * Each pass reads from and writes to the ApplicationGraph as the canonical IR.
 *
 * Architecture:
 *   Prompt → Knowledge Enrichment → BRE v2 → Pipeline-v2 → ApplicationGraph
 *   → Execution Blueprint → Content Resolution → Rendering → Code Generation
 *
 * The ApplicationGraph is the backbone — built early (Layer 1c) and consumed
 * by all downstream passes. Every pass has strict typed input/output and
 * validates its inputs before proceeding.
 */

import type { BREContext } from '../bos/reasoning/rules-engine.js';
import type { ApplicationBlueprint } from '../bos/schemas/blueprint/application-blueprint.schema.js';
import type { ExecutionBlueprint } from '../bos/schemas/blueprint/execution-blueprint.schema.js';
import type { ApplicationSpec } from '../bos/schemas/blueprint/execution-blueprint.schema.js';
import type { ApplicationGraph, AppGraphStats } from '../bos/graph/application-graph.js';
import type { RenderResult, RenderedFile } from './renderers/renderer.js';

// ─── Pass Types ──────────────────────────────────────────────────────────────

export interface PassInput {
  context: BREContext;
  applicationGraph?: ApplicationGraph;
  blueprint?: ApplicationBlueprint;
  executionBlueprint?: ExecutionBlueprint;
  applicationSpec?: ApplicationSpec;
  renderResult?: RenderResult;
}

export interface PassOutput {
  context?: Partial<BREContext>;
  applicationGraph?: ApplicationGraph;
  blueprint?: ApplicationBlueprint;
  executionBlueprint?: ExecutionBlueprint;
  applicationSpec?: ApplicationSpec;
  renderResult?: RenderResult;
  files?: RenderedFile[];
  stats?: AppGraphStats;
  warnings?: string[];
}

export interface CompilerPass {
  id: string;
  name: string;
  description: string;
  requiredInputs: string[];
  producesOutputs: string[];
  execute(input: PassInput): Promise<PassOutput>;
}

// ─── Pass Registry ───────────────────────────────────────────────────────────

export const COMPILER_PASSES: CompilerPass[] = [
  {
    id: 'pass-0-knowledge-enrichment',
    name: 'Knowledge Graph Enrichment',
    description: 'Enriches BREContext with domain-specific knowledge from the Knowledge Graph (capabilities, vocabulary, entities)',
    requiredInputs: ['context'],
    producesOutputs: ['context'],
    execute: async (input) => {
      // Implemented in build-pipeline.ts as Layer 1a
      return { context: input.context };
    },
  },
  {
    id: 'pass-1-bre-v2',
    name: 'BRE v2 → Application Blueprint',
    description: 'Transforms BREContext into an ApplicationBlueprint using rules engine, constraint solver, and scorer',
    requiredInputs: ['context'],
    producesOutputs: ['blueprint'],
    execute: async (input) => {
      // Implemented in build-pipeline.ts as Layer 1
      return {};
    },
  },
  {
    id: 'pass-2-pipeline-v2-enrichment',
    name: 'Pipeline-v2 Enrichment',
    description: 'Enriches the blueprint with detailed sub-graphs: capabilities, entities, workflows, navigation, database, API',
    requiredInputs: ['context', 'blueprint'],
    producesOutputs: ['applicationGraph'],
    execute: async (input) => {
      // Implemented in build-pipeline.ts as Layer 1b + 1c
      return {};
    },
  },
  {
    id: 'pass-3-application-graph-construction',
    name: 'ApplicationGraph Construction',
    description: 'Builds the canonical ApplicationGraph from pipeline-v2 sub-graphs + business context metadata',
    requiredInputs: ['applicationGraph'],
    producesOutputs: ['applicationGraph'],
    execute: async (input) => {
      // The ApplicationGraph is constructed at Layer 1c with full metadata
      return { applicationGraph: input.applicationGraph };
    },
  },
  {
    id: 'pass-4-execution-blueprint',
    name: 'Execution Blueprint',
    description: 'Transforms ApplicationBlueprint into ExecutionBlueprint with component slots per page',
    requiredInputs: ['blueprint'],
    producesOutputs: ['executionBlueprint'],
    execute: async (input) => {
      // Implemented in build-pipeline.ts as Layer 2
      return {};
    },
  },
  {
    id: 'pass-5-content-resolution',
    name: 'Content Resolution',
    description: 'Resolves content for each component slot using blueprint, vocabulary, pattern, and design profile',
    requiredInputs: ['executionBlueprint', 'blueprint'],
    producesOutputs: ['applicationSpec'],
    execute: async (input) => {
      // Implemented in build-pipeline.ts as Layer 3
      return {};
    },
  },
  {
    id: 'pass-6-rendering',
    name: 'Platform Rendering',
    description: 'Renders ApplicationSpec into platform-specific code files (React components, pages, layouts)',
    requiredInputs: ['applicationSpec'],
    producesOutputs: ['renderResult'],
    execute: async (input) => {
      // Implemented in build-pipeline.ts as Layer 4
      return {};
    },
  },
  {
    id: 'pass-7-code-generation',
    name: 'Pass 3: Graph-Driven Code Generation',
    description: 'Generates infrastructure files (Prisma schema, API routes, DB client) from the ApplicationGraph',
    requiredInputs: ['applicationGraph'],
    producesOutputs: ['files', 'stats', 'warnings'],
    execute: async (input) => {
      // Implemented in pass3-code-generator.ts
      return {};
    },
  },
  {
    id: 'pass-8-quality-gate',
    name: 'Quality Gate',
    description: 'Validates generated code: Prisma generate, TypeScript compile, Next.js build',
    requiredInputs: ['files', 'stats'],
    producesOutputs: ['warnings'],
    execute: async (input) => {
      // Implemented in quality-gate/index.cjs
      return {};
    },
  },
];

// ─── Pass Graph (Dependency Order) ───────────────────────────────────────────

/**
 * Returns the passes in dependency order.
 * Each pass depends on outputs from previous passes.
 */
export function getPassExecutionOrder(): CompilerPass[] {
  return COMPILER_PASSES;
}

/**
 * Get a pass by ID.
 */
export function getPassById(id: string): CompilerPass | undefined {
  return COMPILER_PASSES.find(p => p.id === id);
}

/**
 * Get all passes that produce a given output.
 */
export function getPassesProducing(output: string): CompilerPass[] {
  return COMPILER_PASSES.filter(p => p.producesOutputs.includes(output));
}

/**
 * Get all passes that require a given input.
 */
export function getPassesRequiring(input: string): CompilerPass[] {
  return COMPILER_PASSES.filter(p => p.requiredInputs.includes(input));
}

/**
 * Validate that all required inputs are available for a pass.
 */
export function validatePassInputs(
  pass: CompilerPass,
  availableOutputs: Set<string>,
): { valid: boolean; missing: string[] } {
  const missing = pass.requiredInputs.filter(input => !availableOutputs.has(input));
  return { valid: missing.length === 0, missing };
}
