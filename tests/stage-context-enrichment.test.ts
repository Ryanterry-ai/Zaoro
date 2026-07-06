import { describe, it, expect } from 'vitest';
import { enrichStagePrompt, getPackSummary } from '../src/orchestration/stage-context-enrichment.js';
import type { BOSPack } from '../src/orchestration/types.js';

const TEST_PACK: BOSPack = {
  id: 'test',
  industry: 'ecommerce',
  name: 'Test Industry',
  version: '1.0.0',
  detectionKeywords: ['test'],
  entities: [
    { name: 'Product', description: 'A product', fields: [{ name: 'name', type: 'string', required: true }], relationships: [] },
  ],
  compliance: [{ id: 'gdpr', name: 'GDPR', description: 'Data privacy', required: true, checklist: ['Consent'] }],
  integrations: [{ name: 'Stripe', category: 'payment', purpose: 'Payments', apiType: 'REST' }],
  kpis: ['conversion rate'],
  journeys: [{ id: 'j1', name: 'Purchase', role: 'buyer', steps: ['browse', 'buy'], conversionGoal: 'sale' }],
  stagePrompts: { 'database': 'Focus on product catalog design' },
  exampleArtifacts: {},
};

describe('enrichStagePrompt', () => {
  it('should return base prompts when no pack', () => {
    const result = enrichStagePrompt('system', 'user', undefined, 'database');
    expect(result.systemPrompt).toBe('system');
    expect(result.userPrompt).toBe('user');
  });

  it('should inject entity context', () => {
    const result = enrichStagePrompt('system', 'user', TEST_PACK, 'database');
    expect(result.systemPrompt).toContain('Product');
    expect(result.systemPrompt).toContain('Domain Entities');
  });

  it('should inject compliance context', () => {
    const result = enrichStagePrompt('system', 'user', TEST_PACK, 'database');
    expect(result.systemPrompt).toContain('GDPR');
    expect(result.systemPrompt).toContain('Compliance Requirements');
  });

  it('should inject integration context', () => {
    const result = enrichStagePrompt('system', 'user', TEST_PACK, 'database');
    expect(result.systemPrompt).toContain('Stripe');
    expect(result.systemPrompt).toContain('Recommended Integrations');
  });

  it('should inject KPIs', () => {
    const result = enrichStagePrompt('system', 'user', TEST_PACK, 'database');
    expect(result.systemPrompt).toContain('conversion rate');
    expect(result.systemPrompt).toContain('Key Performance Indicators');
  });

  it('should inject stage-specific guidance', () => {
    const result = enrichStagePrompt('system', 'user', TEST_PACK, 'database');
    expect(result.systemPrompt).toContain('Focus on product catalog design');
  });

  it('should inject user journeys', () => {
    const result = enrichStagePrompt('system', 'user', TEST_PACK, 'database');
    expect(result.systemPrompt).toContain('Purchase');
    expect(result.systemPrompt).toContain('browse → buy');
  });

  it('should include industry name', () => {
    const result = enrichStagePrompt('system', 'user', TEST_PACK, 'database');
    expect(result.systemPrompt).toContain('Test Industry');
  });
});

describe('getPackSummary', () => {
  it('should return no pack message for undefined', () => {
    expect(getPackSummary(undefined)).toBe('No BOS pack loaded');
  });

  it('should return summary with counts', () => {
    const summary = getPackSummary(TEST_PACK);
    expect(summary).toContain('Test Industry');
    expect(summary).toContain('1 entities');
    expect(summary).toContain('1 compliance');
    expect(summary).toContain('1 integrations');
  });
});
