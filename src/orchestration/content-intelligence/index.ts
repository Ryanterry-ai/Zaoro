/**
 * Content Intelligence Layer
 *
 * OWNERSHIP: This layer owns ContentBlueprint.
 * It is the SINGLE AUTHORITY for:
 * - Messaging hierarchy
 * - CTA strategy
 * - Media strategy
 * - Copy direction
 * - Content density
 * - Voice and tone
 */

export * from './types.js';
export { ContentIntelligenceEngine } from './engine.js';
