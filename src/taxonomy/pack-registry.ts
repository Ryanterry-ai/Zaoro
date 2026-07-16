/**
 * Knowledge Pack Registry
 * ========================
 *
 * Central registry for all built-in knowledge packs.
 * New packs are registered here. External packs loaded at runtime extend this.
 *
 * To add a new industry:
 * 1. Create a pack file in packs/ (e.g., packs/retail-electronics.ts)
 * 2. Import it here
 * 3. Add it to the BUILTIN_PACKS array
 *
 * No code changes needed elsewhere — the taxonomy system handles detection,
 * resolution, and injection automatically.
 */

import type { KnowledgePack, TaxonomyPath } from './types.js';
import { RETAIL_FOOTWEAR_PACK } from './packs/retail-footwear.js';
import { SERVICES_HEALTHCARE_VETERINARY_PACK } from './packs/services-healthcare-veterinary.js';

// ─── Built-in Packs ─────────────────────────────────────────────────────────

const BUILTIN_PACKS: KnowledgePack[] = [
  RETAIL_FOOTWEAR_PACK,
  SERVICES_HEALTHCARE_VETERINARY_PACK,
];

// ─── Pack Registry ──────────────────────────────────────────────────────────

/**
 * In-memory registry of all known knowledge packs.
 * Indexed by taxonomy path for O(1) lookup.
 */
const packRegistry: Map<TaxonomyPath, KnowledgePack> = new Map();

/**
 * Index of alias → taxonomy path for fast alias lookup.
 */
const aliasIndex: Map<string, TaxonomyPath> = new Map();

/**
 * Index of keyword → taxonomy path for detection.
 */
const keywordIndex: Map<string, TaxonomyPath> = new Map();

/**
 * Initialize the registry with built-in packs.
 * Called once at startup.
 */
export function initializePackRegistry(): void {
  packRegistry.clear();
  aliasIndex.clear();
  keywordIndex.clear();

  for (const pack of BUILTIN_PACKS) {
    registerPack(pack);
  }
}

/**
 * Register a single knowledge pack.
 */
export function registerPack(pack: KnowledgePack): void {
  // Register by taxonomy path
  packRegistry.set(pack.taxonomyPath, pack);

  // Index aliases
  for (const alias of pack.aliases) {
    aliasIndex.set(alias.toLowerCase(), pack.taxonomyPath);
  }

  // Index detection keywords
  for (const keyword of pack.detectionKeywords) {
    keywordIndex.set(keyword.toLowerCase(), pack.taxonomyPath);
  }
}

/**
 * Get a knowledge pack by taxonomy path.
 */
export function getPackByPath(path: TaxonomyPath): KnowledgePack | undefined {
  return packRegistry.get(path);
}

/**
 * Get a knowledge pack by alias (e.g., "shoes" → retail/footwear).
 */
export function getPackByAlias(alias: string): KnowledgePack | undefined {
  const path = aliasIndex.get(alias.toLowerCase());
  return path ? packRegistry.get(path) : undefined;
}

/**
 * Get all taxonomy paths that match a given keyword.
 */
export function findPacksByKeyword(keyword: string): TaxonomyPath[] {
  const lower = keyword.toLowerCase();
  const results: TaxonomyPath[] = [];
  for (const [kw, path] of keywordIndex) {
    if (kw.includes(lower) || lower.includes(kw)) {
      results.push(path);
    }
  }
  return results;
}

/**
 * Get all registered packs.
 */
export function getAllPacks(): KnowledgePack[] {
  return Array.from(packRegistry.values());
}

/**
 * Get all registered taxonomy paths.
 */
export function getAllPackPaths(): TaxonomyPath[] {
  return Array.from(packRegistry.keys());
}

/**
 * Check if a pack exists for a given taxonomy path.
 */
export function hasPack(path: TaxonomyPath): boolean {
  return packRegistry.has(path);
}

/**
 * Unregister a pack (for testing or dynamic removal).
 */
export function unregisterPack(path: TaxonomyPath): boolean {
  const pack = packRegistry.get(path);
  if (!pack) return false;

  packRegistry.delete(path);

  // Remove from alias index
  for (const alias of pack.aliases) {
    aliasIndex.delete(alias.toLowerCase());
  }

  // Remove from keyword index
  for (const keyword of pack.detectionKeywords) {
    keywordIndex.delete(keyword.toLowerCase());
  }

  return true;
}

/**
 * Get the count of registered packs.
 */
export function getPackCount(): number {
  return packRegistry.size;
}

// Initialize on import
initializePackRegistry();
