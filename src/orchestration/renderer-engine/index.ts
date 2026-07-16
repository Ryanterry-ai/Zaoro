/**
 * Renderer Engine Layer
 *
 * OWNERSHIP: This layer owns code generation ONLY.
 * It is a DETERMINISTIC EXECUTION ENGINE.
 *
 * CONSTRAINTS:
 * - MUST NOT decide business logic
 * - MUST NOT decide experience flow
 * - MUST NOT decide content strategy
 * - MUST NOT decide visual system
 * - MUST NOT decide technology stack
 * - MUST NOT infer navigation, pages, interactions
 * - MUST render blueprints deterministically
 */

export * from './types.js';
export { RendererEngine } from './engine.js';
