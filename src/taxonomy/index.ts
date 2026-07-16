/**
 * Universal Business Taxonomy
 * ============================
 *
 * This module provides the universal classification system that replaces
 * hardcoded industry detection with a flexible, evidence-based taxonomy.
 *
 * Usage:
 *   import { classify, getKnowledgePack } from './taxonomy/index.js';
 *
 *   const classification = classify("Build me a premium sneaker store for runners");
 *   // → { vertical: { path: "retail/footwear/athletic", confidence: 0.95 }, ... }
 *
 *   const pack = await getKnowledgePack("retail/footwear/athletic");
 *   // → KnowledgePack with all industry-specific data
 */

export type {
  TaxonomyPath,
  VerticalClassification,
  BusinessModelClassification,
  MaturityClassification,
  AudienceClassification,
  EvidenceDimension,
  ClassificationEvidence,
  BusinessClassification,
  TaxonomyNode,
  TaxonomyRegistry,
  KnowledgePack,
  KnowledgePackCopy,
  KnowledgePackDomainData,
  KnowledgePackDesign,
  KnowledgePackVisual,
  KnowledgePackMotion,
  KnowledgePackComponents,
  KnowledgePackLayout,
  KnowledgePackExperience,
  KnowledgePackWorkflow,
  KnowledgePackEntity,
  KnowledgePackCompliance,
  KnowledgePackIntegration,
  KnowledgePackTemplates,
  KnowledgePackPage,
  KnowledgePackFeature,
  KnowledgePackHero,
  KnowledgePackCTA,
  KnowledgePackFooter,
} from './types.js';

export {
  deriveLegacyIndustry,
  deriveLegacySubIndustry,
  deriveLegacyDomain,
  validateTaxonomyPath,
  findTaxonomyByAlias,
  getTaxonomyChildren,
  buildTaxonomyPath,
} from './types.js';

export { DEFAULT_TAXONOMY } from './default-taxonomy.js';

export {
  initializePackRegistry,
  registerPack,
  getPackByPath,
  getPackByAlias,
  findPacksByKeyword,
  getAllPacks,
  getAllPackPaths,
  hasPack,
  unregisterPack,
  getPackCount,
} from './pack-registry.js';

export { RETAIL_FOOTWEAR_PACK } from './packs/retail-footwear.js';
export { SERVICES_HEALTHCARE_VETERINARY_PACK } from './packs/services-healthcare-veterinary.js';

export {
  resolveKnowledgePack,
  getPackForPrompt,
  classifyPromptOnly,
  hasBuiltInPack,
} from './resolver.js';
export type { ClassificationResult } from './resolver.js';

export {
  calculateConfidence,
  extractConfidenceFactors,
  extractPromptEvidence,
  synthesizePack,
  resolveConflicts,
} from './dynamic-resolution.js';
export type {
  ConfidenceFactors,
  PromptEvidence,
  ConflictResolution,
} from './dynamic-resolution.js';

export {
  getIndustryCopyFromPack,
  getDesignProfileFromPack,
  getDomainDataFromPack,
  getExperienceFromPack,
  getVocabularyFromPack,
  getPagesFromPack,
  getFeaturesFromPack,
  getWorkflowsFromPack,
  getEntitiesFromPack,
  getComplianceFromPack,
  getKPIsFromPack,
  getHeroFromPack,
  getCTAFromPack,
  getFooterFromPack,
} from './pack-bridge.js';
export type { DesignProfile } from './pack-bridge.js';

export {
  recordResolution,
  recordBuildOutcome,
  getUsageStats,
  getPackRecommendations,
  hasSuccessfulClassification,
  exportLearningData,
  importLearningData,
  clearLearningData,
} from './learning.js';
export type {
  PackUsageRecord,
  UsageStats,
  ClassificationRecord,
} from './learning.js';
