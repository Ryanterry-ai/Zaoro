/**
 * Renderer — translates ComponentSpecs into platform-specific code.
 *
 * Each renderer implements this interface for a target platform.
 * The same ApplicationSpec can be rendered into React, Flutter, SwiftUI, HTML, etc.
 *
 * Architecture:
 *   ApplicationSpec → Renderer → Platform Code
 *
 * Renderers are pure functions: spec → code. No side effects, no I/O.
 */

import type { ComponentSpec, PageSpec, ApplicationSpec } from '../../bos/schemas/blueprint/execution-blueprint.schema.js';
import type { PageLayout, SectionLayout } from '../skill-integrator.js';
import type { DesignDecision } from '../../orchestration/design-intelligence/types.js';
import type { DesignDNA } from '../design-dna.js';
import type { AppFamilyResult } from '../../bos/reasoning/application-family-classifier.js';

// ─── Renderer Interface ──────────────────────────────────────────────────────

/**
 * RenderedFile — a single generated file.
 */
export interface RenderedFile {
  path: string;
  content: string;
  type: 'component' | 'page' | 'layout' | 'style' | 'config' | 'data' | 'route';
}

/**
 * RenderResult — the output of a render operation.
 */
export interface RenderResult {
  files: RenderedFile[];
  warnings: string[];
}

/**
 * Renderer — platform-specific code generator.
 *
 * Implement this interface to add support for a new target platform.
 * Each renderer translates the declarative ApplicationSpec into
 * platform-specific source code.
 */
export interface Renderer {
  /** Platform identifier (e.g., 'react', 'flutter', 'swiftui', 'html') */
  readonly platform: string;

  /** File extension for components (e.g., '.tsx', '.dart', '.swift') */
  readonly componentExtension: string;

  /** File extension for pages (e.g., '.tsx', '.dart', '.swift') */
  readonly pageExtension: string;

  /**
   * Render a single component spec into platform code.
   */
  renderComponent(spec: ComponentSpec, context: RenderContext): RenderedFile;

  /**
   * Render a page (collection of components) into platform code.
   */
  renderPage(spec: PageSpec, context: RenderContext): RenderedFile[];

  /**
   * Render the full application into platform code.
   */
  renderApplication(spec: ApplicationSpec, context: RenderContext): RenderResult;

  /**
   * Render layout scaffolding (nav, footer, etc.)
   */
  renderLayout(spec: ApplicationSpec, context: RenderContext): RenderedFile[];
}

/**
 * ComponentSourceRec — describes an external component to import.
 * Renders generate import statements + add dependencies when source is non-'custom'.
 */
export interface ComponentSourceRec {
  /** Component type name matching ComponentSpec.type (e.g. 'HeroBanner') */
  type: string;
  /** Source registry: 'custom' means inline generation, '21st' / 'shadcn' means external import */
  source: 'custom' | '21st' | 'shadcn';
  /** npm package name to install (e.g. '@21st-dev/hero-banner') */
  packageName: string;
  /** Named export to import from the package (defaults to component type) */
  exportName?: string;
}

/**
 * RenderContext — shared context for all render operations.
 */
export interface RenderContext {
  /** Application theme/design tokens */
  theme: Record<string, unknown>;

  /** Whether to include comments in generated code */
  includeComments: boolean;

  /** Whether to generate test files */
  includeTests: boolean;

  /** Output directory path */
  outputDir: string;

  /** External component sources — renderers generate import statements for these */
  componentSources?: ComponentSourceRec[];

  /** Skip singleton files (shell, layout, Icon, nav-data) — used by worktree groups after the first */
  skipSingletons?: boolean;

  /** Layout plan produced by SkillIntegrator.resolvePageLayout().
   *  When present, ReactRenderer uses it instead of hardcoded defaults. */
  pageLayout?: PageLayout;

  /** Design Intelligence decision (colors, typography, layout, motion, component map).
   *  When present, the renderer derives design tokens from it instead of hardcoded fallbacks. */
  designDecision?: DesignDecision;

  /** Design DNA (rich per-industry design system: colors, type, spacing, radius, motion). */
  designDNA?: DesignDNA;

  /** Application classification (family / appType / uiMode / complexity). */
  appClassification?: AppFamilyResult;

  /** Knowledge Graph enrichment (vocabulary, domain entities, capabilities). */
  knowledge?: {
    vocabulary: Record<string, string>;
    domainEntities: string[];
    additionalCapabilities: string[];
  };

  /** Design Brief from DesignAgent — industry-specific design rules, colors, typography, layout, animation, UX guidelines. */
  designBrief?: import('../../agents/orchestrator/subagents/design-agent.js').DesignBrief;

  /** Solution architecture decision from SAP — single authority for technology selection. */
  solutionArchitecture?: import('../../bos/types-solution-architecture.js').SolutionArchitectureDecision;

  /** Which engines contributed design output — used for provenance reporting. */
  designLineage?: DesignLineage;

  /** Agent mode: only generate shell files (layout, CSS, tailwind, nav-data).
   *  Skip page TSX and component TSX — the agent generates those from the spec. */
  agentMode?: boolean;
}

/**
 * DesignLineage records which engine produced each class of design decision.
 * Written into the output as design-lineage.json and surfaced in execution reports
 * so reviewers can prove the final UI was driven by the engines, not hardcoded constants.
 */
export interface DesignLineage {
  colors: string;
  typography: string;
  layout: string;
  motion: string;
  components: string;
  polish: string;
  knowledgeGraph: string;
  classification: string;
  generatedAt: string;
}

// ─── Renderer Registry ───────────────────────────────────────────────────────

const renderers = new Map<string, Renderer>();

/**
 * Register a renderer for a target platform.
 */
export function registerRenderer(renderer: Renderer): void {
  renderers.set(renderer.platform, renderer);
}

/**
 * Get a registered renderer by platform name.
 */
export function getRenderer(platform: string): Renderer | undefined {
  return renderers.get(platform);
}

/**
 * Get all registered platform names.
 */
export function getRegisteredPlatforms(): string[] {
  return Array.from(renderers.keys());
}

/**
 * Render an ApplicationSpec using a specific platform renderer.
 */
export function renderWith(
  spec: ApplicationSpec,
  platform: string,
  context: RenderContext,
): RenderResult {
  const renderer = renderers.get(platform);
  if (!renderer) {
    return {
      files: [],
      warnings: [`No renderer registered for platform: ${platform}`],
    };
  }
  return renderer.renderApplication(spec, context);
}
