import { describe, it, expect } from 'vitest';
import { KnowledgeGraph } from '../src/bos/graph/engine.js';
import { GraphGovernor } from '../src/bos/graph/governor.js';
import {
  CandidateKnowledgeStore,
  PromotionPipeline,
  DEFAULT_PROMOTION_CONFIG,
  validateCandidate,
  computeConfidence,
  candidateSignature,
} from '../src/bos/candidate/index.js';
import type { CandidateKnowledge, CandidateSubmission } from '../src/bos/candidate/types.js';

function tmpStoreDir(): string {
  return `knowledge-candidates/.test-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function sub(kind: CandidateSubmission['kind'], key: string, buildId: string, confidence = 0.9, industry = 'healthcare'): CandidateSubmission {
  return {
    kind,
    key,
    label: key,
    industry,
    buildId,
    confidence,
    payload: {
      node: { type: 'Entity', properties: { name: key, slug: key.toLowerCase() } },
      edges: [{ type: 'related_to', target: `industry-${industry}` }],
    },
  };
}

describe('CandidateKnowledgeStore', () => {
  it('upserts by signature and accumulates observations', () => {
    const store = new CandidateKnowledgeStore(tmpStoreDir());
    store.record(sub('entity', 'Patient', 'build-1'));
    store.record(sub('entity', 'Patient', 'build-2'));
    const all = store.list();
    expect(all.length).toBe(1);
    expect(all[0].observations.length).toBe(2);
    expect(all[0].status).toBe('pending');
  });

  it('keeps candidates in separate kind directories', () => {
    const store = new CandidateKnowledgeStore(tmpStoreDir());
    store.record(sub('entity', 'Patient', 'b1'));
    store.record(sub('workflow', 'Intake', 'b1'));
    expect(store.list({ kind: 'entity' }).length).toBe(1);
    expect(store.list({ kind: 'workflow' }).length).toBe(1);
    expect(store.summary().total).toBe(2);
  });
});

describe('Validation pipeline', () => {
  it('rejects empty payloads and accepts well-formed candidates', () => {
    const good: CandidateKnowledge = {
      id: candidateSignature('entity', 'Patient', 'healthcare'),
      kind: 'entity',
      key: 'Patient',
      label: 'Patient',
      industry: 'healthcare',
      payload: { node: { type: 'Entity', properties: { name: 'Patient' } } },
      observations: [{ buildId: 'b1', industry: 'healthcare', confidence: 0.9, timestamp: Date.now() }],
      status: 'pending',
      validationReasons: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(validateCandidate(good).valid).toBe(true);

    const empty = { ...good, payload: { node: { type: '', properties: {} } } } as CandidateKnowledge;
    expect(validateCandidate(empty).valid).toBe(false);
  });
});

describe('Confidence engine', () => {
  it('stays below the auto-promotion floor from a single observation', () => {
    const c: CandidateKnowledge = {
      id: 'e:patient',
      kind: 'entity',
      key: 'Patient',
      label: 'Patient',
      payload: { node: { type: 'Entity', properties: {} } },
      observations: [{ buildId: 'b1', industry: 'healthcare', confidence: 1, timestamp: Date.now() }],
      status: 'pending',
      validationReasons: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    // One build must never promote: well below the 0.85 auto-promotion floor.
    expect(computeConfidence(c).score).toBeLessThan(0.85);
  });

  it('rises with more distinct builds', () => {
    const base: CandidateKnowledge = {
      id: 'e:patient',
      kind: 'entity',
      key: 'Patient',
      label: 'Patient',
      payload: { node: { type: 'Entity', properties: {} } },
      observations: [],
      status: 'pending',
      validationReasons: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const one = { ...base, observations: [{ buildId: 'b1', industry: 'healthcare', confidence: 0.9, timestamp: Date.now() }] };
    const three = {
      ...base,
      observations: [
        { buildId: 'b1', industry: 'healthcare', confidence: 0.9, timestamp: Date.now() },
        { buildId: 'b2', industry: 'healthcare', confidence: 0.9, timestamp: Date.now() },
        { buildId: 'b3', industry: 'healthcare', confidence: 0.9, timestamp: Date.now() },
      ],
    };
    expect(computeConfidence(three).score).toBeGreaterThan(computeConfidence(one).score);
  });
});

describe('GraphGovernor immutability', () => {
  it('throws when mutation is attempted through the readonly graph', () => {
    const graph = new KnowledgeGraph();
    const gov = new GraphGovernor(graph, tmpStoreDir());
    const ro = gov.getReadonlyGraph();
    expect(() => ro.addNode({ id: 'x', type: 'Entity', properties: {}, createdAt: 1, updatedAt: 1 } as never)).toThrow(/immutable/i);
    expect(() => ro.addEdge({ id: 'e', source: 'x', target: 'y', type: 'related_to', weight: 1, properties: {}, createdAt: 1 })).toThrow(/immutable/i);
  });

  it('applyPromotion is the only mutation path and is idempotent', () => {
    const graph = new KnowledgeGraph();
    const gov = new GraphGovernor(graph, tmpStoreDir());
    const candidate: CandidateKnowledge = {
      id: 'entity:patient',
      kind: 'entity',
      key: 'Patient',
      label: 'Patient',
      payload: {
        node: { type: 'Entity', properties: { name: 'Patient', slug: 'patient' } },
        edges: [{ type: 'related_to', target: 'industry-healthcare' }],
      },
      observations: [],
      status: 'validated',
      validationReasons: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const r1 = gov.applyPromotion(candidate);
    expect(r1.applied).toBe(true);
    expect(graph.getNode('candidate-entity-patient')).toBeDefined();
    const r2 = gov.applyPromotion(candidate);
    expect(r2.applied).toBe(false); // already present
    expect(gov.getVersion()).toBe(1);
  });

  it('rollbackLast removes the audit entry and decrements version', () => {
    const graph = new KnowledgeGraph();
    const gov = new GraphGovernor(graph, tmpStoreDir());
    gov.applyPromotion({
      id: 'entity:x',
      kind: 'entity',
      key: 'X',
      label: 'X',
      payload: { node: { type: 'Entity', properties: { name: 'X' } } },
      observations: [],
      status: 'validated',
      validationReasons: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    expect(gov.getVersion()).toBe(1);
    const rolled = gov.rollbackLast();
    expect(rolled).toBeDefined();
    expect(gov.getVersion()).toBe(0);
  });
});

describe('PromotionPipeline (single build never promotes)', () => {
  it('routes a single-build candidate to human review, not promotion', () => {
    const store = new CandidateKnowledgeStore(tmpStoreDir());
    store.record(sub('entity', 'Patient', 'build-1', 0.95));
    const graph = new KnowledgeGraph();
    const gov = new GraphGovernor(graph, tmpStoreDir());
    const pipeline = new PromotionPipeline(store, gov, DEFAULT_PROMOTION_CONFIG);
    const report = pipeline.run();
    expect(report.promoted.length).toBe(0);
    expect(report.needsReview.length).toBe(1);
    expect(gov.getVersion()).toBe(0); // graph untouched
  });

  it('auto-promotes after enough independent observations of the same candidate', () => {
    const store = new CandidateKnowledgeStore(tmpStoreDir());
    for (const b of ['b1', 'b2', 'b3']) {
      store.record(sub('entity', 'Patient', b, 0.95, 'healthcare'));
    }
    const graph = new KnowledgeGraph();
    const gov = new GraphGovernor(graph, tmpStoreDir());
    const pipeline = new PromotionPipeline(store, gov, DEFAULT_PROMOTION_CONFIG);
    const report = pipeline.run();
    expect(report.promoted.length).toBe(1);
    expect(gov.getVersion()).toBe(1);
    expect(graph.getNode('candidate-entity-patient')).toBeDefined();
  });

  it('routes a candidate with too few observations to human review (does not auto-promote)', () => {
    const store = new CandidateKnowledgeStore(tmpStoreDir());
    for (const b of ['b1', 'b2']) {
      store.record(sub('entity', 'Patient', b, 0.95, 'healthcare'));
    }
    const graph = new KnowledgeGraph();
    const gov = new GraphGovernor(graph, tmpStoreDir());
    const pipeline = new PromotionPipeline(store, gov, DEFAULT_PROMOTION_CONFIG);
    const report = pipeline.run();
    expect(report.promoted.length).toBe(0);
    expect(report.needsReview.length).toBe(1);
    expect(gov.getVersion()).toBe(0);
  });

  it('human review approve promotes a candidate', () => {
    const store = new CandidateKnowledgeStore(tmpStoreDir());
    store.record(sub('entity', 'Patient', 'build-1', 0.95));
    const graph = new KnowledgeGraph();
    const gov = new GraphGovernor(graph, tmpStoreDir());
    const pipeline = new PromotionPipeline(store, gov, DEFAULT_PROMOTION_CONFIG);
    pipeline.run(); // -> needs_review
    const id = candidateSignature('entity', 'Patient', 'healthcare');
    expect(pipeline.approve(id)).toBe(true);
    expect(graph.getNode('candidate-entity-patient')).toBeDefined();
  });
});

