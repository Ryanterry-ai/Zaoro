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
