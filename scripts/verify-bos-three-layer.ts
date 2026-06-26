#!/usr/bin/env tsx
// ─── BOS Three-Layer Architecture Verification ────────────────────
// Tests the complete Evidence → Knowledge → Reasoning pipeline

import { BOS } from '../src/bos/index.js';
import { KnowledgeGraph } from '../src/bos/graph/engine.js';
import { EvidenceStore } from '../src/bos/evidence/types.js';
import type { BusinessIntent } from '../src/bos/reasoning/engine.js';

const PASS = '✓';
const FAIL = '✕';
let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ${PASS} ${name}${detail ? ` — ${detail}` : ''}`);
    passed++;
  } else {
    console.log(`  ${FAIL} ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  BOS Three-Layer Architecture Verification');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ─── Test 1: Knowledge Graph Core ──────────────────────────────
  console.log('[1] Knowledge Graph Core...');
  
  const graph = new KnowledgeGraph();
  check('Graph instantiation', graph !== null);
  
  // Add nodes
  graph.addNode({
    id: 'test-industry',
    type: 'Industry',
    properties: { name: 'Test', slug: 'test', description: 'Test', maturity: 'mature', tags: ['test'], compositionPrimitives: [] },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  
  const stats = graph.stats();
  check('Node addition', stats.nodes === 1, `nodes=${stats.nodes}`);
  
  // Add edge
  graph.addNode({
    id: 'test-cap',
    type: 'Capability',
    properties: { name: 'Test Cap', slug: 'test-cap', description: 'Test', category: 'core', complexity: 'simple', requiredPrimitives: [], optionalPrimitives: [] },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  
  graph.addEdge({
    id: 'test-edge',
    source: 'test-industry',
    target: 'test-cap',
    type: 'contains',
    weight: 1.0,
    properties: {},
    createdAt: Date.now(),
  });
  
  const stats2 = graph.stats();
  check('Edge addition', stats2.edges === 1, `edges=${stats2.edges}`);

  // Query
  const results = graph.queryNodes({ type: 'Industry' });
  check('Node query', results.length === 1);

  // ─── Test 2: Evidence Layer ────────────────────────────────────
  console.log('\n[2] Evidence Layer...');
  
  const store = new EvidenceStore();
  const item = {
    id: 'test-evidence',
    type: 'scrape' as const,
    source: { type: 'scrape' as const, url: 'https://example.com', accessedAt: Date.now(), reliability: 'medium' as const },
    content: { title: 'Test' },
    confidence: 0.8,
    freshness: { collectedAt: Date.now(), expiresAt: Date.now() + 86400000, ttlMs: 86400000 },
    status: 'validated' as const,
    tags: ['test'],
  };
  
  store.add(item);
  check('Evidence storage', store.get('test-evidence') !== undefined);
  check('Evidence freshness', store.isFresh('test-evidence'));
  
  const queryResults = store.query({ type: 'scrape' });
  check('Evidence query', queryResults.length === 1);

  // ─── Test 3: BOS Initialization ────────────────────────────────
  console.log('\n[3] BOS Initialization...');
  
  const bos = await BOS.initialize();
  check('BOS initialization', bos !== null);
  
  const bosStats = bos.stats();
  check('Knowledge graph loaded', bosStats.graph.nodes > 0, `nodes=${bosStats.graph.nodes}`);
  check('Edges loaded', bosStats.graph.edges > 0, `edges=${bosStats.graph.edges}`);
  check('Primitives loaded', (bosStats.graph.byType.Primitive || 0) > 0, `primitives=${bosStats.graph.byType.Primitive || 0}`);
  check('Industries loaded', (bosStats.graph.byType.Industry || 0) >= 6, `industries=${bosStats.graph.byType.Industry || 0}`);

  // ─── Test 4: Blueprint Compilation ─────────────────────────────
  console.log('\n[4] Blueprint Compilation...');
  
  const intent: BusinessIntent = {
    industry: 'saas',
    appName: 'TestApp',
    description: 'A test SaaS application',
    features: ['Dashboard', 'Settings'],
    entities: ['User', 'Project'],
    workflows: ['Onboarding'],
  };
  
  const { blueprint, reasoning } = await bos.deriveBlueprint(intent);
  
  check('Blueprint generated', blueprint !== undefined);
  check('Blueprint has pages', blueprint.pages.length > 0, `pages=${blueprint.pages.length}`);
  check('Blueprint has entities', blueprint.entities.length > 0, `entities=${blueprint.entities.length}`);
  check('Blueprint has features', blueprint.features.length > 0, `features=${blueprint.features.length}`);
  check('Blueprint has design system', blueprint.designSystem !== undefined);
  check('Reasoning matched industry', reasoning.matchedIndustry !== undefined, `industry=${reasoning.matchedIndustry}`);
  check('Reasoning has vocabulary', Object.keys(reasoning.appliedVocabulary).length > 0, `overrides=${Object.keys(reasoning.appliedVocabulary).length}`);
  check('Reasoning confidence', reasoning.confidence > 0, `confidence=${reasoning.confidence}`);

  // ─── Test 5: Composition Scaling ───────────────────────────────
  console.log('\n[5] Composition Scaling...');
  
  // Verify primitives can compose into new industries
  const primitives = bosStats.graph.byType.Primitive || 0;
  check('Composition primitives available', primitives >= 20, `${primitives} primitives ready for 500+ industries`);
  
  // Check that industry has composition primitives
  const industryNode = bos.graphInstance.getNode('industry-saas');
  check('Industry node exists', industryNode !== undefined);
  
  if (industryNode && industryNode.type === 'Industry') {
    const compPrims = industryNode.properties.compositionPrimitives;
    check('Industry has composition primitives', compPrims.length > 0, `primitives=${compPrims.length}`);
  }

  // ─── Summary ───────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════════');
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});