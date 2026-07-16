/**
 * Knowledge Acquisition Layer
 *
 * OWNERSHIP: This layer owns Evidence and Sources.
 * It is the SINGLE AUTHORITY for:
 * - Web research
 * - Competitor analysis
 * - Market research
 * - Evidence collection
 * - Source verification
 */

export * from './types.js';
export { KnowledgeAcquisitionEngine } from './engine.js';
export type { KnowledgeSourceProvider, KnowledgeSourceResult } from './engine.js';
export { PromptEvidenceProvider, DomainDataEvidenceProvider } from './engine.js';
