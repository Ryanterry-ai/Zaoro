/**
 * Knowledge Graph Seed Initializer
 *
 * Builds the KnowledgeGraph from all registered primitives and industry templates,
 * then exposes a query function for enriching BREContext before pipeline execution.
 */

import { KnowledgeGraph } from '../../graph/engine.js';
import { KnowledgeBuilder, KnowledgeQuery } from '../builder.js';
import { EvidenceStore } from '../../evidence/types.js';
import { PRIMITIVES } from './primitives.js';
import { INDUSTRY_TEMPLATES } from './industry-templates.js';

let _graph: KnowledgeGraph | null = null;
let _query: KnowledgeQuery | null = null;
let _initialized = false;

export function isKnowledgeGraphInitialized(): boolean {
  return _initialized;
}

export async function initializeKnowledgeGraph(): Promise<KnowledgeQuery> {
  if (_initialized && _query) return _query;

  const graph = new KnowledgeGraph();
  const evidenceStore = new EvidenceStore();
  const builder = new KnowledgeBuilder(graph, evidenceStore);

  await builder.buildFromSeeds(PRIMITIVES, INDUSTRY_TEMPLATES);

  _graph = graph;
  _query = new KnowledgeQuery(graph);
  _initialized = true;

  return _query;
}

export function getKnowledgeQuery(): KnowledgeQuery | null {
  return _query;
}

export function getKnowledgeGraph(): KnowledgeGraph | null {
  return _graph;
}

/**
 * Enrich a set of capabilities with domain-specific knowledge from the Knowledge Graph.
 * Returns additional capabilities, vocabulary overrides, and domain entities.
 */
export function enrichFromKnowledgeGraph(
  industry: string,
): {
  additionalCapabilities: string[];
  vocabulary: Record<string, string>;
  domainEntities: string[];
} {
  if (!_query) {
    return { additionalCapabilities: [], vocabulary: {}, domainEntities: [] };
  }

  // Try exact match first, then fuzzy match
  const industryId = `industry-${industry}`;
  const profile = _query.getIndustryProfile(industryId);

  if (profile.industry) {
    const additionalCapabilities = profile.capabilities
      .filter(c => !industry.includes(c.properties.slug))
      .map(c => c.properties.slug);

    const vocabulary: Record<string, string> = {};
    for (const v of profile.vocabulary) {
      vocabulary[v.properties.original] = v.properties.replacement;
    }

    const domainEntities = _query.getRequiredFeatures(industryId)
      .map(f => f.properties.name);

    return { additionalCapabilities, vocabulary, domainEntities };
  }

  // Fuzzy fallback
  const matches = _query.findIndustries(industry);
  if (matches.length > 0 && matches[0]) {
    const matchId = matches[0].id;
    const profile = _query.getIndustryProfile(matchId);
    const additionalCapabilities = profile.capabilities
      .filter(c => !industry.includes(c.properties.slug))
      .map(c => c.properties.slug);

    const vocabulary: Record<string, string> = {};
    for (const v of profile.vocabulary) {
      vocabulary[v.properties.original] = v.properties.replacement;
    }

    return { additionalCapabilities, vocabulary, domainEntities: [] };
  }

  return { additionalCapabilities: [], vocabulary: {}, domainEntities: [] };
}
