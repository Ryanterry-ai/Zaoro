import { describe, it, expect } from 'vitest';
import { EvidenceStore } from '../src/bos/evidence/types.js';

function makeEvidenceItem(id, type) {
  return {
    id: id,
    type: type || 'scrape',
    source: { type: type || 'scrape', url: 'https://example.com/' + id, accessedAt: Date.now(), reliability: 'medium' },
    content: { title: 'Evidence ' + id },
    confidence: 0.8,
    freshness: { collectedAt: Date.now(), expiresAt: Date.now() + 86400000, ttlMs: 86400000 },
    status: 'validated',
    tags: ['test'],
  };
}

describe('EvidenceStore', () => {
  it('should add and retrieve evidence', () => {
    const store = new EvidenceStore();
    store.add(makeEvidenceItem('ev-1', 'scrape'));
    expect(store.get('ev-1')).toBeDefined();
    expect(store.get('ev-1').id).toBe('ev-1');
  });

  it('should return undefined for non-existent item', () => {
    const store = new EvidenceStore();
    expect(store.get('non-existent')).toBeUndefined();
  });

  it('should check freshness correctly', () => {
    const store = new EvidenceStore();
    store.add(makeEvidenceItem('fresh', 'scrape'));
    expect(store.isFresh('fresh')).toBe(true);

    const expired = makeEvidenceItem('expired', 'scrape');
    expired.freshness.expiresAt = Date.now() - 1000;
    store.add(expired);
    expect(store.isFresh('expired')).toBe(false);
  });

  it('should query by type', () => {
    const store = new EvidenceStore();
    store.add(makeEvidenceItem('scrape-1', 'scrape'));
    store.add(makeEvidenceItem('research-1', 'research'));
    store.add(makeEvidenceItem('scrape-2', 'scrape'));

    const scrapeResults = store.query({ type: 'scrape' });
    expect(scrapeResults.length).toBe(2);

    const researchResults = store.query({ type: 'research' });
    expect(researchResults.length).toBe(1);
  });

  it('should update evidence status', () => {
    const store = new EvidenceStore();
    store.add(makeEvidenceItem('upd-1', 'scrape'));
    expect(store.get('upd-1').status).toBe('validated');
    store.updateStatus('upd-1', 'stale');
    expect(store.get('upd-1').status).toBe('stale');
  });

  it('should query with status filter', () => {
    const store = new EvidenceStore();
    store.add(makeEvidenceItem('q1', 'scrape'));
    store.add(makeEvidenceItem('q2', 'scrape'));
    store.updateStatus('q2', 'stale');

    const validated = store.query({ status: 'validated' });
    expect(validated.length).toBe(1);

    const stale = store.query({ status: 'stale' });
    expect(stale.length).toBe(1);
  });

  it('should query with confidence filter', () => {
    const store = new EvidenceStore();
    const high = makeEvidenceItem('high-conf', 'scrape');
    high.confidence = 0.95;
    store.add(high);
    const low = makeEvidenceItem('low-conf', 'scrape');
    low.confidence = 0.3;
    store.add(low);

    const above = store.query({ minConfidence: 0.5 });
    expect(above.length).toBe(1);
    expect(above[0].id).toBe('high-conf');
  });

  it('should query with tags filter', () => {
    const store = new EvidenceStore();
    const item1 = makeEvidenceItem('tagged-1', 'scrape');
    item1.tags = ['test', 'important'];
    store.add(item1);
    const item2 = makeEvidenceItem('tagged-2', 'scrape');
    item2.tags = ['test'];
    store.add(item2);

    const important = store.query({ tags: ['important'] });
    expect(important.length).toBe(1);
    expect(important[0].id).toBe('tagged-1');
  });

  it('should return validated evidence', () => {
    const store = new EvidenceStore();
    const item = makeEvidenceItem('validated-1', 'scrape');
    item.tags = ['topic-a'];
    store.add(item);
    const results = store.getValidatedEvidence(['topic-a']);
    expect(results.length).toBe(1);
  });

  it('should return stats', () => {
    const store = new EvidenceStore();
    store.add(makeEvidenceItem('s1', 'scrape'));
    store.add(makeEvidenceItem('s2', 'research'));
    const stats = store.stats();
    expect(stats.total).toBe(2);
    expect(stats.byType.scrape).toBe(1);
    expect(stats.byType.research).toBe(1);
  });

  it('should query with limit', () => {
    const store = new EvidenceStore();
    for (let i = 0; i < 5; i++) {
      store.add(makeEvidenceItem('lim-' + String(i), 'scrape'));
    }
    const results = store.query({ limit: 3 });
    expect(results.length).toBe(3);
  });

  it('should handle multiple evidence items', () => {
    const store = new EvidenceStore();
    for (let i = 0; i < 10; i++) {
      store.add(makeEvidenceItem('item-' + String(i), 'scrape'));
    }
    const all = store.query({});
    expect(all.length).toBe(10);
  });
});
