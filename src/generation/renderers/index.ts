/**
 * Renderer module — platform-agnostic code generation.
 *
 * Usage:
 *   import { registerRenderer, ReactRenderer, renderWith } from './renderers/index.js';
 *
 *   registerRenderer(new ReactRenderer());
 *   const result = renderWith(applicationSpec, 'react', context);
 */

export type { Renderer, RenderContext, RenderedFile, RenderResult } from './renderer.js';
export { registerRenderer, getRenderer, getRegisteredPlatforms, renderWith } from './renderer.js';
export { ReactRenderer } from './react-renderer.js';
export { FlutterRenderer } from './flutter-renderer.js';
